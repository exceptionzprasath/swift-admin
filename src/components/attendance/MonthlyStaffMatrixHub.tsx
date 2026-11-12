import React, { useMemo, useState, useCallback } from "react";
import { useStore, getEmployeeBranchIds, type AttendanceRecord, type Employee, type ShiftType, type LeaveRequest } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  CalendarCheck,
  Percent,
  Timer,
  Award,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { EmploymentTypeBadge } from "@/components/employment-type-badge";

// Formatting helpers
function parseTimeMinutes(s?: string): number {
  if (!s) return -1;
  const str = String(s).trim();
  const matchAmPm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (matchAmPm) {
    let h = parseInt(matchAmPm[1], 10);
    const m = parseInt(matchAmPm[2], 10);
    const isPm = matchAmPm[4].toLowerCase() === "pm";
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  return -1;
}

function formatMinutesToHHMM(totalMinutes: number): string {
  if (totalMinutes <= 0 || isNaN(totalMinutes)) return "00:00";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatHoursToHHMM(hoursVal?: number): string {
  if (hoursVal == null || isNaN(hoursVal) || hoursVal <= 0) return "00:00";
  return formatMinutesToHHMM(hoursVal * 60);
}

function formatTimeWithAmPm(timeStr?: string): string {
  if (!timeStr) return "-";
  let t = String(timeStr).trim();
  if (t.includes("T")) {
    const timePart = t.split("T")[1];
    if (timePart) t = timePart.split(".")[0].replace("Z", "").trim();
  } else if (t.includes(" ") && t.includes("-")) {
    const parts = t.split(" ");
    t = parts.slice(1).join(" ").trim();
  }
  const matchWithAmPm = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (matchWithAmPm) {
    const h = parseInt(matchWithAmPm[1], 10);
    const m = matchWithAmPm[2];
    const ampm = matchWithAmPm[4].toUpperCase();
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  }
  return t;
}

export function normalizeDateToYMD(val?: string): string | null {
  if (!val) return null;
  const s = String(val).trim();
  const mYMD = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (mYMD) return mYMD[1];

  const mDMY = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (mDMY) {
    const day = mDMY[1].padStart(2, "0");
    const month = mDMY[2].padStart(2, "0");
    const year = mDMY[3];
    return `${year}-${month}-${day}`;
  }

  const cleanStr = s.replace(/\(.*?\)/g, "").trim();
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return null;
}

export function isWeekendCol(dateStr: string, dayNum: string): boolean {
  const day = new Date(dateStr + "T12:00:00Z").getUTCDay();
  if (day === 0) return true; // Sunday
  if (day === 6) {
    const dNum = parseInt(dayNum, 10);
    const satIdx = Math.ceil(dNum / 7);
    return satIdx === 2 || satIdx === 4; // Alternate Saturdays (2nd & 4th)
  }
  return false;
}

export function getExportAttendanceStatus(punct?: { status?: string; label?: string }): string {
  if (!punct) return "Absent";
  const lbl = (punct.label || "").trim().toLowerCase();
  const st = (punct.status || "").trim().toLowerCase();

  // 1. Missed Out
  if (lbl.includes("missed out") || lbl.includes("missed-out")) {
    return "Missed Out";
  }

  // 2. Half Day
  if (lbl.includes("half-day") || lbl.includes("half day") || st === "half-day" || st === "halfday") {
    return "Half Day";
  }

  // 3. Present
  if (
    lbl === "on time" ||
    lbl.startsWith("grace") ||
    lbl.includes("present") ||
    lbl.startsWith("late") ||
    lbl.includes("permission applied") ||
    st === "present" ||
    st === "late"
  ) {
    return "Present";
  }

  // Preserve non-working day statuses
  if (st === "weekly-off" || lbl.includes("weekly off")) {
    return "Weekly Off";
  }
  if (st === "holiday" || lbl.startsWith("holiday")) {
    return "Holiday";
  }
  if (
    st === "informed_leave" ||
    st === "il" ||
    lbl.includes("informed leave") ||
    lbl.includes("lop")
  ) {
    return "Informed Leave (LOP)";
  }
  if (st === "leave" || lbl.includes("leave")) {
    return "Leave";
  }

  // 4. Absent
  return "Absent";
}

export type ReportTypeOption =
  | "matrix_status"
  | "matrix_hours"
  | "consolidated"
  | "detailed";

export type OrderByOption = "name" | "department" | "empCode";

interface MonthlyStaffMatrixHubProps {
  onInspectRecord?: (data: { emp: Employee; rec?: AttendanceRecord; date: string }) => void;
  onRegularizePunch?: (emp: Employee, date: string, rec?: AttendanceRecord) => void;
  onOpenDossier?: (emp: Employee) => void;
  getScheduledShiftForDate: (
    emp: Employee,
    dateStr: string
  ) => { shift: Partial<ShiftType>; isWeeklyOff: boolean; isHoliday: boolean; holidayName?: string };
  evaluatePunctuality: (
    rec: AttendanceRecord | undefined,
    scheduled: { shift: Partial<ShiftType>; isWeeklyOff: boolean; isHoliday: boolean; holidayName?: string },
    emp: Employee,
    dateStr: string
  ) => { status: string; label: string; color: string };
  getRecordHours: (
    rec?: {
      date?: string;
      hoursWorked?: number;
      otHours?: number;
      checkIn?: string;
      checkOut?: string;
      clockIn?: string;
      clockOut?: string;
      isMissedCheckout?: boolean;
      isAutoClosed?: boolean;
      status?: string;
      regularized?: boolean;
    },
    standardHours?: number
  ) => { hoursWorked: number; otHours: number; isActive?: boolean };
}

export function MonthlyStaffMatrixHub({
  onInspectRecord,
  onRegularizePunch,
  onOpenDossier,
  getScheduledShiftForDate,
  evaluatePunctuality,
  getRecordHours,
}: MonthlyStaffMatrixHubProps) {
  const { employees, attendance, company, leaves } = useStore();
  const { user } = useAuth();
  const branches = useMemo(() => company.branches || [], [company.branches]);
  const shifts = useMemo(() => company.shifts || [], [company.shifts]);

  // Current month default date range
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;
  const defaultFrom = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}-01`;
  const lastDayOfMonth = new Date(currentYear, currentMonthNum, 0).getDate();
  const defaultTo = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

  // Filter State
  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [reportType, setReportType] = useState<ReportTypeOption>("matrix_status");
  const [orderBy, setOrderBy] = useState<OrderByOption>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [employeeStatus, setEmployeeStatus] = useState<"active" | "all" | "inactive">("active");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Pagination for Detailed Report
  const [detailedPage, setDetailedPage] = useState<number>(1);
  const [detailedPageSize, setDetailedPageSize] = useState<number>(50);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department?.trim()) set.add(e.department.trim());
    });
    return Array.from(set).sort();
  }, [employees]);

  // Date array computation
  const daysInRange = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    const days = [];
    const curr = new Date(start);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const dayNum = d;
      const dayLetter = curr.toLocaleDateString("en-US", { weekday: "narrow" }); // T, F, S, S, M, T, W
      const dayShort = curr.toLocaleDateString("en-US", { weekday: "short" }); // Thu, Fri, Sat
      days.push({
        dateStr,
        dayNum,
        dayLetter,
        dayShort,
        headerLabel: `${curr.getDate()} ${dayShort}`, // e.g. "1 Thu"
        dayColLabel: `${dayNum} ${dayLetter}`, // e.g. "01 T"
      });
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [fromDate, toDate]);

  // Filtered and Sorted Employees
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        // Status filter
        if (employeeStatus === "active") {
          if (emp.status && emp.status !== "active") return false;
        } else if (employeeStatus === "inactive") {
          if (!emp.status || emp.status === "active") return false;
        }

        // Branch filter
        if (selectedBranch !== "all") {
          const empBranches = getEmployeeBranchIds(emp);
          if (emp.branchId !== selectedBranch && !empBranches.includes(selectedBranch)) {
            return false;
          }
        }

        // Department filter
        if (selectedDepartment !== "all") {
          if (emp.department?.toLowerCase() !== selectedDepartment.toLowerCase()) {
            return false;
          }
        }

        // Shift filter
        if (selectedShift !== "all") {
          if (emp.shiftId !== selectedShift) return false;
        }

        // Search Query (name, empCode, id)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = emp.name?.toLowerCase().includes(q);
          const matchCode = emp.empCode?.toLowerCase().includes(q);
          const matchId = emp.id?.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchId) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = "";
        let valB = "";
        if (orderBy === "name") {
          valA = a.name?.toLowerCase() || "";
          valB = b.name?.toLowerCase() || "";
        } else if (orderBy === "department") {
          valA = a.department?.toLowerCase() || "";
          valB = b.department?.toLowerCase() || "";
        } else if (orderBy === "empCode") {
          valA = a.empCode?.toLowerCase() || a.id?.toLowerCase() || "";
          valB = b.empCode?.toLowerCase() || b.id?.toLowerCase() || "";
        }
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [
    employees,
    employeeStatus,
    selectedBranch,
    selectedDepartment,
    selectedShift,
    searchQuery,
    orderBy,
    sortDirection,
  ]);

  // Branch Name Resolver
  const getBranchName = useCallback(
    (emp: Employee) => {
      const empBranchIds = getEmployeeBranchIds(emp);
      const branch =
        branches.find((b) => empBranchIds.includes(b.id)) ||
        branches.find((b) => b.id === emp.branchId) ||
        branches[0];
      return branch?.name || "Head Office";
    },
    [branches]
  );

  // Helper: check if a record is an Odd Punch
  const isOddPunch = useCallback(
    (rec?: AttendanceRecord, dateStr?: string) => {
      if (!rec) return false;
      if (rec.punchType === "ODD" || rec.isMissedCheckout) return true;
      const inTime = rec.checkIn || rec.clockIn;
      const outTime = rec.checkOut || rec.clockOut;
      const isPast = dateStr ? dateStr < new Date().toISOString().slice(0, 10) : false;
      // Single check-in without checkout
      if (inTime && !outTime && isPast) return true;
      // Checkout without check-in
      if (!inTime && outTime) return true;
      return false;
    },
    []
  );

  // Helper: Leave Balance calculation
  const getEmpLeaveBalance = useCallback(
    (emp: Employee): number => {
      // 1. Approved leaves from the leaves table (excluding LOP/Loss of Pay)
      const empLeaves = (leaves || []).filter(
        (l) =>
          (l.employeeId === emp.id || (emp.empCode && (l as any).empCode === emp.empCode) || l.employeeName === emp.name) &&
          (l.status || "").toLowerCase() === "approved" &&
          !l.type?.toLowerCase().includes("lop") &&
          !l.type?.toLowerCase().includes("loss") &&
          !l.type?.toLowerCase().includes("unpaid")
      );
      const approvedDatesSet = new Set<string>();
      const usedDays = empLeaves.reduce((sum, l) => {
        const d = typeof l.days === "string" ? parseFloat(l.days) : (l.days ?? 1);
        const start = l.from || (l as any).startDate;
        const end = l.to || (l as any).endDate || start;
        if (start && end) {
          try {
            const cur = new Date(start);
            const last = new Date(end);
            while (cur <= last) {
              approvedDatesSet.add(cur.toISOString().slice(0, 10));
              cur.setDate(cur.getDate() + 1);
            }
          } catch (_e) {
            approvedDatesSet.add(start);
          }
        } else if (start) {
          approvedDatesSet.add(start);
        }
        return sum + (isNaN(d) ? 1 : d);
      }, 0);

      // 2. Attendance records manually marked, overridden, or regularized as "leave"
      const manualLeaveDays = (attendance || []).filter((a) => {
        const matchesEmp =
          a.employeeId === emp.id ||
          (emp.empCode && a.empCode === emp.empCode) ||
          a.employeeName === emp.name;
        if (!matchesEmp) return false;
        const isLeaveStatus = (a.status || "").toLowerCase() === "leave";
        if (!isLeaveStatus) return false;
        if (a.date && approvedDatesSet.has(a.date)) return false;
        return true;
      }).length;

      const totalUsedDays = usedDays + manualLeaveDays;
      const totalEntitlement = (company.leaveTypes || []).reduce((acc, lt) => acc + (lt.days || 0), 0) || 18;
      return Math.max(0, Math.round((totalEntitlement - totalUsedDays) * 10) / 10);
    },
    [leaves, attendance, company.leaveTypes]
  );

  // Quick Preset Handlers
  const handleSetPreset = (preset: "this_month" | "last_month" | "last_30") => {
    const now = new Date();
    if (preset === "this_month") {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const endDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      setFromDate(start);
      setToDate(end);
    } else if (preset === "last_month") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = prev.getMonth() + 1;
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const endDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      setFromDate(start);
      setToDate(end);
    } else if (preset === "last_30") {
      const end = now.toISOString().slice(0, 10);
      const past30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      const start = past30.toISOString().slice(0, 10);
      setFromDate(start);
      setToDate(end);
    }
  };

  // CSV Export Engine matching user reference formats
  const handleExportCSV = () => {
    if (daysInRange.length === 0 || filteredEmployees.length === 0) {
      toast.error("No data available to export for the selected filters");
      return;
    }

    const nowStr = new Date().toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const branchLabel = selectedBranch === "all" ? "All" : (branches.find((b) => b.id === selectedBranch)?.name || selectedBranch);
    const deptLabel = selectedDepartment === "all" ? "All" : selectedDepartment;
    const statusLabel = employeeStatus === "active" ? "Active" : employeeStatus === "inactive" ? "Inactive" : "All";

    let csvContent = "";

    // FORMAT 1: ATTENDANCE MATRIX BY HOURS
    if (reportType === "matrix_hours") {
      csvContent += `Downloaded By: ${user?.email || "admin"},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\n`;
      csvContent += `"Downloaded Date: ${nowStr}",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\n`;
      csvContent += `Report type: Attendance Matrix By Hours,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Report From Date: ${fromDate},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Report To Date: ${toDate},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Employee Status: ${statusLabel},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Department:${deptLabel},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Branch:${branchLabel},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Attendance Matrix Report from : ${fromDate} to ${toDate},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
`;
      const dateHeaders = daysInRange.map((d) => `"${d.headerLabel}"`).join(",");
      csvContent += `Employee ID,Employee Name,${dateHeaders},Present,Absent,Odd Punch,Paid Leave,Weekly Holidays,Annual Holidays,Extra Day,Total Days,Total Exception Hour,Total Hours Worked\n`;

      filteredEmployees.forEach((emp) => {
        let empPresent = 0;
        let empInformedLeave = 0;
        let empAbsent = 0;
        let empOdd = 0;
        let empLeave = 0;
        let empWeeklyOff = 0;
        let empAnnualHoliday = 0;
        let empExtraDay = 0;
        let empTotalMins = 0;
        let empExceptionMins = 0;

        const dayCells = daysInRange.map((d) => {
          const rec = attendance.find(
            (a) => (a.employeeId === emp.id || (emp.empCode && a.empCode === emp.empCode) || a.employeeName === emp.name) && a.date === d.dateStr
          );
          const scheduled = getScheduledShiftForDate(emp, d.dateStr);
          const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);
          const recHours = getRecordHours(rec, company.workingHoursPerDay || 9);

          const hasPunch = Boolean(rec?.checkIn || rec?.clockIn || rec?.checkOut || rec?.clockOut);
          const isOdd = isOddPunch(rec, d.dateStr);
          if (isOdd) empOdd++;

          const isSunOrRest = Boolean(scheduled.isWeeklyOff || new Date(d.dateStr + "T12:00:00Z").getUTCDay() === 0 || rec?.isRestDayWork);
          const isRestDayPending = isSunOrRest && hasPunch && rec?.restDayWorkStatus !== "approved";

          if (scheduled.isHoliday) {
            empAnnualHoliday++;
            if (hasPunch && recHours.hoursWorked > 0) empExtraDay++;
          } else if (scheduled.isWeeklyOff) {
            empWeeklyOff++;
            if (hasPunch && recHours.hoursWorked > 0 && rec?.restDayWorkStatus === "approved") empExtraDay++;
          }

          const isInformedLeave =
            punct.status === "informed_leave" ||
            rec?.status === "informed_leave" ||
            rec?.status === "il" ||
            (rec?.leaveType === "LOP" && rec?.isExcused) ||
            (rec?.status === "leave" && (rec?.leaveType === "LOP" || rec?.isExcused));

          if (punct.status === "present" && !isRestDayPending) empPresent += 1;
          else if (punct.status === "half-day" && !isRestDayPending) empPresent += 0.5;
          else if (isInformedLeave) empInformedLeave += 1;
          else if (punct.status === "leave") empLeave += 1;
          else if (punct.status === "absent" && !scheduled.isWeeklyOff && !scheduled.isHoliday) empAbsent += 1;

          if (!isRestDayPending) {
            empTotalMins += Math.round(recHours.hoursWorked * 60);
          }

          // Exception mins: late punches
          if (punct.status === "late") {
            empPresent += 1;
            empExceptionMins += (rec?.lateBy || 15);
          }

          // Cell value determination
          if (isOdd) return "ODD";
          if (isSunOrRest && hasPunch) {
            if (rec?.restDayWorkStatus === "approved") {
              return formatMinutesToHHMM(recHours.hoursWorked * 60);
            }
            if (rec?.restDayWorkStatus === "rejected") {
              return "W/O (Decl)";
            }
            return "W/O (Pend)";
          }
          if (isOdd) return "-";
          if (isInformedLeave) return "IL";
          if (recHours.hoursWorked > 0) return formatMinutesToHHMM(recHours.hoursWorked * 60);
          if (scheduled.isHoliday) return "A/H";
          if (scheduled.isWeeklyOff) return "W/O";
          if (punct.status === "leave") return "PL";
          if (punct.status === "late") return "Lt";
          if (punct.status === "half-day") return "HD";
          if (punct.status === "absent") return "A";
          return "00:00";
        });

        const totalHrsStr = formatMinutesToHHMM(empTotalMins);
        const totalExceptionStr = formatMinutesToHHMM(empExceptionMins);

        csvContent += `"${emp.empCode || emp.id}","${emp.name}",${dayCells.join(",")},${empPresent},${empAbsent},${empOdd},${empLeave},${empWeeklyOff},${empAnnualHoliday},${empExtraDay},${daysInRange.length},${totalExceptionStr},${totalHrsStr}\n`;
      });
    }

    // FORMAT 2: CONSOLIDATED ATTENDANCE REPORT
    else if (reportType === "consolidated") {
      csvContent += `Downloaded By: ${user?.email || "admin"},,,,,,,,,,,,,,,,,,,
"Downloaded Date: ${nowStr}",,,,,,,,,,,,,,,,,,,
Report Type: Consolidated Attendance Report,,,,,,,,,,,,,,,,,,,
Report Fromdate: ${fromDate},,,,,,,,,,,,,,,,,,,
Report Todate: ${toDate},,,,,,,,,,,,,,,,,,,
Employee Status: ${statusLabel},,,,,,,,,,,,,,,,,,,
Branch: ${branchLabel},,,,,,,,,,,,,,,,,,,
Employee ID,Employee Name,Branch,Total Days,Present,Paid Leave,Absent,Odd Punch,Regularized,Exception,Weekly Holidays,Annual Holidays,Extra Day,Leave Balance,OT Hours,OT Pieces\n`;

      filteredEmployees.forEach((emp) => {
        let empPresent = 0;
        let empLeave = 0;
        let empAbsent = 0;
        let empOdd = 0;
        let empRegularized = 0;
        let empException = 0;
        let empWeeklyOff = 0;
        let empAnnualHoliday = 0;
        let empExtraDay = 0;
        let empOtMins = 0;

        daysInRange.forEach((d) => {
          const rec = attendance.find(
            (a) => (a.employeeId === emp.id || (emp.empCode && a.empCode === emp.empCode) || a.employeeName === emp.name) && a.date === d.dateStr
          );
          const scheduled = getScheduledShiftForDate(emp, d.dateStr);
          const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);
          const recHours = getRecordHours(rec, company.workingHoursPerDay || 9);

          const hasPunch = Boolean(rec?.checkIn || rec?.clockIn || rec?.checkOut || rec?.clockOut);
          const isOdd = isOddPunch(rec, d.dateStr);
          if (isOdd) empOdd++;

          if (rec?.regularized) empRegularized++;

          const isSunOrRestCons = Boolean(scheduled.isWeeklyOff || new Date(d.dateStr + "T12:00:00Z").getUTCDay() === 0 || rec?.isRestDayWork);
          const isRestDayPendingCons = isSunOrRestCons && hasPunch && rec?.restDayWorkStatus !== "approved";

          if (scheduled.isHoliday) {
            empAnnualHoliday++;
            if (hasPunch && recHours.hoursWorked > 0) empExtraDay++;
          } else if (scheduled.isWeeklyOff) {
            empWeeklyOff++;
            if (hasPunch && recHours.hoursWorked > 0 && rec?.restDayWorkStatus === "approved") empExtraDay++;
          }

          if (punct.status === "present" && !isRestDayPendingCons) empPresent += 1;
          else if (punct.status === "half-day" && !isRestDayPendingCons) empPresent += 0.5;
          else if (punct.status === "leave") empLeave += 1;
          else if (punct.status === "absent" && !scheduled.isWeeklyOff && !scheduled.isHoliday) empAbsent += 1;

          if (punct.status === "late") {
            empPresent += 1;
            empException++;
          }
          if (isOdd) empException++;

          empOtMins += Math.round(recHours.otHours * 60);
        });

        const leaveBal = getEmpLeaveBalance(emp);
        const otHoursStr = formatMinutesToHHMM(empOtMins);
        const branchName = getBranchName(emp);

        csvContent += `"${emp.empCode || emp.id}","${emp.name}","${branchName}",${daysInRange.length},${empPresent},${empLeave},${empAbsent},${empOdd},${empRegularized},${empException},${empWeeklyOff},${empAnnualHoliday},${empExtraDay},${leaveBal},${otHoursStr},0\n`;
      });
    }

    // FORMAT 3: DETAILED ATTENDANCE REPORT
    else if (reportType === "detailed") {
      csvContent += `Downloaded By: ${user?.email || "admin"},,,,,,,,,,,,,
"Downloaded Date: ${nowStr}",,,,,,,,,,,,,
Report Type: Detailed Attendance Report,,,,,,,,,,,,,
Report From Date: ${fromDate},,,,,,,,,,,,,
Report To Date: ${toDate},,,,,,,,,,,,,
Employee Status: ${statusLabel},,,,,,,,,,,,,
Department: ${deptLabel},,,,,,,,,,,,,
Branch: ${branchLabel},,,,,,,,,,,,,
Employee ID,Employee Name,Department,Branch,Date,First-In,Last-Out,Total Hours,Paid Leave,Odd Punch,Extra Day,OT Hours,Status\n`;

      filteredEmployees.forEach((emp) => {
        const branchName = getBranchName(emp);
        daysInRange.forEach((d) => {
          const rec = attendance.find(
            (a) => (a.employeeId === emp.id || (emp.empCode && a.empCode === emp.empCode) || a.employeeName === emp.name) && a.date === d.dateStr
          );
          const scheduled = getScheduledShiftForDate(emp, d.dateStr);
          const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);
          const recHours = getRecordHours(rec, company.workingHoursPerDay || 9);

          const firstIn = formatTimeWithAmPm(rec?.checkIn || rec?.clockIn);
          const lastOut = formatTimeWithAmPm(rec?.checkOut || rec?.clockOut);
          const isOdd = isOddPunch(rec, d.dateStr);
          const isExtra = (scheduled.isHoliday || scheduled.isWeeklyOff) && recHours.hoursWorked > 0;
          const leaveName = punct.status === "leave" ? punct.label : "-";
          const otStr = formatMinutesToHHMM(recHours.otHours * 60);
          const totalHrsStr = formatMinutesToHHMM(recHours.hoursWorked * 60);
          const exportStatus = getExportAttendanceStatus(punct);

          csvContent += `"${emp.empCode || emp.id}","${emp.name}","${emp.department || "General"}","${branchName}","${d.dateStr}","${firstIn}","${lastOut}","${totalHrsStr}","${leaveName}","${isOdd ? "Yes" : "No"}","${isExtra ? "Yes" : "No"}","${otStr}","${exportStatus}"\n`;
        });
      });
    }

    // FORMAT 4: ATTENDANCE MATRIX BY STATUS (DAYS)
    else {
      csvContent += `Downloaded By: ${user?.email || "admin"},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\n`;
      csvContent += `"Downloaded Date: ${nowStr}",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\n`;
      csvContent += `Report type: Attendance Matrix By Status,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Report From Date: ${fromDate},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Report To Date: ${toDate},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Employee Status: ${statusLabel},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Department:${deptLabel},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Branch:${branchLabel},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Attendance Matrix Report from : ${fromDate} to ${toDate},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
`;
      const dateHeaders = daysInRange.map((d) => `"${d.headerLabel}"`).join(",");
      csvContent += `Employee ID,Employee Name,Branch,${dateHeaders},Total Days,Present,Informed Leave,Absent,Odd Punch,Paid Leave,Weekly Holidays,Annual Holidays,Extra Day\n`;

      filteredEmployees.forEach((emp) => {
        let empPresent = 0;
        let empInformedLeave = 0;
        let empAbsent = 0;
        let empOdd = 0;
        let empLeave = 0;
        let empWeeklyOff = 0;
        let empAnnualHoliday = 0;
        let empExtraDay = 0;

        const dayCells = daysInRange.map((d) => {
          const rec = attendance.find(
            (a) => (a.employeeId === emp.id || (emp.empCode && a.empCode === emp.empCode) || a.employeeName === emp.name) && a.date === d.dateStr
          );
          const scheduled = getScheduledShiftForDate(emp, d.dateStr);
          const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);
          const recHours = getRecordHours(rec, company.workingHoursPerDay || 9);

          const hasPunch = Boolean(rec?.checkIn || rec?.clockIn || rec?.checkOut || rec?.clockOut);
          const isOdd = isOddPunch(rec, d.dateStr);
          if (isOdd) empOdd++;

          if (scheduled.isHoliday) {
            empAnnualHoliday++;
            if (hasPunch && recHours.hoursWorked > 0) empExtraDay++;
          } else if (scheduled.isWeeklyOff) {
            empWeeklyOff++;
            if (hasPunch && recHours.hoursWorked > 0) empExtraDay++;
          }

          const isInformedLeave =
            punct.status === "informed_leave" ||
            rec?.status === "informed_leave" ||
            rec?.status === "il" ||
            (rec?.leaveType === "LOP" && rec?.isExcused) ||
            (rec?.status === "leave" && (rec?.leaveType === "LOP" || rec?.isExcused));

          if (punct.status === "present") empPresent += 1;
          else if (punct.status === "half-day") empPresent += 0.5;
          else if (isInformedLeave) empInformedLeave += 1;
          else if (punct.status === "leave") empLeave += 1;
          else if (punct.status === "absent" && !scheduled.isWeeklyOff && !scheduled.isHoliday) empAbsent += 1;
          else if (punct.status === "late") empPresent += 1;

          if (isOdd) return "-";
          if (isInformedLeave) return "IL";
          if (punct.status === "present") return "P";
          if (punct.status === "late") return "Lt";
          if (punct.status === "half-day") return "HD";
          if (punct.status === "leave") return "PL";
          if (scheduled.isHoliday) return "A/H";
          if (scheduled.isWeeklyOff) return "W/O";
          return "A";
        });

        const branchName = getBranchName(emp);
        csvContent += `"${emp.empCode || emp.id}","${emp.name}","${branchName}",${dayCells.join(",")},${daysInRange.length},${empPresent},${empInformedLeave},${empAbsent},${empOdd},${empLeave},${empWeeklyOff},${empAnnualHoliday},${empExtraDay}\n`;
      });
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_${reportType}_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Attendance report downloaded successfully");
  };

  // Detailed Report Rows (flattened for pagination)
  const detailedRows = useMemo(() => {
    if (reportType !== "detailed") return [];
    const list: Array<{
      emp: Employee;
      rec?: AttendanceRecord;
      dateStr: string;
      dayShort: string;
      branchName: string;
      punct: { status: string; label: string; color: string };
      recHours: { hoursWorked: number; otHours: number };
      isOdd: boolean;
      isExtra: boolean;
    }> = [];

    filteredEmployees.forEach((emp) => {
      const branchName = getBranchName(emp);
      daysInRange.forEach((d) => {
        const rec = attendance.find(
          (a) => (a.employeeId === emp.id || (emp.empCode && a.empCode === emp.empCode) || a.employeeName === emp.name) && a.date === d.dateStr
        );
        const scheduled = getScheduledShiftForDate(emp, d.dateStr);
        const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);
        const recHours = getRecordHours(rec, company.workingHoursPerDay || 9);
        const isOdd = isOddPunch(rec, d.dateStr);
        const isExtra = (scheduled.isHoliday || scheduled.isWeeklyOff) && recHours.hoursWorked > 0;

        list.push({
          emp,
          rec,
          dateStr: d.dateStr,
          dayShort: d.dayShort,
          branchName,
          punct,
          recHours,
          isOdd,
          isExtra,
        });
      });
    });

    return list;
  }, [
    reportType,
    filteredEmployees,
    daysInRange,
    attendance,
    getBranchName,
    getScheduledShiftForDate,
    evaluatePunctuality,
    getRecordHours,
    isOddPunch,
    company.workingHoursPerDay,
  ]);

  const detailedTotalPages = Math.max(1, Math.ceil(detailedRows.length / detailedPageSize));
  const pagedDetailedRows = useMemo(() => {
    const start = (detailedPage - 1) * detailedPageSize;
    return detailedRows.slice(start, start + detailedPageSize);
  }, [detailedRows, detailedPage, detailedPageSize]);

  return (
    <div className="space-y-4">
      {/* 1. FILTER & SEARCH CONTROL HUB */}
      <Card className="border border-border/80 bg-card/90 backdrop-blur-md shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          {/* Top row: Date Range & Quick Presets & Report Type */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span>Date Range:</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 w-36 text-xs rounded-lg font-medium"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 w-36 text-xs rounded-lg font-medium"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetPreset("this_month")}
                  className="h-7 text-[11px] px-2.5 rounded-md"
                >
                  This Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetPreset("last_month")}
                  className="h-7 text-[11px] px-2.5 rounded-md"
                >
                  Last Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetPreset("last_30")}
                  className="h-7 text-[11px] px-2.5 rounded-md"
                >
                  Last 30 Days
                </Button>
              </div>
            </div>

            {/* Export Action */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleExportCSV}
                className="h-8 text-xs gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV Report
              </Button>
            </div>
          </div>

          {/* Second row: Report Type, Order By, Department, Shift, Branch, Status, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {/* Report Type Selector */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Report Type</Label>
              <Select value={reportType} onValueChange={(v) => { setReportType(v as ReportTypeOption); setDetailedPage(1); }}>
                <SelectTrigger className="h-8 text-xs rounded-lg font-medium">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matrix_status">Attendance Matrix By Status</SelectItem>
                  <SelectItem value="matrix_hours">Attendance Matrix By Hours</SelectItem>
                  <SelectItem value="consolidated">Consolidated Report</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order By */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground font-medium">Order By</Label>
                <button
                  type="button"
                  onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                  title="Toggle Asc/Desc"
                >
                  <ArrowUpDown className="h-2.5 w-2.5" />
                  {sortDirection.toUpperCase()}
                </button>
              </div>
              <Select value={orderBy} onValueChange={(v) => setOrderBy(v as OrderByOption)}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Employee Name</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="empCode">Employee ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shift Filter */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Shift</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.start}-{s.end})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Filter */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Status Filter */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Employee Status</Label>
              <Select value={employeeStatus} onValueChange={(v: "active" | "all" | "inactive") => setEmployeeStatus(v)}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Employee Name / ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Quick Info bar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <div className="flex items-center gap-3">
              <span>
                Employees: <strong className="text-foreground">{filteredEmployees.length}</strong>
              </span>
              <span>•</span>
              <span>
                Days in Range: <strong className="text-foreground">{daysInRange.length}</strong> ({fromDate} → {toDate})
              </span>
            </div>

{/* Badges removed from Date Range settings box as requested */}
          </div>
        </CardContent>
      </Card>

      {/* 2. REPORT VIEW CONTENT */}


      {/* TOP-LEVEL STICKY LEGEND BAR WITH CUSTOM COLOR PALETTE */}
      {(reportType === "matrix_status" || reportType === "matrix_hours") && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 px-4 bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground text-[11px] uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>Attendance Status Legend:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Present (P) - #5FAD41 */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#5FAD41]/10 border border-[#5FAD41]/30">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#5FAD41] text-white text-[10px] font-bold shadow-2xs">P</span>
              <span className="text-[11px] text-foreground font-medium">Present</span>
            </span>

            {/* Absent (A) - #DE1A1A */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#DE1A1A]/10 border border-[#DE1A1A]/30">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#DE1A1A] text-white text-[10px] font-bold shadow-2xs">A</span>
              <span className="text-[11px] text-foreground font-medium">Absent</span>
            </span>

            {/* Late (Lt) - #E6AF2E */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#E6AF2E]/15 border border-[#E6AF2E]/35">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#E6AF2E] text-slate-950 text-[10px] font-bold shadow-2xs">Lt</span>
              <span className="text-[11px] text-foreground font-medium">Late</span>
            </span>

            {/* Paid Leave (PL) - #55286F */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#55286F]/10 border border-[#55286F]/30">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#55286F] text-white text-[10px] font-bold shadow-2xs">PL</span>
              <span className="text-[11px] text-foreground font-medium">Paid Leave</span>
            </span>

            {/* Half Day (HD) - #DAB785 */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#DAB785]/20 border border-[#DAB785]/40">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#DAB785] text-slate-950 text-[10px] font-bold shadow-2xs">HD</span>
              <span className="text-[11px] text-foreground font-medium">Half Day</span>
            </span>

            {/* Odd Punch (-) - #F1F2EE */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F1F2EE] border border-[#d6d8ce]">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#F1F2EE] text-slate-800 text-[10px] font-bold border border-[#d6d8ce] shadow-2xs">-</span>
              <span className="text-[11px] text-foreground font-medium">Odd Punch</span>
            </span>

            {/* Informed Leave (IL) - #FB8B24 */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FB8B24]/10 border border-[#FB8B24]/30">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#FB8B24] text-white text-[10px] font-bold shadow-2xs">IL</span>
              <span className="text-[11px] text-foreground font-medium">Informed Leave</span>
            </span>

            {/* Week Off (W/O) - #DFE0DC */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#DFE0DC]/50 dark:bg-slate-800 border border-[#c4c6c0]">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#DFE0DC] text-slate-800 text-[10px] font-bold border border-[#c4c6c0] shadow-2xs">W/O</span>
              <span className="text-[11px] text-foreground font-medium">Week Off</span>
            </span>

            {/* Holiday (A/H) - #06AED5 */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#06AED5]/10 border border-[#06AED5]/30">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[#06AED5] text-white text-[10px] font-bold shadow-2xs">A/H</span>
              <span className="text-[11px] text-foreground font-medium">Holiday</span>
            </span>
          </div>
        </div>
      )}

      {/* VIEW A: CONSOLIDATED REPORT */}
      {reportType === "consolidated" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3 text-left sticky left-0 bg-card z-10 min-w-[100px]">Employee ID</th>
                  <th className="p-3 text-left sticky left-[100px] bg-card z-10 min-w-[180px]">Employee Name</th>
                  <th className="p-3 text-left min-w-[120px]">Branch</th>
                  <th className="p-3 text-center min-w-[80px]">Total Days</th>
                  <th className="p-3 text-center min-w-[70px] text-emerald-600 font-bold">Present</th>
                  <th className="p-3 text-center min-w-[95px] text-[#55286F] font-semibold">Paid Leave</th>
                  <th className="p-3 text-center min-w-[70px] text-destructive font-semibold">Absent</th>
                  <th className="p-3 text-center min-w-[80px] text-rose-600 font-semibold">Odd Punch</th>
                  <th className="p-3 text-center min-w-[85px] text-indigo-600 font-semibold">Regularized</th>
                  <th className="p-3 text-center min-w-[80px] text-amber-600 font-semibold">Exception</th>
                  <th className="p-3 text-center min-w-[100px]">Weekly Holidays</th>
                  <th className="p-3 text-center min-w-[100px]">Annual Holidays</th>
                  <th className="p-3 text-center min-w-[80px] text-emerald-600">Extra day</th>
                  <th className="p-3 text-center min-w-[90px] text-teal-600">Leave Balance</th>
                  <th className="p-3 text-center min-w-[80px]">OT Hours</th>
                  <th className="p-3 text-center min-w-[75px]">OT Pieces</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="p-8 text-center text-muted-foreground">
                      No employees match the specified criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    let empPresent = 0;
                    let empLeave = 0;
                    let empAbsent = 0;
                    let empOdd = 0;
                    let empRegularized = 0;
                    let empException = 0;
                    let empWeeklyOff = 0;
                    let empAnnualHoliday = 0;
                    let empExtraDay = 0;
                    let empOtMins = 0;

                    daysInRange.forEach((d) => {
                      const rec = attendance.find(
                        (a) => (a.employeeId === emp.id || (emp.empCode && a.empCode === emp.empCode) || a.employeeName === emp.name) && a.date === d.dateStr
                      );
                      const scheduled = getScheduledShiftForDate(emp, d.dateStr);
                      const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);
                      const recHours = getRecordHours(rec, company.workingHoursPerDay || 9);

                      const hasPunch = Boolean(rec?.checkIn || rec?.clockIn || rec?.checkOut || rec?.clockOut);
                      const isOdd = isOddPunch(rec, d.dateStr);
                      if (isOdd) empOdd++;

                      if (rec?.regularized) empRegularized++;

                      if (scheduled.isHoliday) {
                        empAnnualHoliday++;
                        if (hasPunch && recHours.hoursWorked > 0) empExtraDay++;
                      } else if (scheduled.isWeeklyOff) {
                        empWeeklyOff++;
                        if (hasPunch && recHours.hoursWorked > 0) empExtraDay++;
                      }

                      if (punct.status === "present") empPresent += 1;
                      else if (punct.status === "half-day") empPresent += 0.5;
                      else if (punct.status === "leave") empLeave += 1;
                      else if (punct.status === "absent" && !scheduled.isWeeklyOff && !scheduled.isHoliday) empAbsent += 1;

                      if (punct.status === "late") {
                        empPresent += 1;
                        empException++;
                      }
                      if (isOdd) empException++;

                      empOtMins += Math.round(recHours.otHours * 60);
                    });

                    const leaveBal = getEmpLeaveBalance(emp);
                    const otHoursStr = formatMinutesToHHMM(empOtMins);
                    const branchName = getBranchName(emp);

                    return (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 sticky left-0 bg-card z-10 font-mono text-[11px] font-semibold text-muted-foreground">
                          {emp.empCode || emp.id}
                        </td>
                        <td
                          className="p-3 sticky left-[100px] bg-card z-10 font-medium text-foreground hover:text-primary cursor-pointer"
                          onClick={() => onOpenDossier?.(emp)}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{emp.name}</span>
                            <EmploymentTypeBadge type={emp.employmentType} />
                          </div>
                          <div className="text-[10px] text-muted-foreground">{emp.department || "General"}</div>
                        </td>
                        <td className="p-3 font-medium text-muted-foreground">{branchName}</td>
                        <td className="p-3 text-center font-medium">{daysInRange.length}</td>
                        <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {empPresent}
                        </td>
                        <td className="p-3 text-center font-medium text-blue-600 dark:text-blue-400">
                          {empLeave}
                        </td>
                        <td className="p-3 text-center font-medium text-destructive">
                          {empAbsent}
                        </td>
                        <td className="p-3 text-center font-semibold text-rose-600 dark:text-rose-400">
                          {empOdd}
                        </td>
                        <td className="p-3 text-center font-medium text-indigo-600 dark:text-indigo-400">
                          {empRegularized}
                        </td>
                        <td className="p-3 text-center font-medium text-amber-600 dark:text-amber-400">
                          {empException}
                        </td>
                        <td className="p-3 text-center font-medium text-muted-foreground">
                          {empWeeklyOff}
                        </td>
                        <td className="p-3 text-center font-medium text-purple-600 dark:text-purple-400">
                          {empAnnualHoliday}
                        </td>
                        <td className="p-3 text-center font-medium text-emerald-600">
                          {empExtraDay}
                        </td>
                        <td className="p-3 text-center font-semibold text-teal-600">
                          {leaveBal}
                        </td>
                        <td className="p-3 text-center font-mono font-medium">
                          {otHoursStr}
                        </td>
                        <td className="p-3 text-center font-mono text-muted-foreground">
                          0
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW B: DETAILED REPORT */}
      {reportType === "detailed" && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-left min-w-[95px]">Employee ID</th>
                    <th className="p-3 text-left min-w-[160px]">Employee Name</th>
                    <th className="p-3 text-left min-w-[120px]">Department</th>
                    <th className="p-3 text-left min-w-[110px]">Branch</th>
                    <th className="p-3 text-left min-w-[100px]">Date</th>
                    <th className="p-3 text-center min-w-[80px]">First-In</th>
                    <th className="p-3 text-center min-w-[80px]">Last-Out</th>
                    <th className="p-3 text-center min-w-[85px] font-bold">Total Hours</th>
                    <th className="p-3 text-center min-w-[100px]">Paid Leave</th>
                    <th className="p-3 text-center min-w-[80px]">Odd Punch</th>
                    <th className="p-3 text-center min-w-[75px]">Extra Day</th>
                    <th className="p-3 text-center min-w-[75px]">OT Hours</th>
                    <th className="p-3 text-center min-w-[110px]">Status</th>
                    <th className="p-3 text-center min-w-[90px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedDetailedRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-8 text-center text-muted-foreground">
                        No attendance records found for this period and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    pagedDetailedRows.map((row, idx) => {
                      const firstIn = formatTimeWithAmPm(row.rec?.checkIn || row.rec?.clockIn);
                      const lastOut = formatTimeWithAmPm(row.rec?.checkOut || row.rec?.clockOut);
                      const totalHrsStr = formatMinutesToHHMM(row.recHours.hoursWorked * 60);
                      const otStr = formatMinutesToHHMM(row.recHours.otHours * 60);
                      const leaveName = row.punct.status === "leave" ? row.punct.label : "-";

                      return (
                        <tr key={`${row.emp.id}-${row.dateStr}-${idx}`} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-muted-foreground font-semibold">
                            {row.emp.empCode || row.emp.id}
                          </td>
                          <td
                            className="p-3 font-medium text-foreground hover:text-primary cursor-pointer"
                            onClick={() => onOpenDossier?.(row.emp)}
                          >
                            <span className="font-semibold">{row.emp.name}</span>
                          </td>
                          <td className="p-3 text-muted-foreground">{row.emp.department || "General"}</td>
                          <td className="p-3 text-muted-foreground">{row.branchName}</td>
                          <td className="p-3 font-medium">
                            <div>{row.dateStr}</div>
                            <div className="text-[10px] text-muted-foreground">{row.dayShort}</div>
                          </td>
                          <td className="p-3 text-center font-mono">
                            <span className={firstIn !== "-" && firstIn !== "—" ? "text-foreground font-medium" : "text-muted-foreground"}>
                              {firstIn}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono">
                            <span className={lastOut !== "-" && lastOut !== "—" ? "text-foreground font-medium" : "text-muted-foreground"}>
                              {lastOut}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-foreground">
                            {totalHrsStr}
                          </td>
                          <td className="p-3 text-center text-blue-600 font-medium">
                            {leaveName}
                          </td>
                          <td className="p-3 text-center">
                            {row.isOdd ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-500/10 text-rose-600 border-rose-500/30">
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {row.isExtra ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono">
                            {otStr}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${row.punct.color}`}>
                              {row.punct.label}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onInspectRecord?.({ emp: row.emp, rec: row.rec, date: row.dateStr })}
                                className="h-7 w-7 p-0 rounded-md"
                                title="Inspect Record"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRegularizePunch?.(row.emp, row.dateStr, row.rec)}
                                className="h-7 w-7 p-0 rounded-md"
                                title="Regularize Punch"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-primary" />
                              </Button>
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

          {/* Pagination bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 text-xs text-muted-foreground">
            <div>
              Showing {detailedRows.length > 0 ? (detailedPage - 1) * detailedPageSize + 1 : 0} to{" "}
              {Math.min(detailedPage * detailedPageSize, detailedRows.length)} of {detailedRows.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(detailedPageSize)}
                onValueChange={(v) => { setDetailedPageSize(Number(v)); setDetailedPage(1); }}
              >
                <SelectTrigger className="h-7 w-24 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                  <SelectItem value="250">250 / page</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailedPage((p) => Math.max(1, p - 1))}
                  disabled={detailedPage <= 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] px-2">
                  Page {detailedPage} of {detailedTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailedPage((p) => Math.min(detailedTotalPages, p + 1))}
                  disabled={detailedPage >= detailedTotalPages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW C: ATTENDANCE MATRIX BY HOURS */}
      {reportType === "matrix_hours" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[72vh] relative">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted/95 backdrop-blur-md sticky top-0 z-30 border-b border-border text-[11px]">
                <tr>
                  <th className="p-3 text-left font-semibold sticky left-0 top-0 bg-card z-40 min-w-[95px] border-r border-border/40">
                    Employee ID
                  </th>
                  <th className="p-3 text-left font-semibold sticky left-[95px] top-0 bg-card z-40 min-w-[170px] border-r border-border/40">
                    Employee Name
                  </th>
                  <th className="p-3 text-left font-semibold sticky left-[265px] top-0 bg-card z-40 min-w-[110px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] border-r border-border/50">
                    Branch
                  </th>
                  {daysInRange.map((d) => {
                    const isWeekend = isWeekendCol(d.dateStr, d.dayNum);
                    return (
                      <th
                        key={d.dateStr}
                        className={`p-1.5 text-center min-w-[42px] font-medium text-[11px] border-r border-border/30 transition-colors ${
                          isWeekend ? "bg-slate-100/90 dark:bg-slate-800/70 font-semibold text-primary" : ""
                        }`}
                      >
                        <div className="font-bold text-xs tracking-tight text-foreground">{d.dayNum}</div>
                        <div className="text-[10px] font-medium text-muted-foreground/80 uppercase">{d.dayLetter}</div>
                      </th>
                    );
                  })}
                  <th className="p-3 text-center font-bold text-foreground min-w-[100px] bg-muted/40">
                    Total Hours Worked
                  </th>
                  <th className="p-3 text-center font-semibold text-amber-600 min-w-[110px] bg-muted/40">
                    Total Exception Hours
                  </th>
                  <th className="p-3 text-center font-bold text-emerald-600 min-w-[85px] bg-muted/40">
                    Day Present
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={daysInRange.length + 6} className="p-8 text-center text-muted-foreground">
                      No employees match the specified criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    let empPresent = 0;
                    let empTotalMins = 0;
                    let empExceptionMins = 0;
                    const branchName = getBranchName(emp);

                    return (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 sticky left-0 bg-card z-20 font-mono text-[11px] font-semibold text-muted-foreground border-r border-border/40">
                          {emp.empCode || emp.id}
                        </td>
                        <td
                          className="p-3 sticky left-[95px] bg-card z-20 font-medium text-foreground hover:text-primary cursor-pointer border-r border-border/40"
                          onClick={() => onOpenDossier?.(emp)}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{emp.name}</span>
                            <EmploymentTypeBadge type={emp.employmentType} />
                          </div>
                          <div className="text-[10px] text-muted-foreground">{emp.department || "General"}</div>
                        </td>
                        <td className="p-3 sticky left-[265px] bg-card z-20 font-medium text-muted-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] border-r border-border/50">
                          {branchName}
                        </td>

                        {daysInRange.map((d) => {
                          const rec = attendance.find(
                            (a) => (a.employeeId === emp.id || (emp.empCode && a.empCode === emp.empCode) || a.employeeName === emp.name) && a.date === d.dateStr
                          );
                          const scheduled = getScheduledShiftForDate(emp, d.dateStr);
                          const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);
                          const recHours = getRecordHours(rec, company.workingHoursPerDay || 9);

                          const isOdd = isOddPunch(rec, d.dateStr);
                          const isInformedLeave =
                            punct.status === "informed_leave" ||
                            rec?.status === "informed_leave" ||
                            rec?.status === "il" ||
                            (rec?.leaveType === "LOP" && rec?.isExcused) ||
                            (rec?.status === "leave" && (rec?.leaveType === "LOP" || rec?.isExcused));

                          if (punct.status === "present" || punct.status === "late") empPresent += 1;
                          else if (punct.status === "half-day") empPresent += 0.5;

                          empTotalMins += Math.round(recHours.hoursWorked * 60);

                          if (punct.status === "late") {
                            empExceptionMins += (rec?.lateBy || 15);
                          }
                          if (isOdd) {
                            empExceptionMins += 60; // Flagged exception
                          }

                          // Cell content & badge styling tokens with custom color palette
                          let cellText = "00:00";
                          let cellClass = "bg-muted/30 text-muted-foreground border-transparent";

                          if (isOdd) {
                            cellText = "-";
                            cellClass = "bg-[#F1F2EE] text-slate-800 border-[#d6d8ce] font-bold";
                          } else if (recHours.hoursWorked > 0) {
                            cellText = formatMinutesToHHMM(recHours.hoursWorked * 60);
                            cellClass = "bg-[#5FAD41]/20 text-[#285716] dark:text-[#7ed957] border-[#5FAD41]/40 font-bold";
                          } else if (isInformedLeave) {
                            cellText = "IL";
                            cellClass = "bg-[#FB8B24] text-white border-[#FB8B24] font-bold";
                          } else if (scheduled.isHoliday) {
                            cellText = "A/H";
                            cellClass = "bg-[#06AED5] text-white border-[#06AED5] font-bold";
                          } else if (scheduled.isWeeklyOff) {
                            cellText = "W/O";
                            cellClass = "bg-[#DFE0DC] text-slate-800 border-[#c4c6c0] font-semibold";
                          } else if (punct.status === "leave") {
                            cellText = "PL";
                            cellClass = "bg-[#55286F] text-white border-[#55286F] font-bold";
                          } else if (punct.status === "late") {
                            cellText = "Lt";
                            cellClass = "bg-[#E6AF2E] text-slate-950 border-[#E6AF2E] font-bold";
                          } else if (punct.status === "half-day") {
                            cellText = "HD";
                            cellClass = "bg-[#DAB785] text-slate-950 border-[#DAB785] font-bold";
                          } else if (punct.status === "absent") {
                            cellText = "A";
                            cellClass = "bg-[#DE1A1A] text-white border-[#DE1A1A] font-bold";
                          }

                          const isWeekend = isWeekendCol(d.dateStr, d.dayNum);

                          return (
                            <td
                              key={d.dateStr}
                              className={`p-1 text-center font-mono border-r border-border/20 transition-colors ${
                                isWeekend ? "bg-slate-50/70 dark:bg-slate-900/40" : ""
                              }`}
                            >
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => onRegularizePunch ? onRegularizePunch(emp, d.dateStr, rec) : onInspectRecord?.({ emp, rec, date: d.dateStr })}
                                      className={`h-7 min-w-[34px] px-1 rounded-md text-[10px] inline-flex items-center justify-center transition-all hover:scale-105 border shadow-2xs ${cellClass}`}
                                    >
                                      {cellText}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="bg-slate-900/95 backdrop-blur text-white shadow-xl rounded-lg p-3 text-xs border border-slate-700/60 max-w-xs z-50 pointer-events-auto space-y-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 pb-1.5">
                                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                                        <span>{d.dateStr}</span>
                                        <span className="text-slate-400 font-normal">({d.dayShort})</span>
                                      </div>
                                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shadow-2xs ${
                                        isInformedLeave
                                          ? "bg-[#FB8B24] text-white"
                                          : isOdd
                                          ? "bg-[#F1F2EE] text-slate-800 border border-[#d6d8ce]"
                                          : punct.status === "present"
                                          ? "bg-[#5FAD41] text-white"
                                          : punct.status === "late"
                                          ? "bg-[#E6AF2E] text-slate-950"
                                          : punct.status === "leave"
                                          ? "bg-[#55286F] text-white"
                                          : punct.status === "half-day"
                                          ? "bg-[#DAB785] text-slate-950"
                                          : scheduled.isHoliday
                                          ? "bg-[#06AED5] text-white"
                                          : scheduled.isWeeklyOff
                                          ? "bg-[#DFE0DC] text-slate-800"
                                          : "bg-[#DE1A1A] text-white"
                                      }`}>
                                        {isInformedLeave
                                          ? "Informed Leave (IL)"
                                          : isOdd
                                          ? "Odd Punch (-)"
                                          : punct.status === "leave"
                                          ? "Paid Leave (PL)"
                                          : punct.status === "late"
                                          ? "Late (Lt)"
                                          : punct.status === "half-day"
                                          ? "Half Day (HD)"
                                          : scheduled.isHoliday
                                          ? "Holiday (A/H)"
                                          : scheduled.isWeeklyOff
                                          ? "Week Off (W/O)"
                                          : punct.status === "present"
                                          ? "Present (P)"
                                          : "Absent (A)"}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">First In</span>
                                        <span className="font-mono font-medium text-slate-200">
                                          {formatTimeWithAmPm(rec?.checkIn || rec?.clockIn)}
                                        </span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Out</span>
                                        <span className="font-mono font-medium text-slate-200">
                                          {formatTimeWithAmPm(rec?.checkOut || rec?.clockOut)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                                      <span className="text-slate-400">Total Duration:</span>
                                      <span className="font-mono font-bold text-emerald-400">
                                        {recHours.hoursWorked > 0 ? formatMinutesToHHMM(recHours.hoursWorked * 60) : "00:00"}
                                        {recHours.otHours > 0 && (
                                          <span className="text-amber-400 ml-1 font-semibold">(+{formatMinutesToHHMM(recHours.otHours * 60)} OT)</span>
                                        )}
                                      </span>
                                    </div>

                                    <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                                      <span className="text-slate-400">Admin Action:</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onRegularizePunch ? onRegularizePunch(emp, d.dateStr, rec) : onInspectRecord?.({ emp, rec, date: d.dateStr });
                                        }}
                                        className="text-primary-foreground font-semibold hover:underline inline-flex items-center gap-1 bg-primary/40 hover:bg-primary/60 px-2 py-0.5 rounded text-[10px] transition-colors"
                                      >
                                        <Edit3 className="h-2.5 w-2.5" />
                                        <span>Quick Edit / Regularize</span>
                                      </button>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          );
                        })}

                        <td className="p-3 text-center font-mono font-bold text-foreground bg-muted/20">
                          {formatMinutesToHHMM(empTotalMins)}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-amber-600 dark:text-amber-400 bg-muted/20">
                          {formatMinutesToHHMM(empExceptionMins)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-muted/20">
                          {empPresent}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW D: ATTENDANCE MATRIX BY STATUS (DAYS) */}
      {reportType === "matrix_status" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 border-b border-border text-[11px]">
                <tr>
                  <th className="p-3 text-left font-semibold sticky left-0 bg-card z-20 min-w-[95px] shadow-sm">
                    Employee ID
                  </th>
                  <th className="p-3 text-left font-semibold sticky left-[95px] bg-card z-20 min-w-[170px] shadow-sm">
                    Employee Name
                  </th>
                  <th className="p-3 text-left font-semibold sticky left-[265px] bg-card z-20 min-w-[110px] shadow-sm">
                    Branch
                  </th>
                  {daysInRange.map((d) => (
                    <th key={d.dateStr} className="p-1.5 text-center min-w-[34px] font-medium text-[11px]">
                      <div className="font-bold text-foreground">{d.dayNum}</div>
                      <div className="text-[10px] text-muted-foreground">{d.dayLetter}</div>
                    </th>
                  ))}
                  <th className="p-3 text-center font-semibold min-w-[65px] bg-muted/40">Total Days</th>
                  <th className="p-3 text-center font-bold text-emerald-600 min-w-[65px] bg-muted/40">Present</th>
                  <th className="p-3 text-center font-semibold text-destructive min-w-[65px] bg-muted/40">Absent</th>
                  <th className="p-3 text-center font-semibold text-muted-foreground min-w-[65px] bg-muted/40">Odd Punch (-)</th>
                  <th className="p-3 text-center font-semibold text-[#55286F] min-w-[65px] bg-muted/40">Paid Leave</th>
                  <th className="p-3 text-center font-semibold text-slate-500 min-w-[65px] bg-muted/40">Weekly Off</th>
                  <th className="p-3 text-center font-semibold text-purple-600 min-w-[65px] bg-muted/40">Annual Holiday</th>
                  <th className="p-3 text-center font-semibold text-emerald-600 min-w-[65px] bg-muted/40">Extra Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={daysInRange.length + 11} className="p-8 text-center text-muted-foreground">
                      No employees match the specified criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    let empPresent = 0;
        let empInformedLeave = 0;
                    let empAbsent = 0;
                    let empOdd = 0;
                    let empLeave = 0;
                    let empWeeklyOff = 0;
                    let empAnnualHoliday = 0;
                    let empExtraDay = 0;
                    const branchName = getBranchName(emp);

                    return (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 sticky left-0 bg-card z-10 font-mono text-[11px] font-semibold text-muted-foreground shadow-sm">
                          {emp.empCode || emp.id}
                        </td>
                        <td
                          className="p-3 sticky left-[95px] bg-card z-10 font-medium text-foreground hover:text-primary cursor-pointer shadow-sm"
                          onClick={() => onOpenDossier?.(emp)}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{emp.name}</span>
                            <EmploymentTypeBadge type={emp.employmentType} />
                          </div>
                          <div className="text-[10px] text-muted-foreground">{emp.department || "General"}</div>
                        </td>
                        <td className="p-3 sticky left-[265px] bg-card z-10 font-medium text-muted-foreground shadow-sm">
                          {branchName}
                        </td>

                        {daysInRange.map((d) => {
                          const rec = attendance.find(
                            (a) => (a.employeeId === emp.id || (emp.empCode && a.empCode === emp.empCode) || a.employeeName === emp.name) && a.date === d.dateStr
                          );
                          const scheduled = getScheduledShiftForDate(emp, d.dateStr);
                          const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);
                          const recHours = getRecordHours(rec, company.workingHoursPerDay || 9);

                          const hasPunch = Boolean(rec?.checkIn || rec?.clockIn || rec?.checkOut || rec?.clockOut);
                          const isOdd = isOddPunch(rec, d.dateStr);
                          if (isOdd) empOdd++;

                          if (scheduled.isHoliday) {
                            empAnnualHoliday++;
                            if (hasPunch && recHours.hoursWorked > 0) empExtraDay++;
                          } else if (scheduled.isWeeklyOff) {
                            empWeeklyOff++;
                            if (hasPunch && recHours.hoursWorked > 0) empExtraDay++;
                          }

                          const isInformedLeave =
                            punct.status === "informed_leave" ||
                            rec?.status === "informed_leave" ||
                            rec?.status === "il" ||
                            (rec?.leaveType === "LOP" && rec?.isExcused) ||
                            (rec?.status === "leave" && (rec?.leaveType === "LOP" || rec?.isExcused));

                          if (punct.status === "present") empPresent += 1;
                          else if (punct.status === "half-day") empPresent += 0.5;
                          else if (isInformedLeave) empInformedLeave += 1;
                          else if (punct.status === "leave") empLeave += 1;
                          else if (punct.status === "absent" && !scheduled.isWeeklyOff && !scheduled.isHoliday) empAbsent += 1;
                          else if (punct.status === "late") empPresent += 1;

                          let badgeLetter = "A";
                          let badgeClass = "bg-[#DE1A1A] text-white border-[#DE1A1A] font-bold";

                          if (isOdd) {
                            badgeLetter = "-";
                            badgeClass = "bg-[#F1F2EE] text-slate-800 border-[#d6d8ce] font-bold";
                          } else if (isInformedLeave) {
                            badgeLetter = "IL";
                            badgeClass = "bg-[#FB8B24] text-white border-[#FB8B24] font-bold";
                          } else if (punct.status === "present") {
                            badgeLetter = "P";
                            badgeClass = "bg-[#5FAD41] text-white border-[#5FAD41] font-bold";
                          } else if (punct.status === "late") {
                            badgeLetter = "Lt";
                            badgeClass = "bg-[#E6AF2E] text-slate-950 border-[#E6AF2E] font-bold";
                          } else if (punct.status === "half-day") {
                            badgeLetter = "HD";
                            badgeClass = "bg-[#DAB785] text-slate-950 border-[#DAB785] font-bold";
                          } else if (punct.status === "leave") {
                            badgeLetter = "PL";
                            badgeClass = "bg-[#55286F] text-white border-[#55286F] font-bold";
                          } else if (scheduled.isHoliday) {
                            badgeLetter = "A/H";
                            badgeClass = "bg-[#06AED5] text-white border-[#06AED5] font-bold";
                          } else if (scheduled.isWeeklyOff) {
                            badgeLetter = "W/O";
                            badgeClass = "bg-[#DFE0DC] text-slate-800 border-[#c4c6c0] font-semibold";
                          }

                          return (
                            <td key={d.dateStr} className="p-1 text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => onInspectRecord?.({ emp, rec, date: d.dateStr })}
                                      className={`h-6 min-w-[24px] px-1 rounded font-semibold text-[10px] inline-flex items-center justify-center transition-transform hover:scale-110 border ${badgeClass}`}
                                    >
                                      {badgeLetter}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-0.5">
                                      <div className="font-semibold">{d.dateStr} ({d.dayShort})</div>
                                      <div>Status: <span className="font-medium">{punct.label}</span></div>
                                      {rec?.checkIn && <div>In: {formatTimeWithAmPm(rec.checkIn)}</div>}
                                      {rec?.checkOut && <div>Out: {formatTimeWithAmPm(rec.checkOut)}</div>}
                                      {recHours.hoursWorked > 0 && <div>Hours: {formatMinutesToHHMM(recHours.hoursWorked * 60)}</div>}
                                      {recHours.otHours > 0 && <div className="text-amber-500">OT: +{formatMinutesToHHMM(recHours.otHours * 60)}</div>}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          );
                        })}

                        <td className="p-3 text-center font-medium bg-muted/20">{daysInRange.length}</td>
                        <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-muted/20">
                          {empPresent}
                        </td>
                        <td className="p-3 text-center font-medium text-destructive bg-muted/20">
                          {empAbsent}
                        </td>
                        <td className="p-3 text-center font-semibold text-rose-600 dark:text-rose-400 bg-muted/20">
                          {empOdd}
                        </td>
                        <td className="p-3 text-center font-medium text-blue-600 dark:text-blue-400 bg-muted/20">
                          {empLeave}
                        </td>
                        <td className="p-3 text-center font-medium text-slate-500 bg-muted/20">
                          {empWeeklyOff}
                        </td>
                        <td className="p-3 text-center font-medium text-purple-600 dark:text-purple-400 bg-muted/20">
                          {empAnnualHoliday}
                        </td>
                        <td className="p-3 text-center font-semibold text-emerald-600 bg-muted/20">
                          {empExtraDay}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
