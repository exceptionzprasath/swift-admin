// SWIFT AI — AI Trigger alerts store (persisted, dedup by id)
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ComplianceAlert } from "./ai-trigger-engine";

type State = {
  alerts: ComplianceAlert[];
  dismissed: Record<string, string>; // id -> dismissedAt
  acknowledgedActions: Record<string, string>;

  ingest: (list: ComplianceAlert[]) => number; // returns new count
  dismiss: (id: string) => void;
  dismissAll: () => void;
  acknowledgeAction: (id: string) => void;
  clear: () => void;
};

export const useTriggerAlerts = create<State>()(
  persist(
    (set, get) => ({
      alerts: [],
      dismissed: {},
      acknowledgedActions: {},

      ingest: (list) => {
        const existing = new Set(get().alerts.map((a) => a.id));
        const dismissed = get().dismissed;
        const fresh = list.filter((a) => !existing.has(a.id) && !dismissed[a.id]);
        if (fresh.length === 0) return 0;
        set((s) => ({
          alerts: [...fresh, ...s.alerts].slice(0, 200),
        }));
        return fresh.length;
      },
      dismiss: (id) =>
        set((s) => ({
          alerts: s.alerts.filter((a) => a.id !== id),
          dismissed: { ...s.dismissed, [id]: new Date().toISOString() },
        })),
      dismissAll: () =>
        set((s) => ({
          alerts: [],
          dismissed: {
            ...s.dismissed,
            ...Object.fromEntries(s.alerts.map((a) => [a.id, new Date().toISOString()])),
          },
        })),
      acknowledgeAction: (id) =>
        set((s) => ({ acknowledgedActions: { ...s.acknowledgedActions, [id]: new Date().toISOString() } })),
      clear: () => set({ alerts: [], dismissed: {}, acknowledgedActions: {} }),
    }),
    { name: "swift-trigger-alerts", version: 1 },
  ),
);
