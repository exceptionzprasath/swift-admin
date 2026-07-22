// SWIFT — Super Admin operations store (CRM, checklists, white-label)
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketNote = { id: string; ts: string; author: string; text: string };
export type SupportTicket = {
  id: string;
  tenantId: string;
  subject: string;
  body: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  channel: "email" | "phone" | "whatsapp" | "portal" | "meeting";
  createdAt: string;
  updatedAt: string;
  notes: TicketNote[];
};

export type TouchpointKind = "call" | "meeting" | "whatsapp" | "email" | "note";
export type Touchpoint = {
  id: string;
  tenantId: string;
  ts: string;
  kind: TouchpointKind;
  summary: string;
  by: string;
};

export type ChecklistKey =
  | "company_created" | "branch_added" | "employees_imported"
  | "attendance_configured" | "payroll_configured" | "pf_configured"
  | "esi_configured" | "leave_configured" | "ai_configured"
  | "compliance_configured" | "documents_configured" | "training_completed";

export const CHECKLIST_ITEMS: { key: ChecklistKey; label: string; group: string }[] = [
  { key: "company_created", label: "Company created", group: "Setup" },
  { key: "branch_added", label: "Branch added", group: "Setup" },
  { key: "employees_imported", label: "Employees imported", group: "Setup" },
  { key: "attendance_configured", label: "Attendance configured", group: "Modules" },
  { key: "payroll_configured", label: "Payroll configured", group: "Modules" },
  { key: "pf_configured", label: "PF configured", group: "Statutory" },
  { key: "esi_configured", label: "ESI configured", group: "Statutory" },
  { key: "leave_configured", label: "Leave configured", group: "Modules" },
  { key: "ai_configured", label: "AI configured", group: "AI" },
  { key: "compliance_configured", label: "Compliance configured", group: "Compliance" },
  { key: "documents_configured", label: "Documents configured", group: "Documents" },
  { key: "training_completed", label: "Training completed", group: "Onboarding" },
];

export type TenantChecklist = Record<ChecklistKey, boolean>;
export const emptyChecklist = (): TenantChecklist =>
  Object.fromEntries(CHECKLIST_ITEMS.map((c) => [c.key, false])) as TenantChecklist;

export type ImpersonationLog = {
  id: string; ts: string; tenantId: string; actor: string; note?: string;
};

export type WhiteLabelSettings = {
  brandName: string;
  tagline: string;
  logoDataUrl?: string;
  faviconDataUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  pdfHeader: string;
  pdfFooter: string;
  emailFromName: string;
  emailFromAddress: string;
  supportEmail: string;
  supportPhone: string;
  smtpHost?: string;
  smtpUser?: string;
  smsGateway?: string;
  whatsappGateway?: string;
  paymentGateway?: string;
  storageProvider?: string;
  aiProvider?: string;
  domain?: string;
  mobileAppScheme?: string;
};

export const defaultWhiteLabel: WhiteLabelSettings = {
  brandName: "SWIFT AI",
  tagline: "Enterprise HR, Payroll & Compliance",
  primaryColor: "#4f46e5",
  secondaryColor: "#0ea5e9",
  pdfHeader: "Powered by SWIFT AI",
  pdfFooter: "Confidential — for internal use only",
  emailFromName: "SWIFT AI",
  emailFromAddress: "no-reply@swift.ai",
  supportEmail: "support@swift.ai",
  supportPhone: "+91 00000 00000",
  smtpHost: "smtp.swift.ai",
  smsGateway: "MSG91",
  whatsappGateway: "Gupshup",
  paymentGateway: "Razorpay",
  storageProvider: "Cloudflare R2",
  aiProvider: "OpenAI ChatGPT",
};

export type UsageSnapshot = { tenantId: string; day: string; aiConversations: number; docs: number; loginCount: number };

export type UpiSettings = {
  payeeName: string;
  upiId: string;
  merchantCode?: string;
  qrImageDataUrl?: string;
  instructions: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
};
export const defaultUpi: UpiSettings = {
  payeeName: "SWIFT AI Technologies",
  upiId: "swiftai@icici",
  instructions: "Scan the QR with any UPI app (GPay, PhonePe, Paytm, BHIM). After payment, upload the screenshot for verification.",
  bankName: "ICICI Bank",
  accountNumber: "1234567890",
  ifsc: "ICIC0001234",
};

export type PaymentSubmission = {
  id: string;
  tenantId: string;
  tenantName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  utr?: string;
  payerName?: string;
  payerContact?: string;
  note?: string;
  screenshotDataUrl?: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
};


type State = {
  tickets: SupportTicket[];
  touchpoints: Touchpoint[];
  checklists: Record<string, TenantChecklist>;
  impersonation: ImpersonationLog[];
  whiteLabel: WhiteLabelSettings;
  usage: UsageSnapshot[];
  upi: UpiSettings;
  paymentSubmissions: PaymentSubmission[];

  addTicket: (t: Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "notes">) => void;
  updateTicket: (id: string, patch: Partial<SupportTicket>) => void;
  addTicketNote: (id: string, note: Omit<TicketNote, "id" | "ts">) => void;
  deleteTicket: (id: string) => void;

  addTouchpoint: (t: Omit<Touchpoint, "id" | "ts">) => void;
  deleteTouchpoint: (id: string) => void;

  getChecklist: (tenantId: string) => TenantChecklist;
  setChecklistItem: (tenantId: string, key: ChecklistKey, val: boolean) => void;

  recordImpersonation: (tenantId: string, actor: string, note?: string) => void;

  updateWhiteLabel: (patch: Partial<WhiteLabelSettings>) => void;
  resetWhiteLabel: () => void;

  updateUpi: (patch: Partial<UpiSettings>) => void;
  resetUpi: () => void;
  submitPayment: (p: Omit<PaymentSubmission, "id" | "submittedAt" | "status">) => PaymentSubmission;
  verifyPayment: (id: string, verifiedBy: string) => PaymentSubmission | null;
  rejectPayment: (id: string, verifiedBy: string, reason: string) => void;
  deletePayment: (id: string) => void;

  seedDemoOps: () => void;
  resetOps: () => void;
};

const initial = () => ({
  tickets: [] as SupportTicket[],
  touchpoints: [] as Touchpoint[],
  checklists: {} as Record<string, TenantChecklist>,
  impersonation: [] as ImpersonationLog[],
  whiteLabel: defaultWhiteLabel,
  usage: [] as UsageSnapshot[],
  upi: defaultUpi,
  paymentSubmissions: [] as PaymentSubmission[],
});


export const useSuperAdmin = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),

      addTicket: (t) => set((s) => ({
        tickets: [{
          ...t, id: crypto.randomUUID(),
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          notes: [],
        }, ...s.tickets],
      })),
      updateTicket: (id, patch) => set((s) => ({
        tickets: s.tickets.map((t) => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t),
      })),
      addTicketNote: (id, note) => set((s) => ({
        tickets: s.tickets.map((t) => t.id === id ? {
          ...t, updatedAt: new Date().toISOString(),
          notes: [{ ...note, id: crypto.randomUUID(), ts: new Date().toISOString() }, ...t.notes],
        } : t),
      })),
      deleteTicket: (id) => set((s) => ({ tickets: s.tickets.filter((t) => t.id !== id) })),

      addTouchpoint: (t) => set((s) => ({
        touchpoints: [{ ...t, id: crypto.randomUUID(), ts: new Date().toISOString() }, ...s.touchpoints],
      })),
      deleteTouchpoint: (id) => set((s) => ({ touchpoints: s.touchpoints.filter((t) => t.id !== id) })),

      getChecklist: (tenantId) => get().checklists[tenantId] ?? emptyChecklist(),
      setChecklistItem: (tenantId, key, val) => set((s) => {
        const cur = s.checklists[tenantId] ?? emptyChecklist();
        return { checklists: { ...s.checklists, [tenantId]: { ...cur, [key]: val } } };
      }),

      recordImpersonation: (tenantId, actor, note) => set((s) => ({
        impersonation: [{
          id: crypto.randomUUID(), ts: new Date().toISOString(), tenantId, actor, note,
        }, ...s.impersonation].slice(0, 200),
      })),

      updateWhiteLabel: (patch) => set((s) => ({ whiteLabel: { ...s.whiteLabel, ...patch } })),
      resetWhiteLabel: () => set({ whiteLabel: defaultWhiteLabel }),

      updateUpi: (patch) => set((s) => ({ upi: { ...s.upi, ...patch } })),
      resetUpi: () => set({ upi: defaultUpi }),
      submitPayment: (p) => {
        const rec: PaymentSubmission = {
          ...p, id: crypto.randomUUID(), submittedAt: new Date().toISOString(), status: "pending",
        };
        set((s) => ({ paymentSubmissions: [rec, ...s.paymentSubmissions] }));
        return rec;
      },
      verifyPayment: (id, verifiedBy) => {
        const rec = get().paymentSubmissions.find((p) => p.id === id);
        if (!rec) return null;
        const updated: PaymentSubmission = { ...rec, status: "verified", verifiedAt: new Date().toISOString(), verifiedBy };
        set((s) => ({ paymentSubmissions: s.paymentSubmissions.map((x) => x.id === id ? updated : x) }));
        return updated;
      },
      rejectPayment: (id, verifiedBy, reason) => set((s) => ({
        paymentSubmissions: s.paymentSubmissions.map((x) => x.id === id
          ? { ...x, status: "rejected", verifiedAt: new Date().toISOString(), verifiedBy, rejectionReason: reason } : x),
      })),
      deletePayment: (id) => set((s) => ({ paymentSubmissions: s.paymentSubmissions.filter((x) => x.id !== id) })),


      seedDemoOps: () => {
        if (get().tickets.length > 0) return;
        const now = new Date();
        set({
          tickets: [
            {
              id: crypto.randomUUID(), tenantId: "demo-tenant",
              subject: "PF challan generation issue", body: "PF challan for April 2026 shows wrong wage ceiling.",
              priority: "high", status: "in_progress", assignedTo: "Aditi (Support L2)",
              channel: "email", createdAt: now.toISOString(), updatedAt: now.toISOString(),
              notes: [{ id: crypto.randomUUID(), ts: now.toISOString(), author: "Aditi", text: "Reproduced. Escalating to payroll AI team." }],
            },
            {
              id: crypto.randomUUID(), tenantId: "demo-tenant",
              subject: "Onboarding walk-through", body: "HR team wants a live walk-through of registration + attendance profiles.",
              priority: "normal", status: "waiting", assignedTo: "Priya (CSM)",
              channel: "meeting", createdAt: now.toISOString(), updatedAt: now.toISOString(), notes: [],
            },
          ],
          touchpoints: [
            { id: crypto.randomUUID(), tenantId: "demo-tenant", ts: now.toISOString(), kind: "call", summary: "Renewal call — plan upgrade discussed", by: "Priya (CSM)" },
            { id: crypto.randomUUID(), tenantId: "demo-tenant", ts: now.toISOString(), kind: "whatsapp", summary: "Sent implementation checklist", by: "Aditi" },
          ],
        });
      },

      resetOps: () => set(initial()),
    }),
    { name: "swift-super-admin-ops" },
  ),
);

export function computeCompletion(cl: TenantChecklist): number {
  const total = CHECKLIST_ITEMS.length;
  const done = CHECKLIST_ITEMS.filter((c) => cl[c.key]).length;
  return Math.round((done / total) * 100);
}
