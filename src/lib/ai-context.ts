import type { Company, Employee, AttendanceRecord, PayrollRun, LeaveRequest, DocRequest } from "./store";
import { computePayroll } from "./payroll";
import { auditPayroll } from "./payroll-audit";

export type Role = "super_admin" | "admin" | "hr_manager" | "manager" | "employee" | "auditor";

export type AiAlert = {
  id: string;
  level: "critical" | "warn" | "info";
  category: "compliance" | "payroll" | "attendance" | "documents" | "employees";
  title: string;
  detail: string;
  action?: string;
};

export type AiSnapshot = {
  tenant: { name: string; legalName: string; gstin: string };
  role: Role;
  viewerEmployeeId?: string;
  today: string;
  headcount: { total: number; active: number; inactive: number };
  attendance: {
    today: { present: number; absent: number; leave: number; halfDay: number; late: number };
    last7DayPresentPct: number;
  };
  payroll: {
    lastRunMonth?: string;
    processedThisMonth: number;
    pending: number;
    totalMonthlyGross: number;
  };
  compliance: {
    score: number;
    missingAadhaar: number;
    missingPan: number;
    missingBank: number;
    esiBreaches: number;
    pfIssues: number;
  };
  documents: {
    pendingApproval: number;
    approvedThisMonth: number;
    rejected: number;
  };
  alerts: AiAlert[];
  employees: Array<Pick<Employee, "id" | "empCode" | "name" | "department" | "designation" | "doj" | "status" | "shiftId"> & { hasPan: boolean; hasAadhaar: boolean; hasBank: boolean }>;
};

const isSameMonth = (iso: string, m: string) => iso.startsWith(m);

export function buildAiSnapshot(opts: {
  company: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  payrolls: PayrollRun[];
  leaves: LeaveRequest[];
  docRequests: DocRequest[];
  role: Role;
  viewerEmployeeId?: string;
}): AiSnapshot {
  const { company, attendance, payrolls, docRequests, role, viewerEmployeeId } = opts;
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  // Role scoping
  let employees = opts.employees;
  if (role === "employee" && viewerEmployeeId) {
    employees = employees.filter((e) => e.id === viewerEmployeeId);
  } else if (role === "manager" && viewerEmployeeId) {
    employees = employees.filter((e) => e.id === viewerEmployeeId || e.managerId === viewerEmployeeId);
  }
  const empIds = new Set(employees.map((e) => e.id));
  const attScoped = attendance.filter((a) => empIds.has(a.employeeId));
  const payScoped = payrolls.filter((p) => empIds.has(p.employeeId));
  const docScoped = docRequests.filter((d) => empIds.has(d.employeeId));

  const todayAtt = attScoped.filter((a) => a.date === today);
  const present = todayAtt.filter((a) => a.status === "present").length;
  const absent = employees.length - todayAtt.length + todayAtt.filter((a) => a.status === "absent").length;
  const leaveCount = todayAtt.filter((a) => a.status === "leave").length;
  const halfDay = todayAtt.filter((a) => a.status === "half-day").length;
  const late = todayAtt.filter((a) => (a.checkIn ?? "") > "09:15").length;

  const last7 = new Date(); last7.setDate(last7.getDate() - 7);
  const last7Iso = last7.toISOString().slice(0, 10);
  const last7Records = attScoped.filter((a) => a.date >= last7Iso);
  const last7Present = last7Records.filter((a) => a.status === "present").length;
  const last7DayPresentPct = last7Records.length ? Math.round((last7Present / last7Records.length) * 100) : 0;

  const monthPay = payScoped.filter((p) => p.month === month);
  const totalMonthlyGross = monthPay.reduce((a, b) => a + (b.computed?.gross || 0), 0);

  const missingAadhaar = employees.filter((e) => !e.aadhaar).length;
  const missingPan = employees.filter((e) => !e.pan).length;
  const missingBank = employees.filter((e) => !e.bankAcc || !e.bankIfsc).length;

  // Payroll audit sweep
  const alerts: AiAlert[] = [];
  let esiBreaches = 0;
  let pfIssues = 0;
  for (const emp of employees) {
    const p = computePayroll({
      company, employee: emp,
      daysWorked: company.workingDaysPerMonth,
      otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0,
    });
    const issues = auditPayroll({ company, employee: emp, daysWorked: company.workingDaysPerMonth, otHours: 0, p });
    for (const i of issues) {
      if (i.level === "info" && i.title === "All checks passed") continue;
      if (/ESI/i.test(i.title)) esiBreaches++;
      if (/PF/i.test(i.title)) pfIssues++;
      if (i.level === "error") {
        alerts.push({
          id: `pay-${emp.id}-${i.title}`,
          level: "critical", category: "payroll",
          title: `${emp.name}: ${i.title}`,
          detail: i.detail, action: i.suggestion,
        });
      }
    }
  }

  if (missingAadhaar) alerts.push({ id: "aadhaar", level: "warn", category: "employees", title: `${missingAadhaar} employees missing Aadhaar`, detail: "Required for PF/ESI compliance.", action: "Update in Employees module." });
  if (missingPan) alerts.push({ id: "pan", level: "warn", category: "employees", title: `${missingPan} employees missing PAN`, detail: "Required for TDS and Form 16.", action: "Capture PAN before next payroll." });
  if (missingBank) alerts.push({ id: "bank", level: "critical", category: "payroll", title: `${missingBank} employees missing bank details`, detail: "Payroll payout will fail without bank account & IFSC.", action: "Update employee bank details." });

  // Doc pending
  const pendingDocs = docScoped.filter((d) => d.status === "pending");
  if (pendingDocs.length) alerts.push({ id: "docs-pending", level: "info", category: "documents", title: `${pendingDocs.length} document(s) awaiting approval`, detail: pendingDocs.slice(0, 3).map((d) => d.letterTitle).join(", ") + (pendingDocs.length > 3 ? "…" : "") });

  // Compliance score
  const denom = Math.max(1, employees.length);
  const complianceScore = Math.max(0, Math.round(100 - ((missingAadhaar + missingPan) / denom) * 30 - (missingBank / denom) * 40 - Math.min(30, esiBreaches * 5 + pfIssues * 5)));

  return {
    tenant: { name: company.name, legalName: company.legalName, gstin: company.gstin },
    role, viewerEmployeeId, today,
    headcount: {
      total: employees.length,
      active: employees.filter((e) => e.status === "active").length,
      inactive: employees.filter((e) => e.status === "inactive").length,
    },
    attendance: {
      today: { present, absent, leave: leaveCount, halfDay, late },
      last7DayPresentPct,
    },
    payroll: {
      lastRunMonth: payScoped[payScoped.length - 1]?.month,
      processedThisMonth: monthPay.length,
      pending: Math.max(0, employees.length - monthPay.length),
      totalMonthlyGross,
    },
    compliance: {
      score: complianceScore,
      missingAadhaar, missingPan, missingBank,
      esiBreaches, pfIssues,
    },
    documents: {
      pendingApproval: pendingDocs.length,
      approvedThisMonth: docScoped.filter((d) => d.status === "approved" && d.requestedAt.startsWith(month)).length,
      rejected: docScoped.filter((d) => d.status === "rejected").length,
    },
    alerts,
    employees: employees.map((e) => ({
      id: e.id, empCode: e.empCode, name: e.name,
      department: e.department, designation: e.designation, doj: e.doj,
      status: e.status, shiftId: e.shiftId,
      hasPan: !!e.pan, hasAadhaar: !!e.aadhaar, hasBank: !!(e.bankAcc && e.bankIfsc),
    })),
  };
}

export function healthScores(s: AiSnapshot) {
  const attn = s.attendance.last7DayPresentPct;
  const payHealth = s.headcount.active === 0 ? 100 : Math.round((s.payroll.processedThisMonth / Math.max(1, s.headcount.active)) * 100);
  const hrHealth = Math.round((s.compliance.score * 0.6) + (attn * 0.4));
  return {
    compliance: s.compliance.score,
    attendance: attn,
    payroll: payHealth,
    hr: hrHealth,
  };
}
