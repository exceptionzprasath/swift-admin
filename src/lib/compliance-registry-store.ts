// SWIFT AI — Master Compliance Registry (Super Admin managed)
// Fully configuration-driven schema covering every metadata field required
// for enterprise compliance orchestration. Nothing is hardcoded — Super Admin
// can add unlimited Acts / Forms / Registers / Notices / Returns / Licences
// at runtime without any code change.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RegistryKind =
  | "act" | "rule" | "section" | "form" | "register"
  | "notice" | "return" | "licence" | "circular" | "amendment";

export type RegistryFrequency =
  | "daily" | "weekly" | "monthly" | "quarterly" | "half_yearly"
  | "annual" | "financial_year" | "calendar_year" | "biennial"
  | "one_time" | "on_event" | "ongoing" | "custom";

export type RegistryTriggerKind = "event" | "time" | "conditional" | "manual";

export type ApprovalStage =
  | "draft" | "ai_review" | "hr_review" | "manager_approval"
  | "compliance_approval" | "director_approval" | "digital_signature"
  | "final_pdf" | "archive";

export type Amendment = {
  id: string;
  date: string;          // ISO
  circularRef?: string;
  summary: string;
  by?: string;
};

export type ApplicabilityRule = {
  minEmployees?: number;
  maxEmployees?: number;
  minWomen?: number;
  states?: string[];         // e.g. ["Tamil Nadu"]
  industries?: string[];     // e.g. ["manufacturing"]
  establishmentTypes?: ("factory" | "shop" | "office" | "warehouse")[];
  requiresContractLabour?: boolean;
  requiresHazardous?: boolean;
  requiresNightShift?: boolean;
  requiresPower?: boolean;
  minBranches?: number;
  customExpr?: string;       // free-form for advanced ops (documentation only)
};

export type AutoFillMapping = {
  field: string;             // form field name / token
  source: string;            // "employee.name" | "branch.address" | ...
  fallback?: string;
  transform?: string;        // e.g. "upper", "date:DD-MM-YYYY"
};

export type ApprovalWorkflow = {
  stages: ApprovalStage[];
  requireDigitalSignature: boolean;
  requireSeal: boolean;
  requireWatermark: boolean;
  requireQR: boolean;
  autoArchive: boolean;
};

export type RegistryEntry = {
  id: string;
  kind: RegistryKind;

  // Statutory identity
  act: string;
  rule?: string;
  section?: string;
  code?: string;           // Form No. / Register No. / Notice No.
  title: string;
  purpose?: string;
  authority?: string;

  // Timing
  frequency: RegistryFrequency;
  dueDay?: number;         // 1-31
  dueMonth?: number;       // 1-12
  customCron?: string;     // for "custom" frequency
  effectiveDate?: string;  // ISO
  expiryDate?: string;     // ISO
  version: string;         // e.g. "2024.1"

  // Trigger
  triggerKind: RegistryTriggerKind;
  eventKey?: string;       // e.g. "employee_joined"
  reminderDays?: number[]; // [30,15,7,3,1]

  // Scope
  department?: string;
  state?: string;
  industry?: string;
  applicability: ApplicabilityRule;

  // Automation
  autoFill: AutoFillMapping[];
  approval: ApprovalWorkflow;
  aiInstructions?: string;

  // Change log
  circular?: string;
  amendments: Amendment[];
  createdAt: string;
  updatedAt: string;

  // Ops
  enabled: boolean;
  tags?: string[];
  penalty?: string;
};

// ── Seed catalogue ─────────────────────────────────────────────────────────
const now = () => new Date().toISOString();
const rid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `reg-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const emptyApprovalDefault = (): ApprovalWorkflow => ({
  stages: [
    "draft", "ai_review", "hr_review", "manager_approval",
    "compliance_approval", "digital_signature", "final_pdf", "archive",
  ],
  requireDigitalSignature: true,
  requireSeal: true,
  requireWatermark: false,
  requireQR: true,
  autoArchive: true,
});

function seedEntry(partial: Partial<RegistryEntry> & Pick<RegistryEntry,
  "kind" | "act" | "title" | "frequency" | "triggerKind">
): RegistryEntry {
  const ts = now();
  return {
    id: rid(),
    version: "1.0",
    applicability: {},
    autoFill: [],
    approval: emptyApprovalDefault(),
    amendments: [],
    createdAt: ts,
    updatedAt: ts,
    enabled: true,
    ...partial,
  } as RegistryEntry;
}

const SEED: Omit<RegistryEntry, "id" | "createdAt" | "updatedAt" | "version" |
  "applicability" | "autoFill" | "approval" | "amendments" | "enabled">[] = [
  // Acts
  { kind: "act", act: "Tamil Nadu Shops & Establishments Act", title: "TN Shops & Establishments Act 1947", authority: "TN Labour Dept", frequency: "ongoing", triggerKind: "conditional", state: "Tamil Nadu" },
  { kind: "act", act: "Factories Act", title: "Factories Act 1948", authority: "DISH", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "EPF", title: "Employees' Provident Fund Act 1952", authority: "EPFO", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "ESI", title: "Employees' State Insurance Act 1948", authority: "ESIC", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "Professional Tax", title: "State Professional Tax Act", authority: "Commercial Tax Dept", frequency: "monthly", triggerKind: "time", dueDay: 30 },
  { kind: "act", act: "LWF", title: "State Labour Welfare Fund Act", authority: "State LWF Board", frequency: "half_yearly", triggerKind: "time" },
  { kind: "act", act: "Payment of Wages", title: "Payment of Wages Act 1936", authority: "Labour Dept", frequency: "monthly", triggerKind: "time", dueDay: 7 },
  { kind: "act", act: "Minimum Wages", title: "Minimum Wages Act 1948", authority: "Labour Dept", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "Bonus", title: "Payment of Bonus Act 1965", authority: "Labour Dept", frequency: "annual", triggerKind: "time", dueMonth: 12, dueDay: 30 },
  { kind: "act", act: "Gratuity", title: "Payment of Gratuity Act 1972", authority: "Labour Dept", frequency: "on_event", triggerKind: "event", eventKey: "employee_exit" },
  { kind: "act", act: "Maternity Benefit", title: "Maternity Benefit Act 1961", authority: "Labour Dept", frequency: "on_event", triggerKind: "event", eventKey: "maternity_declared" },
  { kind: "act", act: "Equal Remuneration", title: "Equal Remuneration Act 1976", authority: "Labour Dept", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "CLRA", title: "Contract Labour (Regulation & Abolition) Act 1970", authority: "Labour Dept", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "Apprentices", title: "Apprentices Act 1961", authority: "BOAT", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "Industrial Relations Code", title: "Industrial Relations Code 2020", authority: "MoLE", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "OSH Code", title: "Occupational Safety, Health & Working Conditions Code 2020", authority: "MoLE", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "POSH", title: "Sexual Harassment of Women at Workplace Act 2013", authority: "ICC/LC", frequency: "annual", triggerKind: "time", dueMonth: 1, dueDay: 31 },
  { kind: "act", act: "Child Labour", title: "Child Labour (Prohibition & Regulation) Act 1986", authority: "Labour Dept", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "BOCW", title: "Building & Other Construction Workers Act 1996", authority: "BOCW Board", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "ISMW", title: "Inter-State Migrant Workers Act 1979", authority: "Labour Dept", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "act", act: "Environment", title: "Environmental Compliance (EPA/CPCB)", authority: "SPCB/CPCB", frequency: "annual", triggerKind: "time" },
  { kind: "act", act: "Fire Safety", title: "State Fire Services Act", authority: "Fire Dept", frequency: "annual", triggerKind: "time" },
  { kind: "act", act: "Pollution Control", title: "Water & Air (Prevention of Pollution) Acts", authority: "SPCB", frequency: "annual", triggerKind: "time" },
  { kind: "act", act: "Factory Licence", title: "Factory Licence Renewal", authority: "DISH", frequency: "annual", triggerKind: "time", dueMonth: 10, dueDay: 31 },
  { kind: "act", act: "Shops Registration", title: "Shops & Establishments Registration", authority: "Labour Dept", frequency: "annual", triggerKind: "time" },

  // TN Shops forms
  { kind: "form", act: "TN S&E Act", code: "Form B", title: "Registration Certificate of Establishment", frequency: "one_time", triggerKind: "manual", state: "Tamil Nadu" },
  { kind: "form", act: "TN S&E Act", code: "Form C", title: "Employer's Statement", frequency: "annual", triggerKind: "time", state: "Tamil Nadu" },
  { kind: "form", act: "TN S&E Act", code: "Form D", title: "Renewal of Registration", frequency: "annual", triggerKind: "time", state: "Tamil Nadu" },
  { kind: "form", act: "TN S&E Act", code: "Form H", title: "Notice of Weekly Holiday", frequency: "ongoing", triggerKind: "conditional", state: "Tamil Nadu" },
  { kind: "form", act: "TN S&E Act", code: "Form P", title: "Register of Wages", frequency: "monthly", triggerKind: "time", state: "Tamil Nadu" },
  { kind: "form", act: "TN S&E Act", code: "Form Q", title: "Wage Slip", frequency: "monthly", triggerKind: "time", state: "Tamil Nadu" },
  { kind: "form", act: "TN S&E Act", code: "Form R", title: "Register of Leave", frequency: "annual", triggerKind: "time", state: "Tamil Nadu" },
  { kind: "form", act: "TN S&E Act", code: "Form S", title: "Register of Employees", frequency: "ongoing", triggerKind: "conditional", state: "Tamil Nadu" },
  { kind: "form", act: "TN S&E Act", code: "Form T", title: "Combined Register", frequency: "ongoing", triggerKind: "conditional", state: "Tamil Nadu" },

  // Factory forms
  { kind: "form", act: "Factories Act", code: "Form 2", title: "Application for Registration & Grant of Licence", frequency: "one_time", triggerKind: "manual" },
  { kind: "form", act: "Factories Act", code: "Form 3", title: "Licence to Work a Factory", frequency: "annual", triggerKind: "time" },
  { kind: "form", act: "Factories Act", code: "Form 3A", title: "Amendment of Licence", frequency: "on_event", triggerKind: "event", eventKey: "occupier_changed" },
  { kind: "form", act: "Factories Act", code: "Form 4", title: "Notice of Occupation", frequency: "on_event", triggerKind: "event", eventKey: "occupier_changed" },
  { kind: "register", act: "Factories Act", code: "Form 12", title: "Register of Adult Workers", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "register", act: "Factories Act", code: "Form 14", title: "Register of Child Workers", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "register", act: "Factories Act", code: "Form 25", title: "Muster Roll", frequency: "monthly", triggerKind: "time" },
  { kind: "register", act: "Factories Act", code: "Form 25A", title: "Register of Compensatory Holidays", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "register", act: "Factories Act", code: "Form 25B", title: "Register of Accidents & Dangerous Occurrences", frequency: "on_event", triggerKind: "event", eventKey: "accident_recorded" },
  { kind: "register", act: "Factories Act", code: "Form 9", title: "Register of Leave with Wages", frequency: "annual", triggerKind: "time" },
  { kind: "register", act: "Factories Act", code: "Form 15", title: "Register of Leave with Wages (Adult)", frequency: "annual", triggerKind: "time" },
  { kind: "form", act: "Factories Act", code: "Form 5", title: "Certificate of Fitness", frequency: "annual", triggerKind: "time" },
  { kind: "form", act: "Factories Act", code: "Form 6", title: "Notice of Change of Manager", frequency: "on_event", triggerKind: "event", eventKey: "manager_changed" },
  { kind: "form", act: "Factories Act", code: "Form 7", title: "Record of Lime Washing / Painting", frequency: "ongoing", triggerKind: "conditional" },
  { kind: "form", act: "Factories Act", code: "Form 8", title: "Report of Examination of Pressure Vessel", frequency: "half_yearly", triggerKind: "time" },
  { kind: "form", act: "Factories Act", code: "Form 8A", title: "Report of Examination of Water Sealed Gas Holder", frequency: "annual", triggerKind: "time" },
  { kind: "form", act: "Factories Act", code: "Form 18", title: "Report of Accident / Dangerous Occurrence", frequency: "on_event", triggerKind: "event", eventKey: "accident_recorded" },
  { kind: "form", act: "Factories Act", code: "Form 26", title: "Report of Examination of Hoists & Lifts", frequency: "annual", triggerKind: "time" },
  { kind: "return", act: "Factories Act", code: "Form 21", title: "Annual Return", frequency: "annual", triggerKind: "time", dueMonth: 1, dueDay: 31 },
  { kind: "return", act: "Factories Act", code: "Form 22", title: "Half-Yearly Return", frequency: "half_yearly", triggerKind: "time", dueMonth: 7, dueDay: 15 },
];

type State = {
  entries: RegistryEntry[];
  seeded: boolean;

  addEntry: (e: Partial<RegistryEntry> & Pick<RegistryEntry,
    "kind" | "act" | "title" | "frequency" | "triggerKind">) => string;
  updateEntry: (id: string, patch: Partial<RegistryEntry>) => void;
  deleteEntry: (id: string) => void;
  toggleEntry: (id: string) => void;
  addAmendment: (id: string, a: Omit<Amendment, "id">) => void;
  removeAmendment: (id: string, amendmentId: string) => void;
  duplicateEntry: (id: string) => string | null;

  resetSeed: () => void;
};

export const useComplianceRegistry = create<State>()(
  persist(
    (set, get) => ({
      entries: SEED.map((s) => seedEntry(s)),
      seeded: true,

      addEntry: (e) => {
        const rec = seedEntry(e);
        set((st) => ({ entries: [rec, ...st.entries] }));
        return rec.id;
      },
      updateEntry: (id, patch) =>
        set((st) => ({
          entries: st.entries.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: now() } : x),
        })),
      deleteEntry: (id) =>
        set((st) => ({ entries: st.entries.filter((x) => x.id !== id) })),
      toggleEntry: (id) =>
        set((st) => ({
          entries: st.entries.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled, updatedAt: now() } : x),
        })),
      addAmendment: (id, a) =>
        set((st) => ({
          entries: st.entries.map((x) =>
            x.id === id
              ? { ...x, amendments: [{ ...a, id: rid() }, ...x.amendments], updatedAt: now() }
              : x),
        })),
      removeAmendment: (id, amendmentId) =>
        set((st) => ({
          entries: st.entries.map((x) =>
            x.id === id
              ? { ...x, amendments: x.amendments.filter((a) => a.id !== amendmentId), updatedAt: now() }
              : x),
        })),
      duplicateEntry: (id) => {
        const src = get().entries.find((x) => x.id === id);
        if (!src) return null;
        const copy: RegistryEntry = {
          ...src,
          id: rid(),
          title: `${src.title} (copy)`,
          createdAt: now(),
          updatedAt: now(),
        };
        set((st) => ({ entries: [copy, ...st.entries] }));
        return copy.id;
      },

      resetSeed: () =>
        set({ entries: SEED.map((s) => seedEntry(s)), seeded: true }),
    }),
    { name: "swift-compliance-registry", version: 1 },
  ),
);

export const REGISTRY_KIND_LABEL: Record<RegistryKind, string> = {
  act: "Act", rule: "Rule", section: "Section", form: "Form",
  register: "Register", notice: "Notice", return: "Return",
  licence: "Licence", circular: "Circular", amendment: "Amendment",
};
