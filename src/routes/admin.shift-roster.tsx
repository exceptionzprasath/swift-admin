import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStore, ShiftType, ShiftAssignment, Employee, isMockEmployee, isFrozenEmployee, isActiveEmployee } from "@/lib/store";
import {
  Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Search, Building2, CheckCircle2, Users, CalendarDays,
  Trash2, Edit2, Sparkles, Filter, Check, ArrowRight,
  Sun, Moon, Sunrise, Sunset, Layers, RefreshCw,
  FileSpreadsheet, Upload, Download, FileDown, AlertTriangle, FileText,
  Sliders, Timer, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { downloadRosterTemplate, parseRosterCsvText, type RosterParseResult } from "@/lib/bulk-roster";
import { aiNotify } from "@/lib/ai-guide-bus";

export const Route = createFileRoute("/admin/shift-roster")({
  head: () => ({ meta: [{ title: "Shift Roster & Shifts · CreatonsHR" }] }),
  component: RedirectToAttendanceShiftRoster,
});

function RedirectToAttendanceShiftRoster() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin/attendance", search: (prev: any) => ({ ...prev, tab: "shift-roster" }) as any, replace: true });
  }, [navigate]);

  return <ShiftRosterPage />;
}

const PRESET_COLORS = [
  { label: "Indigo", value: "indigo", bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30", solid: "#6366f1" },
  { label: "Emerald", value: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", solid: "#10b981" },
  { label: "Amber", value: "amber", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", solid: "#f59e0b" },
  { label: "Purple", value: "purple", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30", solid: "#a855f7" },
  { label: "Rose", value: "rose", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", solid: "#f43f5e" },
  { label: "Cyan", value: "cyan", bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30", solid: "#06b6d4" },
  { label: "Blue", value: "blue", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", solid: "#3b82f6" },
];

function getColorConfig(colorKey?: string) {
  return PRESET_COLORS.find((c) => c.value === colorKey) || PRESET_COLORS[0];
}

function getShiftIcon(startStr: string) {
  const hour = parseInt(startStr?.split(":")[0] || "9", 10);
  if (hour >= 5 && hour < 12) return Sunrise;
  if (hour >= 12 && hour < 17) return Sun;
  if (hour >= 17 && hour < 21) return Sunset;
  return Moon;
}

export function ShiftRosterPage({ isEmbedded = false }: { isEmbedded?: boolean } = {}) {
  const {
    company,
    setCompany,
    saveAllCompanySettings,
    employees: rawEmployees,
    roster,
    addShift,
    updateShift,
    deleteShift,
    assignRoster,
    bulkAssignRoster,
  } = useStore();

  const employees = useMemo(() => (rawEmployees || []).filter(isActiveEmployee), [rawEmployees]);

  const shifts = company.shifts || [];

  // Main Tab State
  const [activeTab, setActiveTab] = useState<"planner" | "shifts" | "policies">("planner");
  const [savingPolicies, setSavingPolicies] = useState(false);

  // Planner View Controls
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [plannerViewMode, setPlannerViewMode] = useState<"matrix" | "calendar">("matrix");

  // Shift Modal State
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<Partial<ShiftType>>({
    name: "",
    code: "",
    start: "09:00",
    end: "18:00",
    allowancePerDay: 0,
    graceTime: "15",
    afternoonGraceTime: "15",
    allowHalfDayLogin: true,
    halfDayLoginTime: "12:00",
    color: "indigo",
    description: "",
  });

  // Single Day Quick Assignment Dialog
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [quickAssignData, setQuickAssignData] = useState<{
    employeeId: string;
    employeeName: string;
    date: string;
    shiftId: string;
    graceTime: "always" | "10" | "15" | "20" | "25" | "30";
    afternoonGraceTime: "always" | "10" | "15" | "20" | "25" | "30";
    note?: string;
  } | null>(null);

  // Bulk Upload Excel/CSV Modal
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  // Bulk Assign Range Dialog
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    targetType: "single" as "single" | "department" | "all",
    employeeId: "",
    department: "Engineering",
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    shiftId: "gen",
    graceTime: "15" as "always" | "10" | "15" | "20" | "25" | "30",
    afternoonGraceTime: "15" as "always" | "10" | "15" | "20" | "25" | "30",
    allowHalfDayLogin: true,
    halfDayLoginTime: "12:00",
    skipWeekends: true,
  });

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Filtered employees
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.empCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === "all" || e.department === departmentFilter;
      const matchEmp = selectedEmployeeId === "all" || e.id === selectedEmployeeId;
      return matchSearch && matchDept && matchEmp;
    });
  }, [employees, searchTerm, departmentFilter, selectedEmployeeId]);

  // Map of roster assignments keyed by `employeeId_YYYY-MM-DD`
  const rosterMap = useMemo(() => {
    const map = new Map<string, ShiftAssignment>();
    (roster || []).forEach((r) => {
      map.set(`${r.employeeId}_${r.date}`, r);
    });
    return map;
  }, [roster]);

  // Helper: Calculate duration between start and end times (handles overnight shifts)
  const getClockSpanHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(":").map((v) => parseInt(v, 10) || 0);
    const [eH, eM] = end.split(":").map((v) => parseInt(v, 10) || 0);
    let sTotal = sH * 60 + sM;
    let eTotal = eH * 60 + eM;
    let diff = eTotal - sTotal;
    if (diff <= 0) diff += 1440;
    return Math.round((diff / 60) * 10) / 10;
  };

  // Handlers for Shift Master
  const handleOpenNewShift = () => {
    const defaultStart = "09:00";
    const defaultEnd = "18:00";
    const span = getClockSpanHours(defaultStart, defaultEnd);
    setEditingShiftId(null);
    setShiftForm({
      name: "",
      code: "",
      start: defaultStart,
      end: defaultEnd,
      workingHours: span === 9 ? 8 : span,
      workingDaysPerMonth: company.workingDaysPerMonth ?? 26,
      isSaturdayWorking: true,
      isSundayWorking: false,
      allowancePerDay: 0,
      graceTime: "15",
      afternoonGraceTime: "15",
      allowHalfDayLogin: true,
      halfDayLoginTime: "12:00",
      color: "indigo",
      description: "",
    });
    setShiftDialogOpen(true);
  };

  const handleEditShift = (s: ShiftType) => {
    setEditingShiftId(s.id);
    setShiftForm({
      name: s.name,
      code: s.code || "",
      start: s.start,
      end: s.end,
      workingHours: s.workingHours ?? company.workingHoursPerDay ?? 8,
      workingDaysPerMonth: s.workingDaysPerMonth ?? company.workingDaysPerMonth ?? 26,
      isSaturdayWorking: s.isSaturdayWorking !== undefined ? s.isSaturdayWorking : true,
      isSundayWorking: s.isSundayWorking !== undefined ? s.isSundayWorking : false,
      allowancePerDay: s.allowancePerDay || 0,
      graceTime: s.graceTime || "15",
      afternoonGraceTime: s.afternoonGraceTime || "15",
      allowHalfDayLogin: s.allowHalfDayLogin !== false,
      halfDayLoginTime: s.halfDayLoginTime || "12:00",
      color: s.color || "indigo",
      description: s.description || "",
    });
    setShiftDialogOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name?.trim()) {
      toast.error("Please enter a shift name.");
      return;
    }
    if (!shiftForm.start || !shiftForm.end) {
      toast.error("Please specify both shift start and end times.");
      return;
    }

    if (editingShiftId) {
      updateShift(editingShiftId, {
        name: shiftForm.name.trim(),
        code: shiftForm.code?.trim().toUpperCase() || shiftForm.name.slice(0, 3).toUpperCase(),
        start: shiftForm.start,
        end: shiftForm.end,
        workingHours: shiftForm.workingHours ? +shiftForm.workingHours : (company.workingHoursPerDay ?? 8),
        workingDaysPerMonth: shiftForm.workingDaysPerMonth ? +shiftForm.workingDaysPerMonth : (company.workingDaysPerMonth ?? 26),
        isSaturdayWorking: shiftForm.isSaturdayWorking !== false,
        isSundayWorking: Boolean(shiftForm.isSundayWorking),
        allowancePerDay: +(shiftForm.allowancePerDay || 0),
        graceTime: shiftForm.graceTime,
        afternoonGraceTime: shiftForm.afternoonGraceTime,
        allowHalfDayLogin: shiftForm.allowHalfDayLogin,
        halfDayLoginTime: shiftForm.halfDayLoginTime,
        color: shiftForm.color || "indigo",
        description: shiftForm.description?.trim(),
      });
      toast.success(`Shift "${shiftForm.name}" updated successfully!`);
    } else {
      addShift({
        name: shiftForm.name.trim(),
        code: shiftForm.code?.trim().toUpperCase() || shiftForm.name.slice(0, 3).toUpperCase(),
        start: shiftForm.start,
        end: shiftForm.end,
        workingHours: shiftForm.workingHours ? +shiftForm.workingHours : (company.workingHoursPerDay ?? 8),
        workingDaysPerMonth: shiftForm.workingDaysPerMonth ? +shiftForm.workingDaysPerMonth : (company.workingDaysPerMonth ?? 26),
        isSaturdayWorking: shiftForm.isSaturdayWorking !== false,
        isSundayWorking: Boolean(shiftForm.isSundayWorking),
        allowancePerDay: +(shiftForm.allowancePerDay || 0),
        graceTime: shiftForm.graceTime,
        afternoonGraceTime: shiftForm.afternoonGraceTime,
        allowHalfDayLogin: shiftForm.allowHalfDayLogin,
        halfDayLoginTime: shiftForm.halfDayLoginTime,
        color: shiftForm.color || "indigo",
        description: shiftForm.description?.trim(),
      });
      toast.success(`New Shift "${shiftForm.name}" created and synced to employee register!`);
    }
    setShiftDialogOpen(false);
  };

  const handleDeleteShift = (id: string, name: string) => {
    if (shifts.length <= 1) {
      toast.error("You must maintain at least one default shift.");
      return;
    }
    deleteShift(id);
    toast.success(`Shift "${name}" deleted.`);
  };

  // Quick single day assign
  const handleCellClick = (emp: Employee, day: number) => {
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month + 1).padStart(2, "0");
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const existing = rosterMap.get(`${emp.id}_${dateStr}`);

    setQuickAssignData({
      employeeId: emp.id,
      employeeName: emp.name,
      date: dateStr,
      shiftId: existing ? existing.shiftId : emp.shiftId || "gen",
      graceTime: (existing?.graceTime || emp.graceTime || "15") as any,
      afternoonGraceTime: (existing?.afternoonGraceTime || emp.afternoonGraceTime || "15") as any,
      note: existing?.note || "",
    });
    setQuickAssignOpen(true);
  };

  const handleSaveQuickAssign = () => {
    if (!quickAssignData) return;
    const selectedShift = shifts.find((s) => s.id === quickAssignData.shiftId);

    assignRoster({
      employeeId: quickAssignData.employeeId,
      employeeName: quickAssignData.employeeName,
      date: quickAssignData.date,
      shiftId: quickAssignData.shiftId,
      shiftName: quickAssignData.shiftId === "off" ? "Weekly Off" : selectedShift?.name || "Shift",
      shiftStart: selectedShift?.start,
      shiftEnd: selectedShift?.end,
      graceTime: quickAssignData.graceTime,
      afternoonGraceTime: quickAssignData.afternoonGraceTime,
      note: quickAssignData.note,
    });

    toast.success(`Roster assigned for ${quickAssignData.employeeName} on ${quickAssignData.date}`);
    setQuickAssignOpen(false);
  };

  // Bulk Range Assignment
  const handleApplyBulkRoster = async () => {
    const { targetType, employeeId, department, fromDate, toDate, shiftId, graceTime, afternoonGraceTime, allowHalfDayLogin, halfDayLoginTime, skipWeekends } = bulkForm;

    if (!fromDate || !toDate) {
      toast.error("Please select a valid date range.");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      toast.error("From Date cannot be after To Date.");
      return;
    }

    let targetEmployees: Employee[] = [];
    if (targetType === "single") {
      const emp = employees.find((e) => e.id === employeeId);
      if (!emp) {
        toast.error("Please select an employee.");
        return;
      }
      targetEmployees = [emp];
    } else if (targetType === "department") {
      targetEmployees = employees.filter((e) => e.department === department);
      if (targetEmployees.length === 0) {
        toast.error(`No employees found in department "${department}".`);
        return;
      }
    } else {
      targetEmployees = employees;
    }

    const assignmentsToSave: ShiftAssignment[] = [];
    const selectedShift = shifts.find((s) => s.id === shiftId);

    for (const emp of targetEmployees) {
      const curr = new Date(fromDate);
      const end = new Date(toDate);

      while (curr <= end) {
        const dateStr = curr.toISOString().slice(0, 10);
        const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const appliedShiftId = skipWeekends && isWeekend ? "off" : shiftId;

        assignmentsToSave.push({
          id: `${emp.id}_${dateStr}`,
          employeeId: emp.id,
          employeeName: emp.name,
          empCode: emp.empCode,
          department: emp.department,
          date: dateStr,
          shiftId: appliedShiftId,
          shiftName: appliedShiftId === "off" ? "Weekly Off" : selectedShift?.name || "Assigned Shift",
          shiftStart: selectedShift?.start,
          shiftEnd: selectedShift?.end,
          graceTime,
          afternoonGraceTime,
          allowHalfDayLogin,
          halfDayLoginTime,
        });

        curr.setDate(curr.getDate() + 1);
      }
    }

    const count = await bulkAssignRoster(assignmentsToSave);
    toast.success(`Successfully scheduled ${count} shift assignments in advance!`);
    setBulkAssignOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Shift Roster Header & Navigation Toolbar */}
      <div className="space-y-4">
        {!isEmbedded && (
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Live Scheduler
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Configure custom company shifts, manage advance rotational rosters, and assign monthly shift timings with grace periods.
            </p>
          </div>
        )}        {/* Unified Control Bar: Tabs on Left, Actions on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 flex-wrap">
          {/* Frosted Capsule Tab Switcher - Sleek, Balanced & Non-wrapping */}
          <div className="inline-flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5 rounded-full border border-primary/35 dark:border-primary/45 bg-card/85 dark:bg-card/50 backdrop-blur-xl shadow-xs shadow-primary/5 shrink-0 max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("planner")}
              className={cn(
                "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap shrink-0",
                activeTab === "planner"
                  ? "text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === "planner" && (
                <motion.div
                  layoutId="shiftRosterActiveTabPill"
                  className="absolute inset-0 bg-primary rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Monthly Roster Planner</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("shifts")}
              className={cn(
                "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap shrink-0",
                activeTab === "shifts"
                  ? "text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === "shifts" && (
                <motion.div
                  layoutId="shiftRosterActiveTabPill"
                  className="absolute inset-0 bg-primary rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                <Layers className="h-4 w-4 shrink-0" />
                <span>Shift Master</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-1 px-1.5 py-0 text-[10px] font-bold rounded-full",
                    activeTab === "shifts"
                      ? "bg-white/20 text-white"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {shifts.length}
                </Badge>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("policies")}
              className={cn(
                "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap shrink-0",
                activeTab === "policies"
                  ? "text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === "policies" && (
                <motion.div
                  layoutId="shiftRosterActiveTabPill"
                  className="absolute inset-0 bg-primary rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                <Settings className="h-4 w-4 shrink-0" />
                <span>Settings</span>
              </span>
            </button>
          </div>

          {/* Action Buttons: Bulk Upload & Bulk Assign (ONLY in Monthly Roster Planner) */}
          {activeTab === "planner" && (
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkUploadOpen(true)}
                className="h-9 px-3.5 text-xs font-semibold rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span>Bulk Upload Roster (Excel / CSV)</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setBulkForm((prev) => ({
                    ...prev,
                    employeeId: employees[0]?.id || "",
                  }));
                  setBulkAssignOpen(true);
                }}
                className="h-9 px-3.5 text-xs font-semibold rounded-xl gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>+ Bulk Assign Month Shifts</span>
              </Button>
            </div>
          )}
        </div>
      </div>







      {/* TAB 1: MONTHLY ROSTER PLANNER */}
      {activeTab === "planner" && (
        <div className="space-y-4">
          {/* Filter & Controls Bar */}
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 flex-wrap">
              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-bold min-w-[140px] text-center">
                  {monthName} {year}
                </div>
                <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs text-primary font-semibold">
                  Today
                </Button>
              </div>

              {/* Search & Dept Filters */}
              <div className="flex items-center gap-3 flex-1 max-w-2xl flex-wrap justify-end">
                <div className="relative w-48">
                  <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search employee..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-40 h-9 text-xs">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                  <Button
                    variant={plannerViewMode === "matrix" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPlannerViewMode("matrix")}
                    className="h-8 text-xs px-2.5"
                  >
                    All Staff Matrix
                  </Button>
                  <Button
                    variant={plannerViewMode === "calendar" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {
                      if (selectedEmployeeId === "all" && employees[0]) {
                        setSelectedEmployeeId(employees[0].id);
                      }
                      setPlannerViewMode("calendar");
                    }}
                    className="h-8 text-xs px-2.5"
                  >
                    Employee Calendar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Legend Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-muted-foreground flex-wrap">
            <span className="font-semibold text-foreground">Shift Legend:</span>
            {shifts.map((s) => {
              const c = getColorConfig(s.color);
              return (
                <div key={s.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${c.bg} ${c.text} ${c.border} font-medium`}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.solid }} />
                  <span>{s.name} ({s.start}–{s.end})</span>
                </div>
              );
            })}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 font-medium">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span>OFF (Weekly Off)</span>
            </div>
          </div>

          {/* MATRIX VIEW: All Employees x Month Days */}
          {plannerViewMode === "matrix" && (
            <Card className="border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      <th className="p-3 font-semibold sticky left-0 bg-muted z-10 w-48 border-r border-border">
                        Employee & Code
                      </th>
                      {daysArray.map((day) => {
                        const dateObj = new Date(year, month, day);
                        const isSunday = dateObj.getDay() === 0;
                        const isSaturday = dateObj.getDay() === 6;
                        const isToday =
                          new Date().toISOString().slice(0, 10) ===
                          `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                        return (
                          <th
                            key={day}
                            className={`p-1.5 text-center font-semibold border-r border-border/60 min-w-[44px] ${
                              isToday
                                ? "bg-primary/15 text-primary font-bold"
                                : isSunday || isSaturday
                                ? "bg-muted/90 text-muted-foreground"
                                : ""
                            }`}
                          >
                            <div className="text-[10px] uppercase opacity-75">
                              {dateObj.toLocaleDateString("en-US", { weekday: "narrow" })}
                            </div>
                            <div className="text-xs">{day}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={daysInMonth + 1} className="p-8 text-center text-muted-foreground">
                          No employees matched the search/filter.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp, idx) => (
                        <tr
                          key={emp.id}
                          className={`border-b border-border/60 hover:bg-muted/30 transition-colors ${
                            idx % 2 === 0 ? "bg-card" : "bg-muted/10"
                          }`}
                        >
                          {/* Sticky Employee column */}
                          <td className="p-3 sticky left-0 bg-card z-10 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <div className="font-semibold text-foreground truncate max-w-[180px]">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>{emp.empCode}</span>
                              <span>•</span>
                              <span className="truncate">{emp.department || "General"}</span>
                            </div>
                          </td>

                          {/* Days Cells */}
                          {daysArray.map((day) => {
                            const dayStr = String(day).padStart(2, "0");
                            const monthStr = String(month + 1).padStart(2, "0");
                            const dateStr = `${year}-${monthStr}-${dayStr}`;
                            const assignment = rosterMap.get(`${emp.id}_${dateStr}`);

                            const effectiveShiftId = assignment ? assignment.shiftId : emp.shiftId || "gen";
                            const isOff = effectiveShiftId === "off";
                            const shiftObj = shifts.find((s) => s.id === effectiveShiftId);
                            const c = getColorConfig(shiftObj?.color);

                            return (
                              <td
                                key={day}
                                onClick={() => handleCellClick(emp, day)}
                                className="p-1 text-center border-r border-border/50 cursor-pointer hover:bg-primary/10 transition-colors"
                                title={`Click to assign shift for ${emp.name} on ${dateStr}`}
                              >
                                {isOff ? (
                                  <div className="py-1.5 px-1 rounded bg-slate-500/10 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                                    OFF
                                  </div>
                                ) : (
                                  <div
                                    className={`py-1 px-1 rounded border ${c.bg} ${c.text} ${c.border} text-[10px] font-bold truncate`}
                                  >
                                    {shiftObj?.code || shiftObj?.name.slice(0, 3).toUpperCase() || "GEN"}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* CALENDAR VIEW: Single Employee Month Grid */}
          {plannerViewMode === "calendar" && (
            <div className="space-y-4">
              <Card className="p-4 border border-border">
                <div className="flex items-center gap-4">
                  <Label className="text-xs font-semibold">Select Employee to View:</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="w-64 h-9 text-xs">
                      <SelectValue placeholder="Choose employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.empCode}) · {e.department || "General"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              {(() => {
                const targetEmp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];
                if (!targetEmp) return null;

                const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
                const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7;
                const weekHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                return (
                  <Card className="border border-border shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span>Monthly Shift Schedule for {targetEmp.name} ({targetEmp.empCode})</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Default Base Shift: {shifts.find((s) => s.id === targetEmp.shiftId)?.name || "General Shift"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {weekHeaders.map((w) => (
                        <div key={w} className="p-2 text-center text-xs font-bold text-muted-foreground uppercase">
                          {w}
                        </div>
                      ))}

                      {Array.from({ length: totalCells }).map((_, idx) => {
                        const day = idx - firstDayOfMonth + 1;
                        const isCurrentMonth = day > 0 && day <= daysInMonth;

                        if (!isCurrentMonth) {
                          return <div key={idx} className="h-28 rounded-xl bg-muted/20 border border-border/30 p-2" />;
                        }

                        const dayStr = String(day).padStart(2, "0");
                        const monthStr = String(month + 1).padStart(2, "0");
                        const dateStr = `${year}-${monthStr}-${dayStr}`;
                        const assignment = rosterMap.get(`${targetEmp.id}_${dateStr}`);

                        const effectiveShiftId = assignment ? assignment.shiftId : targetEmp.shiftId || "gen";
                        const isOff = effectiveShiftId === "off";
                        const shiftObj = shifts.find((s) => s.id === effectiveShiftId);
                        const c = getColorConfig(shiftObj?.color);
                        const IconComponent = shiftObj ? getShiftIcon(shiftObj.start) : Clock;

                        return (
                          <div
                            key={idx}
                            onClick={() => handleCellClick(targetEmp, day)}
                            className="h-28 rounded-xl border border-border bg-card p-2.5 flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">{day}</span>
                              {assignment && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary">
                                  Scheduled
                                </Badge>
                              )}
                            </div>

                            {isOff ? (
                              <div className="rounded-lg bg-slate-500/10 p-2 text-center border border-slate-500/20">
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Weekly Off</div>
                                <div className="text-[10px] text-muted-foreground">Holiday / Off</div>
                              </div>
                            ) : (
                              <div className={`rounded-lg p-2 border ${c.bg} ${c.border}`}>
                                <div className="flex items-center gap-1">
                                  <IconComponent className={`h-3.5 w-3.5 ${c.text}`} />
                                  <span className={`text-xs font-bold ${c.text} truncate`}>{shiftObj?.name || "Shift"}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                  ⏰ {shiftObj?.start} – {shiftObj?.end}
                                </div>
                                <div className="text-[9px] text-muted-foreground">
                                  Grace: {assignment?.graceTime || shiftObj?.graceTime || "15"}m
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SHIFT MASTER (CREATE & MANAGE SHIFTS ONE-BY-ONE) */}
      {activeTab === "shifts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Company Shift Profiles</h2>
              <p className="text-xs text-muted-foreground">
                All shifts configured here automatically appear in the Employee Registration and Edit dialogues.
              </p>
            </div>
            <Button onClick={handleOpenNewShift} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Shift</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((s) => {
              const c = getColorConfig(s.color);
              const IconComponent = getShiftIcon(s.start);

              return (
                <Card key={s.id} className="border border-border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                  <div className={`h-2 w-full`} style={{ backgroundColor: c.solid }} />
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${c.bg}`}>
                          <IconComponent className={`h-5 w-5 ${c.text}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <span>{s.name}</span>
                            {s.code && (
                              <Badge variant="outline" className={`text-[10px] ${c.bg} ${c.text} ${c.border}`}>
                                {s.code}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            ⏰ {s.start} – {s.end}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditShift(s)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteShift(s.id, s.name)} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-2.5 text-xs">
                    {s.description && (
                      <p className="text-muted-foreground text-xs">{s.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/70">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Standard Hours</span>
                        <div className="font-bold text-foreground">
                          {s.workingHours ?? company.workingHoursPerDay ?? 8} hrs/day
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Target Work Days</span>
                        <div className="font-bold text-foreground">
                          {s.workingDaysPerMonth ?? company.workingDaysPerMonth ?? 26} days/mo
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Morning Grace</span>
                        <div className="font-bold text-foreground">
                          {s.graceTime === "always" ? "Flexible (Always)" : `${s.graceTime || "15"} mins`}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Shift Allowance</span>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {s.allowancePerDay ? `₹${s.allowancePerDay}/day` : "₹0 (Standard)"}
                        </div>
                      </div>

                      <div className="space-y-0.5 col-span-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Weekend Schedule</span>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${s.isSaturdayWorking !== false ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-slate-500/10 text-slate-500"}`}>
                            Sat: {s.isSaturdayWorking !== false ? "Working" : "Off"}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${s.isSundayWorking ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-slate-500/10 text-slate-500"}`}>
                            Sun: {s.isSundayWorking ? "Working" : "Off"}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-0.5 col-span-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Afternoon Login Window</span>
                        <div className="font-medium text-foreground">
                          {s.allowHalfDayLogin !== false
                            ? `Allowed after ${s.halfDayLoginTime || "12:00 PM"}`
                            : "Locked for full day on late"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS (Fallback Work Day Settings & Late Restriction Settings) */}
      {activeTab === "policies" && (
        <div className="space-y-6 max-w-5xl">
          {/* Section 1: Work Day Settings - Company Default Fallback */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Work Day &amp; Operating Hours Settings</CardTitle>
                    <CardDescription className="text-xs">
                      Default baseline used as a company fallback for any employees or shifts without custom hours in Shift Master.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-semibold bg-muted/40">
                  Company Default Fallback
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Default Working Days / Month</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Standard: 26 days</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={company.workingDaysPerMonth ?? 26}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(31, Number(e.target.value) || 26));
                      setCompany({ workingDaysPerMonth: val });
                    }}
                    className="font-semibold text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Fallback divisor for Loss of Pay (LOP) calculations. Note: Each shift profile in Shift Master overrides this per employee.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Default Working Hours / Day</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Standard: 8 hours</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    value={company.workingHoursPerDay ?? 8}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(24, Number(e.target.value) || 8));
                      setCompany({ workingHoursPerDay: val });
                    }}
                    className="font-semibold text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Fallback scheduled hours for overtime/permissions when not defined on the employee&apos;s shift profile.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Company Baseline Fallback: </span>
                    <span className="text-muted-foreground">
                      {(company.workingDaysPerMonth ?? 26)} Days × {(company.workingHoursPerDay ?? 8)} Hours ={" "}
                      <strong className="text-foreground">{(company.workingDaysPerMonth ?? 26) * (company.workingHoursPerDay ?? 8)} Scheduled Hours / Month</strong>
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-primary font-medium">Shifts in Shift Master override this</span>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Late Come Restriction Settings */}
          <div className="rounded-2xl border border-amber-500/25 bg-card p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Timer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Late Punch Deductions &amp; Restriction Settings
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        company.latePunchControlEnabled
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {company.latePunchControlEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Track monthly late check-ins by count or cumulative hours, deduct excess late minutes from Short Permission balances, or auto-convert excess late punches to Half-Day (HD).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center bg-muted/40 px-3.5 py-2 rounded-xl border border-border">
                <span className="text-xs font-semibold text-foreground">
                  {company.latePunchControlEnabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={Boolean(company.latePunchControlEnabled)}
                  onCheckedChange={(checked) => {
                    setCompany({
                      latePunchControlEnabled: checked,
                      lateLimitType: company.lateLimitType || "days",
                      maxLateDaysPerMonth: company.maxLateDaysPerMonth ?? 5,
                      maxLateHoursPerMonth: company.maxLateHoursPerMonth ?? 3,
                    });
                    toast.success(
                      checked
                        ? "Late Punch Deductions & Restriction Settings enabled"
                        : "Late Punch Deductions & Restriction Settings disabled"
                    );
                  }}
                />
              </div>
            </div>

            <div
              className={`grid transition-all duration-300 ease-in-out ${
                company.latePunchControlEnabled
                  ? "grid-rows-[1fr] opacity-100 pt-3 border-t border-border/60"
                  : "grid-rows-[0fr] opacity-0 pointer-events-none"
              }`}
            >
              <div className="overflow-hidden space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Step 1: Late Threshold Mode Switch */}
                  <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="inline-flex h-5 px-1.5 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase">
                            Step 1
                          </span>
                          Late Threshold Mode
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Choose whether monthly late limits are evaluated by day count or cumulative hours.
                        </p>
                      </div>

                      {/* Segmented Switch: By Days vs By Hours */}
                      <div className="inline-flex items-center rounded-xl border border-border bg-background p-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setCompany({ lateLimitType: "days" })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            (company.lateLimitType || "days") === "days"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          By Days
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompany({ lateLimitType: "hours" })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            company.lateLimitType === "hours"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          By Hours
                        </button>
                      </div>
                    </div>

                    {(company.lateLimitType || "days") === "days" ? (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <Label className="text-xs font-semibold text-foreground">
                          Max Allowed Late Days per Month
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={company.maxLateDaysPerMonth ?? 5}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setCompany({ maxLateDaysPerMonth: val });
                            }}
                            className="w-28 font-semibold"
                          />
                          <span className="text-xs text-muted-foreground font-medium">
                            Late Days / Month (Breaches on Day {(company.maxLateDaysPerMonth ?? 5) + 1})
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Employees can punch in late up to {company.maxLateDaysPerMonth ?? 5} days per month without penalty. Exceeding {company.maxLateDaysPerMonth ?? 5} days triggers the Next Step Action.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <Label className="text-xs font-semibold text-foreground">
                          Max Cumulative Late Hours per Month
                        </Label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="number"
                            min={0}
                            step="0.5"
                            value={company.maxLateHoursPerMonth ?? 3}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setCompany({ maxLateHoursPerMonth: val });
                            }}
                            className="w-28 font-semibold"
                          />
                          <span className="text-xs text-muted-foreground font-medium">
                            Hours ({Math.round((company.maxLateHoursPerMonth ?? 3) * 60)} minutes / month)
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Cumulative late minutes across the month are tracked. Once cumulative late time exceeds {company.maxLateHoursPerMonth ?? 3} hours, the Next Step Action triggers.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Next Step Penalty Actions (When Limit is Exceeded) */}
                  <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span className="inline-flex h-5 px-1.5 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase">
                          Step 2
                        </span>
                        Next Step Penalty Actions (When Limit is Exceeded)
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Configure automatic actions once an employee breaches their monthly late threshold.
                      </p>
                    </div>

                    {/* Option 1 Toggle: Deduct from Short Permission */}
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          Deduct from Short Permission
                        </Label>
                        <Switch
                          checked={Boolean(company.latePermissionDeductionEnabled)}
                          onCheckedChange={(checked) =>
                            setCompany({ latePermissionDeductionEnabled: checked })
                          }
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Automatically deduct excess late minutes from the employee&apos;s available monthly Short Permission balance.
                      </p>
                    </div>

                    {/* Option 2 Toggle: Convert to Half-Day (HD) */}
                    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs font-bold text-orange-700 dark:text-orange-300">
                          Convert to Half-Day (HD)
                        </Label>
                        <Switch
                          checked={Boolean(company.lateHalfDayConversionEnabled)}
                          onCheckedChange={(checked) =>
                            setCompany({ lateHalfDayConversionEnabled: checked })
                          }
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Once the late limit is exceeded (and any available Short Permission balance is exhausted), every subsequent late punch in the month automatically converts that day&apos;s status to Half-Day (0.5 Paid Day).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button for Policies */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={async () => {
                setSavingPolicies(true);
                try {
                  await saveAllCompanySettings();
                  toast.success("Roster and workday settings saved to cloud database!");
                } catch (e: any) {
                  toast.error("Failed to save settings: " + (e?.message || e));
                } finally {
                  setSavingPolicies(false);
                }
              }}
              disabled={savingPolicies}
              className="gap-2 bg-primary text-primary-foreground font-semibold px-6 h-10 rounded-xl shadow-xs"
            >
              {savingPolicies ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{savingPolicies ? "Saving Settings..." : "Save Settings"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* DIALOG 1: CREATE / EDIT SHIFT MASTER */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>{editingShiftId ? "Edit Shift Profile" : "Create New Shift Profile"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure shift working hours, grace time window, and shift allowances.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveShift} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Shift Name *</Label>
                <Input
                  placeholder="e.g. Afternoon Rotational Shift"
                  value={shiftForm.name || ""}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Shift Code</Label>
                <Input
                  placeholder="e.g. AFT / MORN"
                  value={shiftForm.code || ""}
                  onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                  className="text-xs uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Shift Start Time *</Label>
                <Input
                  type="time"
                  value={shiftForm.start || "09:00"}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const span = getClockSpanHours(newStart, shiftForm.end || "18:00");
                    const autoWorkHours = span === 9 ? 8 : span;
                    setShiftForm((prev) => ({
                      ...prev,
                      start: newStart,
                      workingHours: autoWorkHours,
                    }));
                  }}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Shift End Time *</Label>
                <Input
                  type="time"
                  value={shiftForm.end || "18:00"}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    const span = getClockSpanHours(shiftForm.start || "09:00", newEnd);
                    const autoWorkHours = span === 9 ? 8 : span;
                    setShiftForm((prev) => ({
                      ...prev,
                      end: newEnd,
                      workingHours: autoWorkHours,
                    }));
                  }}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Standard Work Hours / Day</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  placeholder={String(company.workingHoursPerDay ?? 8)}
                  value={shiftForm.workingHours ?? ""}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      workingHours: e.target.value ? +e.target.value : undefined,
                    })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Target Work Days / Month</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  max="31"
                  placeholder={String(company.workingDaysPerMonth ?? 26)}
                  value={shiftForm.workingDaysPerMonth ?? ""}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      workingDaysPerMonth: e.target.value ? +e.target.value : undefined,
                    })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            {/* Saturday & Sunday Working Day Toggles */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border/70 bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="toggle-sat-work" className="text-xs font-semibold cursor-pointer">
                    Saturday Working Day
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    {shiftForm.isSaturdayWorking !== false ? "Working Day" : "Weekly Off"}
                  </p>
                </div>
                <Switch
                  id="toggle-sat-work"
                  checked={shiftForm.isSaturdayWorking !== false}
                  onCheckedChange={(checked) =>
                    setShiftForm((prev) => ({
                      ...prev,
                      isSaturdayWorking: checked,
                      workingDaysPerMonth: checked ? 26 : 22,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="toggle-sun-work" className="text-xs font-semibold cursor-pointer">
                    Sunday Working Day
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    {Boolean(shiftForm.isSundayWorking) ? "Working Day" : "Weekly Off"}
                  </p>
                </div>
                <Switch
                  id="toggle-sun-work"
                  checked={Boolean(shiftForm.isSundayWorking)}
                  onCheckedChange={(checked) =>
                    setShiftForm((prev) => ({
                      ...prev,
                      isSundayWorking: checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Morning Grace</Label>
                <Select
                  value={shiftForm.graceTime || "15"}
                  onValueChange={(v: any) => setShiftForm({ ...shiftForm, graceTime: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always (Flexible)</SelectItem>
                    <SelectItem value="10">Within 10 mins</SelectItem>
                    <SelectItem value="15">Within 15 mins (Standard)</SelectItem>
                    <SelectItem value="20">Within 20 mins</SelectItem>
                    <SelectItem value="25">Within 25 mins</SelectItem>
                    <SelectItem value="30">Within 30 mins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Afternoon Grace</Label>
                <Select
                  value={shiftForm.afternoonGraceTime || "15"}
                  onValueChange={(v: any) => setShiftForm({ ...shiftForm, afternoonGraceTime: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always (Flexible)</SelectItem>
                    <SelectItem value="10">Within 10 mins</SelectItem>
                    <SelectItem value="15">Within 15 mins (Standard)</SelectItem>
                    <SelectItem value="20">Within 20 mins</SelectItem>
                    <SelectItem value="25">Within 25 mins</SelectItem>
                    <SelectItem value="30">Within 30 mins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Allowance (₹/day)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={shiftForm.allowancePerDay ?? 0}
                  onChange={(e) => setShiftForm({ ...shiftForm, allowancePerDay: +e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Color Badge Palette */}
            <div className="space-y-1.5">
              <Label className="text-xs">Theme Badge Color</Label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setShiftForm({ ...shiftForm, color: c.value })}
                    className={`h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center ${
                      shiftForm.color === c.value ? "border-foreground scale-110 shadow-sm" : "border-transparent opacity-70"
                    }`}
                    style={{ backgroundColor: c.solid }}
                  >
                    {shiftForm.color === c.value && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Description / Guidelines (Horizontal Alignment) */}
            <div className="flex items-center gap-3">
              <Label className="text-xs whitespace-nowrap shrink-0 w-24 font-medium">
                Description
              </Label>
              <Input
                placeholder="Optional shift notes or handover guidelines..."
                value={shiftForm.description || ""}
                onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
                className="text-xs flex-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShiftDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingShiftId ? "Update Shift" : "Save Shift Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: QUICK SINGLE DAY SHIFT ASSIGNMENT */}
      <Dialog open={quickAssignOpen} onOpenChange={setQuickAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>Assign Shift for Day</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign or override shift timing for {quickAssignData?.employeeName} on {quickAssignData?.date}.
            </DialogDescription>
          </DialogHeader>

          {quickAssignData && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Select Shift</Label>
                <Select
                  value={quickAssignData.shiftId}
                  onValueChange={(v) => setQuickAssignData({ ...quickAssignData, shiftId: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">🏖️ Weekly Off / Holiday</SelectItem>
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.start} – {s.end}) {s.code ? `[${s.code}]` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {quickAssignData.shiftId !== "off" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Morning Grace</Label>
                    <Select
                      value={quickAssignData.graceTime}
                      onValueChange={(v: any) => setQuickAssignData({ ...quickAssignData, graceTime: v })}
                    >
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Always (No cutoff)</SelectItem>
                        <SelectItem value="10">Within 10 mins</SelectItem>
                        <SelectItem value="15">Within 15 mins (Standard)</SelectItem>
                        <SelectItem value="20">Within 20 mins</SelectItem>
                        <SelectItem value="25">Within 25 mins</SelectItem>
                        <SelectItem value="30">Within 30 mins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Afternoon Grace</Label>
                    <Select
                      value={quickAssignData.afternoonGraceTime}
                      onValueChange={(v: any) => setQuickAssignData({ ...quickAssignData, afternoonGraceTime: v })}
                    >
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Always (Flexible)</SelectItem>
                        <SelectItem value="10">Within 10 mins</SelectItem>
                        <SelectItem value="15">Within 15 mins (Standard)</SelectItem>
                        <SelectItem value="20">Within 20 mins</SelectItem>
                        <SelectItem value="25">Within 25 mins</SelectItem>
                        <SelectItem value="30">Within 30 mins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Notes / Handover Reason</Label>
                <Input
                  placeholder="e.g. Swapped with Aarav / Extra shift coverage"
                  value={quickAssignData.note || ""}
                  onChange={(e) => setQuickAssignData({ ...quickAssignData, note: e.target.value })}
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setQuickAssignOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveQuickAssign}>
                  Save Assignment
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: BULK ADVANCE SHIFT RANGE ASSIGNMENT */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Bulk Assign Monthly Shift Range</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Schedule upcoming days or month-long shift timings in advance for single employees, departments, or entire company staff.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Audience</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={bulkForm.targetType === "single" ? "default" : "outline"}
                  onClick={() => setBulkForm({ ...bulkForm, targetType: "single" })}
                  size="sm"
                  className="text-xs"
                >
                  Single Employee
                </Button>
                <Button
                  type="button"
                  variant={bulkForm.targetType === "department" ? "default" : "outline"}
                  onClick={() => setBulkForm({ ...bulkForm, targetType: "department" })}
                  size="sm"
                  className="text-xs"
                >
                  Department
                </Button>
                <Button
                  type="button"
                  variant={bulkForm.targetType === "all" ? "default" : "outline"}
                  onClick={() => setBulkForm({ ...bulkForm, targetType: "all" })}
                  size="sm"
                  className="text-xs"
                >
                  All Staff ({employees.length})
                </Button>
              </div>
            </div>

            {bulkForm.targetType === "single" && (
              <div className="space-y-1">
                <Label className="text-xs">Select Employee</Label>
                <Select
                  value={bulkForm.employeeId}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, employeeId: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Choose employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.empCode}) · {e.department || "General"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkForm.targetType === "department" && (
              <div className="space-y-1">
                <Label className="text-xs">Select Department</Label>
                <Select
                  value={bulkForm.department}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, department: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Choose department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From Date *</Label>
                <Input
                  type="date"
                  value={bulkForm.fromDate}
                  onChange={(e) => setBulkForm({ ...bulkForm, fromDate: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">To Date *</Label>
                <Input
                  type="date"
                  value={bulkForm.toDate}
                  onChange={(e) => setBulkForm({ ...bulkForm, toDate: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Assigned Shift *</Label>
                <Select
                  value={bulkForm.shiftId}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, shiftId: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">🏖️ Mark as Weekly Off</SelectItem>
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.start} – {s.end})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Morning Grace</Label>
                <Select
                  value={bulkForm.graceTime}
                  onValueChange={(v: any) => setBulkForm({ ...bulkForm, graceTime: v })}
                  disabled={bulkForm.shiftId === "off"}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always (No cutoff)</SelectItem>
                    <SelectItem value="10">Within 10 mins</SelectItem>
                    <SelectItem value="15">Within 15 mins (Standard)</SelectItem>
                    <SelectItem value="20">Within 20 mins</SelectItem>
                    <SelectItem value="25">Within 25 mins</SelectItem>
                    <SelectItem value="30">Within 30 mins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Afternoon Grace</Label>
                <Select
                  value={bulkForm.afternoonGraceTime}
                  onValueChange={(v: any) => setBulkForm({ ...bulkForm, afternoonGraceTime: v })}
                  disabled={bulkForm.shiftId === "off"}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always (Flexible)</SelectItem>
                    <SelectItem value="10">Within 10 mins</SelectItem>
                    <SelectItem value="15">Within 15 mins (Standard)</SelectItem>
                    <SelectItem value="20">Within 20 mins</SelectItem>
                    <SelectItem value="25">Within 25 mins</SelectItem>
                    <SelectItem value="30">Within 30 mins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between border border-border">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">Keep Weekends as Weekly Off</div>
                <p className="text-[11px] text-muted-foreground">
                  Automatically marks Saturdays & Sundays as OFF during this schedule.
                </p>
              </div>
              <Switch
                checked={bulkForm.skipWeekends}
                onCheckedChange={(c) => setBulkForm({ ...bulkForm, skipWeekends: c })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyBulkRoster} className="bg-primary text-primary-foreground">
                Apply Roster Schedule
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: BULK UPLOAD EXCEL / CSV ROSTER */}
      <BulkRosterUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        companyName={company.name || "CreatonsHR"}
        shifts={shifts}
        employees={employees}
        onBulkAssign={bulkAssignRoster}
      />
    </div>
  );
}

interface BulkRosterUploadDialogProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
  shifts: ShiftType[];
  employees: Employee[];
  onBulkAssign: (items: Array<Omit<ShiftAssignment, "id"> & { id?: string }>) => Promise<number>;
}

function BulkRosterUploadDialog({
  open,
  onClose,
  companyName,
  shifts,
  employees,
  onBulkAssign,
}: BulkRosterUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<RosterParseResult | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      const result = parseRosterCsvText(text, employees, shifts);
      setParsed(result);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!parsed || parsed.assignments.length === 0) {
      return toast.error("No valid shift assignments found in this file.");
    }
    setLoading(true);
    try {
      const count = await onBulkAssign(parsed.assignments);
      toast.success(`✨ Successfully imported ${count} shift roster assignments!`);
      aiNotify({
        title: "✨ Bulk Shift Roster Imported",
        body: `Imported ${count} shift assignments covering ${parsed.uniqueEmployees} employees.`,
        kind: "success",
      });
      onClose();
      setFile(null);
      setParsed(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to bulk upload shift roster");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Bulk Upload Shift Roster (Excel / CSV)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Import monthly shifts for multiple employees using Excel or CSV templates with automated range expansion and shift matching.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1 py-2">
          {/* Download template banner */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold">Prefilled Template with Active Employees & Shifts</div>
                <div className="text-[11px] text-muted-foreground">
                  Supports single dates or date ranges (e.g., 2026-09-01 to 2026-09-30) with automatic weekend skipping.
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5 shrink-0"
              onClick={() => {
                downloadRosterTemplate(companyName, shifts, employees);
                toast.success("Shift Roster Excel template downloaded.");
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download Template
            </Button>
          </div>

          {/* Shift Legend helper pills */}
          <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Available Shift Codes for this Company:
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {shifts.map((s) => (
                <Badge key={s.id} variant="outline" className="text-[11px] bg-background">
                  <span className="font-mono font-bold mr-1 text-primary">{s.code || s.name}</span>: {s.start} - {s.end}
                </Badge>
              ))}
              <Badge variant="outline" className="text-[11px] bg-background border-dashed text-muted-foreground">
                <span className="font-mono font-bold mr-1 text-foreground">OFF</span>: Weekly Off / Holiday
              </Badge>
            </div>
          </div>

          {/* Drag & drop upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-all rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls,.tsv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <div className="font-semibold text-sm">
              {file ? file.name : "Click to select or drag & drop Roster Excel / CSV file"}
            </div>
            <p className="text-xs text-muted-foreground">
              Supports .csv, .xlsx, .xls, .tsv with standard headers (Employee Code, Date, To Date, Shift Code, Grace Time, etc.)
            </p>
          </div>

          {/* Validation & Live Preview */}
          {parsed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> {parsed.validCount} shifts generated
                  </Badge>
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                    <Users className="mr-1 h-3 w-3" /> {parsed.uniqueEmployees} employees
                  </Badge>
                  {parsed.warnings.length > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <AlertTriangle className="mr-1 h-3 w-3" /> {parsed.warnings.length} notices
                    </Badge>
                  )}
                  {parsed.errors.length > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                      {parsed.errors.length} errors
                    </Badge>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={overwriteExisting} onCheckedChange={(c) => setOverwriteExisting(!!c)} />
                  <span>Overwrite overlapping existing dates</span>
                </label>
              </div>

              {/* Warnings / Errors Details */}
              {parsed.errors.length > 0 && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 space-y-1 text-xs text-destructive">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Errors found ({parsed.errors.length}):
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                    {parsed.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div className="rounded-xl border border-border overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-2 pl-3">Employee</th>
                      <th className="p-2">Date / Range</th>
                      <th className="p-2">Assigned Shift</th>
                      <th className="p-2">Grace Period</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsed.previewRows.slice(0, 60).map((row, i) => (
                      <tr key={i} className={`hover:bg-muted/40 ${row.status === "error" ? "bg-destructive/5" : ""}`}>
                        <td className="p-2 pl-3">
                          <div className="font-medium text-foreground">{row.employeeName}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{row.empCode}</div>
                        </td>
                        <td className="p-2 font-mono text-[11px] text-muted-foreground">{row.date}</td>
                        <td className="p-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              row.shiftCode.toLowerCase() === "off" || row.shiftName.toLowerCase().includes("off")
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary border-primary/30"
                            }`}
                          >
                            {row.shiftName}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{row.graceTime}</td>
                        <td className="p-2">
                          {row.status === "valid" ? (
                            <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Ready
                            </span>
                          ) : (
                            <span className="text-destructive font-medium inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {row.message || "Error"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Shifts will be saved directly into the company roster master and immediately reflected in attendance regularizations, payroll hours calculation, and live check-in validation.
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border mt-auto">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || parsed.assignments.length === 0 || loading}
            className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white shadow-sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Importing Roster..." : `Import ${parsed?.assignments?.length ?? 0} Shift Assignments`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
