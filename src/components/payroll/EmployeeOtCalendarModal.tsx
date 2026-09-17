import React, { useState, useMemo } from "react";
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
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Check,
  X,
  RotateCcw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowRight,
} from "lucide-react";
import { inr } from "@/lib/payroll";
import type { Employee, Company } from "@/lib/store";

export interface MonthlyOverrideData {
  daysWorked?: number;
  otHours?: number;
  otApprovedHours?: number;
  otStatus?: "pending" | "approved" | "rejected";
  otRemarks?: string;
  otApprovedAt?: string;
  otApprovedBy?: string;
  [key: string]: any;
}

interface EmployeeOtCalendarModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  initialMonth: string; // e.g. "2026-09"
  attendance: any[];
  company: Company;
  monthlyOverrides: Record<string, MonthlyOverrideData>;
  onApproveOt: (empId: string, hours?: number, remarks?: string) => void;
  onRejectOt: (empId: string) => void;
  onResetOt: (empId: string) => void;
}

export function EmployeeOtCalendarModal({
  open,
  onClose,
  employee,
  initialMonth,
  attendance,
  company,
  monthlyOverrides,
  onApproveOt,
  onRejectOt,
  onResetOt,
}: EmployeeOtCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState<string>(initialMonth || new Date().toISOString().slice(0, 7));

  // Sync initial month when modal opens with new employee/month
  React.useEffect(() => {
    if (initialMonth) {
      setCurrentMonth(initialMonth);
    }
  }, [initialMonth, employee?.id]);

  const [year, month] = useMemo(() => {
    const parts = (currentMonth || "").split("-").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1];
  }, [currentMonth]);

  const monthName = useMemo(() => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [year, month]);

  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  // Compute daily attendance & overtime for this employee and month
  const {
    calendarDays,
    totalLoggedOtHours,
    daysWithOtCount,
    otBreakdownList,
    approvedOtHours,
    otStatus,
    potentialOtPay,
  } = useMemo(() => {
    if (!employee) {
      return {
        calendarDays: [],
        totalLoggedOtHours: 0,
        daysWithOtCount: 0,
        otBreakdownList: [],
        approvedOtHours: 0,
        otStatus: "pending" as const,
        potentialOtPay: 0,
      };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon, ...

    // Filter attendance records for this employee in this month
    const empAttRecords = attendance.filter((a) => {
      const matchEmp = a.employeeId === employee.id || a.employeeName === employee.name;
      if (!matchEmp) return false;
      return a.date && a.date.startsWith(currentMonth);
    });

    const attMap = new Map<string, any>();
    empAttRecords.forEach((a) => {
      if (a.date) {
        attMap.set(a.date, a);
      }
    });

    const days: Array<{
      isPadding: boolean;
      key: string;
      dayNumber: number;
      dayName: string;
      dateStr: string;
      isSunday: boolean;
      isSaturday: boolean;
      status: string;
      inTime: string;
      outTime: string;
      workedHours: number;
      otHours: number;
    }> = [];

    // Padding for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        isPadding: true,
        key: `pad-${i}`,
        dayNumber: 0,
        dayName: "",
        dateStr: "",
        isSunday: false,
        isSaturday: false,
        status: "",
        inTime: "",
        outTime: "",
        workedHours: 0,
        otHours: 0,
      });
    }

    let totalOt = 0;
    let otDays = 0;
    const breakdown: Array<{
      date: string;
      dayName: string;
      checkIn: string;
      checkOut: string;
      workedHours: number;
      otHours: number;
      status: string;
    }> = [];

    const stdHours = company.workingHoursPerDay || 9;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayDate = new Date(year, month - 1, d);
      const dayOfWeek = dayDate.getDay();
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;
      const dayName = dayDate.toLocaleString("en-US", { weekday: "short" });

      const att = attMap.get(dateStr);
      let inTime = att?.checkIn || att?.clockIn || "";
      let outTime = att?.checkOut || att?.clockOut || "";
      let status = att?.status || (isSunday ? "week-off" : "absent");
      let workedH = 0;
      let dayOt = 0;

      if (att && att.otHours !== undefined && att.otHours !== null) {
        dayOt = Number(att.otHours) || 0;
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
            if (att?.otHours === undefined || att?.otHours === null) {
              dayOt = workedH > stdHours ? Math.round((workedH - stdHours) * 10) / 10 : 0;
            }
          }
        } catch {}
      }

      if (dayOt > 0) {
        totalOt += dayOt;
        otDays += 1;
        breakdown.push({
          date: dateStr,
          dayName,
          checkIn: inTime || "—",
          checkOut: outTime || "—",
          workedHours: workedH,
          otHours: dayOt,
          status,
        });
      }

      days.push({
        isPadding: false,
        key: dateStr,
        dayNumber: d,
        dayName,
        dateStr,
        isSunday,
        isSaturday,
        status,
        inTime,
        outTime,
        workedHours: workedH,
        otHours: dayOt,
      });
    }

    const roundedTotalOt = Math.round(totalOt * 10) / 10;

    // Read monthly override for this period
    const overrideKey = `${currentMonth}_${employee.id}`;
    const ov = monthlyOverrides[overrideKey] || {};
    const approvedHours = ov.otApprovedHours !== undefined
      ? ov.otApprovedHours
      : (ov.otHours !== undefined ? ov.otHours : roundedTotalOt);
    const statusVal: "pending" | "approved" | "rejected" = ov.otStatus ? ov.otStatus : (roundedTotalOt > 0 ? "pending" : "pending");

    // Potential OT Pay Calculation
    const fixedGross = employee.basic || employee.salary || 30000;
    const wd = company.workingDaysPerMonth || 26;
    const hourlyRate = fixedGross / (wd * stdHours);
    const otMult = company.otMultiplier || 2;
    const otPay = Math.round(hourlyRate * approvedHours * otMult);

    return {
      calendarDays: days,
      totalLoggedOtHours: roundedTotalOt,
      daysWithOtCount: otDays,
      otBreakdownList: breakdown,
      approvedOtHours: approvedHours,
      otStatus: statusVal,
      potentialOtPay: otPay,
    };
  }, [employee, currentMonth, year, month, attendance, company, monthlyOverrides]);

  const [inputApprovedHours, setInputApprovedHours] = useState<number>(approvedOtHours);

  // Sync input value when approved hours change
  React.useEffect(() => {
    setInputApprovedHours(approvedOtHours);
  }, [approvedOtHours, currentMonth]);

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl border border-border shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-brand text-white flex items-center justify-center font-bold text-base shadow-soft shrink-0">
                {employee.photoDataUrl ? (
                  <img src={employee.photoDataUrl} alt={employee.name} className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  employee.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-display text-lg font-bold text-foreground">
                    {employee.name}
                  </DialogTitle>
                  <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5 border-border">
                    {employee.empCode}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {employee.department || "General"} · {employee.designation || "Employee"} · Overtime Attendance Sheet
                </DialogDescription>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-7 w-7 p-0 rounded-lg"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5 px-2 font-semibold text-xs text-foreground min-w-[120px] justify-center">
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                <span>{monthName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-7 w-7 p-0 rounded-lg"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                Logged OT (Punches)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-sky-600 dark:text-sky-400 font-display">
                  {totalLoggedOtHours}
                </span>
                <span className="text-xs text-muted-foreground font-medium">hrs</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                OT Work Days
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-display">
                  {daysWithOtCount}
                </span>
                <span className="text-xs text-muted-foreground font-medium">days</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Estimated OT Pay
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-display">
                  {inr(potentialOtPay)}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Approval Status
              </span>
              <div className="mt-1">
                {otStatus === "approved" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px] font-semibold py-0.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Approved ({approvedOtHours} hrs)</span>
                  </Badge>
                ) : otStatus === "rejected" ? (
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
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-[11px] text-muted-foreground border-b border-border/40">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Overtime Worked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Present / Normal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Week Off / Holiday
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Absent / Leave
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground italic">
            * Shift Standard: {company.workingHoursPerDay || 9} hrs/day · Multiplier: {company.otMultiplier || 2}×
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CALENDAR MONTH GRID                                                       */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 bg-muted/40 border-b border-border text-center py-2 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
              <div className="text-rose-500">Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div className="text-sky-500">Sat</div>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
              {calendarDays.map((item, idx) => {
                if (item.isPadding) {
                  return (
                    <div
                      key={item.key}
                      className="min-h-[75px] bg-muted/15 p-1.5 opacity-30 select-none"
                    />
                  );
                }

                const hasOt = item.otHours > 0;
                const isPresent = item.status === "present";
                const isHalfDay = item.status === "half-day";
                const isLeave = item.status === "leave";

                return (
                  <div
                    key={item.key}
                    className={`min-h-[82px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors relative ${
                      hasOt
                        ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30"
                        : isPresent
                        ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                        : item.isSunday || item.status === "week-off"
                        ? "bg-muted/20"
                        : "bg-background hover:bg-muted/30"
                    }`}
                  >
                    {/* Top Row: Date Number & Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold leading-none ${
                          hasOt
                            ? "text-amber-700 dark:text-amber-300 font-extrabold"
                            : item.isSunday
                            ? "text-rose-500"
                            : "text-foreground"
                        }`}
                      >
                        {item.dayNumber}
                      </span>

                      {hasOt && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[9px] px-1 py-0 font-extrabold gap-0.5"
                        >
                          <Clock className="h-2 w-2" />
                          +{item.otHours}h
                        </Badge>
                      )}
                    </div>

                    {/* Middle: Punches / Timestamps */}
                    <div className="my-1 space-y-0.5 text-[10px]">
                      {item.inTime && item.outTime ? (
                        <div className="text-muted-foreground font-mono leading-tight">
                          <div className="text-[9.5px] truncate font-semibold text-foreground">
                            {item.inTime} - {item.outTime}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {item.workedHours} hrs worked
                          </div>
                        </div>
                      ) : item.inTime ? (
                        <div className="text-[9.5px] text-muted-foreground font-mono">
                          In: {item.inTime}
                        </div>
                      ) : item.status === "week-off" || item.isSunday ? (
                        <span className="text-[9.5px] text-muted-foreground/60 italic">Week Off</span>
                      ) : isLeave ? (
                        <span className="text-[9.5px] text-purple-600 dark:text-purple-400 font-medium">On Leave</span>
                      ) : (
                        <span className="text-[9.5px] text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Bottom: Status Pill */}
                    <div className="flex items-center justify-between">
                      {hasOt ? (
                        <span className="text-[8.5px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">
                          Overtime
                        </span>
                      ) : isPresent ? (
                        <span className="text-[8.5px] font-medium text-emerald-600 dark:text-emerald-400">
                          Present
                        </span>
                      ) : isHalfDay ? (
                        <span className="text-[8.5px] font-medium text-amber-600">
                          Half Day
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Chronological OT Breakdown Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Overtime Shift Details ({otBreakdownList.length} {otBreakdownList.length === 1 ? "day" : "days"})</span>
              </h4>
              <span className="text-[11px] text-muted-foreground">
                Total Overtime: <strong className="text-foreground">{totalLoggedOtHours} hrs</strong>
              </span>
            </div>

            {otBreakdownList.length === 0 ? (
              <div className="rounded-xl border border-border/80 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                No overtime punches recorded for {employee.name} in {monthName}.
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground text-[10.5px] uppercase font-semibold border-b border-border">
                    <tr>
                      <th className="px-3 py-2">Date &amp; Day</th>
                      <th className="px-3 py-2">Punch Times</th>
                      <th className="px-3 py-2 text-right">Standard Shift</th>
                      <th className="px-3 py-2 text-right">Total Worked</th>
                      <th className="px-3 py-2 text-right text-amber-600 font-bold">OT Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {otBreakdownList.map((item) => (
                      <tr key={item.date} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">
                          <span>{item.date}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">({item.dayName})</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          {item.checkIn} → {item.checkOut}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {company.workingHoursPerDay || 9} hrs
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-foreground">
                          {item.workedHours} hrs
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-amber-600 dark:text-amber-400">
                          +{item.otHours} hrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold whitespace-nowrap">
              Approved Hours:
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={inputApprovedHours}
              onChange={(e) => setInputApprovedHours(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 h-8 text-xs font-bold text-foreground"
            />
            <span className="text-xs text-muted-foreground">hrs</span>
          </div>

          <div className="flex items-center gap-2">
            {otStatus !== "approved" ? (
              <Button
                onClick={() => {
                  onApproveOt(employee.id, inputApprovedHours);
                  onClose();
                }}
                className="h-8 text-xs px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve OT ({inputApprovedHours} hrs)</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  onRejectOt(employee.id);
                  onClose();
                }}
                className="h-8 text-xs px-3 rounded-xl text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                <span>Revoke Approval</span>
              </Button>
            )}

            {otStatus !== "rejected" && (
              <Button
                variant="ghost"
                onClick={() => {
                  onRejectOt(employee.id);
                  onClose();
                }}
                className="h-8 text-xs px-2.5 rounded-xl text-rose-600 hover:bg-rose-500/10"
              >
                Reject
              </Button>
            )}

            {otStatus !== "pending" && (
              <Button
                variant="ghost"
                onClick={() => {
                  onResetOt(employee.id);
                  onClose();
                }}
                className="h-8 text-xs px-2.5 rounded-xl text-muted-foreground hover:bg-muted"
                title="Reset to Pending"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}

            <Button
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs px-3 rounded-xl border-border"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
