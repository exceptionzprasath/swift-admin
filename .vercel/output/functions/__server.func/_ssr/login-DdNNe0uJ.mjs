import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DaycN9GT.mjs";
import { d as useAuth, f as useStore } from "./store-Dj1aT4sf.mjs";
import { S as ShieldCheck, ot as LoaderCircle, y as Sparkles } from "../_libs/lucide-react.mjs";
import { n as ThemeToggle } from "./theme-BEP-9Srt.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as SwiftLogo } from "./swift-logo-wcrzygCw.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Route } from "./login-ZVxp2I45.mjs";
import { t as claimFirstSuperAdmin } from "./bootstrap.functions-DpRRWZwv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DdNNe0uJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const nav = useNavigate();
	const impersonateTenantId = Route.useSearch().impersonateTenantId;
	const { refresh, user, isSuperAdmin, memberships, loading, signIn: authSignIn, signUp: authSignUp } = useAuth();
	const seedDemo = useStore((s) => s.seedDemo);
	useServerFn(claimFirstSuperAdmin);
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (impersonateTenantId) {
			const runImpersonate = async () => {
				const tenantName = "Impersonated Workspace";
				const customMemberships = [{
					tenant_id: impersonateTenantId,
					role: "owner",
					tenant: {
						id: impersonateTenantId,
						name: tenantName,
						slug: "demo-impersonated",
						legal_name: tenantName,
						address: "123 Workspace Ave, India",
						gstin: "29ABCDE1234F1Z5",
						plan: "growth",
						status: "active",
						created_at: (/* @__PURE__ */ new Date()).toISOString()
					}
				}];
				localStorage.setItem("swift-auth-user", JSON.stringify({
					id: crypto.randomUUID(),
					email: "impersonated-admin@demo.swift"
				}));
				localStorage.setItem("swift-auth-role", "user");
				localStorage.setItem("swift-auth-memberships", JSON.stringify(customMemberships));
				localStorage.setItem("swift-active-tenant", impersonateTenantId);
				await refresh();
				seedDemo("admin");
				toast.success("Impersonated workspace admin successfully.");
				nav({ to: "/admin" });
			};
			runImpersonate();
		}
	}, [impersonateTenantId]);
	(0, import_react.useEffect)(() => {
		if (loading || impersonateTenantId) return;
		if (user) if (isSuperAdmin) {
			toast.error("Super Admins belong on the Super Admin Console. Redirecting...");
			setTimeout(() => {
				const superAdminUrl = "http://localhost:5173";
				window.location.href = `${superAdminUrl}/login`;
			}, 1500);
		} else if (memberships.length > 0) nav({ to: "/admin" });
		else {
			toast.error("Restricted to Company Admins. Redirecting to employee portal...");
			setTimeout(() => {
				const employeeUrl = "http://localhost:5175";
				window.location.href = `${employeeUrl}/login`;
			}, 1500);
		}
	}, [
		user,
		isSuperAdmin,
		memberships,
		loading,
		nav,
		impersonateTenantId
	]);
	const handleSignIn = async () => {
		if (!email || !password) return toast.error("Enter email and password");
		if (email.startsWith("super")) return toast.error("Super Admins must sign in on the Super Admin portal.");
		setBusy(true);
		try {
			await authSignIn(email, "admin", password);
			toast.success("Welcome back");
			await refresh();
			nav({ to: "/admin" });
		} catch (e) {
			toast.error(e.message ?? "Sign-in failed");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen grid lg:grid-cols-2 bg-background bg-gradient-mesh",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "hidden lg:flex flex-col justify-between p-10 bg-gradient-brand text-white relative overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwiftLogo, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-4xl font-semibold",
						children: "SWIFT Workspace Admin."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-md text-white/85",
						children: "Configure company branches, structure departments, process monthly payroll, run statutory compliance audits, and issue branded employee documents."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-white/70",
					children: "People. Performance. Progress."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-center p-6 relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute right-4 top-4 sm:right-6 sm:top-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					y: 20
				},
				animate: {
					opacity: 1,
					y: 0
				},
				className: "w-full max-w-md",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "lg:hidden mb-8",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwiftLogo, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-3xl font-semibold",
						children: "Company Admin Portal"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: "Sign in with your admin/HR work email."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "my-6 flex items-center gap-3 text-xs text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-border" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "or with email" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-border" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4 pt-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Work email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "email",
									value: email,
									onChange: (e) => setEmail(e.target.value),
									placeholder: "admin@company.com",
									autoComplete: "email"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "password",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									placeholder: "Enter password",
									autoComplete: "current-password"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								className: "w-full h-11 bg-gradient-brand text-white shadow-glow hover:opacity-95",
								onClick: handleSignIn,
								disabled: busy,
								children: [busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }), "Sign in"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-semibold text-sm",
									children: "Try Instant Demo — no signup"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground mb-3",
								children: "Pre-loaded company admin console with employee records, shifts, salary formulas, asset assignments, and doc templates."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-1 gap-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									className: "h-11 border-primary/40 w-full",
									onClick: () => {
										seedDemo("admin");
										toast.success("Demo Admin signed in");
										nav({ to: "/admin" });
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4 mr-2 text-primary" }), " Admin Demo"]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 text-[11px] text-muted-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: "Admin Credentials:"
								}), " admin@demo / demo123"] })
							})
						]
					})
				]
			})]
		})]
	});
}
//#endregion
export { LoginPage as component };
