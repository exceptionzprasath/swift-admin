import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { SwiftLogo } from "@/components/swift-logo";
import { ThemeToggle } from "@/components/theme";
import {
  LayoutDashboard, Users, CalendarCheck, CalendarDays, Calculator, FileText, Settings,
  LogOut, Menu, Shield, Building2, ChevronDown, Network, Sparkles, BarChart3, Megaphone, Rocket, Package, ShieldCheck, CreditCard, BellRing, Scale, Clock, FolderLock, MessageSquareHeart,
  SlidersHorizontal,
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

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; comingSoon?: boolean };
const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/ai", label: "SWIFT AI", icon: Sparkles },
  { to: "/admin/notices", label: "Notice Board", icon: Megaphone },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/lifecycle", label: "AI Lifecycle", icon: Rocket },
  { to: "/admin/branches", label: "Branches", icon: Building2 },
  { to: "/admin/org", label: "Organization", icon: Network },
  { to: "/admin/approval-settings", label: "Approval Settings", icon: SlidersHorizontal },
  { to: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/admin/leave-calendar", label: "Leave Calendar", icon: CalendarDays },
  { to: "/admin/shift-roster", label: "Swift Roster", icon: Clock },
  { to: "/admin/payroll", label: "Payroll", icon: Calculator },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/assets", label: "Assets", icon: Package },
  { to: "/admin/vault", label: "Vault", icon: FolderLock },
  { to: "/admin/compliance", label: "Compliance AI", icon: Scale, comingSoon: true },
  { to: "/admin/compliance-docs", label: "Compliance Docs", icon: ShieldCheck, comingSoon: true },
  { to: "/admin/audit", label: "Audit Log", icon: ShieldCheck, comingSoon: true },
  { to: "/admin/subscription", label: "Subscription", icon: CreditCard, comingSoon: true },
  { to: "/admin/renewals", label: "Renewal Scheduler", icon: BellRing, comingSoon: true },
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
    <div className="flex flex-col h-full justify-between overflow-hidden">
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <div className="border-b border-sidebar-border shrink-0 overflow-hidden bg-white">
          <SwiftLogo />
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-brand text-white shadow-soft font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <n.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{n.label}</span>
                </div>
                {n.comingSoon && (
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}>
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-2 shrink-0">
        {isSuperAdmin && (
          <a href={import.meta.env.VITE_SUPER_ADMIN_URL || "http://localhost:5173"}>
            <Button variant="outline" size="sm" className="w-full mb-1 justify-start border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 rounded-xl">
              <Shield className="h-4 w-4 mr-2 text-primary" /> Super Admin
            </Button>
          </a>
        )}
        <div className="rounded-xl bg-sidebar-accent p-3 text-sm text-sidebar-accent-foreground">
          <div className="font-medium truncate">{userEmail}</div>
          <div className="text-xs opacity-75 truncate">{displayName}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => { if (demoMode) exitDemo(); else await signOut(); navigate({ to: "/login" }); }}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>Log out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar shrink-0 sticky top-0 h-screen overflow-hidden">
        {SidebarBody}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-navbar-border flex items-center justify-between px-4 sm:px-6 gap-3 sticky top-0 bg-navbar text-navbar-foreground backdrop-blur z-30 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-navbar-foreground hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col">
                {SidebarBody}
              </SheetContent>
            </Sheet>

            {memberships.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 max-w-[180px] sm:max-w-none text-navbar-foreground hover:bg-white/10 rounded-full">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-semibold">{displayName}</span>
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
              <span className="text-base font-bold font-display text-navbar-foreground truncate hidden sm:inline">{displayName}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search Pill Bar matching NexaVerse */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/15 dark:bg-white/10 border border-white/10 text-xs w-64 focus-within:w-72 transition-all">
              <span className="text-navbar-foreground opacity-60">🔍</span>
              <input
                type="text"
                placeholder="Search employees, requests..."
                className="bg-transparent border-none outline-none w-full text-xs text-navbar-foreground placeholder:text-navbar-foreground/60"
              />
            </div>

            <AiTriggerBell />
            <ThemeToggle />

            <div className="flex items-center gap-2 pl-2 border-l border-navbar-border/60">
              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-navbar-foreground">
                {(displayName || "A")[0].toUpperCase()}
              </div>
            </div>
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
