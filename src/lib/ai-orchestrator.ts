// SWIFT AI — Unified AI Orchestrator & Execution Engine
import { useUnifiedAiStore } from "./ai-unified-store";
import { aiEventBus } from "./ai-event-bus";
import { AIToolRegistry, isReportQuery, type ToolExecutionContext } from "./ai-tool-registry";
import { AIQueryEngine } from "./ai-query-engine";
import { AIContextManager } from "./ai-context-manager";
import { buildEnterpriseSnapshot } from "./ai-knowledge";
import { askSwiftAi } from "./ai.functions";
import { aiGuide } from "./ai-guide-bus";
import type { AIMessage, AIMessageSource, AIDocumentMeta } from "./ai-unified-types";
import { toast } from "sonner";

export interface SendMessageOptions {
  source: AIMessageSource;
  forceFormat?: "pdf" | "text";
  viewerEmployeeId?: string;
  context: ToolExecutionContext;
  serverFnAsk?: (args: { data: any }) => Promise<any>;
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

  private async executePipeline(
    text: string,
    requestId: string,
    options: SendMessageOptions
  ): Promise<void> {
    const store = useUnifiedAiStore.getState();
    const lower = text.toLowerCase();
    const wantsPdf = options.forceFormat === "pdf" || /\b(pdf|download\s*pdf|in\s*pdf)\b/i.test(lower);
    const wantsText = options.forceFormat === "text" || /\b(text|in\s*text|chat|here)\b/i.test(lower);

    // 1. Format Selection Prompt Check
    if (
      !options.forceFormat &&
      !wantsPdf &&
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
        content: `📄 **Format Selection Required**\n\nWould you like the **${text}** in **PDF Document format** (downloadable file) or **Text format** (view directly in dashboard)?\n\nPlease choose an option below:`,
        isFormatPrompt: true,
        originalQuery: text,
        source: options.source,
      });

      return;
    }

    const queryToExecute = store.pendingReportQuery || text;
    store.setPendingReportQuery(null);

    // 2. Add user message to shared conversation
    store.addMessage({
      role: "user",
      content: text,
      source: options.source,
    });

    store.setGenerating(true, requestId);
    aiEventBus.emit("AI_RESPONSE_STARTED", { requestId, query: text, source: options.source });

    try {
      // 3. Local Compliance Engine check
      aiEventBus.emit("AI_TOOL_STARTED", {
        requestId,
        toolName: "Compliance Engine",
        description: "Checking compliance commands and statutory bundles...",
      });

      const complianceResult = await AIToolRegistry.executeComplianceBundle(
        queryToExecute,
        options.context,
        requestId
      );

      aiEventBus.emit("AI_TOOL_COMPLETED", {
        requestId,
        toolName: "Compliance Engine",
        summary: complianceResult ? "Bundle created" : "No matching compliance command",
      });

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

      // 4. PDF Generation Tool check
      if (wantsPdf) {
        aiEventBus.emit("AI_TOOL_STARTED", {
          requestId,
          toolName: "PDF Report Generator",
          description: `Compiling PDF document for: ${queryToExecute}`,
        });

        const pdfResult = AIToolRegistry.executePdfReport(queryToExecute, options.context, undefined, requestId);

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

      // 5. Deterministic HRMS Query Engine Evaluation (Database = Source of Truth)
      aiEventBus.emit("AI_TOOL_STARTED", {
        requestId,
        toolName: "HRMS Database Router",
        description: "Querying live database records...",
      });

      const deterministicResult = AIQueryEngine.resolveQuery(queryToExecute, options.context);

      if (deterministicResult.handled) {
        aiEventBus.emit("AI_TOOL_COMPLETED", {
          requestId,
          toolName: deterministicResult.toolName || "HRMS Database",
          summary: "Authoritative data retrieved",
        });

        const asstMsg = store.addMessage({
          role: "assistant",
          content: deterministicResult.summaryText,
          structuredData: deterministicResult.structuredData,
          model: deterministicResult.model || "SWIFT HR Database",
          downloadQuery: isReportQuery(queryToExecute) ? queryToExecute : undefined,
          source: options.source,
        });

        aiEventBus.emit("AI_RESPONSE_COMPLETED", { requestId, message: asstMsg });
        store.setGenerating(false, null);
        return;
      }

      // 6. Conversational / Policy Reasoning via OpenAI ChatGPT
      aiEventBus.emit("AI_TOOL_STARTED", {
        requestId,
        toolName: "OpenAI ChatGPT",
        description: "Synthesizing conversational response with live context...",
      });

      const snapshot = buildEnterpriseSnapshot({
        company: options.context.company,
        employees: options.context.employees,
        attendance: options.context.attendance,
        payrolls: options.context.payrolls,
        leaves: options.context.leaves,
        docRequests: options.context.docRequests,
        role: (options.context.role as any) || "admin",
        viewerEmployeeId: options.viewerEmployeeId,
      });

      const messageHistory = AIContextManager.buildContextMessages(
        store.messages,
        queryToExecute,
        { maxRecentMessages: 18 }
      );

      const askFn = options.serverFnAsk || askSwiftAi;
      const res = await askFn({
        data: {
          messages: messageHistory,
          snapshot,
          model: store.selectedModel,
        },
      });

      if (res.ok) {
        if (res.usage?.total_tokens) {
          store.addTokensUsed(res.usage.total_tokens);
        }

        const asstMsg = store.addMessage({
          role: "assistant",
          content: res.content,
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
        console.warn("[SWIFT AI Orchestrator] askSwiftAi returned not ok:", res.error);
        const userFriendlyError = res.error?.includes("rate")
          ? "SWIFT AI is currently processing high traffic. Please try again in a moment."
          : res.error?.includes("API Key") || res.error?.includes("configured")
          ? "OpenAI API configuration is required. Please check your settings."
          : "SWIFT AI couldn't complete that response right now. Please try again.";

        store.addMessage({
          role: "assistant",
          content: userFriendlyError,
          source: options.source,
        });
        aiEventBus.emit("AI_ERROR", { requestId, error: res.error });
      }
    } catch (err: any) {
      console.error("[SWIFT AI Orchestrator] Execution failed:", err);
      store.addMessage({
        role: "assistant",
        content: "SWIFT AI is temporarily unavailable. Please try again in a moment.",
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
  downloadQueryReport(query: string, rawContent?: string, context?: ToolExecutionContext): void {
    if (!context) return;
    AIToolRegistry.executePdfReport(query, context, rawContent);
    toast.success("Downloading PDF report...");
  }
}

export const aiOrchestrator = new AIOrchestrator();
