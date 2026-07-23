import { r as createServerFn } from "./ssr.mjs";
import { t as createSsrRpc } from "./createSsrRpc-DaycN9GT.mjs";
import { i as stringType, r as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/bootstrap.functions-DpRRWZwv.js
/**
* Mocks the super_admin promotion since Supabase is removed.
* Returns success simulation.
*/
var claimFirstSuperAdmin = createServerFn({ method: "POST" }).handler(createSsrRpc("87370946f0ad8766977a8668ff098171e11e2482cf111c4af3d774cd72f3bcc5"));
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
var createOwnedTenant = createServerFn({ method: "POST" }).inputValidator((i) => CreateTenantSchema.parse(i)).handler(createSsrRpc("f725190e9bb7c046ef6f6b9a0a7381ba8f003f455ba123d824d1c516fa7b3511"));
//#endregion
export { createOwnedTenant as n, claimFirstSuperAdmin as t };
