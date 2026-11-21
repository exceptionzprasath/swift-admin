import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BranchesPage } from "./admin.branches";
import {
  useStore,
  isActiveEmployee,
  getUpwardHierarchyChain,
  type Employee,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadOrgTablePdf } from "@/lib/org-pdf-export";
import {
  Network,
  Pencil,
  Building2,
  MapPin,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  LayoutGrid,
  GitBranch,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  TableProperties,
  Download,
  Crown,
  MoreHorizontal,
  UserPlus,
  ExternalLink,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Move,
  Briefcase,
  Layers,
  ArrowDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/org")({
  head: () => ({ meta: [{ title: "Organization Structure · CreatonsHR" }] }),
  component: OrgPage,
});

function initials(name: string) {
  return (name || "")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

type ViewMode = "tree" | "table" | "grid";

interface OrgTreeData {
  byId: Map<string, Employee>;
  childrenMap: Map<string, Employee[]>;
  roots: Employee[];
  depthMap: Map<string, number>;
}

/**
 * Bulletproof hierarchy builder:
 * - Detects and prevents circular manager loops (A -> B -> A)
 * - Safely attaches orphaned nodes to the top tier so no node is ever lost
 * - Orders leadership nodes (President, CEO, Founder, Director) at top
 * - Sorts direct reports by team size and name
 */
function buildCleanOrgTree(employees: Employee[]): OrgTreeData {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenMap = new Map<string, Employee[]>();
  const roots: Employee[] = [];

  const isCyclic = (empId: string): boolean => {
    let curr: string | undefined = byId.get(empId)?.managerId;
    const seen = new Set<string>([empId]);
    while (curr) {
      if (seen.has(curr)) return true;
      seen.add(curr);
      curr = byId.get(curr)?.managerId;
    }
    return false;
  };

  for (const emp of employees) {
    const mgrId = emp.managerId;
    const hasValidManager =
      mgrId &&
      byId.has(mgrId) &&
      mgrId !== emp.id &&
      !isCyclic(emp.id);

    if (hasValidManager) {
      const list = childrenMap.get(mgrId!) || [];
      list.push(emp);
      childrenMap.set(mgrId!, list);
    } else {
      roots.push(emp);
    }
  }

  const rank = (e: Employee) => {
    const d = (e.designation || "").toLowerCase();
    if (d.includes("president") || d.includes("ceo") || d.includes("founder") || d.includes("managing director")) return 0;
    if (d.includes("director") || d.includes("vp") || d.includes("vice president")) return 1;
    if (d.includes("head") || d.includes("lead") || d.includes("manager")) return 2;
    return 3;
  };

  roots.sort((a, b) => {
    const rA = rank(a);
    const rB = rank(b);
    if (rA !== rB) return rA - rB;
    const aCount = childrenMap.get(a.id)?.length || 0;
    const bCount = childrenMap.get(b.id)?.length || 0;
    if (aCount !== bCount) return bCount - aCount;
    return a.name.localeCompare(b.name);
  });

  for (const [, list] of childrenMap.entries()) {
    list.sort((a, b) => {
      const aCount = childrenMap.get(a.id)?.length || 0;
      const bCount = childrenMap.get(b.id)?.length || 0;
      if (aCount !== bCount) return bCount - aCount;
      return a.name.localeCompare(b.name);
    });
  }

  const depthMap = new Map<string, number>();
  const visited = new Set<string>();

  function assignDepth(emp: Employee, d: number) {
    if (visited.has(emp.id)) return;
    visited.add(emp.id);
    depthMap.set(emp.id, d);
    const children = childrenMap.get(emp.id) || [];
    for (const child of children) {
      assignDepth(child, d + 1);
    }
  }

  for (const root of roots) {
    assignDepth(root, 0);
  }

  return { byId, childrenMap, roots, depthMap };
}

function OrgPage() {
  const navigate = useNavigate();
  const { employees: rawEmployees, updateEmployee, company } = useStore();
  const employees = useMemo(() => (rawEmployees || []).filter(isActiveEmployee), [rawEmployees]);
  const branches = company.branches ?? [];

  // Tab State: Organization Chart / Structure vs Branches
  const [activeTab, setActiveTab] = useState<"org" | "branches">(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("tab");
      if (t === "branches" || t === "branch") return "branches";
    }
    return "org";
  });

  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("tab");
      if (t === "branches" || t === "branch") {
        setActiveTab("branches");
      } else {
        setActiveTab("org");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (tab: "org" | "branches") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "org") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.pushState({}, "", url.toString());
    }
  };

  // View state: Tree | Table | Grid
  const [view, setView] = useState<ViewMode>("tree");
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("__all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [targetEmp, setTargetEmp] = useState<Employee | null>(null);
  const [about, setAbout] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");

  // Approval Options Modal State
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalEmp, setApprovalEmp] = useState<Employee | null>(null);

  // Add Direct Report Modal State
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [addReportTarget, setAddReportTarget] = useState<Employee | null>(null);
  const [selectedNewReportId, setSelectedNewReportId] = useState<string>("");

  // Canvas Pan & Zoom State for Draggable Chart
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const resetCanvasView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const filteredEmployees = useMemo(() => {
    if (branchFilter === "__all") return employees;
    return employees.filter((e) => (e.branchId || "__unassigned") === branchFilter);
  }, [employees, branchFilter]);

  const { byId, childrenMap, roots, depthMap } = useMemo(() => {
    return buildCleanOrgTree(filteredEmployees);
  }, [filteredEmployees]);

  const q = query.trim().toLowerCase();
  const matchIds = useMemo(() => {
    if (!q) return null;
    const s = new Set<string>();
    employees.forEach((e) => {
      const hay = `${e.name} ${e.empCode} ${e.designation} ${e.department} ${e.email ?? ""}`.toLowerCase();
      if (hay.includes(q)) s.add(e.id);
    });
    return s;
  }, [q, employees]);

  function openEdit(e: Employee) {
    setTargetEmp(e);
    setAbout(e.about ?? "");
    setManagerId(e.managerId ?? "__none");
    setBranchId(e.branchId ?? "__none");
    setDesignation(e.designation);
    setDepartment(e.department);
    setEditOpen(true);
  }

  function saveEdit() {
    if (!targetEmp) return;
    if (managerId && managerId !== "__none" && managerId === targetEmp.id) {
      return toast.error("An employee cannot report to themselves");
    }
    if (managerId && managerId !== "__none") {
      let cur: string | undefined = managerId;
      const seen = new Set<string>([targetEmp.id]);
      while (cur) {
        if (seen.has(cur)) return toast.error("Circular reporting cycle detected — please pick a different manager");
        seen.add(cur);
        cur = byId.get(cur)?.managerId;
      }
    }
    updateEmployee(targetEmp.id, {
      about,
      designation,
      department,
      managerId: managerId === "__none" ? undefined : managerId,
      branchId: branchId === "__none" ? undefined : branchId,
    });
    toast.success(`${targetEmp.name} profile and reporting updated!`);
    setEditOpen(false);
  }

  function openApprovals(e: Employee) {
    setApprovalEmp(e);
    setApprovalOpen(true);
  }

  function openAddReport(e: Employee) {
    setAddReportTarget(e);
    setSelectedNewReportId("");
    setAddReportOpen(true);
  }

  function handleAssignDirectReport() {
    if (!addReportTarget || !selectedNewReportId) {
      toast.error("Please select an employee to report to this manager");
      return;
    }
    updateEmployee(selectedNewReportId, {
      managerId: addReportTarget.id,
    });
    const assignedEmp = byId.get(selectedNewReportId);
    toast.success(`Assigned ${assignedEmp?.name || "Employee"} to report to ${addReportTarget.name}!`);
    setAddReportOpen(false);
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    const managers = new Set<string>();
    employees.forEach((e) => {
      if (e.managerId) managers.add(e.managerId);
    });
    setCollapsed(managers);
  }

  const handleExportTablePdf = () => {
    try {
      setIsExporting(true);
      toast.info("Preparing Organization Table PDF...", { duration: 1500 });
      downloadOrgTablePdf({
        company: {
          name: company.name || "CreatonsHR",
          legalName: company.legalName,
          gstin: company.gstin,
          address: company.address,
          phone: company.phone,
          email: company.email,
        },
        employees,
        branches,
        branchFilter,
      });
      toast.success("Organization Table PDF generated & downloaded!");
    } catch (err: any) {
      console.error("Failed to export table PDF:", err);
      toast.error(err?.message || "Failed to generate Table PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPeople = employees.length;
  const managerCount = new Set(employees.map((e) => e.managerId).filter(Boolean) as string[]).size;
  const topLevel = roots.length;

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center max-w-lg mx-auto my-12 bg-card">
        <Network className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold text-foreground">No employees found</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Add employees to your organization to generate the live organization structure and approval reporting tree.
        </p>
        <Link to="/admin/employees">
          <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
            <Users className="h-4 w-4" /> Go to Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Organization Navigation Frosted Capsule Tab Bar (Left-aligned) */}
      <div className="flex items-center justify-start gap-4 flex-wrap pb-1">
        <div className="inline-flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5 rounded-full border border-primary/35 dark:border-primary/45 bg-card/75 dark:bg-card/50 backdrop-blur-xl shadow-xs shadow-primary/5">
          <button
            type="button"
            onClick={() => handleTabChange("org")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "org"
                ? "text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "org" && (
              <motion.div
                layoutId="orgSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Network className="h-4 w-4 shrink-0" />
              <span>Organization</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("branches")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "branches"
                ? "text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "branches" && (
              <motion.div
                layoutId="orgSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Branches</span>
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "branches" ? (
          <motion.div
            key="branches-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <BranchesPage isEmbedded />
          </motion.div>
        ) : (
          <motion.div
            key="org-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* Header & Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Org chart</span>
                  {matchIds && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {matchIds.size} match{matchIds.size === 1 ? "" : "es"}
                    </Badge>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Interactive real-time organizational hierarchy. Right-click or use the menu on any card to edit details or configure approval workflows.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, role, code..."
                    className="h-9 pl-9 w-52 sm:w-64 text-xs rounded-xl bg-card border-border/80"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Branch Filter */}
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="h-9 w-36 sm:w-44 text-xs rounded-xl bg-card border-border/80">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="__all">All branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Switcher: Tree | Table | Grid */}
                <div className="inline-flex items-center rounded-xl border border-border/80 overflow-hidden bg-card p-0.5 shadow-2xs">
                  <Button
                    variant={view === "tree" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-xs font-medium rounded-lg gap-1.5 px-3"
                    onClick={() => setView("tree")}
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>Tree</span>
                  </Button>
                  <Button
                    variant={view === "table" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-xs font-medium rounded-lg gap-1.5 px-3"
                    onClick={() => setView("table")}
                  >
                    <TableProperties className="h-3.5 w-3.5" />
                    <span>Table</span>
                  </Button>
                  <Button
                    variant={view === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-xs font-medium rounded-lg gap-1.5 px-3"
                    onClick={() => setView("grid")}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Grid</span>
                  </Button>
                </div>

                {/* PDF Export Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 font-semibold text-xs border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-white transition-all rounded-xl shadow-xs"
                  disabled={isExporting}
                  onClick={handleExportTablePdf}
                  title="Download Organization Table Structure PDF"
                >
                  {isExporting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Export PDF</span>
                </Button>

                {/* Direct Link to Centralized Approval Studio */}
                <Link to="/admin/approval-settings">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 font-semibold text-xs border-border bg-card hover:bg-muted/80 rounded-xl"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
                    <span className="hidden md:inline">Approval Settings</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Main Content: Tree View vs Table View vs Grid View */}
            {view === "tree" ? (
              <DraggableCanvas
                zoom={zoom}
                setZoom={setZoom}
                pan={pan}
                setPan={setPan}
                onReset={resetCanvasView}
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
              >
                <div className="flex flex-col items-center select-none pt-4">
                  {roots.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-16">
                      No employees match the current filter.
                    </div>
                  ) : roots.length === 1 ? (
                    // Single Root (e.g. President / CEO at the top)
                    <OrgTreeNode
                      emp={roots[0]}
                      isRoot={true}
                      childrenMap={childrenMap}
                      byId={byId}
                      collapsed={collapsed}
                      toggleCollapsed={toggleCollapsed}
                      onEdit={openEdit}
                      onOpenApprovals={openApprovals}
                      onAddReport={openAddReport}
                      matchIds={matchIds}
                    />
                  ) : (
                    // Multiple Roots (e.g. Board of Directors / Co-Founders)
                    <div className="flex flex-col items-center">
                      <div className="flex gap-10 items-start justify-center relative">
                        {roots.map((r, idx) => (
                          <div key={r.id} className="flex flex-col items-center">
                            {/* Horizontal connector line for multiple roots */}
                            {roots.length > 1 && (
                              <div className="relative w-full h-5 mb-2">
                                {idx > 0 && (
                                  <div className="absolute top-0 left-0 right-1/2 h-0.5 bg-border/80" />
                                )}
                                {idx < roots.length - 1 && (
                                  <div className="absolute top-0 left-1/2 right-0 h-0.5 bg-border/80" />
                                )}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-border/80" />
                              </div>
                            )}
                            <OrgTreeNode
                              emp={r}
                              isRoot={true}
                              childrenMap={childrenMap}
                              byId={byId}
                              collapsed={collapsed}
                              toggleCollapsed={toggleCollapsed}
                              onEdit={openEdit}
                              onOpenApprovals={openApprovals}
                              onAddReport={openAddReport}
                              matchIds={matchIds}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DraggableCanvas>
            ) : view === "table" ? (
              <OrgTableView
                list={filteredEmployees}
                cmap={childrenMap}
                byId={byId}
                onEdit={openEdit}
                onOpenApprovals={openApprovals}
                matchIds={matchIds}
                depthMap={depthMap}
              />
            ) : (
              <VirtualizedOrgGrid
                list={filteredEmployees}
                cmap={childrenMap}
                byId={byId}
                onEdit={openEdit}
                onOpenApprovals={openApprovals}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile & Reporting Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <span>Edit Profile & Reporting</span>
            </DialogTitle>
            <DialogDescription>
              Update {targetEmp?.name}'s role, department, branch, or reporting manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Designation / Role Title</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. CEO of Amazon Web Services"
                className="rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Department</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering, Sales, Executive"
                className="rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Branch Location</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="__none">None (Headquarters / Remote)</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.city ? `(${b.city})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reports To (Supervisory Manager)</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-60">
                  <SelectItem value="__none" className="font-semibold text-amber-600 dark:text-amber-400">
                    👑 No Manager (Top-Level Executive / President)
                  </SelectItem>
                  {employees
                    .filter((e) => !targetEmp || e.id !== targetEmp.id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.empCode} · {e.designation || "Staff"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Short Bio / About</Label>
              <Textarea
                rows={2}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Responsibilities, executive summary..."
                className="rounded-xl text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-xl bg-primary text-primary-foreground" onClick={saveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Approval Hub & Options Dialog */}
      <EmployeeApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        emp={approvalEmp}
        employees={employees}
        childrenMap={childrenMap}
        onOpenEdit={() => {
          setApprovalOpen(false);
          if (approvalEmp) openEdit(approvalEmp);
        }}
      />

      {/* Add Direct Report Modal */}
      <Dialog open={addReportOpen} onOpenChange={setAddReportOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-500" />
              <span>Add Direct Report</span>
            </DialogTitle>
            <DialogDescription>
              Assign an employee to report directly to <strong>{addReportTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold grid place-items-center shrink-0">
                {addReportTarget?.photoDataUrl ? (
                  <img src={addReportTarget.photoDataUrl} alt={addReportTarget.name} className="h-full w-full object-cover rounded-full" />
                ) : (
                  initials(addReportTarget?.name || "")
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">{addReportTarget?.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{addReportTarget?.designation}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Employee to Assign</Label>
              <Select value={selectedNewReportId} onValueChange={setSelectedNewReportId}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-60">
                  {employees
                    .filter((e) => e.id !== addReportTarget?.id && e.managerId !== addReportTarget?.id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.empCode} · {e.designation || e.department || "Staff"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setAddReportOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleAssignDirectReport}>
              Assign to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Draggable & Zoomable Canvas with Dot Matrix Background
 */
function DraggableCanvas({
  children,
  zoom,
  setZoom,
  pan,
  setPan,
  onReset,
  onExpandAll,
  onCollapseAll,
}: {
  children: React.ReactNode;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  onReset: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const [cursorClass, setCursorClass] = useState("cursor-grab");

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, menuitems, inputs, or selects
    if (
      target.closest("button") ||
      target.closest("[role='menuitem']") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest(".no-drag")
    ) {
      return;
    }
    isDragging.current = true;
    startPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    setCursorClass("cursor-grabbing");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    setCursorClass("cursor-grab");
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((z) => Math.min(1.8, Math.max(0.4, Number((z + delta).toFixed(2)))));
    } else {
      setPan((p) => ({
        x: p.x - e.deltaX * 0.7,
        y: p.y - e.deltaY * 0.7,
      }));
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full h-[calc(100vh-17rem)] min-h-[580px] overflow-hidden rounded-3xl border border-border/80 bg-slate-50/50 dark:bg-slate-950/40 backdrop-blur-sm select-none ${cursorClass}`}
      style={{
        backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top center",
          transition: isDragging.current ? "none" : "transform 0.12s ease-out",
        }}
        className="w-full flex justify-center py-10 px-8 min-w-max"
      >
        {children}
      </div>

      {/* Floating Canvas Controls (Minimal Pill) */}
      <div className="absolute bottom-5 right-5 flex items-center gap-1.5 p-1.5 rounded-full bg-card/90 dark:bg-card/85 border border-border/80 shadow-xl backdrop-blur-md z-20">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-[11px] font-mono font-semibold px-2 min-w-[3.5rem] text-center select-none text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onReset}
          title="Reset View (Center & 100%)"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onExpandAll}
          title="Expand All Nodes"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onCollapseAll}
          title="Collapse All Nodes"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Minimal drag hint banner at top-left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/85 dark:bg-card/75 border border-border/70 shadow-xs backdrop-blur-md text-[11px] text-muted-foreground pointer-events-none">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Drag canvas to pan • Right-click any card for Edit & Approval options</span>
      </div>
    </div>
  );
}

/**
 * Amazon-style Org Chart Tree Node Component
 */
function OrgTreeNode({
  emp,
  isRoot = false,
  childrenMap,
  byId,
  collapsed,
  toggleCollapsed,
  onEdit,
  onOpenApprovals,
  onAddReport,
  matchIds,
}: {
  emp: Employee;
  isRoot?: boolean;
  childrenMap: Map<string, Employee[]>;
  byId: Map<string, Employee>;
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  onEdit: (e: Employee) => void;
  onOpenApprovals: (e: Employee) => void;
  onAddReport: (e: Employee) => void;
  matchIds: Set<string> | null;
}) {
  const directs = childrenMap.get(emp.id) || [];
  const hasDirects = directs.length > 0;
  const isCollapsed = collapsed.has(emp.id);

  // Partition direct reports into balanced rows of up to 4 (matching reference layout)
  const rows = useMemo(() => {
    if (directs.length <= 4) return [directs];
    const chunked: Employee[][] = [];
    for (let i = 0; i < directs.length; i += 4) {
      chunked.push(directs.slice(i, i + 4));
    }
    return chunked;
  }, [directs]);

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <OrgChartCard
        emp={emp}
        isRoot={isRoot}
        directCount={directs.length}
        isCollapsed={isCollapsed}
        onToggleCollapse={hasDirects ? () => toggleCollapsed(emp.id) : undefined}
        onEdit={onEdit}
        onOpenApprovals={onOpenApprovals}
        onAddReport={onAddReport}
        matchIds={matchIds}
      />

      {/* Child Subtree Connectors */}
      {!isCollapsed && hasDirects && (
        <div className="flex flex-col items-center">
          {/* Vertical drop stem from parent bottom */}
          <div className="w-0.5 h-7 bg-border/80" />

          {/* Child rows stacked vertically */}
          <div className="flex flex-col gap-6 items-center">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex flex-col items-center">
                {/* Horizontal bus line across row siblings */}
                <div className="flex gap-6 items-start justify-center relative">
                  {row.map((child, colIndex) => (
                    <div key={child.id} className="flex flex-col items-center">
                      {/* Sibling bus connection */}
                      {row.length > 1 ? (
                        <div className="relative w-full h-5 mb-2">
                          {colIndex > 0 && (
                            <div className="absolute top-0 left-0 right-1/2 h-0.5 bg-border/80" />
                          )}
                          {colIndex < row.length - 1 && (
                            <div className="absolute top-0 left-1/2 right-0 h-0.5 bg-border/80" />
                          )}
                          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-border/80" />
                        </div>
                      ) : (
                        <div className="w-0.5 h-5 bg-border/80 mb-2" />
                      )}

                      <OrgTreeNode
                        emp={child}
                        isRoot={false}
                        childrenMap={childrenMap}
                        byId={byId}
                        collapsed={collapsed}
                        toggleCollapsed={toggleCollapsed}
                        onEdit={onEdit}
                        onOpenApprovals={onOpenApprovals}
                        onAddReport={onAddReport}
                        matchIds={matchIds}
                      />
                    </div>
                  ))}
                </div>

                {/* Vertical line between chunked rows */}
                {rowIndex < rows.length - 1 && (
                  <div className="w-0.5 h-6 bg-border/80 my-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Minimalist Card Component Matching Reference Image
 */
function OrgChartCard({
  emp,
  isRoot = false,
  directCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  onEdit,
  onOpenApprovals,
  onAddReport,
  matchIds,
}: {
  emp: Employee;
  isRoot?: boolean;
  directCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onEdit: (e: Employee) => void;
  onOpenApprovals: (e: Employee) => void;
  onAddReport: (e: Employee) => void;
  matchIds: Set<string> | null;
}) {
  const isMatch = matchIds ? matchIds.has(emp.id) : true;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "relative w-[15rem] rounded-2xl border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all duration-200 select-none group",
            isRoot
              ? "border-primary/40 bg-gradient-to-b from-card to-primary/5 pt-7 pb-4 px-5 text-center"
              : "border-border/80 pt-6 pb-3.5 px-4 text-left",
            matchIds && !isMatch && "opacity-35 saturate-50 hover:opacity-100",
            directCount > 0 && !isRoot && "border-border/90"
          )}
        >
          {/* Avatar (Overlapping top edge: top-center for root, top-left for direct reports) */}
          <div
            className={cn(
              "absolute -top-5 rounded-full border-2 border-background ring-1 ring-border/60 shadow-sm overflow-hidden bg-primary/10 text-primary flex items-center justify-center shrink-0 z-10",
              isRoot
                ? "left-1/2 -translate-x-1/2 h-12 w-12 text-sm font-bold"
                : "left-4 h-11 w-11 text-xs font-semibold"
            )}
          >
            {emp.photoDataUrl ? (
              <img src={emp.photoDataUrl} alt={emp.name} className="h-full w-full object-cover" />
            ) : (
              <span>{initials(emp.name)}</span>
            )}
          </div>

          {/* More Options (Three dots) Button with DropdownMenu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="absolute top-2.5 right-2.5 h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Options"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl p-1 z-50">
              <DropdownMenuItem
                className="text-xs py-2 cursor-pointer gap-2"
                onClick={() => onEdit(emp)}
              >
                <Pencil className="h-3.5 w-3.5 text-primary" />
                <span>Edit Profile & Reporting</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs py-2 cursor-pointer gap-2 font-medium text-foreground"
                onClick={() => onOpenApprovals(emp)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
                <span>Approval Hierarchy & Options</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs py-2 cursor-pointer gap-2"
                onClick={() => onAddReport(emp)}
              >
                <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
                <span>Add Direct Report</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs py-2 cursor-pointer gap-2"
                onClick={() => handleCopy(emp.empCode, "Employee Code")}
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Copy ID ({emp.empCode})</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Name & Designation Details */}
          <div className={cn("min-w-0", isRoot ? "mt-1" : "mt-0.5")}>
            <div
              className={cn(
                "font-bold text-sm tracking-tight text-foreground truncate",
                isRoot && "text-base font-extrabold"
              )}
              title={emp.name}
            >
              {emp.name}
            </div>
            <div
              className="text-xs text-muted-foreground truncate font-normal mt-0.5"
              title={emp.designation || "Staff Member"}
            >
              {emp.designation || "Staff Member"}
            </div>
            <div className={cn("flex items-center gap-1.5 mt-1.5 flex-wrap", isRoot && "justify-center")}>
              {emp.department && (
                <span className="text-[10px] text-muted-foreground/80 font-medium px-1.5 py-0.5 rounded-md bg-muted/60">
                  {emp.department}
                </span>
              )}
              <span className="text-[10px] font-mono text-muted-foreground/70">
                {emp.empCode}
              </span>
            </div>
          </div>

          {/* Direct Reports Count Toggle Pill */}
          {directCount > 0 && onToggleCollapse && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 px-2.5 rounded-full bg-card hover:bg-primary text-foreground hover:text-primary-foreground border border-border shadow-xs text-[10px] font-bold flex items-center gap-1 transition-all z-20 cursor-pointer"
              title={isCollapsed ? `Expand ${directCount} direct reports` : "Collapse direct reports"}
            >
              <span>{directCount}</span>
              {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
          )}
        </div>
      </ContextMenuTrigger>

      {/* Right-click Context Menu */}
      <ContextMenuContent className="w-56 rounded-xl shadow-xl p-1 z-50">
        <ContextMenuItem
          className="text-xs py-2 cursor-pointer gap-2"
          onClick={() => onEdit(emp)}
        >
          <Pencil className="h-3.5 w-3.5 text-primary" />
          <span>Edit Profile & Reporting</span>
        </ContextMenuItem>
        <ContextMenuItem
          className="text-xs py-2 cursor-pointer gap-2 font-medium text-foreground"
          onClick={() => onOpenApprovals(emp)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
          <span>Approval Hierarchy & Options</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-xs py-2 cursor-pointer gap-2"
          onClick={() => onAddReport(emp)}
        >
          <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
          <span>Add Direct Report</span>
        </ContextMenuItem>
        <ContextMenuItem
          className="text-xs py-2 cursor-pointer gap-2"
          onClick={() => handleCopy(emp.empCode, "Employee Code")}
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Copy ID ({emp.empCode})</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Dedicated Employee Approval Hub Dialog
 * Displays live upward hierarchy pipeline and supervisory authority
 */
function EmployeeApprovalDialog({
  open,
  onOpenChange,
  emp,
  employees,
  childrenMap,
  onOpenEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emp: Employee | null;
  employees: Employee[];
  childrenMap: Map<string, Employee[]>;
  onOpenEdit: () => void;
}) {
  const navigate = useNavigate();

  const upwardChain = useMemo(() => {
    if (!emp) return [];
    return getUpwardHierarchyChain(emp, employees);
  }, [emp, employees]);

  const directs = useMemo(() => {
    if (!emp) return [];
    return childrenMap.get(emp.id) || [];
  }, [emp, childrenMap]);

  if (!emp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold grid place-items-center ring-2 ring-primary/20 shrink-0 text-sm">
              {emp.photoDataUrl ? (
                <img src={emp.photoDataUrl} alt={emp.name} className="h-full w-full object-cover rounded-full" />
              ) : (
                initials(emp.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2 truncate">
                <span>{emp.name}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {emp.empCode}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                {emp.designation || "Staff Member"} · {emp.department || "General"}
              </DialogDescription>
            </div>
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs font-semibold shrink-0">
              Approval Hub
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* Section 1: Live Upward Approval Route */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span>Live Upward Approval Pipeline</span>
              </h4>
              <span className="text-[11px] text-muted-foreground">
                {upwardChain.length} upward level{upwardChain.length === 1 ? "" : "s"}
              </span>
            </div>

            {upwardChain.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span>Top-Level Authority</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {emp.name} has no supervisory manager assigned in the organization structure. Requests submitted will route directly to final approval sign-off.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Employee themselves */}
                <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-primary/20 text-primary font-bold grid place-items-center text-[10px]">
                      0
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{emp.name}</div>
                      <div className="text-[10px] text-muted-foreground">Request Initiator</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Origin</Badge>
                </div>

                {/* Manager chain */}
                {upwardChain.map((mgr, idx) => (
                  <div key={mgr.id} className="flex flex-col items-center">
                    <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/60 my-0.5" />
                    <div className="w-full p-3 rounded-2xl bg-card border border-primary/20 shadow-xs flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-bold grid place-items-center text-[10px]">
                          L{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">{mgr.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {mgr.designation || "Manager"} · {mgr.empCode}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        {idx === 0 ? "Direct Manager" : idx === upwardChain.length - 1 ? "Final Authority" : "Next Level HOD"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Downward Approval Authority over direct reports */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
                <span>Supervisory Approval Authority</span>
              </h4>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {directs.length} Direct Report{directs.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {directs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                {emp.name} does not currently have direct subordinates assigned.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Acts as Level 1 Approver for requests submitted by:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {directs.map((d) => (
                    <div key={d.id} className="p-2.5 rounded-xl border border-border bg-card flex items-center gap-2 text-xs">
                      <div className="h-6 w-6 rounded-full bg-muted font-bold text-[10px] grid place-items-center shrink-0">
                        {initials(d.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground truncate">{d.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{d.designation || d.empCode}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modules governed by approval chain */}
            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                Workflow Modules Configured via Approval Hierarchy:
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] bg-card">Attendance Regularization</Badge>
                <Badge variant="outline" className="text-[10px] bg-card">Leave Approvals</Badge>
                <Badge variant="outline" className="text-[10px] bg-card">Comp-Off Requests</Badge>
                <Badge variant="outline" className="text-[10px] bg-card">Advance Loan Claims</Badge>
                <Badge variant="outline" className="text-[10px] bg-card">Official Document Signatures</Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto rounded-xl text-xs gap-1.5"
            onClick={onOpenEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Change Manager</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none rounded-xl text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="flex-1 sm:flex-none rounded-xl text-xs bg-primary text-primary-foreground gap-1.5"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/admin/approval-settings" });
              }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Approval Settings Studio</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Org Table View Component (with Hierarchy Depth Badges)
 */
function OrgTableView({
  list,
  cmap,
  byId,
  onEdit,
  onOpenApprovals,
  matchIds,
  depthMap,
}: {
  list: Employee[];
  cmap: Map<string, Employee[]>;
  byId: Map<string, Employee>;
  onEdit: (e: Employee) => void;
  onOpenApprovals: (e: Employee) => void;
  matchIds: Set<string> | null;
  depthMap: Map<string, number>;
}) {
  const displayedList = useMemo(() => {
    if (!matchIds) return list;
    return list.filter((e) => matchIds.has(e.id));
  }, [list, matchIds]);

  if (displayedList.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground bg-card rounded-2xl border border-border">
        No employees found matching the search criteria.
      </div>
    );
  }

  function getLevelBadge(depth: number) {
    if (depth === 0) {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-1">
          <Crown className="h-3 w-3" /> L0 · Top Level
        </Badge>
      );
    }
    if (depth === 1) {
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] font-semibold">
          L1 · Manager
        </Badge>
      );
    }
    if (depth === 2) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
          L2 · Team Lead
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
        L{depth} · Associate
      </Badge>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12 text-center text-xs">#</TableHead>
              <TableHead className="text-xs font-semibold">Employee</TableHead>
              <TableHead className="text-xs font-semibold">Role & Department</TableHead>
              <TableHead className="text-xs font-semibold">Hierarchy Level</TableHead>
              <TableHead className="text-xs font-semibold">Reports To (Manager)</TableHead>
              <TableHead className="text-xs font-semibold text-center">Direct Reports</TableHead>
              <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedList.map((emp, index) => {
              const manager = emp.managerId ? byId.get(emp.managerId) : undefined;
              const directs = cmap.get(emp.id) ?? [];
              const depth = depthMap.get(emp.id) ?? 0;

              return (
                <TableRow key={emp.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full ring-1 ring-primary/20 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0 text-xs font-bold">
                        {emp.photoDataUrl ? (
                          <img src={emp.photoDataUrl} alt={emp.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{initials(emp.name)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 truncate">
                          <span>{emp.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                            {emp.empCode}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{emp.email || "No email"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-foreground truncate">{emp.designation || "Staff"}</div>
                    <Badge variant="secondary" className="text-[10px] mt-0.5 font-normal">
                      {emp.department || "General"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getLevelBadge(depth)}</TableCell>
                  <TableCell>
                    {manager ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-muted text-[10px] font-bold grid place-items-center shrink-0">
                          {initials(manager.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{manager.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{manager.empCode}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                        <Crown className="h-3 w-3 text-amber-500" /> Top Level (None)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {directs.length > 0 ? (
                      <HoverCard openDelay={150}>
                        <HoverCardTrigger asChild>
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/25 border-primary/30 text-xs font-semibold cursor-pointer gap-1 inline-flex">
                            <Users className="h-3 w-3" />
                            <span>{directs.length} Directs</span>
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64 p-3" align="center">
                          <div className="text-xs font-semibold mb-1.5 text-foreground">
                            Team reporting to {emp.name}:
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {directs.map((d) => (
                              <div key={d.id} className="text-xs flex items-center justify-between text-muted-foreground border-b border-border/50 pb-1">
                                <span className="font-medium text-foreground truncate">{d.name}</span>
                                <span className="text-[10px] font-mono">{d.empCode}</span>
                              </div>
                            ))}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1 rounded-lg"
                        onClick={() => onEdit(emp)}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 gap-1 rounded-lg"
                        onClick={() => onOpenApprovals(emp)}
                      >
                        <SlidersHorizontal className="h-3 w-3" /> Approvals
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Grid View Component (Cards)
 */
function VirtualizedOrgGrid({
  list,
  cmap,
  byId,
  onEdit,
  onOpenApprovals,
}: {
  list: Employee[];
  cmap: Map<string, Employee[]>;
  byId: Map<string, Employee>;
  onEdit: (e: Employee) => void;
  onOpenApprovals: (e: Employee) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {list.map((emp) => {
        const directs = cmap.get(emp.id) || [];
        const manager = emp.managerId ? byId.get(emp.managerId) : undefined;

        return (
          <div
            key={emp.id}
            className="rounded-2xl border border-border bg-card p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-bold grid place-items-center ring-1 ring-border shrink-0">
                {emp.photoDataUrl ? (
                  <img src={emp.photoDataUrl} alt={emp.name} className="h-full w-full object-cover rounded-full" />
                ) : (
                  initials(emp.name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-foreground truncate">{emp.name}</div>
                <div className="text-xs text-muted-foreground truncate">{emp.designation || "Staff"}</div>
                <div className="text-[10px] text-muted-foreground/75 truncate mt-0.5">
                  {emp.department} · {emp.empCode}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground border-t border-border/60 pt-2 flex items-center justify-between">
              <span>Reports: {directs.length}</span>
              <span>Manager: {manager ? manager.name : "None (Root)"}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 rounded-xl gap-1"
                onClick={() => onEdit(emp)}
              >
                <Pencil className="h-3 w-3" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 rounded-xl gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500 hover:text-white"
                onClick={() => onOpenApprovals(emp)}
              >
                <SlidersHorizontal className="h-3 w-3" /> Approvals
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
