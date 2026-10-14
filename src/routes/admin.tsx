import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getNormalizedRequests } from "@/lib/requests-normalizer";
import creatonsLogoBanner from "@/assets/CreatonsHR-Banner.png";
import creatonsLogoIcon from "@/assets/CreatonHR.png";
import { ThemeToggle } from "@/components/theme";
import {
  useRolePreview,
  resolveModulePermissions,
  MODULE_REGISTRY,
  type ModuleKey,
} from "@/lib/roles-permissions";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Calculator,
  FileText,
  Settings,
  LogOut,
  Menu,
  Shield,
  Building2,
  ChevronDown,
  Network,
  Brain,
  BarChart3,
  Megaphone,
  Rocket,
  Package,
  ShieldCheck,
  CreditCard,
  BellRing,
  Scale,
  Clock,
  FolderLock,
  SlidersHorizontal,
  Inbox,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  MessagesSquare,
  UserX,
  Lock,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SwiftAiCopilot } from "@/components/swift-ai-copilot";
import { LiveNotificationBell } from "@/components/live-notification-bell";
import { AdminInternalChat } from "@/components/internal-chat";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · CreatonsHR" }] }),
  component: AdminLayout,
});

export function getPathModuleKey(currentPath: string): ModuleKey | null {
  if (currentPath === "/admin" || currentPath === "/admin/") return "dashboard";
  if (currentPath.startsWith("/admin/requests")) return "requests";
  if (currentPath.startsWith("/admin/ai")) return "ai";
  if (currentPath.startsWith("/admin/team-chat")) return "teamChat";
  if (currentPath.startsWith("/admin/notices")) return "notices";
  if (currentPath.startsWith("/admin/employees")) return "employees";
  if (currentPath.startsWith("/admin/past-employees")) return "pastEmployees";
  if (currentPath.startsWith("/admin/attendance")) return "attendance";
  if (currentPath.startsWith("/admin/leave-calendar")) return "leaveCalendar";
  if (currentPath.startsWith("/admin/shift-roster")) return "shiftRoster";
  if (currentPath.startsWith("/admin/payroll")) return "payroll";
  if (currentPath.startsWith("/admin/documentation")) return "documentation";
  if (currentPath.startsWith("/admin/approval-settings")) return "approvalSettings";
  if (currentPath.startsWith("/admin/branches")) return "branches";
  if (currentPath.startsWith("/admin/org")) return "org";
  if (currentPath.startsWith("/admin/vault")) return "vault";
  if (currentPath.startsWith("/admin/roles")) return "roles";
  if (currentPath.startsWith("/admin/settings")) return "settings";
  return null;
}

function getSelectedMenuName(currentPath: string): string {
  if (currentPath === "/admin" || currentPath === "/admin/") return "Dashboard";
  const matched = nav
    .filter((n) => !n.exact && currentPath.startsWith(n.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  if (matched) return matched.label;
  if (currentPath.startsWith("/admin/roles")) return "Roles & Responsibilities";
  if (currentPath.startsWith("/admin/grievances")) return "Grievance Redressal";
  if (currentPath.startsWith("/admin/documents")) return "Documents Repository";
  if (currentPath.startsWith("/admin/salary-revision")) return "Salary Revision";
  return "Dashboard";
}

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  moduleKey?: ModuleKey;
  exact?: boolean;
  comingSoon?: boolean;
  badge?: string | number;
};

const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, moduleKey: "dashboard", exact: true },
  { to: "/admin/requests", label: "Requests & Approvals", icon: Inbox, moduleKey: "requests" },
  { to: "/admin/ai", label: "SWIFT AI", icon: Brain, moduleKey: "ai", badge: "AI" },
  { to: "/admin/team-chat", label: "Team Chat", icon: MessagesSquare, moduleKey: "teamChat" },
  { to: "/admin/notices", label: "Notice Board", icon: Megaphone, moduleKey: "notices" },
  { to: "/admin/employees", label: "Employees", icon: Users, moduleKey: "employees" },
  { to: "/admin/past-employees", label: "Past Employees", icon: UserX, moduleKey: "pastEmployees" },
  { to: "/admin/attendance", label: "Attendance", icon: CalendarCheck, moduleKey: "attendance" },
  { to: "/admin/leave-calendar", label: "Leave Calendar", icon: CalendarDays, moduleKey: "leaveCalendar" },
  { to: "/admin/shift-roster", label: "Shift Roster", icon: Clock, moduleKey: "shiftRoster" },
  { to: "/admin/payroll", label: "Payroll", icon: Calculator, moduleKey: "payroll" },
  { to: "/admin/documentation-alt", label: "Documentations", icon: FileText, moduleKey: "documentation" },
  { to: "/admin/approval-settings", label: "Approval Settings", icon: SlidersHorizontal, moduleKey: "approvalSettings" },
  { to: "/admin/roles", label: "Roles & Responsibilities", icon: ShieldCheck, moduleKey: "roles" },
  { to: "/admin/branches", label: "Branches", icon: Building2, moduleKey: "branches" },
  { to: "/admin/org", label: "Organization", icon: Network, moduleKey: "org" },
  { to: "/admin/vault", label: "Vault", icon: FolderLock, moduleKey: "vault" },
  { to: "/admin/lifecycle", label: "AI Lifecycle", icon: Rocket, comingSoon: true },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, comingSoon: true },
  { to: "/admin/assets", label: "Assets", icon: Package, comingSoon: true },
  { to: "/admin/compliance", label: "Compliance AI", icon: Scale, comingSoon: true },
  { to: "/admin/compliance-docs", label: "Compliance Docs", icon: ShieldCheck, comingSoon: true },
  { to: "/admin/audit", label: "Audit Log", icon: ShieldCheck, comingSoon: true },
  { to: "/admin/subscription", label: "Subscription", icon: CreditCard, comingSoon: true },
  { to: "/admin/renewals", label: "Renewal Scheduler", icon: BellRing, comingSoon: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, moduleKey: "settings" },
];

function AdminLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading, isSuperAdmin, memberships, activeTenantId, setActiveTenant, signOut } = useAuth();
  const { company, docAssets, demoMode, exitDemo, loadCompanyState, purgeMockEmployees } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const employees = useStore((s) => s.employees || []);
  const requests = useStore((s) => s.requests || []);
  const leaves = useStore((s) => s.leaves || []);
  const docRequests = useStore((s) => s.docRequests || []);
  const grievances = useStore((s) => s.grievances || []);
  const selectedMenuName = getSelectedMenuName(path);

  // Live count of pending requests awaiting action
  const pendingRequestsCount = useMemo(() => {
    const list = getNormalizedRequests({
      requests,
      leaves,
      docRequests,
      grievances,
      employees,
    });
    return list.filter((r) => r.status === "Pending").length;
  }, [requests, leaves, docRequests, grievances, employees]);

  // Keyboard shortcut Ctrl+K / Cmd+K to trigger global command search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchDialogOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    purgeMockEmployees();
    if (activeTenantId && !activeTenantId.startsWith("demo-tenant-")) {
      loadCompanyState(activeTenantId);
    } else if (!demoMode && activeTenantId) {
      loadCompanyState(activeTenantId);
    }
  }, [activeTenantId, demoMode, loadCompanyState, purgeMockEmployees]);

  useEffect(() => {
    if (demoMode) return;
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (memberships.length === 0 && !isSuperAdmin) navigate({ to: "/onboarding" });
  }, [user, loading, memberships, isSuperAdmin, navigate, demoMode]);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  const activeTenant = memberships.find((m) => m.tenant_id === activeTenantId)?.tenant;
  const displayName = demoMode ? `${company.name} · DEMO` : (activeTenant?.name ?? company.name);
  const userEmail = demoMode ? "admin@demo.creatonshr.com" : user?.email;

  const effectiveCompanyLogo =
    company?.logoDataUrl ||
    docAssets?.logoDataUrl ||
    (company as any)?.logoUrl ||
    (company as any)?.logo ||
    (activeTenant as any)?.logo_url ||
    (activeTenant as any)?.logoDataUrl;

  const { previewRoleId, setPreviewRoleId } = useRolePreview();
  const roles = useStore((s) => s.roles || []);

  const isSuperAdminOrOwner = (isSuperAdmin || memberships[0]?.role === "owner") && !user?.isEmployeeLogin;
  const previewRole = previewRoleId ? roles.find((r) => r.id === previewRoleId) : null;
  const currentEmp = employees.find(
    (e) =>
      (e.email && user?.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
      (user?.id && e.id === user.id) ||
      (user?.empCode && e.empCode && e.empCode.toLowerCase() === user.empCode.toLowerCase())
  );
  const employeeRole =
    (user?.roleId ? roles.find((r) => r.id === user.roleId) : null) ||
    (currentEmp?.roleId ? roles.find((r) => r.id === currentEmp.roleId) : null) ||
    (user?.roleName ? roles.find((r) => r.name.toLowerCase() === user.roleName?.toLowerCase()) : null) ||
    (currentEmp?.roleName ? roles.find((r) => r.name.toLowerCase() === currentEmp.roleName?.toLowerCase()) : null);
  const activeRole = previewRole || employeeRole || (isSuperAdminOrOwner ? null : roles[0] || null);

  const activePermissions = useMemo(() => {
    if (isSuperAdminOrOwner && !previewRole) {
      return null; // full unrestricted access for workspace owners
    }
    return resolveModulePermissions(activeRole);
  }, [isSuperAdminOrOwner, previewRole, activeRole]);

  // Filter navigation items by role sidebar visibility and search query, injecting dynamic live pending badge
  const filteredNav = useMemo(() => {
    let list = nav.map((item) => {
      if (item.to === "/admin/requests" || item.moduleKey === "requests") {
        return {
          ...item,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
        };
      }
      return item;
    });
    if (activePermissions) {
      list = list.filter((item) => {
        if (!item.moduleKey) return true;
        const perm = activePermissions[item.moduleKey];
        return perm ? perm.enabledInSidebar : true;
      });
    }
    if (searchQuery.trim()) {
      list = list.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [pendingRequestsCount, activePermissions, searchQuery]);

  const currentModuleKey = getPathModuleKey(path);
  const isRouteBlocked =
    currentModuleKey &&
    activePermissions &&
    activePermissions[currentModuleKey] &&
    !activePermissions[currentModuleKey].canRead;

  if (!demoMode && (loading || !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  const renderSidebar = (collapsed: boolean) => (
    <TooltipProvider delayDuration={50}>
      <div className="flex flex-col h-full justify-between select-none bg-sidebar text-sidebar-foreground">
        {/* Top Section */}
        <div className="flex flex-col min-h-0 flex-1">
          {/* Company Logo Header (Corner attached, no three dots) */}
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2 px-3.5 py-3 border-b border-sidebar-border shrink-0 bg-white dark:bg-card min-h-[68px]">
              <div className="flex-1 flex items-center justify-start min-w-0 overflow-hidden">
                <img
                  src={creatonsLogoBanner}
                  alt="CreatonsHR"
                  className="h-14 sm:h-16 w-auto max-w-[195px] object-contain block"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(true);
                  setMobileOpen(false);
                }}
                className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-black border border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 transition-all cursor-pointer shrink-0 shadow-xs"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-3 pb-3 border-b border-sidebar-border shrink-0 bg-sidebar min-h-[68px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsCollapsed(false)}
                    className="h-11 w-11 aspect-square rounded-full overflow-hidden bg-sidebar-accent border border-sidebar-border p-1.5 flex items-center justify-center shadow-xs cursor-pointer hover:scale-105 hover:bg-sidebar-accent/80 hover:border-sidebar-primary/40 transition shrink-0"
                  >
                    <img
                      src={creatonsLogoIcon}
                      alt="CreatonsHR"
                      className="h-full w-full object-contain rounded-full"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14} className="bg-slate-900 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xl z-50">
                  Expand sidebar
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Search Bar Capsule */}
          {!collapsed ? (
            <div className="p-3 pb-1.5 shrink-0">
              <div className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-sidebar-accent/60 border border-sidebar-border text-xs focus-within:bg-sidebar focus-within:ring-2 focus-within:ring-sidebar-primary/40 transition-all shadow-2xs">
                <Search className="h-4 w-4 text-sidebar-foreground/70 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/60 w-full font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-sidebar-foreground/70 hover:text-sidebar-foreground text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsCollapsed(false)}
                    className="h-11 w-11 aspect-square rounded-full flex items-center justify-center text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition cursor-pointer shrink-0"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14} className="bg-slate-900 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xl z-50">
                  Search
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Continuous Navigation List (High-Contrast Theme-Adaptive Active & Inactive Styling) */}
          <nav className={`overflow-y-auto flex-1 no-scrollbar ${collapsed ? "flex flex-col items-center gap-3.5 py-3 px-2 w-full" : "space-y-1.5 p-3 pt-1.5"}`}>
            {filteredNav.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              const hasNumericBadge = typeof n.badge === "number" && n.badge > 0;
              return collapsed ? (
                <Tooltip key={n.to}>
                  <TooltipTrigger asChild>
                    <Link
                      to={n.to}
                      style={
                        active
                          ? {
                              background: "var(--gradient-brand, var(--sidebar-primary))",
                              color: "var(--sidebar-primary-foreground, #ffffff)",
                              boxShadow: "0 4px 14px -2px rgba(0, 0, 0, 0.35)",
                            }
                          : undefined
                      }
                      className={`relative h-11 w-11 aspect-square rounded-full flex items-center justify-center shrink-0 transition-all ${
                        active
                          ? "font-bold shadow-md"
                          : "text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}
                    >
                      <n.icon className="h-5 w-5 shrink-0" />

                      {/* Notification dot on collapsed sidebar */}
                      {hasNumericBadge && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 pointer-events-none" aria-label={`${n.badge} pending`}>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-sidebar" />
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={14}
                    className="bg-slate-900 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xl z-50 pointer-events-none flex items-center gap-2"
                  >
                    <span>{n.label}</span>
                    {hasNumericBadge && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                        {typeof n.badge === "number" && n.badge > 99 ? "99+" : n.badge}
                      </span>
                    )}
                    {n.badge === "AI" && (
                      <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                        AI
                      </span>
                    )}
                    {n.comingSoon && (
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                        Soon
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  style={
                    active
                      ? {
                          background: "var(--gradient-brand, var(--sidebar-primary))",
                          color: "var(--sidebar-primary-foreground, #ffffff)",
                          boxShadow: "0 4px 14px -2px rgba(0, 0, 0, 0.25)",
                        }
                      : undefined
                  }
                  className={`group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm transition-all ${
                    active
                      ? "font-semibold shadow-xs"
                      : "text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <n.icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        active ? "opacity-100" : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground"
                      }`}
                    />
                    <span className="truncate">{n.label}</span>
                  </div>

                  {/* Badge count / status */}
                  {(n.badge !== undefined || n.comingSoon) && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs shrink-0 ${
                        active
                          ? "bg-white/20 text-white"
                          : n.badge === "AI"
                          ? "bg-sidebar-primary/20 text-sidebar-primary"
                          : n.comingSoon
                          ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {n.comingSoon
                        ? "Soon"
                        : typeof n.badge === "number" && n.badge > 99
                        ? "99+"
                        : n.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User Profile & Logout */}
        <div className="p-3 border-t border-sidebar-border shrink-0 bg-sidebar">
          {!collapsed ? (
            <div className="space-y-2">
              {isSuperAdmin && (
                <a href={import.meta.env.VITE_SUPER_ADMIN_URL || "http://localhost:5173"} className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground text-xs rounded-xl"
                  >
                    <Shield className="h-3.5 w-3.5 mr-2 text-primary" /> Super Admin
                  </Button>
                </a>
              )}

              {/* Profile Bar with Logout on right */}
              <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-sidebar-accent border border-sidebar-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    style={{
                      background: "var(--gradient-brand, var(--sidebar-primary))",
                      color: "var(--sidebar-primary-foreground, #ffffff)",
                    }}
                    className="h-9 w-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                  >
                    {(displayName || "A")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-sidebar-foreground truncate">
                      {user?.name || displayName}
                    </div>
                    <div className="text-[10px] text-sidebar-foreground/75 truncate">
                      {user?.empCode ? `${user.empCode} · ` : ""}{activeRole?.name || userEmail}
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (demoMode) exitDemo();
                    else await signOut();
                    navigate({ to: "/login" });
                  }}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-sidebar-foreground/70 hover:text-rose-500 hover:bg-rose-500/15 transition cursor-pointer shrink-0"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={async () => {
                      if (demoMode) exitDemo();
                      else await signOut();
                      navigate({ to: "/login" });
                    }}
                    style={{
                      background: "var(--gradient-brand, var(--sidebar-primary))",
                      color: "var(--sidebar-primary-foreground, #ffffff)",
                    }}
                    className="h-11 w-11 aspect-square rounded-full font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer shadow-sm hover:scale-105 transition"
                  >
                    {(displayName || "A")[0].toUpperCase()}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14} className="bg-slate-900 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xl z-50 pointer-events-none">
                  {displayName} · Log out
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  const isFullBleed = path === "/admin/team-chat" || path.startsWith("/admin/team-chat");

  return (
    <div className={`flex bg-background text-foreground transition-colors duration-200 ${isFullBleed ? "h-screen max-h-screen overflow-hidden" : "min-h-screen"}`}>
      {/* Corner-Attached Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen transition-all duration-300 ease-in-out border-r border-sidebar-border bg-sidebar z-40 relative group/sidebar ${
          isCollapsed ? "w-20" : "w-64 lg:w-72"
        }`}
      >
        {renderSidebar(isCollapsed)}

        {/* Middle Edge Expand Arrow Button (Only visible when collapsed) */}
        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 h-7 w-7 rounded-full bg-card text-card-foreground border-2 border-border shadow-md flex items-center justify-center cursor-pointer hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-95 transition-all duration-150"
            title="Expand menu"
            aria-label="Expand menu"
          >
            <ChevronRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        )}
      </aside>

      {/* Main App Content */}
      <div className={`flex-1 flex flex-col min-w-0 ${isFullBleed ? "h-screen max-h-screen overflow-hidden" : ""}`}>
        <header className="h-16 sm:h-20 border-b border-border/40 flex items-center justify-between px-4 sm:px-8 gap-3 sm:gap-4 sticky top-0 bg-background/60 dark:bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 z-30 shadow-xs transition-colors duration-200 relative shrink-0">
          {/* Subtle bottom theme highlight glow */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />

          {/* Left Side: Mobile Drawer Trigger & Selected Menu Name */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-foreground hover:bg-primary/10 hover:text-primary rounded-full shrink-0 h-9 w-9 backdrop-blur-md"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
                {renderSidebar(false)}
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight leading-tight truncate drop-shadow-2xs">
                {selectedMenuName}
              </h1>

              {activeRole && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs shadow-2xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-primary truncate max-w-[140px]">{activeRole.name}</span>
                  {previewRoleId ? (
                    <span className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold uppercase px-1.5 py-0.5 rounded-full">
                      Preview
                    </span>
                  ) : null}
                  {previewRoleId ? (
                    <button
                      onClick={() => setPreviewRoleId(null)}
                      className="ml-1 text-[11px] font-bold text-muted-foreground hover:text-foreground underline cursor-pointer"
                      title="Exit role preview"
                    >
                      Exit
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Theme-Based Glassmorphism Pill Capsule Navbar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-1.5 rounded-full bg-card/45 dark:bg-card/25 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_1px_0_rgba(255,255,255,0.1)] ring-1 ring-primary/20 shrink-0 transition-all duration-300 hover:ring-primary/40">
            {/* Company Name */}
            {memberships.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs sm:text-sm font-semibold text-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer max-w-[110px] sm:max-w-[180px] md:max-w-[220px] truncate"
                  >
                    <span className="truncate">{displayName}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70 text-primary shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 backdrop-blur-xl bg-card/90 border-border/60">
                  <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {memberships.map((m) => (
                    <DropdownMenuItem key={m.tenant_id} onClick={() => setActiveTenant(m.tenant_id)}>
                      <Building2 className="h-4 w-4 mr-2 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{m.tenant.name}</div>
                        <div className="text-xs text-muted-foreground truncate">Role: {m.role}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center px-2 py-1 text-xs sm:text-sm font-semibold text-foreground max-w-[110px] sm:max-w-[180px] md:max-w-[220px] truncate select-none">
                <span className="truncate">{displayName}</span>
              </div>
            )}

            <TooltipProvider delayDuration={100}>
              {/* Circular Icon 1: Search */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSearchDialogOpen(true)}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-white/10 dark:hover:bg-white/20 text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary border border-primary/20 dark:border-white/15 backdrop-blur-md shadow-xs flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                    title="Search (Ctrl+K)"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-slate-900 text-white font-medium">
                  Search (Ctrl+K)
                </TooltipContent>
              </Tooltip>

              {/* Circular Icon 2: Notifications */}
              <LiveNotificationBell triggerClassName="relative group h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-white/10 dark:hover:bg-white/20 text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary border border-primary/20 dark:border-white/15 backdrop-blur-md shadow-xs flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shrink-0 p-0" />

              {/* Circular Icon 3: Theme Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ThemeToggle className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-white/10 dark:hover:bg-white/20 text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary border border-primary/20 dark:border-white/15 backdrop-blur-md shadow-xs flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shrink-0 p-0 border-none" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-slate-900 text-white font-medium">
                  Toggle theme
                </TooltipContent>
              </Tooltip>

              {/* Circular Icon 4: Company Icon */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-primary/30 dark:border-white/20 bg-card/80 backdrop-blur-md flex items-center justify-center shadow-xs hover:scale-105 hover:ring-2 hover:ring-primary/40 transition-all duration-200 cursor-pointer shrink-0 p-0.5"
                        title="Company Profile & Options"
                        aria-label="Company Options"
                      >
                        {effectiveCompanyLogo ? (
                          <img src={effectiveCompanyLogo} alt={displayName} className="h-full w-full object-contain rounded-full" />
                        ) : (
                          <div
                            style={{
                              background: "var(--gradient-brand, var(--primary))",
                              color: "var(--primary-foreground, #ffffff)",
                            }}
                            className="h-full w-full rounded-full flex items-center justify-center font-bold text-xs shadow-2xs select-none"
                          >
                            {(displayName || "C")[0].toUpperCase()}
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs bg-slate-900 text-white font-medium">
                    Company Profile & Options
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-56 backdrop-blur-xl bg-card/90 border-border/60">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin/org" })}>
                    <Building2 className="h-4 w-4 mr-2 text-primary" /> Organization
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin/branches" })}>
                    <Network className="h-4 w-4 mr-2 text-primary" /> Branches
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin/vault" })}>
                    <FolderLock className="h-4 w-4 mr-2 text-primary" /> Vault
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin/settings" })}>
                    <Settings className="h-4 w-4 mr-2 text-primary" /> Settings
                  </DropdownMenuItem>
                  {isSuperAdmin && (
                    <DropdownMenuItem asChild>
                      <a href={import.meta.env.VITE_SUPER_ADMIN_URL || "http://localhost:5173"}>
                        <Shield className="h-4 w-4 mr-2 text-primary" /> Super Admin Portal
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      if (demoMode) exitDemo();
                      else await signOut();
                      navigate({ to: "/login" });
                    }}
                    className="text-rose-600 dark:text-rose-400 focus:text-rose-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </header>
        {/* Global Command / Quick Search Dialog (Ctrl+K) */}
        <CommandDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
          <CommandInput placeholder="Search navigation, employees, actions... (ESC to close)" />
          <CommandList className="max-h-[380px] overflow-y-auto">
            <CommandEmpty>No matching results found.</CommandEmpty>
            <CommandGroup heading="Quick Navigation">
              {nav.map((item) => (
                <CommandItem
                  key={item.to}
                  onSelect={() => {
                    navigate({ to: item.to });
                    setSearchDialogOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2.5 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                      {item.badge}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {employees.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Employees & Directory">
                  {employees.slice(0, 8).map((emp) => (
                    <CommandItem
                      key={emp.id || emp.empCode}
                      onSelect={() => {
                        navigate({ to: "/admin/employees" });
                        setSearchDialogOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Users className="mr-2.5 h-4 w-4 text-primary/70" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">{emp.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {emp.empCode} · {emp.designation || emp.department || "Staff Member"}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandDialog>

        <main
          className={`flex-1 min-w-0 min-h-0 ${
            isFullBleed
              ? "h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-hidden p-0"
              : "overflow-auto p-4 sm:p-6 pb-24 md:pb-6 safe-bottom"
          }`}
        >
          {isRouteBlocked ? (
            <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-card border border-destructive/20 shadow-lg text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your currently active position (<strong>{activeRole?.name || "Assigned Role"}</strong>) does not have read permissions for the{" "}
                <span className="font-semibold text-foreground">{MODULE_REGISTRY[currentModuleKey]?.label || selectedMenuName}</span> feature.
              </p>
              {activeRole?.responsibilities && activeRole.responsibilities.length > 0 && (
                <div className="bg-muted/40 p-4 rounded-2xl text-left border border-border text-xs space-y-2 mt-4">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Key Responsibilities for {activeRole.name}:
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {activeRole.responsibilities.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-4 flex items-center justify-center gap-3">
                <Button onClick={() => navigate({ to: "/admin" })} className="bg-gradient-brand text-white">
                  Back to My Dashboard
                </Button>
                {previewRoleId && (
                  <Button variant="outline" onClick={() => setPreviewRoleId(null)}>
                    Exit Role Preview
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {!path.startsWith("/admin/ai") && <SwiftAiCopilot role={isSuperAdmin ? "super_admin" : "admin"} />}
      {!isFullBleed && <AdminInternalChat />}
    </div>
  );
}
