//#region node_modules/.nitro/vite/services/ssr/assets/payroll-audit-OuxFUWsb.js
/** Age from DOB (years). */
function ageYears(dob) {
	if (!dob) return void 0;
	const t = new Date(dob).getTime();
	if (isNaN(t)) return void 0;
	return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1e3));
}
/**
* Hard blocks — payroll MUST NOT be finalized until these are resolved.
* Covers Child Labour Act, minor working conditions, inactive employees,
* and structurally invalid inputs.
*/
function preflightPayroll(opts) {
	const { company: c, employee: e, daysWorked } = opts;
	const blocks = [];
	const age = ageYears(e.dob);
	if (age !== void 0 && age < 14) blocks.push({
		code: "CL_ACT_14",
		title: "Employee is under 14 — not eligible for employment",
		detail: `Age ${age}. Child Labour (Prohibition & Regulation) Amendment Act 2016 prohibits employment below 14 in any occupation.`,
		law: "Child Labour Act 1986 (amended 2016), Section 3"
	});
	else if (age !== void 0 && age < 15 && c.esiRules?.enabled) blocks.push({
		code: "ESI_MIN_AGE",
		title: "Under-15 cannot be covered under ESI",
		detail: `Age ${age}. ESI registration requires minimum age 15 (Factories Act aligns).`,
		law: "ESI Act 1948 read with Factories Act 1948 Sec 67"
	});
	if (!e.dob) blocks.push({
		code: "DOB_MISSING",
		title: "Date of birth missing",
		detail: "Age-based statutory checks (Child Labour Act, EPS 58 cutoff, retirement) cannot run.",
		law: "Statutory KYC requirement"
	});
	if (e.status === "inactive") blocks.push({
		code: "STATUS_INACTIVE",
		title: "Employee is inactive",
		detail: "Move to Full & Final settlement instead of monthly payroll.",
		law: "Payment of Wages Act 1936"
	});
	if (!e.basic || e.basic <= 0) blocks.push({
		code: "BASIC_ZERO",
		title: "Basic salary not set",
		detail: "Cannot run payroll with zero/missing basic.",
		law: "Minimum Wages Act 1948"
	});
	if (daysWorked < 0 || daysWorked > c.workingDaysPerMonth) blocks.push({
		code: "DAYS_INVALID",
		title: "Days worked out of range",
		detail: `Days ${daysWorked} vs working days ${c.workingDaysPerMonth}.`,
		law: "Payment of Wages Act 1936"
	});
	return blocks;
}
/** Metro cities for HRA 50% cap (Section 10(13A) Income Tax Rules). */
var METRO_CITIES = [
	"mumbai",
	"delhi",
	"chennai",
	"kolkata"
];
function auditPayroll(opts) {
	const { company: c, employee: e, daysWorked, otHours, p, nightHours = 0, reimbursement = 0 } = opts;
	const out = [];
	const age = ageYears(e.dob);
	const branch = (c.branches || []).find((b) => b.id === e.branchId);
	if (age !== void 0 && age >= 14 && age < 15) out.push({
		level: "warn",
		code: "CL_14_15",
		title: "Adolescent (14–15)",
		detail: `Age ${age}. Can only be employed in non-hazardous family enterprises outside school hours (max 3 hrs/day).`,
		suggestion: "Verify permissible occupation under Child Labour Act 1986 Sec 3A.",
		law: "Child Labour Act 1986"
	});
	if (age !== void 0 && age >= 15 && age < 18) {
		out.push({
			level: "warn",
			code: "ADOLESCENT_15_18",
			title: "Adolescent worker (15–18)",
			detail: `Age ${age}. Restrictions: no night work (7pm–6am), no hazardous work, medical fitness certificate required, max 4.5 hrs continuous work.`,
			suggestion: "Ensure Form 27 (fitness certificate) is on file and shift roster excludes night hours.",
			law: "Factories Act 1948 Sec 68-71"
		});
		if (nightHours > 0) out.push({
			level: "error",
			code: "MINOR_NIGHT",
			title: "Minor working night hours",
			detail: `${nightHours} night hrs recorded for a 15–18 year old.`,
			suggestion: "Reassign to day shift immediately.",
			law: "Factories Act Sec 71"
		});
	}
	if (age !== void 0 && age >= 58 && c.pfRules?.enabled) out.push({
		level: "info",
		code: "EPS_58",
		title: "EPS diversion stopped (age ≥ 58)",
		detail: `Age ${age}. Employer's 8.33% no longer diverted to EPS; entire employer share goes to EPF.`,
		law: "EPS Scheme 1995 Para 6"
	});
	if (age !== void 0 && age >= 60) out.push({
		level: "info",
		code: "RETIREMENT",
		title: "Retirement age reached",
		detail: `Age ${age}. Verify superannuation policy and gratuity settlement.`,
		law: "Payment of Gratuity Act 1972"
	});
	if (p.net < 0) out.push({
		level: "error",
		code: "NEG_NET",
		title: "Negative net pay",
		detail: `Net is ${Math.round(p.net)}. Deductions exceed earnings.`,
		suggestion: "Reduce loan/advance for the month or split across cycles."
	});
	if (daysWorked > c.workingDaysPerMonth) out.push({
		level: "error",
		code: "DAYS_OVER",
		title: "Days worked > working days",
		detail: `${daysWorked} > ${c.workingDaysPerMonth}.`,
		suggestion: `Cap days at ${c.workingDaysPerMonth} or update working-days setting.`
	});
	if (daysWorked < 0) out.push({
		level: "error",
		code: "DAYS_NEG",
		title: "Negative days worked",
		detail: `${daysWorked}`
	});
	if (p.gross > 0) {
		const basicRatio = p.earnings.basic / p.gross;
		if (basicRatio < .5) out.push({
			level: "warn",
			code: "CoW_BASIC_50",
			title: "Basic below 50% of gross",
			detail: `Basic is ${(basicRatio * 100).toFixed(1)}% of gross. Code on Wages 2019 requires ≥50%.`,
			suggestion: "Rebalance salary structure — raise basic or reduce allowances.",
			law: "Code on Wages 2019 Sec 2(y)"
		});
	}
	const hra = p.earnings.hra || 0;
	if (hra > 0 && p.earnings.basic > 0) {
		const city = (branch?.city || e.city || "").toLowerCase();
		const isMetro = METRO_CITIES.some((m) => city.includes(m));
		const cap = p.earnings.basic * (isMetro ? .5 : .4);
		if (hra > cap) out.push({
			level: "warn",
			code: "HRA_CAP",
			title: `HRA exceeds ${isMetro ? "50%" : "40%"} of basic`,
			detail: `HRA ₹${Math.round(hra)} > cap ₹${Math.round(cap)} (${isMetro ? "metro" : "non-metro"}: ${city || "unknown city"}). Excess is fully taxable.`,
			suggestion: "Verify HRA exemption calculation for Form 16.",
			law: "Income Tax Sec 10(13A)"
		});
	}
	if (c.pfRules?.enabled) {
		if (p.pfBaseRaw > p.pfCeiling && p.pfBase === p.pfCeiling) out.push({
			level: "info",
			code: "PF_CAP",
			title: "PF capped at wage ceiling",
			detail: `PF base capped from ₹${Math.round(p.pfBaseRaw)} to ₹${p.pfCeiling}.`,
			law: "EPF Act 1952 Para 26A"
		});
		if (c.pfRules.employerPct < 12 || c.pfRules.employerPct > 14) out.push({
			level: "warn",
			code: "PF_RATE",
			title: "Unusual employer PF %",
			detail: `Employer PF is ${c.pfRules.employerPct}%. Statutory is 12% (+ 0.5% admin + 0.5% EDLI).`,
			suggestion: "Verify EPFO admin charges (0.5%) and EDLI included.",
			law: "EPF Act 1952 Sec 6"
		});
		if (Math.abs(c.pfRules.employeePct - 12) > .01) out.push({
			level: "info",
			code: "PF_EMP_RATE",
			title: "Non-standard employee PF %",
			detail: `Employee PF is ${c.pfRules.employeePct}%. Statutory is 12%.`,
			law: "EPF Act 1952"
		});
		if (e.basic > 15e3 && p.deductions.employeePF === 0) out.push({
			level: "info",
			code: "PF_VOLUNTARY",
			title: "PF above ceiling",
			detail: `Basic ₹${e.basic} > ₹15,000. PF is voluntary; both parties must agree in writing.`,
			law: "EPF Act 1952 Para 26(6)"
		});
	}
	if (c.esiRules?.enabled) {
		const near = c.esiRules.threshold * .98;
		if (p.gross > c.esiRules.threshold && p.deductions.employeeESI > 0) out.push({
			level: "error",
			code: "ESI_ABOVE",
			title: "ESI deducted above threshold",
			detail: `Gross ₹${Math.round(p.gross)} > threshold ₹${c.esiRules.threshold}.`,
			suggestion: "Exclude employee from ESI. Note: contribution period rules — if eligible at start of period (Apr/Oct) continue till period end.",
			law: "ESI Act 1948 Reg 4"
		});
		else if (p.gross > near && p.gross <= c.esiRules.threshold) out.push({
			level: "warn",
			code: "ESI_NEAR",
			title: "Near ESI ceiling",
			detail: `Gross ₹${Math.round(p.gross)} is within 2% of ₹${c.esiRules.threshold}. Recheck next cycle.`,
			law: "ESI Act 1948"
		});
		if (Math.abs(c.esiRules.employeePct - .75) > .01 || Math.abs(c.esiRules.employerPct - 3.25) > .01) out.push({
			level: "info",
			code: "ESI_RATE",
			title: "Custom ESI rates",
			detail: `Configured ${c.esiRules.employeePct}% / ${c.esiRules.employerPct}%. Statutory since Jul 2019: 0.75% / 3.25%.`,
			law: "ESI Amendment 2019"
		});
	}
	if (c.ptSlabs?.length > 0) {
		const expected = [...c.ptSlabs].sort((a, b) => a.upTo - b.upTo).find((s) => p.gross <= s.upTo)?.amount ?? c.ptSlabs[c.ptSlabs.length - 1].amount;
		if (Math.round(expected) !== Math.round(p.deductions.professionalTax)) out.push({
			level: "warn",
			code: "PT_MISMATCH",
			title: "PT mismatch",
			detail: `Slab suggests ₹${expected}, computed ₹${Math.round(p.deductions.professionalTax)}.`,
			suggestion: "Recheck PT slabs in Settings.",
			law: "State-specific PT Act"
		});
	}
	if (branch?.state && c.lwfByState && !c.lwfByState.some((r) => r.state.toLowerCase() === branch.state.toLowerCase())) out.push({
		level: "info",
		code: "LWF_STATE",
		title: "LWF state not configured",
		detail: `Branch ${branch.name} is in ${branch.state}. Fell back to default LWF rules.`,
		suggestion: `Add ${branch.state} to Settings → LWF state matrix.`,
		law: "State LWF Act"
	});
	if (c.minimumWageMonthly && e.basic > 0 && e.basic < c.minimumWageMonthly) out.push({
		level: "error",
		code: "MIN_WAGE",
		title: "Below minimum wage",
		detail: `Basic ₹${e.basic} < state minimum ₹${c.minimumWageMonthly}.`,
		suggestion: "Revise basic to comply.",
		law: "Minimum Wages Act 1948"
	});
	if (c.tdsRules?.enabled && p.deductions.tds > 0 && !e.pan) out.push({
		level: "warn",
		code: "TDS_206AA",
		title: "PAN missing but TDS applied",
		detail: "Sec 206AA: TDS at 20% or slab whichever is higher applies without PAN.",
		suggestion: "Capture PAN in employee profile.",
		law: "Income Tax Sec 206AA"
	});
	if (p.gross > 0 && p.totalDeductions / p.gross > .5) out.push({
		level: "warn",
		code: "PWA_50",
		title: "Deductions > 50% of gross",
		detail: `Total ded ₹${Math.round(p.totalDeductions)} of gross ₹${Math.round(p.gross)}.`,
		suggestion: "Payment of Wages Act limits deductions to 50% (75% for co-op loans).",
		law: "Payment of Wages Act 1936 Sec 7(3)"
	});
	if (reimbursement > 0 && p.gross > 0 && reimbursement / p.gross > .2) out.push({
		level: "warn",
		code: "REIMB_HIGH",
		title: "Reimbursements > 20% of gross",
		detail: `₹${Math.round(reimbursement)} of ₹${Math.round(p.gross)}.`,
		suggestion: "High reimbursement ratios attract IT scrutiny.",
		law: "Income Tax Act"
	});
	if (nightHours > 0 && daysWorked > 0) {
		const maxNight = (c.workingHoursPerDay || 8) * daysWorked;
		if (nightHours > maxNight) out.push({
			level: "warn",
			code: "NIGHT_EXCEED",
			title: "Night hours exceed working hours",
			detail: `${nightHours} vs ${maxNight} max for ${daysWorked} days.`,
			suggestion: "Recheck shift roster."
		});
	}
	if (otHours > (c.workingHoursPerDay || 8) * daysWorked * .5) out.push({
		level: "warn",
		code: "OT_HIGH",
		title: "Unusually high OT hours",
		detail: `${otHours} OT hrs over ${daysWorked} days.`,
		suggestion: "Factories Act caps OT at 50 hrs/quarter.",
		law: "Factories Act 1948 Sec 65"
	});
	if (e.basic > 0 && e.basic <= 21e3 && p.earnings.bonus === 0) out.push({
		level: "info",
		code: "BONUS_ACT",
		title: "Statutory bonus applicable",
		detail: `Basic ≤ ₹21,000: min 8.33% of Basic+DA on Basic capped at ₹7,000. Requires ≥30 working days in the year.`,
		suggestion: "Ensure annual bonus is provisioned.",
		law: "Payment of Bonus Act 1965"
	});
	if (c.gratuityRules?.enabled && e.doj) {
		const years = (Date.now() - new Date(e.doj).getTime()) / (365.25 * 24 * 3600 * 1e3);
		if (years < 5) out.push({
			level: "info",
			code: "GRAT_5Y",
			title: "Gratuity not yet payable",
			detail: `${years.toFixed(1)} yrs service. Payable on completion of 5 continuous years (4y 240d in the 5th year counts).`,
			law: "Payment of Gratuity Act 1972 Sec 4"
		});
	}
	if (e.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(e.pan)) out.push({
		level: "error",
		code: "PAN_FMT",
		title: "Invalid PAN format",
		detail: `"${e.pan}" does not match AAAAA9999A.`,
		suggestion: "Correct PAN before generating Form 16."
	});
	if (e.aadhaar && !/^\d{12}$/.test(e.aadhaar.replace(/\s/g, ""))) out.push({
		level: "warn",
		code: "AADH_FMT",
		title: "Invalid Aadhaar format",
		detail: `Expected 12 digits.`
	});
	if (e.uan && !/^\d{12}$/.test(e.uan)) out.push({
		level: "warn",
		code: "UAN_FMT",
		title: "Invalid UAN format",
		detail: `Expected 12 digits.`
	});
	if (e.esic && !/^\d{10}(\d{7})?$/.test(e.esic)) out.push({
		level: "warn",
		code: "ESIC_FMT",
		title: "Invalid ESIC IP format",
		detail: `Expected 10 or 17 digits.`
	});
	if (e.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(e.bankIfsc)) out.push({
		level: "warn",
		code: "IFSC_FMT",
		title: "Invalid IFSC format",
		detail: `IFSC "${e.bankIfsc}" does not match RBI pattern (AAAA0XXXXXX).`,
		suggestion: "Fix IFSC before bank transfer file is generated."
	});
	if (!e.pan) out.push({
		level: "warn",
		code: "PAN_MISS",
		title: "PAN missing",
		detail: "PAN is required for TDS and Form 16.",
		suggestion: "Update PAN in Employees module."
	});
	if (!e.aadhaar) out.push({
		level: "warn",
		code: "AADH_MISS",
		title: "Aadhaar missing",
		detail: "Aadhaar is required for UAN/EPF KYC.",
		suggestion: "Update Aadhaar in Employees module."
	});
	if (c.pfRules?.enabled && !e.uan) out.push({
		level: "info",
		code: "UAN_MISS",
		title: "UAN not captured",
		detail: "PF is enabled but employee has no UAN on file."
	});
	if (c.esiRules?.enabled && p.esiEligible && !e.esic) out.push({
		level: "info",
		code: "ESIC_MISS",
		title: "ESIC number missing",
		detail: "Employee is ESI-eligible but ESIC IP number is not on file."
	});
	if ((!e.bankAcc || !e.bankIfsc) && p.net > 0) out.push({
		level: "warn",
		code: "BANK_MISS",
		title: "Bank details missing",
		detail: "Employee is missing bank account or IFSC.",
		suggestion: "Update before payout."
	});
	if (p.structureName) out.push({
		level: "info",
		code: "STRUCT",
		title: "Salary structure applied",
		detail: `Using "${p.structureName}".`
	});
	if (out.length === 0) out.push({
		level: "info",
		code: "OK",
		title: "All checks passed",
		detail: "AI found no anomalies for this payroll cycle."
	});
	return out;
}
//#endregion
export { preflightPayroll as n, auditPayroll as t };
