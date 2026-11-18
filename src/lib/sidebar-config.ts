import type { ModuleKey } from "@/lib/roles-permissions";
import {
  LayoutDashboard,
  Inbox,
  LayoutGrid,
  Users,
  CalendarCheck,
  Calculator,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  Network,
  Rocket,
  BarChart3,
  Package,
  Scale,
  CreditCard,
  BellRing,
  Settings,
} from "lucide-react";
import { CreatonsAiIcon } from "@/components/icons/creatons-ai-icon";

export interface NavItemConfig {
  id: string;
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: ModuleKey;
  exact?: boolean;
  comingSoon?: boolean;
  badge?: string | number;
}

export const DEFAULT_SIDEBAR_ITEMS: NavItemConfig[] = [
  { id: "dashboard", to: "/admin", label: "Dashboard", icon: LayoutDashboard, moduleKey: "dashboard", exact: true },
  { id: "requests", to: "/admin/requests", label: "Requests & Approvals", icon: Inbox, moduleKey: "requests" },
  { id: "ai", to: "/admin/ai", label: "CREATONS AI", icon: CreatonsAiIcon, moduleKey: "ai", badge: "AI" },
  { id: "app-hub", to: "/admin/app-hub", label: "App Hub", icon: LayoutGrid },
  { id: "employees", to: "/admin/employees", label: "Employees", icon: Users, moduleKey: "employees" },
  { id: "attendance", to: "/admin/attendance", label: "Attendance", icon: CalendarCheck, moduleKey: "attendance" },
  { id: "payroll", to: "/admin/payroll", label: "Payroll", icon: Calculator, moduleKey: "payroll" },
  { id: "documentation", to: "/admin/documentation-alt", label: "Documentations", icon: FileText, moduleKey: "documentation" },
  { id: "approval-settings", to: "/admin/approval-settings", label: "Approval Settings", icon: SlidersHorizontal, moduleKey: "approvalSettings" },
  { id: "roles", to: "/admin/roles", label: "Roles & Responsibilities", icon: ShieldCheck, moduleKey: "roles" },
  { id: "org", to: "/admin/org", label: "Organization", icon: Network, moduleKey: "org" },
  { id: "lifecycle", to: "/admin/lifecycle", label: "AI Lifecycle", icon: Rocket, comingSoon: true },
  { id: "reports", to: "/admin/reports", label: "Reports", icon: BarChart3, comingSoon: true },
  { id: "assets", to: "/admin/assets", label: "Assets", icon: Package, comingSoon: true },
  { id: "compliance", to: "/admin/compliance", label: "Compliance AI", icon: Scale, comingSoon: true },
  { id: "compliance-docs", to: "/admin/compliance-docs", label: "Compliance Docs", icon: ShieldCheck, comingSoon: true },
  { id: "audit", to: "/admin/audit", label: "Audit Log", icon: ShieldCheck, comingSoon: true },
  { id: "subscription", to: "/admin/subscription", label: "Subscription", icon: CreditCard, comingSoon: true },
  { id: "renewals", to: "/admin/renewals", label: "Renewal Scheduler", icon: BellRing, comingSoon: true },
  { id: "settings", to: "/admin/settings", label: "Settings", icon: Settings, moduleKey: "settings" },
];

export const SIDEBAR_STORAGE_KEY = "creatons_sidebar_order";
export const SIDEBAR_HIDDEN_KEY = "creatons_sidebar_hidden";

export function getSavedSidebarOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_ITEMS.map((i) => i.id);
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!raw) return DEFAULT_SIDEBAR_ITEMS.map((i) => i.id);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const set = new Set(parsed);
      const missing = DEFAULT_SIDEBAR_ITEMS.map((i) => i.id).filter((id) => !set.has(id));
      return [...parsed, ...missing];
    }
  } catch (e) {
    console.error("Failed to parse sidebar order:", e);
  }
  return DEFAULT_SIDEBAR_ITEMS.map((i) => i.id);
}

export function saveSidebarOrder(order: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(order));
    window.dispatchEvent(new CustomEvent("creatons:sidebar-order-changed", { detail: { order } }));
  } catch (e) {
    console.error("Failed to save sidebar order:", e);
  }
}

export function getSavedHiddenSidebarItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SIDEBAR_HIDDEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error("Failed to parse hidden sidebar items:", e);
  }
  return [];
}

export function saveHiddenSidebarItems(hidden: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, JSON.stringify(hidden));
    window.dispatchEvent(new CustomEvent("creatons:sidebar-order-changed", { detail: { hidden } }));
  } catch (e) {
    console.error("Failed to save hidden sidebar items:", e);
  }
}

export function getOrderedNavItems(customOrder?: string[], hiddenIds?: string[]): NavItemConfig[] {
  const order = customOrder && customOrder.length > 0 ? customOrder : getSavedSidebarOrder();
  const hidden = new Set(hiddenIds ?? getSavedHiddenSidebarItems());

  const byId = new Map(DEFAULT_SIDEBAR_ITEMS.map((i) => [i.id, i]));
  const ordered: NavItemConfig[] = [];

  for (const id of order) {
    const item = byId.get(id);
    if (item && !hidden.has(id)) {
      ordered.push(item);
    }
  }

  // Any remaining items not present in customOrder
  for (const item of DEFAULT_SIDEBAR_ITEMS) {
    if (!order.includes(item.id) && !hidden.has(item.id)) {
      ordered.push(item);
    }
  }

  return ordered;
}
