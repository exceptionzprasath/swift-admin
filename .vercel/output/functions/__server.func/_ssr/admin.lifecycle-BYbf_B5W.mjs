import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { a as journeyProgress, f as useStore, t as LIFECYCLE_QUESTIONS } from "./store-Dj1aT4sf.mjs";
import { Ct as FilePenLine, Dt as Download, Ft as CircleCheck, L as Plus, M as Rocket, N as RefreshCw, S as ShieldCheck, _t as GitBranch, h as Trash2, i as WandSparkles, jt as Clock, nt as LogOut, on as ArrowDown, tn as ArrowUp, y as Sparkles } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as aiNotify } from "./ai-guide-bus-KIenmqGq.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-CiapfthD.mjs";
import { t as Switch } from "./switch-CCza_WcE.mjs";
import { t as ESignPad } from "./esign-pad-ChArsuLf.mjs";
import { a as downloadLetter, t as DEFAULT_TEMPLATES } from "./documents-DHY5ZnOl.mjs";
import { t as Progress } from "./progress-Crx1Tb8I.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.lifecycle-BYbf_B5W.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PHASES = [
	{
		value: "recruitment",
		label: "Recruitment",
		icon: Sparkles
	},
	{
		value: "onboarding",
		label: "Onboarding",
		icon: Rocket
	},
	{
		value: "probation",
		label: "Probation",
		icon: Clock
	},
	{
		value: "confirmed",
		label: "Confirmed",
		icon: ShieldCheck
	},
	{
		value: "active",
		label: "Active",
		icon: CircleCheck
	},
	{
		value: "notice",
		label: "Notice",
		icon: GitBranch
	},
	{
		value: "exiting",
		label: "Exiting",
		icon: LogOut
	},
	{
		value: "exited",
		label: "Exited",
		icon: LogOut
	}
];
function LifecyclePage() {
	const { employees, company, docLibrary, journeys, ensureJourney, advanceJourneyStep, autoGenerateAllPending, setJourneyPhase, addLibraryItem, updateLibraryItem, deleteLibraryItem, reorderLibrary, resetLibrary } = useStore();
	const [selectedId, setSelectedId] = (0, import_react.useState)(employees[0]?.id ?? "");
	const selected = employees.find((e) => e.id === selectedId);
	const journey = selected ? journeys.find((j) => j.employeeId === selected.id) : void 0;
	const progress = journeyProgress(journey);
	const startJourney = () => {
		if (!selected) return;
		ensureJourney(selected.id);
		toast.success(`Onboarding journey started for ${selected.name}`);
	};
	const autoGenerate = () => {
		if (!selected) return;
		ensureJourney(selected.id);
		const n = autoGenerateAllPending(selected.id, "SWIFT AI");
		toast.success(`SWIFT AI generated ${n} document${n === 1 ? "" : "s"} automatically`);
	};
	const downloadStep = async (stepId) => {
		if (!selected || !journey) return;
		const step = journey.steps.find((s) => s.id === stepId);
		const meta = step ? docLibrary.find((d) => d.id === step.docId) : void 0;
		if (!step || !meta) return;
		const tpl = meta.letterKey ? DEFAULT_TEMPLATES.find((t) => t.key === meta.letterKey) : void 0;
		if (!tpl) {
			toast.error("This document is a manual form (no auto-template). Configure a template first.");
			return;
		}
		if (![
			"generated",
			"signed",
			"approved"
		].includes(step.status)) {
			toast.error("Not generated yet — click Auto-generate first.");
			return;
		}
		try {
			await downloadLetter(company, selected, tpl, "pdf");
			toast.success(`${meta.title} downloaded`);
		} catch (e) {
			console.error(e);
			toast.error("Download failed");
		}
	};
	const stats = (0, import_react.useMemo)(() => {
		const total = employees.length;
		const started = journeys.length;
		const done = journeys.filter((j) => journeyProgress(j).pct === 100).length;
		return {
			total,
			started,
			done,
			inProgress: started - done
		};
	}, [employees, journeys]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-start justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "font-display text-3xl font-semibold flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-7 w-7 text-primary" }), " AI Employee Lifecycle"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "SWIFT AI orchestrates every document from joining to exit — fully configurable per company."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-4 gap-2 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Employees",
						value: stats.total
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Journeys",
						value: stats.started
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "In Progress",
						value: stats.inProgress,
						tint: "text-amber-600"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Completed",
						value: stats.done,
						tint: "text-emerald-600"
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
			defaultValue: "journeys",
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
					value: "journeys",
					children: "Employee Journeys"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
					value: "library",
					children: "Document Library"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "journeys",
					className: "space-y-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border border-border bg-card p-2 max-h-[70vh] overflow-y-auto",
							children: employees.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-6 text-center text-sm text-muted-foreground",
								children: "No employees yet."
							}) : employees.map((e) => {
								const j = journeys.find((x) => x.employeeId === e.id);
								const pct = journeyProgress(j).pct;
								const active = e.id === selectedId;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setSelectedId(e.id),
									className: `w-full text-left rounded-lg p-3 mb-1 transition-colors ${active ? "bg-gradient-brand text-white" : "hover:bg-muted"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-medium truncate",
												children: e.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `text-xs truncate ${active ? "text-white/80" : "text-muted-foreground"}`,
												children: [
													e.designation,
													" · ",
													e.empCode
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: j ? "secondary" : "outline",
											className: "shrink-0",
											children: j ? `${pct}%` : "New"
										})]
									})
								}, e.id);
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border border-border bg-card p-5 space-y-5",
							children: !selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-center py-16 text-muted-foreground",
								children: "Select an employee."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs uppercase tracking-wide text-muted-foreground",
										children: "Current Employee"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xl font-semibold",
										children: selected.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-sm text-muted-foreground",
										children: [
											selected.designation,
											" · ",
											selected.department,
											" · ",
											selected.empCode
										]
									})
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-2",
									children: !journey ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										onClick: startJourney,
										className: "bg-gradient-brand text-white",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, { className: "h-4 w-4 mr-2" }), " Start Onboarding Journey"]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "outline",
										onClick: autoGenerate,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, { className: "h-4 w-4 mr-2" }), " AI Auto-generate Pending"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: journey.phase,
										onValueChange: (v) => setJourneyPhase(selected.id, v),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
											className: "w-[170px]",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: PHASES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: p.value,
											children: p.label
										}, p.value)) })]
									})] })
								})]
							}), journey && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-xs text-muted-foreground mb-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Progress" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										progress.done,
										" / ",
										progress.total,
										" · ",
										progress.pct,
										"%"
									] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
									value: progress.pct,
									className: "h-2"
								})] }),
								LIFECYCLE_QUESTIONS[`on_${journey.phase}`] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 font-medium mb-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }), " SWIFT AI needs to know"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "list-disc pl-6 text-muted-foreground space-y-0.5",
										children: LIFECYCLE_QUESTIONS[`on_${journey.phase}`].map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: q }, q))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2",
									children: journey.steps.map((s, i) => {
										const meta = docLibrary.find((d) => d.id === s.docId);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3 rounded-lg border border-border p-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: `h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${s.status === "approved" || s.status === "signed" || s.status === "generated" ? "bg-emerald-500 text-white" : s.status === "rejected" ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"}`,
													children: i + 1
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "min-w-0 flex-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2 flex-wrap",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "font-medium truncate",
																children: s.title
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																variant: "outline",
																className: "text-[10px]",
																children: s.code
															}),
															meta?.mandatory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																className: "text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30",
																children: "Mandatory"
															}),
															meta?.autoGenerate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																className: "text-[10px] bg-primary/15 text-primary border-primary/30",
																children: "AI"
															})
														]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "text-xs text-muted-foreground",
														children: [
															"Status: ",
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusChip, { status: s.status }),
															s.approvedBy && ` · by ${s.approvedBy}`
														]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex gap-1 items-center",
													children: [
														s.signatureDataUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
															src: s.signatureDataUrl,
															alt: "sig",
															className: "h-7 max-w-[80px] object-contain bg-white rounded border border-border",
															title: `Signed by ${s.signedBy}`
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
															asChild: true,
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
																size: "sm",
																variant: "ghost",
																title: "Sign / e-sign",
																children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePenLine, { className: "h-4 w-4" })
															})
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
															className: "max-w-lg",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Sign · ", s.title] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ESignPad, {
																defaultName: selected.name,
																onSign: (dataUrl, meta) => {
																	useStore.setState((st) => ({ journeys: st.journeys.map((j) => j.employeeId === selected.id ? {
																		...j,
																		steps: j.steps.map((x) => x.id === s.id ? {
																			...x,
																			status: "signed",
																			signedAt: (/* @__PURE__ */ new Date()).toISOString(),
																			signatureDataUrl: dataUrl,
																			signedBy: meta.signedBy,
																			signedByRole: "HR"
																		} : x)
																	} : j) }));
																	aiNotify({
																		title: `✍️ ${s.code} signed`,
																		body: `${s.title} by ${meta.signedBy}`,
																		kind: "success"
																	});
																	toast.success("Signed");
																}
															})]
														})] }),
														meta?.letterKey && s.status !== "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
															size: "sm",
															variant: "ghost",
															onClick: () => downloadStep(s.id),
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" })
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
															value: s.status,
															onValueChange: (v) => advanceJourneyStep(selected.id, s.id, v, "HR"),
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
																className: "h-8 w-[130px] text-xs",
																children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
																	value: "pending",
																	children: "Pending"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
																	value: "in_progress",
																	children: "In progress"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
																	value: "generated",
																	children: "Generated"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
																	value: "signed",
																	children: "Signed"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
																	value: "approved",
																	children: "Approved"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
																	value: "skipped",
																	children: "Skipped"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
																	value: "rejected",
																	children: "Rejected"
																})
															] })]
														})
													]
												})
											]
										}, s.id);
									})
								})
							] })] })
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
					value: "library",
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Every document is configurable — sequence, permissions, mandatory, auto-generate, seals, signatures."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => {
									resetLibrary();
									toast.success("Library reset to defaults");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-4 w-4 mr-2" }), " Reset"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								className: "bg-gradient-brand text-white",
								onClick: () => {
									const item = addLibraryItem({
										code: "NEW",
										title: "New Document",
										category: "Custom",
										sequence: docLibrary.length + 1,
										mandatory: false,
										autoGenerate: false,
										approvalRequired: true,
										digitalSignatureRequired: false,
										sealRequired: false,
										confidential: false,
										employeeVisible: true,
										permissions: {
											create: ["hr"],
											read: [
												"employee",
												"hr",
												"admin"
											],
											edit: ["hr"],
											approve: ["hr"],
											download: ["employee", "hr"]
										},
										trigger: "manual",
										language: "en",
										version: "1.0",
										active: true
									});
									toast.success(`Added ${item.code}`);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " Add Document"]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-2xl border border-border bg-card overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-sm min-w-[900px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-muted/50 text-left",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3 w-16",
										children: "Seq"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3",
										children: "Code"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3",
										children: "Title"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3",
										children: "Category"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3",
										children: "Trigger"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3 text-center",
										children: "Auto AI"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3 text-center",
										children: "Mandatory"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3 text-center",
										children: "Signature"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3 text-center",
										children: "Seal"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3 text-center",
										children: "Active"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-3 text-right",
										children: "Order"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: [...docLibrary].sort((a, b) => a.sequence - b.sequence).map((d, idx, arr) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-border",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 font-mono text-xs",
										children: d.sequence
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: d.code,
											onChange: (e) => updateLibraryItem(d.id, { code: e.target.value }),
											className: "h-8 w-20 font-mono"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: d.title,
											onChange: (e) => updateLibraryItem(d.id, { title: e.target.value }),
											className: "h-8 min-w-[200px]"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: d.category,
											onChange: (e) => updateLibraryItem(d.id, { category: e.target.value }),
											className: "h-8 w-32"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: d.trigger,
											onValueChange: (v) => updateLibraryItem(d.id, { trigger: v }),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
												className: "h-8 w-[160px] text-xs",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [
												"on_registration",
												"on_probation",
												"on_confirmation",
												"on_promotion",
												"on_transfer",
												"on_exit",
												"on_request",
												"manual"
											].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: t,
												children: t.replace(/_/g, " ")
											}, t)) })]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: d.autoGenerate,
											onCheckedChange: (v) => updateLibraryItem(d.id, { autoGenerate: v })
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: d.mandatory,
											onCheckedChange: (v) => updateLibraryItem(d.id, { mandatory: v })
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: d.digitalSignatureRequired,
											onCheckedChange: (v) => updateLibraryItem(d.id, { digitalSignatureRequired: v })
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: d.sealRequired,
											onCheckedChange: (v) => updateLibraryItem(d.id, { sealRequired: v })
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: d.active,
											onCheckedChange: (v) => updateLibraryItem(d.id, { active: v })
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-right",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "inline-flex gap-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
													size: "icon",
													variant: "ghost",
													className: "h-7 w-7",
													disabled: idx === 0,
													onClick: () => {
														const ids = arr.map((x) => x.id);
														[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
														reorderLibrary(ids);
													},
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "h-3.5 w-3.5" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
													size: "icon",
													variant: "ghost",
													className: "h-7 w-7",
													disabled: idx === arr.length - 1,
													onClick: () => {
														const ids = arr.map((x) => x.id);
														[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
														reorderLibrary(ids);
													},
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { className: "h-3.5 w-3.5" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
													size: "icon",
													variant: "ghost",
													className: "h-7 w-7 text-red-500",
													onClick: () => {
														deleteLibraryItem(d.id);
														toast.success(`Removed ${d.code}`);
													},
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
												})
											]
										})
									})
								]
							}, d.id)) })]
						})
					})]
				})
			]
		})]
	});
}
function Stat({ label, value, tint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card px-4 py-2 min-w-[90px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-xl font-semibold ${tint ?? ""}`,
			children: value
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[10px] uppercase tracking-wider text-muted-foreground",
			children: label
		})]
	});
}
function StatusChip({ status }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `font-medium ${{
			pending: "text-muted-foreground",
			in_progress: "text-amber-600",
			generated: "text-primary",
			signed: "text-primary",
			approved: "text-emerald-600",
			skipped: "text-muted-foreground",
			rejected: "text-red-600"
		}[status]}`,
		children: status.replace(/_/g, " ")
	});
}
//#endregion
export { LifecyclePage as component };
