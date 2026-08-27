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
  const paidDays = Math.max(0, inputs.daysWorked !== undefined ? inputs.daysWorked : wd);
  const prorateFactor = wd > 0 ? paidDays / wd : 1;

  // The employee's monthly fixed gross salary (e.g. ₹25,000 or ₹30,000)
  const fixedGross = e.basic || 30000;
  const hourly = fixedGross / (wd * (c.workingHoursPerDay || 8));

  // 1. Resolve Salary Structure Components according to Company Master & Toggles
  const basicPct = c.basicPct ?? 20;
  const monthlyBasic = Math.round(fixedGross * (basicPct / 100));
  const earnedBasic = Math.round(monthlyBasic * prorateFactor);

  const earningsList: { id: string; name: string; amount: number; c: EarningComponent }[] = [];

  // 1. Basic (Always active)
  earningsList.push({
    id: "basic",
    name: "Basic Pay",
    amount: earnedBasic,
    c: { id: "basic", name: "Basic Pay", formula: "pctOfBasic", value: 100, prorate: true, taxable: true, includeInPf: true, includeInEsi: true, includeInGratuity: true },
  });

  // 2. DA (Dearness Allowance - if enabled)
  let earnedDA = 0;
  if (c.daEnabled !== false) {
    const daPct = c.daPct ?? 13.33;
    const monthlyDA = Math.round(fixedGross * (daPct / 100));
    earnedDA = Math.round(monthlyDA * prorateFactor);
    earningsList.push({
      id: "da",
      name: "Dearness Allowance (DA)",
      amount: earnedDA,
      c: { id: "da", name: "Dearness Allowance (DA)", formula: "pctOfBasic", value: daPct, prorate: true, taxable: true, includeInPf: true, includeInEsi: true, includeInGratuity: true },
    });
  }

  // 3. HRA (House Rent Allowance - if enabled)
  let earnedHRA = 0;
  if (c.hraEnabled !== false) {
    const hraPct = c.hraPct ?? 16.67;
    const monthlyHRA = Math.round(fixedGross * (hraPct / 100));
    earnedHRA = Math.round(monthlyHRA * prorateFactor);
    earningsList.push({
      id: "hra",
      name: "House Rent Allowance (HRA)",
      amount: earnedHRA,
      c: { id: "hra", name: "House Rent Allowance (HRA)", formula: "pctOfBasic", value: hraPct, prorate: true, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  // 4. OA (Other Allowance - if enabled)
  let earnedOA = 0;
  if (c.oaEnabled !== false) {
    const oaPct = c.oaPct ?? 16.67;
    const monthlyOA = Math.round(fixedGross * (oaPct / 100));
    earnedOA = Math.round(monthlyOA * prorateFactor);
    earningsList.push({
      id: "oa",
      name: "Other Allowance (OA)",
      amount: earnedOA,
      c: { id: "oa", name: "Other Allowance (OA)", formula: "pctOfBasic", value: oaPct, prorate: true, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  // 5. CA (Conveyance Allowance - if enabled)
  let earnedCA = 0;
  if (c.caEnabled !== false) {
    const caPct = c.caPct ?? 16.67;
    const monthlyCA = Math.round(fixedGross * (caPct / 100));
    earnedCA = Math.round(monthlyCA * prorateFactor);
    earningsList.push({
      id: "ca",
      name: "Conveyance Allowance (CA)",
      amount: earnedCA,
      c: { id: "ca", name: "Conveyance Allowance (CA)", formula: "pctOfBasic", value: caPct, prorate: true, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  // 6. LTA (Leave Travel Allowance - if enabled)
  let earnedLTA = 0;
  if (c.ltaEnabled !== false) {
    const ltaPct = c.ltaPct ?? 16.67;
    const monthlyLTA = Math.round(fixedGross * (ltaPct / 100));
    earnedLTA = Math.round(monthlyLTA * prorateFactor);
    earningsList.push({
      id: "lta",
      name: "Leave Travel Allowance (LTA)",
      amount: earnedLTA,
      c: { id: "lta", name: "Leave Travel Allowance (LTA)", formula: "pctOfBasic", value: ltaPct, prorate: true, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  // 7. Custom Configurable Allowances
  const customEarnings = (c.earnings || []).filter(
    (item) => !["basic", "da", "hra", "oa", "ca", "lta", "ot", "shift", "incentive", "bonus", "arrears"].includes(item.id)
  );

  for (const comp of customEarnings) {
    if ((comp as any).enabled === false) continue;
    let monthlyVal = 0;
    if (comp.formula === "pctOfBasic") {
      monthlyVal = Math.round(monthlyBasic * (comp.value / 100));
    } else if ((comp as any).formula === "pctOfGross") {
      monthlyVal = Math.round(fixedGross * (comp.value / 100));
    } else {
      monthlyVal = comp.value || 0;
    }
    const earnedVal = comp.prorate ? Math.round(monthlyVal * prorateFactor) : monthlyVal;
    if (earnedVal > 0) {
      earningsList.push({
        id: comp.id,
        name: comp.name,
        amount: earnedVal,
        c: comp,
      });
    }
  }

  // 8. Overtime Pay
  const otHours = inputs.otHours || 0;
  const otMultiplier = c.otMultiplier || 2;
  const otPay = otHours > 0 ? Math.round(hourly * otHours * otMultiplier) : 0;
  if (otPay > 0) {
    earningsList.push({
      id: "overtime",
      name: "Overtime Pay (OT)",
      amount: otPay,
      c: { id: "overtime", name: "Overtime Pay (OT)", formula: "perOtHour", value: otMultiplier, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  // 9. Shift / Night Allowance
  if ((inputs.nightHours || 0) > 0) {
    const nightAmt = Math.round(hourly * (inputs.nightHours || 0) * 1.15);
    earningsList.push({
      id: "night",
      name: "Night Shift Allowance",
      amount: nightAmt,
      c: { id: "night", name: "Night Shift Allowance", formula: "perNightHour", value: 1.15, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  // 10. Performance Incentive & Variable Pay
  if ((inputs.incentive || 0) > 0) {
    earningsList.push({
      id: "incentive",
      name: "Performance Incentive",
      amount: inputs.incentive || 0,
      c: { id: "incentive", name: "Performance Incentive", formula: "input", value: 0, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }
  if ((inputs.variablePay || 0) > 0) {
    earningsList.push({
      id: "variablePay",
      name: "Variable Pay / Commission",
      amount: inputs.variablePay || 0,
      c: { id: "variablePay", name: "Variable Pay", formula: "input", value: 0, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }
  if ((inputs.otherEarnings || 0) > 0) {
    earningsList.push({
      id: "otherEarnings",
      name: "Other Earnings",
      amount: inputs.otherEarnings || 0,
      c: { id: "otherEarnings", name: "Other Earnings", formula: "input", value: 0, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  // 11. Attendance & Yearly Bonuses
  if ((inputs.bonus || 0) > 0) {
    earningsList.push({
      id: "bonus",
      name: "Attendance & Performance Bonus",
      amount: inputs.bonus || 0,
      c: { id: "bonus", name: "Bonus", formula: "input", value: 0, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    });
  }

  // TOTAL GROSS EARNINGS (Earned for this month based on days present)
  const gross = earningsList.reduce((sum, item) => sum + item.amount, 0);

  // =========================================================================
  // STATUTORY DEDUCTIONS
  // =========================================================================

  // 1. Provident Fund (EPF Act 1952)
  // PF Wage = Earned Basic + Earned DA
  const pfRules = c.pfRules;
  const pfEnabled = pfRules?.enabled !== false;
  let employeePF = 0;
  let employerPF = 0;
  let eps = 0;
  let epfEmployer = 0;
  let edli = 0;
  let pfAdmin = 0;

  const pfBaseRaw = earnedBasic + earnedDA;
  const PF_CEILING = pfRules?.ceiling && pfRules.ceiling > 0 ? pfRules.ceiling : 15000;
  const proratedCeiling = Math.round(PF_CEILING * prorateFactor);
  const pfBase = Math.min(pfBaseRaw, proratedCeiling > 0 ? proratedCeiling : PF_CEILING);

  if (pfEnabled && pfBase > 0) {
    const empPct = pfRules?.employeePct ?? c.employeePfPct ?? 12;
    const emplyrPct = pfRules?.employerPct ?? c.employerPfPct ?? 13;

    employeePF = Math.round(pfBase * (empPct / 100));
    employerPF = Math.round(pfBase * (emplyrPct / 100));

    // EPS diversion: 8.33%
    eps = Math.round(pfBase * 0.0833);
    epfEmployer = Math.max(0, employerPF - eps);
    edli = Math.round(pfBase * 0.005);
    pfAdmin = Math.round(pfBase * 0.005);
  }

  // 2. Employee State Insurance (ESI Act 1948)
  // ESI Wage = Gross Earned (ceiling ₹21,000 monthly gross)
  const esiRules = c.esiRules;
  const esiEnabled = esiRules?.enabled !== false;
  let employeeESI = 0;
  let employerESI = 0;
  let esiEligible = false;

  if (esiEnabled && gross > 0) {
    const esiThreshold = esiRules?.threshold ?? c.esiThreshold ?? 21000;
    esiEligible = fixedGross <= esiThreshold || (esiRules as any)?.applyToAll;

    if (esiEligible) {
      const empEsiPct = esiRules?.employeePct ?? c.employeeEsiPct ?? 0.75;
      const emplyrEsiPct = esiRules?.employerPct ?? c.employerEsiPct ?? 3.25;

      employeeESI = Math.round(gross * (empEsiPct / 100));
      employerESI = Math.round(gross * (emplyrEsiPct / 100));
    }
  }

  // 3. Professional Tax (PT)
  let professionalTax = 0;
  if (c.ptEnabled !== false && gross > 0) {
    if (c.ptSlabs && c.ptSlabs.length > 0) {
      professionalTax = ptFromSlabs(gross, c.ptSlabs);
    } else {
      professionalTax = c.ptAmount ?? 208;
    }
  }

  // 4. Labour Welfare Fund (LWF)
  const lwfInfo = resolveLwf(c, e);
  const lwf = (lwfInfo.enabled && gross > 0) ? lwfInfo.employee : 0;
  const employerLwf = (lwfInfo.enabled && gross > 0) ? lwfInfo.employer : 0;

  // 5. TDS (Tax Deducted at Source)
  const taxableAnnual = gross * 12;
  const tds = c.tdsRules?.enabled ? Math.round(tdsFromSlabs(taxableAnnual, c.tdsSlabs || []) / 12) : 0;

  // 6. Loans, Advance & Other Ad-hoc Deductions
  const loan = inputs.loan || 0;
  const advance = inputs.advance || 0;
  const otherDeductions = inputs.otherDeductions || 0;

  const extraDeductionsList: { id: string; name: string; amount: number }[] = [];

  // Loss of Pay (LOP) — explicit deduction when employee has absent days.
  // The prorateFactor already reduces gross; LOP shows the amount lost as a visible line item.
  // lopBasis: "basic" → deduct only from basic+DA; "gross" → deduct from full gross.
  const absentDays = Math.max(0, wd - paidDays);
  let lopAmount = 0;
  if (absentDays > 0) {
    const dailyRate = c.lopBasis === "gross"
      ? fixedGross / wd
      : (monthlyBasic + (c.daEnabled !== false ? Math.round(fixedGross * ((c.daPct ?? 13.33) / 100)) : 0)) / wd;
    lopAmount = Math.round(dailyRate * absentDays);
    if (lopAmount > 0) {
      extraDeductionsList.push({ id: "lop", name: `Loss of Pay (${absentDays} day${absentDays !== 1 ? "s" : ""} absent)`, amount: lopAmount });
    }
  }
  if (otherDeductions > 0) {
    extraDeductionsList.push({ id: "otherDeductions", name: "Other Deductions", amount: otherDeductions });
  }

  // Configured extra deductions
  const effectiveDeductions = c.deductions || [];
  for (const d of effectiveDeductions) {
    const amt = evalDeduction(d, { gross, basic: earnedBasic, inputs, pfBase, net: 0 });
    if (amt > 0) {
      extraDeductionsList.push({ id: d.id, name: d.name, amount: amt });
    }
  }

  const deductions = {
    employeePF,
    employeeESI,
    professionalTax,
    tds,
    lwf,
    loan,
    advance,
  };

  const totalDeductions =
    employeePF +
    employeeESI +
    professionalTax +
    tds +
    lwf +
    loan +
    advance +
    extraDeductionsList.reduce((sum, item) => sum + item.amount, 0);

  // NET SALARY PAYABLE IN-HAND
  const net = Math.max(0, gross - totalDeductions);

  // Gratuity & Cost to Company (CTC)
  const gratuity = c.gratuityRules?.enabled
    ? Math.round((earnedBasic + earnedDA) * ((c.gratuityRules.numerator || 15) / (c.gratuityRules.denominator || 26)) / 12)
    : 0;

  const employerContrib = { employerPF, employerESI, employerLwf, gratuity, eps, epfEmployer, edli, pfAdmin };
  const totalEmployer = employerPF + employerESI + employerLwf + gratuity + edli + pfAdmin;
  const monthlyCTC = gross + totalEmployer;
  const annualCTC = monthlyCTC * 12;

  // Legacy earnings map for old UI compatibility
  const earnings = {
    basic: earnedBasic,
    hra: earnedHRA,
    special: earnedOA,
    medical: 0,
    conveyance: earnedCA,
    washing: 0,
    other: earnedLTA,
    bonus: inputs.bonus || 0,
    incentive: inputs.incentive || 0,
    overtime: otPay,
    shiftAllowance: 0,
    night: 0,
    variablePay: inputs.variablePay || 0,
  };

  // Resolve structure & age
  const structure = resolveSalaryStructure(c, e);
  const age = e.dob ? Math.floor((Date.now() - new Date(e.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : undefined;

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
    esiBase: gross,
    esiEligible,
    totalDeductions,
    net,
    totalEmployer,
    monthlyCTC,
    annualCTC,
    daysWorked: paidDays,
    prorateFactor,
    fixedGross,
    structureId: structure?.id,
    structureName: structure?.name,
    lwfSource: lwfInfo.source,
    age,
    epsEligible: eps > 0,
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
  const lopEntry = p.extraDeductions.find((d) => d.id === "lop");
  if (lopEntry) out.push({ id: "lop", text: `Loss of Pay (LOP): ${lopEntry.name.match(/\d+/)?.[0] || ""} absent day(s) × daily rate. Computed on ${c.lopBasis === "gross" ? "gross salary" : "Basic + DA"} basis per company settings.` });
  if (c.gratuityRules?.enabled) out.push({ id: "gratuity", text: `Gratuity accrual = Basic × ${c.gratuityRules.numerator}/${c.gratuityRules.denominator} ÷ 12 (Payment of Gratuity Act 1972; payable on 5 yrs service).` });

  out.push({ id: "net", text: `Net Pay = Gross ₹${Math.round(p.gross).toLocaleString("en-IN")} − Total Deductions ₹${Math.round(p.totalDeductions).toLocaleString("en-IN")}. Employer cost adds ₹${Math.round(p.totalEmployer).toLocaleString("en-IN")}/mo making CTC ₹${Math.round(p.annualCTC).toLocaleString("en-IN")}/yr.` });
  return out;
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Math.round(n)
  );
