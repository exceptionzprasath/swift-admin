import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useStore, safeFetch, type EarningComponent, type Employee, type Company, type ShiftAssignment } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { computePayroll, inr, type PayrollComputation } from "@/lib/payroll";
import { generateSalarySlipPDF, numberToWordsIndian } from "@/lib/pdf";
import { PayslipTemplateView } from "@/components/payroll/PayslipTemplateView";
import { EmployeeOtCalendarModal } from "@/components/payroll/EmployeeOtCalendarModal";
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
  CalendarRange,
  X,
  Layers,
  KeyRound,
  EyeOff,
  Loader2,
  FileSpreadsheet,
  XCircle,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { type RevisionTarget, type RevisionReason } from "@/lib/salary-revision";
import { downloadWageRegisterExcel } from "@/lib/wage-register-excel";

export const Route = createFileRoute("/admin/payroll")({
  head: () => ({ meta: [{ title: "Payroll & Salary Structures · CreatonsHR" }] }),
  component: PayrollPage,
});

/**
 * Calculates weekly offs from Swift Roster shift assignments for an employee in a given month or custom date range.
 * If explicit "off" roster assignments exist, counts them; otherwise calculates calendar Sundays.
 */
function getRosterWeekOffDays(
  employeeId: string,
  employeeName: string,
  monthStr: string,
  rosterList: ShiftAssignment[],
  customRange?: { start: string; end: string }
): number {
  if (customRange?.start && customRange?.end) {
    const rangeRoster = (rosterList || []).filter(
      (r) =>
        (r.employeeId === employeeId || r.employeeName === employeeName) &&
        r.date >= customRange.start &&
        r.date <= customRange.end
    );
    const explicitOffs = rangeRoster.filter(
      (r) => r.shiftId === "off" || r.shiftName?.toLowerCase().includes("off")
    ).length;

    if (explicitOffs > 0) return explicitOffs;

    // Fallback: calculate calendar Sundays in this custom date range
    let sundays = 0;
    try {
      const cur = new Date(customRange.start);
      const end = new Date(customRange.end);
      while (cur <= end) {
        if (cur.getDay() === 0) sundays++;
        cur.setDate(cur.getDate() + 1);
      }
    } catch {}
    return sundays;
  }

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
  // Overtime (OT) Approval Workflow
  otStatus?: "pending" | "approved" | "rejected";
  otApprovedHours?: number;
  otRemarks?: string;
  otApprovedAt?: string;
  otApprovedBy?: string;
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
  lwfMode?: "flat" | "pctOfGross" | "pctOfBasic";
  lwfValue?: number;
  lwfAmountOverride?: number;
  tdsEnabled?: boolean;
  tdsMode?: "flat" | "pctOfGross" | "pctOfBasic";
  tdsValue?: number;
  tds?: number;
  fineAndDamagesEnabled?: boolean;
  fineAndDamagesMode?: "flat" | "pctOfGross" | "pctOfBasic";
  fineAndDamagesValue?: number;
  otherDeductionsEnabled?: boolean;
  otherDeductionsMode?: "flat" | "pctOfGross" | "pctOfBasic";
  otherDeductionsValue?: number;
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
  lwfMode: "flat" | "pctOfGross" | "pctOfBasic";
  lwfValue: number;
  lwfAmountOverride: number;
  tdsEnabled: boolean;
  tdsMode: "flat" | "pctOfGross" | "pctOfBasic";
  tdsValue: number;
  tds: number;
  fineAndDamagesEnabled: boolean;
  fineAndDamagesMode: "flat" | "pctOfGross" | "pctOfBasic";
  fineAndDamagesValue: number;
  otherDeductionsEnabled: boolean;
  otherDeductionsMode: "flat" | "pctOfGross" | "pctOfBasic";
  otherDeductionsValue: number;
  loan: number;
  advance: number;
  otherDeductions: number;
  notes: string;
}

export function PayrollPage() {
  const {
    employees,
    updateEmployee,
    company,
    setCompany,
    attendance,
    roster,
    requests,
    payrolls,
    addPayroll,
    applySalaryRevision,
    currentUser,
    saveAllCompanySettings,
    lockPayrollMonth,
    verifyPayrollLockPassword,
    docAssets,
  } = useStore();

  // Active Main Tab
  const [mainTab, setMainTab] = useState<"structure" | "run" | "revision" | "ot-requests">("structure");

  // Selected Month for Payroll Run
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Custom Date Range State for Particular Days Payroll
  const [isCustomDateRange, setIsCustomDateRange] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const yyyymm = new Date().toISOString().slice(0, 7);
    return `${yyyymm}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.toISOString().slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  });

  // Keep custom start & end dates in sync whenever selectedMonth changes (unless custom mode is already modified)
  useEffect(() => {
    if (selectedMonth && !isCustomDateRange) {
      const [y, m] = (selectedMonth || "").split("-").map(Number);
      if (y && m) {
        const lastDay = new Date(y, m, 0).getDate();
        setCustomStartDate(`${selectedMonth}-01`);
        setCustomEndDate(`${selectedMonth}-${String(lastDay).padStart(2, "0")}`);
      }
    }
  }, [selectedMonth, isCustomDateRange]);

  // Derived Range Working Days and Calendar Days
  const { totalRangeDays, rangeWorkingDays } = useMemo(() => {
    if (!isCustomDateRange || !customStartDate || !customEndDate) {
      const [y, m] = (selectedMonth || "").split("-").map(Number);
      const days = new Date(y || 2026, m || 9, 0).getDate();
      return { totalRangeDays: days, rangeWorkingDays: company?.workingDaysPerMonth || 26 };
    }
    try {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return { totalRangeDays: 1, rangeWorkingDays: 1 };
      }
      let days = 0;
      let sundays = 0;
      const cur = new Date(start);
      while (cur <= end) {
        days++;
        if (cur.getDay() === 0) sundays++;
        cur.setDate(cur.getDate() + 1);
      }
      return {
        totalRangeDays: days,
        rangeWorkingDays: Math.max(1, days - sundays),
      };
    } catch {
      return { totalRangeDays: 30, rangeWorkingDays: 26 };
    }
  }, [isCustomDateRange, customStartDate, customEndDate, selectedMonth, company.workingDaysPerMonth]);

  // Effective period key for locking, overrides & PDF labelling
  const effectivePeriodKey = isCustomDateRange ? `${customStartDate}_${customEndDate}` : selectedMonth;
  const effectivePeriodLabel = isCustomDateRange ? `${customStartDate} to ${customEndDate}` : selectedMonth;
  const isPeriodLocked = !!(company.payrollLockedMonths && company.payrollLockedMonths[effectivePeriodKey]);

  // Payroll Lock Password Verification Modal State
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [targetLockAction, setTargetLockAction] = useState<"lock" | "unlock">("lock");
  const [lockPassword, setLockPassword] = useState("");
  const [showLockPassword, setShowLockPassword] = useState(false);
  const [lockPasswordError, setLockPasswordError] = useState<string | null>(null);
  const [isVerifyingLock, setIsVerifyingLock] = useState(false);

  const handleOpenLockModal = (action: "lock" | "unlock") => {
    setTargetLockAction(action);
    setLockPassword("");
    setLockPasswordError(null);
    setShowLockPassword(false);
    setIsLockModalOpen(true);

    // Refresh latest payroll lock password from backend so it connects in real-time with Super Admin
    try {
      const tenantId = useAuth.getState().activeTenantId;
      if (tenantId) {
        safeFetch(`/api/companies/payroll-lock-config?tenantId=${tenantId}`).then(async (res) => {
          if (res && res.ok) {
            const data = await res.json();
            if (data && data.payrollLockPassword !== undefined) {
              setCompany({ payrollLockPassword: data.payrollLockPassword });
            }
          }
        }).catch(() => {});
      }
    } catch {}
  };

  const handleConfirmLockAction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = lockPassword.trim();
    if (!trimmed) {
      setLockPasswordError("Please enter your password to proceed.");
      return;
    }

    setIsVerifyingLock(true);
    setLockPasswordError(null);

    try {
      const result = await verifyPayrollLockPassword(trimmed);
      if (result.success) {
        const willLock = targetLockAction === "lock";
        lockPayrollMonth(effectivePeriodKey, willLock);
        setIsLockModalOpen(false);
        setLockPassword("");
        setLockPasswordError(null);
        toast.success(
          willLock
            ? `Payroll locked securely for ${effectivePeriodLabel}`
            : `Payroll unlocked successfully for ${effectivePeriodLabel}`
        );
      } else {
        setLockPasswordError(result.error || "Incorrect password. Authorization denied.");
        toast.error(result.error || "Incorrect password. Please try again.");
      }
    } catch (err: any) {
      setLockPasswordError("An error occurred during verification. Please try again.");
      toast.error("Verification failed");
    } finally {
      setIsVerifyingLock(false);
    }
  };

  // Saving state
  const [savingSettings, setSavingSettings] = useState(false);

  // Wage Register Excel Export Dialog
  const [wageRegisterOpen, setWageRegisterOpen] = useState(false);

  // Live Blueprint Benchmark Salary (from user template: 30000)
  const [benchmarkSalary, setBenchmarkSalary] = useState<number>(30000);

  // Payroll Run State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees?.[0]?.id || "");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

  // Monthly Employee-Specific Overrides Map (Key: `${month}_${empId}`)
  const [monthlyOverrides, setMonthlyOverrides] = useState<Record<string, MonthlyOverrideData>>({});

  // Rehydrate monthly overrides from DynamoDB persisted payroll runs
  useEffect(() => {
    if (payrolls && payrolls.length > 0) {
      setMonthlyOverrides((prev) => {
        let changed = false;
        const next = { ...prev };
        payrolls.forEach((p) => {
          const key = `${p.month}_${p.employeeId}`;
          if (p.overrideData && !next[key]) {
            next[key] = p.overrideData;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [payrolls]);

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

  // OT Requests Tab Filter & Breakdown Modal State
  const [otSearch, setOtSearch] = useState("");
  const [otFilterDept, setOtFilterDept] = useState("all");
  const [otFilterStatus, setOtFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [otCalendarTarget, setOtCalendarTarget] = useState<{
    emp: Employee;
    selectedMonth: string;
  } | null>(null);
  const [otBreakdownTarget, setOtBreakdownTarget] = useState<{
    emp: Employee;
    rawOtHours: number;
    otApprovedHours: number;
    otStatus: "pending" | "approved" | "rejected";
    dailyOtRecords: { date: string; checkIn: string; checkOut: string; status: string; workedHours: number; otHours: number }[];
  } | null>(null);

  // AI Revision State
  const [revAmount, setRevAmount] = useState(0);
  const [revTarget] = useState<RevisionTarget>("basic");
  const [revReason, setRevReason] = useState<RevisionReason>("increment");
  const [revEffective] = useState(new Date().toISOString().slice(0, 10));

  // Check if current month/period is locked
  const isMonthLocked = isPeriodLocked;

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

    // TDS
    const tdsEnabled = company.tdsEnabled === true;
    const tdsMode = company.tdsMode || "flat";
    const tdsValue = company.tdsValue ?? 0;
    const tdsAmount = tdsEnabled
      ? (tdsMode === "pctOfGross" ? Math.round(gross * (tdsValue / 100)) : tdsMode === "pctOfBasic" ? Math.round(basic * (tdsValue / 100)) : Math.round(tdsValue))
      : 0;

    // Fine & Damages
    const fineAndDamagesEnabled = company.fineAndDamagesEnabled === true;
    const fineAndDamagesMode = company.fineAndDamagesMode || "flat";
    const fineAndDamagesValue = company.fineAndDamagesValue ?? 0;
    const fineAndDamagesAmount = fineAndDamagesEnabled
      ? (fineAndDamagesMode === "pctOfGross" ? Math.round(gross * (fineAndDamagesValue / 100)) : fineAndDamagesMode === "pctOfBasic" ? Math.round(basic * (fineAndDamagesValue / 100)) : Math.round(fineAndDamagesValue))
      : 0;

    // LWF (Labour Welfare Fund)
    const lwfEnabled = company.lwfEnabled !== false && company.lwfRules?.enabled !== false;
    const lwfMode = company.lwfMode || "flat";
    const lwfValue = company.lwfValue ?? company.lwfRules?.employeeAmount ?? (company as any).lwfAmount ?? 20;
    const lwfAmount = lwfEnabled
      ? (lwfMode === "pctOfGross" ? Math.round(gross * (lwfValue / 100)) : lwfMode === "pctOfBasic" ? Math.round(basic * (lwfValue / 100)) : Math.round(lwfValue))
      : 0;

    // Other Deductions
    const otherDeductionsEnabled = company.otherDeductionsEnabled === true;
    const otherDeductionsMode = company.otherDeductionsMode || "flat";
    const otherDeductionsValue = company.otherDeductionsValue ?? 0;
    const otherDeductionsAmount = otherDeductionsEnabled
      ? (otherDeductionsMode === "pctOfGross" ? Math.round(gross * (otherDeductionsValue / 100)) : otherDeductionsMode === "pctOfBasic" ? Math.round(basic * (otherDeductionsValue / 100)) : Math.round(otherDeductionsValue))
      : 0;

    const totalEmployeeDeductions = pfEmployee + esiEmployee + pt + tdsAmount + fineAndDamagesAmount + lwfAmount + otherDeductionsAmount;

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
      tdsEnabled,
      tdsMode,
      tdsValue,
      tdsAmount,
      fineAndDamagesEnabled,
      fineAndDamagesMode,
      fineAndDamagesValue,
      fineAndDamagesAmount,
      lwfEnabled,
      lwfMode,
      lwfValue,
      lwfAmount,
      otherDeductionsEnabled,
      otherDeductionsMode,
      otherDeductionsValue,
      otherDeductionsAmount,
      totalEmployeeDeductions,
      salaryInHand,
      totalMonthlyCtc,
      totalYearlyCtcLpa,
    };
  }, [benchmarkSalary, company]);

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    (employees || []).forEach((e) => {
      if (e?.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees for monthly run
  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((emp) => {
      if (searchEmployee.trim()) {
        const q = searchEmployee.toLowerCase();
        const matchName = (emp?.name || "").toLowerCase().includes(q);
        const matchCode = (emp?.empCode || "").toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (filterDepartment !== "all" && emp?.department !== filterDepartment) return false;
      return true;
    });
  }, [employees, searchEmployee, filterDepartment]);

  // Sample employee for live receipt preview
  const sampleEmployee: Employee = useMemo(() => {
    return (
      (employees && employees[0]) || {
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
    const wd = company?.workingDaysPerMonth || 26;
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
    const wd = company?.workingDaysPerMonth || 26;

    return (filteredEmployees || []).map((emp) => {
      const monthAtt = (attendance || []).filter((a) => {
        if (a.employeeId !== emp.id && a.employeeName !== emp.name) return false;
        if (isCustomDateRange && customStartDate && customEndDate) {
          return a.date >= customStartDate && a.date <= customEndDate;
        }
        return a.date.startsWith(selectedMonth);
      });

      const daysPresent = monthAtt.filter((a) => a.status === "present").length;
      const daysHalf = monthAtt.filter((a) => a.status === "half-day").length;
      const daysLeave = monthAtt.filter((a) => a.status === "leave").length;
      const rawPresentDays = daysPresent + daysHalf * 0.5;

      // Compute daily OT breakdown and total OT hours from actual check-in/check-out timestamps or explicit otHours for each day
      const dailyOtRecords: { date: string; checkIn: string; checkOut: string; status: string; workedHours: number; otHours: number }[] = [];

      monthAtt.forEach((a) => {
        let dayOt = 0;
        let workedH = 0;
        const inTime = a.checkIn || a.clockIn;
        const outTime = a.checkOut || a.clockOut;

        if (a.otHours !== undefined && a.otHours !== null) {
          dayOt = Number(a.otHours) || 0;
        }

        if (inTime && outTime) {
          try {
            const parseT = (s: string): number => {
              const cleaned = s.trim().toLowerCase();
              const m = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
              if (!m) return -1;
              let h = parseInt(m[1], 10);
              const mins = parseInt(m[2], 10);
              const mer = m[3]?.toLowerCase();
              if (mer === "pm" && h < 12) h += 12;
              if (mer === "am" && h === 12) h = 0;
              return h * 60 + mins;
            };
            const inM = parseT(inTime);
            const outM = parseT(outTime);
            if (inM >= 0 && outM >= 0) {
              let diffM = outM - inM;
              if (diffM <= 0) diffM += 24 * 60;
              workedH = Math.round((diffM / 60) * 10) / 10;
              const stdH = company.workingHoursPerDay || 9;
              if (a.otHours === undefined || a.otHours === null) {
                dayOt = workedH > stdH ? Math.round((workedH - stdH) * 10) / 10 : 0;
              }
            }
          } catch {}
        }

        if (dayOt > 0) {
          dailyOtRecords.push({
            date: a.date,
            checkIn: inTime || "—",
            checkOut: outTime || "—",
            status: a.status || "present",
            workedHours: workedH,
            otHours: dayOt,
          });
        }
      });

      const rawOtHours = dailyOtRecords.reduce((sum, d) => sum + d.otHours, 0);

      // Check for employee-specific monthly override
      const overrideKey = `${effectivePeriodKey}_${emp.id}`;
      const ov = monthlyOverrides[overrideKey] || monthlyOverrides[`${selectedMonth}_${emp.id}`] || {};

      // Fetch Weekly Offs from Swift Roster for this employee in this month/range (for metadata display on payslip)
      const rosterWeekOffDays = getRosterWeekOffDays(
        emp.id,
        emp.name,
        selectedMonth,
        roster,
        isCustomDateRange ? { start: customStartDate, end: customEndDate } : undefined
      );
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

      // Overtime (OT) Approval Workflow:
      // Overtime is only credited to payroll and payslip AFTER explicit admin approval (ov.otStatus === 'approved').
      // If unapproved (pending or rejected), effectiveOtHours is strictly 0.
      const isOtApproved = ov.otStatus === "approved";
      const otApprovedHours = ov.otApprovedHours !== undefined ? ov.otApprovedHours : (ov.otHours !== undefined && isOtApproved ? ov.otHours : rawOtHours);
      const effectiveOtHours = isOtApproved ? otApprovedHours : 0;
      const otStatus: "pending" | "approved" | "rejected" = ov.otStatus ? ov.otStatus : (rawOtHours > 0 ? "pending" : "pending");

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
      const effectiveVariablePay = ov.variablePay !== undefined ? ov.variablePay : 0;
      const effectiveOtherEarnings = ov.otherEarnings !== undefined ? ov.otherEarnings : 0;

      const effectiveTds = {
        enabled: ov.tdsEnabled !== undefined ? ov.tdsEnabled : (company.tdsEnabled === true || (ov.tds || 0) > 0),
        mode: ov.tdsMode || company.tdsMode || "flat",
        value: ov.tdsValue !== undefined ? ov.tdsValue : (ov.tds !== undefined ? ov.tds : (company.tdsValue ?? 0)),
      };

      const effectiveFineAndDamages = {
        enabled: ov.fineAndDamagesEnabled !== undefined ? ov.fineAndDamagesEnabled : (company.fineAndDamagesEnabled === true),
        mode: ov.fineAndDamagesMode || company.fineAndDamagesMode || "flat",
        value: ov.fineAndDamagesValue !== undefined ? ov.fineAndDamagesValue : (company.fineAndDamagesValue ?? 0),
      };

      const effectiveLwf = {
        enabled: ov.lwfEnabled !== undefined ? ov.lwfEnabled : (company.lwfEnabled !== false && company.lwfRules?.enabled !== false),
        mode: ov.lwfMode || company.lwfMode || "flat",
        value: ov.lwfValue !== undefined ? ov.lwfValue : (ov.lwfAmountOverride !== undefined ? ov.lwfAmountOverride : (company.lwfValue ?? company.lwfRules?.employeeAmount ?? (company as any).lwfAmount ?? 20)),
      };

      const effectiveOtherDeductions = {
        enabled: ov.otherDeductionsEnabled !== undefined ? ov.otherDeductionsEnabled : (company.otherDeductionsEnabled === true || (ov.otherDeductions || 0) > 0),
        mode: ov.otherDeductionsMode || company.otherDeductionsMode || "flat",
        value: ov.otherDeductionsValue !== undefined ? ov.otherDeductionsValue : (ov.otherDeductions !== undefined ? ov.otherDeductions : (company.otherDeductionsValue ?? 0)),
      };

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
        tds: effectiveTds,
        fineAndDamages: effectiveFineAndDamages,
        lwf: effectiveLwf,
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
        rawOtHours,
        otStatus,
        isOtApproved,
        otApprovedHours,
        otHours: effectiveOtHours,
        dailyOtRecords,
        comp,
        monthAttCount: monthAtt.length,
        hasOverride: !!monthlyOverrides[overrideKey],
        overrideData: ov,
      };
    });
  }, [
    filteredEmployees,
    attendance,
    roster,
    selectedMonth,
    company,
    monthlyOverrides,
    isCustomDateRange,
    customStartDate,
    customEndDate,
    effectivePeriodKey,
  ]);

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
        employeeAmount: editingRecord.lwfValue ?? editingRecord.lwfAmountOverride,
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
      tds: {
        enabled: editingRecord.tdsEnabled,
        mode: editingRecord.tdsMode,
        value: editingRecord.tdsValue,
      },
      fineAndDamages: {
        enabled: editingRecord.fineAndDamagesEnabled,
        mode: editingRecord.fineAndDamagesMode,
        value: editingRecord.fineAndDamagesValue,
      },
      lwf: {
        enabled: editingRecord.lwfEnabled,
        mode: editingRecord.lwfMode,
        value: editingRecord.lwfValue ?? editingRecord.lwfAmountOverride,
      },
      otherDeductions: {
        enabled: editingRecord.otherDeductionsEnabled,
        mode: editingRecord.otherDeductionsMode,
        value: editingRecord.otherDeductionsValue ?? editingRecord.otherDeductions,
      },
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

  // Overtime (OT) Eligible Employees List (Employees with logged OT hours from attendance or existing OT records)
  const otEligibleRecords = useMemo(() => {
    return monthlyRegister.filter((reg) => {
      return (
        (reg.rawOtHours !== undefined && reg.rawOtHours > 0) ||
        (reg.otHours !== undefined && reg.otHours > 0) ||
        reg.overrideData?.otStatus !== undefined ||
        reg.overrideData?.otHours !== undefined
      );
    });
  }, [monthlyRegister]);

  // OT KPI Summary Counts
  const pendingOtCount = useMemo(() => {
    return otEligibleRecords.filter((r) => r.otStatus === "pending").length;
  }, [otEligibleRecords]);

  const pendingOtHours = useMemo(() => {
    return otEligibleRecords
      .filter((r) => r.otStatus === "pending")
      .reduce((sum, r) => sum + (r.rawOtHours || 0), 0);
  }, [otEligibleRecords]);

  const totalClaimedOtHours = useMemo(() => {
    return otEligibleRecords.reduce((sum, r) => sum + (r.rawOtHours || 0), 0);
  }, [otEligibleRecords]);

  const totalApprovedOtHours = useMemo(() => {
    return otEligibleRecords
      .filter((r) => r.otStatus === "approved")
      .reduce((sum, r) => sum + (r.otApprovedHours !== undefined ? r.otApprovedHours : (r.otHours || 0)), 0);
  }, [otEligibleRecords]);

  const totalOtLiability = useMemo(() => {
    return monthlyRegister.reduce((sum, r) => sum + (r.comp.earnings.overtime || 0), 0);
  }, [monthlyRegister]);

  // Filtered OT records for OT Requests tab table
  const filteredOtRecords = useMemo(() => {
    return otEligibleRecords.filter((reg) => {
      if (otSearch.trim()) {
        const q = otSearch.toLowerCase();
        const matchName = (reg.emp.name || "").toLowerCase().includes(q);
        const matchCode = (reg.emp.empCode || "").toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (otFilterDept !== "all" && reg.emp.department !== otFilterDept) return false;
      if (otFilterStatus !== "all" && reg.otStatus !== otFilterStatus) return false;
      return true;
    });
  }, [otEligibleRecords, otSearch, otFilterDept, otFilterStatus]);

  // Handle Approve Single OT
  const handleApproveOt = (empId: string, hours?: number, remarks?: string) => {
    const reg = monthlyRegister.find((r) => r.emp.id === empId);
    if (!reg) return;

    const overrideKey = `${effectivePeriodKey}_${empId}`;
    const ov = monthlyOverrides[overrideKey] || monthlyOverrides[`${selectedMonth}_${empId}`] || {};
    const approvedHours = hours !== undefined ? hours : (ov.otApprovedHours !== undefined ? ov.otApprovedHours : reg.rawOtHours);

    const updatedOv: MonthlyOverrideData = {
      ...ov,
      otStatus: "approved",
      otApprovedHours: approvedHours,
      otHours: approvedHours,
      otRemarks: remarks || ov.otRemarks,
      otApprovedAt: new Date().toISOString(),
      otApprovedBy: currentUser?.name || "Admin",
    };

    const nextOverrides = {
      ...monthlyOverrides,
      [overrideKey]: updatedOv,
    };
    setMonthlyOverrides(nextOverrides);

    const effectiveEmp = updatedOv.customBasic ? { ...reg.emp, basic: updatedOv.customBasic } : reg.emp;
    const newComp = computePayroll({
      company,
      employee: effectiveEmp,
      daysWorked: reg.paidDays,
      otHours: approvedHours,
      incentive: updatedOv.incentive || 0,
      shiftDays: reg.paidDays,
      loan: updatedOv.loan || 0,
      advance: updatedOv.advance || 0,
      bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
      otherDeductions: updatedOv.otherDeductions || 0,
      variablePay: updatedOv.variablePay || 0,
      otherEarnings: updatedOv.otherEarnings || 0,
    });

    addPayroll({
      id: `pay-${empId}-${effectivePeriodKey}`,
      employeeId: empId,
      empCode: reg.emp.empCode,
      employeeName: reg.emp.name,
      month: effectivePeriodLabel,
      daysWorked: reg.paidDays,
      otHours: approvedHours,
      incentive: updatedOv.incentive || 0,
      shiftDays: reg.paidDays,
      loan: updatedOv.loan || 0,
      advance: updatedOv.advance || 0,
      bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
      computed: newComp,
      overrideData: updatedOv,
      createdAt: new Date().toISOString(),
    });

    toast.success(`Approved ${approvedHours}h overtime for ${reg.emp.name}. Added to payroll & payslip!`);
  };

  // Handle Reject Single OT
  const handleRejectOt = (empId: string, remarks?: string) => {
    const reg = monthlyRegister.find((r) => r.emp.id === empId);
    if (!reg) return;

    const overrideKey = `${effectivePeriodKey}_${empId}`;
    const ov = monthlyOverrides[overrideKey] || monthlyOverrides[`${selectedMonth}_${empId}`] || {};

    const updatedOv: MonthlyOverrideData = {
      ...ov,
      otStatus: "rejected",
      otApprovedHours: 0,
      otHours: 0,
      otRemarks: remarks || ov.otRemarks,
      otApprovedAt: new Date().toISOString(),
      otApprovedBy: currentUser?.name || "Admin",
    };

    const nextOverrides = {
      ...monthlyOverrides,
      [overrideKey]: updatedOv,
    };
    setMonthlyOverrides(nextOverrides);

    const effectiveEmp = updatedOv.customBasic ? { ...reg.emp, basic: updatedOv.customBasic } : reg.emp;
    const newComp = computePayroll({
      company,
      employee: effectiveEmp,
      daysWorked: reg.paidDays,
      otHours: 0,
      incentive: updatedOv.incentive || 0,
      shiftDays: reg.paidDays,
      loan: updatedOv.loan || 0,
      advance: updatedOv.advance || 0,
      bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
      otherDeductions: updatedOv.otherDeductions || 0,
      variablePay: updatedOv.variablePay || 0,
      otherEarnings: updatedOv.otherEarnings || 0,
    });

    addPayroll({
      id: `pay-${empId}-${effectivePeriodKey}`,
      employeeId: empId,
      empCode: reg.emp.empCode,
      employeeName: reg.emp.name,
      month: effectivePeriodLabel,
      daysWorked: reg.paidDays,
      otHours: 0,
      incentive: updatedOv.incentive || 0,
      shiftDays: reg.paidDays,
      loan: updatedOv.loan || 0,
      advance: updatedOv.advance || 0,
      bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
      computed: newComp,
      overrideData: updatedOv,
      createdAt: new Date().toISOString(),
    });

    toast.info(`Rejected overtime for ${reg.emp.name}. Overtime pay excluded from payroll.`);
  };

  // Handle Reset Single OT to Pending
  const handleResetOt = (empId: string) => {
    const reg = monthlyRegister.find((r) => r.emp.id === empId);
    if (!reg) return;

    const overrideKey = `${effectivePeriodKey}_${empId}`;
    const ov = monthlyOverrides[overrideKey] || monthlyOverrides[`${selectedMonth}_${empId}`] || {};

    const updatedOv: MonthlyOverrideData = {
      ...ov,
      otStatus: "pending",
      otApprovedHours: undefined,
      otHours: 0,
    };

    const nextOverrides = {
      ...monthlyOverrides,
      [overrideKey]: updatedOv,
    };
    setMonthlyOverrides(nextOverrides);

    const effectiveEmp = updatedOv.customBasic ? { ...reg.emp, basic: updatedOv.customBasic } : reg.emp;
    const newComp = computePayroll({
      company,
      employee: effectiveEmp,
      daysWorked: reg.paidDays,
      otHours: 0,
      incentive: updatedOv.incentive || 0,
      shiftDays: reg.paidDays,
      loan: updatedOv.loan || 0,
      advance: updatedOv.advance || 0,
      bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
      otherDeductions: updatedOv.otherDeductions || 0,
      variablePay: updatedOv.variablePay || 0,
      otherEarnings: updatedOv.otherEarnings || 0,
    });

    addPayroll({
      id: `pay-${empId}-${effectivePeriodKey}`,
      employeeId: empId,
      empCode: reg.emp.empCode,
      employeeName: reg.emp.name,
      month: effectivePeriodLabel,
      daysWorked: reg.paidDays,
      otHours: 0,
      incentive: updatedOv.incentive || 0,
      shiftDays: reg.paidDays,
      loan: updatedOv.loan || 0,
      advance: updatedOv.advance || 0,
      bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
      computed: newComp,
      overrideData: updatedOv,
      createdAt: new Date().toISOString(),
    });

    toast.info(`Reset OT status to Pending for ${reg.emp.name}.`);
  };

  // Handle Bulk Approve All Pending OT
  const handleBulkApprovePendingOt = () => {
    const pendingRecords = otEligibleRecords.filter((r) => r.otStatus === "pending");
    if (pendingRecords.length === 0) {
      toast.info("No pending OT requests to approve for this period.");
      return;
    }

    let nextOverrides = { ...monthlyOverrides };
    pendingRecords.forEach((reg) => {
      const overrideKey = `${effectivePeriodKey}_${reg.emp.id}`;
      const ov = nextOverrides[overrideKey] || nextOverrides[`${selectedMonth}_${reg.emp.id}`] || {};
      const approvedHours = ov.otApprovedHours !== undefined ? ov.otApprovedHours : reg.rawOtHours;

      const updatedOv: MonthlyOverrideData = {
        ...ov,
        otStatus: "approved",
        otApprovedHours: approvedHours,
        otHours: approvedHours,
        otApprovedAt: new Date().toISOString(),
        otApprovedBy: currentUser?.name || "Admin",
      };
      nextOverrides[overrideKey] = updatedOv;

      const effectiveEmp = updatedOv.customBasic ? { ...reg.emp, basic: updatedOv.customBasic } : reg.emp;
      const newComp = computePayroll({
        company,
        employee: effectiveEmp,
        daysWorked: reg.paidDays,
        otHours: approvedHours,
        incentive: updatedOv.incentive || 0,
        shiftDays: reg.paidDays,
        loan: updatedOv.loan || 0,
        advance: updatedOv.advance || 0,
        bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
        otherDeductions: updatedOv.otherDeductions || 0,
        variablePay: updatedOv.variablePay || 0,
        otherEarnings: updatedOv.otherEarnings || 0,
      });

      addPayroll({
        id: `pay-${reg.emp.id}-${effectivePeriodKey}`,
        employeeId: reg.emp.id,
        empCode: reg.emp.empCode,
        employeeName: reg.emp.name,
        month: effectivePeriodLabel,
        daysWorked: reg.paidDays,
        otHours: approvedHours,
        incentive: updatedOv.incentive || 0,
        shiftDays: reg.paidDays,
        loan: updatedOv.loan || 0,
        advance: updatedOv.advance || 0,
        bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
        computed: newComp,
        overrideData: updatedOv,
        createdAt: new Date().toISOString(),
      });
    });

    setMonthlyOverrides(nextOverrides);
    toast.success(`Approved overtime for ${pendingRecords.length} employees! Reflected in payroll.`);
  };

  // Handle Bulk Reject All Pending OT
  const handleBulkRejectPendingOt = () => {
    const pendingRecords = otEligibleRecords.filter((r) => r.otStatus === "pending");
    if (pendingRecords.length === 0) {
      toast.info("No pending OT requests to reject for this period.");
      return;
    }

    let nextOverrides = { ...monthlyOverrides };
    pendingRecords.forEach((reg) => {
      const overrideKey = `${effectivePeriodKey}_${reg.emp.id}`;
      const ov = nextOverrides[overrideKey] || nextOverrides[`${selectedMonth}_${reg.emp.id}`] || {};

      const updatedOv: MonthlyOverrideData = {
        ...ov,
        otStatus: "rejected",
        otApprovedHours: 0,
        otHours: 0,
        otApprovedAt: new Date().toISOString(),
        otApprovedBy: currentUser?.name || "Admin",
      };
      nextOverrides[overrideKey] = updatedOv;

      const effectiveEmp = updatedOv.customBasic ? { ...reg.emp, basic: updatedOv.customBasic } : reg.emp;
      const newComp = computePayroll({
        company,
        employee: effectiveEmp,
        daysWorked: reg.paidDays,
        otHours: 0,
        incentive: updatedOv.incentive || 0,
        shiftDays: reg.paidDays,
        loan: updatedOv.loan || 0,
        advance: updatedOv.advance || 0,
        bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
        otherDeductions: updatedOv.otherDeductions || 0,
        variablePay: updatedOv.variablePay || 0,
        otherEarnings: updatedOv.otherEarnings || 0,
      });

      addPayroll({
        id: `pay-${reg.emp.id}-${effectivePeriodKey}`,
        employeeId: reg.emp.id,
        empCode: reg.emp.empCode,
        employeeName: reg.emp.name,
        month: effectivePeriodLabel,
        daysWorked: reg.paidDays,
        otHours: 0,
        incentive: updatedOv.incentive || 0,
        shiftDays: reg.paidDays,
        loan: updatedOv.loan || 0,
        advance: updatedOv.advance || 0,
        bonus: (updatedOv.bonus || 0) + (updatedOv.attBonusAmount || 0) + (updatedOv.yrBonusAmount || 0),
        computed: newComp,
        overrideData: updatedOv,
        createdAt: new Date().toISOString(),
      });
    });

    setMonthlyOverrides(nextOverrides);
    toast.info(`Rejected overtime for ${pendingRecords.length} employees.`);
  };

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
            variant="outline"
            onClick={() => setWageRegisterOpen(true)}
            className="h-9 px-3.5 rounded-xl border-border hover:bg-muted font-semibold text-xs gap-1.5 text-foreground shadow-xs"
            title="Export Monthly Wage Register, Salary Slips & ESI Statement into Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Download Wage Register</span>
          </Button>

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
            <TabsTrigger value="ot-requests" className="rounded-lg gap-2 text-xs font-semibold py-1.5 px-3 relative">
              <Clock className="h-3.5 w-3.5" />
              <span>OT Requests</span>
              {pendingOtCount > 0 ? (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 h-4 font-mono shadow-xs">
                  {pendingOtCount} pending
                </Badge>
              ) : otEligibleRecords.length > 0 ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {otEligibleRecords.length}
                </Badge>
              ) : null}
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

                  {/* ATTENDANCE & SHIFT ROSTER WEEK OFF SETTINGS */}
                  <tr className="bg-muted/30 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    <td colSpan={3} className="px-5 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-sky-500" />
                          <span>Attendance &amp; Shift Roster Integration</span>
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
                            <span className="text-xs font-semibold">Weekly Offs (Shift Roster Planner)</span>
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

                  {/* TDS (Tax Deducted at Source) */}
                  <tr className={`transition-colors ${benchmarkCalc.tdsEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.tdsEnabled}
                          onCheckedChange={(checked) => setCompany({ tdsEnabled: checked })}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">TDS (Tax Deducted at Source)</span>
                            <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                              Income Tax
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">Statutory withholding under Income Tax Act</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          disabled={!benchmarkCalc.tdsEnabled}
                          value={company.tdsMode || "flat"}
                          onValueChange={(val: any) => setCompany({ tdsMode: val })}
                        >
                          <SelectTrigger className="h-7.5 w-28 text-xs font-semibold rounded-lg bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">₹ Flat</SelectItem>
                            <SelectItem value="pctOfGross">% Gross</SelectItem>
                            <SelectItem value="pctOfBasic">% Basic</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.tdsEnabled}
                          value={company.tdsValue ?? 0}
                          onChange={(e) => setCompany({ tdsValue: Number(e.target.value) || 0 })}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">
                          {company.tdsMode === "pctOfGross" ? "% Gross" : company.tdsMode === "pctOfBasic" ? "% Basic" : "₹ Amount"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-rose-600 text-xs">
                      {benchmarkCalc.tdsEnabled ? `-${inr(benchmarkCalc.tdsAmount)}` : <span className="text-xs text-muted-foreground">Disabled</span>}
                    </td>
                  </tr>

                  {/* FINE AND DAMAGES */}
                  <tr className={`transition-colors ${benchmarkCalc.fineAndDamagesEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.fineAndDamagesEnabled}
                          onCheckedChange={(checked) => setCompany({ fineAndDamagesEnabled: checked })}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">Fine and Damages</span>
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                              Disciplinary / Asset
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">Fines, asset damage, loss recovery &amp; penalties</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          disabled={!benchmarkCalc.fineAndDamagesEnabled}
                          value={company.fineAndDamagesMode || "flat"}
                          onValueChange={(val: any) => setCompany({ fineAndDamagesMode: val })}
                        >
                          <SelectTrigger className="h-7.5 w-28 text-xs font-semibold rounded-lg bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">₹ Flat</SelectItem>
                            <SelectItem value="pctOfGross">% Gross</SelectItem>
                            <SelectItem value="pctOfBasic">% Basic</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.fineAndDamagesEnabled}
                          value={company.fineAndDamagesValue ?? 0}
                          onChange={(e) => setCompany({ fineAndDamagesValue: Number(e.target.value) || 0 })}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">
                          {company.fineAndDamagesMode === "pctOfGross" ? "% Gross" : company.fineAndDamagesMode === "pctOfBasic" ? "% Basic" : "₹ Amount"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-rose-600 text-xs">
                      {benchmarkCalc.fineAndDamagesEnabled ? `-${inr(benchmarkCalc.fineAndDamagesAmount)}` : <span className="text-xs text-muted-foreground">Disabled</span>}
                    </td>
                  </tr>

                  {/* LABOUR WELFARE FUND (LWF) */}
                  <tr className={`transition-colors ${benchmarkCalc.lwfEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.lwfEnabled}
                          onCheckedChange={(checked) =>
                            setCompany({
                              lwfEnabled: checked,
                              lwfRules: { ...(company.lwfRules || { employeeAmount: 20 }), enabled: checked },
                            })
                          }
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">Labour Welfare Fund (LWF)</span>
                            <Badge variant="outline" className="text-[9px] bg-teal-500/10 text-teal-600 border-teal-500/20">
                              State Welfare
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">Statutory employee contribution for worker welfare</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          disabled={!benchmarkCalc.lwfEnabled}
                          value={company.lwfMode || "flat"}
                          onValueChange={(val: any) => setCompany({ lwfMode: val })}
                        >
                          <SelectTrigger className="h-7.5 w-28 text-xs font-semibold rounded-lg bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">₹ Flat</SelectItem>
                            <SelectItem value="pctOfGross">% Gross</SelectItem>
                            <SelectItem value="pctOfBasic">% Basic</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.lwfEnabled}
                          value={company.lwfValue ?? company.lwfRules?.employeeAmount ?? (company as any).lwfAmount ?? 20}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setCompany({
                              lwfValue: val,
                              lwfRules: { ...(company.lwfRules || { employeeAmount: 20 }), employeeAmount: val },
                            } as any);
                          }}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">
                          {company.lwfMode === "pctOfGross" ? "% Gross" : company.lwfMode === "pctOfBasic" ? "% Basic" : "₹ Amount"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-rose-600 text-xs">
                      {benchmarkCalc.lwfEnabled ? `-${inr(benchmarkCalc.lwfAmount)}` : <span className="text-xs text-muted-foreground">Disabled</span>}
                    </td>
                  </tr>

                  {/* OTHER DEDUCTIONS */}
                  <tr className={`transition-colors ${benchmarkCalc.otherDeductionsEnabled ? "hover:bg-muted/20" : "opacity-50 bg-muted/10"}`}>
                    <td className="px-5 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={benchmarkCalc.otherDeductionsEnabled}
                          onCheckedChange={(checked) => setCompany({ otherDeductionsEnabled: checked })}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">Other Deductions</span>
                            <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-border">
                              Custom / Misc
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">Miscellaneous deductions, uniforms, welfare, club fees</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          disabled={!benchmarkCalc.otherDeductionsEnabled}
                          value={company.otherDeductionsMode || "flat"}
                          onValueChange={(val: any) => setCompany({ otherDeductionsMode: val })}
                        >
                          <SelectTrigger className="h-7.5 w-28 text-xs font-semibold rounded-lg bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">₹ Flat</SelectItem>
                            <SelectItem value="pctOfGross">% Gross</SelectItem>
                            <SelectItem value="pctOfBasic">% Basic</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.1"
                          disabled={!benchmarkCalc.otherDeductionsEnabled}
                          value={company.otherDeductionsValue ?? 0}
                          onChange={(e) => setCompany({ otherDeductionsValue: Number(e.target.value) || 0 })}
                          className="h-7.5 w-20 text-xs font-semibold rounded-lg bg-background"
                        />
                        <span className="text-xs text-muted-foreground">
                          {company.otherDeductionsMode === "pctOfGross" ? "% Gross" : company.otherDeductionsMode === "pctOfBasic" ? "% Basic" : "₹ Amount"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-rose-600 text-xs">
                      {benchmarkCalc.otherDeductionsEnabled ? `-${inr(benchmarkCalc.otherDeductionsAmount)}` : <span className="text-xs text-muted-foreground">Disabled</span>}
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
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card/85 p-2.5 sm:p-3 rounded-2xl border border-border/80 shadow-xs">
            {/* Left Cluster: Calendar Month + Custom Range Controls + Lock Payroll */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Calendar Month Picker */}
              <div className="flex items-center gap-1.5 bg-background px-2.5 h-9 rounded-xl border border-border/80 shadow-2xs shrink-0">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-[124px] h-full text-xs font-bold border-0 bg-transparent p-0 focus-visible:ring-0 cursor-pointer text-foreground"
                />
              </div>

              {/* Custom Date Selection Option between Calendar and Payroll Lock */}
              {!isCustomDateRange ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCustomDateRange(true)}
                  className="h-9 px-3 rounded-xl text-xs gap-1.5 font-semibold shrink-0"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Custom Dates</span>
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/80 shadow-2xs shrink-0 animate-in fade-in zoom-in-95 duration-200">
                  {/* Active Indicator Button / Toggle Back */}
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={() => setIsCustomDateRange(false)}
                    className="h-7 px-2 rounded-lg text-xs font-semibold gap-1 bg-primary text-primary-foreground shadow-xs shrink-0"
                    title="Click to reset to Full Month"
                  >
                    <CalendarRange className="h-3.5 w-3.5" />
                    <span>Custom</span>
                  </Button>

                  {/* From Date Input */}
                  <div className="flex items-center gap-1 bg-background px-2 h-7 rounded-lg border border-border/70 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 select-none">
                      From
                    </span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomStartDate(val);
                        if (val > customEndDate) setCustomEndDate(val);
                      }}
                      className="h-full w-[104px] text-xs font-semibold bg-transparent border-0 p-0 focus:outline-hidden cursor-pointer text-foreground"
                    />
                  </div>

                  {/* Separator Arrow */}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/70 shrink-0" />

                  {/* To Date Input */}
                  <div className="flex items-center gap-1 bg-background px-2 h-7 rounded-lg border border-border/70 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 select-none">
                      To
                    </span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomEndDate(val);
                        if (val < customStartDate) setCustomStartDate(val);
                      }}
                      className="h-full w-[104px] text-xs font-semibold bg-transparent border-0 p-0 focus:outline-hidden cursor-pointer text-foreground"
                    />
                  </div>

                  {/* Calculated Range Days Badge */}
                  <Badge
                    variant="outline"
                    className="h-7 bg-primary/10 text-primary border-primary/25 text-[11px] font-bold px-1.5 rounded-lg shrink-0 flex items-center whitespace-nowrap"
                  >
                    {totalRangeDays}d ({rangeWorkingDays} Wkg)
                  </Badge>

                  {/* Reset / Close Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsCustomDateRange(false)}
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                    title="Reset to Full Month"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Payroll Lock Banner */}
              <Button
                size="sm"
                variant={isPeriodLocked ? "destructive" : "outline"}
                className="h-9 px-3 rounded-xl text-xs gap-1.5 font-semibold shrink-0"
                onClick={() => handleOpenLockModal(isPeriodLocked ? "unlock" : "lock")}
              >
                {isPeriodLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                <span>{isPeriodLocked ? "Payroll Locked" : "Lock Payroll"}</span>
              </Button>
            </div>

            {/* Right Cluster: Search Staff & Department Filter */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <div className="relative w-36 sm:w-44">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="h-9 text-xs pl-8 pr-2 rounded-xl bg-background border-border/80 shadow-2xs w-full"
                />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="h-9 text-xs w-28 sm:w-32 rounded-xl bg-background border-border/80 shadow-2xs">
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
                  {monthlyRegister.map(({ emp, rawEmp, paidDays, rawPresentDays, weekOffDays, weekOffEnabled, rosterWeekOffDays, rawOtHours, otStatus, isOtApproved, otApprovedHours, otHours, dailyOtRecords, comp, hasOverride, overrideData }) => (
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
                              {emp.employmentType === "contract" && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                                >
                                  Contract
                                </Badge>
                              )}
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
                            {paidDays}/{isCustomDateRange ? rangeWorkingDays : (company.workingDaysPerMonth || 26)} Present
                          </Badge>
                          {isOtApproved && otHours > 0 ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] px-1.5 py-0 whitespace-nowrap flex items-center gap-1 font-semibold">
                              <Check className="h-2.5 w-2.5" />
                              +{otHours}h OT
                            </Badge>
                          ) : rawOtHours > 0 && otStatus === "pending" ? (
                            <button
                              type="button"
                              onClick={() => setMainTab("ot-requests")}
                              className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0.5 rounded-md hover:bg-amber-500/25 transition-colors cursor-pointer"
                              title="Overtime pending approval. Click to open OT Requests tab."
                            >
                              <Clock className="h-2.5 w-2.5 animate-pulse" />
                              <span>{rawOtHours}h Pending OT</span>
                            </button>
                          ) : rawOtHours > 0 && otStatus === "rejected" ? (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] px-1.5 py-0 whitespace-nowrap line-through">
                              {rawOtHours}h OT Rejected
                            </Badge>
                          ) : null}
                        </div>
                        {isCustomDateRange ? (
                          <div className="text-[10px] text-primary font-medium mt-0.5">
                            {customStartDate.slice(5)} to {customEndDate.slice(5)}{weekOffEnabled ? ` · WO: ${weekOffDays}d` : ""}
                          </div>
                        ) : (
                          weekOffEnabled && (
                            <div className="text-[10px] text-sky-600 font-medium mt-0.5">
                              Weekoff: {weekOffDays}d
                            </div>
                          )
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
                                otHours: overrideData.otApprovedHours !== undefined ? overrideData.otApprovedHours : (overrideData.otHours !== undefined ? overrideData.otHours : (isOtApproved ? otHours : rawOtHours)),
                                otApprovedHours: overrideData.otApprovedHours !== undefined ? overrideData.otApprovedHours : (overrideData.otHours !== undefined ? overrideData.otHours : (isOtApproved ? otHours : rawOtHours)),
                                otStatus: overrideData.otStatus || (otHours > 0 ? "approved" : (rawOtHours > 0 ? "pending" : "pending")),
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
                                lwfEnabled: overrideData.lwfEnabled !== undefined ? overrideData.lwfEnabled : (company.lwfEnabled !== false && company.lwfRules?.enabled !== false),
                                lwfMode: overrideData.lwfMode !== undefined ? overrideData.lwfMode : (company.lwfMode || "flat"),
                                lwfValue: overrideData.lwfValue !== undefined ? overrideData.lwfValue : (overrideData.lwfAmountOverride !== undefined ? overrideData.lwfAmountOverride : (company.lwfValue ?? company.lwfRules?.employeeAmount ?? (company as any).lwfAmount ?? 20)),
                                lwfAmountOverride: overrideData.lwfAmountOverride !== undefined ? overrideData.lwfAmountOverride : (company.lwfValue ?? company.lwfRules?.employeeAmount ?? (company as any).lwfAmount ?? 20),
                                tdsEnabled: overrideData.tdsEnabled !== undefined ? overrideData.tdsEnabled : (company.tdsEnabled === true || (overrideData.tds || 0) > 0),
                                tdsMode: overrideData.tdsMode !== undefined ? overrideData.tdsMode : (company.tdsMode || "flat"),
                                tdsValue: overrideData.tdsValue !== undefined ? overrideData.tdsValue : (overrideData.tds !== undefined ? overrideData.tds : (company.tdsValue ?? 0)),
                                tds: overrideData.tds !== undefined ? overrideData.tds : (company.tdsValue ?? 0),
                                fineAndDamagesEnabled: overrideData.fineAndDamagesEnabled !== undefined ? overrideData.fineAndDamagesEnabled : (company.fineAndDamagesEnabled === true),
                                fineAndDamagesMode: overrideData.fineAndDamagesMode !== undefined ? overrideData.fineAndDamagesMode : (company.fineAndDamagesMode || "flat"),
                                fineAndDamagesValue: overrideData.fineAndDamagesValue !== undefined ? overrideData.fineAndDamagesValue : (company.fineAndDamagesValue ?? 0),
                                otherDeductionsEnabled: overrideData.otherDeductionsEnabled !== undefined ? overrideData.otherDeductionsEnabled : (company.otherDeductionsEnabled === true || (overrideData.otherDeductions || 0) > 0),
                                otherDeductionsMode: overrideData.otherDeductionsMode !== undefined ? overrideData.otherDeductionsMode : (company.otherDeductionsMode || "flat"),
                                otherDeductionsValue: overrideData.otherDeductionsValue !== undefined ? overrideData.otherDeductionsValue : (overrideData.otherDeductions !== undefined ? overrideData.otherDeductions : (company.otherDeductionsValue ?? 0)),
                                loan: overrideData.loan !== undefined ? overrideData.loan : 0,
                                advance: overrideData.advance !== undefined ? overrideData.advance : 0,
                                otherDeductions: overrideData.otherDeductions !== undefined ? overrideData.otherDeductions : 0,
                                notes: overrideData.notes || "",
                              });
                            }}
                            disabled={isPeriodLocked}
                            title={isPeriodLocked ? "Payroll is locked for this period. Unlock to edit." : "Edit employee payroll"}
                            className="h-7.5 px-2 text-xs rounded-lg gap-1 text-amber-600 hover:bg-amber-500/10 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
                                await generateSalarySlipPDF(company, emp, effectivePeriodLabel, comp, paidDays, weekOffEnabled ? weekOffDays : 0, docAssets);
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

        {/* ========================================================================= */}
        {/* TAB 3: OT REQUESTS & APPROVALS DASHBOARD                                 */}
        {/* ========================================================================= */}
        <TabsContent value="ot-requests" className="space-y-5 m-0">
          {/* Header Card with Information & Bulk Actions */}
          <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold font-display tracking-tight text-foreground">
                  Overtime (OT) Approvals &amp; Requests
                </h2>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-2 py-0.5">
                  Period: {effectivePeriodLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Review overtime hours logged from attendance punches. Overtime pay is strictly held in pending status until approved by admin.
                Company OT Multiplier: <strong className="text-foreground">{company.otMultiplier || 2}×</strong> · Standard Shift: <strong className="text-foreground">{company.workingHoursPerDay || 9} hrs/day</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRejectPendingOt}
                disabled={pendingOtCount === 0}
                className="h-8 text-xs rounded-xl gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject All Pending</span>
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprovePendingOt}
                disabled={pendingOtCount === 0}
                className="h-8 text-xs rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Approve All Pending ({pendingOtCount})</span>
              </Button>
            </div>
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Pending Requests */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Pending Approvals</span>
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-display text-amber-600 tracking-tight">
                {pendingOtCount} {pendingOtCount === 1 ? "Employee" : "Employees"}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {pendingOtHours.toFixed(1)} hrs awaiting admin review
              </span>
            </div>

            {/* Card 2: Total Claimed OT */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Total Logged OT</span>
                <TrendingUp className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div className="text-2xl font-bold font-display text-foreground tracking-tight">
                {totalClaimedOtHours.toFixed(1)} hrs
              </div>
              <span className="text-[11px] text-muted-foreground">
                Accumulated from daily punch records
              </span>
            </div>

            {/* Card 3: Approved OT Hours */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Approved OT Hours</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-display text-emerald-600 tracking-tight">
                {totalApprovedOtHours.toFixed(1)} hrs
              </div>
              <span className="text-[11px] text-muted-foreground">
                Active &amp; credited in monthly payslips
              </span>
            </div>

            {/* Card 4: Estimated OT Liability */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Total OT Payout</span>
                <DollarSign className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-2xl font-bold font-display text-foreground tracking-tight">
                {inr(totalOtLiability)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Calculated at {company.otMultiplier || 2}× hourly base
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee or code..."
                  value={otSearch}
                  onChange={(e) => setOtSearch(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-xl bg-muted/20"
                />
              </div>
              <Select value={otFilterDept} onValueChange={setOtFilterDept}>
                <SelectTrigger className="h-8 text-xs rounded-xl w-36">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Status:</span>
              {(["all", "pending", "approved", "rejected"] as const).map((st) => (
                <Button
                  key={st}
                  variant={otFilterStatus === st ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setOtFilterStatus(st)}
                  className={`h-7 px-2.5 text-xs rounded-lg font-medium capitalize ${
                    otFilterStatus === st ? "font-bold shadow-xs" : ""
                  }`}
                >
                  {st === "all" ? "All" : st}
                </Button>
              ))}
            </div>
          </div>

          {/* Table of OT Requests */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Base &amp; Hourly Rate</th>
                    <th className="px-4 py-3">Logged OT (Punches)</th>
                    <th className="px-4 py-3">Approved OT</th>
                    <th className="px-4 py-3">Estimated OT Pay</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOtRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Clock className="h-8 w-8 text-muted-foreground/40 stroke-1" />
                          <p className="font-semibold text-sm">No overtime records found</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            No employees have accumulated overtime hours from attendance punches for {effectivePeriodLabel}.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOtRecords.map((reg) => {
                      const fixedGross = reg.emp.basic || reg.emp.salary || 30000;
                      const wd = company.workingDaysPerMonth || 26;
                      const stdH = company.workingHoursPerDay || 9;
                      const hourlyRate = fixedGross / (wd * stdH);
                      const otMult = company.otMultiplier || 2;
                      const approvedHrs = reg.overrideData?.otApprovedHours !== undefined
                        ? reg.overrideData.otApprovedHours
                        : (reg.overrideData?.otHours !== undefined ? reg.overrideData.otHours : reg.rawOtHours);
                      const potentialPay = Math.round(hourlyRate * approvedHrs * otMult);

                      return (
                        <tr key={reg.emp.id} className="hover:bg-muted/30 transition-colors">
                          {/* Employee Details */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {reg.emp.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-foreground flex items-center gap-1.5">
                                  <span>{reg.emp.name}</span>
                                  {reg.emp.employmentType === "contract" && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                                    >
                                      Contract
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {reg.emp.empCode} · {reg.emp.department || "General"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Base & Hourly */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{inr(fixedGross)}/mo</div>
                            <div className="text-[11px] text-muted-foreground">
                              ₹{hourlyRate.toFixed(1)}/hr ({otMult}× mult)
                            </div>
                          </td>

                          {/* Logged OT with View Details button */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sky-600 dark:text-sky-400 text-sm">
                                {reg.rawOtHours} hrs
                              </span>
                              {reg.dailyOtRecords && reg.dailyOtRecords.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOtCalendarTarget({
                                    emp: reg.emp,
                                    selectedMonth,
                                  })}
                                  className="h-6 text-[10px] px-2 rounded-lg gap-1 border-border/80 hover:border-primary/50 text-foreground"
                                  title="View Overtime Calendar"
                                >
                                  <Calendar className="h-2.5 w-2.5 text-primary" />
                                  <span>{reg.dailyOtRecords.length} {reg.dailyOtRecords.length === 1 ? "day" : "days"}</span>
                                </Button>
                              )}
                            </div>
                          </td>

                          {/* Approved OT Hours Editable Input */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 max-w-[110px]">
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={approvedHrs}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  const overrideKey = `${effectivePeriodKey}_${reg.emp.id}`;
                                  const ov = monthlyOverrides[overrideKey] || monthlyOverrides[`${selectedMonth}_${reg.emp.id}`] || {};
                                  setMonthlyOverrides({
                                    ...monthlyOverrides,
                                    [overrideKey]: {
                                      ...ov,
                                      otApprovedHours: val,
                                    },
                                  });
                                }}
                                className="h-7 text-xs font-bold text-foreground"
                              />
                              <span className="text-[10px] text-muted-foreground">hrs</span>
                            </div>
                          </td>

                          {/* Estimated OT Pay */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-foreground text-xs">
                              {reg.otStatus === "approved" ? inr(reg.comp.earnings.overtime || potentialPay) : inr(potentialPay)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {reg.otStatus === "approved" ? (
                                <span className="text-emerald-600 font-medium">Added to payslip</span>
                              ) : (
                                <span className="text-amber-600">Pending approval</span>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-3">
                            {reg.otStatus === "approved" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px] font-semibold py-0.5">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>Approved</span>
                              </Badge>
                            ) : reg.otStatus === "rejected" ? (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1 text-[11px] font-semibold py-0.5">
                                <XCircle className="h-3 w-3 text-rose-600" />
                                <span>Rejected</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-semibold py-0.5">
                                <Clock className="h-3 w-3 text-amber-500" />
                                <span>Pending Approval</span>
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Extra Option: Calendar View */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOtCalendarTarget({
                                  emp: reg.emp,
                                  selectedMonth,
                                })}
                                className="h-7 text-xs px-2.5 rounded-lg border-border hover:bg-muted font-medium gap-1 text-foreground shadow-xs"
                                title="Open Overtime Calendar View"
                              >
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span>Calendar View</span>
                              </Button>

                              {reg.otStatus !== "approved" ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const overrideKey = `${effectivePeriodKey}_${reg.emp.id}`;
                                    const ov = monthlyOverrides[overrideKey] || monthlyOverrides[`${selectedMonth}_${reg.emp.id}`] || {};
                                    const hrs = ov.otApprovedHours !== undefined ? ov.otApprovedHours : (ov.otHours !== undefined ? ov.otHours : reg.rawOtHours);
                                    handleApproveOt(reg.emp.id, hrs);
                                  }}
                                  className="h-7 text-xs px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Approve</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRejectOt(reg.emp.id)}
                                  className="h-7 text-xs px-2.5 rounded-lg text-rose-600 hover:bg-rose-500/10 gap-1"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Revoke</span>
                                </Button>
                              )}

                              {reg.otStatus !== "rejected" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRejectOt(reg.emp.id)}
                                  className="h-7 text-xs px-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Reject overtime"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {reg.otStatus !== "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResetOt(reg.emp.id)}
                                  className="h-7 text-xs px-2 rounded-lg text-muted-foreground hover:bg-muted"
                                  title="Reset to Pending"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: DAILY OVERTIME BREAKDOWN DIALOG                                    */}
      {/* ========================================================================= */}
      <Dialog open={!!otBreakdownTarget} onOpenChange={(open) => !open && setOtBreakdownTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
          {otBreakdownTarget && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold">
                        Daily OT Log — {otBreakdownTarget.emp.name} ({otBreakdownTarget.emp.empCode})
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Attendance punch timestamps and overtime hours worked for {effectivePeriodLabel}
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Check In</th>
                      <th className="px-4 py-2.5">Check Out</th>
                      <th className="px-4 py-2.5">Total Worked</th>
                      <th className="px-4 py-2.5 text-right">OT Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(otBreakdownTarget?.dailyOtRecords || []).map((d, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{d.date}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{d.checkIn}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{d.checkOut}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{d.workedHours > 0 ? `${d.workedHours} hrs` : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                          +{d.otHours} hrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-bold border-t border-border">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-foreground">Total Overtime Hours</td>
                      <td className="px-4 py-2.5 text-right text-sm text-amber-600 font-bold">
                        +{otBreakdownTarget.rawOtHours} hrs
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <DialogFooter className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  Status: <strong className="capitalize text-foreground">{otBreakdownTarget.otStatus}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOtBreakdownTarget(null)} className="h-8 text-xs rounded-xl">
                    Close
                  </Button>
                  {otBreakdownTarget.otStatus !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleApproveOt(otBreakdownTarget.emp.id, otBreakdownTarget.otApprovedHours);
                        setOtBreakdownTarget(null);
                      }}
                      className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve {otBreakdownTarget.otApprovedHours}h Overtime</span>
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 1: LIVE PAYSLIP PREVIEW DIALOG                                      */}
      {/* ========================================================================= */}
      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border border-border shadow-2xl">
          {previewTarget && (
            <PayslipTemplateView
              company={company}
              employee={previewTarget.emp}
              month={effectivePeriodLabel}
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
                    effectivePeriodLabel,
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
                    {editingRecord.emp.employmentType === "contract" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                      >
                        Contract
                      </Badge>
                    )}
                  </DialogTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                    {effectivePeriodLabel}
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
                        <Clock className="h-3 w-3" /> Shift Roster Synced
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
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setEditingRecord({
                              ...editingRecord,
                              otHours: val,
                              otApprovedHours: val,
                              otStatus: val > 0 ? "approved" : "pending",
                            });
                          }}
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
                        Roster Default: {getRosterWeekOffDays(editingRecord.emp.id, editingRecord.emp.name, selectedMonth, roster, isCustomDateRange ? { start: customStartDate, end: customEndDate } : undefined)} Days
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
                      {(editingRecord.customAllowances || []).map((ca, idx) => (
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

                      {/* TDS (Tax Deducted at Source) */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            <span className="text-xs font-bold">TDS (Income Tax)</span>
                            <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                              Income Tax
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.tdsEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, tdsEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Select
                              disabled={!editingRecord.tdsEnabled}
                              value={editingRecord.tdsMode || "flat"}
                              onValueChange={(val: any) => setEditingRecord({ ...editingRecord, tdsMode: val })}
                            >
                              <SelectTrigger className="h-7 w-24 text-[11px] font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">₹ Flat</SelectItem>
                                <SelectItem value="pctOfGross">% Gross</SelectItem>
                                <SelectItem value="pctOfBasic">% Basic</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.1"
                              disabled={!editingRecord.tdsEnabled}
                              value={editingRecord.tdsValue}
                              onChange={(e) => setEditingRecord({ ...editingRecord, tdsValue: Number(e.target.value) || 0, tds: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {editingRecord.tdsMode === "pctOfGross" ? "% Gross" : editingRecord.tdsMode === "pctOfBasic" ? "% Basic" : "₹"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-rose-600">
                            {editingRecord.tdsEnabled && editingComp ? `-${inr(editingComp.deductions.tds)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>

                      {/* Fine and Damages */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-xs font-bold">Fine &amp; Damages</span>
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                              Disciplinary
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.fineAndDamagesEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, fineAndDamagesEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Select
                              disabled={!editingRecord.fineAndDamagesEnabled}
                              value={editingRecord.fineAndDamagesMode || "flat"}
                              onValueChange={(val: any) => setEditingRecord({ ...editingRecord, fineAndDamagesMode: val })}
                            >
                              <SelectTrigger className="h-7 w-24 text-[11px] font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">₹ Flat</SelectItem>
                                <SelectItem value="pctOfGross">% Gross</SelectItem>
                                <SelectItem value="pctOfBasic">% Basic</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.1"
                              disabled={!editingRecord.fineAndDamagesEnabled}
                              value={editingRecord.fineAndDamagesValue}
                              onChange={(e) => setEditingRecord({ ...editingRecord, fineAndDamagesValue: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {editingRecord.fineAndDamagesMode === "pctOfGross" ? "% Gross" : editingRecord.fineAndDamagesMode === "pctOfBasic" ? "% Basic" : "₹"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-rose-600">
                            {editingRecord.fineAndDamagesEnabled && editingComp ? `-${inr(editingComp.deductions.fineAndDamages)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>

                      {/* LWF Switch & Amount */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-teal-500" />
                            <span className="text-xs font-bold">Labour Fund (LWF)</span>
                            <Badge variant="outline" className="text-[9px] bg-teal-500/10 text-teal-600 border-teal-500/20">
                              Welfare
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.lwfEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, lwfEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Select
                              disabled={!editingRecord.lwfEnabled}
                              value={editingRecord.lwfMode || "flat"}
                              onValueChange={(val: any) => setEditingRecord({ ...editingRecord, lwfMode: val })}
                            >
                              <SelectTrigger className="h-7 w-24 text-[11px] font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">₹ Flat</SelectItem>
                                <SelectItem value="pctOfGross">% Gross</SelectItem>
                                <SelectItem value="pctOfBasic">% Basic</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.1"
                              disabled={!editingRecord.lwfEnabled}
                              value={editingRecord.lwfValue}
                              onChange={(e) => setEditingRecord({ ...editingRecord, lwfValue: Number(e.target.value) || 0, lwfAmountOverride: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {editingRecord.lwfMode === "pctOfGross" ? "% Gross" : editingRecord.lwfMode === "pctOfBasic" ? "% Basic" : "₹"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-rose-600">
                            {editingRecord.lwfEnabled && editingComp ? `-${inr(editingComp.deductions.lwf)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>

                      {/* Other Deductions */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-slate-500" />
                            <span className="text-xs font-bold">Other Deductions</span>
                            <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-border">
                              Misc
                            </Badge>
                          </div>
                          <Switch
                            checked={editingRecord.otherDeductionsEnabled}
                            onCheckedChange={(val) => setEditingRecord({ ...editingRecord, otherDeductionsEnabled: val })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Select
                              disabled={!editingRecord.otherDeductionsEnabled}
                              value={editingRecord.otherDeductionsMode || "flat"}
                              onValueChange={(val: any) => setEditingRecord({ ...editingRecord, otherDeductionsMode: val })}
                            >
                              <SelectTrigger className="h-7 w-24 text-[11px] font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">₹ Flat</SelectItem>
                                <SelectItem value="pctOfGross">% Gross</SelectItem>
                                <SelectItem value="pctOfBasic">% Basic</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.1"
                              disabled={!editingRecord.otherDeductionsEnabled}
                              value={editingRecord.otherDeductionsValue}
                              onChange={(e) => setEditingRecord({ ...editingRecord, otherDeductionsValue: Number(e.target.value) || 0, otherDeductions: Number(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs text-right font-semibold"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {editingRecord.otherDeductionsMode === "pctOfGross" ? "% Gross" : editingRecord.otherDeductionsMode === "pctOfBasic" ? "% Basic" : "₹"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-rose-600">
                            {editingRecord.otherDeductionsEnabled && editingComp ? `-${inr(editingComp.deductions.otherDeductions)}` : <span className="text-muted-foreground font-normal">₹0</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                          {editingRecord.emp.name} · {effectivePeriodLabel}
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
                              {editingRecord.daysWorked} / {isCustomDateRange ? rangeWorkingDays : (company.workingDaysPerMonth || 26)} Days
                            </span>
                          </div>
                        </div>

                        {/* Side-by-side Itemized list */}
                        <div className="space-y-2">
                          <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">
                            Earned Components
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {(editingComp.earningsList || []).map((el) => (
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
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {(editingComp.deductionsList || []).map((dl) => (
                              <div key={dl.id} className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground truncate max-w-[170px]">{dl.name}</span>
                                <span className="font-semibold text-rose-600">-{inr(dl.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Net Pay and CTC summary */}
                        <div className="pt-2 border-t border-border space-y-1 text-xs">
                          <div className="flex justify-between font-medium">
                            <span className="text-muted-foreground">Gross Earned:</span>
                            <span className="font-semibold text-foreground">{inr(editingComp.gross)}</span>
                          </div>
                          <div className="flex justify-between font-medium text-rose-600">
                            <span>Total Deductions:</span>
                            <span>-{inr(editingComp.totalDeductions)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-base text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border/40">
                            <span>Net In-Hand:</span>
                            <span>{inr(editingComp.net)}</span>
                          </div>
                          {editingRecord.weekOffEnabled && (
                            <div className="text-[10px] text-muted-foreground">
                              (Includes {editingRecord.weekOffDays} week offs credited into paid days)
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/40">
                            <span>Monthly CTC:</span>
                            <span className="font-bold text-primary">{inr(editingComp.monthlyCTC)}</span>
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
                    const overrideKey = `${effectivePeriodKey}_${editingRecord.emp.id}`;
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
                      const overrideKey = `${effectivePeriodKey}_${editingRecord.emp.id}`;
                      const overridePayload: MonthlyOverrideData = {
                        daysWorked: editingRecord.daysWorked,
                        otHours: editingRecord.otHours,
                        otApprovedHours: editingRecord.otHours,
                        otStatus: editingRecord.otHours > 0 ? "approved" : (editingRecord.otStatus || "pending"),
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
                        lwfMode: editingRecord.lwfMode,
                        lwfValue: editingRecord.lwfValue,
                        lwfAmountOverride: editingRecord.lwfValue,
                        tdsEnabled: editingRecord.tdsEnabled,
                        tdsMode: editingRecord.tdsMode,
                        tdsValue: editingRecord.tdsValue,
                        tds: editingRecord.tdsValue,
                        fineAndDamagesEnabled: editingRecord.fineAndDamagesEnabled,
                        fineAndDamagesMode: editingRecord.fineAndDamagesMode,
                        fineAndDamagesValue: editingRecord.fineAndDamagesValue,
                        otherDeductionsEnabled: editingRecord.otherDeductionsEnabled,
                        otherDeductionsMode: editingRecord.otherDeductionsMode,
                        otherDeductionsValue: editingRecord.otherDeductionsValue,
                        otherDeductions: editingRecord.otherDeductionsValue,
                        loan: editingRecord.loan,
                        advance: editingRecord.advance,
                        notes: editingRecord.notes,
                      };

                      // 1. Update in-memory overrides for live preview
                      setMonthlyOverrides({
                        ...monthlyOverrides,
                        [overrideKey]: overridePayload,
                      });

                      // 2. Persist updated base salary to DynamoDB (swift_company_employees)
                      const origSalary = editingRecord.emp.basic || editingRecord.emp.salary || 0;
                      if (editingRecord.customBasic !== undefined && editingRecord.customBasic !== origSalary) {
                        updateEmployee(editingRecord.emp.id, {
                          basic: editingRecord.customBasic,
                          salary: editingRecord.customBasic,
                          fixedSalary: editingRecord.customBasic,
                        });
                      }

                      // 3. Persist monthly payroll computation & overrides to DynamoDB (swift_company_payrolls)
                      if (editingComp) {
                        addPayroll({
                          id: `pay-${editingRecord.emp.id}-${effectivePeriodKey}`,
                          employeeId: editingRecord.emp.id,
                          empCode: editingRecord.emp.empCode,
                          employeeName: editingRecord.emp.name,
                          month: effectivePeriodLabel,
                          daysWorked: editingRecord.daysWorked,
                          otHours: editingRecord.otHours,
                          incentive: editingRecord.incentive,
                          shiftDays: editingRecord.daysWorked,
                          loan: editingRecord.loan,
                          advance: editingRecord.advance,
                          bonus: (editingRecord.bonus || 0) + (editingRecord.attBonusAmount || 0) + (editingRecord.yrBonusAmount || 0),
                          computed: editingComp,
                          overrideData: overridePayload,
                          createdAt: new Date().toISOString(),
                        });
                      }

                      setEditingRecord(null);
                      toast.success(`Payslip parameters & DynamoDB records saved for ${editingRecord.emp.name}`);
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
            month={effectivePeriodLabel}
            computation={liveBenchmarkComp}
            docAssets={docAssets}
            paidDays={isCustomDateRange ? rangeWorkingDays : (company.workingDaysPerMonth || 26)}
            rawPresentDays={isCustomDateRange ? rangeWorkingDays : (company.workingDaysPerMonth || 26)}
            weekOffDays={4}
            weekOffEnabled={true}
            onDownloadPdf={async () => {
              try {
                await generateSalarySlipPDF(
                  company,
                  sampleEmployee,
                  effectivePeriodLabel,
                  liveBenchmarkComp,
                  isCustomDateRange ? rangeWorkingDays : (company.workingDaysPerMonth || 26),
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

      {/* OT Calendar View Modal for Individual Employee */}
      <EmployeeOtCalendarModal
        open={!!otCalendarTarget}
        onClose={() => setOtCalendarTarget(null)}
        employee={otCalendarTarget?.emp || null}
        initialMonth={otCalendarTarget?.selectedMonth || selectedMonth}
        attendance={attendance}
        company={company}
        monthlyOverrides={monthlyOverrides}
        onApproveOt={handleApproveOt}
        onRejectOt={handleRejectOt}
        onResetOt={handleResetOt}
      />

      {/* ========================================================================= */}
      {/* MODAL 4: PAYROLL LOCK / UNLOCK PASSWORD VERIFICATION DIALOG               */}
      {/* ========================================================================= */}
      <Dialog
        open={isLockModalOpen}
        onOpenChange={(open) => {
          if (!isVerifyingLock) {
            setIsLockModalOpen(open);
            if (!open) {
              setLockPassword("");
              setLockPasswordError(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border shadow-2xl bg-card">
          <form onSubmit={handleConfirmLockAction} className="space-y-4">
            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  targetLockAction === "lock"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                }`}
              >
                {targetLockAction === "lock" ? (
                  <Lock className="h-6 w-6" />
                ) : (
                  <Unlock className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-base font-bold text-foreground">
                  {targetLockAction === "lock" ? "Lock Payroll Period" : "Unlock Payroll Period"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  {targetLockAction === "lock" ? (
                    <>
                      Locking payroll for <span className="font-semibold text-foreground">{effectivePeriodLabel}</span> will freeze all salary registers, computed net payouts, and statutory deductions against edits.
                    </>
                  ) : (
                    <>
                      Unlocking payroll for <span className="font-semibold text-foreground">{effectivePeriodLabel}</span> will permit attendance updates and custom monthly salary overrides.
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            {(!company.payrollLockPassword || !company.payrollLockPassword.trim()) ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">No Password Configured in Super Admin</p>
                  <p className="text-[11px] opacity-90 leading-normal">
                    Payroll locking cannot be authorized until a dedicated password is set by a Super Admin under <strong>Companies &gt; Credentials</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Security Authorization Required</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Please enter the dedicated payroll lock password configured by Super Admin to confirm this action.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payroll-lock-password" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Payroll Lock Password</span>
                <span className="text-[10px] text-muted-foreground font-normal">Super Admin authorization</span>
              </Label>
              <div className="relative">
                <KeyRound className="h-4 w-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                <Input
                  id="payroll-lock-password"
                  type={showLockPassword ? "text" : "password"}
                  placeholder="Enter payroll lock password from Super Admin..."
                  value={lockPassword}
                  onChange={(e) => {
                    setLockPassword(e.target.value);
                    if (lockPasswordError) setLockPasswordError(null);
                  }}
                  autoFocus
                  disabled={isVerifyingLock || !company.payrollLockPassword || !company.payrollLockPassword.trim()}
                  className={`h-10 text-xs pl-9 pr-10 rounded-xl bg-background border-border/80 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                    lockPasswordError ? "border-destructive focus-visible:ring-destructive/30" : ""
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  tabIndex={-1}
                  disabled={isVerifyingLock || !company.payrollLockPassword || !company.payrollLockPassword.trim()}
                  onClick={() => setShowLockPassword(!showLockPassword)}
                  className="h-8 w-8 p-0 absolute right-1 top-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  {showLockPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {lockPasswordError && (
                <div className="flex items-center gap-1.5 text-destructive text-[11px] font-medium pt-1 animate-in fade-in">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{lockPasswordError}</span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isVerifyingLock}
                onClick={() => {
                  setIsLockModalOpen(false);
                  setLockPassword("");
                  setLockPasswordError(null);
                }}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isVerifyingLock || !lockPassword.trim() || !company.payrollLockPassword || !company.payrollLockPassword.trim()}
                variant={targetLockAction === "lock" ? "default" : "destructive"}
                className="h-9 text-xs rounded-xl gap-1.5 font-semibold"
              >
                {isVerifyingLock ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : targetLockAction === "lock" ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Lock Payroll</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Unlock Payroll</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: WAGE REGISTER & ESI STATEMENT EXCEL EXPORT POPUP DIALOG           */}
      {/* ========================================================================= */}
      <WageRegisterDownloadDialog
        open={wageRegisterOpen}
        onClose={() => setWageRegisterOpen(false)}
        company={company}
        employees={employees}
        attendance={attendance}
        roster={roster}
        requests={requests}
        monthlyOverrides={monthlyOverrides}
        defaultMonth={selectedMonth}
      />
    </div>
  );
}

function WageRegisterDownloadDialog({
  open,
  onClose,
  company,
  employees,
  attendance,
  roster,
  requests,
  monthlyOverrides,
  defaultMonth,
}: {
  open: boolean;
  onClose: () => void;
  company: Company;
  employees: Employee[];
  attendance: any[];
  roster: any[];
  requests: any[];
  monthlyOverrides: Record<string, any>;
  defaultMonth: string;
}) {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth || new Date().toISOString().slice(0, 7));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (defaultMonth) {
      setSelectedMonth(defaultMonth);
    }
  }, [defaultMonth]);

  // Generate a list of recent 12 months for quick selection
  const monthOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!y || !m) return selectedMonth;
    return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  const activeStaffCount = useMemo(() => {
    return (
      employees.filter(
        (e) => e.status !== "inactive" || (e.doj && e.doj <= `${selectedMonth}-31`)
      ).length || employees.length
    );
  }, [employees, selectedMonth]);

  const handleDownload = () => {
    try {
      setDownloading(true);
      downloadWageRegisterExcel({
        company,
        employees,
        attendance,
        roster,
        requests,
        monthlyOverrides,
        selectedMonth,
      });
      toast.success(`Wage Register & ESI Statement for ${monthLabel} downloaded successfully!`);
      onClose();
    } catch (err) {
      console.error("Wage register export error:", err);
      toast.error("Failed to generate Wage Register Excel. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <span>Download Wage Register</span>
            </DialogTitle>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold"
            >
              {activeStaffCount} Employees Eligible
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
            Select the processing month to export the complete statutory Wage Register spreadsheet into Microsoft Excel (<strong className="text-foreground font-semibold">.xlsx</strong>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Month Selection Box */}
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" /> Select Processing Month
              </Label>
              <Badge variant="secondary" className="text-xs font-semibold text-primary font-mono">
                {monthLabel}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Select from recent months</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="text-xs bg-card h-9">
                    <SelectValue placeholder="Choose month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                        {opt.label} ({opt.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Custom Month (YYYY-MM)</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className="text-xs bg-card h-9 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Included Columns Breakdown */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
              <span>Included Register Structure</span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                58 Statutory & Banking Columns (.xlsx)
              </Badge>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">✓</span>
                  Wage Register Columns
                </span>
                <Badge variant="secondary" className="text-[9.5px] font-mono">Statutory Master</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-6.5">
                S.No, EMP ID, Name of the Employee, Name as per Aadhaar, Date of Birth, Date of Joining, Designation, Location (Branch), Bank Name, Account Number, IFSC Code, UAN No, ESI No, Gender, Present & Permanent Address, Number of days Calculate, No of Days Worked, FH/NH/PL/ML, Sunday, Half day, PAID LEAVES DAYS, Sundays work, No of days in month, Number of days Calculate paid, Absent days, Fixed Salary, Pay Slab, Per hrs, Per Hrs working time, Per hrs Amt, LATE PUNCHING Hrs & Amt, Basic+DA, HRA, Conveyance Allowance, Other Allowances, LTA, Sundays days Amount, Incentives, Gross Salary, Basic+DA for PF, EPF Elig, EPF - 12%, ESI Elig, ESI- 0.75%, Advance, PT, TDS/4% Cass, LWF, Deductions, NCP Days, Net Salary, Month, Remarks, 13%, EPF, ESI.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-3 border-t border-border mt-2">
          <Button variant="outline" onClick={onClose} disabled={downloading} className="rounded-xl text-xs h-9">
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || activeStaffCount === 0}
            className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 gap-1.5"
          >
            {downloading ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 animate-spin" /> Generating Workbook...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" /> Download Wage Register ({monthLabel})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

