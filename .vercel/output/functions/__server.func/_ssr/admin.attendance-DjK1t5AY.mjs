import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { Ft as CircleCheck, Pt as CircleX, jt as Clock } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.attendance-DjK1t5AY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AttendancePage() {
	const { employees, attendance, upsertAttendance, company } = useStore();
	const [date, setDate] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const rows = (0, import_react.useMemo)(() => employees.map((e) => {
		return {
			emp: e,
			rec: attendance.find((a) => a.employeeId === e.id && a.date === date)
		};
	}), [
		employees,
		attendance,
		date
	]);
	const mark = (empId, status) => {
		const existing = attendance.find((a) => a.employeeId === empId && a.date === date);
		upsertAttendance({
			id: existing?.id || crypto.randomUUID(),
			employeeId: empId,
			date,
			status,
			hoursWorked: status === "present" ? company.workingHoursPerDay : status === "half-day" ? company.workingHoursPerDay / 2 : 0,
			otHours: existing?.otHours || 0,
			checkIn: existing?.checkIn,
			checkOut: existing?.checkOut
		});
		toast.success(`Marked ${status}`);
	};
	const setOT = (empId, hours) => {
		const existing = attendance.find((a) => a.employeeId === empId && a.date === date);
		upsertAttendance({
			id: existing?.id || crypto.randomUUID(),
			employeeId: empId,
			date,
			status: existing?.status || "present",
			hoursWorked: existing?.hoursWorked ?? company.workingHoursPerDay,
			otHours: hours,
			checkIn: existing?.checkIn,
			checkOut: existing?.checkOut
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between flex-wrap gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-semibold",
				children: "Attendance"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Track daily attendance and overtime for payroll calculation."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "date",
					value: date,
					onChange: (e) => setDate(e.target.value),
					className: "w-auto"
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rounded-2xl border border-border bg-card overflow-hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-muted/50",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "text-left",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "Employee"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "Department"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "Status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "OT hrs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3 text-right",
								children: "Mark"
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					colSpan: 5,
					className: "p-10 text-center text-muted-foreground",
					children: "No employees"
				}) }), rows.map(({ emp, rec }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: emp.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground",
								children: emp.empCode
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "p-3",
							children: emp.department
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "p-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, { status: rec?.status })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "p-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								className: "w-20",
								value: rec?.otHours ?? 0,
								onChange: (e) => setOT(emp.id, +e.target.value || 0)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "p-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-end gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => mark(emp.id, "present"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => mark(emp.id, "half-day"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-4 w-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => mark(emp.id, "leave"),
										children: "L"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => mark(emp.id, "absent"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-4 w-4" })
									})
								]
							})
						})
					]
				}, emp.id))] })]
			})
		})]
	});
}
function StatusPill({ status }) {
	if (!status) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-xs text-muted-foreground",
		children: "—"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `rounded-full px-2 py-0.5 text-xs font-medium ${{
			present: "bg-teal-soft text-primary",
			absent: "bg-destructive/10 text-destructive",
			leave: "bg-accent text-accent-foreground",
			"half-day": "bg-coral-soft text-accent-foreground"
		}[status]}`,
		children: status
	});
}
//#endregion
export { AttendancePage as component };
