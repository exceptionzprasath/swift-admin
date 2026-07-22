import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { claimFirstSuperAdmin } from "@/lib/bootstrap.functions";
import { SwiftLogo } from "@/components/swift-logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ShieldCheck, User as UserIcon, Crown } from "lucide-react";


type SearchParams = {
  impersonateTenantId?: string;
  impersonateRole?: string;
};

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Company Admin Sign in · SWIFT" }] }),
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      impersonateTenantId: search.impersonateTenantId as string | undefined,
      impersonateRole: search.impersonateRole as string | undefined,
    };
  },
});

function LoginPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const impersonateTenantId = search.impersonateTenantId;
  const { refresh, user, isSuperAdmin, memberships, loading, signIn: authSignIn, signUp: authSignUp } = useAuth();
  const seedDemo = useStore((s) => s.seedDemo);
  const claim = useServerFn(claimFirstSuperAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (impersonateTenantId) {
      const runImpersonate = async () => {
        const tenantName = "Impersonated Workspace";
        const customMemberships = [
          {
            tenant_id: impersonateTenantId,
            role: "owner" as const,
            tenant: {
              id: impersonateTenantId,
              name: tenantName,
              slug: "demo-impersonated",
              legal_name: tenantName,
              address: "123 Workspace Ave, India",
              gstin: "29ABCDE1234F1Z5",
              plan: "growth",
              status: "active",
              created_at: new Date().toISOString()
            }
          }
        ];
        
        localStorage.setItem("swift-auth-user", JSON.stringify({ id: crypto.randomUUID(), email: "impersonated-admin@demo.swift" }));
        localStorage.setItem("swift-auth-role", "user");
        localStorage.setItem("swift-auth-memberships", JSON.stringify(customMemberships));
        localStorage.setItem("swift-active-tenant", impersonateTenantId);
        
        await refresh();
        seedDemo("admin");
        toast.success("Impersonated workspace admin successfully.");
        nav({ to: "/admin" });
      };
      void runImpersonate();
    }
  }, [impersonateTenantId]);

  useEffect(() => {
    if (loading || impersonateTenantId) return;
    if (user) {
      if (isSuperAdmin) {
        toast.error("Super Admins belong on the Super Admin Console. Redirecting...");
        setTimeout(() => {
          const superAdminUrl = import.meta.env.VITE_SUPER_ADMIN_URL || "http://localhost:5173";
          window.location.href = `${superAdminUrl}/login`;
        }, 1500);
      } else if (memberships.length > 0) {
        nav({ to: "/admin" });
      } else {
        toast.error("Restricted to Company Admins. Redirecting to employee portal...");
        setTimeout(() => {
          const employeeUrl = import.meta.env.VITE_EMPLOYEE_URL || "http://localhost:5175";
          window.location.href = `${employeeUrl}/login`;
        }, 1500);
      }
    }
  }, [user, isSuperAdmin, memberships, loading, nav, impersonateTenantId]);

  const handleSignIn = async () => {
    if (!email || !password) return toast.error("Enter email and password");

    if (email.startsWith("super")) {
      return toast.error("Super Admins must sign in on the Super Admin portal.");
    }

    setBusy(true);
    try {
      await authSignIn(email, "admin", password);
      toast.success("Welcome back");
      await refresh();
      nav({ to: "/admin" });
    } catch (e: any) {
      toast.error(e.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background bg-gradient-mesh">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-brand text-white relative overflow-hidden">
        <SwiftLogo />
        <div className="relative z-10">
          <h2 className="font-display text-4xl font-semibold">SWIFT Workspace Admin.</h2>
          <p className="mt-4 max-w-md text-white/85">
            Configure company branches, structure departments, process monthly payroll,
            run statutory compliance audits, and issue branded employee documents.
          </p>
        </div>
        <div className="text-xs text-white/70">People. Performance. Progress.</div>
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 relative">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle /></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8"><SwiftLogo /></div>
          <h1 className="font-display text-3xl font-semibold">Company Admin Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your admin/HR work email.
          </p>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Work email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
            <Button
              className="w-full h-11 bg-gradient-brand text-white shadow-glow hover:opacity-95"
              onClick={handleSignIn}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign in
            </Button>
          </div>

          <div className="mt-8 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="font-semibold text-sm">Try Instant Demo — no signup</div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Pre-loaded company admin console with employee records, shifts, salary formulas, asset assignments, and doc templates.
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="h-11 border-primary/40 w-full"
                onClick={() => { seedDemo("admin"); toast.success("Demo Admin signed in"); nav({ to: "/admin" }); }}
              >
                <ShieldCheck className="h-4 w-4 mr-2 text-primary" /> Admin Demo
              </Button>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              <div><span className="font-medium text-foreground">Admin Credentials:</span> admin@demo / demo123</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
