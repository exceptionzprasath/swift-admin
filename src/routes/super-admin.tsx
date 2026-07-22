import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  const { user, isSuperAdmin, loading } = useAuth();
  const demoMode = useStore((s) => s.demoMode);
  const demoSuper = useStore((s) => s.demoSuper);

  // Deep-link support: auto-enter super-admin demo synchronously so every
  // /super-admin/* route is reachable via direct URL without dashboard nav.
  if (typeof window !== "undefined" && !loading) {
    const authedSuper = !!user && isSuperAdmin;
    if (!authedSuper && !(demoMode && demoSuper)) {
      useStore.getState().seedSuperDemo();
    }
  }

  return <Outlet />;
}
