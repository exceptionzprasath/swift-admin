import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useStore, CompanyHoliday, HolidayType } from "@/lib/store";
import {
  CalendarDays, ChevronLeft, ChevronRight, Download, Upload, Plus,
  Search, Building2, CheckCircle2,
  Calendar as CalendarIcon, ListFilter, LayoutGrid, Eye,
  FileSpreadsheet, PartyPopper, ShieldCheck, Flag, Star, Tag,
  Edit2, Trash2, Clock, ShieldAlert, AlertTriangle, IndianRupee, RefreshCw, Check,
  MoreVertical,
  X,
  RotateCcw,
  Coins,
  Users,
  SlidersHorizontal,
  Filter,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  downloadHolidayCSVTemplate,
  parseBulkHolidayCSV,
  ParsedHolidayRow,
} from "@/lib/bulk-holiday";

export const Route = createFileRoute("/admin/leave-calendar")({
  head: () => ({ meta: [{ title: "Leave Management · CreatonsHR" }] }),
  component: RedirectToAttendanceLeaveCalendar,
});

function RedirectToAttendanceLeaveCalendar() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin/attendance", search: (prev: any) => ({ ...prev, tab: "leave-calendar" }) as any, replace: true });
  }, [navigate]);

  return <LeaveCalendarPage />;
}

const HOLIDAY_TYPE_CONFIG: Record<
  HolidayType,
  { label: string; color: string; dot: string; icon: typeof PartyPopper }
> = {
  "National Holiday": {
    label: "National Holiday",
    color: "bg-orange-500/15 text-orange-700 border-orange-500/40 font-bold",
    dot: "bg-orange-500",
    icon: Flag,
  },
  "Festival Holiday": {
    label: "Festival Holiday",
    color: "bg-purple-500/15 text-purple-700 border-purple-500/40 font-bold",
    dot: "bg-purple-500",
    icon: PartyPopper,
  },
  "Public Holiday": {
    label: "Public / Gazetted Holiday",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 font-bold",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  "Optional Holiday": {
    label: "Optional / Floating Holiday",
    color: "bg-sky-500/15 text-sky-700 border-sky-500/40 font-medium",
    dot: "bg-sky-500",
    icon: Star,
  },
  "Company Off": {
    label: "Company Special Off",
    color: "bg-indigo-500/15 text-indigo-700 border-indigo-500/40 font-medium",
    dot: "bg-indigo-500",
    icon: Building2,
  },
};

function getHolidayTheme(type: HolidayType | string) {
  switch (type) {
    case "Public Holiday":
      return {
        cellBg: "bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/40 hover:border-emerald-500/70",
        dateBadge: "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/30",
        pill: "bg-emerald-600 text-white font-semibold shadow-xs hover:bg-emerald-700",
        label: "Public / Gazetted",
      };
    case "Optional Holiday":
      return {
        cellBg: "bg-sky-500/15 dark:bg-sky-500/25 border border-sky-500/40 hover:border-sky-500/70",
        dateBadge: "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30 ring-2 ring-sky-500/30",
        pill: "bg-sky-600 text-white font-semibold shadow-xs hover:bg-sky-700",
        label: "Optional / Floating",
      };
    case "Company Off":
      return {
        cellBg: "bg-indigo-500/15 dark:bg-indigo-500/25 border border-indigo-500/40 hover:border-indigo-500/70",
        dateBadge: "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30",
        pill: "bg-indigo-600 text-white font-semibold shadow-xs hover:bg-indigo-700",
        label: "Company Special Off",
      };
    default:
      return {
        cellBg: "bg-purple-500/15 dark:bg-purple-500/25 border border-purple-500/40 hover:border-purple-500/70",
        dateBadge: "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30 ring-2 ring-purple-500/30",
        pill: "bg-purple-600 text-white font-semibold shadow-xs hover:bg-purple-700",
        label: type,
      };
  }
}

function getHolidayConfig(type: HolidayType | string) {
  const matched = HOLIDAY_TYPE_CONFIG[type as HolidayType];
  if (matched) return matched;
  return HOLIDAY_TYPE_CONFIG["Public Holiday"];
}

export function LeaveCalendarPage({ isEmbedded = false }: { isEmbedded?: boolean } = {}) {
  const {
    holidays,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    bulkAddHolidays,
    company,
    setCompany,
    saveAllCompanySettings,
    employees,
    updateEmployee,
    evaluateEarnedLeaveAccrual,
    processYearEndLeaveRollover,
  } = useStore();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"holidays" | "employee-balances" | "leave-policy" | "permission-policy" | "awol-control">("holidays");
  const [savingLeavePolicy, setSavingLeavePolicy] = useState(false);
  const [savingELPolicy, setSavingELPolicy] = useState(false);
  const [rolloverConfirmOpen, setRolloverConfirmOpen] = useState(false);
  const [confirmAutoTerminateOpen, setConfirmAutoTerminateOpen] = useState(false);

  // ==========================================
  // EMPLOYEE LEAVE BALANCES STATE
  // ==========================================
  const [empSearch, setEmpSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [adjustingEmp, setAdjustingEmp] = useState<any | null>(null);
  const [adjustForm, setAdjustForm] = useState<{
    el: number;
    cl: number;
    sl: number;
    workingDays: number;
  }>({ el: 15, cl: 10, sl: 8, workingDays: 0 });

  // ==========================================
  // OFFICE HOLIDAY CALENDAR STATE
  // ==========================================
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayToDate, setHolidayToDate] = useState("");
  const [holidayType, setHolidayType] = useState<HolidayType>("Public Holiday");
  const [holidayBranches, setHolidayBranches] = useState<string>("all");
  const [holidayMandatory, setHolidayMandatory] = useState(true);
  const [holidayDesc, setHolidayDesc] = useState("");

  const [selectedHoliday, setSelectedHoliday] = useState<CompanyHoliday | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [parsedBulk, setParsedBulk] = useState<{
    parsedRows: ParsedHolidayRow[];
    totalCount: number;
    validCount: number;
    errorCount: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const branches = useMemo(() => {
    return (company?.branches || []).map((b) => ({ id: b.id, name: b.name, code: b.code }));
  }, [company]);

    const availableYears = useMemo(() => {
    const currentY = new Date().getFullYear();
    const set = new Set<number>([currentY - 1, currentY, currentY + 1]);
    (holidays || []).forEach((h) => {
      if (h.date) {
        const y = parseInt(h.date.slice(0, 4), 10);
        if (!isNaN(y)) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [holidays]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToday = () => setCurrentDate(new Date());

  const calendarDays = useMemo(() => {
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first (0=Mon...6=Sun)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [year, month]);

  const filteredHolidays = useMemo(() => {
    return (holidays || []).filter((h) => {
      if (viewMode === "list" && selectedYear !== "all") {
        if (!h.date.startsWith(selectedYear)) return false;
      }
      if (typeFilter !== "all" && h.type !== typeFilter) return false;
      if (branchFilter !== "all") {
        const hBranches = h.branchIds || ["all"];
        if (!hBranches.includes("all") && !hBranches.includes(branchFilter)) return false;
      }
      if (viewMode === "list" && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = h.name.toLowerCase().includes(q);
        const matchesDesc = (h.description || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [holidays, viewMode, selectedYear, typeFilter, branchFilter, searchQuery]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, CompanyHoliday[]>();
    filteredHolidays.forEach((h) => {
      const list = map.get(h.date) || [];
      list.push(h);
      map.set(h.date, list);
    });
    return map;
  }, [filteredHolidays]);

  const stats = useMemo(() => {
    const totalCount = filteredHolidays.length;
    const mandatoryCount = filteredHolidays.filter((h) => h.isMandatory !== false).length;
    const optionalCount = filteredHolidays.filter((h) => h.isMandatory === false).length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const upcoming = filteredHolidays
      .filter((h) => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    let daysRemaining = null;
    if (upcoming) {
      const diffTime = new Date(upcoming.date).getTime() - new Date(todayStr).getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return { totalCount, mandatoryCount, optionalCount, upcoming, daysRemaining };
  }, [filteredHolidays]);

  // Employee leave balances filtered data
  const filteredEmpLeaves = useMemo(() => {
    return (employees || []).filter((emp) => {
      if (deptFilter !== "all" && emp.department !== deptFilter) return false;
      if (empSearch.trim()) {
        const q = empSearch.toLowerCase();
        const matchesName = (emp.name || "").toLowerCase().includes(q);
        const matchesCode = (emp.empCode || "").toLowerCase().includes(q);
        const matchesDept = (emp.department || "").toLowerCase().includes(q);
        const matchesDesig = (emp.designation || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDept && !matchesDesig) return false;
      }
      return true;
    });
  }, [employees, deptFilter, empSearch]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    (employees || []).forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  const empLeaveMetrics = useMemo(() => {
    let totalEL = 0;
    let totalCL = 0;
    let totalSL = 0;
    let nearAccrualCount = 0;
    const threshold = company.elWorkingDaysThreshold ?? 20;

    (employees || []).forEach((e) => {
      const el = e.leaveBalances?.EL ?? 15;
      const cl = e.leaveBalances?.CL ?? 10;
      const sl = e.leaveBalances?.SL ?? 8;
      const counter = e.qualifyingWorkingDaysCounter ?? 0;
      totalEL += el;
      totalCL += cl;
      totalSL += sl;
      if (counter >= Math.max(1, threshold - 5)) {
        nearAccrualCount++;
      }
    });

    return {
      totalEmployees: (employees || []).length,
      totalEL,
      totalCL,
      totalSL,
      totalPaid: totalEL + totalCL + totalSL,
      nearAccrualCount,
    };
  }, [employees, company.elWorkingDaysThreshold]);

  const handleExportLeaveCSV = () => {
    const headers = [
      "Employee Code",
      "Employee Name",
      "Department",
      "Designation",
      "Earned Leave (EL)",
      "Qualifying Working Days Counter",
      "Casual Leave (CL)",
      "Sick Leave (SL)",
      "Total Available Paid Leaves",
    ];
    const rows = filteredEmpLeaves.map((e) => [
      e.empCode || "",
      `"${e.name}"`,
      `"${e.department || ""}"`,
      `"${e.designation || ""}"`,
      e.leaveBalances?.EL ?? 15,
      e.qualifyingWorkingDaysCounter ?? 0,
      e.leaveBalances?.CL ?? 10,
      e.leaveBalances?.SL ?? 8,
      (e.leaveBalances?.EL ?? 15) + (e.leaveBalances?.CL ?? 10) + (e.leaveBalances?.SL ?? 8),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `employee_leave_balances_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Employee leave balances exported to CSV!");
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setHolidayName("");
    setHolidayDate(new Date().toISOString().slice(0, 10));
    setHolidayToDate("");
    setHolidayType("Public Holiday");
    setHolidayBranches("all");
    setHolidayMandatory(true);
    setHolidayDesc("");
    setModalOpen(true);
  };

  const handleOpenEdit = (h: CompanyHoliday) => {
    setEditingId(h.id);
    setHolidayName(h.name);
    setHolidayDate(h.date);
    setHolidayToDate(h.toDate || "");
    setHolidayType(h.type);
    setHolidayBranches(h.branchIds && h.branchIds.length ? h.branchIds[0] : "all");
    setHolidayMandatory(h.isMandatory !== false);
    setHolidayDesc(h.description || "");
    setModalOpen(true);
  };

  const handleSaveHoliday = () => {
    if (!holidayName.trim()) {
      toast.error("Please enter a holiday name");
      return;
    }
    if (!holidayDate) {
      toast.error("Please select a valid holiday date");
      return;
    }

    const branchIds = holidayBranches === "all" ? ["all"] : [holidayBranches];

    if (editingId) {
      updateHoliday(editingId, {
        name: holidayName.trim(),
        date: holidayDate,
        toDate: holidayToDate || undefined,
        type: holidayType,
        branchIds,
        isMandatory: holidayMandatory,
        description: holidayDesc.trim(),
      });
      toast.success(`Updated holiday "${holidayName}"`);
    } else {
      addHoliday({
        name: holidayName.trim(),
        date: holidayDate,
        toDate: holidayToDate || undefined,
        type: holidayType,
        branchIds,
        isMandatory: holidayMandatory,
        description: holidayDesc.trim(),
      });
      toast.success(`Added new holiday "${holidayName}"`);
    }
    setModalOpen(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseBulkHolidayCSV(text);
    setParsedBulk(result);
    setBulkModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = async () => {
    if (!parsedBulk || parsedBulk.validCount === 0) return;
    setImporting(true);
    try {
      const toAdd = parsedBulk.parsedRows
        .filter((r) => r.isValid)
        .map((r) => ({
          name: r.name,
          date: r.date,
          toDate: r.toDate || undefined,
          type: r.type,
          branchIds: r.branches ? [r.branches] : ["all"],
          isMandatory: r.isMandatory,
          description: r.description,
        }));

      await bulkAddHolidays(toAdd);
      toast.success(`Successfully imported ${toAdd.length} holidays into the calendar!`);
      setBulkModalOpen(false);
      setParsedBulk(null);
    } catch (_err) {
      toast.error("Failed to import holidays");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white flex items-center justify-center shadow-soft">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">
                Leave Management
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Configure official company holidays, non-working days & office calendar schedule.
              </p>
            </div>
          </div>
        </div>

        {/* Hidden file input for CSV upload */}
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/60">
        <Button
          variant={activeTab === "holidays" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("holidays")}
          className="text-xs h-9 gap-1.5 rounded-xl font-semibold"
        >
          <CalendarDays className="h-4 w-4" />
          <span>Office Holidays ({stats.totalCount})</span>
        </Button>

        <Button
          variant={activeTab === "employee-balances" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("employee-balances")}
          className="text-xs h-9 gap-1.5 rounded-xl font-semibold"
        >
          <Users className="h-4 w-4" />
          <span>Employee Leave Balances ({(employees || []).length})</span>
        </Button>

        <Button
          variant={activeTab === "leave-policy" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("leave-policy")}
          className="text-xs h-9 gap-1.5 rounded-xl font-semibold"
        >
          <Tag className="h-4 w-4" />
          <span>Leave Policy Types ({(company.leaveTypes || []).length})</span>
        </Button>

        <Button
          variant={activeTab === "permission-policy" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("permission-policy")}
          className="text-xs h-9 gap-1.5 rounded-xl font-semibold"
        >
          <Clock className="h-4 w-4" />
          <span>Permission Policy Types ({(company.permissionTypes || []).length})</span>
        </Button>

        <Button
          variant={activeTab === "awol-control" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("awol-control")}
          className="text-xs h-9 gap-1.5 rounded-xl font-semibold"
        >
          <ShieldAlert className="h-4 w-4 text-rose-500" />
          <span>Absence of Work (AWOL)</span>
        </Button>
      </div>

      {activeTab === "holidays" && (
        <div className="space-y-6">

          {/* Quick Metrics Row (Minimal with Colored Borders and Capitalized Titles) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Holidays */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/80 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted/70 border border-purple-500/40 hover:border-purple-500/80 transition-all">
              <span className="text-sm font-medium text-foreground/85 truncate">
                Total Holidays
              </span>
              <span className="text-base sm:text-lg font-semibold text-foreground shrink-0 ml-2">
                {stats.totalCount}
              </span>
            </div>

            {/* Mandatory / Public */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/80 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted/70 border border-emerald-500/40 hover:border-emerald-500/80 transition-all">
              <span className="text-sm font-medium text-foreground/85 truncate">
                Mandatory
              </span>
              <span className="text-base sm:text-lg font-semibold text-foreground shrink-0 ml-2">
                {stats.mandatoryCount}
              </span>
            </div>

            {/* Optional / Floating */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/80 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted/70 border border-sky-500/40 hover:border-sky-500/80 transition-all">
              <span className="text-sm font-medium text-foreground/85 truncate">
                Optional
              </span>
              <span className="text-base sm:text-lg font-semibold text-foreground shrink-0 ml-2">
                {stats.optionalCount}
              </span>
            </div>

            {/* Next */}
            <div className="grid grid-cols-5 items-center px-4 py-3 rounded-xl bg-muted/80 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted/70 border border-amber-500/40 hover:border-amber-500/80 transition-all gap-2">
              <span className="col-span-1 text-sm font-medium text-foreground/85 truncate">
                Next
              </span>
              <span className="col-span-4 text-sm sm:text-base font-semibold text-foreground truncate text-right" title={stats.upcoming?.name}>
                {stats.upcoming
                  ? `${stats.upcoming.name} (${stats.daysRemaining === 0 ? "Today" : `${stats.daysRemaining}d`})`
                  : "None"}
              </span>
            </div>
          </div>

          {/* Horizontally Aligned Calendar Control & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card p-3 rounded-xl border border-border shadow-xs">
            {/* Left/Main Horizontal Group */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Calendar View: Month Navigation (< Month Year >) and Today Shortcut */}
              {viewMode === "calendar" && (
                <>
                  <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevMonth}
                      className="h-8 w-8 rounded-md hover:bg-background text-foreground transition-colors"
                      title="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-display font-bold text-xs sm:text-sm px-2.5 text-foreground whitespace-nowrap min-w-[130px] text-center select-none">
                      {monthName} {year}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMonth}
                      className="h-8 w-8 rounded-md hover:bg-background text-foreground transition-colors"
                      title="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={jumpToday}
                    className="h-8 px-3 text-xs font-semibold rounded-lg gap-1.5 shadow-2xs"
                    title="Jump to today's month"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    <span>Today</span>
                  </Button>
                </>
              )}

              {/* Holiday List View: Search Input & Year Selection Dropdown */}
              {viewMode === "list" && (
                <>
                  <div className="relative min-w-[180px] max-w-[260px] flex-1">
                    <Search className={cn("absolute left-2.5 top-2 h-3.5 w-3.5 transition-colors", searchQuery.trim() ? "text-primary" : "text-muted-foreground")} />
                    <Input
                      placeholder="Search holiday name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "pl-8 pr-7 h-8 text-xs rounded-lg transition-all",
                        searchQuery.trim()
                          ? "bg-primary/10 border-primary/50 text-foreground font-medium ring-1 ring-primary/25 shadow-2xs"
                          : "bg-background"
                      )}
                    />
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <Select
                    value={selectedYear}
                    onValueChange={(val) => {
                      setSelectedYear(val);
                      if (val !== "all") {
                        setCurrentDate(new Date(parseInt(val, 10), month, 1));
                      }
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-8 text-xs min-w-[115px] w-auto rounded-lg transition-all font-medium",
                        selectedYear !== "all"
                          ? "bg-primary/15 border-primary/50 text-primary font-semibold ring-1 ring-primary/25 shadow-2xs [&>svg]:text-primary [&>svg]:opacity-100"
                          : "bg-background"
                      )}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 mr-1 text-primary shrink-0" />
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map((yr) => (
                        <SelectItem key={yr} value={String(yr)}>
                          {yr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* All Holiday Types Dropdown (visible in both Calendar and List views) */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger
                  className={cn(
                    "h-8 text-xs min-w-[145px] w-auto rounded-lg transition-all",
                    typeFilter !== "all"
                      ? "bg-primary/15 border-primary/50 text-primary font-semibold ring-1 ring-primary/25 shadow-2xs [&>svg]:text-primary [&>svg]:opacity-100"
                      : "bg-background"
                  )}
                >
                  <Tag className={cn("h-3.5 w-3.5 mr-1 shrink-0 transition-colors", typeFilter !== "all" ? "text-primary" : "text-muted-foreground")} />
                  <SelectValue placeholder="All Holiday Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Holiday Types</SelectItem>
                  {Object.entries(HOLIDAY_TYPE_CONFIG).map(([typeKey, cfg]) => (
                    <SelectItem key={typeKey} value={typeKey}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* All Branches Dropdown (visible in both Calendar and List views) */}
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger
                  className={cn(
                    "h-8 text-xs min-w-[130px] w-auto rounded-lg transition-all",
                    branchFilter !== "all"
                      ? "bg-primary/15 border-primary/50 text-primary font-semibold ring-1 ring-primary/25 shadow-2xs [&>svg]:text-primary [&>svg]:opacity-100"
                      : "bg-background"
                  )}
                >
                  <Building2 className={cn("h-3.5 w-3.5 mr-1 shrink-0 transition-colors", branchFilter !== "all" ? "text-primary" : "text-muted-foreground")} />
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right Horizontal Group: View Toggle & Three-Dot Menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Calendar & Holiday List Toggle */}
              <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
                <Button
                  variant={viewMode === "calendar" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                  className="h-7 px-2.5 text-xs gap-1 rounded-md"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Calendar</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-7 px-2.5 text-xs gap-1 rounded-md"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>Holiday List</span>
                </Button>
              </div>

              {/* Three-Dot Action Menu Icon */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border bg-background hover:bg-muted text-foreground transition-colors shadow-2xs"
                    title="Holiday Actions & Export"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lg border-border">
                  <DropdownMenuItem
                    onClick={handleOpenAdd}
                    className="gap-2.5 cursor-pointer text-xs font-semibold py-2 rounded-lg text-primary focus:text-primary focus:bg-primary/10"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                    <span>Add Office Holiday</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2.5 cursor-pointer text-xs font-medium py-2 rounded-lg"
                  >
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span>Bulk Upload CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadHolidayCSVTemplate()}
                    className="gap-2.5 cursor-pointer text-xs font-medium py-2 rounded-lg"
                  >
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span>Download CSV Template</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main Calendar Grid */}
          {viewMode === "calendar" && (
            <Card className="border-border/60 shadow-lg rounded-3xl overflow-hidden bg-card p-5 sm:p-7 transition-all">
              {/* Weekday Names (Mo, Tu, We, Th, Fr, Sa, Su) matching reference */}
              <div className="grid grid-cols-7 gap-2 mb-4 text-center select-none">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day, idx) => (
                  <div
                    key={day}
                    className={`text-xs sm:text-sm font-semibold ${
                      idx >= 5 ? "text-muted-foreground/50" : "text-muted-foreground/75"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid with Rich Fill Look for Holidays */}
              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {calendarDays.map((cd, index) => {
                  const dayHolidays = holidaysByDate.get(cd.dateStr) || [];
                  const hasHoliday = dayHolidays.length > 0;
                  const primaryHoliday = dayHolidays[0];
                  const holidayTheme = primaryHoliday ? getHolidayTheme(primaryHoliday.type) : null;
                  const isWeekend = index % 7 === 5 || index % 7 === 6;

                  return (
                    <div
                      key={cd.dateStr}
                      className={`min-h-[96px] sm:min-h-[114px] p-2 rounded-2xl transition-all flex flex-col items-center justify-between group ${
                        !cd.isCurrentMonth
                          ? "opacity-35 bg-transparent border border-transparent"
                          : hasHoliday && holidayTheme
                          ? `${holidayTheme.cellBg} shadow-2xs`
                          : isWeekend
                          ? "bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-border/40"
                          : "bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50"
                      }`}
                    >
                      {/* Date Number Squircle (Holiday = Solid Theme Fill, Today = Outlined Squircle) */}
                      <div className="w-full flex items-center justify-center pt-0.5">
                        <span
                          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-sm font-semibold transition-all select-none ${
                            hasHoliday && holidayTheme
                              ? holidayTheme.dateBadge
                              : cd.isToday
                              ? "border-2 border-primary bg-primary/10 text-primary font-bold shadow-xs"
                              : !cd.isCurrentMonth
                              ? "text-muted-foreground/40 font-normal"
                              : isWeekend
                              ? "text-muted-foreground/80 font-medium"
                              : "text-foreground font-semibold"
                          }`}
                        >
                          {cd.dayNumber}
                        </span>
                      </div>

                      {/* Holiday Badge Pills inside Cell with Solid Fill Look (No green dot circle) */}
                      <div className="w-full space-y-1 mt-1.5 flex-1 flex flex-col justify-end">
                        {dayHolidays.map((h) => {
                          const theme = getHolidayTheme(h.type);
                          return (
                            <div
                              key={h.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHoliday(h);
                              }}
                              className={`cursor-pointer px-2 py-1 rounded-lg text-[11px] font-semibold truncate flex items-center justify-between gap-1 shadow-xs hover:scale-[1.02] transition-transform ${theme.pill}`}
                              title={`${h.name} (${theme.label})`}
                            >
                              <span className="truncate">{h.name}</span>
                              {h.isMandatory === false && (
                                <span className="text-[9px] px-1 py-0.5 bg-black/25 text-white rounded font-normal shrink-0">
                                  Opt
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {viewMode === "list" && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Annual Company Holidays {selectedYear !== "all" ? `(${selectedYear})` : ""} ({filteredHolidays.length})</CardTitle>
                <CardDescription>Official calendar of non-working days and festive leaves declared for employees.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-y border-border">
                      <tr>
                        <th className="p-3">Holiday Name</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Day of Week</th>
                        <th className="p-3">Holiday Type</th>
                        <th className="p-3">Applicable Branches</th>
                        <th className="p-3">Mandatory</th>
                        <th className="p-3">Description / Remarks</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredHolidays.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            No official holidays found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredHolidays
                          .slice()
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map((h) => {
                            const cfg = getHolidayConfig(h.type);
                            const dayOfWeek = new Date(h.date).toLocaleDateString("en-US", { weekday: "long" });

                            return (
                              <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3 font-bold text-foreground flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                                  {h.name}
                                </td>
                                <td className="p-3 font-mono font-semibold">{h.date}</td>
                                <td className="p-3 text-muted-foreground">{dayOfWeek}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.color}`}>
                                    {h.type}
                                  </span>
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  {h.branchIds && !h.branchIds.includes("all")
                                    ? h.branchIds.map((bid) => branches.find((b) => b.id === bid)?.name || bid).join(", ")
                                    : "All Branches"}
                                </td>
                                <td className="p-3">
                                  {h.isMandatory !== false ? (
                                    <Badge className="bg-emerald-600 text-[10px] px-1.5 py-0">Mandatory</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Optional</Badge>
                                  )}
                                </td>
                                <td className="p-3 max-w-[220px] truncate text-muted-foreground" title={h.description}>
                                  {h.description || "—"}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleOpenEdit(h)}
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                      title="Edit holiday"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        deleteHoliday(h.id);
                                        toast.success(`Deleted "${h.name}" from holiday calendar`);
                                      }}
                                      className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                                      title="Delete holiday"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

      {/* ========================================================================= */}
      {/* 4. HOLIDAY DETAILS MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedHoliday} onOpenChange={(open) => !open && setSelectedHoliday(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-purple-600" />
              Official Holiday Details
            </DialogTitle>
            <DialogDescription>Overview of declared company holiday.</DialogDescription>
          </DialogHeader>

          {selectedHoliday && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <span className="text-purple-700 block text-[11px] font-bold uppercase tracking-wider">Office Holiday</span>
                <span className="font-extrabold text-lg text-foreground mt-0.5 block">{selectedHoliday.name}</span>
                <span className="text-muted-foreground text-xs mt-1 block">
                  📅 {selectedHoliday.date} ({new Date(selectedHoliday.date).toLocaleDateString("en-US", { weekday: "long" })})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[11px]">Holiday Type</span>
                  <span className="font-semibold text-foreground">{selectedHoliday.type}</span>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[11px]">Mandatory Status</span>
                  <span className="font-semibold text-foreground">
                    {selectedHoliday.isMandatory !== false ? "Mandatory Paid Off" : "Optional / Floating"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Description / Note</span>
                <p className="text-foreground mt-0.5">{selectedHoliday.description || "No notes provided"}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedHoliday) {
                  const toEdit = selectedHoliday;
                  setSelectedHoliday(null);
                  handleOpenEdit(toEdit);
                }
              }}
            >
              <Edit2 className="h-4 w-4 mr-1" /> Edit Holiday
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (selectedHoliday) {
                  deleteHoliday(selectedHoliday.id);
                  toast.success(`Deleted "${selectedHoliday.name}"`);
                  setSelectedHoliday(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </div>
      )}

      {/* TAB 2: EMPLOYEE LEAVE BALANCES */}
      {activeTab === "employee-balances" && (
        <div className="space-y-6">
          {/* Quick Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/80 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted/70 border border-border/80 transition-all">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Total Staff</span>
                <span className="text-lg font-bold text-foreground">{empLeaveMetrics.totalEmployees}</span>
              </div>
              <Users className="h-5 w-5 text-muted-foreground/70" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/30 transition-all">
              <div>
                <span className="text-[11px] text-primary block font-medium">Available EL</span>
                <span className="text-lg font-bold text-primary">{empLeaveMetrics.totalEL} Days</span>
              </div>
              <Coins className="h-5 w-5 text-primary" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 transition-all">
              <div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">Available CL</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{empLeaveMetrics.totalCL} Days</span>
              </div>
              <Tag className="h-5 w-5 text-emerald-600" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/30 transition-all">
              <div>
                <span className="text-[11px] text-sky-700 dark:text-sky-400 block font-medium">Available SL</span>
                <span className="text-lg font-bold text-sky-700 dark:text-sky-400">{empLeaveMetrics.totalSL} Days</span>
              </div>
              <ShieldCheck className="h-5 w-5 text-sky-600" />
            </div>

            <div className="col-span-2 lg:col-span-1 flex items-center justify-between px-4 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/30 transition-all">
              <div>
                <span className="text-[11px] text-purple-700 dark:text-purple-400 block font-medium">Total Paid Pool</span>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-400">{empLeaveMetrics.totalPaid} Days</span>
              </div>
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
          </div>

          {/* Table Container Card */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-bold">Employee Leave Balances</CardTitle>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {filteredEmpLeaves.length} Employees
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Live balance overview of Earned Leave (EL), Casual Leave (CL), Sick Leave (SL), and working-day accrual progress.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const res = evaluateEarnedLeaveAccrual();
                      if (res.affectedEmployees > 0) {
                        toast.success(`Accrued +${res.creditedCount} EL days across ${res.affectedEmployees} employees!`);
                      } else {
                        toast.info("All employee working day counters are currently evaluated.");
                      }
                    }}
                    className="h-9 text-xs rounded-xl font-semibold gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    <span>Evaluate & Accrue Now</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportLeaveCSV}
                    className="h-9 text-xs rounded-xl font-semibold gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </div>

              {/* Filters bar */}
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by employee name, code, designation..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl"
                  />
                  {empSearch && (
                    <button
                      type="button"
                      onClick={() => setEmpSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="w-full sm:w-56 shrink-0">
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {uniqueDepartments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Employee</th>
                      <th className="py-3 px-3 font-semibold">Department & Role</th>
                      <th className="py-3 px-3 font-semibold">Earned Leave (EL)</th>
                      <th className="py-3 px-3 font-semibold">Casual Leave (CL)</th>
                      <th className="py-3 px-3 font-semibold">Sick Leave (SL)</th>
                      <th className="py-3 px-3 font-semibold">Total Paid Available</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredEmpLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-medium">No matching employees found</p>
                          <p className="text-xs">Try clearing the search query or department filter</p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmpLeaves.map((emp) => {
                        const el = emp.leaveBalances?.EL ?? 15;
                        const cl = emp.leaveBalances?.CL ?? 10;
                        const sl = emp.leaveBalances?.SL ?? 8;
                        const totalPaid = el + cl + sl;
                        const threshold = company.elWorkingDaysThreshold ?? 20;
                        const cycleDays = emp.qualifyingWorkingDaysCounter ?? 0;
                        const progressPct = Math.min(100, Math.round((cycleDays / threshold) * 100));

                        return (
                          <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-brand text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                  {emp.name
                                    ? emp.name
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase()
                                    : "EM"}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <span>{emp.name}</span>
                                    <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0 border-border">
                                      {emp.empCode}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                    {emp.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                <Badge variant="secondary" className="text-[10px] font-medium">
                                  {emp.department || "General"}
                                </Badge>
                                <p className="text-[10px] text-muted-foreground">
                                  {emp.designation || "Staff Member"}
                                </p>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-1.5 min-w-[150px]">
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 text-xs font-bold px-2 py-0.5">
                                    {el} Days EL
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {cycleDays}/{threshold} days
                                  </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <p className="text-[9px] text-muted-foreground">
                                  +{company.elDaysEarnedPerCycle ?? 2} EL on {threshold} working days
                                </p>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold px-2 py-0.5">
                                {cl} Days
                              </Badge>
                            </td>

                            <td className="py-3 px-3">
                              <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 font-bold px-2 py-0.5">
                                {sl} Days
                              </Badge>
                            </td>

                            <td className="py-3 px-3">
                              <Badge className="bg-foreground text-background font-bold px-2.5 py-0.5 shadow-xs">
                                {totalPaid} Days
                              </Badge>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAdjustingEmp(emp);
                                  setAdjustForm({
                                    el: emp.leaveBalances?.EL ?? 15,
                                    cl: emp.leaveBalances?.CL ?? 10,
                                    sl: emp.leaveBalances?.SL ?? 8,
                                    workingDays: emp.qualifyingWorkingDaysCounter ?? 0,
                                  });
                                }}
                                className="h-8 text-xs font-semibold rounded-xl gap-1"
                              >
                                <SlidersHorizontal className="h-3 w-3 text-primary" />
                                <span>Adjust</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: LEAVE POLICY TYPES & EARNED LEAVE SETTINGS */}
      {activeTab === "leave-policy" && (
        <div className="space-y-6 max-w-5xl">
          {/* 1. Leave Policy Types Card */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Tag className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-bold">Leave Policy Types</CardTitle>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {(company.leaveTypes || []).length} Entitlements
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Define annual day-based leave quotas for employees. Employees apply for full-day or half-day leaves against these entitlements.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() =>
                    setCompany({
                      leaveTypes: [
                        ...(company.leaveTypes || []),
                        { id: crypto.randomUUID(), name: "New Leave", days: 6, paid: true },
                      ],
                    })
                  }
                  className="gap-1.5 text-xs h-9 rounded-xl font-semibold bg-primary text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Leave Type</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-[1fr_140px_110px_40px] gap-3 text-xs text-muted-foreground font-semibold px-2 uppercase tracking-wider">
                <span>Leave Type Name</span>
                <span>Days / Year</span>
                <span className="text-center">Paid Status</span>
                <span />
              </div>

              {(company.leaveTypes || []).map((l, i) => (
                <div
                  key={l.id}
                  className="grid grid-cols-[1fr_140px_110px_40px] gap-3 items-center p-2 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 transition-colors"
                >
                  <Input
                    value={l.name}
                    placeholder="e.g. Casual Leave, Medical Leave, Annual Leave"
                    onChange={(e) => {
                      const copy = [...(company.leaveTypes || [])];
                      copy[i] = { ...l, name: e.target.value };
                      setCompany({ leaveTypes: copy });
                    }}
                    className="font-medium text-xs h-9"
                  />

                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      value={l.days}
                      onChange={(e) => {
                        const copy = [...(company.leaveTypes || [])];
                        copy[i] = { ...l, days: +e.target.value || 0 };
                        setCompany({ leaveTypes: copy });
                      }}
                      className="font-semibold text-xs h-9 text-center"
                    />
                    <span className="text-xs text-muted-foreground font-medium">days</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...(company.leaveTypes || [])];
                      copy[i] = { ...l, paid: l.paid === false ? true : false };
                      setCompany({ leaveTypes: copy });
                    }}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                      l.paid !== false
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {l.paid !== false ? "Paid" : "Unpaid"}
                  </button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      setCompany({
                        leaveTypes: (company.leaveTypes || []).filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <p className="text-[11px] text-muted-foreground">
                  Changes take effect immediately on employee leave application portals upon saving.
                </p>

                <Button
                  onClick={async () => {
                    setSavingLeavePolicy(true);
                    try {
                      await saveAllCompanySettings();
                      toast.success("Leave policy types saved to cloud database!");
                    } catch (e: any) {
                      toast.error("Failed to save leave policy: " + (e?.message || e));
                    } finally {
                      setSavingLeavePolicy(false);
                    }
                  }}
                  disabled={savingLeavePolicy}
                  className="gap-2 bg-primary text-primary-foreground font-semibold px-6 h-9 rounded-xl shadow-xs"
                >
                  {savingLeavePolicy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>{savingLeavePolicy ? "Saving Policy..." : "Save Leave Policy"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. Earned Leave (EL) Policy Engine (Directly below Leave Policy Types) */}
          <Card className="rounded-2xl border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Coins className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-bold">Earned Leave (EL) Policy Engine</CardTitle>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                      Intelligent Leave Engine
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Replaces static annual EL quotas with automated working-day accrual, year-end carry forward limits, and payroll encashment.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Sub-section A: Dynamic Working-Day Accrual Rule */}
              <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Sub-section A: Dynamic Working-Day Accrual Rule
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Credits EL automatically after an employee completes qualifying working days.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {company.elAccrualEnabled !== false ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={company.elAccrualEnabled !== false}
                      onCheckedChange={(checked) => setCompany({ elAccrualEnabled: checked })}
                    />
                  </div>
                </div>

                {company.elAccrualEnabled !== false && (
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Qualifying Working Days Required</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={company.elWorkingDaysThreshold ?? 20}
                            onChange={(e) =>
                              setCompany({ elWorkingDaysThreshold: Math.max(1, +e.target.value || 20) })
                            }
                            className="text-xs h-9"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Days</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Earned Leave Days Credited</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.5"
                            min={0.5}
                            value={company.elDaysEarnedPerCycle ?? 2}
                            onChange={(e) =>
                              setCompany({ elDaysEarnedPerCycle: Math.max(0.5, +e.target.value || 2) })
                            }
                            className="text-xs h-9"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Days</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-primary/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="leading-relaxed">
                        <span className="font-semibold">Helper Rule: </span>
                        For every <strong className="font-bold underline">{company.elWorkingDaysThreshold ?? 20}</strong> actual working days completed (excluding Sundays, roster week-offs, holiday Saturdays, and public holidays), <strong className="font-bold underline">{company.elDaysEarnedPerCycle ?? 2}</strong> Earned Leave day(s) will be credited to the employee&apos;s EL balance.
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const res = evaluateEarnedLeaveAccrual();
                          if (res.affectedEmployees > 0) {
                            toast.success(`Accrued +${res.creditedCount} EL days across ${res.affectedEmployees} employees!`);
                          } else {
                            toast.info("All employee working day counters are currently evaluated.");
                          }
                        }}
                        className="h-8 text-[11px] shrink-0 font-semibold"
                      >
                        Evaluate & Accrue Now
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-section B: Year-End Leave Carry Forward Rule */}
              <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-600" />
                      Sub-section B: Year-End Leave Carry Forward Rule
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Controls year-end rollover caps and automatic lapsing of accumulated EL.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {company.elCarryForwardEnabled !== false ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={company.elCarryForwardEnabled !== false}
                      onCheckedChange={(checked) => setCompany({ elCarryForwardEnabled: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-border/60">
                  {company.elCarryForwardEnabled !== false ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Maximum Carry Forward Cap (Days)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={company.elMaxCarryForwardDays ?? 20}
                              onChange={(e) =>
                                setCompany({ elMaxCarryForwardDays: Math.max(0, +e.target.value || 0) })
                              }
                              className="text-xs h-9"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Days Cap</span>
                          </div>
                        </div>

                        <div className="flex items-end justify-start sm:justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setRolloverConfirmOpen(true)}
                            className="h-9 text-xs rounded-xl font-bold shadow-xs gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Run Year-End Rollover
                          </Button>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        At year-end reset, remaining EL balance is carried forward up to this cap (e.g., if cap is {company.elMaxCarryForwardDays ?? 20} and remaining balance is 32, employee starts next year with {company.elMaxCarryForwardDays ?? 20} EL; if remaining balance is 17, all 17 carry forward). Any balance above the cap lapses unless encashed.
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                        All unused Earned Leave balances expire at year-end. Employees start the new leave year with 0 EL.
                      </p>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setRolloverConfirmOpen(true)}
                        className="h-8 text-xs rounded-xl font-bold shrink-0"
                      >
                        Run Year-End Reset
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-section C: Leave Encashment Policy */}
              <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-amber-600" />
                      Sub-section C: Leave Encashment Policy
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Allows employees to encash unused EL for direct monetary payout in monthly payroll.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {company.elEncashmentEnabled !== false ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={company.elEncashmentEnabled !== false}
                      onCheckedChange={(checked) => setCompany({ elEncashmentEnabled: checked })}
                    />
                  </div>
                </div>

                {company.elEncashmentEnabled !== false && (
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Daily Encashment Rate Basis</Label>
                        <select
                          value={company.elEncashmentCalculationBase || "basic_plus_da"}
                          onChange={(e) =>
                            setCompany({ elEncashmentCalculationBase: e.target.value as any })
                          }
                          className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 font-medium shadow-xs"
                        >
                          <option value="basic_plus_da">Basic + DA (Recommended statutory standard)</option>
                          <option value="gross_salary">Gross Salary (Fixed Monthly CTC Gross)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Minimum EL Balance Required to Apply</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={company.elEncashmentMinBalanceRequired ?? 0}
                            onChange={(e) =>
                              setCompany({
                                elEncashmentMinBalanceRequired: Math.max(0, +e.target.value || 0),
                              })
                            }
                            className="text-xs h-9"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Days</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Employees can apply to encash either their entire available EL balance or any custom number of EL days for direct monetary payout in monthly payroll.
                    </p>
                  </div>
                )}
              </div>

              {/* Save EL Settings Button */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <p className="text-[11px] text-muted-foreground">
                  EL accruals, rollover limits, and encashment parameters sync directly across payroll and requests portals.
                </p>

                <Button
                  onClick={async () => {
                    setSavingELPolicy(true);
                    try {
                      await saveAllCompanySettings();
                      toast.success("Earned Leave (EL) settings saved successfully!");
                    } catch (e: any) {
                      toast.error("Failed to save EL settings: " + (e?.message || e));
                    } finally {
                      setSavingELPolicy(false);
                    }
                  }}
                  disabled={savingELPolicy}
                  className="gap-2 bg-primary text-primary-foreground font-semibold px-6 h-9 rounded-xl shadow-xs"
                >
                  {savingELPolicy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>{savingELPolicy ? "Saving EL Settings..." : "Save EL Settings"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: PERMISSION POLICY TYPES */}
      {activeTab === "permission-policy" && (
        <div className="space-y-6 max-w-5xl">
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-bold">Permission Policy Types</CardTitle>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {(company.permissionTypes || []).length} Types
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Configure short-duration permission allowances (e.g. 2 hours per month). Employees apply in hours for late entry, early exit, or personal emergency. Quotas reset automatically based on selected frequency.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    const currentList = company.permissionTypes ?? [
                      { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
                    ];
                    setCompany({
                      permissionTypes: [
                        ...currentList,
                        {
                          id: crypto.randomUUID(),
                          name: "Personal Permission",
                          maxHours: 2,
                          period: "month",
                          maxRequestsPerMonth: 2,
                          paid: true,
                        },
                      ],
                    });
                  }}
                  className="gap-1.5 text-xs h-9 rounded-xl font-semibold bg-primary text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Permission Type</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-[1fr_130px_130px_140px_100px_40px] gap-3 text-xs text-muted-foreground font-semibold px-2 uppercase tracking-wider">
                <span>Permission Name</span>
                <span>Allowed Hours</span>
                <span>Reset Cycle</span>
                <span>Max Requests / Mo</span>
                <span className="text-center">Paid Status</span>
                <span />
              </div>

              {(company.permissionTypes ?? [
                { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
              ]).map((p, i) => {
                const currentList = company.permissionTypes ?? [
                  { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
                ];
                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_130px_130px_140px_100px_40px] gap-3 items-center p-2 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    <Input
                      value={p.name}
                      placeholder="e.g. Standard Permission"
                      onChange={(e) => {
                        const copy = [...currentList];
                        copy[i] = { ...p, name: e.target.value };
                        setCompany({ permissionTypes: copy });
                      }}
                      className="font-medium text-xs h-9"
                    />

                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={p.maxHours}
                        min={0.5}
                        step={0.5}
                        onChange={(e) => {
                          const copy = [...currentList];
                          copy[i] = { ...p, maxHours: +e.target.value || 0 };
                          setCompany({ permissionTypes: copy });
                        }}
                        className="font-semibold text-xs h-9 text-center"
                      />
                      <span className="text-xs text-muted-foreground font-medium">hrs</span>
                    </div>

                    <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...currentList];
                          copy[i] = { ...p, period: "month" };
                          setCompany({ permissionTypes: copy });
                        }}
                        className={`flex-1 py-1.5 text-center transition-colors ${
                          p.period === "month"
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        /Mo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...currentList];
                          copy[i] = { ...p, period: "year" };
                          setCompany({ permissionTypes: copy });
                        }}
                        className={`flex-1 py-1.5 text-center transition-colors ${
                          p.period === "year"
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        /Yr
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={p.maxRequestsPerMonth ?? ""}
                        placeholder="2"
                        onChange={(e) => {
                          const copy = [...currentList];
                          const val = e.target.value === "" ? undefined : +e.target.value || 0;
                          copy[i] = { ...p, maxRequestsPerMonth: val };
                          setCompany({ permissionTypes: copy });
                        }}
                        className="font-semibold text-xs h-9 text-center"
                      />
                      <span className="text-xs text-muted-foreground font-medium">times</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...currentList];
                        copy[i] = { ...p, paid: p.paid === false ? true : false };
                        setCompany({ permissionTypes: copy });
                      }}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                        p.paid !== false
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {p.paid !== false ? "Paid" : "Unpaid"}
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        setCompany({
                          permissionTypes: currentList.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <p className="text-[11px] text-muted-foreground">
                  Short permissions deduct from monthly working hours and are cross-referenced during attendance regularization.
                </p>

                <Button
                  onClick={async () => {
                    setSavingLeavePolicy(true);
                    try {
                      await saveAllCompanySettings();
                      toast.success("Permission policy types saved to cloud database!");
                    } catch (e: any) {
                      toast.error("Failed to save permission policy: " + (e?.message || e));
                    } finally {
                      setSavingLeavePolicy(false);
                    }
                  }}
                  disabled={savingLeavePolicy}
                  className="gap-2 bg-primary text-primary-foreground font-semibold px-6 h-9 rounded-xl shadow-xs"
                >
                  {savingLeavePolicy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>{savingLeavePolicy ? "Saving Policy..." : "Save Permission Policy"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: ABSENCE OF WORK CONTROL (AWOL) */}
      {activeTab === "awol-control" && (
        <div className="space-y-6 max-w-5xl">
          <div className="rounded-2xl border border-rose-500/25 bg-card p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Unauthorized Absence (AWOL) Control
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        company.awolControlEnabled
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {company.awolControlEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Monitor consecutive uninformed absences (Status: 'A'), trigger automated AWOL warnings or terminations, and apply daily penalty deductions in payroll.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center bg-muted/40 px-3.5 py-2 rounded-xl border border-border">
                <span className="text-xs font-semibold text-foreground">
                  {company.awolControlEnabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={Boolean(company.awolControlEnabled)}
                  onCheckedChange={(checked) => {
                    setCompany({
                      awolControlEnabled: checked,
                      awolDaysLimit: company.awolDaysLimit ?? 3,
                      awolPenaltyAmountPerDay: company.awolPenaltyAmountPerDay ?? 500,
                    });
                    toast.success(
                      checked
                        ? "Unauthorized Absence (AWOL) Control enabled"
                        : "Unauthorized Absence (AWOL) Control disabled"
                    );
                  }}
                />
              </div>
            </div>

            <div
              className={`grid transition-all duration-300 ease-in-out ${
                company.awolControlEnabled
                  ? "grid-rows-[1fr] opacity-100 pt-2 border-t border-border/60"
                  : "grid-rows-[0fr] opacity-0 pointer-events-none"
              }`}
            >
              <div className="overflow-hidden space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* A. Termination Settings */}
                  <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
                            A
                          </span>
                          Termination Settings
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Track consecutive unauthorized absent working days and enforce AWOL thresholds.
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(company.awolTerminationEnabled)}
                        onCheckedChange={(checked) =>
                          setCompany({
                            awolTerminationEnabled: checked,
                            awolDaysLimit: company.awolDaysLimit ?? 3,
                          })
                        }
                      />
                    </div>

                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        company.awolTerminationEnabled
                          ? "grid-rows-[1fr] opacity-100 pt-3 border-t border-border/60"
                          : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="overflow-hidden space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            Consecutive AWOL Days Limit
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              value={company.awolDaysLimit ?? 3}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value) || 1);
                                setCompany({ awolDaysLimit: val });
                              }}
                              className="w-28 font-semibold"
                            />
                            <span className="text-xs text-muted-foreground font-medium">
                              Consecutive Working Days (triggers on Day {(company.awolDaysLimit ?? 3) + 1})
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            If set to 3 days, crossing into the 4th consecutive day of unauthorized absence (Status: 'A') triggers termination alerts and AWOL warning badges.
                          </p>
                        </div>

                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <Label className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                              Auto-Terminate Employee
                            </Label>
                            <Switch
                              checked={Boolean(company.awolAutoTerminate)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setConfirmAutoTerminateOpen(true);
                                } else {
                                  setCompany({ awolAutoTerminate: false });
                                  toast.info("Auto-Terminate Employee disabled");
                                }
                              }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Automatically update employee status to 'Terminated (AWOL)' when they reach (Limit + 1) consecutive days of unauthorized absence.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* B. Penalty Deduction Settings */}
                  <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                            B
                          </span>
                          Penalty Deduction Settings
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Apply a per-day flat fine on uninformed absences during monthly payroll runs.
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(company.awolPenaltyEnabled)}
                        onCheckedChange={(checked) =>
                          setCompany({
                            awolPenaltyEnabled: checked,
                            awolPenaltyAmountPerDay: company.awolPenaltyAmountPerDay ?? 500,
                          })
                        }
                      />
                    </div>

                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        company.awolPenaltyEnabled
                          ? "grid-rows-[1fr] opacity-100 pt-3 border-t border-border/60"
                          : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="overflow-hidden space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            AWOL Penalty Amount (₹ per day)
                          </Label>
                          <div className="relative max-w-xs">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-muted-foreground">
                              <IndianRupee className="h-3.5 w-3.5" />
                            </span>
                            <Input
                              type="number"
                              min={0}
                              value={company.awolPenaltyAmountPerDay ?? 500}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                setCompany({ awolPenaltyAmountPerDay: val });
                              }}
                              className="pl-8 font-semibold"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Additional flat penalty deducted from Net Salary per unauthorized absent day (on top of standard Loss of Pay proration).
                          </p>
                        </div>

                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-muted-foreground space-y-1">
                          <div className="font-semibold text-blue-700 dark:text-blue-300">
                            Payroll Impact Preview
                          </div>
                          <div>
                            1 Uninformed Absent Day ('A') = Standard 1-Day LOP +{" "}
                            <span className="font-bold text-foreground">
                              ₹{(company.awolPenaltyAmountPerDay ?? 500).toLocaleString("en-IN")}/day
                            </span>{" "}
                            AWOL Penalty (excluded for Paid Leave 'PL' and Informed Leave 'IL').
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button for AWOL Control */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={async () => {
                      setSavingLeavePolicy(true);
                      try {
                        await saveAllCompanySettings();
                        toast.success("Unauthorized absence (AWOL) control settings saved!");
                      } catch (e: any) {
                        toast.error("Failed to save absence control: " + (e?.message || e));
                      } finally {
                        setSavingLeavePolicy(false);
                      }
                    }}
                    disabled={savingLeavePolicy}
                    className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 h-9 rounded-xl shadow-xs"
                  >
                    {savingLeavePolicy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>{savingLeavePolicy ? "Saving Settings..." : "Save Absence Control"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Modal for Auto-Terminate Option */}
          <Dialog open={confirmAutoTerminateOpen} onOpenChange={setConfirmAutoTerminateOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                  Enable Auto-Terminate for AWOL?
                </DialogTitle>
                <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground">
                  Enabling <strong>Auto-Terminate Employee</strong> will automatically mark any active employee as{" "}
                  <span className="font-bold text-rose-600 dark:text-rose-400">Terminated (AWOL)</span> and revoke their portal access once they cross{" "}
                  <strong>{(company.awolDaysLimit ?? 3) + 1}+ consecutive working days</strong> of unauthorized absence (Status: 'A').
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                Are you sure you want to enable automatic termination on Day {(company.awolDaysLimit ?? 3) + 1} of consecutive AWOL?
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setConfirmAutoTerminateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => {
                    setCompany({ awolAutoTerminate: true });
                    setConfirmAutoTerminateOpen(false);
                    toast.warning(
                      `Auto-Terminate enabled: employees reaching ${(company.awolDaysLimit ?? 3) + 1}+ consecutive AWOL days will be automatically terminated.`
                    );
                  }}
                >
                  Yes, Enable Auto-Terminate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 5. ADD / EDIT HOLIDAY MODAL */}
      {/* ========================================================================= */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Office Holiday" : "Add Office Holiday"}</DialogTitle>
            <DialogDescription>
              Declare an official company holiday that will be published to all employees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Holiday Name *</Label>
              <Input
                placeholder="e.g. Independence Day, Diwali, Eid al-Fitr"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">From Date *</Label>
                <Input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">To Date (Optional)</Label>
                <Input
                  type="date"
                  value={holidayToDate}
                  onChange={(e) => setHolidayToDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Holiday Classification *</Label>
              <Select value={holidayType} onValueChange={(v) => setHolidayType(v as HolidayType)}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HOLIDAY_TYPE_CONFIG).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Applicable Branch Location</Label>
              <Select value={holidayBranches} onValueChange={setHolidayBranches}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches & Locations</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
              <input
                type="checkbox"
                id="isMandatoryCheck"
                checked={holidayMandatory}
                onChange={(e) => setHolidayMandatory(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="isMandatoryCheck" className="text-xs font-medium cursor-pointer">
                Mandatory Paid Holiday (All employees off)
              </label>
            </div>

            <div>
              <Label className="text-xs font-semibold">Description / Notes</Label>
              <Textarea
                placeholder="Optional notes regarding celebrations, regional rules, etc."
                value={holidayDesc}
                onChange={(e) => setHolidayDesc(e.target.value)}
                className="mt-1 text-xs h-16"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveHoliday} className="bg-gradient-brand text-white font-bold">
              {editingId ? "Save Changes" : "Create Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. BULK IMPORT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-purple-600" />
              Bulk Holiday CSV Import Preview
            </DialogTitle>
            <DialogDescription>
              Review the parsed rows from your CSV file before committing to the company calendar.
            </DialogDescription>
          </DialogHeader>

          {parsedBulk && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                  <span className="text-muted-foreground block text-[11px]">Total Rows</span>
                  <span className="font-bold text-base">{parsedBulk.totalCount}</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-center">
                  <span className="text-emerald-700 block text-[11px]">Valid Holidays</span>
                  <span className="font-bold text-base text-emerald-700">{parsedBulk.validCount}</span>
                </div>
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-center">
                  <span className="text-rose-700 block text-[11px]">Errors / Skipped</span>
                  <span className="font-bold text-base text-rose-700">{parsedBulk.errorCount}</span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-muted/60 sticky top-0 border-b border-border">
                    <tr>
                      <th className="p-2">Line</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedBulk.parsedRows.map((r, i) => (
                      <tr key={i} className={r.isValid ? "hover:bg-muted/20" : "bg-rose-500/10"}>
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-semibold">{r.name || "—"}</td>
                        <td className="p-2 font-mono">{r.date || "—"}</td>
                        <td className="p-2">{r.type}</td>
                        <td className="p-2">
                          {r.isValid ? (
                            <span className="text-emerald-600 font-bold">✓ Ready</span>
                          ) : (
                            <span className="text-rose-600 font-medium">{r.errors.join(", ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmImport}
              disabled={importing || !parsedBulk || parsedBulk.validCount === 0}
              className="bg-gradient-brand text-white font-bold"
            >
              {importing ? "Importing..." : `Import ${parsedBulk?.validCount || 0} Holidays`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADJUST EMPLOYEE LEAVE BALANCES DIALOG */}
      <Dialog open={Boolean(adjustingEmp)} onOpenChange={(open) => !open && setAdjustingEmp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <span>Adjust Leave Balances</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manually modify available leave quotas or working-day counter for{" "}
              <strong className="text-foreground">{adjustingEmp?.name}</strong> ({adjustingEmp?.empCode}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-primary">Earned Leave (EL)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={adjustForm.el}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, el: +e.target.value || 0 }))}
                  className="text-xs h-9 text-center font-bold"
                />
                <span className="text-[10px] text-muted-foreground block text-center">Days</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Casual Leave (CL)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={adjustForm.cl}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, cl: +e.target.value || 0 }))}
                  className="text-xs h-9 text-center font-bold"
                />
                <span className="text-[10px] text-muted-foreground block text-center">Days</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-sky-600 dark:text-sky-400">Sick Leave (SL)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={adjustForm.sl}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, sl: +e.target.value || 0 }))}
                  className="text-xs h-9 text-center font-bold"
                />
                <span className="text-[10px] text-muted-foreground block text-center">Days</span>
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Qualifying Working Days Counter</Label>
                <span className="text-[11px] font-bold text-primary font-mono">
                  {adjustForm.workingDays} / {company.elWorkingDaysThreshold ?? 20} days
                </span>
              </div>
              <Input
                type="number"
                step="1"
                min="0"
                value={adjustForm.workingDays}
                onChange={(e) => setAdjustForm((p) => ({ ...p, workingDays: Math.max(0, +e.target.value || 0) }))}
                className="text-xs h-8"
              />
              <p className="text-[10px] text-muted-foreground">
                Progress towards next cycle (+{company.elDaysEarnedPerCycle ?? 2} EL upon reaching {company.elWorkingDaysThreshold ?? 20} qualifying days).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAdjustingEmp(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!adjustingEmp) return;
                updateEmployee(adjustingEmp.id, {
                  leaveBalances: {
                    ...(adjustingEmp.leaveBalances || {}),
                    EL: Math.max(0, adjustForm.el),
                    CL: Math.max(0, adjustForm.cl),
                    SL: Math.max(0, adjustForm.sl),
                  },
                  qualifyingWorkingDaysCounter: Math.max(0, adjustForm.workingDays),
                });
                toast.success(`Updated leave balances for ${adjustingEmp.name}`);
                setAdjustingEmp(null);
              }}
              className="bg-primary text-primary-foreground font-semibold"
            >
              Save Balances
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YEAR-END LEAVE ROLLOVER CONFIRMATION MODAL */}
      <Dialog open={rolloverConfirmOpen} onOpenChange={setRolloverConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirm Year-End Leave Rollover</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {company.elCarryForwardEnabled !== false
                ? `This will process all employee EL balances. Unused EL above ${company.elMaxCarryForwardDays ?? 20} days will lapse, and up to ${company.elMaxCarryForwardDays ?? 20} days will carry forward into opening balance for next year.`
                : "Carry forward is disabled. All employee EL balances will lapse to 0 days for next year."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setRolloverConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const res = processYearEndLeaveRollover();
                setRolloverConfirmOpen(false);
                toast.success(
                  `Year-end rollover complete: ${res.rolledOverEmployees} employees processed (${res.totalCarriedDays} days carried forward, ${res.totalLapsedDays} days lapsed).`
                );
                await saveAllCompanySettings();
              }}
            >
              Execute Year-End Rollover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
