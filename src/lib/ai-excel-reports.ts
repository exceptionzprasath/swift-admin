import * as XLSX from "xlsx";
import type { AIStructuredData } from "./ai-unified-types";
import type { CompanyContext } from "./ai-pdf-reports";

function formatCurrencyNumber(amount: number | string): number {
  if (typeof amount === "number") return amount;
  const cleaned = String(amount).replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}

function workbookToBlob(wb: XLSX.WorkBook): Blob {
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadExcelBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildHeaderRows(title: string, subtitle: string, company: CompanyContext): (string | number)[][] {
  const orgName = company.legalName || company.name || "SWIFT HRMS";
  const meta = [
    company.gstin ? `GSTIN: ${company.gstin}` : "",
    `Generated: ${new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    "SWIFT AI Copilot HRMS",
  ]
    .filter(Boolean)
    .join("  |  ");

  return [
    [orgName],
    [meta],
    [title],
    [subtitle],
    [], // Spacer row
  ];
}

/**
 * Generates Excel spreadsheet for Master Employee Registry
 */
export function generateEmployeesExcel(company: CompanyContext, employees: any[]): Blob {
  const wb = XLSX.utils.book_new();
  const headerRows = buildHeaderRows(
    "Employee Master Registry",
    `Total Active Staff: ${employees.length} Members`,
    company
  );

  const columns = [
    "#",
    "Employee Name",
    "Employee ID",
    "Department",
    "Designation",
    "Basic Salary (INR)",
    "Monthly CTC (INR)",
    "Status",
    "Email",
    "Phone",
    "Branch",
  ];

  const dataRows = employees.map((e, idx) => [
    idx + 1,
    e.name || "N/A",
    e.empCode || "N/A",
    e.department || "General",
    e.designation || "Staff",
    formatCurrencyNumber(e.basicSalary || e.salary || 15000),
    formatCurrencyNumber(e.monthlyCtc || Math.round((e.basicSalary || 15000) * 1.094)),
    e.status === "active" ? "Active" : "Inactive",
    e.email || "-",
    e.phone || "-",
    e.branch || "Headquarters",
  ]);

  const allRows = [...headerRows, columns, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Employee Directory");
  return workbookToBlob(wb);
}

/**
 * Generates Excel spreadsheet for Attendance & Punctuality Report
 */
export function generateAttendanceExcel(
  company: CompanyContext,
  monthlyReport: any,
  todayLiveRoster?: any[]
): Blob {
  const wb = XLSX.utils.book_new();
  const period = monthlyReport?.period || "Last 30 Days";
  const headerRows = buildHeaderRows(
    "Monthly Attendance & Punctuality Report",
    `Attendance Period: ${period}`,
    company
  );

  const breakdown = monthlyReport?.employeeBreakdown || todayLiveRoster || [];
  const columns = [
    "#",
    "Employee Name",
    "Employee ID",
    "Department",
    "Working Days",
    "Present Days",
    "Absent Days",
    "Leaves",
    "Late Days",
    "Worked Hours",
    "Overtime Hours",
    "Attendance Rate (%)",
  ];

  const dataRows = breakdown.map((e: any, idx: number) => [
    idx + 1,
    e.name || "N/A",
    e.empCode || "N/A",
    e.department || "General",
    e.workingDays ?? e.totalWorkingDays ?? 26,
    e.presentDays ?? (e.isPresent ? 1 : 0),
    e.absentDays ?? (e.isAbsentOrNotPunched ? 1 : 0),
    e.leaveDays ?? 0,
    e.lateDays ?? (e.isLate ? 1 : 0),
    e.totalWorkedHours ?? 0,
    e.totalOtHours ?? 0,
    e.attendancePercentage ?? (e.isPresent ? 100 : 0),
  ]);

  const allRows = [...headerRows, columns, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
  return workbookToBlob(wb);
}

/**
 * Generates Excel spreadsheet for Salary & Compensation Summary
 */
export function generateSalaryExcel(company: CompanyContext, employees: any[]): Blob {
  const wb = XLSX.utils.book_new();
  const totalCtc = employees.reduce(
    (sum, e) => sum + (e.monthlyCtc || Math.round((e.basicSalary || 15000) * 1.094)),
    0
  );
  const avgCtc = employees.length ? Math.round(totalCtc / employees.length) : 0;

  const headerRows = buildHeaderRows(
    "Executive Salary & Payroll Summary",
    `Total Employees: ${employees.length}  |  Total Monthly CTC: Rs. ${totalCtc.toLocaleString("en-IN")}  |  Avg CTC: Rs. ${avgCtc.toLocaleString("en-IN")}`,
    company
  );

  const columns = [
    "#",
    "Employee Name",
    "Employee ID",
    "Department",
    "Designation",
    "Basic Salary (INR)",
    "Monthly CTC (INR)",
    "Estimated Annual CTC (INR)",
    "Status",
  ];

  const dataRows = employees.map((e, idx) => {
    const basic = formatCurrencyNumber(e.basicSalary || e.salary || 15000);
    const ctc = formatCurrencyNumber(e.monthlyCtc || Math.round(basic * 1.094));
    return [
      idx + 1,
      e.name || "N/A",
      e.empCode || "N/A",
      e.department || "General",
      e.designation || "Staff",
      basic,
      ctc,
      ctc * 12,
      e.status === "active" ? "Active" : "Inactive",
    ];
  });

  const allRows = [...headerRows, columns, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Salary Register");
  return workbookToBlob(wb);
}

/**
 * Structured Employee List Excel (Absent, Late, Confirmation, Active, etc.)
 */
export function generateStructuredEmployeeListExcel(
  company: CompanyContext,
  data: Extract<AIStructuredData, { type: "EMPLOYEE_LIST" }>
): Blob {
  const wb = XLSX.utils.book_new();
  const title = data.title || "Employee List";
  const subtitle = data.subtitle || `Total: ${data.count ?? data.employees.length} employees`;
  const headerRows = buildHeaderRows(title, subtitle, company);

  const columns = [
    "#",
    "Employee Name",
    "Employee ID",
    "Department",
    "Designation",
    "Status / Badge",
    "Check-In / Details",
    "Email",
    "Phone",
  ];

  const dataRows = data.employees.map((e, idx) => [
    idx + 1,
    e.name || "N/A",
    e.empCode || "N/A",
    e.department || "General",
    e.designation || "Staff",
    e.badge || e.status || "Active",
    e.checkIn ? `Check-in: ${e.checkIn}` : "-",
    (e as any).email || "-",
    (e as any).phone || "-",
  ]);

  const allRows = [...headerRows, columns, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 28 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Employee List");
  return workbookToBlob(wb);
}

/**
 * Structured Attendance Summary Excel (Daily metrics, Absent list, Late list)
 */
export function generateStructuredAttendanceSummaryExcel(
  company: CompanyContext,
  data: Extract<AIStructuredData, { type: "ATTENDANCE_SUMMARY" }>
): Blob {
  const wb = XLSX.utils.book_new();
  const title = data.title || "Attendance Summary";
  const m = data.metrics;
  const subtitle = `Date: ${data.date} · Overall Attendance Rate: ${m.attendanceRatePct ?? 0}%`;
  const headerRows = buildHeaderRows(title, subtitle, company);

  // Overview metrics table
  const metricsRows: (string | number)[][] = [
    ["Attendance Metrics Overview", ""],
    ["Scheduled", m.totalScheduled ?? "-"],
    ["Present", m.present ?? 0],
    ["Absent", m.absent ?? 0],
    ["Late", m.late ?? 0],
    ["On Leave", m.onLeave ?? 0],
    ["Attendance Rate (%)", `${m.attendanceRatePct ?? 0}%`],
    [],
  ];

  const absentSection: (string | number)[][] = [];
  if (data.absentEmployees && data.absentEmployees.length > 0) {
    absentSection.push([`Absent Employees (${data.absentEmployees.length})`]);
    absentSection.push(["#", "Employee Name", "Employee ID", "Department", "Designation", "Status"]);
    data.absentEmployees.forEach((e, idx) => {
      absentSection.push([
        idx + 1,
        e.name,
        e.empCode,
        e.department || "General",
        e.designation || "Staff",
        "Absent",
      ]);
    });
    absentSection.push([]);
  }

  const lateSection: (string | number)[][] = [];
  if (data.lateEmployees && data.lateEmployees.length > 0) {
    lateSection.push([`Late Check-Ins (${data.lateEmployees.length})`]);
    lateSection.push(["#", "Employee Name", "Employee ID", "Department", "Check-In Time Recorded"]);
    data.lateEmployees.forEach((e, idx) => {
      lateSection.push([
        idx + 1,
        e.name,
        e.empCode,
        e.department || "General",
        e.checkIn || "Late",
      ]);
    });
  }

  const allRows = [...headerRows, ...metricsRows, ...absentSection, ...lateSection];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Attendance Summary");
  return workbookToBlob(wb);
}

/**
 * Structured Employee Details Excel (Single profile key-values)
 */
export function generateStructuredEmployeeDetailsExcel(
  company: CompanyContext,
  data: Extract<AIStructuredData, { type: "EMPLOYEE_DETAILS" }>
): Blob {
  const wb = XLSX.utils.book_new();
  const emp = data.employee;
  const att = data.attendanceSummary;
  const title = `Employee Profile — ${emp.name}`;
  const subtitle = `${emp.empCode} · ${emp.department || "General"} · ${emp.designation || "Staff"}`;
  const headerRows = buildHeaderRows(title, subtitle, company);

  const profileRows: (string | number)[][] = [
    ["Attribute", "Details"],
    ["Employee Name", emp.name],
    ["Employee ID", emp.empCode],
    ["System Reference ID", emp.id || "-"],
    ["Department", emp.department || "General"],
    ["Designation", emp.designation || "Staff"],
    ["Branch Location", emp.branch || "Headquarters"],
    ["Employment Status", (emp.status || "Active").toUpperCase()],
    ["Official Email", emp.email || "N/A"],
    ["Phone Number", emp.phone || "N/A"],
    ["Date of Joining", emp.doj || "N/A"],
    ["Face Registration", emp.isFaceRegistered ? "Enrolled" : "Pending"],
    ["Basic Salary (INR)", formatCurrencyNumber(emp.basicSalary || 15000)],
    ["Today Punctuality Status", att?.todayStatus || "Present"],
    ["Check-In Punch Time", att?.checkIn || "N/A"],
    ["30-Day Attendance Rate", `${att?.attendancePct ?? 100}%`],
    ["30-Day Present Days", att?.presentDays30d ?? "-"],
    ["30-Day Absent Days", att?.absentDays30d ?? "-"],
  ];

  const allRows = [...headerRows, ...profileRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [{ wch: 28 }, { wch: 36 }];

  XLSX.utils.book_append_sheet(wb, ws, "Employee Profile");
  return workbookToBlob(wb);
}

/**
 * Structured Leave Summary Excel
 */
export function generateStructuredLeaveSummaryExcel(
  company: CompanyContext,
  data: Extract<AIStructuredData, { type: "LEAVE_SUMMARY" }>
): Blob {
  const wb = XLSX.utils.book_new();
  const title = data.title || "Leave Requests Summary";
  const subtitle = `Total Pending Approvals: ${data.pendingCount || 0}`;
  const headerRows = buildHeaderRows(title, subtitle, company);

  const columns = [
    "#",
    "Employee Name",
    "Employee ID",
    "Leave Type",
    "Start Date",
    "End Date",
    "Duration (Days)",
    "Approval Status",
    "Reason",
  ];

  const dataRows = data.leaves.map((l, idx) => [
    idx + 1,
    l.employeeName,
    l.empCode || "N/A",
    l.type,
    l.startDate,
    l.endDate,
    l.days,
    l.status.toUpperCase(),
    l.reason || "N/A",
  ]);

  const allRows = [...headerRows, columns, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 36 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Leave Summary");
  return workbookToBlob(wb);
}

/**
 * Structured Payroll Summary Excel
 */
export function generateStructuredPayrollSummaryExcel(
  company: CompanyContext,
  data: Extract<AIStructuredData, { type: "PAYROLL_SUMMARY" }>
): Blob {
  const wb = XLSX.utils.book_new();
  const title = data.title || "Payroll Liability Summary";
  const subtitle = `Payroll Month: ${data.month} · Total Employees: ${data.totalEmployees}`;
  const headerRows = buildHeaderRows(title, subtitle, company);

  const summarySection: (string | number)[][] = [
    ["Payroll Metric", "Amount / Count"],
    ["Payroll Cycle Month", data.month],
    ["Total Gross Liability (INR)", formatCurrencyNumber(data.totalGrossLiability)],
    ["Average Monthly CTC (INR)", formatCurrencyNumber(data.averageCtc)],
    ["Total PF Liability (INR)", formatCurrencyNumber(data.pfDeductionTotal)],
    ["Total ESI Liability (INR)", formatCurrencyNumber(data.esiDeductionTotal)],
    ["Total Covered Employees", data.totalEmployees],
    [],
  ];

  const empSection: (string | number)[][] = [];
  if (data.employees && data.employees.length > 0) {
    empSection.push(["Employee Payroll Breakdown"]);
    empSection.push([
      "#",
      "Employee Name",
      "Employee ID",
      "Department",
      "Basic Salary (INR)",
      "Monthly CTC (INR)",
    ]);
    data.employees.forEach((e, idx) => {
      empSection.push([
        idx + 1,
        e.name,
        e.empCode,
        e.department,
        formatCurrencyNumber(e.basic),
        formatCurrencyNumber(e.ctc),
      ]);
    });
  }

  const allRows = [...headerRows, ...summarySection, ...empSection];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Payroll Summary");
  return workbookToBlob(wb);
}

/**
 * Generic AI Report Excel Generator from Markdown Content / Tables / Bullet Points
 */
export function generateAiReportExcel(
  title: string,
  markdownContent: string,
  company: CompanyContext
): Blob {
  const wb = XLSX.utils.book_new();
  const headerRows = buildHeaderRows(title, "Generated via SWIFT AI HRMS Engine", company);

  const lines = markdownContent.split("\n");
  const tableLines = lines.filter((l) => l.trim().startsWith("|") && l.includes("|"));
  const nonTableLines = lines
    .filter((l) => !l.trim().startsWith("|") || !l.includes("|"))
    .map((l) => l.replace(/[*_#`]/g, "").trim())
    .filter(Boolean);

  const sheetRows: (string | number)[][] = [...headerRows];

  // If table exists in markdown
  if (tableLines.length >= 3) {
    // Render introductory lines first
    if (nonTableLines.length > 0) {
      nonTableLines.slice(0, 6).forEach((txt) => {
        sheetRows.push([txt]);
      });
      sheetRows.push([]);
    }

    const rawHead = tableLines[0]
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    const rawRows = tableLines.slice(2).map((row) =>
      row
        .split("|")
        .map((c) => {
          const val = c.trim();
          const num = parseFloat(val.replace(/[^0-9.-]/g, ""));
          return !isNaN(num) && /^[0-9.,\s%₹Rs]+$/.test(val) ? num : val;
        })
        .filter((c) => c !== "")
    );

    sheetRows.push(rawHead);
    rawRows.forEach((r) => sheetRows.push(r));
  } else {
    // Conversational text, bullet points, findings, or anomaly report
    sheetRows.push(["AI Analysis & HRMS Insights", ""]);
    sheetRows.push([]);

    nonTableLines.forEach((line) => {
      // Check for bullet items or key-value pairs
      if (line.includes(":") && !line.startsWith("http")) {
        const parts = line.split(":");
        sheetRows.push([parts[0].trim(), parts.slice(1).join(":").trim()]);
      } else if (line.startsWith("-") || line.startsWith("•")) {
        sheetRows.push(["•", line.replace(/^[-•]\s*/, "").trim()]);
      } else {
        sheetRows.push([line]);
      }
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!cols"] = [
    { wch: 28 },
    { wch: 45 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "SWIFT Report");
  return workbookToBlob(wb);
}
