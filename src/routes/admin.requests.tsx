import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  useStore,
  type UnifiedRequest,
  type LeaveRequest,
  type DocRequest,
  type GrievanceTicket,
  type Employee,
} from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getNormalizedRequests, type NormalizedRequest } from "@/lib/requests-normalizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  Plus,
  ArrowUpRight,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Banknote,
  MessageSquareHeart,
  Coffee,
  Building2,
  Users,
  Send,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Layers,
  Activity,
  CheckCheck,
  MoreVertical,
  Paperclip,
  TrendingUp,
  Tag,
  Share2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  CalendarCheck,
  Repeat,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requests")({
  head: () => ({ meta: [{ title: "Requests & Approvals Hub · CreatonsHR" }] }),
  component: UnifiedRequestsHubPage,
});

// (NormalizedRequest type is imported from @/lib/requests-normalizer)

function UnifiedRequestsHubPage() {
  const {
    requests = [],
    leaves = [],
    docRequests = [],
    grievances = [],
    attendance = [],
    employees = [],
    company,
    addRequest,
    actOnUnifiedRequest,
    actOnLeaveApprovalStep,
    updateLeave,
    actOnDocStep,
    updateGrievance,
    upsertAttendance,
    loadCompanyState,
  } = useStore();

  const branches = company?.branches || [];

  const { activeTenantId, user } = useAuth();

  // Primary Category Tab Filter
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>("all");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  // Inspection Drawer / Dialog
  const [inspectItem, setInspectItem] = useState<NormalizedRequest | null>(null);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [approvalActionModal, setApprovalActionModal] = useState<{
    open: boolean;
    item: NormalizedRequest | null;
    action: "approve" | "reject" | "forward" | "escalate";
    comment: string;
  }>({
    open: false,
    item: null,
    action: "approve",
    comment: "",
  });

  // Raise Request on Behalf Dialog
  const [raiseRequestModal, setRaiseRequestModal] = useState(false);
  const [raiseForm, setRaiseForm] = useState({
    employeeId: "",
    category: "loan",
    type: "Salary Advance (Monthly)",
    amountOrDays: "15000",
    reason: "",
    notes: "",
  });

  // Fetch / Sync on mount
  useEffect(() => {
    if (activeTenantId) {
      loadCompanyState(activeTenantId);
    }
  }, [activeTenantId, loadCompanyState]);

  // Build Normalized Unified Feed
  const normalizedRequests: NormalizedRequest[] = useMemo(() => {
    return getNormalizedRequests({
      requests,
      leaves,
      docRequests,
      grievances,
      employees,
    });
  }, [requests, leaves, docRequests, grievances, employees]);

  // Filtered Requests based on Search, Category Tab, Status, Dept, etc.
  const filteredRequests = useMemo(() => {
    return normalizedRequests.filter((item) => {
      // 1. Category Tab Filter
      if (activeCategoryTab !== "all") {
        if (activeCategoryTab === "leave" && item.category !== "leave") return false;
        if (activeCategoryTab === "attendance" && item.category !== "attendance") return false;
        if (activeCategoryTab === "document" && item.category !== "document") return false;
        if (activeCategoryTab === "loan" && item.category !== "loan") return false;
        if (activeCategoryTab === "grievance" && item.category !== "grievance") return false;
        if (activeCategoryTab === "compoff" && item.category !== "compoff" && item.category !== "shift_swap") return false;
        if (activeCategoryTab === "team_group" && item.category !== "team_group") return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. Department Filter
      if (departmentFilter !== "all" && item.department !== departmentFilter) {
        return false;
      }

      // 4. Branch Filter
      if (branchFilter !== "all" && item.branchName !== branchFilter) {
        return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.employeeName.toLowerCase().includes(q);
        const matchesCode = item.empCode.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        const matchesDept = item.department.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesTitle && !matchesType && !matchesDept) {
          return false;
        }
      }

      return true;
    });
  }, [normalizedRequests, activeCategoryTab, statusFilter, departmentFilter, branchFilter, searchQuery]);

  // Overall KPI Counters
  const kpis = useMemo(() => {
    const total = normalizedRequests.length;
    const pending = normalizedRequests.filter((r) => r.status === "Pending").length;
    const approved = normalizedRequests.filter((r) => r.status === "Approved").length;
    const rejected = normalizedRequests.filter((r) => r.status === "Rejected").length;
    const escalated = normalizedRequests.filter((r) => r.status === "Escalated" || r.status === "In Progress").length;

    // Category Breakdowns
    const leavesPending = normalizedRequests.filter((r) => r.category === "leave" && r.status === "Pending").length;
    const loansPending = normalizedRequests.filter((r) => r.category === "loan" && r.status === "Pending").length;
    const docsPending = normalizedRequests.filter((r) => r.category === "document" && r.status === "Pending").length;
    const attPending = normalizedRequests.filter((r) => r.category === "attendance" && r.status === "Pending").length;
    const grvPending = normalizedRequests.filter((r) => r.category === "grievance" && r.status === "Pending").length;
    const groupsPending = normalizedRequests.filter((r) => (r.category === "team_group" || (r.category as any) === "group") && r.status === "Pending").length;

    return {
      total,
      pending,
      approved,
      rejected,
      escalated,
      leavesPending,
      loansPending,
      docsPending,
      attPending,
      grvPending,
      groupsPending,
    };
  }, [normalizedRequests]);

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Approver Action Handler (Single Request)
  const handleExecuteAction = async () => {
    const { item, action, comment } = approvalActionModal;
    if (!item) return;

    const actorName = user?.email?.split("@")[0] || "Admin Authority";
    const actorRole = "Company Administrator";

    try {
      if (item.sourceType === "unified") {
        await actOnUnifiedRequest(item.id, action, comment, actorName, actorRole);
      } else if (item.sourceType === "leave") {
        if (action === "approve") {
          actOnLeaveApprovalStep(item.id, "approve_close", comment, actorName, actorRole);
        } else if (action === "reject") {
          actOnLeaveApprovalStep(item.id, "reject", comment, actorName, actorRole);
        } else if (action === "escalate") {
          actOnLeaveApprovalStep(item.id, "escalate", comment, actorName, actorRole);
        }
      } else if (item.sourceType === "document") {
        actOnDocStep(item.id, action === "reject" ? "reject" : "approve", comment, actorName);
      } else if (item.sourceType === "grievance") {
        updateGrievance(item.id, {
          status: action === "reject" ? "Rejected" : "Resolved",
          resolutionNote: comment || (action === "reject" ? "Rejected by Admin" : "Resolved by Admin"),
          resolvedAt: new Date().toISOString(),
          resolvedBy: actorName,
        });
      }

      toast.success(
        `Request ${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Updated"} successfully.`
      );
      setApprovalActionModal({ open: false, item: null, action: "approve", comment: "" });
      if (inspectItem?.id === item.id) {
        setInspectItem(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update request action.");
    }
  };

  // Batch Approve or Reject
  const handleBatchAction = async (action: "approve" | "reject") => {
    if (selectedRequestIds.length === 0) return;
    const actorName = user?.email?.split("@")[0] || "Admin Authority";
    const actorRole = "Company Administrator";

    let count = 0;
    for (const reqId of selectedRequestIds) {
      const item = normalizedRequests.find((r) => r.id === reqId);
      if (!item || item.status !== "Pending") continue;

      if (item.sourceType === "unified") {
        await actOnUnifiedRequest(item.id, action, `Batch ${action}d by Admin`, actorName, actorRole);
        count++;
      } else if (item.sourceType === "leave") {
        actOnLeaveApprovalStep(
          item.id,
          action === "approve" ? "approve_close" : "reject",
          `Batch ${action}d by Admin`,
          actorName,
          actorRole
        );
        count++;
      } else if (item.sourceType === "document") {
        actOnDocStep(item.id, action === "reject" ? "reject" : "approve", `Batch ${action}d by Admin`, actorName);
        count++;
      } else if (item.sourceType === "grievance") {
        updateGrievance(item.id, {
          status: action === "reject" ? "Rejected" : "Resolved",
          resolutionNote: `Batch ${action}d by Admin`,
          resolvedAt: new Date().toISOString(),
          resolvedBy: actorName,
        });
        count++;
      }
    }

    toast.success(`Successfully batch ${action}d ${count} requests.`);
    setSelectedRequestIds([]);
  };

  // Submit New Request (Admin on behalf)
  const handleRaiseSubmit = async () => {
    if (!raiseForm.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    const emp = employees.find((e) => e.id === raiseForm.employeeId);
    if (!emp) return;

    try {
      await addRequest({
        employeeId: emp.id,
        employeeName: emp.name,
        empCode: emp.empCode,
        department: emp.department,
        branchName: emp.branchId || "Head Office",
        category: raiseForm.category,
        type: raiseForm.type,
        title: `${raiseForm.type}: ${raiseForm.amountOrDays}`,
        amountOrDays: raiseForm.amountOrDays,
        details: raiseForm.reason,
        reason: raiseForm.reason,
        notes: raiseForm.notes,
        status: "Pending",
        currentLevel: 1,
        totalLevels: 2,
        approvalSteps: [
          {
            id: "step-1",
            level: 1,
            approverName: emp.reportingManager || "Reporting Manager",
            roleName: "Direct Manager",
            status: "Pending",
          },
          {
            id: "step-2",
            level: 2,
            approverName: "HR Manager",
            roleName: "HR Authority",
            status: "Pending",
          },
        ],
      });

      toast.success(`Request submitted successfully for ${emp.name}`);
      setRaiseRequestModal(false);
      setRaiseForm({
        employeeId: "",
        category: "loan",
        type: "Salary Advance (Monthly)",
        amountOrDays: "15000",
        reason: "",
        notes: "",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit request.");
    }
  };

  // Export Requests CSV
  const handleExportCSV = () => {
    const headers = [
      "Request ID",
      "Date",
      "Employee Code",
      "Employee Name",
      "Department",
      "Category",
      "Request Type",
      "Subject / Details",
      "Value / Duration",
      "Approval Status",
      "Current Level",
      "Approved By",
    ];

    const csvRows = [headers.join(",")];
    filteredRequests.forEach((r) => {
      const row = [
        `"${r.id}"`,
        `"${r.dateStr}"`,
        `"${r.empCode}"`,
        `"${r.employeeName}"`,
        `"${r.department}"`,
        `"${r.categoryLabel}"`,
        `"${r.type}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.amountOrDays || "—"}"`,
        `"${r.status}"`,
        `"Level ${r.currentLevel} of ${r.totalLevels}"`,
        `"${r.approvedBy || "—"}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `requests_approvals_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Requests report exported successfully.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Control Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-card via-card to-muted/30 p-6 rounded-2xl border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {kpis.pending > 0 && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 animate-ping" />
                    {kpis.pending} Action Required
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Unified inbox for receiving, evaluating, and approving employee requests across all company workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (activeTenantId) loadCompanyState(activeTenantId);
              toast.success("Refreshed all employee requests");
            }}
            className="gap-1.5 h-9 rounded-xl shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Sync</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="gap-1.5 h-9 rounded-xl shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setRaiseRequestModal(true)}
            className="gap-1.5 h-9 rounded-xl shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Raise Request</span>
          </Button>
        </div>
      </div>

      {/* Executive Metric Card (Consolidated Request Distribution) */}
      {(() => {
        const total = kpis.total;
        const pendingTotal = kpis.pending + kpis.escalated;
        const approvedPct = total > 0 ? (kpis.approved / total) * 100 : 0;
        const pendingPct = total > 0 ? (pendingTotal / total) * 100 : 0;
        const rejectedPct = total > 0 ? (kpis.rejected / total) * 100 : 0;

        return (
          <Card className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <CardContent className="p-6">
              {/* Top Row: Big Total Metric + Baseline Subtitle */}
              <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 mb-4">
                <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                  {total.toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Requests Across All Departments
                </span>
              </div>

              {/* Segmented Horizontal Progress Bar */}
              <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden flex">
                {total === 0 ? (
                  <div className="w-full h-full bg-muted/40" />
                ) : (
                  <>
                    {approvedPct > 0 && (
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${approvedPct}%` }}
                        title={`Approved: ${kpis.approved} (${Math.round(approvedPct)}%)`}
                      />
                    )}
                    {pendingPct > 0 && (
                      <div
                        className="h-full bg-amber-500 transition-all duration-500 ease-out"
                        style={{ width: `${pendingPct}%` }}
                        title={`Pending: ${pendingTotal} (${Math.round(pendingPct)}%)`}
                      />
                    )}
                    {rejectedPct > 0 && (
                      <div
                        className="h-full bg-rose-500 transition-all duration-500 ease-out"
                        style={{ width: `${rejectedPct}%` }}
                        title={`Rejected: ${kpis.rejected} (${Math.round(rejectedPct)}%)`}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Bottom Row: Dot Legend matching Reference Image */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-8 pt-4 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
                  className={`inline-flex items-center gap-2 font-medium transition-all cursor-pointer ${
                    statusFilter === "approved"
                      ? "text-foreground font-semibold ring-1 ring-primary/30 bg-primary/5 px-2 py-1 rounded-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Filter Approved requests"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">{kpis.approved.toLocaleString()}</strong> Approved
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
                  className={`inline-flex items-center gap-2 font-medium transition-all cursor-pointer ${
                    statusFilter === "pending"
                      ? "text-foreground font-semibold ring-1 ring-amber-500/30 bg-amber-500/5 px-2 py-1 rounded-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Filter Pending requests"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">{pendingTotal.toLocaleString()}</strong> Pending
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
                  className={`inline-flex items-center gap-2 font-medium transition-all cursor-pointer ${
                    statusFilter === "rejected"
                      ? "text-foreground font-semibold ring-1 ring-rose-500/30 bg-rose-500/5 px-2 py-1 rounded-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Filter Rejected requests"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">{kpis.rejected.toLocaleString()}</strong> Rejected
                  </span>
                </button>

                {statusFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="ml-auto text-xs text-primary hover:underline font-medium cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Category Tabs & Filter Navigation */}
      <div className="space-y-4">
        {/* Single-line Request Type Navbar (Equally Distributed) */}
        <div className="border-b border-border pb-3">
          <Tabs value={activeCategoryTab} onValueChange={setActiveCategoryTab} className="w-full">
            <TabsList className="w-full bg-muted/50 p-1.5 rounded-2xl flex items-center justify-between gap-1.5 h-auto overflow-x-auto scrollbar-none">
              <TabsTrigger
                value="all"
                title="All Requests"
                className="flex-1 rounded-xl px-2 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 text-center flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:-translate-y-0.5 data-[state=active]:font-semibold"
              >
                All ({kpis.total})
              </TabsTrigger>

              <TabsTrigger
                value="leave"
                title="Leaves & Permissions"
                className="flex-1 rounded-xl px-2 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 text-center flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:-translate-y-0.5 data-[state=active]:font-semibold"
              >
                Leaves
                {kpis.leavesPending > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 px-1.5 py-0 text-[10px] font-bold rounded-full transition-colors ${
                      activeCategoryTab === "leave"
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {kpis.leavesPending}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="attendance"
                title="Punch Regularization"
                className="flex-1 rounded-xl px-2 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 text-center flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:-translate-y-0.5 data-[state=active]:font-semibold"
              >
                Attendance
                {kpis.attPending > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 px-1.5 py-0 text-[10px] font-bold rounded-full transition-colors ${
                      activeCategoryTab === "attendance"
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {kpis.attPending}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="document"
                title="Letters & Documents"
                className="flex-1 rounded-xl px-2 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 text-center flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:-translate-y-0.5 data-[state=active]:font-semibold"
              >
                Documents
                {kpis.docsPending > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 px-1.5 py-0 text-[10px] font-bold rounded-full transition-colors ${
                      activeCategoryTab === "document"
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {kpis.docsPending}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="loan"
                title="Salary Advance & Loans"
                className="flex-1 rounded-xl px-2 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 text-center flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:-translate-y-0.5 data-[state=active]:font-semibold"
              >
                Loans
                {kpis.loansPending > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 px-1.5 py-0 text-[10px] font-bold rounded-full transition-colors ${
                      activeCategoryTab === "loan"
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {kpis.loansPending}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="grievance"
                title="Grievances & Escalations"
                className="flex-1 rounded-xl px-2 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 text-center flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:-translate-y-0.5 data-[state=active]:font-semibold"
              >
                Grievances
                {kpis.grvPending > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 px-1.5 py-0 text-[10px] font-bold rounded-full transition-colors ${
                      activeCategoryTab === "grievance"
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {kpis.grvPending}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="compoff"
                title="Comp-Off & Shift Swap"
                className="flex-1 rounded-xl px-2 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 text-center flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:-translate-y-0.5 data-[state=active]:font-semibold"
              >
                Comp-Off
              </TabsTrigger>

              <TabsTrigger
                value="team_group"
                title="Team Groups"
                className="flex-1 rounded-xl px-2 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 text-center flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:-translate-y-0.5 data-[state=active]:font-semibold"
              >
                Teams
                {kpis.groupsPending > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 px-1.5 py-0 text-[10px] font-bold rounded-full transition-colors ${
                      activeCategoryTab === "team_group"
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {kpis.groupsPending}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 bg-card p-3 rounded-xl border border-border">
          {/* Live Search */}
          <div className="relative md:col-span-2 xl:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee, request ID, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs rounded-lg"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs rounded-lg">
              <SelectValue placeholder="Approval Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">⏳ Pending Only</SelectItem>
              <SelectItem value="approved">✅ Approved Only</SelectItem>
              <SelectItem value="in progress">🔄 In Progress / Review</SelectItem>
              <SelectItem value="escalated">⚡ Escalated</SelectItem>
              <SelectItem value="rejected">❌ Rejected Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Department Filter */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-9 text-xs rounded-lg">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch Filter */}
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-9 text-xs rounded-lg">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Batch Actions Button if items selected */}
          <div className="flex items-center gap-1.5">
            {selectedRequestIds.length > 0 ? (
              <div className="flex items-center gap-1 w-full">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleBatchAction("approve")}
                  className="h-9 text-xs rounded-lg flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Approve ({selectedRequestIds.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchAction("reject")}
                  className="h-9 text-xs rounded-lg text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="w-full h-9 text-xs rounded-lg text-muted-foreground"
              >
                Select rows for batch
              </Button>
            )}
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="text-left">
                  <th className="p-3.5 w-12 text-center sticky left-0 z-20 bg-muted/95 backdrop-blur-xs">
                    <input
                      type="checkbox"
                      checked={
                        selectedRequestIds.length > 0 &&
                        selectedRequestIds.length === filteredRequests.filter((r) => r.status === "Pending").length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRequestIds(
                            filteredRequests.filter((r) => r.status === "Pending").map((r) => r.id)
                          );
                        } else {
                          setSelectedRequestIds([]);
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5 font-semibold min-w-[210px] whitespace-nowrap sticky left-12 z-20 bg-muted/95 backdrop-blur-xs border-r border-border/70 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)]">
                    Employee
                  </th>
                  <th className="p-3.5 font-semibold min-w-[220px]">Request Details</th>
                  <th className="p-3.5 font-semibold min-w-[120px] whitespace-nowrap">Timeline / Value</th>
                  <th className="p-3.5 font-semibold min-w-[110px] whitespace-nowrap">Status</th>
                  <th className="p-3.5 pr-4 font-semibold min-w-[90px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground/60" />
                        <p className="text-sm font-medium">No requests found matching your filters</p>
                        <p className="text-xs text-muted-foreground">Try clearing search filters or switching category tabs.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((item) => {
                    const isSelected = selectedRequestIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/40 transition-colors group cursor-pointer ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                        onClick={() => setInspectItem(item)}
                      >
                        {/* Checkbox Column (Sticky Left) */}
                        <td
                          className={`p-3.5 text-center sticky left-0 z-10 transition-colors ${
                            isSelected ? "bg-primary/10" : "bg-card group-hover:bg-muted/50"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.status === "Pending" ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRequestIds((prev) => [...prev, item.id]);
                                } else {
                                  setSelectedRequestIds((prev) => prev.filter((id) => id !== item.id));
                                }
                              }}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>

                        {/* Employee Column (Sticky Left) */}
                        <td
                          className={`p-3.5 whitespace-nowrap sticky left-12 z-10 transition-colors border-r border-border/70 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)] ${
                            isSelected ? "bg-primary/10" : "bg-card group-hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {item.avatarUrl ? (
                                <img
                                  src={item.avatarUrl}
                                  alt={item.employeeName}
                                  className="h-9 w-9 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs border border-primary/20">
                                  {item.employeeName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.employeeName}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                <span className="font-mono text-[11px]">{item.empCode}</span>
                                <span>•</span>
                                <span className="truncate">{item.department}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Request Details Column */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {item.type}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal shrink-0 text-muted-foreground border-border">
                                {item.categoryLabel}
                              </Badge>
                              {item.attachments && item.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-medium shrink-0">
                                  <Paperclip className="h-2.5 w-2.5" />
                                  {item.attachments.length}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 truncate max-w-sm" title={item.title || item.details}>
                              {item.title || item.details || "—"}
                            </p>
                          </div>
                        </td>

                        {/* Timeline / Value Column */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="space-y-0.5 text-xs">
                            <div className="font-semibold text-foreground">{item.amountOrDays || "—"}</div>
                            <div className="text-[11px] text-muted-foreground">{item.dateStr}</div>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              item.status === "Approved"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : item.status === "Pending"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : item.status === "In Progress" || item.status === "Escalated"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                item.status === "Approved"
                                  ? "bg-emerald-500"
                                  : item.status === "Pending"
                                  ? "bg-amber-500"
                                  : item.status === "In Progress" || item.status === "Escalated"
                                  ? "bg-blue-500"
                                  : "bg-destructive"
                              }`}
                            />
                            <span>{item.status}</span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="p-3.5 pr-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {item.status === "Pending" && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setApprovalActionModal({
                                            open: true,
                                            item,
                                            action: "approve",
                                            comment: "",
                                          })
                                        }
                                        className="h-7 w-7 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/15"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Quick Approve</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setApprovalActionModal({
                                            open: true,
                                            item,
                                            action: "reject",
                                            comment: "",
                                          })
                                        }
                                        className="h-7 w-7 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/15"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Quick Reject</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setInspectItem(item)}
                                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted"
                                  >
                                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open Details Drawer</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DETAILED REQUEST INSPECTION & APPROVAL CHAIN DRAWER (SLIDE-OVER SHEET) */}
      <Sheet open={Boolean(inspectItem)} onOpenChange={(open) => !open && setInspectItem(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl overflow-hidden"
        >
          {inspectItem && (
            <>
              {/* Drawer Header */}
              <SheetHeader className="p-6 border-b border-border bg-card/60 backdrop-blur-xs shrink-0 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs uppercase font-semibold">
                      {inspectItem.categoryLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">ID: {inspectItem.id}</span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      inspectItem.status === "Approved"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : inspectItem.status === "Pending"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        inspectItem.status === "Approved"
                          ? "bg-emerald-500"
                          : inspectItem.status === "Pending"
                          ? "bg-amber-500"
                          : "bg-destructive"
                      }`}
                    />
                    <span>{inspectItem.status}</span>
                  </div>
                </div>
                <SheetTitle className="text-xl font-bold font-display text-left">
                  {inspectItem.title}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground text-left">
                  Submitted on {inspectItem.dateStr} • {inspectItem.department}
                </SheetDescription>
              </SheetHeader>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Employee Profile Header */}
                <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                  {inspectItem.avatarUrl ? (
                    <img
                      src={inspectItem.avatarUrl}
                      alt={inspectItem.employeeName}
                      className="h-12 w-12 rounded-xl object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20 shrink-0">
                      {inspectItem.employeeName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground text-base truncate">{inspectItem.employeeName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 truncate">
                      <span className="font-mono">{inspectItem.empCode}</span>
                      <span>•</span>
                      <span>{inspectItem.department}</span>
                      <span>•</span>
                      <span>{inspectItem.branchName}</span>
                    </div>
                  </div>
                </div>

                {/* Request Specific Details Grid */}
                <div className="grid grid-cols-2 gap-3 bg-card p-4 rounded-2xl border border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block font-medium">Request Type:</span>
                    <span className="font-semibold text-foreground mt-0.5 block">{inspectItem.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Submission Date:</span>
                    <span className="font-semibold text-foreground mt-0.5 block">{inspectItem.dateStr}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Amount / Days:</span>
                    <span className="font-bold text-primary text-sm mt-0.5 block">
                      {inspectItem.amountOrDays || "Standard"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Workflow Progress:</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      Level {inspectItem.currentLevel} of {inspectItem.totalLevels}
                    </span>
                  </div>
                </div>

                {/* Proposed Profile Updates Diff (if category is profile) */}
                {inspectItem.category === "profile" && (
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span className="text-primary font-bold flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4" />
                        <span>
                          {inspectItem.originalItem?.metadata?.fieldLabel
                            ? `Target Field: ${inspectItem.originalItem.metadata.fieldLabel}`
                            : "Proposed Profile Updates for Approval"}
                        </span>
                      </span>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[11px]">
                        {inspectItem.originalItem?.metadata?.fieldLabel
                          ? "1 Focused Field"
                          : `${Object.keys(inspectItem.originalItem?.metadata?.profileUpdates || {}).length} Fields`}
                      </Badge>
                    </Label>

                    {/* Single Field Old vs New Focused Diff Card */}
                    {inspectItem.originalItem?.metadata?.fieldLabel ? (
                      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Old Value Box */}
                          <div className="bg-muted/40 rounded-xl p-3 border border-border/80">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Current / Previous Value
                            </span>
                            <div className="mt-1 text-xs font-semibold text-muted-foreground break-all line-through">
                              {inspectItem.originalItem.metadata.oldValue || "(Empty / Not set)"}
                            </div>
                          </div>

                          {/* New Requested Value Box */}
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                              New Requested Value (To Apply)
                            </span>
                            <div className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 break-all">
                              {inspectItem.originalItem.metadata.newValue ||
                                inspectItem.originalItem.metadata.profileUpdates?.[inspectItem.originalItem.metadata.fieldKey] ||
                                "(New Value)"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Multi-Field Updates List */
                      inspectItem.originalItem?.metadata?.profileUpdates && (
                        <div className="bg-card rounded-xl border border-border p-3.5 divide-y divide-border/60 max-h-60 overflow-y-auto">
                          {Object.entries(inspectItem.originalItem.metadata.profileUpdates).map(([key, val]) => {
                            if (val === undefined || val === null || val === "") return null;
                            const labelStr = key
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (str) => str.toUpperCase());
                            const displayVal = Array.isArray(val)
                              ? val.map((item) => (typeof item === "object" ? (item.level || item.company || JSON.stringify(item)) : String(item))).join(", ")
                              : String(val);
                            return (
                              <div key={key} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4 text-xs">
                                <span className="text-muted-foreground font-medium min-w-[140px]">{labelStr}</span>
                                <span className="font-semibold text-foreground text-right flex-1 break-all bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">
                                  {displayVal}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Team Group Details Section */}
                {inspectItem.category === "team_group" && (
                  <div className="space-y-3 bg-teal-500/5 border border-teal-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                        style={{ backgroundColor: inspectItem.originalItem?.metadata?.iconBgColor || "#075E54" }}
                      >
                        {inspectItem.originalItem?.metadata?.iconEmoji || "🚀"}
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-foreground">
                          {inspectItem.originalItem?.metadata?.groupSubject || inspectItem.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Requested by {inspectItem.employeeName} • {inspectItem.originalItem?.metadata?.memberCount || 0} participants
                        </p>
                      </div>
                    </div>

                    {inspectItem.originalItem?.metadata?.groupDescription && (
                      <div className="bg-card p-3 rounded-xl border border-border text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground block mb-1">Group Purpose:</span>
                        {inspectItem.originalItem.metadata.groupDescription}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-teal-600" />
                        Selected Group Participants:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(inspectItem.originalItem?.metadata?.members || []).map((m: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="gap-1 py-1 px-2 text-xs">
                            <span className="font-medium">{m.name}</span>
                            {m.role && <span className="text-[10px] text-muted-foreground">({m.role})</span>}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason / Details Textarea */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Employee Request Reason & Details</Label>
                  <div className="bg-muted/30 p-3.5 rounded-xl border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {inspectItem.details || "No additional explanation provided by employee."}
                  </div>
                </div>

                {/* Attached Proof Documents Section */}
                {inspectItem.attachments && inspectItem.attachments.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>Attached Proof & Verification Documents ({inspectItem.attachments.length})</span>
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Click to inspect full size</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {inspectItem.attachments.map((att, idx) => {
                        const isImg =
                          att.startsWith("data:image") ||
                          att.startsWith("http") ||
                          att.endsWith(".png") ||
                          att.endsWith(".jpg") ||
                          att.endsWith(".jpeg");
                        return (
                          <div
                            key={idx}
                            onClick={() => setPreviewAttachmentUrl(att)}
                            className="group relative border border-border rounded-xl overflow-hidden bg-muted/20 hover:border-primary/50 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col items-center justify-center p-2 text-center"
                          >
                            {isImg ? (
                              <div className="w-full h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                                <img
                                  src={att}
                                  alt={`Proof Attachment ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-24 rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground">
                                <FileText className="h-8 w-8 text-primary/70 mb-1" />
                                <span className="text-[10px] font-medium">Document {idx + 1}</span>
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center justify-between w-full px-1">
                              <span className="text-[11px] font-medium text-foreground truncate">
                                Evidence #{idx + 1}
                              </span>
                              <span className="text-[10px] text-primary flex items-center gap-0.5">
                                <Eye className="h-3 w-3" /> View
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Multi-Level Approval Stepper */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Multi-Level Approval Chain</span>
                  </Label>

                  <div className="space-y-2">
                    {inspectItem.approvalSteps && inspectItem.approvalSteps.length > 0 ? (
                      inspectItem.approvalSteps.map((step: any, idx: number) => (
                        <div
                          key={step.id || idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px]">
                              {step.level || idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{step.roleName || step.approverName}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {step.approverName ? `Assigned: ${step.approverName}` : "Hierarchy Designated"}
                              </div>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 ${
                              step.status === "Approved"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : step.status === "Rejected"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {step.status || "Pending"}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-xl border border-border bg-card text-xs text-muted-foreground flex items-center justify-between">
                        <span>Direct Single-Level Approval by Reporting Authority</span>
                        <Badge variant="outline" className="text-[10px]">
                          {inspectItem.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Footer (Sticky) */}
              <SheetFooter className="p-4 sm:p-6 border-t border-border bg-card/60 backdrop-blur-xs shrink-0 flex flex-row items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInspectItem(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>

                {inspectItem.status === "Pending" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setApprovalActionModal({
                          open: true,
                          item: inspectItem,
                          action: "reject",
                          comment: "",
                        });
                      }}
                      className="rounded-xl text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setApprovalActionModal({
                          open: true,
                          item: inspectItem,
                          action: "approve",
                          comment: "",
                        });
                      }}
                      className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Approve & Authorize
                    </Button>
                  </div>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* APPROVAL ACTION CONFIRMATION & REMARKS MODAL */}
      {approvalActionModal.open && approvalActionModal.item && (
        <Dialog
          open={approvalActionModal.open}
          onOpenChange={(open) => {
            if (!open) setApprovalActionModal({ open: false, item: null, action: "approve", comment: "" });
          }}
        >
          <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {approvalActionModal.action === "approve"
                  ? "Approve Request"
                  : approvalActionModal.action === "reject"
                  ? "Reject Request"
                  : "Forward / Escalate Request"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {approvalActionModal.item.employeeName} • {approvalActionModal.item.type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                {approvalActionModal.action === "reject" ? "Rejection Reason (Required)" : "Remarks / Approval Notes (Optional)"}
              </Label>
              <Textarea
                placeholder={
                  approvalActionModal.action === "reject"
                    ? "Explain reason for rejecting this request..."
                    : "Add optional remarks or authorization details..."
                }
                value={approvalActionModal.comment}
                onChange={(e) =>
                  setApprovalActionModal((prev) => ({ ...prev, comment: e.target.value }))
                }
                className="text-xs min-h-[90px] rounded-xl"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setApprovalActionModal({ open: false, item: null, action: "approve", comment: "" })}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteAction}
                disabled={approvalActionModal.action === "reject" && !approvalActionModal.comment.trim()}
                className={`rounded-xl text-xs font-medium ${
                  approvalActionModal.action === "reject"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {approvalActionModal.action === "approve"
                  ? "Confirm Approval"
                  : approvalActionModal.action === "reject"
                  ? "Confirm Rejection"
                  : "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RAISE REQUEST ON BEHALF OF EMPLOYEE MODAL */}
      {raiseRequestModal && (
        <Dialog open={raiseRequestModal} onOpenChange={setRaiseRequestModal}>
          <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 space-y-4">
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-xl font-bold font-display">Raise Request on Behalf</DialogTitle>
              <DialogDescription className="text-xs">
                Submit an employee request directly into the company approval pipeline.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs">
              {/* Employee Selection */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Select Employee</Label>
                <Select
                  value={raiseForm.employeeId}
                  onValueChange={(val) => setRaiseForm((prev) => ({ ...prev, employeeId: val }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select target employee..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.empCode}) • {emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select
                    value={raiseForm.category}
                    onValueChange={(val) => {
                      let defaultType = "Salary Advance (Monthly)";
                      if (val === "attendance") defaultType = "Missing Punch Correction";
                      else if (val === "document") defaultType = "Experience Certificate";
                      else if (val === "compoff") defaultType = "Compensatory Off Claim";
                      else if (val === "grievance") defaultType = "Payroll Discrepancy";
                      setRaiseForm((prev) => ({ ...prev, category: val, type: defaultType }));
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan">Salary Advance & Loan</SelectItem>
                      <SelectItem value="attendance">Attendance Regularization</SelectItem>
                      <SelectItem value="document">Document Certificate</SelectItem>
                      <SelectItem value="compoff">Comp-Off & Swap</SelectItem>
                      <SelectItem value="grievance">Grievance Ticket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Request Type</Label>
                  <Input
                    value={raiseForm.type}
                    onChange={(e) => setRaiseForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Amount or Value */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount / Days / Value</Label>
                <Input
                  placeholder="e.g. ₹15,000 or 1 Day"
                  value={raiseForm.amountOrDays}
                  onChange={(e) => setRaiseForm((prev) => ({ ...prev, amountOrDays: e.target.value }))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Reason & Justification</Label>
                <Textarea
                  placeholder="Provide reason for request..."
                  value={raiseForm.reason}
                  onChange={(e) => setRaiseForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="text-xs min-h-[75px] rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRaiseRequestModal(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRaiseSubmit}
                className="rounded-xl text-xs bg-primary text-primary-foreground font-medium"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox / Attachment Preview Modal */}
      {previewAttachmentUrl && (
        <Dialog open={!!previewAttachmentUrl} onOpenChange={(open) => !open && setPreviewAttachmentUrl(null)}>
          <DialogContent className="max-w-2xl p-4 sm:p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <span>Verification Document Preview</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Attached by {inspectItem?.employeeName} for {inspectItem?.type}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 flex items-center justify-center bg-muted/30 rounded-2xl overflow-hidden max-h-[65vh] border border-border p-3">
              {previewAttachmentUrl.startsWith("data:image") || previewAttachmentUrl.startsWith("http") ? (
                <img
                  src={previewAttachmentUrl}
                  alt="Attachment Preview"
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-sm"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="h-16 w-16 mx-auto text-primary" />
                  <p className="text-sm font-semibold text-foreground">Official Attachment File</p>
                  <p className="text-xs text-muted-foreground break-all max-w-md">{previewAttachmentUrl}</p>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4 flex sm:flex-row items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setPreviewAttachmentUrl(null)}
              >
                Close
              </Button>
              <a
                href={previewAttachmentUrl}
                download={`Attachment-${inspectItem?.id || "doc"}.png`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download / Open Original
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
