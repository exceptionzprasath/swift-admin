import type { Company, Employee, EarningComponent, DeductionComponent, SalaryStructure } from "./store";

export type PayrollInputs = {
  daysWorked: number;
  otHours: number;
  incentive: number;
  shiftDays: number;
  loan: number;
  advance: number;
  bonus: number;
  arrears?: number;
  reimbursement?: number;
  nightHours?: number;
  variablePay?: number;
  otherEarnings?: number;
  otherDeductions?: number;
};

export type PayrollComputation = ReturnType<typeof computePayroll>;

const asNum = (v: unknown) => (typeof v === "number" && !isNaN(v) ? v : 0);

/** Resolve the best matching salary structure for an employee (highest priority match wins). */
export function resolveSalaryStructure(company: Company, employee: Employee): SalaryStructure | undefined {
  const list = company.salaryStructures || [];
  if (list.length === 0) return undefined;
  const branchId = employee.branchId;
  const matches = list.filter((s) => {
    const m = s.match || {};
    if (m.branchId && m.branchId !== branchId) return false;
    if (m.department && m.department !== employee.department) return false;
    if (m.designation && m.designation !== employee.designation) return false;
    if (m.category && m.category !== employee.category) return false;
    return true;
  });
  matches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return matches[0];
}

function evalEarning(
  c: EarningComponent,
  ctx: {
    company: Company;
    employee: Employee;
    proratedBasic: number;
    inputs: PayrollInputs;
    hourly: number;
  }
): number {
  const { company, employee, proratedBasic, inputs, hourly } = ctx;
  const prorateFactor = c.prorate ? (inputs.daysWorked / company.workingDaysPerMonth) : 1;
  switch (c.formula) {
    case "pctOfBasic":
      return proratedBasic * (c.value / 100);
    case "flatMonthly":
      return c.value * prorateFactor;
    case "perDay":
      return c.value * inputs.daysWorked;
    case "perShiftDay":
      return c.value * inputs.shiftDays;
    case "perOtHour":
      return hourly * inputs.otHours * (c.value || company.otMultiplier);
    case "perNightHour":
      return hourly * (inputs.nightHours || 0) * (c.value || 1.15);
    case "input": {
      const map: Record<string, number> = {
        incentive: inputs.incentive,
        bonus: inputs.bonus,
        arrears: inputs.arrears || 0,
        reimbursement: inputs.reimbursement || 0,
        variablePay: inputs.variablePay || 0,
        otherEarnings: inputs.otherEarnings || 0,
      };
      return asNum(map[c.inputKey || c.id]);
    }
    case "pctOfCtc": {
      const ctcMonthly = (employee.basic || 0) * (c.value / 100);
      return ctcMonthly * prorateFactor;
    }
    default:
      return 0;
  }
}

function evalDeduction(
  d: DeductionComponent,
  ctx: { gross: number; basic: number; inputs: PayrollInputs; pfBase: number; net: number }
): number {
  const { gross, basic, inputs, pfBase } = ctx;
  switch (d.formula) {
    case "flat":
      return d.value;
    case "pctOfGross":
      return gross * (d.value / 100);
    case "pctOfBasic":
      return basic * (d.value / 100);
    case "pctOfPfBase":
      return pfBase * (d.value / 100);
    case "input": {
      const map: Record<string, number> = {
        loan: inputs.loan,
        advance: inputs.advance,
        otherDeductions: inputs.otherDeductions || 0,
      };
      return asNum(map[d.inputKey || d.id]);
    }
    default:
      return 0;
  }
}

function ptFromSlabs(gross: number, slabs: Company["ptSlabs"]): number {
  if (!slabs || slabs.length === 0) return 0;
  const sorted = [...slabs].sort((a, b) => a.upTo - b.upTo);
  for (const s of sorted) if (gross <= s.upTo) return s.amount;
  return sorted[sorted.length - 1].amount;
}

function tdsFromSlabs(annualTaxable: number, slabs: Company["tdsSlabs"]): number {
  if (!slabs || slabs.length === 0) return 0;
  const sorted = [...slabs].sort((a, b) => a.upTo - b.upTo);
  let tax = 0;
  let prev = 0;
  for (const s of sorted) {
    if (annualTaxable > s.upTo) {
      tax += (s.upTo - prev) * (s.pct / 100);
      prev = s.upTo;
    } else {
      tax += (annualTaxable - prev) * (s.pct / 100);
      return Math.max(0, tax);
    }
  }
  tax += (annualTaxable - prev) * (sorted[sorted.length - 1].pct / 100);
  return Math.max(0, tax);
}

/** State-wise LWF resolver — branch state wins, falls back to company lwfRules. */
function resolveLwf(company: Company, employee: Employee) {
  const branch = (company.branches || []).find((b) => b.id === employee.branchId);
  const state = branch?.state;
  if (state && company.lwfByState) {
    const hit = company.lwfByState.find((r) => r.state.toLowerCase() === state.toLowerCase());
    if (hit) return { enabled: true, employee: hit.employeeAmount, employer: hit.employerAmount, source: `LWF (${state})` };
  }
  if (company.lwfRules?.enabled) {
    return { enabled: true, employee: company.lwfRules.employeeAmount, employer: company.lwfRules.employerAmount, source: "LWF (default)" };
  }
  return { enabled: false, employee: 0, employer: 0, source: "LWF" };
}

export function computePayroll(opts: {
  company: Company;
  employee: Employee;
} & PayrollInputs) {
  const { company: c, employee: e, ...inputs } = opts;
  const wd = c.workingDaysPerMonth || 26;
  const proratedBasic = (e.basic * inputs.daysWorked) / wd;
  const hourly = e.basic / (wd * (c.workingHoursPerDay || 8));

  // Resolve applicable salary structure (per branch/dept/designation/category)
  const structure = resolveSalaryStructure(c, e);
  const effectiveEarnings = structure?.earnings ?? c.earnings ?? [];
  const effectiveDeductions = structure?.deductions ?? c.deductions ?? [];

  const earningsList: { id: string; name: string; amount: number; c: EarningComponent }[] = [];
  earningsList.push({
    id: "basic",
    name: "Basic",
    amount: proratedBasic,
    c: { id: "basic", name: "Basic", formula: "pctOfBasic", value: 100, prorate: true, taxable: true, includeInPf: true, includeInEsi: true, includeInGratuity: true },
  });

  for (const comp of effectiveEarnings) {
    const amt = evalEarning(comp, { company: c, employee: e, proratedBasic, inputs, hourly });
    earningsList.push({ id: comp.id, name: comp.name, amount: amt, c: comp });
  }

  // Auto-append inputs that don't already exist as components — so Night/Variable/Other never get silently dropped
  const ensure = (id: string, name: string, amount: number, opts?: Partial<EarningComponent>) => {
    if (amount <= 0) return;
    if (earningsList.some((x) => x.id === id)) return;
    earningsList.push({
      id, name, amount,
      c: { id, name, formula: "input", value: 0, prorate: false, taxable: opts?.taxable ?? true, includeInPf: opts?.includeInPf ?? false, includeInEsi: opts?.includeInEsi ?? true, includeInGratuity: false, inputKey: id },
    });
  };
  ensure("variablePay", "Variable Pay", inputs.variablePay || 0);
  ensure("otherEarnings", "Other Earnings", inputs.otherEarnings || 0);
  ensure("reimbursement", "Reimbursements", inputs.reimbursement || 0, { taxable: false, includeInEsi: false });
  // Night allowance auto-fallback if no explicit component: 15% of hourly per night hour
  if ((inputs.nightHours || 0) > 0 && !earningsList.some((x) => /night/i.test(x.name))) {
    const nightAmt = hourly * (inputs.nightHours || 0) * 1.15;
    earningsList.push({
      id: "night", name: "Night Allowance", amount: nightAmt,
      c: { id: "night", name: "Night Allowance", formula: "perNightHour", value: 1.15, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  const gross = earningsList.reduce((a, b) => a + b.amount, 0);

  // PF (EPF Act 1952) — EPF + EPS + EDLI + Admin split
  const pfRules = c.pfRules;
  let pfBaseRaw = earningsList.filter((x) => x.c.includeInPf).reduce((a, b) => a + b.amount, 0);
  const PF_CEILING = pfRules?.ceiling && pfRules.ceiling > 0 ? pfRules.ceiling : 15000;
  let pfBase = pfBaseRaw;
  if (pfRules?.ceiling && pfRules.ceiling > 0) pfBase = Math.min(pfBase, pfRules.ceiling);
  const employeePF = pfRules?.enabled ? pfBase * ((pfRules.employeePct ?? c.employeePfPct) / 100) : 0;
  const employerPFTotal = pfRules?.enabled ? pfBase * ((pfRules.employerPct ?? c.employerPfPct) / 100) : 0;

  // EPS diversion: 8.33% of PF wage capped at ₹15,000 → max ₹1,250. Stops after age 58 (EPFO rule).
  const age = e.dob ? Math.floor((Date.now() - new Date(e.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : undefined;
  const epsEligible = pfRules?.enabled && (age === undefined || age < 58);
  const epsWage = Math.min(pfBase, 15000);
  const eps = epsEligible ? epsWage * 0.0833 : 0;
  const epfEmployer = Math.max(0, employerPFTotal - eps);
  // EDLI (Employees Deposit Linked Insurance): 0.5% of PF wage capped at ₹15,000
  const edli = pfRules?.enabled ? Math.min(pfBase, 15000) * 0.005 : 0;
  // Admin charges (EPFO): 0.5% of PF wages (min ₹500/mo per establishment, ignored per-employee)
  const pfAdmin = pfRules?.enabled ? pfBase * 0.005 : 0;
  const employerPF = employerPFTotal; // preserved for existing UI

  // ESI (ESI Act 1948) — gross wage ceiling ₹21,000 (₹25,000 for PwD)
  const esiRules = c.esiRules;
  const esiBase = earningsList.filter((x) => x.c.includeInEsi).reduce((a, b) => a + b.amount, 0);
  const esiEligible = !!(esiRules?.enabled && gross <= (esiRules.threshold ?? c.esiThreshold));
  const employeeESI = esiEligible ? esiBase * ((esiRules!.employeePct ?? c.employeeEsiPct) / 100) : 0;
  const employerESI = esiEligible ? esiBase * ((esiRules!.employerPct ?? c.employerEsiPct) / 100) : 0;

  // Professional Tax (slabs or flat)
  const pt = c.ptSlabs && c.ptSlabs.length > 0 ? ptFromSlabs(gross, c.ptSlabs) : c.ptAmount;

  // TDS (monthly ≈ annual/12 based on annualized taxable)
  const taxableAnnual = earningsList.filter((x) => x.c.taxable).reduce((a, b) => a + b.amount, 0) * 12;
  const tdsMonthly = c.tdsRules?.enabled ? tdsFromSlabs(taxableAnnual, c.tdsSlabs || []) / 12 : 0;

  // LWF (state-aware)
  const lwfInfo = resolveLwf(c, e);
  const lwf = lwfInfo.employee;
  const employerLwf = lwfInfo.employer;

  // Configurable extra deductions
  const extraDeductionsList: { id: string; name: string; amount: number }[] = [];
  for (const d of effectiveDeductions) {
    const amt = evalDeduction(d, { gross, basic: proratedBasic, inputs, pfBase, net: 0 });
    extraDeductionsList.push({ id: d.id, name: d.name, amount: amt });
  }
  // Ensure otherDeductions input reaches the payslip if no component uses it
  if ((inputs.otherDeductions || 0) > 0 && !extraDeductionsList.some((x) => x.id === "otherDeductions")) {
    extraDeductionsList.push({ id: "otherDeductions", name: "Other Deductions", amount: inputs.otherDeductions || 0 });
  }

  const baseDeductions = {
    employeePF,
    employeeESI,
    professionalTax: pt,
    tds: tdsMonthly,
    lwf,
    loan: inputs.loan,
    advance: inputs.advance,
  };
  const totalExtras = extraDeductionsList.reduce((a, b) => a + b.amount, 0);
  const totalDeductions = Object.values(baseDeductions).reduce((a, b) => a + b, 0) + totalExtras;
  const net = gross - totalDeductions;

  // Gratuity
  const gRules = c.gratuityRules;
  const gratuityBase = gRules?.enabled
    ? earningsList.filter((x) => x.c.includeInGratuity).reduce((a, b) => a + b.amount, 0)
    : 0;
  const gratuity = gRules?.enabled ? gratuityBase * ((gRules.numerator || 15) / (gRules.denominator || 26)) / 12 : 0;

  const employerContrib = { employerPF, employerESI, employerLwf, gratuity, eps, epfEmployer, edli, pfAdmin };
  const totalEmployer = employerPF + employerESI + employerLwf + gratuity + edli + pfAdmin;
  const monthlyCTC = gross + totalEmployer;
  const annualCTC = monthlyCTC * 12;

  // Legacy earnings map for old UI compatibility
  const findAmt = (name: RegExp) => earningsList.find((x) => name.test(x.name))?.amount || 0;
  const earnings = {
    basic: proratedBasic,
    hra: findAmt(/^HRA/i),
    special: findAmt(/^Special/i),
    medical: findAmt(/^Medical/i),
    conveyance: findAmt(/^Conveyance/i),
    washing: findAmt(/^Washing/i),
    other: findAmt(/^Other/i),
    bonus: findAmt(/^Bonus/i) || inputs.bonus,
    incentive: findAmt(/^Incentive/i) || inputs.incentive,
    overtime: findAmt(/Overtime|OT/i),
    shiftAllowance: findAmt(/Shift/i),
    night: findAmt(/Night/i),
    variablePay: findAmt(/Variable/i) || inputs.variablePay || 0,
  };
  const deductions = baseDeductions;

  return {
    earnings,
    deductions,
    extraDeductions: extraDeductionsList,
    earningsList: earningsList.map(({ id, name, amount }) => ({ id, name, amount })),
    employerContrib,
    hourly,
    gross,
    pfBase,
    pfBaseRaw,
    pfCeiling: PF_CEILING,
    esiBase,
    esiEligible,
    totalDeductions,
    net,
    totalEmployer,
    monthlyCTC,
    annualCTC,
    structureId: structure?.id,
    structureName: structure?.name,
    lwfSource: lwfInfo.source,
    age,
    epsEligible,
  };
}

/** HR-facing plain-English explanation of every line item — feeds SWIFT AI Copilot and the payslip footer. */
export function explainPayroll(company: Company, employee: Employee, p: PayrollComputation): { id: string; text: string }[] {
  const c = company;
  const out: { id: string; text: string }[] = [];
  const wd = c.workingDaysPerMonth || 26;

  out.push({ id: "basic", text: `Basic = ₹${Math.round(employee.basic).toLocaleString("en-IN")} × days worked ÷ ${wd} working days.` });

  for (const row of p.earningsList) {
    if (row.id === "basic") continue;
    if (/hra/i.test(row.name)) out.push({ id: row.id, text: `HRA is computed as a % of basic per company policy. Metro cities can claim up to 50%, non-metro up to 40% for tax exemption.` });
    else if (/special/i.test(row.name)) out.push({ id: row.id, text: `Special Allowance balances CTC to target and is fully taxable.` });
    else if (/medical/i.test(row.name)) out.push({ id: row.id, text: `Medical Allowance is a flat monthly component; post-2018 it is fully taxable (standard deduction replaced it).` });
    else if (/conveyance/i.test(row.name)) out.push({ id: row.id, text: `Conveyance is paid for travel to work; fully taxable post-2018.` });
    else if (/overtime|OT/i.test(row.name)) out.push({ id: row.id, text: `OT = hourly rate × OT hours × ${c.otMultiplier}× multiplier (Factories Act: 2× for factory workers).` });
    else if (/night/i.test(row.name)) out.push({ id: row.id, text: `Night Allowance covers night-shift hours; taxable, generally excluded from PF, included in ESI base.` });
    else if (/shift/i.test(row.name)) out.push({ id: row.id, text: `Shift Allowance is paid per shift day worked.` });
    else if (/bonus/i.test(row.name)) out.push({ id: row.id, text: `Bonus per Payment of Bonus Act — 8.33% to 20% of Basic+DA, statutory min applies where Basic ≤ ₹21,000.` });
    else if (/incentive/i.test(row.name)) out.push({ id: row.id, text: `Incentive is variable performance pay; taxable, included in ESI.` });
    else if (/reimburse/i.test(row.name)) out.push({ id: row.id, text: `Reimbursements are against bills; not taxable when supported by receipts.` });
    else if (/variable/i.test(row.name)) out.push({ id: row.id, text: `Variable Pay is a quarterly/annual bonus paid pro-rata; fully taxable.` });
    else if (/arrears/i.test(row.name)) out.push({ id: row.id, text: `Arrears from prior months added this cycle. Section 89(1) tax relief may apply.` });
  }

  if (c.pfRules?.enabled) {
    out.push({
      id: "employeePF",
      text: `Employee PF = ${c.pfRules.employeePct}% of PF base ₹${Math.round(p.pfBase).toLocaleString("en-IN")}${p.pfBaseRaw > p.pfBase ? ` (capped at wage ceiling ₹${c.pfRules.ceiling.toLocaleString("en-IN")} from raw ₹${Math.round(p.pfBaseRaw).toLocaleString("en-IN")})` : ""}. Statutory: EPF Act 1952.`,
    });
    out.push({ id: "employerPF", text: `Employer PF = ${c.pfRules.employerPct}% of PF base — includes 8.33% pension diversion (EPS) up to ceiling.` });
  }
  if (c.esiRules?.enabled) {
    out.push({
      id: "employeeESI",
      text: p.esiEligible
        ? `Employee ESI = ${c.esiRules.employeePct}% of ESI base ₹${Math.round(p.esiBase).toLocaleString("en-IN")}. Eligible while gross ≤ ₹${c.esiRules.threshold.toLocaleString("en-IN")}/mo.`
        : `Not eligible: gross ₹${Math.round(p.gross).toLocaleString("en-IN")} exceeds ESI threshold ₹${c.esiRules.threshold.toLocaleString("en-IN")}.`,
    });
  }
  out.push({ id: "professionalTax", text: `Professional Tax uses state slabs configured under Payroll Settings. Deducted every month; deposited to state treasury.` });
  if (c.tdsRules?.enabled) out.push({ id: "tds", text: `TDS = tax on annualised taxable income divided by 12. Recomputed each month using declared exemptions.` });
  if (p.deductions.lwf > 0 || p.employerContrib.employerLwf > 0) out.push({ id: "lwf", text: `${p.lwfSource} — state-specific Labour Welfare Fund. Employer contribution is typically 2×–3× employee.` });
  if (p.deductions.loan > 0) out.push({ id: "loan", text: `Loan EMI as per sanctioned repayment plan.` });
  if (p.deductions.advance > 0) out.push({ id: "advance", text: `Salary advance recovery this cycle.` });
  if (c.gratuityRules?.enabled) out.push({ id: "gratuity", text: `Gratuity accrual = Basic × ${c.gratuityRules.numerator}/${c.gratuityRules.denominator} ÷ 12 (Payment of Gratuity Act 1972; payable on 5 yrs service).` });

  out.push({ id: "net", text: `Net Pay = Gross ₹${Math.round(p.gross).toLocaleString("en-IN")} − Total Deductions ₹${Math.round(p.totalDeductions).toLocaleString("en-IN")}. Employer cost adds ₹${Math.round(p.totalEmployer).toLocaleString("en-IN")}/mo making CTC ₹${Math.round(p.annualCTC).toLocaleString("en-IN")}/yr.` });
  return out;
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Math.round(n)
  );
