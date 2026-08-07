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
    if (id) {
      import("./store").then((mod) => mod.useStore.getState().loadCompanyState(id));
    }
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
      const memberships: TenantMembership[] = [
        {
          tenant_id: activeTenantId,
          role: "owner",
          tenant: {
            id: activeTenantId,
            name: "SWIFT Demo Pvt Ltd",
            slug: "demo",
            legal_name: "SWIFT Demo Private Limited",
            address: null,
            gstin: null,
            plan: "growth",
            status: "active",
            created_at: new Date().toISOString(),
          },
        },
      ];
      localStorage.setItem("swift-auth-user", JSON.stringify(user));
      localStorage.setItem("swift-auth-role", "user");
      localStorage.setItem("swift-auth-memberships", JSON.stringify(memberships));
      localStorage.setItem("swift-active-tenant", activeTenantId);
      set({ user, isSuperAdmin: false, memberships, activeTenantId, loading: false });
      import("./store").then((mod) => mod.useStore.getState().loadCompanyState(activeTenantId));
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
      import("./store").then((mod) => mod.useStore.getState().loadCompanyState(activeTenantId));
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
    if (activeTenantId) {
      import("./store").then((mod) => mod.useStore.getState().loadCompanyState(activeTenantId));
    }
  },
  signOut: async () => {
    localStorage.removeItem("swift-auth-user");
    localStorage.removeItem("swift-auth-role");
    localStorage.removeItem("swift-auth-memberships");
    localStorage.removeItem("swift-active-tenant");
    set({ user: null, isSuperAdmin: false, memberships: [], activeTenantId: null });
    import("./store").then((mod) => mod.useStore.getState().resetTenantState());
  },
}));

if (typeof window !== "undefined") {
  useAuth.getState().refresh();
}
