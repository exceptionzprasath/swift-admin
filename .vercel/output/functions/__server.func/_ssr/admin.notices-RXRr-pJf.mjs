import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { Et as Eye, L as Plus, Q as Megaphone, h as Trash2, z as Pin } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-CiapfthD.mjs";
import { t as Switch } from "./switch-CCza_WcE.mjs";
import { t as Checkbox } from "./checkbox-B1AjkRkB.mjs";
import { t as NoticeBoard } from "./notice-board-D1SmFiDH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.notices-RXRr-pJf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function NoticesPage() {
	const { notices, addNotice, deleteNotice, updateNotice, company, employees, currentUser } = useStore();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [title, setTitle] = (0, import_react.useState)("");
	const [body, setBody] = (0, import_react.useState)("");
	const [priority, setPriority] = (0, import_react.useState)("info");
	const [scope, setScope] = (0, import_react.useState)("company");
	const [values, setValues] = (0, import_react.useState)([]);
	const [pinned, setPinned] = (0, import_react.useState)(false);
	const [expiresAt, setExpiresAt] = (0, import_react.useState)("");
	const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
	const roles = Array.from(new Set(employees.map((e) => e.designation).filter(Boolean)));
	const reset = () => {
		setTitle("");
		setBody("");
		setPriority("info");
		setScope("company");
		setValues([]);
		setPinned(false);
		setExpiresAt("");
	};
	const submit = () => {
		if (!title.trim() || !body.trim()) return toast.error("Title and body required");
		if (scope !== "company" && values.length === 0) return toast.error("Pick at least one target");
		addNotice({
			title: title.trim(),
			body: body.trim(),
			priority,
			audience: {
				scope,
				values: scope === "company" ? [] : values
			},
			createdBy: currentUser?.name || "Admin",
			pinned,
			expiresAt: expiresAt || void 0
		});
		toast.success("Notice published");
		setOpen(false);
		reset();
	};
	const toggleValue = (v) => setValues((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "font-display text-3xl font-semibold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Megaphone, { className: "h-6 w-6 text-primary" }), " Notice Board"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Publish notices to the entire company, a branch, a department, a role, or specific people."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => setOpen(true),
					className: "bg-gradient-brand text-white",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-1" }), " New notice"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border bg-card p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display font-semibold mb-3",
						children: "Published notices"
					}), notices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "No notices yet."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2",
						children: notices.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoticeAdminRow, {
							n,
							onDelete: () => deleteNotice(n.id),
							onPin: () => updateNotice(n.id, { pinned: !n.pinned })
						}, n.id))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoticeBoard, {
					viewer: { role: "admin" },
					userKey: "admin:" + (currentUser?.name || "admin"),
					compact: true
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open,
				onOpenChange: setOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "New notice" }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Title" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: title,
									onChange: (e) => setTitle(e.target.value),
									placeholder: "e.g. Diwali holiday schedule"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Body" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 4,
									value: body,
									onChange: (e) => setBody(e.target.value),
									placeholder: "Details, action items, dates…"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Priority" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: priority,
										onValueChange: (v) => setPriority(v),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "info",
												children: "Info"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "important",
												children: "Important"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "urgent",
												children: "Urgent"
											})
										] })]
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Expires (optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "date",
										value: expiresAt,
										onChange: (e) => setExpiresAt(e.target.value)
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Audience" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: scope,
									onValueChange: (v) => {
										setScope(v);
										setValues([]);
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "company",
											children: "Entire company"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "branch",
											children: "Specific branch(es)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "department",
											children: "Specific department(s)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "role",
											children: "Specific role(s)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "employees",
											children: "Specific employee(s)"
										})
									] })]
								})] }),
								scope !== "company" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border p-3 max-h-48 overflow-y-auto",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-muted-foreground mb-2",
										children: ["Select target", scope === "employees" ? "s" : ""]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [
											scope === "branch" && (company.branches ?? []).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 text-sm cursor-pointer",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
														checked: values.includes(b.id),
														onCheckedChange: () => toggleValue(b.id)
													}),
													b.name,
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-xs text-muted-foreground",
														children: [
															"(",
															b.code,
															" · ",
															b.city,
															")"
														]
													})
												]
											}, b.id)),
											scope === "department" && departments.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 text-sm cursor-pointer",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
														checked: values.includes(d),
														onCheckedChange: () => toggleValue(d)
													}),
													" ",
													d
												]
											}, d)),
											scope === "role" && roles.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 text-sm cursor-pointer",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
														checked: values.includes(r),
														onCheckedChange: () => toggleValue(r)
													}),
													" ",
													r
												]
											}, r)),
											scope === "employees" && employees.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 text-sm cursor-pointer",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
														checked: values.includes(e.id),
														onCheckedChange: () => toggleValue(e.id)
													}),
													e.name,
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-xs text-muted-foreground",
														children: ["· ", e.designation]
													})
												]
											}, e.id)),
											(scope === "branch" && (company.branches ?? []).length === 0 || scope === "department" && departments.length === 0 || scope === "role" && roles.length === 0 || scope === "employees" && employees.length === 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs text-muted-foreground",
												children: "No options yet — configure them first."
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-2 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: pinned,
										onCheckedChange: setPinned
									}), " Pin to top"]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: submit,
							children: "Publish"
						})] })
					]
				})
			})
		]
	});
}
function NoticeAdminRow({ n, onDelete, onPin }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-lg border border-border p-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5 flex-wrap",
						children: [
							n.pinned && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { className: "h-3 w-3 text-primary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium text-sm truncate",
								children: n.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "outline",
								className: "text-[10px] uppercase",
								children: n.priority
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								className: "text-[10px]",
								children: n.audience.scope
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground line-clamp-2 mt-1",
						children: n.body
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[10px] text-muted-foreground mt-1 flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-3 w-3" }),
							" ",
							n.readBy.length,
							" read · ",
							new Date(n.createdAt).toLocaleDateString()
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					onClick: onPin,
					title: n.pinned ? "Unpin" : "Pin",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { className: `h-3.5 w-3.5 ${n.pinned ? "text-primary" : ""}` })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					onClick: onDelete,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5 text-destructive" })
				})]
			})]
		})
	});
}
//#endregion
export { NoticesPage as component };
