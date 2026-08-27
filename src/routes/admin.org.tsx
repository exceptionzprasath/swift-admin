import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  useStore,
  getEmployeeBranchIds,
  buildDefaultEmployeeApprovalSettings,
  getUpwardHierarchyChain,
  DEFAULT_GRIEVANCE_TYPES,
  DEFAULT_ATTENDANCE_REQUEST_CATEGORIES,
  DEFAULT_DOCUMENT_TYPES,
  type Employee,
  type EmployeeApprovalSettings,
  type AttendanceApprovalConfig,
  type GrievanceApprovalConfig,
  type DocumentRequestApprovalConfig,
  type ApprovalFlowLevel,
  type AttendanceRequestCategory,
  type GrievanceTypeItem,
  type DocumentTypeItem,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Network, Pencil, ArrowUp, ArrowDown, Mail, Phone, Building2, MapPin,
  Search, ChevronDown, ChevronRight, Users, LayoutGrid, GitBranch, Maximize2,
  Minimize2, Zap, Sliders, CalendarDays, MessageSquareHeart, FileText,
  CheckCircle2, AlertCircle, ArrowLeft, Plus, Trash2, Edit2, Clock, ShieldCheck,
  RotateCcw, Save, GripVertical, Check, MoreHorizontal, UserCheck, ShieldAlert,
  ExternalLink, ChevronUp, RefreshCw, Layers
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/org")({
  head: () => ({ meta: [{ title: "Organization & Approval Workflows · SWIFT" }] }),
  component: OrgPage,
});

function initials(name: string) {
  return (name || "").split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

type ViewMode = "tree" | "grid";
type ApprovalTab = "attendance" | "grievance" | "documents";

function OrgPage() {
  const { employees, updateEmployee, updateEmployeeApprovalSettings, company, setCompany } = useStore();
  const branches = company.branches ?? [];

  // Edit Employee Basic Info Modal
  const [editOpen, setEditOpen] = useState(false);
  const [target, setTarget] = useState<Employee | null>(null);
  const [about, setAbout] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");

  // Approval Settings Workspace State
  const [approvalTarget, setApprovalTarget] = useState<Employee | null>(null);
  const [activeApprovalTab, setActiveApprovalTab] = useState<ApprovalTab>("grievance");
  const [approvalSettingsDraft, setApprovalSettingsDraft] = useState<EmployeeApprovalSettings | null>(null);
  const [activeDocCategory, setActiveDocCategory] = useState<string>("doc-cat-letters");

  // Add / Edit Grievance Type Modal
  const [grievanceModalOpen, setGrievanceModalOpen] = useState(false);
  const [editingGrievanceType, setEditingGrievanceType] = useState<GrievanceTypeItem | null>(null);
  const [grvName, setGrvName] = useState("");
  const [grvDesc, setGrvDesc] = useState("");

  // Add / Edit Attendance Category Modal
  const [attCatModalOpen, setAttCatModalOpen] = useState(false);
  const [editingAttCat, setEditingAttCat] = useState<AttendanceRequestCategory | null>(null);
  const [attCatName, setAttCatName] = useState("");
  const [attCatDesc, setAttCatDesc] = useState("");

  // Add / Edit Document Type Modal
  const [docTypeModalOpen, setDocTypeModalOpen] = useState(false);
  const [editingDocType, setEditingDocType] = useState<DocumentTypeItem | null>(null);
  const [docTypeName, setDocTypeName] = useState("");
  const [docTypeDesc, setDocTypeDesc] = useState("");
  const [docTypeWorkflow, setDocTypeWorkflow] = useState("HR Manager → Director");

  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("tree");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [branchFilter, setBranchFilter] = useState<string>("__all");

  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Open Approval Settings Workspace for an employee
  function openApprovalSettings(emp: Employee, defaultTab: ApprovalTab = "grievance") {
    setApprovalTarget(emp);
    setActiveApprovalTab(defaultTab);
    const existing = emp.approvalSettings || buildDefaultEmployeeApprovalSettings(emp, employees);
    const draft = JSON.parse(JSON.stringify(existing));
    if (draft.grievance && (!draft.grievance.grievanceTypes || draft.grievance.grievanceTypes.length === 0)) {
      draft.grievance.grievanceTypes = company.grievanceTypes || DEFAULT_GRIEVANCE_TYPES;
    }
    if (draft.attendance && (!draft.attendance.categories || draft.attendance.categories.length === 0)) {
      draft.attendance.categories = company.attendanceRequestCategories || DEFAULT_ATTENDANCE_REQUEST_CATEGORIES;
    }
    if (draft.documentRequest && (!draft.documentRequest.documentTypes || draft.documentRequest.documentTypes.length === 0)) {
      draft.documentRequest.documentTypes = company.documentTypes || DEFAULT_DOCUMENT_TYPES;
    }
    setApprovalSettingsDraft(draft);
  }

  function closeApprovalSettings() {
    setApprovalTarget(null);
    setApprovalSettingsDraft(null);
  }

  function saveApprovalSettings() {
    if (!approvalTarget || !approvalSettingsDraft) return;
    updateEmployeeApprovalSettings(approvalTarget.id, approvalSettingsDraft);

    // Sync updated grievance types, attendance categories, and document types company-wide so all employees inherit them
    setCompany({
      grievanceTypes: approvalSettingsDraft.grievance?.grievanceTypes || company.grievanceTypes,
      attendanceRequestCategories: approvalSettingsDraft.attendance?.categories || company.attendanceRequestCategories,
      documentTypes: approvalSettingsDraft.documentRequest?.documentTypes || company.documentTypes,
    });

    toast.success(`Approval & Request workflows saved for ${approvalTarget.name} and synced for all employees!`);
  }

  function resetApprovalSettingsToDefault() {
    if (!approvalTarget) return;
    const defaults = buildDefaultEmployeeApprovalSettings(approvalTarget, employees);
    setApprovalSettingsDraft(JSON.parse(JSON.stringify(defaults)));
    toast.info("Reset to default organizational hierarchy");
  }

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

  const filteredEmployees = useMemo(
    () => employees.filter((e) => (branchFilter === "__all" ? true : (e.branchId || "__unassigned") === branchFilter)),
    [employees, branchFilter],
  );

  // Group by branch
  const byBranch = useMemo(() => {
    const g = new Map<string, Employee[]>();
    filteredEmployees.forEach((e) => {
      const key = e.branchId || "__unassigned";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(e);
    });
    return g;
  }, [filteredEmployees]);

  function childrenMapFor(list: Employee[]) {
    const ids = new Set(list.map((e) => e.id));
    const map = new Map<string | undefined, Employee[]>();
    for (const e of list) {
      const key = e.managerId && ids.has(e.managerId) ? e.managerId : undefined;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        const ac = (map.get(a.id)?.length ?? 0);
        const bc = (map.get(b.id)?.length ?? 0);
        if (ac !== bc) return bc - ac;
        return a.name.localeCompare(b.name);
      });
      map.set(k, arr);
    }
    return map;
  }

  function openEdit(e: Employee) {
    setTarget(e);
    setAbout(e.about ?? "");
    setManagerId(e.managerId ?? "__none");
    setBranchId(e.branchId ?? "__none");
    setDesignation(e.designation);
    setDepartment(e.department);
    setEditOpen(true);
  }

  function save() {
    if (!target) return;
    if (managerId && managerId !== "__none" && managerId === target.id) return toast.error("An employee cannot report to themselves");
    if (managerId && managerId !== "__none") {
      let cur: string | undefined = managerId;
      const seen = new Set<string>();
      while (cur) {
        if (cur === target.id) return toast.error("Cycle detected — pick a different manager");
        if (seen.has(cur)) break;
        seen.add(cur);
        cur = byId.get(cur)?.managerId;
      }
    }
    updateEmployee(target.id, {
      about, designation, department,
      managerId: managerId === "__none" ? undefined : managerId,
      branchId: branchId === "__none" ? undefined : branchId,
    });
    toast.success(`${target.name} updated`);
    setEditOpen(false);
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function expandAll() { setCollapsed(new Set()); }
  function collapseAll() {
    const managers = new Set<string>();
    employees.forEach((e) => { if (e.managerId) managers.add(e.managerId); });
    setCollapsed(managers);
  }

  // =========================================================================
  // RENDER APPROVAL SETTINGS WORKSPACE (IF AN EMPLOYEE IS SELECTED)
  // =========================================================================
  if (approvalTarget && approvalSettingsDraft) {
    const emp = approvalTarget;
    const branch = branches.find((b) => b.id === emp.branchId) || branches[0];
    const attConfig = approvalSettingsDraft.attendance!;
    const grvConfig = approvalSettingsDraft.grievance!;
    const docConfig = approvalSettingsDraft.documentRequest!;

    const activeLevels =
      activeApprovalTab === "attendance"
        ? attConfig.levels.filter((l) => l.enabled)
        : activeApprovalTab === "grievance"
        ? grvConfig.levels.filter((l) => l.enabled)
        : docConfig.levels.filter((l) => l.enabled);

    return (
      <div className="space-y-6 pb-20 animate-in fade-in-50 duration-200">
        {/* Breadcrumb & Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <button
              onClick={closeApprovalSettings}
              className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Organization Structure
            </button>
            <span>›</span>
            <span className="text-foreground font-semibold">
              {emp.name} ({emp.empCode})
            </span>
            <span>›</span>
            <span className="text-primary font-medium">
              {activeApprovalTab === "attendance" ? "Attendance Settings" : activeApprovalTab === "grievance" ? "Grievance Settings" : "Document Request Settings"}
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={closeApprovalSettings} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Organization
          </Button>
        </div>

        {/* Employee Banner Card */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0">
              {emp.photoDataUrl ? (
                <img src={emp.photoDataUrl} className="h-full w-full object-cover" alt={emp.name} />
              ) : (
                <span className="font-bold text-lg">{initials(emp.name)}</span>
              )}
            </div>
            <div>
              <div className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                {emp.name} <Badge variant="outline" className="text-xs">{emp.empCode}</Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{emp.designation}</span>
                <span>•</span>
                <span>{emp.department} Department</span>
                <span>•</span>
                <span>{branch?.name || "Head Office • HQ"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Main Configuration Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveApprovalTab("attendance")}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
              activeApprovalTab === "attendance"
                ? "bg-emerald-500/10 border-emerald-500 shadow-soft"
                : "bg-card border-border hover:border-emerald-500/50"
            }`}
          >
            <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
              activeApprovalTab === "attendance" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
            }`}>
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">1</span> Attendance Settings
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Configure attendance & leave approval flow</p>
            </div>
          </button>

          <button
            onClick={() => setActiveApprovalTab("grievance")}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
              activeApprovalTab === "grievance"
                ? "bg-amber-500/10 border-amber-500 shadow-soft"
                : "bg-card border-border hover:border-amber-500/50"
            }`}
          >
            <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
              activeApprovalTab === "grievance" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
            }`}>
              <MessageSquareHeart className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">2</span> Grievance Settings
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Configure employee grievance approval flow</p>
            </div>
          </button>

          <button
            onClick={() => setActiveApprovalTab("documents")}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
              activeApprovalTab === "documents"
                ? "bg-blue-500/10 border-blue-500 shadow-soft"
                : "bg-card border-border hover:border-blue-500/50"
            }`}
          >
            <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
              activeApprovalTab === "documents" ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
            }`}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">3</span> Document Request Settings
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Configure document & letter approval flow</p>
            </div>
          </button>
        </div>

        {/* Helper function to compute upward chain and handle levels */}
        {approvalTarget && approvalSettingsDraft && (() => {
          const upwardChain = getUpwardHierarchyChain(approvalTarget, employees);

          const renderLevelsSection = (
            moduleKey: "attendance" | "grievance" | "documentRequest",
            badgeColorClass: string
          ) => {
            const config = approvalSettingsDraft[moduleKey];
            if (!config) return null;
            const isCustom = config.approvalSource === "custom";

            const moveLevel = (index: number, direction: "up" | "down") => {
              const nextLevels = [...config.levels];
              const targetIndex = direction === "up" ? index - 1 : index + 1;
              if (targetIndex < 0 || targetIndex >= nextLevels.length) return;
              const temp = nextLevels[index];
              nextLevels[index] = nextLevels[targetIndex];
              nextLevels[targetIndex] = temp;
              const reindexed = nextLevels.map((lvl, idx) => ({ ...lvl, level: idx + 1 }));
              setApprovalSettingsDraft({
                ...approvalSettingsDraft,
                [moduleKey]: { ...config, levels: reindexed },
              });
            };

            const addCustomLevel = () => {
              const nextLevels = [...config.levels];
              const newLvlNum = nextLevels.length + 1;
              const defaultEmp = employees.find((e) => !nextLevels.some((l) => l.approverId === e.id) && e.id !== approvalTarget.id) || employees[0];
              nextLevels.push({
                level: newLvlNum,
                approverId: defaultEmp?.id,
                approverName: defaultEmp?.name || "Approver",
                role: defaultEmp?.designation || `Custom Approver (L${newLvlNum})`,
                roleId: `role-custom-${newLvlNum}`,
                enabled: true,
                isMandatory: true,
              });
              setApprovalSettingsDraft({
                ...approvalSettingsDraft,
                [moduleKey]: { ...config, levels: nextLevels },
              });
            };

            const removeCustomLevel = (lvlIndex: number) => {
              if (config.levels.length <= 1) {
                toast.error("At least one approval level is required.");
                return;
              }
              const filtered = config.levels.filter((_, idx) => idx !== lvlIndex);
              const reindexed = filtered.map((lvl, idx) => ({ ...lvl, level: idx + 1 }));
              setApprovalSettingsDraft({
                ...approvalSettingsDraft,
                [moduleKey]: { ...config, levels: reindexed },
              });
            };

            const updateLevelItem = (lvlIndex: number, patch: Partial<ApprovalFlowLevel>) => {
              const nextLevels = config.levels.map((lvl, idx) => {
                if (idx !== lvlIndex) return lvl;
                const updated = { ...lvl, ...patch };
                if (patch.approverId && patch.approverId !== lvl.approverId) {
                  const empObj = employees.find((e) => e.id === patch.approverId);
                  if (empObj) {
                    updated.approverName = empObj.name;
                    if (!patch.role) updated.role = empObj.designation || updated.role;
                  }
                }
                return updated;
              });
              setApprovalSettingsDraft({
                ...approvalSettingsDraft,
                [moduleKey]: { ...config, levels: nextLevels },
              });
            };

            return (
              <div className="space-y-6">
                {/* 1. Approval Source */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <span className={`h-5 w-5 rounded-full ${badgeColorClass} text-xs grid place-items-center`}>1</span>
                    Approval Source
                  </div>
                  <p className="text-xs text-muted-foreground">Select how approval flow is constructed for {approvalTarget.name}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => {
                        const upwardLevels: ApprovalFlowLevel[] = upwardChain.map((mgr, idx) => ({
                          level: idx + 1,
                          approverId: mgr.id,
                          approverName: mgr.name,
                          role: mgr.designation || (idx === 0 ? "Reporting Manager (L1)" : idx === 1 ? "Department Head (L2)" : `Director (L${idx + 1})`),
                          roleId: `role-level-${idx + 1}`,
                          enabled: true,
                          isMandatory: true,
                        }));
                        const finalUpward = upwardLevels.length > 0 ? upwardLevels : config.levels;
                        setApprovalSettingsDraft({
                          ...approvalSettingsDraft,
                          [moduleKey]: { ...config, approvalSource: "hierarchy", levels: finalUpward },
                        });
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        !isCustom
                          ? "bg-primary/10 border-primary shadow-soft"
                          : "bg-muted/30 border-border hover:border-primary/40"
                      }`}
                    >
                      <UserCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-xs text-foreground">Employee Reporting Hierarchy</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Automatically uses the upward manager chain above this employee (subordinates excluded)
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setApprovalSettingsDraft({
                          ...approvalSettingsDraft,
                          [moduleKey]: { ...config, approvalSource: "custom" },
                        });
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isCustom
                          ? "bg-primary/10 border-primary shadow-soft"
                          : "bg-muted/30 border-border hover:border-primary/40"
                      }`}
                    >
                      <Sliders className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-xs text-foreground">Custom Approvers</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Drag, reorder, add or delete stages to customize the approval flow
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Approval Flow Levels */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <span className={`h-5 w-5 rounded-full ${badgeColorClass} text-xs grid place-items-center`}>2</span>
                        Approval Flow Levels {isCustom ? "(Custom Drag & Reorder)" : "(Organizational Upward Chain)"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isCustom
                          ? "Use the arrows or drag handles to reorder stages and customize approvers."
                          : `Showing only ancestors in the reporting line above ${approvalTarget.name}.`}
                      </p>
                    </div>
                    {isCustom && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                        onClick={addCustomLevel}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Stage
                      </Button>
                    )}
                  </div>

                  {!isCustom && (
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 text-xs text-primary flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Hierarchy Mode Active:</strong> Only ancestors in the reporting line above {approvalTarget.name} ({upwardChain.length} upward level{upwardChain.length === 1 ? "" : "s"} found) are included. Subordinates and unrelated peers are excluded.
                      </span>
                    </div>
                  )}

                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                    <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 text-xs font-semibold text-muted-foreground items-center">
                      <div className={isCustom ? "col-span-2 flex items-center gap-1" : "col-span-1"}>
                        {isCustom && <span>Order</span>}
                        <span>Lvl</span>
                      </div>
                      <div className={isCustom ? "col-span-4" : "col-span-5"}>Approver Name</div>
                      <div className={isCustom ? "col-span-4" : "col-span-4"}>Role / Stage</div>
                      <div className="col-span-2 text-right">Include in Flow</div>
                    </div>

                    {config.levels.map((lvl, idx) => (
                      <div
                        key={lvl.level + "_" + idx}
                        className="px-4 py-3 grid grid-cols-12 items-center text-xs bg-card hover:bg-muted/20 transition-colors gap-2"
                      >
                        {/* Level / Order Column */}
                        <div className={isCustom ? "col-span-2 flex items-center gap-1" : "col-span-1 font-bold text-foreground"}>
                          {isCustom && (
                            <div className="flex items-center gap-0.5 mr-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                disabled={idx === 0}
                                onClick={() => moveLevel(idx, "up")}
                                title="Move Up"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                disabled={idx === config.levels.length - 1}
                                onClick={() => moveLevel(idx, "down")}
                                title="Move Down"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                          <Badge variant="outline" className="font-mono text-[11px] px-1.5 py-0 h-5">
                            L{lvl.level}
                          </Badge>
                        </div>

                        {/* Approver Selection */}
                        <div className={isCustom ? "col-span-4" : "col-span-5"}>
                          {isCustom ? (
                            <Select
                              value={lvl.approverId || ""}
                              onValueChange={(val) => updateLevelItem(idx, { approverId: val })}
                            >
                              <SelectTrigger className="h-8 text-xs bg-card"><SelectValue placeholder="Select approver..." /></SelectTrigger>
                              <SelectContent>
                                {employees.map((empOption) => (
                                  <SelectItem key={empOption.id} value={empOption.id}>
                                    {empOption.name} ({empOption.designation || empOption.department})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-[10px] grid place-items-center overflow-hidden shrink-0">
                                {initials(lvl.approverName || "Approver")}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate">{lvl.approverName || "Auto-assigned"}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{lvl.role}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Role Title Input */}
                        <div className={isCustom ? "col-span-4" : "col-span-4"}>
                          {isCustom ? (
                            <Input
                              className="h-8 text-xs"
                              value={lvl.role}
                              placeholder="Role title (e.g. TL / Manager)"
                              onChange={(e) => updateLevelItem(idx, { role: e.target.value })}
                            />
                          ) : (
                            <div className="text-muted-foreground truncate font-mono text-[11px]">{lvl.role}</div>
                          )}
                        </div>

                        {/* Toggle & Action */}
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <Switch
                            checked={lvl.enabled}
                            onCheckedChange={(v) => updateLevelItem(idx, { enabled: v })}
                          />
                          {isCustom && config.levels.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-red-500"
                              onClick={() => removeCustomLevel(idx)}
                              title="Delete Stage"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          };

          const renderAutoEscalationSection = (
            moduleKey: "attendance" | "grievance" | "documentRequest",
            badgeColorClass: string
          ) => {
            const config = approvalSettingsDraft[moduleKey];
            if (!config) return null;
            if (config.approvalType === "sequential") {
              return (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <span className={`h-5 w-5 rounded-full ${badgeColorClass} text-xs grid place-items-center`}>4</span>
                      Auto Escalation (Sequential Flow Rule)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Enable Auto Escalation</span>
                      <Switch
                        checked={config.autoEscalation?.enabled}
                        onCheckedChange={(v) => {
                          setApprovalSettingsDraft({
                            ...approvalSettingsDraft,
                            [moduleKey]: {
                              ...config,
                              autoEscalation: { ...config.autoEscalation, enabled: v },
                            },
                          });
                        }}
                      />
                    </div>
                  </div>

                  {config.autoEscalation?.enabled && (
                    <div className="bg-muted/30 p-4 rounded-xl space-y-4 border border-border">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-muted-foreground">No action in</span>
                        <Input
                          type="number"
                          className="w-16 h-8 text-center"
                          value={config.autoEscalation.days}
                          onChange={(e) => {
                            const days = parseInt(e.target.value) || 1;
                            setApprovalSettingsDraft({
                              ...approvalSettingsDraft,
                              [moduleKey]: {
                                ...config,
                                autoEscalation: { ...config.autoEscalation, days },
                              },
                            });
                          }}
                        />
                        <span className="text-muted-foreground">Days, then escalate to</span>
                        <Select
                          value={config.autoEscalation.action}
                          onValueChange={(val) => {
                            setApprovalSettingsDraft({
                              ...approvalSettingsDraft,
                              [moduleKey]: {
                                ...config,
                                autoEscalation: { ...config.autoEscalation, action: val },
                              },
                            });
                          }}
                        >
                          <SelectTrigger className="w-60 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Move to next enabled approver">Move to next sequential approver</SelectItem>
                            <SelectItem value="Escalate directly to HR">Escalate directly to HR Manager</SelectItem>
                            <SelectItem value="Send reminder and wait">Send reminder notice and wait</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 text-xs text-primary flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          If the current level approver does not accept within {config.autoEscalation.days || 2} days, the request will automatically escalate to the next person in the sequential hierarchy.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 flex items-center gap-3.5 text-xs text-muted-foreground">
                <Clock className="h-5 w-5 text-muted-foreground/60 shrink-0" />
                <div>
                  <div className="font-semibold text-foreground">
                    Auto Escalation is Disabled for "{config.approvalType === "any" ? "Any One Can Approve" : "All Must Approve"}"
                  </div>
                  <div className="text-[11px] mt-0.5">
                    Auto-escalation rules are only active when approvals follow a Sequential step-by-step pipeline. In parallel modes, all approvers receive the request simultaneously.
                  </div>
                </div>
              </div>
            );
          };

          return (
            <>
              {/* TAB CONTENT: GRIEVANCE SETTINGS */}
              {activeApprovalTab === "grievance" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 space-y-6">
                    {renderLevelsSection("grievance", "bg-primary/10 text-primary")}

                    {/* 3. Approval Type */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs grid place-items-center">3</span>
                        Approval Type
                      </div>
                      <p className="text-xs text-muted-foreground">Choose how grievance approvals should work</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: "sequential", label: "Sequential", desc: "One after another in order" },
                          { id: "any", label: "Any One Can Approve", desc: "Any one approver can approve" },
                          { id: "all", label: "All Must Approve", desc: "All approvers must approve" },
                        ].map((type) => (
                          <div
                            key={type.id}
                            onClick={() => {
                              setApprovalSettingsDraft({
                                ...approvalSettingsDraft,
                                grievance: { ...grvConfig, approvalType: type.id as any },
                              });
                            }}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                              grvConfig.approvalType === type.id
                                ? "bg-emerald-500/10 border-emerald-500 shadow-soft"
                                : "bg-muted/30 border-border hover:border-primary/40"
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-xs text-foreground">{type.label}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{type.desc}</div>
                            </div>
                            <div className={`h-4 w-4 rounded-full border grid place-items-center shrink-0 ${
                              grvConfig.approvalType === type.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground"
                            }`}>
                              {grvConfig.approvalType === type.id && <Check className="h-2.5 w-2.5" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. Auto Escalation */}
                    {renderAutoEscalationSection("grievance", "bg-primary/10 text-primary")}

                    {/* 5. Grievance Types */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs grid place-items-center">5</span>
                            Grievance Types
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Add, edit or delete grievance types for this employee</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8"
                          onClick={() => {
                            setEditingGrievanceType(null);
                            setGrvName("");
                            setGrvDesc("");
                            setGrievanceModalOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Grievance Type
                        </Button>
                      </div>

                      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                        <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 text-xs font-semibold text-muted-foreground">
                          <div className="col-span-1">#</div>
                          <div className="col-span-4">Grievance Type</div>
                          <div className="col-span-5">Description</div>
                          <div className="col-span-1 text-center">Active</div>
                          <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {grvConfig.grievanceTypes.map((gt, idx) => (
                          <div key={gt.id} className="px-4 py-3 grid grid-cols-12 items-center text-xs bg-card hover:bg-muted/20 transition-colors">
                            <div className="col-span-1 font-mono text-muted-foreground">{idx + 1}</div>
                            <div className="col-span-4 font-semibold text-foreground">{gt.name}</div>
                            <div className="col-span-5 text-muted-foreground truncate">{gt.description}</div>
                            <div className="col-span-1 flex justify-center">
                              <Switch
                                checked={gt.active}
                                onCheckedChange={(v) => {
                                  const nextTypes = grvConfig.grievanceTypes.map((item) =>
                                    item.id === gt.id ? { ...item, active: v } : item
                                  );
                                  setApprovalSettingsDraft({
                                    ...approvalSettingsDraft,
                                    grievance: { ...grvConfig, grievanceTypes: nextTypes },
                                  });
                                }}
                              />
                            </div>
                            <div className="col-span-1 flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditingGrievanceType(gt);
                                  setGrvName(gt.name);
                                  setGrvDesc(gt.description);
                                  setGrievanceModalOpen(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                onClick={() => {
                                  const nextTypes = grvConfig.grievanceTypes.filter((item) => item.id !== gt.id);
                                  setApprovalSettingsDraft({
                                    ...approvalSettingsDraft,
                                    grievance: { ...grvConfig, grievanceTypes: nextTypes },
                                  });
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Summary Sidebar */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-5 sticky top-6 shadow-soft">
                      <div className="font-semibold text-base text-foreground pb-3 border-b border-border flex items-center justify-between">
                        <span>Grievance Approval Summary</span>
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                          Live Active
                        </Badge>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" /> Source
                          </span>
                          <span className="font-semibold text-foreground">
                            {grvConfig.approvalSource === "hierarchy" ? "Employee Hierarchy" : "Custom Approvers"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Sliders className="h-3.5 w-3.5 text-primary" /> Approval Type
                          </span>
                          <span className="font-semibold text-foreground capitalize">{grvConfig.approvalType}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Active Levels
                          </span>
                          <span className="font-semibold text-emerald-600">
                            {activeLevels.length} of {grvConfig.levels.length}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" /> Escalation
                          </span>
                          <span className="font-semibold text-foreground">
                            {grvConfig.approvalType === "sequential" && grvConfig.autoEscalation?.enabled
                              ? `Every ${grvConfig.autoEscalation.days} Days`
                              : "Disabled"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border space-y-4">
                        <div className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                          Approval Flow Preview
                        </div>

                        <div className="space-y-3 relative pl-4 border-l-2 border-primary/40 ml-2">
                          {activeLevels.map((lvl, lIdx) => (
                            <div key={lvl.level} className="relative flex items-center gap-3">
                              <div className="absolute -left-[23px] h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                                {lIdx + 1}
                              </div>
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs grid place-items-center shrink-0 overflow-hidden">
                                {initials(lvl.approverName || "User")}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate">{lvl.approverName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{lvl.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: ATTENDANCE SETTINGS */}
              {activeApprovalTab === "attendance" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 space-y-6">
                    {/* 1. Attendance Request Categories */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs grid place-items-center">1</span>
                            Attendance Request Categories
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Configure what can be requested as attendance</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8"
                          onClick={() => {
                            setEditingAttCat(null);
                            setAttCatName("");
                            setAttCatDesc("");
                            setAttCatModalOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Category
                        </Button>
                      </div>

                      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                        <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 text-xs font-semibold text-muted-foreground">
                          <div className="col-span-1">#</div>
                          <div className="col-span-4">Request Category</div>
                          <div className="col-span-4">Description</div>
                          <div className="col-span-2">Request By</div>
                          <div className="col-span-1 text-right">Approval</div>
                        </div>

                        {attConfig.categories.map((cat, idx) => (
                          <div key={cat.id} className="px-4 py-3 grid grid-cols-12 items-center text-xs bg-card hover:bg-muted/20 transition-colors">
                            <div className="col-span-1 font-mono text-muted-foreground">{idx + 1}</div>
                            <div className="col-span-4 font-semibold text-foreground">{cat.name}</div>
                            <div className="col-span-4 text-muted-foreground truncate">{cat.description}</div>
                            <div className="col-span-2 text-muted-foreground">{cat.requestBy}</div>
                            <div className="col-span-1 flex justify-end">
                              <Switch
                                checked={cat.approvalRequired}
                                onCheckedChange={(v) => {
                                  const nextCats = attConfig.categories.map((item) =>
                                    item.id === cat.id ? { ...item, approvalRequired: v } : item
                                  );
                                  setApprovalSettingsDraft({
                                    ...approvalSettingsDraft,
                                    attendance: { ...attConfig, categories: nextCats },
                                  });
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Levels Section */}
                    {renderLevelsSection("attendance", "bg-emerald-500/10 text-emerald-600")}

                    {/* 3. Approval Type */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs grid place-items-center">3</span>
                        Approval Type
                      </div>
                      <p className="text-xs text-muted-foreground">Choose how attendance approvals should work</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: "sequential", label: "Sequential", desc: "One after another in order" },
                          { id: "any", label: "Any One Can Approve", desc: "Any one approver can approve" },
                          { id: "all", label: "All Must Approve", desc: "All approvers must approve" },
                        ].map((type) => (
                          <div
                            key={type.id}
                            onClick={() => {
                              setApprovalSettingsDraft({
                                ...approvalSettingsDraft,
                                attendance: { ...attConfig, approvalType: type.id as any },
                              });
                            }}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                              attConfig.approvalType === type.id
                                ? "bg-emerald-500/10 border-emerald-500 shadow-soft"
                                : "bg-muted/30 border-border hover:border-primary/40"
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-xs text-foreground">{type.label}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{type.desc}</div>
                            </div>
                            <div className={`h-4 w-4 rounded-full border grid place-items-center shrink-0 ${
                              attConfig.approvalType === type.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground"
                            }`}>
                              {attConfig.approvalType === type.id && <Check className="h-2.5 w-2.5" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. Auto Escalation */}
                    {renderAutoEscalationSection("attendance", "bg-emerald-500/10 text-emerald-600")}

                    {/* 5. Additional Settings */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs grid place-items-center">5</span>
                        Additional Attendance Settings
                      </div>
                      <div className="space-y-3 pt-1">
                        {[
                          { key: "allowEmployeeCancel", label: "Allow employees to cancel their pending requests" },
                          { key: "allowViewStatus", label: "Allow employees to view approval status & step details" },
                          { key: "sendEmailNotification", label: "Send email notifications to approvers on request" },
                          { key: "sendReminderBeforeEscalation", label: "Send reminder to approvers before escalation" },
                          { key: "mandatoryRejectionRemarks", label: "Add remarks/comments mandatory for rejection" },
                          { key: "allowManualForward", label: "Allow approvers to forward requests manually" },
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center gap-3 text-xs">
                            <Checkbox
                              checked={Boolean((attConfig.additionalSettings as any)[setting.key])}
                              onCheckedChange={(checked) => {
                                setApprovalSettingsDraft({
                                  ...approvalSettingsDraft,
                                  attendance: {
                                    ...attConfig,
                                    additionalSettings: {
                                      ...attConfig.additionalSettings,
                                      [setting.key]: Boolean(checked),
                                    },
                                  },
                                });
                              }}
                            />
                            <span className="text-foreground">{setting.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Summary Sidebar */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-5 sticky top-6 shadow-soft">
                      <div className="font-semibold text-base text-foreground pb-3 border-b border-border flex items-center justify-between">
                        <span>Attendance Approval Summary</span>
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                          Live Active
                        </Badge>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" /> Source
                          </span>
                          <span className="font-semibold text-foreground">
                            {attConfig.approvalSource === "hierarchy" ? "Employee Hierarchy" : "Custom Approvers"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Sliders className="h-3.5 w-3.5 text-primary" /> Approval Type
                          </span>
                          <span className="font-semibold text-foreground capitalize">{attConfig.approvalType}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Active Levels
                          </span>
                          <span className="font-semibold text-emerald-600">
                            {activeLevels.length} of {attConfig.levels.length}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" /> Escalation
                          </span>
                          <span className="font-semibold text-foreground">
                            {attConfig.approvalType === "sequential" && attConfig.autoEscalation?.enabled
                              ? `Every ${attConfig.autoEscalation.days} Days`
                              : "Disabled"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border space-y-4">
                        <div className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                          Approval Flow Preview
                        </div>

                        <div className="space-y-3 relative pl-4 border-l-2 border-emerald-500/40 ml-2">
                          {activeLevels.map((lvl, lIdx) => (
                            <div key={lvl.level} className="relative flex items-center gap-3">
                              <div className="absolute -left-[23px] h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold grid place-items-center">
                                {lIdx + 1}
                              </div>
                              <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs grid place-items-center shrink-0 overflow-hidden">
                                {initials(lvl.approverName || "User")}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate">{lvl.approverName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{lvl.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: DOCUMENT REQUEST SETTINGS */}
              {activeApprovalTab === "documents" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 space-y-6">
                    {/* 1. Document Categories & Types */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 text-xs grid place-items-center">1</span>
                            Document Categories & Types
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Manage all document categories and letter types</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8"
                          onClick={() => {
                            setEditingDocType(null);
                            setDocTypeName("");
                            setDocTypeDesc("");
                            setDocTypeModalOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Document Type
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4 space-y-1.5 border-r border-border pr-2">
                          {docConfig.categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setActiveDocCategory(cat.id)}
                              className={`w-full p-2.5 rounded-xl text-left text-xs flex items-center justify-between transition-all ${
                                activeDocCategory === cat.id
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "hover:bg-muted text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{cat.name}</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] py-0">{cat.count}</Badge>
                            </button>
                          ))}
                        </div>

                        <div className="md:col-span-8 border border-border rounded-xl overflow-hidden divide-y divide-border">
                          <div className="bg-muted/50 px-3 py-2 grid grid-cols-12 text-xs font-semibold text-muted-foreground">
                            <div className="col-span-1">#</div>
                            <div className="col-span-4">Letter Type</div>
                            <div className="col-span-4">Workflow</div>
                            <div className="col-span-3 text-right">Status</div>
                          </div>

                          {docConfig.documentTypes.map((dt, idx) => (
                            <div key={dt.id} className="px-3 py-2.5 grid grid-cols-12 items-center text-xs bg-card hover:bg-muted/20 transition-colors">
                              <div className="col-span-1 font-mono text-muted-foreground">{idx + 1}</div>
                              <div className="col-span-4 font-semibold text-foreground truncate">{dt.name}</div>
                              <div className="col-span-4 text-muted-foreground truncate">{dt.workflow}</div>
                              <div className="col-span-3 flex justify-end">
                                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                                  Active
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Levels Section */}
                    {renderLevelsSection("documentRequest", "bg-blue-500/10 text-blue-600")}

                    {/* 3. Approval Type */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 text-xs grid place-items-center">3</span>
                        Approval Type
                      </div>
                      <p className="text-xs text-muted-foreground">Choose how document approvals should work</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: "sequential", label: "Sequential", desc: "One after another in order" },
                          { id: "any", label: "Any One Can Approve", desc: "Any one approver can approve" },
                          { id: "all", label: "All Must Approve", desc: "All approvers must approve" },
                        ].map((type) => (
                          <div
                            key={type.id}
                            onClick={() => {
                              setApprovalSettingsDraft({
                                ...approvalSettingsDraft,
                                documentRequest: { ...docConfig, approvalType: type.id as any },
                              });
                            }}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                              docConfig.approvalType === type.id
                                ? "bg-emerald-500/10 border-emerald-500 shadow-soft"
                                : "bg-muted/30 border-border hover:border-primary/40"
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-xs text-foreground">{type.label}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{type.desc}</div>
                            </div>
                            <div className={`h-4 w-4 rounded-full border grid place-items-center shrink-0 ${
                              docConfig.approvalType === type.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground"
                            }`}>
                              {docConfig.approvalType === type.id && <Check className="h-2.5 w-2.5" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. Auto Escalation */}
                    {renderAutoEscalationSection("documentRequest", "bg-blue-500/10 text-blue-600")}
                  </div>

                  {/* Right Summary Sidebar */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-5 sticky top-6 shadow-soft">
                      <div className="font-semibold text-base text-foreground pb-3 border-b border-border flex items-center justify-between">
                        <span>Document Request Summary</span>
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                          Live Active
                        </Badge>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" /> Source
                          </span>
                          <span className="font-semibold text-foreground">
                            {docConfig.approvalSource === "hierarchy" ? "Employee Hierarchy" : "Custom Approvers"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Sliders className="h-3.5 w-3.5 text-primary" /> Approval Type
                          </span>
                          <span className="font-semibold text-foreground capitalize">{docConfig.approvalType}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Active Levels
                          </span>
                          <span className="font-semibold text-emerald-600">
                            {activeLevels.length} of {docConfig.levels.length}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" /> Escalation
                          </span>
                          <span className="font-semibold text-foreground">
                            {docConfig.approvalType === "sequential" && docConfig.autoEscalation?.enabled
                              ? `Every ${docConfig.autoEscalation.days} Days`
                              : "Disabled"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border space-y-4">
                        <div className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                          Approval Flow Preview
                        </div>

                        <div className="space-y-3 relative pl-4 border-l-2 border-blue-500/40 ml-2">
                          {activeLevels.map((lvl, lIdx) => (
                            <div key={lvl.level} className="relative flex items-center gap-3">
                              <div className="absolute -left-[23px] h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] font-bold grid place-items-center">
                                {lIdx + 1}
                              </div>
                              <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs grid place-items-center shrink-0 overflow-hidden">
                                {initials(lvl.approverName || "User")}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate">{lvl.approverName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{lvl.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Footer Fixed Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur border-t border-border flex items-center justify-between z-20 px-6 sm:px-10">
          <Button variant="outline" size="sm" onClick={resetApprovalSettingsToDefault} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Reset to Default
          </Button>
          <Button
            size="sm"
            onClick={saveApprovalSettings}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 px-6 shadow-soft"
          >
            <Save className="h-4 w-4" /> Save {activeApprovalTab === "attendance" ? "Attendance" : activeApprovalTab === "grievance" ? "Grievance" : "Document Request"} Settings
          </Button>
        </div>

        {/* Grievance Type Modal */}
        <Dialog open={grievanceModalOpen} onOpenChange={setGrievanceModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGrievanceType ? "Edit Grievance Type" : "Add New Grievance Type"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Grievance Type Name</Label>
                <Input value={grvName} onChange={(e) => setGrvName(e.target.value)} placeholder="e.g. Workplace Safety" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={grvDesc} onChange={(e) => setGrvDesc(e.target.value)} placeholder="Explain the grievance category..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGrievanceModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 text-white"
                onClick={() => {
                  if (!grvName.trim()) return toast.error("Name is required");
                  const newType: GrievanceTypeItem = {
                    id: editingGrievanceType?.id || `grv-${Date.now()}`,
                    name: grvName.trim(),
                    description: grvDesc.trim() || "Custom grievance category",
                    active: true,
                  };
                  const nextTypes = editingGrievanceType
                    ? grvConfig.grievanceTypes.map((t) => (t.id === editingGrievanceType.id ? newType : t))
                    : [...grvConfig.grievanceTypes, newType];
                  setApprovalSettingsDraft({
                    ...approvalSettingsDraft,
                    grievance: { ...grvConfig, grievanceTypes: nextTypes },
                  });
                  setGrievanceModalOpen(false);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =========================================================================
  // MAIN ORGANIZATION STRUCTURE TREE & GRID VIEW
  // =========================================================================
  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Network className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <div className="text-sm text-muted-foreground">Add employees first to build your organization structure.</div>
      </div>
    );
  }

  const groupOrder = [
    ...branches.map((b) => b.id),
    ...(byBranch.has("__unassigned") ? ["__unassigned"] : []),
  ].filter((k) => byBranch.has(k));

  const totalPeople = employees.length;
  const managerCount = new Set(employees.map((e) => e.managerId).filter(Boolean) as string[]).size;
  const topLevel = employees.filter((e) => !e.managerId || !byId.has(e.managerId)).length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" /> Organization Structure
          </h1>
          <p className="text-sm text-muted-foreground">
            One manager can have any number of direct reports. Click Approval Settings on any member to configure their request pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            <Users className="h-3.5 w-3.5" /> {totalPeople} people · {managerCount} managers · {topLevel} at top
          </div>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, code, department..." className="h-9 pl-8 w-60" />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All branches</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              <SelectItem value="__unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
            <Button variant={view === "tree" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setView("tree")}>
              <GitBranch className="h-3.5 w-3.5 mr-1" /> Tree
            </Button>
            <Button variant={view === "grid" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setView("grid")}>
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Grid
            </Button>
          </div>
          {view === "tree" && (
            <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
              <Button variant="ghost" size="sm" className="rounded-none h-9" onClick={expandAll} title="Expand all">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-none h-9" onClick={collapseAll} title="Collapse all">
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {groupOrder.map((key) => {
          const list = byBranch.get(key)!;
          const branch = branches.find((b) => b.id === key);
          const cmap = childrenMapFor(list);
          const roots = cmap.get(undefined) ?? [];
          return (
            <section key={key} className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-soft">
              <header className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-border">
                <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-soft shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold flex items-center gap-2 flex-wrap">
                    {branch ? branch.name : "Unassigned"}
                    {branch?.isHead && <Badge className="bg-primary text-primary-foreground text-[10px]">HQ</Badge>}
                    <Badge variant="outline" className="text-[10px]">{list.length} people</Badge>
                    <Badge variant="outline" className="text-[10px]">{roots.length} top-level</Badge>
                    {branch?.radiusMeters && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Geo-fence {branch.radiusMeters}m</span>}
                  </div>
                </div>
              </header>

              {view === "tree" ? (
                <div className="overflow-x-auto pb-6 pt-2">
                  <div className="flex flex-col items-center gap-8 min-w-max">
                    <div className="flex gap-12 justify-center flex-wrap">
                      {roots.map((r) => (
                        <OrgNode
                          key={r.id}
                          emp={r}
                          childrenOf={cmap}
                          byId={byId}
                          onEdit={openEdit}
                          onApprovalSettings={openApprovalSettings}
                          branchName={branch?.name}
                          collapsed={collapsed}
                          toggleCollapsed={toggleCollapsed}
                          matchIds={matchIds}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {list.map((emp) => {
                    const manager = emp.managerId ? byId.get(emp.managerId) : undefined;
                    const directs = cmap.get(emp.id) ?? [];
                    return (
                      <NameBadge
                        key={emp.id}
                        emp={emp}
                        manager={manager}
                        directs={directs}
                        onEdit={openEdit}
                        onApprovalSettings={openApprovalSettings}
                        branchName={branch?.name}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Edit Basic Info Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization Role · {target?.name}</DialogTitle>
            <DialogDescription>Update reporting manager and department assignments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reports To (Manager)</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Top of Company (No Manager)</SelectItem>
                  {employees.filter((e) => e.id !== target?.id).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.empCode}) · {e.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Branch Location</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} {b.isHead ? "(HQ)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>About</Label>
              <Textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Short biography..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-gradient-brand text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrgNode({
  emp, childrenOf, byId, onEdit, onApprovalSettings, branchName, collapsed, toggleCollapsed, matchIds,
}: {
  emp: Employee;
  childrenOf: Map<string | undefined, Employee[]>;
  byId: Map<string, Employee>;
  onEdit: (e: Employee) => void;
  onApprovalSettings: (e: Employee, tab?: ApprovalTab) => void;
  branchName?: string;
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  matchIds: Set<string> | null;
}) {
  const kids = childrenOf.get(emp.id) ?? [];
  const manager = emp.managerId ? byId.get(emp.managerId) : undefined;
  const isCollapsed = collapsed.has(emp.id) && kids.length > 0;
  const dim = matchIds && !matchIds.has(emp.id);

  const CHUNK = 6;
  const rows: Employee[][] = [];
  if (!isCollapsed && kids.length > 0) {
    for (let i = 0; i < kids.length; i += CHUNK) rows.push(kids.slice(i, i + CHUNK));
  }

  return (
    <div className={`flex flex-col items-center ${dim ? "opacity-40" : ""}`}>
      <div className="relative">
        <NameBadge
          emp={emp}
          manager={manager}
          directs={kids}
          onEdit={onEdit}
          onApprovalSettings={onApprovalSettings}
          branchName={branchName}
        />
        {kids.length > 0 && (
          <button
            onClick={() => toggleCollapsed(emp.id)}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft hover:scale-110 transition-transform z-10"
            title={isCollapsed ? `Expand ${kids.length} reports` : "Collapse team"}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {!isCollapsed && rows.length > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col gap-3">
            {rows.map((row, ri) => (
              <div key={ri} className="flex gap-6 relative justify-center">
                {row.length > 1 && (
                  <div
                    className="absolute top-0 h-px bg-border"
                    style={{ left: `${14 * 8}px`, right: `${14 * 8}px` }}
                  />
                )}
                {row.map((k) => (
                  <div key={k.id} className="flex flex-col items-center">
                    <div className="w-px h-4 bg-border" />
                    <OrgNode
                      emp={k}
                      childrenOf={childrenOf}
                      byId={byId}
                      onEdit={onEdit}
                      onApprovalSettings={onApprovalSettings}
                      branchName={branchName}
                      collapsed={collapsed}
                      toggleCollapsed={toggleCollapsed}
                      matchIds={matchIds}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NameBadge({
  emp, manager, directs, onEdit, onApprovalSettings, branchName,
}: {
  emp: Employee;
  manager?: Employee;
  directs: Employee[];
  onEdit: (e: Employee) => void;
  onApprovalSettings: (e: Employee, tab?: ApprovalTab) => void;
  branchName?: string;
}) {
  const teamSize = directs.length;
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div className={`w-[15rem] rounded-2xl border bg-card p-3.5 shadow-soft hover:shadow-glow transition-all cursor-pointer group relative ${teamSize > 0 ? "border-primary/40" : "border-border"}`}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0">
              {emp.photoDataUrl ? <img src={emp.photoDataUrl} className="h-full w-full object-cover" alt={emp.name} /> : <span className="font-semibold">{initials(emp.name)}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-foreground">{emp.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{emp.designation}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => { e.stopPropagation(); onEdit(emp); }}
              title="Edit Profile"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{emp.department}</Badge>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{emp.empCode}</Badge>
            {teamSize > 0 && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" /> {teamSize}
              </Badge>
            )}
          </div>

          {/* Quick Action Button for Approval Settings */}
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(emp);
              }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] flex-1 font-medium bg-primary/5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onApprovalSettings(emp, "grievance");
              }}
            >
              <Sliders className="h-3 w-3" /> Approval Settings
            </Button>
          </div>
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="w-80" side="right" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0">
              {emp.photoDataUrl ? <img src={emp.photoDataUrl} className="h-full w-full object-cover" alt={emp.name} /> : <span className="font-semibold text-lg">{initials(emp.name)}</span>}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate text-foreground">{emp.name}</div>
              <div className="text-xs text-muted-foreground truncate">{emp.designation} · {emp.department}</div>
              <div className="text-[11px] text-muted-foreground">Emp Code {emp.empCode} · Joined {emp.doj}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => onEdit(emp)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              className="w-full text-xs bg-primary text-primary-foreground"
              onClick={() => onApprovalSettings(emp, "grievance")}
            >
              <Sliders className="h-3.5 w-3.5 mr-1" /> Approvals
            </Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
