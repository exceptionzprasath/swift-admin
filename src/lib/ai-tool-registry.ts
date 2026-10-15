import JSZip from "jszip";
import {
  generateEmployeesPdf,
  generateAttendancePdf,
  generateSalaryPdf,
  generateAiReportPdf,
  generateStructuredEmployeeListPdf,
  generateStructuredAttendanceSummaryPdf,
  generateStructuredEmployeeDetailsPdf,
  generateStructuredLeaveSummaryPdf,
  generateStructuredPayrollSummaryPdf,
  downloadPdfBlob,
} from "./ai-pdf-reports";
import {
  generateEmployeesExcel,
  generateAttendanceExcel,
  generateSalaryExcel,
  generateAiReportExcel,
  generateStructuredEmployeeListExcel,
  generateStructuredAttendanceSummaryExcel,
  generateStructuredEmployeeDetailsExcel,
  generateStructuredLeaveSummaryExcel,
  generateStructuredPayrollSummaryExcel,
  downloadExcelBlob,
} from "./ai-excel-reports";
import { parseComplianceCommand, renderComplianceDocPDF } from "./compliance-docs";
import { useComplianceDocs, blobToDataUrl } from "./compliance-docs-store";
import { buildEnterpriseSnapshot } from "./ai-knowledge";
import type { AIDocumentMeta, AIStructuredData } from "./ai-unified-types";
import { AIQueryEngine } from "./ai-query-engine";
import { downloadWageRegisterExcel } from "./wage-register-excel";
import { generateSalarySlipPDF } from "./pdf";
import { computePayroll } from "./payroll";
import { downloadEpfoEcrXlsx } from "./epfo-ecr";

export interface ToolExecutionContext {
  company: any;
  employees: any[];
  attendance: any[];
  payrolls: any[];
  leaves: any[];
  docRequests?: any[];
  role?: string;
  viewerEmployeeId?: string;
}

/**
 * Intelligently extracts or computes the target YYYY-MM from user query text.
 * Understands "last month", "this month", "previous month", month names ("September", "Aug 2026"), and YYYY-MM formats.
 */
export function resolveTargetMonth(query: string): string {
  const q = query.toLowerCase();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-indexed (e.g. 9 for October)

  // 1. Explicit relative keywords
  if (/\b(last\s+month|previous\s+month|past\s+month|prior\s+month)\b/i.test(q)) {
    const prevDate = new Date(currentYear, currentMonthIdx - 1, 1);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  if (/\b(this\s+month|current\s+month)\b/i.test(q)) {
    const m = String(currentMonthIdx + 1).padStart(2, "0");
    return `${currentYear}-${m}`;
  }
  if (/\b(next\s+month)\b/i.test(q)) {
    const nextDate = new Date(currentYear, currentMonthIdx + 1, 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  // 2. Format YYYY-MM or YYYY/MM (e.g. 2026-09, 2026/09)
  const yyyyMm = q.match(/\b(202\d)[-/](0[1-9]|1[0-2])\b/);
  if (yyyyMm) {
    return `${yyyyMm[1]}-${yyyyMm[2]}`;
  }

  // 3. Format MM-YYYY or MM/YYYY (e.g. 09-2026, 09/2026)
  const mmYyyy = q.match(/\b(0[1-9]|1[0-2])[-/](202\d)\b/);
  if (mmYyyy) {
    return `${mmYyyy[2]}-${mmYyyy[1]}`;
  }

  // 4. Named months (e.g. "september 2026", "august", "sep")
  const MONTHS: Record<string, number> = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  };

  for (const [mName, mNum] of Object.entries(MONTHS)) {
    const regex = new RegExp(`\\b${mName}\\b`, "i");
    if (regex.test(q)) {
      const yearMatch = q.match(/\b(202\d)\b/);
      const targetYear = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;
      return `${targetYear}-${String(mNum).padStart(2, "0")}`;
    }
  }

  // Default to current month
  return `${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}`;
}

export function isReportQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (/^(?:hi|hello|hey|thanks|thank you|ok|okay|bye)$/i.test(lower)) return false;
  if (/(?:api\s*key|password|\.env|credential|token|system\s*prompt|source\s*code)/i.test(lower)) return false;
  return /\b(generate\s+report|download\s+report|export\s+report|pdf\s+report|excel\s+report|statutory\s+report|export\s+to\s+pdf|download\s+pdf|export\s+to\s+excel|download\s+excel|excel\s+sheet|download\s+as\s+excel)\b/i.test(
    lower
  );
}

export class AIToolRegistry {
  private static executedActionIds = new Set<string>();

  /**
   * Executes official 50-column Statutory Wage Register Excel download.
   */
  static executeWageRegisterDownload(
    query: string,
    context: ToolExecutionContext,
    actionId?: string
  ): { resultText: string; docMeta: AIDocumentMeta; filename: string } {
    if (actionId && this.executedActionIds.has(actionId)) {
      return {
        resultText: "Wage Register downloaded.",
        docMeta: { title: "Wage Register", filename: "wage_register.xlsx", docType: "excel" },
        filename: "wage_register.xlsx",
      };
    }
    if (actionId) this.executedActionIds.add(actionId);

    const selectedMonth = resolveTargetMonth(query);

    downloadWageRegisterExcel({
      company: context.company,
      employees: context.employees || [],
      attendance: context.attendance || [],
      roster: (context as any).roster || [],
      requests: (context as any).requests || [],
      monthlyOverrides: (context as any).monthlyOverrides || {},
      selectedMonth,
    });

    const companyClean = (context.company?.name || "Company").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${companyClean}_Wage_Register_${selectedMonth}.xlsx`;

    const resultText = `📊 **Statutory Wage Register Downloaded**\n\nThe complete **50-column Statutory Wage Register** for **${selectedMonth}** has been generated and downloaded to your device as an Excel spreadsheet (.xlsx).\n\n• **Includes:** Worked Days, PF & ESI Qualifying Wages, Employee Deductions (EPF 12%, ESI 0.75%, PT, Advance, TDS), Net Take-Home Pay, Employer Shares (13% EPF & 3.25% ESI), UAN, ESIC No., and Bank Disbursement Accounts.`;

    return {
      resultText,
      filename,
      docMeta: {
        title: `Wage Register (${selectedMonth})`,
        filename,
        docType: "excel",
      },
    };
  }

  /**
   * Executes official Payslip PDF generation and browser download using actual payroll data.
   */
  static async executePayslipDownload(
    query: string,
    context: ToolExecutionContext,
    actionId?: string
  ): Promise<{ resultText: string; docMeta: AIDocumentMeta; filename: string } | null> {
    if (actionId && this.executedActionIds.has(actionId)) {
      return {
        resultText: "Payslip downloaded.",
        docMeta: { title: "Payslip", filename: "payslip.pdf", docType: "pdf" },
        filename: "payslip.pdf",
      };
    }
    if (actionId) this.executedActionIds.add(actionId);

    const employees = context.employees || [];
    let targetEmp: any = null;

    for (const emp of employees) {
      const codeRegex = new RegExp(`\\b${emp.empCode}\\b`, "i");
      if (emp.empCode && codeRegex.test(query)) {
        targetEmp = emp;
        break;
      }
      const nameLower = (emp.name || "").toLowerCase();
      if (nameLower && query.toLowerCase().includes(nameLower)) {
        targetEmp = emp;
        break;
      }
      const parts = nameLower.split(/\s+/).filter((p: string) => p.length >= 3);
      if (parts.length > 0 && parts.some((p: string) => new RegExp(`\\b${p}\\b`, "i").test(query))) {
        targetEmp = emp;
        break;
      }
    }

    if (!targetEmp && context.viewerEmployeeId) {
      targetEmp = employees.find((e) => e.id === context.viewerEmployeeId);
    }
    if (!targetEmp && employees.length > 0) {
      targetEmp = employees[0];
    }

    if (!targetEmp) return null;

    const selectedMonth = resolveTargetMonth(query);
    const [y, m] = selectedMonth.split("-");
    const monthDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    const monthName = monthDate.toLocaleDateString("en-US", { month: "long" }).toLowerCase();

    // 1. Check if a saved payroll run exists for this employee in selectedMonth
    const existingPayroll = (context.payrolls || []).find((p: any) => {
      const matchesEmp = p.employeeId === targetEmp.id || p.empCode === targetEmp.empCode;
      if (!matchesEmp) return false;
      const pMonth = (p.month || "").toLowerCase();
      const pId = (p.id || "").toLowerCase();
      return (
        pMonth === selectedMonth ||
        pMonth.includes(selectedMonth) ||
        pMonth.includes(monthName) ||
        pId.includes(selectedMonth)
      );
    });

    let comp: any;
    let paidDays: number;
    let weekOffDays: number;

    if (existingPayroll?.computed) {
      // Use the authoritative calculated payroll record from the Payroll module
      comp = existingPayroll.computed;
      paidDays = existingPayroll.daysWorked !== undefined 
        ? existingPayroll.daysWorked 
        : (existingPayroll.computed?.daysWorked !== undefined 
            ? existingPayroll.computed.daysWorked 
            : (context.company?.workingDaysPerMonth || 26));
      weekOffDays = existingPayroll.overrideData?.weekOffDays !== undefined 
        ? existingPayroll.overrideData.weekOffDays 
        : 4;
    } else {
      // Derive accurately from live attendance in selectedMonth matching admin.payroll.tsx exactly
      const monthAtt = (context.attendance || []).filter((a) => {
        if (a.employeeId !== targetEmp.id && a.employeeName !== targetEmp.name) return false;
        return a.date && a.date.startsWith(selectedMonth);
      });

      const daysPresent = monthAtt.filter((a) => a.status === "present").length;
      const daysHalf = monthAtt.filter((a) => a.status === "half-day").length;
      const daysLeave = monthAtt.filter((a) => a.status === "leave").length;
      const actualPresent = daysPresent + daysLeave + daysHalf * 0.5;

      const ov = (context.payrolls || []).find((p: any) => {
        const matchesEmp = p.employeeId === targetEmp.id || p.empCode === targetEmp.empCode;
        if (!matchesEmp) return false;
        const pMonth = (p.month || "").toLowerCase();
        return pMonth === selectedMonth || pMonth.includes(selectedMonth) || pMonth.includes(monthName);
      })?.overrideData || (context.payrolls || []).find((p: any) => p.employeeId === targetEmp.id)?.overrideData || {};

      paidDays = ov.daysWorked !== undefined ? ov.daysWorked : (monthAtt.length > 0 ? actualPresent : (context.company?.workingDaysPerMonth || 26));
      weekOffDays = ov.weekOffDays !== undefined ? ov.weekOffDays : 4;
      const otHours = ov.otStatus === "approved" ? (ov.otApprovedHours || ov.otHours || 0) : 0;

      const effectiveEmp = ov.customBasic ? { ...targetEmp, basic: ov.customBasic, fixedSalary: ov.customBasic } : targetEmp;

      comp = computePayroll({
        company: context.company,
        employee: effectiveEmp,
        daysWorked: paidDays,
        otHours,
        shiftDays: paidDays,
        incentive: ov.incentive || 0,
        loan: ov.loan || 0,
        advance: ov.advance || 0,
        bonus: ov.bonus || 0,
      });
    }

    await generateSalarySlipPDF(
      context.company,
      targetEmp,
      selectedMonth,
      comp,
      paidDays,
      weekOffDays,
      context.company?.documentAssets || context.company?.logoDataUrl
    );

    const safeEmpCode = (targetEmp.empCode || "EMP").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Payslip_${safeEmpCode}_${selectedMonth}.pdf`;

    const resultText = `📄 **Salary Slip (Payslip) PDF Downloaded**\n\nThe official monthly salary slip for **${targetEmp.name} (${targetEmp.empCode})** for **${selectedMonth}** has been generated and downloaded to your device with exact attendance calculations, actual deductions, and corporate branding.\n\n• **Paid Days:** ${paidDays} days\n• **Gross Earned:** ₹${Math.round(comp.gross || 0).toLocaleString("en-IN")}\n• **Net Take-Home:** ₹${Math.round(comp.net || 0).toLocaleString("en-IN")}`;

    return {
      resultText,
      filename,
      docMeta: {
        title: `Payslip — ${targetEmp.name} (${selectedMonth})`,
        filename,
        docType: "pdf",
      },
    };
  }

  /**
   * Executes EPFO ECR Excel download.
   */
  static executeEpfoEcrDownload(
    query: string,
    context: ToolExecutionContext,
    actionId?: string
  ): { resultText: string; docMeta: AIDocumentMeta; filename: string } {
    if (actionId && this.executedActionIds.has(actionId)) {
      return {
        resultText: "EPFO ECR downloaded.",
        docMeta: { title: "EPFO ECR", filename: "epfo_ecr.xlsx", docType: "excel" },
        filename: "epfo_ecr.xlsx",
      };
    }
    if (actionId) this.executedActionIds.add(actionId);

    const selectedMonth = resolveTargetMonth(query);

    downloadEpfoEcrXlsx({
      company: context.company,
      employees: context.employees || [],
      attendance: context.attendance || [],
      selectedMonth,
    });

    const companyClean = (context.company?.name || "Company").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${companyClean}_EPFO_ECR_${selectedMonth}.xlsx`;

    const resultText = `🏛️ **EPFO ECR Spreadsheet Downloaded**\n\nThe monthly **EPFO Electronic Challan cum Return (ECR)** file for **${selectedMonth}** has been generated and downloaded with formatted text UANs, Gross wages, and EPF/EPS/EDLI contributions.`;

    return {
      resultText,
      filename,
      docMeta: {
        title: `EPFO ECR (${selectedMonth})`,
        filename,
        docType: "excel",
      },
    };
  }

  /**
   * Executes compliance document bundle generation tool.
   */
  static async executeComplianceBundle(
    text: string,
    context: ToolExecutionContext,
    actionId?: string
  ): Promise<{ resultText: string; docMeta?: AIDocumentMeta } | null> {
    const specs = parseComplianceCommand(text);
    if (!specs.length) return null;

    if (actionId && this.executedActionIds.has(actionId)) {
      return null;
    }
    if (actionId) this.executedActionIds.add(actionId);

    const zip = new JSZip();
    const lines: string[] = [];
    const archive = useComplianceDocs.getState().archive;

    for (const s of specs) {
      const { blob, filename, ref } = await renderComplianceDocPDF(s, {
        company: context.company,
        employees: context.employees,
      });
      zip.file(filename, blob);
      const dataUrl = await blobToDataUrl(blob);

      archive({
        specId: s.id,
        code: s.code,
        title: s.title,
        ref,
        filename,
        dataUrl,
        size: blob.size,
        createdBy: "swift-ai-unified",
        approvals: [],
        signed: false,
        sealed: !!s.requiresSeal,
        watermark: s.watermark,
        tags: [s.act, s.kind],
      });

      lines.push(`- **${s.code}** — ${s.title} · ${(blob.size / 1024).toFixed(1)} KB · Ref \`${ref}\``);
    }

    const bundle = await zip.generateAsync({ type: "blob" });
    const filename = `SWIFT_AI_Docs_${Date.now()}.zip`;
    const url = URL.createObjectURL(bundle);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    const resultText = `✅ Generated **${specs.length}** compliance document(s), auto-filled from your live tenant data. Bundle downloaded and archived in **Compliance Docs**.\n\n${lines.join("\n")}`;

    return {
      resultText,
      docMeta: {
        title: `Compliance Bundle (${specs.length} docs)`,
        filename,
        size: bundle.size,
        docType: "zip",
      },
    };
  }

  /**
   * Executes PDF document generation tool.
   * Faithfully produces a PDF report matching the exact information in the AI chat response.
   */
  static executePdfReport(
    query: string,
    context: ToolExecutionContext,
    rawContent?: string,
    structuredData?: AIStructuredData,
    actionId?: string
  ): { docMeta: AIDocumentMeta; filename: string } {
    if (actionId && this.executedActionIds.has(actionId)) {
      return {
        docMeta: { title: "Generated Document", filename: "report.pdf", docType: "pdf" },
        filename: "report.pdf",
      };
    }
    if (actionId) this.executedActionIds.add(actionId);

    const snapshot = buildEnterpriseSnapshot({
      company: context.company,
      employees: context.employees,
      attendance: context.attendance,
      payrolls: context.payrolls,
      leaves: context.leaves,
      docRequests: context.docRequests || [],
      role: (context.role as any) || "admin",
      viewerEmployeeId: context.viewerEmployeeId,
    });

    let blob: Blob;
    let filename = `SWIFT_AI_Report_${snapshot.today}.pdf`;
    let title = "SWIFT AI HRMS Report";

    // 1. Resolve structured data if provided or if deterministic engine resolves it
    let effectiveStructured = structuredData;
    if (!effectiveStructured && query) {
      const res = AIQueryEngine.resolveQuery(query, context);
      if (res.handled && res.structuredData) {
        effectiveStructured = res.structuredData;
      }
    }

    if (effectiveStructured) {
      switch (effectiveStructured.type) {
        case "EMPLOYEE_LIST": {
          blob = generateStructuredEmployeeListPdf(context.company, effectiveStructured);
          const safeTitle = (effectiveStructured.title || "Employee_List").replace(/[^a-zA-Z0-9]/g, "_");
          filename = `${safeTitle}_${snapshot.today}.pdf`;
          title = effectiveStructured.title;
          break;
        }
        case "ATTENDANCE_SUMMARY": {
          blob = generateStructuredAttendanceSummaryPdf(context.company, effectiveStructured);
          const safeTitle = (effectiveStructured.title || "Attendance_Summary").replace(/[^a-zA-Z0-9]/g, "_");
          filename = `${safeTitle}_${snapshot.today}.pdf`;
          title = effectiveStructured.title;
          break;
        }
        case "EMPLOYEE_DETAILS": {
          blob = generateStructuredEmployeeDetailsPdf(context.company, effectiveStructured);
          const empCode = effectiveStructured.employee.empCode || "Details";
          filename = `Employee_Profile_${empCode}_${snapshot.today}.pdf`;
          title = `Employee Profile — ${effectiveStructured.employee.name}`;
          break;
        }
        case "LEAVE_SUMMARY": {
          blob = generateStructuredLeaveSummaryPdf(context.company, effectiveStructured);
          filename = `Leave_Summary_${snapshot.today}.pdf`;
          title = effectiveStructured.title;
          break;
        }
        case "PAYROLL_SUMMARY": {
          blob = generateStructuredPayrollSummaryPdf(context.company, effectiveStructured);
          filename = `Payroll_Summary_${effectiveStructured.month || snapshot.today}.pdf`;
          title = effectiveStructured.title;
          break;
        }
        default: {
          blob = generateAiReportPdf(query || "SWIFT HRMS Report", rawContent || query, context.company);
          filename = `HRMS_Report_${snapshot.today}.pdf`;
          title = query || "SWIFT HRMS Report";
          break;
        }
      }
    } else {
      // 2. Pure markdown / text content: render the exact message content
      const contentToUse = rawContent || query;
      const lower = query.toLowerCase();
      if (lower.includes("monthly attendance") || lower.includes("attendance register") || lower.includes("30-day attendance")) {
        blob = generateAttendancePdf(context.company, snapshot.attendance.monthlyReport, snapshot.attendance.todayLiveRoster);
        filename = `Monthly_Attendance_Report_${snapshot.today}.pdf`;
        title = `Monthly Attendance Report — ${snapshot.today}`;
      } else if (lower.includes("master salary") || lower.includes("payroll register")) {
        blob = generateSalaryPdf(context.company, snapshot.employees);
        filename = `Salary_Summary_${snapshot.today}.pdf`;
        title = `Salary & Payroll Summary — ${snapshot.today}`;
      } else if (lower.includes("all employees directory") || lower.includes("master employee list")) {
        blob = generateEmployeesPdf(context.company, snapshot.employees);
        filename = `Employee_Master_Registry_${snapshot.today}.pdf`;
        title = `Employee Master Registry — ${snapshot.today}`;
      } else {
        blob = generateAiReportPdf(query || "SWIFT AI Report", contentToUse, context.company);
        const safeTitle = (query || "SWIFT_AI_Report").slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
        filename = `${safeTitle}_${snapshot.today}.pdf`;
        title = query || "SWIFT AI Report";
      }
    }

    downloadPdfBlob(blob, filename);

    return {
      filename,
      docMeta: {
        title,
        filename,
        size: blob.size,
        docType: "pdf",
      },
    };
  }

  /**
   * Executes Excel spreadsheet generation tool.
   * Faithfully produces an .xlsx spreadsheet matching the exact information in the AI chat response.
   */
  static executeExcelReport(
    query: string,
    context: ToolExecutionContext,
    rawContent?: string,
    structuredData?: AIStructuredData,
    actionId?: string
  ): { docMeta: AIDocumentMeta; filename: string } {
    if (actionId && this.executedActionIds.has(actionId)) {
      return {
        docMeta: { title: "Generated Spreadsheet", filename: "report.xlsx", docType: "excel" },
        filename: "report.xlsx",
      };
    }
    if (actionId) this.executedActionIds.add(actionId);

    const snapshot = buildEnterpriseSnapshot({
      company: context.company,
      employees: context.employees,
      attendance: context.attendance,
      payrolls: context.payrolls,
      leaves: context.leaves,
      docRequests: context.docRequests || [],
      role: (context.role as any) || "admin",
      viewerEmployeeId: context.viewerEmployeeId,
    });

    let blob: Blob;
    let filename = `SWIFT_AI_Report_${snapshot.today}.xlsx`;
    let title = "SWIFT AI HRMS Spreadsheet Report";

    // 1. Resolve structured data if provided or if deterministic engine resolves it
    let effectiveStructured = structuredData;
    if (!effectiveStructured && query) {
      const res = AIQueryEngine.resolveQuery(query, context);
      if (res.handled && res.structuredData) {
        effectiveStructured = res.structuredData;
      }
    }

    if (effectiveStructured) {
      switch (effectiveStructured.type) {
        case "EMPLOYEE_LIST": {
          blob = generateStructuredEmployeeListExcel(context.company, effectiveStructured);
          const safeTitle = (effectiveStructured.title || "Employee_List").replace(/[^a-zA-Z0-9]/g, "_");
          filename = `${safeTitle}_${snapshot.today}.xlsx`;
          title = effectiveStructured.title;
          break;
        }
        case "ATTENDANCE_SUMMARY": {
          blob = generateStructuredAttendanceSummaryExcel(context.company, effectiveStructured);
          const safeTitle = (effectiveStructured.title || "Attendance_Summary").replace(/[^a-zA-Z0-9]/g, "_");
          filename = `${safeTitle}_${snapshot.today}.xlsx`;
          title = effectiveStructured.title;
          break;
        }
        case "EMPLOYEE_DETAILS": {
          blob = generateStructuredEmployeeDetailsExcel(context.company, effectiveStructured);
          const empCode = effectiveStructured.employee.empCode || "Details";
          filename = `Employee_Profile_${empCode}_${snapshot.today}.xlsx`;
          title = `Employee Profile — ${effectiveStructured.employee.name}`;
          break;
        }
        case "LEAVE_SUMMARY": {
          blob = generateStructuredLeaveSummaryExcel(context.company, effectiveStructured);
          filename = `Leave_Summary_${snapshot.today}.xlsx`;
          title = effectiveStructured.title;
          break;
        }
        case "PAYROLL_SUMMARY": {
          blob = generateStructuredPayrollSummaryExcel(context.company, effectiveStructured);
          filename = `Payroll_Summary_${effectiveStructured.month || snapshot.today}.xlsx`;
          title = effectiveStructured.title;
          break;
        }
        default: {
          blob = generateAiReportExcel(query || "SWIFT HRMS Report", rawContent || query, context.company);
          filename = `HRMS_Report_${snapshot.today}.xlsx`;
          title = query || "SWIFT HRMS Report";
          break;
        }
      }
    } else {
      // 2. Pure markdown / text content
      const contentToUse = rawContent || query;
      const lower = query.toLowerCase();
      if (lower.includes("monthly attendance") || lower.includes("attendance register") || lower.includes("30-day attendance")) {
        blob = generateAttendanceExcel(context.company, snapshot.attendance.monthlyReport, snapshot.attendance.todayLiveRoster);
        filename = `Monthly_Attendance_Report_${snapshot.today}.xlsx`;
        title = `Monthly Attendance Report — ${snapshot.today}`;
      } else if (lower.includes("master salary") || lower.includes("payroll register")) {
        blob = generateSalaryExcel(context.company, snapshot.employees);
        filename = `Salary_Summary_${snapshot.today}.xlsx`;
        title = `Salary & Payroll Summary — ${snapshot.today}`;
      } else if (lower.includes("all employees directory") || lower.includes("master employee list")) {
        blob = generateEmployeesExcel(context.company, snapshot.employees);
        filename = `Employee_Master_Registry_${snapshot.today}.xlsx`;
        title = `Employee Master Registry — ${snapshot.today}`;
      } else {
        blob = generateAiReportExcel(query || "SWIFT AI Report", contentToUse, context.company);
        const safeTitle = (query || "SWIFT_AI_Report").slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
        filename = `${safeTitle}_${snapshot.today}.xlsx`;
        title = query || "SWIFT AI Report";
      }
    }

    downloadExcelBlob(blob, filename);

    return {
      filename,
      docMeta: {
        title,
        filename,
        size: blob.size,
        docType: "excel",
      },
    };
  }
}
