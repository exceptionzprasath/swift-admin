import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore, i as inr } from "./store-Dj1aT4sf.mjs";
import { Tt as FileDown, xt as FileText } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.reports-BHVYx3Yg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var REPORTS = [
	{
		key: "salary_register",
		label: "Salary Register",
		desc: "Complete payslip snapshot for the month."
	},
	{
		key: "bank_transfer",
		label: "Bank Transfer Statement",
		desc: "Net-pay bank file with IFSC and account."
	},
	{
		key: "epf",
		label: "EPF Report",
		desc: "Employee + employer PF with UAN placeholder."
	},
	{
		key: "esi",
		label: "ESI Report",
		desc: "Employee + employer ESI contributions."
	},
	{
		key: "pt",
		label: "Professional Tax",
		desc: "PT collected per employee."
	},
	{
		key: "bonus",
		label: "Bonus Register",
		desc: "Bonus / incentive / arrears paid."
	},
	{
		key: "gratuity",
		label: "Gratuity Provision",
		desc: "Employer gratuity accrual for the month."
	},
	{
		key: "department",
		label: "Department Cost",
		desc: "Aggregated employer cost per department."
	},
	{
		key: "variance",
		label: "Variance vs Last Month",
		desc: "Month-on-month delta in gross / net / employer cost."
	},
	{
		key: "audit",
		label: "Audit Report",
		desc: "Payroll runs, revisions, approvals trail."
	}
];
function ReportsPage() {
	const { payrolls, employees, salaryRevisions } = useStore();
	const [month, setMonth] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 7));
	const [active, setActive] = (0, import_react.useState)("salary_register");
	const rows = (0, import_react.useMemo)(() => buildRows(active, {
		payrolls,
		employees,
		salaryRevisions,
		month
	}), [
		active,
		payrolls,
		employees,
		salaryRevisions,
		month
	]);
	const download = () => {
		if (!rows.length) return;
		const headers = Object.keys(rows[0]);
		const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${active}-${month}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl font-semibold",
			children: "Payroll Reports"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "Every statutory, compliance and audit register — one click to CSV."
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-[280px_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border border-border bg-card p-3 space-y-1",
				children: REPORTS.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setActive(r.key),
					className: `w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${active === r.key ? "bg-gradient-brand text-white shadow-soft" : "hover:bg-muted"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "font-medium flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-3.5 w-3.5" }), r.label]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `text-xs ${active === r.key ? "text-white/80" : "text-muted-foreground"}`,
						children: r.desc
					})]
				}, r.key))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border bg-card p-6 space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Month" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "month",
						value: month,
						onChange: (e) => setMonth(e.target.value)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "ml-auto",
						onClick: download,
						disabled: !rows.length,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4 mr-2" }), " Download CSV"]
					})]
				}), rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground",
					children: [
						"No data for ",
						month,
						". Run payroll first."
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-auto rounded-lg border border-border",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "min-w-full text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "bg-muted/60",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: Object.keys(rows[0]).map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-3 py-2 font-medium",
								children: h
							}, h)) })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
							className: "border-t border-border",
							children: Object.keys(rows[0]).map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2",
								children: formatCell(r[h])
							}, h))
						}, i)) })]
					})
				})]
			})]
		})]
	});
}
function formatCell(v) {
	if (typeof v === "number") return inr(v);
	return String(v ?? "");
}
function buildRows(key, ctx) {
	const { payrolls, employees, salaryRevisions, month } = ctx;
	const monthly = payrolls.filter((p) => p.month === month);
	const empOf = (id) => employees.find((e) => e.id === id);
	switch (key) {
		case "salary_register": return monthly.map((p) => {
			const e = empOf(p.employeeId);
			return {
				EmpCode: e?.empCode ?? "",
				Name: e?.name ?? "",
				Department: e?.department ?? "",
				Days: p.daysWorked,
				Gross: p.computed.gross,
				EmployeePF: p.computed.deductions.employeePF,
				EmployeeESI: p.computed.deductions.employeeESI,
				PT: p.computed.deductions.professionalTax,
				TDS: p.computed.deductions.tds,
				TotalDed: p.computed.totalDeductions,
				Net: p.computed.net
			};
		});
		case "bank_transfer": return monthly.map((p) => {
			const e = empOf(p.employeeId);
			return {
				EmpCode: e?.empCode ?? "",
				Name: e?.name ?? "",
				Bank: e?.bankAcc ?? "MISSING",
				IFSC: e?.bankIfsc ?? "MISSING",
				Amount: p.computed.net
			};
		});
		case "epf": return monthly.filter((p) => p.computed.deductions.employeePF > 0).map((p) => {
			const e = empOf(p.employeeId);
			return {
				EmpCode: e?.empCode ?? "",
				Name: e?.name ?? "",
				UAN: e?.uan ?? "MISSING",
				PFBase: p.computed.pfBase,
				EmployeePF: p.computed.deductions.employeePF,
				EmployerPF: p.computed.employerContrib.employerPF
			};
		});
		case "esi": return monthly.filter((p) => p.computed.deductions.employeeESI > 0).map((p) => {
			const e = empOf(p.employeeId);
			return {
				EmpCode: e?.empCode ?? "",
				Name: e?.name ?? "",
				Gross: p.computed.gross,
				EmployeeESI: p.computed.deductions.employeeESI,
				EmployerESI: p.computed.employerContrib.employerESI
			};
		});
		case "pt": return monthly.map((p) => {
			const e = empOf(p.employeeId);
			return {
				EmpCode: e?.empCode ?? "",
				Name: e?.name ?? "",
				Gross: p.computed.gross,
				PT: p.computed.deductions.professionalTax
			};
		});
		case "bonus": return monthly.map((p) => {
			const e = empOf(p.employeeId);
			return {
				EmpCode: e?.empCode ?? "",
				Name: e?.name ?? "",
				Bonus: p.bonus,
				Incentive: p.incentive,
				OTHours: p.otHours
			};
		});
		case "gratuity": return monthly.map((p) => {
			const e = empOf(p.employeeId);
			return {
				EmpCode: e?.empCode ?? "",
				Name: e?.name ?? "",
				GratuityProvision: p.computed.employerContrib.gratuity
			};
		});
		case "department": {
			const map = /* @__PURE__ */ new Map();
			for (const p of monthly) {
				const d = empOf(p.employeeId)?.department ?? "—";
				const row = map.get(d) ?? {
					Employees: 0,
					Gross: 0,
					EmployerCost: 0,
					Net: 0
				};
				row.Employees += 1;
				row.Gross += p.computed.gross;
				row.EmployerCost += p.computed.totalEmployer;
				row.Net += p.computed.net;
				map.set(d, row);
			}
			return Array.from(map.entries()).map(([Department, r]) => ({
				Department,
				...r
			}));
		}
		case "variance": {
			const [y, m] = month.split("-").map(Number);
			const prev = new Date(y, m - 2, 1).toISOString().slice(0, 7);
			const prevRuns = payrolls.filter((p) => p.month === prev);
			return monthly.map((cur) => {
				const p = prevRuns.find((r) => r.employeeId === cur.employeeId);
				const e = empOf(cur.employeeId);
				return {
					EmpCode: e?.empCode ?? "",
					Name: e?.name ?? "",
					PrevGross: p?.computed.gross ?? 0,
					CurGross: cur.computed.gross,
					DeltaGross: cur.computed.gross - (p?.computed.gross ?? 0),
					DeltaNet: cur.computed.net - (p?.computed.net ?? 0)
				};
			});
		}
		case "audit": return [...monthly.map((p) => {
			const e = empOf(p.employeeId);
			return {
				Type: "Payroll Run",
				When: p.createdAt.slice(0, 10),
				Employee: e?.name ?? "",
				Detail: `Net ${inr(p.computed.net)}`,
				Ref: p.id.slice(0, 8)
			};
		}), ...salaryRevisions.map((r) => {
			const e = empOf(r.employeeId);
			return {
				Type: `Revision · ${r.status}`,
				When: r.createdAt.slice(0, 10),
				Employee: e?.name ?? "",
				Detail: `+${inr(r.amount)} (${r.target})`,
				Ref: r.id.slice(0, 8)
			};
		})];
	}
}
//#endregion
export { ReportsPage as component };
