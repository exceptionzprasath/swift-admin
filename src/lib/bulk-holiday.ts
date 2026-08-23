import type { CompanyHoliday, HolidayType } from "./store";

export const BULK_HOLIDAY_HEADERS = [
  "Holiday Name",
  "Date (YYYY-MM-DD)",
  "To Date (YYYY-MM-DD)",
  "Holiday Type",
  "Applicable Branches",
  "Mandatory (TRUE/FALSE)",
  "Description / Reason",
];

export const SAMPLE_HOLIDAY_ROWS = [
  [
    "New Year's Day",
    "2026-01-01",
    "2026-01-01",
    "Optional Holiday",
    "All Branches",
    "FALSE",
    "New Year celebration (Optional floating holiday)",
  ],
  [
    "Pongal / Makar Sankranti",
    "2026-01-14",
    "2026-01-15",
    "Festival Holiday",
    "All Branches",
    "TRUE",
    "Traditional South & North Indian Harvest Festival",
  ],
  [
    "Republic Day",
    "2026-01-26",
    "2026-01-26",
    "National Holiday",
    "All Branches",
    "TRUE",
    "National Republic Day Celebration",
  ],
  [
    "Holi",
    "2026-03-25",
    "2026-03-25",
    "Festival Holiday",
    "All Branches",
    "TRUE",
    "Festival of Colors",
  ],
  [
    "Good Friday",
    "2026-04-10",
    "2026-04-10",
    "Public Holiday",
    "All Branches",
    "TRUE",
    "Christian Public Holiday",
  ],
  [
    "Labor Day / May Day",
    "2026-05-01",
    "2026-05-01",
    "Public Holiday",
    "All Branches",
    "TRUE",
    "International Workers' Day",
  ],
  [
    "Independence Day",
    "2026-08-15",
    "2026-08-15",
    "National Holiday",
    "All Branches",
    "TRUE",
    "Indian Independence Day celebration",
  ],
  [
    "Gandhi Jayanti",
    "2026-10-02",
    "2026-10-02",
    "National Holiday",
    "All Branches",
    "TRUE",
    "Mahatma Gandhi's Birthday",
  ],
  [
    "Diwali (Deepavali)",
    "2026-11-01",
    "2026-11-01",
    "Festival Holiday",
    "All Branches",
    "TRUE",
    "Festival of Lights",
  ],
  [
    "Christmas Day",
    "2026-12-25",
    "2026-12-25",
    "Festival Holiday",
    "All Branches",
    "TRUE",
    "Christmas Celebration",
  ],
];

export function generateBulkHolidayTemplateCSV(): string {
  const escapeCell = (val: string | number | boolean | undefined | null) => {
    const s = String(val ?? "").trim();
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = BULK_HOLIDAY_HEADERS.map(escapeCell).join(",");
  const rowLines = SAMPLE_HOLIDAY_ROWS.map((row) => row.map(escapeCell).join(","));

  return "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
}

export function downloadHolidayCSVTemplate(filename = "swift_hrms_office_holidays_template.csv"): void {
  const csvContent = generateBulkHolidayTemplateCSV();
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

export interface ParsedHolidayRow {
  raw: Record<string, string>;
  name: string;
  date: string;
  toDate?: string;
  type: HolidayType;
  branches: string;
  isMandatory: boolean;
  description: string;
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

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function normalizeHolidayType(raw: string): HolidayType {
  const t = (raw || "").trim().toLowerCase();
  if (t.includes("national")) return "National Holiday";
  if (t.includes("festival") || t.includes("fest")) return "Festival Holiday";
  if (t.includes("optional") || t.includes("floating") || t.includes("restricted")) return "Optional Holiday";
  if (t.includes("company") || t.includes("off")) return "Company Off";
  return "Public Holiday";
}

export function parseBulkHolidayCSV(fileContent: string): {
  parsedRows: ParsedHolidayRow[];
  totalCount: number;
  validCount: number;
  errorCount: number;
} {
  let clean = fileContent.replace(/^\uFEFF/, "").trim();
  if (!clean) {
    return { parsedRows: [], totalCount: 0, validCount: 0, errorCount: 0 };
  }

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

  const nameIdx = getColIdx(["holidayname", "name", "title", "holiday"]);
  const dateIdx = getColIdx(["date", "startdate", "fromdate", "from"]);
  const toDateIdx = getColIdx(["todate", "enddate", "to"]);
  const typeIdx = getColIdx(["holidaytype", "type", "category"]);
  const branchesIdx = getColIdx(["applicablebranches", "branches", "branch", "location"]);
  const mandatoryIdx = getColIdx(["mandatory", "ismandatory", "required"]);
  const descIdx = getColIdx(["description", "reason", "desc", "note", "remarks"]);

  const parsedRows: ParsedHolidayRow[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const lineTokens = parseCSVLine(rawLines[i], delimiter);
    if (lineTokens.every((t) => !t.trim())) continue;

    const rowMap: Record<string, string> = {};
    BULK_HOLIDAY_HEADERS.forEach((h, idx) => {
      rowMap[h] = lineTokens[idx] || "";
    });

    const nameRaw = nameIdx !== -1 ? lineTokens[nameIdx] || "" : lineTokens[0] || "";
    const dateRaw = dateIdx !== -1 ? lineTokens[dateIdx] || "" : lineTokens[1] || "";
    const toDateRaw = toDateIdx !== -1 ? lineTokens[toDateIdx] || "" : lineTokens[2] || dateRaw;
    const typeRaw = typeIdx !== -1 ? lineTokens[typeIdx] || "" : lineTokens[3] || "Public Holiday";
    const branchesRaw = branchesIdx !== -1 ? lineTokens[branchesIdx] || "All Branches" : lineTokens[4] || "All Branches";
    const mandatoryRaw = mandatoryIdx !== -1 ? lineTokens[mandatoryIdx] || "TRUE" : lineTokens[5] || "TRUE";
    const descRaw = descIdx !== -1 ? lineTokens[descIdx] || "" : lineTokens[6] || "";

    const errors: string[] = [];

    if (!nameRaw.trim()) {
      errors.push("Holiday name is required");
    }

    const normDate = normalizeDate(dateRaw);
    const normToDate = toDateRaw ? normalizeDate(toDateRaw) : normDate;

    if (!normDate) {
      errors.push(`Invalid holiday date: "${dateRaw}" (Use YYYY-MM-DD)`);
    }

    if (normDate && normToDate && normDate > normToDate) {
      errors.push(`Start date (${normDate}) cannot be after end date (${normToDate})`);
    }

    const type = normalizeHolidayType(typeRaw);
    const isMandatory = !mandatoryRaw.toLowerCase().includes("false") && !mandatoryRaw.toLowerCase().includes("no") && !mandatoryRaw.toLowerCase().includes("0");

    parsedRows.push({
      raw: rowMap,
      name: nameRaw.trim() || "Public Holiday",
      date: normDate || dateRaw,
      toDate: normToDate || undefined,
      type,
      branches: branchesRaw || "All Branches",
      isMandatory,
      description: descRaw || `${nameRaw} Celebration`,
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
