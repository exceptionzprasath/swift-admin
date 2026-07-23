import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-Dj1aT4sf.js
var listeners = /* @__PURE__ */ new Set();
function onCompliance(l) {
	listeners.add(l);
	return () => listeners.delete(l);
}
function emitCompliance(event, payload) {
	for (const l of listeners) try {
		l(event, payload);
	} catch {}
}
var useAuth = create((set, get) => ({
	user: null,
	loading: true,
	isSuperAdmin: false,
	memberships: [],
	activeTenantId: null,
	setActiveTenant: (id) => {
		localStorage.setItem("swift-active-tenant", id);
		set({ activeTenantId: id });
	},
	signIn: async (email, role, password) => {
		if (role === "super_admin" || email.startsWith("super")) {
			const user = {
				id: crypto.randomUUID(),
				email
			};
			localStorage.setItem("swift-auth-user", JSON.stringify(user));
			localStorage.setItem("swift-auth-role", "super_admin");
			localStorage.setItem("swift-auth-memberships", JSON.stringify([]));
			set({
				user,
				isSuperAdmin: true,
				memberships: [],
				activeTenantId: null,
				loading: false
			});
			return;
		}
		const API_URL = "http://localhost:5000".replace(/\/+$/, "");
		const res = await fetch(`${API_URL}/api/companies/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email,
				password
			})
		});
		if (!res.ok) {
			const errData = await res.json();
			throw new Error(errData.error || "Invalid credentials");
		}
		const { user, memberships } = await res.json();
		localStorage.setItem("swift-auth-user", JSON.stringify(user));
		localStorage.setItem("swift-auth-role", "user");
		localStorage.setItem("swift-auth-memberships", JSON.stringify(memberships));
		const activeTenantId = memberships[0]?.tenant_id ?? null;
		if (activeTenantId) localStorage.setItem("swift-active-tenant", activeTenantId);
		set({
			user,
			isSuperAdmin: false,
			memberships,
			activeTenantId,
			loading: false
		});
	},
	signUp: async (email) => {
		await get().signIn(email, "admin");
	},
	refresh: async () => {
		const userStr = localStorage.getItem("swift-auth-user");
		if (!userStr) {
			set({
				user: null,
				isSuperAdmin: false,
				memberships: [],
				activeTenantId: null,
				loading: false
			});
			return;
		}
		const user = JSON.parse(userStr);
		const isSuperAdmin = localStorage.getItem("swift-auth-role") === "super_admin";
		const memsStr = localStorage.getItem("swift-auth-memberships");
		const memberships = memsStr ? JSON.parse(memsStr) : [];
		const saved = localStorage.getItem("swift-active-tenant");
		set({
			user,
			isSuperAdmin,
			memberships,
			activeTenantId: memberships.find((m) => m.tenant_id === saved)?.tenant_id ?? memberships[0]?.tenant_id ?? null,
			loading: false
		});
	},
	signOut: async () => {
		localStorage.removeItem("swift-auth-user");
		localStorage.removeItem("swift-auth-role");
		localStorage.removeItem("swift-auth-memberships");
		localStorage.removeItem("swift-active-tenant");
		set({
			user: null,
			isSuperAdmin: false,
			memberships: [],
			activeTenantId: null
		});
	}
}));
if (typeof window !== "undefined") useAuth.getState().refresh();
var asNum = (v) => typeof v === "number" && !isNaN(v) ? v : 0;
/** Resolve the best matching salary structure for an employee (highest priority match wins). */
function resolveSalaryStructure(company, employee) {
	const list = company.salaryStructures || [];
	if (list.length === 0) return void 0;
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
function evalEarning(c, ctx) {
	const { company, employee, proratedBasic, inputs, hourly } = ctx;
	const prorateFactor = c.prorate ? inputs.daysWorked / company.workingDaysPerMonth : 1;
	switch (c.formula) {
		case "pctOfBasic": return proratedBasic * (c.value / 100);
		case "flatMonthly": return c.value * prorateFactor;
		case "perDay": return c.value * inputs.daysWorked;
		case "perShiftDay": return c.value * inputs.shiftDays;
		case "perOtHour": return hourly * inputs.otHours * (c.value || company.otMultiplier);
		case "perNightHour": return hourly * (inputs.nightHours || 0) * (c.value || 1.15);
		case "input": return asNum({
			incentive: inputs.incentive,
			bonus: inputs.bonus,
			arrears: inputs.arrears || 0,
			reimbursement: inputs.reimbursement || 0,
			variablePay: inputs.variablePay || 0,
			otherEarnings: inputs.otherEarnings || 0
		}[c.inputKey || c.id]);
		case "pctOfCtc": return (employee.basic || 0) * (c.value / 100) * prorateFactor;
		default: return 0;
	}
}
function evalDeduction(d, ctx) {
	const { gross, basic, inputs, pfBase } = ctx;
	switch (d.formula) {
		case "flat": return d.value;
		case "pctOfGross": return gross * (d.value / 100);
		case "pctOfBasic": return basic * (d.value / 100);
		case "pctOfPfBase": return pfBase * (d.value / 100);
		case "input": return asNum({
			loan: inputs.loan,
			advance: inputs.advance,
			otherDeductions: inputs.otherDeductions || 0
		}[d.inputKey || d.id]);
		default: return 0;
	}
}
function ptFromSlabs(gross, slabs) {
	if (!slabs || slabs.length === 0) return 0;
	const sorted = [...slabs].sort((a, b) => a.upTo - b.upTo);
	for (const s of sorted) if (gross <= s.upTo) return s.amount;
	return sorted[sorted.length - 1].amount;
}
function tdsFromSlabs(annualTaxable, slabs) {
	if (!slabs || slabs.length === 0) return 0;
	const sorted = [...slabs].sort((a, b) => a.upTo - b.upTo);
	let tax = 0;
	let prev = 0;
	for (const s of sorted) if (annualTaxable > s.upTo) {
		tax += (s.upTo - prev) * (s.pct / 100);
		prev = s.upTo;
	} else {
		tax += (annualTaxable - prev) * (s.pct / 100);
		return Math.max(0, tax);
	}
	tax += (annualTaxable - prev) * (sorted[sorted.length - 1].pct / 100);
	return Math.max(0, tax);
}
/** State-wise LWF resolver — branch state wins, falls back to company lwfRules. */
function resolveLwf(company, employee) {
	const state = (company.branches || []).find((b) => b.id === employee.branchId)?.state;
	if (state && company.lwfByState) {
		const hit = company.lwfByState.find((r) => r.state.toLowerCase() === state.toLowerCase());
		if (hit) return {
			enabled: true,
			employee: hit.employeeAmount,
			employer: hit.employerAmount,
			source: `LWF (${state})`
		};
	}
	if (company.lwfRules?.enabled) return {
		enabled: true,
		employee: company.lwfRules.employeeAmount,
		employer: company.lwfRules.employerAmount,
		source: "LWF (default)"
	};
	return {
		enabled: false,
		employee: 0,
		employer: 0,
		source: "LWF"
	};
}
function computePayroll(opts) {
	const { company: c, employee: e, ...inputs } = opts;
	const wd = c.workingDaysPerMonth || 26;
	const proratedBasic = e.basic * inputs.daysWorked / wd;
	const hourly = e.basic / (wd * (c.workingHoursPerDay || 8));
	const structure = resolveSalaryStructure(c, e);
	const effectiveEarnings = structure?.earnings ?? c.earnings ?? [];
	const effectiveDeductions = structure?.deductions ?? c.deductions ?? [];
	const earningsList = [];
	earningsList.push({
		id: "basic",
		name: "Basic",
		amount: proratedBasic,
		c: {
			id: "basic",
			name: "Basic",
			formula: "pctOfBasic",
			value: 100,
			prorate: true,
			taxable: true,
			includeInPf: true,
			includeInEsi: true,
			includeInGratuity: true
		}
	});
	for (const comp of effectiveEarnings) {
		const amt = evalEarning(comp, {
			company: c,
			employee: e,
			proratedBasic,
			inputs,
			hourly
		});
		earningsList.push({
			id: comp.id,
			name: comp.name,
			amount: amt,
			c: comp
		});
	}
	const ensure = (id, name, amount, opts) => {
		if (amount <= 0) return;
		if (earningsList.some((x) => x.id === id)) return;
		earningsList.push({
			id,
			name,
			amount,
			c: {
				id,
				name,
				formula: "input",
				value: 0,
				prorate: false,
				taxable: opts?.taxable ?? true,
				includeInPf: opts?.includeInPf ?? false,
				includeInEsi: opts?.includeInEsi ?? true,
				includeInGratuity: false,
				inputKey: id
			}
		});
	};
	ensure("variablePay", "Variable Pay", inputs.variablePay || 0);
	ensure("otherEarnings", "Other Earnings", inputs.otherEarnings || 0);
	ensure("reimbursement", "Reimbursements", inputs.reimbursement || 0, {
		taxable: false,
		includeInEsi: false
	});
	if ((inputs.nightHours || 0) > 0 && !earningsList.some((x) => /night/i.test(x.name))) {
		const nightAmt = hourly * (inputs.nightHours || 0) * 1.15;
		earningsList.push({
			id: "night",
			name: "Night Allowance",
			amount: nightAmt,
			c: {
				id: "night",
				name: "Night Allowance",
				formula: "perNightHour",
				value: 1.15,
				prorate: false,
				taxable: true,
				includeInPf: false,
				includeInEsi: true,
				includeInGratuity: false
			}
		});
	}
	const gross = earningsList.reduce((a, b) => a + b.amount, 0);
	const pfRules = c.pfRules;
	let pfBaseRaw = earningsList.filter((x) => x.c.includeInPf).reduce((a, b) => a + b.amount, 0);
	const PF_CEILING = pfRules?.ceiling && pfRules.ceiling > 0 ? pfRules.ceiling : 15e3;
	let pfBase = pfBaseRaw;
	if (pfRules?.ceiling && pfRules.ceiling > 0) pfBase = Math.min(pfBase, pfRules.ceiling);
	const employeePF = pfRules?.enabled ? pfBase * ((pfRules.employeePct ?? c.employeePfPct) / 100) : 0;
	const employerPFTotal = pfRules?.enabled ? pfBase * ((pfRules.employerPct ?? c.employerPfPct) / 100) : 0;
	const age = e.dob ? Math.floor((Date.now() - new Date(e.dob).getTime()) / (365.25 * 24 * 3600 * 1e3)) : void 0;
	const epsEligible = pfRules?.enabled && (age === void 0 || age < 58);
	const eps = epsEligible ? Math.min(pfBase, 15e3) * .0833 : 0;
	const epfEmployer = Math.max(0, employerPFTotal - eps);
	const edli = pfRules?.enabled ? Math.min(pfBase, 15e3) * .005 : 0;
	const pfAdmin = pfRules?.enabled ? pfBase * .005 : 0;
	const employerPF = employerPFTotal;
	const esiRules = c.esiRules;
	const esiBase = earningsList.filter((x) => x.c.includeInEsi).reduce((a, b) => a + b.amount, 0);
	const esiEligible = !!(esiRules?.enabled && gross <= (esiRules.threshold ?? c.esiThreshold));
	const employeeESI = esiEligible ? esiBase * ((esiRules.employeePct ?? c.employeeEsiPct) / 100) : 0;
	const employerESI = esiEligible ? esiBase * ((esiRules.employerPct ?? c.employerEsiPct) / 100) : 0;
	const pt = c.ptSlabs && c.ptSlabs.length > 0 ? ptFromSlabs(gross, c.ptSlabs) : c.ptAmount;
	const taxableAnnual = earningsList.filter((x) => x.c.taxable).reduce((a, b) => a + b.amount, 0) * 12;
	const tdsMonthly = c.tdsRules?.enabled ? tdsFromSlabs(taxableAnnual, c.tdsSlabs || []) / 12 : 0;
	const lwfInfo = resolveLwf(c, e);
	const lwf = lwfInfo.employee;
	const employerLwf = lwfInfo.employer;
	const extraDeductionsList = [];
	for (const d of effectiveDeductions) {
		const amt = evalDeduction(d, {
			gross,
			basic: proratedBasic,
			inputs,
			pfBase,
			net: 0
		});
		extraDeductionsList.push({
			id: d.id,
			name: d.name,
			amount: amt
		});
	}
	if ((inputs.otherDeductions || 0) > 0 && !extraDeductionsList.some((x) => x.id === "otherDeductions")) extraDeductionsList.push({
		id: "otherDeductions",
		name: "Other Deductions",
		amount: inputs.otherDeductions || 0
	});
	const baseDeductions = {
		employeePF,
		employeeESI,
		professionalTax: pt,
		tds: tdsMonthly,
		lwf,
		loan: inputs.loan,
		advance: inputs.advance
	};
	const totalExtras = extraDeductionsList.reduce((a, b) => a + b.amount, 0);
	const totalDeductions = Object.values(baseDeductions).reduce((a, b) => a + b, 0) + totalExtras;
	const net = gross - totalDeductions;
	const gRules = c.gratuityRules;
	const gratuityBase = gRules?.enabled ? earningsList.filter((x) => x.c.includeInGratuity).reduce((a, b) => a + b.amount, 0) : 0;
	const gratuity = gRules?.enabled ? gratuityBase * ((gRules.numerator || 15) / (gRules.denominator || 26)) / 12 : 0;
	const employerContrib = {
		employerPF,
		employerESI,
		employerLwf,
		gratuity,
		eps,
		epfEmployer,
		edli,
		pfAdmin
	};
	const totalEmployer = employerPF + employerESI + employerLwf + gratuity + edli + pfAdmin;
	const monthlyCTC = gross + totalEmployer;
	const annualCTC = monthlyCTC * 12;
	const findAmt = (name) => earningsList.find((x) => name.test(x.name))?.amount || 0;
	return {
		earnings: {
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
			variablePay: findAmt(/Variable/i) || inputs.variablePay || 0
		},
		deductions: baseDeductions,
		extraDeductions: extraDeductionsList,
		earningsList: earningsList.map(({ id, name, amount }) => ({
			id,
			name,
			amount
		})),
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
		epsEligible
	};
}
/** HR-facing plain-English explanation of every line item — feeds SWIFT AI Copilot and the payslip footer. */
function explainPayroll(company, employee, p) {
	const c = company;
	const out = [];
	const wd = c.workingDaysPerMonth || 26;
	out.push({
		id: "basic",
		text: `Basic = ₹${Math.round(employee.basic).toLocaleString("en-IN")} × days worked ÷ ${wd} working days.`
	});
	for (const row of p.earningsList) {
		if (row.id === "basic") continue;
		if (/hra/i.test(row.name)) out.push({
			id: row.id,
			text: `HRA is computed as a % of basic per company policy. Metro cities can claim up to 50%, non-metro up to 40% for tax exemption.`
		});
		else if (/special/i.test(row.name)) out.push({
			id: row.id,
			text: `Special Allowance balances CTC to target and is fully taxable.`
		});
		else if (/medical/i.test(row.name)) out.push({
			id: row.id,
			text: `Medical Allowance is a flat monthly component; post-2018 it is fully taxable (standard deduction replaced it).`
		});
		else if (/conveyance/i.test(row.name)) out.push({
			id: row.id,
			text: `Conveyance is paid for travel to work; fully taxable post-2018.`
		});
		else if (/overtime|OT/i.test(row.name)) out.push({
			id: row.id,
			text: `OT = hourly rate × OT hours × ${c.otMultiplier}× multiplier (Factories Act: 2× for factory workers).`
		});
		else if (/night/i.test(row.name)) out.push({
			id: row.id,
			text: `Night Allowance covers night-shift hours; taxable, generally excluded from PF, included in ESI base.`
		});
		else if (/shift/i.test(row.name)) out.push({
			id: row.id,
			text: `Shift Allowance is paid per shift day worked.`
		});
		else if (/bonus/i.test(row.name)) out.push({
			id: row.id,
			text: `Bonus per Payment of Bonus Act — 8.33% to 20% of Basic+DA, statutory min applies where Basic ≤ ₹21,000.`
		});
		else if (/incentive/i.test(row.name)) out.push({
			id: row.id,
			text: `Incentive is variable performance pay; taxable, included in ESI.`
		});
		else if (/reimburse/i.test(row.name)) out.push({
			id: row.id,
			text: `Reimbursements are against bills; not taxable when supported by receipts.`
		});
		else if (/variable/i.test(row.name)) out.push({
			id: row.id,
			text: `Variable Pay is a quarterly/annual bonus paid pro-rata; fully taxable.`
		});
		else if (/arrears/i.test(row.name)) out.push({
			id: row.id,
			text: `Arrears from prior months added this cycle. Section 89(1) tax relief may apply.`
		});
	}
	if (c.pfRules?.enabled) {
		out.push({
			id: "employeePF",
			text: `Employee PF = ${c.pfRules.employeePct}% of PF base ₹${Math.round(p.pfBase).toLocaleString("en-IN")}${p.pfBaseRaw > p.pfBase ? ` (capped at wage ceiling ₹${c.pfRules.ceiling.toLocaleString("en-IN")} from raw ₹${Math.round(p.pfBaseRaw).toLocaleString("en-IN")})` : ""}. Statutory: EPF Act 1952.`
		});
		out.push({
			id: "employerPF",
			text: `Employer PF = ${c.pfRules.employerPct}% of PF base — includes 8.33% pension diversion (EPS) up to ceiling.`
		});
	}
	if (c.esiRules?.enabled) out.push({
		id: "employeeESI",
		text: p.esiEligible ? `Employee ESI = ${c.esiRules.employeePct}% of ESI base ₹${Math.round(p.esiBase).toLocaleString("en-IN")}. Eligible while gross ≤ ₹${c.esiRules.threshold.toLocaleString("en-IN")}/mo.` : `Not eligible: gross ₹${Math.round(p.gross).toLocaleString("en-IN")} exceeds ESI threshold ₹${c.esiRules.threshold.toLocaleString("en-IN")}.`
	});
	out.push({
		id: "professionalTax",
		text: `Professional Tax uses state slabs configured under Payroll Settings. Deducted every month; deposited to state treasury.`
	});
	if (c.tdsRules?.enabled) out.push({
		id: "tds",
		text: `TDS = tax on annualised taxable income divided by 12. Recomputed each month using declared exemptions.`
	});
	if (p.deductions.lwf > 0 || p.employerContrib.employerLwf > 0) out.push({
		id: "lwf",
		text: `${p.lwfSource} — state-specific Labour Welfare Fund. Employer contribution is typically 2×–3× employee.`
	});
	if (p.deductions.loan > 0) out.push({
		id: "loan",
		text: `Loan EMI as per sanctioned repayment plan.`
	});
	if (p.deductions.advance > 0) out.push({
		id: "advance",
		text: `Salary advance recovery this cycle.`
	});
	if (c.gratuityRules?.enabled) out.push({
		id: "gratuity",
		text: `Gratuity accrual = Basic × ${c.gratuityRules.numerator}/${c.gratuityRules.denominator} ÷ 12 (Payment of Gratuity Act 1972; payable on 5 yrs service).`
	});
	out.push({
		id: "net",
		text: `Net Pay = Gross ₹${Math.round(p.gross).toLocaleString("en-IN")} − Total Deductions ₹${Math.round(p.totalDeductions).toLocaleString("en-IN")}. Employer cost adds ₹${Math.round(p.totalEmployer).toLocaleString("en-IN")}/mo making CTC ₹${Math.round(p.annualCTC).toLocaleString("en-IN")}/yr.`
	});
	return out;
}
var inr = (n) => new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 0
}).format(Math.round(n));
/** Build a hypothetical (company, employee) pair reflecting the proposed revision, without mutating state. */
function projectRevision(company, employee, draft) {
	const { amount, target } = draft;
	const emp = { ...employee };
	let comp = company;
	let added;
	const addFlat = (id, name, opts) => ({
		id,
		name,
		formula: "flatMonthly",
		value: amount,
		prorate: true,
		taxable: true,
		includeInPf: true,
		includeInEsi: true,
		includeInGratuity: false,
		...opts
	});
	switch (target) {
		case "basic":
			emp.basic = Math.max(0, (employee.basic || 0) + amount);
			break;
		case "proportional": {
			const cur = computePayroll({
				company,
				employee,
				daysWorked: company.workingDaysPerMonth,
				otHours: 0,
				incentive: 0,
				shiftDays: 0,
				loan: 0,
				advance: 0,
				bonus: 0
			});
			const ratio = cur.gross > 0 ? (cur.gross + amount) / cur.gross : 1;
			emp.basic = Math.max(0, Math.round((employee.basic || 0) * ratio));
			break;
		}
		case "gross":
			added = addFlat(`rev-gross-${Date.now()}`, "Revision — Gross", {
				includeInPf: true,
				includeInEsi: true
			});
			comp = {
				...company,
				earnings: [...company.earnings || [], added]
			};
			break;
		case "special":
			added = addFlat(`rev-special-${Date.now()}`, "Special Allowance (Revision)", {
				includeInPf: true,
				includeInEsi: true
			});
			comp = {
				...company,
				earnings: [...company.earnings || [], added]
			};
			break;
		case "fixed":
			added = addFlat(`rev-fixed-${Date.now()}`, "Fixed Allowance (Revision)", {
				includeInPf: false,
				includeInEsi: true
			});
			comp = {
				...company,
				earnings: [...company.earnings || [], added]
			};
			break;
		case "performance":
			added = addFlat(`rev-perf-${Date.now()}`, "Performance Allowance (Revision)", {
				includeInPf: false,
				includeInEsi: true
			});
			comp = {
				...company,
				earnings: [...company.earnings || [], added]
			};
			break;
		case "noPfEsi":
			added = addFlat(`rev-npe-${Date.now()}`, "Allowance (No PF/ESI)", {
				includeInPf: false,
				includeInEsi: false,
				taxable: true
			});
			comp = {
				...company,
				earnings: [...company.earnings || [], added]
			};
			break;
		case "ctc":
			added = addFlat(`rev-ctc-${Date.now()}`, "CTC Loading (Revision)", {
				includeInPf: false,
				includeInEsi: false,
				includeInGratuity: false,
				taxable: true
			});
			comp = {
				...company,
				earnings: [...company.earnings || [], added]
			};
			break;
	}
	return {
		company: comp,
		employee: emp,
		addedComponent: added
	};
}
function simulateRevision(company, employee, draft) {
	const baseArgs = {
		daysWorked: company.workingDaysPerMonth,
		otHours: 0,
		incentive: 0,
		shiftDays: 0,
		loan: 0,
		advance: 0,
		bonus: 0
	};
	const before = computePayroll({
		company,
		employee,
		...baseArgs
	});
	const projected = projectRevision(company, employee, draft);
	const after = computePayroll({
		company: projected.company,
		employee: projected.employee,
		...baseArgs
	});
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
		pt: after.deductions.professionalTax - before.deductions.professionalTax
	};
	const threshold = company.esiRules?.threshold ?? 21e3;
	const impacts = {
		pfEligibilityChanged: before.deductions.employeePF > 0 !== after.deductions.employeePF > 0,
		esiEligibilityChanged: before.esiEligible !== after.esiEligible,
		ptSlabChanged: Math.round(before.deductions.professionalTax) !== Math.round(after.deductions.professionalTax),
		crossesEsiThreshold: before.gross <= threshold && after.gross > threshold || before.gross > threshold && after.gross <= threshold
	};
	const recs = [];
	if (impacts.esiEligibilityChanged) recs.push(after.esiEligible ? `Employee will now fall UNDER ESI (gross ₹${Math.round(after.gross)} ≤ threshold ₹${threshold}).` : `Employee will EXIT ESI (gross ₹${Math.round(after.gross)} > threshold ₹${threshold}). ESI deduction stops next contribution period per your configured policy.`);
	else if (impacts.crossesEsiThreshold) recs.push(`This revision crosses the configured ESI threshold — review ESI treatment.`);
	if (impacts.pfEligibilityChanged) recs.push(`PF membership status changes with this revision. Verify UAN linkage and PF policy.`);
	if (Math.abs(diff.employerPF) > .5 || Math.abs(diff.employeePF) > .5) recs.push(`PF contributions will change by ₹${Math.round(diff.employeePF)} (employee) / ₹${Math.round(diff.employerPF)} (employer) per month.`);
	if (impacts.ptSlabChanged) recs.push(`Professional Tax slab changes: ₹${Math.round(before.deductions.professionalTax)} → ₹${Math.round(after.deductions.professionalTax)}.`);
	if (Math.abs(diff.tds) > .5) recs.push(`Monthly TDS projection shifts by ₹${Math.round(diff.tds)} based on your configured slabs.`);
	if (diff.net < 0) recs.push(`Take-home DECREASES by ₹${Math.round(-diff.net)} — likely because the added component increases PF/ESI/PT more than gross.`);
	if (diff.employerCost > 0 && diff.net > 0) {
		const ratio = diff.employerCost / Math.max(1, diff.net);
		if (ratio > 1.5) recs.push(`Employer cost rises ${ratio.toFixed(1)}× the take-home increase. Consider restructuring for a leaner CTC impact.`);
	}
	if (recs.length === 0) recs.push(`No statutory eligibility changes detected. Safe to proceed as configured.`);
	return {
		before,
		after,
		diff,
		impacts,
		recommendations: recs
	};
}
var revisionReasonLabels = {
	increment: "Increment",
	promotion: "Promotion",
	correction: "Correction",
	annual: "Annual Revision",
	retention: "Retention",
	special_allowance: "Special Allowance",
	transfer: "Transfer",
	probation_confirmation: "Probation Confirmation",
	market_correction: "Market Correction",
	other: "Other"
};
var revisionTargetLabels = {
	basic: "Basic Salary only",
	gross: "Gross Salary",
	ctc: "CTC (no statutory impact)",
	special: "Special Allowance",
	fixed: "Fixed Allowance",
	performance: "Performance Allowance",
	noPfEsi: "Without affecting PF & ESI",
	proportional: "Proportional across all components"
};
var DEFAULT_DOC_ASSETS = {
	docNumberPrefix: "SW",
	docNumberFormat: "{PREFIX}/{CODE}/{YYYY}/{SEQ}"
};
var hrOnly = {
	create: ["hr", "admin"],
	read: [
		"employee",
		"manager",
		"hr",
		"admin",
		"director",
		"compliance",
		"auditor"
	],
	edit: ["hr", "admin"],
	approve: ["hr", "director"],
	download: [
		"employee",
		"hr",
		"admin",
		"director"
	]
};
var employeeEditable = {
	create: ["employee", "hr"],
	read: [
		"employee",
		"hr",
		"admin"
	],
	edit: ["employee", "hr"],
	approve: ["hr"],
	download: [
		"employee",
		"hr",
		"admin"
	]
};
function j(seq, code, title, letterKey, opts = {}) {
	return {
		id: `lib-${code}`,
		code,
		title,
		category: "Joining",
		sequence: seq,
		letterKey,
		mandatory: true,
		autoGenerate: !!letterKey,
		approvalRequired: true,
		digitalSignatureRequired: true,
		sealRequired: false,
		confidential: false,
		employeeVisible: true,
		permissions: hrOnly,
		trigger: "on_registration",
		language: "en",
		version: "1.0",
		active: true,
		...opts
	};
}
function buildDefaultLibrary() {
	return [
		j(1, "OFR", "Offer Letter", "offer"),
		j(2, "CAC", "Candidate Acceptance", void 0, {
			autoGenerate: false,
			permissions: employeeEditable
		}),
		j(3, "APT", "Appointment Letter", "appointment"),
		j(4, "JOR", "Joining Report", "joining_report"),
		j(5, "EIF", "Employee Information Form", void 0, {
			autoGenerate: false,
			permissions: employeeEditable
		}),
		j(6, "NDA", "Non-Disclosure Agreement", "nda", {
			sealRequired: true,
			confidential: true
		}),
		j(7, "COC", "Code of Conduct", void 0, {
			autoGenerate: false,
			permissions: employeeEditable
		}),
		j(8, "POL", "Policy Acceptance", void 0, {
			autoGenerate: false,
			permissions: employeeEditable
		}),
		j(9, "PAY", "Payroll Registration", void 0, { autoGenerate: false }),
		j(10, "BNK", "Bank Advice / Form", void 0, {
			autoGenerate: false,
			permissions: employeeEditable
		}),
		j(11, "PFR", "PF Registration (Form 11)", void 0, {
			autoGenerate: false,
			category: "Compliance"
		}),
		j(12, "ESI", "ESI Registration", void 0, {
			autoGenerate: false,
			category: "Compliance"
		}),
		j(13, "AST", "Asset Allocation Form", void 0, {
			category: "Asset",
			autoGenerate: false
		}),
		j(14, "IDC", "Employee ID Card", void 0, {
			category: "HR",
			autoGenerate: false,
			sealRequired: true
		}),
		j(15, "IND", "Induction Schedule", void 0, {
			category: "Training",
			autoGenerate: false
		}),
		j(16, "TRN", "Training Schedule", void 0, {
			category: "Training",
			autoGenerate: false
		}),
		{
			...j(17, "PRO", "Probation Extension", "probation_extension"),
			trigger: "on_probation",
			mandatory: false
		},
		{
			...j(18, "CNF", "Confirmation Letter", "confirmation"),
			trigger: "on_confirmation",
			mandatory: false,
			category: "Confirmation"
		},
		{
			...j(19, "PRM", "Promotion Letter", "promotion"),
			trigger: "on_promotion",
			mandatory: false,
			category: "Movement"
		},
		{
			...j(20, "TRF", "Transfer Letter", "transfer"),
			trigger: "on_transfer",
			mandatory: false,
			category: "Movement"
		},
		{
			...j(21, "INC", "Increment Letter", "increment"),
			trigger: "manual",
			mandatory: false,
			category: "Movement"
		},
		{
			...j(22, "REL", "Relieving Letter", "relieving"),
			trigger: "on_exit",
			mandatory: false,
			category: "Exit"
		},
		{
			...j(23, "EXP", "Experience Certificate", "experience"),
			trigger: "on_exit",
			mandatory: false,
			category: "Exit"
		},
		{
			...j(24, "FNF", "Full & Final Settlement", "full_final"),
			trigger: "on_exit",
			mandatory: false,
			category: "Exit"
		},
		{
			...j(25, "EXC", "Exit Clearance Form", "exit_clearance"),
			trigger: "on_exit",
			mandatory: false,
			category: "Exit"
		}
	];
}
function buildEmployeeJourney(employeeId, library, probationMonths = 6) {
	const steps = library.filter((d) => d.active && d.trigger === "on_registration").sort((a, b) => a.sequence - b.sequence).map((d) => ({
		id: crypto.randomUUID(),
		docId: d.id,
		code: d.code,
		title: d.title,
		status: "pending"
	}));
	return {
		employeeId,
		phase: "onboarding",
		startedAt: (/* @__PURE__ */ new Date()).toISOString(),
		probationMonths,
		steps
	};
}
function journeyProgress(j) {
	if (!j || j.steps.length === 0) return {
		done: 0,
		total: 0,
		pct: 0
	};
	const done = j.steps.filter((s) => [
		"generated",
		"signed",
		"approved",
		"skipped"
	].includes(s.status)).length;
	return {
		done,
		total: j.steps.length,
		pct: Math.round(done / j.steps.length * 100)
	};
}
var LIFECYCLE_QUESTIONS = {
	on_promotion: [
		"Effective date of promotion?",
		"New designation and department?",
		"Should salary revise? By how much?",
		"Reporting manager change?",
		"Should ID card regenerate?"
	],
	on_transfer: [
		"Effective date of transfer?",
		"Destination branch/location?",
		"New reporting manager?",
		"Should attendance / shift rules change?"
	],
	on_confirmation: [
		"Effective confirmation date?",
		"Any salary revision on confirmation?",
		"Update compliance (PF/ESI ceiling)?"
	],
	on_exit: [
		"Last working day?",
		"Notice period served fully?",
		"Assets returned?",
		"Pending advances/loans?"
	]
};
var DEFAULT_ASSET_CATEGORIES = [
	{
		id: "cat-lap",
		name: "Laptop",
		code: "LAP",
		requireReturn: true,
		requireAcknowledgement: true
	},
	{
		id: "cat-phn",
		name: "Mobile Phone",
		code: "PHN",
		requireReturn: true,
		requireAcknowledgement: true
	},
	{
		id: "cat-sim",
		name: "SIM Card",
		code: "SIM",
		requireReturn: true,
		requireAcknowledgement: false
	},
	{
		id: "cat-idc",
		name: "ID Card",
		code: "IDC",
		requireReturn: true,
		requireAcknowledgement: false
	},
	{
		id: "cat-acc",
		name: "Access Card",
		code: "ACC",
		requireReturn: true,
		requireAcknowledgement: false
	},
	{
		id: "cat-uni",
		name: "Uniform",
		code: "UNI",
		requireReturn: false,
		requireAcknowledgement: false
	},
	{
		id: "cat-veh",
		name: "Vehicle",
		code: "VEH",
		requireReturn: true,
		requireAcknowledgement: true
	},
	{
		id: "cat-tool",
		name: "Tools / Kit",
		code: "TLK",
		requireReturn: true,
		requireAcknowledgement: true
	}
];
var API_URL = "http://localhost:5000".replace(/\/+$/, "");
async function syncItem(table, item) {
	try {
		await fetch(`${API_URL}/api/companies/mutate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				table,
				item
			})
		});
	} catch (err) {
		console.error(`[Sync] Error mutating table ${table}:`, err);
	}
}
async function syncDelete(table, tenantId, id) {
	try {
		await fetch(`${API_URL}/api/companies/delete`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				table,
				tenantId,
				id
			})
		});
	} catch (err) {
		console.error(`[Sync] Error deleting from table ${table}:`, err);
	}
}
async function uploadToS3(tenantId, path, fileDataUrl) {
	if (!fileDataUrl || !fileDataUrl.startsWith("data:")) return fileDataUrl;
	try {
		const res = await fetch(`${API_URL}/api/companies/upload`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				tenantId,
				path,
				fileDataUrl
			})
		});
		if (res.ok) return (await res.json()).url;
	} catch (err) {
		console.error(`[S3] Upload failed for ${path}:`, err);
	}
	return fileDataUrl;
}
var defaultCompany = {
	name: "SWIFT Demo Pvt Ltd",
	legalName: "SWIFT Demo Private Limited",
	address: "123 Business Ave, Suite 100, Bangalore, India",
	gstin: "29ABCDE1234F1Z5",
	workingDaysPerMonth: 26,
	workingHoursPerDay: 8,
	otMultiplier: 2,
	esiThreshold: 21e3,
	employeePfPct: 12,
	employerPfPct: 13,
	employeeEsiPct: .75,
	employerEsiPct: 3.25,
	hraPct: 30,
	specialPct: 10,
	medicalPct: 10,
	conveyancePct: 20,
	washingPct: 10,
	otherPct: 20,
	ptAmount: 200,
	geofence: {
		lat: 12.9716,
		lng: 77.5946,
		radiusM: 150
	},
	leaveTypes: [
		{
			id: "cl",
			name: "Casual Leave",
			days: 12
		},
		{
			id: "sl",
			name: "Sick Leave",
			days: 12
		},
		{
			id: "el",
			name: "Earned Leave",
			days: 15
		}
	],
	shifts: [{
		id: "gen",
		name: "General",
		start: "09:00",
		end: "18:00",
		allowancePerDay: 0
	}, {
		id: "night",
		name: "Night",
		start: "22:00",
		end: "06:00",
		allowancePerDay: 250
	}],
	branches: [{
		id: "br-hq",
		name: "Head Office",
		code: "HQ",
		address: "123 Business Ave",
		city: "Bangalore",
		state: "Karnataka",
		isHead: true,
		lat: 12.9716,
		lng: 77.5946,
		radiusMeters: 150,
		shiftStart: "09:00",
		shiftEnd: "18:00",
		weeklyOff: ["Sun"]
	}],
	appointmentTemplate: `Dear {{name}},

We are pleased to offer you the position of {{designation}} in the {{department}} department at {{company}}, effective {{doj}}.

Your consolidated CTC is INR {{ctc}} per annum, with a monthly gross of INR {{gross}}. Detailed salary breakup is attached.

You will be reporting to the {{department}} team. Your Employee Code is {{empCode}}.

We look forward to a long and mutually rewarding association.

Warm regards,
HR Department
{{company}}`,
	earnings: [
		{
			id: "hra",
			name: "HRA",
			formula: "pctOfBasic",
			value: 30,
			prorate: true,
			taxable: true,
			includeInPf: false,
			includeInEsi: true,
			includeInGratuity: false
		},
		{
			id: "special",
			name: "Special Allowance",
			formula: "pctOfBasic",
			value: 10,
			prorate: true,
			taxable: true,
			includeInPf: true,
			includeInEsi: true,
			includeInGratuity: true
		},
		{
			id: "medical",
			name: "Medical",
			formula: "pctOfBasic",
			value: 10,
			prorate: true,
			taxable: false,
			includeInPf: false,
			includeInEsi: true,
			includeInGratuity: false
		},
		{
			id: "conveyance",
			name: "Conveyance",
			formula: "pctOfBasic",
			value: 20,
			prorate: true,
			taxable: false,
			includeInPf: false,
			includeInEsi: true,
			includeInGratuity: false
		},
		{
			id: "washing",
			name: "Washing",
			formula: "pctOfBasic",
			value: 10,
			prorate: true,
			taxable: false,
			includeInPf: false,
			includeInEsi: true,
			includeInGratuity: false
		},
		{
			id: "other",
			name: "Other Allowance",
			formula: "pctOfBasic",
			value: 20,
			prorate: true,
			taxable: true,
			includeInPf: false,
			includeInEsi: true,
			includeInGratuity: false
		},
		{
			id: "ot",
			name: "Overtime",
			formula: "perOtHour",
			value: 2,
			prorate: false,
			taxable: true,
			includeInPf: false,
			includeInEsi: true,
			includeInGratuity: false
		},
		{
			id: "shift",
			name: "Shift Allowance",
			formula: "perShiftDay",
			value: 250,
			prorate: false,
			taxable: true,
			includeInPf: false,
			includeInEsi: true,
			includeInGratuity: false
		},
		{
			id: "incentive",
			name: "Incentive",
			formula: "input",
			value: 0,
			prorate: false,
			taxable: true,
			includeInPf: false,
			includeInEsi: true,
			includeInGratuity: false,
			inputKey: "incentive"
		},
		{
			id: "bonus",
			name: "Bonus",
			formula: "input",
			value: 0,
			prorate: false,
			taxable: true,
			includeInPf: false,
			includeInEsi: false,
			includeInGratuity: false,
			inputKey: "bonus"
		},
		{
			id: "arrears",
			name: "Arrears",
			formula: "input",
			value: 0,
			prorate: false,
			taxable: true,
			includeInPf: false,
			includeInEsi: false,
			includeInGratuity: false,
			inputKey: "arrears"
		}
	],
	deductions: [],
	pfRules: {
		enabled: true,
		employeePct: 12,
		employerPct: 13,
		ceiling: 15e3
	},
	esiRules: {
		enabled: true,
		employeePct: .75,
		employerPct: 3.25,
		threshold: 21e3
	},
	ptSlabs: [
		{
			upTo: 15e3,
			amount: 0
		},
		{
			upTo: 25e3,
			amount: 150
		},
		{
			upTo: 999999999,
			amount: 200
		}
	],
	tdsRules: { enabled: false },
	tdsSlabs: [
		{
			upTo: 3e5,
			pct: 0
		},
		{
			upTo: 7e5,
			pct: 5
		},
		{
			upTo: 1e6,
			pct: 10
		},
		{
			upTo: 12e5,
			pct: 15
		},
		{
			upTo: 15e5,
			pct: 20
		},
		{
			upTo: 999999999,
			pct: 30
		}
	],
	lwfRules: {
		enabled: false,
		employeeAmount: 10,
		employerAmount: 20,
		frequency: "monthly"
	},
	gratuityRules: {
		enabled: true,
		numerator: 15,
		denominator: 26
	},
	lopBasis: "basic",
	attendanceDefaults: [{
		id: "apd-default",
		name: "Default (All Employees)",
		priority: 0,
		match: {},
		shiftId: "gen",
		weeklyOff: ["Sun"],
		leaveTypeIds: [
			"cl",
			"sl",
			"el"
		],
		geofenceFromBranch: true,
		payrollGroup: "Monthly",
		costCentre: "General",
		holidayCalendar: "India-Standard"
	}]
};
function buildDemoData() {
	const empIds = [
		"demo-emp-1",
		"demo-emp-2",
		"demo-emp-3",
		"demo-emp-4"
	];
	const employees = [
		{
			id: empIds[0],
			empCode: "SWF001",
			password: "demo123",
			name: "Aarav Sharma",
			email: "aarav@demo.swift",
			phone: "+91 98765 43210",
			department: "Engineering",
			designation: "Senior Engineer",
			doj: "2023-04-01",
			basic: 45e3,
			pan: "ABCDE1234F",
			aadhaar: "1234 5678 9012",
			bankAcc: "50100123456789",
			bankIfsc: "HDFC0001234",
			shiftId: "gen",
			faceRegistered: true,
			status: "active",
			managerId: empIds[1],
			about: "Full-stack engineer leading the payroll module. 4 yrs experience with React & Node."
		},
		{
			id: empIds[1],
			empCode: "SWF002",
			password: "demo123",
			name: "Priya Iyer",
			email: "priya@demo.swift",
			phone: "+91 98765 43211",
			department: "HR",
			designation: "HR Manager",
			doj: "2022-08-15",
			basic: 55e3,
			pan: "PQRST5678K",
			aadhaar: "2345 6789 0123",
			bankAcc: "50100987654321",
			bankIfsc: "ICIC0004321",
			shiftId: "gen",
			faceRegistered: true,
			status: "active",
			about: "Head of People. Owns compliance, hiring pipeline, and employee experience."
		},
		{
			id: empIds[2],
			empCode: "SWF003",
			password: "demo123",
			name: "Rahul Verma",
			email: "rahul@demo.swift",
			phone: "+91 98765 43212",
			department: "Sales",
			designation: "Sales Executive",
			doj: "2024-01-10",
			basic: 28e3,
			pan: "LMNOP9012Q",
			aadhaar: "3456 7890 1234",
			bankAcc: "50100555512345",
			bankIfsc: "SBIN0001111",
			shiftId: "gen",
			faceRegistered: true,
			status: "active",
			managerId: empIds[3],
			about: "SMB sales — southern territory. Top performer last quarter."
		},
		{
			id: empIds[3],
			empCode: "SWF004",
			password: "demo123",
			name: "Meera Nair",
			email: "meera@demo.swift",
			phone: "+91 98765 43213",
			department: "Operations",
			designation: "Ops Lead",
			doj: "2023-11-20",
			basic: 38e3,
			pan: "XYZAB3456C",
			aadhaar: "4567 8901 2345",
			bankAcc: "50100444498765",
			bankIfsc: "AXIS0002222",
			shiftId: "night",
			faceRegistered: true,
			status: "active",
			managerId: empIds[1],
			about: "Runs 24×7 ops shift. Coordinates vendor SLAs and night-shift roster."
		}
	];
	const attendance = [];
	const today = /* @__PURE__ */ new Date();
	for (let d = 0; d < 20; d++) {
		const date = new Date(today);
		date.setDate(today.getDate() - d);
		const iso = date.toISOString().slice(0, 10);
		if (date.getDay() === 0) continue;
		employees.forEach((e) => {
			attendance.push({
				id: crypto.randomUUID(),
				employeeId: e.id,
				date: iso,
				checkIn: "09:0" + d % 6,
				checkOut: "18:" + (10 + d % 30),
				hoursWorked: 8,
				otHours: d % 5 === 0 ? 2 : 0,
				status: "present",
				withinGeofence: true
			});
		});
	}
	return {
		employees,
		attendance,
		leaves: [{
			id: crypto.randomUUID(),
			employeeId: empIds[2],
			type: "Casual Leave",
			from: "2026-07-08",
			to: "2026-07-09",
			reason: "Family function",
			status: "pending"
		}, {
			id: crypto.randomUUID(),
			employeeId: empIds[0],
			type: "Sick Leave",
			from: "2026-06-20",
			to: "2026-06-20",
			reason: "Fever",
			status: "approved"
		}]
	};
}
var useStore = create()(persist((set, get) => ({
	company: defaultCompany,
	employees: [],
	attendance: [],
	payrolls: [],
	leaves: [],
	currentUser: null,
	theme: "light",
	demoMode: false,
	demoSuper: false,
	demoTenants: [],
	notices: [],
	docAssets: DEFAULT_DOC_ASSETS,
	docLibrary: buildDefaultLibrary(),
	journeys: [],
	assetCategories: DEFAULT_ASSET_CATEGORIES,
	assets: [],
	assetAssignments: [],
	auditLog: [],
	registrationDrafts: [],
	addAudit: (entry) => {
		const e = {
			...entry,
			id: crypto.randomUUID(),
			ts: (/* @__PURE__ */ new Date()).toISOString()
		};
		set((s) => ({ auditLog: [e, ...s.auditLog].slice(0, 2e3) }));
		return e;
	},
	saveRegistrationDraft: (draft) => {
		const updated = {
			...draft,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		set((s) => {
			const idx = s.registrationDrafts.findIndex((d) => d.id === draft.id);
			const next = [...s.registrationDrafts];
			if (idx >= 0) next[idx] = updated;
			else next.unshift(updated);
			return { registrationDrafts: next.slice(0, 100) };
		});
	},
	deleteRegistrationDraft: (id) => set((s) => ({ registrationDrafts: s.registrationDrafts.filter((d) => d.id !== id) })),
	addAssetCategory: (c) => {
		const cat = {
			...c,
			id: crypto.randomUUID()
		};
		set((s) => ({ assetCategories: [...s.assetCategories, cat] }));
		return cat;
	},
	updateAssetCategory: (id, patch) => set((s) => ({ assetCategories: s.assetCategories.map((c) => c.id === id ? {
		...c,
		...patch
	} : c) })),
	deleteAssetCategory: (id) => set((s) => ({ assetCategories: s.assetCategories.filter((c) => c.id !== id) })),
	addAsset: (a) => {
		const asset = {
			...a,
			id: crypto.randomUUID(),
			status: a.status ?? "available"
		};
		set((s) => ({ assets: [...s.assets, asset] }));
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !get().demoMode) syncItem("assets", {
			tenantId,
			...asset
		});
		return asset;
	},
	updateAsset: (id, patch) => set((s) => {
		const nextAssets = s.assets.map((a) => a.id === id ? {
			...a,
			...patch
		} : a);
		const item = nextAssets.find((a) => a.id === id);
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && item && !s.demoMode) syncItem("assets", {
			tenantId,
			...item
		});
		return { assets: nextAssets };
	}),
	deleteAsset: (id) => set((s) => {
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !s.demoMode) {
			syncDelete("assets", tenantId, id);
			s.assetAssignments.forEach((x) => {
				if (x.assetId === id) syncDelete("assetAssignments", tenantId, x.id);
			});
		}
		return {
			assets: s.assets.filter((a) => a.id !== id),
			assetAssignments: s.assetAssignments.filter((x) => x.assetId !== id)
		};
	}),
	assignAsset: ({ assetId, employeeId, assignedBy, conditionOnAssign, acknowledgementSignatureDataUrl, notes }) => {
		const asset = get().assets.find((a) => a.id === assetId);
		if (!asset || asset.status === "assigned" || asset.status === "retired") return null;
		const assignment = {
			id: crypto.randomUUID(),
			assetId,
			employeeId,
			assignedAt: (/* @__PURE__ */ new Date()).toISOString(),
			assignedBy,
			conditionOnAssign: conditionOnAssign ?? asset.condition,
			acknowledgementSignatureDataUrl,
			notes
		};
		set((s) => ({
			assetAssignments: [assignment, ...s.assetAssignments],
			assets: s.assets.map((a) => a.id === assetId ? {
				...a,
				status: "assigned"
			} : a)
		}));
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !get().demoMode) {
			const runAssignAndSync = async () => {
				let finalSigUrl = acknowledgementSignatureDataUrl;
				if (acknowledgementSignatureDataUrl && acknowledgementSignatureDataUrl.startsWith("data:")) {
					finalSigUrl = await uploadToS3(tenantId, `asset-signatures/${assignment.id}_sig.png`, acknowledgementSignatureDataUrl);
					set((s) => ({ assetAssignments: s.assetAssignments.map((x) => x.id === assignment.id ? {
						...x,
						acknowledgementSignatureDataUrl: finalSigUrl
					} : x) }));
				}
				const updatedAsset = get().assets.find((a) => a.id === assetId);
				if (updatedAsset) syncItem("assets", {
					tenantId,
					...updatedAsset
				});
				syncItem("assetAssignments", {
					tenantId,
					...assignment,
					acknowledgementSignatureDataUrl: finalSigUrl
				});
			};
			runAssignAndSync();
		}
		return assignment;
	},
	returnAsset: (assignmentId, actor, conditionOnReturn, notes) => set((s) => {
		const assn = s.assetAssignments.find((x) => x.id === assignmentId);
		if (!assn || assn.returnedAt) return {};
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const nextAssignments = s.assetAssignments.map((x) => x.id === assignmentId ? {
			...x,
			returnedAt: now,
			returnedBy: actor,
			conditionOnReturn,
			notes: notes ?? x.notes
		} : x);
		const nextAssets = s.assets.map((a) => a.id === assn.assetId ? {
			...a,
			status: "available",
			condition: conditionOnReturn ?? a.condition
		} : a);
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !s.demoMode) {
			const updatedAssn = nextAssignments.find((x) => x.id === assignmentId);
			const updatedAsset = nextAssets.find((a) => a.id === assn.assetId);
			if (updatedAssn) syncItem("assetAssignments", {
				tenantId,
				...updatedAssn
			});
			if (updatedAsset) syncItem("assets", {
				tenantId,
				...updatedAsset
			});
		}
		return {
			assetAssignments: nextAssignments,
			assets: nextAssets
		};
	}),
	setDocAssets: (patch) => set((s) => ({ docAssets: {
		...s.docAssets,
		...patch
	} })),
	addLibraryItem: (item) => {
		const it = {
			...item,
			id: crypto.randomUUID()
		};
		set((s) => ({ docLibrary: [...s.docLibrary, it].sort((a, b) => a.sequence - b.sequence) }));
		return it;
	},
	updateLibraryItem: (id, patch) => set((s) => ({ docLibrary: s.docLibrary.map((d) => d.id === id ? {
		...d,
		...patch
	} : d) })),
	deleteLibraryItem: (id) => set((s) => ({ docLibrary: s.docLibrary.filter((d) => d.id !== id) })),
	reorderLibrary: (ids) => set((s) => {
		const map = new Map(s.docLibrary.map((d) => [d.id, d]));
		return { docLibrary: ids.map((id, i) => ({
			...map.get(id),
			sequence: i + 1
		})).filter(Boolean) };
	}),
	resetLibrary: () => set({ docLibrary: buildDefaultLibrary() }),
	ensureJourney: (employeeId) => {
		const existing = get().journeys.find((j) => j.employeeId === employeeId);
		if (existing) return existing;
		const j = buildEmployeeJourney(employeeId, get().docLibrary);
		set((s) => ({ journeys: [...s.journeys, j] }));
		return j;
	},
	updateJourneyStep: (employeeId, stepId, patch) => set((s) => ({ journeys: s.journeys.map((j) => j.employeeId === employeeId ? {
		...j,
		steps: j.steps.map((st) => st.id === stepId ? {
			...st,
			...patch
		} : st)
	} : j) })),
	advanceJourneyStep: (employeeId, stepId, status, actor) => set((s) => ({ journeys: s.journeys.map((j) => {
		if (j.employeeId !== employeeId) return j;
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const steps = j.steps.map((st) => st.id === stepId ? {
			...st,
			status,
			generatedAt: status === "generated" ? now : st.generatedAt,
			signedAt: status === "signed" ? now : st.signedAt,
			approvedAt: status === "approved" ? now : st.approvedAt,
			approvedBy: status === "approved" ? actor : st.approvedBy
		} : st);
		const allDone = steps.every((st) => [
			"approved",
			"signed",
			"skipped"
		].includes(st.status));
		return {
			...j,
			steps,
			phase: allDone && j.phase === "onboarding" ? "probation" : j.phase
		};
	}) })),
	setJourneyPhase: (employeeId, phase) => set((s) => ({ journeys: s.journeys.map((j) => j.employeeId === employeeId ? {
		...j,
		phase,
		confirmedAt: phase === "confirmed" ? (/* @__PURE__ */ new Date()).toISOString() : j.confirmedAt
	} : j) })),
	autoGenerateAllPending: (employeeId, actor) => {
		const lib = get().docLibrary;
		const j = get().journeys.find((x) => x.employeeId === employeeId);
		if (!j) return 0;
		let count = 0;
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const steps = j.steps.map((st) => {
			const meta = lib.find((d) => d.id === st.docId);
			if (!meta) return st;
			if (st.status !== "pending" || !meta.autoGenerate) return st;
			count++;
			return {
				...st,
				status: "generated",
				generatedAt: now,
				approvedBy: actor
			};
		});
		set((s) => ({ journeys: s.journeys.map((x) => x.employeeId === employeeId ? {
			...x,
			steps
		} : x) }));
		return count;
	},
	addNotice: (n) => {
		const notice = {
			...n,
			id: crypto.randomUUID(),
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			readBy: []
		};
		set((s) => ({ notices: [notice, ...s.notices] }));
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !get().demoMode) syncItem("notices", {
			tenantId,
			...notice
		});
		return notice;
	},
	updateNotice: (id, patch) => set((s) => {
		const nextNotices = s.notices.map((n) => n.id === id ? {
			...n,
			...patch
		} : n);
		const tenantId = useAuth.getState().activeTenantId;
		const item = nextNotices.find((n) => n.id === id);
		if (tenantId && item && !s.demoMode) syncItem("notices", {
			tenantId,
			...item
		});
		return { notices: nextNotices };
	}),
	deleteNotice: (id) => set((s) => {
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !s.demoMode) syncDelete("notices", tenantId, id);
		return { notices: s.notices.filter((n) => n.id !== id) };
	}),
	markNoticeRead: (id, userKey) => set((s) => {
		const nextNotices = s.notices.map((n) => n.id === id && !n.readBy.includes(userKey) ? {
			...n,
			readBy: [...n.readBy, userKey]
		} : n);
		const tenantId = useAuth.getState().activeTenantId;
		const item = nextNotices.find((n) => n.id === id);
		if (tenantId && item && !s.demoMode) syncItem("notices", {
			tenantId,
			...item
		});
		return { notices: nextNotices };
	}),
	addBranch: (b) => {
		const branch = {
			...b,
			id: crypto.randomUUID()
		};
		set((s) => {
			const updatedBranches = [...s.company.branches ?? [], branch];
			const headBranch = updatedBranches.find((x) => x.isHead) || updatedBranches[0];
			const nextGeofence = headBranch && headBranch.lat != null && headBranch.lng != null ? {
				lat: headBranch.lat,
				lng: headBranch.lng,
				radiusM: headBranch.radiusMeters ?? 150
			} : s.company.geofence;
			const nextCompany = {
				...s.company,
				geofence: nextGeofence,
				branches: updatedBranches
			};
			const tenantId = useAuth.getState().activeTenantId;
			if (tenantId && !s.demoMode) syncItem("config", {
				id: "config",
				tenantId,
				...nextCompany
			});
			return { company: nextCompany };
		});
		const btype = String(b.type ?? "branch").toLowerCase();
		emitCompliance(btype === "factory" ? "factory_created" : "branch_created", {
			subject: branch.name ?? "New branch",
			by: "system",
			meta: {
				branchId: branch.id,
				branchType: btype
			}
		});
		return branch;
	},
	updateBranch: (id, patch) => set((s) => {
		const updatedBranches = (s.company.branches ?? []).map((b) => b.id === id ? {
			...b,
			...patch
		} : b);
		const headBranch = updatedBranches.find((x) => x.isHead) || updatedBranches[0];
		const nextGeofence = headBranch && headBranch.lat != null && headBranch.lng != null ? {
			lat: headBranch.lat,
			lng: headBranch.lng,
			radiusM: headBranch.radiusMeters ?? 150
		} : s.company.geofence;
		const nextCompany = {
			...s.company,
			geofence: nextGeofence,
			branches: updatedBranches
		};
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !s.demoMode) syncItem("config", {
			id: "config",
			tenantId,
			...nextCompany
		});
		return { company: nextCompany };
	}),
	deleteBranch: (id) => set((s) => {
		const nextCompany = {
			...s.company,
			branches: (s.company.branches ?? []).filter((b) => b.id !== id)
		};
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !s.demoMode) {
			syncItem("config", {
				id: "config",
				tenantId,
				...nextCompany
			});
			s.employees.forEach((e) => {
				if (e.branchId === id) syncItem("employees", {
					tenantId,
					...e,
					branchId: void 0
				});
			});
		}
		return {
			company: nextCompany,
			employees: s.employees.map((e) => e.branchId === id ? {
				...e,
				branchId: void 0
			} : e)
		};
	}),
	loadCompanyState: async (tenantId) => {
		try {
			const res = await fetch(`${API_URL}/api/companies/initial-state?tenantId=${tenantId}`);
			if (!res.ok) throw new Error("Failed to load initial state");
			const data = await res.json();
			set({
				company: data.config ? {
					...get().company,
					...data.config
				} : get().company,
				employees: data.employees || [],
				attendance: data.attendance || [],
				leaves: data.leaves || [],
				payrolls: data.payrolls || [],
				assets: data.assets || [],
				assetAssignments: data.assignments || [],
				docLibrary: data.docLibrary && data.docLibrary.length ? data.docLibrary : get().docLibrary,
				journeys: data.journeys || [],
				notices: data.notices || [],
				demoMode: false
			});
		} catch (err) {
			console.error("[Store] loadCompanyState failed:", err);
		}
	},
	setTheme: (t) => set({ theme: t }),
	setCompany: (c) => set((s) => {
		const nextCompany = {
			...s.company,
			...c
		};
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !s.demoMode) syncItem("config", {
			id: "config",
			tenantId,
			...nextCompany
		});
		return { company: nextCompany };
	}),
	addEmployee: (e) => {
		const st = get();
		const company = st.company;
		const resolved = resolveAttendanceProfile(e, company);
		const emp = {
			...e,
			id: crypto.randomUUID(),
			shiftId: e.shiftId || resolved.shiftId,
			attendanceProfile: resolved
		};
		set((s) => ({ employees: [...s.employees, emp] }));
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !st.demoMode) {
			const runRegisterAndSync = async () => {
				let finalPhotoUrl = emp.photoDataUrl;
				if (emp.photoDataUrl && emp.photoDataUrl.startsWith("data:")) try {
					const res = await fetch(`${API_URL}/api/companies/face-register`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							tenantId,
							employeeId: emp.id,
							photoDataUrl: emp.photoDataUrl
						})
					});
					if (res.ok) {
						finalPhotoUrl = (await res.json()).url;
						set((s) => ({ employees: s.employees.map((x) => x.id === emp.id ? {
							...x,
							photoDataUrl: finalPhotoUrl,
							faceRegistered: true
						} : x) }));
					}
				} catch (err) {
					console.error("Face registration failed:", err);
				}
				syncItem("employees", {
					tenantId,
					...emp,
					photoDataUrl: finalPhotoUrl,
					faceRegistered: !!finalPhotoUrl && finalPhotoUrl.startsWith("http")
				});
			};
			runRegisterAndSync();
		}
		st.addAudit({
			actorName: st.currentUser?.name ?? "System",
			entity: "employee",
			entityId: emp.id,
			action: "register",
			newValue: {
				empCode: emp.empCode,
				name: emp.name
			}
		});
		emitCompliance("employee_joined", {
			subject: `${emp.name} (${emp.empCode})`,
			by: st.currentUser?.name ?? "System",
			meta: {
				employeeId: emp.id,
				gender: emp.gender,
				branchId: emp.branchId
			}
		});
		if (String(emp.gender ?? "").toLowerCase().startsWith("f")) emitCompliance("women_employee_added", {
			subject: emp.name,
			by: st.currentUser?.name ?? "System",
			meta: { employeeId: emp.id }
		});
		return emp;
	},
	updateEmployee: (id, patch) => {
		const st = get();
		const before = st.employees.find((e) => e.id === id);
		set((s) => ({ employees: s.employees.map((e) => e.id === id ? {
			...e,
			...patch
		} : e) }));
		if (before) {
			const tenantId = useAuth.getState().activeTenantId;
			if (tenantId && !st.demoMode) {
				const runUpdateAndSync = async () => {
					let finalPhotoUrl = patch.photoDataUrl ?? before.photoDataUrl;
					let isFaceRegistered = patch.faceRegistered ?? before.faceRegistered;
					if (patch.photoDataUrl && patch.photoDataUrl.startsWith("data:")) try {
						const res = await fetch(`${API_URL}/api/companies/face-register`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								tenantId,
								employeeId: id,
								photoDataUrl: patch.photoDataUrl
							})
						});
						if (res.ok) {
							finalPhotoUrl = (await res.json()).url;
							isFaceRegistered = true;
							set((s) => ({ employees: s.employees.map((x) => x.id === id ? {
								...x,
								photoDataUrl: finalPhotoUrl,
								faceRegistered: true
							} : x) }));
						}
					} catch (err) {
						console.error("Face registration update failed:", err);
					}
					let docs = patch.documentsUploaded ?? before.documentsUploaded ?? [];
					if (patch.documentsUploaded) {
						docs = await Promise.all(patch.documentsUploaded.map(async (doc) => {
							if (doc.dataUrl && doc.dataUrl.startsWith("data:")) {
								const s3Url = await uploadToS3(tenantId, `employee-documents/${id}/${doc.id}.pdf`, doc.dataUrl);
								const { dataUrl: _, ...restDoc } = doc;
								return {
									...restDoc,
									dataUrl: s3Url
								};
							}
							return doc;
						}));
						set((s) => ({ employees: s.employees.map((x) => x.id === id ? {
							...x,
							documentsUploaded: docs
						} : x) }));
					}
					syncItem("employees", {
						tenantId,
						...before,
						...patch,
						photoDataUrl: finalPhotoUrl,
						faceRegistered: isFaceRegistered,
						documentsUploaded: docs
					});
				};
				runUpdateAndSync();
			}
			const changed = {};
			Object.keys(patch).forEach((k) => {
				const key = k;
				if (before[k] !== patch[k]) changed[k] = {
					from: before[key],
					to: patch[k]
				};
			});
			if (Object.keys(changed).length) st.addAudit({
				actorName: st.currentUser?.name ?? "System",
				entity: "employee",
				entityId: id,
				action: "update",
				oldValue: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.from])),
				newValue: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.to]))
			});
			const p = patch;
			if ("ctc" in p || "basicSalary" in p || "grossSalary" in p) emitCompliance("salary_revised", {
				subject: `${before.name} (${before.empCode})`,
				by: st.currentUser?.name ?? "System",
				meta: { employeeId: id }
			});
			if ("branchId" in p && p.branchId !== before.branchId) emitCompliance("employee_transferred", {
				subject: before.name,
				by: st.currentUser?.name ?? "System",
				meta: {
					employeeId: id,
					from: before.branchId,
					to: p.branchId
				}
			});
			if ("status" in p && String(p.status).toLowerCase() === "confirmed") emitCompliance("employee_confirmed", {
				subject: before.name,
				by: st.currentUser?.name ?? "System",
				meta: { employeeId: id }
			});
		}
	},
	deleteEmployee: (id) => {
		const st = get();
		const before = st.employees.find((e) => e.id === id);
		set((s) => ({ employees: s.employees.filter((e) => e.id !== id) }));
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !st.demoMode) syncDelete("employees", tenantId, id);
		st.addAudit({
			actorName: st.currentUser?.name ?? "System",
			entity: "employee",
			entityId: id,
			action: "delete",
			oldValue: before ? {
				empCode: before.empCode,
				name: before.name
			} : void 0
		});
		if (before) emitCompliance("employee_exited", {
			subject: `${before.name} (${before.empCode})`,
			by: st.currentUser?.name ?? "System",
			meta: { employeeId: id }
		});
	},
	upsertAttendance: (r) => set((s) => {
		const idx = s.attendance.findIndex((a) => a.employeeId === r.employeeId && a.date === r.date);
		const next = [...s.attendance];
		if (idx >= 0) next[idx] = r;
		else next.push(r);
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !s.demoMode) syncItem("attendance", {
			tenantId,
			...r
		});
		return { attendance: next };
	}),
	addPayroll: (p) => {
		set((s) => ({ payrolls: [...s.payrolls, p] }));
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !get().demoMode) syncItem("payrolls", {
			tenantId,
			...p
		});
	},
	addLeave: (l) => {
		const item = {
			...l,
			id: crypto.randomUUID(),
			status: "pending"
		};
		set((s) => ({ leaves: [...s.leaves, item] }));
		const tenantId = useAuth.getState().activeTenantId;
		if (tenantId && !get().demoMode) syncItem("leaves", {
			tenantId,
			...item
		});
	},
	updateLeave: (id, status) => set((s) => {
		const nextLeaves = s.leaves.map((l) => l.id === id ? {
			...l,
			status
		} : l);
		const tenantId = useAuth.getState().activeTenantId;
		const item = nextLeaves.find((l) => l.id === id);
		if (tenantId && item && !s.demoMode) syncItem("leaves", {
			tenantId,
			...item
		});
		return { leaves: nextLeaves };
	}),
	login: (u) => set({ currentUser: u }),
	logout: () => set({ currentUser: null }),
	approvalMatrix: {
		offer: ["HR Manager", "Director"],
		appointment: ["HR Manager", "Director"],
		increment: [
			"Reporting Manager",
			"HR Manager",
			"Director"
		],
		promotion: [
			"Reporting Manager",
			"HR Manager",
			"Director"
		],
		transfer: ["Reporting Manager", "HR Manager"],
		warning: ["Reporting Manager", "HR Manager"],
		show_cause: ["HR Manager"],
		suspension: ["HR Manager", "Director"],
		termination: ["HR Manager", "Director"],
		relieving: ["Reporting Manager", "HR Manager"],
		experience: ["HR Manager"],
		full_final: ["HR Manager", "Finance Head"],
		salary_certificate: ["HR Manager"]
	},
	docRequests: [],
	salaryRevisions: [],
	applySalaryRevision: (draft, actor) => {
		const emp = get().employees.find((e) => e.id === draft.employeeId);
		if (!emp) return null;
		const company = get().company;
		const projected = projectRevision(company, emp, draft);
		const rev = {
			...draft,
			id: crypto.randomUUID(),
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			createdBy: actor,
			status: "applied",
			beforeBasic: emp.basic || 0,
			afterBasic: projected.employee.basic || 0,
			addedComponent: projected.addedComponent ? {
				id: projected.addedComponent.id,
				name: projected.addedComponent.name,
				monthly: draft.amount
			} : void 0
		};
		set((s) => ({
			employees: s.employees.map((e) => e.id === emp.id ? {
				...e,
				basic: projected.employee.basic
			} : e),
			company: projected.addedComponent ? {
				...s.company,
				earnings: [...s.company.earnings || [], projected.addedComponent]
			} : s.company,
			salaryRevisions: [rev, ...s.salaryRevisions]
		}));
		return rev;
	},
	rollbackSalaryRevision: (id) => set((s) => {
		const rev = s.salaryRevisions.find((r) => r.id === id);
		if (!rev || rev.status !== "applied") return {};
		return {
			employees: s.employees.map((e) => e.id === rev.employeeId ? {
				...e,
				basic: rev.beforeBasic
			} : e),
			company: rev.addedComponent ? {
				...s.company,
				earnings: (s.company.earnings || []).filter((c) => c.id !== rev.addedComponent.id)
			} : s.company,
			salaryRevisions: s.salaryRevisions.map((r) => r.id === id ? {
				...r,
				status: "rolled_back"
			} : r)
		};
	}),
	setApprovalChain: (letterKey, approvers) => set((s) => ({ approvalMatrix: {
		...s.approvalMatrix,
		[letterKey]: approvers
	} })),
	createDocRequest: (r) => {
		const chain = get().approvalMatrix[r.letterKey] ?? ["HR Manager"];
		const steps = (chain.length ? chain : ["HR Manager"]).map((a) => ({
			approver: a,
			status: "pending"
		}));
		const req = {
			...r,
			id: crypto.randomUUID(),
			steps,
			currentStep: 0,
			status: "pending",
			requestedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		set((s) => ({ docRequests: [req, ...s.docRequests] }));
		return req;
	},
	actOnDocStep: (id, action, comment, actedBy) => set((s) => ({ docRequests: s.docRequests.map((d) => {
		if (d.id !== id || d.status !== "pending") return d;
		const steps = d.steps.slice();
		const idx = d.currentStep;
		if (idx >= steps.length) return d;
		steps[idx] = {
			...steps[idx],
			status: action === "approve" ? "approved" : "rejected",
			comment,
			actedAt: (/* @__PURE__ */ new Date()).toISOString(),
			actedBy
		};
		if (action === "reject") return {
			...d,
			steps,
			status: "rejected"
		};
		const nextIdx = idx + 1;
		const done = nextIdx >= steps.length;
		return {
			...d,
			steps,
			currentStep: done ? idx : nextIdx,
			status: done ? "approved" : "pending"
		};
	}) })),
	forwardDocStep: (id, toApprover, comment, actedBy) => set((s) => ({ docRequests: s.docRequests.map((d) => {
		if (d.id !== id || d.status !== "pending") return d;
		const steps = d.steps.slice();
		const idx = d.currentStep;
		if (idx >= steps.length) return d;
		steps[idx] = {
			...steps[idx],
			status: "approved",
			comment: `Forwarded to ${toApprover}${comment ? " · " + comment : ""}`,
			actedAt: (/* @__PURE__ */ new Date()).toISOString(),
			actedBy
		};
		steps.splice(idx + 1, 0, {
			approver: toApprover,
			status: "pending",
			forwardedFrom: actedBy
		});
		return {
			...d,
			steps,
			currentStep: idx + 1
		};
	}) })),
	deleteDocRequest: (id) => set((s) => ({ docRequests: s.docRequests.filter((d) => d.id !== id) })),
	seedDemo: (asRole) => {
		const { employees, attendance, leaves } = buildDemoData();
		const company = get().company;
		const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
		set({
			employees,
			attendance,
			leaves,
			payrolls: employees.map((e) => {
				const computed = computePayroll({
					company,
					employee: e,
					daysWorked: company.workingDaysPerMonth,
					otHours: 4,
					incentive: 1500,
					shiftDays: e.shiftId === "night" ? 10 : 0,
					loan: 0,
					advance: 0,
					bonus: 0
				});
				return {
					id: crypto.randomUUID(),
					employeeId: e.id,
					month,
					daysWorked: company.workingDaysPerMonth,
					otHours: 4,
					incentive: 1500,
					shiftDays: e.shiftId === "night" ? 10 : 0,
					loan: 0,
					advance: 0,
					bonus: 0,
					computed,
					createdAt: (/* @__PURE__ */ new Date()).toISOString()
				};
			}),
			currentUser: asRole === "admin" ? {
				role: "admin",
				name: "Demo Admin"
			} : {
				role: "employee",
				employeeId: employees[0].id,
				name: employees[0].name
			},
			demoMode: true
		});
	},
	seedSuperDemo: () => {
		const now = /* @__PURE__ */ new Date();
		const mkDate = (daysAgo) => (/* @__PURE__ */ new Date(now.getTime() - daysAgo * 864e5)).toISOString();
		set({
			demoSuper: true,
			demoMode: true,
			demoTenants: [
				{
					id: crypto.randomUUID(),
					name: "Acme Manufacturing",
					slug: "acme",
					legalName: "Acme Manufacturing Pvt Ltd",
					plan: "enterprise",
					status: "active",
					employees: 248,
					createdAt: mkDate(120)
				},
				{
					id: crypto.randomUUID(),
					name: "Nova Retail",
					slug: "nova",
					legalName: "Nova Retail India Pvt Ltd",
					plan: "growth",
					status: "active",
					employees: 87,
					createdAt: mkDate(64)
				},
				{
					id: crypto.randomUUID(),
					name: "Meridian Logistics",
					slug: "meridian",
					legalName: "Meridian Logistics LLP",
					plan: "starter",
					status: "trial",
					employees: 22,
					createdAt: mkDate(9)
				}
			],
			currentUser: {
				role: "admin",
				name: "Super Admin (Demo)"
			}
		});
	},
	addDemoTenant: (t) => set((s) => ({ demoTenants: [{
		...t,
		id: crypto.randomUUID(),
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	}, ...s.demoTenants] })),
	updateDemoTenant: (id, patch) => set((s) => ({ demoTenants: s.demoTenants.map((t) => t.id === id ? {
		...t,
		...patch
	} : t) })),
	deleteDemoTenant: (id) => set((s) => ({ demoTenants: s.demoTenants.filter((t) => t.id !== id) })),
	exitDemo: () => set({
		currentUser: null,
		demoMode: false,
		demoSuper: false
	})
}), {
	name: "swift-hrms",
	version: 6,
	merge: (persisted, current) => {
		const p = persisted ?? {};
		return {
			...current,
			...p,
			company: {
				...current.company,
				...p.company ?? {}
			},
			docAssets: {
				...current.docAssets,
				...p.docAssets ?? {}
			},
			docLibrary: p.docLibrary && p.docLibrary.length ? p.docLibrary : current.docLibrary,
			journeys: p.journeys ?? [],
			assetCategories: p.assetCategories && p.assetCategories.length ? p.assetCategories : current.assetCategories,
			assets: p.assets ?? [],
			assetAssignments: p.assetAssignments ?? [],
			auditLog: p.auditLog ?? [],
			registrationDrafts: p.registrationDrafts ?? []
		};
	}
}));
function resolveAttendanceProfile(emp, company) {
	const rules = (company.attendanceDefaults ?? []).slice().sort((a, b) => b.priority - a.priority);
	const matches = (r) => {
		const m = r.match || {};
		if (m.branchId && m.branchId !== emp.branchId) return false;
		if (m.department && m.department.toLowerCase() !== (emp.department || "").toLowerCase()) return false;
		if (m.designation && m.designation.toLowerCase() !== (emp.designation || "").toLowerCase()) return false;
		return true;
	};
	const specificity = (r) => (r.match?.branchId ? 1 : 0) + (r.match?.department ? 1 : 0) + (r.match?.designation ? 1 : 0);
	const winner = rules.filter(matches).sort((a, b) => specificity(b) - specificity(a) || b.priority - a.priority)[0];
	if (!winner) return {};
	return {
		ruleId: winner.id,
		ruleName: winner.name,
		shiftId: winner.shiftId,
		weeklyOff: winner.weeklyOff,
		leaveTypeIds: winner.leaveTypeIds,
		geofenceFromBranch: winner.geofenceFromBranch,
		payrollGroup: winner.payrollGroup,
		costCentre: winner.costCentre,
		holidayCalendar: winner.holidayCalendar
	};
}
//#endregion
export { journeyProgress as a, revisionReasonLabels as c, useAuth as d, useStore as f, inr as i, revisionTargetLabels as l, computePayroll as n, onCompliance as o, explainPayroll as r, resolveAttendanceProfile as s, LIFECYCLE_QUESTIONS as t, simulateRevision as u };
