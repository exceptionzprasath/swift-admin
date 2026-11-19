import type {
  AttendanceRecord,
  Company,
  CompanyHoliday,
  Employee,
  LeaveRequest,
  ShiftAssignment,
} from "./store";

export interface DailyLateEvaluation {
  date: string;
  lateMinutes: number;
  runningLateDaysCount: number;
  runningLateMinutesTotal: number;
  isBreached: boolean;
  excessMinutesToDeduct: number;
  latePenaltyApplied?: "permission_deducted" | "half_day_converted" | "uncovered_excess";
  permissionMinutesDeducted: number;
  uncoveredExcessMinutes: number;
  remainingPermissionMinutesAfter: number;
  effectiveStatus: "present" | "half_day";
  paidDayCredit: 1.0 | 0.5;
  originalStatus: "late";
  badgeLabel: string;
  actionLabel: string;
  tooltipText: string;
}

export interface MonthlyLatePunchSummary {
  employeeId: string;
  yearMonth: string;
  latePunchControlEnabled: boolean;
  lateLimitType: "days" | "hours";
  maxLateDaysPerMonth: number;
  maxLateHoursPerMonth: number;
  maxLateMinutesLimit: number;
  initialPermissionMinutes: number;
  remainingPermissionMinutes: number;
  totalLateDays: number;
  totalLateMinutes: number;
  permissionMinutesUsedForLate: number;
  lateConvertedHalfDays: number;
  byDate: Record<string, DailyLateEvaluation>;
}

export function formatMinutesToHrsMins(totalMins: number): string {
  const mins = Math.max(0, Math.round(totalMins));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function parseTimeMinutes(s?: string): number {
  if (!s) return -1;
  let cleaned = String(s).trim().toLowerCase();
  if (cleaned.includes("t")) {
    const timePart = cleaned.split("t")[1];
    if (timePart) cleaned = timePart.split(".")[0].replace("z", "").trim();
  } else if (cleaned.includes(" ") && cleaned.includes("-")) {
    const parts = cleaned.split(" ");
    cleaned = parts.slice(1).join(" ").trim();
  }
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridiem = match[4]?.toLowerCase();
  if (meridiem === "pm" && h < 12) h += 12;
  if (meridiem === "am" && h === 12) h = 0;
  return h * 60 + m;
}

function getMonthlyPermissionAllowanceMinutes(
  company: Company,
  emp: { id: string; name?: string; empCode?: string },
  leaves: LeaveRequest[] = [],
  yearMonth: string
): number {
  const permTypes = company.permissionTypes?.length
    ? company.permissionTypes
    : [
        {
          id: "perm-gen",
          name: "Standard Permission",
          maxHours: 2,
          period: "month" as const,
          maxRequestsPerMonth: 2,
          paid: true,
        },
      ];

  const totalAllowanceMinutes = permTypes
    .filter((p) => p.paid !== false)
    .reduce((sum, p) => sum + Math.max(0, Number(p.maxHours) || 0) * 60, 0);

  // Subtract already approved short permission requests in this month
  let usedByManualRequests = 0;
  for (const l of leaves || []) {
    if (!l) continue;
    const status = (l.status || "").toLowerCase();
    if (status !== "approved") continue;
    const typeLower = (l.type || "").toLowerCase();
    if (!typeLower.includes("permission") && !typeLower.includes("short")) continue;

    const matchesEmp =
      l.employeeId === emp.id ||
      (emp.empCode && (l as any).empCode === emp.empCode) ||
      (emp.name && l.employeeName && l.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase());
    if (!matchesEmp) continue;

    const dateRef = String(l.from || (l as any).startDate || (l as any).date || "");
    if (yearMonth && !dateRef.startsWith(yearMonth)) {
      // Also check formatted month like "Nov 12, 2026"
      const parsed = new Date(dateRef.replace(/\s*\(.*?\)/g, ""));
      if (isNaN(parsed.getTime())) continue;
      const ym = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      if (ym !== yearMonth) continue;
    }

    // Parse hours from type string like "Short Permission (1 Hr)" or "2 Hrs"
    const hrMatch = (l.type || "").match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/i);
    if (hrMatch) {
      usedByManualRequests += Math.round(parseFloat(hrMatch[1]) * 60);
    } else {
      usedByManualRequests += 60;
    }
  }

  return Math.max(0, totalAllowanceMinutes - usedByManualRequests);
}

/**
 * Evaluates all working days in the selected YYYY-MM (or custom date range) for an employee,
 * tracking running late days & cumulative late minutes, and applying Step 2 penalties
 * (Short Permission deduction and/or Half-Day conversion) when the configured threshold is breached.
 */
export function evaluateMonthlyLatePunches(
  emp: { id: string; name?: string; empCode?: string; shiftId?: string; graceTime?: string; halfDayLoginTime?: string },
  yearMonth: string,
  attendance: AttendanceRecord[] = [],
  leaves: LeaveRequest[] = [],
  company: Company,
  roster: ShiftAssignment[] = [],
  holidays: CompanyHoliday[] = [],
  customRange?: { start?: string; end?: string }
): MonthlyLatePunchSummary {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = todayStr.slice(0, 7);

  const latePunchControlEnabled = Boolean(company?.latePunchControlEnabled);
  const lateLimitType: "days" | "hours" = company?.lateLimitType === "hours" ? "hours" : "days";
  const maxLateDaysPerMonth = Math.max(0, Number(company?.maxLateDaysPerMonth ?? 5));
  const maxLateHoursPerMonth = Math.max(0, Number(company?.maxLateHoursPerMonth ?? 3));
  const maxLateMinutesLimit = Math.round(maxLateHoursPerMonth * 60);

  const initialPermissionMinutes = getMonthlyPermissionAllowanceMinutes(company, emp, leaves, yearMonth);
  let remainingPermissionMinutes = initialPermissionMinutes;

  // Filter & deduplicate attendance records for this employee in yearMonth / customRange
  const rawAtt = (attendance || []).filter((a) => {
    if (!a || !a.date) return false;
    const matchesEmp =
      a.employeeId === emp.id ||
      (emp.empCode && (a.empCode === emp.empCode || a.employeeId === emp.empCode)) ||
      ((a as any).employeeDbId && (a as any).employeeDbId === emp.id) ||
      (emp.name && a.employeeName && a.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase());
    if (!matchesEmp) return false;

    if (customRange?.start && customRange?.end) {
      return a.date >= customRange.start && a.date <= customRange.end;
    }
    if (!a.date.startsWith(yearMonth)) return false;
    if (yearMonth === currentMonth && a.date > todayStr) return false;
    return true;
  });

  const dateMap = new Map<string, AttendanceRecord>();
  for (const rec of rawAtt) {
    const existing = dateMap.get(rec.date);
    if (!existing) {
      dateMap.set(rec.date, rec);
    } else {
      const hasOutNew = Boolean(rec.checkOut || rec.clockOut);
      const hasOutOld = Boolean(existing.checkOut || existing.clockOut);
      if (hasOutNew && !hasOutOld) {
        dateMap.set(rec.date, rec);
      }
    }
  }

  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));
  const shifts = company?.shifts || [];

  let runningLateDaysCount = 0;
  let runningLateMinutesTotal = 0;
  let permissionMinutesUsedForLate = 0;
  let lateConvertedHalfDays = 0;
  const byDate: Record<string, DailyLateEvaluation> = {};

  for (const dateStr of sortedDates) {
    const rec = dateMap.get(dateStr)!;
    const s = (rec.status || "").toLowerCase().trim();

    // Skip non-working / leave / absent / already explicit half-day records
    if (
      s === "absent" ||
      s === "leave" ||
      s === "informed_leave" ||
      s === "il" ||
      s === "holiday" ||
      s === "weekly-off" ||
      s === "half-day" ||
      s === "half_day" ||
      s === "halfday"
    ) {
      continue;
    }

    // Skip if sunday/rest day work is not approved
    const isSun = new Date(dateStr + "T12:00:00Z").getUTCDay() === 0;
    const isHoliday = (holidays || []).some((h) => h.date === dateStr);
    if ((isSun || isHoliday || rec.isRestDayWork) && rec.restDayWorkStatus !== "approved") {
      continue;
    }

    const checkIn = rec.checkIn || rec.clockIn || (rec as any).inTime;
    const checkOut = rec.checkOut || rec.clockOut || (rec as any).outTime;
    const hasIn = Boolean(checkIn);
    const hasOut = Boolean(checkOut && checkOut !== "--:--" && checkOut !== "-");
    const isPastDate = dateStr < todayStr;
    const isMissedOut = Boolean(
      rec.isMissedCheckout ||
      (rec.clockOut === "22:00" && (rec.isAutoClosed || rec.autoCloseReason)) ||
      (hasIn && !hasOut && isPastDate && !rec.regularized)
    );

    // Past-date missed check-out is already handled as absent (if late) or half-day (if on-time)
    if (isMissedOut) {
      continue;
    }

    // Resolve shift start & grace minutes for this employee on dateStr
    const rosterEntry = (roster || []).find(
      (r) =>
        r.date === dateStr &&
        (r.employeeId === emp.id ||
          (emp.name && r.employeeName && r.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase()))
    );
    const shiftObj =
      (rosterEntry && shifts.find((sh) => sh.id === rosterEntry.shiftId)) ||
      shifts.find((sh) => sh.id === (rec.shiftId || emp.shiftId)) ||
      shifts[0] || {
        id: "gen",
        name: "General Shift",
        start: "09:00",
        end: "18:00",
        graceTime: "15",
      };

    const rawShiftStart = rec.shiftStart || shiftObj.start || "09:00";
    const shiftStart = rawShiftStart.includes(":") ? rawShiftStart : "09:00";
    const graceRaw = emp.graceTime || rec.graceTime || shiftObj.graceTime || "15";
    const graceMinutes = graceRaw === "always" ? 9999 : parseInt(String(graceRaw), 10) || 0;

    let lateMinutes = 0;
    if (hasIn) {
      const punchMins = parseTimeMinutes(checkIn);
      const startMins = parseTimeMinutes(shiftStart);
      const endMins = parseTimeMinutes(rec.shiftEnd || shiftObj.end || "18:00");
      const isOvernight = endMins >= 0 && startMins >= 0 && endMins <= startMins;
      let effectivePunch = punchMins;
      if (isOvernight && punchMins >= 0 && punchMins < startMins) {
        effectivePunch = punchMins + 1440;
      }
      if (effectivePunch >= 0 && startMins >= 0) {
        if (effectivePunch > startMins + graceMinutes) {
          lateMinutes = effectivePunch - startMins;
        }
      } else if (Number(rec.lateBy) > 0) {
        lateMinutes = Number(rec.lateBy);
      }
    } else if (s === "late" || (rec.punctuality || "").toLowerCase() === "late") {
      lateMinutes = Number(rec.lateBy) > 0 ? Number(rec.lateBy) : 15;
    }

    if (lateMinutes <= 0) {
      continue;
    }

    // Update running counters
    const prevMinutesTotal = runningLateMinutesTotal;
    runningLateDaysCount += 1;
    runningLateMinutesTotal += lateMinutes;

    // Step 1: Check if threshold is breached
    let isBreached = false;
    let excessMinutesToDeduct = 0;

    if (latePunchControlEnabled) {
      if (lateLimitType === "days") {
        isBreached = runningLateDaysCount > maxLateDaysPerMonth;
        excessMinutesToDeduct = isBreached ? lateMinutes : 0;
      } else {
        isBreached = runningLateMinutesTotal > maxLateMinutesLimit;
        if (isBreached) {
          if (prevMinutesTotal < maxLateMinutesLimit) {
            excessMinutesToDeduct = runningLateMinutesTotal - maxLateMinutesLimit;
          } else {
            excessMinutesToDeduct = lateMinutes;
          }
        }
      }
    }

    // Step 2: Execute Next Step Actions upon Breach
    let latePenaltyApplied: DailyLateEvaluation["latePenaltyApplied"] = undefined;
    let permissionMinutesDeducted = 0;
    let uncoveredExcessMinutes = 0;
    let effectiveStatus: "present" | "half_day" = "present";
    let paidDayCredit: 1.0 | 0.5 = 1.0;
    let badgeLabel = `Late ${lateMinutes}m`;
    let actionLabel = "Within Allowed Limit (No Penalty)";

    if (isBreached && latePunchControlEnabled) {
      if (company.latePermissionDeductionEnabled) {
        if (remainingPermissionMinutes >= excessMinutesToDeduct && excessMinutesToDeduct > 0) {
          remainingPermissionMinutes -= excessMinutesToDeduct;
          permissionMinutesUsedForLate += excessMinutesToDeduct;
          permissionMinutesDeducted = excessMinutesToDeduct;
          latePenaltyApplied = "permission_deducted";
          effectiveStatus = "present";
          paidDayCredit = 1.0;
          badgeLabel = `Perm -${excessMinutesToDeduct}m`;
          actionLabel = `${excessMinutesToDeduct}m Deducted from Short Permission`;
        } else if (company.lateHalfDayConversionEnabled) {
          // Fallback to Case B (Half-Day Conversion)
          latePenaltyApplied = "half_day_converted";
          effectiveStatus = "half_day";
          paidDayCredit = 0.5;
          lateConvertedHalfDays += 1;
          badgeLabel = "HD (Late Limit)";
          actionLabel = "Converted to Half-Day (0.5 Paid Day)";
        } else {
          // Deduct whatever permission balance remains and flag uncovered excess minutes
          const deducted = Math.max(0, remainingPermissionMinutes);
          const uncovered = Math.max(0, excessMinutesToDeduct - deducted);
          remainingPermissionMinutes = 0;
          permissionMinutesUsedForLate += deducted;
          permissionMinutesDeducted = deducted;
          uncoveredExcessMinutes = uncovered;
          latePenaltyApplied = deducted > 0 ? "permission_deducted" : "uncovered_excess";
          effectiveStatus = "present";
          paidDayCredit = 1.0;
          badgeLabel = deducted > 0 ? `Perm -${deducted}m` : `Excess +${uncovered}m`;
          actionLabel =
            deducted > 0
              ? `${deducted}m Deducted from Short Permission (${uncovered}m Uncovered Excess)`
              : `Uncovered Excess Late (${uncovered}m)`;
        }
      } else if (company.lateHalfDayConversionEnabled) {
        // Case B directly
        latePenaltyApplied = "half_day_converted";
        effectiveStatus = "half_day";
        paidDayCredit = 0.5;
        lateConvertedHalfDays += 1;
        badgeLabel = "HD (Late Limit)";
        actionLabel = "Converted to Half-Day (0.5 Paid Day)";
      } else {
        actionLabel = "Threshold Exceeded (No Penalty Action Enabled)";
      }
    }

    const tooltipText =
      lateLimitType === "hours"
        ? `Late: ${lateMinutes}m | Monthly Cumulative: ${formatMinutesToHrsMins(runningLateMinutesTotal)} / ${formatMinutesToHrsMins(maxLateMinutesLimit)} Limit | Action: ${actionLabel}`
        : `Late: ${lateMinutes}m | Late Day: ${runningLateDaysCount} of ${maxLateDaysPerMonth} Allowed | Action: ${actionLabel}`;

    byDate[dateStr] = {
      date: dateStr,
      lateMinutes,
      runningLateDaysCount,
      runningLateMinutesTotal,
      isBreached,
      excessMinutesToDeduct,
      latePenaltyApplied,
      permissionMinutesDeducted,
      uncoveredExcessMinutes,
      remainingPermissionMinutesAfter: remainingPermissionMinutes,
      effectiveStatus,
      paidDayCredit,
      originalStatus: "late",
      badgeLabel,
      actionLabel,
      tooltipText,
    };
  }

  return {
    employeeId: emp.id,
    yearMonth,
    latePunchControlEnabled,
    lateLimitType,
    maxLateDaysPerMonth,
    maxLateHoursPerMonth,
    maxLateMinutesLimit,
    initialPermissionMinutes,
    remainingPermissionMinutes,
    totalLateDays: runningLateDaysCount,
    totalLateMinutes: runningLateMinutesTotal,
    permissionMinutesUsedForLate,
    lateConvertedHalfDays,
    byDate,
  };
}

export function evaluateCompanyLatePunches(
  employees: Employee[],
  yearMonth: string,
  attendance: AttendanceRecord[],
  leaves: LeaveRequest[],
  company: Company,
  roster: ShiftAssignment[] = [],
  holidays: CompanyHoliday[] = [],
  customRange?: { start?: string; end?: string }
): Record<string, MonthlyLatePunchSummary> {
  const map: Record<string, MonthlyLatePunchSummary> = {};
  for (const emp of employees || []) {
    if (!emp || !emp.id) continue;
    map[emp.id] = evaluateMonthlyLatePunches(
      emp,
      yearMonth,
      attendance,
      leaves,
      company,
      roster,
      holidays,
      customRange
    );
  }
  return map;
}
