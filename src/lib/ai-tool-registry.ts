// SWIFT AI — Central Tool & Action Registry
import JSZip from "jszip";
import {
  generateEmployeesPdf,
  generateAttendancePdf,
  generateSalaryPdf,
  generateAiReportPdf,
  downloadPdfBlob,
} from "./ai-pdf-reports";
import { parseComplianceCommand, renderComplianceDocPDF } from "./compliance-docs";
import { useComplianceDocs, blobToDataUrl } from "./compliance-docs-store";
import { buildEnterpriseSnapshot } from "./ai-knowledge";
import type { AIDocumentMeta } from "./ai-unified-types";

export interface ToolExecutionContext {
  company: any;
  employees: any[];
  attendance: any[];
  payrolls: any[];
  leaves: any[];
  docRequests: any[];
  role?: string;
  viewerEmployeeId?: string;
}

export function isReportQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (/^(?:hi|hello|hey|thanks|thank you|ok|okay|bye)$/i.test(lower)) return false;
  if (/(?:api\s*key|password|\.env|credential|token|system\s*prompt|source\s*code)/i.test(lower)) return false;
  return /\b(generate\s+report|download\s+report|export\s+report|pdf\s+report|statutory\s+report|export\s+to\s+pdf|download\s+pdf)\b/i.test(
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
   */
  static executePdfReport(
    query: string,
    context: ToolExecutionContext,
    rawContent?: string,
    actionId?: string
  ): { docMeta: AIDocumentMeta; filename: string } {
    if (actionId && this.executedActionIds.has(actionId)) {
      return {
        docMeta: { title: "Generated Document", filename: "report.pdf", docType: "pdf" },
        filename: "report.pdf",
      };
    }
    if (actionId) this.executedActionIds.add(actionId);

    const lower = `${query} ${rawContent || ""}`.toLowerCase();
    const snapshot = buildEnterpriseSnapshot({
      company: context.company,
      employees: context.employees,
      attendance: context.attendance,
      payrolls: context.payrolls,
      leaves: context.leaves,
      docRequests: context.docRequests,
      role: (context.role as any) || "admin",
      viewerEmployeeId: context.viewerEmployeeId,
    });

    let blob: Blob;
    let filename = `SWIFT_AI_Report_${Date.now()}.pdf`;
    let title = "SWIFT AI HRMS Report";

    if (lower.includes("attendance") || lower.includes("absent") || lower.includes("present punches") || lower.includes("punctuality")) {
      blob = generateAttendancePdf(context.company, snapshot.attendance.monthlyReport, snapshot.attendance.todayLiveRoster);
      filename = `Attendance_Report_${snapshot.today}.pdf`;
      title = `Attendance Report — ${snapshot.today}`;
    } else if (lower.includes("salary") || lower.includes("ctc") || lower.includes("payroll") || lower.includes("compensation")) {
      blob = generateSalaryPdf(context.company, snapshot.employees);
      filename = `Salary_Summary_${snapshot.today}.pdf`;
      title = `Salary & Payroll Summary — ${snapshot.today}`;
    } else if (lower.includes("employee") || lower.includes("staff") || lower.includes("directory")) {
      blob = generateEmployeesPdf(context.company, snapshot.employees);
      filename = `Employee_Master_Registry_${snapshot.today}.pdf`;
      title = `Employee Master Registry — ${snapshot.today}`;
    } else {
      blob = generateAiReportPdf("SWIFT HRMS Report", rawContent || query, context.company);
      filename = `HRMS_Report_${snapshot.today}.pdf`;
      title = `HRMS Executive Report — ${snapshot.today}`;
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
}
