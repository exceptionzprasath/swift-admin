import type {
  UnifiedRequest,
  LeaveRequest,
  DocRequest,
  GrievanceTicket,
  Employee,
} from "./store";

export type NormalizedRequest = {
  id: string;
  sourceType: "unified" | "leave" | "document" | "grievance" | "attendance";
  originalItem: any;
  employeeId: string;
  employeeName: string;
  empCode: string;
  department: string;
  branchName: string;
  avatarUrl?: string;
  category: "leave" | "attendance" | "document" | "loan" | "grievance" | "compoff" | "shift_swap" | "general" | "profile";
  categoryLabel: string;
  type: string;
  title: string;
  amountOrDays?: string;
  details: string;
  dateStr: string;
  status: "Pending" | "Approved" | "Rejected" | "In Progress" | "Escalated";
  currentLevel: number;
  totalLevels: number;
  approvalSteps: any[];
  priority?: "Low" | "Medium" | "High" | "Critical";
  rejectionReason?: string;
  approvedBy?: string;
  updatedAt: string;
};

export function getNormalizedRequests(params: {
  requests?: UnifiedRequest[];
  leaves?: LeaveRequest[];
  docRequests?: DocRequest[];
  grievances?: GrievanceTicket[];
  employees?: Employee[];
}): NormalizedRequest[] {
  const {
    requests = [],
    leaves = [],
    docRequests = [],
    grievances = [],
    employees = [],
  } = params;

  const list: NormalizedRequest[] = [];
  const empMap = new Map<string, Employee>();
  for (const emp of employees) {
    if (emp.id) empMap.set(emp.id, emp);
    if (emp.empCode) empMap.set(emp.empCode, emp);
  }

  // 1. Unified Engine Requests (Loans, Comp-off, General, etc.)
  (requests || []).forEach((r) => {
    if (r.category === "grievance") {
      return;
    }
    if (r.category === "leave" && leaves.some((l) => l.id === r.id)) {
      return;
    }
    if (r.category === "document" && docRequests.some((d) => d.id === r.id)) {
      return;
    }

    const emp = empMap.get(r.employeeId) || empMap.get(r.empCode || "");
    let normStatus: NormalizedRequest["status"] = "Pending";
    const rawStatus = (r.status || "Pending").toLowerCase();
    if (rawStatus === "approved") normStatus = "Approved";
    else if (rawStatus === "rejected") normStatus = "Rejected";
    else if (rawStatus === "escalated") normStatus = "Escalated";
    else if (rawStatus.includes("progress")) normStatus = "In Progress";

    list.push({
      id: r.id,
      sourceType: "unified",
      originalItem: r,
      employeeId: r.employeeId,
      employeeName: r.employeeName || emp?.name || "Employee",
      empCode: r.empCode || emp?.empCode || "EMP",
      department: r.department || emp?.department || "General",
      branchName: r.branchName || emp?.branchId || "Head Office",
      avatarUrl: emp?.photoDataUrl,
      category: (r.category as any) || "general",
      categoryLabel:
        r.category === "loan"
          ? "Salary Advance & Loan"
          : r.category === "profile" || (r.category as any) === "profile_update"
          ? "Profile & Onboarding Update"
          : r.category === "compoff"
          ? "Compensatory Off"
          : r.category === "attendance"
          ? "Attendance Regularization"
          : r.category === "document"
          ? "Document Letter"
          : r.category === "grievance"
          ? "Grievance Ticket"
          : "General Request",
      type: r.type || r.workflowName || "Request",
      title: r.title || r.type || "Request",
      amountOrDays: r.amountOrDays || (r.amount ? `₹${Number(r.amount).toLocaleString()}` : undefined),
      details: r.details || r.reason || "",
      dateStr: r.date || (r.createdAt ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      status: normStatus,
      currentLevel: r.currentLevel || 1,
      totalLevels: r.totalLevels || (r.approvalSteps ? r.approvalSteps.length : 1),
      approvalSteps: r.approvalSteps || [],
      rejectionReason: r.rejectionReason,
      approvedBy: r.approvedBy,
      updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
    });
  });

  // 2. Leaves System Requests
  (leaves || []).forEach((l) => {
    const emp = empMap.get(l.employeeId);
    let normStatus: NormalizedRequest["status"] = "Pending";
    const rawStatus = (l.status || "pending").toLowerCase();
    if (rawStatus === "approved") normStatus = "Approved";
    else if (rawStatus === "rejected") normStatus = "Rejected";

    const daysVal = l.days ? `${l.days} Day${Number(l.days) > 1 ? "s" : ""}` : `${l.from || l.startDate || ""} to ${l.to || l.endDate || ""}`;

    list.push({
      id: l.id,
      sourceType: "leave",
      originalItem: l,
      employeeId: l.employeeId,
      employeeName: l.employeeName || emp?.name || "Employee",
      empCode: emp?.empCode || "EMP",
      department: emp?.department || "General",
      branchName: emp?.branchId || "Head Office",
      avatarUrl: emp?.photoDataUrl,
      category: "leave",
      categoryLabel: "Leave & Permission",
      type: `${l.type || "Casual Leave"} Request`,
      title: `${l.type || "Leave"}: ${daysVal}`,
      amountOrDays: daysVal,
      details: l.reason || "Leave request submitted by employee",
      dateStr: l.from || l.startDate || (l.appliedAt ? l.appliedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      status: normStatus,
      currentLevel: l.currentLevel || 1,
      totalLevels: l.totalLevels || (l.approvalSteps ? l.approvalSteps.length : 2),
      approvalSteps: l.approvalSteps || [],
      rejectionReason: l.rejectedReason,
      approvedBy: l.approvedBy || l.actedBy,
      updatedAt: l.appliedAt || new Date().toISOString(),
    });
  });

  // 3. Document Letter Requests
  (docRequests || []).forEach((d) => {
    const emp = empMap.get(d.employeeId);
    let normStatus: NormalizedRequest["status"] = "Pending";
    const rawStatus = (d.status || "pending").toLowerCase();
    if (rawStatus === "approved") normStatus = "Approved";
    else if (rawStatus === "rejected") normStatus = "Rejected";

    list.push({
      id: d.id,
      sourceType: "document",
      originalItem: d,
      employeeId: d.employeeId,
      employeeName: emp?.name || d.requestedBy || "Employee",
      empCode: emp?.empCode || "EMP",
      department: emp?.department || "General",
      branchName: emp?.branchId || "Head Office",
      avatarUrl: emp?.photoDataUrl,
      category: "document",
      categoryLabel: "Document Letter",
      type: d.letterTitle || "Official Certificate Letter",
      title: `Certificate: ${d.letterTitle || "Official Document"}`,
      amountOrDays: d.format ? d.format.toUpperCase() : "PDF",
      details: d.note || `Request for ${d.letterTitle || "Document"}`,
      dateStr: d.requestedAt ? d.requestedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: normStatus,
      currentLevel: d.currentStep || 1,
      totalLevels: d.steps ? d.steps.length : 2,
      approvalSteps: d.steps || [],
      updatedAt: d.requestedAt || new Date().toISOString(),
    });
  });

  // 4. Grievance Tickets
  (grievances || []).forEach((g) => {
    const emp = empMap.get(g.employeeId) || empMap.get(g.empCode || "");
    let normStatus: NormalizedRequest["status"] = "Pending";
    const rawStatus = (g.status || "Open").toLowerCase();
    if (rawStatus === "resolved") normStatus = "Approved";
    else if (rawStatus === "rejected") normStatus = "Rejected";
    else if (rawStatus === "in progress") normStatus = "In Progress";

    list.push({
      id: g.id,
      sourceType: "grievance",
      originalItem: g,
      employeeId: g.employeeId,
      employeeName: g.employeeName || emp?.name || "Employee",
      empCode: g.empCode || emp?.empCode || "EMP",
      department: g.department || emp?.department || "General",
      branchName: emp?.branchId || "Head Office",
      avatarUrl: emp?.photoDataUrl,
      category: "grievance",
      categoryLabel: "Grievance Ticket",
      type: `Grievance: ${g.category || "General"}`,
      title: g.subject || g.ticketNumber || "Helpdesk Ticket",
      amountOrDays: g.priority || "Medium",
      details: `${g.description || ""}${g.fromDate ? ` • Incident: ${g.fromDate === g.toDate ? g.fromDate : `${g.fromDate} to ${g.toDate}`}` : ""}`,
      dateStr: g.fromDate || (g.createdAt ? g.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      status: normStatus,
      currentLevel: 1,
      totalLevels: 1,
      approvalSteps: g.approvalSteps || [],
      priority: g.priority,
      rejectionReason: g.resolutionNote,
      approvedBy: g.resolvedBy,
      updatedAt: g.updatedAt || g.createdAt || new Date().toISOString(),
    });
  });

  // Sort by most recent updated date first
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
