// SWIFT AI — Compliance Document Archive + Version Control + Audit
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DocApproval = { by: string; role: string; at: string; note?: string };

export type ArchivedDoc = {
  id: string;
  specId: string;
  code: string;
  title: string;
  ref: string;
  version: number;
  filename: string;
  dataUrl: string;         // base64 PDF (persisted)
  size: number;
  createdAt: string;
  createdBy: string;
  approvals: DocApproval[];
  signed: boolean;
  sealed: boolean;
  watermark?: string;
  branchId?: string;
  period?: string;
  tags: string[];
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  meta?: Record<string, string>;
};

type State = {
  docs: ArchivedDoc[];
  audit: AuditEntry[];
  archive: (d: Omit<ArchivedDoc, "id" | "version" | "createdAt"> & { version?: number }) => ArchivedDoc;
  signDoc: (id: string, by: string, role: string, note?: string) => void;
  remove: (id: string) => void;
  log: (a: Omit<AuditEntry, "id" | "at">) => void;
};

export const useComplianceDocs = create<State>()(
  persist(
    (set, get) => ({
      docs: [],
      audit: [],
      archive: (d) => {
        const prior = get().docs.filter((x) => x.specId === d.specId);
        const version = d.version ?? (prior.length + 1);
        const doc: ArchivedDoc = {
          ...d,
          id: `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          version,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          docs: [doc, ...s.docs],
          audit: [{
            id: `a_${Date.now().toString(36)}`,
            at: new Date().toISOString(),
            actor: d.createdBy,
            action: "generate",
            target: `${d.code} v${version}`,
            meta: { ref: d.ref },
          }, ...s.audit],
        }));
        return doc;
      },
      signDoc: (id, by, role, note) => set((s) => ({
        docs: s.docs.map((d) => d.id === id
          ? { ...d, signed: true, approvals: [...d.approvals, { by, role, at: new Date().toISOString(), note }] }
          : d),
        audit: [{ id: `a_${Date.now().toString(36)}`, at: new Date().toISOString(), actor: by, action: "sign", target: id, meta: { role } }, ...s.audit],
      })),
      remove: (id) => set((s) => ({
        docs: s.docs.filter((d) => d.id !== id),
        audit: [{ id: `a_${Date.now().toString(36)}`, at: new Date().toISOString(), actor: "system", action: "delete", target: id }, ...s.audit],
      })),
      log: (a) => set((s) => ({
        audit: [{ ...a, id: `a_${Date.now().toString(36)}`, at: new Date().toISOString() }, ...s.audit].slice(0, 2000),
      })),
    }),
    { name: "swift-compliance-docs" },
  ),
);

export async function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}
