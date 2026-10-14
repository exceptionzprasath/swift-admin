import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, type Employee } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserX,
  Search,
  Calendar,
  FileText,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  UserCheck,
  FileDown,
  ChevronDown,
  Trash2,
  Users,
  ShieldAlert,
  ArrowRight,
  Snowflake,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteEmployeeDialog } from "@/components/delete-employee-dialog";
import { EmploymentTypeBadge } from "@/components/employment-type-badge";
import { renderEmployeeStatusBadge } from "@/routes/admin.employees";

export const Route = createFileRoute("/admin/past-employees")({
  head: () => ({ meta: [{ title: "Past Employees · CreatonsHR" }] }),
  component: PastEmployeesPage,
});

export function PastEmployeesPage() {
  const navigate = useNavigate();
  const { employees, company, updateEmployee, deleteEmployee } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "freezed" | "suspended" | "relieved" | "terminated">("all");
  const [selectedDept, setSelectedDept] = useState("all");

  // Reactivate, Unfreeze & Delete modal states
  const [reactivateTarget, setReactivateTarget] = useState<Employee | null>(null);
  const [unfreezeTarget, setUnfreezeTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  // Past employees are those with status suspended, relieved, terminated, or frozen
  const pastEmployees = useMemo(() => {
    return employees.filter((e) => {
      const s = (e.status || "active").toLowerCase().trim();
      return s === "suspended" || s === "relieved" || s === "releived" || s === "terminated" || s === "inactive" || s === "frozen" || s === "freezed";
    });
  }, [employees]);

  // Counts for tabs & KPI cards
  const kpis = useMemo(() => {
    let suspended = 0;
    let relieved = 0;
    let terminated = 0;
    let freezed = 0;

    for (const e of pastEmployees) {
      const s = (e.status || "").toLowerCase().trim();
      if (s === "suspended") suspended++;
      else if (s === "relieved" || s === "releived") relieved++;
      else if (s === "terminated") terminated++;
      else if (s === "frozen" || s === "freezed") freezed++;
    }

    return {
      total: pastEmployees.length,
      suspended,
      relieved,
      terminated,
      freezed,
    };
  }, [pastEmployees]);

  // Departments list from past employees
  const departments = useMemo(() => {
    const set = new Set<string>();
    pastEmployees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pastEmployees]);

  // Filtered rows
  const filteredPastEmployees = useMemo(() => {
    return pastEmployees.filter((e) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (e.name || "").toLowerCase().includes(q);
        const matchesCode = (e.empCode || "").toLowerCase().includes(q);
        const matchesDept = (e.department || "").toLowerCase().includes(q);
        const matchesDesignation = (e.designation || "").toLowerCase().includes(q);
        const matchesNote = (e.statusNote || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDept && !matchesDesignation && !matchesNote) return false;
      }

      // Status
      if (selectedStatus !== "all") {
        const s = (e.status || "").toLowerCase().trim();
        if (selectedStatus === "relieved") {
          if (s !== "relieved" && s !== "releived") return false;
        } else if (selectedStatus === "freezed") {
          if (s !== "frozen" && s !== "freezed") return false;
        } else if (s !== selectedStatus) {
          return false;
        }
      }

      // Department
      if (selectedDept !== "all" && e.department !== selectedDept) return false;

      return true;
    });
  }, [pastEmployees, searchQuery, selectedStatus, selectedDept]);

  // Handle 1-click reactivation
  const handleConfirmReactivate = () => {
    if (!reactivateTarget) return;
    updateEmployee(reactivateTarget.id, {
      status: "active",
      statusNote: `Reactivated on ${new Date().toISOString().slice(0, 10)}${reactivateTarget.statusNote ? ` (Prior note: ${reactivateTarget.statusNote})` : ""}`,
    });
    toast.success(`${reactivateTarget.name} has been restored to Active status! They will now show in the Attendance area.`);
    setReactivateTarget(null);
  };

  // Handle 1-click unfreeze
  const handleConfirmUnfreeze = () => {
    if (!unfreezeTarget) return;
    updateEmployee(unfreezeTarget.id, {
      status: "active",
      statusNote: `Unfrozen on ${new Date().toISOString().slice(0, 10)}${unfreezeTarget.statusNote ? ` (Prior note: ${unfreezeTarget.statusNote})` : ""}`,
    });
    toast.success(`${unfreezeTarget.name} has been unfrozen and restored to Active status! They will now show in the Employees directory, Attendance, and Payroll.`);
    setUnfreezeTarget(null);
  };

  // Export past employees to CSV
  const handleExportCSV = () => {
    if (filteredPastEmployees.length === 0) {
      toast.error("No past employees to export");
      return;
    }

    const headers = ["Employee Code", "Name", "Department", "Designation", "Employment Type", "Status", "Status Date", "Note", "Joining Date"];
    const rows = filteredPastEmployees.map((e) => [
      `"${e.empCode || ""}"`,
      `"${e.name || ""}"`,
      `"${e.department || ""}"`,
      `"${e.designation || ""}"`,
      `"${e.employmentType || "Regular"}"`,
      `"${e.status?.toUpperCase() || ""}"`,
      `"${e.statusDate || "—"}"`,
      `"${(e.statusNote || "—").replace(/"/g, '""')}"`,
      `"${e.doj || "—"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Past_Employees_${company.name || "Company"}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Past employees CSV downloaded.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Past Employees</span>
                <Badge variant="outline" className="text-xs font-mono font-medium bg-muted">
                  {pastEmployees.length} Records
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Archived records for relieved, suspended, and terminated personnel with exit dates and notes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/admin/employees" })}
            className="text-xs gap-1.5"
          >
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>Active Employees</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs gap-1.5 border-border hover:bg-muted"
          >
            <FileDown className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="rounded-2xl border-border bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Total Past Staff</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{kpis.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Excluded from active ops</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-sky-500/20 bg-sky-500/5">
          <CardContent className="p-4">
            <div className="text-xs text-sky-700 dark:text-sky-300 font-medium">Freezed</div>
            <div className="text-2xl font-bold mt-1 text-sky-700 dark:text-sky-300">{kpis.freezed}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Hidden &amp; Preserved</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-4">
            <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Relieved</div>
            <div className="text-2xl font-bold mt-1 text-purple-700 dark:text-purple-300">{kpis.relieved}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Resigned / Relieved</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">Suspended</div>
            <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">{kpis.suspended}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Temporarily inactive</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-4">
            <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">Terminated</div>
            <div className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-300">{kpis.terminated}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Employment terminated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        {/* Status Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "All Past", count: kpis.total },
            { id: "freezed", label: "Freezed Employees", count: kpis.freezed },
            { id: "relieved", label: "Relieved", count: kpis.relieved },
            { id: "suspended", label: "Suspended", count: kpis.suspended },
            { id: "terminated", label: "Terminated", count: kpis.terminated },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                selectedStatus === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedStatus === tab.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, code, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-8 text-xs rounded-xl w-36">
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
          )}
        </div>
      </div>

      {/* Past Employees Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[850px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left font-semibold text-muted-foreground">
                <th className="p-3 pl-4 whitespace-nowrap">Employee</th>
                <th className="p-3 whitespace-nowrap">Status</th>
                <th className="p-3 whitespace-nowrap">Status Date</th>
                <th className="p-3 whitespace-nowrap">Reason / Note</th>
                <th className="p-3 whitespace-nowrap">Department &amp; Branch</th>
                <th className="p-3 text-right pr-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-border">
            {filteredPastEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground">
                  <div className="max-w-md mx-auto space-y-2">
                    <UserX className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="text-sm font-medium text-foreground">No past employees found</p>
                    <p className="text-xs text-muted-foreground">
                      {pastEmployees.length === 0
                        ? "When employees are marked as Suspended, Relieved, or Terminated in the Employees menu, they will automatically be archived here with their departure date and exit notes."
                        : "No records match your selected filter criteria."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPastEmployees.map((e) => {
                const assignedBranch = (company.branches || []).find((b) => b.id === e.branchId);

                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    {/* Employee Profile */}
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full ring-1 ring-border overflow-hidden bg-muted flex items-center justify-center font-bold text-xs shrink-0 text-muted-foreground">
                          {e.photoDataUrl ? (
                            <img src={e.photoDataUrl} className="h-full w-full object-cover" alt={e.name} />
                          ) : (
                            e.name.split(" ").slice(0, 2).map((s) => s[0]).join("")
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                            <span>{e.name}</span>
                            <EmploymentTypeBadge type={e.employmentType} />
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {e.empCode} · {e.designation || "No Designation"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3">
                      {renderEmployeeStatusBadge(e.status)}
                    </td>

                    {/* Status / Departure Date */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{e.statusDate || e.doj || "—"}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Joined: {e.doj || "—"}
                      </div>
                    </td>

                    {/* Reason / Note */}
                    <td className="p-3 max-w-xs">
                      {e.statusNote ? (
                        <div className="flex items-start gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-[11.5px] text-foreground font-normal line-clamp-2" title={e.statusNote}>
                            {e.statusNote}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">No note recorded</span>
                      )}
                    </td>

                    {/* Department & Branch */}
                    <td className="p-3 text-muted-foreground">
                      <div className="font-medium text-foreground text-xs">{e.department || "General"}</div>
                      <div className="text-[11px] flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 text-muted-foreground/70" />
                        <span>{assignedBranch?.name || "All Branches"}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {e.status === "frozen" || e.status === "freezed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUnfreezeTarget(e)}
                            className="h-7 px-2.5 text-xs gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400 font-medium"
                            title="Unfreeze employee and restore back to active operations"
                          >
                            <Snowflake className="h-3 w-3" />
                            <span>Unfreeze</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReactivateTarget(e)}
                            className="h-7 px-2 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                            title="Restore employee back to Active status"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Reactivate</span>
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <span className="sr-only">Open menu</span>
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuLabel>Past Employee Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {e.status === "frozen" || e.status === "freezed" ? (
                              <DropdownMenuItem
                                onClick={() => setUnfreezeTarget(e)}
                                className="gap-2 text-sky-600 focus:text-sky-600 cursor-pointer"
                              >
                                <Snowflake className="h-3.5 w-3.5" />
                                <span>Unfreeze Employee</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setReactivateTarget(e)}
                                className="gap-2 text-emerald-600 focus:text-emerald-600 cursor-pointer"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Reactivate Employee</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(e)}
                              className="gap-2 text-rose-600 focus:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Permanently</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Confirmation Modal: Reactivate Employee */}
      <Dialog open={!!reactivateTarget} onOpenChange={(o) => !o && setReactivateTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Reactivate Employee?</DialogTitle>
                <DialogDescription className="text-xs">
                  Restore active employment status for {reactivateTarget?.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2 text-muted-foreground">
            <p>
              Reactivating will change <strong className="text-foreground">{reactivateTarget?.name}</strong>'s status from{" "}
              <span className="font-semibold text-foreground uppercase">{reactivateTarget?.status}</span> to{" "}
              <strong className="text-emerald-600">ACTIVE</strong>.
            </p>
            <div className="p-2.5 rounded-xl bg-muted/50 border border-border space-y-1">
              <div className="text-[11px] font-medium text-foreground">What happens next:</div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-muted-foreground">
                <li>Employee will return to the active Employees Directory.</li>
                <li>Employee will resume tracking in the Attendance Area.</li>
                <li>Mobile app login restrictions will be lifted.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReactivateTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmReactivate}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm Reactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal: Unfreeze Employee */}
      <Dialog open={!!unfreezeTarget} onOpenChange={(o) => !o && setUnfreezeTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 border border-sky-500/20">
                <Snowflake className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Unfreeze Employee?</DialogTitle>
                <DialogDescription className="text-xs">
                  Restore active operational status for {unfreezeTarget?.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2 text-muted-foreground">
            <p>
              Unfreezing will restore <strong className="text-foreground">{unfreezeTarget?.name}</strong> back to{" "}
              <strong className="text-emerald-600">ACTIVE</strong> status.
            </p>
            <div className="p-2.5 rounded-xl bg-muted/50 border border-border space-y-1">
              <div className="text-[11px] font-medium text-foreground">What happens next:</div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-muted-foreground">
                <li>Employee will return to the active Employees Directory.</li>
                <li>Employee will resume eligibility in Attendance &amp; Shift Rosters.</li>
                <li>Employee will become eligible in monthly Payroll runs.</li>
                <li>All historical documents, salary setups, and KYC remain intact.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnfreezeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmUnfreeze}
              className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold"
            >
              <Snowflake className="h-3.5 w-3.5" />
              Unfreeze Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation Dialog with Slide Button */}
      <DeleteEmployeeDialog
        employee={deleteTarget}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirmDelete={(emp) => {
          deleteEmployee(emp.id);
          toast.success(`Employee ${emp.name} permanently deleted.`);
        }}
      />
    </div>
  );
}
