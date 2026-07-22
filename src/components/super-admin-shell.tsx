import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { SwiftLogo } from "@/components/swift-logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown, LogOut, LayoutDashboard, Building2, PackageOpen, Puzzle, Ticket, HeartPulse,
  Sparkles, ClipboardList, Palette, CreditCard, ShieldCheck, QrCode, BookOpen, Brain,
} from "lucide-react";

const NAV = [
  { to: "/super-admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/super-admin/companies", label: "Companies", icon: Building2 },
  { to: "/super-admin/plans", label: "Plans", icon: PackageOpen },
  { to: "/super-admin/modules", label: "Modules", icon: Puzzle },
  { to: "/super-admin/compliance-registry", label: "Compliance Registry", icon: BookOpen },
  { to: "/super-admin/compliance-knowledge", label: "Knowledge Brain", icon: Brain },
  { to: "/super-admin/billing", label: "Billing Ops", icon: CreditCard },
  { to: "/super-admin/payments", label: "UPI Payments", icon: QrCode },
  { to: "/super-admin/support", label: "Support CRM", icon: Ticket },
  { to: "/super-admin/success", label: "Customer Success", icon: HeartPulse },
  { to: "/super-admin/ai", label: "Super AI", icon: Sparkles },
  { to: "/super-admin/audit", label: "Audit Log", icon: ClipboardList },
  { to: "/super-admin/whitelabel", label: "White Label", icon: Palette },
];


export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const { signOut } = useAuth();
  const { demoMode, exitDemo } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <SwiftLogo />
            <Badge variant="outline" className="hidden sm:inline-flex gap-1 border-primary/40 text-primary">
              <Crown className="h-3 w-3" /> Super Admin
            </Badge>
            {demoMode && <Badge variant="outline" className="hidden md:inline-flex text-amber-600 border-amber-500/40">DEMO</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin"><Button variant="ghost" size="sm"><ShieldCheck className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Workspace</span></Button></Link>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={async () => { if (demoMode) exitDemo(); await signOut(); nav({ to: "/login" }); }}>
              <LogOut className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto flex gap-1 overflow-x-auto px-2 sm:px-4 pb-2">
          {NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-gradient-brand text-white shadow-soft" : "text-muted-foreground hover:bg-muted"
                }`}>
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
