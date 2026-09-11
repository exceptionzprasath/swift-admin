// SWIFT AI — AI Context Window & Multi-Turn State Manager
// Manages conversation memory, resolves follow-up questions ("what about yesterday?", "who are they?"),
// and maintains token-efficient context for the LLM.

import type { AIMessage } from "./ai-unified-types";
import { resolveNaturalDate } from "./ai-intent-detector";

export interface ContextWindowOptions {
  maxRecentMessages?: number;
  includeSummary?: boolean;
}

export interface ConversationalState {
  lastIntent?: string;
  lastDateStr?: string;
  lastDepartment?: string;
  lastEmployeeName?: string;
  lastEmployeeId?: string;
  lastListCategory?: string;
  lastResultCount?: number;
}

export class AIContextManager {
  /**
   * Scans previous messages to deduce active conversational state (entities and intent).
   */
  static extractConversationalState(messages: AIMessage[]): ConversationalState {
    const state: ConversationalState = {};
    const reversed = [...(messages || [])].reverse();

    for (const msg of reversed) {
      if (msg.role === "assistant") {
        if (msg.structuredData?.type === "EMPLOYEE_LIST") {
          state.lastIntent = "ATTENDANCE";
          state.lastListCategory = msg.structuredData.category;
          state.lastResultCount = msg.structuredData.count;
        } else if (msg.structuredData?.type === "EMPLOYEE_DETAILS") {
          state.lastIntent = "EMPLOYEE_INFORMATION";
          state.lastEmployeeName = msg.structuredData.employee.name;
          state.lastEmployeeId = msg.structuredData.employee.id;
        } else if (msg.structuredData?.type === "ATTENDANCE_SUMMARY") {
          state.lastIntent = "ATTENDANCE";
          state.lastDateStr = msg.structuredData.date;
        }
      }

      if (msg.role === "user") {
        const text = msg.content.toLowerCase();
        if (/\b(tech|engineering|development|hr|sales|marketing|accounts|operations)\b/i.test(text)) {
          const match = text.match(/\b(tech|engineering|development|hr|sales|marketing|accounts|operations)\b/i);
          if (match && !state.lastDepartment) {
            state.lastDepartment = match[1];
          }
        }
        if (/\b(absent|not\s+come|who\s+came|present|late)\b/i.test(text) && !state.lastIntent) {
          state.lastIntent = "ATTENDANCE";
        }
      }

      // If we found both intent and an entity, break early
      if (state.lastIntent && (state.lastDateStr || state.lastDepartment || state.lastEmployeeName)) {
        break;
      }
    }

    return state;
  }

  /**
   * Automatically resolves short follow-up questions using prior turn context.
   */
  static resolveFollowUp(
    queryText: string,
    history: AIMessage[]
  ): { expandedQuery: string; isFollowUp: boolean; contextState: ConversationalState } {
    const raw = queryText.trim();
    const lower = raw.toLowerCase();
    const state = this.extractConversationalState(history);

    // 1. "what about yesterday?" / "how about yesterday?"
    if (/^(?:what|how)\s+about\s+(yesterday|tomorrow|last\s+month|today|monday)/i.test(lower)) {
      const match = lower.match(/\b(yesterday|tomorrow|last\s+month|today|monday)\b/i);
      const targetPeriod = match ? match[1] : "yesterday";
      const resolvedDate = resolveNaturalDate(targetPeriod);
      state.lastDateStr = resolvedDate.dateStr;

      const expandedQuery = state.lastIntent === "ATTENDANCE"
        ? `Who is absent ${targetPeriod}?`
        : `Show ${state.lastIntent || "attendance"} for ${targetPeriod}`;

      return { expandedQuery, isFollowUp: true, contextState: state };
    }

    // 2. "how many from IT?" / "from development?" / "how many in tech?"
    if (/(?:how\s+many\s+)?(?:from|in)\s+(tech|engineering|development|hr|sales|marketing|accounts|operations)/i.test(lower)) {
      const match = lower.match(/\b(tech|engineering|development|hr|sales|marketing|accounts|operations)\b/i);
      const dept = match ? match[1] : "IT";
      state.lastDepartment = dept;

      const expandedQuery = state.lastIntent === "ATTENDANCE"
        ? `How many employees from ${dept} are absent?`
        : `How many employees in ${dept} department?`;

      return { expandedQuery, isFollowUp: true, contextState: state };
    }

    // 3. "who are they?" / "show them" / "list them" / "who?"
    if (/^(?:who\s+are\s+they|show\s+them|list\s+them|who\?|names\?|which\s+ones\?)$/i.test(lower)) {
      const deptPart = state.lastDepartment ? `from ${state.lastDepartment}` : "";
      const datePart = state.lastDateStr ? `on ${state.lastDateStr}` : "today";
      const expandedQuery = `List names of employees ${deptPart} absent ${datePart}`;

      return { expandedQuery, isFollowUp: true, contextState: state };
    }

    // 4. Pronoun references: "what is his salary?", "what is her leave balance?"
    if (/\b(his|her|their)\s+(salary|ctc|leave|leaves|shift|attendance)\b/i.test(lower) && state.lastEmployeeName) {
      const replaced = raw.replace(/\b(his|her|their)\b/i, state.lastEmployeeName + "'s");
      return { expandedQuery: replaced, isFollowUp: true, contextState: state };
    }

    return { expandedQuery: raw, isFollowUp: false, contextState: state };
  }

  /**
   * Constructs the message array to send to OpenAI.
   * Ensures the resulting array NEVER exceeds maxRecentMessages (default 18),
   * while retaining key conversational context through rolling summarization.
   */
  static buildContextMessages(
    fullHistory: AIMessage[],
    currentQuery: string,
    options: ContextWindowOptions = {}
  ): Array<{ role: "user" | "assistant" | "system"; content: string }> {
    const maxRecent = options.maxRecentMessages || 18;
    const cleanHistory = (fullHistory || []).filter(
      (m) => m && m.content && m.role && !m.isFormatPrompt
    );

    // If conversation is short, return all history + current query
    if (cleanHistory.length <= maxRecent) {
      const formatted = cleanHistory.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      // If currentQuery is not already the last message in cleanHistory, append it
      const lastMsg = cleanHistory[cleanHistory.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== currentQuery) {
        formatted.push({ role: "user", content: currentQuery });
      }

      return formatted;
    }

    // For long conversations (> maxRecent):
    const olderMessages = cleanHistory.slice(0, cleanHistory.length - maxRecent);
    const recentMessages = cleanHistory.slice(cleanHistory.length - maxRecent);

    const summary = this.generateCondensedSummary(olderMessages);
    const result: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

    if (summary) {
      result.push({
        role: "system",
        content: `Previous conversation context summary:\n${summary}`,
      });
    }

    for (const msg of recentMessages) {
      result.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    }

    const lastRecent = recentMessages[recentMessages.length - 1];
    if (!lastRecent || lastRecent.role !== "user" || lastRecent.content !== currentQuery) {
      result.push({ role: "user", content: currentQuery });
    }

    if (result.length > 24) {
      return result.slice(result.length - 24);
    }

    return result;
  }

  /**
   * Condenses older messages into key topics, requested entities, and decisions.
   */
  private static generateCondensedSummary(olderMessages: AIMessage[]): string {
    const topics: string[] = [];
    const entities = new Set<string>();

    for (const msg of olderMessages) {
      if (msg.role === "user") {
        const text = msg.content.trim();
        if (text.length < 100) {
          topics.push(text);
        }
      }
      if (msg.structuredData?.type === "EMPLOYEE_DETAILS") {
        entities.add(msg.structuredData.employee.name);
      }
    }

    const recentTopics = topics.slice(-4);
    const entityList = Array.from(entities).slice(-5);

    const parts: string[] = [];
    if (entityList.length > 0) {
      parts.push(`Employees previously discussed: ${entityList.join(", ")}.`);
    }
    if (recentTopics.length > 0) {
      parts.push(`Recent questions asked: "${recentTopics.join('", "')}".`);
    }

    return parts.join(" ") || "General HRMS management inquiries.";
  }
}
