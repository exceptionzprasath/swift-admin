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
  head: () => ({ meta: [{ title: "Requests & Approvals Hub · SWIFT" }] }),
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
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
                  Requests & Approvals Hub
                </h1>
                {kpis.pending > 0 && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 animate-ping" />
                    {kpis.pending} Action Required
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="rounded-xl border-border bg-card/60 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Total Received</span>
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{kpis.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">All Categories Combined</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-amber-500/20 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-xs font-medium">Pending Approvals</span>
              <Clock className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">{kpis.pending}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting Manager / HR Sign-off</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-xs font-medium">Approved Requests</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{kpis.approved}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Finalized & Dispatched</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-blue-500/20 bg-blue-500/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-xs font-medium">Multi-Level / In Review</span>
              <Activity className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-blue-600 dark:text-blue-400">{kpis.escalated}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Escalated or In-Progress</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-destructive/20 bg-destructive/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-destructive mb-1">
              <span className="text-xs font-medium">Declined / Rejected</span>
              <XCircle className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-destructive">{kpis.rejected}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Returned with Remarks</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs & Filter Navigation */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border pb-2">
          <Tabs value={activeCategoryTab} onValueChange={setActiveCategoryTab} className="w-full md:w-auto">
            <TabsList className="bg-muted/60 p-1 rounded-xl flex flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="rounded-lg gap-1.5 text-xs font-medium">
                <Inbox className="h-3.5 w-3.5" />
                All Requests ({kpis.total})
              </TabsTrigger>
              <TabsTrigger value="leave" className="rounded-lg gap-1.5 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                Leaves & Permission
                {kpis.leavesPending > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/15 text-amber-600 font-bold">
                    {kpis.leavesPending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-lg gap-1.5 text-xs font-medium">
                <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                Punch Regularization
                {kpis.attPending > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/15 text-amber-600 font-bold">
                    {kpis.attPending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="document" className="rounded-lg gap-1.5 text-xs font-medium">
                <FileText className="h-3.5 w-3.5 text-purple-500" />
                Letters & Documents
                {kpis.docsPending > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/15 text-amber-600 font-bold">
                    {kpis.docsPending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="loan" className="rounded-lg gap-1.5 text-xs font-medium">
                <Banknote className="h-3.5 w-3.5 text-amber-500" />
                Salary Advance & Loans
                {kpis.loansPending > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/15 text-amber-600 font-bold">
                    {kpis.loansPending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="grievance" className="rounded-lg gap-1.5 text-xs font-medium">
                <MessageSquareHeart className="h-3.5 w-3.5 text-rose-500" />
                Grievances
                {kpis.grvPending > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/15 text-amber-600 font-bold">
                    {kpis.grvPending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="compoff" className="rounded-lg gap-1.5 text-xs font-medium">
                <Coffee className="h-3.5 w-3.5 text-teal-500" />
                Comp-Off & Swap
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <span className="text-xs text-muted-foreground shrink-0">
            Showing <strong className="text-foreground">{filteredRequests.length}</strong> of {normalizedRequests.length} total
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-card p-3 rounded-xl border border-border">
          {/* Live Search */}
          <div className="relative lg:col-span-2">
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
                  <th className="p-3.5 w-10 text-center">
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
                  <th className="p-3.5 font-semibold">Employee</th>
                  <th className="p-3.5 font-semibold">Category & Type</th>
                  <th className="p-3.5 font-semibold">Subject / Details</th>
                  <th className="p-3.5 font-semibold">Date / Duration</th>
                  <th className="p-3.5 font-semibold">Workflow Status</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
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
                        className={`hover:bg-muted/30 transition-colors group cursor-pointer ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                        onClick={() => setInspectItem(item)}
                      >
                        {/* Checkbox Column */}
                        <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
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

                        {/* Employee Column */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
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
                            <div>
                              <div className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1">
                                <span>{item.employeeName}</span>
                                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="font-mono">{item.empCode}</span>
                                <span>•</span>
                                <span>{item.department}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Type Column */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {item.category === "leave" && <Calendar className="h-3.5 w-3.5 text-blue-500" />}
                              {item.category === "attendance" && <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />}
                              {item.category === "document" && <FileText className="h-3.5 w-3.5 text-purple-500" />}
                              {item.category === "loan" && <Banknote className="h-3.5 w-3.5 text-amber-500" />}
                              {item.category === "grievance" && <MessageSquareHeart className="h-3.5 w-3.5 text-rose-500" />}
                              {item.category === "compoff" && <Coffee className="h-3.5 w-3.5 text-teal-500" />}
                              <span className="font-medium text-xs text-foreground">{item.type}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                {item.categoryLabel}
                              </Badge>
                              {item.attachments && item.attachments.length > 0 && (
                                <Badge variant="secondary" className="gap-1 text-[10px] bg-primary/10 text-primary border-primary/20">
                                  <Paperclip className="h-3 w-3" />
                                  {item.attachments.length} {item.attachments.length === 1 ? "Proof" : "Proofs"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Subject / Details Column */}
                        <td className="p-3.5">
                          <div className="space-y-0.5 max-w-xs">
                            <div className="font-medium text-xs text-foreground truncate">{item.title}</div>
                            {item.details && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{item.details}</p>
                            )}
                          </div>
                        </td>

                        {/* Date / Value Column */}
                        <td className="p-3.5">
                          <div className="space-y-0.5 text-xs">
                            <div className="font-semibold text-foreground">{item.amountOrDays || "—"}</div>
                            <div className="text-muted-foreground">{item.dateStr}</div>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={`px-2 py-0.5 text-xs font-semibold ${
                                item.status === "Approved"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : item.status === "Pending"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse"
                                  : item.status === "In Progress" || item.status === "Escalated"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : "bg-destructive/10 text-destructive border-destructive/20"
                              }`}
                            >
                              {item.status === "Approved" && "✓ Approved"}
                              {item.status === "Pending" && "⏳ Pending Sign-off"}
                              {item.status === "In Progress" && "🔄 In Review"}
                              {item.status === "Escalated" && "⚡ Escalated"}
                              {item.status === "Rejected" && "✕ Rejected"}
                            </Badge>

                            {item.totalLevels > 1 && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <span>Level {item.currentLevel} of {item.totalLevels}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === "Pending" && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          setApprovalActionModal({
                                            open: true,
                                            item,
                                            action: "approve",
                                            comment: "",
                                          })
                                        }
                                        className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Approve Request</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          setApprovalActionModal({
                                            open: true,
                                            item,
                                            action: "reject",
                                            comment: "",
                                          })
                                        }
                                        className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reject Request</TooltipContent>
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
                                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Full Details & Approval Chain</TooltipContent>
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

      {/* DETAILED REQUEST INSPECTION & APPROVAL CHAIN MODAL */}
      {inspectItem && (
        <Dialog open={Boolean(inspectItem)} onOpenChange={() => setInspectItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 space-y-6">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs uppercase font-semibold">
                      {inspectItem.categoryLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">ID: {inspectItem.id}</span>
                  </div>
                  <DialogTitle className="text-xl font-bold font-display">{inspectItem.title}</DialogTitle>
                </div>
                <Badge
                  variant="outline"
                  className={`px-2.5 py-1 text-xs font-semibold ${
                    inspectItem.status === "Approved"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : inspectItem.status === "Pending"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {inspectItem.status}
                </Badge>
              </div>
            </DialogHeader>

            {/* Employee Profile Header */}
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
              {inspectItem.avatarUrl ? (
                <img
                  src={inspectItem.avatarUrl}
                  alt={inspectItem.employeeName}
                  className="h-12 w-12 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20">
                  {inspectItem.employeeName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-semibold text-foreground text-base">{inspectItem.employeeName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
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

            {/* Action Footer */}
            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInspectItem(null)}
                className="rounded-xl text-xs w-full sm:w-auto"
              >
                Close
              </Button>

              {inspectItem.status === "Pending" && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                    className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approve & Authorize
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
