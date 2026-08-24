import type { Employee, ShiftType, ShiftAssignment } from "./store";

export const BULK_ROSTER_HEADERS = [
  "Employee Code",
  "Employee Name",
  "Date (YYYY-MM-DD)",
  "To Date (YYYY-MM-DD)",
  "Shift Code / Name",
  "Grace Time (always/10/15/20/25/30)",
  "Allow Half Day Login (TRUE/FALSE)",
  "Half Day Login Time (HH:MM)",
  "Skip Weekends (TRUE/FALSE)",
  "Note / Remarks",
];

export const SAMPLE_ROSTER_ROWS = [
  [
    "SW0101",
    "Aarav Patel",
    "2026-09-01",
    "2026-09-15",
    "GEN",
    "15",
    "TRUE",
    "12:00",
    "TRUE",
    "Regular General Shift Roster",
  ],
  [
    "SW0102",
    "Pooja Sundaram",
    "2026-09-01",
    "2026-09-15",
    "MORN",
    "10",
    "TRUE",
    "10:30",
    "TRUE",
    "Morning Support Shift",
  ],
  [
    "SW0103",
    "Vikram Malhotra",
    "2026-09-01",
    "2026-09-15",
    "NIGHT",
    "20",
    "FALSE",
    "01:00",
    "TRUE",
    "Night Production Shift",
  ],
  [
    "SW0101",
    "Aarav Patel",
    "2026-09-06",
    "2026-09-06",
    "OFF",
    "always",
    "FALSE",
    "",
    "FALSE",
    "Scheduled Sunday Off",
  ],
  [
    "SW0102",
    "Pooja Sundaram",
    "2026-09-07",
    "2026-09-07",
    "OFF",
    "always",
    "FALSE",
    "",
    "FALSE",
    "Compensatory Off",
  ],
];

/**
 * Generates CSV template string prefilled with company shifts and active employees
 */
export function generateBulkRosterTemplateCSV(
  companyName = "SWIFT",
  availableShifts: ShiftType[] = [],
  sampleEmployees: Employee[] = []
): string {
  const sanitize = (val: string | number | boolean | undefined | null) => {
    const s = String(val ?? "").trim();
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvRows: string[] = [];

  // Header line
  csvRows.push(BULK_ROSTER_HEADERS.map(sanitize).join(","));

  // If employees exist, build tailored sample rows with actual emp codes
  if (sampleEmployees.length > 0) {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, "0");
    const startDate = `${curYear}-${curMonth}-01`;
    const lastDayOfMonth = new Date(curYear, today.getMonth() + 1, 0).getDate();
    const endDate = `${curYear}-${curMonth}-${String(lastDayOfMonth).padStart(2, "0")}`;

    const defaultShift = availableShifts[0]?.code || availableShifts[0]?.name || "GEN";

    sampleEmployees.slice(0, 5).forEach((emp, idx) => {
      const shiftCode = availableShifts[idx % Math.max(availableShifts.length, 1)]?.code || defaultShift;
      csvRows.push(
        [
          emp.empCode || `EMP-${1000 + idx}`,
          emp.name,
          startDate,
          endDate,
          shiftCode,
          "15",
          "TRUE",
          "12:00",
          "TRUE",
          "Monthly Roster Assignment",
        ]
          .map(sanitize)
          .join(",")
      );
    });
  } else {
    SAMPLE_ROSTER_ROWS.forEach((row) => {
      csvRows.push(row.map(sanitize).join(","));
    });
  }

  return "\uFEFF" + csvRows.join("\r\n");
}

/**
 * Triggers browser file download of prefilled CSV template
 */
export function downloadRosterTemplate(
  companyName = "SWIFT",
  availableShifts: ShiftType[] = [],
  employees: Employee[] = []
): void {
  const csvContent = generateBulkRosterTemplateCSV(companyName, availableShifts, employees);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `${companyName.replace(/\s+/g, "_")}_Bulk_Shift_Roster_Template.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParsedRosterItem {
  employeeId: string;
  employeeName: string;
  empCode: string;
  department: string;
  date: string;
  shiftId: string;
  shiftName: string;
  shiftStart?: string;
  shiftEnd?: string;
  graceTime: "always" | "10" | "15" | "20" | "25" | "30";
  allowHalfDayLogin?: boolean;
  halfDayLoginTime?: string;
  note?: string;
  sourceRow: number;
}

export interface RosterParseResult {
  assignments: ParsedRosterItem[];
  validCount: number;
  uniqueEmployees: number;
  totalDatesAffected: number;
  warnings: string[];
  errors: string[];
  totalRows: number;
  previewRows: Array<{
    empCode: string;
    employeeName: string;
    date: string;
    shiftName: string;
    shiftCode: string;
    graceTime: string;
    status: "valid" | "warning" | "error";
    message?: string;
  }>;
}

/**
 * Parses and validates CSV/TSV roster files into individual ShiftAssignment objects
 */
export function parseRosterCsvText(
  text: string,
  employees: Employee[],
  availableShifts: ShiftType[]
): RosterParseResult {
  if (text.startsWith("PK") || text.includes("\u0000") || text.includes("\ufffd")) {
    return {
      assignments: [],
      validCount: 0,
      uniqueEmployees: 0,
      totalDatesAffected: 0,
      warnings: [],
      errors: [
        "Binary Excel (.xlsx / .xls) file detected.",
        "Please open the file in Excel and select 'Save As' -> 'CSV (Comma delimited) (*.csv)', then upload.",
      ],
      totalRows: 0,
      previewRows: [],
    };
  }

  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return {
      assignments: [],
      validCount: 0,
      uniqueEmployees: 0,
      totalDatesAffected: 0,
      warnings: [],
      errors: ["File contains no data rows."],
      totalRows: 0,
      previewRows: [],
    };
  }

  // Parse header line
  const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));

  const assignments: ParsedRosterItem[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const previewRows: RosterParseResult["previewRows"] = [];

  const empMapByCode = new Map<string, Employee>();
  const empMapByName = new Map<string, Employee>();

  employees.forEach((emp) => {
    if (emp.empCode) {
      empMapByCode.set(emp.empCode.toLowerCase().trim(), emp);
    }
    if (emp.name) {
      empMapByName.set(emp.name.toLowerCase().trim(), emp);
    }
  });

  // Shift matching lookup
  const shiftMap = new Map<string, ShiftType>();
  availableShifts.forEach((s) => {
    if (s.id) shiftMap.set(s.id.toLowerCase().trim(), s);
    if (s.code) shiftMap.set(s.code.toLowerCase().trim(), s);
    if (s.name) shiftMap.set(s.name.toLowerCase().trim(), s);
  });

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const values = parseCsvRow(rawLine);
    if (values.every((v) => !v.trim())) continue;

    const getVal = (possibleKeys: string[]): string => {
      for (const pk of possibleKeys) {
        const cleanKey = pk.toLowerCase().replace(/[^a-z0-9]/g, "");
        const idx = headers.findIndex((h) => h === cleanKey || h.includes(cleanKey));
        if (idx !== -1 && values[idx] !== undefined) {
          return values[idx].trim();
        }
      }
      return "";
    };

    const empCodeRaw = getVal(["employeecode", "empcode", "code", "empid", "id"]);
    const empNameRaw = getVal(["employeename", "empname", "fullname", "name", "employee", "staff"]);
    const dateRaw = getVal(["date", "fromdate", "startdate", "assignmentdate"]);
    const toDateRaw = getVal(["todate", "enddate", "untildate"]);
    const shiftRaw = getVal(["shiftcode", "shiftname", "shift", "shiftid", "assignedshift"]);
    const graceRaw = getVal(["gracetime", "grace", "graceperiod"]).toLowerCase();
    const allowHalfDayRaw = getVal(["allowhalfdaylogin", "halfdaylogin", "allowafternoonlogin"]);
    const halfDayTimeRaw = getVal(["halfdaylogintime", "afternoonlogintime", "halfdaytime"]);
    const skipWeekendsRaw = getVal(["skipweekends", "skipweekend", "excludeweekends", "excludeweekend"]);
    const note = getVal(["note", "notes", "remarks", "remark", "reason", "description"]);

    // 1. Resolve Employee
    let matchedEmp: Employee | undefined = undefined;
    if (empCodeRaw && empMapByCode.has(empCodeRaw.toLowerCase())) {
      matchedEmp = empMapByCode.get(empCodeRaw.toLowerCase());
    } else if (empNameRaw && empMapByName.has(empNameRaw.toLowerCase())) {
      matchedEmp = empMapByName.get(empNameRaw.toLowerCase());
    }

    if (!matchedEmp) {
      errors.push(`Row ${i + 1}: Employee not found (Code: "${empCodeRaw || "N/A"}", Name: "${empNameRaw || "N/A"}")`);
      previewRows.push({
        empCode: empCodeRaw || "UNKNOWN",
        employeeName: empNameRaw || "Unknown",
        date: dateRaw || "N/A",
        shiftName: shiftRaw || "N/A",
        shiftCode: shiftRaw || "N/A",
        graceTime: graceRaw || "15",
        status: "error",
        message: "Employee code/name does not match any active employee",
      });
      continue;
    }

    // 2. Validate Start Date
    if (!dateRaw || !isValidDateFormat(dateRaw)) {
      errors.push(`Row ${i + 1}: Invalid or missing Date "${dateRaw}". Must be YYYY-MM-DD.`);
      previewRows.push({
        empCode: matchedEmp.empCode || "N/A",
        employeeName: matchedEmp.name,
        date: dateRaw || "Missing",
        shiftName: shiftRaw || "N/A",
        shiftCode: shiftRaw || "N/A",
        graceTime: graceRaw || "15",
        status: "error",
        message: "Invalid date format. Expected YYYY-MM-DD",
      });
      continue;
    }

    // 3. Resolve Shift
    let shiftId = "gen";
    let shiftName = "General Shift";
    let shiftStart = "09:00";
    let shiftEnd = "18:00";
    let isOff = false;

    const cleanShiftKey = (shiftRaw || "gen").toLowerCase().trim();
    if (cleanShiftKey === "off" || cleanShiftKey === "weekoff" || cleanShiftKey === "leave" || cleanShiftKey === "holiday") {
      shiftId = "off";
      shiftName = "Weekly Off";
      isOff = true;
    } else if (shiftMap.has(cleanShiftKey)) {
      const s = shiftMap.get(cleanShiftKey)!;
      shiftId = s.id;
      shiftName = s.name;
      shiftStart = s.start;
      shiftEnd = s.end;
    } else {
      // Check partial match
      const found = availableShifts.find(
        (s) =>
          s.name.toLowerCase().includes(cleanShiftKey) ||
          (s.code && s.code.toLowerCase() === cleanShiftKey)
      );
      if (found) {
        shiftId = found.id;
        shiftName = found.name;
        shiftStart = found.start;
        shiftEnd = found.end;
      } else {
        warnings.push(`Row ${i + 1}: Unknown shift "${shiftRaw}". Defaulted to "${availableShifts[0]?.name || "General Shift"}".`);
        if (availableShifts[0]) {
          shiftId = availableShifts[0].id;
          shiftName = availableShifts[0].name;
          shiftStart = availableShifts[0].start;
          shiftEnd = availableShifts[0].end;
        }
      }
    }

    // 4. Resolve Grace Time
    let graceTime: ParsedRosterItem["graceTime"] = "15";
    if (graceRaw.includes("always") || graceRaw.includes("none") || graceRaw.includes("0")) {
      graceTime = "always";
    } else if (graceRaw.includes("10")) graceTime = "10";
    else if (graceRaw.includes("15")) graceTime = "15";
    else if (graceRaw.includes("20")) graceTime = "20";
    else if (graceRaw.includes("25")) graceTime = "25";
    else if (graceRaw.includes("30")) graceTime = "30";

    const parseBool = (str: string, def = true): boolean => {
      if (!str) return def;
      const s = str.toLowerCase().trim();
      return s === "true" || s === "yes" || s === "1" || s === "y";
    };

    const allowHalfDayLogin = parseBool(allowHalfDayRaw, true);
    const halfDayLoginTime = halfDayTimeRaw || "12:00";
    const skipWeekends = parseBool(skipWeekendsRaw, true);

    // 5. Expand Date Range if toDate is provided
    const startDateObj = parseIsoDate(dateRaw);
    const endDateObj = toDateRaw && isValidDateFormat(toDateRaw) ? parseIsoDate(toDateRaw) : startDateObj;

    if (startDateObj > endDateObj) {
      warnings.push(`Row ${i + 1}: "To Date" (${toDateRaw}) is before "Date" (${dateRaw}). Swapped range.`);
    }

    const start = startDateObj <= endDateObj ? startDateObj : endDateObj;
    const end = startDateObj <= endDateObj ? endDateObj : startDateObj;

    const cur = new Date(start);
    let rowAssignmentsCount = 0;

    while (cur <= end) {
      const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isOff && skipWeekends && isWeekend && toDateRaw) {
        // Skip weekend when assigning a range of working shifts
        cur.setDate(cur.getDate() + 1);
        continue;
      }

      const isoDate = cur.toISOString().slice(0, 10);

      assignments.push({
        employeeId: matchedEmp.id,
        employeeName: matchedEmp.name,
        empCode: matchedEmp.empCode || "",
        department: matchedEmp.department || "",
        date: isoDate,
        shiftId,
        shiftName,
        shiftStart: isOff ? undefined : shiftStart,
        shiftEnd: isOff ? undefined : shiftEnd,
        graceTime,
        allowHalfDayLogin: isOff ? false : allowHalfDayLogin,
        halfDayLoginTime: isOff ? undefined : halfDayLoginTime,
        note: note || (isOff ? "Weekly Off" : `Shift: ${shiftName}`),
        sourceRow: i + 1,
      });

      rowAssignmentsCount++;
      cur.setDate(cur.getDate() + 1);
    }

    // Add to preview table
    previewRows.push({
      empCode: matchedEmp.empCode || "",
      employeeName: matchedEmp.name,
      date: toDateRaw && toDateRaw !== dateRaw ? `${dateRaw} → ${toDateRaw} (${rowAssignmentsCount} days)` : dateRaw,
      shiftName,
      shiftCode: shiftRaw || shiftName,
      graceTime: isOff ? "N/A" : `${graceTime} mins`,
      status: "valid",
      message: isOff ? "Weekly Off Assigned" : `Assigned ${shiftName}`,
    });
  }

  // Deduplicate and aggregate
  const uniqueEmpIds = new Set(assignments.map((a) => a.employeeId));
  const uniqueDates = new Set(assignments.map((a) => `${a.employeeId}_${a.date}`));

  return {
    assignments,
    validCount: assignments.length,
    uniqueEmployees: uniqueEmpIds.size,
    totalDatesAffected: uniqueDates.size,
    warnings,
    errors,
    totalRows: lines.length - 1,
    previewRows,
  };
}

function isValidDateFormat(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function parseIsoDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function parseCsvRow(rowText: string): string[] {
  const result: string[] = [];
  let cur = "";
  let insideQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    const nextChar = rowText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cur += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === "," || char === "\t") && !insideQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}
