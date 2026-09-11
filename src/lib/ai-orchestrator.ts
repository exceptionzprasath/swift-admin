// SWIFT AI — Unified AI Orchestrator & Execution Engine
import { useUnifiedAiStore } from "./ai-unified-store";
import { aiEventBus } from "./ai-event-bus";
import { AIToolRegistry, isReportQuery } from "./ai-tool-registry";
import { AIQueryEngine } from "./ai-query-engine";
import { AIContextManager } from "./ai-context-manager";
import { buildEnterpriseSnapshot } from "./ai-knowledge";
import { askSwiftAi } from "./ai.functions";
import { aiGuide } from "./ai-guide-bus";
import { inspectUserInput } from "./ai-security";
import { AIIntentDetector, type IntentDetectionResult, type ExtractedEntities } from "./ai-intent-detector";
import { AIDataTools, type DataToolResult, type ToolExecutionContext } from "./ai-data-tools";
import { findKnowledgeMatch } from "./ai-hrms-knowledge";
import type { AIMessage, AIMessageSource, AIDocumentMeta } from "./ai-unified-types";
import type { Role } from "./ai-context";
import { toast } from "sonner";

export interface SendMessageOptions {
  source: AIMessageSource;
  forceFormat?: "pdf" | "excel" | "text";
  role?: Role;
  viewerEmployeeId?: string;
  context: ToolExecutionContext;
  serverFnAsk?: (args: { data: any }) => Promise<any>;
  documentMeta?: AIDocumentMeta;
  documentContent?: string;
  imageUrl?: string;
}

class AIOrchestrator {
  private inFlightRequests = new Set<string>();

  /**
   * Main entry point to send a message to SWIFT AI.
   * Both Live Brain and Copilot UI call this method.
   */
  async dispatchUserMessage(queryText: string, options: SendMessageOptions): Promise<void> {
    const text = queryText.trim();
    if (!text) return;

    const store = useUnifiedAiStore.getState();
    if (store.isGenerating) {
      toast.info("SWIFT AI is already processing a request. Please wait a moment.");
      return;
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (this.inFlightRequests.has(requestId)) {
      return;
    }
    this.inFlightRequests.add(requestId);

    try {
      await this.executePipeline(text, requestId, options);
    } finally {
      this.inFlightRequests.delete(requestId);
    }
  }

  private executeDataTool(
    intentRes: IntentDetectionResult,
    context: ToolExecutionContext
  ): DataToolResult | null {
    const { intent, entities, rawQuery } = intentRes;
    const lower = rawQuery.toLowerCase();

    switch (intent) {
      case "EMPLOYEE_INFORMATION":
        return AIDataTools.getEmployeeDetails(
          { name: entities.employeeName, employeeId: entities.employeeId },
          context
        );

      case "DAILY_ATTENDANCE_BASIC":
        return AIDataTools.getDailyAttendanceBasic(
          { date: entities.dateStr, department: entities.department, employeeName: entities.employeeName, employeeId: entities.employeeId },
          context
        );

      case "DAILY_ATTENDANCE_DETAILED":
        return AIDataTools.getDailyAttendanceDetailed(
          { date: entities.dateStr, department: entities.department, employeeName: entities.employeeName, employeeId: entities.employeeId },
          context
        );

      case "PUNCH_LOG":
        return AIDataTools.getInOutPunchReport(
          { date: entities.dateStr, department: entities.department, employeeName: entities.employeeName },
          context
        );

      case "ATTENDANCE_SUMMARY":
        return AIDataTools.getDailyAttendanceSummary({ date: entities.dateStr, department: entities.department }, context);

      case "DEPARTMENT_ATTENDANCE":
        return AIDataTools.getDepartmentAttendance({ date: entities.dateStr }, context);

      case "LATE_COMING":
        return AIDataTools.getLateComingReport({ date: entities.dateStr, department: entities.department }, context);

      case "EARLY_GOING":
        return AIDataTools.getEarlyGoingReport({ date: entities.dateStr, department: entities.department }, context);

      case "OVERTIME_REGISTER":
        return AIDataTools.getOvertimeRegister({ date: entities.dateStr, department: entities.department }, context);

      case "MISSED_PUNCH":
        return AIDataTools.getMissedPunchReport({ date: entities.dateStr, department: entities.department }, context);

      case "WEEKLY_OFF":
        return AIDataTools.getWeeklyOffReport({ date: entities.dateStr, department: entities.department }, context);

      case "HOLIDAY_PRESENT":
        return AIDataTools.getHolidayPresentReport({ date: entities.dateStr }, context);

      case "MONTHLY_MATRIX":
        return AIDataTools.getMonthlyAttendanceMatrix({ month: entities.dateStr?.slice(0, 7), department: entities.department }, context);

      case "MASTER_ROLL":
        return AIDataTools.getMasterRoll({ month: entities.dateStr?.slice(0, 7), department: entities.department }, context);

      case "MONTHLY_WORKED_DURATION":
        return AIDataTools.getMonthlyWorkedDuration({ month: entities.dateStr?.slice(0, 7), department: entities.department }, context);

      case "MONTHLY_OT_SUMMARY":
        return AIDataTools.getMonthlyOTSummary({ month: entities.dateStr?.slice(0, 7), department: entities.department }, context);

      case "OUTDOOR_DUTY":
        return AIDataTools.getOutdoorDutyEntries({ employeeId: entities.employeeId, date: entities.dateStr }, context);

      case "ANALYTICS":
        return AIDataTools.getAttendanceAnalytics({ metric: entities.metric }, context);

      case "ABSENT_EMPLOYEES":
      case "PRESENT_EMPLOYEES":
        if (context.role === "manager" && /\b(team|my\s+team)\b/i.test(lower)) {
          return AIDataTools.getTeamAttendance({ date: entities.dateStr }, context);
        }
        return AIDataTools.getCompanyAttendance({ date: entities.dateStr }, context);

      case "ATTENDANCE":
        if (/\b(my\s+attendance|my\s+punch|my\s+check\s*in)\b/i.test(lower) || context.role === "employee") {
          return AIDataTools.getEmployeeAttendance(
            { employeeId: context.viewerEmployeeId, date: entities.dateStr },
            context
          );
        }
        if (context.role === "manager" && /\b(team|my\s+team)\b/i.test(lower)) {
          return AIDataTools.getTeamAttendance({ date: entities.dateStr }, context);
        }
        return AIDataTools.getCompanyAttendance({ date: entities.dateStr }, context);

      case "TEAM":
      case "MANAGER":
        if (/\b(attendance|present|absent)\b/i.test(lower)) {
          return AIDataTools.getTeamAttendance({ date: entities.dateStr }, context);
        }
        return AIDataTools.getManagerDetails(
          { employeeId: entities.employeeId || context.viewerEmployeeId },
          context
        );

      case "LEAVE":
        if (/\b(history|past\s+leaves)\b/i.test(lower)) {
          return AIDataTools.getLeaveHistory({ employeeId: entities.employeeId }, context);
        }
        if (/\b(pending|approve|requests|applied)\b/i.test(lower)) {
          return AIDataTools.getLeaveRequests({}, context);
        }
        return AIDataTools.getLeaveBalance({ employeeId: entities.employeeId }, context);

      case "APPROVAL":
      case "WORKFLOW":
        return AIDataTools.getPendingApprovals({}, context);

      case "SHIFT":
        return AIDataTools.getEmployeeShift({ employeeId: entities.employeeId }, context);

      case "PAYROLL":
      case "SALARY":
        if (/\b(my\s+salary|my\s+ctc|my\s+pay)\b/i.test(lower) || context.role === "employee") {
          return AIDataTools.getEmployeeSalary({ employeeId: context.viewerEmployeeId }, context);
        }
        if (entities.employeeName) {
          return AIDataTools.getEmployeeSalary({ employeeId: entities.employeeId }, context);
        }
        return AIDataTools.getPayrollSummary({}, context);

      case "DEPARTMENT":
        return AIDataTools.getDepartmentDetails({ department: entities.department }, context);

      case "HOLIDAY":
        return AIDataTools.getHolidayList({}, context);

      case "POLICY":
        return AIDataTools.getCompanyPolicies({}, context);

      case "GENERAL_HR":
        return AIDataTools.getHRPolicies({}, context);

      case "ONBOARDING":
        return AIDataTools.getOnboardingData({}, context);

      case "OFFBOARDING":
        return AIDataTools.getOffboardingData({}, context);

      case "PERFORMANCE":
        return AIDataTools.getEmployeePerformance({ employeeId: entities.employeeId }, context);

      case "REPORT":
        return AIDataTools.getReports({}, context);

      case "COMPANY":
        return AIDataTools.getCompanyStatistics({}, context);

      case "RECRUITMENT":
        return AIDataTools.getRecruitmentData({}, context);

      default:
        return null;
    }
  }

  private async executePipeline(
    text: string,
    requestId: string,
    options: SendMessageOptions
  ): Promise<void> {
    const store = useUnifiedAiStore.getState();
    const lower = text.toLowerCase();
    const wantsPdf = options.forceFormat === "pdf" || /\b(pdf|download\s*pdf|in\s*pdf)\b/i.test(lower);
    const wantsExcel = options.forceFormat === "excel" || /\b(excel|xlsx|spreadsheet|csv|download\s*excel|in\s*excel)\b/i.test(lower);
    const wantsText = options.forceFormat === "text" || /\b(text|in\s*text|chat|here)\b/i.test(lower);

    // 1. Format Selection Prompt Check
    if (
      !options.forceFormat &&
      !options.documentMeta &&
      !wantsPdf &&
      !wantsExcel &&
      !wantsText &&
      isReportQuery(text) &&
      !store.pendingReportQuery
    ) {
      store.setPendingReportQuery(text);

      store.addMessage({
        role: "user",
        content: text,
        source: options.source,
      });

      store.addMessage({
        role: "assistant",
        content: `📄 **Format Selection Required**\n\nWould you like the **${text}** in **PDF Document format** (downloadable PDF), **Excel Spreadsheet** (downloadable .xlsx), or **Text format** (view directly in dashboard)?\n\nPlease choose an option below:`,
        isFormatPrompt: true,
        originalQuery: text,
        source: options.source,
      });

      return;
    }

    const rawQuery = store.pendingReportQuery || text;
    store.setPendingReportQuery(null);

    // 2. Multi-turn Follow-up Resolution
    const followUpRes = AIContextManager.resolveFollowUp(rawQuery, store.messages);
    const queryToExecute = followUpRes.expandedQuery;

    // 3. Add user message to shared conversation
    store.addMessage({
      role: "user",
      content: rawQuery,
      source: options.source,
      documentMeta: options.documentMeta,
    });

    store.setGenerating(true, requestId);
    aiEventBus.emit("AI_RESPONSE_STARTED", { requestId, query: rawQuery, source: options.source });

    try {
      // 4. Security & Guardrail Check (Block prompt-injections, secret requests, credential attempts)
      const inspection = inspectUserInput(queryToExecute);
      if (!inspection.isSafe) {
        const asstMsg = store.addMessage({
          role: "assistant",
          content:
            inspection.refusalMessage ||
            "🔒 **Security Notice**\n\nI can't provide confidential credentials, API keys, passwords, or internal system instructions. I can help you with authorized Swift HRMS information instead.",
          source: options.source,
        });
        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
        store.setGenerating(false, null);
        return;
      }

      // 5. Local Compliance Engine check (Tamil Nadu statutory bundles)
      const complianceResult = await AIToolRegistry.executeComplianceBundle(
        queryToExecute,
        options.context,
        requestId
      );

      if (complianceResult) {
        const asstMsg = store.addMessage({
          role: "assistant",
          content: complianceResult.resultText,
          model: "Local Compliance Engine",
          source: options.source,
          documentMeta: complianceResult.docMeta,
        });

        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
        store.setGenerating(false, null);
        return;
      }

      // 6. PDF Generation Tool check
      if (wantsPdf) {
        aiEventBus.emit("AI_TOOL_STARTED", {
          requestId,
          toolName: "PDF Report Generator",
          description: `Compiling PDF document for: ${queryToExecute}`,
        });

        const pdfResult = AIToolRegistry.executePdfReport(queryToExecute, options.context, undefined, undefined, requestId);

        aiEventBus.emit("AI_TOOL_COMPLETED", {
          requestId,
          toolName: "PDF Report Generator",
          summary: `Generated ${pdfResult.filename}`,
        });

        const asstMsg = store.addMessage({
          role: "assistant",
          content: `📄 **PDF Generated & Downloaded**\n\nYour formatted PDF report for **"${queryToExecute}"** has been generated and downloaded to your device with official company branding.\n\n*Click below if you need to re-download.*`,
          downloadQuery: queryToExecute,
          source: options.source,
          documentMeta: pdfResult.docMeta,
        });

        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
        store.setGenerating(false, null);
        return;
      }

      // 7. Excel Generation Tool check
      if (wantsExcel) {
        aiEventBus.emit("AI_TOOL_STARTED", {
          requestId,
          toolName: "Excel Report Generator",
          description: `Compiling Excel spreadsheet for: ${queryToExecute}`,
        });

        const excelResult = AIToolRegistry.executeExcelReport(
          queryToExecute,
          options.context,
          undefined,
          undefined,
          requestId
        );

        aiEventBus.emit("AI_TOOL_COMPLETED", {
          requestId,
          toolName: "Excel Report Generator",
          summary: `Generated ${excelResult.filename}`,
        });

        const asstMsg = store.addMessage({
          role: "assistant",
          content: `📊 **Excel Spreadsheet Generated & Downloaded**\n\nYour formatted Excel spreadsheet for **"${queryToExecute}"** has been generated and downloaded to your device with official company branding and structured columns.\n\n*Click below if you need to re-download.*`,
          downloadQuery: queryToExecute,
          source: options.source,
          documentMeta: excelResult.docMeta,
        });

        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
        store.setGenerating(false, null);
        return;
      }

      // 8. Grounded Swift Navigation & HR Concept Knowledge Match
      const knowledgeMatch = findKnowledgeMatch(queryToExecute);
      if (knowledgeMatch) {
        const asstMsg = store.addMessage({
          role: "assistant",
          content: knowledgeMatch.responseMarkdown,
          model: "Swift Knowledge Engine",
          source: options.source,
        });
        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
        store.setGenerating(false, null);
        return;
      }

      // 9. Natural Language Intent Detection & Controlled HR Data Tool Layer
      const activeEntities: ExtractedEntities = {
        isFollowUp: followUpRes.isFollowUp,
        dateStr: followUpRes.contextState.lastDateStr,
        department: followUpRes.contextState.lastDepartment,
        employeeName: followUpRes.contextState.lastEmployeeName,
        employeeId: followUpRes.contextState.lastEmployeeId,
      };
      const intentRes = AIIntentDetector.detect(queryToExecute, activeEntities);
      const toolResult = this.executeDataTool(intentRes, options.context);

      // If tool returned an explicit permission denial
      if (toolResult && !toolResult.success && toolResult.deniedReason) {
        const asstMsg = store.addMessage({
          role: "assistant",
          content: `🔒 **Permission Notice**\n\n${toolResult.summaryText}`,
          model: "Swift Security Engine",
          source: options.source,
        });
        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
        store.setGenerating(false, null);
        return;
      }

      // 10. Check deterministic query engine fallback
      const deterministicResult = AIQueryEngine.resolveQuery(queryToExecute, options.context);
      const effectiveStructuredData = toolResult?.structuredData || deterministicResult.structuredData;
      const effectiveSummaryText = toolResult?.summaryText || deterministicResult.summaryText;

      // 11. LLM Conversational Synthesis (with injected factual context)
      aiEventBus.emit("AI_TOOL_STARTED", {
        requestId,
        toolName: "OpenAI ChatGPT",
        description: "Synthesizing natural response grounded in authoritative database facts...",
      });

      const snapshot = buildEnterpriseSnapshot({
        company: options.context.company,
        employees: options.context.employees,
        attendance: options.context.attendance,
        payrolls: options.context.payrolls,
        leaves: options.context.leaves,
        docRequests: options.context.docRequests || [],
        role: (options.context.role as any) || "admin",
        viewerEmployeeId: options.viewerEmployeeId,
      });

      const messageHistory = AIContextManager.buildContextMessages(
        store.messages,
        queryToExecute,
        { maxRecentMessages: 18 }
      );

      // Multi-modal image attachment handling
      if (options.imageUrl && messageHistory.length > 0) {
        const lastIdx = messageHistory.length - 1;
        if (messageHistory[lastIdx].role === "user") {
          const originalText = messageHistory[lastIdx].content || "Please analyze this uploaded photo.";
          (messageHistory[lastIdx] as any).content = [
            { type: "text", text: originalText },
            { type: "image_url", image_url: { url: options.imageUrl } },
          ];
        }
      }

      const askFn = options.serverFnAsk || askSwiftAi;
      const res = await askFn({
        data: {
          messages: messageHistory,
          snapshot,
          model: store.selectedModel,
          factualContext: effectiveSummaryText,
        },
      });

      if (res.ok) {
        if (res.usage?.total_tokens) {
          store.addTokensUsed(res.usage.total_tokens);
        }

        const asstMsg = store.addMessage({
          role: "assistant",
          content: res.content,
          structuredData: effectiveStructuredData,
          model: res.model || store.selectedModel,
          tokens: res.usage?.total_tokens,
          downloadQuery: isReportQuery(queryToExecute) ? queryToExecute : undefined,
          source: options.source,
        });

        if (/rule\s*(?:added|captured|created)/i.test(res.content)) {
          aiGuide.notify.emit({ title: "Rule captured", body: res.content.slice(0, 120), kind: "rule" });
        }

        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
      } else {
        // Deterministic Fallback: When OpenAI is unavailable, always return the authoritative database results!
        console.warn("[SWIFT AI Orchestrator] Falling back to authoritative database result:", res.error);
        const finalContent =
          effectiveSummaryText ||
          "I couldn't find that information in the available Swift HRMS data. Please check with an authorized administrator.";

        const asstMsg = store.addMessage({
          role: "assistant",
          content: finalContent,
          structuredData: effectiveStructuredData,
          model: "SWIFT HR Database",
          downloadQuery: isReportQuery(queryToExecute) ? queryToExecute : undefined,
          source: options.source,
        });

        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
      }
    } catch (err: any) {
      console.error("[SWIFT AI Orchestrator] Execution failed:", err);
      store.addMessage({
        role: "assistant",
        content: "I'm unable to retrieve the latest Swift HRMS data right now. Please try again shortly.",
        source: options.source,
      });
      aiEventBus.emit("AI_ERROR", { requestId, error: err?.message || "Unknown error" });
    } finally {
      store.setGenerating(false, null);
    }
  }

  /**
   * Triggers download of a previously generated query document.
   */
  downloadQueryReport(
    query: string,
    rawContent?: string,
    context?: ToolExecutionContext,
    structuredData?: any
  ): void {
    if (!context) return;
    AIToolRegistry.executePdfReport(query, context, rawContent, structuredData);
    toast.success("Downloading PDF report...");
  }

  /**
   * Triggers download of a previously generated query document as an Excel spreadsheet.
   */
  downloadQueryExcel(
    query: string,
    rawContent?: string,
    context?: ToolExecutionContext,
    structuredData?: any
  ): void {
    if (!context) return;
    AIToolRegistry.executeExcelReport(query, context, rawContent, structuredData);
    toast.success("Downloading Excel spreadsheet...");
  }
}

export const aiOrchestrator = new AIOrchestrator();
