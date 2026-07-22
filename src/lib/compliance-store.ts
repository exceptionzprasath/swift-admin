import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_PROFILE, DEFAULT_REMINDER_LADDER, DEFAULT_TRIGGERS, SEED_FORM_LIBRARY,
  SEED_RULES, SEED_KNOWLEDGE,
  formsForEvent, evaluateRulesForEvent,
  type ComplianceProfile, type CalendarEvent, type FilingStatus,
  type EventTriggerConfig, type ComplianceEventKey, type FormTemplate,
  type ComplianceRule, type KnowledgeAct, type FormVersion,
} from "./compliance";
import { onCompliance } from "./compliance-bus";

export type FiledRecord = {
  eventId: string;
  formId: string;
  filedAt: string;
  reference?: string;
  filedBy: string;
  fileDataUrl?: string;
};

export type ComplianceDocument = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  moduleKey?: string;
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  expiryDate?: string;
  fileDataUrl?: string;
  fileType?: string;
  triggeredBy?: ComplianceEventKey;
  status?: "draft" | "generated" | "filed" | "waived";
  audit: { at: string; by: string; action: string; note?: string }[];
};

export type ReminderChannel = "dashboard" | "email" | "sms" | "whatsapp" | "push";

export type ComplianceAuditEntry = {
  id: string;
  at: string;
  by: string;
  action:
    | "generated" | "edited" | "approved" | "submitted" | "downloaded" | "rejected"
    | "archived" | "deleted" | "reminded" | "profile_updated"
    | "event_fired" | "trigger_updated" | "form_added" | "form_updated" | "form_deleted";
  target: string;
  ip?: string;
  device?: string;
  reason?: string;
};

export type ReminderSettings = {
  ladder: number[];
  gracePeriodDays: number;
  finalWarningDays: number;
  escalateOnOverdue: boolean;
  escalateTo: string;      // role/email
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  weekendsOff: boolean;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  ladder: DEFAULT_REMINDER_LADDER,
  gracePeriodDays: 3,
  finalWarningDays: 1,
  escalateOnOverdue: true,
  escalateTo: "compliance-head",
  quietHoursStart: "21:00",
  quietHoursEnd: "07:00",
  weekendsOff: false,
};

type State = {
  profile: ComplianceProfile;
  reminderLadder: number[];
  reminderSettings: ReminderSettings;
  channels: Record<ReminderChannel, boolean>;
  triggers: EventTriggerConfig[];
  customForms: FormTemplate[]; // additive; merged with SEED_FORM_LIBRARY
  filed: FiledRecord[];
  waived: string[]; // eventIds
  documents: ComplianceDocument[];
  audit: ComplianceAuditEntry[];

  rules: ComplianceRule[];
  knowledge: KnowledgeAct[];
  formVersions: FormVersion[];

  setProfile: (p: Partial<ComplianceProfile>) => void;
  setReminderLadder: (l: number[]) => void;
  setReminderSettings: (s: Partial<ReminderSettings>) => void;
  setChannel: (c: ReminderChannel, on: boolean) => void;

  updateTrigger: (event: ComplianceEventKey, patch: Partial<EventTriggerConfig>) => void;
  resetTriggers: () => void;

  addCustomForm: (f: Omit<FormTemplate, "custom">) => void;
  updateCustomForm: (id: string, patch: Partial<FormTemplate>) => void;
  deleteCustomForm: (id: string) => void;
  allForms: () => FormTemplate[];

  addRule: (r: Omit<ComplianceRule, "id" | "createdAt" | "updatedAt">) => string;
  updateRule: (id: string, patch: Partial<ComplianceRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string, active: boolean) => void;

  addKnowledge: (k: Omit<KnowledgeAct, "id">) => string;
  updateKnowledge: (id: string, patch: Partial<KnowledgeAct>) => void;
  deleteKnowledge: (id: string) => void;

  addFormVersion: (v: Omit<FormVersion, "id" | "createdAt">) => string;
  updateFormVersion: (id: string, patch: Partial<FormVersion>) => void;
  deleteFormVersion: (id: string) => void;

  fireEvent: (event: ComplianceEventKey, ctx: { subject: string; by: string; note?: string; formIds?: string[]; meta?: Record<string, unknown> }) => string[];

  fileEvent: (rec: Omit<FiledRecord, "filedAt"> & { filedAt?: string }) => void;
  waiveEvent: (id: string, reason: string, by: string) => void;
  unwaiveEvent: (id: string) => void;
  addDocument: (d: Omit<ComplianceDocument, "id" | "uploadedAt" | "audit" | "version"> & { version?: number }) => string;
  deleteDocument: (id: string, by: string) => void;
  addAudit: (a: Omit<ComplianceAuditEntry, "id" | "at">) => void;
  effectiveStatus: (evt: CalendarEvent) => FilingStatus;
};

const rid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const useCompliance = create<State>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      reminderLadder: DEFAULT_REMINDER_LADDER,
      reminderSettings: DEFAULT_REMINDER_SETTINGS,
      channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true },
      triggers: DEFAULT_TRIGGERS,
      customForms: [],
      filed: [],
      waived: [],
      documents: [],
      audit: [],
      rules: SEED_RULES,
      knowledge: SEED_KNOWLEDGE,
      formVersions: [],

      addRule: (r) => {
        const id = rid();
        const now = new Date().toISOString();
        set((s) => ({ rules: [{ ...r, id, createdAt: now, updatedAt: now }, ...s.rules] }));
        get().addAudit({ by: "admin", action: "form_added", target: `rule:${r.name}` });
        return id;
      },
      updateRule: (id, patch) => {
        set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)) }));
        get().addAudit({ by: "admin", action: "form_updated", target: `rule:${id}`, reason: Object.keys(patch).join(",") });
      },
      deleteRule: (id) => {
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
        get().addAudit({ by: "admin", action: "form_deleted", target: `rule:${id}` });
      },
      toggleRule: (id, active) => {
        set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, active, updatedAt: new Date().toISOString() } : r)) }));
        get().addAudit({ by: "admin", action: "trigger_updated", target: `rule:${id}`, reason: active ? "activated" : "deactivated" });
      },

      addKnowledge: (k) => {
        const id = rid();
        set((s) => ({ knowledge: [{ ...k, id }, ...s.knowledge] }));
        get().addAudit({ by: "admin", action: "form_added", target: `kb:${k.name}` });
        return id;
      },
      updateKnowledge: (id, patch) => {
        set((s) => ({ knowledge: s.knowledge.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));
        get().addAudit({ by: "admin", action: "form_updated", target: `kb:${id}` });
      },
      deleteKnowledge: (id) => {
        set((s) => ({ knowledge: s.knowledge.filter((k) => k.id !== id) }));
        get().addAudit({ by: "admin", action: "form_deleted", target: `kb:${id}` });
      },

      addFormVersion: (v) => {
        const id = rid();
        set((s) => ({ formVersions: [{ ...v, id, createdAt: new Date().toISOString() }, ...s.formVersions] }));
        get().addAudit({ by: "admin", action: "form_added", target: `ver:${v.formId}:${v.version}` });
        return id;
      },
      updateFormVersion: (id, patch) => {
        set((s) => ({ formVersions: s.formVersions.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
        get().addAudit({ by: "admin", action: "form_updated", target: `ver:${id}` });
      },
      deleteFormVersion: (id) => {
        set((s) => ({ formVersions: s.formVersions.filter((v) => v.id !== id) }));
        get().addAudit({ by: "admin", action: "form_deleted", target: `ver:${id}` });
      },


      setProfile: (p) => {
        set((s) => ({ profile: { ...s.profile, ...p } }));
        get().addAudit({ by: "system", action: "profile_updated", target: "compliance_profile", reason: JSON.stringify(p).slice(0, 200) });
      },
      setReminderLadder: (reminderLadder) => set((s) => ({ reminderLadder, reminderSettings: { ...s.reminderSettings, ladder: reminderLadder } })),
      setReminderSettings: (patch) => set((s) => ({ reminderSettings: { ...s.reminderSettings, ...patch }, reminderLadder: patch.ladder ?? s.reminderLadder })),
      setChannel: (c, on) => set((s) => ({ channels: { ...s.channels, [c]: on } })),

      updateTrigger: (event, patch) => {
        set((s) => ({ triggers: s.triggers.map((t) => (t.event === event ? { ...t, ...patch } : t)) }));
        get().addAudit({ by: "admin", action: "trigger_updated", target: event, reason: Object.keys(patch).join(",") });
      },
      resetTriggers: () => set({ triggers: DEFAULT_TRIGGERS }),

      addCustomForm: (f) => {
        set((s) => ({ customForms: [...s.customForms, { ...f, custom: true }] }));
        get().addAudit({ by: "admin", action: "form_added", target: f.formName });
      },
      updateCustomForm: (id, patch) => {
        set((s) => ({ customForms: s.customForms.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
        get().addAudit({ by: "admin", action: "form_updated", target: id, reason: Object.keys(patch).join(",") });
      },
      deleteCustomForm: (id) => {
        set((s) => ({ customForms: s.customForms.filter((f) => f.id !== id) }));
        get().addAudit({ by: "admin", action: "form_deleted", target: id });
      },
      allForms: () => [...SEED_FORM_LIBRARY, ...get().customForms],

      fireEvent: (event, ctx) => {
        const state = get();
        const trig = state.triggers.find((t) => t.event === event);
        const matchingRules = evaluateRulesForEvent(state.rules, event, state.profile, ctx.meta ?? {});

        if ((!trig || !trig.enabled) && matchingRules.length === 0) {
          state.addAudit({ by: ctx.by, action: "event_fired", target: `${event}:no-match`, reason: ctx.note });
          return [];
        }

        const trigForms = trig?.enabled ? (ctx.formIds ?? trig.forms) : [];
        const ruleForms = matchingRules.flatMap((r) => r.generatedFormIds);
        const formIds = Array.from(new Set([...trigForms, ...ruleForms]));
        const forms = formsForEvent(event, state.allForms(), formIds);
        const now = new Date();
        now.setDate(now.getDate() + (trig?.daysOffset ?? 0));
        const isoDate = now.toISOString().slice(0, 10);
        const autoFile = trig?.autoFile ?? false;
        const ids: string[] = [];
        for (const f of forms) {
          const name = `${f.formName} — ${ctx.subject} (${isoDate}).pdf`;
          const id = state.addDocument({
            name, category: "Statutory · Event", tags: [f.moduleKey, event],
            moduleKey: f.moduleKey, uploadedBy: `Trigger: ${ctx.by}`, version: 1,
            triggeredBy: event, status: autoFile ? "filed" : "generated",
          });
          ids.push(id);
        }
        const channelList = trig ? Object.entries(trig.channels).filter(([, v]) => v).map(([k]) => k).join("/") : "—";
        state.addAudit({
          by: ctx.by, action: "event_fired",
          target: `${event} → ${ctx.subject}`,
          reason: `${forms.length} form(s) · ${matchingRules.length} rule(s) [${matchingRules.map((r) => r.name).join(", ") || "—"}] · notify: ${channelList}`,
        });
        return ids;
      },


      fileEvent: (rec) => {
        const filedAt = rec.filedAt ?? new Date().toISOString();
        set((s) => ({ filed: [{ ...rec, filedAt }, ...s.filed.filter((f) => f.eventId !== rec.eventId)] }));
        get().addAudit({ by: rec.filedBy, action: "submitted", target: rec.eventId, reason: rec.reference });
      },
      waiveEvent: (id, reason, by) => {
        set((s) => ({ waived: Array.from(new Set([...s.waived, id])) }));
        get().addAudit({ by, action: "archived", target: id, reason });
      },
      unwaiveEvent: (id) => set((s) => ({ waived: s.waived.filter((w) => w !== id) })),
      addDocument: (d) => {
        const id = rid();
        const doc: ComplianceDocument = {
          ...d,
          id,
          version: d.version ?? 1,
          uploadedAt: new Date().toISOString(),
          audit: [{ at: new Date().toISOString(), by: d.uploadedBy, action: "generated" }],
        };
        set((s) => ({ documents: [doc, ...s.documents] }));
        get().addAudit({ by: d.uploadedBy, action: "generated", target: doc.name });
        return id;
      },
      deleteDocument: (id, by) => {
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
        get().addAudit({ by, action: "deleted", target: id });
      },
      addAudit: (a) => set((s) => ({ audit: [{ id: rid(), at: new Date().toISOString(), ...a }, ...s.audit].slice(0, 2000) })),
      effectiveStatus: (evt) => {
        const s = get();
        if (s.waived.includes(evt.id)) return "waived";
        if (s.filed.some((f) => f.eventId === evt.id)) return "filed";
        return evt.status;
      },
    }),
    { name: "swift-compliance", version: 3 },
  ),
);

// Cross-module event bus → compliance store.
// Any module calling emitCompliance(...) fires through the rule engine + triggers.
let _busBound = false;
if (!_busBound) {
  _busBound = true;
  onCompliance((event, payload) => {
    try {
      useCompliance.getState().fireEvent(event, {
        subject: payload.subject,
        by: payload.by ?? "system",
        note: payload.note,
        meta: payload.meta,
      });
    } catch { /* never crash the caller */ }
  });
}

