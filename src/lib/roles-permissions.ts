import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PredefinedRole } from "./store";

export type ModuleKey =
  | "dashboard"
  | "requests"
  | "ai"
  | "teamChat"
  | "notices"
  | "employees"
  | "pastEmployees"
  | "attendance"
  | "leaveCalendar"
  | "shiftRoster"
  | "payroll"
  | "documentation"
  | "approvalSettings"
  | "branches"
  | "org"
  | "vault"
  | "roles"
  | "settings";

export type ModulePermission = {
  enabledInSidebar: boolean;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
};

export type DashboardViewType = "executive" | "hr" | "finance" | "manager";

export interface ModuleMetadata {
  key: ModuleKey;
  label: string;
  category: "Core" | "Workforce" | "Operations" | "Finance & Legal" | "System";
  description: string;
  path: string;
}

export const MODULE_REGISTRY: Record<ModuleKey, ModuleMetadata> = {
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    category: "Core",
    description: "Main analytical metrics and quick actions hub",
    path: "/admin",
  },
  requests: {
    key: "requests",
    label: "Requests & Approvals",
    category: "Operations",
    description: "Employee leave, attendance, loan and expense requests",
    path: "/admin/requests",
  },
  ai: {
    key: "ai",
    label: "SWIFT AI Copilot",
    category: "Core",
    description: "AI-assisted HR query engine, document drafting & analytics",
    path: "/admin/ai",
  },
  teamChat: {
    key: "teamChat",
    label: "Team Chat",
    category: "Workforce",
    description: "Company channels and direct employee communications",
    path: "/admin/team-chat",
  },
  notices: {
    key: "notices",
    label: "Notice Board",
    category: "Workforce",
    description: "Publish company announcements, circulars and policies",
    path: "/admin/notices",
  },
  employees: {
    key: "employees",
    label: "Employees Directory",
    category: "Workforce",
    description: "Active employee profiles, contracts, and onboarding records",
    path: "/admin/employees",
  },
  pastEmployees: {
    key: "pastEmployees",
    label: "Past Employees",
    category: "Workforce",
    description: "Resigned, retired, and terminated employee archives",
    path: "/admin/past-employees",
  },
  attendance: {
    key: "attendance",
    label: "Attendance & Regularization",
    category: "Operations",
    description: "Daily biometric punches, timesheets, and overtime tracking",
    path: "/admin/attendance",
  },
  leaveCalendar: {
    key: "leaveCalendar",
    label: "Leave Calendar",
    category: "Operations",
    description: "Holiday schedules, leave balances, and team availability",
    path: "/admin/leave-calendar",
  },
  shiftRoster: {
    key: "shiftRoster",
    label: "Shift Roster",
    category: "Operations",
    description: "Shift allocation, rotations, and night/morning rosters",
    path: "/admin/shift-roster",
  },
  payroll: {
    key: "payroll",
    label: "Payroll & Salary",
    category: "Finance & Legal",
    description: "Monthly salary computation, payslips, PF, ESI, and TDS",
    path: "/admin/payroll",
  },
  documentation: {
    key: "documentation",
    label: "Documentations & Letters",
    category: "Finance & Legal",
    description: "Issue offer, increment, warning, and experience letters",
    path: "/admin/documentation-alt",
  },
  approvalSettings: {
    key: "approvalSettings",
    label: "Approval Settings",
    category: "System",
    description: "Multi-level approval workflows and escalation hierarchies",
    path: "/admin/approval-settings",
  },
  branches: {
    key: "branches",
    label: "Branches & Geofencing",
    category: "System",
    description: "Office locations, biometric device assignments, and GPS fences",
    path: "/admin/branches",
  },
  org: {
    key: "org",
    label: "Organization Chart",
    category: "Workforce",
    description: "Reporting hierarchies, department trees, and designations",
    path: "/admin/org",
  },
  vault: {
    key: "vault",
    label: "Company Vault",
    category: "Finance & Legal",
    description: "Secure storage for business licenses, PAN, GST, and NDA documents",
    path: "/admin/vault",
  },
  roles: {
    key: "roles",
    label: "Roles & Responsibilities",
    category: "System",
    description: "Manage job positions, side-panel feature toggles, and CRUD access",
    path: "/admin/roles",
  },
  settings: {
    key: "settings",
    label: "Company Settings",
    category: "System",
    description: "Organization branding, color palettes, and global configurations",
    path: "/admin/settings",
  },
};

export const DEFAULT_FULL_MODULE_PERMISSION: ModulePermission = {
  enabledInSidebar: true,
  canRead: true,
  canWrite: true,
  canDelete: true,
};

export const DEFAULT_READONLY_MODULE_PERMISSION: ModulePermission = {
  enabledInSidebar: true,
  canRead: true,
  canWrite: false,
  canDelete: false,
};

export const DEFAULT_DISABLED_MODULE_PERMISSION: ModulePermission = {
  enabledInSidebar: false,
  canRead: false,
  canWrite: false,
  canDelete: false,
};

// Generates fallback granular permissions from legacy boolean flags
export function resolveModulePermissions(
  role: PredefinedRole | null | undefined
): Record<ModuleKey, ModulePermission> {
  const result: Record<ModuleKey, ModulePermission> = {} as any;
  const rawModules = (role as any)?.modules || {};

  const perm = role?.permissions;

  for (const key of Object.keys(MODULE_REGISTRY) as ModuleKey[]) {
    if (rawModules[key]) {
      result[key] = {
        enabledInSidebar: rawModules[key].enabledInSidebar ?? true,
        canRead: rawModules[key].canRead ?? true,
        canWrite: rawModules[key].canWrite ?? false,
        canDelete: rawModules[key].canDelete ?? false,
      };
      continue;
    }

    // Smart fallback if role has legacy permissions
    if (!perm) {
      result[key] = { ...DEFAULT_FULL_MODULE_PERMISSION };
      continue;
    }

    switch (key) {
      case "dashboard":
        result[key] = { enabledInSidebar: true, canRead: true, canWrite: true, canDelete: false };
        break;
      case "requests":
        result[key] = {
          enabledInSidebar: !!(perm.leaveApproval || perm.attendanceApproval || perm.expenseHandloanApproval),
          canRead: !!(perm.leaveApproval || perm.attendanceApproval || perm.expenseHandloanApproval),
          canWrite: true,
          canDelete: false,
        };
        break;
      case "ai":
      case "teamChat":
        result[key] = { enabledInSidebar: true, canRead: true, canWrite: true, canDelete: false };
        break;
      case "notices":
        result[key] = {
          enabledInSidebar: perm.noticesAnnouncements ?? true,
          canRead: true,
          canWrite: perm.noticesAnnouncements ?? false,
          canDelete: perm.noticesAnnouncements ?? false,
        };
        break;
      case "employees":
      case "pastEmployees":
        result[key] = {
          enabledInSidebar: perm.employeeManagement ?? false,
          canRead: perm.employeeManagement ?? false,
          canWrite: perm.employeeManagement ?? false,
          canDelete: false,
        };
        break;
      case "attendance":
      case "leaveCalendar":
      case "shiftRoster":
        result[key] = {
          enabledInSidebar: perm.attendanceApproval || perm.leaveApproval,
          canRead: true,
          canWrite: perm.attendanceApproval || perm.leaveApproval,
          canDelete: false,
        };
        break;
      case "payroll":
        result[key] = {
          enabledInSidebar: perm.payrollDashboard ?? false,
          canRead: perm.payrollDashboard ?? false,
          canWrite: perm.payrollDashboard ?? false,
          canDelete: false,
        };
        break;
      case "documentation":
        result[key] = {
          enabledInSidebar: perm.documentsApproval ?? false,
          canRead: perm.documentsApproval ?? false,
          canWrite: perm.documentsApproval ?? false,
          canDelete: false,
        };
        break;
      case "vault":
      case "approvalSettings":
      case "branches":
      case "org":
      case "roles":
      case "settings":
        result[key] = {
          enabledInSidebar: perm.employeeManagement ?? false,
          canRead: perm.employeeManagement ?? false,
          canWrite: perm.employeeManagement ?? false,
          canDelete: false,
        };
        break;
      default:
        result[key] = { ...DEFAULT_READONLY_MODULE_PERMISSION };
    }
  }

  return result;
}

interface RolePreviewStore {
  previewRoleId: string | null;
  setPreviewRoleId: (id: string | null) => void;
}

export const useRolePreview = create<RolePreviewStore>()(
  persist(
    (set) => ({
      previewRoleId: null,
      setPreviewRoleId: (previewRoleId) => set({ previewRoleId }),
    }),
    { name: "swift-role-preview-state" }
  )
);
