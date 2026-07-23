import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { L as Plus, U as Package, Yt as Boxes, c as UserPlus, h as Trash2, ht as History, st as ListChecks, u as Undo2 } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-CiapfthD.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CfEwGGLW.mjs";
import { t as Switch } from "./switch-CCza_WcE.mjs";
import { t as ESignPad } from "./esign-pad-ChArsuLf.mjs";
import { t as require_FileSaver_min } from "../_libs/file-saver.mjs";
import { o as generateAssetHandoverPDF } from "./documents-DHY5ZnOl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.assets-Btq0RM5H.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var { saveAs } = (/* @__PURE__ */ __toESM(require_FileSaver_min())).default;
var CONDITIONS = [
	"new",
	"good",
	"fair",
	"damaged"
];
var STATUSES = [
	"available",
	"assigned",
	"repair",
	"retired",
	"lost"
];
var statusColor = {
	available: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
	assigned: "bg-primary/15 text-primary border-primary/30",
	repair: "bg-amber-500/15 text-amber-600 border-amber-500/30",
	retired: "bg-muted text-muted-foreground border-border",
	lost: "bg-red-500/15 text-red-600 border-red-500/30"
};
function AssetsPage() {
	const { assetCategories, assets, assetAssignments, employees, company, docAssets, addAsset, updateAsset, deleteAsset, addAssetCategory, updateAssetCategory, deleteAssetCategory, assignAsset, returnAsset, currentUser } = useStore();
	const [tab, setTab] = (0, import_react.useState)("inventory");
	const [assetOpen, setAssetOpen] = (0, import_react.useState)(false);
	const [assignOpen, setAssignOpen] = (0, import_react.useState)(null);
	const [catOpen, setCatOpen] = (0, import_react.useState)(false);
	const empName = (id) => employees.find((e) => e.id === id)?.name ?? "—";
	const catName = (id) => assetCategories.find((c) => c.id === id)?.name ?? "—";
	const branchName = (id) => company.branches?.find((b) => b.id === id)?.name ?? "—";
	const totals = (0, import_react.useMemo)(() => {
		const t = {
			total: assets.length,
			assigned: 0,
			available: 0,
			repair: 0,
			retired: 0,
			value: 0
		};
		for (const a of assets) {
			if (a.status === "assigned") t.assigned++;
			else if (a.status === "available") t.available++;
			else if (a.status === "repair") t.repair++;
			else if (a.status === "retired") t.retired++;
			t.value += a.purchaseCost ?? 0;
		}
		return t;
	}, [assets]);
	const activeAssignments = assetAssignments.filter((x) => !x.returnedAt);
	const history = assetAssignments.filter((x) => x.returnedAt);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-display font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-6 w-6 text-primary" }), " Asset Management"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Track laptops, phones, ID cards, uniforms and every company-issued asset — with e-signed handovers."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						onClick: () => setCatOpen(true),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, { className: "h-4 w-4 mr-2" }), " Categories"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => setAssetOpen(true),
						className: "bg-gradient-brand text-white",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " New Asset"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-5 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boxes, { className: "h-4 w-4" }),
						label: "Total",
						value: totals.total
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Assigned",
						value: totals.assigned,
						tone: "primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Available",
						value: totals.available,
						tone: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "In Repair",
						value: totals.repair,
						tone: "amber"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Book Value",
						value: `₹${totals.value.toLocaleString("en-IN")}`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				value: tab,
				onValueChange: setTab,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "inventory",
							children: "Inventory"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "assignments",
							children: "Active Assignments"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "history",
							children: "History"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "inventory",
						className: "space-y-3 pt-4",
						children: [assets.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { onNew: () => setAssetOpen(true) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid gap-3",
							children: assets.map((a) => {
								const active = activeAssignments.find((x) => x.assetId === a.id);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
									className: "hover:shadow-soft transition-shadow",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
										className: "p-4 flex flex-wrap items-center gap-4",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "h-14 w-14 rounded-lg bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0",
												children: a.photoDataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
													src: a.photoDataUrl,
													alt: "",
													className: "h-full w-full object-cover"
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-6 w-6" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0 flex-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2 flex-wrap",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "font-semibold truncate",
															children: a.name
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
															variant: "outline",
															className: statusColor[a.status],
															children: a.status
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
															variant: "secondary",
															children: catName(a.categoryId)
														})
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs text-muted-foreground mt-0.5",
													children: [
														"Tag ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
															className: "text-foreground",
															children: a.tag
														}),
														a.serial && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" · SN ", a.serial] }),
														a.brand && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
															" · ",
															a.brand,
															" ",
															a.model
														] }),
														" · ",
														"Condition: ",
														a.condition,
														" · ",
														"Branch: ",
														branchName(a.branchId),
														active && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" · Held by ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
															className: "text-foreground",
															children: empName(active.employeeId)
														})] })
													]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex gap-1.5",
												children: [
													a.status === "available" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
														size: "sm",
														onClick: () => setAssignOpen(a),
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "h-3.5 w-3.5 mr-1" }), " Assign"]
													}),
													a.status === "assigned" && active && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
														size: "sm",
														variant: "outline",
														onClick: () => {
															returnAsset(active.id, currentUser?.name || "System", a.condition);
															const emp = employees.find((e) => e.id === active.employeeId);
															const cat = assetCategories.find((c) => c.id === a.categoryId);
															if (emp) try {
																const { blob, filename } = generateAssetHandoverPDF(company, emp, {
																	name: a.name,
																	tag: a.tag,
																	serial: a.serial,
																	category: cat?.name,
																	condition: a.condition
																}, "return", docAssets);
																saveAs(blob, filename);
															} catch {}
															toast.success("Asset returned · Return letter generated");
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { className: "h-3.5 w-3.5 mr-1" }), " Return"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
														value: a.status,
														onValueChange: (v) => updateAsset(a.id, { status: v }),
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
															className: "h-8 w-[120px] text-xs",
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
															value: s,
															children: s
														}, s)) })]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
														size: "icon",
														variant: "ghost",
														onClick: () => {
															if (confirm("Delete this asset?")) deleteAsset(a.id);
														},
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
													})
												]
											})
										]
									})
								}, a.id);
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "assignments",
						className: "pt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
							className: "text-base",
							children: "Currently held assets"
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-0",
							children: activeAssignments.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-6 text-sm text-muted-foreground",
								children: "Nothing is currently held out."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "divide-y",
								children: activeAssignments.map((x) => {
									const a = assets.find((y) => y.id === x.assetId);
									if (!a) return null;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 flex flex-wrap items-center gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-sm font-medium",
												children: [
													a.name,
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-muted-foreground",
														children: ["· ", a.tag]
													})
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs text-muted-foreground",
												children: [
													"Held by ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
														className: "text-foreground",
														children: empName(x.employeeId)
													}),
													" since ",
													new Date(x.assignedAt).toLocaleDateString(),
													" · ",
													"Cond: ",
													x.conditionOnAssign,
													x.acknowledgementSignatureDataUrl && " · ✍️ signed"
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											size: "sm",
											variant: "outline",
											onClick: () => {
												returnAsset(x.id, currentUser?.name || "System", a.condition);
												const emp = employees.find((e) => e.id === x.employeeId);
												const cat = assetCategories.find((c) => c.id === a.categoryId);
												if (emp) try {
													const { blob, filename } = generateAssetHandoverPDF(company, emp, {
														name: a.name,
														tag: a.tag,
														serial: a.serial,
														category: cat?.name,
														condition: a.condition
													}, "return", docAssets);
													saveAs(blob, filename);
												} catch {}
												toast.success("Returned · Letter generated");
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { className: "h-3.5 w-3.5 mr-1" }), " Return"]
										})]
									}, x.id);
								})
							})
						})] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "history",
						className: "pt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
							className: "text-base flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "h-4 w-4" }), " Returned assets"]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-0",
							children: history.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-6 text-sm text-muted-foreground",
								children: "No return history yet."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "divide-y",
								children: history.map((x) => {
									const a = assets.find((y) => y.id === x.assetId);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-medium",
											children: [
												a?.name ?? "(deleted asset)",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-muted-foreground",
													children: ["· ", a?.tag]
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground",
											children: [
												empName(x.employeeId),
												" · assigned ",
												new Date(x.assignedAt).toLocaleDateString(),
												" → returned ",
												x.returnedAt && new Date(x.returnedAt).toLocaleDateString(),
												x.conditionOnReturn && ` · returned as ${x.conditionOnReturn}`
											]
										})]
									}, x.id);
								})
							})
						})] })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetDialog, {
				open: assetOpen,
				onClose: () => setAssetOpen(false)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssignDialog, {
				asset: assignOpen,
				onClose: () => setAssignOpen(null)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoriesDialog, {
				open: catOpen,
				onClose: () => setCatOpen(false)
			})
		]
	});
}
function StatCard({ icon, label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-xs text-muted-foreground flex items-center gap-1.5",
			children: [icon, label]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-2xl font-display font-bold mt-1 ${tone === "primary" ? "text-primary" : tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-foreground"}`,
			children: value
		})]
	}) });
}
function EmptyState({ onNew }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "p-10 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-10 w-10 mx-auto text-muted-foreground mb-3" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "font-semibold",
				children: "No assets yet"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground mt-1 mb-4",
				children: "Add laptops, phones, ID cards, uniforms or anything the company issues to employees."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				onClick: onNew,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " Add your first asset"]
			})
		]
	}) });
}
function AssetDialog({ open, onClose }) {
	const { assetCategories, addAsset, company } = useStore();
	const [form, setForm] = (0, import_react.useState)({
		categoryId: assetCategories[0]?.id,
		condition: "new",
		status: "available"
	});
	const patch = (k, v) => setForm((f) => ({
		...f,
		[k]: v
	}));
	const save = () => {
		if (!form.name || !form.tag || !form.categoryId) return toast.error("Name, tag and category are required");
		addAsset({
			categoryId: form.categoryId,
			name: form.name,
			tag: form.tag,
			serial: form.serial,
			brand: form.brand,
			model: form.model,
			purchaseDate: form.purchaseDate,
			purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : void 0,
			vendor: form.vendor,
			warrantyUntil: form.warrantyUntil,
			branchId: form.branchId,
			condition: form.condition,
			status: form.status,
			notes: form.notes,
			photoDataUrl: form.photoDataUrl
		});
		toast.success("Asset added to inventory");
		setForm({
			categoryId: assetCategories[0]?.id,
			condition: "new",
			status: "available"
		});
		onClose();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "New Asset" }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Category",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.categoryId,
								onValueChange: (v) => patch("categoryId", v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: assetCategories.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: c.id,
									children: c.name
								}, c.id)) })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Asset name",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.name ?? "",
								onChange: (e) => patch("name", e.target.value),
								placeholder: "MacBook Pro 14"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Asset tag",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.tag ?? "",
								onChange: (e) => patch("tag", e.target.value),
								placeholder: "SW-LAP-0007"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Serial number",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.serial ?? "",
								onChange: (e) => patch("serial", e.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Brand",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.brand ?? "",
								onChange: (e) => patch("brand", e.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Model",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.model ?? "",
								onChange: (e) => patch("model", e.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Purchase date",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: form.purchaseDate ?? "",
								onChange: (e) => patch("purchaseDate", e.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Purchase cost (₹)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: form.purchaseCost ?? "",
								onChange: (e) => patch("purchaseCost", Number(e.target.value))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Vendor",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.vendor ?? "",
								onChange: (e) => patch("vendor", e.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Warranty until",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: form.warrantyUntil ?? "",
								onChange: (e) => patch("warrantyUntil", e.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Branch",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.branchId ?? "__none",
								onValueChange: (v) => patch("branchId", v === "__none" ? void 0 : v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "—" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "__none",
									children: "— None —"
								}), (company.branches ?? []).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: b.id,
									children: b.name
								}, b.id))] })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Condition",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.condition,
								onValueChange: (v) => patch("condition", v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: CONDITIONS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: c,
									children: c
								}, c)) })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "md:col-span-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Notes"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								value: form.notes ?? "",
								onChange: (e) => patch("notes", e.target.value),
								rows: 2
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					onClick: onClose,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: save,
					className: "bg-gradient-brand text-white",
					children: "Add Asset"
				})] })
			]
		})
	});
}
function AssignDialog({ asset, onClose }) {
	const { employees, assetCategories, assignAsset, currentUser, company, docAssets } = useStore();
	const [employeeId, setEmployeeId] = (0, import_react.useState)("");
	const [notes, setNotes] = (0, import_react.useState)("");
	const [signature, setSignature] = (0, import_react.useState)();
	const [signOpen, setSignOpen] = (0, import_react.useState)(false);
	const category = asset ? assetCategories.find((c) => c.id === asset.categoryId) : void 0;
	const needsSign = !!category?.requireAcknowledgement;
	const submit = () => {
		if (!asset) return;
		if (!employeeId) return toast.error("Pick an employee");
		if (needsSign && !signature) return toast.error("Employee acknowledgement signature is required");
		if (!assignAsset({
			assetId: asset.id,
			employeeId,
			assignedBy: currentUser?.name || "HR",
			conditionOnAssign: asset.condition,
			acknowledgementSignatureDataUrl: signature,
			notes
		})) return toast.error("Could not assign — check asset status");
		const emp = employees.find((e) => e.id === employeeId);
		if (emp) try {
			const { blob, filename } = generateAssetHandoverPDF(company, emp, {
				name: asset.name,
				tag: asset.tag,
				serial: asset.serial,
				category: category?.name,
				condition: asset.condition,
				notes
			}, "handover", docAssets);
			saveAs(blob, filename);
			toast.success(`Asset assigned · Handover letter generated for ${emp.name}`);
		} catch {
			toast.success("Asset assigned");
		}
		else toast.success("Asset assigned");
		setEmployeeId("");
		setNotes("");
		setSignature(void 0);
		onClose();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open: !!asset,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-lg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Assign asset" }) }),
				asset && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border p-3 bg-muted/40 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: asset.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted-foreground",
								children: [
									asset.tag,
									" · ",
									category?.name,
									" · Condition: ",
									asset.condition
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Assign to employee",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: employeeId,
								onValueChange: setEmployeeId,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Pick employee…" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: employees.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
									value: e.id,
									children: [
										e.name,
										" · ",
										e.empCode
									]
								}, e.id)) })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Notes",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								value: notes,
								onChange: (e) => setNotes(e.target.value),
								rows: 2,
								placeholder: "Handover notes, accessories…"
							})
						}),
						needsSign && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							className: "text-xs",
							children: "Employee acknowledgement"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 flex items-center gap-3",
							children: [signature ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: signature,
								alt: "signature",
								className: "h-14 border rounded bg-white"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: "Required — employee signs on handover."
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								variant: "outline",
								onClick: () => setSignOpen(true),
								children: signature ? "Re-sign" : "Capture signature"
							})]
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					onClick: onClose,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: submit,
					className: "bg-gradient-brand text-white",
					children: "Assign"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
					open: signOpen,
					onOpenChange: setSignOpen,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
						className: "max-w-lg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Acknowledgement signature" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ESignPad, { onSign: (d) => {
							setSignature(d);
							setSignOpen(false);
						} })]
					})
				})
			]
		})
	});
}
function CategoriesDialog({ open, onClose }) {
	const { assetCategories, addAssetCategory, updateAssetCategory, deleteAssetCategory } = useStore();
	const [name, setName] = (0, import_react.useState)("");
	const [code, setCode] = (0, import_react.useState)("");
	const [requireReturn, setRequireReturn] = (0, import_react.useState)(true);
	const [requireAck, setRequireAck] = (0, import_react.useState)(false);
	const add = () => {
		if (!name.trim() || !code.trim()) return toast.error("Name and code required");
		addAssetCategory({
			name: name.trim(),
			code: code.trim().toUpperCase(),
			requireReturn,
			requireAcknowledgement: requireAck
		});
		setName("");
		setCode("");
		setRequireReturn(true);
		setRequireAck(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-lg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Asset categories" }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-lg border divide-y",
						children: assetCategories.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-sm font-medium",
										children: [
											c.name,
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-muted-foreground text-xs",
												children: ["· ", c.code]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[11px] text-muted-foreground",
										children: [
											"Return required: ",
											c.requireReturn ? "yes" : "no",
											" · Sign on handover: ",
											c.requireAcknowledgement ? "yes" : "no"
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-1.5 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: c.requireReturn,
										onCheckedChange: (v) => updateAssetCategory(c.id, { requireReturn: v })
									}), "Return"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-1.5 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: c.requireAcknowledgement,
										onCheckedChange: (v) => updateAssetCategory(c.id, { requireAcknowledgement: v })
									}), "Sign"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: "ghost",
									onClick: () => deleteAssetCategory(c.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
								})
							]
						}, c.id))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t pt-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-medium mb-2",
								children: "Add category"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									placeholder: "Name (e.g. Headset)",
									value: name,
									onChange: (e) => setName(e.target.value)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									placeholder: "Code (e.g. HDS)",
									value: code,
									onChange: (e) => setCode(e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-4 mt-2 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: requireReturn,
											onCheckedChange: setRequireReturn
										}), " Requires return"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: requireAck,
											onCheckedChange: setRequireAck
										}), " Signed handover"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										onClick: add,
										className: "ml-auto",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5 mr-1" }), " Add"]
									})
								]
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					onClick: onClose,
					children: "Close"
				}) })
			]
		})
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
		className: "text-xs",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-1",
		children
	})] });
}
//#endregion
export { AssetsPage as component };
