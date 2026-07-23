import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { d as useAuth, f as useStore } from "./store-Dj1aT4sf.mjs";
import { c as useBilling } from "./billing-store-CiCO_-nX.mjs";
require_jsx_runtime();
function useSubscriptionContext() {
	const { activeTenantId } = useAuth();
	const { demoMode } = useStore();
	const tenantId = activeTenantId ?? (demoMode ? "demo-tenant" : "default");
	const { plans, subscriptions, ensureSubscription } = useBilling();
	const sub = subscriptions.find((s) => s.tenantId === tenantId) ?? ensureSubscription(tenantId);
	return {
		tenantId,
		plan: plans.find((p) => p.id === sub.planId) ?? plans[0],
		sub
	};
}
//#endregion
export { useSubscriptionContext as t };
