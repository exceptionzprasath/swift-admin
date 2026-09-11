import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, type EarningComponent, type Employee, type Company, type ShiftAssignment } from "@/lib/store";
import { computePayroll, inr, type PayrollComputation } from "@/lib/payroll";
import { generateSalarySlipPDF, numberToWordsIndian } from "@/lib/pdf";
import { PayslipTemplateView } from "@/components/payroll/PayslipTemplateView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calculator,
  Save,
  Lock,
  Unlock,
  Plus,
  Trash2,
  FileDown,
  Sparkles,
  TrendingUp,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Info,
  Receipt,
  ShieldCheck,
  Building2,
  Printer,
  Download,
  Eye,
  Edit3,
  RotateCcw,
  Check,
  Clock,
  Users,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  Search,
  Calendar,
  SlidersHorizontal,
  ArrowRight,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { type RevisionTarget, type RevisionReason } from "@/lib/salary-revision";

export const Route = createFileRoute("/admin/payroll")({
  head: () => ({ meta: [{ title: "Payroll & Salary Structures · SWIFT" }] }),
  component: PayrollPage,
});

/**
 * Calculates weekly offs from Swift Roster shift assignments for an employee in a given month.
 * If explicit "off" roster assignments exist, counts them; otherwise calculates calendar Sundays.
 */
function getRosterWeekOffDays(
  employeeId: string,
  employeeName: string,
  monthStr: string,
  rosterList: ShiftAssignment[]
): number {
  const monthRoster = (rosterList || []).filter(
    (r) => (r.employeeId === employeeId || r.employeeName === employeeName) && r.date.startsWith(monthStr)
  );
  const explicitOffs = monthRoster.filter(
    (r) => r.shiftId === "off" || r.shiftName?.toLowerCase().includes("off")
  ).length;

  if (explicitOffs > 0) return explicitOffs;

  // Fallback: calculate calendar Sundays in this month
  const [yearStr, mStr] = monthStr.split("-");
  const y = parseInt(yearStr || "2026", 10);
  const m = parseInt(mStr || "8", 10) - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  let sundays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(y, m, d).getDay();
    if (dayOfWeek === 0) sundays++; // Sunday
  }
  return sundays;
}

interface CustomAllowanceItem {
  id: string;
  name: string;
  formula: "pctOfGross" | "pctOfBasic" | "flatMonthly";
  value: number;
  enabled: boolean;
}

interface MonthlyOverrideData {
  daysWorked?: number;
  otHours?: number;
  customBasic?: number;
  // Week Off settings & days
  weekOffEnabled?: boolean;
  weekOffDays?: number;
  // Component % & toggles
  basicPct?: number;
  daEnabled?: boolean;
  daPct?: number;
  hraEnabled?: boolean;
  hraPct?: number;
  oaEnabled?: boolean;
  oaPct?: number;
  caEnabled?: boolean;
  caPct?: number;
  ltaEnabled?: boolean;
  ltaPct?: number;
  customAllowances?: CustomAllowanceItem[];
  // Bonuses & Variable
  attBonusEnabled?: boolean;
  attBonusAmount?: number;
  yrBonusEnabled?: boolean;
  yrBonusAmount?: number;
  incentive?: number;
  bonus?: number;
  variablePay?: number;
  otherEarnings?: number;
  // Deductions (Separate Employee and Employer PF & ESI)
  pfEnabled?: boolean;
  pfEmployeeEnabled?: boolean;
  pfEmployerEnabled?: boolean;
  employeePfPct?: number;
  employerPfPct?: number;
  esiEnabled?: boolean;
  esiEmployeeEnabled?: boolean;
  esiEmployerEnabled?: boolean;
  employeeEsiPct?: number;
  employerEsiPct?: number;
  ptEnabled?: boolean;
  ptAmountOverride?: number;
  lwfEnabled?: boolean;
  lwfAmountOverride?: number;
  tds?: number;
  loan?: number;
  advance?: number;
  otherDeductions?: number;
  notes?: string;
}

interface EditingPayrollRecord extends MonthlyOverrideData {
  emp: Employee;
  customBasic: number;
  daysWorked: number;
  otHours: number;
  weekOffEnabled: boolean;
  weekOffDays: number;
  basicPct: number;
  daEnabled: boolean;
  daPct: number;
  hraEnabled: boolean;
  hraPct: number;
  oaEnabled: boolean;
  oaPct: number;
  caEnabled: boolean;
  caPct: number;
  ltaEnabled: boolean;
  ltaPct: number;
  customAllowances: CustomAllowanceItem[];
  attBonusEnabled: boolean;
  attBonusAmount: number;
  yrBonusEnabled: boolean;
  yrBonusAmount: number;
  incentive: number;
  bonus: number;
  variablePay: number;
  otherEarnings: number;
  pfEnabled: boolean;
  pfEmployeeEnabled: boolean;
  pfEmployerEnabled: boolean;
  employeePfPct: number;
  employerPfPct: number;
  esiEnabled: boolean;
  esiEmployeeEnabled: boolean;
  esiEmployerEnabled: boolean;
  employeeEsiPct: number;
  employerEsiPct: number;
  ptEnabled: boolean;
  ptAmountOverride: number;
  lwfEnabled: boolean;
  lwfAmountOverride: number;
  tds: number;
  loan: number;
  advance: number;
  otherDeductions: number;
  notes: string;
}

export function PayrollPage() {
  const {
    employees,
    company,
    setCompany,
    attendance,
    roster,
    requests,
    applySalaryRevision,
    currentUser,
    saveAllCompanySettings,
    lockPayrollMonth,
    docAssets,
  } = useStore();

  // Active Main Tab
  const [mainTab, setMainTab] = useState<"structure" | "run" | "revision">("structure");

  // Selected Month for Payroll Run
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Saving state
  const [savingSettings, setSavingSettings] = useState(false);

  // Live Blueprint Benchmark Salary (from user template: 30000)
  const [benchmarkSalary, setBenchmarkSalary] = useState<number>(30000);

  // Payroll Run State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || "");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

  // Monthly Employee-Specific Overrides Map (Key: `${month}_${empId}`)
  const [monthlyOverrides, setMonthlyOverrides] = useState<Record<string, MonthlyOverrideData>>({});

  // Preview Modal State
  const [previewTarget, setPreviewTarget] = useState<{
    emp: Employee;
    paidDays: number;
    rawPresentDays?: number;
    weekOffDays?: number;
    weekOffEnabled?: boolean;
    otHours: number;
    comp: PayrollComputation;
  } | null>(null);

  // Live Benchmark Payslip Preview Modal State
  const [showLivePayslipModal, setShowLivePayslipModal] = useState(false);

  // Edit Specific Employee Modal State
  const [editingRecord, setEditingRecord] = useState<EditingPayrollRecord | null>(null);

  // AI Revision State
  const [revAmount, setRevAmount] = useState(0);
  const [revTarget] = useState<RevisionTarget>("basic");
  const [revReason, setRevReason] = useState<RevisionReason>("increment");
  const [revEffective] = useState(new Date().toISOString().slice(0, 10));

  // Check if current month is locked
  const isMonthLocked = !!(company.payrollLockedMonths && company.payrollLockedMonths[selectedMonth]);

  // Handle Save All Settings to DynamoDB
  const handleSavePayrollSettings = async () => {
    setSavingSettings(true);
    try {
      await saveAllCompanySettings();
      toast.success("Payroll structure & statutory settings saved to DynamoDB!");
    } catch (err: any) {
      toast.error("Failed to save payroll settings: " + (err?.message || err));
    } finally {
      setSavingSettings(false);
    }
  };

  // Helper calculation for Blueprint / Master Simulator (Live calculation respecting all toggles)
  const benchmarkCalc = useMemo(() => {
    const gross = benchmarkSalary || 0;
    const ctcLpa = ((gross * 12) / 100000).toFixed(2);

    // 1. Basic + DA (Mandatory Core Wage, editable %)
    const basicPct = company.basicPct ?? (company.daPct ? (company.basicPct ?? 20) + company.daPct : 33.33);
    const basic = Math.round(gross * (basicPct / 100));

    // 2. HRA
    const hraEnabled = company.hraEnabled !== false;
    const hraPct = hraEnabled ? (company.hraPct ?? 16.67) : 0;
    const hra = hraEnabled ? Math.round(gross * (hraPct / 100)) : 0;

    // 4. OA
    const oaEnabled = company.oaEnabled !== false;
    const oaPct = oaEnabled ? (company.oaPct ?? 16.67) : 0;
    const oa = oaEnabled ? Math.round(gross * (oaPct / 100)) : 0;

    // 5. CA
    const caEnabled = company.caEnabled !== false;
    const caPct = caEnabled ? (company.caPct ?? 16.67) : 0;
    const ca = caEnabled ? Math.round(gross * (caPct / 100)) : 0;

    // 6. LTA
    const ltaEnabled = company.ltaEnabled !== false;
    const ltaPct = ltaEnabled ? (company.ltaPct ?? 16.67) : 0;
    const lta = ltaEnabled ? Math.round(gross * (ltaPct / 100)) : 0;

    // Custom Allowances
    const customEarnings = (company.earnings || []).filter(
      (e) => !["basic", "da", "hra", "oa", "ca", "lta", "ot", "shift", "incentive", "bonus", "arrears"].includes(e.id)
    );

    const activeCustomAllowances = customEarnings.filter((e) => (e as any).enabled !== false);

    const customAllowancesSum = activeCustomAllowances.reduce((sum, e) => {
      if (e.formula === "pctOfBasic") {
        return sum + Math.round(basic * (e.value / 100));
      }
      if ((e as any).formula === "pctOfGross") {
        return sum + Math.round(gross * (e.value / 100));
      }
      return sum + (e.value || 0);
    }, 0);

    const totalEarnings = basic + hra + oa + ca + lta + customAllowancesSum;
    const totalEarningsPct = gross > 0 ? Math.round((totalEarnings / gross) * 1000) / 10 : 0;
    const isExceeded = totalEarningsPct > 100;

    // Bonuses
    const attBonusEnabled = company.attendanceBonusRules?.enabled === true;
    const attendanceBonus = attBonusEnabled ? (company.attendanceBonusRules?.value ?? 500) : 0;

    const yrBonusEnabled = company.yearlyBonusRules?.enabled === true;
    const yearlyBonus = yrBonusEnabled ? (company.yearlyBonusRules?.value ?? 500) : 0;

    const totalBonuses = attendanceBonus + yearlyBonus;

    // Statutory Deductions (Accurate Base & Separate Employee / Employer Rates)
    const pfEnabled = company.pfRules?.enabled !== false;
    const pfCeiling = company.pfRules?.ceiling && company.pfRules.ceiling > 0 ? company.pfRules.ceiling : 15000;
    const pfBase = Math.min(basic, pfCeiling);
    const employeePfPct = company.employeePfPct ?? company.pfRules?.employeePct ?? 12;
    const employerPfPct = company.employerPfPct ?? company.pfRules?.employerPct ?? 13;
    const pfEmployer = pfEnabled ? Math.round(pfBase * (employerPfPct / 100)) : 0;
    const pfEmployee = pfEnabled ? Math.round(pfBase * (employeePfPct / 100)) : 0;

    const esiEnabled = company.esiRules?.enabled !== false;
    const esiThreshold = company.esiRules?.threshold ?? company.esiThreshold ?? 21000;
    const esiEligible = gross <= esiThreshold || (company.esiRules as any)?.applyToAll;
    const employeeEsiPct = company.employeeEsiPct ?? company.esiRules?.employeePct ?? 0.75;
    const employerEsiPct = company.employerEsiPct ?? company.esiRules?.employerPct ?? 3.25;
    const esiEmployer = (esiEnabled && esiEligible) ? Math.round(gross * (employerEsiPct / 100)) : 0;
    const esiEmployee = (esiEnabled && esiEligible) ? Math.round(gross * (employeeEsiPct / 100)) : 0;

    const ptEnabled = company.ptEnabled !== false;
    const pt = ptEnabled ? (company.ptAmount ?? 208) : 0;

    const totalEmployeeDeductions = pfEmployee + esiEmployee + pt;

    // Salary In Hand
    const salaryInHand = totalEarnings + totalBonuses - totalEmployeeDeductions;

    // Total Monthly CTC (Gross + Bonuses + Employer PF + Employer ESI)
    const totalMonthlyCtc = totalEarnings + totalBonuses + pfEmployer + esiEmployer;
    const totalYearlyCtcLpa = ((totalMonthlyCtc * 12) / 100000).toFixed(2);

    return {
      gross,
      ctcLpa,
      basicPct,
      basic,
      hraEnabled,
      hraPct,
      hra,
      oaEnabled,
      oaPct,
      oa,
      caEnabled,
      caPct,
      ca,
      ltaEnabled,
      ltaPct,
      lta,
      activeCustomAllowances,
      customAllowancesSum,
      totalEarnings,
      totalEarningsPct,
      isExceeded,
      attBonusEnabled,
      attendanceBonus,
      yrBonusEnabled,
      yearlyBonus,
      totalBonuses,
      pfEnabled,
      pfBase,
      employeePfPct,
      employerPfPct,
      pfEmployer,
      pfEmployee,
      esiEnabled,
      esiEligible,
      employeeEsiPct,
      employerEsiPct,
      esiEmployer,
      esiEmployee,
      ptEnabled,
      pt,
      totalEmployeeDeductions,
      salaryInHand,
      totalMonthlyCtc,
      totalYearlyCtcLpa,
    };
  }, [benchmarkSalary, company]);

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees for monthly run
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (searchEmployee.trim()) {
        const q = searchEmployee.toLowerCase();
        const matchName = (emp.name || "").toLowerCase().includes(q);
        const matchCode = (emp.empCode || "").toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (filterDepartment !== "all" && emp.department !== filterDepartment) return false;
      return true;
    });
  }, [employees, searchEmployee, filterDepartment]);

  // Sample employee for live receipt preview
  const sampleEmployee: Employee = useMemo(() => {
    return (
      employees[0] || {
        id: "emp-sample",
        empCode: "SW009",
        name: "YUJI",
        department: "Engineering",
        designation: "GOOD",
        doj: "2026-08-01",
        basic: benchmarkSalary,
        pan: "ABCDE1234F",
        bankAcc: "987654321012",
        bankIfsc: "HDFC0001234",
        status: "active",
        email: "yuji@company.com",
        phone: "+91 98765 43210",
      }
    );
  }, [employees, benchmarkSalary]);

  // Live Benchmark Sample Payroll Computation
  const liveBenchmarkComp: PayrollComputation = useMemo(() => {
    const wd = company.workingDaysPerMonth || 26;
    return computePayroll({
      company,
      employee: { ...sampleEmployee, basic: benchmarkSalary },
      daysWorked: wd,
      otHours: 0,
      incentive: 0,
      shiftDays: wd,
      loan: 0,
      advance: 0,
      bonus:
        (benchmarkCalc.attBonusEnabled ? benchmarkCalc.attendanceBonus : 0) +
        (benchmarkCalc.yrBonusEnabled ? benchmarkCalc.yearlyBonus : 0),
    });
  }, [company, sampleEmployee, benchmarkSalary, benchmarkCalc]);

  // Monthly Register Calculations for all employees (reflecting per-employee overrides)
  const monthlyRegister = useMemo(() => {
    const wd = company.workingDaysPerMonth || 26;

    return filteredEmployees.map((emp) => {
      const monthAtt = attendance.filter(
        (a) => (a.employeeId === emp.id || a.employeeName === emp.name) && a.date.startsWith(selectedMonth)
      );

      const daysPresent = monthAtt.filter((a) => a.status === "present").length;
      const daysHalf = monthAtt.filter((a) => a.status === "half-day").length;
      const daysLeave = monthAtt.filter((a) => a.status === "leave").length;
      const rawPresentDays = daysPresent + daysHalf * 0.5;

      // Compute OT from actual check-in/check-out timestamps or explicit otHours for each day
      const otHours = monthAtt.reduce((sum, a) => {
        if (a.otHours !== undefined && a.otHours !== null) return sum + (Number(a.otHours) || 0);
        // Derive from timestamps if no stored OT
        const inTime = a.checkIn || a.clockIn;
        const outTime = a.checkOut || a.clockOut;
        if (!inTime || !outTime) return sum;
        try {
          const parseT = (s: string): number => {
            const cleaned = s.trim().toLowerCase();
            const m = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
            if (!m) return -1;
            let h = parseInt(m[1], 10);
            const mins = parseInt(m[2], 10);
            const mer = m[3]?.toLowerCase();
            if (mer === 'pm' && h < 12) h += 12;
            if (mer === 'am' && h === 12) h = 0;
            return h * 60 + mins;
          };
          const inM = parseT(inTime);
          const outM = parseT(outTime);
          if (inM < 0 || outM < 0) return sum;
          let diffM = outM - inM;
          if (diffM <= 0) diffM += 24 * 60;
          const worked = diffM / 60;
          const stdH = company.workingHoursPerDay || 9;
          return sum + (worked > stdH ? Math.round((worked - stdH) * 10) / 10 : 0);
        } catch { return sum; }
      }, 0);

      // Check for employee-specific monthly override
      const overrideKey = `${selectedMonth}_${emp.id}`;
      const ov = monthlyOverrides[overrideKey] || {};

      // Fetch Weekly Offs from Swift Roster for this employee in this month (for metadata display on payslip)
      const rosterWeekOffDays = getRosterWeekOffDays(emp.id, emp.name, selectedMonth, roster);
      const weekOffEnabled = ov.weekOffEnabled !== undefined ? ov.weekOffEnabled : (company.includeWeekOff !== false);
      const weekOffDays = ov.weekOffDays !== undefined ? ov.weekOffDays : rosterWeekOffDays;

      // Salary is prorated strictly on present/worked days (Weekoff is purely informative metadata on payslip)
      const basePresentDays = rawPresentDays + daysLeave;
      const effectiveDaysWorked = ov.daysWorked !== undefined ? ov.daysWorked : basePresentDays;

      const effectiveCompany: Company = {
        ...company,
        basicPct: ov.basicPct !== undefined ? ov.basicPct : company.basicPct,
        daEnabled: ov.daEnabled !== undefined ? ov.daEnabled : company.daEnabled,
        daPct: ov.daPct !== undefined ? ov.daPct : company.daPct,
        hraEnabled: ov.hraEnabled !== undefined ? ov.hraEnabled : company.hraEnabled,
        hraPct: ov.hraPct !== undefined ? ov.hraPct : company.hraPct,
        oaEnabled: ov.oaEnabled !== undefined ? ov.oaEnabled : company.oaEnabled,
        oaPct: ov.oaPct !== undefined ? ov.oaPct : company.oaPct,
        caEnabled: ov.caEnabled !== undefined ? ov.caEnabled : company.caEnabled,
        caPct: ov.caPct !== undefined ? ov.caPct : company.caPct,
        ltaEnabled: ov.ltaEnabled !== undefined ? ov.ltaEnabled : company.ltaEnabled,
        ltaPct: ov.ltaPct !== undefined ? ov.ltaPct : company.ltaPct,
        ptEnabled: ov.ptEnabled !== undefined ? ov.ptEnabled : company.ptEnabled,
        ptAmount: ov.ptAmountOverride !== undefined ? ov.ptAmountOverride : company.ptAmount,
        employeePfEnabled: ov.pfEmployeeEnabled !== undefined ? ov.pfEmployeeEnabled : true,
        employerPfEnabled: ov.pfEmployerEnabled !== undefined ? ov.pfEmployerEnabled : true,
        employeePfPct: ov.employeePfPct !== undefined ? ov.employeePfPct : (company.employeePfPct ?? 12),
        employerPfPct: ov.employerPfPct !== undefined ? ov.employerPfPct : (company.employerPfPct ?? 13),
        pfRules: {
          ...company.pfRules,
          enabled: ov.pfEnabled !== undefined ? ov.pfEnabled : (company.pfRules?.enabled !== false),
          employeePct: ov.employeePfPct !== undefined ? ov.employeePfPct : (company.employeePfPct ?? company.pfRules?.employeePct ?? 12),
          employerPct: ov.employerPfPct !== undefined ? ov.employerPfPct : (company.employerPfPct ?? company.pfRules?.employerPct ?? 13),
        },
        employeeEsiEnabled: ov.esiEmployeeEnabled !== undefined ? ov.esiEmployeeEnabled : true,
        employerEsiEnabled: ov.esiEmployerEnabled !== undefined ? ov.esiEmployerEnabled : true,
        employeeEsiPct: ov.employeeEsiPct !== undefined ? ov.employeeEsiPct : (company.employeeEsiPct ?? 0.75),
        employerEsiPct: ov.employerEsiPct !== undefined ? ov.employerEsiPct : (company.employerEsiPct ?? 3.25),
        esiRules: {
          ...company.esiRules,
          enabled: ov.esiEnabled !== undefined ? ov.esiEnabled : (company.esiRules?.enabled !== false),
          employeePct: ov.employeeEsiPct !== undefined ? ov.employeeEsiPct : (company.employeeEsiPct ?? company.esiRules?.employeePct ?? 0.75),
          employerPct: ov.employerEsiPct !== undefined ? ov.employerEsiPct : (company.employerEsiPct ?? company.esiRules?.employerPct ?? 3.25),
        },
        lwfRules: {
          ...company.lwfRules,
          enabled: ov.lwfEnabled !== undefined ? ov.lwfEnabled : (company.lwfRules?.enabled === true),
          employeeAmount: ov.lwfAmountOverride !== undefined ? ov.lwfAmountOverride : (company.lwfRules?.employeeAmount ?? 10),
        },
        earnings: ov.customAllowances !== undefined ? (ov.customAllowances as any) : company.earnings,
      };

      const attBonusEnabled = ov.attBonusEnabled !== undefined ? ov.attBonusEnabled : (company.attendanceBonusRules?.enabled === true);
      const attBonusEligible = attBonusEnabled && monthAtt.filter((a) => a.status === "absent").length === 0;
      const attBonus = attBonusEligible ? (ov.attBonusAmount !== undefined ? ov.attBonusAmount : (company.attendanceBonusRules?.value ?? 500)) : 0;

      const yrBonusEnabled = ov.yrBonusEnabled !== undefined ? ov.yrBonusEnabled : (company.yearlyBonusRules?.enabled === true);
      const yrBonus = yrBonusEnabled ? (ov.yrBonusAmount !== undefined ? ov.yrBonusAmount : (company.yearlyBonusRules?.value ?? 500)) : 0;

      const effectiveOtHours = ov.otHours !== undefined ? ov.otHours : otHours;
      const effectiveIncentive = ov.incentive !== undefined ? ov.incentive : 0;
      const effectiveBonus = (ov.bonus !== undefined ? ov.bonus : 0) + attBonus + yrBonus;
      // Automatically calculate approved Advance Loan EMI deductions for this employee in selectedMonth
      const activeLoanRequests = (requests || []).filter((r: any) => {
        if (r.category !== "loan" && r.category !== "advance_loan") return false;
        const matchesEmp =
          r.employeeId === emp.id ||
          (emp.empCode && r.empCode === emp.empCode) ||
          r.employeeName === emp.name;
        if (!matchesEmp) return false;
        const isApproved = r.status === "Approved" || r.status === "Disbursed";
        if (!isApproved) return false;

        const startMonth = r.metadata?.startMonth || (r.date ? r.date.slice(0, 7) : (r.createdAt ? r.createdAt.slice(0, 7) : ""));
        const tenorMonths = r.metadata?.tenorMonths || (r.tenor?.includes("1") ? 1 : r.tenor?.includes("2") ? 2 : r.tenor?.includes("3") ? 3 : r.tenor?.includes("6") ? 6 : 1);
        if (!startMonth) return true;

        const [sYear, sMonth] = startMonth.split("-").map(Number);
        const [curYear, curMonth] = selectedMonth.split("-").map(Number);
        const startTotalMonths = sYear * 12 + sMonth;
        const curTotalMonths = curYear * 12 + curMonth;
        const endTotalMonths = startTotalMonths + tenorMonths - 1;

        return curTotalMonths >= startTotalMonths && curTotalMonths <= endTotalMonths;
      });

      const activeLoanEmiSum = activeLoanRequests.reduce((sum: number, r: any) => {
        const tenorMonths = r.metadata?.tenorMonths || (r.tenor?.includes("1") ? 1 : r.tenor?.includes("2") ? 2 : r.tenor?.includes("3") ? 3 : r.tenor?.includes("6") ? 6 : 1);
        const emi = r.metadata?.monthlyEmi || Math.round((Number(r.amount) || 0) / tenorMonths);
        return sum + emi;
      }, 0);

      const effectiveLoan = ov.loan !== undefined ? ov.loan : activeLoanEmiSum;
      const effectiveAdvance = ov.advance !== undefined ? ov.advance : 0;
      const effectiveOtherDeductions = ov.otherDeductions !== undefined ? ov.otherDeductions : 0;
      const effectiveVariablePay = ov.variablePay !== undefined ? ov.variablePay : 0;
      const effectiveOtherEarnings = ov.otherEarnings !== undefined ? ov.otherEarnings : 0;

      const effectiveEmp = ov.customBasic ? { ...emp, basic: ov.customBasic } : emp;

      const comp = computePayroll({
        company: effectiveCompany,
        employee: effectiveEmp,
        daysWorked: effectiveDaysWorked,
        otHours: effectiveOtHours,
        incentive: effectiveIncentive,
        shiftDays: daysPresent + daysHalf,
        loan: effectiveLoan,
        advance: effectiveAdvance,
        bonus: effectiveBonus,
        otherDeductions: effectiveOtherDeductions,
        variablePay: effectiveVariablePay,
        otherEarnings: effectiveOtherEarnings,
      });

      return {
        emp: effectiveEmp,
        rawEmp: emp,
        paidDays: effectiveDaysWorked,
        rawPresentDays,
        weekOffDays,
        weekOffEnabled,
        rosterWeekOffDays,
        otHours: effectiveOtHours,
        comp,
        monthAttCount: monthAtt.length,
        hasOverride: !!monthlyOverrides[overrideKey],
        overrideData: ov,
      };
    });
  }, [filteredEmployees, attendance, roster, selectedMonth, company, monthlyOverrides]);

  // Live computation for the employee being edited in the Edit Dialog
  const editingComp = useMemo(() => {
    if (!editingRecord) return null;

    const effectiveCompany: Company = {
      ...company,
      basicPct: editingRecord.basicPct,
      daEnabled: editingRecord.daEnabled,
      daPct: editingRecord.daPct,
      hraEnabled: editingRecord.hraEnabled,
      hraPct: editingRecord.hraPct,
      oaEnabled: editingRecord.oaEnabled,
      oaPct: editingRecord.oaPct,
      caEnabled: editingRecord.caEnabled,
      caPct: editingRecord.caPct,
      ltaEnabled: editingRecord.ltaEnabled,
      ltaPct: editingRecord.ltaPct,
      ptEnabled: editingRecord.ptEnabled,
      ptAmount: editingRecord.ptAmountOverride,
      employeePfEnabled: editingRecord.pfEmployeeEnabled,
      employerPfEnabled: editingRecord.pfEmployerEnabled,
      employeePfPct: editingRecord.employeePfPct,
      employerPfPct: editingRecord.employerPfPct,
      pfRules: {
        ...company.pfRules,
        enabled: editingRecord.pfEnabled,
        employeePct: editingRecord.employeePfPct,
        employerPct: editingRecord.employerPfPct,
      },
      employeeEsiEnabled: editingRecord.esiEmployeeEnabled,
      employerEsiEnabled: editingRecord.esiEmployerEnabled,
      employeeEsiPct: editingRecord.employeeEsiPct,
      employerEsiPct: editingRecord.employerEsiPct,
      esiRules: {
        ...company.esiRules,
        enabled: editingRecord.esiEnabled,
        employeePct: editingRecord.employeeEsiPct,
        employerPct: editingRecord.employerEsiPct,
      },
      lwfRules: {
        ...company.lwfRules,
        enabled: editingRecord.lwfEnabled,
        employeeAmount: editingRecord.lwfAmountOverride,
      },
      earnings: editingRecord.customAllowances as any,
    };

    const totalBonus =
      (editingRecord.attBonusEnabled ? editingRecord.attBonusAmount : 0) +
      (editingRecord.yrBonusEnabled ? editingRecord.yrBonusAmount : 0) +
      (editingRecord.bonus || 0);

    return computePayroll({
      company: effectiveCompany,
      employee: { ...editingRecord.emp, basic: editingRecord.customBasic },
      daysWorked: editingRecord.daysWorked,
      otHours: editingRecord.otHours,
      incentive: editingRecord.incentive,
      shiftDays: editingRecord.daysWorked,
      loan: editingRecord.loan,
      advance: editingRecord.advance,
      bonus: totalBonus,
      otherDeductions: editingRecord.otherDeductions,
      variablePay: editingRecord.variablePay,
      otherEarnings: editingRecord.otherEarnings,
    });
  }, [editingRecord, company]);
  // Computed summaries for Tab 2 (Monthly Payroll Run)
  const runTotals = useMemo(() => {
    return monthlyRegister.reduce(
      (acc, item) => ({
        totalNet: acc.totalNet + item.comp.net,
        totalGross: acc.totalGross + item.comp.gross,
        totalDeductions: acc.totalDeductions + item.comp.totalDeductions,
        totalCtc: acc.totalCtc + item.comp.monthlyCTC,
        count: acc.count + 1,
      }),
      { totalNet: 0, totalGross: 0, totalDeductions: 0, totalCtc: 0, count: 0 }
    );
  }, [monthlyRegister]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/80 backdrop-blur-sm p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Payroll Management
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold px-2 py-0.5">
                Statutory Compliant
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure salary structures, simulate CTC allocations, review live payslips, and process monthly registers.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={handleSavePayrollSettings}
            disabled={savingSettings}
            className="h-9 px-4 rounded-xl shadow-xs bg-primary text-primary-foreground font-semibold text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingSettings ? "Saving..." : "Save Settings to DB"}</span>
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={mainTab} onValueChange={(v: any) => setMainTab(v)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-2.5">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto">
            <TabsTrigger value="structure" className="rounded-lg gap-2 text-xs font-semibold py-1.5 px-3">
              <Coins className="h-3.5 w-3.5" />
              <span>Salary Structure & Live Payslip</span>
            </TabsTrigger>
            <TabsTrigger value="run" className="rounded-lg gap-2 text-xs font-semibold py-1.5 px-3">
              <Calculator className="h-3.5 w-3.5" />
              <span>Monthly Payroll Run</span>
              {monthlyRegister.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {monthlyRegister.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="revision" className="rounded-lg gap-2 text-xs font-semibold py-1.5 px-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Salary Revisions</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SPLIT SCREEN (CONFIGURATION ON LEFT + REAL PAYSLIP RECEIPT ON RIGHT) */}
        {/* ========================================================================= */}
        <TabsContent value="structure" className="space-y-5 m-0">
          {/* Top Live Benchmark & CTC Simulator Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Benchmark Monthly Gross Input */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Monthly Gross Benchmark</span>
                <DollarSign className="h-3.5 w-3.5 text-primary/70" />
              </div>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-muted-foreground font-bold text-base">₹</span>
                <Input
                  type="number"
                  value={benchmarkSalary}
                  onChange={(e) => setBenchmarkSalary(Number(e.target.value) || 0)}
                  className="pl-7 h-9 font-bold text-base text-foreground rounded-xl bg-muted/20 border-border"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">Base salary baseline for formulas</span>
            </div>

            {/* Annual Fixed CTC */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Annual Fixed CTC</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Fixed</Badge>
              </div>
              <div className="text-2xl font-bold font-display text-foreground tracking-tight">
                {benchmarkSalary ? `${benchmarkCalc.ctcLpa} LPA` : "0.00 LPA"}
              </div>
              <span className="text-[11px] text-muted-foreground">Fixed Gross × 12 months</span>
            </div>

            {/* Estimated In-Hand Salary */}
            <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 bg-emerald-500/[0.03] shadow-xs flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                <span>Estimated In-Hand</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0 font-bold">
                  Take-Home
                </Badge>
              </div>
              <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 tracking-tight">
                {inr(benchmarkCalc.salaryInHand)}
              </div>
              <span className="text-[11px] text-muted-foreground">After active statutory deductions</span>
            </div>

            {/* Total Cost to Company (CTC) */}
            <div className="p-4 rounded-2xl bg-card border border-primary/30 bg-primary/[0.03] shadow-xs flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-xs text-primary font-semibold uppercase tracking-wider">
                <span>Total Monthly CTC</span>
                <span className="text-xs font-bold text-primary font-mono">{benchmarkCalc.totalYearlyCtcLpa} LPA</span>
              </div>
              <div className="text-2xl font-bold font-display text-primary tracking-tight">
                {inr(benchmarkCalc.totalMonthlyCtc)}
              </div>
              <span className="text-[11px] text-muted-foreground">Gross + Bonuses + Employer PF/ESI</span>
            </div>
          </div>

          {/* Warning Banner if Total Earnings Exceeds 100% */}
          {benchmarkCalc.isExceeded && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3.5 text-destructive shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
              <div className="space-y-1 flex-1">
                <div className="font-bold text-sm tracking-tight flex flex-wrap items-center gap-2">
                  <span>Warning: Total Earnings ({benchmarkCalc.totalEarningsPct}%) Exceeds Total Fixed Gross!</span>
                  <Badge variant="destructive" className="text-[10px] font-mono font-bold uppercase">
                    +{(benchmarkCalc.totalEarningsPct - 100).toFixed(1)}% Over Limit
                  </Badge>
                </div>
                <p className="text-xs text-destructive/90 leading-relaxed">
                  The sum of Basic and active Allowances currently amounts to{" "}
                  <span className="font-bold text-destructive">{inr(benchmarkCalc.totalEarnings)}</span> (
                  {benchmarkCalc.totalEarningsPct}%), which exceeds the fixed monthly benchmark of{" "}
                  <span className="font-bold text-destructive">{inr(benchmarkCalc.gross)}</span> by{" "}
                  <span className="font-bold">{inr(benchmarkCalc.totalEarnings - benchmarkCalc.gross)}</span>. Please
                  reduce or disable allowance percentages to balance to 100%.
                </p>
              </div>
            </div>
          )}          {/* FULL WIDTH FIELD SELECTION & SALARY FORMULAS */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            {/* Section Header */}
            <div className="bg-muted/40 px-5 py-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-base text-foreground">
                    FIELD SELECTION &amp; SALARY FORMULAS
                  </h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                    Master Blueprint
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toggle components ON/OFF and adjust rate percentages to define the organization's standard salary structure.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {benchmarkCalc.isExceeded ? (
                  <Badge variant="destructive" className="gap-1.5 font-bold text-xs px-2.5 py-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Total: {benchmarkCalc.totalEarningsPct}% (Over 100%)
                  </Badge>
                ) : benchmarkCalc.totalEarningsPct === 100 ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold text-xs px-2.5 py-1 gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 100% Balanced Allocation
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold text-xs px-2.5 py-1 gap-1.5">
                    <Info className="h-3.5 w-3.5" /> {benchmarkCalc.totalEarningsPct}% allocated ({(100 - benchmarkCalc.totalEarningsPct).toFixed(1)}% unallocated)
                  </Badge>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLivePayslipModal(true)}
                  className="h-8.5 px-3 rounded-xl gap-2 font-semibold text-xs bg-background shadow-xs hover:bg-muted"
                >
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <span>Preview Live Payslip</span>
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted/30 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-5 py-3 text-left w-[44%]">Component &amp; Toggle</th>
                    <th className="px-5 py-3 text-left w-[36%]">Formula / Rate Specification</th>
                    <th className="px-5 py-3 text-right w-[20%]">Calculated Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* Fixed Benchmark Row */}
                  <tr className="bg-muted/20 font-medium">
                    <td className="px-5 py-3 text-foreground font-semibold flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span>Monthly Gross Benchmark</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">Standard monthly benchmark used for live simulator</td>
                    <td className="px-5 py-3 text-right font-bold text-foreground text-base">{inr(benchmarkCalc.gross)}</td>
                  </tr>

                  {/* 1. Basic + DA (MANDATORY CORE WAGE - EDITABLE %) */}
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-foreground text-sm">Basic + DA</span>
                        <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 font-bold">
                          Mandatory Core Wage
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground pl-4 mt-0.5">
                        Statutory wage base for EPF, ESI, Gratuity &amp; Overtime rate computations
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={company.basicPct ?? 33.33}
                          onChange={(e) => setCompany({ basicPct: Number(e.target.value) || 0 })}
                          className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of Monthly Gross</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-foreground text-sm">{inr(benchmarkCalc.basic)}</td>
                  </tr>

                  {/* ALLOWANCES SUB-HEADER */}
                  <tr className="bg-muted/30 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    <td colSpan={3} className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Allowances (Configurable Earnings)</span>
                      </div>
                    </td>
                  </tr>

                  {/* HRA (TOGGLEABLE) */}
                  <tr className={`transition-colors ${benchmarkCalc.hraEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 pl-8 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.hraEnabled}
                          onCheckedChange={(checked) => setCompany({ hraEnabled: checked })}
                        />
                        <div>
                          <span className="text-xs font-semibold text-foreground">HRA (House Rent Allowance)</span>
                          <div className="text-[10px] text-muted-foreground">Exempt under Section 10(13A) of Income Tax Act</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.hraEnabled}
                          value={company.hraPct ?? 16.67}
                          onChange={(e) => setCompany({ hraPct: Number(e.target.value) || 0 })}
                          className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of Monthly Gross</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      {benchmarkCalc.hraEnabled ? inr(benchmarkCalc.hra) : <span className="text-xs text-muted-foreground">Excluded</span>}
                    </td>
                  </tr>

                  {/* OA (TOGGLEABLE) */}
                  <tr className={`transition-colors ${benchmarkCalc.oaEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 pl-8 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.oaEnabled}
                          onCheckedChange={(checked) => setCompany({ oaEnabled: checked })}
                        />
                        <div>
                          <span className="text-xs font-semibold text-foreground">OA (Other Allowance)</span>
                          <div className="text-[10px] text-muted-foreground">General special / supplementary allowance</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.oaEnabled}
                          value={company.oaPct ?? 16.67}
                          onChange={(e) => setCompany({ oaPct: Number(e.target.value) || 0 })}
                          className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of Monthly Gross</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      {benchmarkCalc.oaEnabled ? inr(benchmarkCalc.oa) : <span className="text-xs text-muted-foreground">Excluded</span>}
                    </td>
                  </tr>

                  {/* CA (TOGGLEABLE) */}
                  <tr className={`transition-colors ${benchmarkCalc.caEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 pl-8 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.caEnabled}
                          onCheckedChange={(checked) => setCompany({ caEnabled: checked })}
                        />
                        <div>
                          <span className="text-xs font-semibold text-foreground">CA (Conveyance Allowance)</span>
                          <div className="text-[10px] text-muted-foreground">Transport allowance for commute &amp; field travel</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.caEnabled}
                          value={company.caPct ?? 16.67}
                          onChange={(e) => setCompany({ caPct: Number(e.target.value) || 0 })}
                          className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of Monthly Gross</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      {benchmarkCalc.caEnabled ? inr(benchmarkCalc.ca) : <span className="text-xs text-muted-foreground">Excluded</span>}
                    </td>
                  </tr>

                  {/* LTA (TOGGLEABLE) */}
                  <tr className={`transition-colors ${benchmarkCalc.ltaEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 pl-8 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.ltaEnabled}
                          onCheckedChange={(checked) => setCompany({ ltaEnabled: checked })}
                        />
                        <div>
                          <span className="text-xs font-semibold text-foreground">LTA (Leave Travel Allowance)</span>
                          <div className="text-[10px] text-muted-foreground">Exempt for domestic travel under Section 10(5)</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.ltaEnabled}
                          value={company.ltaPct ?? 16.67}
                          onChange={(e) => setCompany({ ltaPct: Number(e.target.value) || 0 })}
                          className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of Monthly Gross</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      {benchmarkCalc.ltaEnabled ? inr(benchmarkCalc.lta) : <span className="text-xs text-muted-foreground">Excluded</span>}
                    </td>
                  </tr>

                  {/* Custom Allowances (WITH TOGGLES & EDITABLE NAMES) */}
                  {(company.earnings || [])
                    .filter((e) => !["basic", "da", "hra", "oa", "ca", "lta", "ot", "shift", "incentive", "bonus", "arrears"].includes(e.id))
                    .map((item) => {
                      const isItemActive = (item as any).enabled !== false;
                      const calculatedVal =
                        item.formula === "pctOfBasic"
                          ? Math.round(benchmarkCalc.basic * (item.value / 100))
                          : (item as any).formula === "pctOfGross"
                          ? Math.round(benchmarkCalc.gross * (item.value / 100))
                          : item.value;

                      return (
                        <tr key={item.id} className={`transition-colors ${isItemActive ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                          <td className="px-5 py-2.5 pl-8 font-medium">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 max-w-sm">
                                <Switch
                                  checked={isItemActive}
                                  onCheckedChange={(checked) => {
                                    const next = [...(company.earnings || [])];
                                    const targetIdx = next.findIndex((x) => x.id === item.id);
                                    if (targetIdx >= 0) {
                                      next[targetIdx] = { ...next[targetIdx], enabled: checked } as any;
                                      setCompany({ earnings: next });
                                    }
                                  }}
                                />
                                <Input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    const next = [...(company.earnings || [])];
                                    const targetIdx = next.findIndex((x) => x.id === item.id);
                                    if (targetIdx >= 0) {
                                      next[targetIdx] = { ...next[targetIdx], name: e.target.value };
                                      setCompany({ earnings: next });
                                    }
                                  }}
                                  placeholder="Allowance Name"
                                  className="h-7.5 text-xs font-semibold px-2.5 rounded-lg bg-background border-border flex-1"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => {
                                  const next = (company.earnings || []).filter((x) => x.id !== item.id);
                                  setCompany({ earnings: next });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                disabled={!isItemActive}
                                value={item.value}
                                onChange={(ev) => {
                                  const next = [...(company.earnings || [])];
                                  const targetIdx = next.findIndex((x) => x.id === item.id);
                                  if (targetIdx >= 0) next[targetIdx] = { ...next[targetIdx], value: Number(ev.target.value) || 0 };
                                  setCompany({ earnings: next });
                                }}
                                className="h-7.5 w-20 text-xs font-semibold px-2 rounded-lg bg-background"
                              />
                              <Select
                                disabled={!isItemActive}
                                value={
                                  item.formula === "pctOfBasic"
                                    ? "pctOfBasic"
                                    : (item as any).formula === "pctOfGross"
                                    ? "pctOfGross"
                                    : "flatMonthly"
                                }
                                onValueChange={(val: any) => {
                                  const next = [...(company.earnings || [])];
                                  const targetIdx = next.findIndex((x) => x.id === item.id);
                                  if (targetIdx >= 0) {
                                    next[targetIdx] = { ...next[targetIdx], formula: val };
                                    setCompany({ earnings: next });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7.5 text-xs w-28 px-2 rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pctOfGross">% Gross</SelectItem>
                                  <SelectItem value="pctOfBasic">% Basic</SelectItem>
                                  <SelectItem value="flatMonthly">₹ Flat</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-right font-semibold text-foreground">
                            {isItemActive ? inr(calculatedVal) : <span className="text-xs text-muted-foreground">Excluded</span>}
                          </td>
                        </tr>
                      );
                    })}

                  {/* Add Custom Allowance Button */}
                  <tr>
                    <td colSpan={3} className="px-5 py-2.5 bg-muted/10">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newAllowance: EarningComponent & { enabled?: boolean } = {
                            id: `allow-${Date.now()}`,
                            name: "Medical Allowance",
                            formula: "pctOfGross" as any,
                            value: 5,
                            prorate: true,
                            taxable: true,
                            includeInPf: false,
                            includeInEsi: true,
                            includeInGratuity: false,
                            enabled: true,
                          };
                          setCompany({ earnings: [...(company.earnings || []), newAllowance] });
                        }}
                        className="h-7.5 text-xs rounded-lg gap-1.5 border-dashed font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Custom Allowance</span>
                      </Button>
                    </td>
                  </tr>

                  {/* TOTAL EARNINGS ROW */}
                  <tr
                    className={`font-bold border-t transition-colors ${
                      benchmarkCalc.isExceeded
                        ? "bg-destructive/10 text-destructive"
                        : benchmarkCalc.totalEarningsPct === 100
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted/40 text-foreground"
                    }`}
                  >
                    <td className="px-5 py-3.5 font-bold flex items-center gap-2">
                      <span>TOTAL GROSS EARNINGS ALLOCATION</span>
                      {benchmarkCalc.isExceeded ? (
                        <Badge variant="destructive" className="text-[10px] gap-1 font-bold">
                          <AlertTriangle className="h-3 w-3" /> {benchmarkCalc.totalEarningsPct}% (Over)
                        </Badge>
                      ) : benchmarkCalc.totalEarningsPct === 100 ? (
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
                          100% Balanced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                          {benchmarkCalc.totalEarningsPct}%
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-xs text-muted-foreground">
                      {benchmarkCalc.isExceeded ? "Exceeds 100% benchmark gross" : "Active Gross Components Combined"}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-extrabold text-base ${benchmarkCalc.isExceeded ? "text-destructive" : "text-foreground"}`}>
                      {inr(benchmarkCalc.totalEarnings)}
                    </td>
                  </tr>

                  {/* BONUSES HEADER */}
                  <tr className="bg-muted/30 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    <td colSpan={3} className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Bonuses &amp; Additions (Company Discretion)</span>
                      </div>
                    </td>
                  </tr>

                  {/* Attendance Bonus */}
                  <tr className={`transition-colors ${benchmarkCalc.attBonusEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 pl-8 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.attBonusEnabled}
                          onCheckedChange={(checked) =>
                            setCompany({
                              attendanceBonusRules: {
                                enabled: checked,
                                type: "flat",
                                value: company.attendanceBonusRules?.value ?? 500,
                                requireFullAttendance: true,
                              },
                            })
                          }
                        />
                        <div>
                          <span className="text-xs font-semibold">Attendance Bonus</span>
                          <div className="text-[10px] text-muted-foreground">Credited for 100% attendance in the calendar month</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          disabled={!benchmarkCalc.attBonusEnabled}
                          value={company.attendanceBonusRules?.value ?? 500}
                          onChange={(e) =>
                            setCompany({
                              attendanceBonusRules: {
                                enabled: company.attendanceBonusRules?.enabled === true,
                                type: "flat",
                                value: Number(e.target.value) || 0,
                                requireFullAttendance: true,
                              },
                            })
                          }
                          className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">₹ Flat Monthly</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
                      {benchmarkCalc.attBonusEnabled ? `+${inr(benchmarkCalc.attendanceBonus)}` : <span className="text-xs text-muted-foreground">Disabled</span>}
                    </td>
                  </tr>

                  {/* Yearly Bonus */}
                  <tr className={`transition-colors ${benchmarkCalc.yrBonusEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 pl-8 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.yrBonusEnabled}
                          onCheckedChange={(checked) =>
                            setCompany({
                              yearlyBonusRules: {
                                enabled: checked,
                                type: "flat",
                                value: company.yearlyBonusRules?.value ?? 500,
                              },
                            })
                          }
                        />
                        <div>
                          <span className="text-xs font-semibold">Yearly / Festive Bonus</span>
                          <div className="text-[10px] text-muted-foreground">Periodic festive incentive or annual statutory bonus</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          disabled={!benchmarkCalc.yrBonusEnabled}
                          value={company.yearlyBonusRules?.value ?? 500}
                          onChange={(e) =>
                            setCompany({
                              yearlyBonusRules: {
                                enabled: company.yearlyBonusRules?.enabled === true,
                                type: "flat",
                                value: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">₹ Flat Monthly</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
                      {benchmarkCalc.yrBonusEnabled ? `+${inr(benchmarkCalc.yearlyBonus)}` : <span className="text-xs text-muted-foreground">Disabled</span>}
                    </td>
                  </tr>

                  {/* ATTENDANCE & SWIFT ROSTER WEEK OFF SETTINGS */}
                  <tr className="bg-muted/30 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    <td colSpan={3} className="px-5 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-sky-500" />
                          <span>Attendance &amp; Swift Roster Integration</span>
                        </div>
                        <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[9px] border-sky-500/20 font-mono">
                          Auto-Sync
                        </Badge>
                      </div>
                    </td>
                  </tr>

                  <tr className={`transition-colors ${company.includeWeekOff !== false ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3.5 pl-8 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={company.includeWeekOff !== false}
                          onCheckedChange={(checked) => setCompany({ includeWeekOff: checked })}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">Weekly Offs (Swift Roster Planner)</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">Auto</Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            Automatically fetch and credit designated weekly offs from shift planner into attendance
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {company.includeWeekOff !== false ? "Credit Roster Weekly Offs" : "Exclude Weekly Offs"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-sky-600">
                      {company.includeWeekOff !== false ? "Auto-Credited" : <span className="text-xs text-muted-foreground">Disabled</span>}
                    </td>
                  </tr>

                  {/* STATUTORY & DEDUCTIONS HEADER */}
                  <tr className="bg-muted/30 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    <td colSpan={3} className="px-5 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
                          <span>Statutory Deductions &amp; Employer Contribution Split</span>
                        </div>
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] border-rose-500/20 font-mono">
                          EPF &amp; ESI Act
                        </Badge>
                      </div>
                    </td>
                  </tr>

                  {/* PF (Provident Fund) MASTER TOGGLE */}
                  <tr className={`transition-colors ${benchmarkCalc.pfEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.pfEnabled}
                          onCheckedChange={(checked) =>
                            setCompany({
                              pfRules: {
                                ...(company.pfRules || { employeePct: 12, employerPct: 13, ceiling: 15000 }),
                                enabled: checked,
                              },
                            })
                          }
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">Provident Fund (EPF Act 1952)</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                              Ceiling ₹{company.pfRules?.ceiling || 15000}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            Wage Base: Basic + DA = {inr(benchmarkCalc.pfBase)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {benchmarkCalc.pfEnabled ? "EPF Enabled (Configurable Split)" : "EPF Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-xs text-rose-600">
                      {benchmarkCalc.pfEnabled ? "Active Split" : <span className="text-muted-foreground font-normal">Disabled</span>}
                    </td>
                  </tr>

                  {/* PF — EMPLOYEE SHARE */}
                  <tr className={`transition-colors ${benchmarkCalc.pfEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-2.5 pl-12 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span className="text-xs font-medium">Employee PF Share</span>
                        <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                          Deduction
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.pfEnabled}
                          value={company.employeePfPct ?? 12}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setCompany({
                              employeePfPct: val,
                              pfRules: {
                                ...(company.pfRules || { employeePct: 12, employerPct: 13, ceiling: 15000 }),
                                employeePct: val,
                              },
                            });
                          }}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of PF Wage Base</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-rose-600 text-xs">
                      {benchmarkCalc.pfEnabled ? `-${inr(benchmarkCalc.pfEmployee)}` : <span className="text-xs text-muted-foreground">Excluded</span>}
                    </td>
                  </tr>

                  {/* PF — EMPLOYER SHARE */}
                  <tr className={`transition-colors ${benchmarkCalc.pfEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-2.5 pl-12 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="text-xs font-medium">Employer PF Share</span>
                        <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                          Company CTC
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.pfEnabled}
                          value={company.employerPfPct ?? 13}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setCompany({
                              employerPfPct: val,
                              pfRules: {
                                ...(company.pfRules || { employeePct: 12, employerPct: 13, ceiling: 15000 }),
                                employerPct: val,
                              },
                            });
                          }}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of PF Wage Base</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-indigo-600 dark:text-indigo-400 text-xs">
                      {benchmarkCalc.pfEnabled ? `+${inr(benchmarkCalc.pfEmployer)} (CTC)` : <span className="text-xs text-muted-foreground">Excluded</span>}
                    </td>
                  </tr>

                  {/* ESI (State Insurance) MASTER TOGGLE */}
                  <tr className={`transition-colors ${benchmarkCalc.esiEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.esiEnabled}
                          onCheckedChange={(checked) =>
                            setCompany({
                              esiRules: {
                                ...(company.esiRules || { employeePct: 0.75, employerPct: 3.25, threshold: 21000 }),
                                enabled: checked,
                              },
                            })
                          }
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">ESI (Employee State Insurance)</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                              Threshold ≤ ₹{company.esiRules?.threshold || company.esiThreshold || 21000}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            {benchmarkCalc.esiEligible
                              ? `Gross salary ${inr(benchmarkCalc.gross)} is eligible for ESI`
                              : `Gross salary ${inr(benchmarkCalc.gross)} exceeds statutory ₹21k limit`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {benchmarkCalc.esiEnabled ? (benchmarkCalc.esiEligible ? "ESI Applicable" : "Wage Exceeds Limit") : "ESI Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-xs text-rose-600">
                      {benchmarkCalc.esiEnabled ? "Active Split" : <span className="text-muted-foreground font-normal">Disabled</span>}
                    </td>
                  </tr>

                  {/* ESI — EMPLOYEE SHARE */}
                  <tr className={`transition-colors ${benchmarkCalc.esiEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-2.5 pl-12 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span className="text-xs font-medium">Employee ESI Share</span>
                        <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                          Deduction
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          disabled={!benchmarkCalc.esiEnabled}
                          value={company.employeeEsiPct ?? 0.75}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setCompany({
                              employeeEsiPct: val,
                              esiRules: {
                                ...(company.esiRules || { employeePct: 0.75, employerPct: 3.25, threshold: 21000 }),
                                employeePct: val,
                              },
                            });
                          }}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of Gross</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-rose-600 text-xs">
                      {benchmarkCalc.esiEnabled && benchmarkCalc.esiEligible
                        ? `-${inr(benchmarkCalc.esiEmployee)}`
                        : <span className="text-xs text-muted-foreground">{benchmarkCalc.esiEnabled ? "₹0 (Exceeds ₹21k)" : "Excluded"}</span>}
                    </td>
                  </tr>

                  {/* ESI — EMPLOYER SHARE */}
                  <tr className={`transition-colors ${benchmarkCalc.esiEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-2.5 pl-12 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="text-xs font-medium">Employer ESI Share</span>
                        <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                          Company CTC
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          disabled={!benchmarkCalc.esiEnabled}
                          value={company.employerEsiPct ?? 3.25}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setCompany({
                              employerEsiPct: val,
                              esiRules: {
                                ...(company.esiRules || { employeePct: 0.75, employerPct: 3.25, threshold: 21000 }),
                                employerPct: val,
                              },
                            });
                          }}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">% of Gross</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-indigo-600 dark:text-indigo-400 text-xs">
                      {benchmarkCalc.esiEnabled && benchmarkCalc.esiEligible
                        ? `+${inr(benchmarkCalc.esiEmployer)} (CTC)`
                        : <span className="text-xs text-muted-foreground">{benchmarkCalc.esiEnabled ? "₹0 (Exceeds ₹21k)" : "Excluded"}</span>}
                    </td>
                  </tr>

                  {/* Professional Tax (PT) */}
                  <tr className={`transition-colors ${benchmarkCalc.ptEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.ptEnabled}
                          onCheckedChange={(checked) => setCompany({ ptEnabled: checked })}
                        />
                        <div>
                          <span className="text-xs font-semibold">Professional Tax (PT)</span>
                          <div className="text-[10px] text-muted-foreground">State-specific statutory monthly tax slab</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          disabled={!benchmarkCalc.ptEnabled}
                          value={company.ptAmount ?? 208}
                          onChange={(e) => setCompany({ ptAmount: Number(e.target.value) || 0 })}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">₹ Monthly Slab</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-rose-600 text-xs">
                      {benchmarkCalc.ptEnabled ? `-${inr(benchmarkCalc.pt)}` : <span className="text-xs text-muted-foreground">Disabled</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: MONTHLY PAYROLL RUN & PROCESSING                                   */}
        {/* ========================================================================= */}
        <TabsContent value="run" className="space-y-4 m-0">
          {/* Top KPI Metric Strip for the Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Net Salary Outflow */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Net Outflow</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0">
                  {runTotals.count} Staff
                </Badge>
              </div>
              <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 tracking-tight">
                {inr(runTotals.totalNet)}
              </div>
              <span className="text-[11px] text-muted-foreground">Total net payable in-hand</span>
            </div>

            {/* Total Gross Earnings */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Gross Earned</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Base</Badge>
              </div>
              <div className="text-2xl font-bold font-display text-foreground tracking-tight">
                {inr(runTotals.totalGross)}
              </div>
              <span className="text-[11px] text-muted-foreground">Fixed gross earned this month</span>
            </div>

            {/* Total Deductions */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Statutory Deductions</span>
                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[9px] px-1.5 py-0">
                  EPF/ESI/PT
                </Badge>
              </div>
              <div className="text-2xl font-bold font-display text-rose-600 tracking-tight">
                -{inr(runTotals.totalDeductions)}
              </div>
              <span className="text-[11px] text-muted-foreground">Employee statutory withholdings</span>
            </div>

            {/* Total Company CTC Liability */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Total CTC Liability</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">
                  Company Cost
                </Badge>
              </div>
              <div className="text-2xl font-bold font-display text-primary tracking-tight">
                {inr(runTotals.totalCtc)}
              </div>
              <span className="text-[11px] text-muted-foreground">Gross + Employer PF/ESI share</span>
            </div>
          </div>

          {/* Controls Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/80 p-3.5 rounded-2xl border border-border/80">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-auto h-8 text-xs font-bold rounded-xl bg-background"
                />
              </div>

              {/* Payroll Lock Banner */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isMonthLocked ? "destructive" : "outline"}
                  className="h-8 rounded-xl text-xs gap-1.5 font-semibold"
                  onClick={() => {
                    lockPayrollMonth(selectedMonth, !isMonthLocked);
                    toast.success(isMonthLocked ? `Payroll unlocked for ${selectedMonth}` : `Payroll locked for ${selectedMonth}`);
                  }}
                >
                  {isMonthLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{isMonthLocked ? "Payroll Locked" : "Lock Payroll"}</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative w-full sm:w-48">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="h-8 text-xs pl-8 rounded-xl bg-background w-full"
                />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="h-8 text-xs w-36 rounded-xl bg-background">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Monthly Payroll Register Table */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr className="text-left">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Fixed Salary</th>
                    <th className="px-4 py-3">Attendance &amp; OT</th>
                    <th className="px-4 py-3">Gross Earned</th>
                    <th className="px-4 py-3">Deductions</th>
                    <th className="px-4 py-3">Net In-Hand</th>
                    <th className="px-4 py-3">Monthly CTC</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {monthlyRegister.map(({ emp, rawEmp, paidDays, rawPresentDays, weekOffDays, weekOffEnabled, rosterWeekOffDays, otHours, comp, hasOverride, overrideData }) => (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground text-xs">{emp.name}</span>
                              {hasOverride && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px] px-1 py-0">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{emp.empCode} · {emp.department}</div>
                          </div>
                        </div>
                      </td>

                      {/* Fixed Salary */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground text-xs">{inr(emp.basic || 30000)}</div>
                        <div className="text-[10px] text-muted-foreground">{(((emp.basic || 30000) * 12) / 100000).toFixed(2)} LPA</div>
                      </td>

                      {/* Present Days / WO / OT */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold text-[11px] px-1.5 py-0.5 whitespace-nowrap">
                            {paidDays}/{company.workingDaysPerMonth || 26} Present
                          </Badge>
                          {otHours > 0 && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0 whitespace-nowrap">
                              +{otHours}h OT
                            </Badge>
                          )}
                        </div>
                        {weekOffEnabled && (
                          <div className="text-[10px] text-sky-600 font-medium mt-0.5">
                            Weekoff: {weekOffDays}d
                          </div>
                        )}
                      </td>

                      {/* Gross Earned */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-xs">{inr(comp.gross)}</div>
                      </td>

                      {/* Deductions */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-rose-600 text-xs">-{inr(comp.totalDeductions)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          PF: {inr(comp.deductions.employeePF)} | PT: {inr(comp.deductions.professionalTax)}
                        </div>
                      </td>

                      {/* Net In Hand */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-xs px-2 py-0.5">
                          {inr(comp.net)}
                        </Badge>
                      </td>

                      {/* Total CTC */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-primary text-xs">{inr(comp.monthlyCTC)}</div>
                        <div className="text-[10px] text-muted-foreground">{((comp.monthlyCTC * 12) / 100000).toFixed(2)} LPA</div>
                      </td>

                      {/* Actions: PREVIEW, EDIT, DOWNLOAD PDF */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* PREVIEW BUTTON */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewTarget({ emp, paidDays, rawPresentDays, weekOffDays, weekOffEnabled, otHours, comp })}
                            className="h-7.5 px-2 text-xs rounded-lg gap-1 text-primary hover:bg-primary/10 font-medium"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </Button>

                          {/* EDIT BUTTON (INDIVIDUAL EMPLOYEE OVERRIDE) */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const defaultCustomAllowances: CustomAllowanceItem[] = (company.earnings || [])
                                .filter((item) => !["basic", "da", "hra", "oa", "ca", "lta", "ot", "shift", "incentive", "bonus", "arrears"].includes(item.id))
                                .map((c) => ({
                                  id: c.id,
                                  name: c.name,
                                  formula: ((c as any).formula || "pctOfBasic") as "pctOfGross" | "pctOfBasic" | "flatMonthly",
                                  value: c.value,
                                  enabled: (c as any).enabled !== false,
                                }));

                              setEditingRecord({
                                emp: rawEmp,
                                customBasic: overrideData.customBasic !== undefined ? overrideData.customBasic : emp.basic,
                                daysWorked: overrideData.daysWorked !== undefined ? overrideData.daysWorked : rawPresentDays,
                                otHours: overrideData.otHours !== undefined ? overrideData.otHours : otHours,
                                weekOffEnabled: overrideData.weekOffEnabled !== undefined ? overrideData.weekOffEnabled : (company.includeWeekOff !== false),
                                weekOffDays: overrideData.weekOffDays !== undefined ? overrideData.weekOffDays : rosterWeekOffDays,
                                // Component percentages & toggles:
                                basicPct: overrideData.basicPct !== undefined ? overrideData.basicPct : (company.basicPct ?? 20),
                                daEnabled: overrideData.daEnabled !== undefined ? overrideData.daEnabled : (company.daEnabled !== false),
                                daPct: overrideData.daPct !== undefined ? overrideData.daPct : (company.daPct ?? 13.33),
                                hraEnabled: overrideData.hraEnabled !== undefined ? overrideData.hraEnabled : (company.hraEnabled !== false),
                                hraPct: overrideData.hraPct !== undefined ? overrideData.hraPct : (company.hraPct ?? 16.67),
                                oaEnabled: overrideData.oaEnabled !== undefined ? overrideData.oaEnabled : (company.oaEnabled !== false),
                                oaPct: overrideData.oaPct !== undefined ? overrideData.oaPct : (company.oaPct ?? 16.67),
                                caEnabled: overrideData.caEnabled !== undefined ? overrideData.caEnabled : (company.caEnabled !== false),
                                caPct: overrideData.caPct !== undefined ? overrideData.caPct : (company.caPct ?? 16.67),
                                ltaEnabled: overrideData.ltaEnabled !== undefined ? overrideData.ltaEnabled : (company.ltaEnabled !== false),
                                ltaPct: overrideData.ltaPct !== undefined ? overrideData.ltaPct : (company.ltaPct ?? 16.67),
                                customAllowances: overrideData.customAllowances !== undefined ? overrideData.customAllowances : defaultCustomAllowances,
                                // Bonuses:
                                attBonusEnabled: overrideData.attBonusEnabled !== undefined ? overrideData.attBonusEnabled : (company.attendanceBonusRules?.enabled === true),
                                attBonusAmount: overrideData.attBonusAmount !== undefined ? overrideData.attBonusAmount : (company.attendanceBonusRules?.value ?? 500),
                                yrBonusEnabled: overrideData.yrBonusEnabled !== undefined ? overrideData.yrBonusEnabled : (company.yearlyBonusRules?.enabled === true),
                                yrBonusAmount: overrideData.yrBonusAmount !== undefined ? overrideData.yrBonusAmount : (company.yearlyBonusRules?.value ?? 500),
                                incentive: overrideData.incentive !== undefined ? overrideData.incentive : 0,
                                bonus: overrideData.bonus !== undefined ? overrideData.bonus : 0,
                                variablePay: overrideData.variablePay !== undefined ? overrideData.variablePay : 0,
                                otherEarnings: overrideData.otherEarnings !== undefined ? overrideData.otherEarnings : 0,
                                // Deductions:
                                pfEnabled: overrideData.pfEnabled !== undefined ? overrideData.pfEnabled : (company.pfRules?.enabled !== false),
                                pfEmployeeEnabled: overrideData.pfEmployeeEnabled !== undefined ? overrideData.pfEmployeeEnabled : true,
                                pfEmployerEnabled: overrideData.pfEmployerEnabled !== undefined ? overrideData.pfEmployerEnabled : true,
                                employeePfPct: overrideData.employeePfPct !== undefined ? overrideData.employeePfPct : (company.employeePfPct ?? 12),
                                employerPfPct: overrideData.employerPfPct !== undefined ? overrideData.employerPfPct : (company.employerPfPct ?? 13),
                                esiEnabled: overrideData.esiEnabled !== undefined ? overrideData.esiEnabled : (company.esiRules?.enabled !== false),
                                esiEmployeeEnabled: overrideData.esiEmployeeEnabled !== undefined ? overrideData.esiEmployeeEnabled : true,
                                esiEmployerEnabled: overrideData.esiEmployerEnabled !== undefined ? overrideData.esiEmployerEnabled : true,
                                employeeEsiPct: overrideData.employeeEsiPct !== undefined ? overrideData.employeeEsiPct : (company.employeeEsiPct ?? 0.75),
                                employerEsiPct: overrideData.employerEsiPct !== undefined ? overrideData.employerEsiPct : (company.employerEsiPct ?? 3.25),
                                ptEnabled: overrideData.ptEnabled !== undefined ? overrideData.ptEnabled : (company.ptEnabled !== false),
                                ptAmountOverride: overrideData.ptAmountOverride !== undefined ? overrideData.ptAmountOverride : (comp.deductions.professionalTax || company.ptAmount || 208),
                                lwfEnabled: overrideData.lwfEnabled !== undefined ? overrideData.lwfEnabled : (company.lwfRules?.enabled === true),
                                lwfAmountOverride: overrideData.lwfAmountOverride !== undefined ? overrideData.lwfAmountOverride : (company.lwfRules?.employeeAmount ?? 10),
                                tds: overrideData.tds !== undefined ? overrideData.tds : 0,
                                loan: overrideData.loan !== undefined ? overrideData.loan : 0,
                                advance: overrideData.advance !== undefined ? overrideData.advance : 0,
                                otherDeductions: overrideData.otherDeductions !== undefined ? overrideData.otherDeductions : 0,
                                notes: overrideData.notes || "",
                              });
                            }}
                            className="h-7.5 px-2 text-xs rounded-lg gap-1 text-amber-600 hover:bg-amber-500/10 font-medium"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>

                          {/* PDF DOWNLOAD BUTTON */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await generateSalarySlipPDF(company, emp, selectedMonth, comp, paidDays, weekOffEnabled ? weekOffDays : 0, docAssets);
                                toast.success(`Payslip downloaded for ${emp.name}`);
                              } catch (err) {
                                console.error("[Payroll] PDF generation failed:", err);
                                toast.error(`Failed to generate PDF for ${emp.name}`);
                              }
                            }}
                            className="h-7.5 px-2 text-xs rounded-lg gap-1 text-muted-foreground hover:text-foreground font-medium"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            <span>PDF</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: AI SALARY REVISION SIMULATOR                                       */}
        {/* ========================================================================= */}
        <TabsContent value="revision" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-border bg-card md:col-span-1 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Salary Revision Simulator</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Simulate salary increments and evaluate financial impact before applying.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Select Employee</Label>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.empCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Adjustment Amount (₹)</Label>
                  <Input
                    type="number"
                    value={revAmount}
                    onChange={(e) => setRevAmount(Number(e.target.value) || 0)}
                    placeholder="e.g. 5000"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Reason</Label>
                  <Select value={revReason} onValueChange={(v: any) => setRevReason(v)}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increment">Annual Increment</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="correction">Market Correction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => {
                    const emp = employees.find((e) => e.id === selectedEmpId);
                    if (!emp || revAmount === 0) return toast.error("Enter a valid adjustment amount");
                    applySalaryRevision(
                      {
                        employeeId: emp.id,
                        amount: revAmount,
                        target: revTarget,
                        reason: revReason,
                        effectiveDate: revEffective,
                        arrears: false,
                        retro: false,
                        recalcAttendance: true,
                        recalcLeave: true,
                        recalcOt: true,
                        recalcBonus: true,
                        recalcIncentive: true,
                        updateTaxProjection: true,
                        applyToFuture: true,
                      },
                      currentUser?.name || "Admin"
                    );
                    toast.success("Salary revision applied successfully");
                    setRevAmount(0);
                  }}
                  className="w-full bg-primary text-primary-foreground font-semibold rounded-xl mt-2 h-9 text-xs"
                >
                  Apply Revision
                </Button>
              </CardContent>
            </Card>

            {/* Impact Preview */}
            <Card className="rounded-2xl border-border bg-card md:col-span-2 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Financial Impact Projection</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Before vs After comparison of monthly In-Hand and Employer CTC liability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const emp = employees.find((e) => e.id === selectedEmpId);
                  const currentBasic = emp?.basic || 30000;
                  const newBasic = currentBasic + revAmount;
                  const currentLpa = ((currentBasic * 12) / 100000).toFixed(2);
                  const newLpa = ((newBasic * 12) / 100000).toFixed(2);

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Package</span>
                        <div className="text-2xl font-bold font-display text-foreground">{inr(currentBasic)} / mo</div>
                        <div className="text-xs text-muted-foreground">{currentLpa} LPA CTC</div>
                      </div>

                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Revised Package (+{inr(revAmount)})</span>
                        <div className="text-2xl font-bold font-display text-emerald-600">{inr(newBasic)} / mo</div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">{newLpa} LPA CTC</div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL 1: LIVE PAYSLIP PREVIEW DIALOG                                      */}
      {/* ========================================================================= */}
      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border border-border shadow-2xl">
          {previewTarget && (
            <PayslipTemplateView
              company={company}
              employee={previewTarget.emp}
              month={selectedMonth}
              computation={previewTarget.comp}
              docAssets={docAssets}
              paidDays={previewTarget.paidDays}
              rawPresentDays={previewTarget.rawPresentDays}
              weekOffDays={previewTarget.weekOffDays}
              weekOffEnabled={previewTarget.weekOffEnabled}
              onDownloadPdf={async () => {
                try {
                  await generateSalarySlipPDF(
                    company,
                    previewTarget.emp,
                    selectedMonth,
                    previewTarget.comp,
                    previewTarget.paidDays,
                    previewTarget.weekOffEnabled ? previewTarget.weekOffDays : 0,
                    docAssets
                  );
                  toast.success(`Payslip PDF downloaded for ${previewTarget.emp.name}`);
                } catch (err) {
                  console.error("[Payroll Modal] PDF generation failed:", err);
                  toast.error(`Failed to generate PDF for ${previewTarget.emp.name}`);
                }
              }}
              onPrint={() => window.print()}
              onClose={() => setPreviewTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EMPLOYEE-SPECIFIC PAYROLL OVERRIDE DIALOG (FULL OPTIONS)    */}
      {/* ========================================================================= */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
          {editingRecord && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-amber-500" />
                    <span>Edit Payslip — {editingRecord.emp.name} ({editingRecord.emp.empCode})</span>
                  </DialogTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                    {selectedMonth}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Customize component formulas, toggle allowances/deductions, and adjust attendance &amp; weekoffs specifically for this employee.
                </DialogDescription>
              </DialogHeader>

              {/* Two-Column Layout: Controls (7 Cols) & Live Impact Preview (5 Cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Full Controls */}
                <div className="lg:col-span-7 space-y-4">
                  {/* 1. Base Salary, Attendance & Swift Roster Week Off */}
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        1. Benchmark Salary, Attendance &amp; Week Off
                      </div>
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20 text-[10px] gap-1">
                        <Clock className="h-3 w-3" /> Swift Roster Synced
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Fixed Monthly Salary */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Fixed Salary / Gross (₹)</Label>
                        <Input
                          type="number"
                          value={editingRecord.customBasic}
                          onChange={(e) => setEditingRecord({ ...editingRecord, customBasic: Number(e.target.value) || 0 })}
                          className="h-8 text-xs font-bold text-foreground"
                        />
                      </div>

                      {/* Present / Worked Days */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Present Days</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editingRecord.daysWorked}
                          onChange={(e) => setEditingRecord({ ...editingRecord, daysWorked: Number(e.target.value) || 0 })}
                          className="h-8 text-xs font-bold text-emerald-600"
                        />
                      </div>

                      {/* Weekly Off (Swift Roster) */}
                      <div className="space-y-1 p-2 rounded-xl bg-card border border-border/60">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Week Off (WO)</Label>
                          <Switch
                            checked={editingRecord.weekOffEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, weekOffEnabled: val })}
                          />
                        </div>
                        {editingRecord.weekOffEnabled ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Input
                              type="number"
                              step="0.5"
                              value={editingRecord.weekOffDays}
                              onChange={(e) => setEditingRecord({ ...editingRecord, weekOffDays: Number(e.target.value) || 0 })}
                              className="h-7 text-xs font-bold text-sky-600"
                            />
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Days</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic mt-1.5">Excluded (0 WO)</div>
                        )}
                      </div>

                      {/* Overtime Hours */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Overtime Hours (OT)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editingRecord.otHours}
                          onChange={(e) => setEditingRecord({ ...editingRecord, otHours: Number(e.target.value) || 0 })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-200">
                      <div className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                        <span>Payslip Attendance:</span>
                        <span className="font-bold">
                          {editingRecord.daysWorked} Present Days + Weekoff: {editingRecord.weekOffEnabled ? editingRecord.weekOffDays : 0} days
                        </span>
                      </div>
                      <span className="text-[10px] text-sky-700/80 dark:text-sky-300/80 font-medium">
                        Roster Default: {getRosterWeekOffDays(editingRecord.emp.id, editingRecord.emp.name, selectedMonth, roster)} Days
                      </span>
                    </div>
                  </div>

                  {/* 2. Salary Components & Allowances */}
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        2. Salary Components & Allowances
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Formula Rates (% of Gross)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Basic + DA */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold">Basic + DA</span>
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0">Mandatory Core Wage</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingRecord.basicPct}
                            onChange={(e) => setEditingRecord({ ...editingRecord, basicPct: Number(e.target.value) || 0 })}
                            className="h-7 w-16 text-xs text-right font-semibold"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <span className="text-xs font-bold text-foreground w-20 text-right">
                            {inr(Math.round(editingRecord.customBasic * (editingRecord.basicPct / 100)))}
                          </span>
                        </div>
                      </div>

                      {/* HRA */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={editingRecord.hraEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, hraEnabled: val })}
                          />
                          <span className={`text-xs font-semibold ${editingRecord.hraEnabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
                            House Rent Allowance (HRA)
                          </span>
                        </div>
                        {editingRecord.hraEnabled ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editingRecord.hraPct}
                              onChange={(e) => setEditingRecord({ ...editingRecord, hraPct: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <span className="text-xs font-bold text-foreground w-20 text-right">
                              {inr(Math.round(editingRecord.customBasic * (editingRecord.hraPct / 100)))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Excluded</span>
                        )}
                      </div>

                      {/* OA */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={editingRecord.oaEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, oaEnabled: val })}
                          />
                          <span className={`text-xs font-semibold ${editingRecord.oaEnabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
                            Other Allowance (OA)
                          </span>
                        </div>
                        {editingRecord.oaEnabled ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editingRecord.oaPct}
                              onChange={(e) => setEditingRecord({ ...editingRecord, oaPct: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <span className="text-xs font-bold text-foreground w-20 text-right">
                              {inr(Math.round(editingRecord.customBasic * (editingRecord.oaPct / 100)))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Excluded</span>
                        )}
                      </div>

                      {/* CA */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={editingRecord.caEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, caEnabled: val })}
                          />
                          <span className={`text-xs font-semibold ${editingRecord.caEnabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
                            Conveyance Allowance (CA)
                          </span>
                        </div>
                        {editingRecord.caEnabled ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editingRecord.caPct}
                              onChange={(e) => setEditingRecord({ ...editingRecord, caPct: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <span className="text-xs font-bold text-foreground w-20 text-right">
                              {inr(Math.round(editingRecord.customBasic * (editingRecord.caPct / 100)))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Excluded</span>
                        )}
                      </div>

                      {/* LTA */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={editingRecord.ltaEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, ltaEnabled: val })}
                          />
                          <span className={`text-xs font-semibold ${editingRecord.ltaEnabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
                            Leave Travel Allowance (LTA)
                          </span>
                        </div>
                        {editingRecord.ltaEnabled ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editingRecord.ltaPct}
                              onChange={(e) => setEditingRecord({ ...editingRecord, ltaPct: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <span className="text-xs font-bold text-foreground w-20 text-right">
                              {inr(Math.round(editingRecord.customBasic * (editingRecord.ltaPct / 100)))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Excluded</span>
                        )}
                      </div>

                      {/* Dynamic Custom Allowances */}
                      {editingRecord.customAllowances.map((ca, idx) => (
                        <div key={ca.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Switch
                              checked={ca.enabled}
                              onCheckedChange={(val) => {
                                const copy = [...editingRecord.customAllowances];
                                copy[idx].enabled = val;
                                setEditingRecord({ ...editingRecord, customAllowances: copy });
                              }}
                            />
                            <Input
                              type="text"
                              value={ca.name}
                              onChange={(e) => {
                                const copy = [...editingRecord.customAllowances];
                                copy[idx].name = e.target.value;
                                setEditingRecord({ ...editingRecord, customAllowances: copy });
                              }}
                              className="h-7 text-xs font-medium max-w-[140px]"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={ca.formula}
                              onValueChange={(val: any) => {
                                const copy = [...editingRecord.customAllowances];
                                copy[idx].formula = val;
                                setEditingRecord({ ...editingRecord, customAllowances: copy });
                              }}
                            >
                              <SelectTrigger className="h-7 text-[11px] w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pctOfGross">% Gross</SelectItem>
                                <SelectItem value="pctOfBasic">% Basic</SelectItem>
                                <SelectItem value="flatMonthly">₹ Flat</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={ca.value}
                              onChange={(e) => {
                                const copy = [...editingRecord.customAllowances];
                                copy[idx].value = Number(e.target.value) || 0;
                                setEditingRecord({ ...editingRecord, customAllowances: copy });
                              }}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const copy = editingRecord.customAllowances.filter((_, i) => i !== idx);
                                setEditingRecord({ ...editingRecord, customAllowances: copy });
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Add Custom Allowance Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newId = `custom_${Date.now()}`;
                          const newItem: CustomAllowanceItem = {
                            id: newId,
                            name: "Special Allowance",
                            formula: "pctOfGross",
                            value: 5,
                            enabled: true,
                          };
                          setEditingRecord({
                            ...editingRecord,
                            customAllowances: [...editingRecord.customAllowances, newItem],
                          });
                        }}
                        className="w-full h-8 text-xs border-dashed gap-1.5 font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Custom Allowance</span>
                      </Button>
                    </div>
                  </div>

                  {/* 3. Bonuses & Performance Additions */}
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      3. Bonuses & Performance Additions
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Attendance Bonus */}
                      <div className="p-3 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Attendance Bonus</span>
                          <Switch
                            checked={editingRecord.attBonusEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, attBonusEnabled: val })}
                          />
                        </div>
                        {editingRecord.attBonusEnabled && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              value={editingRecord.attBonusAmount}
                              onChange={(e) => setEditingRecord({ ...editingRecord, attBonusAmount: Number(e.target.value) || 0 })}
                              className="h-7 text-xs font-semibold"
                            />
                          </div>
                        )}
                      </div>

                      {/* Yearly Bonus */}
                      <div className="p-3 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Yearly / Festive Bonus</span>
                          <Switch
                            checked={editingRecord.yrBonusEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, yrBonusEnabled: val })}
                          />
                        </div>
                        {editingRecord.yrBonusEnabled && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              value={editingRecord.yrBonusAmount}
                              onChange={(e) => setEditingRecord({ ...editingRecord, yrBonusAmount: Number(e.target.value) || 0 })}
                              className="h-7 text-xs font-semibold"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Incentive / Commission (₹)</Label>
                        <Input
                          type="number"
                          value={editingRecord.incentive}
                          onChange={(e) => setEditingRecord({ ...editingRecord, incentive: Number(e.target.value) || 0 })}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Variable Pay (₹)</Label>
                        <Input
                          type="number"
                          value={editingRecord.variablePay}
                          onChange={(e) => setEditingRecord({ ...editingRecord, variablePay: Number(e.target.value) || 0 })}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Other Additions (₹)</Label>
                        <Input
                          type="number"
                          value={editingRecord.otherEarnings}
                          onChange={(e) => setEditingRecord({ ...editingRecord, otherEarnings: Number(e.target.value) || 0 })}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Deductions (Statutory & Voluntary) */}
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        4. Deductions &amp; Statutory Controls (Employee &amp; Employer Split)
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                        Statutory Split
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Employee PF */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            <span className="text-xs font-bold">Employee PF Share</span>
                            <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                              Deduction
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.pfEmployeeEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, pfEmployeeEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              step="0.1"
                              disabled={!editingRecord.pfEmployeeEnabled}
                              value={editingRecord.employeePfPct}
                              onChange={(e) => setEditingRecord({ ...editingRecord, employeePfPct: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <span className="text-xs font-bold text-rose-600">
                            {editingRecord.pfEmployeeEnabled && editingComp ? `-${inr(editingComp.deductions.employeePF)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>

                      {/* Employer PF */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            <span className="text-xs font-bold">Employer PF Share</span>
                            <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                              Company CTC
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.pfEmployerEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, pfEmployerEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              step="0.1"
                              disabled={!editingRecord.pfEmployerEnabled}
                              value={editingRecord.employerPfPct}
                              onChange={(e) => setEditingRecord({ ...editingRecord, employerPfPct: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {editingRecord.pfEmployerEnabled && editingComp ? `+${inr(editingComp.employerContrib.employerPF)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>

                      {/* Employee ESI */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            <span className="text-xs font-bold">Employee ESI Share</span>
                            <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                              Deduction
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.esiEmployeeEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, esiEmployeeEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              disabled={!editingRecord.esiEmployeeEnabled}
                              value={editingRecord.employeeEsiPct}
                              onChange={(e) => setEditingRecord({ ...editingRecord, employeeEsiPct: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <span className="text-xs font-bold text-rose-600">
                            {editingRecord.esiEmployeeEnabled && editingComp ? `-${inr(editingComp.deductions.employeeESI)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>

                      {/* Employer ESI */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            <span className="text-xs font-bold">Employer ESI Share</span>
                            <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                              Company CTC
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.esiEmployerEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, esiEmployerEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              disabled={!editingRecord.esiEmployerEnabled}
                              value={editingRecord.employerEsiPct}
                              onChange={(e) => setEditingRecord({ ...editingRecord, employerEsiPct: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {editingRecord.esiEmployerEnabled && editingComp ? `+${inr(editingComp.employerContrib.employerESI)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>

                      {/* PT Switch & Instant Editable Amount */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-xs font-bold">Prof. Tax (PT)</span>
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                              State Slab / Custom
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.ptEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, ptEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              disabled={!editingRecord.ptEnabled}
                              value={editingRecord.ptAmountOverride}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setEditingRecord({ ...editingRecord, ptAmountOverride: isNaN(val) ? 0 : val });
                              }}
                              className="h-7 w-20 text-xs text-right font-bold text-foreground"
                            />
                            <span className="text-[10px] text-muted-foreground">Amount</span>
                          </div>
                          <span className="text-xs font-bold text-rose-600">
                            {editingRecord.ptEnabled && editingComp ? `-${inr(editingComp.deductions.professionalTax)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>

                      {/* LWF Switch & Amount */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-teal-500" />
                            <span className="text-xs font-bold">Labour Fund (LWF)</span>
                          </div>
                          <Switch
                            checked={editingRecord.lwfEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, lwfEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              disabled={!editingRecord.lwfEnabled}
                              value={editingRecord.lwfAmountOverride}
                              onChange={(e) => setEditingRecord({ ...editingRecord, lwfAmountOverride: Number(e.target.value) || 0 })}
                              className="h-7 w-20 text-xs text-right font-bold text-foreground"
                            />
                            <span className="text-[10px] text-muted-foreground">Amount</span>
                          </div>
                          <span className="text-xs font-bold text-rose-600">
                            {editingRecord.lwfEnabled && editingComp ? `-${inr(editingComp.deductions.lwf)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Advance Recovery (₹)</Label>
                        <Input
                          type="number"
                          value={editingRecord.advance}
                          onChange={(e) => setEditingRecord({ ...editingRecord, advance: Number(e.target.value) || 0 })}
                          className="h-8 text-xs font-semibold text-rose-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Loan EMI (₹)</Label>
                        <Input
                          type="number"
                          value={editingRecord.loan}
                          onChange={(e) => setEditingRecord({ ...editingRecord, loan: Number(e.target.value) || 0 })}
                          className="h-8 text-xs font-semibold text-rose-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Other Deductions (₹)</Label>
                        <Input
                          type="number"
                          value={editingRecord.otherDeductions}
                          onChange={(e) => setEditingRecord({ ...editingRecord, otherDeductions: Number(e.target.value) || 0 })}
                          className="h-8 text-xs font-semibold text-rose-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Remarks */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Remarks / Reason for Adjustment</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Approved incentive, custom allowances adjustment"
                      value={editingRecord.notes}
                      onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Right Column: Live Payslip Receipt & Impact Preview */}
                <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
                  <div className="p-5 rounded-3xl bg-card border-2 border-primary/20 shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Live Payslip Impact
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {editingRecord.emp.name} · {selectedMonth}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                        Dynamic Sync
                      </Badge>
                    </div>

                    {editingComp && (
                      <div className="space-y-3.5 text-xs">
                        {/* Attendance Breakdown */}
                        <div className="space-y-1.5 px-3 py-2 rounded-xl bg-muted/40 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Attendance:</span>
                            <span className="font-bold text-foreground">
                              {editingRecord.daysWorked} Present Days + Weekoff: {editingRecord.weekOffEnabled ? editingRecord.weekOffDays : 0} days
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-600 font-semibold">
                            <span>Present / Working Days:</span>
                            <span>
                              {editingRecord.daysWorked} / {company.workingDaysPerMonth || 26} Days
                            </span>
                          </div>
                        </div>

                        {/* Side-by-side Itemized list */}
                        <div className="space-y-2">
                          <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">
                            Earned Components
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {editingComp.earningsList.map((el) => (
                              <div key={el.id} className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground truncate max-w-[170px]">{el.name}</span>
                                <span className="font-semibold text-foreground">{inr(el.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Deductions Itemized list */}
                        <div className="space-y-2">
                          <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">
                            Deductions
                          </div>
                          <div className="space-y-1 text-[11px]">
                            {editingComp.deductions.employeePF > 0 && (
                              <div className="flex justify-between text-rose-600">
                                <span>Employee PF</span>
                                <span className="font-semibold">-{inr(editingComp.deductions.employeePF)}</span>
                              </div>
                            )}
                            {editingComp.deductions.employeeESI > 0 && (
                              <div className="flex justify-between text-rose-600">
                                <span>Employee ESI</span>
                                <span className="font-semibold">-{inr(editingComp.deductions.employeeESI)}</span>
                              </div>
                            )}
                            {editingComp.deductions.professionalTax > 0 && (
                              <div className="flex justify-between text-rose-600">
                                <span>Prof. Tax (PT)</span>
                                <span className="font-semibold">-{inr(editingComp.deductions.professionalTax)}</span>
                              </div>
                            )}
                            {editingComp.deductions.lwf > 0 && (
                              <div className="flex justify-between text-rose-600">
                                <span>Labour Fund (LWF)</span>
                                <span className="font-semibold">-{inr(editingComp.deductions.lwf)}</span>
                              </div>
                            )}
                            {editingComp.deductions.advance > 0 && (
                              <div className="flex justify-between text-rose-600">
                                <span>Advance Recovery</span>
                                <span className="font-semibold">-{inr(editingComp.deductions.advance)}</span>
                              </div>
                            )}
                            {editingComp.deductions.loan > 0 && (
                              <div className="flex justify-between text-rose-600">
                                <span>Loan EMI</span>
                                <span className="font-semibold">-{inr(editingComp.deductions.loan)}</span>
                              </div>
                            )}
                            {editingComp.extraDeductions.map((ed) => (
                              <div key={ed.id} className="flex justify-between text-rose-600">
                                <span>{ed.name}</span>
                                <span className="font-semibold">-{inr(ed.amount)}</span>
                              </div>
                            ))}
                            {editingComp.totalDeductions === 0 && (
                              <div className="text-[11px] text-muted-foreground italic">No active deductions</div>
                            )}
                          </div>
                        </div>

                        {/* Summary Bar */}
                        <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-muted/60 text-xs font-bold border border-border">
                          <div>
                            <span className="text-muted-foreground font-normal text-[10px] block">Gross Earned</span>
                            <span>{inr(editingComp.gross)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground font-normal text-[10px] block">Total Deductions</span>
                            <span className="text-rose-600">-{inr(editingComp.totalDeductions)}</span>
                          </div>
                        </div>

                        {/* Net Take-Home Salary Payable (Executive Dark Slate Theme) */}
                        <div className="p-4 rounded-2xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 space-y-1 shadow-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-300">
                              REVISED NET TAKE-HOME
                            </span>
                            <span className="xl:text-xl font-black font-display text-white">
                              {inr(editingComp.net)}
                            </span>
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 italic truncate">
                            {numberToWordsIndian(editingComp.net)}
                          </div>
                        </div>

                        {/* Monthly CTC & Employer Contributions */}
                        <div className="pt-2 border-t border-border/50 text-[11px] space-y-1 text-muted-foreground">
                          {editingComp.employerContrib.employerPF > 0 && (
                            <div className="flex justify-between font-medium">
                              <span>Employer PF ({editingRecord.employerPfPct}%)</span>
                              <span>+{inr(editingComp.employerContrib.employerPF)}</span>
                            </div>
                          )}
                          {editingComp.employerContrib.employerESI > 0 && (
                            <div className="flex justify-between font-medium">
                              <span>Employer ESI ({editingRecord.employerEsiPct}%)</span>
                              <span>+{inr(editingComp.employerContrib.employerESI)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/40">
                            <span>Monthly CTC:</span>
                            <span className="font-bold text-primary">{inr(editingComp.monthlyCTC)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const overrideKey = `${selectedMonth}_${editingRecord.emp.id}`;
                    const copy = { ...monthlyOverrides };
                    delete copy[overrideKey];
                    setMonthlyOverrides(copy);
                    setEditingRecord(null);
                    toast.success(`Reset overrides to standard attendance for ${editingRecord.emp.name}`);
                  }}
                  className="h-9 text-xs rounded-xl gap-1.5 text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset to Defaults</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingRecord(null)}
                    className="h-9 text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const overrideKey = `${selectedMonth}_${editingRecord.emp.id}`;
                      setMonthlyOverrides({
                        ...monthlyOverrides,
                        [overrideKey]: {
                          daysWorked: editingRecord.daysWorked,
                          otHours: editingRecord.otHours,
                          weekOffEnabled: editingRecord.weekOffEnabled,
                          weekOffDays: editingRecord.weekOffDays,
                          customBasic: editingRecord.customBasic,
                          basicPct: editingRecord.basicPct,
                          daEnabled: editingRecord.daEnabled,
                          daPct: editingRecord.daPct,
                          hraEnabled: editingRecord.hraEnabled,
                          hraPct: editingRecord.hraPct,
                          oaEnabled: editingRecord.oaEnabled,
                          oaPct: editingRecord.oaPct,
                          caEnabled: editingRecord.caEnabled,
                          caPct: editingRecord.caPct,
                          ltaEnabled: editingRecord.ltaEnabled,
                          ltaPct: editingRecord.ltaPct,
                          customAllowances: editingRecord.customAllowances,
                          attBonusEnabled: editingRecord.attBonusEnabled,
                          attBonusAmount: editingRecord.attBonusAmount,
                          yrBonusEnabled: editingRecord.yrBonusEnabled,
                          yrBonusAmount: editingRecord.yrBonusAmount,
                          incentive: editingRecord.incentive,
                          bonus: editingRecord.bonus,
                          variablePay: editingRecord.variablePay,
                          otherEarnings: editingRecord.otherEarnings,
                          pfEnabled: editingRecord.pfEnabled,
                          esiEnabled: editingRecord.esiEnabled,
                          ptEnabled: editingRecord.ptEnabled,
                          ptAmountOverride: editingRecord.ptAmountOverride,
                          lwfEnabled: editingRecord.lwfEnabled,
                          lwfAmountOverride: editingRecord.lwfAmountOverride,
                          tds: editingRecord.tds,
                          loan: editingRecord.loan,
                          advance: editingRecord.advance,
                          otherDeductions: editingRecord.otherDeductions,
                          notes: editingRecord.notes,
                        },
                      });
                      setEditingRecord(null);
                      toast.success(`Payslip parameters saved for ${editingRecord.emp.name}`);
                    }}
                    className="h-9 text-xs rounded-xl gap-1.5 bg-primary text-primary-foreground font-semibold"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* FLOATING ACTION BUTTON: LIVE PAYSLIP PREVIEW TRIGGER                     */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-32 md:right-36 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Button
          onClick={() => setShowLivePayslipModal(true)}
          className="h-12 px-4 rounded-2xl shadow-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 border border-slate-700/60 dark:border-slate-300/60 gap-3 font-bold text-xs backdrop-blur-md group transition-all hover:scale-105 cursor-pointer"
        >
          <div className="h-7 w-7 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            <Receipt className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="leading-tight font-bold">Live Payslip Preview</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-600 font-normal">Real-Time Receipt</span>
          </div>
          <Badge variant="outline" className="ml-1 bg-emerald-500/20 text-emerald-400 dark:text-emerald-700 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
            {inr(benchmarkCalc.salaryInHand)}
          </Badge>
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 3: MASTER BLUEPRINT LIVE PAYSLIP PREVIEW POPUP DIALOG               */}
      {/* ========================================================================= */}
      <Dialog open={showLivePayslipModal} onOpenChange={setShowLivePayslipModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border border-border shadow-2xl">
          <PayslipTemplateView
            company={company}
            employee={sampleEmployee}
            month={selectedMonth}
            computation={liveBenchmarkComp}
            docAssets={docAssets}
            paidDays={company.workingDaysPerMonth || 26}
            rawPresentDays={company.workingDaysPerMonth || 26}
            weekOffDays={4}
            weekOffEnabled={true}
            onDownloadPdf={async () => {
              try {
                await generateSalarySlipPDF(
                  company,
                  sampleEmployee,
                  selectedMonth,
                  liveBenchmarkComp,
                  company.workingDaysPerMonth || 26,
                  0,
                  docAssets
                );
                toast.success("Benchmark Payslip PDF downloaded!");
              } catch (err) {
                console.error("[Benchmark Modal] PDF generation failed:", err);
                toast.error("Failed to generate Benchmark PDF");
              }
            }}
            onPrint={() => window.print()}
            onClose={() => setShowLivePayslipModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
