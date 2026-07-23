import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { c as revisionReasonLabels, f as useStore, i as inr, l as revisionTargetLabels, n as computePayroll, r as explainPayroll, u as simulateRevision } from "./store-Dj1aT4sf.mjs";
import { Ft as CircleCheck, Kt as Calculator, Tt as FileDown, f as TriangleAlert, ft as Info, j as RotateCcw, m as TrendingDown, p as TrendingUp, y as Sparkles } from "../_libs/lucide-react.mjs";
import { n as preflightPayroll, t as auditPayroll } from "./payroll-audit-OuxFUWsb.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
import { n as generateSalarySlipPDF } from "./pdf-BbZFURNJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.payroll-DbYRZWjf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PayrollPage() {
	const { employees, company, attendance, addPayroll, applySalaryRevision, rollbackSalaryRevision, salaryRevisions, currentUser } = useStore();
	const branches = company.branches ?? [];
	const [branchFilter, setBranchFilter] = (0, import_react.useState)("__all");
	const filteredEmployees = (0, import_react.useMemo)(() => branchFilter === "__all" ? employees : employees.filter((e) => (e.branchId || "") === branchFilter), [employees, branchFilter]);
	const [empId, setEmpId] = (0, import_react.useState)(filteredEmployees[0]?.id || employees[0]?.id || "");
	const [month, setMonth] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 7));
	const emp = employees.find((e) => e.id === empId);
	const monthAtt = (0, import_react.useMemo)(() => attendance.filter((a) => a.employeeId === empId && a.date.startsWith(month)), [
		attendance,
		empId,
		month
	]);
	const daysAuto = monthAtt.filter((a) => a.status === "present").length + monthAtt.filter((a) => a.status === "half-day").length * .5;
	const otAuto = monthAtt.reduce((sum, a) => sum + (a.otHours || 0), 0);
	const shiftDaysAuto = monthAtt.filter((a) => a.status === "present" || a.status === "half-day").length;
	const [daysWorked, setDaysWorked] = (0, import_react.useState)(company.workingDaysPerMonth);
	const [otHours, setOtHours] = (0, import_react.useState)(0);
	const [nightHours, setNightHours] = (0, import_react.useState)(0);
	const [incentive, setIncentive] = (0, import_react.useState)(0);
	const [shiftDays, setShiftDays] = (0, import_react.useState)(0);
	const [loan, setLoan] = (0, import_react.useState)(0);
	const [advance, setAdvance] = (0, import_react.useState)(0);
	const [bonus, setBonus] = (0, import_react.useState)(0);
	const [arrears, setArrears] = (0, import_react.useState)(0);
	const [reimbursement, setReimbursement] = (0, import_react.useState)(0);
	const [variablePay, setVariablePay] = (0, import_react.useState)(0);
	const [otherEarnings, setOtherEarnings] = (0, import_react.useState)(0);
	const [otherDeductions, setOtherDeductions] = (0, import_react.useState)(0);
	const [acknowledged, setAcknowledged] = (0, import_react.useState)(false);
	const [showExplain, setShowExplain] = (0, import_react.useState)(false);
	const [revAmount, setRevAmount] = (0, import_react.useState)(0);
	const [revTarget, setRevTarget] = (0, import_react.useState)("basic");
	const [revReason, setRevReason] = (0, import_react.useState)("increment");
	const [revEffective, setRevEffective] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const sim = (0, import_react.useMemo)(() => emp && revAmount !== 0 ? simulateRevision(company, emp, {
		amount: revAmount,
		target: revTarget
	}) : null, [
		emp,
		company,
		revAmount,
		revTarget
	]);
	const empRevisions = (0, import_react.useMemo)(() => salaryRevisions.filter((r) => r.employeeId === empId).slice(0, 5), [salaryRevisions, empId]);
	const applyRev = () => {
		if (!emp || revAmount === 0) return toast.error("Enter a non-zero amount");
		if (applySalaryRevision({
			employeeId: emp.id,
			amount: revAmount,
			target: revTarget,
			reason: revReason,
			effectiveDate: revEffective,
			arrears: false,
			retro: false,
			recalcAttendance: true,
			recalcLeave: true,
			recalcOt: true,
			recalcBonus: true,
			recalcIncentive: true,
			updateTaxProjection: true,
			applyToFuture: true
		}, currentUser?.name || "Admin")) {
			toast.success("Revision applied — payroll updated");
			setRevAmount(0);
		}
	};
	const useAuto = () => {
		setDaysWorked(daysAuto || company.workingDaysPerMonth);
		setOtHours(otAuto);
		setShiftDays(shiftDaysAuto);
		toast.success("Pulled from attendance");
	};
	const p = emp ? computePayroll({
		company,
		employee: emp,
		daysWorked,
		otHours,
		incentive,
		shiftDays,
		loan,
		advance,
		bonus,
		arrears,
		reimbursement,
		nightHours,
		variablePay,
		otherEarnings,
		otherDeductions
	}) : null;
	const preflight = emp ? preflightPayroll({
		company,
		employee: emp,
		daysWorked
	}) : [];
	const issues = emp && p ? auditPayroll({
		company,
		employee: emp,
		daysWorked,
		otHours,
		p,
		nightHours,
		reimbursement
	}) : [];
	const explanations = emp && p ? explainPayroll(company, emp, p) : [];
	const hasErrors = issues.some((i) => i.level === "error");
	const hasWarnings = issues.some((i) => i.level === "warn");
	const hardBlocked = preflight.length > 0;
	const process = () => {
		if (!emp || !p) return;
		if (hardBlocked) return toast.error(`Compliance block: ${preflight[0].title}`);
		if (hasErrors) return toast.error("Fix payroll errors before finalizing");
		if (hasWarnings && !acknowledged) return toast.error("Acknowledge AI warnings before finalizing");
		addPayroll({
			id: crypto.randomUUID(),
			employeeId: emp.id,
			month,
			daysWorked,
			otHours,
			incentive,
			shiftDays,
			loan,
			advance,
			bonus,
			computed: p,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		generateSalarySlipPDF(company, emp, month, p);
		toast.success("Payroll processed & payslip downloaded");
	};
	if (employees.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground",
		children: "Add employees first to run payroll."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-semibold",
					children: "Payroll Engine · AI Decisions"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Compute payroll, audit with AI, and simulate salary decisions inline — all in one place."
				})] }), branches.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-[220px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: "Branch"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: branchFilter,
						onValueChange: setBranchFilter,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "__all",
							children: "All branches"
						}), branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
							value: b.id,
							children: [
								b.name,
								" (",
								b.code,
								")"
							]
						}, b.id))] })]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border bg-card p-6 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Employee" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: empId,
								onValueChange: setEmpId,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Choose" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: filteredEmployees.map((e) => {
									const br = branches.find((b) => b.id === e.branchId);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
										value: e.id,
										children: [
											e.name,
											" (",
											e.empCode,
											")",
											br ? ` · ${br.code}` : ""
										]
									}, e.id);
								}) })]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Month" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "month",
								value: month,
								onChange: (e) => setMonth(e.target.value)
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"Auto from attendance: ",
								daysAuto,
								" days, ",
								otAuto,
								" OT hrs, ",
								shiftDaysAuto,
								" shift days"
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "outline",
								onClick: useAuto,
								children: "Pull"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Days Worked",
									value: daysWorked,
									onChange: setDaysWorked
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "OT Hours",
									value: otHours,
									onChange: setOtHours
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Night Hours",
									value: nightHours,
									onChange: setNightHours
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Shift Days",
									value: shiftDays,
									onChange: setShiftDays
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Incentive (₹)",
									value: incentive,
									onChange: setIncentive
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Variable Pay (₹)",
									value: variablePay,
									onChange: setVariablePay
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Bonus (₹)",
									value: bonus,
									onChange: setBonus
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Arrears (₹)",
									value: arrears,
									onChange: setArrears
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Reimbursements (₹)",
									value: reimbursement,
									onChange: setReimbursement
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Other Earnings (₹)",
									value: otherEarnings,
									onChange: setOtherEarnings
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Loan (₹)",
									value: loan,
									onChange: setLoan
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Advance (₹)",
									value: advance,
									onChange: setAdvance
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Other Deductions (₹)",
									value: otherDeductions,
									onChange: setOtherDeductions
								})
							]
						}),
						p && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 md:grid-cols-4 gap-2 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
									label: "Gross",
									value: inr(p.gross)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
									label: "Net",
									value: inr(p.net),
									tone: "brand"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
									label: "Employer",
									value: inr(p.totalEmployer)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
									label: "CTC/yr",
									value: inr(p.annualCTC)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
									label: "PF Base",
									value: inr(p.pfBase)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
									label: "ESI",
									value: p.esiEligible ? "Eligible" : "Above ceiling",
									tone: p.esiEligible ? void 0 : "warn"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
									label: "PT",
									value: inr(p.deductions.professionalTax)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
									label: p.lwfSource,
									value: inr(p.deductions.lwf)
								})
							]
						}),
						p?.structureName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[11px] text-muted-foreground flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3 text-primary" }),
								" Structure applied: ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: p.structureName
								})
							]
						}),
						hardBlocked && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border-2 border-destructive bg-destructive/10 p-3 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm font-semibold text-destructive",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4" }), " Compliance block — cannot process payroll"]
								}),
								preflight.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-md bg-background/60 p-2 text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium text-destructive",
											children: b.title
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-muted-foreground mt-0.5",
											children: b.detail
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[10px] uppercase tracking-wide text-destructive/80 mt-1",
											children: ["Ref: ", b.law]
										})
									]
								}, b.code)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-muted-foreground",
									children: "Resolve in the Employees module (age, DOB, activation) and try again."
								})
							]
						}),
						p && p.age !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-primary/40 pl-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Age ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: p.age
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["EPS eligible: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: p.epsEligible ? "text-emerald-600" : "text-yellow-600",
									children: p.epsEligible ? "Yes" : "Age ≥ 58 — stopped"
								})] }),
								p.age < 18 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-destructive font-medium",
									children: "Minor — restricted work rules apply"
								})
							]
						}),
						p && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border p-3 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm font-medium",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }),
										" AI Payroll Audit",
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "ml-auto text-xs text-muted-foreground",
											children: [issues.length, " finding(s)"]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-1.5 max-h-56 overflow-y-auto pr-1",
									children: issues.map((i, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: `flex gap-2 rounded-md p-2 text-xs ${i.level === "error" ? "bg-destructive/10 text-destructive" : i.level === "warn" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : "bg-muted/60"}`,
										children: [i.level === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3.5 w-3.5 shrink-0 mt-0.5" }) : i.level === "warn" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3.5 w-3.5 shrink-0 mt-0.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "font-medium",
													children: i.title
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "opacity-80",
													children: i.detail
												}),
												i.suggestion && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "opacity-70 mt-0.5 flex items-start gap-1",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "h-3 w-3 mt-0.5" }),
														" ",
														i.suggestion
													]
												})
											]
										})]
									}, idx))
								}),
								hasWarnings && !hasErrors && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-2 text-xs pt-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: acknowledged,
										onChange: (e) => setAcknowledged(e.target.checked)
									}), "I have reviewed the AI warnings and want to proceed."]
								})
							]
						}),
						p && explanations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-primary/30 bg-primary/5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setShowExplain((s) => !s),
								className: "w-full flex items-center justify-between px-3 py-2 text-sm font-medium",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }),
										" AI explains every line (",
										explanations.length,
										")"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted-foreground",
									children: showExplain ? "Hide" : "Show"
								})]
							}), showExplain && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "border-t border-primary/20 px-3 py-2 space-y-1.5 max-h-72 overflow-y-auto",
								children: explanations.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs flex gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "h-3 w-3 mt-0.5 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: x.text
									})]
								}, x.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "w-full bg-gradient-brand text-white shadow-glow",
							onClick: process,
							disabled: hasErrors || hardBlocked,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "mr-2 h-4 w-4" }),
								" ",
								hardBlocked ? "Compliance blocked" : "Process & Download Payslip"
							]
						})
					]
				}), p && emp && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border bg-card p-6 space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between border-b border-border pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display font-semibold",
								children: emp.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted-foreground",
								children: [
									emp.empCode,
									" · ",
									emp.designation
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "h-5 w-5 text-primary" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: "Earnings",
							children: [p.earningsList.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: row.name,
								value: row.amount
							}, row.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Gross Earnings",
								value: p.gross,
								bold: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: "Deductions",
							children: [
								company.pfRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: `Employee PF (${company.pfRules.employeePct}% of ₹${Math.round(p.pfBase)})`,
									value: p.deductions.employeePF
								}),
								company.esiRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: `Employee ESI (${company.esiRules.employeePct}%)${p.esiEligible ? "" : " — not eligible"}`,
									value: p.deductions.employeeESI
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Professional Tax",
									value: p.deductions.professionalTax
								}),
								company.tdsRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "TDS (monthly)",
									value: p.deductions.tds
								}),
								company.lwfRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "LWF",
									value: p.deductions.lwf
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Loan",
									value: p.deductions.loan
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Advance",
									value: p.deductions.advance
								}),
								p.extraDeductions.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: d.name,
									value: d.amount
								}, d.id)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Total Deductions",
									value: p.totalDeductions,
									bold: true
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-gradient-brand p-4 text-white flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Net Salary Payable" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display text-xl font-semibold",
								children: inr(p.net)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
							title: "Employer Contribution (part of CTC)",
							children: [
								company.pfRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: `Employer PF total (${company.pfRules.employerPct}%)`,
									value: p.employerContrib.employerPF
								}),
								company.pfRules.enabled && p.employerContrib.eps > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "  ↳ EPS diversion (8.33% cap ₹1,250)",
									value: p.employerContrib.eps
								}),
								company.pfRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "  ↳ EPF (employer share)",
									value: p.employerContrib.epfEmployer
								}),
								company.pfRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "EDLI (0.5% cap ₹75)",
									value: p.employerContrib.edli
								}),
								company.pfRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "PF Admin (0.5%)",
									value: p.employerContrib.pfAdmin
								}),
								company.esiRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: `Employer ESI (${company.esiRules.employerPct}%)`,
									value: p.employerContrib.employerESI
								}),
								company.lwfRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Employer LWF",
									value: p.employerContrib.employerLwf
								}),
								company.gratuityRules.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: `Gratuity (${company.gratuityRules.numerator}/${company.gratuityRules.denominator} monthly)`,
									value: p.employerContrib.gratuity
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Monthly CTC",
									value: p.monthlyCTC,
									bold: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Annual CTC",
									value: p.annualCTC,
									bold: true
								})
							]
						})
					]
				})]
			}),
			emp && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between flex-wrap gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "font-display font-semibold flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }), " AI Payroll Decision — inline salary revision"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground mt-0.5",
							children: [
								"Change ",
								emp.name,
								"'s pay right here. AI shows the impact live on gross, net, PF/ESI/PT/TDS and employer cost before you apply."
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							variant: "outline",
							className: "text-xs",
							children: ["Current Basic: ", inr(emp.basic)]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 md:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Amount (₹, +/-)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: revAmount,
								onChange: (e) => setRevAmount(+e.target.value || 0),
								placeholder: "e.g. 5000"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Apply to"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: revTarget,
								onValueChange: (v) => setRevTarget(v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: Object.keys(revisionTargetLabels).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: k,
									children: revisionTargetLabels[k]
								}, k)) })]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Reason"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: revReason,
								onValueChange: (v) => setRevReason(v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: Object.keys(revisionReasonLabels).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: k,
									children: revisionReasonLabels[k]
								}, k)) })]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Effective from"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: revEffective,
								onChange: (e) => setRevEffective(e.target.value)
							})] })
						]
					}),
					sim ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2 md:grid-cols-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiffTile, {
									label: "Gross",
									before: sim.before.gross,
									after: sim.after.gross,
									d: sim.diff.gross
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiffTile, {
									label: "Net take-home",
									before: sim.before.net,
									after: sim.after.net,
									d: sim.diff.net
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiffTile, {
									label: "Employer cost",
									before: sim.before.totalEmployer,
									after: sim.after.totalEmployer,
									d: sim.diff.employerCost
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiffTile, {
									label: "Annual CTC",
									before: sim.before.annualCTC,
									after: sim.after.annualCTC,
									d: sim.diff.annualCTC
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-muted/40 p-3 space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs font-medium flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3 text-primary" }), " AI impact analysis"]
							}), sim.recommendations.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs flex items-start gap-1.5 text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "h-3 w-3 mt-0.5 shrink-0" }),
									" ",
									r
								]
							}, i))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: applyRev,
							className: "bg-gradient-brand text-white",
							children: "Apply revision & update payroll"
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground text-center",
						children: "Enter a non-zero amount above to see the live AI decision."
					}),
					empRevisions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border border-border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-medium mb-2",
							children: "Recent revisions"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-1.5",
							children: empRevisions.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: revisionReasonLabels[r.reason]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-muted-foreground",
										children: [
											" · ",
											revisionTargetLabels[r.target],
											" · ₹",
											r.amount.toLocaleString("en-IN")
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-muted-foreground",
										children: [" · ", new Date(r.createdAt).toLocaleDateString()]
									})
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: r.status === "applied" ? "default" : "secondary",
										className: "text-[10px] uppercase",
										children: r.status
									}), r.status === "applied" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "ghost",
										className: "h-6 px-2",
										onClick: () => {
											rollbackSalaryRevision(r.id);
											toast.success("Rolled back");
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-3 w-3 mr-1" }), " Rollback"]
									})]
								})]
							}, r.id))
						})]
					})
				]
			})
		]
	});
}
function DiffTile({ label, before, after, d }) {
	const up = d > .5, down = d < -.5;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] uppercase text-muted-foreground",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-semibold mt-0.5",
				children: inr(after)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-[10px] text-muted-foreground",
				children: ["was ", inr(before)]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `text-xs mt-1 flex items-center gap-1 ${up ? "text-emerald-600 dark:text-emerald-400" : down ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`,
				children: [
					up ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-3 w-3" }) : down ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingDown, { className: "h-3 w-3" }) : null,
					d >= 0 ? "+" : "",
					inr(d)
				]
			})
		]
	});
}
function NumField({ label, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
		type: "number",
		value,
		onChange: (e) => onChange(+e.target.value || 0)
	})] });
}
function Section({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-xs uppercase tracking-wider text-muted-foreground mb-1",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-1",
		children
	})] });
}
function Row({ label, value, bold }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex justify-between text-sm ${bold ? "font-semibold border-t border-border pt-1 mt-1" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: bold ? "" : "text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: inr(value) })]
	});
}
function StatChip({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-lg border px-2 py-1.5 ${tone === "brand" ? "bg-gradient-brand text-white border-transparent" : tone === "warn" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" : "bg-muted/50 border-border"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-[10px] uppercase ${tone === "brand" ? "opacity-80" : "text-muted-foreground"}`,
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs font-semibold truncate",
			children: value
		})]
	});
}
//#endregion
export { PayrollPage as component };
