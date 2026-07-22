// AI Employee Lifecycle & Document Orchestration — types + defaults
// Everything here is company-configurable and persisted via store.ts.

import type { LetterKey } from "./documents";

export type DocRole = "employee" | "manager" | "hr" | "admin" | "director" | "compliance" | "auditor";
export type DocPermission = { create: DocRole[]; read: DocRole[]; edit: DocRole[]; approve: DocRole[]; download: DocRole[] };

export type DocumentLibraryItem = {
  id: string;
  code: string;                 // e.g. OFR, APT, NDA, JOR
  title: string;
  category: string;             // Joining, HR, Compliance, Exit, ...
  subCategory?: string;
  letterKey?: LetterKey | string; // maps to template registry when auto-generated
  sequence: number;             // order in joining/exit journey
  mandatory: boolean;
  autoGenerate: boolean;        // AI generates on trigger event
  approvalRequired: boolean;
  digitalSignatureRequired: boolean;
  sealRequired: boolean;
  confidential: boolean;
  employeeVisible: boolean;
  reminderDays?: number;
  expiryDays?: number;
  permissions: DocPermission;
  trigger: "on_registration" | "on_probation" | "on_confirmation" | "on_promotion" | "on_transfer" | "on_exit" | "on_request" | "manual";
  language: "en" | "hi" | "ta" | "te" | "kn" | "ml" | "mr" | "gu" | "bn";
  version: string;
  active: boolean;
};

export type JourneyStepStatus = "pending" | "in_progress" | "generated" | "signed" | "approved" | "rejected" | "skipped";
export type JourneyStep = {
  id: string;
  docId: string;                // -> DocumentLibraryItem.id
  code: string;
  title: string;
  status: JourneyStepStatus;
  generatedAt?: string;
  signedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
  signatureDataUrl?: string;
  signedBy?: string;
  signedByRole?: string;
};


export type LifecyclePhase = "recruitment" | "onboarding" | "probation" | "confirmed" | "active" | "notice" | "exiting" | "exited";

export type EmployeeJourney = {
  employeeId: string;
  phase: LifecyclePhase;
  startedAt: string;
  probationMonths: number;
  confirmedAt?: string;
  exitInitiatedAt?: string;
  steps: JourneyStep[];
};

export type CompanyDocumentAssets = {
  letterheadDataUrl?: string;
  footerDataUrl?: string;
  logoDataUrl?: string;         // mirrors company.logoDataUrl
  mdSignatureDataUrl?: string;
  hrSignatureDataUrl?: string;
  authorisedSignatoryDataUrl?: string;
  branchManagerSignatureDataUrl?: string;
  factoryManagerSignatureDataUrl?: string;
  companySealDataUrl?: string;
  departmentSealDataUrl?: string;
  watermarkDataUrl?: string;
  qrCodeDataUrl?: string;
  docNumberPrefix: string;      // e.g. "SW"
  docNumberFormat: string;      // e.g. "{PREFIX}/{CODE}/{YYYY}/{SEQ}"
  digitalCertificateName?: string;
};

export const DEFAULT_DOC_ASSETS: CompanyDocumentAssets = {
  docNumberPrefix: "SW",
  docNumberFormat: "{PREFIX}/{CODE}/{YYYY}/{SEQ}",
};

const allRoles: DocRole[] = ["employee", "manager", "hr", "admin", "director", "compliance", "auditor"];
const hrOnly: DocPermission = {
  create: ["hr", "admin"], read: allRoles, edit: ["hr", "admin"],
  approve: ["hr", "director"], download: ["employee", "hr", "admin", "director"],
};
const employeeEditable: DocPermission = {
  create: ["employee", "hr"], read: ["employee", "hr", "admin"], edit: ["employee", "hr"],
  approve: ["hr"], download: ["employee", "hr", "admin"],
};

function j(seq: number, code: string, title: string, letterKey: string | undefined, opts: Partial<DocumentLibraryItem> = {}): DocumentLibraryItem {
  return {
    // Deterministic id (based on doc code) so buildDefaultLibrary() can be
    // called during module init on runtimes that forbid random values in
    // global scope (e.g. Cloudflare Workers).
    id: `lib-${code}`,
    code, title, category: "Joining", sequence: seq, letterKey,
    mandatory: true, autoGenerate: !!letterKey,
    approvalRequired: true, digitalSignatureRequired: true, sealRequired: false,
    confidential: false, employeeVisible: true,
    permissions: hrOnly, trigger: "on_registration",
    language: "en", version: "1.0", active: true,
    ...opts,
  };
}

export function buildDefaultLibrary(): DocumentLibraryItem[] {
  return [
    j(1,  "OFR", "Offer Letter",                       "offer"),
    j(2,  "CAC", "Candidate Acceptance",               undefined, { autoGenerate: false, permissions: employeeEditable }),
    j(3,  "APT", "Appointment Letter",                 "appointment"),
    j(4,  "JOR", "Joining Report",                     "joining_report"),
    j(5,  "EIF", "Employee Information Form",          undefined, { autoGenerate: false, permissions: employeeEditable }),
    j(6,  "NDA", "Non-Disclosure Agreement",           "nda", { sealRequired: true, confidential: true }),
    j(7,  "COC", "Code of Conduct",                    undefined, { autoGenerate: false, permissions: employeeEditable }),
    j(8,  "POL", "Policy Acceptance",                  undefined, { autoGenerate: false, permissions: employeeEditable }),
    j(9,  "PAY", "Payroll Registration",               undefined, { autoGenerate: false }),
    j(10, "BNK", "Bank Advice / Form",                 undefined, { autoGenerate: false, permissions: employeeEditable }),
    j(11, "PFR", "PF Registration (Form 11)",          undefined, { autoGenerate: false, category: "Compliance" }),
    j(12, "ESI", "ESI Registration",                   undefined, { autoGenerate: false, category: "Compliance" }),
    j(13, "AST", "Asset Allocation Form",              undefined, { category: "Asset", autoGenerate: false }),
    j(14, "IDC", "Employee ID Card",                   undefined, { category: "HR", autoGenerate: false, sealRequired: true }),
    j(15, "IND", "Induction Schedule",                 undefined, { category: "Training", autoGenerate: false }),
    j(16, "TRN", "Training Schedule",                  undefined, { category: "Training", autoGenerate: false }),
    // Post-joining lifecycle triggers:
    { ...j(17, "PRO", "Probation Extension",           "probation_extension"), trigger: "on_probation", mandatory: false },
    { ...j(18, "CNF", "Confirmation Letter",           "confirmation"),        trigger: "on_confirmation", mandatory: false, category: "Confirmation" },
    { ...j(19, "PRM", "Promotion Letter",              "promotion"),           trigger: "on_promotion", mandatory: false, category: "Movement" },
    { ...j(20, "TRF", "Transfer Letter",               "transfer"),            trigger: "on_transfer", mandatory: false, category: "Movement" },
    { ...j(21, "INC", "Increment Letter",              "increment"),           trigger: "manual",       mandatory: false, category: "Movement" },
    { ...j(22, "REL", "Relieving Letter",              "relieving"),           trigger: "on_exit",      mandatory: false, category: "Exit" },
    { ...j(23, "EXP", "Experience Certificate",        "experience"),          trigger: "on_exit",      mandatory: false, category: "Exit" },
    { ...j(24, "FNF", "Full & Final Settlement",       "full_final"),          trigger: "on_exit",      mandatory: false, category: "Exit" },
    { ...j(25, "EXC", "Exit Clearance Form",           "exit_clearance"),      trigger: "on_exit",      mandatory: false, category: "Exit" },
  ];
}

export function buildEmployeeJourney(employeeId: string, library: DocumentLibraryItem[], probationMonths = 6): EmployeeJourney {
  const steps: JourneyStep[] = library
    .filter((d) => d.active && d.trigger === "on_registration")
    .sort((a, b) => a.sequence - b.sequence)
    .map((d) => ({
      id: crypto.randomUUID(),
      docId: d.id,
      code: d.code,
      title: d.title,
      status: "pending",
    }));
  return {
    employeeId,
    phase: "onboarding",
    startedAt: new Date().toISOString(),
    probationMonths,
    steps,
  };
}

export function nextPendingStep(j?: EmployeeJourney): JourneyStep | undefined {
  return j?.steps.find((s) => s.status === "pending" || s.status === "in_progress");
}

export function journeyProgress(j?: EmployeeJourney): { done: number; total: number; pct: number } {
  if (!j || j.steps.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = j.steps.filter((s) => ["generated", "signed", "approved", "skipped"].includes(s.status)).length;
  return { done, total: j.steps.length, pct: Math.round((done / j.steps.length) * 100) };
}

export const LIFECYCLE_QUESTIONS: Record<string, string[]> = {
  on_promotion: [
    "Effective date of promotion?",
    "New designation and department?",
    "Should salary revise? By how much?",
    "Reporting manager change?",
    "Should ID card regenerate?",
  ],
  on_transfer: [
    "Effective date of transfer?",
    "Destination branch/location?",
    "New reporting manager?",
    "Should attendance / shift rules change?",
  ],
  on_confirmation: [
    "Effective confirmation date?",
    "Any salary revision on confirmation?",
    "Update compliance (PF/ESI ceiling)?",
  ],
  on_exit: [
    "Last working day?",
    "Notice period served fully?",
    "Assets returned?",
    "Pending advances/loans?",
  ],
};
