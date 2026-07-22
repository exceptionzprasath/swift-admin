// SWIFT AI — Master Register Engine
// Auto-maintained statutory registers. Each entry re-uses the Compliance Doc
// renderer via a matching spec in COMPLIANCE_DOC_CATALOG, but exposes a
// friendlier surface for the Registers dashboard.

import type { ComplianceDocSpec } from "./compliance-docs";
import { COMPLIANCE_DOC_CATALOG } from "./compliance-docs";

export type MasterRegister = {
  id: string;
  name: string;
  act: string;
  frequency: string;
  autoSource: string;   // where the rows come from
  specId?: string;      // links to catalog spec if statutory
};

export const MASTER_REGISTERS: MasterRegister[] = [
  { id: "reg_employee",        name: "Employee Register",         act: "S&E Act / Factories Act", frequency: "continuous", autoSource: "employees" },
  { id: "reg_attendance",      name: "Attendance Register",       act: "S&E Act / Factories Act", frequency: "daily",      autoSource: "attendance" },
  { id: "reg_muster",          name: "Muster Roll",               act: "Factories Act — Form 25", frequency: "monthly",    autoSource: "attendance", specId: "tn_fact_form_25" },
  { id: "reg_adult_worker",    name: "Adult Worker Register",     act: "Factories Act — Form 8",  frequency: "monthly",    autoSource: "employees", specId: "tn_fact_form_8" },
  { id: "reg_young_worker",    name: "Young Worker Register",     act: "Factories Act — Form 8A", frequency: "monthly",    autoSource: "employees", specId: "tn_fact_form_8a" },
  { id: "reg_leave",           name: "Leave Register",            act: "S&E Act — Form D",        frequency: "annual",     autoSource: "leaves",    specId: "tn_shops_form_d" },
  { id: "reg_lww",             name: "Leave with Wages Register", act: "Factories Act — Form 12", frequency: "annual",     autoSource: "leaves",    specId: "tn_fact_form_12" },
  { id: "reg_salary",          name: "Salary Register",           act: "Payment of Wages Act",    frequency: "monthly",    autoSource: "payrolls" },
  { id: "reg_wage",            name: "Wage Register",             act: "Factories Act — Form 25B",frequency: "monthly",    autoSource: "payrolls",  specId: "tn_fact_form_25b" },
  { id: "reg_pf",              name: "PF Register",               act: "EPF & MP Act",            frequency: "monthly",    autoSource: "payrolls" },
  { id: "reg_esi",             name: "ESI Register",              act: "ESI Act",                 frequency: "monthly",    autoSource: "payrolls" },
  { id: "reg_pt",              name: "PT Register",               act: "Professional Tax Act",    frequency: "monthly",    autoSource: "payrolls" },
  { id: "reg_lwf",             name: "LWF Register",              act: "Labour Welfare Fund Act", frequency: "half_yearly",autoSource: "payrolls" },
  { id: "reg_bonus",           name: "Bonus Register",            act: "Payment of Bonus Act",    frequency: "annual",     autoSource: "payrolls" },
  { id: "reg_accident",        name: "Accident Register",         act: "Factories Act — Form 15", frequency: "on_event",   autoSource: "incidents", specId: "tn_fact_form_15" },
  { id: "reg_medical",         name: "Medical Register",          act: "Factories Act",           frequency: "annual",     autoSource: "medical" },
  { id: "reg_inspection",      name: "Inspection Register",       act: "Factories Act — Form 26", frequency: "on_event",   autoSource: "inspections", specId: "tn_fact_form_26" },
  { id: "reg_asset",           name: "Asset Register",            act: "Company Policy",          frequency: "continuous", autoSource: "assets" },
  { id: "reg_visitor",         name: "Visitor Register",          act: "Company Policy",          frequency: "daily",      autoSource: "visitors" },
  { id: "reg_training",        name: "Training Register",         act: "Skill Development Policy",frequency: "continuous", autoSource: "training" },
  { id: "reg_contract_labour", name: "Contract Labour Register",  act: "CLRA Act, 1970",          frequency: "monthly",    autoSource: "employees" },
];

export function specFor(registerId: string): ComplianceDocSpec | undefined {
  const r = MASTER_REGISTERS.find((x) => x.id === registerId);
  if (!r?.specId) return undefined;
  return COMPLIANCE_DOC_CATALOG.find((s) => s.id === r.specId);
}
