import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DaycN9GT.mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { E as Send, Gt as CalendarCheck, Kt as Calculator, S as ShieldCheck, Xt as Bot, f as TriangleAlert, ft as Info, o as Users, ot as LoaderCircle, p as TrendingUp, y as Sparkles } from "../_libs/lucide-react.mjs";
import { n as buildAiSnapshot, r as healthScores, t as askSwiftAi } from "./ai.functions-MiXBoOZ2.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Markdown } from "../_libs/react-markdown+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.ai-JneHRFY6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var QUICK_ASKS = [
	"Give me the payroll health summary for this month.",
	"Which compliance items expire soonest?",
	"List employees who joined this month.",
	"Draft a bullet action plan to raise our compliance score by 10 points.",
	"Which employees are eligible for confirmation?",
	"Summarise today's attendance anomalies."
];
function AiDashboard() {
	const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();
	const snapshot = (0, import_react.useMemo)(() => buildAiSnapshot({
		company,
		employees,
		attendance,
		payrolls,
		leaves,
		docRequests,
		role: "admin"
	}), [
		company,
		employees,
		attendance,
		payrolls,
		leaves,
		docRequests
	]);
	const scores = (0, import_react.useMemo)(() => healthScores(snapshot), [snapshot]);
	const ask = useServerFn(askSwiftAi);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [input, setInput] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const send = async (text) => {
		if (!text.trim() || busy) return;
		const next = [...messages, {
			role: "user",
			content: text
		}];
		setMessages(next);
		setInput("");
		setBusy(true);
		try {
			const res = await ask({ data: {
				messages: next,
				snapshot
			} });
			setMessages((m) => [...m, {
				role: "assistant",
				content: res.ok ? res.content : `⚠️ ${res.error}`
			}]);
		} catch (e) {
			setMessages((m) => [...m, {
				role: "assistant",
				content: `⚠️ ${e.message}`
			}]);
		} finally {
			setBusy(false);
		}
	};
	const sorted = [...snapshot.alerts].sort((a, b) => rank(a) - rank(b));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-9 w-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center shadow-glow",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-3xl font-semibold",
						children: "SWIFT AI Copilot"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground mt-1",
					children: [
						"Live intelligence for ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: company.name }),
						". Ask anything — every answer is grounded in your tenant's data only."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-muted-foreground rounded-lg border border-border px-3 py-2",
					children: [
						"Data scope: ",
						snapshot.headcount.total,
						" employees · ",
						snapshot.payroll.processedThisMonth,
						" payroll runs · ",
						snapshot.documents.pendingApproval,
						" pending docs"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreCard, {
						icon: ShieldCheck,
						title: "Compliance",
						score: scores.compliance,
						tone: "primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreCard, {
						icon: CalendarCheck,
						title: "Attendance (7d)",
						score: scores.attendance,
						tone: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreCard, {
						icon: Calculator,
						title: "Payroll",
						score: scores.payroll,
						tone: "violet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreCard, {
						icon: Users,
						title: "HR Health",
						score: scores.hr,
						tone: "amber"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-2 rounded-2xl border border-border bg-card flex flex-col h-[560px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-4 py-3 border-b border-border flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-4 w-4 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-display font-semibold text-sm",
									children: "Ask SWIFT AI"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto text-[10px] uppercase tracking-wider text-muted-foreground",
									children: "Tenant-isolated"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 overflow-y-auto p-4 space-y-3",
							children: [
								messages.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-sm text-muted-foreground",
										children: "Start with a quick ask:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid sm:grid-cols-2 gap-2",
										children: QUICK_ASKS.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => send(q),
											className: "text-left text-sm rounded-lg border border-border p-2.5 hover:bg-muted transition-colors",
											children: q
										}, q))
									})]
								}),
								messages.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `flex gap-2 ${m.role === "user" ? "justify-end" : ""}`,
									children: [m.role === "assistant" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-5 w-5 shrink-0 text-primary mt-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-table:my-2 prose-headings:my-1",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Markdown, { children: m.content })
										})
									})]
								}, i)),
								busy && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2 items-center text-muted-foreground text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }), " Reasoning over your live tenant data…"]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (e) => {
								e.preventDefault();
								send(input);
							},
							className: "p-3 border-t border-border flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: input,
								onChange: (e) => setInput(e.target.value),
								placeholder: "e.g. Show employees whose probation ends this week",
								disabled: busy
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								disabled: busy || !input.trim(),
								className: "bg-gradient-brand text-white shadow-glow",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" })
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border bg-card flex flex-col h-[560px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-4 py-3 border-b border-border flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-4 w-4 text-primary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display font-semibold text-sm",
								children: "AI Recommendations"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-auto text-xs text-muted-foreground",
								children: sorted.length
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 overflow-y-auto p-3 space-y-2",
						children: [sorted.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm text-muted-foreground p-4 text-center",
							children: "All clear — no anomalies detected."
						}), sorted.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertRow, { a }, a.id))]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						title: "Attendance Today",
						rows: [
							["Present", snapshot.attendance.today.present],
							["Absent", snapshot.attendance.today.absent],
							["On leave", snapshot.attendance.today.leave],
							["Half day", snapshot.attendance.today.halfDay],
							["Late arrivals", snapshot.attendance.today.late]
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						title: "Payroll (this month)",
						rows: [
							["Processed", snapshot.payroll.processedThisMonth],
							["Pending", snapshot.payroll.pending],
							["Total gross (₹)", Math.round(snapshot.payroll.totalMonthlyGross).toLocaleString("en-IN")]
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						title: "Employee Data Gaps",
						rows: [
							["Missing Aadhaar", snapshot.compliance.missingAadhaar],
							["Missing PAN", snapshot.compliance.missingPan],
							["Missing Bank", snapshot.compliance.missingBank],
							["PF issues", snapshot.compliance.pfIssues],
							["ESI breaches", snapshot.compliance.esiBreaches]
						]
					})
				]
			})
		]
	});
}
function rank(a) {
	return a.level === "critical" ? 0 : a.level === "warn" ? 1 : 2;
}
function ScoreCard({ icon: Icon, title, score, tone }) {
	const ring = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-destructive";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: `h-4 w-4 ${ring}` }),
					" ",
					title
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `font-display text-3xl font-semibold mt-1 ${ring}`,
				children: [score, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-muted-foreground font-normal",
					children: "/100"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-1.5 rounded-full bg-muted mt-2 overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `h-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-destructive"}`,
					style: { width: `${score}%` }
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] text-muted-foreground mt-1",
				children: tone
			})
		]
	});
}
function AlertRow({ a }) {
	const styles = a.level === "critical" ? "bg-destructive/10 text-destructive" : a.level === "warn" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-muted/60";
	const Icon = a.level === "info" ? Info : TriangleAlert;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `rounded-lg p-2.5 text-xs ${styles}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5 mt-0.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-medium",
						children: a.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "opacity-80",
						children: a.detail
					}),
					a.action && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "opacity-70 mt-1",
						children: ["→ ", a.action]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 uppercase tracking-wider text-[9px] opacity-60",
						children: a.category
					})
				]
			})]
		})
	});
}
function MetricCard({ title, rows }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-display font-semibold text-sm mb-2",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-1",
			children: rows.map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: k
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					children: v
				})]
			}, k))
		})]
	});
}
//#endregion
export { AiDashboard as component };
