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
