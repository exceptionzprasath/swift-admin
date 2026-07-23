import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { Dt as Download, S as ShieldCheck } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.audit-B_6bsp_l.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AuditPage() {
	const { auditLog } = useStore();
	const [q, setQ] = (0, import_react.useState)("");
	const filtered = (0, import_react.useMemo)(() => {
		const t = q.trim().toLowerCase();
		if (!t) return auditLog;
		return auditLog.filter((e) => [
			e.actorName,
			e.entity,
			e.action,
			e.entityId,
			e.ip,
			e.device
		].some((x) => (x ?? "").toString().toLowerCase().includes(t)));
	}, [auditLog, q]);
	const exportCsv = () => {
		const csv = [[
			"Timestamp",
			"Actor",
			"Entity",
			"EntityId",
			"Action",
			"Device",
			"Old",
			"New"
		], ...filtered.map((e) => [
			e.ts,
			e.actorName,
			e.entity,
			e.entityId ?? "",
			e.action,
			e.device ?? "",
			JSON.stringify(e.oldValue ?? ""),
			JSON.stringify(e.newValue ?? "")
		])].map((r) => r.map((v) => `"${String(v).replace(/"/g, "\"\"")}"`).join(",")).join("\n");
		const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
		const a = document.createElement("a");
		a.href = url;
		a.download = `audit-log-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "font-display text-3xl font-semibold flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-6 w-6 text-primary" }), " Audit Log"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Every registration, update, and approval is tracked here."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: q,
					onChange: (e) => setQ(e.target.value),
					placeholder: "Search actor, entity, action…",
					className: "w-64"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					onClick: exportCsv,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 mr-1.5" }), " CSV"]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rounded-2xl border border-border bg-card overflow-hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-muted/50 text-left",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "p-3",
							children: "When"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "p-3",
							children: "Actor"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "p-3",
							children: "Action"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "p-3",
							children: "Entity"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "p-3",
							children: "Details"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					colSpan: 5,
					className: "p-10 text-center text-muted-foreground",
					children: "No audit entries yet."
				}) }) : filtered.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border align-top",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "p-3 whitespace-nowrap text-xs text-muted-foreground",
							children: new Date(e.ts).toLocaleString()
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "p-3",
							children: e.actorName
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "p-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "outline",
								children: e.action
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "p-3 text-xs",
							children: [e.entity, e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ""]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "p-3 text-xs text-muted-foreground max-w-md",
							children: [
								e.newValue ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "new:" }),
									" ",
									JSON.stringify(e.newValue).slice(0, 160)
								] }) : null,
								e.oldValue ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "old:" }),
									" ",
									JSON.stringify(e.oldValue).slice(0, 160)
								] }) : null,
								e.device ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "opacity-70",
									children: e.device
								}) : null
							]
						})
					]
				}, e.id)) })]
			})
		})]
	});
}
//#endregion
export { AuditPage as component };
