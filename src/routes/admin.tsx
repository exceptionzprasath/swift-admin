import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { SwiftLogo } from "@/components/swift-logo";
import { ThemeToggle } from "@/components/theme";
import {
  LayoutDashboard, Users, CalendarCheck, Calculator, FileText, Settings,
  LogOut, Menu, Shield, Building2, ChevronDown, Network, Sparkles, BarChart3, Megaphone, Rocket, Package, ShieldCheck, CreditCard, BellRing, Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { SwiftAiCopilot } from "@/components/swift-ai-copilot";
import { AiTriggerBell } from "@/components/ai-trigger-bell";
import { AdminInternalChat } from "@/components/internal-chat";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · SWIFT HRMS" }] }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/ai", label: "SWIFT AI", icon: Sparkles },
  { to: "/admin/notices", label: "Notice Board", icon: Megaphone },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/lifecycle", label: "AI Lifecycle", icon: Rocket },
  { to: "/admin/branches", label: "Branches", icon: Building2 },
  { to: "/admin/org", label: "Organization", icon: Network },
  { to: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/admin/payroll", label: "Payroll & AI Decisions", icon: Calculator },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/assets", label: "Assets", icon: Package },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/compliance", label: "Compliance AI", icon: Scale },
  { to: "/admin/compliance-docs", label: "Compliance Docs", icon: ShieldCheck },
  { to: "/admin/audit", label: "Audit Log", icon: ShieldCheck },
  { to: "/admin/subscription", label: "Subscription", icon: CreditCard },
  { to: "/admin/renewals", label: "Renewal Scheduler", icon: BellRing },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];


function AdminLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading, isSuperAdmin, memberships, activeTenantId, setActiveTenant, signOut } = useAuth();
  const { company, demoMode, exitDemo, loadCompanyState } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!demoMode && activeTenantId) {
      loadCompanyState(activeTenantId);
    }
  }, [activeTenantId, demoMode, loadCompanyState]);

  useEffect(() => {
    if (demoMode) return;
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (memberships.length === 0 && !isSuperAdmin) navigate({ to: "/onboarding" });
  }, [user, loading, memberships, isSuperAdmin, navigate, demoMode]);

  useEffect(() => { setMobileOpen(false); }, [path]);

  if (!demoMode && (loading || !user)) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>;
  }

  const activeTenant = memberships.find((m) => m.tenant_id === activeTenantId)?.tenant;
  const displayName = demoMode ? `${company.name} · DEMO` : (activeTenant?.name ?? company.name);
  const userEmail = demoMode ? "admin@demo.swift" : user?.email;

  const SidebarBody = (
    <>
      <div className="p-5 border-b border-sidebar-border">
        <SwiftLogo />
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((n) => {
          const active = n.exact ? path === n.to : path.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-gradient-brand text-white shadow-soft"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        {isSuperAdmin && (
          <a href={import.meta.env.VITE_SUPER_ADMIN_URL || "http://localhost:5173"}>
            <Button variant="outline" size="sm" className="w-full mb-2 justify-start">
              <Shield className="h-4 w-4 mr-2 text-primary" /> Super Admin
            </Button>
          </a>
        )}
        <div className="rounded-lg bg-sidebar-accent p-3 text-sm">
          <div className="font-medium truncate">{userEmail}</div>
          <div className="text-xs text-muted-foreground truncate">{displayName}</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        {SidebarBody}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-6 gap-2 sticky top-0 bg-background/95 backdrop-blur z-30">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar flex flex-col">
                {SidebarBody}
              </SheetContent>
            </Sheet>

            {memberships.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 max-w-[180px] sm:max-w-none">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm">{displayName}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {memberships.map((m) => (
                    <DropdownMenuItem key={m.tenant_id} onClick={() => setActiveTenant(m.tenant_id)}>
                      <Building2 className="h-4 w-4 mr-2" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{m.tenant.name}</div>
                        <div className="text-xs text-muted-foreground truncate">Role: {m.role}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="text-sm text-muted-foreground truncate hidden sm:inline">{displayName}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <AiTriggerBell />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { if (demoMode) exitDemo(); else await signOut(); navigate({ to: "/login" }); }}
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24 md:pb-6 safe-bottom">
          <Outlet />
        </main>
      </div>
      <SwiftAiCopilot role={isSuperAdmin ? "super_admin" : "admin"} />
      <AdminInternalChat />
    </div>
  );
}
