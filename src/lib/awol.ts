import type {
  AttendanceRecord,
  Company,
  CompanyHoliday,
  Employee,
  LeaveRequest,
  ShiftAssignment,
} from "./store";

export interface EmployeeAwolEvaluation {
  emp: Employee;
  employee: Employee;
  consecutiveAwolDays: number;
  awolDates: string[];
  awolDaysLimit: number;
  exceedsLimit: boolean;
  awolWarningActive: boolean;
  pendingAwolTermination: boolean;
  isAutoTerminatedAwol: boolean;
}

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeDateYMD(dateInput?: string): string {
  if (!dateInput) return "";
  const trimmed = String(dateInput).trim().replace(/\s*\(.*?\)/g, "");
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

function isLeaveOnDate(leave: any, targetDateStr: string): boolean {
  if (!leave || !targetDateStr) return false;
  const startStr = normalizeDateYMD(leave.from || leave.startDate || leave.date);
  const endStr = normalizeDateYMD(leave.to || leave.endDate || leave.from || leave.startDate || leave.date);
  if (!startStr) return false;
  if (endStr) {
    return targetDateStr >= startStr && targetDateStr <= endStr;
  }
  return targetDateStr === startStr;
}

function matchEmpAttendance(a: any, emp: Employee, dateStr: string): boolean {
  if (!a || a.date !== dateStr) return false;
  if (a.employeeId === emp.id) return true;
  if (emp.empCode && (a.empCode === emp.empCode || a.employeeId === emp.empCode)) return true;
  if ((emp as any).employeeId && (a.employeeId === (emp as any).employeeId || a.empCode === (emp as any).employeeId)) return true;
  if (a.employeeName && emp.name && a.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase()) return true;
  return false;
}

/**
 * Calculate consecutive working days of Unauthorized Absence (AWOL / Status 'A') for an employee.
 * Excludes Paid Leave (LV), Informed Leave (IL), Weekly Offs (W/O), and Public Holidays (A/H).
 */
export function evaluateEmployeeAwol(
  emp: Employee,
  attendance: AttendanceRecord[],
  leaves: LeaveRequest[],
  holidays: CompanyHoliday[],
  roster: ShiftAssignment[],
  company: Company,
  asOfDateStr?: string
): EmployeeAwolEvaluation {
  const todayStr = asOfDateStr || new Date().toISOString().slice(0, 10);
  const awolDaysLimit = Math.max(1, Number(company.awolDaysLimit) || 3);

  const isTerminated = (emp.status || "").toLowerCase().trim() === "terminated";
  const isAutoTerminatedAwol =
    isTerminated &&
    Boolean(
      emp.terminationReason?.toLowerCase().includes("awol") ||
      emp.statusNote?.toLowerCase().includes("awol")
    );

  // Determine start date for scanning (last 45 calendar days, bounded by employee's DOJ)
  const endObj = new Date(todayStr + "T12:00:00Z");
  const startObj = new Date(endObj);
  startObj.setUTCDate(startObj.getUTCDate() - 45);
  let scanStartStr = startObj.toISOString().slice(0, 10);

  const dojStr = normalizeDateYMD(emp.doj || (emp as any).joiningDate);
  if (dojStr && dojStr > scanStartStr) {
    scanStartStr = dojStr;
  }

  // Pre-filter employee's attendance, leaves, and roster for speed
  const empAtt = (attendance || []).filter(
    (a) =>
      a &&
      a.date &&
      a.date >= scanStartStr &&
      a.date <= todayStr &&
      (a.employeeId === emp.id ||
        (emp.empCode && (a.empCode === emp.empCode || a.employeeId === emp.empCode)) ||
        (a.employeeName && emp.name && a.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase()))
  );

  const empLeaves = (leaves || []).filter(
    (l) =>
      l &&
      (l.employeeId === emp.id ||
        (emp.empCode && (l as any).empCode === emp.empCode) ||
        (l.employeeName && emp.name && l.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase())) &&
      (l.status || "").toLowerCase() === "approved" &&
      !l.type?.toLowerCase().includes("permission") &&
      !l.type?.toLowerCase().includes("short")
  );

  const empRoster = (roster || []).filter(
    (r) =>
      r &&
      (r.employeeId === emp.id ||
        (r.employeeName && emp.name && r.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase()))
  );

  const weeklyOffDays = emp.attendanceProfile?.weeklyOff?.length
    ? emp.attendanceProfile.weeklyOff
    : ["Sun"];

  let consecutiveAwolDays = 0;
  let awolDates: string[] = [];

  const cur = new Date(scanStartStr + "T12:00:00Z");
  while (cur <= endObj) {
    const dateStr = cur.toISOString().slice(0, 10);
    const dayShort = DAY_NAMES_SHORT[cur.getUTCDay()];
    cur.setUTCDate(cur.getUTCDate() + 1);

    // 1. Check Public Holiday (A/H)
    const isHoliday = (holidays || []).some((h) => h.date === dateStr);
    if (isHoliday) continue;

    // 2. Check Weekly Off (W/O) via Roster or Shift/Profile
    const rosterEntry = empRoster.find((r) => r.date === dateStr);
    const isRosterWeekOff =
      rosterEntry &&
      (rosterEntry.shiftId === "WEEKOFF" ||
        rosterEntry.shiftId === "OFF" ||
        rosterEntry.shiftName?.toLowerCase().includes("off"));
    const isProfileWeekOff = !rosterEntry && (weeklyOffDays.includes(dayShort) || dayShort === "Sun");
    if (isRosterWeekOff || isProfileWeekOff) continue;

    // 3. Check Approved Leave (LV Paid Leave or IL Informed Leave)
    const hasApprovedLeave = empLeaves.some((l) => isLeaveOnDate(l, dateStr));
    if (hasApprovedLeave) {
      // Approved leave (LV or IL) is an authorized absence; it does not count as AWOL
      continue;
    }

    // 4. Check Attendance Record for dateStr
    const rec = empAtt.find((a) => matchEmpAttendance(a, emp, dateStr));
    const s = (rec?.status || "").toLowerCase().trim();
    const isInformedLeaveRec =
      s === "informed_leave" ||
      s === "il" ||
      (s === "leave" && (rec?.leaveType === "LOP" || rec?.isExcused)) ||
      (rec?.leaveType === "LOP" && rec?.isExcused);

    if (isInformedLeaveRec || s === "leave") {
      // Authorized leave record
      continue;
    }

    const isPastDate = dateStr < todayStr;
    const hasIn = Boolean(rec?.checkIn || rec?.clockIn || (rec as any)?.inTime);
    const outVal = rec?.checkOut || rec?.clockOut || (rec as any)?.outTime;
    const hasOut = Boolean(outVal && outVal !== "--:--" && outVal !== "-");

    const isMissedOut = Boolean(
      rec?.isMissedCheckout ||
      (rec?.clockOut === "22:00" && (rec?.isAutoClosed || (rec as any)?.autoCloseReason)) ||
      (hasIn && !hasOut && isPastDate && !rec?.regularized)
    );
    const isLate =
      s === "late" ||
      (rec?.punctuality || "").toLowerCase() === "late" ||
      (Number(rec?.lateBy) || 0) > 0;

    // If present / half-day / late (and not Late + Missed Check-Out on past date)
    const isWorkedDay =
      !isMissedOut &&
      (s === "present" ||
        s === "late" ||
        s === "half-day" ||
        s === "half_day" ||
        s === "halfday" ||
        s === "on-time" ||
        s === "on_time" ||
        s === "grace" ||
        s === "within-grace" ||
        s === "within_grace" ||
        hasIn);

    const isOnTimeMissedOutHalfDay = isMissedOut && !isLate && s !== "absent";

    if (isWorkedDay || isOnTimeMissedOutHalfDay) {
      // Employee attended work — reset consecutive AWOL streak
      consecutiveAwolDays = 0;
      awolDates = [];
      continue;
    }

    // If today and no record yet (not punched yet), do not mark absent yet unless explicitly marked status === 'absent'
    if (!isPastDate && !rec) {
      continue;
    }
    if (!isPastDate && rec && s !== "absent") {
      continue;
    }

    // Unauthorized absence ('A')
    consecutiveAwolDays += 1;
    awolDates.push(dateStr);
  }

  const exceedsLimit =
    Boolean(
      company.awolControlEnabled &&
        (company.awolTerminationEnabled || company.awolPenaltyEnabled)
    ) && consecutiveAwolDays > awolDaysLimit;

  return {
    emp,
    employee: emp,
    consecutiveAwolDays,
    awolDates,
    awolDaysLimit,
    exceedsLimit,
    awolWarningActive: exceedsLimit && !isTerminated,
    pendingAwolTermination: exceedsLimit && !company.awolAutoTerminate && !isTerminated,
    isAutoTerminatedAwol,
  };
}

/**
 * Evaluate AWOL status across a list of employees
 */
export function evaluateCompanyAwol(
  employees: Employee[],
  attendance: AttendanceRecord[],
  leaves: LeaveRequest[],
  holidays: CompanyHoliday[],
  roster: ShiftAssignment[],
  company: Company,
  asOfDateStr?: string
): {
  byEmployeeId: Record<string, EmployeeAwolEvaluation>;
  flaggedEmployees: EmployeeAwolEvaluation[];
  awolDaysLimit: number;
} {
  const byEmployeeId: Record<string, EmployeeAwolEvaluation> = {};
  const flaggedEmployees: EmployeeAwolEvaluation[] = [];
  const awolDaysLimit = Math.max(1, Number(company.awolDaysLimit) || 3);

  for (const emp of employees || []) {
    if (!emp || !emp.id) continue;
    const evalRes = evaluateEmployeeAwol(emp, attendance, leaves, holidays, roster, company, asOfDateStr);
    byEmployeeId[emp.id] = evalRes;
    const empStatus = (emp.status || "active").toLowerCase().trim();
    if (evalRes.exceedsLimit && empStatus !== "terminated" && empStatus !== "relieved" && empStatus !== "releived") {
      flaggedEmployees.push(evalRes);
    }
  }

  return {
    byEmployeeId,
    flaggedEmployees,
    awolDaysLimit,
  };
}

