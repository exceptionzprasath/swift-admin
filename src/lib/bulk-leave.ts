import type { Employee, LeaveRequest } from "./store";

export const BULK_LEAVE_HEADERS = [
  "Employee Code",
  "Employee Name",
  "Leave Type",
  "From Date (YYYY-MM-DD)",
  "To Date (YYYY-MM-DD)",
  "Total Days",
  "Reason",
  "Status (Approved/Pending/Rejected)",
];

export const SAMPLE_LEAVE_ROWS = [
  [
    "SW0101",
    "Aarav Patel",
    "Casual Leave",
    "2026-08-18",
    "2026-08-19",
    "2",
    "Personal family commitment",
    "Approved",
  ],
  [
    "SW0102",
    "Pooja Sundaram",
    "Sick Leave",
    "2026-08-20",
    "2026-08-20",
    "1",
    "Viral fever and medical consultation",
    "Approved",
  ],
  [
    "SW0103",
    "Karthik Raja",
    "Earned Leave",
    "2026-08-25",
    "2026-08-28",
    "4",
    "Annual planned family vacation",
    "Pending",
  ],
  [
    "ALL",
    "All Employees",
    "Public Holiday",
    "2026-08-15",
    "2026-08-15",
    "1",
    "Independence Day celebration",
    "Approved",
  ],
];

export function generateBulkLeaveTemplateCSV(): string {
  const escapeCell = (val: string | number | undefined | null) => {
    const s = String(val ?? "").trim();
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = BULK_LEAVE_HEADERS.map(escapeCell).join(",");
  const rowLines = SAMPLE_LEAVE_ROWS.map((row) => row.map(escapeCell).join(","));

  return "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
}

export function downloadLeaveCSVTemplate(filename = "swift_hrms_leave_import_template.csv"): void {
  const csvContent = generateBulkLeaveTemplateCSV();
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParsedLeaveRow {
  raw: Record<string, string>;
  empCode: string;
  employeeName: string;
  matchedEmployeeId?: string;
  matchedEmployeeName?: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  isValid: boolean;
  errors: string[];
}

function parseCSVLine(line: string, delimiter = ","): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) {
    const separator = s.includes("/") ? "/" : "-";
    const [d, m, y] = s.split(separator);
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD/YYYY fallback
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function normalizeLeaveType(raw: string): string {
  const t = (raw || "").trim().toLowerCase();
  if (t.includes("sick") || t === "sl") return "Sick Leave";
  if (t.includes("casual") || t === "cl") return "Casual Leave";
  if (t.includes("earned") || t.includes("annual") || t.includes("privilege") || t === "el" || t === "pl") return "Earned Leave";
  if (t.includes("matern")) return "Maternity Leave";
  if (t.includes("patern")) return "Paternity Leave";
  if (t.includes("comp") || t.includes("off")) return "Comp Off";
  if (t.includes("unpaid") || t.includes("lop") || t.includes("loss")) return "Unpaid Leave";
  if (t.includes("holiday") || t.includes("public") || t.includes("fest")) return "Public Holiday";
  if (t.includes("restricted") || t.includes("optional")) return "Optional Holiday";
  return raw.trim() || "Casual Leave";
}

function calculateDateDiffDays(from: string, to: string): number {
  try {
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

export function parseBulkLeaveCSV(
  fileContent: string,
  employees: Employee[]
): {
  parsedRows: ParsedLeaveRow[];
  totalCount: number;
  validCount: number;
  errorCount: number;
} {
  // Remove BOM if present
  let clean = fileContent.replace(/^\uFEFF/, "").trim();
  if (!clean) {
    return { parsedRows: [], totalCount: 0, validCount: 0, errorCount: 0 };
  }

  // Detect delimiter
  const firstLine = clean.split(/\r?\n/)[0] || "";
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";")) delimiter = ";";

  const rawLines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) {
    return { parsedRows: [], totalCount: 0, validCount: 0, errorCount: 0 };
  }

  const headerTokens = parseCSVLine(rawLines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const getColIdx = (aliases: string[]) => {
    for (const alias of aliases) {
      const idx = headerTokens.findIndex((h) => h.includes(alias.replace(/[^a-z0-9]/g, "")));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const empCodeIdx = getColIdx(["employeecode", "empcode", "code", "empid", "id"]);
  const empNameIdx = getColIdx(["employeename", "fullname", "name"]);
  const typeIdx = getColIdx(["leavetype", "type", "category"]);
  const fromIdx = getColIdx(["fromdate", "from", "startdate", "start"]);
  const toIdx = getColIdx(["todate", "to", "enddate", "end"]);
  const daysIdx = getColIdx(["totaldays", "days", "duration"]);
  const reasonIdx = getColIdx(["reason", "description", "note", "purpose"]);
  const statusIdx = getColIdx(["status", "state", "approval"]);

  const parsedRows: ParsedLeaveRow[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const lineTokens = parseCSVLine(rawLines[i], delimiter);
    if (lineTokens.every((t) => !t.trim())) continue;

    const rowMap: Record<string, string> = {};
    BULK_LEAVE_HEADERS.forEach((h, idx) => {
      rowMap[h] = lineTokens[idx] || "";
    });

    const empCodeRaw = empCodeIdx !== -1 ? lineTokens[empCodeIdx] || "" : lineTokens[0] || "";
    const empNameRaw = empNameIdx !== -1 ? lineTokens[empNameIdx] || "" : lineTokens[1] || "";
    const typeRaw = typeIdx !== -1 ? lineTokens[typeIdx] || "" : lineTokens[2] || "Casual Leave";
    const fromRaw = fromIdx !== -1 ? lineTokens[fromIdx] || "" : lineTokens[3] || "";
    const toRaw = toIdx !== -1 ? lineTokens[toIdx] || "" : lineTokens[4] || fromRaw;
    const daysRaw = daysIdx !== -1 ? lineTokens[daysIdx] || "" : lineTokens[5] || "";
    const reasonRaw = reasonIdx !== -1 ? lineTokens[reasonIdx] || "" : lineTokens[6] || "";
    const statusRaw = statusIdx !== -1 ? lineTokens[statusIdx] || "" : lineTokens[7] || "Approved";

    const errors: string[] = [];

    // Match employee
    let matchedEmp: Employee | undefined;
    const codeClean = empCodeRaw.trim().toLowerCase();
    const nameClean = empNameRaw.trim().toLowerCase();

    if (codeClean === "all" || codeClean === "company" || codeClean === "all employees") {
      matchedEmp = {
        id: "ALL",
        empCode: "ALL",
        name: "All Employees (Company-Wide)",
        department: "All Departments",
        designation: "All Roles",
      } as any;
    } else {
      matchedEmp = employees.find(
        (e) =>
          (e.empCode && e.empCode.trim().toLowerCase() === codeClean) ||
          (e.id && e.id.trim().toLowerCase() === codeClean) ||
          (e.name && e.name.trim().toLowerCase() === nameClean)
      );
    }

    if (!matchedEmp && !codeClean && !nameClean) {
      errors.push("Employee code or name is missing");
    } else if (!matchedEmp) {
      errors.push(`Employee "${empCodeRaw || empNameRaw}" not found in system`);
    }

    // Validate dates
    const fromDate = normalizeDate(fromRaw);
    const toDate = normalizeDate(toRaw || fromRaw);

    if (!fromDate) {
      errors.push(`Invalid start date: "${fromRaw}" (Use YYYY-MM-DD)`);
    }
    if (!toDate) {
      errors.push(`Invalid end date: "${toRaw}" (Use YYYY-MM-DD)`);
    }
    if (fromDate && toDate && fromDate > toDate) {
      errors.push(`Start date (${fromDate}) cannot be after end date (${toDate})`);
    }

    const leaveType = normalizeLeaveType(typeRaw);
    let days = parseFloat(daysRaw);
    if (isNaN(days) || days <= 0) {
      days = fromDate && toDate ? calculateDateDiffDays(fromDate, toDate) : 1;
    }

    const normalizedStatus =
      statusRaw.toLowerCase().includes("pend") ? "pending"
      : statusRaw.toLowerCase().includes("rej") ? "rejected"
      : "approved";

    parsedRows.push({
      raw: rowMap,
      empCode: empCodeRaw,
      employeeName: empNameRaw,
      matchedEmployeeId: matchedEmp?.id,
      matchedEmployeeName: matchedEmp?.name,
      type: leaveType,
      from: fromDate || fromRaw,
      to: toDate || toRaw || fromRaw,
      days,
      reason: reasonRaw || "Imported Leave Record",
      status: normalizedStatus,
      isValid: errors.length === 0,
      errors,
    });
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return {
    parsedRows,
    totalCount: parsedRows.length,
    validCount,
    errorCount,
  };
}
