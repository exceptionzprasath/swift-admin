// Monthly compliance report — per-month editable status & remarks, header meta,
// and PDF generation matching the Luminous factory monthly report layout.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SeedStatus } from "./tn-monthly-checklist";
import { TN_MONTHLY_CHECKLIST } from "./tn-monthly-checklist";

export type MonthlyStatus = "P" | "D" | "N" | "NA";

export type MonthlyItemState = {
  status: MonthlyStatus;
  remarks: string;
};

export type MonthlyHeader = {
  factoryName: string;
  address: string;
  dateOfOpening: string;
  factoryManager: string;
  natureOfIndustry: string;
  hrHead: string;
  factoryCoordinator: string;
  medicalAdvisor: string;
  sheRepresentative: string;
  dateOfObservation: string;
};

export const EMPTY_HEADER: MonthlyHeader = {
  factoryName: "",
  address: "",
  dateOfOpening: "",
  factoryManager: "",
  natureOfIndustry: "",
  hrHead: "",
  factoryCoordinator: "",
  medicalAdvisor: "",
  sheRepresentative: "",
  dateOfObservation: "",
};

export type MonthlyReport = {
  month: string; // YYYY-MM
  header: MonthlyHeader;
  items: Record<number, MonthlyItemState>; // by n
  finalizedAt?: string;
  finalizedBy?: string;
};

type State = {
  reports: Record<string, MonthlyReport>; // key: `${branchId}::${month}`
  ensureReport: (branchId: string, month: string) => MonthlyReport;
  updateHeader: (branchId: string, month: string, patch: Partial<MonthlyHeader>) => void;
  updateItem: (branchId: string, month: string, n: number, patch: Partial<MonthlyItemState>) => void;
  bulkSeed: (branchId: string, month: string) => void;
  finalize: (branchId: string, month: string, by: string) => void;
  remove: (branchId: string, month: string) => void;
};

function seedFor(): Record<number, MonthlyItemState> {
  const out: Record<number, MonthlyItemState> = {};
  for (const it of TN_MONTHLY_CHECKLIST) {
    out[it.n] = { status: it.seed as SeedStatus, remarks: "" };
  }
  return out;
}

export const useMonthlyReports = create<State>()(
  persist(
    (set, get) => ({
      reports: {},
      ensureReport: (branchId, month) => {
        const key = `${branchId}::${month}`;
        const cur = get().reports[key];
        if (cur) return cur;
        const fresh: MonthlyReport = {
          month,
          header: { ...EMPTY_HEADER, dateOfObservation: new Date().toISOString().slice(0, 10) },
          items: seedFor(),
        };
        set((s) => ({ reports: { ...s.reports, [key]: fresh } }));
        return fresh;
      },
      updateHeader: (branchId, month, patch) => {
        const key = `${branchId}::${month}`;
        set((s) => {
          const cur = s.reports[key] ?? { month, header: EMPTY_HEADER, items: seedFor() };
          return { reports: { ...s.reports, [key]: { ...cur, header: { ...cur.header, ...patch } } } };
        });
      },
      updateItem: (branchId, month, n, patch) => {
        const key = `${branchId}::${month}`;
        set((s) => {
          const cur = s.reports[key] ?? { month, header: EMPTY_HEADER, items: seedFor() };
          const items = { ...cur.items, [n]: { ...cur.items[n], ...patch } as MonthlyItemState };
          return { reports: { ...s.reports, [key]: { ...cur, items } } };
        });
      },
      bulkSeed: (branchId, month) => {
        const key = `${branchId}::${month}`;
        set((s) => {
          const cur = s.reports[key];
          if (!cur) return s;
          return { reports: { ...s.reports, [key]: { ...cur, items: seedFor() } } };
        });
      },
      finalize: (branchId, month, by) => {
        const key = `${branchId}::${month}`;
        set((s) => {
          const cur = s.reports[key];
          if (!cur) return s;
          return { reports: { ...s.reports, [key]: { ...cur, finalizedAt: new Date().toISOString(), finalizedBy: by } } };
        });
      },
      remove: (branchId, month) => {
        set((s) => {
          const next = { ...s.reports };
          delete next[`${branchId}::${month}`];
          return { reports: next };
        });
      },
    }),
    { name: "swift-monthly-reports", version: 1 },
  ),
);

export function summarize(items: Record<number, MonthlyItemState>) {
  let P = 0, D = 0, N = 0, NA = 0;
  for (const it of TN_MONTHLY_CHECKLIST) {
    const s = items[it.n]?.status ?? it.seed;
    if (s === "P") P++; else if (s === "D") D++; else if (s === "N") N++; else NA++;
  }
  const total = TN_MONTHLY_CHECKLIST.length;
  const applicable = total - NA;
  const score = applicable > 0 ? Math.round((P / applicable) * 100) : 0;
  return { P, D, N, NA, total, score };
}
