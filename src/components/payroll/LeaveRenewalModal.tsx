import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RotateCcw,
  Sparkles,
  Calendar,
  AlertTriangle,
  Users,
  CheckCircle2,
  Tag,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface LeaveRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "CL" | "SL" | "ALL";
}

export function LeaveRenewalModal({
  open,
  onOpenChange,
  defaultType = "ALL",
}: LeaveRenewalModalProps) {
  const {
    employees,
    company,
    processPeriodicLeaveRenewals,
    saveAllCompanySettings,
  } = useStore();

  const [targetType, setTargetType] = useState<"ALL" | "CL" | "SL">(defaultType);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [executing, setExecuting] = useState(false);

  // Compute live preview of renewal without mutating state
  const previewData = useMemo(() => {
    const policies = company.leavePolicies || {
      CL: { renewalCycle: "quarterly", cycleQuota: 3, rolloverEnabled: true, prorateNewJoiners: true },
      SL: { renewalCycle: "half_yearly", cycleQuota: 6, rolloverEnabled: true, prorateNewJoiners: true },
    };

    const targetDate = new Date(selectedDate);
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    const typesToEval: ("CL" | "SL")[] =
      targetType === "ALL" ? ["CL", "SL"] : [targetType];

    let totalCredited = 0;
    let totalRolledOver = 0;
    let totalExpired = 0;
    const employeeRows: any[] = [];

    const activeEmps = (employees || []).filter((e) => e.status === "active");

    activeEmps.forEach((emp) => {
      typesToEval.forEach((lt) => {
        const policy = policies[lt];
        const prevBal = emp.leaveBalances?.[lt] ?? (lt === "CL" ? 10 : 8);
        let quota = policy.cycleQuota;

        if (policy.prorateNewJoiners !== false && emp.doj) {
          const dojDate = new Date(emp.doj);
          const diffMs = targetDate.getTime() - dojDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const cycleLength = policy.renewalCycle === "quarterly" ? 90 : policy.renewalCycle === "half_yearly" ? 182 : 365;
          if (diffDays >= 0 && diffDays < cycleLength) {
            const fraction = Math.max(0.2, (cycleLength - diffDays) / cycleLength);
            quota = Math.round(quota * fraction * 2) / 2;
          }
        }

        let rolled = 0;
        let exp = 0;
        let newBal = 0;

        if (policy.rolloverEnabled) {
          rolled = policy.maxRolloverDays && policy.maxRolloverDays > 0
            ? Math.min(prevBal, policy.maxRolloverDays)
            : Math.max(0, prevBal);
          exp = Math.max(0, prevBal - rolled);
          newBal = rolled + quota;
        } else {
          rolled = 0;
          exp = Math.max(0, prevBal);
          newBal = quota;
        }

        totalCredited += quota;
        totalRolledOver += rolled;
        totalExpired += exp;

        employeeRows.push({
          empId: emp.id,
          name: emp.name,
          empCode: emp.empCode,
          dept: emp.department,
          leaveType: lt,
          cycle: policy.renewalCycle,
          prevBal,
          rolled,
          exp,
          quota,
          newBal,
        });
      });
    });

    const periodLabels: string[] = [];
    if (typesToEval.includes("CL")) {
      const q = Math.floor((month - 1) / 3) + 1;
      periodLabels.push(`CL: Q${q} ${year}`);
    }
    if (typesToEval.includes("SL")) {
      const h = month <= 6 ? 1 : 2;
      periodLabels.push(`SL: H${h} ${year}`);
    }

    return {
      totalEmployees: activeEmps.length,
      totalCredited,
      totalRolledOver,
      totalExpired,
      employeeRows,
      periodLabel: periodLabels.join(" · "),
    };
  }, [company.leavePolicies, employees, selectedDate, targetType]);

  const handleExecuteRenewal = async () => {
    try {
      setExecuting(true);
      const res = processPeriodicLeaveRenewals(
        targetType === "ALL" ? undefined : targetType,
        selectedDate
      );
      await saveAllCompanySettings();
      toast.success(
        `Leave renewal executed! Credited +${res.totalCreditedDays} days, rolled over +${res.totalRolloverDays} days, ${res.totalExpiredDays} days expired across ${res.affectedEmployees} employees.`
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute leave renewal.");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-brand text-white flex items-center justify-center font-bold shadow-soft shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Preview & Run Leave Cycle Renewal</span>
                <Badge variant="outline" className="text-[10px] font-semibold font-mono">
                  {previewData.periodLabel}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Preview leave quota allocations, rollover carry-forwards, and expiring balances before committing to employee ledgers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Controls: Target Leave Type & Effective Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl border border-border bg-muted/20">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Leave Type to Renew</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={targetType === "ALL" ? "default" : "outline"}
                  onClick={() => setTargetType("ALL")}
                  className="text-xs h-8 rounded-xl font-semibold flex-1"
                >
                  Both (CL &amp; SL)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={targetType === "CL" ? "default" : "outline"}
                  onClick={() => setTargetType("CL")}
                  className="text-xs h-8 rounded-xl font-semibold flex-1"
                >
                  Casual (CL)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={targetType === "SL" ? "default" : "outline"}
                  onClick={() => setTargetType("SL")}
                  className="text-xs h-8 rounded-xl font-semibold flex-1"
                >
                  Sick (SL)
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Effective Renewal Date</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs h-8 rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                  className="text-[11px] h-8 shrink-0 font-medium"
                >
                  Today
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-border bg-card">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Employees</span>
              <span className="text-base font-bold text-foreground">{previewData.totalEmployees} Active</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold block">Cycle Credit</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">+{previewData.totalCredited} Days</span>
            </div>

            <div className="p-3 rounded-xl border border-primary/30 bg-primary/10">
              <span className="text-[10px] text-primary uppercase font-semibold block">Rollover Carried</span>
              <span className="text-base font-bold text-primary">+{previewData.totalRolledOver} Days</span>
            </div>

            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10">
              <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-semibold block">Expired / Lapsed</span>
              <span className="text-base font-bold text-rose-700 dark:text-rose-400">-{previewData.totalExpired} Days</span>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-muted/40 px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Employee Balance Forecast ({previewData.employeeRows.length} allocations)</span>
              <span className="text-[11px] font-normal font-mono">Live calculation based on current settings</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 sticky top-0 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-2 text-right">Prev Balance</th>
                    <th className="py-2.5 px-2 text-right">Rollover</th>
                    <th className="py-2.5 px-2 text-right">Expired</th>
                    <th className="py-2.5 px-2 text-right">New Credit</th>
                    <th className="py-2.5 px-3 text-right">Forecast Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {previewData.employeeRows.map((r, idx) => (
                    <tr key={`${r.empId}-${r.leaveType}-${idx}`} className="hover:bg-muted/20">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-foreground block">{r.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{r.empCode} · {r.dept}</span>
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            r.leaveType === "CL"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                              : "bg-sky-500/10 text-sky-700 border-sky-500/30"
                          }`}
                        >
                          {r.leaveType}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                        {r.prevBal}d
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium text-primary">
                        {r.rolled > 0 ? `+${r.rolled}d` : "0"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium text-rose-600">
                        {r.exp > 0 ? `-${r.exp}d` : "—"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600">
                        +{r.quota}d
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                        <Badge className="bg-foreground text-background font-mono font-bold text-xs">
                          {r.newBal} Days
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={executing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExecuteRenewal}
            disabled={executing || previewData.employeeRows.length === 0}
            className="bg-primary text-primary-foreground font-bold shadow-xs gap-1.5"
          >
            {executing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>{executing ? "Processing Renewal..." : "Execute Leave Cycle Renewal"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
