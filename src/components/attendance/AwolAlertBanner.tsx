import React, { useEffect, useMemo, useState } from "react";
import { useStore, type Employee } from "@/lib/store";
import { evaluateCompanyAwol, type EmployeeAwolEvaluation } from "@/lib/awol";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Ban, Eye, ShieldAlert, UserX } from "lucide-react";
import { toast } from "sonner";

export function useAwolEvaluator() {
  const {
    employees: rawEmployees,
    attendance,
    leaves,
    holidays,
    roster,
    company,
    updateEmployee,
  } = useStore();

  const awolSummary = useMemo(
    () =>
      evaluateCompanyAwol(
        rawEmployees || [],
        attendance || [],
        leaves || [],
        holidays || [],
        roster || [],
        company
      ),
    [rawEmployees, attendance, leaves, holidays, roster, company]
  );

  // Sync employee AWOL flags & execute Auto-Terminate when enabled
  useEffect(() => {
    if (!company.awolControlEnabled || !company.awolTerminationEnabled) return;

    const todayIso = new Date().toISOString();
    const todayDateStr = todayIso.slice(0, 10);

    for (const item of Object.values(awolSummary.byEmployeeId)) {
      const emp = item.employee;
      const count = item.consecutiveAwolDays;

      if (item.exceedsLimit) {
        if (company.awolAutoTerminate) {
          if (emp.status !== "terminated") {
            updateEmployee(emp.id, {
              status: "terminated",
              statusDate: todayDateStr,
              lastWorkingDate: item.awolDates[0] || todayDateStr,
              terminationReason: "Auto-Terminated due to AWOL",
              terminatedAt: todayIso,
              statusNote: `Auto-Terminated due to AWOL (${count} consecutive unauthorized absent days)`,
              awolWarningActive: true,
              consecutiveAwolCount: count,
              pendingAwolTermination: false,
            });
            toast.error(
              `${emp.name} (${emp.empCode}) was auto-terminated due to ${count} consecutive AWOL days.`
            );
          }
        } else {
          if (
            !emp.awolWarningActive ||
            emp.consecutiveAwolCount !== count ||
            !emp.pendingAwolTermination
          ) {
            updateEmployee(emp.id, {
              awolWarningActive: true,
              consecutiveAwolCount: count,
              pendingAwolTermination: true,
            });
          }
        }
      } else if (emp.awolWarningActive || emp.pendingAwolTermination) {
        updateEmployee(emp.id, {
          awolWarningActive: false,
          consecutiveAwolCount: count,
          pendingAwolTermination: false,
        });
      }
    }
  }, [
    awolSummary.byEmployeeId,
    company.awolControlEnabled,
    company.awolTerminationEnabled,
    company.awolAutoTerminate,
    updateEmployee,
  ]);

  return awolSummary;
}

export const EmployeeAwolBadge: React.FC<{
  employee: Employee;
  evaluation?: EmployeeAwolEvaluation;
}> = ({ employee, evaluation }) => {
  const isTerminatedAwol =
    evaluation?.isAutoTerminatedAwol ||
    (employee.status === "terminated" &&
      ((employee.terminationReason || "").toLowerCase().includes("awol") ||
        (employee.statusNote || "").toLowerCase().includes("awol")));

  if (isTerminatedAwol) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border bg-slate-900 text-rose-400 border-rose-800 whitespace-nowrap">
        [ 🚫 Terminated · AWOL ]
      </span>
    );
  }

  const days = evaluation ? evaluation.consecutiveAwolDays : (employee.consecutiveAwolCount ?? 0);
  const isWarning =
    (evaluation ? evaluation.exceedsLimit : Boolean(employee.awolWarningActive && days > 0)) &&
    employee.status !== "terminated";

  if (isWarning) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] border bg-rose-100 text-rose-700 border-rose-300 font-bold animate-pulse whitespace-nowrap">
        [ ⚠️ AWOL Warning · {days} Days ]
      </span>
    );
  }

  return null;
};

export const AwolAlertBanner: React.FC = () => {
  const { company, updateEmployee } = useStore();
  const awolSummary = useAwolEvaluator();
  const [reviewOpen, setReviewOpen] = useState(false);

  const flagged = awolSummary.flaggedEmployees;
  if (!company.awolControlEnabled || !company.awolTerminationEnabled || flagged.length === 0) {
    return null;
  }

  const limit = company.awolDaysLimit ?? 3;
  const minExceededDays = limit + 1;

  const handleTerminateEmployee = (item: EmployeeAwolEvaluation) => {
    const todayIso = new Date().toISOString();
    const todayDateStr = todayIso.slice(0, 10);
    updateEmployee(item.employee.id, {
      status: "terminated",
      statusDate: todayDateStr,
      lastWorkingDate: item.awolDates[0] || todayDateStr,
      terminationReason: "Auto-Terminated due to AWOL",
      terminatedAt: todayIso,
      statusNote: `Terminated due to AWOL (${item.consecutiveAwolDays} consecutive unauthorized absent days)`,
      awolWarningActive: true,
      consecutiveAwolCount: item.consecutiveAwolDays,
      pendingAwolTermination: false,
    });
    toast.success(`${item.employee.name} marked as Terminated (AWOL).`);
  };

  const handleTerminateAllFlagged = () => {
    const todayIso = new Date().toISOString();
    const todayDateStr = todayIso.slice(0, 10);
    for (const item of flagged) {
      updateEmployee(item.employee.id, {
        status: "terminated",
        statusDate: todayDateStr,
        lastWorkingDate: item.awolDates[0] || todayDateStr,
        terminationReason: "Auto-Terminated due to AWOL",
        terminatedAt: todayIso,
        statusNote: `Terminated due to AWOL (${item.consecutiveAwolDays} consecutive unauthorized absent days)`,
        awolWarningActive: true,
        consecutiveAwolCount: item.consecutiveAwolDays,
        pendingAwolTermination: false,
      });
    }
    toast.success(`Terminated ${flagged.length} employee(s) due to AWOL.`);
    setReviewOpen(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/40 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="h-5 w-5 animate-bounce" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">
              ⚠️ AWOL Termination Alert: {flagged.length} employee(s) have exceeded the {limit}-day unauthorized absence limit ({minExceededDays}+ days AWOL).
            </div>
            <div className="text-[11px] text-rose-700/90 dark:text-rose-300/90 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Flagged Staff:</span>
              {flagged.slice(0, 4).map((f) => (
                <span
                  key={f.employee.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 font-bold text-[10px]"
                >
                  {f.employee.name} ({f.consecutiveAwolDays}d AWOL)
                </span>
              ))}
              {flagged.length > 4 && (
                <span className="text-[10px] font-semibold">+{flagged.length - 4} more</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReviewOpen(true)}
            className="h-8 text-xs font-semibold border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-200 hover:bg-rose-500/20 gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            Review Employees
          </Button>
          {!company.awolAutoTerminate && (
            <Button
              size="sm"
              onClick={handleTerminateAllFlagged}
              className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-xs"
            >
              <UserX className="h-3.5 w-3.5" />
              Terminate Now
            </Button>
          )}
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              AWOL Termination Review ({flagged.length} Flagged)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Employees listed below have exceeded the configured {limit}-day consecutive unauthorized absence limit (Status: &apos;A&apos;, excluding Paid Leave &apos;PL&apos;, Informed Leave &apos;IL&apos;, Week Offs, and Holidays).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto divide-y divide-border rounded-xl border border-border">
            {flagged.map((item) => (
              <div
                key={item.employee.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card hover:bg-muted/20"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">
                      {item.employee.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {item.employee.empCode}
                    </Badge>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] border bg-rose-100 text-rose-700 border-rose-300 font-bold">
                      [ ⚠️ AWOL Warning · {item.consecutiveAwolDays} Days ]
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.employee.department} · {item.employee.designation}
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    Consecutive AWOL Dates: {item.awolDates.join(", ")}
                  </div>
                </div>

                {!company.awolAutoTerminate && (
                  <Button
                    size="sm"
                    onClick={() => handleTerminateEmployee(item)}
                    className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shrink-0"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Terminate Now
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Close
            </Button>
            {!company.awolAutoTerminate && flagged.length > 1 && (
              <Button
                onClick={handleTerminateAllFlagged}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
              >
                <UserX className="h-4 w-4" />
                Terminate All ({flagged.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
