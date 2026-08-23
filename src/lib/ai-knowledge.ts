// Enterprise Knowledge Graph builder for SWIFT AI.
// Composes the base AiSnapshot with cross-module intelligence: branches,
// notices, assets, journeys, salary revisions, compliance store, billing,
// plus derived predictions and recommendations. Everything is derived from
// live tenant state — nothing hardcoded.

import type { AiSnapshot, Role } from "./ai-context";
import { buildAiSnapshot } from "./ai-context";
import { useStore, type Company, type Employee, type AttendanceRecord, type PayrollRun, type LeaveRequest, type DocRequest, type Notice } from "./store";
import type { Asset, AssetAssignment } from "./assets";
import { useCompliance } from "./compliance-store";
import { useBilling } from "./billing-store";
import { useSuperAdmin } from "./super-admin-store";

export type Prediction = {
  id: string;
  kind:
    | "attrition_risk" | "resignation_risk" | "late_pattern" | "high_overtime"
    | "high_leave" | "promotion_candidate" | "compliance_risk" | "payroll_anomaly"
    | "contract_expiry" | "license_expiry" | "training_due" | "medical_due"
    | "inspection_risk" | "confirmation_eligible";
  subject: string;
  subjectId?: string;
  confidence: number;
  reason: string;
  suggestedAction?: string;
};

export type Recommendation = {
  id: string;
  category: "hr" | "payroll" | "compliance" | "operations" | "workforce";
  title: string;
  detail: string;
  urgency: "low" | "medium" | "high";
};

export type GraphNode = { id: string; type: string; label: string; meta?: Record<string, unknown> };
export type GraphEdge = { from: string; to: string; rel: string };

export type EnterpriseSnapshot = AiSnapshot & {
  graph: { nodes: GraphNode[]; edges: GraphEdge[]; counts: Record<string, number> };
  branches: Array<{ id: string; name: string; code: string; city: string; state: string; headcount: number; isHead?: boolean }>;
  departments: Array<{ name: string; headcount: number; avgAttendance30d: number }>;
  notices: Array<Pick<Notice, "id" | "title" | "priority" | "createdAt" | "expiresAt" | "pinned"> & { scope: string }>;
  assets: {
    total: number; assigned: number; available: number;
    byCategory: Array<{ category: string; count: number }>;
    recentAssignments: Array<{ asset: string; employee: string; assignedAt: string; returned?: boolean }>;
  };
  onboarding: { incomplete: number; pendingSteps: Array<{ employee: string; step: string; status: string }> };
  salaryRevisions: { pending: number; appliedThisYear: number; totalDeltaMonthly: number };
  leaves: { pendingApprovals: number; approvedThisMonth: number; topRequesters: Array<{ name: string; count: number }> };
  compliance: AiSnapshot["compliance"] & {
    filingsDue30d: number;
    docsExpiring60d: Array<{ name: string; expiry: string }>;
    activeRules: number;
    knowledgeActs: number;
  };
  billing?: {
    plan?: string; status?: string; renewsOn?: string;
    outstanding?: number; overdueInvoices?: number;
  };
  saas?: {
    subscriptions: number; activeSubscriptions: number;
    openTickets: number; pendingPayments: number;
  };
  predictions: Prediction[];
  recommendations: Recommendation[];
  capabilities: {
    canGenerateDocuments: boolean;
    canApproveLeave: boolean;
    canRunPayroll: boolean;
    canManageCompliance: boolean;
    canManageTenants: boolean;
    canViewAllEmployees: boolean;
  };
};

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function countAttendance(records: AttendanceRecord[], empId: string, sinceIso: string) {
  const scoped = records.filter((r) => r.employeeId === empId && r.date >= sinceIso);
  const late = scoped.filter((r) => (r.checkIn ?? "") > "09:15").length;
  const absent = scoped.filter((r) => r.status === "absent").length;
  const leave = scoped.filter((r) => r.status === "leave").length;
  const ot = scoped.reduce((a, r) => a + (r.otHours ?? 0), 0);
  return { late, absent, leave, ot, total: scoped.length };
}

function computeCapabilities(role: Role) {
  const isAdminTier = role === "super_admin" || role === "admin" || role === "hr_manager";
  return {
    canGenerateDocuments: isAdminTier || role === "manager",
    canApproveLeave: isAdminTier || role === "manager",
    canRunPayroll: isAdminTier,
    canManageCompliance: isAdminTier,
    canManageTenants: role === "super_admin",
    canViewAllEmployees: isAdminTier,
  };
}

export function buildEnterpriseSnapshot(opts: {
  company: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  payrolls: PayrollRun[];
  leaves: LeaveRequest[];
  docRequests: DocRequest[];
  role: Role;
  viewerEmployeeId?: string;
}): EnterpriseSnapshot {
  const base = buildAiSnapshot(opts);
  const { company, role, viewerEmployeeId } = opts;

  let employees = opts.employees;
  if (role === "employee" && viewerEmployeeId) employees = employees.filter((e) => e.id === viewerEmployeeId);
  else if (role === "manager" && viewerEmployeeId) employees = employees.filter((e) => e.id === viewerEmployeeId || e.managerId === viewerEmployeeId);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const last30 = new Date(today); last30.setDate(last30.getDate() - 30);
  const last30Iso = last30.toISOString().slice(0, 10);
  const last90 = new Date(today); last90.setDate(last90.getDate() - 90);
  const last90Iso = last90.toISOString().slice(0, 10);

  // Pull sibling stores defensively
  let notices: Notice[] = [];
  let assets: Asset[] = [];
  let assetAssignments: AssetAssignment[] = [];
  let journeys: ReturnType<typeof useStore.getState>["journeys"] = [];
  let salaryRevisions: ReturnType<typeof useStore.getState>["salaryRevisions"] = [];
  try {
    const s = useStore.getState();
    notices = s.notices ?? []; assets = s.assets ?? [];
    assetAssignments = s.assetAssignments ?? [];
    journeys = s.journeys ?? []; salaryRevisions = s.salaryRevisions ?? [];
  } catch { /* SSR guard */ }

  let compFiled: ReturnType<typeof useCompliance.getState>["filed"] = [];
  let compDocs: ReturnType<typeof useCompliance.getState>["documents"] = [];
  let compRules: ReturnType<typeof useCompliance.getState>["rules"] = [];
  let compKnowledge: ReturnType<typeof useCompliance.getState>["knowledge"] = [];
  try {
    const c = useCompliance.getState();
    compFiled = c.filed; compDocs = c.documents;
    compRules = c.rules; compKnowledge = c.knowledge;
  } catch { /* ignore */ }

  let billingState: ReturnType<typeof useBilling.getState> | undefined;
  try { billingState = useBilling.getState(); } catch { /* ignore */ }

  let superAdminState: ReturnType<typeof useSuperAdmin.getState> | undefined;
  try { if (role === "super_admin") superAdminState = useSuperAdmin.getState(); } catch { /* ignore */ }

  // Branches & departments
  const branches = (company.branches ?? []).map((b) => ({
    id: b.id, name: b.name, code: b.code, city: b.city, state: b.state,
    headcount: employees.filter((e) => e.branchId === b.id).length, isHead: b.isHead,
  }));

  const deptMap = new Map<string, Employee[]>();
  for (const e of employees) {
    const key = e.department || "Unassigned";
    (deptMap.get(key) ?? deptMap.set(key, []).get(key)!).push(e);
  }
  const departments = [...deptMap.entries()].map(([name, emps]) => {
    const ids = new Set(emps.map((e) => e.id));
    const scoped = opts.attendance.filter((a) => ids.has(a.employeeId) && a.date >= last30Iso);
    const present = scoped.filter((a) => a.status === "present").length;
    return { name, headcount: emps.length, avgAttendance30d: scoped.length ? Math.round((present / scoped.length) * 100) : 0 };
  });

  // Notices
  const activeNotices = notices
    .filter((n) => !n.expiresAt || n.expiresAt >= todayIso)
    .slice(0, 20)
    .map((n) => ({ id: n.id, title: n.title, priority: n.priority, createdAt: n.createdAt, expiresAt: n.expiresAt, pinned: n.pinned, scope: n.audience.scope }));

  // Assets
  const activeAssignments = assetAssignments.filter((a) => !a.returnedAt);
  const assignedIds = new Set(activeAssignments.map((a) => a.assetId));
  const byCatMap = new Map<string, number>();
  for (const a of assets) byCatMap.set(a.categoryId || "misc", (byCatMap.get(a.categoryId || "misc") ?? 0) + 1);
  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? id;
  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? id;
  const recentAssignments = assetAssignments
    .slice().sort((a, b) => (b.assignedAt ?? "").localeCompare(a.assignedAt ?? ""))
    .slice(0, 10)
    .map((a) => ({ asset: assetName(a.assetId), employee: empName(a.employeeId), assignedAt: a.assignedAt, returned: !!a.returnedAt }));
  const assetSummary = {
    total: assets.length, assigned: assignedIds.size,
    available: Math.max(0, assets.length - assignedIds.size),
    byCategory: [...byCatMap.entries()].map(([category, count]) => ({ category, count })),
    recentAssignments,
  };

  // Onboarding journeys
  const incompleteJourneys = journeys.filter((j) => j.phase !== "confirmed" && j.phase !== "exited");
  const pendingSteps: Array<{ employee: string; step: string; status: string }> = [];
  for (const j of incompleteJourneys.slice(0, 30)) {
    for (const st of j.steps) {
      if (st.status === "pending" || st.status === "in_progress") {
        pendingSteps.push({ employee: empName(j.employeeId), step: st.title, status: st.status });
      }
    }
  }
  const onboarding = { incomplete: incompleteJourneys.length, pendingSteps: pendingSteps.slice(0, 20) };

  // Salary revisions
  const thisYear = todayIso.slice(0, 4);
  const yearRev = salaryRevisions.filter((r) => (r.createdAt ?? "").startsWith(thisYear));
  const salaryRevSummary = {
    pending: salaryRevisions.filter((r) => r.status === "pending").length,
    appliedThisYear: yearRev.filter((r) => r.status === "applied").length,
    totalDeltaMonthly: yearRev.reduce((a, r) => a + ((r.afterBasic ?? 0) - (r.beforeBasic ?? 0)), 0),
  };

  // Leaves
  const month = todayIso.slice(0, 7);
  const scopedLeaves = opts.leaves.filter((l) => employees.some((e) => e.id === l.employeeId));
  const leaveCounts = new Map<string, number>();
  for (const l of scopedLeaves) leaveCounts.set(l.employeeId, (leaveCounts.get(l.employeeId) ?? 0) + 1);
  const topRequesters = [...leaveCounts.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, count]) => ({ name: empName(id), count }));
  const leavesSummary = {
    pendingApprovals: scopedLeaves.filter((l) => (l.status || "").toLowerCase() === "pending").length,
    approvedThisMonth: scopedLeaves.filter((l) => (l.status || "").toLowerCase() === "approved" && (l.from || l.startDate || "").startsWith(month)).length,
    topRequesters,
  };

  // Compliance extras
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const in30Iso = in30.toISOString().slice(0, 10);
  const in60 = new Date(today); in60.setDate(in60.getDate() + 60);
  const in60Iso = in60.toISOString().slice(0, 10);
  const filingsDue30d = compFiled.filter((f) => f.filedAt >= todayIso && f.filedAt <= in30Iso).length;
  const docsExpiring60d = compDocs
    .filter((d) => d.expiryDate && d.expiryDate >= todayIso && d.expiryDate <= in60Iso)
    .map((d) => ({ name: d.name, expiry: d.expiryDate! }))
    .slice(0, 20);
  const complianceExt = {
    ...base.compliance,
    filingsDue30d,
    docsExpiring60d,
    activeRules: compRules.filter((r) => r.active).length,
    knowledgeActs: compKnowledge.length,
  };

  // Billing
  const tenantSub = billingState?.subscriptions?.find((x) => x.tenantId === "self" || true);
  const tenantInvoices = billingState?.invoices ?? [];
  const outstanding = tenantInvoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((a, i) => a + (i.total ?? 0), 0);
  const billing = tenantSub ? {
    plan: tenantSub.planId, status: tenantSub.status,
    renewsOn: tenantSub.renewalAt,
    outstanding,
    overdueInvoices: tenantInvoices.filter((i) => i.status === "overdue").length,
  } : undefined;

  // Super Admin SaaS
  const saas = superAdminState && billingState ? {
    subscriptions: billingState.subscriptions.length,
    activeSubscriptions: billingState.subscriptions.filter((x) => x.status === "active").length,
    openTickets: superAdminState.tickets?.filter((t) => t.status !== "resolved" && t.status !== "closed").length ?? 0,
    pendingPayments: superAdminState.paymentSubmissions?.filter((p) => p.status === "pending").length ?? 0,
  } : undefined;

  // Predictions
  const predictions: Prediction[] = [];
  const probationMonths = 6;
  for (const e of employees) {
    if (e.status !== "active" || !e.doj) continue;
    const tenureDays = daysBetween(e.doj, todayIso);
    const att30 = countAttendance(opts.attendance, e.id, last30Iso);
    const att90 = countAttendance(opts.attendance, e.id, last90Iso);
    const lateRate30 = att30.total ? att30.late / att30.total : 0;
    const leaveRate30 = att30.total ? att30.leave / att30.total : 0;
    const absentRate30 = att30.total ? att30.absent / att30.total : 0;

    if (tenureDays >= probationMonths * 30 && tenureDays <= probationMonths * 30 + 90) {
      predictions.push({
        id: `conf-${e.id}`, kind: "confirmation_eligible", subject: e.name, subjectId: e.id,
        confidence: 90, reason: `Tenure ${Math.floor(tenureDays / 30)} months exceeds probation window.`,
        suggestedAction: "Generate confirmation letter and route for approval.",
      });
    }
    const attritionScore = Math.min(100, Math.round(lateRate30 * 40 + absentRate30 * 40 + leaveRate30 * 20));
    if (attritionScore >= 55) predictions.push({
      id: `attr-${e.id}`, kind: "attrition_risk", subject: e.name, subjectId: e.id,
      confidence: attritionScore,
      reason: `Last 30 days: ${att30.late} late, ${att30.absent} absent, ${att30.leave} leave.`,
      suggestedAction: "Skip-level check-in; review workload and compensation.",
    });
    if (lateRate30 >= 0.3 && att30.total >= 5) predictions.push({
      id: `late-${e.id}`, kind: "late_pattern", subject: e.name, subjectId: e.id,
      confidence: Math.round(lateRate30 * 100),
      reason: `${att30.late}/${att30.total} days late in last 30d.`,
      suggestedAction: "Issue advisory; check shift assignment.",
    });
    if (att30.ot >= 40) predictions.push({
      id: `ot-${e.id}`, kind: "high_overtime", subject: e.name, subjectId: e.id,
      confidence: Math.min(100, Math.round(att30.ot)),
      reason: `${att30.ot} OT hours in last 30d.`,
      suggestedAction: "Review workload; verify Factory Act OT ceiling.",
    });
    if (att90.leave >= 15) predictions.push({
      id: `leave-${e.id}`, kind: "high_leave", subject: e.name, subjectId: e.id,
      confidence: 80, reason: `${att90.leave} leave days in last 90d.`,
      suggestedAction: "Verify balance and check wellbeing.",
    });
  }
  for (const d of docsExpiring60d) predictions.push({
    id: `exp-${d.name}`, kind: "license_expiry", subject: d.name,
    confidence: 100, reason: `Expires on ${d.expiry}.`,
    suggestedAction: "Renew and upload updated copy to Compliance → Repository.",
  });
  for (const a of base.alerts.filter((x) => x.category === "payroll" && x.level === "critical")) {
    predictions.push({
      id: `pay-${a.id}`, kind: "payroll_anomaly", subject: a.title,
      confidence: 90, reason: a.detail, suggestedAction: a.action ?? "Open Payroll → Audit.",
    });
  }

  // Recommendations
  const recommendations: Recommendation[] = [];
  if (base.compliance.missingBank > 0) recommendations.push({
    id: "rec-bank", category: "payroll", urgency: "high",
    title: `Update bank details for ${base.compliance.missingBank} employees`,
    detail: "Payroll disbursement will fail without account & IFSC.",
  });
  const understaffed = branches.filter((b) => b.headcount > 0 && b.headcount < 3);
  if (understaffed.length) recommendations.push({
    id: "rec-branch-staff", category: "workforce", urgency: "medium",
    title: `Staffing risk at ${understaffed.map((b) => b.name).join(", ")}`,
    detail: "Branch has fewer than 3 active employees — coverage risk.",
  });
  if (salaryRevSummary.pending > 0) recommendations.push({
    id: "rec-salrev", category: "hr", urgency: "medium",
    title: `${salaryRevSummary.pending} salary revision(s) pending approval`,
    detail: "Open Admin → Salary Revision to review and apply.",
  });
  if (leavesSummary.pendingApprovals > 5) recommendations.push({
    id: "rec-leave-backlog", category: "operations", urgency: "medium",
    title: `${leavesSummary.pendingApprovals} leave requests awaiting approval`,
    detail: "Route to appropriate managers or auto-approve per policy.",
  });
  if (billing?.status && ["past_due", "grace", "suspended"].includes(billing.status)) recommendations.push({
    id: "rec-billing", category: "operations", urgency: "high",
    title: "Subscription requires attention",
    detail: `Plan status is ${billing.status}. Renew from Billing to avoid disruption.`,
  });

  // Knowledge graph (compact)
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  nodes.push({ id: `company:${company.name}`, type: "Company", label: company.name });
  for (const b of branches) {
    const bid = `branch:${b.id}`;
    nodes.push({ id: bid, type: "Branch", label: b.name, meta: { headcount: b.headcount } });
    edges.push({ from: `company:${company.name}`, to: bid, rel: "has_branch" });
  }
  for (const d of departments) {
    const did = `dept:${d.name}`;
    nodes.push({ id: did, type: "Department", label: d.name, meta: { headcount: d.headcount } });
    edges.push({ from: `company:${company.name}`, to: did, rel: "has_department" });
  }
  const managerIds = new Set(employees.map((e) => e.managerId).filter(Boolean) as string[]);
  const empShow = employees.filter((e) => managerIds.has(e.id)).concat(employees.slice(0, 40));
  const empSeen = new Set<string>();
  for (const e of empShow) {
    if (empSeen.has(e.id)) continue; empSeen.add(e.id);
    const eid = `emp:${e.id}`;
    nodes.push({ id: eid, type: "Employee", label: `${e.name} (${e.empCode})`, meta: { role: e.designation, dept: e.department } });
    if (e.branchId) edges.push({ from: `branch:${e.branchId}`, to: eid, rel: "works_at" });
    if (e.department) edges.push({ from: `dept:${e.department}`, to: eid, rel: "in_department" });
    if (e.managerId) edges.push({ from: `emp:${e.managerId}`, to: eid, rel: "manages" });
  }
  const counts: Record<string, number> = {
    Company: 1, Branch: branches.length, Department: departments.length,
    Employee: employees.length, Notice: notices.length, Asset: assets.length,
    ComplianceRule: compRules.length, KnowledgeAct: compKnowledge.length,
    SalaryRevision: salaryRevisions.length, DocRequest: opts.docRequests.length,
  };

  return {
    ...base,
    graph: { nodes, edges, counts },
    branches, departments,
    notices: activeNotices,
    assets: assetSummary,
    onboarding,
    salaryRevisions: salaryRevSummary,
    leaves: leavesSummary,
    compliance: complianceExt,
    billing, saas,
    predictions: predictions.slice(0, 40),
    recommendations,
    capabilities: computeCapabilities(role),
  };
}

/** Role-aware chip prompts for the copilot. */
export function suggestionsFor(role: Role): string[] {
  if (role === "employee") return [
    "Show my attendance this month",
    "What's my leave balance?",
    "Request a bonafide certificate",
    "When is my next appraisal?",
    "Show my payslip summary",
  ];
  if (role === "manager") return [
    "Who on my team is absent today?",
    "Show pending leave approvals",
    "Which team members are late this week?",
    "Who is eligible for confirmation?",
    "Show overtime hours for my team",
  ];
  if (role === "super_admin") return [
    "Show tenant health across all companies",
    "Which tenants have pending payments?",
    "Open support tickets summary",
    "Revenue and renewals this month",
    "Which tenants are on grace period?",
  ];
  return [
    "Who is absent today?",
    "Show employees eligible for confirmation",
    "Any payroll anomalies this month?",
    "Which compliance filings are overdue?",
    "Show expiring licenses",
    "Generate today's attendance summary",
    "Who has not completed onboarding?",
    "Show employees eligible for increment",
  ];
}
