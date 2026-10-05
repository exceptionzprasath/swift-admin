import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  useStore,
  type PredefinedRole,
  type RolePermissions,
  type DocumentPermissionTypes,
  type ModuleKey,
  type ModulePermission,
  type DashboardViewType,
} from "@/lib/store";
import {
  MODULE_REGISTRY,
  resolveModulePermissions,
  useRolePreview,
  DEFAULT_FULL_MODULE_PERMISSION,
  DEFAULT_READONLY_MODULE_PERMISSION,
  DEFAULT_DISABLED_MODULE_PERMISSION,
} from "@/lib/roles-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Lock,
  Edit2,
  Trash2,
  FileCheck,
  Shield,
  Sparkles,
  AlertCircle,
  Eye,
  Pencil,
  Trash,
  LayoutDashboard,
  Check,
  X,
  UserPlus,
  PanelLeft,
  ChevronRight,
  HelpCircle,
  Briefcase,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({ meta: [{ title: "Roles & Responsibilities · CreatonsHR" }] }),
  component: RolesAndResponsibilitiesPage,
});

const defaultDocPermissions: DocumentPermissionTypes = {
  offerLetter: true,
  appointmentLetter: true,
  incrementLetter: true,
  promotionLetter: true,
  relievingLetter: true,
  experienceLetter: true,
  salaryCertificate: true,
  warningLetter: true,
  showCauseNotice: true,
};

const defaultLegacyPermissions: RolePermissions = {
  leaveApproval: true,
  attendanceApproval: true,
  payrollDashboard: false,
  employeeManagement: false,
  expenseHandloanApproval: true,
  documentsApproval: true,
  documentTypes: { ...defaultDocPermissions },
  invoiceApproval: false,
  resignationApproval: true,
  assetManagement: false,
  noticesAnnouncements: true,
  performanceReviews: true,
  auditLogView: false,
};

function RolesAndResponsibilitiesPage() {
  const { roles, addRole, updateRole, deleteRole, employees, updateEmployee } = useStore();
  const { previewRoleId, setPreviewRoleId } = useRolePreview();
  const [search, setSearch] = useState("");
  const [roleTypeFilter, setRoleTypeFilter] = useState<"all" | "system" | "custom">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRoleForAssign, setSelectedRoleForAssign] = useState<PredefinedRole | null>(null);
  const [activeModalTab, setActiveModalTab] = useState("permissions");

  // Editing state
  const [editingRole, setEditingRole] = useState<PredefinedRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [dashboardView, setDashboardView] = useState<DashboardViewType>("hr");
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [newRespInput, setNewRespInput] = useState("");
  const [modules, setModules] = useState<Record<ModuleKey, ModulePermission>>({} as any);
  const [permissions, setPermissions] = useState<RolePermissions>(defaultLegacyPermissions);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
    setDashboardView("hr");
    setResponsibilities([
      "Execute standard operations for this position",
      "Process assigned approval tickets and notifications",
    ]);
    setPermissions({ ...defaultLegacyPermissions, documentTypes: { ...defaultDocPermissions } });
    setModules(resolveModulePermissions(null));
    setActiveModalTab("profile");
    setModalOpen(true);
  };

  const openEditModal = (role: PredefinedRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description);
    setDashboardView(role.dashboardView || "hr");
    setResponsibilities(
      role.responsibilities && role.responsibilities.length > 0
        ? [...role.responsibilities]
        : ["Execute standard operations for this position"]
    );
    setPermissions({
      ...defaultLegacyPermissions,
      ...role.permissions,
      documentTypes: {
        ...defaultDocPermissions,
        ...(role.permissions?.documentTypes ?? {}),
      },
    });
    setModules(resolveModulePermissions(role));
    setActiveModalTab("permissions");
    setModalOpen(true);
  };

  const handleAddResponsibility = () => {
    if (!newRespInput.trim()) return;
    setResponsibilities([...responsibilities, newRespInput.trim()]);
    setNewRespInput("");
  };

  const handleRemoveResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, idx) => idx !== index));
  };

  // Module permission toggles
  const handleToggleSidebar = (key: ModuleKey) => {
    setModules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabledInSidebar: !prev[key].enabledInSidebar,
        // If enabling sidebar, ensure read is also true
        canRead: !prev[key].enabledInSidebar ? true : prev[key].canRead,
      },
    }));
  };

  const handleToggleRead = (key: ModuleKey) => {
    setModules((prev) => {
      const newRead = !prev[key].canRead;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          canRead: newRead,
          // If read is disabled, write & delete must be disabled too
          canWrite: newRead ? prev[key].canWrite : false,
          canDelete: newRead ? prev[key].canDelete : false,
          enabledInSidebar: newRead ? prev[key].enabledInSidebar : false,
        },
      };
    });
  };

  const handleToggleWrite = (key: ModuleKey) => {
    setModules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        canWrite: !prev[key].canWrite,
        // If write is enabled, ensure read is enabled
        canRead: !prev[key].canWrite ? true : prev[key].canRead,
      },
    }));
  };

  const handleToggleDelete = (key: ModuleKey) => {
    setModules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        canDelete: !prev[key].canDelete,
        // If delete is enabled, ensure read & write are enabled
        canRead: !prev[key].canDelete ? true : prev[key].canRead,
        canWrite: !prev[key].canDelete ? true : prev[key].canWrite,
      },
    }));
  };

  // Quick Preset Actions
  const applyPreset = (preset: "full" | "readonly" | "operations" | "minimal") => {
    const next: Record<ModuleKey, ModulePermission> = {} as any;
    for (const key of Object.keys(MODULE_REGISTRY) as ModuleKey[]) {
      if (preset === "full") {
        next[key] = { enabledInSidebar: true, canRead: true, canWrite: true, canDelete: true };
      } else if (preset === "readonly") {
        next[key] = { enabledInSidebar: true, canRead: true, canWrite: false, canDelete: false };
      } else if (preset === "operations") {
        const isOp = ["dashboard", "requests", "attendance", "leaveCalendar", "shiftRoster", "teamChat", "notices"].includes(key);
        next[key] = {
          enabledInSidebar: isOp,
          canRead: isOp,
          canWrite: isOp,
          canDelete: false,
        };
      } else {
        const isMin = ["dashboard", "leaveCalendar", "notices", "teamChat"].includes(key);
        next[key] = {
          enabledInSidebar: isMin,
          canRead: isMin,
          canWrite: isMin && key === "teamChat",
          canDelete: false,
        };
      }
    }
    setModules(next);
    toast.info(`Applied ${preset.toUpperCase()} permissions preset`);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error("Role Name is required");
      return;
    }

    const payload = {
      name: roleName.trim(),
      description: roleDesc.trim(),
      dashboardView,
      responsibilities: responsibilities.filter(Boolean),
      modules,
      permissions: {
        ...permissions,
        payrollDashboard: !!modules.payroll?.canRead,
        employeeManagement: !!modules.employees?.canWrite,
        attendanceApproval: !!modules.attendance?.canWrite,
        leaveApproval: !!modules.leaveCalendar?.canWrite,
        documentsApproval: !!modules.documentation?.canWrite,
        noticesAnnouncements: !!modules.notices?.canWrite,
      },
    };

    if (editingRole) {
      updateRole(editingRole.id, payload);
      toast.success(`Role "${roleName.trim()}" updated successfully`);
    } else {
      addRole(payload);
      toast.success(`New Role "${roleName.trim()}" created successfully`);
    }

    setModalOpen(false);
  };

  const handleDelete = (role: PredefinedRole) => {
    if (role.isSystemDefault) {
      toast.error("System default roles cannot be deleted.");
      return;
    }
    const assignedCount = employees.filter((e) => e.roleId === role.id || e.roleName === role.name).length;
    if (assignedCount > 0) {
      toast.error(`Cannot delete role "${role.name}" because it is currently assigned to ${assignedCount} employee(s).`);
      return;
    }

    if (confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      deleteRole(role.id);
      if (previewRoleId === role.id) setPreviewRoleId(null);
      toast.success(`Role "${role.name}" deleted.`);
    }
  };

  // Open direct employee assignment modal
  const openAssignModal = (role: PredefinedRole) => {
    setSelectedRoleForAssign(role);
    setAssignModalOpen(true);
  };

  const toggleEmployeeRoleAssignment = (empId: string, currentAssigned: boolean) => {
    if (!selectedRoleForAssign) return;
    if (currentAssigned) {
      // Unassign
      updateEmployee(empId, { roleId: undefined, roleName: undefined });
      toast.info("Role unassigned from employee");
    } else {
      // Assign
      updateEmployee(empId, { roleId: selectedRoleForAssign.id, roleName: selectedRoleForAssign.name });
      toast.success(`Assigned ${selectedRoleForAssign.name} to employee`);
    }
  };

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      if (roleTypeFilter === "system") return matchSearch && r.isSystemDefault;
      if (roleTypeFilter === "custom") return matchSearch && !r.isSystemDefault;
      return matchSearch;
    });
  }, [roles, search, roleTypeFilter]);

  const getAssignedCount = (role: PredefinedRole) => {
    return employees.filter(
      (e) => e.roleId === role.id || e.roleName === role.name || (role.isSystemDefault && e.designation === role.name)
    ).length;
  };

  // Count active modules and CRUD actions
  const getRoleMetrics = (role: PredefinedRole) => {
    const modMap = resolveModulePermissions(role);
    let sidebarCount = 0;
    let readCount = 0;
    let writeCount = 0;
    let deleteCount = 0;

    for (const m of Object.values(modMap)) {
      if (m.enabledInSidebar) sidebarCount++;
      if (m.canRead) readCount++;
      if (m.canWrite) writeCount++;
      if (m.canDelete) deleteCount++;
    }

    return { sidebarCount, readCount, writeCount, deleteCount };
  };

  // Group modules by category for the permissions matrix editor
  const modulesByCategory = useMemo(() => {
    const categories: Record<string, ModuleKey[]> = {
      Core: [],
      Workforce: [],
      Operations: [],
      "Finance & Legal": [],
      System: [],
    };
    for (const key of Object.keys(MODULE_REGISTRY) as ModuleKey[]) {
      const cat = MODULE_REGISTRY[key].category;
      categories[cat].push(key);
    }
    return categories;
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Roles & Responsibilities</h1>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold border-none">
              RBAC Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Configure job positions, customize side-panel feature visibility, assign specific dashboards,
            and enforce granular Read, Write, and Delete access rights per employee.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {previewRoleId && (
            <Button
              variant="outline"
              onClick={() => {
                setPreviewRoleId(null);
                toast.info("Exited role preview mode");
              }}
              className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
            >
              Exit Preview Mode
            </Button>
          )}
          <Button onClick={openCreateModal} className="bg-gradient-brand text-white shadow-soft">
            <Plus className="h-4 w-4 mr-2" /> Create New Role
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Configured Roles</div>
            <div className="text-xl font-bold">{roles.length} Positions</div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Standard Roles</div>
            <div className="text-xl font-bold">{roles.filter((r) => r.isSystemDefault).length} Built-in</div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Custom Company Roles</div>
            <div className="text-xl font-bold">{roles.filter((r) => !r.isSystemDefault).length} Custom</div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Employees</div>
            <div className="text-xl font-bold">{employees.length} Members</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles by title, responsibility, or permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={roleTypeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleTypeFilter("all")}
            className="rounded-full text-xs"
          >
            All Roles ({roles.length})
          </Button>
          <Button
            variant={roleTypeFilter === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleTypeFilter("system")}
            className="rounded-full text-xs"
          >
            System Defaults
          </Button>
          <Button
            variant={roleTypeFilter === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleTypeFilter("custom")}
            className="rounded-full text-xs"
          >
            Custom Roles
          </Button>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredRoles.map((role) => {
            const assignedCount = getAssignedCount(role);
            const metrics = getRoleMetrics(role);
            const isCurrentlyPreviewed = previewRoleId === role.id;

            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-card rounded-2xl border p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all ${
                  isCurrentlyPreviewed
                    ? "border-primary ring-2 ring-primary/30 bg-primary/[0.02]"
                    : "border-border"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold tracking-tight">{role.name}</h3>
                        {isCurrentlyPreviewed && (
                          <Badge className="text-[10px] bg-primary text-primary-foreground font-bold">
                            Active Preview
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {role.description || "No description provided."}
                      </p>
                    </div>
                    {role.isSystemDefault ? (
                      <Badge variant="secondary" className="text-[10px] uppercase font-semibold shrink-0">
                        Built-in
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] uppercase font-semibold bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 shrink-0">
                        Custom
                      </Badge>
                    )}
                  </div>

                  {/* Dashboard View & Responsibilities preview */}
                  <div className="my-3 py-2 px-3 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                      <LayoutDashboard className="h-3.5 w-3.5 text-primary" /> Target Dashboard:
                    </span>
                    <Badge variant="outline" className="text-[11px] font-semibold capitalize bg-card">
                      {role.dashboardView || "hr"} Dashboard
                    </Badge>
                  </div>

                  {/* Key Responsibilities */}
                  {role.responsibilities && role.responsibilities.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> Core Responsibilities:
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                        {role.responsibilities.slice(0, 2).map((resp, idx) => (
                          <li key={idx} className="line-clamp-1">
                            {resp}
                          </li>
                        ))}
                        {role.responsibilities.length > 2 && (
                          <li className="text-[11px] text-primary font-medium list-none">
                            +{role.responsibilities.length - 2} more responsibilities
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Permissions & Side Panel Features Summary */}
                  <div className="pt-3 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <PanelLeft className="h-3.5 w-3.5 text-primary" /> Side-Panel Features
                      </span>
                      <span className="text-foreground font-bold">{metrics.sidebarCount} Enabled</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/20">
                        <Eye className="h-3 w-3 mr-1" /> {metrics.readCount} Read
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                        <Pencil className="h-3 w-3 mr-1" /> {metrics.writeCount} Write
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-rose-500/5 text-rose-700 dark:text-rose-400 border-rose-500/20">
                        <Trash className="h-3 w-3 mr-1" /> {metrics.deleteCount} Delete
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                  <button
                    onClick={() => openAssignModal(role)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>{assignedCount} Assigned</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant={isCurrentlyPreviewed ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (isCurrentlyPreviewed) {
                          setPreviewRoleId(null);
                          toast.info("Exited role preview mode");
                        } else {
                          setPreviewRoleId(role.id);
                          toast.success(`Previewing sidebar & dashboard as "${role.name}"`);
                        }
                      }}
                      className="text-xs h-8 px-2.5"
                      title="Preview how this role sees the sidebar & dashboard"
                    >
                      {isCurrentlyPreviewed ? "Active" : "Preview"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(role)} title="Edit Role">
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    {!role.isSystemDefault && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(role)} title="Delete Role">
                        <Trash2 className="h-3.5 w-3.5 text-destructive hover:text-destructive/80" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Role Creation / Editing Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSaveRole} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role & Responsibilities"}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Define position responsibilities, customize side-panel visibility, and assign granular CRUD permissions.
                  </DialogDescription>
                </div>
              </div>

              {/* Tabs Navigation */}
              <Tabs value={activeModalTab} onValueChange={setActiveModalTab} className="pt-3">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                  <TabsTrigger value="profile">Profile & Scope</TabsTrigger>
                  <TabsTrigger value="permissions">Side Panel & CRUD</TabsTrigger>
                  <TabsTrigger value="documents">Doc Approvals</TabsTrigger>
                </TabsList>
              </Tabs>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: Profile & Scope */}
              {activeModalTab === "profile" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleName" className="font-semibold text-sm">
                        Role / Position Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="roleName"
                        placeholder="e.g. Operations Manager, Payroll Specialist, Team Lead"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dashboardView" className="font-semibold text-sm">
                        Target Dashboard View
                      </Label>
                      <select
                        id="dashboardView"
                        value={dashboardView}
                        onChange={(e) => setDashboardView(e.target.value as DashboardViewType)}
                        className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="hr">HR Manager Dashboard (Headcount, Leaves, Onboarding)</option>
                        <option value="manager">Team Lead / Manager Dashboard (Team Attendance, Roster, Requests)</option>
                        <option value="finance">Finance Dashboard (Payroll Runs, Revisions, Claims)</option>
                        <option value="executive">Executive / Owner Overview (High-level Company Metrics)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roleDesc" className="font-semibold text-sm">
                      Position Overview & Responsibility Scope
                    </Label>
                    <Input
                      id="roleDesc"
                      placeholder="e.g. Oversees team roster schedules, verifies leaves, and manages daily biometric attendance."
                      value={roleDesc}
                      onChange={(e) => setRoleDesc(e.target.value)}
                    />
                  </div>

                  {/* Responsibilities Builder */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-primary" /> Key Responsibilities (Duties & Scope)
                      </Label>
                      <span className="text-xs text-muted-foreground">Displayed on employee profile and access cards</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add a key responsibility (e.g. 'Approve direct report leave requests')"
                        value={newRespInput}
                        onChange={(e) => setNewRespInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddResponsibility();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddResponsibility} variant="secondary">
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>

                    <div className="space-y-2 pt-2">
                      {responsibilities.map((resp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/40 border border-border text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            <span>{resp}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveResponsibility(idx)}
                            className="text-muted-foreground hover:text-destructive text-xs p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Side Panel & CRUD Matrix */}
              {activeModalTab === "permissions" && (
                <div className="space-y-5">
                  {/* Preset Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick Permission Presets:
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => applyPreset("full")}
                        className="h-7 text-xs rounded-lg"
                      >
                        Full Administrator
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => applyPreset("operations")}
                        className="h-7 text-xs rounded-lg"
                      >
                        Operations & Approvals
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => applyPreset("readonly")}
                        className="h-7 text-xs rounded-lg"
                      >
                        Read-Only Auditor
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => applyPreset("minimal")}
                        className="h-7 text-xs rounded-lg"
                      >
                        Minimal Staff
                      </Button>
                    </div>
                  </div>

                  {/* Modules Table */}
                  <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-muted/60 p-3 grid grid-cols-12 gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <div className="col-span-5">Feature Module</div>
                      <div className="col-span-3 text-center">Side Panel Visible</div>
                      <div className="col-span-4 grid grid-cols-3 text-center">
                        <span>Read</span>
                        <span>Write</span>
                        <span>Delete</span>
                      </div>
                    </div>

                    <div className="divide-y divide-border/60 max-h-[50vh] overflow-y-auto">
                      {Object.entries(modulesByCategory).map(([category, moduleKeys]) => (
                        <div key={category} className="bg-card">
                          <div className="bg-muted/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary border-b border-border/40">
                            {category} Modules
                          </div>
                          {moduleKeys.map((key) => {
                            const meta = MODULE_REGISTRY[key];
                            const perm = modules[key] || DEFAULT_DISABLED_MODULE_PERMISSION;

                            return (
                              <div
                                key={key}
                                className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/10 transition-colors"
                              >
                                <div className="col-span-5 pr-2">
                                  <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                    <span>{meta.label}</span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground line-clamp-1">{meta.description}</div>
                                </div>

                                <div className="col-span-3 flex justify-center">
                                  <Switch
                                    checked={perm.enabledInSidebar}
                                    onCheckedChange={() => handleToggleSidebar(key)}
                                    title="Toggle visibility in side panel navigation"
                                  />
                                </div>

                                <div className="col-span-4 grid grid-cols-3 items-center justify-items-center">
                                  <Checkbox
                                    checked={perm.canRead}
                                    onCheckedChange={() => handleToggleRead(key)}
                                    title="Can view page and read records"
                                  />
                                  <Checkbox
                                    checked={perm.canWrite}
                                    onCheckedChange={() => handleToggleWrite(key)}
                                    title="Can create, edit, and approve records"
                                  />
                                  <Checkbox
                                    checked={perm.canDelete}
                                    onCheckedChange={() => handleToggleDelete(key)}
                                    title="Can permanently delete records"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Document Approvals */}
              {activeModalTab === "documents" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <h4 className="font-semibold text-sm mb-1">Employment Document Generation Rights</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      Select which official company letters and certificates this position is authorized to draft and approve.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.keys(defaultDocPermissions).map((docKey) => {
                        const key = docKey as keyof DocumentPermissionTypes;
                        const isEnabled = !!permissions.documentTypes?.[key];

                        return (
                          <div
                            key={key}
                            onClick={() => {
                              setPermissions((prev) => ({
                                ...prev,
                                documentTypes: {
                                  ...prev.documentTypes,
                                  [key]: !prev.documentTypes[key],
                                },
                              }));
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isEnabled
                                ? "bg-primary/5 border-primary/40 text-foreground"
                                : "bg-card border-border text-muted-foreground opacity-70"
                            }`}
                          >
                            <span className="text-sm font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1")}
                            </span>
                            <Checkbox checked={isEnabled} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 border-t border-border shrink-0 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                {activeModalTab === "profile" && (
                  <Button type="button" onClick={() => setActiveModalTab("permissions")}>
                    Next: Set Permissions <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {activeModalTab === "permissions" && (
                  <Button type="button" onClick={() => setActiveModalTab("documents")}>
                    Next: Document Rights <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                <Button type="submit" className="bg-gradient-brand text-white shadow-soft">
                  Save Role & Responsibilities
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Direct Employee Assignment Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Assign Employees to {selectedRoleForAssign?.name}
            </DialogTitle>
            <DialogDescription>
              Check employees below to assign this role. Employees with this role will inherit its side-panel features and permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active employee records found in this organization.
              </div>
            ) : (
              employees.map((emp) => {
                const isAssigned =
                  emp.roleId === selectedRoleForAssign?.id || emp.roleName === selectedRoleForAssign?.name;

                return (
                  <div
                    key={emp.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isAssigned ? "bg-primary/5 border-primary/40" : "bg-card border-border hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        {(emp.name || "E")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.empCode} · {emp.designation || emp.department || "Staff Member"}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isAssigned ? "default" : "outline"}
                      onClick={() => toggleEmployeeRoleAssignment(emp.id, isAssigned)}
                      className="text-xs"
                    >
                      {isAssigned ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" /> Assigned
                        </>
                      ) : (
                        "Assign Role"
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setAssignModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
