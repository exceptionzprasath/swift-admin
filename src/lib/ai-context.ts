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

export type TodayRosterItem = {
  employeeId: string;
  name: string;
  empCode: string;
  department: string;
  designation: string;
  shiftName: string;
  shiftTiming: string;
  graceMinutes: number;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  otHours: number;
  status: "present" | "not_punched_yet" | "absent" | "leave" | "half-day" | "weekly-off" | "holiday" | "late";
  punctuality: "On Time" | "Within Grace" | "Late" | "Half-Day" | "Not Punched" | "Approved Leave" | "Weekly Off" | "Holiday";
  lateByMinutes: number;
  isPresent: boolean;
  isLate: boolean;
  isAbsentOrNotPunched: boolean;
};

export type MonthlyEmployeeAttendanceSummary = {
  employeeId: string;
  name: string;
  empCode: string;
  department: string;
  designation: string;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  lateDays: number;
  totalWorkedHours: number;
  totalOtHours: number;
  attendancePercentage: number;
};

export type MonthlyAttendanceOverview = {
  period: string;
  totalScheduledShifts: number;
  totalPresentPunches: number;
  overallAttendanceRatePct: number;
  totalOtHoursCompany: number;
  frequentLateEmployees: Array<{ name: string; lateCount: number }>;
  topAttendanceEmployees: Array<{ name: string; pct: number }>;
  employeeBreakdown: MonthlyEmployeeAttendanceSummary[];
};

export type AiSnapshot = {
  tenant: { name: string; legalName: string; gstin: string };
  role: Role;
  viewerEmployeeId?: string;
  today: string;
  headcount: { total: number; active: number; inactive: number };
  attendance: {
    today: {
      present: number;
      absent: number;
      leave: number;
      halfDay: number;
      late: number;
      notPunched: number;
    };
    todayLiveRoster: TodayRosterItem[];
    monthlyReport: MonthlyAttendanceOverview;
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

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return -1;
  const clean = timeStr.trim().toLowerCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const mer = match[3]?.toLowerCase();
  if (mer === "pm" && h < 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return h * 60 + m;
}

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
  const localToday = new Date().toLocaleDateString("en-CA");
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

  const shifts = company.shifts || [];
  const holidays: Array<{ date: string; name?: string }> = (company as any).holidays || [];

  // Build high-accuracy live roster for today
  const todayLiveRoster: TodayRosterItem[] = employees.map((emp) => {
    // 1. Find record matching today
    const rec = attendance.find(
      (a) =>
        (a.employeeId === emp.id || a.employeeName === emp.name || (a.empCode && a.empCode === emp.empCode)) &&
        (a.date === localToday || a.date === today)
    );

    // 2. Resolve shift
    const defaultShift = shifts.find((s) => s.id === emp.shiftId) || shifts[0] || {
      id: "gen",
      name: "General Shift",
      start: "09:00",
      end: "18:00",
      graceTime: "15",
    };
    const shiftName = rec?.shiftName || defaultShift.name || "General Shift";
    const shiftStart = rec?.shiftStart || defaultShift.start || "09:00";
    const shiftEnd = rec?.shiftEnd || defaultShift.end || "18:00";
    const graceMinutes = parseInt(emp.graceTime || rec?.graceTime || defaultShift.graceTime || "15", 10) || 15;
    const shiftTiming = `${shiftStart} - ${shiftEnd} (Grace: ${graceMinutes}m)`;

    // 3. Check approved leave
    const hasLeave = (opts.leaves || []).some(
      (l) =>
        l.employeeId === emp.id &&
        (l.status || "").toLowerCase() === "approved" &&
        (l.from || (l as any).startDate || "") <= today &&
        (l.to || (l as any).endDate || "") >= today
    );
    if (hasLeave) {
      return {
        employeeId: emp.id,
        name: emp.name,
        empCode: emp.empCode,
        department: emp.department || "General",
        designation: emp.designation || "Staff",
        shiftName,
        shiftTiming,
        graceMinutes,
        checkIn: "On Approved Leave",
        checkOut: "-",
        hoursWorked: 0,
        otHours: 0,
        status: "leave",
        punctuality: "Approved Leave",
        lateByMinutes: 0,
        isPresent: false,
        isLate: false,
        isAbsentOrNotPunched: false,
      };
    }

    // 4. Check if holiday
    const isHoliday = holidays.some((h: { date: string }) => h.date === today);
    if (isHoliday) {
      return {
        employeeId: emp.id,
        name: emp.name,
        empCode: emp.empCode,
        department: emp.department || "General",
        designation: emp.designation || "Staff",
        shiftName,
        shiftTiming,
        graceMinutes,
        checkIn: "Holiday",
        checkOut: "-",
        hoursWorked: 0,
        otHours: 0,
        status: "holiday",
        punctuality: "Holiday",
        lateByMinutes: 0,
        isPresent: false,
        isLate: false,
        isAbsentOrNotPunched: false,
      };
    }

    // 5. Evaluate punch
    const punchRaw = rec?.checkIn || rec?.clockIn;
    if (!punchRaw || punchRaw.trim() === "" || punchRaw.trim() === "—" || punchRaw.trim() === "-") {
      return {
        employeeId: emp.id,
        name: emp.name,
        empCode: emp.empCode,
        department: emp.department || "General",
        designation: emp.designation || "Staff",
        shiftName,
        shiftTiming,
        graceMinutes,
        checkIn: "Not Punched Yet",
        checkOut: "-",
        hoursWorked: 0,
        otHours: 0,
        status: "not_punched_yet",
        punctuality: "Not Punched",
        lateByMinutes: 0,
        isPresent: false,
        isLate: false,
        isAbsentOrNotPunched: true,
      };
    }

    // Punch exists -> Employee is present!
    const punchMins = parseTimeToMinutes(punchRaw);
    const startMins = parseTimeToMinutes(shiftStart);
    const graceLimit = startMins > 0 ? startMins + graceMinutes : 555; // 09:15 fallback

    let punctuality: "On Time" | "Within Grace" | "Late" | "Half-Day" = "On Time";
    let isLate = false;
    let lateByMinutes = 0;

    if (punchMins > 0 && startMins > 0) {
      if (punchMins <= startMins) {
        punctuality = "On Time";
        isLate = false;
      } else if (punchMins <= graceLimit) {
        punctuality = "Within Grace";
        isLate = false;
      } else {
        punctuality = "Late";
        isLate = true;
        lateByMinutes = punchMins - startMins;
      }
    }

    return {
      employeeId: emp.id,
      name: emp.name,
      empCode: emp.empCode,
      department: emp.department || "General",
      designation: emp.designation || "Staff",
      shiftName,
      shiftTiming,
      graceMinutes,
      checkIn: punchRaw,
      checkOut: rec?.checkOut || rec?.clockOut || "Active On Duty",
      hoursWorked: rec?.hoursWorked || 0,
      otHours: rec?.otHours || 0,
      status: isLate ? "late" : "present",
      punctuality,
      lateByMinutes,
      isPresent: true,
      isLate,
      isAbsentOrNotPunched: false,
    };
  });

  const present = todayLiveRoster.filter((r) => r.isPresent).length;
  const late = todayLiveRoster.filter((r) => r.isLate).length;
  const notPunched = todayLiveRoster.filter((r) => r.isAbsentOrNotPunched).length;
  const leaveCount = todayLiveRoster.filter((r) => r.status === "leave").length;
  const halfDay = todayLiveRoster.filter((r) => r.status === "half-day").length;
  const absent = notPunched;

  // Compute 30-day / 1-month comprehensive attendance summary
  const last30 = new Date(); last30.setDate(last30.getDate() - 30);
  const last30Iso = last30.toISOString().slice(0, 10);
  const last30Records = attScoped.filter((a) => a.date >= last30Iso || a.date.startsWith(month));
  const standardWorkingDays = company.workingDaysPerMonth || 26;

  const employeeBreakdown: MonthlyEmployeeAttendanceSummary[] = employees.map((emp) => {
    const empRecords = last30Records.filter(
      (a) => a.employeeId === emp.id || a.employeeName === emp.name || (a.empCode && a.empCode === emp.empCode)
    );

    const presentRecs = empRecords.filter((a) => a.status === "present" || (a.checkIn && a.checkIn !== "-" && a.checkIn !== "—"));
    const leaveRecs = empRecords.filter((a) => a.status === "leave");
    const halfDayRecs = empRecords.filter((a) => a.status === "half-day");
    const absentRecs = empRecords.filter((a) => a.status === "absent");

    // Evaluate shift & late arrivals
    const shift = shifts.find((s) => s.id === emp.shiftId) || shifts[0] || { start: "09:00", graceTime: "15" };
    const shiftStartMins = parseTimeToMinutes(shift.start || "09:00");
    const graceMins = parseInt(emp.graceTime || shift.graceTime || "15", 10) || 15;
    const graceLimitMins = shiftStartMins > 0 ? shiftStartMins + graceMins : 555;

    let lateCount = 0;
    let totalWorkedHours = 0;
    let totalOtHours = 0;

    for (const r of empRecords) {
      if (r.hoursWorked) totalWorkedHours += r.hoursWorked;
      if (r.otHours) totalOtHours += r.otHours;

      if (r.status === "late") {
        lateCount++;
      } else if (r.checkIn) {
        const pMins = parseTimeToMinutes(r.checkIn);
        if (pMins > 0 && pMins > graceLimitMins) {
          lateCount++;
        }
      }
    }

    const presentDays = presentRecs.length;
    const leaveDays = leaveRecs.length;
    const halfDays = halfDayRecs.length;
    const absentDays = absentRecs.length;
    const effectiveDays = presentDays + halfDays * 0.5;
    const totalSampleDays = Math.max(1, Math.min(empRecords.length || standardWorkingDays, standardWorkingDays));
    const attendancePercentage = Math.min(100, Math.round((effectiveDays / totalSampleDays) * 100)) || (presentDays > 0 ? 100 : 0);

    return {
      employeeId: emp.id,
      name: emp.name,
      empCode: emp.empCode,
      department: emp.department || "General",
      designation: emp.designation || "Staff",
      totalWorkingDays: standardWorkingDays,
      presentDays,
      absentDays,
      leaveDays,
      halfDays,
      lateDays: lateCount,
      totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
      totalOtHours: Math.round(totalOtHours * 10) / 10,
      attendancePercentage,
    };
  });

  const totalPresentPunches = employeeBreakdown.reduce((sum, e) => sum + e.presentDays, 0);
  const totalOtHoursCompany = Math.round(employeeBreakdown.reduce((sum, e) => sum + e.totalOtHours, 0) * 10) / 10;
  const overallAttendanceRatePct = employeeBreakdown.length
    ? Math.round(employeeBreakdown.reduce((sum, e) => sum + e.attendancePercentage, 0) / employeeBreakdown.length)
    : 0;

  const frequentLateEmployees = employeeBreakdown
    .filter((e) => e.lateDays > 0)
    .sort((a, b) => b.lateDays - a.lateDays)
    .map((e) => ({ name: `${e.name} (${e.empCode})`, lateCount: e.lateDays }));

  const topAttendanceEmployees = employeeBreakdown
    .slice()
    .sort((a, b) => b.attendancePercentage - a.attendancePercentage || b.presentDays - a.presentDays)
    .slice(0, 5)
    .map((e) => ({ name: `${e.name} (${e.empCode})`, pct: e.attendancePercentage }));

  const monthlyReport: MonthlyAttendanceOverview = {
    period: `${month} (Last 30 Days)`,
    totalScheduledShifts: standardWorkingDays * employees.length,
    totalPresentPunches,
    overallAttendanceRatePct,
    totalOtHoursCompany,
    frequentLateEmployees,
    topAttendanceEmployees,
    employeeBreakdown,
  };

  const last7 = new Date(); last7.setDate(last7.getDate() - 7);
  const last7Iso = last7.toISOString().slice(0, 10);
  const last7Records = attScoped.filter((a) => a.date >= last7Iso);
  const last7Present = last7Records.filter((a) => a.status === "present" || !!a.checkIn || !!a.clockIn).length;
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
      today: { present, absent, leave: leaveCount, halfDay, late, notPunched },
      todayLiveRoster,
      monthlyReport,
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
    employees: employees.map((e) => {
      const p = computePayroll({
        company,
        employee: e,
        daysWorked: company.workingDaysPerMonth || 26,
        otHours: 0,
        incentive: 0,
        shiftDays: 0,
        loan: 0,
        advance: 0,
        bonus: 0,
      });
      const basic = (e as any).salary || e.basic || p.earnings?.basic || 15000;
      const ctc = p.gross || Math.round(basic * 1.094);
      return {
        id: e.id,
        empCode: e.empCode,
        name: e.name,
        department: e.department || "General",
        designation: e.designation || "Staff",
        doj: e.doj || "",
        status: e.status || "active",
        shiftId: e.shiftId,
        basicSalary: basic,
        monthlyCtc: ctc,
        faceEnrolled: !!(e as any).faceData || !!(e as any).faceEnrolled,
        hasPan: !!e.pan,
        hasAadhaar: !!e.aadhaar,
        hasBank: !!(e.bankAcc && e.bankIfsc),
      };
    }),
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
