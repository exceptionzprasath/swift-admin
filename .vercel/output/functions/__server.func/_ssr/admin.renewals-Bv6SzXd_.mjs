import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { $t as BellRing, B as Phone, F as Radio, J as MessageSquare, R as Play, f as TriangleAlert, jt as Clock, tt as Mail, x as ShieldOff } from "../_libs/lucide-react.mjs";
import { n as cn, t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { c as useBilling } from "./billing-store-CiCO_-nX.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CfEwGGLW.mjs";
import { t as Switch } from "./switch-CCza_WcE.mjs";
import { t as useSubscriptionContext } from "./feature-gate-DT1k671E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.renewals-Bv6SzXd_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Table = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: "relative w-full overflow-auto",
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
		ref,
		className: cn("w-full caption-bottom text-sm", className),
		...props
	})
}));
Table.displayName = "Table";
var TableHeader = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
	ref,
	className: cn("[&_tr]:border-b", className),
	...props
}));
TableHeader.displayName = "TableHeader";
var TableBody = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
	ref,
	className: cn("[&_tr:last-child]:border-0", className),
	...props
}));
TableBody.displayName = "TableBody";
var TableFooter = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tfoot", {
	ref,
	className: cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
	...props
}));
TableFooter.displayName = "TableFooter";
var TableRow = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
	ref,
	className: cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className),
	...props
}));
TableRow.displayName = "TableRow";
var TableHead = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
	ref,
	className: cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className),
	...props
}));
TableHead.displayName = "TableHead";
var TableCell = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
	ref,
	className: cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className),
	...props
}));
TableCell.displayName = "TableCell";
var TableCaption = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("caption", {
	ref,
	className: cn("mt-4 text-sm text-muted-foreground", className),
	...props
}));
TableCaption.displayName = "TableCaption";
var channelMeta = {
	email: {
		label: "Email",
		icon: Mail
	},
	sms: {
		label: "SMS",
		icon: Phone
	},
	whatsapp: {
		label: "WhatsApp",
		icon: MessageSquare
	},
	push: {
		label: "Push",
		icon: BellRing
	},
	banner: {
		label: "In-app banner",
		icon: Radio
	}
};
var stageMeta = {
	"pre-30": {
		label: "30 days before",
		tone: "bg-emerald-500/10 text-emerald-600"
	},
	"pre-15": {
		label: "15 days before",
		tone: "bg-emerald-500/10 text-emerald-600"
	},
	"pre-7": {
		label: "7 days before",
		tone: "bg-amber-500/10 text-amber-600"
	},
	"pre-3": {
		label: "3 days before",
		tone: "bg-amber-500/10 text-amber-600"
	},
	"pre-1": {
		label: "1 day before",
		tone: "bg-orange-500/10 text-orange-600"
	},
	"renewal-day": {
		label: "Renewal day",
		tone: "bg-primary/10 text-primary"
	},
	"grace": {
		label: "Grace start",
		tone: "bg-yellow-500/10 text-yellow-700"
	},
	"final-warning": {
		label: "Final warning",
		tone: "bg-red-500/10 text-red-600"
	},
	"expired": {
		label: "Expired",
		tone: "bg-destructive/10 text-destructive"
	}
};
function RenewalsPage() {
	const { tenantId, sub } = useSubscriptionContext();
	const { reminderConfig, reminderLog, updateReminderConfig, setReminderChannel, runRenewalScheduler, previewReminderPlan, clearReminderLog } = useBilling();
	const [offsetsText, setOffsetsText] = (0, import_react.useState)(reminderConfig.offsets.join(", "));
	(0, import_react.useEffect)(() => {
		setOffsetsText(reminderConfig.offsets.join(", "));
	}, [reminderConfig.offsets]);
	(0, import_react.useEffect)(() => {
		runRenewalScheduler();
		const id = setInterval(() => runRenewalScheduler(), 3e4);
		return () => clearInterval(id);
	}, [runRenewalScheduler]);
	const plan = (0, import_react.useMemo)(() => sub ? previewReminderPlan(sub.id) : [], [
		sub,
		previewReminderPlan,
		reminderConfig
	]);
	const subLog = reminderLog.filter((l) => !sub || l.subscriptionId === sub.id);
	const saveOffsets = () => {
		const arr = offsetsText.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
		updateReminderConfig({ offsets: Array.from(new Set(arr)).sort((a, b) => b - a) });
		toast.success("Reminder offsets updated");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellRing, { className: "h-6 w-6 text-primary" }), " Renewal Scheduler"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Automated multi-channel reminders with grace period and status transitions."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						onClick: () => {
							runRenewalScheduler();
							toast.success("Scheduler tick executed");
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-4 w-4 mr-2" }), " Run now"]
					})
				})]
			}),
			sub && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
						className: "pb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Current status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
							className: "capitalize",
							children: sub.status
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "text-xs text-muted-foreground flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }),
							" Expires ",
							new Date(sub.expiresAt).toLocaleString()
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
						className: "pb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Grace period" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, { children: [reminderConfig.gracePeriodDays, " days"] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "text-xs text-muted-foreground flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3 w-3" }),
							" Final warning at ",
							reminderConfig.finalWarningDays,
							" days remaining"
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
						className: "pb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Auto-suspend" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: reminderConfig.autoSuspend ? "Enabled" : "Off" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "text-xs text-muted-foreground flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldOff, { className: "h-3 w-3" }), " Locks access after grace"]
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "config",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "config",
							children: "Configuration"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "upcoming",
							children: "Upcoming reminders"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "log",
							children: [
								"Send log (",
								subLog.length,
								")"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "templates",
							children: "Templates"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "config",
						className: "space-y-4 mt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Reminder schedule" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Days before expiry to notify. Comma separated." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "grid gap-4 md:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Offsets (days before)" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												value: offsetsText,
												onChange: (e) => setOffsetsText(e.target.value),
												placeholder: "30, 15, 7, 3, 1"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												onClick: saveOffsets,
												children: "Save"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-wrap gap-1",
											children: reminderConfig.offsets.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
												variant: "secondary",
												children: [
													"T-",
													o,
													"d"
												]
											}, o))
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Grace period (days)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												type: "number",
												min: 0,
												value: reminderConfig.gracePeriodDays,
												onChange: (e) => updateReminderConfig({ gracePeriodDays: Math.max(0, Number(e.target.value)) })
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Final warning (days before suspend)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												type: "number",
												min: 0,
												value: reminderConfig.finalWarningDays,
												onChange: (e) => updateReminderConfig({ finalWarningDays: Math.max(0, Number(e.target.value)) })
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "col-span-2 flex items-center justify-between rounded-lg border p-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Auto-suspend after grace" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-muted-foreground",
												children: "Move to suspended when grace ends."
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: reminderConfig.autoSuspend,
												onCheckedChange: (v) => updateReminderConfig({ autoSuspend: v })
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Quiet hours start (0-23)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												type: "number",
												min: 0,
												max: 23,
												value: reminderConfig.quietHours?.start ?? "",
												onChange: (e) => updateReminderConfig({ quietHours: {
													start: Number(e.target.value || 0),
													end: reminderConfig.quietHours?.end ?? 8
												} })
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Quiet hours end (0-23)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												type: "number",
												min: 0,
												max: 23,
												value: reminderConfig.quietHours?.end ?? "",
												onChange: (e) => updateReminderConfig({ quietHours: {
													start: reminderConfig.quietHours?.start ?? 22,
													end: Number(e.target.value || 0)
												} })
											})]
										})
									]
								})]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Channels" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Global default channels. Per-subscription overrides below." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
								className: "grid gap-3 md:grid-cols-5",
								children: Object.keys(channelMeta).map((c) => {
									const Icon = channelMeta[c].icon;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between rounded-lg border p-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm",
												children: channelMeta[c].label
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: reminderConfig.channels[c],
											onCheckedChange: (v) => updateReminderConfig({ channels: {
												...reminderConfig.channels,
												[c]: v
											} })
										})]
									}, c);
								})
							})] }),
							sub && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "This subscription — channel overrides" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
								className: "grid gap-3 md:grid-cols-5",
								children: Object.keys(channelMeta).map((c) => {
									const Icon = channelMeta[c].icon;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between rounded-lg border p-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm",
												children: channelMeta[c].label
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: sub.reminderChannels[c],
											onCheckedChange: (v) => setReminderChannel(sub.id, c, v)
										})]
									}, c);
								})
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "upcoming",
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Reminder timeline" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Computed from current expiry + config." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Stage" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Due at" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Δ from expiry" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Channels" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Status" })
						] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [plan.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							colSpan: 5,
							className: "text-center text-muted-foreground py-8",
							children: "No subscription yet."
						}) }), plan.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `px-2 py-0.5 rounded text-xs ${stageMeta[p.stage].tone}`,
								children: stageMeta[p.stage].label
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								className: "text-sm",
								children: new Date(p.dueAt).toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								className: "text-sm",
								children: p.daysFromExpiry === 0 ? "renewal day" : p.daysFromExpiry < 0 ? `T${p.daysFromExpiry}d` : `+${p.daysFromExpiry}d`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								className: "text-xs",
								children: p.channels.join(", ") || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: p.status === "due" ? "default" : "secondary",
								children: p.status
							}) })
						] }, p.stage))] })] }) })] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "log",
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
							className: "flex flex-row items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Send log" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Latest reminder dispatches." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => {
									clearReminderLog(sub?.id);
									toast.success("Log cleared");
								},
								children: "Clear"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Sent" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Stage" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Channels" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Message" })
						] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [subLog.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							colSpan: 4,
							className: "text-center text-muted-foreground py-8",
							children: "No reminders sent yet. Click \"Run now\" to trigger."
						}) }), subLog.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								className: "text-xs whitespace-nowrap",
								children: new Date(l.sentAt).toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `px-2 py-0.5 rounded text-xs ${stageMeta[l.stage].tone}`,
								children: stageMeta[l.stage].label
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								className: "text-xs",
								children: l.channels.join(", ")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								className: "text-sm",
								children: l.message
							})
						] }, l.id))] })] }) })] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "templates",
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Message templates" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
							"Supports ",
							"{graceDays}",
							" and ",
							"{daysLeft}",
							" placeholders."
						] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "space-y-3",
							children: Object.keys(stageMeta).map((stage) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs uppercase tracking-wide",
									children: stageMeta[stage].label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 2,
									value: reminderConfig.templates[stage] ?? "",
									onChange: (e) => updateReminderConfig({ templates: {
										...reminderConfig.templates,
										[stage]: e.target.value
									} })
								})]
							}, stage))
						})] })
					})
				]
			})
		]
	});
}
//#endregion
export { RenewalsPage as component };
