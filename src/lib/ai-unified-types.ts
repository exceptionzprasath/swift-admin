// SWIFT AI — Unified AI Types & Contracts
export type AIMessageSource = "LIVE_BRAIN" | "COPILOT" | "SYSTEM";

export type AIMessageType =
  | "text"
  | "format_prompt"
  | "document"
  | "tool_status"
  | "error"
  | "system"
  | "structured";

export type AIDocumentMeta = {
  title: string;
  filename: string;
  ref?: string;
  size?: number;
  downloadUrl?: string;
  docType?: "pdf" | "zip" | "docx" | "image" | "excel";
  imageUrl?: string;
};

export type AIToolCallInfo = {
  toolName: string;
  status: "started" | "completed" | "failed";
  resultSummary?: string;
};

export type AIStructuredData =
  | {
      type: "EMPLOYEE_DETAILS";
      employee: {
        id: string;
        name: string;
        empCode: string;
        department: string;
        designation: string;
        branch?: string;
        email?: string;
        phone?: string;
        doj?: string;
        basicSalary?: number;
        status: string;
        isFaceRegistered?: boolean;
      };
      attendanceSummary?: {
        todayStatus: string;
        punctuality?: string;
        checkIn?: string;
        presentDays30d?: number;
        absentDays30d?: number;
        attendancePct?: number;
      };
    }
  | {
      type: "EMPLOYEE_LIST";
      title: string;
      subtitle?: string;
      count: number;
      category?: "absent" | "present" | "late" | "leave" | "department" | "all";
      employees: Array<{
        id: string;
        name: string;
        empCode: string;
        department: string;
        designation: string;
        status?: string;
        badge?: string;
        checkIn?: string;
      }>;
    }
  | {
      type: "ATTENDANCE_SUMMARY";
      title: string;
      date: string;
      metrics: {
        totalScheduled: number;
        present: number;
        absent: number;
        late: number;
        onLeave: number;
        attendanceRatePct: number;
      };
      absentEmployees: Array<{ name: string; empCode: string; department: string; designation: string }>;
      lateEmployees: Array<{ name: string; empCode: string; department: string; checkIn: string }>;
    }
  | {
      type: "LEAVE_SUMMARY";
      title: string;
      pendingCount: number;
      leaves: Array<{
        id: string;
        employeeName: string;
        empCode?: string;
        type: string;
        startDate: string;
        endDate: string;
        days: string | number;
        status: string;
        reason?: string;
      }>;
    }
  | {
      type: "PAYROLL_SUMMARY";
      title: string;
      month: string;
      totalEmployees: number;
      totalGrossLiability: number;
      averageCtc: number;
      pfDeductionTotal: number;
      esiDeductionTotal: number;
      employees?: Array<{ name: string; empCode: string; department: string; basic: number; ctc: number }>;
    }
  | {
      type: "CLARIFICATION";
      title: string;
      query: string;
      options: Array<{
        label: string;
        subLabel?: string;
        queryToRun: string;
      }>;
    }
  | {
      type: "SECURITY_REFUSAL";
      message: string;
    }
  | {
      type: "NO_DATA";
      title: string;
      message: string;
      suggestions?: string[];
    };

export type AIMessage = {
  id: string;
  conversationId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  source?: AIMessageSource;
  timestamp: string;
  messageType?: AIMessageType;
  structuredData?: AIStructuredData;
  model?: string;
  tokens?: number;
  isFormatPrompt?: boolean;
  originalQuery?: string;
  downloadQuery?: string;
  documentMeta?: AIDocumentMeta;
  toolCall?: AIToolCallInfo;
  error?: string;
};

export type AIConversation = {
  id: string;
  tenantId: string;
  userId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
};

export type AIEventPayloadMap = {
  AI_MESSAGE_CREATED: { message: AIMessage; conversationId: string };
  AI_RESPONSE_STARTED: { requestId: string; query: string; source: AIMessageSource };
  AI_RESPONSE_CHUNK: { requestId: string; chunk: string };
  AI_RESPONSE_COMPLETED: { requestId: string; message: AIMessage };
  AI_TOOL_STARTED: { requestId: string; toolName: string; description: string };
  AI_TOOL_COMPLETED: { requestId: string; toolName: string; summary: string };
  AI_DOCUMENT_CREATED: { requestId: string; doc: AIDocumentMeta; message: AIMessage };
  AI_CONVERSATION_UPDATED: { conversationId: string; messages: AIMessage[] };
  AI_CONVERSATION_CLEARED: { conversationId: string };
  AI_ERROR: { requestId?: string; error: string };
};

export type AIEventType = keyof AIEventPayloadMap;
