import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore, i as inr } from "./store-Dj1aT4sf.mjs";
import { D as Search, E as Send, Et as Eye, S as ShieldCheck, Tt as FileDown, U as Package, Vt as Check, X as MessageCircle, _t as GitBranch, bt as FileType, h as Trash2, jt as Clock, n as X, xt as FileText } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CiapfthD.mjs";
import { a as downloadLetter, i as bulkZipLetters, l as renderTemplate, r as buildVars, t as DEFAULT_TEMPLATES } from "./documents-DHY5ZnOl.mjs";
import { t as Checkbox } from "./checkbox-B1AjkRkB.mjs";
import { n as generateSalarySlipPDF } from "./pdf-BbZFURNJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.documents-DiQguRW7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CATEGORIES = [
	"Onboarding",
	"Confirmation",
	"Movement",
	"Discipline",
	"Exit",
	"Verification",
	"Compliance",
	"Custom"
];
function DocumentsPage() {
	const { employees, company, payrolls, approvalMatrix, docRequests, currentUser, setApprovalChain, createDocRequest, actOnDocStep, deleteDocRequest } = useStore();
	const [templates, setTemplates] = (0, import_react.useState)(DEFAULT_TEMPLATES);
	const [query, setQuery] = (0, import_react.useState)("");
	const [activeTab, setActiveTab] = (0, import_react.useState)("letters");
	const [reqOpen, setReqOpen] = (0, import_react.useState)(false);
	const [reqTemplate, setReqTemplate] = (0, import_react.useState)(null);
	const [reqEmpId, setReqEmpId] = (0, import_react.useState)("");
	const [reqFormat, setReqFormat] = (0, import_react.useState)("pdf");
	const [reqBody, setReqBody] = (0, import_react.useState)("");
	const [reqNote, setReqNote] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [bulkOpen, setBulkOpen] = (0, import_react.useState)(false);
	const [bulkTemplate, setBulkTemplate] = (0, import_react.useState)(null);
	const [bulkFormat, setBulkFormat] = (0, import_react.useState)("pdf");
	const [bulkSelected, setBulkSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [editorOpen, setEditorOpen] = (0, import_react.useState)(false);
	const [editorTemplate, setEditorTemplate] = (0, import_react.useState)(null);
	const [editorBody, setEditorBody] = (0, import_react.useState)("");
	const [matrixOpen, setMatrixOpen] = (0, import_react.useState)(false);
	const [matrixTemplate, setMatrixTemplate] = (0, import_react.useState)(null);
	const [matrixChain, setMatrixChain] = (0, import_react.useState)([]);
	const [actOpen, setActOpen] = (0, import_react.useState)(false);
	const [actReq, setActReq] = (0, import_react.useState)(null);
	const [actMode, setActMode] = (0, import_react.useState)("approve");
	const [actComment, setActComment] = (0, import_react.useState)("");
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		if (!q) return templates;
		return templates.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
	}, [templates, query]);
	const byCategory = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const t of filtered) {
			if (!map.has(t.category)) map.set(t.category, []);
			map.get(t.category).push(t);
		}
		return map;
	}, [filtered]);
	const pendingCount = docRequests.filter((d) => d.status === "pending").length;
	const approvedCount = docRequests.filter((d) => d.status === "approved").length;
	function chainFor(key) {
		return approvalMatrix[key] ?? ["HR Manager"];
	}
	function openRequest(t) {
		setReqTemplate(t);
		setReqEmpId(employees[0]?.id ?? "");
		setReqFormat("pdf");
		setReqBody(t.body);
		setReqNote("");
		setReqOpen(true);
	}
	function openBulk(t) {
		setBulkTemplate(t);
		setBulkFormat("pdf");
		setBulkSelected(new Set(employees.map((e) => e.id)));
		setBulkOpen(true);
	}
	function openEditor(t) {
		setEditorTemplate(t);
		setEditorBody(t.body);
		setEditorOpen(true);
	}
	function openMatrix(t) {
		setMatrixTemplate(t);
		setMatrixChain(chainFor(t.key));
		setMatrixOpen(true);
	}
	function saveEditor() {
		if (!editorTemplate) return;
		setTemplates((prev) => prev.map((t) => t.key === editorTemplate.key ? {
			...t,
			body: editorBody
		} : t));
		toast.success("Template saved for this session");
		setEditorOpen(false);
	}
	function saveMatrix() {
		if (!matrixTemplate) return;
		const cleaned = matrixChain.map((s) => s.trim()).filter(Boolean);
		if (cleaned.length === 0) return toast.error("Add at least one approver");
		setApprovalChain(matrixTemplate.key, cleaned);
		toast.success(`Approval chain saved (${cleaned.length} step${cleaned.length > 1 ? "s" : ""})`);
		setMatrixOpen(false);
	}
	function submitRequest() {
		if (!reqTemplate || !reqEmpId) return;
		createDocRequest({
			letterKey: reqTemplate.key,
			letterTitle: reqTemplate.title,
			employeeId: reqEmpId,
			templateBody: reqBody,
			format: reqFormat,
			requestedBy: currentUser?.name ?? "Admin",
			note: reqNote
		});
		toast.success(`Sent for approval → ${chainFor(reqTemplate.key).join(" → ")}`);
		setReqOpen(false);
		setActiveTab("approvals");
	}
	function submitBulk() {
		if (!bulkTemplate) return;
		const chosen = employees.filter((e) => bulkSelected.has(e.id));
		if (chosen.length === 0) return toast.error("Select at least one employee");
		chosen.forEach((e) => {
			createDocRequest({
				letterKey: bulkTemplate.key,
				letterTitle: bulkTemplate.title,
				employeeId: e.id,
				templateBody: bulkTemplate.body,
				format: bulkFormat,
				requestedBy: currentUser?.name ?? "Admin"
			});
		});
		toast.success(`${chosen.length} approval request${chosen.length > 1 ? "s" : ""} created`);
		setBulkOpen(false);
		setActiveTab("approvals");
	}
	function openAct(req, mode) {
		setActReq(req);
		setActMode(mode);
		setActComment("");
		setActOpen(true);
	}
	function submitAct() {
		if (!actReq) return;
		actOnDocStep(actReq.id, actMode, actComment, currentUser?.name ?? "Approver");
		toast.success(actMode === "approve" ? "Step approved" : "Request rejected");
		setActOpen(false);
	}
	async function downloadApproved(req) {
		const emp = employees.find((e) => e.id === req.employeeId);
		if (!emp) return toast.error("Employee not found");
		const tpl = templates.find((t) => t.key === req.letterKey);
		if (!tpl) return toast.error("Template not found");
		setBusy(true);
		try {
			await downloadLetter(company, emp, {
				...tpl,
				body: req.templateBody
			}, req.format);
			toast.success(`${req.letterTitle} downloaded (${req.format.toUpperCase()})`);
		} catch (err) {
			toast.error("Download failed");
			console.error(err);
		} finally {
			setBusy(false);
		}
	}
	async function downloadApprovedBulkZip(key) {
		const approved = docRequests.filter((d) => d.letterKey === key && d.status === "approved");
		if (approved.length === 0) return;
		const tpl = templates.find((t) => t.key === key);
		if (!tpl) return;
		const empsForZip = approved.map((d) => employees.find((e) => e.id === d.employeeId)).filter(Boolean);
		setBusy(true);
		try {
			await bulkZipLetters(company, empsForZip, tpl, "pdf");
			toast.success(`ZIP of ${empsForZip.length} approved letters downloaded`);
		} catch (err) {
			toast.error("ZIP failed");
			console.error(err);
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-semibold",
					children: "AI Document Engine"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [templates.length, " letter types · configurable approval workflow · download unlocks after full approval"]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative w-full sm:w-72",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						className: "pl-9",
						placeholder: "Search letter templates…",
						value: query,
						onChange: (e) => setQuery(e.target.value)
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				value: activeTab,
				onValueChange: (v) => setActiveTab(v),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "letters",
							children: "Letters & Certificates"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "approvals",
							children: ["Approvals", pendingCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								className: "ml-2",
								children: pendingCount
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "payslips",
							children: [
								"Salary Slips (",
								payrolls.length,
								")"
							]
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "letters",
						className: "space-y-6 mt-4",
						children: [CATEGORIES.map((cat) => {
							const list = byCategory.get(cat);
							if (!list?.length) return null;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								className: "font-display text-lg font-semibold mb-3 flex items-center gap-2",
								children: [cat, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "secondary",
									className: "text-xs",
									children: list.length
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
								children: list.map((t) => {
									const chain = chainFor(t.key);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-xl border border-border bg-card p-4 flex flex-col hover:shadow-soft transition-shadow",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex items-start justify-between gap-2 mb-2",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2 min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4 text-primary shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
														className: "font-medium text-sm truncate",
														children: t.title
													})]
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-muted-foreground line-clamp-2 mb-2 flex-1",
												children: t.description
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1 mb-3 text-[11px] text-muted-foreground",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "h-3 w-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "truncate",
													title: chain.join(" → "),
													children: chain.join(" → ")
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap gap-1.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
														size: "sm",
														onClick: () => openRequest(t),
														className: "flex-1 min-w-[100px]",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3.5 w-3.5 mr-1" }), " Request approval"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
														size: "sm",
														variant: "outline",
														onClick: () => openBulk(t),
														title: "Bulk request",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-3.5 w-3.5" })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
														size: "sm",
														variant: "ghost",
														onClick: () => openMatrix(t),
														title: "Edit approval chain",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "h-3.5 w-3.5" })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
														size: "sm",
														variant: "ghost",
														onClick: () => openEditor(t),
														title: "Edit template",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileType, { className: "h-3.5 w-3.5" })
													})
												]
											})
										]
									}, t.key);
								})
							})] }, cat);
						}), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-center text-sm text-muted-foreground py-12",
							children: "No templates match your search."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "approvals",
						className: "mt-4 space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-3 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }),
										label: "Pending",
										value: pendingCount,
										tone: "warn"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3" }),
										label: "Approved",
										value: approvedCount,
										tone: "ok"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatChip, {
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3" }),
										label: "Rejected",
										value: docRequests.filter((d) => d.status === "rejected").length,
										tone: "bad"
									})
								]
							}),
							docRequests.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground",
								children: "No document requests yet. Request approval for a letter from the Letters tab."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2",
								children: docRequests.map((req) => {
									const emp = employees.find((e) => e.id === req.employeeId);
									const step = req.steps[req.currentStep];
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-xl border border-border bg-card p-4",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-start justify-between gap-3 mb-3",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "min-w-0",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-2 flex-wrap",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "font-medium text-sm",
																	children: req.letterTitle
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																	variant: "outline",
																	className: "text-[10px] uppercase",
																	children: req.format
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: req.status })
															]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-xs text-muted-foreground mt-0.5",
															children: [
																emp?.name ?? "?",
																" · ",
																emp?.empCode,
																" · requested by ",
																req.requestedBy,
																" · ",
																new Date(req.requestedAt).toLocaleString()
															]
														}),
														req.note && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-xs mt-1 italic text-muted-foreground",
															children: ["Note: ", req.note]
														})
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex gap-1.5",
													children: [
														req.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
															size: "sm",
															onClick: () => openAct(req, "approve"),
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 mr-1" }), " Approve"]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
															size: "sm",
															variant: "outline",
															onClick: () => openAct(req, "reject"),
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5 mr-1" }), " Reject"]
														})] }),
														req.status === "approved" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
															size: "sm",
															onClick: () => downloadApproved(req),
															disabled: busy,
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-3.5 w-3.5 mr-1" }),
																" Download ",
																req.format.toUpperCase()
															]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
															size: "sm",
															variant: "ghost",
															onClick: () => deleteDocRequest(req.id),
															title: "Delete request",
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
														})
													]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
												className: "flex flex-wrap gap-2 text-xs",
												children: req.steps.map((s, i) => {
													const active = req.status === "pending" && i === req.currentStep;
													return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
														className: "px-2.5 py-1 rounded-md border " + (s.status === "approved" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : s.status === "rejected" ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300" : active ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/40 border-border text-muted-foreground"),
														title: s.comment,
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "font-medium",
																children: [
																	i + 1,
																	". ",
																	s.approver
																]
															}),
															s.status !== "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "ml-1.5 opacity-80",
																children: [
																	"· ",
																	s.status,
																	s.actedBy ? ` by ${s.actedBy}` : ""
																]
															}),
															active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "ml-1.5 opacity-80",
																children: "· waiting"
															})
														]
													}, i);
												})
											}),
											req.status === "pending" && step && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[11px] text-muted-foreground mt-2",
												children: ["Next approver: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-medium text-foreground",
													children: step.approver
												})]
											})
										]
									}, req.id);
								})
							}),
							approvedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-xl border border-border bg-muted/30 p-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between flex-wrap gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: "Bulk download approved"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground",
											children: "Group all approved letters of one type into a ZIP"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1.5",
										children: Array.from(new Set(docRequests.filter((d) => d.status === "approved").map((d) => d.letterKey))).map((key) => {
											const tpl = templates.find((t) => t.key === key);
											const count = docRequests.filter((d) => d.letterKey === key && d.status === "approved").length;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												size: "sm",
												variant: "outline",
												onClick: () => downloadApprovedBulkZip(key),
												disabled: busy,
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-3.5 w-3.5 mr-1" }),
													" ",
													tpl?.title ?? key,
													" (",
													count,
													")"
												]
											}, key);
										})
									})]
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "payslips",
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border border-border bg-card p-4",
							children: payrolls.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground p-6 text-center",
								children: "Run payroll to generate salary slips."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2",
								children: payrolls.map((pr) => {
									const emp = employees.find((e) => e.id === pr.employeeId);
									if (!emp) return null;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between rounded-lg bg-muted/40 p-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-medium text-sm truncate",
												children: [
													emp.name,
													" · ",
													pr.month
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs text-muted-foreground",
												children: ["Net ", inr(pr.computed.net)]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											size: "sm",
											variant: "outline",
											onClick: () => generateSalarySlipPDF(company, emp, pr.month, pr.computed),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4 mr-1" }), " PDF"]
										})]
									}, pr.id);
								})
							})
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: reqOpen,
				onOpenChange: setReqOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-3xl max-h-[90vh] flex flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Request approval · ", reqTemplate?.title] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
							"This letter enters the approval chain: ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: reqTemplate ? chainFor(reqTemplate.key).join(" → ") : "" }),
							". Download unlocks after every step approves."
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-4 sm:grid-cols-2 overflow-y-auto pr-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Employee"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: reqEmpId,
								onValueChange: setReqEmpId,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select employee" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: employees.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
									value: e.id,
									children: [
										e.name,
										" · ",
										e.empCode
									]
								}, e.id)) })]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Format on approval"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: reqFormat,
								onValueChange: (v) => setReqFormat(v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "pdf",
									children: "PDF · branded, print-ready"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "docx",
									children: "DOCX · editable Word"
								})] })]
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							className: "text-xs",
							children: "Note for approvers (optional)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: reqNote,
							onChange: (e) => setReqNote(e.target.value),
							placeholder: "Why this letter, urgency…"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 overflow-y-auto",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
									className: "text-xs",
									children: [
										"Letter body (",
										"{{variables}}",
										" auto-resolved)"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									value: reqBody,
									onChange: (e) => setReqBody(e.target.value),
									rows: 10,
									className: "font-mono text-xs mt-1"
								}),
								reqEmpId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
									className: "mt-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
										className: "text-xs text-muted-foreground cursor-pointer flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-3 w-3" }), " Preview with resolved variables"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
										className: "mt-2 text-xs whitespace-pre-wrap bg-muted/40 rounded-lg p-3 max-h-48 overflow-y-auto",
										children: renderTemplate(reqBody, buildVars(company, employees.find((e) => e.id === reqEmpId)))
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
							className: "flex-wrap gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									size: "sm",
									disabled: true,
									title: "Requires Email connector",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4 mr-1" }), " Email on approval"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									size: "sm",
									disabled: true,
									title: "Requires WhatsApp connector",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-4 w-4 mr-1" }), " WhatsApp on approval"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: submitRequest,
									disabled: !reqEmpId,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4 mr-1" }), " Send for approval"]
								})
							]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: bulkOpen,
				onOpenChange: setBulkOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl max-h-[90vh] flex flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Bulk request approval · ", bulkTemplate?.title] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: ["One approval request per selected employee, routed through: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: bulkTemplate ? chainFor(bulkTemplate.key).join(" → ") : "" })] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							className: "text-xs",
							children: "Format on approval"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: bulkFormat,
							onValueChange: (v) => setBulkFormat(v),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "pdf",
								children: "PDF"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "docx",
								children: "DOCX"
							})] })]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted-foreground",
								children: [
									bulkSelected.size,
									" of ",
									employees.length,
									" selected"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => setBulkSelected(new Set(employees.map((e) => e.id))),
									children: "All"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => setBulkSelected(/* @__PURE__ */ new Set()),
									children: "None"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border",
							children: [employees.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-3 p-2.5 hover:bg-muted/40 cursor-pointer",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
									checked: bulkSelected.has(e.id),
									onCheckedChange: (v) => {
										setBulkSelected((prev) => {
											const next = new Set(prev);
											if (v) next.add(e.id);
											else next.delete(e.id);
											return next;
										});
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-sm truncate",
										children: e.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-muted-foreground truncate",
										children: [
											e.empCode,
											" · ",
											e.designation
										]
									})]
								})]
							}, e.id)), employees.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-4 text-sm text-muted-foreground text-center",
								children: "No employees yet."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: submitBulk,
							disabled: bulkSelected.size === 0,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4 mr-1" }),
								" Send ",
								bulkSelected.size,
								" for approval"
							]
						}) })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: matrixOpen,
				onOpenChange: setMatrixOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Approval chain · ", matrixTemplate?.title] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Ordered list of approvers. Each step must approve before the letter can be downloaded." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [matrixChain.map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs w-6 text-muted-foreground",
										children: [i + 1, "."]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: a,
										onChange: (e) => setMatrixChain((prev) => prev.map((v, idx) => idx === i ? e.target.value : v)),
										placeholder: "e.g. HR Manager"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "ghost",
										onClick: () => setMatrixChain((prev) => prev.filter((_, idx) => idx !== i)),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
									})
								]
							}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "outline",
								onClick: () => setMatrixChain((prev) => [...prev, ""]),
								children: "+ Add approver"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setMatrixOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: saveMatrix,
							children: "Save chain"
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: actOpen,
				onOpenChange: setActOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: actMode === "approve" ? "Approve step" : "Reject request" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: actReq && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							actReq.letterTitle,
							" for ",
							employees.find((e) => e.id === actReq.employeeId)?.name,
							" — acting as",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: actReq.steps[actReq.currentStep]?.approver })
						] }) })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
							className: "text-xs",
							children: ["Comment ", actMode === "reject" ? "(required)" : "(optional)"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: actComment,
							onChange: (e) => setActComment(e.target.value),
							rows: 3
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setActOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: submitAct,
							disabled: actMode === "reject" && actComment.trim().length === 0,
							variant: actMode === "reject" ? "destructive" : "default",
							children: actMode === "approve" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 mr-1" }), " Approve"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4 mr-1" }), " Reject"] })
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editorOpen,
				onOpenChange: setEditorOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-3xl max-h-[90vh] flex flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Edit template · ", editorTemplate?.title] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
							"Use ",
							"{{name}}",
							", ",
							"{{designation}}",
							", ",
							"{{annualCTC}}",
							", ",
							"{{today}}",
							", ",
							"{{company}}",
							" etc."
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: editorBody,
							onChange: (e) => setEditorBody(e.target.value),
							rows: 18,
							className: "font-mono text-xs flex-1"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setEditorOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: saveEditor,
							children: "Save template"
						})] })
					]
				})
			})
		]
	});
}
function StatusBadge({ status }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `text-[10px] uppercase font-medium px-2 py-0.5 rounded border ${{
			pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
			approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
			rejected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
		}[status]}`,
		children: status
	});
}
function StatChip({ icon, label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : tone === "warn" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-red-500/10 text-red-700 dark:text-red-300"}`,
		children: [
			icon,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium",
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "opacity-80",
				children: label
			})
		]
	});
}
//#endregion
export { DocumentsPage as component };
