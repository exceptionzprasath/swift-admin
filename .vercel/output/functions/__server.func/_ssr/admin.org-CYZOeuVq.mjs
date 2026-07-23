import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { $ as Maximize2, B as Phone, Bt as ChevronDown, D as Search, G as Network, Rt as ChevronRight, V as Pencil, _t as GitBranch, et as MapPin, lt as LayoutGrid, o as Users, on as ArrowDown, q as Minimize2, qt as Building2, t as Zap, tn as ArrowUp, tt as Mail } from "../_libs/lucide-react.mjs";
import { n as cn, t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CiapfthD.mjs";
import { t as useWindowVirtualizer } from "../_libs/@tanstack/react-virtual+[...].mjs";
import { n as Root2, r as Trigger, t as Content2 } from "../_libs/radix-ui__react-hover-card.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.org-CYZOeuVq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var HoverCard = Root2;
var HoverCardTrigger = Trigger;
var HoverCardContent = import_react.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-hover-card-content-transform-origin)", className),
	...props
}));
HoverCardContent.displayName = Content2.displayName;
var VIRTUALIZE_THRESHOLD = 80;
var AUTO_GRID_THRESHOLD = 400;
function initials(name) {
	return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}
function OrgPage() {
	const { employees, updateEmployee, company } = useStore();
	const branches = company.branches ?? [];
	const [editOpen, setEditOpen] = (0, import_react.useState)(false);
	const [target, setTarget] = (0, import_react.useState)(null);
	const [about, setAbout] = (0, import_react.useState)("");
	const [managerId, setManagerId] = (0, import_react.useState)("");
	const [branchId, setBranchId] = (0, import_react.useState)("");
	const [designation, setDesignation] = (0, import_react.useState)("");
	const [department, setDepartment] = (0, import_react.useState)("");
	const [query, setQuery] = (0, import_react.useState)("");
	const [view, setView] = (0, import_react.useState)(employees.length > AUTO_GRID_THRESHOLD ? "grid" : "tree");
	const [collapsed, setCollapsed] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [branchFilter, setBranchFilter] = (0, import_react.useState)("__all");
	const autoCollapsedRef = (0, import_react.useRef)(false);
	const byId = (0, import_react.useMemo)(() => new Map(employees.map((e) => [e.id, e])), [employees]);
	(0, import_react.useEffect)(() => {
		if (autoCollapsedRef.current) return;
		if (employees.length < AUTO_GRID_THRESHOLD) return;
		const managers = /* @__PURE__ */ new Set();
		employees.forEach((e) => {
			if (e.managerId) managers.add(e.managerId);
		});
		setCollapsed(managers);
		autoCollapsedRef.current = true;
	}, [employees]);
	const q = query.trim().toLowerCase();
	const matchIds = (0, import_react.useMemo)(() => {
		if (!q) return null;
		const s = /* @__PURE__ */ new Set();
		employees.forEach((e) => {
			if (`${e.name} ${e.empCode} ${e.designation} ${e.department} ${e.email ?? ""}`.toLowerCase().includes(q)) s.add(e.id);
		});
		return s;
	}, [q, employees]);
	const filteredEmployees = (0, import_react.useMemo)(() => employees.filter((e) => branchFilter === "__all" ? true : (e.branchId || "__unassigned") === branchFilter), [employees, branchFilter]);
	const byBranch = (0, import_react.useMemo)(() => {
		const g = /* @__PURE__ */ new Map();
		filteredEmployees.forEach((e) => {
			const key = e.branchId || "__unassigned";
			if (!g.has(key)) g.set(key, []);
			g.get(key).push(e);
		});
		return g;
	}, [filteredEmployees]);
	function childrenMapFor(list) {
		const ids = new Set(list.map((e) => e.id));
		const map = /* @__PURE__ */ new Map();
		for (const e of list) {
			const key = e.managerId && ids.has(e.managerId) ? e.managerId : void 0;
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(e);
		}
		for (const [k, arr] of map) {
			arr.sort((a, b) => {
				const ac = map.get(a.id)?.length ?? 0;
				const bc = map.get(b.id)?.length ?? 0;
				if (ac !== bc) return bc - ac;
				return a.name.localeCompare(b.name);
			});
			map.set(k, arr);
		}
		return map;
	}
	function openEdit(e) {
		setTarget(e);
		setAbout(e.about ?? "");
		setManagerId(e.managerId ?? "__none");
		setBranchId(e.branchId ?? "__none");
		setDesignation(e.designation);
		setDepartment(e.department);
		setEditOpen(true);
	}
	function save() {
		if (!target) return;
		if (managerId && managerId !== "__none" && managerId === target.id) return toast.error("An employee cannot report to themselves");
		if (managerId && managerId !== "__none") {
			let cur = managerId;
			const seen = /* @__PURE__ */ new Set();
			while (cur) {
				if (cur === target.id) return toast.error("Cycle detected — pick a different manager");
				if (seen.has(cur)) break;
				seen.add(cur);
				cur = byId.get(cur)?.managerId;
			}
		}
		updateEmployee(target.id, {
			about,
			designation,
			department,
			managerId: managerId === "__none" ? void 0 : managerId,
			branchId: branchId === "__none" ? void 0 : branchId
		});
		toast.success(`${target.name} updated`);
		setEditOpen(false);
	}
	function toggleCollapsed(id) {
		setCollapsed((prev) => {
			const n = new Set(prev);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	}
	function expandAll() {
		setCollapsed(/* @__PURE__ */ new Set());
	}
	function collapseAll() {
		const managers = /* @__PURE__ */ new Set();
		employees.forEach((e) => {
			if (e.managerId) managers.add(e.managerId);
		});
		setCollapsed(managers);
	}
	if (employees.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-dashed border-border p-10 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Network, { className: "h-8 w-8 mx-auto text-muted-foreground mb-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-sm text-muted-foreground",
			children: "Add employees first to build your organization structure."
		})]
	});
	const groupOrder = [...branches.map((b) => b.id), ...byBranch.has("__unassigned") ? ["__unassigned"] : []].filter((k) => byBranch.has(k));
	const totalPeople = employees.length;
	const managerCount = new Set(employees.map((e) => e.managerId).filter(Boolean)).size;
	const topLevel = employees.filter((e) => !e.managerId || !byId.has(e.managerId)).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "font-display text-3xl font-semibold flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Network, { className: "h-6 w-6 text-primary" }), " Organization Structure"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "One manager can have any number of direct reports. Click a card to expand or collapse the team below it."
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-3.5 w-3.5" }),
								" ",
								totalPeople,
								" people · ",
								managerCount,
								" managers · ",
								topLevel,
								" at top"
							]
						}),
						totalPeople > VIRTUALIZE_THRESHOLD && view === "grid" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden sm:flex items-center gap-1 text-[11px] text-primary bg-primary/10 border border-primary/30 rounded-lg px-2 py-1.5",
							title: "Only rows near the viewport are rendered for performance",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3 w-3" }), " Virtualized"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: query,
								onChange: (e) => setQuery(e.target.value),
								placeholder: "Find person, code, dept…",
								className: "h-9 pl-8 w-52"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: branchFilter,
							onValueChange: setBranchFilter,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "h-9 w-40",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "__all",
									children: "All branches"
								}),
								branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: b.id,
									children: b.name
								}, b.id)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "__unassigned",
									children: "Unassigned"
								})
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center rounded-lg border border-border overflow-hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: view === "tree" ? "default" : "ghost",
								size: "sm",
								className: "rounded-none h-9",
								onClick: () => setView("tree"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "h-3.5 w-3.5 mr-1" }), " Tree"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: view === "grid" ? "default" : "ghost",
								size: "sm",
								className: "rounded-none h-9",
								onClick: () => setView("grid"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutGrid, { className: "h-3.5 w-3.5 mr-1" }), " Grid"]
							})]
						}),
						view === "tree" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center rounded-lg border border-border overflow-hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								className: "rounded-none h-9",
								onClick: expandAll,
								title: "Expand all",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize2, { className: "h-3.5 w-3.5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								className: "rounded-none h-9",
								onClick: collapseAll,
								title: "Collapse all",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimize2, { className: "h-3.5 w-3.5" })
							})]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-8",
				children: groupOrder.map((key) => {
					const list = byBranch.get(key);
					const branch = branches.find((b) => b.id === key);
					const cmap = childrenMapFor(list);
					const roots = cmap.get(void 0) ?? [];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-2xl border border-border bg-card p-4 sm:p-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-border",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-soft shrink-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-5 w-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-display font-semibold flex items-center gap-2 flex-wrap",
									children: [
										branch ? branch.name : "Unassigned",
										branch?.isHead && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: "bg-primary text-primary-foreground text-[10px]",
											children: "HQ"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											variant: "outline",
											className: "text-[10px]",
											children: [list.length, " people"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											variant: "outline",
											className: "text-[10px]",
											children: [roots.length, " top-level"]
										})
									]
								}), branch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-3 w-3" }),
												branch.address,
												", ",
												branch.city
											]
										}),
										branch.lat != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											"Geo-fence ",
											branch.radiusMeters ?? 150,
											"m"
										] }),
										branch.shiftStart && branch.shiftEnd && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											"Shift ",
											branch.shiftStart,
											"–",
											branch.shiftEnd
										] })
									]
								})]
							})]
						}), view === "grid" ? list.length > VIRTUALIZE_THRESHOLD ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VirtualGrid, {
							list,
							byId,
							cmap,
							onEdit: openEdit,
							branchName: branch?.name,
							matchIds
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3",
							children: list.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: matchIds && !matchIds.has(e.id) ? "opacity-40" : "",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NameBadge, {
									emp: e,
									manager: e.managerId ? byId.get(e.managerId) : void 0,
									directs: cmap.get(e.id) ?? [],
									onEdit: openEdit,
									branchName: branch?.name
								})
							}, e.id))
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-max py-2",
								children: [roots.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm text-muted-foreground text-center py-4",
									children: "All employees here report to someone in another branch — showing flat:"
								}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex gap-8 justify-center flex-wrap items-start",
									children: (roots.length > 0 ? roots : list).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrgNode, {
										emp: r,
										childrenOf: cmap,
										byId,
										onEdit: openEdit,
										branchName: branch?.name,
										collapsed,
										toggleCollapsed,
										matchIds
									}, r.id))
								})]
							})
						})]
					}, key);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editOpen,
				onOpenChange: setEditOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Edit ", target?.name] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Change role, department, branch, reporting line and description." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Designation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: designation,
									onChange: (e) => setDesignation(e.target.value)
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Department" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: department,
									onChange: (e) => setDepartment(e.target.value)
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Branch" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: branchId,
									onValueChange: setBranchId,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Unassigned" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "__none",
										children: "— Unassigned —"
									}), branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
										value: b.id,
										children: [
											b.name,
											" · ",
											b.code
										]
									}, b.id))] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Reports to" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: managerId,
										onValueChange: setManagerId,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "No manager" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "__none",
											children: "— Top of company —"
										}), employees.filter((e) => e.id !== target?.id).map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
											value: e.id,
											children: [
												e.name,
												" · ",
												e.designation
											]
										}, e.id))] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-muted-foreground mt-1",
										children: "A manager can have any number of direct reports."
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "About / job summary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										rows: 4,
										value: about,
										onChange: (e) => setAbout(e.target.value)
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setEditOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: save,
							className: "bg-gradient-brand text-white",
							children: "Save changes"
						})] })
					]
				})
			})
		]
	});
}
function OrgNode({ emp, childrenOf, byId, onEdit, branchName, collapsed, toggleCollapsed, matchIds }) {
	const kids = childrenOf.get(emp.id) ?? [];
	const manager = emp.managerId ? byId.get(emp.managerId) : void 0;
	const isCollapsed = collapsed.has(emp.id) && kids.length > 0;
	const dim = matchIds && !matchIds.has(emp.id);
	const CHUNK = 6;
	const rows = [];
	if (!isCollapsed && kids.length > 0) for (let i = 0; i < kids.length; i += CHUNK) rows.push(kids.slice(i, i + CHUNK));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex flex-col items-center ${dim ? "opacity-40" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NameBadge, {
				emp,
				manager,
				directs: kids,
				onEdit,
				branchName
			}), kids.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => toggleCollapsed(emp.id),
				className: "absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft hover:scale-110 transition-transform z-10",
				title: isCollapsed ? `Expand ${kids.length} report${kids.length > 1 ? "s" : ""}` : "Collapse team",
				children: isCollapsed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3 w-3" })
			})]
		}), !isCollapsed && rows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-px h-6 bg-border" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-col gap-3",
			children: rows.map((row, ri) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-6 relative justify-center",
				children: [row.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute top-0 h-px bg-border",
					style: {
						left: `112px`,
						right: `112px`
					}
				}), row.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-px h-4 bg-border" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrgNode, {
						emp: k,
						childrenOf,
						byId,
						onEdit,
						branchName,
						collapsed,
						toggleCollapsed,
						matchIds
					})]
				}, k.id))]
			}, ri))
		})] })]
	});
}
function NameBadge({ emp, manager, directs, onEdit, branchName }) {
	const teamSize = directs.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(HoverCard, {
		openDelay: 120,
		closeDelay: 80,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoverCardTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `w-[14rem] rounded-xl border bg-card p-3 shadow-soft hover:shadow-glow transition-all cursor-pointer group relative ${teamSize > 0 ? "border-primary/40" : "border-border"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-12 w-12 rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0",
							children: emp.photoDataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: emp.photoDataUrl,
								className: "h-full w-full object-cover",
								alt: emp.name
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold",
								children: initials(emp.name)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-semibold truncate",
								children: emp.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] text-muted-foreground truncate",
								children: emp.designation
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							className: "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
							onClick: (e) => {
								e.stopPropagation();
								onEdit(emp);
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3 w-3" })
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex items-center gap-1 flex-wrap",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "outline",
							className: "text-[10px] py-0 px-1.5",
							children: emp.department
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "outline",
							className: "text-[10px] py-0 px-1.5",
							children: emp.empCode
						}),
						teamSize > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							className: "bg-primary/15 text-primary border-primary/30 text-[10px] py-0 px-1.5 flex items-center gap-0.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-2.5 w-2.5" }),
								" ",
								teamSize
							]
						})
					]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoverCardContent, {
			className: "w-80",
			side: "right",
			align: "start",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-14 w-14 rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0",
							children: emp.photoDataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: emp.photoDataUrl,
								className: "h-full w-full object-cover",
								alt: emp.name
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-lg",
								children: initials(emp.name)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-semibold truncate",
									children: emp.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-muted-foreground truncate",
									children: [
										emp.designation,
										" · ",
										emp.department
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[11px] text-muted-foreground",
									children: [
										"Emp Code ",
										emp.empCode,
										" · Joined ",
										emp.doj
									]
								})
							]
						})]
					}),
					emp.about && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-2.5 italic",
						children: emp.about
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 gap-1 text-xs",
						children: [
							emp.email && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3 w-3" }),
									" ",
									emp.email
								]
							}),
							emp.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-3 w-3" }),
									" ",
									emp.phone
								]
							}),
							branchName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3 w-3" }),
									" ",
									branchName
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg bg-muted/40 p-2.5 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] uppercase tracking-wide font-medium text-muted-foreground",
								children: "Reporting line"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-2 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "h-3.5 w-3.5 text-primary mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] uppercase text-muted-foreground",
										children: "Reports to"
									}), manager ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "truncate",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-medium",
												children: manager.name
											}),
											" · ",
											manager.designation
										]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-muted-foreground italic",
										children: "Top of company"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-2 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { className: "h-3.5 w-3.5 text-coral mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[10px] uppercase text-muted-foreground",
										children: ["Direct reports · ", directs.length]
									}), directs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-muted-foreground italic",
										children: "No direct reports"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "space-y-0.5 max-h-40 overflow-y-auto pr-1",
										children: directs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "truncate",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-medium",
													children: d.name
												}),
												" · ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-muted-foreground",
													children: d.designation
												})
											]
										}, d.id))
									})]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "outline",
						className: "w-full",
						onClick: () => onEdit(emp),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3.5 w-3.5 mr-1.5" }), " Edit"]
					})
				]
			})
		})]
	});
}
/**
* VirtualGrid — windowed row virtualization for the grid view.
* Only rows in (or near) the viewport render, so a 5,000-employee grid
* still keeps DOM node counts and paint work bounded.
*/
function VirtualGrid({ list, byId, cmap, onEdit, branchName, matchIds }) {
	const containerRef = (0, import_react.useRef)(null);
	const [cols, setCols] = (0, import_react.useState)(4);
	const [scrollMargin, setScrollMargin] = (0, import_react.useState)(0);
	const GAP = 12;
	const ROW_H = 108;
	(0, import_react.useLayoutEffect)(() => {
		if (!containerRef.current) return;
		const el = containerRef.current;
		const measure = () => {
			const w = el.clientWidth;
			setCols(Math.max(1, Math.floor((w + GAP) / 252)));
			setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		window.addEventListener("scroll", measure, { passive: true });
		return () => {
			ro.disconnect();
			window.removeEventListener("scroll", measure);
		};
	}, []);
	const virtualizer = useWindowVirtualizer({
		count: Math.ceil(list.length / cols),
		estimateSize: () => ROW_H,
		overscan: 4,
		scrollMargin
	});
	const items = virtualizer.getVirtualItems();
	const totalSize = virtualizer.getTotalSize();
	const offset = (items[0]?.start ?? 0) - scrollMargin;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: containerRef,
		className: "relative",
		style: { height: totalSize },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				transform: `translateY(${offset}px)`
			},
			children: items.map((row) => {
				const startIdx = row.index * cols;
				const rowItems = list.slice(startIdx, startIdx + cols);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"data-index": row.index,
					ref: virtualizer.measureElement,
					className: "grid gap-3 pb-3",
					style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
					children: rowItems.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: matchIds && !matchIds.has(e.id) ? "opacity-40" : "",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NameBadge, {
							emp: e,
							manager: e.managerId ? byId.get(e.managerId) : void 0,
							directs: cmap.get(e.id) ?? [],
							onEdit,
							branchName
						})
					}, e.id))
				}, row.key);
			})
		})
	});
}
//#endregion
export { OrgPage as component };
