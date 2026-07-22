import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MasterItem, MasterStatus, MasterStatusRecord } from "./compliance-master";

type CustomItem = Omit<MasterItem, "applies"> & { appliesExpr?: "always" | "factory" | "shop" | "women" | "contract" | "hazardous" };

const rid = () => (globalThis.crypto?.randomUUID?.() ?? `mi-${Date.now()}-${Math.random().toString(36).slice(2)}`);

type State = {
  customItems: CustomItem[];
  statuses: Record<string, MasterStatusRecord>;

  addItem: (i: Omit<CustomItem, "id">) => string;
  updateItem: (id: string, patch: Partial<CustomItem>) => void;
  deleteItem: (id: string) => void;

  setStatus: (itemId: string, patch: Partial<Omit<MasterStatusRecord, "itemId" | "updatedAt">>) => void;
  bulkSet: (ids: string[], status: MasterStatus, by: string) => void;
  reset: () => void;

  materializedCustom: () => MasterItem[];
};

function materialize(ci: CustomItem): MasterItem {
  const expr = ci.appliesExpr ?? "always";
  const applies = expr === "always" ? () => true
    : expr === "factory" ? (p: { establishmentType: string }) => p.establishmentType === "factory"
    : expr === "shop" ? (p: { establishmentType: string }) => p.establishmentType !== "factory"
    : expr === "women" ? (p: { womenEmployees: number }) => p.womenEmployees > 0
    : expr === "contract" ? (p: { contractLabour: boolean }) => p.contractLabour
    : (p: { hazardous: boolean }) => p.hazardous;
  return { ...ci, applies: applies as MasterItem["applies"] };
}

export const useComplianceMaster = create<State>()(
  persist(
    (set, get) => ({
      customItems: [],
      statuses: {},

      addItem: (i) => {
        const id = rid();
        set((s) => ({ customItems: [{ ...i, id }, ...s.customItems] }));
        return id;
      },
      updateItem: (id, patch) => set((s) => ({ customItems: s.customItems.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteItem: (id) => set((s) => ({ customItems: s.customItems.filter((c) => c.id !== id) })),

      setStatus: (itemId, patch) =>
        set((s) => ({
          statuses: {
            ...s.statuses,
            [itemId]: {
              itemId,
              status: patch.status ?? s.statuses[itemId]?.status ?? "pending",
              remarks: patch.remarks ?? s.statuses[itemId]?.remarks,
              reference: patch.reference ?? s.statuses[itemId]?.reference,
              updatedAt: new Date().toISOString(),
              updatedBy: patch.updatedBy ?? s.statuses[itemId]?.updatedBy ?? "admin",
            },
          },
        })),
      bulkSet: (ids, status, by) =>
        set((s) => {
          const next = { ...s.statuses };
          const now = new Date().toISOString();
          for (const id of ids) next[id] = { itemId: id, status, remarks: next[id]?.remarks, reference: next[id]?.reference, updatedAt: now, updatedBy: by };
          return { statuses: next };
        }),
      reset: () => set({ statuses: {} }),

      materializedCustom: () => get().customItems.map(materialize),
    }),
    { name: "swift-compliance-master", version: 1 },
  ),
);
