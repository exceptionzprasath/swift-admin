import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { c as revisionReasonLabels, f as useStore, i as inr, l as revisionTargetLabels, u as simulateRevision } from "./store-Dj1aT4sf.mjs";
import { Ft as CircleCheck, an as ArrowLeft, ft as Info, ht as History, j as RotateCcw, rn as ArrowRight, y as Sparkles } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.salary-revision-CvuZ8RMt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SalaryRevisionPage() {
	const { employees, company, salaryRevisions, applySalaryRevision, rollbackSalaryRevision } = useStore();
	const [step, setStep] = (0, import_react.useState)(1);
	const [empId, setEmpId] = (0, import_react.useState)(employees[0]?.id || "");
	const [amount, setAmount] = (0, import_react.useState)(1e3);
	const [target, setTarget] = (0, import_react.useState)("special");
	const [reason, setReason] = (0, import_react.useState)("increment");
	const [reasonNote, setReasonNote] = (0, import_react.useState)("");
	const [effectiveDate, setEffectiveDate] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [flags, setFlags] = (0, import_react.useState)({
		arrears: false,
		retro: false,
		recalcAttendance: true,
		recalcLeave: true,
		recalcOt: false,
		recalcBonus: false,
		recalcIncentive: false,
		updateTaxProjection: true,
		applyToFuture: true
	});
	const [confirmed, setConfirmed] = (0, import_react.useState)(false);
	const emp = employees.find((e) => e.id === empId);
	const sim = (0, import_react.useMemo)(() => emp ? simulateRevision(company, emp, {
		amount,
		target
	}) : null, [
		company,
		emp,
		amount,
		target
	]);
	const empHistory = salaryRevisions.filter((r) => r.employeeId === empId);
	const apply = () => {
		if (!emp) return;
		const draft = {
			employeeId: emp.id,
			amount,
			target,
			reason,
			reasonNote,
			effectiveDate,
			...flags
		};
		if (applySalaryRevision(draft, "AI Payroll Officer")) {
			toast.success(`Revision applied · ${emp.name}`);
			setStep(1);
			setConfirmed(false);
		}
	};
	if (employees.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground",
		children: "Add employees first."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "font-display text-3xl font-semibold flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-6 w-6 text-primary" }), " AI Salary Revision Engine"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "SWIFT AI acts as your payroll officer — it analyses statutory impact and asks before changing anything."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1",
				children: [
					1,
					2,
					3,
					4,
					5
				].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-1.5 w-8 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}` }, n))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-[1fr_360px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border bg-card p-6 space-y-5",
				children: [
					step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepTitle, {
							n: 1,
							title: "Who and how much?",
							hint: "AI will analyse the impact before anything is saved."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Employee" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: empId,
								onValueChange: setEmpId,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: employees.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
									value: e.id,
									children: [
										e.name,
										" · ",
										e.empCode
									]
								}, e.id)) })]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Amount (₹, per month)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: amount,
								onChange: (e) => setAmount(+e.target.value || 0)
							})] })]
						}),
						emp && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-muted/50 p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Basic",
									v: inr(emp.basic)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Dept",
									v: emp.department
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Designation",
									v: emp.designation
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Status",
									v: emp.status
								})
							]
						})
					] }),
					step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepTitle, {
							n: 2,
							title: "Reason for revision",
							hint: "AI logs this in the revision history and approval trail."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Reason" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: reason,
							onValueChange: (v) => setReason(v),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: Object.entries(revisionReasonLabels).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: k,
								children: v
							}, k)) })]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Note (optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: reasonNote,
							onChange: (e) => setReasonNote(e.target.value),
							placeholder: "Context, board approval reference, etc."
						})] })
					] }),
					step === 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepTitle, {
						n: 3,
						title: "How should ₹ be applied?",
						hint: "Choose the component — AI recomputes PF/ESI/PT/TDS impact instantly."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-2",
						children: Object.keys(revisionTargetLabels).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: `flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-sm ${target === t ? "border-primary bg-primary/5" : "border-border"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "radio",
								name: "target",
								checked: target === t,
								onChange: () => setTarget(t),
								className: "mt-1"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: revisionTargetLabels[t]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground",
								children: targetHint(t)
							})] })]
						}, t))
					})] }),
					step === 4 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepTitle, {
						n: 4,
						title: "Effective date & recomputation",
						hint: "AI can trigger retro payroll, arrears, and downstream recalcs."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Effective Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: effectiveDate,
								onChange: (e) => setEffectiveDate(e.target.value)
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Arrears required",
								k: "arrears",
								flags,
								setFlags
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Retro payroll",
								k: "retro",
								flags,
								setFlags
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Recalculate attendance",
								k: "recalcAttendance",
								flags,
								setFlags
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Recalculate leave deduction",
								k: "recalcLeave",
								flags,
								setFlags
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Recalculate overtime",
								k: "recalcOt",
								flags,
								setFlags
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Recalculate bonus",
								k: "recalcBonus",
								flags,
								setFlags
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Recalculate incentives",
								k: "recalcIncentive",
								flags,
								setFlags
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Update tax projection",
								k: "updateTaxProjection",
								flags,
								setFlags
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagBox, {
								label: "Apply to all future payrolls",
								k: "applyToFuture",
								flags,
								setFlags
							})
						]
					})] }),
					step === 5 && sim && emp && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepTitle, {
							n: 5,
							title: "AI Simulation & Confirmation",
							hint: "Review the before/after snapshot. Nothing is saved until you confirm."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SimCard, {
								title: "Before",
								c: sim.before
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SimCard, {
								title: "After",
								c: sim.after,
								highlight: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border p-3 space-y-1.5 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-medium flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }), " AI Recommendations"]
							}), sim.recommendations.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: r })]
							}, i))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delta, {
									label: "Δ Gross",
									v: sim.diff.gross
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delta, {
									label: "Δ Net",
									v: sim.diff.net
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delta, {
									label: "Δ Employer PF",
									v: sim.diff.employerPF
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delta, {
									label: "Δ Employer Cost",
									v: sim.diff.employerCost
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delta, {
									label: "Δ Annual CTC",
									v: sim.diff.annualCTC
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: confirmed,
									onChange: (e) => setConfirmed(e.target.checked)
								}),
								"I have reviewed the AI analysis and confirm this revision for ",
								emp.name,
								"."
							]
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between pt-2 border-t border-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "ghost",
							disabled: step === 1,
							onClick: () => setStep((s) => s - 1),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4 mr-1" }), " Back"]
						}), step < 5 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => setStep((s) => s + 1),
							disabled: !emp || step === 1 && !amount,
							children: ["Next ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4 ml-1" })]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: apply,
							disabled: !confirmed,
							className: "bg-gradient-brand text-white",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 mr-1" }), " Apply Revision"]
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border bg-card p-4 space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 text-sm font-medium",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "h-4 w-4 text-primary" }), " Revision History"]
				}), empHistory.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted-foreground",
					children: "No revisions yet for this employee."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2 max-h-[540px] overflow-y-auto pr-1",
					children: empHistory.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border p-2.5 text-xs space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium",
									children: revisionReasonLabels[r.reason]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `text-[10px] uppercase tracking-wider ${r.status === "rolled_back" ? "text-destructive" : "text-primary"}`,
									children: r.status
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-muted-foreground",
								children: [
									"+",
									inr(r.amount),
									" via ",
									revisionTargetLabels[r.target]
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-muted-foreground",
								children: [
									"Basic: ",
									inr(r.beforeBasic),
									" → ",
									inr(r.afterBasic),
									" · Eff ",
									r.effectiveDate
								]
							}),
							r.status === "applied" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "ghost",
								className: "h-6 px-2 text-xs",
								onClick: () => {
									rollbackSalaryRevision(r.id);
									toast.success("Rolled back");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-3 w-3 mr-1" }), " Rollback"]
							})
						]
					}, r.id))
				})]
			})]
		})]
	});
}
function StepTitle({ n, title, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-xs uppercase tracking-wider text-muted-foreground",
			children: ["Step ", n]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-display text-xl font-semibold",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-muted-foreground",
			children: hint
		})
	] });
}
function Stat({ label, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-muted-foreground",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "font-medium",
		children: v
	})] });
}
function FlagBox({ label, k, flags, setFlags }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex items-center gap-2 rounded-lg border border-border p-2 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "checkbox",
			checked: !!flags[k],
			onChange: (e) => setFlags({
				...flags,
				[k]: e.target.checked
			})
		}), label]
	});
}
function SimCard({ title, c, highlight }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-xl border p-3 space-y-1 text-sm ${highlight ? "border-primary bg-primary/5" : "border-border"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs uppercase tracking-wider text-muted-foreground",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Gross",
				v: c.gross
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Employee PF",
				v: c.deductions.employeePF
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Employee ESI",
				v: c.deductions.employeeESI
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "PT",
				v: c.deductions.professionalTax
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "TDS",
				v: c.deductions.tds
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Net",
				v: c.net,
				bold: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Employer Cost",
				v: c.totalEmployer
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Monthly CTC",
				v: c.monthlyCTC
			})
		]
	});
}
function Row({ label, v, bold }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex justify-between ${bold ? "font-semibold border-t border-border pt-1 mt-1" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: bold ? "" : "text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: inr(v) })]
	});
}
function Delta({ label, v }) {
	const positive = v >= 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-lg p-2 ${positive ? "bg-primary/10" : "bg-destructive/10"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `font-semibold ${positive ? "text-primary" : "text-destructive"}`,
			children: [positive ? "+" : "", inr(v)]
		})]
	});
}
function targetHint(t) {
	return {
		basic: "Increases PF, ESI base, gratuity, and downstream % components.",
		gross: "Adds a flat monthly earning; counts in PF & ESI bases.",
		ctc: "Treats delta as CTC-only loading; no PF/ESI/gratuity impact.",
		special: "Adds Special Allowance; usually counts in PF & ESI.",
		fixed: "Fixed monthly earning; ESI eligible, PF excluded.",
		performance: "Variable performance component; ESI eligible.",
		noPfEsi: "Taxable allowance excluded from PF and ESI bases.",
		proportional: "Scales Basic so gross rises by the target amount, preserving % structure."
	}[t];
}
//#endregion
export { SalaryRevisionPage as component };
