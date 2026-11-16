import React, { useMemo, useState } from "react";
import { useStore, isActiveEmployee, type AttendanceRecord, type Employee, type ShiftType } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmploymentTypeBadge } from "@/components/employment-type-badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  CalendarDays,
  CheckCheck,
  RotateCcw,
  Eye,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface RestDayWorkApprovalHubProps {
  getScheduledShiftForDate: (
    emp: Employee,
    dateStr: string
  ) => { shift: Partial<ShiftType>; isWeeklyOff: boolean; isHoliday: boolean; holidayName?: string };
  onInspectRecord?: (data: { emp: Employee; rec?: AttendanceRecord; date: string }) => void;
}

export const RestDayWorkApprovalHub: React.FC<RestDayWorkApprovalHubProps> = ({
  getScheduledShiftForDate,
  onInspectRecord,
}) => {
  const {
    employees: rawEmployees,
    attendance,
    approveRestDayWork,
    rejectRestDayWork,
    upsertAttendance,
    currentUser,
  } = useStore();

  const employees = useMemo(() => (rawEmployees || []).filter(isActiveEmployee), [rawEmployees]);

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customHoursMap, setCustomHoursMap] = useState<Record<string, number>>({});

  const restDayRecords = useMemo(() => {
    const list: {
      rec: AttendanceRecord;
      emp: Employee;
      dateStr: string;
      dayTypeLabel: string;
      status: "pending" | "approved" | "rejected";
      workedHours: number;
    }[] = [];

    for (const rec of attendance || []) {
      if (!rec || !rec.date) continue;
      const hasPunch = Boolean(rec.checkIn || rec.clockIn || (rec as any).inTime || rec.isRestDayWork);
      if (!hasPunch) continue;

      const emp = employees.find(
        (e) =>
          e.id === rec.employeeId ||
          (e.empCode && (rec.empCode === e.empCode || rec.employeeId === e.empCode)) ||
          (e.name && rec.employeeName && e.name.trim().toLowerCase() === rec.employeeName.trim().toLowerCase())
      );
      if (!emp) continue;

      const scheduled = getScheduledShiftForDate(emp, rec.date);
      const isSunday = new Date(rec.date + "T12:00:00Z").getUTCDay() === 0;
      const isRest = Boolean(scheduled.isWeeklyOff || isSunday || scheduled.isHoliday || rec.isRestDayWork);
      if (!isRest) continue;

      const dayTypeLabel = scheduled.isHoliday
        ? `Holiday (${scheduled.holidayName || "Public Holiday"})`
        : isSunday
        ? "Sunday (Weekly Off)"
        : "Weekly Off (Roster)";

      const status: "pending" | "approved" | "rejected" =
        rec.restDayWorkStatus === "approved"
          ? "approved"
          : rec.restDayWorkStatus === "rejected"
          ? "rejected"
          : "pending";

      const workedHours = Number(rec.restDayApprovedHours ?? rec.hoursWorked ?? 8) || 8;

      list.push({
        rec,
        emp,
        dateStr: rec.date,
        dayTypeLabel,
        status,
        workedHours,
      });
    }

    return list.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [attendance, employees, getScheduledShiftForDate]);

  const filteredRecords = useMemo(() => {
    return restDayRecords.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.emp.name || "").toLowerCase().includes(q);
        const matchCode = (item.emp.empCode || "").toLowerCase().includes(q);
        const matchDept = (item.emp.department || "").toLowerCase().includes(q);
        const matchDate = item.dateStr.includes(q);
        if (!matchName && !matchCode && !matchDept && !matchDate) return false;
      }
      return true;
    });
  }, [restDayRecords, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of restDayRecords) {
      if (r.status === "pending") pending++;
      else if (r.status === "approved") approved++;
      else if (r.status === "rejected") rejected++;
    }
    return { total: restDayRecords.length, pending, approved, rejected };
  }, [restDayRecords]);

  const handleApproveSingle = async (rec: AttendanceRecord, emp: Employee, defaultHrs: number) => {
    const hrs = customHoursMap[rec.id] !== undefined ? customHoursMap[rec.id] : defaultHrs;
    await approveRestDayWork(rec.id, hrs, currentUser?.name || "Admin");
    toast.success(`Approved ${hrs}h Rest Day work for ${emp.name} on ${rec.date}`);
  };

  const handleRejectSingle = async (rec: AttendanceRecord, emp: Employee) => {
    await rejectRestDayWork(rec.id, "Declined by Admin", currentUser?.name || "Admin");
    toast.info(`Declined Rest Day work for ${emp.name} on ${rec.date}`);
  };

  const handleResetToPending = (rec: AttendanceRecord, emp: Employee) => {
    upsertAttendance({
      ...rec,
      isRestDayWork: true,
      restDayWorkStatus: "pending",
      updatedAt: new Date().toISOString(),
    });
    toast.info(`Reset Rest Day work status to Pending for ${emp.name}`);
  };

  const handleApproveAllPending = async () => {
    const pendingList = restDayRecords.filter((r) => r.status === "pending");
    if (pendingList.length === 0) return;
    for (const item of pendingList) {
      const hrs = customHoursMap[item.rec.id] !== undefined ? customHoursMap[item.rec.id] : item.workedHours;
      await approveRestDayWork(item.rec.id, hrs, currentUser?.name || "Admin");
    }
    toast.success(`Approved all ${pendingList.length} pending Rest Day work record(s)!`);
  };

  return (
    <div className="space-y-4">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <Card
          onClick={() => setStatusFilter("all")}
          className={`rounded-xl cursor-pointer transition-all ${
            statusFilter === "all" ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "border-border bg-card"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Total Rest Day Logs</div>
              <div className="font-display text-2xl font-bold text-foreground mt-0.5">{counts.total}</div>
            </div>
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter("pending")}
          className={`rounded-xl cursor-pointer transition-all ${
            statusFilter === "pending"
              ? "border-amber-500 ring-1 ring-amber-500/20 bg-amber-500/10"
              : "border-amber-500/20 bg-amber-500/5"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400">Pending Approval</div>
              <div className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {counts.pending}
              </div>
            </div>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter("approved")}
          className={`rounded-xl cursor-pointer transition-all ${
            statusFilter === "approved"
              ? "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-500/10"
              : "border-emerald-500/20 bg-emerald-500/5"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Approved (Payable)</div>
              <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {counts.approved}
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter("rejected")}
          className={`rounded-xl cursor-pointer transition-all ${
            statusFilter === "rejected"
              ? "border-rose-500 ring-1 ring-rose-500/20 bg-rose-500/10"
              : "border-rose-500/20 bg-rose-500/5"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-rose-700 dark:text-rose-400">Declined</div>
              <div className="font-display text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {counts.rejected}
              </div>
            </div>
            <XCircle className="h-5 w-5 text-rose-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filter & Bulk Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee, code, dept, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs rounded-lg"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-9 w-44 text-xs rounded-lg">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rest Day Records ({counts.total})</SelectItem>
              <SelectItem value="pending">Pending Approval ({counts.pending})</SelectItem>
              <SelectItem value="approved">Approved ({counts.approved})</SelectItem>
              <SelectItem value="rejected">Declined ({counts.rejected})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {counts.pending > 0 && (
          <Button
            size="sm"
            onClick={handleApproveAllPending}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 text-xs shadow-xs"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Approve All Pending ({counts.pending})</span>
          </Button>
        )}
      </div>

      {/* Rest Day Work Approval Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-3.5">Date &amp; Rest Day Type</th>
                <th className="p-3.5">Employee</th>
                <th className="p-3.5">Check-In / Out</th>
                <th className="p-3.5">Approved Hours</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Sparkles className="h-7 w-7 text-muted-foreground/50" />
                      <div className="font-semibold text-sm text-foreground">No Rest Day Work Records Found</div>
                      <p className="text-xs max-w-md">
                        Whenever an employee punches in on a Sunday, Weekly Off, or Public Holiday, their record appears here for one-click approval or rejection.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map(({ rec, emp, dateStr, dayTypeLabel, status, workedHours }) => {
                  const currentHrs =
                    customHoursMap[rec.id] !== undefined ? customHoursMap[rec.id] : workedHours;

                  return (
                    <tr key={rec.id} className="hover:bg-muted/25 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{dateStr}</div>
                        <div className="text-[11px] text-primary font-medium">{dayTypeLabel}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{emp.name}</span>
                          <EmploymentTypeBadge type={emp.employmentType} />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {emp.empCode} · {emp.department || "General"}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <div>
                          In: <strong className="text-foreground">{rec.checkIn || rec.clockIn || "—"}</strong>
                        </div>
                        <div>
                          Out: <strong className="text-foreground">{rec.checkOut || rec.clockOut || "—"}</strong>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={currentHrs}
                            onChange={(e) =>
                              setCustomHoursMap((prev) => ({
                                ...prev,
                                [rec.id]: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="h-8 w-20 text-xs font-bold text-center"
                          />
                          <span className="text-muted-foreground text-[11px]">hrs</span>
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {status === "approved" ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold text-[11px]"
                          >
                            ✓ Approved ({rec.restDayApprovedHours ?? workedHours}h)
                          </Badge>
                        ) : status === "rejected" ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-500/10 text-rose-600 border-rose-500/30 font-semibold text-[11px]"
                          >
                            ✕ Declined
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold text-[11px] animate-pulse"
                          >
                            ⏳ Pending Approval
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {status !== "approved" && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveSingle(rec, emp, workedHours)}
                              className="h-8 px-3 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </Button>
                          )}

                          {status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectSingle(rec, emp)}
                              className="h-8 px-3 text-xs rounded-lg border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-semibold gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </Button>
                          )}

                          {status !== "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResetToPending(rec, emp)}
                              title="Reset to Pending"
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {onInspectRecord && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onInspectRecord({ emp, rec, date: dateStr })}
                              title="Inspect Biometric / GPS Log"
                              className="h-8 w-8 p-0 rounded-lg text-primary"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
  );
};
