// SWIFT AI — Compliance Master Library
// Data-driven registry sourced from the Factory & Compliance master workbook.
// Every Act, Register, Notice/Abstract, Return, Licence and Testing item lives here
// with an applicability predicate. Nothing in this file is hardcoded into UI —
// components render whatever this registry contains, and Super Admin can extend
// it at runtime via the compliance-master-store.

import type { ComplianceProfile } from "./compliance";

export type Category =
  | "general" | "register" | "abstract" | "notice" | "return"
  | "licence" | "remittance" | "testing" | "welfare" | "safety" | "training";

export type Frequency =
  | "daily" | "monthly" | "quarterly" | "half_yearly" | "annual"
  | "biennial" | "one_time" | "on_event" | "ongoing";

export type MasterItem = {
  id: string;
  code?: string;        // Form/Register number e.g. "Form No. 10"
  title: string;
  act: string;
  category: Category;
  frequency: Frequency;
  dueDay?: number;      // 1-31 (monthly) or day-of-year for annual
  dueMonth?: number;    // 1-12 for annual
  authority?: string;
  purpose?: string;
  // Applicability: returns true when this item applies to the profile.
  applies: (p: ComplianceProfile) => boolean;
  reason?: string;
  penalty?: string;
};

const all = () => true;

// ── Applicable Labour Acts (sheet: Applicable Labour acts) ───────────────
export const MASTER_ACTS: MasterItem[] = [
  { id: "act-factories", title: "Factories Act 1948 & State Factories Rules", act: "Factories Act", category: "general", frequency: "ongoing",
    applies: (p) => p.establishmentType === "factory" },
  { id: "act-clra", title: "Contract Labour (Regulation & Abolition) Act 1970", act: "CLRA", category: "general", frequency: "ongoing",
    applies: (p) => p.contractLabour || (p.contractorCount ?? 0) >= 20 },
  { id: "act-eecn", title: "Employment Exchanges (Compulsory Notification of Vacancies) Act 1959", act: "EECN", category: "return", frequency: "quarterly", dueDay: 30,
    applies: (p) => p.employeeCount >= 25 },
  { id: "act-child", title: "Child Labour (Prohibition & Regulation) Act 1986", act: "Child Labour", category: "notice", frequency: "ongoing", applies: all },
  { id: "act-equal", title: "Equal Remuneration Act 1976", act: "Equal Remuneration", category: "register", frequency: "ongoing", applies: all },
  { id: "act-standing", title: "Industrial Employment (Standing Orders) Act 1946", act: "Standing Orders", category: "general", frequency: "ongoing",
    applies: (p) => p.employeeCount >= 100 },
  { id: "act-minwages", title: "Minimum Wages Act 1948", act: "Minimum Wages", category: "general", frequency: "ongoing", applies: all },
  { id: "act-paywages", title: "Payment of Wages Act 1936", act: "Payment of Wages", category: "general", frequency: "ongoing", applies: all },
  { id: "act-esi", title: "Employees' State Insurance Act 1948", act: "ESI", category: "general", frequency: "ongoing",
    applies: (p) => p.employeeCount >= 10 },
  { id: "act-epf", title: "EPF & Miscellaneous Provisions Act 1952", act: "EPF", category: "general", frequency: "ongoing",
    applies: (p) => p.employeeCount >= 20 },
  { id: "act-ec", title: "Employee's Compensation Act 1923", act: "EC", category: "return", frequency: "annual", dueMonth: 1, dueDay: 31, applies: all },
  { id: "act-mb", title: "Maternity Benefit Act 1961", act: "Maternity Benefit", category: "general", frequency: "ongoing",
    applies: (p) => p.womenEmployees > 0 },
  { id: "act-bonus", title: "Payment of Bonus Act 1965", act: "Bonus", category: "general", frequency: "annual", dueMonth: 12, dueDay: 30,
    applies: (p) => p.employeeCount >= 20 },
  { id: "act-gratuity", title: "Payment of Gratuity Act 1972", act: "Gratuity", category: "general", frequency: "ongoing",
    applies: (p) => p.employeeCount >= 10 },
  { id: "act-lwf", title: "State Labour Welfare Fund Act", act: "LWF", category: "remittance", frequency: "half_yearly",
    applies: (p) => p.employeeCount >= 5 },
  { id: "act-apprentice", title: "Apprentices Act 1961", act: "Apprentices", category: "general", frequency: "ongoing",
    applies: (p) => p.employeeCount >= 30 || p.apprentices > 0 },
  { id: "act-posh", title: "Sexual Harassment of Women at Workplace Act 2013", act: "POSH", category: "notice", frequency: "annual", dueMonth: 1, dueDay: 31,
    applies: (p) => p.womenEmployees >= 1 },
  { id: "act-permstatus", title: "State Conferment of Permanent Status to Workmen Act", act: "Permanent Status", category: "return", frequency: "half_yearly", applies: all },
  { id: "act-subsist", title: "State Payment of Subsistence Allowance Act", act: "Subsistence", category: "return", frequency: "half_yearly", applies: all },
  { id: "act-nfh", title: "State Industrial Establishments (National & Festival Holidays) Act", act: "NFH", category: "general", frequency: "annual", dueMonth: 12, dueDay: 31, applies: all },
];

// ── Registers (sheet: Registers) ─────────────────────────────────────────
export const MASTER_REGISTERS: MasterItem[] = [
  { id: "reg-fa-07",  code: "Form 7",  title: "Record of Lime Washing, Painting etc.", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-11",  code: "Form 11", title: "Notice of work for Adult workers and children", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-10",  code: "Form 10", title: "Overtime Register", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-12",  code: "Form 12", title: "Register of Adult Workers and Young Persons", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-29",  code: "Form 29", title: "Particulars of Rooms in the Factory", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-15",  code: "Form 15", title: "Register of Leave with Wages", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-25",  code: "Form 25", title: "Muster Roll & Compensatory Holiday", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-36",  code: "Form 36", title: "Report of Examination of Hoist and Lifts", act: "Factories Act", category: "testing", frequency: "annual", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-08",  code: "Form 8",  title: "Report of Examination of Pressure Vessel/Plant", act: "Factories Act", category: "testing", frequency: "half_yearly", applies: (p) => p.establishmentType === "factory" && p.manufacturing },
  { id: "reg-fa-27",  code: "Form 27", title: "Inspection Visit Book", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-fa-supv", title: "Register of Persons Holding Supervision/Management Position", act: "Factories Act", category: "register", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "reg-pw-3",   code: "Form III", title: "Register of Advances", act: "Payment of Wages Act", category: "register", frequency: "ongoing", applies: all },
  { id: "reg-pw-1",   code: "Form I",   title: "Register of Fines", act: "Payment of Wages Act", category: "register", frequency: "ongoing", applies: all },
  { id: "reg-pw-2",   code: "Form II",  title: "Register of Deductions for Damages/Loss", act: "Payment of Wages Act", category: "register", frequency: "ongoing", applies: all },
  { id: "reg-mw-wages", title: "Register of Wages", act: "Minimum Wages Act", category: "register", frequency: "monthly", dueDay: 7, applies: all },
  { id: "reg-mb-a",   code: "Form A",   title: "Muster Roll of Women Employees (Maternity)", act: "Maternity Benefit Act", category: "register", frequency: "ongoing", applies: (p) => p.womenEmployees > 0 },
  { id: "reg-esi-15", code: "Form 15",  title: "Accident Book", act: "ESI Act", category: "register", frequency: "ongoing", applies: (p) => p.employeeCount >= 10 },
  { id: "reg-esi-6",  code: "Form 6",   title: "Register of Employees", act: "ESI Act", category: "register", frequency: "ongoing", applies: (p) => p.employeeCount >= 10 },
  { id: "reg-esi-insp", title: "ESI Inspection Book", act: "ESI Act", category: "register", frequency: "ongoing", applies: (p) => p.employeeCount >= 10 },
  { id: "reg-clra-12", code: "Form XII", title: "Register of Contractors", act: "CLRA", category: "register", frequency: "ongoing", applies: (p) => p.contractLabour },
  { id: "reg-clra-13", code: "Form XIII", title: "Register of Workmen employed by Contractor", act: "CLRA", category: "register", frequency: "ongoing", applies: (p) => p.contractLabour },
  { id: "reg-bonus-ab", code: "Form A & B", title: "Register of Set-on / Set-off Allocable Surplus", act: "Bonus Act", category: "register", frequency: "annual", applies: (p) => p.employeeCount >= 20 },
  { id: "reg-bonus-c",  code: "Form C", title: "Register of Bonus", act: "Bonus Act", category: "register", frequency: "annual", applies: (p) => p.employeeCount >= 20 },
  { id: "reg-epf-insp", title: "EPF Inspection Book", act: "EPF Act", category: "register", frequency: "ongoing", applies: (p) => p.employeeCount >= 20 },
  { id: "reg-lwf-b", code: "Form B", title: "LWF Register of Wages", act: "State LWF Act", category: "register", frequency: "ongoing", applies: (p) => p.employeeCount >= 5 },
  { id: "reg-lwf-c", code: "Form C", title: "LWF Register of Unpaid Accumulations, Fines & Deductions", act: "State LWF Act", category: "register", frequency: "ongoing", applies: (p) => p.employeeCount >= 5 },
  { id: "reg-er-d",  code: "Form D", title: "Register maintained by Employer (Equal Remuneration)", act: "Equal Remuneration Act", category: "register", frequency: "ongoing", applies: all },
];

// ── Abstracts & Notices (sheet: Abstract & Notice) ───────────────────────
export const MASTER_ABSTRACTS: MasterItem[] = [
  { id: "abs-fa",  title: "Abstract of the Factories Act", act: "Factories Act", category: "abstract", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "abs-pg",  title: "Abstract of the Payment of Gratuity Act", act: "Payment of Gratuity", category: "abstract", frequency: "ongoing", applies: (p) => p.employeeCount >= 10 },
  { id: "abs-pw",  title: "Abstract of the Payment of Wages Act", act: "Payment of Wages", category: "abstract", frequency: "ongoing", applies: all },
  { id: "abs-mw",  title: "Abstract of the Minimum Wages Act", act: "Minimum Wages", category: "abstract", frequency: "ongoing", applies: all },
  { id: "abs-mb",  title: "Abstract of the Maternity Benefit Act", act: "Maternity Benefit", category: "abstract", frequency: "ongoing", applies: (p) => p.womenEmployees > 0 },
  { id: "abs-wc",  title: "Abstract of the Workmen's Compensation Act", act: "EC Act", category: "abstract", frequency: "ongoing", applies: all },
  { id: "abs-cl",  title: "Abstract of the Contract Labour Act", act: "CLRA", category: "abstract", frequency: "ongoing", applies: (p) => p.contractLabour },
  { id: "abs-so",  title: "Abstract of the Industrial Employment (Standing Orders) Act", act: "Standing Orders", category: "abstract", frequency: "ongoing", applies: (p) => p.employeeCount >= 100 },
  { id: "abs-bn",  title: "Abstract of the Payment of Bonus Act", act: "Bonus Act", category: "abstract", frequency: "ongoing", applies: (p) => p.employeeCount >= 20 },
];

export const MASTER_NOTICES: MasterItem[] = [
  { id: "not-fa-11",   code: "Form 11", title: "Notice of Period of Works for Adult Worker", act: "Factories Act", category: "notice", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "not-pg-a",    code: "Form A",  title: "Notice of Opening (Gratuity)", act: "Payment of Gratuity", category: "notice", frequency: "one_time", applies: (p) => p.employeeCount >= 10 },
  { id: "not-pg-auth", title: "Notice of Authorised Officer (Gratuity)", act: "Payment of Gratuity", category: "notice", frequency: "ongoing", applies: (p) => p.employeeCount >= 10 },
  { id: "not-pw-rates", title: "Notice of Rates of Wages", act: "Payment of Wages", category: "notice", frequency: "ongoing", applies: all },
  { id: "not-pw-pdate", title: "Notice furnishing Wage Period, Wage Date and Pay-Master", act: "Payment of Wages", category: "notice", frequency: "ongoing", applies: all },
  { id: "not-cl-pdate", title: "Notice furnishing Wage Period, Wage Date and Pay-Master (Contract Labour)", act: "CLRA", category: "notice", frequency: "ongoing", applies: (p) => p.contractLabour },
  { id: "not-child",   title: "'No Child Labour is Engaged' Notice", act: "Child Labour Act", category: "notice", frequency: "ongoing", applies: all },
  { id: "not-posh",    title: "Display of POSH Internal Committee Members", act: "POSH Act", category: "notice", frequency: "ongoing", applies: (p) => p.womenEmployees >= 1 },
];

// ── Returns (sheet: Consolidated status – Returns block) ────────────────
export const MASTER_RETURNS: MasterItem[] = [
  { id: "ret-pf-monthly", code: "Form 5/10/12A/IW1", title: "EPF Monthly Return", act: "EPF Act", category: "return", frequency: "monthly", dueDay: 15, applies: (p) => p.employeeCount >= 20 },
  { id: "ret-esi-half",   title: "ESI Half-Yearly Return", act: "ESI Act", category: "return", frequency: "half_yearly", applies: (p) => p.employeeCount >= 10 },
  { id: "ret-fa-half",    title: "Half-Yearly Return under Factories Act", act: "Factories Act", category: "return", frequency: "half_yearly", dueMonth: 7, dueDay: 15, applies: (p) => p.establishmentType === "factory" },
  { id: "ret-fa-annual",  title: "Annual Return under Factories Act (Jan–Dec)", act: "Factories Act", category: "return", frequency: "annual", dueMonth: 1, dueDay: 31, applies: (p) => p.establishmentType === "factory" },
  { id: "ret-clra-annual", title: "Annual Return under CLRA Act", act: "CLRA", category: "return", frequency: "annual", dueMonth: 2, dueDay: 15, applies: (p) => p.contractLabour },
  { id: "ret-subsist-half", title: "Half-Yearly Return under Subsistence Allowance", act: "Subsistence Act", category: "return", frequency: "half_yearly", applies: all },
  { id: "ret-perm-half",   title: "Half-Yearly Return under Conferment of Permanent Status", act: "Permanent Status Act", category: "return", frequency: "half_yearly", applies: all },
  { id: "ret-mb-annual",   title: "Annual Return under Maternity Benefit Act", act: "Maternity Benefit", category: "return", frequency: "annual", dueMonth: 1, dueDay: 31, applies: (p) => p.womenEmployees > 0 },
  { id: "ret-mw-annual",   title: "Annual Return under Minimum Wages Act", act: "Minimum Wages", category: "return", frequency: "annual", dueMonth: 2, dueDay: 1, applies: all },
  { id: "ret-bonus-annual", title: "Annual Return under Bonus Act", act: "Bonus Act", category: "return", frequency: "annual", dueMonth: 12, dueDay: 30, applies: (p) => p.employeeCount >= 20 },
  { id: "ret-pw-annual",   title: "Annual Return under Payment of Wages Act", act: "Payment of Wages", category: "return", frequency: "annual", dueMonth: 2, dueDay: 15, applies: all },
  { id: "ret-pf-annual",   code: "Form 3A/6A", title: "Annual Return under EPF Act", act: "EPF Act", category: "return", frequency: "annual", dueMonth: 4, dueDay: 30, applies: (p) => p.employeeCount >= 20 },
  { id: "ret-ec-annual",   title: "Annual Return under Employee's Compensation Act", act: "EC Act", category: "return", frequency: "annual", dueMonth: 1, dueDay: 31, applies: all },
  { id: "ret-eecn-quarter", title: "Quarterly Return under Employment Exchanges Notification Act (ER-1)", act: "EECN", category: "return", frequency: "quarterly", dueDay: 30, applies: (p) => p.employeeCount >= 25 },
  { id: "ret-eecn-biennial", title: "Biennial Return under Employment Exchanges Act (ER-2)", act: "EECN", category: "return", frequency: "biennial", applies: (p) => p.employeeCount >= 25 },
  { id: "ret-lwf-half",    title: "LWF Contribution & Statement", act: "State LWF Act", category: "remittance", frequency: "half_yearly", applies: (p) => p.employeeCount >= 5 },
  { id: "ret-esi-monthly", title: "ESI Monthly Remittance (by 21st)", act: "ESI Act", category: "remittance", frequency: "monthly", dueDay: 21, applies: (p) => p.employeeCount >= 10 },
  { id: "ret-pf-remit",    title: "EPF Monthly Remittance (by 15th)", act: "EPF Act", category: "remittance", frequency: "monthly", dueDay: 15, applies: (p) => p.employeeCount >= 20 },
];

// ── Licences / Registrations / Approvals ─────────────────────────────────
export const MASTER_LICENCES: MasterItem[] = [
  { id: "lic-factory",  title: "Factory Licence", act: "Factories Act", category: "licence", frequency: "annual", dueMonth: 10, dueDay: 31, applies: (p) => p.establishmentType === "factory" },
  { id: "lic-plan",     title: "Factory Plan Approval", act: "Factories Act", category: "licence", frequency: "one_time", applies: (p) => p.establishmentType === "factory" },
  { id: "lic-stability", title: "Building Stability Certificate", act: "Factories Act", category: "licence", frequency: "annual", applies: (p) => p.establishmentType === "factory" },
  { id: "lic-se",       title: "Shops & Establishments Registration", act: "S&E Act", category: "licence", frequency: "annual", applies: (p) => p.establishmentType !== "factory" },
  { id: "lic-clra-rc",  title: "CLRA Registration Certificate (Principal Employer)", act: "CLRA", category: "licence", frequency: "one_time", applies: (p) => p.contractLabour },
  { id: "lic-clra-lic", title: "CLRA Licence (Contractor)", act: "CLRA", category: "licence", frequency: "annual", applies: (p) => p.contractLabour },
  { id: "lic-gratuity", title: "Notice of Opening – Payment of Gratuity Act", act: "Gratuity Act", category: "licence", frequency: "one_time", applies: (p) => p.employeeCount >= 10 },
  { id: "lic-standing", title: "Certified Standing Orders", act: "Standing Orders Act", category: "licence", frequency: "one_time", applies: (p) => p.employeeCount >= 100 },
  { id: "lic-fire-noc", title: "Fire NOC", act: "State Fire Services Act", category: "licence", frequency: "annual", applies: (p) => p.establishmentType === "factory" },
  { id: "lic-cte",      title: "Consent to Establish (Pollution Board)", act: "Water & Air Acts", category: "licence", frequency: "one_time", applies: (p) => p.establishmentType === "factory" && p.manufacturing },
  { id: "lic-cto",      title: "Consent to Operate (Pollution Board)", act: "Water & Air Acts", category: "licence", frequency: "annual", applies: (p) => p.establishmentType === "factory" && p.manufacturing },
  { id: "lic-form-v",   code: "Form V", title: "Form V – Certificate by Principal Employer to Contractors", act: "CLRA", category: "licence", frequency: "one_time", applies: (p) => p.contractLabour },
];

// ── Testing / Safety / Welfare (sheets: Consolidated Testing, PV, Lifting, Safety, First Aiders, Fire) ─
export const MASTER_TESTING: MasterItem[] = [
  { id: "test-pv-ext",  title: "External Test of Pressure Vessels", act: "Factories Act – Rule 61", category: "testing", frequency: "half_yearly", applies: (p) => p.establishmentType === "factory" },
  { id: "test-pv-int",  title: "Internal Test of Pressure Vessels", act: "Factories Act – Rule 61", category: "testing", frequency: "annual", applies: (p) => p.establishmentType === "factory" },
  { id: "test-hoist",   title: "Examination of Hoists & Lifts", act: "Factories Act", category: "testing", frequency: "half_yearly", applies: (p) => p.establishmentType === "factory" },
  { id: "test-crane",   title: "Testing of Cranes & Chain Pulley Blocks", act: "Factories Act", category: "testing", frequency: "annual", applies: (p) => p.establishmentType === "factory" },
  { id: "test-lifting", title: "Inspection of Lifting Tackles", act: "Factories Act", category: "testing", frequency: "annual", applies: (p) => p.establishmentType === "factory" },
  { id: "test-dust",    title: "Testing of Dust Extraction System", act: "Factories Act", category: "testing", frequency: "annual", applies: (p) => p.hazardous },
  { id: "test-forklift-eye", title: "Eye Examination for Fork-Lift Operators", act: "Factories Act", category: "testing", frequency: "annual", applies: (p) => p.establishmentType === "factory" },
  { id: "test-fire-drill", title: "Mock Fire Drill", act: "Factories Act", category: "safety", frequency: "quarterly", applies: (p) => p.establishmentType === "factory" },
  { id: "test-safety-mtg", title: "Safety Committee Meeting", act: "Factories Act", category: "safety", frequency: "quarterly", applies: (p) => p.establishmentType === "factory" && p.employeeCount >= 250 },
  { id: "test-fire-training", title: "Basic Fire Fighter Training", act: "Factories Act", category: "training", frequency: "annual", applies: (p) => p.establishmentType === "factory" },
  { id: "test-first-aid", title: "First-Aid Training", act: "Factories Act", category: "training", frequency: "annual", applies: (p) => p.employeeCount >= 50 },
  { id: "test-medical-haz", title: "Periodical Medical Examination – Hazardous Workers", act: "Factories Act", category: "training", frequency: "half_yearly", applies: (p) => p.hazardous },
];

export const MASTER_WELFARE: MasterItem[] = [
  { id: "wel-drinking", title: "Drinking Water Facility", act: "Factories Act – S.18", category: "welfare", frequency: "ongoing", applies: all },
  { id: "wel-toilet",   title: "Male & Female Toilets/Urinals",  act: "Factories Act – S.19", category: "welfare", frequency: "ongoing", applies: all },
  { id: "wel-washing",  title: "Washing Facility / Safety Shower", act: "Factories Act – S.42", category: "welfare", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "wel-first-aid", title: "First-Aid Box (1 per 150 workers)", act: "Factories Act – S.45", category: "welfare", frequency: "ongoing", applies: (p) => p.establishmentType === "factory" },
  { id: "wel-canteen",  title: "Canteen (≥250 workers)", act: "Factories Act – S.46", category: "welfare", frequency: "ongoing", applies: (p) => p.employeeCount >= 250 },
  { id: "wel-rest",     title: "Rest Room / Lunch Room (≥150 workers)", act: "Factories Act – S.47", category: "welfare", frequency: "ongoing", applies: (p) => p.employeeCount >= 150 },
  { id: "wel-creche",   title: "Creche (≥30 women workers)", act: "Factories Act – S.48", category: "welfare", frequency: "ongoing", applies: (p) => p.womenEmployees >= 30 },
  { id: "wel-ohc",      title: "Occupational Health Centre", act: "Factories Act", category: "welfare", frequency: "ongoing", applies: (p) => p.hazardous || p.employeeCount >= 500 },
  { id: "wel-ambulance", title: "Ambulance Room / Ambulance Van", act: "Factories Act", category: "welfare", frequency: "ongoing", applies: (p) => p.employeeCount >= 500 },
  { id: "wel-welfare-officer", title: "Welfare Officer (≥500 workers)", act: "Factories Act – S.49", category: "welfare", frequency: "ongoing", applies: (p) => p.employeeCount >= 500 },
  { id: "wel-safety-officer",  title: "Safety Officer (≥1000 workers or hazardous)", act: "Factories Act – S.40B", category: "welfare", frequency: "ongoing", applies: (p) => p.employeeCount >= 1000 || p.hazardous },
];

// Everything, merged. This is what the store filters by applicability.
export const MASTER_LIBRARY: MasterItem[] = [
  ...MASTER_ACTS,
  ...MASTER_REGISTERS,
  ...MASTER_ABSTRACTS,
  ...MASTER_NOTICES,
  ...MASTER_RETURNS,
  ...MASTER_LICENCES,
  ...MASTER_TESTING,
  ...MASTER_WELFARE,
];

export const CATEGORY_LABEL: Record<Category, string> = {
  general: "General",
  register: "Registers",
  abstract: "Abstracts",
  notice: "Notices",
  return: "Returns",
  licence: "Licences",
  remittance: "Remittances",
  testing: "Testing",
  welfare: "Welfare Facilities",
  safety: "Safety",
  training: "Training",
};

export type MasterStatus = "green" | "amber" | "red" | "na" | "pending";

export type MasterStatusRecord = {
  itemId: string;
  status: MasterStatus;
  remarks?: string;
  reference?: string;
  updatedAt: string;
  updatedBy: string;
};

export function applicableMaster(profile: ComplianceProfile, custom: MasterItem[] = []): MasterItem[] {
  return [...MASTER_LIBRARY, ...custom].filter((i) => {
    try { return i.applies(profile); } catch { return true; }
  });
}

export function summariseMaster(items: MasterItem[], statuses: Record<string, MasterStatusRecord>) {
  let green = 0, amber = 0, red = 0, na = 0, pending = 0;
  for (const it of items) {
    const s = statuses[it.id]?.status ?? "pending";
    if (s === "green") green++;
    else if (s === "amber") amber++;
    else if (s === "red") red++;
    else if (s === "na") na++;
    else pending++;
  }
  const total = items.length || 1;
  const complianceScore = Math.round(((green + na * 0.5) / total) * 100);
  return { green, amber, red, na, pending, total: items.length, complianceScore };
}
