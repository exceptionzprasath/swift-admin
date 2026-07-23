import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate, f as Outlet, g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DaycN9GT.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { d as useAuth, f as useStore, o as onCompliance } from "./store-Dj1aT4sf.mjs";
import { $t as BellRing, Bt as ChevronDown, C as ShieldAlert, D as Search, E as Send, G as Network, Gt as CalendarCheck, Ht as ChartColumn, J as MessageSquare, Kt as Calculator, M as Rocket, Nt as Circle, Q as Megaphone, Rt as ChevronRight, S as ShieldCheck, U as Package, Vt as Check, Xt as Bot, Z as Menu, an as ArrowLeft, b as Shield, jt as Clock, k as Scale, kt as CreditCard, n as X, nt as LogOut, o as Users, ot as LoaderCircle, qt as Building2, rn as ArrowRight, t as Zap, ut as LayoutDashboard, w as Settings, xt as FileText, y as Sparkles } from "../_libs/lucide-react.mjs";
import { n as ThemeToggle } from "./theme-BEP-9Srt.mjs";
import { n as buildAiSnapshot, t as askSwiftAi } from "./ai.functions-MiXBoOZ2.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { n as cn, t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { a as renderComplianceDocPDF, i as parseComplianceCommand, n as blobToDataUrl, o as useComplianceDocs } from "./compliance-docs-store-DGgrXYQT.mjs";
import { o as useCompliance } from "./compliance-store-DybZ7xWR.mjs";
import { t as aiGuide } from "./ai-guide-bus-KIenmqGq.mjs";
import { c as useBilling } from "./billing-store-CiCO_-nX.mjs";
import { t as useSuperAdmin } from "./super-admin-store-DqYK3rMv.mjs";
import { t as SwiftLogo } from "./swift-logo-wcrzygCw.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Markdown } from "../_libs/react-markdown+[...].mjs";
import { a as DialogOverlay, c as DialogTrigger, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as require_lib } from "../_libs/jszip+[...].mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { a as Label2, c as Root2, d as SubTrigger2, f as Trigger, i as ItemIndicator2, l as Separator2, n as Content2, o as Portal2, r as Item2, s as RadioItem2, t as CheckboxItem2, u as SubContent2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { i as Trigger$1, n as Portal, r as Root2$1, t as Content2$1 } from "../_libs/radix-ui__react-popover.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-CuqB0taz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
var Sheet = Dialog;
var SheetTrigger = DialogTrigger;
var SheetPortal = DialogPortal;
var SheetOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = DialogOverlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = import_react.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = DialogContent.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = DialogTitle.displayName;
var SheetDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = DialogDescription.displayName;
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger;
var DropdownMenuSubTrigger = import_react.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SubTrigger2, {
	ref,
	className: cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "ml-auto" })]
}));
DropdownMenuSubTrigger.displayName = SubTrigger2.displayName;
var DropdownMenuSubContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubContent2, {
	ref,
	className: cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}));
DropdownMenuSubContent.displayName = SubContent2.displayName;
var DropdownMenuContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	sideOffset,
	className: cn("z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}) }));
DropdownMenuContent.displayName = Content2.displayName;
var DropdownMenuItem = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0", inset && "pl-8", className),
	...props
}));
DropdownMenuItem.displayName = Item2.displayName;
var DropdownMenuCheckboxItem = import_react.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CheckboxItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	checked,
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), children]
}));
DropdownMenuCheckboxItem.displayName = CheckboxItem2.displayName;
var DropdownMenuRadioItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "h-2 w-2 fill-current" }) })
	}), children]
}));
DropdownMenuRadioItem.displayName = RadioItem2.displayName;
var DropdownMenuLabel = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
	...props
}));
DropdownMenuLabel.displayName = Label2.displayName;
var DropdownMenuSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
DropdownMenuSeparator.displayName = Separator2.displayName;
var DropdownMenuShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest opacity-60", className),
		...props
	});
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
function daysBetween(a, b) {
	return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5);
}
function countAttendance(records, empId, sinceIso) {
	const scoped = records.filter((r) => r.employeeId === empId && r.date >= sinceIso);
	return {
		late: scoped.filter((r) => (r.checkIn ?? "") > "09:15").length,
		absent: scoped.filter((r) => r.status === "absent").length,
		leave: scoped.filter((r) => r.status === "leave").length,
		ot: scoped.reduce((a, r) => a + (r.otHours ?? 0), 0),
		total: scoped.length
	};
}
function computeCapabilities(role) {
	const isAdminTier = role === "super_admin" || role === "admin" || role === "hr_manager";
	return {
		canGenerateDocuments: isAdminTier || role === "manager",
		canApproveLeave: isAdminTier || role === "manager",
		canRunPayroll: isAdminTier,
		canManageCompliance: isAdminTier,
		canManageTenants: role === "super_admin",
		canViewAllEmployees: isAdminTier
	};
}
function buildEnterpriseSnapshot(opts) {
	const base = buildAiSnapshot(opts);
	const { company, role, viewerEmployeeId } = opts;
	let employees = opts.employees;
	if (role === "employee" && viewerEmployeeId) employees = employees.filter((e) => e.id === viewerEmployeeId);
	else if (role === "manager" && viewerEmployeeId) employees = employees.filter((e) => e.id === viewerEmployeeId || e.managerId === viewerEmployeeId);
	const today = /* @__PURE__ */ new Date();
	const todayIso = today.toISOString().slice(0, 10);
	const last30 = new Date(today);
	last30.setDate(last30.getDate() - 30);
	const last30Iso = last30.toISOString().slice(0, 10);
	const last90 = new Date(today);
	last90.setDate(last90.getDate() - 90);
	const last90Iso = last90.toISOString().slice(0, 10);
	let notices = [];
	let assets = [];
	let assetAssignments = [];
	let journeys = [];
	let salaryRevisions = [];
	try {
		const s = useStore.getState();
		notices = s.notices ?? [];
		assets = s.assets ?? [];
		assetAssignments = s.assetAssignments ?? [];
		journeys = s.journeys ?? [];
		salaryRevisions = s.salaryRevisions ?? [];
	} catch {}
	let compFiled = [];
	let compDocs = [];
	let compRules = [];
	let compKnowledge = [];
	try {
		const c = useCompliance.getState();
		compFiled = c.filed;
		compDocs = c.documents;
		compRules = c.rules;
		compKnowledge = c.knowledge;
	} catch {}
	let billingState;
	try {
		billingState = useBilling.getState();
	} catch {}
	let superAdminState;
	try {
		if (role === "super_admin") superAdminState = useSuperAdmin.getState();
	} catch {}
	const branches = (company.branches ?? []).map((b) => ({
		id: b.id,
		name: b.name,
		code: b.code,
		city: b.city,
		state: b.state,
		headcount: employees.filter((e) => e.branchId === b.id).length,
		isHead: b.isHead
	}));
	const deptMap = /* @__PURE__ */ new Map();
	for (const e of employees) {
		const key = e.department || "Unassigned";
		(deptMap.get(key) ?? deptMap.set(key, []).get(key)).push(e);
	}
	const departments = [...deptMap.entries()].map(([name, emps]) => {
		const ids = new Set(emps.map((e) => e.id));
		const scoped = opts.attendance.filter((a) => ids.has(a.employeeId) && a.date >= last30Iso);
		const present = scoped.filter((a) => a.status === "present").length;
		return {
			name,
			headcount: emps.length,
			avgAttendance30d: scoped.length ? Math.round(present / scoped.length * 100) : 0
		};
	});
	const activeNotices = notices.filter((n) => !n.expiresAt || n.expiresAt >= todayIso).slice(0, 20).map((n) => ({
		id: n.id,
		title: n.title,
		priority: n.priority,
		createdAt: n.createdAt,
		expiresAt: n.expiresAt,
		pinned: n.pinned,
		scope: n.audience.scope
	}));
	const activeAssignments = assetAssignments.filter((a) => !a.returnedAt);
	const assignedIds = new Set(activeAssignments.map((a) => a.assetId));
	const byCatMap = /* @__PURE__ */ new Map();
	for (const a of assets) byCatMap.set(a.categoryId || "misc", (byCatMap.get(a.categoryId || "misc") ?? 0) + 1);
	const empName = (id) => employees.find((e) => e.id === id)?.name ?? id;
	const assetName = (id) => assets.find((a) => a.id === id)?.name ?? id;
	const recentAssignments = assetAssignments.slice().sort((a, b) => (b.assignedAt ?? "").localeCompare(a.assignedAt ?? "")).slice(0, 10).map((a) => ({
		asset: assetName(a.assetId),
		employee: empName(a.employeeId),
		assignedAt: a.assignedAt,
		returned: !!a.returnedAt
	}));
	const assetSummary = {
		total: assets.length,
		assigned: assignedIds.size,
		available: Math.max(0, assets.length - assignedIds.size),
		byCategory: [...byCatMap.entries()].map(([category, count]) => ({
			category,
			count
		})),
		recentAssignments
	};
	const incompleteJourneys = journeys.filter((j) => j.phase !== "confirmed" && j.phase !== "exited");
	const pendingSteps = [];
	for (const j of incompleteJourneys.slice(0, 30)) for (const st of j.steps) if (st.status === "pending" || st.status === "in_progress") pendingSteps.push({
		employee: empName(j.employeeId),
		step: st.title,
		status: st.status
	});
	const onboarding = {
		incomplete: incompleteJourneys.length,
		pendingSteps: pendingSteps.slice(0, 20)
	};
	const thisYear = todayIso.slice(0, 4);
	const yearRev = salaryRevisions.filter((r) => (r.createdAt ?? "").startsWith(thisYear));
	const salaryRevSummary = {
		pending: salaryRevisions.filter((r) => r.status === "pending").length,
		appliedThisYear: yearRev.filter((r) => r.status === "applied").length,
		totalDeltaMonthly: yearRev.reduce((a, r) => a + ((r.afterBasic ?? 0) - (r.beforeBasic ?? 0)), 0)
	};
	const month = todayIso.slice(0, 7);
	const scopedLeaves = opts.leaves.filter((l) => employees.some((e) => e.id === l.employeeId));
	const leaveCounts = /* @__PURE__ */ new Map();
	for (const l of scopedLeaves) leaveCounts.set(l.employeeId, (leaveCounts.get(l.employeeId) ?? 0) + 1);
	const topRequesters = [...leaveCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({
		name: empName(id),
		count
	}));
	const leavesSummary = {
		pendingApprovals: scopedLeaves.filter((l) => l.status === "pending").length,
		approvedThisMonth: scopedLeaves.filter((l) => l.status === "approved" && l.from.startsWith(month)).length,
		topRequesters
	};
	const in30 = new Date(today);
	in30.setDate(in30.getDate() + 30);
	const in30Iso = in30.toISOString().slice(0, 10);
	const in60 = new Date(today);
	in60.setDate(in60.getDate() + 60);
	const in60Iso = in60.toISOString().slice(0, 10);
	const filingsDue30d = compFiled.filter((f) => f.filedAt >= todayIso && f.filedAt <= in30Iso).length;
	const docsExpiring60d = compDocs.filter((d) => d.expiryDate && d.expiryDate >= todayIso && d.expiryDate <= in60Iso).map((d) => ({
		name: d.name,
		expiry: d.expiryDate
	})).slice(0, 20);
	const complianceExt = {
		...base.compliance,
		filingsDue30d,
		docsExpiring60d,
		activeRules: compRules.filter((r) => r.active).length,
		knowledgeActs: compKnowledge.length
	};
	const tenantSub = billingState?.subscriptions?.find((x) => x.tenantId === "self" || true);
	const tenantInvoices = billingState?.invoices ?? [];
	const outstanding = tenantInvoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((a, i) => a + (i.total ?? 0), 0);
	const billing = tenantSub ? {
		plan: tenantSub.planId,
		status: tenantSub.status,
		renewsOn: tenantSub.renewalAt,
		outstanding,
		overdueInvoices: tenantInvoices.filter((i) => i.status === "overdue").length
	} : void 0;
	const saas = superAdminState && billingState ? {
		subscriptions: billingState.subscriptions.length,
		activeSubscriptions: billingState.subscriptions.filter((x) => x.status === "active").length,
		openTickets: superAdminState.tickets?.filter((t) => t.status !== "resolved" && t.status !== "closed").length ?? 0,
		pendingPayments: superAdminState.paymentSubmissions?.filter((p) => p.status === "pending").length ?? 0
	} : void 0;
	const predictions = [];
	const probationMonths = 6;
	for (const e of employees) {
		if (e.status !== "active" || !e.doj) continue;
		const tenureDays = daysBetween(e.doj, todayIso);
		const att30 = countAttendance(opts.attendance, e.id, last30Iso);
		const att90 = countAttendance(opts.attendance, e.id, last90Iso);
		const lateRate30 = att30.total ? att30.late / att30.total : 0;
		const leaveRate30 = att30.total ? att30.leave / att30.total : 0;
		const absentRate30 = att30.total ? att30.absent / att30.total : 0;
		if (tenureDays >= probationMonths * 30 && tenureDays <= 270) predictions.push({
			id: `conf-${e.id}`,
			kind: "confirmation_eligible",
			subject: e.name,
			subjectId: e.id,
			confidence: 90,
			reason: `Tenure ${Math.floor(tenureDays / 30)} months exceeds probation window.`,
			suggestedAction: "Generate confirmation letter and route for approval."
		});
		const attritionScore = Math.min(100, Math.round(lateRate30 * 40 + absentRate30 * 40 + leaveRate30 * 20));
		if (attritionScore >= 55) predictions.push({
			id: `attr-${e.id}`,
			kind: "attrition_risk",
			subject: e.name,
			subjectId: e.id,
			confidence: attritionScore,
			reason: `Last 30 days: ${att30.late} late, ${att30.absent} absent, ${att30.leave} leave.`,
			suggestedAction: "Skip-level check-in; review workload and compensation."
		});
		if (lateRate30 >= .3 && att30.total >= 5) predictions.push({
			id: `late-${e.id}`,
			kind: "late_pattern",
			subject: e.name,
			subjectId: e.id,
			confidence: Math.round(lateRate30 * 100),
			reason: `${att30.late}/${att30.total} days late in last 30d.`,
			suggestedAction: "Issue advisory; check shift assignment."
		});
		if (att30.ot >= 40) predictions.push({
			id: `ot-${e.id}`,
			kind: "high_overtime",
			subject: e.name,
			subjectId: e.id,
			confidence: Math.min(100, Math.round(att30.ot)),
			reason: `${att30.ot} OT hours in last 30d.`,
			suggestedAction: "Review workload; verify Factory Act OT ceiling."
		});
		if (att90.leave >= 15) predictions.push({
			id: `leave-${e.id}`,
			kind: "high_leave",
			subject: e.name,
			subjectId: e.id,
			confidence: 80,
			reason: `${att90.leave} leave days in last 90d.`,
			suggestedAction: "Verify balance and check wellbeing."
		});
	}
	for (const d of docsExpiring60d) predictions.push({
		id: `exp-${d.name}`,
		kind: "license_expiry",
		subject: d.name,
		confidence: 100,
		reason: `Expires on ${d.expiry}.`,
		suggestedAction: "Renew and upload updated copy to Compliance → Repository."
	});
	for (const a of base.alerts.filter((x) => x.category === "payroll" && x.level === "critical")) predictions.push({
		id: `pay-${a.id}`,
		kind: "payroll_anomaly",
		subject: a.title,
		confidence: 90,
		reason: a.detail,
		suggestedAction: a.action ?? "Open Payroll → Audit."
	});
	const recommendations = [];
	if (base.compliance.missingBank > 0) recommendations.push({
		id: "rec-bank",
		category: "payroll",
		urgency: "high",
		title: `Update bank details for ${base.compliance.missingBank} employees`,
		detail: "Payroll disbursement will fail without account & IFSC."
	});
	const understaffed = branches.filter((b) => b.headcount > 0 && b.headcount < 3);
	if (understaffed.length) recommendations.push({
		id: "rec-branch-staff",
		category: "workforce",
		urgency: "medium",
		title: `Staffing risk at ${understaffed.map((b) => b.name).join(", ")}`,
		detail: "Branch has fewer than 3 active employees — coverage risk."
	});
	if (salaryRevSummary.pending > 0) recommendations.push({
		id: "rec-salrev",
		category: "hr",
		urgency: "medium",
		title: `${salaryRevSummary.pending} salary revision(s) pending approval`,
		detail: "Open Admin → Salary Revision to review and apply."
	});
	if (leavesSummary.pendingApprovals > 5) recommendations.push({
		id: "rec-leave-backlog",
		category: "operations",
		urgency: "medium",
		title: `${leavesSummary.pendingApprovals} leave requests awaiting approval`,
		detail: "Route to appropriate managers or auto-approve per policy."
	});
	if (billing?.status && [
		"past_due",
		"grace",
		"suspended"
	].includes(billing.status)) recommendations.push({
		id: "rec-billing",
		category: "operations",
		urgency: "high",
		title: "Subscription requires attention",
		detail: `Plan status is ${billing.status}. Renew from Billing to avoid disruption.`
	});
	const nodes = [];
	const edges = [];
	nodes.push({
		id: `company:${company.name}`,
		type: "Company",
		label: company.name
	});
	for (const b of branches) {
		const bid = `branch:${b.id}`;
		nodes.push({
			id: bid,
			type: "Branch",
			label: b.name,
			meta: { headcount: b.headcount }
		});
		edges.push({
			from: `company:${company.name}`,
			to: bid,
			rel: "has_branch"
		});
	}
	for (const d of departments) {
		const did = `dept:${d.name}`;
		nodes.push({
			id: did,
			type: "Department",
			label: d.name,
			meta: { headcount: d.headcount }
		});
		edges.push({
			from: `company:${company.name}`,
			to: did,
			rel: "has_department"
		});
	}
	const managerIds = new Set(employees.map((e) => e.managerId).filter(Boolean));
	const empShow = employees.filter((e) => managerIds.has(e.id)).concat(employees.slice(0, 40));
	const empSeen = /* @__PURE__ */ new Set();
	for (const e of empShow) {
		if (empSeen.has(e.id)) continue;
		empSeen.add(e.id);
		const eid = `emp:${e.id}`;
		nodes.push({
			id: eid,
			type: "Employee",
			label: `${e.name} (${e.empCode})`,
			meta: {
				role: e.designation,
				dept: e.department
			}
		});
		if (e.branchId) edges.push({
			from: `branch:${e.branchId}`,
			to: eid,
			rel: "works_at"
		});
		if (e.department) edges.push({
			from: `dept:${e.department}`,
			to: eid,
			rel: "in_department"
		});
		if (e.managerId) edges.push({
			from: `emp:${e.managerId}`,
			to: eid,
			rel: "manages"
		});
	}
	const counts = {
		Company: 1,
		Branch: branches.length,
		Department: departments.length,
		Employee: employees.length,
		Notice: notices.length,
		Asset: assets.length,
		ComplianceRule: compRules.length,
		KnowledgeAct: compKnowledge.length,
		SalaryRevision: salaryRevisions.length,
		DocRequest: opts.docRequests.length
	};
	return {
		...base,
		graph: {
			nodes,
			edges,
			counts
		},
		branches,
		departments,
		notices: activeNotices,
		assets: assetSummary,
		onboarding,
		salaryRevisions: salaryRevSummary,
		leaves: leavesSummary,
		compliance: complianceExt,
		billing,
		saas,
		predictions: predictions.slice(0, 40),
		recommendations,
		capabilities: computeCapabilities(role)
	};
}
/** Role-aware chip prompts for the copilot. */
function suggestionsFor(role) {
	if (role === "employee") return [
		"Show my attendance this month",
		"What's my leave balance?",
		"Request a bonafide certificate",
		"When is my next appraisal?",
		"Show my payslip summary"
	];
	if (role === "manager") return [
		"Who on my team is absent today?",
		"Show pending leave approvals",
		"Which team members are late this week?",
		"Who is eligible for confirmation?",
		"Show overtime hours for my team"
	];
	if (role === "super_admin") return [
		"Show tenant health across all companies",
		"Which tenants have pending payments?",
		"Open support tickets summary",
		"Revenue and renewals this month",
		"Which tenants are on grace period?"
	];
	return [
		"Who is absent today?",
		"Show employees eligible for confirmation",
		"Any payroll anomalies this month?",
		"Which compliance filings are overdue?",
		"Show expiring licenses",
		"Generate today's attendance summary",
		"Who has not completed onboarding?",
		"Show employees eligible for increment"
	];
}
function SwiftAiCopilot({ role = "admin", viewerEmployeeId }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [input, setInput] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [guideActive, setGuideActive] = (0, import_react.useState)(false);
	const [pulse, setPulse] = (0, import_react.useState)(false);
	const [messages, setMessages] = (0, import_react.useState)([{
		role: "assistant",
		content: "Hi — I'm **SWIFT AI**, your enterprise intelligence copilot. I know your company's branches, employees, attendance, payroll, compliance, assets and documents. Ask me anything, or pick a suggestion below."
	}]);
	const scroller = (0, import_react.useRef)(null);
	const ask = useServerFn(askSwiftAi);
	const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();
	const suggestions = (0, import_react.useMemo)(() => suggestionsFor(role), [role]);
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({
			top: 1e9,
			behavior: "smooth"
		});
	}, [messages, busy]);
	(0, import_react.useEffect)(() => {
		const off1 = aiGuide.notify.on((n) => {
			toast(`${n.kind === "rule" ? "🧠" : n.kind === "warn" ? "⚠️" : n.kind === "success" ? "✨" : "💡"} ${n.title}`, { description: n.body });
			setPulse(true);
			setTimeout(() => setPulse(false), 1400);
		});
		const off2 = aiGuide.mode.on((m) => {
			setGuideActive(!!m.active);
			if (m.active) {
				setOpen(true);
				setMessages((prev) => [...prev, {
					role: "assistant",
					content: `🎯 **Guide mode enabled.** I'll walk you through **${m.scope?.replace(/-/g, " ")}** and turn what you tell me into company rules. Ask me anything as we go.`
				}]);
			}
		});
		return () => {
			off1();
			off2();
		};
	}, []);
	const archive = useComplianceDocs((s) => s.archive);
	const tryComplianceCommand = async (text) => {
		const specs = parseComplianceCommand(text);
		if (!specs.length) return null;
		const zip = new import_lib.default();
		const lines = [];
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
				createdBy: "swift-ai",
				approvals: [],
				signed: false,
				sealed: !!s.requiresSeal,
				watermark: s.watermark,
				tags: [s.act, s.kind]
			});
			lines.push(`- **${s.code}** — ${s.title} · ${(blob.size / 1024).toFixed(1)} KB · Ref \`${ref}\``);
		}
		const bundle = await zip.generateAsync({ type: "blob" });
		const url = URL.createObjectURL(bundle);
		const a = document.createElement("a");
		a.href = url;
		a.download = `SWIFT_AI_Docs_${Date.now()}.zip`;
		a.click();
		URL.revokeObjectURL(url);
		return `✅ Generated **${specs.length}** compliance document(s), auto-filled from your tenant data. Bundle downloaded and archived at **/admin/compliance-docs**.\n\n${lines.join("\n")}`;
	};
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
			const cmdResult = await tryComplianceCommand(text);
			if (cmdResult) {
				setMessages((m) => [...m, {
					role: "assistant",
					content: cmdResult
				}]);
				toast.success("Compliance documents generated");
				return;
			}
			const snapshot = buildEnterpriseSnapshot({
				company,
				employees,
				attendance,
				payrolls,
				leaves,
				docRequests,
				role,
				viewerEmployeeId
			});
			const res = await ask({ data: {
				messages: next,
				snapshot
			} });
			if (res.ok) {
				setMessages((m) => [...m, {
					role: "assistant",
					content: res.content
				}]);
				if (/rule\s*(?:added|captured|created)/i.test(res.content)) aiGuide.notify.emit({
					title: "Rule captured",
					body: res.content.slice(0, 120),
					kind: "rule"
				});
			} else setMessages((m) => [...m, {
				role: "assistant",
				content: `⚠️ ${res.error}`
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [!open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
		onClick: () => setOpen(true),
		initial: {
			scale: 0,
			rotate: -90
		},
		animate: {
			scale: 1,
			rotate: 0
		},
		transition: {
			type: "spring",
			stiffness: 200,
			damping: 14
		},
		whileHover: { scale: 1.08 },
		whileTap: { scale: .94 },
		className: "fixed bottom-24 md:bottom-6 left-4 md:left-6 z-50 h-16 w-16 rounded-full flex items-center justify-center animate-swift-float",
		"aria-label": "Open SWIFT AI",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-full bg-gradient-brand opacity-40 animate-swift-ping" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute inset-0 rounded-full bg-gradient-brand opacity-20 animate-swift-ping",
				style: { animationDelay: "0.7s" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "relative h-14 w-14 rounded-full bg-gradient-brand animate-swift-gradient animate-swift-glow flex items-center justify-center text-white shadow-glow",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-6 w-6 drop-shadow" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
						className: "absolute h-2.5 w-2.5 rounded-full bg-white shadow-glow",
						animate: { rotate: 360 },
						transition: {
							duration: 4,
							repeat: Infinity,
							ease: "linear"
						},
						style: {
							transformOrigin: "center",
							top: -6,
							left: "50%",
							marginLeft: -5
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "absolute -top-1 -right-1 h-3.5 w-3.5 text-coral animate-pulse" })
				]
			}),
			(guideActive || pulse) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-coral text-[10px] font-bold text-white grid place-items-center ring-2 ring-background",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3 w-3" })
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			y: 24,
			scale: .94
		},
		animate: {
			opacity: 1,
			y: 0,
			scale: 1
		},
		exit: {
			opacity: 0,
			y: 24,
			scale: .94
		},
		transition: {
			type: "spring",
			stiffness: 260,
			damping: 24
		},
		className: "fixed bottom-40 md:bottom-24 left-4 md:left-6 z-50 w-[min(420px,calc(100vw-1.5rem))] h-[min(640px,calc(100vh-10rem))] md:h-[min(640px,calc(100vh-6rem))] rounded-3xl border border-border/60 glass shadow-2xl flex flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-4 py-3 border-b border-white/10 bg-gradient-brand animate-swift-gradient text-white flex items-center gap-3 relative overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 opacity-30 bg-gradient-mesh pointer-events-none" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative h-9 w-9 rounded-full bg-white/15 grid place-items-center backdrop-blur",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-5 w-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-full ring-2 ring-white/40 animate-swift-ping" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-display font-semibold text-sm flex items-center gap-1.5",
							children: ["SWIFT AI", guideActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] bg-white/25 rounded-full px-2 py-0.5",
								children: "Guide mode"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[11px] opacity-90 flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" }),
								"Tenant-scoped · ",
								company.name
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						className: "text-white hover:bg-white/20 h-8 w-8 relative",
						onClick: () => setOpen(false),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: scroller,
				className: "flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-background/50 to-muted/30",
				children: [
					messages.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 8,
							scale: .98
						},
						animate: {
							opacity: 1,
							y: 0,
							scale: 1
						},
						transition: {
							type: "spring",
							stiffness: 320,
							damping: 26
						},
						className: `flex gap-2 ${m.role === "user" ? "justify-end" : ""}`,
						children: [m.role === "assistant" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-7 w-7 rounded-full bg-gradient-brand grid place-items-center shrink-0 text-white shadow-soft",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-4 w-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "bg-gradient-brand text-white rounded-br-sm shadow-soft" : "bg-card border border-border rounded-bl-sm"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-table:my-2 prose-headings:my-1",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Markdown, { children: m.content })
							})
						})]
					}, i)),
					busy && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: { opacity: 0 },
						animate: { opacity: 1 },
						className: "flex gap-2 items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-7 w-7 rounded-full bg-gradient-brand grid place-items-center text-white",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-4 w-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1",
							children: [
								0,
								1,
								2
							].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "h-1.5 w-1.5 rounded-full bg-primary",
								style: { animation: `swift-typing-dot 1.2s ease-in-out ${d * .15}s infinite` }
							}, d))
						})]
					}),
					messages.length === 1 && !busy && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pt-2 space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), " Suggested"]
						}), suggestions.map((s, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.button, {
							initial: {
								opacity: 0,
								x: -10
							},
							animate: {
								opacity: 1,
								x: 0
							},
							transition: { delay: .1 + idx * .06 },
							onClick: () => send(s),
							className: "block w-full text-left text-xs rounded-xl border border-border px-3 py-2 hover:bg-primary/5 hover:border-primary/40 hover:translate-x-0.5 transition-all",
							children: s
						}, s))]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => {
					e.preventDefault();
					send(input);
				},
				className: "p-2.5 border-t border-border flex gap-2 bg-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: input,
					onChange: (e) => setInput(e.target.value),
					placeholder: guideActive ? "Tell me the rule (e.g. 'Sunday = 2× pay')" : "Ask about your company…",
					disabled: busy,
					className: "flex-1 rounded-full"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					size: "icon",
					disabled: busy || !input.trim(),
					className: "bg-gradient-brand text-white rounded-full shadow-soft hover:shadow-glow transition-shadow",
					children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" })
				})]
			})
		]
	}) })] });
}
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var rid = () => globalThis.crypto?.randomUUID?.() ?? `reg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
var emptyApprovalDefault = () => ({
	stages: [
		"draft",
		"ai_review",
		"hr_review",
		"manager_approval",
		"compliance_approval",
		"digital_signature",
		"final_pdf",
		"archive"
	],
	requireDigitalSignature: true,
	requireSeal: true,
	requireWatermark: false,
	requireQR: true,
	autoArchive: true
});
function seedEntry(partial) {
	const ts = now();
	return {
		id: rid(),
		version: "1.0",
		applicability: {},
		autoFill: [],
		approval: emptyApprovalDefault(),
		amendments: [],
		createdAt: ts,
		updatedAt: ts,
		enabled: true,
		...partial
	};
}
var SEED = [
	{
		kind: "act",
		act: "Tamil Nadu Shops & Establishments Act",
		title: "TN Shops & Establishments Act 1947",
		authority: "TN Labour Dept",
		frequency: "ongoing",
		triggerKind: "conditional",
		state: "Tamil Nadu"
	},
	{
		kind: "act",
		act: "Factories Act",
		title: "Factories Act 1948",
		authority: "DISH",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "EPF",
		title: "Employees' Provident Fund Act 1952",
		authority: "EPFO",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "ESI",
		title: "Employees' State Insurance Act 1948",
		authority: "ESIC",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "Professional Tax",
		title: "State Professional Tax Act",
		authority: "Commercial Tax Dept",
		frequency: "monthly",
		triggerKind: "time",
		dueDay: 30
	},
	{
		kind: "act",
		act: "LWF",
		title: "State Labour Welfare Fund Act",
		authority: "State LWF Board",
		frequency: "half_yearly",
		triggerKind: "time"
	},
	{
		kind: "act",
		act: "Payment of Wages",
		title: "Payment of Wages Act 1936",
		authority: "Labour Dept",
		frequency: "monthly",
		triggerKind: "time",
		dueDay: 7
	},
	{
		kind: "act",
		act: "Minimum Wages",
		title: "Minimum Wages Act 1948",
		authority: "Labour Dept",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "Bonus",
		title: "Payment of Bonus Act 1965",
		authority: "Labour Dept",
		frequency: "annual",
		triggerKind: "time",
		dueMonth: 12,
		dueDay: 30
	},
	{
		kind: "act",
		act: "Gratuity",
		title: "Payment of Gratuity Act 1972",
		authority: "Labour Dept",
		frequency: "on_event",
		triggerKind: "event",
		eventKey: "employee_exit"
	},
	{
		kind: "act",
		act: "Maternity Benefit",
		title: "Maternity Benefit Act 1961",
		authority: "Labour Dept",
		frequency: "on_event",
		triggerKind: "event",
		eventKey: "maternity_declared"
	},
	{
		kind: "act",
		act: "Equal Remuneration",
		title: "Equal Remuneration Act 1976",
		authority: "Labour Dept",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "CLRA",
		title: "Contract Labour (Regulation & Abolition) Act 1970",
		authority: "Labour Dept",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "Apprentices",
		title: "Apprentices Act 1961",
		authority: "BOAT",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "Industrial Relations Code",
		title: "Industrial Relations Code 2020",
		authority: "MoLE",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "OSH Code",
		title: "Occupational Safety, Health & Working Conditions Code 2020",
		authority: "MoLE",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "POSH",
		title: "Sexual Harassment of Women at Workplace Act 2013",
		authority: "ICC/LC",
		frequency: "annual",
		triggerKind: "time",
		dueMonth: 1,
		dueDay: 31
	},
	{
		kind: "act",
		act: "Child Labour",
		title: "Child Labour (Prohibition & Regulation) Act 1986",
		authority: "Labour Dept",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "BOCW",
		title: "Building & Other Construction Workers Act 1996",
		authority: "BOCW Board",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "ISMW",
		title: "Inter-State Migrant Workers Act 1979",
		authority: "Labour Dept",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "act",
		act: "Environment",
		title: "Environmental Compliance (EPA/CPCB)",
		authority: "SPCB/CPCB",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "act",
		act: "Fire Safety",
		title: "State Fire Services Act",
		authority: "Fire Dept",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "act",
		act: "Pollution Control",
		title: "Water & Air (Prevention of Pollution) Acts",
		authority: "SPCB",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "act",
		act: "Factory Licence",
		title: "Factory Licence Renewal",
		authority: "DISH",
		frequency: "annual",
		triggerKind: "time",
		dueMonth: 10,
		dueDay: 31
	},
	{
		kind: "act",
		act: "Shops Registration",
		title: "Shops & Establishments Registration",
		authority: "Labour Dept",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form B",
		title: "Registration Certificate of Establishment",
		frequency: "one_time",
		triggerKind: "manual",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form C",
		title: "Employer's Statement",
		frequency: "annual",
		triggerKind: "time",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form D",
		title: "Renewal of Registration",
		frequency: "annual",
		triggerKind: "time",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form H",
		title: "Notice of Weekly Holiday",
		frequency: "ongoing",
		triggerKind: "conditional",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form P",
		title: "Register of Wages",
		frequency: "monthly",
		triggerKind: "time",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form Q",
		title: "Wage Slip",
		frequency: "monthly",
		triggerKind: "time",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form R",
		title: "Register of Leave",
		frequency: "annual",
		triggerKind: "time",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form S",
		title: "Register of Employees",
		frequency: "ongoing",
		triggerKind: "conditional",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "TN S&E Act",
		code: "Form T",
		title: "Combined Register",
		frequency: "ongoing",
		triggerKind: "conditional",
		state: "Tamil Nadu"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 2",
		title: "Application for Registration & Grant of Licence",
		frequency: "one_time",
		triggerKind: "manual"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 3",
		title: "Licence to Work a Factory",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 3A",
		title: "Amendment of Licence",
		frequency: "on_event",
		triggerKind: "event",
		eventKey: "occupier_changed"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 4",
		title: "Notice of Occupation",
		frequency: "on_event",
		triggerKind: "event",
		eventKey: "occupier_changed"
	},
	{
		kind: "register",
		act: "Factories Act",
		code: "Form 12",
		title: "Register of Adult Workers",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "register",
		act: "Factories Act",
		code: "Form 14",
		title: "Register of Child Workers",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "register",
		act: "Factories Act",
		code: "Form 25",
		title: "Muster Roll",
		frequency: "monthly",
		triggerKind: "time"
	},
	{
		kind: "register",
		act: "Factories Act",
		code: "Form 25A",
		title: "Register of Compensatory Holidays",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "register",
		act: "Factories Act",
		code: "Form 25B",
		title: "Register of Accidents & Dangerous Occurrences",
		frequency: "on_event",
		triggerKind: "event",
		eventKey: "accident_recorded"
	},
	{
		kind: "register",
		act: "Factories Act",
		code: "Form 9",
		title: "Register of Leave with Wages",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "register",
		act: "Factories Act",
		code: "Form 15",
		title: "Register of Leave with Wages (Adult)",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 5",
		title: "Certificate of Fitness",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 6",
		title: "Notice of Change of Manager",
		frequency: "on_event",
		triggerKind: "event",
		eventKey: "manager_changed"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 7",
		title: "Record of Lime Washing / Painting",
		frequency: "ongoing",
		triggerKind: "conditional"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 8",
		title: "Report of Examination of Pressure Vessel",
		frequency: "half_yearly",
		triggerKind: "time"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 8A",
		title: "Report of Examination of Water Sealed Gas Holder",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 18",
		title: "Report of Accident / Dangerous Occurrence",
		frequency: "on_event",
		triggerKind: "event",
		eventKey: "accident_recorded"
	},
	{
		kind: "form",
		act: "Factories Act",
		code: "Form 26",
		title: "Report of Examination of Hoists & Lifts",
		frequency: "annual",
		triggerKind: "time"
	},
	{
		kind: "return",
		act: "Factories Act",
		code: "Form 21",
		title: "Annual Return",
		frequency: "annual",
		triggerKind: "time",
		dueMonth: 1,
		dueDay: 31
	},
	{
		kind: "return",
		act: "Factories Act",
		code: "Form 22",
		title: "Half-Yearly Return",
		frequency: "half_yearly",
		triggerKind: "time",
		dueMonth: 7,
		dueDay: 15
	}
];
var useComplianceRegistry = create()(persist((set, get) => ({
	entries: SEED.map((s) => seedEntry(s)),
	seeded: true,
	addEntry: (e) => {
		const rec = seedEntry(e);
		set((st) => ({ entries: [rec, ...st.entries] }));
		return rec.id;
	},
	updateEntry: (id, patch) => set((st) => ({ entries: st.entries.map((x) => x.id === id ? {
		...x,
		...patch,
		updatedAt: now()
	} : x) })),
	deleteEntry: (id) => set((st) => ({ entries: st.entries.filter((x) => x.id !== id) })),
	toggleEntry: (id) => set((st) => ({ entries: st.entries.map((x) => x.id === id ? {
		...x,
		enabled: !x.enabled,
		updatedAt: now()
	} : x) })),
	addAmendment: (id, a) => set((st) => ({ entries: st.entries.map((x) => x.id === id ? {
		...x,
		amendments: [{
			...a,
			id: rid()
		}, ...x.amendments],
		updatedAt: now()
	} : x) })),
	removeAmendment: (id, amendmentId) => set((st) => ({ entries: st.entries.map((x) => x.id === id ? {
		...x,
		amendments: x.amendments.filter((a) => a.id !== amendmentId),
		updatedAt: now()
	} : x) })),
	duplicateEntry: (id) => {
		const src = get().entries.find((x) => x.id === id);
		if (!src) return null;
		const copy = {
			...src,
			id: rid(),
			title: `${src.title} (copy)`,
			createdAt: now(),
			updatedAt: now()
		};
		set((st) => ({ entries: [copy, ...st.entries] }));
		return copy.id;
	},
	resetSeed: () => set({
		entries: SEED.map((s) => seedEntry(s)),
		seeded: true
	})
}), {
	name: "swift-compliance-registry",
	version: 1
}));
var useTriggerAlerts = create()(persist((set, get) => ({
	alerts: [],
	dismissed: {},
	acknowledgedActions: {},
	ingest: (list) => {
		const existing = new Set(get().alerts.map((a) => a.id));
		const dismissed = get().dismissed;
		const fresh = list.filter((a) => !existing.has(a.id) && !dismissed[a.id]);
		if (fresh.length === 0) return 0;
		set((s) => ({ alerts: [...fresh, ...s.alerts].slice(0, 200) }));
		return fresh.length;
	},
	dismiss: (id) => set((s) => ({
		alerts: s.alerts.filter((a) => a.id !== id),
		dismissed: {
			...s.dismissed,
			[id]: (/* @__PURE__ */ new Date()).toISOString()
		}
	})),
	dismissAll: () => set((s) => ({
		alerts: [],
		dismissed: {
			...s.dismissed,
			...Object.fromEntries(s.alerts.map((a) => [a.id, (/* @__PURE__ */ new Date()).toISOString()]))
		}
	})),
	acknowledgeAction: (id) => set((s) => ({ acknowledgedActions: {
		...s.acknowledgedActions,
		[id]: (/* @__PURE__ */ new Date()).toISOString()
	} })),
	clear: () => set({
		alerts: [],
		dismissed: {},
		acknowledgedActions: {}
	})
}), {
	name: "swift-trigger-alerts",
	version: 1
}));
function isApplicable(e, p) {
	const a = e.applicability;
	if (!a) return true;
	if (a.minEmployees != null && p.employeeCount < a.minEmployees) return false;
	if (a.maxEmployees != null && p.employeeCount > a.maxEmployees) return false;
	if (a.minWomen != null && p.womenEmployees < a.minWomen) return false;
	if (a.states?.length && p.state && !a.states.some((s) => s.toLowerCase() === p.state.toLowerCase())) return false;
	if (a.industries?.length && p.industry && !a.industries.includes(p.industry)) return false;
	if (a.establishmentTypes?.length && !a.establishmentTypes.includes(p.establishmentType)) return false;
	if (a.requiresContractLabour && !p.contractLabour) return false;
	if (a.requiresHazardous && !p.hazardous) return false;
	if (a.requiresNightShift && !p.shiftOperations) return false;
	if (a.requiresPower && !p.powerUsed) return false;
	if (e.state && p.state && e.state.toLowerCase() !== p.state.toLowerCase()) return false;
	return true;
}
function daysUntil(iso) {
	return Math.ceil((Date.parse(iso) - Date.now()) / 864e5);
}
function nextDueDate(e) {
	const now = /* @__PURE__ */ new Date();
	const y = now.getUTCFullYear();
	const m = now.getUTCMonth() + 1;
	const dueDay = e.dueDay ?? 0;
	const dueMonth = e.dueMonth ?? 0;
	switch (e.frequency) {
		case "monthly": {
			const target = new Date(Date.UTC(y, m - 1, Math.max(1, dueDay || 15)));
			if (target.getTime() < now.getTime()) target.setUTCMonth(target.getUTCMonth() + 1);
			return target.toISOString().slice(0, 10);
		}
		case "quarterly": {
			const nextQ = Math.floor(now.getUTCMonth() / 3) * 3 + 3;
			return new Date(Date.UTC(y, nextQ, Math.max(1, dueDay || 15))).toISOString().slice(0, 10);
		}
		case "half_yearly": {
			const half = now.getUTCMonth() < 6 ? 6 : 12;
			return new Date(Date.UTC(y, half - 1, Math.max(1, dueDay || 15))).toISOString().slice(0, 10);
		}
		case "annual":
		case "financial_year":
		case "calendar_year": {
			const target = new Date(Date.UTC(y, Math.max(0, (dueMonth || 12) - 1), Math.max(1, dueDay || 31)));
			if (target.getTime() < now.getTime()) target.setUTCFullYear(y + 1);
			return target.toISOString().slice(0, 10);
		}
		case "biennial": return new Date(Date.UTC(y + 1, Math.max(0, (dueMonth || 12) - 1), Math.max(1, dueDay || 31))).toISOString().slice(0, 10);
		default: return;
	}
}
function severityFor(days, defaults) {
	const ladder = defaults?.length ? defaults : [
		30,
		15,
		7,
		3,
		1
	];
	if (days <= (ladder[ladder.length - 1] ?? 1)) return "critical";
	if (days <= (ladder[Math.max(0, ladder.length - 3)] ?? 7)) return "warn";
	return "info";
}
function buildAlert(e, kind, severity, why, dueDate, eventKey) {
	const suffix = eventKey ?? dueDate ?? "now";
	return {
		id: `${e.id}::${kind}::${suffix}`,
		entryId: e.id,
		kind,
		severity,
		title: `${e.code ? `${e.code} — ` : ""}${e.title}`,
		why,
		law: `${e.act}${e.section ? ` § ${e.section}` : ""}${e.rule ? ` · ${e.rule}` : ""}`,
		documents: [e.code, e.title].filter(Boolean),
		penalty: e.penalty,
		suggestedAction: e.aiInstructions || (e.kind === "form" ? `Generate ${e.code ?? e.title}` : e.kind === "register" ? `Update ${e.code ?? e.title}` : e.kind === "return" ? `File ${e.code ?? e.title}` : e.kind === "licence" ? `Renew ${e.title}` : `Review ${e.title}`),
		eventKey,
		dueDate,
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
/** Scan all entries → produce time + conditional alerts (event alerts come from the bus). */
function scanRegistry({ entries, profile }) {
	const out = [];
	for (const e of entries) {
		if (!e.enabled) continue;
		if (!isApplicable(e, profile)) continue;
		if (e.expiryDate) {
			const d = daysUntil(e.expiryDate);
			if (d <= 60) out.push(buildAlert(e, "time", d <= 7 ? "critical" : d <= 30 ? "warn" : "info", `${e.kind === "licence" ? "Licence" : "Entry"} expires in ${d} day(s) on ${e.expiryDate}.`, e.expiryDate));
		}
		if (e.triggerKind === "time" || [
			"monthly",
			"quarterly",
			"half_yearly",
			"annual",
			"financial_year",
			"calendar_year",
			"biennial"
		].includes(e.frequency)) {
			const due = nextDueDate(e);
			if (due) {
				const d = daysUntil(due);
				const ladder = e.reminderDays?.length ? e.reminderDays : [
					30,
					15,
					7,
					3,
					1
				];
				if (d <= (ladder[0] ?? 30)) out.push(buildAlert(e, "time", severityFor(d, ladder), `${e.title} is due in ${d} day(s) (${due}).`, due));
			}
		}
		if (e.triggerKind === "conditional") {
			const min = e.applicability?.minEmployees;
			if (min != null && profile.employeeCount >= min && profile.employeeCount < min * 1.5) out.push(buildAlert(e, "conditional", "info", `Company crossed ${min} employees — ${e.title} is now applicable.`));
			if (e.applicability?.minWomen && profile.womenEmployees >= e.applicability.minWomen) out.push(buildAlert(e, "conditional", "info", `${profile.womenEmployees} women employee(s) — ${e.title} now applies.`));
		}
	}
	return out;
}
/** Given a fired event key, produce alerts for every registry entry bound to it. */
function alertsForEvent(entries, profile, eventKey, subject) {
	const out = [];
	for (const e of entries) {
		if (!e.enabled) continue;
		if (e.triggerKind !== "event" || e.eventKey !== eventKey) continue;
		if (!isApplicable(e, profile)) continue;
		out.push(buildAlert(e, "event", "warn", `Event "${eventKey}"${subject ? ` for ${subject}` : ""} — action required per ${e.act}.`, void 0, eventKey));
	}
	return out;
}
var Popover = Root2$1;
var PopoverTrigger = Trigger$1;
var PopoverContent = import_react.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}) }));
PopoverContent.displayName = Content2$1.displayName;
var SEVERITY_STYLE = {
	info: "border-primary/30 bg-primary/5",
	warn: "border-amber-500/40 bg-amber-500/5",
	critical: "border-destructive/40 bg-destructive/5"
};
var KIND_ICON = {
	event: Zap,
	time: Clock,
	conditional: ShieldAlert
};
function AiTriggerBell() {
	const { entries } = useComplianceRegistry();
	const { profile } = useCompliance();
	const { alerts, ingest, dismiss, dismissAll } = useTriggerAlerts();
	const [open, setOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const run = () => {
			const list = scanRegistry({
				entries,
				profile
			});
			ingest(list);
		};
		run();
		const id = setInterval(run, 300 * 1e3);
		return () => clearInterval(id);
	}, [
		entries,
		profile,
		ingest
	]);
	(0, import_react.useEffect)(() => {
		const off = onCompliance((event, payload) => {
			const list = alertsForEvent(entries, profile, event, payload.subject);
			if (ingest(list) > 0) setOpen(true);
		});
		return () => {
			off();
		};
	}, [
		entries,
		profile,
		ingest
	]);
	const grouped = (0, import_react.useMemo)(() => {
		const g = {
			event: [],
			time: [],
			conditional: []
		};
		for (const a of alerts) g[a.kind].push(a);
		return g;
	}, [alerts]);
	const critical = alerts.filter((a) => a.severity === "critical").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "ghost",
				size: "icon",
				className: "relative group",
				title: "AI Compliance Alerts",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellRing, { className: `h-5 w-5 transition-colors ${critical ? "text-destructive" : "group-hover:text-primary"} ${alerts.length > 0 ? "animate-swift-ring" : ""}` }), alerts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute inset-0 rounded-full ${critical ? "bg-destructive/20" : "bg-primary/20"} animate-swift-ping` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background ${critical ? "bg-destructive animate-pulse" : "bg-gradient-brand animate-swift-gradient"}`,
					children: alerts.length > 99 ? "99+" : alerts.length
				})] })]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
			align: "end",
			className: "w-[380px] p-0 max-h-[80vh] overflow-hidden flex flex-col animate-swift-slide-up glass border-border/60",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between p-3 border-b bg-gradient-brand/5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "relative inline-flex h-6 w-6 rounded-full bg-primary/10 items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3.5 w-3.5 text-primary" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-sm",
							children: "AI Compliance Alerts"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "outline",
							className: "text-xs",
							children: alerts.length
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1",
					children: alerts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						className: "h-7 text-xs",
						onClick: () => dismissAll(),
						children: "Clear all"
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-auto flex-1",
				children: alerts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-8 text-center text-sm text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-8 w-8 mx-auto mb-2 opacity-40" }), "No new alerts. SWIFT AI is watching your compliance events."]
				}) : [
					"event",
					"time",
					"conditional"
				].map((k) => grouped[k].length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40 sticky top-0",
					children: [
						k === "event" ? "Event triggers" : k === "time" ? "Time-bound filings" : "Newly applicable",
						" · ",
						grouped[k].length
					]
				}), grouped[k].map((a) => {
					const Icon = KIND_ICON[a.kind];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `p-3 border-l-2 border-b ${SEVERITY_STYLE[a.severity]}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 flex-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-medium truncate",
											children: a.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "outline",
											className: "text-[10px] capitalize",
											children: a.severity
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground mt-0.5",
										children: a.why
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1.5 text-[11px] space-y-0.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground",
												children: "Law: "
											}), a.law] }),
											a.penalty && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground",
												children: "Penalty: "
											}), a.penalty] }),
											a.dueDate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground",
												children: "Due: "
											}), a.dueDate] })
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-2 flex gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
											to: "/admin/compliance",
											onClick: () => setOpen(false),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												size: "sm",
												className: "h-7 text-xs",
												children: [a.suggestedAction, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-3 w-3 ml-1" })]
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											className: "h-7 w-7",
											onClick: () => dismiss(a.id),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
										})]
									})
								]
							})]
						})
					}, a.id);
				})] }, k))
			})]
		})]
	});
}
function threadIdFor(a, b) {
	return [a, b].sort().join("::");
}
var useChat = create()(persist((set, get) => ({
	messages: [],
	send: ({ from, fromName, to, text }) => {
		const msg = {
			id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
			threadId: threadIdFor(from, to),
			from,
			fromName,
			text: text.trim(),
			at: (/* @__PURE__ */ new Date()).toISOString(),
			read: false
		};
		set((s) => ({ messages: [...s.messages, msg] }));
		return msg;
	},
	markRead: (threadId, viewer) => set((s) => ({ messages: s.messages.map((m) => m.threadId === threadId && m.from !== viewer ? {
		...m,
		read: true
	} : m) })),
	unreadFor: (viewer) => get().messages.filter((m) => m.from !== viewer && !m.read && m.threadId.includes(viewer)).length,
	threadMessages: (a, b) => {
		const tid = threadIdFor(a, b);
		return get().messages.filter((m) => m.threadId === tid).sort((x, y) => x.at.localeCompare(y.at));
	},
	clearThread: (tid) => set((s) => ({ messages: s.messages.filter((m) => m.threadId !== tid) }))
}), { name: "swift-internal-chat" }));
var ADMIN_CHAT_ID = "admin@swift";
function InternalChat({ me, contacts, title = "Internal Chat" }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [activeId, setActiveId] = (0, import_react.useState)(null);
	const [text, setText] = (0, import_react.useState)("");
	const [q, setQ] = (0, import_react.useState)("");
	const { messages, send, markRead, threadMessages } = useChat();
	const scrollRef = (0, import_react.useRef)(null);
	const filtered = (0, import_react.useMemo)(() => contacts.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())), [contacts, q]);
	const unreadByContact = (0, import_react.useMemo)(() => {
		const map = {};
		for (const c of contacts) {
			const tid = threadIdFor(me.id, c.id);
			map[c.id] = messages.filter((m) => m.threadId === tid && m.from !== me.id && !m.read).length;
		}
		return map;
	}, [
		messages,
		contacts,
		me.id
	]);
	const totalUnread = Object.values(unreadByContact).reduce((a, b) => a + b, 0);
	const active = contacts.find((c) => c.id === activeId) ?? null;
	const thread = active ? threadMessages(me.id, active.id) : [];
	(0, import_react.useEffect)(() => {
		if (active) markRead(threadIdFor(me.id, active.id), me.id);
	}, [
		active,
		messages.length,
		markRead,
		me.id
	]);
	(0, import_react.useEffect)(() => {
		if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [
		thread.length,
		open,
		active
	]);
	const handleSend = () => {
		if (!active || !text.trim()) return;
		send({
			from: me.id,
			fromName: me.name,
			to: active.id,
			text
		});
		setText("");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
		onClick: () => setOpen((o) => !o),
		initial: { scale: 0 },
		animate: { scale: 1 },
		whileHover: { scale: 1.08 },
		whileTap: { scale: .92 },
		transition: {
			type: "spring",
			stiffness: 260,
			damping: 18
		},
		className: "fixed z-50 bottom-24 md:bottom-6 right-4 h-13 w-13 h-13 rounded-full bg-gradient-brand animate-swift-gradient shadow-glow text-white flex items-center justify-center",
		style: {
			height: 52,
			width: 52
		},
		"aria-label": "Open internal chat",
		children: [
			totalUnread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-full bg-primary/40 animate-swift-ping" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "h-5 w-5 relative" }),
			totalUnread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
				initial: { scale: 0 },
				animate: { scale: 1 },
				className: "absolute -top-1 -right-1 bg-coral text-white text-[10px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-semibold ring-2 ring-background",
				children: totalUnread
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			y: 24,
			scale: .94
		},
		animate: {
			opacity: 1,
			y: 0,
			scale: 1
		},
		exit: {
			opacity: 0,
			y: 24,
			scale: .94
		},
		transition: {
			type: "spring",
			stiffness: 260,
			damping: 24
		},
		className: "fixed z-50 bottom-40 md:bottom-24 right-4 w-[92vw] sm:w-[380px] h-[min(540px,calc(100vh-10rem))] rounded-3xl border border-border/60 glass shadow-2xl flex flex-col overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-brand animate-swift-gradient text-white relative overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 opacity-25 bg-gradient-mesh pointer-events-none" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 relative min-w-0",
					children: [
						active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setActiveId(null),
							className: "p-1 rounded-full hover:bg-white/20",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-8 w-8 rounded-full bg-white/15 grid place-items-center backdrop-blur shrink-0",
							children: active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-bold",
								children: active.name.slice(0, 2).toUpperCase()
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium text-sm truncate",
								children: active ? active.name : title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[10px] opacity-90 flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" }), active?.sub ?? "Online now"]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setOpen(false),
					"aria-label": "Close",
					className: "p-1.5 rounded-full hover:bg-white/20 relative",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
			mode: "wait",
			children: !active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					x: -20
				},
				animate: {
					opacity: 1,
					x: 0
				},
				exit: {
					opacity: 0,
					x: -20
				},
				className: "flex-1 overflow-y-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-3 border-b border-border sticky top-0 bg-card/90 backdrop-blur z-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: q,
								onChange: (e) => setQ(e.target.value),
								placeholder: "Search contacts…",
								className: "pl-8 h-8 text-sm rounded-full"
							})]
						})
					}),
					filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-6 text-center text-xs text-muted-foreground",
						children: "No contacts"
					}),
					filtered.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
						initial: {
							opacity: 0,
							y: 6
						},
						animate: {
							opacity: 1,
							y: 0
						},
						transition: { delay: Math.min(i * .03, .3) },
						onClick: () => setActiveId(c.id),
						className: "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 text-left border-b border-border/40 group transition-colors",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative h-10 w-10 rounded-full bg-gradient-brand text-white text-xs flex items-center justify-center font-semibold shrink-0 shadow-soft",
								children: [c.name.slice(0, 2).toUpperCase(), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-card" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm font-medium truncate group-hover:text-primary transition-colors",
									children: c.name
								}), c.sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-muted-foreground truncate",
									children: c.sub
								})]
							}),
							unreadByContact[c.id] > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								className: "bg-coral text-white text-[10px] h-5 rounded-full animate-pulse",
								children: unreadByContact[c.id]
							})
						]
					}, c.id))
				]
			}, "list") : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					x: 20
				},
				animate: {
					opacity: 1,
					x: 0
				},
				exit: {
					opacity: 0,
					x: 20
				},
				className: "flex-1 flex flex-col min-h-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					ref: scrollRef,
					className: "flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-muted/20 to-background/40",
					children: [thread.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center text-xs text-muted-foreground py-8",
						children: ["Start the conversation with ", active.name]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
						initial: false,
						children: thread.map((m) => {
							const mine = m.from === me.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
								layout: true,
								initial: {
									opacity: 0,
									y: 8,
									scale: .96
								},
								animate: {
									opacity: 1,
									y: 0,
									scale: 1
								},
								transition: {
									type: "spring",
									stiffness: 320,
									damping: 26
								},
								className: `flex ${mine ? "justify-end" : "justify-start"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-soft ${mine ? "bg-gradient-brand text-white rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "whitespace-pre-wrap break-words",
										children: m.text
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `text-[10px] mt-1 ${mine ? "text-white/70" : "text-muted-foreground"}`,
										children: new Date(m.at).toLocaleTimeString("en-IN", {
											hour: "2-digit",
											minute: "2-digit"
										})
									})]
								})
							}, m.id);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-2 border-t border-border flex items-center gap-2 bg-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: text,
						onChange: (e) => setText(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						},
						placeholder: `Message ${active.name}…`,
						className: "h-9 text-sm rounded-full"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						onClick: handleSend,
						disabled: !text.trim(),
						className: "bg-gradient-brand text-white rounded-full h-9 w-9 shadow-soft hover:shadow-glow transition-shadow",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" })
					})]
				})]
			}, "thread")
		})]
	}) })] });
}
function AdminInternalChat() {
	const { employees, currentUser } = useStore();
	const contacts = employees.filter((e) => e.status === "active").map((e) => ({
		id: e.id,
		name: e.name,
		sub: `${e.empCode ?? ""} · ${e.designation ?? ""}`.replace(/^ · /, "")
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InternalChat, {
		me: {
			id: ADMIN_CHAT_ID,
			name: currentUser?.name ?? "HR / Admin"
		},
		contacts,
		title: "Message employees"
	});
}
var nav = [
	{
		to: "/admin",
		label: "Dashboard",
		icon: LayoutDashboard,
		exact: true
	},
	{
		to: "/admin/ai",
		label: "SWIFT AI",
		icon: Sparkles
	},
	{
		to: "/admin/notices",
		label: "Notice Board",
		icon: Megaphone
	},
	{
		to: "/admin/employees",
		label: "Employees",
		icon: Users
	},
	{
		to: "/admin/lifecycle",
		label: "AI Lifecycle",
		icon: Rocket
	},
	{
		to: "/admin/branches",
		label: "Branches",
		icon: Building2
	},
	{
		to: "/admin/org",
		label: "Organization",
		icon: Network
	},
	{
		to: "/admin/attendance",
		label: "Attendance",
		icon: CalendarCheck
	},
	{
		to: "/admin/payroll",
		label: "Payroll & AI Decisions",
		icon: Calculator
	},
	{
		to: "/admin/reports",
		label: "Reports",
		icon: ChartColumn
	},
	{
		to: "/admin/assets",
		label: "Assets",
		icon: Package
	},
	{
		to: "/admin/documents",
		label: "Documents",
		icon: FileText
	},
	{
		to: "/admin/compliance",
		label: "Compliance AI",
		icon: Scale
	},
	{
		to: "/admin/compliance-docs",
		label: "Compliance Docs",
		icon: ShieldCheck
	},
	{
		to: "/admin/audit",
		label: "Audit Log",
		icon: ShieldCheck
	},
	{
		to: "/admin/subscription",
		label: "Subscription",
		icon: CreditCard
	},
	{
		to: "/admin/renewals",
		label: "Renewal Scheduler",
		icon: BellRing
	},
	{
		to: "/admin/settings",
		label: "Settings",
		icon: Settings
	}
];
function AdminLayout() {
	const navigate = useNavigate();
	const path = useRouterState({ select: (s) => s.location.pathname });
	const { user, loading, isSuperAdmin, memberships, activeTenantId, setActiveTenant, signOut } = useAuth();
	const { company, demoMode, exitDemo, loadCompanyState } = useStore();
	const [mobileOpen, setMobileOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!demoMode && activeTenantId) loadCompanyState(activeTenantId);
	}, [
		activeTenantId,
		demoMode,
		loadCompanyState
	]);
	(0, import_react.useEffect)(() => {
		if (demoMode) return;
		if (loading) return;
		if (!user) {
			navigate({ to: "/login" });
			return;
		}
		if (memberships.length === 0 && !isSuperAdmin) navigate({ to: "/onboarding" });
	}, [
		user,
		loading,
		memberships,
		isSuperAdmin,
		navigate,
		demoMode
	]);
	(0, import_react.useEffect)(() => {
		setMobileOpen(false);
	}, [path]);
	if (!demoMode && (loading || !user)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen flex items-center justify-center bg-background text-muted-foreground",
		children: "Loading…"
	});
	const activeTenant = memberships.find((m) => m.tenant_id === activeTenantId)?.tenant;
	const displayName = demoMode ? `${company.name} · DEMO` : activeTenant?.name ?? company.name;
	const userEmail = demoMode ? "admin@demo.swift" : user?.email;
	const SidebarBody = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-5 border-b border-sidebar-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwiftLogo, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
			className: "flex-1 p-3 space-y-1 overflow-y-auto",
			children: nav.map((n) => {
				const active = n.exact ? path === n.to : path.startsWith(n.to);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: n.to,
					className: `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-gradient-brand text-white shadow-soft" : "text-sidebar-foreground hover:bg-sidebar-accent"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(n.icon, { className: "h-4 w-4 shrink-0" }), n.label]
				}, n.to);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-3 border-t border-sidebar-border",
			children: [isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "http://localhost:5173",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					className: "w-full mb-2 justify-start",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4 mr-2 text-primary" }), " Super Admin"]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg bg-sidebar-accent p-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-medium truncate",
					children: userEmail
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted-foreground truncate",
					children: displayName
				})]
			})]
		})
	] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen flex bg-background text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
				className: "hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar",
				children: SidebarBody
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 flex flex-col min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "h-14 border-b border-border flex items-center justify-between px-4 sm:px-6 gap-2 sticky top-0 bg-background/95 backdrop-blur z-30",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
							open: mobileOpen,
							onOpenChange: setMobileOpen,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTrigger, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon",
									className: "md:hidden",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" })
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetContent, {
								side: "left",
								className: "p-0 w-64 bg-sidebar flex flex-col",
								children: SidebarBody
							})]
						}), memberships.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								size: "sm",
								className: "gap-2 max-w-[180px] sm:max-w-none",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-4 w-4 shrink-0" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate text-sm",
										children: displayName
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3 w-3 opacity-60" })
								]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
							align: "start",
							className: "w-64",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuLabel, { children: "Switch workspace" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
								memberships.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
									onClick: () => setActiveTenant(m.tenant_id),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-4 w-4 mr-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "truncate",
											children: m.tenant.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground truncate",
											children: ["Role: ", m.role]
										})]
									})]
								}, m.tenant_id))
							]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-muted-foreground truncate hidden sm:inline",
							children: displayName
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiTriggerBell, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								size: "sm",
								onClick: async () => {
									if (demoMode) exitDemo();
									else await signOut();
									navigate({ to: "/login" });
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4 sm:mr-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hidden sm:inline",
									children: "Logout"
								})]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "flex-1 overflow-auto p-4 sm:p-6 pb-24 md:pb-6 safe-bottom",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwiftAiCopilot, { role: isSuperAdmin ? "super_admin" : "admin" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminInternalChat, {})
		]
	});
}
//#endregion
export { AdminLayout as component };
