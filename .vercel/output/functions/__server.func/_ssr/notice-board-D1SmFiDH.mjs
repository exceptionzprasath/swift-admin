import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { Ft as CircleCheck, Q as Megaphone, f as TriangleAlert, ft as Info, z as Pin } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notice-board-D1SmFiDH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function noticesFor(all, viewer) {
	const now = Date.now();
	return all.filter((n) => !n.expiresAt || new Date(n.expiresAt).getTime() > now).filter((n) => {
		if (viewer.role === "admin") return true;
		const emp = viewer.emp;
		if (!emp) return n.audience.scope === "company";
		const a = n.audience;
		switch (a.scope) {
			case "company": return true;
			case "branch": return !!emp.branchId && a.values.includes(emp.branchId);
			case "department": return a.values.includes(emp.department);
			case "role": return a.values.some((v) => v.toLowerCase() === emp.designation.toLowerCase());
			case "employees": return a.values.includes(emp.id);
		}
	}).sort((a, b) => {
		if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
		const rank = {
			urgent: 3,
			important: 2,
			info: 1
		};
		if (rank[b.priority] !== rank[a.priority]) return rank[b.priority] - rank[a.priority];
		return b.createdAt.localeCompare(a.createdAt);
	});
}
var priTone = {
	urgent: "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300",
	important: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
	info: "border-primary/30 bg-primary/5 text-primary"
};
var priIcon = {
	urgent: TriangleAlert,
	important: Pin,
	info: Info
};
function NoticeBoard({ viewer, userKey, compact, emptyText = "No active notices right now." }) {
	const { notices, markNoticeRead, company } = useStore();
	const list = (0, import_react.useMemo)(() => noticesFor(notices, viewer), [notices, viewer]);
	const unread = list.filter((n) => !n.readBy.includes(userKey)).length;
	const audienceLabel = (n) => {
		if (n.audience.scope === "company") return "Entire company";
		if (n.audience.scope === "branch") return "Branch: " + n.audience.values.map((id) => company.branches?.find((b) => b.id === id)?.name || id).join(", ");
		if (n.audience.scope === "department") return "Dept: " + n.audience.values.join(", ");
		if (n.audience.scope === "role") return "Role: " + n.audience.values.join(", ");
		return `${n.audience.values.length} employee(s)`;
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `relative rounded-2xl border border-border/60 glass ${compact ? "p-4" : "p-5"} overflow-hidden`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-0 top-0 h-1 bg-gradient-brand animate-swift-gradient" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between mb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "font-display font-semibold flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "relative inline-flex h-8 w-8 rounded-full bg-primary/10 items-center justify-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Megaphone, { className: "h-4 w-4 text-primary" }), unread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-full bg-primary/25 animate-swift-ping" })]
						}),
						"Notice Board",
						unread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
							initial: { scale: 0 },
							animate: { scale: 1 },
							className: "ml-1",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								className: "bg-gradient-brand text-white animate-pulse",
								children: [unread, " new"]
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-xs text-muted-foreground",
					children: [list.length, " active"]
				})]
			}),
			list.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm text-muted-foreground text-center py-6",
				children: emptyText
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `space-y-2 ${compact ? "max-h-64 overflow-y-auto pr-1" : ""}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
					initial: false,
					children: list.map((n, idx) => {
						const Icon = priIcon[n.priority];
						const isRead = n.readBy.includes(userKey);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							layout: true,
							initial: {
								opacity: 0,
								x: -12,
								scale: .98
							},
							animate: {
								opacity: 1,
								x: 0,
								scale: 1
							},
							exit: {
								opacity: 0,
								x: 12,
								scale: .98
							},
							transition: {
								type: "spring",
								stiffness: 300,
								damping: 24,
								delay: Math.min(idx * .04, .3)
							},
							whileHover: { x: 2 },
							className: `relative overflow-hidden rounded-xl border p-3 ${priTone[n.priority]} ${isRead ? "opacity-70" : ""} ${!isRead && n.priority === "urgent" ? "animate-swift-glow" : ""}`,
							children: [!isRead && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute left-0 top-0 bottom-0 w-1 bg-current opacity-70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
									animate: n.priority === "urgent" && !isRead ? { rotate: [
										0,
										12,
										-10,
										8,
										-4,
										0
									] } : {},
									transition: {
										duration: 2.2,
										repeat: Infinity
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 mt-0.5 shrink-0" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-1.5",
											children: [
												n.pinned && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { className: "h-3 w-3" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-semibold text-sm",
													children: n.title
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
													variant: "outline",
													className: "text-[10px] uppercase py-0 px-1.5",
													children: n.priority
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[10px] text-muted-foreground",
													children: ["· ", audienceLabel(n)]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs mt-1 whitespace-pre-wrap text-foreground/80",
											children: n.body
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"By ",
												n.createdBy,
												" · ",
												new Date(n.createdAt).toLocaleString(),
												n.expiresAt ? ` · until ${new Date(n.expiresAt).toLocaleDateString()}` : ""
											] }), !isRead && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												size: "sm",
												variant: "ghost",
												className: "h-6 px-2 text-[10px] hover:bg-primary/10",
												onClick: () => markNoticeRead(n.id, userKey),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3 mr-1" }), " Mark read"]
											})]
										})
									]
								})]
							})]
						}, n.id);
					})
				})
			})
		]
	});
}
//#endregion
export { NoticeBoard as t };
