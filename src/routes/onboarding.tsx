import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { createOwnedTenant } from "@/lib/bootstrap.functions";
import { SwiftLogo } from "@/components/swift-logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, LogOut } from "lucide-react";


export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your company · SWIFT" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const nav = useNavigate();
  const { user, memberships, isSuperAdmin, loading, refresh, signOut } = useAuth();
  const createTenantFn = useServerFn(createOwnedTenant);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (memberships.length > 0) nav({ to: "/admin" });
    else if (isSuperAdmin && memberships.length === 0) {
      // Super-admin still needs a workspace to view HR data — offer both options in UI
    }
  }, [user, memberships, isSuperAdmin, loading, nav]);

  const createTenant = async () => {
    if (!name.trim()) return toast.error("Company name required");
    const cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!cleanSlug) return toast.error("Invalid slug");
    setBusy(true);
    try {
      await createTenantFn({ data: { name, slug: cleanSlug, legalName: name } });
      toast.success("Workspace created");
      await refresh();
      nav({ to: "/admin" });

    } catch (e: any) {
      toast.error(e.message ?? "Failed to create workspace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      <header className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <SwiftLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav({ to: "/login" }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>
      <main className="max-w-xl mx-auto p-6 sm:p-10">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
          <Building2 className="h-5 w-5" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">Set up your workspace</h1>
        <p className="mt-2 text-muted-foreground">
          Create a company workspace to manage employees, run payroll, and generate documents.
          {isSuperAdmin && " As super-admin, you can also manage all tenants from the platform console."}
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="space-y-1.5">
            <Label>Company name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corporation" />
          </div>
          <div className="space-y-1.5">
            <Label>Workspace URL slug</Label>
            <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
              <span className="px-3 text-sm text-muted-foreground">swift.hr/</span>
              <Input
                className="border-0 focus-visible:ring-0"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme"
              />
            </div>
          </div>
          <Button
            className="w-full h-11 bg-gradient-brand text-white shadow-glow hover:opacity-95"
            onClick={createTenant}
            disabled={busy}
          >
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create workspace
          </Button>
        </div>

        {isSuperAdmin && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm">
            <div className="font-medium">You're the platform super-admin</div>
            <p className="mt-1 text-muted-foreground">
              You can also skip this and manage all tenants across the SaaS from the console.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => nav({ to: "/super-admin" })}>
              Go to Super Admin Console
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
