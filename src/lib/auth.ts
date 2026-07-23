import { create } from "zustand";
import { safeFetch } from "./store";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  address: string | null;
  gstin: string | null;
  plan: string;
  status: string;
  created_at: string;
};

export type TenantMembership = {
  tenant_id: string;
  role: "owner" | "hr" | "employee";
  tenant: Tenant;
};

export type AuthUser = {
  id: string;
  email: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  isSuperAdmin: boolean;
  memberships: TenantMembership[];
  activeTenantId: string | null;
  setActiveTenant: (id: string) => void;
  signIn: (email: string, role: "super_admin" | "admin" | "employee", password?: string) => Promise<void>;
  signUp: (email: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isSuperAdmin: false,
  memberships: [],
  activeTenantId: null,
  setActiveTenant: (id) => {
    localStorage.setItem("swift-active-tenant", id);
    set({ activeTenantId: id });
  },
  signIn: async (email, role, password) => {
    if (role === "super_admin" || email.startsWith("super")) {
      const id = crypto.randomUUID();
      const user = { id, email };
      localStorage.setItem("swift-auth-user", JSON.stringify(user));
      localStorage.setItem("swift-auth-role", "super_admin");
      localStorage.setItem("swift-auth-memberships", JSON.stringify([]));
      set({ user, isSuperAdmin: true, memberships: [], activeTenantId: null, loading: false });
      return;
    }

    const res = await safeFetch("/api/companies/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res) {
      // Demo / offline fallback when backend API is unreachable
      const id = crypto.randomUUID();
      const user = { id, email, name: email.split("@")[0] };
      const activeTenantId = "demo-tenant-1";
      const memberships = [{ tenant_id: activeTenantId, tenant_name: "SWIFT Demo Pvt Ltd", role: "company_admin" }];
      localStorage.setItem("swift-auth-user", JSON.stringify(user));
      localStorage.setItem("swift-auth-role", "user");
      localStorage.setItem("swift-auth-memberships", JSON.stringify(memberships));
      localStorage.setItem("swift-active-tenant", activeTenantId);
      set({ user, isSuperAdmin: false, memberships, activeTenantId, loading: false });
      return;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: "Invalid credentials" }));
      throw new Error(errData.error || "Invalid credentials");
    }

    const { user, memberships } = await res.json();
    localStorage.setItem("swift-auth-user", JSON.stringify(user));
    localStorage.setItem("swift-auth-role", "user");
    localStorage.setItem("swift-auth-memberships", JSON.stringify(memberships));
    
    const activeTenantId = memberships[0]?.tenant_id ?? null;
    if (activeTenantId) {
      localStorage.setItem("swift-active-tenant", activeTenantId);
    }
    
    set({ user, isSuperAdmin: false, memberships, activeTenantId, loading: false });
  },
  signUp: async (email) => {
    await get().signIn(email, "admin");
  },
  refresh: async () => {
    const userStr = localStorage.getItem("swift-auth-user");
    if (!userStr) {
      set({ user: null, isSuperAdmin: false, memberships: [], activeTenantId: null, loading: false });
      return;
    }
    const user = JSON.parse(userStr);
    const isSuperAdmin = localStorage.getItem("swift-auth-role") === "super_admin";
    const memsStr = localStorage.getItem("swift-auth-memberships");
    const memberships = memsStr ? JSON.parse(memsStr) : [];
    const saved = localStorage.getItem("swift-active-tenant");
    const activeTenantId =
      memberships.find((m: any) => m.tenant_id === saved)?.tenant_id ??
      memberships[0]?.tenant_id ??
      null;
    set({ user, isSuperAdmin, memberships, activeTenantId, loading: false });
  },
  signOut: async () => {
    localStorage.removeItem("swift-auth-user");
    localStorage.removeItem("swift-auth-role");
    localStorage.removeItem("swift-auth-memberships");
    localStorage.removeItem("swift-active-tenant");
    set({ user: null, isSuperAdmin: false, memberships: [], activeTenantId: null });
  },
}));

if (typeof window !== "undefined") {
  useAuth.getState().refresh();
}
