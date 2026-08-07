import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, type PredefinedRole, type RolePermissions, type DocumentPermissionTypes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  ShieldCheck, Plus, Search, Users, CheckCircle2, Lock, Edit2, Trash2,
  FileCheck, Shield, Sparkles, AlertCircle, Copy, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({ meta: [{ title: "Role Creation · SWIFT HRMS" }] }),
  component: RoleCreationPage,
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

const defaultPermissions: RolePermissions = {
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

function RoleCreationPage() {
  const { roles, addRole, updateRole, deleteRole, employees } = useStore();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PredefinedRole | null>(null);

  // Form states
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
    setPermissions({ ...defaultPermissions, documentTypes: { ...defaultDocPermissions } });
    setModalOpen(true);
  };

  const openEditModal = (role: PredefinedRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description);
    setPermissions({
      ...defaultPermissions,
      ...role.permissions,
      documentTypes: {
        ...defaultDocPermissions,
        ...(role.permissions?.documentTypes ?? {}),
      },
    });
    setModalOpen(true);
  };

  const handleTogglePermission = (key: keyof Omit<RolePermissions, "documentTypes">) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleDocType = (docKey: keyof DocumentPermissionTypes) => {
    setPermissions((prev) => ({
      ...prev,
      documentTypes: {
        ...prev.documentTypes,
        [docKey]: !prev.documentTypes[docKey],
      },
    }));
  };

  const handleToggleAllDocTypes = (enabled: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      documentTypes: {
        offerLetter: enabled,
        appointmentLetter: enabled,
        incrementLetter: enabled,
        promotionLetter: enabled,
        relievingLetter: enabled,
        experienceLetter: enabled,
        salaryCertificate: enabled,
        warningLetter: enabled,
        showCauseNotice: enabled,
      },
    }));
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error("Role Name is required");
      return;
    }

    if (editingRole) {
      updateRole(editingRole.id, {
        name: roleName.trim(),
        description: roleDesc.trim(),
        permissions,
      });
      toast.success(`Role "${roleName.trim()}" updated successfully`);
    } else {
      addRole({
        name: roleName.trim(),
        description: roleDesc.trim(),
        permissions,
      });
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
      toast.success(`Role "${role.name}" deleted.`);
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  );

  const getAssignedCount = (role: PredefinedRole) => {
    return employees.filter((e) => e.roleId === role.id || e.roleName === role.name || (role.isSystemDefault && e.designation === role.name)).length;
  };

  const countEnabledPermissions = (p: RolePermissions) => {
    let count = 0;
    if (p.leaveApproval) count++;
    if (p.attendanceApproval) count++;
    if (p.payrollDashboard) count++;
    if (p.employeeManagement) count++;
    if (p.expenseHandloanApproval) count++;
    if (p.invoiceApproval) count++;
    if (p.resignationApproval) count++;
    if (p.assetManagement) count++;
    if (p.noticesAnnouncements) count++;
    if (p.performanceReviews) count++;
    if (p.auditLogView) count++;
    if (p.documentsApproval) {
      const docCount = Object.values(p.documentTypes ?? {}).filter(Boolean).length;
      count += docCount;
    }
    return count;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Role Creation & Permissions</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Define predefined roles and assign granular approval rights to employees during registration.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-gradient-brand text-white shadow-soft">
          <Plus className="h-4 w-4 mr-2" /> Create New Role
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Configured Roles</div>
            <div className="text-xl font-bold">{roles.length}</div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Predefined System Roles</div>
            <div className="text-xl font-bold">{roles.filter((r) => r.isSystemDefault).length}</div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Custom Created Roles</div>
            <div className="text-xl font-bold">{roles.filter((r) => !r.isSystemDefault).length}</div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Assigned Employees</div>
            <div className="text-xl font-bold">{employees.length}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles by title or permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredRoles.map((role) => {
            const assignedCount = getAssignedCount(role);
            const activePermsCount = countEnabledPermissions(role.permissions);

            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card rounded-2xl border border-border p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{role.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {role.description || "No custom description provided."}
                      </p>
                    </div>
                    {role.isSystemDefault ? (
                      <Badge variant="secondary" className="text-[10px] uppercase font-semibold shrink-0">
                        System Default
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] uppercase font-semibold bg-primary/10 text-primary hover:bg-primary/20 shrink-0">
                        Custom
                      </Badge>
                    )}
                  </div>

                  <div className="my-4 pt-3 border-t border-border/60 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Permissions Configured</span>
                      <span className="text-primary font-bold">{activePermsCount} Active</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {role.permissions?.leaveApproval && (
                        <Badge variant="outline" className="text-[11px] bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                          Leave Approval
                        </Badge>
                      )}
                      {role.permissions?.attendanceApproval && (
                        <Badge variant="outline" className="text-[11px] bg-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/20">
                          Attendance Approval
                        </Badge>
                      )}
                      {role.permissions?.payrollDashboard && (
                        <Badge variant="outline" className="text-[11px] bg-purple-500/5 text-purple-700 dark:text-purple-400 border-purple-500/20">
                          Payroll Access
                        </Badge>
                      )}
                      {role.permissions?.expenseHandloanApproval && (
                        <Badge variant="outline" className="text-[11px] bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20">
                          Expense & Loan
                        </Badge>
                      )}
                      {role.permissions?.documentsApproval && (
                        <Badge variant="outline" className="text-[11px] bg-indigo-500/5 text-indigo-700 dark:text-indigo-400 border-indigo-500/20">
                          Doc Approvals ({Object.values(role.permissions.documentTypes ?? {}).filter(Boolean).length})
                        </Badge>
                      )}
                      {role.permissions?.resignationApproval && (
                        <Badge variant="outline" className="text-[11px] bg-rose-500/5 text-rose-700 dark:text-rose-400 border-rose-500/20">
                          Resignation Approval
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Users className="h-3.5 w-3.5" />
                    <span>{assignedCount} Assigned</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(role)} title="Edit Role">
                      <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    {!role.isSystemDefault && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(role)} title="Delete Role">
                        <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveRole}>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {editingRole ? `Edit Role: ${editingRole.name}` : "Create Predefined Role"}
              </DialogTitle>
              <DialogDescription>
                Set role title and configure exact authorization rights for leaves, attendance, documents, and approvals.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roleName" className="font-semibold">
                    Role Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="roleName"
                    placeholder="e.g., Engineering Team Lead, HR Executive"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roleDesc" className="font-semibold">
                    Description & Responsibility Scope
                  </Label>
                  <Input
                    id="roleDesc"
                    placeholder="e.g. Approves team leaves, documents, and expense requests."
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                  />
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Role Permissions Matrix
                  </h4>
                  <span className="text-xs text-muted-foreground">Toggle features enabled for this role</span>
                </div>

                {/* Core Approvals Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Leave Approval</div>
                      <div className="text-xs text-muted-foreground">Approve/reject employee leave applications</div>
                    </div>
                    <Switch
                      checked={permissions.leaveApproval}
                      onCheckedChange={() => handleTogglePermission("leaveApproval")}
                    />
                  </div>

                  <div className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Attendance Approval</div>
                      <div className="text-xs text-muted-foreground">Approve attendance regularization & OT</div>
                    </div>
                    <Switch
                      checked={permissions.attendanceApproval}
                      onCheckedChange={() => handleTogglePermission("attendanceApproval")}
                    />
                  </div>

                  <div className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Payroll Dashboard Access</div>
                      <div className="text-xs text-muted-foreground">View payroll processing & salary slips</div>
                    </div>
                    <Switch
                      checked={permissions.payrollDashboard}
                      onCheckedChange={() => handleTogglePermission("payrollDashboard")}
                    />
                  </div>

                  <div className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Employee Management</div>
                      <div className="text-xs text-muted-foreground">Register, transfer & manage employee records</div>
                    </div>
                    <Switch
                      checked={permissions.employeeManagement}
                      onCheckedChange={() => handleTogglePermission("employeeManagement")}
                    />
                  </div>

                  <div className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Expense & Handloan Approval</div>
                      <div className="text-xs text-muted-foreground">Approve expense claims and salary advances</div>
                    </div>
                    <Switch
                      checked={permissions.expenseHandloanApproval}
                      onCheckedChange={() => handleTogglePermission("expenseHandloanApproval")}
                    />
                  </div>

                  <div className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Invoice Approval</div>
                      <div className="text-xs text-muted-foreground">Approve vendor & client billing invoices</div>
                    </div>
                    <Switch
                      checked={permissions.invoiceApproval}
                      onCheckedChange={() => handleTogglePermission("invoiceApproval")}
                    />
                  </div>

                  <div className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Resignation Approval</div>
                      <div className="text-xs text-muted-foreground">Approve employee exit & notice period waivers</div>
                    </div>
                    <Switch
                      checked={permissions.resignationApproval}
                      onCheckedChange={() => handleTogglePermission("resignationApproval")}
                    />
                  </div>

                  <div className="bg-card p-3.5 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Asset Management</div>
                      <div className="text-xs text-muted-foreground">Assign, return and manage company assets</div>
                    </div>
                    <Switch
                      checked={permissions.assetManagement}
                      onCheckedChange={() => handleTogglePermission("assetManagement")}
                    />
                  </div>
                </div>

                {/* Documents Approval Accordion/Box with Subcategories */}
                <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm font-bold">Documents Approval Permissions</div>
                        <div className="text-xs text-muted-foreground">
                          Select which document letters this role can approve or issue
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={permissions.documentsApproval}
                      onCheckedChange={() => handleTogglePermission("documentsApproval")}
                    />
                  </div>

                  {permissions.documentsApproval && (
                    <div className="pt-3 border-t border-border space-y-3 bg-muted/30 p-3.5 rounded-lg">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                        <span>Document Types Allowed for Approval:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAllDocTypes(true)}
                            className="text-primary hover:underline"
                          >
                            Select All
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleAllDocTypes(false)}
                            className="text-muted-foreground hover:underline"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.offerLetter ?? true}
                            onCheckedChange={() => handleToggleDocType("offerLetter")}
                          />
                          <span>Offer Letter</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.appointmentLetter ?? true}
                            onCheckedChange={() => handleToggleDocType("appointmentLetter")}
                          />
                          <span>Appointment Letter</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.incrementLetter ?? true}
                            onCheckedChange={() => handleToggleDocType("incrementLetter")}
                          />
                          <span>Increment Letter</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.promotionLetter ?? true}
                            onCheckedChange={() => handleToggleDocType("promotionLetter")}
                          />
                          <span>Promotion Letter</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.relievingLetter ?? true}
                            onCheckedChange={() => handleToggleDocType("relievingLetter")}
                          />
                          <span>Relieving Letter</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.experienceLetter ?? true}
                            onCheckedChange={() => handleToggleDocType("experienceLetter")}
                          />
                          <span>Experience Letter</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.salaryCertificate ?? true}
                            onCheckedChange={() => handleToggleDocType("salaryCertificate")}
                          />
                          <span>Salary Certificate</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.warningLetter ?? true}
                            onCheckedChange={() => handleToggleDocType("warningLetter")}
                          />
                          <span>Warning Letter</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                          <Checkbox
                            checked={permissions.documentTypes?.showCauseNotice ?? true}
                            onCheckedChange={() => handleToggleDocType("showCauseNotice")}
                          />
                          <span>Show Cause Notice</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-brand text-white shadow-soft">
                {editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
