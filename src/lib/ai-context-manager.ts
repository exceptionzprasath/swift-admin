// SWIFT AI — AI Context Window Manager
// Manages the separation between unbounded full conversation history (stored in DB/Zustand)
// and the optimal, token-efficient context window sent to the LLM (guaranteed <= 20-30 messages).

import type { AIMessage } from "./ai-unified-types";

export interface ContextWindowOptions {
  maxRecentMessages?: number;
  includeSummary?: boolean;
}

export class AIContextManager {
  /**
   * Constructs the message array to send to OpenAI.
   * Ensures the resulting array NEVER exceeds maxRecentMessages (default 20),
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
    // 1. Extract older messages for summary
    const olderMessages = cleanHistory.slice(0, cleanHistory.length - maxRecent);
    const recentMessages = cleanHistory.slice(cleanHistory.length - maxRecent);

    // 2. Generate rolling topic summary of older conversation
    const summary = this.generateCondensedSummary(olderMessages);

    const result: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

    // Prepend summary as system context
    if (summary) {
      result.push({
        role: "system",
        content: `Previous conversation context summary:\n${summary}`,
      });
    }

    // Append recent messages
    for (const msg of recentMessages) {
      result.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    }

    // Ensure current query is included
    const lastRecent = recentMessages[recentMessages.length - 1];
    if (!lastRecent || lastRecent.role !== "user" || lastRecent.content !== currentQuery) {
      result.push({ role: "user", content: currentQuery });
    }

    // Strict safety cap: Never exceed 24 messages
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
