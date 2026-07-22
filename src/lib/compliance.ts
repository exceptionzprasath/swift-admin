// SWIFT AI Compliance & Statutory Intelligence Engine
// Fully configurable — no hardcoded thresholds live in components.

export type ComplianceModuleKey =
  | "factory_act" | "shops_estab" | "epf" | "esi" | "pt" | "lwf" | "wages" | "min_wages"
  | "bonus" | "gratuity" | "maternity" | "equal_remun" | "contract_labour" | "migrant"
  | "posh" | "apprentices" | "industrial_relations" | "osh" | "trade_licence" | "fire_safety"
  | "pollution" | "building_plan" | "custom";

export type FilingFrequency = "monthly" | "quarterly" | "half_yearly" | "annual" | "one_time" | "on_event";

export type ComplianceProfile = {
  state: string;
  industry: "manufacturing" | "it_services" | "retail" | "logistics" | "healthcare" | "hospitality" | "construction" | "other";
  natureOfBusiness: string;
  establishmentType: "factory" | "shop" | "office" | "warehouse";
  employeeCount: number;
  womenEmployees: number;
  contractLabour: boolean;
  contractorCount?: number;
  shiftOperations: boolean;
  hazardous: boolean;
  manufacturing: boolean;
  powerUsed: boolean;
  weeklyHours: number;
  seasonal: boolean;
  apprentices: number;
  consultants: number;
  interStateMigrants: boolean;
};

export const DEFAULT_PROFILE: ComplianceProfile = {
  state: "Karnataka",
  industry: "manufacturing",
  natureOfBusiness: "General",
  establishmentType: "factory",
  employeeCount: 25,
  womenEmployees: 6,
  contractLabour: false,
  shiftOperations: true,
  hazardous: false,
  manufacturing: true,
  powerUsed: true,
  weeklyHours: 48,
  seasonal: false,
  apprentices: 0,
  consultants: 0,
  interStateMigrants: false,
};

export type ActRule = {
  key: ComplianceModuleKey;
  act: string;
  short: string;
  authority: string;
  applies: (p: ComplianceProfile) => boolean;
  reason?: (p: ComplianceProfile) => string;
};

export const ACT_LIBRARY: ActRule[] = [
  { key: "factory_act", act: "Factories Act, 1948", short: "Factory Act", authority: "Directorate of Factories",
    applies: (p) => p.establishmentType === "factory" && ((p.powerUsed && p.employeeCount >= 10) || (!p.powerUsed && p.employeeCount >= 20)),
    reason: (p) => `Factory with ${p.employeeCount} workers${p.powerUsed ? " using power" : ""}`,
  },
  { key: "shops_estab", act: "Shops & Establishments Act", short: "S&E Act", authority: "State Labour Dept",
    applies: (p) => p.establishmentType !== "factory",
    reason: () => "Non-factory establishment",
  },
  { key: "epf", act: "EPF & MP Act, 1952", short: "EPF", authority: "EPFO",
    applies: (p) => p.employeeCount >= 20,
    reason: (p) => `Headcount ${p.employeeCount} ≥ 20`,
  },
  { key: "esi", act: "ESI Act, 1948", short: "ESI", authority: "ESIC",
    applies: (p) => p.employeeCount >= 10,
    reason: (p) => `Headcount ${p.employeeCount} ≥ 10`,
  },
  { key: "pt", act: "Professional Tax (State)", short: "PT", authority: "State Commercial Tax",
    applies: () => true, reason: (p) => `PT levied in ${p.state}` },
  { key: "lwf", act: "Labour Welfare Fund", short: "LWF", authority: "State LWF Board",
    applies: (p) => p.employeeCount >= 5 },
  { key: "wages", act: "Payment of Wages Act, 1936", short: "Wages", authority: "Labour Commissioner", applies: () => true },
  { key: "min_wages", act: "Minimum Wages Act, 1948", short: "Min. Wages", authority: "State Labour Dept", applies: () => true },
  { key: "bonus", act: "Payment of Bonus Act, 1965", short: "Bonus", authority: "Labour Commissioner",
    applies: (p) => p.employeeCount >= 20 },
  { key: "gratuity", act: "Payment of Gratuity Act, 1972", short: "Gratuity", authority: "Controlling Authority",
    applies: (p) => p.employeeCount >= 10 },
  { key: "maternity", act: "Maternity Benefit Act, 1961", short: "Maternity", authority: "Labour Dept",
    applies: (p) => p.womenEmployees >= 1 && p.employeeCount >= 10 },
  { key: "equal_remun", act: "Equal Remuneration Act, 1976", short: "Equal Pay", authority: "Labour Dept", applies: () => true },
  { key: "contract_labour", act: "Contract Labour (R&A) Act, 1970", short: "CLRA", authority: "Labour Dept",
    applies: (p) => p.contractLabour && (p.contractorCount ?? 0) >= 20 },
  { key: "migrant", act: "Inter-State Migrant Workmen Act, 1979", short: "ISMW", authority: "Labour Dept",
    applies: (p) => p.interStateMigrants && p.employeeCount >= 5 },
  { key: "posh", act: "POSH Act, 2013", short: "POSH", authority: "Internal Committee",
    applies: (p) => p.employeeCount >= 10 || p.womenEmployees >= 1 },
  { key: "apprentices", act: "Apprentices Act, 1961", short: "Apprentices", authority: "RDAT",
    applies: (p) => p.apprentices > 0 || p.employeeCount >= 30 },
  { key: "industrial_relations", act: "Industrial Relations Code, 2020", short: "IR Code", authority: "Labour Dept",
    applies: (p) => p.employeeCount >= 20 },
  { key: "osh", act: "Occupational Safety, Health & WC Code, 2020", short: "OSH Code", authority: "Chief Inspector",
    applies: (p) => p.hazardous || p.employeeCount >= 20 },
  { key: "trade_licence", act: "Municipal Trade Licence", short: "Trade Licence", authority: "Local Municipality", applies: () => true },
  { key: "fire_safety", act: "Fire Safety NOC", short: "Fire NOC", authority: "State Fire Services",
    applies: (p) => p.establishmentType === "factory" || p.employeeCount >= 20 },
  { key: "pollution", act: "Water & Air (Prevention) Act", short: "PCB Consent", authority: "State Pollution Control Board",
    applies: (p) => p.manufacturing || p.hazardous },
  { key: "building_plan", act: "Building Plan / Occupancy Certificate", short: "Building Plan", authority: "Local Planning Authority",
    applies: (p) => p.establishmentType === "factory" },
];

export function evaluateApplicability(p: ComplianceProfile) {
  return ACT_LIBRARY.map((r) => ({
    key: r.key, act: r.act, short: r.short, authority: r.authority,
    applicable: r.applies(p), reason: r.reason?.(p) ?? "",
  }));
}

// Government forms & filings catalog. Extensible — add rows, no code changes.
export type FormTemplate = {
  id: string;
  formName: string;
  moduleKey: ComplianceModuleKey;
  purpose: string;
  frequency: FilingFrequency;
  dueDayOfMonth?: number;   // for monthly
  dueMonth?: number;        // for annual/quarterly (1-12)
  dueDay?: number;
  mandatory: boolean;
  states?: string[];        // empty = all states
  industries?: string[];
  requiresSignature: boolean;
  attachments: string[];
  instructions: string;
  autoFillFields: string[];
  version: string;
  eventTrigger?: ComplianceEventKey; // if frequency = on_event
  custom?: boolean;
};

export const SEED_FORM_LIBRARY: FormTemplate[] = [
  // ── EPF / ESI / PT / LWF ────────────────────────────────────────────────
  { id: "epf-ecr", formName: "EPF ECR (Electronic Challan cum Return)", moduleKey: "epf",
    purpose: "Monthly contribution filing", frequency: "monthly", dueDayOfMonth: 15, mandatory: true,
    requiresSignature: true, attachments: ["Wage register"], instructions: "File on EPFO unified portal.",
    autoFillFields: ["uan", "basic", "pfWages", "employerShare", "employeeShare"], version: "v3" },
  { id: "epf-form5", formName: "EPF Form 5 – New joiner list", moduleKey: "epf",
    purpose: "New PF member registration", frequency: "on_event", eventTrigger: "employee_joined", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Submit within 15 days of joining.",
    autoFillFields: ["employeeName", "uan", "doj"], version: "v2" },
  { id: "epf-form10", formName: "EPF Form 10 – Left / Exit list", moduleKey: "epf",
    purpose: "PF member exit", frequency: "on_event", eventTrigger: "employee_exited", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Submit within 15 days of leaving.",
    autoFillFields: ["employeeName", "uan", "dol", "reason"], version: "v2" },
  { id: "epf-form11", formName: "EPF Form 11 – Declaration", moduleKey: "epf",
    purpose: "New employee PF declaration", frequency: "on_event", eventTrigger: "employee_joined", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Collect at joining, retain on file.",
    autoFillFields: ["employeeName", "prevUan", "prevPf"], version: "v2" },
  { id: "epf-form2", formName: "EPF Form 2 – Nomination", moduleKey: "epf",
    purpose: "PF/EPS nomination", frequency: "on_event", eventTrigger: "employee_joined", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Signed nomination, kept in personnel file.",
    autoFillFields: ["employeeName", "nominee", "relation", "share"], version: "v1" },
  { id: "esi-mc", formName: "ESI Monthly Contribution", moduleKey: "esi",
    purpose: "Monthly ESI contribution", frequency: "monthly", dueDayOfMonth: 15, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "File on ESIC portal.",
    autoFillFields: ["ip", "grossWages", "employerShare", "employeeShare"], version: "v2" },
  { id: "esi-form1", formName: "ESI Form 1 – Declaration Form", moduleKey: "esi",
    purpose: "IP registration", frequency: "on_event", eventTrigger: "employee_joined", mandatory: true,
    requiresSignature: true, attachments: ["Family photo"], instructions: "Register within 10 days of joining.",
    autoFillFields: ["employeeName", "familyDetails", "dispensary"], version: "v2" },
  { id: "esi-accident", formName: "ESI Form 12 – Accident Report", moduleKey: "esi",
    purpose: "Employment injury reporting", frequency: "on_event", eventTrigger: "accident_reported", mandatory: true,
    requiresSignature: true, attachments: ["Site report", "Witness statement"], instructions: "Submit within 24 hours.",
    autoFillFields: ["employeeName", "accidentDate", "nature", "witness"], version: "v1" },
  { id: "pt-return", formName: "Professional Tax Return", moduleKey: "pt",
    purpose: "State PT return", frequency: "monthly", dueDayOfMonth: 20, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "File on state PT portal.",
    autoFillFields: ["employees", "ptDeducted"], version: "v1" },
  { id: "lwf-return", formName: "LWF Contribution Return", moduleKey: "lwf",
    purpose: "LWF filing", frequency: "half_yearly", dueMonth: 6, dueDay: 30, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "State LWF board portal.",
    autoFillFields: ["employees", "employeeShare", "employerShare"], version: "v1" },

  // ── Factories Act ───────────────────────────────────────────────────────
  { id: "factory-form1a", formName: "Form 1-A – Application for Registration", moduleKey: "factory_act",
    purpose: "Factory registration", frequency: "one_time", mandatory: true,
    requiresSignature: true, attachments: ["Site plan", "Occupier declaration"], instructions: "Submit to Chief Inspector.",
    autoFillFields: ["companyName", "address", "occupier", "manager"], version: "v1" },
  { id: "factory-form2", formName: "Form 2 – Notice of Occupation", moduleKey: "factory_act",
    purpose: "Occupation notice", frequency: "on_event", eventTrigger: "occupier_changed", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "File within 15 days before use.",
    autoFillFields: ["companyName", "occupier", "date"], version: "v1" },
  { id: "factory-form11", formName: "Form 11 – Register of White-washing", moduleKey: "factory_act",
    purpose: "Maintenance register", frequency: "on_event", eventTrigger: "premises_maintenance", mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Maintain at premises.",
    autoFillFields: ["date", "area"], version: "v1" },
  { id: "factory-form12", formName: "Form 12 – Register of Adult Workers", moduleKey: "factory_act",
    purpose: "Worker register", frequency: "monthly", dueDayOfMonth: 7, mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Maintain at premises.",
    autoFillFields: ["workers", "shifts"], version: "v1" },
  { id: "factory-form14", formName: "Form 14 – Register of Child Workers", moduleKey: "factory_act",
    purpose: "Child worker register", frequency: "monthly", dueDayOfMonth: 7, mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Only if applicable.",
    autoFillFields: ["workers"], version: "v1" },
  { id: "factory-form21", formName: "Form 21 – Annual Return (Factories Act)", moduleKey: "factory_act",
    purpose: "Annual return of factory", frequency: "annual", dueMonth: 1, dueDay: 31, mandatory: true,
    requiresSignature: true, attachments: ["Accident register"], instructions: "Submit to Inspector of Factories.",
    autoFillFields: ["companyName", "address", "workersMale", "workersFemale", "shifts"], version: "v1" },
  { id: "factory-form22", formName: "Form 22 – Half-Yearly Return", moduleKey: "factory_act",
    purpose: "Half-yearly return", frequency: "half_yearly", dueMonth: 7, dueDay: 15, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Inspector of Factories.",
    autoFillFields: ["workers", "manDays", "leaveTaken"], version: "v1" },
  { id: "factory-form38", formName: "Form 38 – Accident Report", moduleKey: "factory_act",
    purpose: "Accident/dangerous occurrence report", frequency: "on_event", eventTrigger: "accident_reported", mandatory: true,
    requiresSignature: true, attachments: ["Medical report"], instructions: "Report within 12 hours.",
    autoFillFields: ["employeeName", "date", "nature", "cause"], version: "v1" },
  { id: "factory-form10", formName: "Form 10 – Register of Leave with Wages", moduleKey: "factory_act",
    purpose: "Leave register", frequency: "annual", dueMonth: 12, dueDay: 31, mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Maintain per worker.",
    autoFillFields: ["workers", "leaveBalance", "leaveTaken"], version: "v1" },
  { id: "factory-licence-renew", formName: "Factory Licence Renewal", moduleKey: "factory_act",
    purpose: "Annual licence renewal", frequency: "annual", dueMonth: 12, dueDay: 15, mandatory: true,
    requiresSignature: true, attachments: ["Previous licence"], instructions: "Renew before Dec 31.",
    autoFillFields: ["licenceNo", "expiryDate"], version: "v1" },

  // ── Shops & Establishments ──────────────────────────────────────────────
  { id: "shops-registration", formName: "S&E Registration Certificate", moduleKey: "shops_estab",
    purpose: "New establishment registration", frequency: "on_event", eventTrigger: "establishment_opened", mandatory: true,
    requiresSignature: true, attachments: ["Rent agreement"], instructions: "Apply within 30 days of opening.",
    autoFillFields: ["name", "address", "employees"], version: "v1" },
  { id: "shops-annual", formName: "S&E Annual Return", moduleKey: "shops_estab",
    purpose: "Annual return", frequency: "annual", dueMonth: 4, dueDay: 30, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "State Labour Dept.",
    autoFillFields: ["employees", "wagesPaid"], version: "v1" },
  { id: "shops-renewal", formName: "S&E Registration Renewal", moduleKey: "shops_estab",
    purpose: "Renewal", frequency: "annual", dueMonth: 3, dueDay: 31, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Renew before expiry.",
    autoFillFields: ["regNo", "expiryDate"], version: "v1" },
  { id: "shops-holiday", formName: "S&E Holiday Notice", moduleKey: "shops_estab",
    purpose: "Public holiday declaration", frequency: "on_event", eventTrigger: "holiday_declared", mandatory: false,
    requiresSignature: false, attachments: [], instructions: "Display at premises.",
    autoFillFields: ["holidays", "year"], version: "v1" },

  // ── Bonus / Gratuity / Wages ────────────────────────────────────────────
  { id: "bonus-formA", formName: "Form A – Allocable Surplus Register", moduleKey: "bonus",
    purpose: "Bonus computation", frequency: "annual", dueMonth: 1, dueDay: 31, mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Maintain per accounting year.",
    autoFillFields: ["grossProfit", "allocable"], version: "v1" },
  { id: "bonus-formB", formName: "Form B – Set-on / Set-off Register", moduleKey: "bonus",
    purpose: "Set-on / set-off register", frequency: "annual", dueMonth: 1, dueDay: 31, mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Maintain per accounting year.",
    autoFillFields: ["setOn", "setOff"], version: "v1" },
  { id: "bonus-formC", formName: "Form C – Bonus Paid Register", moduleKey: "bonus",
    purpose: "Register of bonus paid", frequency: "annual", dueMonth: 1, dueDay: 31, mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Maintain per employee.",
    autoFillFields: ["employees", "bonusPaid"], version: "v1" },
  { id: "bonus-formD", formName: "Form D – Annual Bonus Return", moduleKey: "bonus",
    purpose: "Bonus paid statement", frequency: "annual", dueMonth: 2, dueDay: 1, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Labour Commissioner.",
    autoFillFields: ["employees", "bonusPaid", "profit"], version: "v1" },
  { id: "wages-registerA", formName: "Wage Register (Form X)", moduleKey: "wages",
    purpose: "Monthly wage register", frequency: "monthly", dueDayOfMonth: 7, mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Retain 3 years.",
    autoFillFields: ["employees", "gross", "deductions", "net"], version: "v1" },
  { id: "wages-slip", formName: "Wage Slip (Form XI)", moduleKey: "wages",
    purpose: "Wage slip to employee", frequency: "on_event", eventTrigger: "wages_paid", mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Issue every pay cycle.",
    autoFillFields: ["employeeName", "period", "gross", "net"], version: "v1" },
  { id: "min-wages-notice", formName: "Min. Wages – Abstract Notice", moduleKey: "min_wages",
    purpose: "Display minimum wage rates", frequency: "on_event", eventTrigger: "min_wages_revised", mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Display at premises.",
    autoFillFields: ["state", "category", "rate"], version: "v1" },

  // ── Gratuity ────────────────────────────────────────────────────────────
  { id: "gratuity-formF", formName: "Form F – Nomination", moduleKey: "gratuity",
    purpose: "Employee gratuity nomination", frequency: "on_event", eventTrigger: "employee_joined", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Collect at 1 year of service.",
    autoFillFields: ["employeeName", "nominee", "relation"], version: "v1" },
  { id: "gratuity-formI", formName: "Form I – Gratuity Application", moduleKey: "gratuity",
    purpose: "Gratuity claim", frequency: "on_event", eventTrigger: "employee_exited", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Payable within 30 days of claim.",
    autoFillFields: ["employeeName", "lastDrawn", "service"], version: "v1" },
  { id: "gratuity-formL", formName: "Form L – Notice of Payment", moduleKey: "gratuity",
    purpose: "Gratuity payment notice", frequency: "on_event", eventTrigger: "employee_exited", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Issue with payment.",
    autoFillFields: ["employeeName", "amount", "date"], version: "v1" },

  // ── Maternity ───────────────────────────────────────────────────────────
  { id: "maternity-formL", formName: "Maternity Benefit – Muster Roll (Form L)", moduleKey: "maternity",
    purpose: "Maternity leave register", frequency: "on_event", eventTrigger: "maternity_declared", mandatory: true,
    requiresSignature: false, attachments: ["Medical certificate"], instructions: "Maintain per case.",
    autoFillFields: ["employeeName", "dateOfDelivery", "leavePeriod"], version: "v1" },
  { id: "maternity-notice", formName: "Maternity Benefit Notice (Form K)", moduleKey: "maternity",
    purpose: "Notice of claim", frequency: "on_event", eventTrigger: "maternity_declared", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Employee to submit before leave.",
    autoFillFields: ["employeeName", "expectedDate"], version: "v1" },
  { id: "maternity-annual", formName: "Maternity Annual Return", moduleKey: "maternity",
    purpose: "Annual return", frequency: "annual", dueMonth: 1, dueDay: 21, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "State Labour Dept.",
    autoFillFields: ["cases", "leaveDays", "benefitPaid"], version: "v1" },

  // ── POSH ────────────────────────────────────────────────────────────────
  { id: "posh-ic-constitution", formName: "POSH IC Constitution Notice", moduleKey: "posh",
    purpose: "Internal Committee formation", frequency: "on_event", eventTrigger: "ic_reconstituted", mandatory: true,
    requiresSignature: true, attachments: ["Consent letters"], instructions: "Display at premises.",
    autoFillFields: ["members", "chairperson", "external"], version: "v1" },
  { id: "posh-complaint-register", formName: "POSH Complaint Register", moduleKey: "posh",
    purpose: "Log of complaints", frequency: "on_event", eventTrigger: "harassment_complaint", mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Maintain confidentially.",
    autoFillFields: ["complaintNo", "date", "status"], version: "v1" },
  { id: "posh-annual", formName: "POSH Annual Report", moduleKey: "posh",
    purpose: "IC annual disclosure", frequency: "annual", dueMonth: 1, dueDay: 31, mandatory: true,
    requiresSignature: true, attachments: ["IC composition"], instructions: "District Officer.",
    autoFillFields: ["complaints", "resolved", "pending"], version: "v1" },

  // ── Contract labour / migrant / apprentices / IR / OSH ─────────────────
  { id: "clra-formV", formName: "Form V – Principal Employer Certificate", moduleKey: "contract_labour",
    purpose: "Issue to contractor", frequency: "on_event", eventTrigger: "contractor_engaged", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Issue on engagement.",
    autoFillFields: ["contractor", "workOrder"], version: "v1" },
  { id: "clra-formVI", formName: "Form VI-B – CLRA Half-Yearly Return", moduleKey: "contract_labour",
    purpose: "Principal employer return", frequency: "half_yearly", dueMonth: 7, dueDay: 30, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Labour Commissioner.",
    autoFillFields: ["contractors", "contractWorkers"], version: "v1" },
  { id: "ismw-formXIII", formName: "ISMW Form XIII – Register of Migrant Workmen", moduleKey: "migrant",
    purpose: "Migrant worker register", frequency: "on_event", eventTrigger: "migrant_engaged", mandatory: true,
    requiresSignature: false, attachments: [], instructions: "Maintain per worker.",
    autoFillFields: ["workerName", "homeState", "hostState"], version: "v1" },
  { id: "apprentice-quarterly", formName: "Apprentices Quarterly Return (App-2)", moduleKey: "apprentices",
    purpose: "Apprentice engagement return", frequency: "quarterly", dueDay: 15, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "RDAT / apprenticeship portal.",
    autoFillFields: ["apprentices", "designations"], version: "v1" },
  { id: "apprentice-contract", formName: "Apprenticeship Contract", moduleKey: "apprentices",
    purpose: "Contract of apprenticeship", frequency: "on_event", eventTrigger: "apprentice_engaged", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Register on NAPS portal within 30 days.",
    autoFillFields: ["apprenticeName", "trade", "period"], version: "v1" },
  { id: "ir-standing-orders", formName: "Certified Standing Orders", moduleKey: "industrial_relations",
    purpose: "Standing orders certification", frequency: "one_time", mandatory: true,
    requiresSignature: true, attachments: ["Draft SO"], instructions: "Submit within 6 months of Act applying.",
    autoFillFields: ["companyName", "workersMale", "workersFemale"], version: "v1" },
  { id: "ir-lay-off", formName: "Notice of Lay-off / Retrenchment", moduleKey: "industrial_relations",
    purpose: "Statutory notice", frequency: "on_event", eventTrigger: "layoff_declared", mandatory: true,
    requiresSignature: true, attachments: [], instructions: "60/90-day prior notice as applicable.",
    autoFillFields: ["reason", "workers", "effectiveDate"], version: "v1" },
  { id: "osh-annual", formName: "OSH Code Annual Return", moduleKey: "osh",
    purpose: "Consolidated annual return", frequency: "annual", dueMonth: 2, dueDay: 15, mandatory: true,
    requiresSignature: true, attachments: [], instructions: "Chief Inspector.",
    autoFillFields: ["workers", "hoursWorked", "wages"], version: "v1" },

  // ── Licences / Fire / Pollution ─────────────────────────────────────────
  { id: "trade-licence-renew", formName: "Municipal Trade Licence Renewal", moduleKey: "trade_licence",
    purpose: "Trade licence renewal", frequency: "annual", dueMonth: 3, dueDay: 31, mandatory: true,
    requiresSignature: true, attachments: ["Previous licence"], instructions: "Local municipality portal.",
    autoFillFields: ["licenceNo", "expiryDate"], version: "v1" },
  { id: "fire-noc-renew", formName: "Fire Safety NOC Renewal", moduleKey: "fire_safety",
    purpose: "Renew fire NOC", frequency: "annual", dueMonth: 6, dueDay: 30, mandatory: true,
    requiresSignature: true, attachments: ["Fire audit"], instructions: "State Fire Services.",
    autoFillFields: ["nocNo", "expiryDate"], version: "v1" },
  { id: "pcb-consent", formName: "PCB Consent to Operate", moduleKey: "pollution",
    purpose: "Water/Air Act consent", frequency: "annual", dueMonth: 3, dueDay: 31, mandatory: true,
    requiresSignature: true, attachments: ["Effluent report"], instructions: "State PCB.",
    autoFillFields: ["categoryColor", "expiryDate"], version: "v1" },
];

// Runtime FORM_LIBRARY = seed + user additions. Store handles the merge.
export const FORM_LIBRARY: FormTemplate[] = SEED_FORM_LIBRARY;

export type FilingStatus = "upcoming" | "due" | "overdue" | "filed" | "waived";

export type CalendarEvent = {
  id: string;
  formId: string;
  formName: string;
  moduleKey: ComplianceModuleKey;
  dueDate: string; // ISO
  frequency: FilingFrequency;
  status: FilingStatus;
  priority: "low" | "medium" | "high" | "critical";
};

function iso(d: Date) { return d.toISOString().slice(0, 10); }

export function buildCalendar(profile: ComplianceProfile, forms: FormTemplate[] = FORM_LIBRARY, horizonDays = 120, today = new Date()): CalendarEvent[] {
  const applicableKeys = new Set(evaluateApplicability(profile).filter((a) => a.applicable).map((a) => a.key));
  const events: CalendarEvent[] = [];
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + horizonDays);

  for (const f of forms) {
    if (f.moduleKey !== "custom" && !applicableKeys.has(f.moduleKey)) continue;
    if (f.states && f.states.length && !f.states.includes(profile.state)) continue;

    const addEvent = (due: Date, priority: CalendarEvent["priority"]) => {
      const diff = Math.round((due.getTime() - start.getTime()) / 86400000);
      const status: FilingStatus = diff < 0 ? "overdue" : diff === 0 ? "due" : "upcoming";
      events.push({
        id: `${f.id}-${iso(due)}`, formId: f.id, formName: f.formName, moduleKey: f.moduleKey,
        dueDate: iso(due), frequency: f.frequency, status, priority,
      });
    };

    if (f.frequency === "monthly" && f.dueDayOfMonth) {
      for (let m = -1; m <= Math.ceil(horizonDays / 30); m++) {
        const d = new Date(start.getFullYear(), start.getMonth() + m, f.dueDayOfMonth);
        if (d >= new Date(start.getTime() - 30 * 86400000) && d <= end) addEvent(d, "high");
      }
    } else if (f.frequency === "quarterly" && f.dueDay) {
      for (const qm of [3, 6, 9, 12]) {
        const d = new Date(start.getFullYear(), qm - 1, f.dueDay);
        if (d >= new Date(start.getTime() - 30 * 86400000) && d <= end) addEvent(d, "medium");
      }
    } else if (f.frequency === "half_yearly" && f.dueMonth && f.dueDay) {
      for (const m of [f.dueMonth, (f.dueMonth + 6) % 12 || 12]) {
        const d = new Date(start.getFullYear(), m - 1, f.dueDay);
        if (d >= new Date(start.getTime() - 30 * 86400000) && d <= end) addEvent(d, "medium");
      }
    } else if (f.frequency === "annual" && f.dueMonth && f.dueDay) {
      const d = new Date(start.getFullYear(), f.dueMonth - 1, f.dueDay);
      if (d < start) d.setFullYear(d.getFullYear() + 1);
      if (d <= end) addEvent(d, "critical");
    }
  }
  return events.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// ─── Event-based triggers ──────────────────────────────────────────────────
export type ComplianceEventKey =
  | "employee_joined" | "employee_confirmed" | "employee_exited" | "employee_resigned" | "employee_terminated"
  | "employee_promoted" | "employee_transferred" | "salary_revised"
  | "payroll_processed" | "attendance_locked" | "leave_approved"
  | "branch_created" | "factory_created" | "department_created" | "unit_created"
  | "shift_change" | "machine_installed" | "boiler_installed" | "lift_installed" | "pressure_vessel_installed"
  | "maternity_declared" | "accident_reported" | "fire_incident" | "harassment_complaint"
  | "contractor_engaged" | "contractor_disengaged" | "apprentice_engaged" | "contract_labour_added"
  | "women_employee_added" | "migrant_engaged" | "layoff_declared" | "occupier_changed" | "ic_reconstituted"
  | "min_wages_revised" | "bonus_declared" | "wages_paid" | "premises_maintenance"
  | "holiday_declared" | "establishment_opened" | "license_expiring" | "license_uploaded"
  | "document_expired" | "inspection_completed" | "policy_changed"
  | "vendor_registered" | "visitor_entry" | "asset_allocated" | "asset_returned"
  | "nomination_change" | "custom_event";

export type EventTriggerConfig = {
  event: ComplianceEventKey;
  label: string;
  description: string;
  enabled: boolean;
  daysOffset: number;      // when to fire form generation relative to event date (0 = immediate)
  escalateAfterDays?: number; // if not acted, escalate to alternate approver
  channels: {
    dashboard: boolean; email: boolean; sms: boolean; whatsapp: boolean; push: boolean;
  };
  forms: string[];         // formIds to auto-generate; empty = all matching eventTrigger
  autoFile: boolean;       // if true, mark as filed on generation (dummy submissions)
  priority: "low" | "medium" | "high" | "critical";
};

export const DEFAULT_TRIGGERS: EventTriggerConfig[] = [
  { event: "employee_joined", label: "Employee joins", description: "New hire triggers PF Form 2/5/11, ESI Form 1, Gratuity Form F.", enabled: true, daysOffset: 0, escalateAfterDays: 3, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "employee_exited", label: "Employee exits", description: "Exit triggers PF Form 10, Gratuity Form I/L, F&F reconciliation.", enabled: true, daysOffset: 0, escalateAfterDays: 7, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "employee_resigned", label: "Employee resigns", description: "Resignation kicks off exit clearance + notice-period letters.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "employee_terminated", label: "Termination", description: "Requires show-cause, domestic enquiry & final settlement docs.", enabled: true, daysOffset: 0, escalateAfterDays: 2, channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "maternity_declared", label: "Maternity declared", description: "Auto-generate Form K/L and set 26-week leave calendar.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "accident_reported", label: "Accident / injury", description: "Fire ESI Form 12 & Factory Form 38 within 12–24 hrs.", enabled: true, daysOffset: 0, escalateAfterDays: 1, channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "harassment_complaint", label: "POSH complaint", description: "Log in complaint register, notify IC within 24 hrs.", enabled: true, daysOffset: 0, escalateAfterDays: 1, channels: { dashboard: true, email: true, sms: false, whatsapp: false, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "contractor_engaged", label: "Contractor engaged", description: "Issue Form V; refresh Form VI-B basis.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "apprentice_engaged", label: "Apprentice engaged", description: "Register on NAPS + prepare contract of apprenticeship.", enabled: true, daysOffset: 0, escalateAfterDays: 30, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "migrant_engaged", label: "Migrant workman engaged", description: "Update ISMW Form XIII register.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "layoff_declared", label: "Lay-off / Retrenchment", description: "Serve statutory 60/90-day notice.", enabled: true, daysOffset: 0, escalateAfterDays: 1, channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "min_wages_revised", label: "Minimum wage revision", description: "Repost abstract notice, restate wage sheet.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "wages_paid", label: "Wages paid (payroll run)", description: "Issue wage slips + retain wage register.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: false }, forms: [], autoFile: true, priority: "medium" },
  { event: "premises_maintenance", label: "White-washing / repairs", description: "Update Form 11 whitewashing register.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "holiday_declared", label: "Holiday declared", description: "Display holiday notice under S&E rules.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: true, priority: "low" },
  { event: "establishment_opened", label: "New branch / establishment", description: "Trigger S&E registration for the branch.", enabled: true, daysOffset: 0, escalateAfterDays: 30, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "occupier_changed", label: "Occupier / Manager changed", description: "File Form 2 notice of change.", enabled: true, daysOffset: 0, escalateAfterDays: 15, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "ic_reconstituted", label: "POSH IC reconstituted", description: "Publish new IC constitution notice.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "bonus_declared", label: "Bonus declared", description: "Regenerate Forms A/B/C, then Form D for the year.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "license_expiring", label: "License expiry ≤ 60 days", description: "Auto-open renewal task for factory / trade / fire / PCB licences.", enabled: true, daysOffset: -60, escalateAfterDays: 15, channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "shift_change", label: "Shift roster change", description: "Update Form 12 adult worker register.", enabled: false, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "nomination_change", label: "Nomination updated", description: "Refresh PF Form 2 / Gratuity Form F.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "custom_event", label: "Custom event", description: "Bind any user-defined event to selected forms.", enabled: false, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: false, push: true }, forms: [], autoFile: false, priority: "medium" },
  // ── platform-wide events (auto-emitted by other modules) ──
  { event: "employee_confirmed", label: "Employee confirmed", description: "Probation over → confirmation letter + revised nomination.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "employee_promoted", label: "Employee promoted", description: "Promotion letter + revised CTC + POSH/IC eligibility recheck.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "employee_transferred", label: "Employee transferred", description: "Branch transfer → PT jurisdiction / PF branch update.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "salary_revised", label: "Salary revised", description: "PF/ESI wage ceiling recheck + revised CTC letter.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: false, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "payroll_processed", label: "Payroll processed", description: "Locks wage register + queues PF/ESI/PT/LWF filings.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: true, priority: "high" },
  { event: "attendance_locked", label: "Attendance locked", description: "Locks Form 12 register basis for the cycle.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: true }, forms: [], autoFile: true, priority: "low" },
  { event: "leave_approved", label: "Leave approved", description: "Updates leave register (Form 10) + maternity check.", enabled: false, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "branch_created", label: "Branch created", description: "Triggers S&E / factory registration for the new branch.", enabled: true, daysOffset: 0, escalateAfterDays: 30, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "factory_created", label: "Factory created", description: "Full Factories Act stack (Form 1-A, 2, licence, plans).", enabled: true, daysOffset: 0, escalateAfterDays: 30, channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "department_created", label: "Department created", description: "Update org chart, reassign approvers.", enabled: false, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "unit_created", label: "Unit / Site created", description: "New unit → PCB, fire NOC, trade licence recheck.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "machine_installed", label: "New machine installed", description: "Update plant register; safety training if hazardous.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: false, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "boiler_installed", label: "Boiler installed", description: "Indian Boilers Act — inspection + registration.", enabled: true, daysOffset: 0, escalateAfterDays: 15, channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "lift_installed", label: "Lift installed", description: "State Lifts Act registration.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "pressure_vessel_installed", label: "Pressure vessel installed", description: "SMPV certification + inspection.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "contract_labour_added", label: "Contract labour added", description: "CLRA principal-employer certificate.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "high" },
  { event: "women_employee_added", label: "Woman employee added", description: "Maternity/POSH applicability recheck.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: false, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "fire_incident", label: "Fire incident", description: "Fire safety incident report + investigation.", enabled: true, daysOffset: 0, escalateAfterDays: 1, channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "inspection_completed", label: "Inspection completed", description: "Log finding + action plan.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: false, push: true }, forms: [], autoFile: false, priority: "medium" },
  { event: "license_uploaded", label: "License uploaded", description: "Register renewal reminder using expiry date.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "document_expired", label: "Document expired", description: "Immediately queue renewal task.", enabled: true, daysOffset: 0, escalateAfterDays: 1, channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "critical" },
  { event: "vendor_registered", label: "Vendor registered", description: "Vendor KYC + PF/ESI vendor coverage check.", enabled: false, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: false, push: false }, forms: [], autoFile: false, priority: "low" },
  { event: "visitor_entry", label: "Visitor entry", description: "Visitor logbook (Rule 108 factory rules).", enabled: false, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "asset_allocated", label: "Asset allocated", description: "Asset issue slip + acknowledgement.", enabled: false, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "asset_returned", label: "Asset returned", description: "Return receipt + condition audit.", enabled: false, daysOffset: 0, channels: { dashboard: true, email: false, sms: false, whatsapp: false, push: false }, forms: [], autoFile: true, priority: "low" },
  { event: "policy_changed", label: "Policy changed", description: "Republish acknowledgement + audit.", enabled: true, daysOffset: 0, channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true }, forms: [], autoFile: false, priority: "medium" },
];

export function formsForEvent(event: ComplianceEventKey, forms: FormTemplate[], override?: string[]): FormTemplate[] {
  if (override && override.length) return forms.filter((f) => override.includes(f.id));
  return forms.filter((f) => f.eventTrigger === event);
}

export type RiskFinding = {
  id: string;
  area: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number; // 0..100
  impact: string;
  recommendation: string;
};

export function analyzeRisks(input: {
  profile: ComplianceProfile;
  missingUAN: number;
  missingESIC: number;
  missingAadhaar: number;
  missingPAN: number;
  expiredLicenses: number;
  overdueFilings: number;
  latePayrollRuns: number;
  unapprovedOT: number;
}): RiskFinding[] {
  const out: RiskFinding[] = [];
  const push = (id: string, area: string, cond: boolean, score: number, impact: string, rec: string) => {
    if (!cond) return;
    const sev: RiskFinding["severity"] = score >= 80 ? "critical" : score >= 60 ? "high" : score >= 35 ? "medium" : "low";
    out.push({ id, area, severity: sev, score, impact, recommendation: rec });
  };
  push("uan", "EPF – Missing UAN", input.missingUAN > 0, Math.min(100, input.missingUAN * 8 + 30),
    "PF challan will reject; interest & damages under §7Q/14B", "Collect UAN or generate via EPFO portal.");
  push("esic", "ESI – Missing IP", input.missingESIC > 0, Math.min(100, input.missingESIC * 8 + 25),
    "Employee cannot avail ESI benefits; employer liable", "Register employees on ESIC portal.");
  push("aadhaar", "KYC – Missing Aadhaar", input.missingAadhaar > 0, Math.min(100, input.missingAadhaar * 5 + 15),
    "UAN seeding will fail", "Collect Aadhaar under DPDP consent.");
  push("pan", "TDS – Missing PAN", input.missingPAN > 0, Math.min(100, input.missingPAN * 5 + 20),
    "TDS at 20% u/s 206AA", "Trigger PAN collection.");
  push("lic", "Licenses expired", input.expiredLicenses > 0, 90, "Operating without valid license", "Renew immediately.");
  push("filings", "Overdue statutory filings", input.overdueFilings > 0, 85, "Interest & penalty exposure", "File pending returns.");
  push("payroll", "Late payroll runs", input.latePayrollRuns > 0, 55, "Wages Act §5 violation", "Automate cutoff.");
  push("ot", "Unapproved overtime", input.unapprovedOT > 0, 45, "Factories Act §59 dispute", "Route OT via approval.");
  return out.sort((a, b) => b.score - a.score);
}

export function complianceScore(risks: RiskFinding[], overdueCount: number): number {
  const risk = risks.reduce((s, r) => s + r.score, 0);
  const penalty = Math.min(100, risk / Math.max(1, risks.length || 1) + overdueCount * 5);
  return Math.max(0, Math.round(100 - penalty));
}

export const DEFAULT_REMINDER_LADDER = [60, 30, 15, 7, 3, 1, 0];

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE RULE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export type TriggerType = "event" | "time" | "conditional" | "manual";
export type ConditionOp = ">=" | "<=" | ">" | "<" | "==" | "!=" | "in" | "true" | "false";

// A single condition evaluated against ComplianceProfile / event payload
export type RuleCondition = {
  field: string;             // dotted path e.g. "profile.employeeCount"
  op: ConditionOp;
  value?: number | string | boolean | string[];
};

export type ApprovalStep = {
  role: string;              // "hr" | "compliance_officer" | "branch_manager" | ...
  slaHours?: number;
  optional?: boolean;
};

export type ReminderRule = {
  daysBefore: number[];
  channels: { dashboard: boolean; email: boolean; sms: boolean; whatsapp: boolean; push: boolean };
  quietHoursStart?: string;
  quietHoursEnd?: string;
  weekendsOff?: boolean;
};

export type ComplianceRule = {
  id: string;
  name: string;
  act: string;                  // matches KnowledgeAct.name
  section?: string;             // "Sec 63" etc.
  rule?: string;                // "Rule 78" etc.
  states?: string[];            // empty → all states
  industries?: string[];        // empty → all
  businessTypes?: string[];     // establishment types
  branchTypes?: string[];       // "factory"|"branch"|"unit"|"site"|"warehouse"
  employeeCountMin?: number;
  employeeCountMax?: number;
  risk: "low" | "medium" | "high" | "critical";
  priority: "low" | "medium" | "high" | "critical";
  triggerTypes: TriggerType[];
  triggerEvents: ComplianceEventKey[];  // for event-based
  cronExpression?: string;              // for time-based (e.g. "0 0 15 * *")
  conditions: RuleCondition[];          // AND-ed conditions
  requiredDocuments: string[];
  generatedFormIds: string[];
  generatedRegisterIds: string[];
  approvalChain: ApprovalStep[];
  submissionMethod: "portal" | "physical" | "email" | "auto" | "manual";
  submissionUrl?: string;
  escalation: { afterDays: number; toRole: string } | null;
  reminderRule: ReminderRule;
  aiSuggestions: string[];
  active: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
};

// Seed rules — a starter set; Super Admin can add/edit any of these via UI.
export const SEED_RULES: ComplianceRule[] = [
  {
    id: "rule-factory-registration",
    name: "Factory Registration on New Factory",
    act: "Factories Act, 1948",
    section: "Sec 6",
    rule: "State Factory Rules",
    branchTypes: ["factory"],
    employeeCountMin: 10,
    risk: "critical", priority: "critical",
    triggerTypes: ["event", "conditional"],
    triggerEvents: ["factory_created", "branch_created"],
    conditions: [{ field: "profile.establishmentType", op: "==", value: "factory" }],
    requiredDocuments: ["Site plan", "Occupier declaration", "Power sanction"],
    generatedFormIds: ["factory-form1a", "factory-form2"],
    generatedRegisterIds: [],
    approvalChain: [{ role: "compliance_officer", slaHours: 48 }, { role: "director", slaHours: 72 }],
    submissionMethod: "portal",
    submissionUrl: "https://factories.karnataka.gov.in",
    escalation: { afterDays: 15, toRole: "director" },
    reminderRule: { daysBefore: [30, 15, 7, 3, 1], channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true }, weekendsOff: false },
    aiSuggestions: ["Verify occupier PAN & Aadhaar", "Attach fire NOC before submission"],
    active: true, version: "v1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-shops-registration",
    name: "S&E Registration on New Establishment",
    act: "Shops & Establishments Act",
    branchTypes: ["shop", "office", "warehouse"],
    risk: "high", priority: "high",
    triggerTypes: ["event"],
    triggerEvents: ["establishment_opened", "branch_created"],
    conditions: [{ field: "profile.establishmentType", op: "!=", value: "factory" }],
    requiredDocuments: ["Rent agreement", "PAN", "GSTIN"],
    generatedFormIds: ["shops-registration"],
    generatedRegisterIds: [],
    approvalChain: [{ role: "hr", slaHours: 24 }, { role: "compliance_officer", slaHours: 48 }],
    submissionMethod: "portal",
    escalation: { afterDays: 30, toRole: "compliance_officer" },
    reminderRule: { daysBefore: [20, 10, 5, 1], channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true } },
    aiSuggestions: ["State portal will auto-generate registration number"],
    active: true, version: "v1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-pf-new-joiner",
    name: "PF Registration on New Joiner",
    act: "EPF & MP Act, 1952",
    section: "Sec 6",
    employeeCountMin: 20,
    risk: "high", priority: "high",
    triggerTypes: ["event"],
    triggerEvents: ["employee_joined"],
    conditions: [],
    requiredDocuments: ["Aadhaar", "PAN", "Bank details"],
    generatedFormIds: ["epf-form2", "epf-form5", "epf-form11"],
    generatedRegisterIds: [],
    approvalChain: [{ role: "hr", slaHours: 24 }],
    submissionMethod: "portal",
    submissionUrl: "https://unifiedportal-emp.epfindia.gov.in",
    escalation: { afterDays: 15, toRole: "compliance_officer" },
    reminderRule: { daysBefore: [10, 5, 2, 0], channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true } },
    aiSuggestions: ["Auto-seed UAN from Aadhaar if not provided"],
    active: true, version: "v1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-esi-new-joiner",
    name: "ESI Registration on New Joiner",
    act: "ESI Act, 1948",
    section: "Sec 2A",
    employeeCountMin: 10,
    risk: "high", priority: "high",
    triggerTypes: ["event"],
    triggerEvents: ["employee_joined"],
    conditions: [],
    requiredDocuments: ["Aadhaar", "Family photo", "Bank details"],
    generatedFormIds: ["esi-form1"],
    generatedRegisterIds: [],
    approvalChain: [{ role: "hr", slaHours: 24 }],
    submissionMethod: "portal",
    escalation: { afterDays: 10, toRole: "compliance_officer" },
    reminderRule: { daysBefore: [7, 3, 1, 0], channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true } },
    aiSuggestions: ["Skip if wages > ESI ceiling ₹21,000"],
    active: true, version: "v1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-posh-ic",
    name: "POSH Internal Committee",
    act: "POSH Act, 2013",
    employeeCountMin: 10,
    risk: "critical", priority: "high",
    triggerTypes: ["conditional", "event"],
    triggerEvents: ["women_employee_added", "ic_reconstituted"],
    conditions: [{ field: "profile.womenEmployees", op: ">=", value: 1 }],
    requiredDocuments: ["IC consent letters", "External member CV"],
    generatedFormIds: ["posh-ic-constitution"],
    generatedRegisterIds: ["posh-complaint-register"],
    approvalChain: [{ role: "hr", slaHours: 48 }, { role: "director", slaHours: 72 }],
    submissionMethod: "manual",
    escalation: null,
    reminderRule: { daysBefore: [30, 15, 7, 1], channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: true } },
    aiSuggestions: ["Chairperson must be a senior woman employee"],
    active: true, version: "v1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-accident-report",
    name: "Accident Reporting (24 hr)",
    act: "Factories Act, 1948",
    section: "Sec 88",
    risk: "critical", priority: "critical",
    triggerTypes: ["event"],
    triggerEvents: ["accident_reported", "fire_incident"],
    conditions: [],
    requiredDocuments: ["Medical report", "Site photograph", "Witness statement"],
    generatedFormIds: ["factory-form38", "esi-accident"],
    generatedRegisterIds: [],
    approvalChain: [{ role: "safety_officer", slaHours: 4 }, { role: "director", slaHours: 12 }],
    submissionMethod: "portal",
    escalation: { afterDays: 1, toRole: "director" },
    reminderRule: { daysBefore: [0], channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true } },
    aiSuggestions: ["Notify DGFASLI if fatal", "File ESI Form 12 within 24 hr"],
    active: true, version: "v1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-payroll-run",
    name: "Payroll Run → Wage Slips & Registers",
    act: "Payment of Wages Act, 1936",
    section: "Sec 5",
    risk: "medium", priority: "high",
    triggerTypes: ["event"],
    triggerEvents: ["payroll_processed", "wages_paid"],
    conditions: [],
    requiredDocuments: [],
    generatedFormIds: ["wages-registerA", "wages-slip"],
    generatedRegisterIds: [],
    approvalChain: [{ role: "payroll_head", slaHours: 24 }],
    submissionMethod: "auto",
    escalation: { afterDays: 3, toRole: "compliance_officer" },
    reminderRule: { daysBefore: [0], channels: { dashboard: true, email: true, sms: false, whatsapp: true, push: false } },
    aiSuggestions: ["Wage slips must be delivered before payment date"],
    active: true, version: "v1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-license-expiring",
    name: "Licence Expiry Renewal (60d)",
    act: "Composite (Trade / Fire / PCB / Factory)",
    risk: "critical", priority: "critical",
    triggerTypes: ["time", "event"],
    triggerEvents: ["license_expiring", "document_expired"],
    cronExpression: "0 6 * * *",
    conditions: [],
    requiredDocuments: ["Previous licence", "Fee receipt"],
    generatedFormIds: ["trade-licence-renew", "fire-noc-renew", "pcb-consent", "factory-licence-renew"],
    generatedRegisterIds: [],
    approvalChain: [{ role: "compliance_officer", slaHours: 72 }, { role: "director", slaHours: 168 }],
    submissionMethod: "portal",
    escalation: { afterDays: 15, toRole: "director" },
    reminderRule: { daysBefore: [60, 45, 30, 15, 7, 3, 1], channels: { dashboard: true, email: true, sms: true, whatsapp: true, push: true } },
    aiSuggestions: ["Late renewal attracts double fee under most state Acts"],
    active: true, version: "v1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

// Extract a dotted path value from a mixed object.
function pluck(root: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, root);
}

export function evaluateCondition(cond: RuleCondition, ctx: Record<string, unknown>): boolean {
  const actual = pluck(ctx, cond.field);
  switch (cond.op) {
    case "true": return actual === true;
    case "false": return actual === false;
    case "==": return actual === cond.value;
    case "!=": return actual !== cond.value;
    case ">=": return typeof actual === "number" && typeof cond.value === "number" && actual >= cond.value;
    case "<=": return typeof actual === "number" && typeof cond.value === "number" && actual <= cond.value;
    case ">":  return typeof actual === "number" && typeof cond.value === "number" && actual > cond.value;
    case "<":  return typeof actual === "number" && typeof cond.value === "number" && actual < cond.value;
    case "in": return Array.isArray(cond.value) && (cond.value as string[]).includes(String(actual));
  }
  return false;
}

export function ruleMatchesProfile(rule: ComplianceRule, profile: ComplianceProfile, branchType?: string): boolean {
  if (!rule.active) return false;
  if (rule.states && rule.states.length && !rule.states.includes(profile.state)) return false;
  if (rule.industries && rule.industries.length && !rule.industries.includes(profile.industry)) return false;
  if (rule.businessTypes && rule.businessTypes.length && !rule.businessTypes.includes(profile.establishmentType)) return false;
  if (rule.branchTypes && rule.branchTypes.length && branchType && !rule.branchTypes.includes(branchType)) return false;
  if (rule.employeeCountMin !== undefined && profile.employeeCount < rule.employeeCountMin) return false;
  if (rule.employeeCountMax !== undefined && profile.employeeCount > rule.employeeCountMax) return false;
  return true;
}

export function evaluateRulesForEvent(
  rules: ComplianceRule[],
  event: ComplianceEventKey,
  profile: ComplianceProfile,
  payloadMeta: Record<string, unknown> = {},
): ComplianceRule[] {
  const ctx = { profile, event, meta: payloadMeta };
  return rules.filter((r) => {
    if (!ruleMatchesProfile(r, profile, payloadMeta.branchType as string | undefined)) return false;
    if (!r.triggerTypes.includes("event") && !r.triggerTypes.includes("conditional")) return false;
    if (r.triggerTypes.includes("event") && !r.triggerEvents.includes(event)) return false;
    return r.conditions.every((c) => evaluateCondition(c, ctx));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════════════

export type KnowledgeReference = { id: string; title: string; ref: string; date: string; url?: string };
export type KnowledgeAmendment = { id: string; title: string; effectiveDate: string; summary: string; url?: string };
export type PenaltyRule = { violation: string; penalty: string; imprisonment?: string; reference: string };
export type InspectionRule = { name: string; frequency: string; authority: string; documentsRequired: string[] };

export type KnowledgeAct = {
  id: string;
  name: string;
  moduleKey: ComplianceModuleKey;
  state: string;              // "" = central
  department: string;
  rules: string[];            // rule names
  sections: string[];
  notifications: KnowledgeReference[];
  circulars: KnowledgeReference[];
  gos: KnowledgeReference[];   // Government Orders
  amendments: KnowledgeAmendment[];
  requiredFormIds: string[];
  requiredRegisterIds: string[];
  requiredNoticeIds: string[];
  requiredReturnIds: string[];
  requiredLicenses: string[];
  requiredCertificates: string[];
  penalties: PenaltyRule[];
  inspections: InspectionRule[];
  aiExplanation: string;
  version: string;
  effectiveDate: string;
  supersededDate?: string;
  status: "draft" | "active" | "superseded" | "archived";
};

export const SEED_KNOWLEDGE: KnowledgeAct[] = [
  {
    id: "kb-factories-1948",
    name: "Factories Act, 1948", moduleKey: "factory_act", state: "", department: "Directorate of Factories",
    rules: ["State Factory Rules"],
    sections: ["Sec 6 – Approval, licensing, registration", "Sec 63 – Hours & overtime", "Sec 79 – Leave with wages", "Sec 88 – Notice of accident"],
    notifications: [], circulars: [], gos: [],
    amendments: [{ id: "a1", title: "Occupational Safety, Health & Working Conditions Code, 2020 (consolidation)", effectiveDate: "2020-09-28", summary: "Consolidates 13 central labour laws including Factories Act." }],
    requiredFormIds: ["factory-form1a","factory-form2","factory-form11","factory-form12","factory-form14","factory-form21","factory-form22","factory-form38","factory-form10","factory-licence-renew"],
    requiredRegisterIds: [], requiredNoticeIds: [],
    requiredReturnIds: ["factory-form21","factory-form22"],
    requiredLicenses: ["Factory Licence"], requiredCertificates: ["Stability Certificate"],
    penalties: [{ violation: "Working beyond 48 hr/week", penalty: "Up to ₹2 lakh", reference: "Sec 92" }, { violation: "Non-reporting of accident", penalty: "Up to ₹1 lakh + imprisonment", imprisonment: "up to 2 years", reference: "Sec 92" }],
    inspections: [{ name: "Chief Inspector visit", frequency: "annual", authority: "Directorate of Factories", documentsRequired: ["Form 10", "Form 12", "Form 21", "Accident register"] }],
    aiExplanation: "Applies to any factory using power with ≥10 workers, or ≥20 workers without power. Governs safety, working hours, leave, welfare & accident reporting.",
    version: "v1", effectiveDate: "1948-04-01", status: "active",
  },
  {
    id: "kb-shops-estab",
    name: "Shops & Establishments Act", moduleKey: "shops_estab", state: "", department: "State Labour Dept",
    rules: ["State Shops & Establishments Rules"],
    sections: ["Sec 4 – Registration", "Sec 6 – Hours of work", "Sec 13 – Leave"],
    notifications: [], circulars: [], gos: [], amendments: [],
    requiredFormIds: ["shops-registration","shops-annual","shops-renewal","shops-holiday"],
    requiredRegisterIds: [], requiredNoticeIds: ["shops-holiday"], requiredReturnIds: ["shops-annual"],
    requiredLicenses: ["S&E Registration"], requiredCertificates: [],
    penalties: [{ violation: "Non-registration", penalty: "Up to ₹5,000/day", reference: "State Rules" }],
    inspections: [{ name: "S&E Inspector visit", frequency: "biennial", authority: "State Labour Dept", documentsRequired: ["Registration certificate", "Employee register"] }],
    aiExplanation: "Governs shops, commercial establishments, offices, warehouses. State-specific rules apply.",
    version: "v1", effectiveDate: "1948-01-01", status: "active",
  },
  {
    id: "kb-epf-1952",
    name: "EPF & MP Act, 1952", moduleKey: "epf", state: "", department: "EPFO",
    rules: ["EPF Scheme, 1952", "EPS Scheme, 1995", "EDLI Scheme, 1976"],
    sections: ["Sec 6 – Contributions", "Sec 7Q – Interest", "Sec 14B – Damages"],
    notifications: [], circulars: [], gos: [], amendments: [],
    requiredFormIds: ["epf-ecr","epf-form2","epf-form5","epf-form10","epf-form11"],
    requiredRegisterIds: [], requiredNoticeIds: [], requiredReturnIds: ["epf-ecr"],
    requiredLicenses: [], requiredCertificates: ["PF Code"],
    penalties: [{ violation: "Delayed contribution", penalty: "Interest @12% p.a. + damages up to 100%", reference: "Sec 7Q & 14B" }],
    inspections: [{ name: "EPFO enforcement visit", frequency: "on complaint", authority: "EPFO", documentsRequired: ["ECR", "Wage register", "Attendance"] }],
    aiExplanation: "Applies to establishments with ≥20 employees. 12% employee + 12% employer on PF wages capped at ₹15,000 (unless voluntarily higher).",
    version: "v1", effectiveDate: "1952-11-04", status: "active",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// FORM VERSION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

export type FormVersionStatus = "draft" | "current" | "future" | "archived";

export type FormVersion = {
  id: string;
  formId: string;             // ties to FormTemplate.id
  version: string;
  effectiveDate: string;
  supersededDate?: string;
  status: FormVersionStatus;
  pdfLayoutUrl?: string;
  fieldMapping: Record<string, string>;   // {pdfField: dataField}
  autoFillRules: string[];
  validationRules: string[];
  submissionProcess: string;
  approvalFlow: string[];
  changeSummary: string;
  createdAt: string;
};

