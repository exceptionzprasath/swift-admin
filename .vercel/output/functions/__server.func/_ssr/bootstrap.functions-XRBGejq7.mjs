import { r as createServerFn } from "./ssr.mjs";
import { i as stringType, r as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/bootstrap.functions-XRBGejq7.js
/**
* Mocks the super_admin promotion since Supabase is removed.
* Returns success simulation.
*/
var claimFirstSuperAdmin_createServerFn_handler = createServerRpc({
	id: "87370946f0ad8766977a8668ff098171e11e2482cf111c4af3d774cd72f3bcc5",
	name: "claimFirstSuperAdmin",
	filename: "src/lib/bootstrap.functions.ts"
}, (opts) => claimFirstSuperAdmin.__executeServer(opts));
var claimFirstSuperAdmin = createServerFn({ method: "POST" }).handler(claimFirstSuperAdmin_createServerFn_handler, async () => {
	return {
		promoted: true,
		isSuperAdmin: true
	};
});
var CreateTenantSchema = objectType({
	name: stringType().min(2).max(120),
	slug: stringType().min(2).max(60).regex(/^[a-z0-9-]+$/),
	legalName: stringType().max(200).optional(),
	plan: stringType().max(40).optional()
});
/**
* Mocks creating a tenant/workspace since Supabase is removed.
* Returns a successfully simulated tenant metadata structure.
*/
var createOwnedTenant_createServerFn_handler = createServerRpc({
	id: "f725190e9bb7c046ef6f6b9a0a7381ba8f003f455ba123d824d1c516fa7b3511",
	name: "createOwnedTenant",
	filename: "src/lib/bootstrap.functions.ts"
}, (opts) => createOwnedTenant.__executeServer(opts));
var createOwnedTenant = createServerFn({ method: "POST" }).inputValidator((i) => CreateTenantSchema.parse(i)).handler(createOwnedTenant_createServerFn_handler, async ({ data }) => {
	return { tenant: {
		id: crypto.randomUUID(),
		name: data.name,
		slug: data.slug,
		legal_name: data.legalName ?? data.name,
		plan: data.plan ?? "starter",
		status: "active",
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	} };
});
//#endregion
export { claimFirstSuperAdmin_createServerFn_handler, createOwnedTenant_createServerFn_handler };
