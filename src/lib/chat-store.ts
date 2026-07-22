// SWIFT — Internal chat between admin/HR and employees (client-persisted)
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChatMessage = {
  id: string;
  threadId: string;
  from: string;   // participant id
  fromName: string;
  text: string;
  at: string;     // ISO
  read: boolean;
};

export function threadIdFor(a: string, b: string) {
  return [a, b].sort().join("::");
}

type State = {
  messages: ChatMessage[];
  send: (input: { from: string; fromName: string; to: string; text: string }) => ChatMessage;
  markRead: (threadId: string, viewer: string) => void;
  unreadFor: (viewer: string) => number;
  threadMessages: (a: string, b: string) => ChatMessage[];
  clearThread: (threadId: string) => void;
};

export const useChat = create<State>()(
  persist(
    (set, get) => ({
      messages: [],
      send: ({ from, fromName, to, text }) => {
        const msg: ChatMessage = {
          id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          threadId: threadIdFor(from, to),
          from, fromName, text: text.trim(),
          at: new Date().toISOString(), read: false,
        };
        set((s) => ({ messages: [...s.messages, msg] }));
        return msg;
      },
      markRead: (threadId, viewer) => set((s) => ({
        messages: s.messages.map((m) => m.threadId === threadId && m.from !== viewer ? { ...m, read: true } : m),
      })),
      unreadFor: (viewer) => get().messages.filter((m) => m.from !== viewer && !m.read && m.threadId.includes(viewer)).length,
      threadMessages: (a, b) => {
        const tid = threadIdFor(a, b);
        return get().messages.filter((m) => m.threadId === tid).sort((x, y) => x.at.localeCompare(y.at));
      },
      clearThread: (tid) => set((s) => ({ messages: s.messages.filter((m) => m.threadId !== tid) })),
    }),
    { name: "swift-internal-chat" },
  ),
);

export const ADMIN_CHAT_ID = "admin@swift";
export const ADMIN_CHAT_NAME = "HR / Admin";
