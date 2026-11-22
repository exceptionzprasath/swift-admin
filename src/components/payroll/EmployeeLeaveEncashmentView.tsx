import { useState, useMemo } from "react";
import { useStore, Employee, LeaveLedgerEntry } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

interface EmployeeLeaveEncashmentViewProps {
  employee: Employee;
  readOnly?: boolean;
}

export function EmployeeLeaveEncashmentView({ employee, readOnly = false }: EmployeeLeaveEncashmentViewProps) {
  const { company, leaveLedger = [], applyLeaveEncashment, evaluateEarnedLeaveAccrual } = useStore();

  const [encashModalOpen, setEncashModalOpen] = useState(false);
  const [encashMode, setEncashMode] = useState<"full" | "partial">("partial");
  const [customDays, setCustomDays] = useState<number>(5);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [encashReason, setEncashReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Policy configurations
  const accrualEnabled = company.elAccrualEnabled !== false;
  const threshold = company.elWorkingDaysThreshold ?? 20;
  const daysPerCycle = company.elDaysEarnedPerCycle ?? 2;
  const carryForwardEnabled = company.elCarryForwardEnabled !== false;
  const maxCarryForward = company.elMaxCarryForwardDays ?? 20;
  const encashmentEnabled = company.elEncashmentEnabled !== false;
  const minBalanceRequired = company.elEncashmentMinBalanceRequired ?? 0;
  const calcBase = company.elEncashmentCalculationBase || "basic_plus_da";

  // Balances & calculations
  const availableEL = employee.leaveBalances?.EL ?? 15;
  const workingDaysCompleted = employee.qualifyingWorkingDaysCounter ?? 14;
  const progressPercent = Math.min(100, Math.round((workingDaysCompleted / threshold) * 100));

  // Daily rate estimator
  const wd = company.workingDaysPerMonth || 26;
  const rawGross = employee.fixedSalary ?? employee.basic ?? employee.salary ?? 0;
  const fixedGross = typeof rawGross === "number" && !isNaN(rawGross) ? rawGross : 0;
  const basicPct = company.basicPct ?? (company.daPct ? (company.basicPct ?? 20) + company.daPct : 33.33);
  const monthlyBasic = Math.round(fixedGross * (basicPct / 100));
  const baseRate = calcBase === "gross_salary" ? fixedGross : monthlyBasic;
  const dailyRate = wd > 0 ? baseRate / wd : 0;

  // Selected encashment days
  const effectiveRequestedDays = encashMode === "full" ? availableEL : Math.min(availableEL, Math.max(1, customDays));
  const remainingELPostEncashment = Math.max(0, availableEL - effectiveRequestedDays);
  const estimatedPayout = Math.round(dailyRate * effectiveRequestedDays);

  // Year-end warning if balance exceeds max cap
  const excessDaysAboveCap = carryForwardEnabled ? Math.max(0, availableEL - maxCarryForward) : availableEL;

  // Periodic CL & SL policies & balances
  const clPolicy = company.leavePolicies?.CL || { renewalCycle: "quarterly", cycleQuota: 3, rolloverEnabled: true };
  const slPolicy = company.leavePolicies?.SL || { renewalCycle: "half_yearly", cycleQuota: 6, rolloverEnabled: true };
  const availableCL = employee.leaveBalances?.CL ?? 10;
  const availableSL = employee.leaveBalances?.SL ?? 8;

  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | "CL" | "SL" | "EL">("ALL");

  const getNextRenewalInfo = (policy: any, type: "CL" | "SL") => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const year = today.getFullYear();
    let nextMonth = 1;
    let nextYear = year;

    if (policy.renewalCycle === "quarterly") {
      if (currentMonth < 4) nextMonth = 4;
      else if (currentMonth < 7) nextMonth = 7;
      else if (currentMonth < 10) nextMonth = 10;
      else { nextMonth = 1; nextYear = year + 1; }
    } else if (policy.renewalCycle === "half_yearly") {
      if (currentMonth < 7) nextMonth = 7;
      else { nextMonth = 1; nextYear = year + 1; }
    } else {
      nextMonth = 1;
      nextYear = year + 1;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const renewalDateStr = `${monthNames[nextMonth - 1]} 1, ${nextYear}`;
    const prevDateStr = `${monthNames[nextMonth === 1 ? 11 : nextMonth - 2]} ${nextMonth === 1 ? 31 : nextMonth === 4 ? 31 : nextMonth === 7 ? 30 : 30}`;

    return {
      dateStr: renewalDateStr,
      prevDateStr,
      rolloverMessage: policy.rolloverEnabled
        ? `Next credit (+${policy.cycleQuota} ${type}) on ${renewalDateStr} · Unused balance rolls over`
        : `Resets to ${policy.cycleQuota} ${type} on ${renewalDateStr} · Use remaining balance before ${prevDateStr}`,
    };
  };

  const clRenewalInfo = useMemo(() => getNextRenewalInfo(clPolicy, "CL"), [clPolicy]);
  const slRenewalInfo = useMemo(() => getNextRenewalInfo(slPolicy, "SL"), [slPolicy]);

  // Ledger history for this employee
  const employeeLedger = useMemo(() => {
    return (leaveLedger || [])
      .filter((l) => l.employeeId === employee.id)
      .filter((l) => {
        if (ledgerFilter === "ALL") return true;
        if (ledgerFilter === "EL") return !l.leaveType || l.leaveType === "EL";
        return l.leaveType === ledgerFilter;
      });
  }, [leaveLedger, employee.id, ledgerFilter]);

  const handleApplyEncashment = async () => {
    if (availableEL <= 0) {
      toast.error("You do not have any Earned Leave balance to encash.");
      return;
    }
    if (availableEL < minBalanceRequired) {
      toast.error(`Minimum EL balance required to encash is ${minBalanceRequired} days.`);
      return;
    }
    if (effectiveRequestedDays < 1) {
      toast.error("Please enter at least 1 day to encash.");
      return;
    }

    try {
      setSubmitting(true);
      await applyLeaveEncashment({
        employeeId: employee.id,
        requestedDays: effectiveRequestedDays,
        encashmentMode: encashMode,
        payrollMonth: selectedMonth,
        reason: encashReason || `Encashment request for ${effectiveRequestedDays} EL days`,
      });

      toast.success(
        `Leave encashment request for ${effectiveRequestedDays} days (₹${estimatedPayout.toLocaleString()}) submitted successfully!`
      );
      setEncashModalOpen(false);
      setEncashReason("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit leave encashment request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 0. Periodic Leave Balances Cards: Casual Leave (CL) & Sick Leave (SL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Casual Leave (CL) Card */}
        <Card className="rounded-3xl border-emerald-500/25 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold font-display">Casual Leave (CL)</CardTitle>
                  <CardDescription className="text-[11px]">Routine personal &amp; family needs</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                {clPolicy.renewalCycle === "quarterly" ? `Quarterly (${clPolicy.cycleQuota} Days/Qtr)` : clPolicy.renewalCycle === "half_yearly" ? `Half-Yearly (${clPolicy.cycleQuota} Days/6M)` : `Annual (${clPolicy.cycleQuota} Days/Yr)`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-foreground font-display">{availableCL}</span>
                <span className="text-xs text-muted-foreground ml-1.5 font-medium">Days Available</span>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {clPolicy.rolloverEnabled ? "Rollover ON" : "No Rollover"}
              </Badge>
            </div>
            <div className="p-3 rounded-2xl border border-border/60 bg-muted/30 text-xs leading-relaxed text-muted-foreground">
              <div className="font-medium text-foreground flex items-center gap-1.5 pb-0.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                <span>Next Renewal &amp; Rollover Status</span>
              </div>
              <p className="text-[11px]">{clRenewalInfo.rolloverMessage}</p>
            </div>
          </CardContent>
        </Card>

        {/* Sick Leave (SL) Card */}
        <Card className="rounded-3xl border-sky-500/25 bg-gradient-to-br from-card via-card to-sky-500/5 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold font-display">Sick Leave (SL)</CardTitle>
                  <CardDescription className="text-[11px]">Medical recovery &amp; health rest</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 text-[10px] font-semibold">
                {slPolicy.renewalCycle === "quarterly" ? `Quarterly (${slPolicy.cycleQuota} Days/Qtr)` : slPolicy.renewalCycle === "half_yearly" ? `Half-Yearly (${slPolicy.cycleQuota} Days/6M)` : `Annual (${slPolicy.cycleQuota} Days/Yr)`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-foreground font-display">{availableSL}</span>
                <span className="text-xs text-muted-foreground ml-1.5 font-medium">Days Available</span>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {slPolicy.rolloverEnabled ? "Rollover ON" : "No Rollover"}
              </Badge>
            </div>
            <div className="p-3 rounded-2xl border border-border/60 bg-muted/30 text-xs leading-relaxed text-muted-foreground">
              <div className="font-medium text-foreground flex items-center gap-1.5 pb-0.5">
                <Calendar className="h-3.5 w-3.5 text-sky-600" />
                <span>Next Renewal &amp; Rollover Status</span>
              </div>
              <p className="text-[11px]">{slRenewalInfo.rolloverMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1. Main EL Balance & Live Progress Card */}
      <Card className="rounded-3xl border-border bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Coins className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold font-display">Earned Leave (EL) Balance & Accrual</CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                  Working-Day Policy
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Accrues automatically on actual days worked, with flexible year-end rollover and encashment.
              </CardDescription>
            </div>

            {encashmentEnabled && !readOnly && (
              <Button
                onClick={() => setEncashModalOpen(true)}
                disabled={availableEL <= 0}
                className="gap-2 rounded-2xl bg-primary text-primary-foreground font-bold text-xs h-9 shadow-sm shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Coins className="h-4 w-4" />
                <span>Apply for Leave Encashment</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Available Balance Stat */}
            <div className="p-4 rounded-2xl border border-border bg-card/80 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-primary" /> Available EL Balance
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-extrabold text-foreground font-display">{availableEL}</span>
                <span className="text-xs font-semibold text-muted-foreground">Days Available</span>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1">
                Monetary value: ~<strong className="text-foreground">₹{Math.round(dailyRate * availableEL).toLocaleString()}</strong> (@ ₹{Math.round(dailyRate).toLocaleString()}/day)
              </div>
            </div>

            {/* Live Working Days Progress */}
            <div className="p-4 rounded-2xl border border-border bg-card/80 space-y-2 md:col-span-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  Working Days Progress toward Next EL Credit
                </span>
                <span className="font-bold text-primary font-mono">
                  {workingDaysCompleted} / {threshold} Days Completed
                </span>
              </div>

              <Progress value={progressPercent} className="h-2.5 rounded-full bg-muted" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-muted-foreground pt-0.5">
                <span>
                  {threshold - workingDaysCompleted > 0
                    ? `${threshold - workingDaysCompleted} qualifying working day(s) remaining for next +${daysPerCycle} EL credit`
                    : `Threshold reached! +${daysPerCycle} EL ready to credit`}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{daysPerCycle} EL upon {threshold} days completion
                </span>
              </div>
            </div>
          </div>

          {/* Year-End Rollover & Cap Notice */}
          <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
            excessDaysAboveCap > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              : "bg-muted/40 border-border text-muted-foreground"
          }`}>
            <Info className={`h-4 w-4 shrink-0 mt-0.5 ${excessDaysAboveCap > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            <div className="space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span>Year-End Carry Forward Policy</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {carryForwardEnabled ? `Cap: ${maxCarryForward} Days` : "Zero Carry Forward"}
                </Badge>
              </div>
              <p className="text-[11px]">
                {carryForwardEnabled ? (
                  <>
                    At the end of the leave year, you can carry forward up to <strong>{maxCarryForward} Earned Leave days</strong> into the new year.
                    {excessDaysAboveCap > 0 && (
                      <span className="block font-semibold text-amber-700 dark:text-amber-300 pt-0.5">
                        Notice: You currently have {availableEL} EL days ({excessDaysAboveCap} days above the {maxCarryForward}-day cap). To prevent them from lapsing, use or apply for encashment before year-end.
                      </span>
                    )}
                  </>
                ) : (
                  <>All unused Earned Leave balances expire at year-end. Employees start the new leave year with 0 EL.</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Immutable Leave Ledger Audit History */}
      <Card className="rounded-3xl border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Leave &amp; Accrual Ledger Audit History
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time record of all CL/SL cycle renewals, rollovers, EL accruals, encashments, and leave deductions.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant={ledgerFilter === "ALL" ? "secondary" : "ghost"}
                onClick={() => setLedgerFilter("ALL")}
                className="h-7 text-[11px] px-2.5 rounded-lg font-semibold"
              >
                All Events
              </Button>
              <Button
                type="button"
                size="sm"
                variant={ledgerFilter === "CL" ? "secondary" : "ghost"}
                onClick={() => setLedgerFilter("CL")}
                className="h-7 text-[11px] px-2.5 rounded-lg font-semibold text-emerald-600 dark:text-emerald-400"
              >
                CL
              </Button>
              <Button
                type="button"
                size="sm"
                variant={ledgerFilter === "SL" ? "secondary" : "ghost"}
                onClick={() => setLedgerFilter("SL")}
                className="h-7 text-[11px] px-2.5 rounded-lg font-semibold text-sky-600 dark:text-sky-400"
              >
                SL
              </Button>
              <Button
                type="button"
                size="sm"
                variant={ledgerFilter === "EL" ? "secondary" : "ghost"}
                onClick={() => setLedgerFilter("EL")}
                className="h-7 text-[11px] px-2.5 rounded-lg font-semibold text-primary"
              >
                EL
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {employeeLedger.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
              <Coins className="h-6 w-6 text-muted-foreground/40 mx-auto" />
              <p>No leave ledger transactions recorded yet for this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Leave</th>
                    <th className="p-3">Transaction</th>
                    <th className="p-3 text-right">Days</th>
                    <th className="p-3 text-right">Balance After</th>
                    <th className="p-3">Reason / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employeeLedger.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-medium">{item.date}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-bold ${
                            item.leaveType === "CL"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : item.leaveType === "SL"
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30"
                              : "bg-primary/10 text-primary border-primary/20"
                          }`}
                        >
                          {item.leaveType || "EL"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-bold ${
                            item.type === "CYCLE_CREDIT" || item.type === "ACCRUAL"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : item.type === "ROLLOVER" || item.type === "CARRY_FORWARD"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : item.type === "ENCASHMENT"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : item.type === "EXPIRED" || item.type === "LAPSED"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : item.type === "AVAILED" || item.type === "USED"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.type}
                        </Badge>
                      </td>
                      <td className={`p-3 text-right font-bold font-mono ${
                        item.days > 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {item.days > 0 ? `+${item.days}` : item.days}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-foreground">
                        {item.balanceAfter !== undefined ? `${item.balanceAfter} d` : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground max-w-sm truncate" title={item.reason}>
                        {item.reason}
                        {item.payrollMonth && (
                          <span className="ml-1 text-[10px] font-mono font-bold text-primary">
                            ({item.payrollMonth})
                          </span>
                        )}
                        {item.periodLabel && (
                          <span className="ml-1 text-[10px] font-mono text-muted-foreground">
                            [{item.periodLabel}]
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. "Apply for Leave Encashment" Dialog */}
      <Dialog open={encashModalOpen} onOpenChange={setEncashModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 space-y-4">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-lg font-bold font-display flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Apply for Leave Encashment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Encash available Earned Leave for monetary payment credited directly in monthly payroll.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Quick Selection Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Encashment Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEncashMode("full")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    encashMode === "full"
                      ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                      : "border-border hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="text-xs font-bold text-foreground">Encash Full Balance</div>
                  <div className="text-[11px] text-muted-foreground pt-0.5">All {availableEL} Days</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEncashMode("partial")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    encashMode === "partial"
                      ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                      : "border-border hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="text-xs font-bold text-foreground">Encash Custom Days</div>
                  <div className="text-[11px] text-muted-foreground pt-0.5">Choose 1 to {availableEL} days</div>
                </button>
              </div>
            </div>

            {/* Custom Days Input & Slider */}
            {encashMode === "partial" && (
              <div className="space-y-2 p-3.5 rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Number of Days to Encash</Label>
                  <span className="font-bold text-primary text-sm font-mono">{customDays} Days</span>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={availableEL}
                  value={customDays}
                  onChange={(e) => setCustomDays(Math.min(availableEL, Math.max(1, +e.target.value || 1)))}
                  className="text-xs h-9 rounded-xl"
                />
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, availableEL)}
                  value={customDays}
                  onChange={(e) => setCustomDays(+e.target.value)}
                  className="w-full accent-primary h-2 cursor-pointer mt-1"
                />
              </div>
            )}

            {/* Live Calculation & Payout Estimator Banner */}
            <div className="p-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Encashing: <strong className="text-primary">{effectiveRequestedDays} Days</strong></span>
                <span>Remaining EL: <strong className="text-emerald-600">{remainingELPostEncashment} Days</strong></span>
              </div>

              <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  Estimated Payout:
                  <div className="text-[10px] text-muted-foreground">
                    {effectiveRequestedDays} days × ₹{Math.round(dailyRate).toLocaleString()} / day
                  </div>
                </div>
                <div className="text-xl font-black font-display text-primary">
                  ₹{estimatedPayout.toLocaleString()}
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>Credited as a distinct taxable earning item in your monthly salary.</span>
              </div>
            </div>

            {/* Target Payroll Month */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Payroll Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs h-9 rounded-xl font-mono"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason (Optional)</Label>
              <Textarea
                placeholder="Reason or notes for leave encashment..."
                value={encashReason}
                onChange={(e) => setEncashReason(e.target.value)}
                className="text-xs min-h-[60px] rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setEncashModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting || availableEL <= 0 || effectiveRequestedDays < 1}
              onClick={handleApplyEncashment}
              className="rounded-xl text-xs bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
            >
              {submitting ? "Submitting..." : `Confirm Encashment (₹${estimatedPayout.toLocaleString()})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
