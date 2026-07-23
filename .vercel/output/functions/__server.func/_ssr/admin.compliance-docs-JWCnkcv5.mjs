import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { D as Search, Dt as Download, H as PenLine, I as QrCode, S as ShieldCheck, X as MessageCircle, dt as Layers, h as Trash2, sn as Archive, tt as Mail, v as Stamp, xt as FileText, y as Sparkles } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { a as renderComplianceDocPDF, i as parseComplianceCommand, n as blobToDataUrl, o as useComplianceDocs, r as findDocsByQuery, t as COMPLIANCE_DOC_CATALOG } from "./compliance-docs-store-DGgrXYQT.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as require_lib } from "../_libs/jszip+[...].mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.compliance-docs-JWCnkcv5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
var MASTER_REGISTERS = [
	{
		id: "reg_employee",
		name: "Employee Register",
		act: "S&E Act / Factories Act",
		frequency: "continuous",
		autoSource: "employees"
	},
	{
		id: "reg_attendance",
		name: "Attendance Register",
		act: "S&E Act / Factories Act",
		frequency: "daily",
		autoSource: "attendance"
	},
	{
		id: "reg_muster",
		name: "Muster Roll",
		act: "Factories Act — Form 25",
		frequency: "monthly",
		autoSource: "attendance",
		specId: "tn_fact_form_25"
	},
	{
		id: "reg_adult_worker",
		name: "Adult Worker Register",
		act: "Factories Act — Form 8",
		frequency: "monthly",
		autoSource: "employees",
		specId: "tn_fact_form_8"
	},
	{
		id: "reg_young_worker",
		name: "Young Worker Register",
		act: "Factories Act — Form 8A",
		frequency: "monthly",
		autoSource: "employees",
		specId: "tn_fact_form_8a"
	},
	{
		id: "reg_leave",
		name: "Leave Register",
		act: "S&E Act — Form D",
		frequency: "annual",
		autoSource: "leaves",
		specId: "tn_shops_form_d"
	},
	{
		id: "reg_lww",
		name: "Leave with Wages Register",
		act: "Factories Act — Form 12",
		frequency: "annual",
		autoSource: "leaves",
		specId: "tn_fact_form_12"
	},
	{
		id: "reg_salary",
		name: "Salary Register",
		act: "Payment of Wages Act",
		frequency: "monthly",
		autoSource: "payrolls"
	},
	{
		id: "reg_wage",
		name: "Wage Register",
		act: "Factories Act — Form 25B",
		frequency: "monthly",
		autoSource: "payrolls",
		specId: "tn_fact_form_25b"
	},
	{
		id: "reg_pf",
		name: "PF Register",
		act: "EPF & MP Act",
		frequency: "monthly",
		autoSource: "payrolls"
	},
	{
		id: "reg_esi",
		name: "ESI Register",
		act: "ESI Act",
		frequency: "monthly",
		autoSource: "payrolls"
	},
	{
		id: "reg_pt",
		name: "PT Register",
		act: "Professional Tax Act",
		frequency: "monthly",
		autoSource: "payrolls"
	},
	{
		id: "reg_lwf",
		name: "LWF Register",
		act: "Labour Welfare Fund Act",
		frequency: "half_yearly",
		autoSource: "payrolls"
	},
	{
		id: "reg_bonus",
		name: "Bonus Register",
		act: "Payment of Bonus Act",
		frequency: "annual",
		autoSource: "payrolls"
	},
	{
		id: "reg_accident",
		name: "Accident Register",
		act: "Factories Act — Form 15",
		frequency: "on_event",
		autoSource: "incidents",
		specId: "tn_fact_form_15"
	},
	{
		id: "reg_medical",
		name: "Medical Register",
		act: "Factories Act",
		frequency: "annual",
		autoSource: "medical"
	},
	{
		id: "reg_inspection",
		name: "Inspection Register",
		act: "Factories Act — Form 26",
		frequency: "on_event",
		autoSource: "inspections",
		specId: "tn_fact_form_26"
	},
	{
		id: "reg_asset",
		name: "Asset Register",
		act: "Company Policy",
		frequency: "continuous",
		autoSource: "assets"
	},
	{
		id: "reg_visitor",
		name: "Visitor Register",
		act: "Company Policy",
		frequency: "daily",
		autoSource: "visitors"
	},
	{
		id: "reg_training",
		name: "Training Register",
		act: "Skill Development Policy",
		frequency: "continuous",
		autoSource: "training"
	},
	{
		id: "reg_contract_labour",
		name: "Contract Labour Register",
		act: "CLRA Act, 1970",
		frequency: "monthly",
		autoSource: "employees"
	}
];
function specFor(registerId) {
	const r = MASTER_REGISTERS.find((x) => x.id === registerId);
	if (!r?.specId) return void 0;
	return COMPLIANCE_DOC_CATALOG.find((s) => s.id === r.specId);
}
function Page() {
	const { company, employees } = useStore();
	const [q, setQ] = (0, import_react.useState)("");
	const [aiCmd, setAiCmd] = (0, import_react.useState)("");
	const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [busy, setBusy] = (0, import_react.useState)(false);
	const { docs, archive, signDoc, remove } = useComplianceDocs();
	const results = (0, import_react.useMemo)(() => q.trim() ? findDocsByQuery(q) : COMPLIANCE_DOC_CATALOG, [q]);
	const grouped = (0, import_react.useMemo)(() => {
		const g = {};
		for (const r of results) (g[r.act] ||= []).push(r);
		return g;
	}, [results]);
	const toggle = (id) => {
		setSelected((s) => {
			const n = new Set(s);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	};
	const generateOne = async (spec) => {
		setBusy(true);
		try {
			const { blob, filename, ref } = await renderComplianceDocPDF(spec, {
				company,
				employees
			});
			const dataUrl = await blobToDataUrl(blob);
			archive({
				specId: spec.id,
				code: spec.code,
				title: spec.title,
				ref,
				filename,
				dataUrl,
				size: blob.size,
				createdBy: "admin@swift",
				approvals: [],
				signed: false,
				sealed: !!spec.requiresSeal,
				watermark: spec.watermark,
				tags: [spec.act, spec.kind]
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(`${spec.code} generated & archived`);
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	};
	const generateBulk = async (specs) => {
		if (!specs.length) return toast.error("Nothing selected");
		setBusy(true);
		try {
			const zip = new import_lib.default();
			for (const s of specs) {
				const { blob, filename, ref } = await renderComplianceDocPDF(s, {
					company,
					employees
				});
				zip.file(filename, blob);
				const dataUrl = await blobToDataUrl(blob);
				archive({
					specId: s.id,
					code: s.code,
					title: s.title,
					ref,
					filename,
					dataUrl,
					size: blob.size,
					createdBy: "admin@swift",
					approvals: [],
					signed: false,
					sealed: !!s.requiresSeal,
					watermark: s.watermark,
					tags: [s.act, s.kind]
				});
			}
			const bundle = await zip.generateAsync({ type: "blob" });
			const url = URL.createObjectURL(bundle);
			const a = document.createElement("a");
			a.href = url;
			a.download = `SWIFT_Compliance_Bundle_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.zip`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(`Generated ${specs.length} document(s)`);
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	};
	const runAiCommand = async () => {
		const specs = parseComplianceCommand(aiCmd);
		if (!specs.length) return toast.error("I couldn't match that. Try 'generate Form 12' or 'generate all monthly statutory documents'.");
		toast(`SWIFT AI matched ${specs.length} document(s)`);
		await generateBulk(specs);
		setAiCmd("");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-display font-bold flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-6 w-6 text-primary" }), "Compliance Document Automation"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground mt-1",
				children: "Government forms, registers, returns, notices, licences, letters, certificates, reports — auto-filled from Company, Branches, Employees, Attendance, Payroll, Leave, Assets & Compliance masters."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-gradient-brand/10 p-4 flex flex-col sm:flex-row gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5 text-primary shrink-0 mt-2 sm:mt-0" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: aiCmd,
						onChange: (e) => setAiCmd(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter") runAiCommand();
						},
						placeholder: "Ask SWIFT AI — 'Generate Form 12', 'Generate Wage Register', 'Generate all monthly statutory documents'…",
						className: "flex-1 bg-background"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: runAiCommand,
						disabled: busy || !aiCmd.trim(),
						className: "bg-gradient-brand text-white",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 mr-1" }), " Run"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "catalog",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "catalog",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4 mr-1" }),
								" Catalog (",
								COMPLIANCE_DOC_CATALOG.length,
								")"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "registers",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "h-4 w-4 mr-1" }),
								" Master Registers (",
								MASTER_REGISTERS.length,
								")"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "archive",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { className: "h-4 w-4 mr-1" }),
								" Archive (",
								docs.length,
								")"
							]
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "catalog",
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col sm:flex-row gap-2 items-stretch sm:items-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: q,
										onChange: (e) => setQ(e.target.value),
										placeholder: "Search forms, registers, returns…",
										className: "pl-9"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "outline",
									children: [selected.size, " selected"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									onClick: () => generateBulk(COMPLIANCE_DOC_CATALOG.filter((d) => selected.has(d.id))),
									disabled: busy || selected.size === 0,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 mr-1" }), " Bulk ZIP"]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-6",
							children: Object.entries(grouped).map(([act, list]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2",
								children: act
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid gap-2 md:grid-cols-2",
								children: list.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border p-3 flex items-start gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: selected.has(d.id),
											onChange: () => toggle(d.id),
											className: "mt-1"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2 flex-wrap",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "font-medium text-sm",
															children: [
																d.code,
																" — ",
																d.title
															]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
															variant: "secondary",
															className: "text-[10px]",
															children: d.kind
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
															variant: "outline",
															className: "text-[10px]",
															children: d.frequency
														})
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-xs text-muted-foreground mt-0.5 truncate",
													children: d.purpose
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-1.5 mt-2 flex-wrap",
													children: [
														d.requiresSignature && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
															variant: "outline",
															className: "text-[10px]",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PenLine, { className: "h-3 w-3 mr-1" }), " Sign"]
														}),
														d.requiresSeal && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
															variant: "outline",
															className: "text-[10px]",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, { className: "h-3 w-3 mr-1" }), " Seal"]
														}),
														d.requiresQR && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
															variant: "outline",
															className: "text-[10px]",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "h-3 w-3 mr-1" }), " QR"]
														}),
														d.watermark && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
															variant: "outline",
															className: "text-[10px]",
															children: "Watermark"
														})
													]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "outline",
											disabled: busy,
											onClick: () => generateOne(d),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-3.5 w-3.5" })
										})
									]
								}, d.id))
							})] }, act))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "registers",
						className: "space-y-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid gap-2 md:grid-cols-2",
							children: MASTER_REGISTERS.map((r) => {
								const spec = specFor(r.id);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border p-3 flex items-start gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "h-4 w-4 text-primary mt-0.5" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "font-medium text-sm",
													children: r.name
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs text-muted-foreground",
													children: [
														r.act,
														" · ",
														r.frequency,
														" · source: ",
														r.autoSource
													]
												}),
												!spec && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[10px] mt-1 text-amber-600 dark:text-amber-400",
													children: "Auto-maintained internally · export via matching Form"
												})
											]
										}),
										spec && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "outline",
											disabled: busy,
											onClick: () => generateOne(spec),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-3.5 w-3.5" })
										})
									]
								}, r.id);
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "archive",
						className: "space-y-2",
						children: [docs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm text-muted-foreground p-6 text-center border border-dashed rounded-lg",
							children: "No documents yet. Generate any form from the Catalog tab to archive it here."
						}), docs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border border-border p-3 flex items-start gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4 text-primary mt-0.5" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex-1 min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 flex-wrap",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "font-medium text-sm",
													children: [
														d.code,
														" — ",
														d.title
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
													variant: "outline",
													className: "text-[10px]",
													children: ["v", d.version]
												}),
												d.signed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
													className: "text-[10px] bg-emerald-600",
													children: "Signed"
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground",
											children: [
												new Date(d.createdAt).toLocaleString("en-IN"),
												" · Ref: ",
												d.ref,
												" · ",
												(d.size / 1024).toFixed(1),
												" KB"
											]
										}),
										d.approvals.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[11px] text-muted-foreground mt-1",
											children: ["Approvals: ", d.approvals.map((a) => `${a.by} (${a.role})`).join(" → ")]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "outline",
											onClick: () => {
												const a = document.createElement("a");
												a.href = d.dataUrl;
												a.download = d.filename;
												a.click();
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-3.5 w-3.5" })
										}),
										!d.signed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "outline",
											onClick: () => {
												signDoc(d.id, "admin@swift", "HR Manager");
												toast.success("Digitally signed");
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PenLine, { className: "h-3.5 w-3.5" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "outline",
											onClick: () => {
												navigator.clipboard.writeText(d.dataUrl);
												toast("Attachment copied — paste into email");
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3.5 w-3.5" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "outline",
											onClick: () => {
												const t = `SWIFT AI Compliance — ${d.code} v${d.version} · Ref ${d.ref}`;
												window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank");
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-3.5 w-3.5" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "ghost",
											onClick: () => {
												remove(d.id);
												toast("Removed");
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5 text-destructive" })
										})
									]
								})
							]
						}, d.id))]
					})
				]
			})
		]
	});
}
//#endregion
export { Page as component };
