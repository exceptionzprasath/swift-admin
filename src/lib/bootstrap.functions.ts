import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Mocks the super_admin promotion since Supabase is removed.
 * Returns success simulation.
 */
export const claimFirstSuperAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    return { promoted: true, isSuperAdmin: true };
  });

const CreateTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  legalName: z.string().max(200).optional(),
  plan: z.string().max(40).optional(),
});

/**
 * Mocks creating a tenant/workspace since Supabase is removed.
 * Returns a successfully simulated tenant metadata structure.
 */
export const createOwnedTenant = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => CreateTenantSchema.parse(i))
  .handler(async ({ data }) => {
    const tenant = {
      id: crypto.randomUUID(),
      name: data.name,
      slug: data.slug,
      legal_name: data.legalName ?? data.name,
      plan: data.plan ?? "starter",
      status: "active",
      created_at: new Date().toISOString()
    };
    return { tenant };
  });
