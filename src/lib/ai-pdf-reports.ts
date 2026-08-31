import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type CompanyContext = {
  name: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  phone?: string;
  email?: string;
};

function formatCurrency(amount: number | string): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, "")) || 0;
  return `Rs. ${num.toLocaleString("en-IN")}`;
}

function drawHeader(doc: jsPDF, title: string, subtitle: string, company: CompanyContext) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner Background
  doc.setFillColor(30, 41, 59); // Slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(company.legalName || company.name || "SHIFT HRMS", 14, 12);

  // Sub-header details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const orgSub = [
    company.gstin ? `GSTIN: ${company.gstin}` : "",
    `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
  ].filter(Boolean).join("  |  ");
  doc.text(orgSub, 14, 18);

  // Report Title Badge on right
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.roundedRect(pageWidth - 65, 8, 51, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("SWIFT AI REPORT", pageWidth - 60, 15.5);

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 14, 38);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 44);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 47, pageWidth - 14, 47);
}

function drawFooter(doc: jsPDF, reportType: string) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`CONFIDENTIAL · SWIFT HRMS Enterprise AI System · ${reportType}`, 14, pageHeight - 6);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 28, pageHeight - 6);
  }
}

/**
 * Generates and downloads Employee List / Details PDF
 */
export function generateEmployeesPdf(company: CompanyContext, employees: any[]): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawHeader(doc, "Employee Master Registry", `Total Active Staff: ${employees.length} Members`, company);

  const tableRows = employees.map((e, idx) => [
    idx + 1,
    e.name || "N/A",
    e.empCode || "N/A",
    e.department || "General",
    e.designation || "Staff",
    formatCurrency(e.basicSalary || e.salary || 15000),
    formatCurrency(e.monthlyCtc || Math.round((e.basicSalary || 15000) * 1.094)),
    e.status === "active" ? "Active" : "Inactive",
  ]);

  autoTable(doc, {
    startY: 52,
    head: [["#", "Employee Name", "ID", "Department", "Designation", "Basic Salary", "Monthly CTC", "Status"]],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc, "Employee Directory");
  return doc.output("blob");
}

/**
 * Generates and downloads Attendance Report PDF
 */
export function generateAttendancePdf(company: CompanyContext, monthlyReport: any, todayLiveRoster?: any[]): Blob {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const period = monthlyReport?.period || "Last 30 Days";
  drawHeader(doc, "Monthly Attendance & Punctuality Report", `Attendance Period: ${period}`, company);

  const breakdown = monthlyReport?.employeeBreakdown || todayLiveRoster || [];
  const tableRows = breakdown.map((e: any, idx: number) => [
    idx + 1,
    e.name || "N/A",
    e.empCode || "N/A",
    e.department || "General",
    e.totalWorkingDays ?? 26,
    e.presentDays ?? (e.isPresent ? 1 : 0),
    e.absentDays ?? (e.isAbsentOrNotPunched ? 1 : 0),
    e.leaveDays ?? 0,
    e.lateDays ?? (e.isLate ? 1 : 0),
    `${e.totalWorkedHours ?? 0} hrs`,
    `${e.totalOtHours ?? 0} hrs`,
    `${e.attendancePercentage ?? (e.isPresent ? 100 : 0)}%`,
  ]);

  autoTable(doc, {
    startY: 52,
    head: [["#", "Employee", "ID", "Department", "Working Days", "Present", "Absent", "Leaves", "Late Days", "Worked Hrs", "OT Hrs", "Attn %"]],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc, "Attendance & Punctuality Registry");
  return doc.output("blob");
}

/**
 * Generates and downloads Salary & Compensation Summary PDF
 */
export function generateSalaryPdf(company: CompanyContext, employees: any[]): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const totalCtc = employees.reduce((sum, e) => sum + (e.monthlyCtc || Math.round((e.basicSalary || 15000) * 1.094)), 0);
  const avgCtc = employees.length ? Math.round(totalCtc / employees.length) : 0;

  drawHeader(
    doc,
    "Executive Salary & Payroll Summary",
    `Total Employees: ${employees.length}  |  Total Monthly CTC: ${formatCurrency(totalCtc)}  |  Avg CTC: ${formatCurrency(avgCtc)}`,
    company
  );

  const tableRows = employees.map((e, idx) => [
    idx + 1,
    e.name || "N/A",
    e.empCode || "N/A",
    e.department || "General",
    e.designation || "Staff",
    formatCurrency(e.basicSalary || e.salary || 15000),
    formatCurrency(e.monthlyCtc || Math.round((e.basicSalary || 15000) * 1.094)),
  ]);

  autoTable(doc, {
    startY: 52,
    head: [["#", "Employee Name", "ID", "Department", "Designation", "Basic Salary", "Monthly CTC"]],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc, "Payroll & CTC Register");
  return doc.output("blob");
}

/**
 * Generic Report PDF Generator from Markdown / Table Data
 */
export function generateAiReportPdf(title: string, markdownContent: string, company: CompanyContext): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawHeader(doc, title, `Generated via SWIFT AI Engine`, company);

  const lines = markdownContent.split("\n");
  const tableLines = lines.filter((l) => l.trim().startsWith("|") && l.includes("|"));

  if (tableLines.length >= 3) {
    const rawHead = tableLines[0].split("|").map((c) => c.trim()).filter(Boolean);
    const rawRows = tableLines.slice(2).map((row) =>
      row.split("|").map((c) => c.trim()).filter(Boolean)
    );

    autoTable(doc, {
      startY: 52,
      head: [rawHead],
      body: rawRows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const cleanText = markdownContent.replace(/[*_#`|]/g, "").replace(/\n{2,}/g, "\n\n");
    const splitLines = doc.splitTextToSize(cleanText, 180);
    doc.text(splitLines, 14, 55);
  }

  drawFooter(doc, title);
  return doc.output("blob");
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
