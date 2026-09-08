// SWIFT AI — Unified AI Store (Zustand)
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIMessage, AIMessageSource, AIMessageType, AIDocumentMeta } from "./ai-unified-types";
import { aiEventBus } from "./ai-event-bus";

interface UnifiedAiState {
  activeTenantId: string | null;
  conversationId: string;
  messages: AIMessage[];
  isGenerating: boolean;
  streamingContent: string;
  activeTool: string | null;
  activeRequestId: string | null;
  pendingReportQuery: string | null;
  totalTokensUsed: number;
  selectedModel: "gpt-4o-mini" | "gpt-4o";
  apiStatus: {
    ok: boolean;
    status: string;
    configured: boolean;
    latencyMs?: number;
  };

  // Actions
  setTenant: (tenantId: string, companyName?: string) => void;
  setGenerating: (isGenerating: boolean, requestId?: string | null) => void;
  setActiveTool: (tool: string | null) => void;
  setStreamingContent: (content: string) => void;
  setSelectedModel: (model: "gpt-4o-mini" | "gpt-4o") => void;
  setPendingReportQuery: (query: string | null) => void;
  setApiStatus: (status: { ok: boolean; status: string; configured: boolean; latencyMs?: number }) => void;
  addTokensUsed: (tokens: number) => void;

  // Message Actions
  addMessage: (msg: Omit<AIMessage, "id" | "timestamp"> & { id?: string; timestamp?: string }) => AIMessage;
  updateMessage: (id: string, updates: Partial<AIMessage>) => void;
  clearConversation: (companyName?: string) => void;
  syncFromEvent: (messages: AIMessage[]) => void;
}

const buildDefaultWelcomeMessage = (companyName = "your organization"): AIMessage => ({
  id: "welcome-1",
  role: "assistant",
  content: `### 👋 Welcome to SWIFT AI Copilot\n\nI am your **OpenAI-powered Enterprise Copilot**, embedded directly with live visibility into **${companyName}**.\n\nHere's what I can do for you right now:\n- 📊 **Query Real-time Data**: Ask about employee details, attendance metrics, leaves, payroll calculations & branch heads.\n- 📝 **Generate HR Documents**: Draft customized offer letters, promotion orders, experience certificates, or company policies.\n- ⚖️ **Statutory Compliance**: Check PF/ESI rules, tax brackets, filing deadlines, and generate regulatory filings.\n- ⚡ **Automated Actions**: Type *"Generate compliance documents"* to instantly compile and download complete PDF statutory bundles.`,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  messageType: "text",
});

export const useUnifiedAiStore = create<UnifiedAiState>()(
  persist(
    (set, get) => ({
      activeTenantId: null,
      conversationId: `conv-${Date.now()}`,
      messages: [buildDefaultWelcomeMessage()],
      isGenerating: false,
      streamingContent: "",
      activeTool: null,
      activeRequestId: null,
      pendingReportQuery: null,
      totalTokensUsed: 0,
      selectedModel: "gpt-4o-mini",
      apiStatus: { ok: true, status: "Checking...", configured: true },

      setTenant: (tenantId: string, companyName = "your organization") => {
        const current = get().activeTenantId;
        if (current !== tenantId) {
          const convId = `conv-${tenantId}-${Date.now()}`;
          const initialMessages = [buildDefaultWelcomeMessage(companyName)];
          set({
            activeTenantId: tenantId,
            conversationId: convId,
            messages: initialMessages,
            pendingReportQuery: null,
            isGenerating: false,
            streamingContent: "",
          });
          aiEventBus.emit("AI_CONVERSATION_UPDATED", {
            conversationId: convId,
            messages: initialMessages,
          });
        }
      },

      setGenerating: (isGenerating: boolean, requestId: string | null = null) => {
        set({ isGenerating, activeRequestId: requestId, streamingContent: isGenerating ? get().streamingContent : "" });
      },

      setActiveTool: (activeTool: string | null) => {
        set({ activeTool });
      },

      setStreamingContent: (streamingContent: string) => {
        set({ streamingContent });
      },

      setSelectedModel: (selectedModel: "gpt-4o-mini" | "gpt-4o") => {
        set({ selectedModel });
      },

      setPendingReportQuery: (pendingReportQuery: string | null) => {
        set({ pendingReportQuery });
      },

      setApiStatus: (apiStatus) => {
        set({ apiStatus });
      },

      addTokensUsed: (tokens: number) => {
        set({ totalTokensUsed: get().totalTokensUsed + tokens });
      },

      addMessage: (msgInput) => {
        const fullMessage: AIMessage = {
          id: msgInput.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          conversationId: get().conversationId,
          timestamp: msgInput.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          ...msgInput,
        };

        set((state) => {
          // Avoid duplicate messages with same ID
          const existingIndex = state.messages.findIndex((m) => m.id === fullMessage.id);
          let nextMessages: AIMessage[];
          if (existingIndex >= 0) {
            nextMessages = [...state.messages];
            nextMessages[existingIndex] = fullMessage;
          } else {
            nextMessages = [...state.messages, fullMessage];
          }
          return { messages: nextMessages };
        });

        // Broadcast event so any listeners (other window/panel) immediately get the message
        aiEventBus.emit("AI_MESSAGE_CREATED", {
          message: fullMessage,
          conversationId: get().conversationId,
        });

        return fullMessage;
      },

      updateMessage: (id: string, updates: Partial<AIMessage>) => {
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
      },

      clearConversation: (companyName = "your organization") => {
        const newConvId = `conv-${Date.now()}`;
        const initial = [
          {
            id: `welcome-${Date.now()}`,
            role: "assistant" as const,
            content: `Chat session reset. Ask me anything about **${companyName}** or pick a prompt!`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            messageType: "text" as AIMessageType,
          },
        ];
        set({
          conversationId: newConvId,
          messages: initial,
          pendingReportQuery: null,
          isGenerating: false,
          streamingContent: "",
          activeTool: null,
          activeRequestId: null,
        });
        aiEventBus.emit("AI_CONVERSATION_CLEARED", { conversationId: newConvId });
      },

      syncFromEvent: (messages: AIMessage[]) => {
        set({ messages });
      },
    }),
    {
      name: "swift-unified-ai-store",
      partialize: (state) => ({
        activeTenantId: state.activeTenantId,
        conversationId: state.conversationId,
        messages: state.messages,
        totalTokensUsed: state.totalTokensUsed,
        selectedModel: state.selectedModel,
      }),
    }
  )
);

// Subscribe store to global AI event bus
if (typeof window !== "undefined") {
  aiEventBus.on("AI_MESSAGE_CREATED", ({ message }) => {
    const state = useUnifiedAiStore.getState();
    if (!state.messages.some((m) => m.id === message.id)) {
      useUnifiedAiStore.setState((prev) => ({
        messages: [...prev.messages, message],
      }));
    }
  });

  aiEventBus.on("AI_RESPONSE_STARTED", ({ requestId }) => {
    useUnifiedAiStore.setState({ isGenerating: true, activeRequestId: requestId });
  });

  aiEventBus.on("AI_RESPONSE_COMPLETED", () => {
    useUnifiedAiStore.setState({ isGenerating: false, activeRequestId: null, streamingContent: "" });
  });

  aiEventBus.on("AI_TOOL_STARTED", ({ toolName }) => {
    useUnifiedAiStore.setState({ activeTool: toolName });
  });

  aiEventBus.on("AI_TOOL_COMPLETED", () => {
    useUnifiedAiStore.setState({ activeTool: null });
  });

  aiEventBus.on("AI_CONVERSATION_CLEARED", () => {
    // Keep local store in sync
  });
}
