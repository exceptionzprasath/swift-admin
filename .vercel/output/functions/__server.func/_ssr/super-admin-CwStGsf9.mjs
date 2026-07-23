import { f as Outlet } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { d as useAuth, f as useStore } from "./store-Dj1aT4sf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/super-admin-CwStGsf9.js
var import_jsx_runtime = require_jsx_runtime();
function SuperAdminLayout() {
	const { user, isSuperAdmin, loading } = useAuth();
	const demoMode = useStore((s) => s.demoMode);
	const demoSuper = useStore((s) => s.demoSuper);
	if (typeof window !== "undefined" && !loading) {
		if (!(!!user && isSuperAdmin) && !(demoMode && demoSuper)) useStore.getState().seedSuperDemo();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
}
//#endregion
export { SuperAdminLayout as component };
