import { c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, j as redirect, m as createFileRoute, p as lazyRouteComponent, s as Scripts, v as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as ThemeInit } from "./theme-BEP-9Srt.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as Route$24 } from "./login-ZVxp2I45.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-BRY0-jaR.js
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-DQe7_8a9.css";
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$23 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "SWIFT — People. Performance. Progress." },
			{
				name: "description",
				content: "Enterprise HRMS with geo-fenced attendance, face check-in, and configurable payroll for any industry."
			},
			{
				name: "author",
				content: "SWIFT"
			},
			{
				property: "og:title",
				content: "SWIFT — People. Performance. Progress."
			},
			{
				property: "og:description",
				content: "Enterprise HRMS with geo-fenced attendance, face check-in, and configurable payroll for any industry."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			},
			{
				name: "twitter:title",
				content: "SWIFT — People. Performance. Progress."
			},
			{
				name: "twitter:description",
				content: "Enterprise HRMS with geo-fenced attendance, face check-in, and configurable payroll for any industry."
			},
			{
				property: "og:image",
				content: "https://storage.googleapis.com/gpt-engineer-file-uploads/wMauJRXZpcbAEBy9uXM9XoCbIF53/social-images/social-1784253289111-Screenshot_2026-07-09_at_10.06.09_PM.webp"
			},
			{
				name: "twitter:image",
				content: "https://storage.googleapis.com/gpt-engineer-file-uploads/wMauJRXZpcbAEBy9uXM9XoCbIF53/social-images/social-1784253289111-Screenshot_2026-07-09_at_10.06.09_PM.webp"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$23.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeInit, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
				position: "top-right",
				richColors: true
			})
		]
	});
}
var $$splitComponentImporter$21 = () => import("./super-admin-CwStGsf9.mjs");
var Route$22 = createFileRoute("/super-admin")({ component: lazyRouteComponent($$splitComponentImporter$21, "component") });
var $$splitComponentImporter$20 = () => import("./onboarding-CLHltJS0.mjs");
var Route$21 = createFileRoute("/onboarding")({
	head: () => ({ meta: [{ title: "Set up your company · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$20, "component")
});
var $$splitComponentImporter$19 = () => import("./admin-CuqB0taz.mjs");
var Route$20 = createFileRoute("/admin")({
	head: () => ({ meta: [{ title: "Admin · SWIFT HRMS" }] }),
	component: lazyRouteComponent($$splitComponentImporter$19, "component")
});
var Route$19 = createFileRoute("/")({ beforeLoad: () => {
	throw redirect({ to: "/login" });
} });
var $$splitComponentImporter$18 = () => import("./admin.index-DhEbCqiR.mjs");
var Route$18 = createFileRoute("/admin/")({
	head: () => ({ meta: [{ title: "Dashboard · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$18, "component")
});
var $$splitComponentImporter$17 = () => import("./admin.subscription-2esZIbPT.mjs");
var Route$17 = createFileRoute("/admin/subscription")({
	head: () => ({ meta: [{ title: "Subscription · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$17, "component")
});
var $$splitComponentImporter$16 = () => import("./admin.settings-BwX4CYwQ.mjs");
var Route$16 = createFileRoute("/admin/settings")({
	head: () => ({ meta: [{ title: "Settings · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$16, "component")
});
var $$splitComponentImporter$15 = () => import("./admin.salary-revision-CvuZ8RMt.mjs");
var Route$15 = createFileRoute("/admin/salary-revision")({
	head: () => ({ meta: [{ title: "Salary Revision · SWIFT AI" }] }),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("./admin.reports-BHVYx3Yg.mjs");
var Route$14 = createFileRoute("/admin/reports")({
	head: () => ({ meta: [{ title: "Payroll Reports · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var $$splitComponentImporter$13 = () => import("./admin.renewals-Bv6SzXd_.mjs");
var Route$13 = createFileRoute("/admin/renewals")({
	head: () => ({ meta: [{ title: "Renewal Scheduler · SWIFT AI" }] }),
	component: lazyRouteComponent($$splitComponentImporter$13, "component")
});
var $$splitComponentImporter$12 = () => import("./admin.payroll-DbYRZWjf.mjs");
var Route$12 = createFileRoute("/admin/payroll")({
	head: () => ({ meta: [{ title: "Payroll · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./admin.org-CYZOeuVq.mjs");
var Route$11 = createFileRoute("/admin/org")({
	head: () => ({ meta: [{ title: "Organization · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
/**
* VirtualGrid — windowed row virtualization for the grid view.
* Only rows in (or near) the viewport render, so a 5,000-employee grid
* still keeps DOM node counts and paint work bounded.
*/
var $$splitComponentImporter$10 = () => import("./admin.notices-RXRr-pJf.mjs");
var Route$10 = createFileRoute("/admin/notices")({
	head: () => ({ meta: [{ title: "Notices · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./admin.lifecycle-BYbf_B5W.mjs");
var Route$9 = createFileRoute("/admin/lifecycle")({
	head: () => ({ meta: [{ title: "Employee Lifecycle · SWIFT AI" }] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./admin.employees-C5YeB4bR.mjs");
var Route$8 = createFileRoute("/admin/employees")({
	head: () => ({ meta: [{ title: "Employees · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./admin.documents-DiQguRW7.mjs");
var Route$7 = createFileRoute("/admin/documents")({
	head: () => ({ meta: [{ title: "AI Documents · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./admin.compliance-docs-JWCnkcv5.mjs");
var Route$6 = createFileRoute("/admin/compliance-docs")({
	head: () => ({ meta: [{ title: "Compliance Documents · SWIFT AI" }] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./admin.compliance-Ou6HDe5p.mjs");
var Route$5 = createFileRoute("/admin/compliance")({
	head: () => ({ meta: [{ title: "Compliance · SWIFT AI" }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./admin.branches-DM_n9BBg.mjs");
var Route$4 = createFileRoute("/admin/branches")({
	head: () => ({ meta: [{ title: "Branches · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./admin.audit-B_6bsp_l.mjs");
var Route$3 = createFileRoute("/admin/audit")({
	head: () => ({ meta: [{ title: "Audit Log · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./admin.attendance-DjK1t5AY.mjs");
var Route$2 = createFileRoute("/admin/attendance")({
	head: () => ({ meta: [{ title: "Attendance · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./admin.assets-Btq0RM5H.mjs");
var Route$1 = createFileRoute("/admin/assets")({
	head: () => ({ meta: [{ title: "Asset Management · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./admin.ai-JneHRFY6.mjs");
var Route = createFileRoute("/admin/ai")({
	head: () => ({ meta: [{ title: "SWIFT AI · Copilot" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var SuperAdminRoute = Route$22.update({
	id: "/super-admin",
	path: "/super-admin",
	getParentRoute: () => Route$23
});
var OnboardingRoute = Route$21.update({
	id: "/onboarding",
	path: "/onboarding",
	getParentRoute: () => Route$23
});
var LoginRoute = Route$24.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$23
});
var AdminRoute = Route$20.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$23
});
var IndexRoute = Route$19.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$23
});
var AdminIndexRoute = Route$18.update({
	id: "/",
	path: "/",
	getParentRoute: () => AdminRoute
});
var AdminSubscriptionRoute = Route$17.update({
	id: "/subscription",
	path: "/subscription",
	getParentRoute: () => AdminRoute
});
var AdminSettingsRoute = Route$16.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AdminRoute
});
var AdminSalaryRevisionRoute = Route$15.update({
	id: "/salary-revision",
	path: "/salary-revision",
	getParentRoute: () => AdminRoute
});
var AdminReportsRoute = Route$14.update({
	id: "/reports",
	path: "/reports",
	getParentRoute: () => AdminRoute
});
var AdminRenewalsRoute = Route$13.update({
	id: "/renewals",
	path: "/renewals",
	getParentRoute: () => AdminRoute
});
var AdminPayrollRoute = Route$12.update({
	id: "/payroll",
	path: "/payroll",
	getParentRoute: () => AdminRoute
});
var AdminOrgRoute = Route$11.update({
	id: "/org",
	path: "/org",
	getParentRoute: () => AdminRoute
});
var AdminNoticesRoute = Route$10.update({
	id: "/notices",
	path: "/notices",
	getParentRoute: () => AdminRoute
});
var AdminLifecycleRoute = Route$9.update({
	id: "/lifecycle",
	path: "/lifecycle",
	getParentRoute: () => AdminRoute
});
var AdminEmployeesRoute = Route$8.update({
	id: "/employees",
	path: "/employees",
	getParentRoute: () => AdminRoute
});
var AdminDocumentsRoute = Route$7.update({
	id: "/documents",
	path: "/documents",
	getParentRoute: () => AdminRoute
});
var AdminComplianceDocsRoute = Route$6.update({
	id: "/compliance-docs",
	path: "/compliance-docs",
	getParentRoute: () => AdminRoute
});
var AdminComplianceRoute = Route$5.update({
	id: "/compliance",
	path: "/compliance",
	getParentRoute: () => AdminRoute
});
var AdminBranchesRoute = Route$4.update({
	id: "/branches",
	path: "/branches",
	getParentRoute: () => AdminRoute
});
var AdminAuditRoute = Route$3.update({
	id: "/audit",
	path: "/audit",
	getParentRoute: () => AdminRoute
});
var AdminAttendanceRoute = Route$2.update({
	id: "/attendance",
	path: "/attendance",
	getParentRoute: () => AdminRoute
});
var AdminAssetsRoute = Route$1.update({
	id: "/assets",
	path: "/assets",
	getParentRoute: () => AdminRoute
});
var AdminRouteChildren = {
	AdminAiRoute: Route.update({
		id: "/ai",
		path: "/ai",
		getParentRoute: () => AdminRoute
	}),
	AdminAssetsRoute,
	AdminAttendanceRoute,
	AdminAuditRoute,
	AdminBranchesRoute,
	AdminComplianceRoute,
	AdminComplianceDocsRoute,
	AdminDocumentsRoute,
	AdminEmployeesRoute,
	AdminLifecycleRoute,
	AdminNoticesRoute,
	AdminOrgRoute,
	AdminPayrollRoute,
	AdminRenewalsRoute,
	AdminReportsRoute,
	AdminSalaryRevisionRoute,
	AdminSettingsRoute,
	AdminSubscriptionRoute,
	AdminIndexRoute
};
var rootRouteChildren = {
	IndexRoute,
	AdminRoute: AdminRoute._addFileChildren(AdminRouteChildren),
	LoginRoute,
	OnboardingRoute,
	SuperAdminRoute
};
var routeTree = Route$23._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
