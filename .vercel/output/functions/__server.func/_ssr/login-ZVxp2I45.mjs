import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-ZVxp2I45.js
var $$splitComponentImporter = () => import("./login-DdNNe0uJ.mjs");
var Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Company Admin Sign in · SWIFT" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	validateSearch: (search) => {
		return {
			impersonateTenantId: search.impersonateTenantId,
			impersonateRole: search.impersonateRole
		};
	}
});
//#endregion
export { Route as t };
