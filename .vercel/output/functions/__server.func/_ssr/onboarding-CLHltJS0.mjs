import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DaycN9GT.mjs";
import { d as useAuth } from "./store-Dj1aT4sf.mjs";
import { nt as LogOut, ot as LoaderCircle, qt as Building2 } from "../_libs/lucide-react.mjs";
import { n as ThemeToggle } from "./theme-BEP-9Srt.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as SwiftLogo } from "./swift-logo-wcrzygCw.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { n as createOwnedTenant } from "./bootstrap.functions-DpRRWZwv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/onboarding-CLHltJS0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function OnboardingPage() {
	const nav = useNavigate();
	const { user, memberships, isSuperAdmin, loading, refresh, signOut } = useAuth();
	const createTenantFn = useServerFn(createOwnedTenant);
	const [name, setName] = (0, import_react.useState)("");
	const [slug, setSlug] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (loading) return;
		if (!user) {
			nav({ to: "/login" });
			return;
		}
		if (memberships.length > 0) nav({ to: "/admin" });
		else if (isSuperAdmin && memberships.length === 0) {}
	}, [
		user,
		memberships,
		isSuperAdmin,
		loading,
		nav
	]);
	const createTenant = async () => {
		if (!name.trim()) return toast.error("Company name required");
		const cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
		if (!cleanSlug) return toast.error("Invalid slug");
		setBusy(true);
		try {
			await createTenantFn({ data: {
				name,
				slug: cleanSlug,
				legalName: name
			} });
			toast.success("Workspace created");
			await refresh();
			nav({ to: "/admin" });
		} catch (e) {
			toast.error(e.message ?? "Failed to create workspace");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background bg-gradient-mesh",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-center justify-between p-4 sm:p-6 border-b border-border",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwiftLogo, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: async () => {
						await signOut();
						nav({ to: "/login" });
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4 mr-2" }), " Sign out"]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "max-w-xl mx-auto p-6 sm:p-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-5 w-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl sm:text-4xl font-semibold",
					children: "Set up your workspace"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-muted-foreground",
					children: ["Create a company workspace to manage employees, run payroll, and generate documents.", isSuperAdmin && " As super-admin, you can also manage all tenants from the platform console."]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 rounded-2xl border border-border bg-card p-6 shadow-card space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Company name *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "Acme Corporation"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Workspace URL slug" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center rounded-md border border-input bg-background overflow-hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-3 text-sm text-muted-foreground",
									children: "swift.hr/"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "border-0 focus-visible:ring-0",
									value: slug,
									onChange: (e) => setSlug(e.target.value),
									placeholder: "acme"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "w-full h-11 bg-gradient-brand text-white shadow-glow hover:opacity-95",
							onClick: createTenant,
							disabled: busy,
							children: [busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }), "Create workspace"]
						})
					]
				}),
				isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 rounded-2xl border border-dashed border-border p-6 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-medium",
							children: "You're the platform super-admin"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-muted-foreground",
							children: "You can also skip this and manage all tenants across the SaaS from the console."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							className: "mt-3",
							onClick: () => nav({ to: "/super-admin" }),
							children: "Go to Super Admin Console"
						})
					]
				})
			]
		})]
	});
}
//#endregion
export { OnboardingPage as component };
