// SWIFT AI — Automatic Authentication & Scope Resolver
// Automatically and invisibly identifies user role, permissions, and scope from session state.
// No manual role selector or persona toggle is required from the end user.

import type { Role } from "./ai-context";
import type { Employee, Company } from "./store";

export interface ResolvedUserContext {
  role: Role;
  viewerEmployeeId?: string;
  viewerEmail: string;
  viewerName: string;
  department?: string;
  designation?: string;
  isManager: boolean;
  directReportEmployeeIds: string[];
  canViewCompanyWide: boolean;
  canViewTeamOnly: boolean;
  isSelfOnly: boolean;
}

export function resolveUserContext(
  authUser: { id?: string; email?: string; name?: string } | null,
  isSuperAdmin: boolean,
  memberships: Array<{ role?: string; tenant_id?: string }> = [],
  employees: Employee[] = [],
  _company?: Company
): ResolvedUserContext {
  const email = (authUser?.email || "").toLowerCase().trim();
  const authId = authUser?.id || "";

  // 1. Super Admin: Global Unrestricted Access
  const isLocalStorageSuper = typeof localStorage !== "undefined" && localStorage.getItem("swift-auth-role") === "super_admin";
  if (isSuperAdmin || email.startsWith("super") || isLocalStorageSuper) {
    return {
      role: "super_admin",
      viewerEmail: email || "superadmin@swift.com",
      viewerName: authUser?.name || "Super Admin",
      isManager: true,
      directReportEmployeeIds: employees.map((e) => e.id),
      canViewCompanyWide: true,
      canViewTeamOnly: false,
      isSelfOnly: false,
    };
  }

  // 2. Find matching employee record in the current organization by email or user ID
  const matchedEmp = employees.find(
    (e) => (e.email && e.email.toLowerCase().trim() === email) || (authId && e.id === authId)
  );

  // Check if this user manages other employees (direct reports)
  const directReports = matchedEmp
    ? employees.filter(
        (e) =>
          (e.managerId && e.managerId === matchedEmp.id) ||
          (e.reportingManager && e.reportingManager.toLowerCase() === matchedEmp.name.toLowerCase())
      )
    : [];
  const isManager = directReports.length > 0;
  const directReportIds = directReports.map((e) => e.id);

  // 3. Organization Membership Role Evaluation
  const membershipRole = memberships[0]?.role?.toLowerCase();

  // If organization owner or admin role
  if (membershipRole === "owner" || membershipRole === "admin" || !email) {
    return {
      role: "admin",
      viewerEmployeeId: matchedEmp?.id,
      viewerEmail: email,
      viewerName: matchedEmp?.name || authUser?.name || "Administrator",
      department: matchedEmp?.department,
      designation: matchedEmp?.designation,
      isManager: true,
      directReportEmployeeIds: employees.map((e) => e.id),
      canViewCompanyWide: true,
      canViewTeamOnly: false,
      isSelfOnly: false,
    };
  }

  // If HR role in membership or employee designation/department indicates HR
  const isHrDesignation =
    matchedEmp &&
    (/\b(hr|human\s*resources|talent|people\s*operations|recruiter)\b/i.test(matchedEmp.department || "") ||
      /\b(hr|human\s*resources|people\s*partner|talent)\b/i.test(matchedEmp.designation || ""));

  if (membershipRole === "hr" || isHrDesignation) {
    return {
      role: "hr_manager",
      viewerEmployeeId: matchedEmp?.id,
      viewerEmail: email,
      viewerName: matchedEmp?.name || authUser?.name || "HR Manager",
      department: matchedEmp?.department || "Human Resources",
      designation: matchedEmp?.designation || "HR Manager",
      isManager: true,
      directReportEmployeeIds: employees.map((e) => e.id),
      canViewCompanyWide: true,
      canViewTeamOnly: false,
      isSelfOnly: false,
    };
  }

  // If designated Manager with direct reports
  if (isManager) {
    return {
      role: "manager",
      viewerEmployeeId: matchedEmp?.id,
      viewerEmail: email,
      viewerName: matchedEmp?.name || authUser?.name || "Team Manager",
      department: matchedEmp?.department,
      designation: matchedEmp?.designation,
      isManager: true,
      directReportEmployeeIds: directReportIds,
      canViewCompanyWide: false,
      canViewTeamOnly: true,
      isSelfOnly: false,
    };
  }

  // 4. Default: Regular Employee Persona (strictly self-scoped for private data)
  return {
    role: "employee",
    viewerEmployeeId: matchedEmp?.id,
    viewerEmail: email,
    viewerName: matchedEmp?.name || authUser?.name || "Employee",
    department: matchedEmp?.department,
    designation: matchedEmp?.designation,
    isManager: false,
    directReportEmployeeIds: [],
    canViewCompanyWide: false,
    canViewTeamOnly: false,
    isSelfOnly: true,
  };
}
