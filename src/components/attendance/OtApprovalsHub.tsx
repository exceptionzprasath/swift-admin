import React, { useMemo, useState, useEffect } from "react";
import {
  useStore,
  isActiveEmployee,
  type AttendanceRecord,
  type Employee,
  type ShiftType,
  type PayrollRun,
} from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { EmploymentTypeBadge } from "@/components/employment-type-badge";
import { RestDayWorkApprovalHub } from "./RestDayWorkApprovalHub";
import { cn } from "@/lib/utils";
import {
  Clock,
  CalendarCheck,
  Search,
  Check,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Eye,
  CheckCheck,
  IndianRupee,
  Layers,
  Sparkles,
  FileCheck,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

interface OtApprovalsHubProps {
  getScheduledShiftForDate: (
    emp: Employee,
    dateStr: string
  ) => { shift: Partial<ShiftType>; isWeeklyOff: boolean; isHoliday: boolean; holidayName?: string };
  onInspectRecord?: (data: { emp: Employee; rec?: AttendanceRecord; date: string }) => void;
}

interface DailyOtItem {
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workedHours: number;
  otHours: number;
}

interface OtRecordItem {
  emp: Employee;
  rawOtHours: number;
  otApprovedHours: number;
  otStatus: "pending" | "approved" | "rejected";
  dailyOtRecords: DailyOtItem[];
  hourlyRate: number;
  estimatedOtPay: number;
}

export const OtApprovalsHub: React.FC<OtApprovalsHubProps> = ({
  getScheduledShiftForDate,
  onInspectRecord,
}) => {
  const {
    employees: rawEmployees,
    attendance,
    company,
    payrolls,
    addPayroll,
    currentUser,
    setCompany,
    saveAllCompanySettings,
  } = useStore();
  const { user } = useAuth();

  const [isOtSettingsOpen, setIsOtSettingsOpen] = useState(false);
  const [savingOtSettings, setSavingOtSettings] = useState(false);

  const employees = useMemo(() => (rawEmployees || []).filter(isActiveEmployee), [rawEmployees]);

  // Main Sub-Tab: "overtime" vs "rest-day"
  const [subTab, setSubTab] = useState<"overtime" | "rest-day">("overtime");

  // Selected Month (Format: "YYYY-MM")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Local monthly overrides state for OT approvals
  const [monthlyOverrides, setMonthlyOverrides] = useState<Record<string, any>>({});

  // Rehydrate overrides from payrolls in store
  useEffect(() => {
    if (payrolls && payrolls.length > 0) {
      setMonthlyOverrides((prev) => {
        let changed = false;
        const next = { ...prev };
        payrolls.forEach((p) => {
          if (p.overrideData) {
            const key = `${p.month}_${p.employeeId}`;
            if (!next[key]) {
              next[key] = p.overrideData;
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [payrolls]);

  // Filters for Overtime Sub-Tab
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // Breakdown Modal Target
  const [breakdownTarget, setBreakdownTarget] = useState<OtRecordItem | null>(null);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department?.trim()) set.add(e.department.trim());
    });
    return Array.from(set).sort();
  }, [employees]);

  // Compute Overtime Records for selectedMonth
  const otRecords = useMemo(() => {
    const list: OtRecordItem[] = [];
    const wd = company.workingDaysPerMonth || 26;
    const stdH = company.workingHoursPerDay || 9;
    const otMult = company.otMultiplier || 2;

    employees.forEach((emp) => {
      if (emp.otEnabled === false) return;

      const fixedGross = emp.fixedSalary ?? emp.basic ?? emp.salary ?? 0;
      const hourlyRate = fixedGross > 0 ? fixedGross / (wd * stdH) : 0;

      // Filter attendance records in selectedMonth
      const monthAtt = (attendance || []).filter((a) => {
        if (!a || !a.date) return false;
        const matchesEmp =
          a.employeeId === emp.id ||
          (emp.empCode && (a.empCode === emp.empCode || a.employeeId === emp.empCode)) ||
          (a.employeeName && emp.name && a.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase());
        return matchesEmp && a.date.startsWith(selectedMonth);
      });

      const dailyOtRecords: DailyOtItem[] = [];

      monthAtt.forEach((a) => {
        let dayOt = 0;
        let workedH = 0;
        const inTime = a.checkIn || a.clockIn;
        const outTime = a.checkOut || a.clockOut;

        if (a.otHours !== undefined && a.otHours !== null) {
          dayOt = Number(a.otHours) || 0;
        }

        if (inTime && outTime) {
          try {
            const parseT = (s: string): number => {
              const cleaned = s.trim().toLowerCase();
              const m = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
              if (!m) return -1;
              let h = parseInt(m[1], 10);
              const mins = parseInt(m[2], 10);
              const mer = m[3]?.toLowerCase();
              if (mer === "pm" && h < 12) h += 12;
              if (mer === "am" && h === 12) h = 0;
              return h * 60 + mins;
            };
            const inM = parseT(inTime);
            const outM = parseT(outTime);
            if (inM >= 0 && outM >= 0) {
              let diffM = outM - inM;
              if (diffM <= 0) diffM += 24 * 60;
              workedH = Math.round((diffM / 60) * 10) / 10;
              if (a.otHours === undefined || a.otHours === null) {
                dayOt = workedH > stdH ? Math.round((workedH - stdH) * 10) / 10 : 0;
              }
            }
          } catch {}
        }

        const isSun = a.date && new Date(a.date + "T12:00:00Z").getUTCDay() === 0;
        const isRest = Boolean(isSun || a.isRestDayWork);
        const isRestDayPending = isRest && a.restDayWorkStatus !== "approved";

        if (dayOt > 0 || (isRest && workedH > 0)) {
          dailyOtRecords.push({
            date: a.date,
            checkIn: inTime || "—",
            checkOut: outTime || "—",
            status: isRest
              ? a.restDayWorkStatus === "approved"
                ? `Rest Day Work (Approved · ${a.restDayApprovedHours ?? workedH}h)`
                : a.restDayWorkStatus === "rejected"
                ? "Rest Day Work (Declined)"
                : "Rest Day Work (Pending Approval)"
              : a.status || "present",
            workedHours: workedH,
            otHours: isRestDayPending ? 0 : dayOt,
          });
        }
      });

      const rawOtHours = dailyOtRecords.reduce((sum, d) => sum + d.otHours, 0);

      // Check override
      const overrideKey = `${selectedMonth}_${emp.id}`;
      const ov = monthlyOverrides[overrideKey] || {};
      const otApprovedHours = ov.otApprovedHours !== undefined ? ov.otApprovedHours : rawOtHours;
      const otStatus: "pending" | "approved" | "rejected" = ov.otStatus || (rawOtHours > 0 ? "pending" : "approved");

      if (rawOtHours > 0 || ov.otStatus !== undefined) {
        const estimatedOtPay = Math.round(hourlyRate * otApprovedHours * otMult);
        list.push({
          emp,
          rawOtHours,
          otApprovedHours,
          otStatus,
          dailyOtRecords: dailyOtRecords.sort((a, b) => b.date.localeCompare(a.date)),
          hourlyRate: Math.round(hourlyRate),
          estimatedOtPay,
        });
      }
    });

    return list.sort((a, b) => a.emp.name.localeCompare(b.emp.name));
  }, [employees, attendance, company, selectedMonth, monthlyOverrides]);

  // Filtered OT records
  const filteredOtRecords = useMemo(() => {
    return otRecords.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = item.emp.name?.toLowerCase().includes(q);
        const mCode = item.emp.empCode?.toLowerCase().includes(q);
        if (!mName && !mCode) return false;
      }
      if (departmentFilter !== "all" && item.emp.department !== departmentFilter) return false;
      if (statusFilter !== "all" && item.otStatus !== statusFilter) return false;
      if (dateFilter) {
        const hasDate = item.dailyOtRecords.some((d) => d.date === dateFilter && d.otHours > 0);
        if (!hasDate) return false;
      }
      return true;
    });
  }, [otRecords, searchQuery, departmentFilter, statusFilter, dateFilter]);

  // Rest Day Records Pending Count
  const pendingRestDayCount = useMemo(() => {
    return (attendance || []).filter((a) => {
      if (!a || !a.date || (!a.checkIn && !a.clockIn && !a.isRestDayWork)) return false;
      const isSun = new Date(a.date + "T12:00:00Z").getUTCDay() === 0;
      return (isSun || a.isRestDayWork) && a.restDayWorkStatus !== "approved" && a.restDayWorkStatus !== "rejected";
    }).length;
  }, [attendance]);

  // OT KPI Summary Counts
  const otCounts = useMemo(() => {
    const pending = otRecords.filter((r) => r.otStatus === "pending");
    const approved = otRecords.filter((r) => r.otStatus === "approved");
    const pendingHours = pending.reduce((sum, r) => sum + r.rawOtHours, 0);
    const approvedHours = approved.reduce((sum, r) => sum + r.otApprovedHours, 0);
    const totalEstLiability = otRecords.reduce((sum, r) => sum + r.estimatedOtPay, 0);

    return {
      pendingStaff: pending.length,
      pendingHours: Math.round(pendingHours * 10) / 10,
      approvedStaff: approved.length,
      approvedHours: Math.round(approvedHours * 10) / 10,
      totalEstLiability,
    };
  }, [otRecords]);

  // Month Navigator Handlers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleThisMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  };

  // Month Display Name
  const monthDisplayName = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  // Handle Approve Single OT
  const handleApproveOt = (empId: string, hours?: number) => {
    const rec = otRecords.find((r) => r.emp.id === empId);
    if (!rec) return;

    const approvedHours = hours !== undefined ? hours : rec.rawOtHours;
    const overrideKey = `${selectedMonth}_${empId}`;
    const ov = monthlyOverrides[overrideKey] || {};

    const updatedOv = {
      ...ov,
      otStatus: "approved" as const,
      otApprovedHours: approvedHours,
      otHours: approvedHours,
      otApprovedAt: new Date().toISOString(),
      otApprovedBy: currentUser?.name || user?.name || "Admin",
    };

    setMonthlyOverrides((prev) => ({ ...prev, [overrideKey]: updatedOv }));

    addPayroll({
      id: `pay-${empId}-${selectedMonth}`,
      employeeId: empId,
      empCode: rec.emp.empCode,
      employeeName: rec.emp.name,
      month: monthDisplayName,
      daysWorked: 26,
      otHours: approvedHours,
      incentive: updatedOv.incentive || 0,
      shiftDays: 26,
      loan: 0,
      advance: 0,
      bonus: 0,
      computed: {} as any,
      overrideData: updatedOv,
      createdAt: new Date().toISOString(),
    });

    toast.success(`Approved ${approvedHours}h overtime for ${rec.emp.name}!`);
  };

  // Handle Reject Single OT
  const handleRejectOt = (empId: string) => {
    const rec = otRecords.find((r) => r.emp.id === empId);
    if (!rec) return;

    const overrideKey = `${selectedMonth}_${empId}`;
    const ov = monthlyOverrides[overrideKey] || {};

    const updatedOv = {
      ...ov,
      otStatus: "rejected" as const,
      otApprovedHours: 0,
      otHours: 0,
      otApprovedAt: new Date().toISOString(),
      otApprovedBy: currentUser?.name || user?.name || "Admin",
    };

    setMonthlyOverrides((prev) => ({ ...prev, [overrideKey]: updatedOv }));
    toast.error(`Declined overtime for ${rec.emp.name}.`);
  };

  // Bulk Actions
  const handleApproveSelected = () => {
    if (selectedEmpIds.length === 0) return;
    selectedEmpIds.forEach((id) => handleApproveOt(id));
    setSelectedEmpIds([]);
    toast.success(`Approved overtime for ${selectedEmpIds.length} employees.`);
  };

  const handleDeclineSelected = () => {
    if (selectedEmpIds.length === 0) return;
    selectedEmpIds.forEach((id) => handleRejectOt(id));
    setSelectedEmpIds([]);
    toast.info(`Declined overtime for ${selectedEmpIds.length} employees.`);
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP CONTROLS & SUB-NAVIGATOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        {/* Segmented Sub-View Toggle (OT vs Rest Day Work) */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-primary/30 shadow-xs shadow-primary/5">
          <button
            type="button"
            onClick={() => setSubTab("overtime")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              subTab === "overtime"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Overtime (OT) Approvals</span>
            {otCounts.pendingStaff > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                {otCounts.pendingStaff}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab("rest-day")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              subTab === "rest-day"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Rest Day & Holiday Work</span>
            {pendingRestDayCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                {pendingRestDayCount}
              </Badge>
            )}
          </button>
        </div>

        {/* Month Selector for OT Requests */}
        {subTab === "overtime" && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-background border border-border rounded-xl p-0.5 shadow-2xs">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="Previous Month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-bold px-2.5 min-w-[125px] text-center text-foreground">
                {monthDisplayName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="Next Month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleThisMonth}
              className="h-8 px-2.5 text-xs font-semibold rounded-xl text-primary border-primary/30 hover:bg-primary/5"
            >
              This Month
            </Button>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: OVERTIME (OT) APPROVALS */}
      {subTab === "overtime" && (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Pending Requests */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-amber-500/40 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground block">Pending Requests</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {otCounts.pendingStaff} <span className="text-xs font-normal text-muted-foreground">({otCounts.pendingHours}h)</span>
                </span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>

            {/* Approved OT */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-emerald-500/40 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground block">Approved Overtime</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {otCounts.approvedStaff} <span className="text-xs font-normal text-muted-foreground">({otCounts.approvedHours}h)</span>
                </span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Check className="h-4 w-4" />
              </div>
            </div>

            {/* Estimated Pay Liability */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-primary/40 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground block">Estimated OT Pay</span>
                <span className="text-lg font-bold text-primary">
                  ₹{otCounts.totalEstLiability.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>

            {/* Multiplier Policy */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border shadow-xs">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground block">OT Multiplier Rate</span>
                <span className="text-lg font-bold text-foreground">
                  {company.otMultiplier ?? 2.0}× <span className="text-xs font-normal text-muted-foreground">Base Hourly</span>
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOtSettingsOpen(true)}
                className="h-8 text-xs rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shadow-2xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span>Configure</span>
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-3 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className={cn("absolute left-2.5 top-2.5 h-3.5 w-3.5 transition-colors", searchQuery.trim() ? "text-primary" : "text-muted-foreground")} />
                <Input
                  placeholder="Search staff name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "pl-8 pr-7 h-8 text-xs rounded-xl transition-all",
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
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Department */}
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger
                  className={cn(
                    "h-8 text-xs rounded-xl w-36 transition-all",
                    departmentFilter !== "all"
                      ? "bg-primary/15 border-primary/50 text-primary font-semibold ring-1 ring-primary/25 shadow-2xs [&>svg]:text-primary [&>svg]:opacity-100"
                      : "bg-background"
                  )}
                >
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

              {/* Specific Date Filter */}
              <div className={cn(
                "flex items-center gap-1.5 border rounded-xl px-2.5 h-8 shadow-2xs transition-all",
                dateFilter ? "bg-primary/15 border-primary/50 text-primary font-semibold ring-1 ring-primary/25" : "bg-background border-border"
              )}>
                <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
                  title="Filter OT by specific date"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter("")}
                    className="text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-xl">
                {(["all", "pending", "approved", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg font-medium capitalize transition-all cursor-pointer",
                      statusFilter === st
                        ? "bg-background text-foreground font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {st === "all" ? "All" : st === "rejected" ? "Declined" : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            {(searchQuery.trim() || departmentFilter !== "all" || statusFilter !== "all" || dateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setDepartmentFilter("all");
                  setStatusFilter("all");
                  setDateFilter("");
                }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive font-semibold px-2 py-1 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedEmpIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border-2 border-primary/40 rounded-2xl shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {selectedEmpIds.length}
                </div>
                <span className="text-xs font-bold text-foreground">
                  {selectedEmpIds.length} employee{selectedEmpIds.length > 1 ? "s" : ""} selected for bulk action
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleApproveSelected}
                  className="h-8 px-3 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve Selected</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeclineSelected}
                  variant="outline"
                  className="h-8 px-3 text-xs rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Decline Selected</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedEmpIds([])}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Overtime Requests Table */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 text-muted-foreground font-semibold text-xs border-b border-border/80">
                  <tr>
                    <th className="w-12 px-4 py-3.5 text-center">
                      <Checkbox
                        checked={
                          filteredOtRecords.length > 0 &&
                          filteredOtRecords.every((r) => selectedEmpIds.includes(r.emp.id))
                            ? true
                            : filteredOtRecords.some((r) => selectedEmpIds.includes(r.emp.id))
                            ? "indeterminate"
                            : false
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmpIds(filteredOtRecords.map((r) => r.emp.id));
                          } else {
                            setSelectedEmpIds([]);
                          }
                        }}
                        className="rounded-md"
                      />
                    </th>
                    <th className="px-4 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Base & Hourly Rate</th>
                    <th className="px-4 py-3.5">Logged OT</th>
                    <th className="px-4 py-3.5">Approved OT</th>
                    <th className="px-4 py-3.5">Estimated OT Pay</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="w-24 px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredOtRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Clock className="h-8 w-8 text-muted-foreground/40 stroke-1" />
                          <p className="font-semibold text-sm">No overtime requests found</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            {dateFilter
                              ? `No overtime logged on ${dateFilter}. Try clearing the date filter.`
                              : `No employees have logged overtime for ${monthDisplayName}.`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOtRecords.map((item) => (
                      <tr key={item.emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <Checkbox
                            checked={selectedEmpIds.includes(item.emp.id)}
                            onCheckedChange={(checked) => {
                              setSelectedEmpIds((prev) =>
                                checked ? [...prev, item.emp.id] : prev.filter((id) => id !== item.emp.id)
                              );
                            }}
                            className="rounded-md"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {item.emp.name?.slice(0, 2).toUpperCase() || "EM"}
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">{item.emp.name}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">{item.emp.empCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.emp.department || "General"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground">₹{item.hourlyRate}/hr</span>
                          <span className="text-[10px] text-muted-foreground block">
                            ₹{(item.emp.fixedSalary ?? item.emp.basic ?? item.emp.salary ?? 0).toLocaleString("en-IN")}/mo
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md text-xs">
                            <Clock className="h-3 w-3 text-primary" />
                            {item.rawOtHours} hrs
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={item.otApprovedHours}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleApproveOt(item.emp.id, val);
                              }}
                              className="h-7 w-16 text-xs text-center font-bold rounded-lg"
                            />
                            <span className="text-[11px] text-muted-foreground">hrs</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{item.estimatedOtPay.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.otStatus === "approved" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px] font-semibold">
                              <Check className="h-3 w-3" />
                              Approved
                            </Badge>
                          ) : item.otStatus === "rejected" ? (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 text-[11px] font-semibold">
                              <X className="h-3 w-3" />
                              Declined
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[11px] font-semibold">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Inspect Daily Punches */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setBreakdownTarget(item)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                              title="View Daily Punches Breakdown"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Approve */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApproveOt(item.emp.id)}
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg"
                              title="Approve Overtime"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>

                            {/* Decline */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRejectOt(item.emp.id)}
                              className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg"
                              title="Decline Overtime"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Punches Breakdown Modal */}
          <Dialog open={Boolean(breakdownTarget)} onOpenChange={(open) => !open && setBreakdownTarget(null)}>
            <DialogContent className="max-w-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>Daily Overtime Punch Breakdown</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {breakdownTarget?.emp.name} ({breakdownTarget?.emp.empCode}) · {monthDisplayName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Total Logged OT</span>
                    <strong className="text-foreground text-sm">{breakdownTarget?.rawOtHours} hrs</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Approved OT</span>
                    <strong className="text-foreground text-sm">{breakdownTarget?.otApprovedHours} hrs</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Current Status</span>
                    <strong className="text-foreground text-sm capitalize">{breakdownTarget?.otStatus}</strong>
                  </div>
                </div>

                <div className="rounded-xl border border-border overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">In Time</th>
                        <th className="px-3 py-2">Out Time</th>
                        <th className="px-3 py-2">Worked Hours</th>
                        <th className="px-3 py-2">OT Hours</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {breakdownTarget?.dailyOtRecords.map((d) => (
                        <tr key={d.date} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono font-medium">{d.date}</td>
                          <td className="px-3 py-2 text-muted-foreground">{d.checkIn}</td>
                          <td className="px-3 py-2 text-muted-foreground">{d.checkOut}</td>
                          <td className="px-3 py-2 font-semibold">{d.workedHours}h</td>
                          <td className="px-3 py-2 font-bold text-primary">{d.otHours > 0 ? `+${d.otHours}h` : "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{d.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* OT Multiplier Settings Dialog */}
          <Dialog open={isOtSettingsOpen} onOpenChange={setIsOtSettingsOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span>Overtime (OT) Multiplier Settings</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Configure company-wide overtime rate multiplier applied when calculating approved overtime pay.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>OT Hourly Pay Multiplier</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Default: 2.0×</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.1}
                      value={company.otMultiplier ?? 2}
                      onChange={(e) => {
                        const val = Math.max(0.1, Number(e.target.value) || 2);
                        setCompany({ otMultiplier: val });
                      }}
                      className="font-semibold text-sm w-32"
                    />
                    <span className="text-xs font-bold text-foreground">× Hourly Rate</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground font-medium">Quick Multiplier Presets</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "1.0× (1×)", val: 1 },
                      { label: "1.5× (1.5×)", val: 1.5 },
                      { label: "2.0× (2×)", val: 2 },
                      { label: "2.5× (2.5×)", val: 2.5 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setCompany({ otMultiplier: preset.val })}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          (company.otMultiplier ?? 2) === preset.val
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40"
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>How OT Pay is Calculated</span>
                  </div>
                  <div className="space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                    <div>
                      1. <strong className="text-foreground">Base Hourly Rate</strong> = Monthly Gross ÷ ({(company.workingDaysPerMonth ?? 26)} Days × {(company.workingHoursPerDay ?? 9)} Hours)
                    </div>
                    <div>
                      2. <strong className="text-foreground">OT Rate / Hour</strong> = Base Hourly Rate × <strong className="text-foreground">{company.otMultiplier ?? 2}×</strong>
                    </div>
                    <div>
                      3. <strong className="text-foreground">Overtime Payout</strong> = Approved OT Hours × OT Rate / Hour
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsOtSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setSavingOtSettings(true);
                    try {
                      await saveAllCompanySettings();
                      toast.success(`OT Multiplier updated to ${company.otMultiplier ?? 2}× & saved to cloud database!`);
                      setIsOtSettingsOpen(false);
                    } catch (e: any) {
                      toast.error("Failed to save OT multiplier: " + (e?.message || e));
                    } finally {
                      setSavingOtSettings(false);
                    }
                  }}
                  disabled={savingOtSettings}
                  className="gap-1.5 bg-primary text-primary-foreground font-semibold"
                >
                  Save Settings
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* SUB-VIEW 2: REST DAY & HOLIDAY WORK APPROVALS */}
      {subTab === "rest-day" && (
        <RestDayWorkApprovalHub
          getScheduledShiftForDate={getScheduledShiftForDate}
          onInspectRecord={onInspectRecord}
        />
      )}
    </div>
  );
};
