import type { Company, Employee, EarningComponent } from "./store";
import { computePayroll, type PayrollComputation } from "./payroll";

export type RevisionTarget =
  | "basic"
  | "gross"
  | "ctc"
  | "special"
  | "fixed"
  | "performance"
  | "noPfEsi"
  | "proportional";

export type RevisionReason =
  | "increment"
  | "promotion"
  | "correction"
  | "annual"
  | "retention"
  | "special_allowance"
  | "transfer"
  | "probation_confirmation"
  | "market_correction"
  | "other";

export type SalaryRevisionDraft = {
  employeeId: string;
  amount: number; // ₹ delta (can be negative)
  target: RevisionTarget;
  reason: RevisionReason;
  reasonNote?: string;
  effectiveDate: string; // YYYY-MM-DD
  arrears: boolean;
  retro: boolean;
  recalcAttendance: boolean;
  recalcLeave: boolean;
  recalcOt: boolean;
  recalcBonus: boolean;
  recalcIncentive: boolean;
  updateTaxProjection: boolean;
  applyToFuture: boolean;
};

export type SalaryRevision = SalaryRevisionDraft & {
  id: string;
  createdAt: string;
  createdBy: string;
  status: "pending" | "applied" | "rolled_back";
  beforeBasic: number;
  afterBasic: number;
  addedComponent?: { id: string; name: string; monthly: number };
};

/** Build a hypothetical (company, employee) pair reflecting the proposed revision, without mutating state. */
export function projectRevision(
  company: Company,
  employee: Employee,
  draft: Pick<SalaryRevisionDraft, "amount" | "target">
): { company: Company; employee: Employee; addedComponent?: EarningComponent } {
  const { amount, target } = draft;
  const emp: Employee = { ...employee };
  let comp: Company = company;
  let added: EarningComponent | undefined;

  const addFlat = (id: string, name: string, opts: Partial<EarningComponent>): EarningComponent => ({
    id,
    name,
    formula: "flatMonthly",
    value: amount,
    prorate: true,
    taxable: true,
    includeInPf: true,
    includeInEsi: true,
    includeInGratuity: false,
    ...opts,
  });

  switch (target) {
    case "basic":
      emp.basic = Math.max(0, (employee.basic || 0) + amount);
      break;
    case "proportional": {
      // Scale basic so that resulting gross moves by ≈ amount, given current % structure.
      const cur = computePayroll({
        company, employee, daysWorked: company.workingDaysPerMonth,
        otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0,
      });
      const ratio = cur.gross > 0 ? (cur.gross + amount) / cur.gross : 1;
      emp.basic = Math.max(0, Math.round((employee.basic || 0) * ratio));
      break;
    }
    case "gross":
      added = addFlat(`rev-gross-${Date.now()}`, "Revision — Gross", { includeInPf: true, includeInEsi: true });
      comp = { ...company, earnings: [...(company.earnings || []), added] };
      break;
    case "special":
      added = addFlat(`rev-special-${Date.now()}`, "Special Allowance (Revision)", { includeInPf: true, includeInEsi: true });
      comp = { ...company, earnings: [...(company.earnings || []), added] };
      break;
    case "fixed":
      added = addFlat(`rev-fixed-${Date.now()}`, "Fixed Allowance (Revision)", { includeInPf: false, includeInEsi: true });
      comp = { ...company, earnings: [...(company.earnings || []), added] };
      break;
    case "performance":
      added = addFlat(`rev-perf-${Date.now()}`, "Performance Allowance (Revision)", { includeInPf: false, includeInEsi: true });
      comp = { ...company, earnings: [...(company.earnings || []), added] };
      break;
    case "noPfEsi":
      added = addFlat(`rev-npe-${Date.now()}`, "Allowance (No PF/ESI)", { includeInPf: false, includeInEsi: false, taxable: true });
      comp = { ...company, earnings: [...(company.earnings || []), added] };
      break;
    case "ctc":
      // CTC-loaded: model as an employer-side allowance visible in gross but not statutory bases.
      added = addFlat(`rev-ctc-${Date.now()}`, "CTC Loading (Revision)", { includeInPf: false, includeInEsi: false, includeInGratuity: false, taxable: true });
      comp = { ...company, earnings: [...(company.earnings || []), added] };
      break;
  }

  return { company: comp, employee: emp, addedComponent: added };
}

export type RevisionSimulation = {
  before: PayrollComputation;
  after: PayrollComputation;
  diff: {
    gross: number;
    net: number;
    employerCost: number;
    monthlyCTC: number;
    annualCTC: number;
    employeePF: number;
    employerPF: number;
    employeeESI: number;
    employerESI: number;
    tds: number;
    pt: number;
  };
  impacts: {
    pfEligibilityChanged: boolean;
    esiEligibilityChanged: boolean;
    ptSlabChanged: boolean;
    crossesEsiThreshold: boolean;
  };
  recommendations: string[];
};

export function simulateRevision(
  company: Company,
  employee: Employee,
  draft: Pick<SalaryRevisionDraft, "amount" | "target">
): RevisionSimulation {
  const baseArgs = {
    daysWorked: company.workingDaysPerMonth,
    otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0,
  };
  const before = computePayroll({ company, employee, ...baseArgs });
  const projected = projectRevision(company, employee, draft);
  const after = computePayroll({ company: projected.company, employee: projected.employee, ...baseArgs });

  const diff = {
    gross: after.gross - before.gross,
    net: after.net - before.net,
    employerCost: after.totalEmployer - before.totalEmployer,
    monthlyCTC: after.monthlyCTC - before.monthlyCTC,
    annualCTC: after.annualCTC - before.annualCTC,
    employeePF: after.deductions.employeePF - before.deductions.employeePF,
    employerPF: after.employerContrib.employerPF - before.employerContrib.employerPF,
    employeeESI: after.deductions.employeeESI - before.deductions.employeeESI,
    employerESI: after.employerContrib.employerESI - before.employerContrib.employerESI,
    tds: after.deductions.tds - before.deductions.tds,
    pt: after.deductions.professionalTax - before.deductions.professionalTax,
  };

  const threshold = company.esiRules?.threshold ?? 21000;
  const impacts = {
    pfEligibilityChanged: (before.deductions.employeePF > 0) !== (after.deductions.employeePF > 0),
    esiEligibilityChanged: before.esiEligible !== after.esiEligible,
    ptSlabChanged: Math.round(before.deductions.professionalTax) !== Math.round(after.deductions.professionalTax),
    crossesEsiThreshold:
      (before.gross <= threshold && after.gross > threshold) ||
      (before.gross > threshold && after.gross <= threshold),
  };

  const recs: string[] = [];
  if (impacts.esiEligibilityChanged) {
    recs.push(
      after.esiEligible
        ? `Employee will now fall UNDER ESI (gross ₹${Math.round(after.gross)} ≤ threshold ₹${threshold}).`
        : `Employee will EXIT ESI (gross ₹${Math.round(after.gross)} > threshold ₹${threshold}). ESI deduction stops next contribution period per your configured policy.`
    );
  } else if (impacts.crossesEsiThreshold) {
    recs.push(`This revision crosses the configured ESI threshold — review ESI treatment.`);
  }
  if (impacts.pfEligibilityChanged) recs.push(`PF membership status changes with this revision. Verify UAN linkage and PF policy.`);
  if (Math.abs(diff.employerPF) > 0.5 || Math.abs(diff.employeePF) > 0.5) {
    recs.push(`PF contributions will change by ₹${Math.round(diff.employeePF)} (employee) / ₹${Math.round(diff.employerPF)} (employer) per month.`);
  }
  if (impacts.ptSlabChanged) recs.push(`Professional Tax slab changes: ₹${Math.round(before.deductions.professionalTax)} → ₹${Math.round(after.deductions.professionalTax)}.`);
  if (Math.abs(diff.tds) > 0.5) recs.push(`Monthly TDS projection shifts by ₹${Math.round(diff.tds)} based on your configured slabs.`);
  if (diff.net < 0) recs.push(`Take-home DECREASES by ₹${Math.round(-diff.net)} — likely because the added component increases PF/ESI/PT more than gross.`);
  if (diff.employerCost > 0 && diff.net > 0) {
    const ratio = diff.employerCost / Math.max(1, diff.net);
    if (ratio > 1.5) recs.push(`Employer cost rises ${ratio.toFixed(1)}× the take-home increase. Consider restructuring for a leaner CTC impact.`);
  }
  if (recs.length === 0) recs.push(`No statutory eligibility changes detected. Safe to proceed as configured.`);
  return { before, after, diff, impacts, recommendations: recs };
}

export const revisionReasonLabels: Record<RevisionReason, string> = {
  increment: "Increment",
  promotion: "Promotion",
  correction: "Correction",
  annual: "Annual Revision",
  retention: "Retention",
  special_allowance: "Special Allowance",
  transfer: "Transfer",
  probation_confirmation: "Probation Confirmation",
  market_correction: "Market Correction",
  other: "Other",
};

export const revisionTargetLabels: Record<RevisionTarget, string> = {
  basic: "Basic Salary only",
  gross: "Gross Salary",
  ctc: "CTC (no statutory impact)",
  special: "Special Allowance",
  fixed: "Fixed Allowance",
  performance: "Performance Allowance",
  noPfEsi: "Without affecting PF & ESI",
  proportional: "Proportional across all components",
};
