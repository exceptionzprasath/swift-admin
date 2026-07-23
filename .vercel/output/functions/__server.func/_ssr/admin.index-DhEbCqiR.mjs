import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore, i as inr, n as computePayroll } from "./store-Dj1aT4sf.mjs";
import { Gt as CalendarCheck, nn as ArrowUpRight, o as Users, p as TrendingUp, pt as IndianRupee } from "../_libs/lucide-react.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { t as NoticeBoard } from "./notice-board-D1SmFiDH.mjs";
import { a as XAxis, c as Bar, d as ResponsiveContainer, f as Tooltip, i as YAxis, l as Pie, n as PieChart, o as Area, r as BarChart, s as CartesianGrid, t as AreaChart, u as Cell } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.index-DhEbCqiR.js
var import_jsx_runtime = require_jsx_runtime();
function Dashboard() {
	const { employees, attendance, company, payrolls, currentUser } = useStore();
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	const present = attendance.filter((a) => a.date === today).filter((a) => a.status === "present" || a.status === "half-day").length;
	const totalMonthlyCTC = employees.reduce((sum, e) => {
		return sum + computePayroll({
			company,
			employee: e,
			daysWorked: company.workingDaysPerMonth,
			otHours: 0,
			incentive: 0,
			shiftDays: 0,
			loan: 0,
			advance: 0,
			bonus: 0
		}).monthlyCTC;
	}, 0);
	const cards = [
		{
			label: "Total Employees",
			value: employees.length.toString(),
			icon: Users,
			tint: "from-teal to-primary"
		},
		{
			label: "Present Today",
			value: `${present}/${employees.length}`,
			icon: CalendarCheck,
			tint: "from-primary to-teal"
		},
		{
			label: "Monthly Payroll",
			value: inr(totalMonthlyCTC),
			icon: IndianRupee,
			tint: "from-coral to-primary"
		},
		{
			label: "Payrolls Processed",
			value: payrolls.length.toString(),
			icon: TrendingUp,
			tint: "from-primary to-coral"
		}
	];
	const attByDay = Array.from({ length: 7 }).map((_, i) => {
		const d = /* @__PURE__ */ new Date();
		d.setDate(d.getDate() - (6 - i));
		const key = d.toISOString().slice(0, 10);
		return {
			day: d.toLocaleDateString(void 0, { weekday: "short" }),
			present: attendance.filter((a) => a.date === key && a.status === "present").length
		};
	});
	const deptData = Object.entries(employees.reduce((acc, e) => {
		acc[e.department || "Unassigned"] = (acc[e.department || "Unassigned"] || 0) + 1;
		return acc;
	}, {})).map(([name, value]) => ({
		name,
		value
	}));
	const COLORS = [
		"#14a0aa",
		"#f87171",
		"#5eead4",
		"#fb923c",
		"#a78bfa"
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-semibold",
					children: "Welcome back 👋"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Here's what's happening in your organization today."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/admin/employees",
					className: "inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm text-white shadow-glow",
					children: ["Add Employee ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "h-4 w-4" })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
				children: cards.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					initial: {
						opacity: 0,
						y: 12
					},
					animate: {
						opacity: 1,
						y: 0
					},
					transition: { delay: i * .05 },
					className: "rounded-2xl border border-border bg-card p-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: c.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 font-display text-2xl font-semibold",
							children: c.value
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.tint} text-white`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(c.icon, { className: "h-5 w-5" })
						})]
					})
				}, c.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoticeBoard, {
				viewer: { role: "admin" },
				userKey: "admin:" + (currentUser?.name || "admin"),
				compact: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-2 rounded-2xl border border-border bg-card p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-4 flex items-center justify-between",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display font-semibold",
							children: "Attendance last 7 days"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-64",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
							data: attByDay,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
									id: "g",
									x1: "0",
									y1: "0",
									x2: "0",
									y2: "1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
										offset: "0%",
										stopColor: "#14a0aa",
										stopOpacity: .5
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
										offset: "100%",
										stopColor: "#14a0aa",
										stopOpacity: 0
									})]
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									strokeDasharray: "3 3",
									opacity: .2
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "day",
									fontSize: 11
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									fontSize: 11,
									allowDecimals: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
									dataKey: "present",
									stroke: "#14a0aa",
									fill: "url(#g)",
									strokeWidth: 2
								})
							]
						}) })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border bg-card p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-4 font-display font-semibold",
						children: "Departments"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-64",
						children: deptData.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex h-full items-center justify-center text-sm text-muted-foreground",
							children: "No employees yet"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
							data: deptData,
							innerRadius: 50,
							outerRadius: 80,
							dataKey: "value",
							nameKey: "name",
							children: deptData.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: COLORS[i % COLORS.length] }, i))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {})] }) })
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border bg-card p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-4 font-display font-semibold",
					children: "Payroll by employee (monthly gross)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-64",
					children: employees.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-full items-center justify-center text-sm text-muted-foreground",
						children: "Add employees to see payroll breakdown"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
						data: employees.map((e) => {
							const p = computePayroll({
								company,
								employee: e,
								daysWorked: company.workingDaysPerMonth,
								otHours: 0,
								incentive: 0,
								shiftDays: 0,
								loan: 0,
								advance: 0,
								bonus: 0
							});
							return {
								name: e.name.split(" ")[0],
								gross: Math.round(p.gross)
							};
						}),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								strokeDasharray: "3 3",
								opacity: .2
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "name",
								fontSize: 11
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, { fontSize: 11 }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (v) => inr(v) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								dataKey: "gross",
								fill: "#14a0aa",
								radius: [
									6,
									6,
									0,
									0
								]
							})
						]
					}) })
				})]
			})
		]
	});
}
//#endregion
export { Dashboard as component };
