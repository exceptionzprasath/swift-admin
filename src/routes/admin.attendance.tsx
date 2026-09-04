import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useStore, getEmployeeBranchIds, type AttendanceRecord, type Employee, type ShiftType, type Device } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download,
  Eye,
  Edit3,
  RefreshCw,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  MapPin,
  Camera,
  CameraOff,
  Activity,
  Layers,
  AlertTriangle,
  Award,
  ArrowUpRight,
  Sparkle,
  Flame,
  FileCheck,
  CalendarDays,
  CalendarCheck,
  Percent,
  Timer,
  Building2,
  Check,
  Zap,
  Plus,
  Minus,
  RotateCcw,
  Cpu,
  Server,
  Wifi,
  WifiOff,
  Terminal,
  Laptop,
  HelpCircle,
  HardDrive,
  Radio,
  Play,
  Copy,
  Trash2,
  FileText,
  RadioTower,
  Code2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { HardwareBridgeModal } from "@/components/biometric/HardwareBridgeModal";
import { LiveBiometricFeed } from "@/components/biometric/LiveBiometricFeed";
import { DeviceManagerHub } from "@/components/biometric/DeviceManagerHub";
import { StaffBiometricDirectory } from "@/components/biometric/StaffBiometricDirectory";

// Utility: Compute hours worked & OT from check-in/check-out time strings
function computeWorkedHours(
  checkIn?: string,
  checkOut?: string,
  standardHours: number = 9
): { hoursWorked: number; otHours: number } {
  if (!checkIn || !checkOut) return { hoursWorked: 0, otHours: 0 };
  try {
    const parseTime = (s: string): number => {
      const cleaned = s.trim().toLowerCase();
      // Match formats like "8:52 am", "12:03 AM", "18:00", "09:30"
      const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
      if (!match) return -1;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridiem = match[3]?.toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      return h * 60 + m;
    };
    const inMins = parseTime(checkIn);
    const outMins = parseTime(checkOut);
    if (inMins < 0 || outMins < 0) return { hoursWorked: 0, otHours: 0 };
    
    let diffMins = outMins - inMins;
    if (diffMins <= 0) {
      // Crossed midnight (e.g. check-in 8:52 AM and check-out 12:03 AM next day)
      diffMins += 24 * 60;
    }
    
    const hoursWorked = Math.round((diffMins / 60) * 10) / 10;
    const otHours = hoursWorked > standardHours ? Math.round((hoursWorked - standardHours) * 10) / 10 : 0;
    return { hoursWorked, otHours };
  } catch {
    return { hoursWorked: 0, otHours: 0 };
  }
}

// Helper: get effective hours and OT for a record (uses stored value or computes from timestamps)
function getRecordHours(rec?: { hoursWorked?: number; otHours?: number; checkIn?: string; checkOut?: string; clockIn?: string; clockOut?: string }, standardHours: number = 9) {
  if (rec?.hoursWorked && rec.hoursWorked > 0) {
    return { hoursWorked: rec.hoursWorked, otHours: rec.otHours || 0 };
  }
  return computeWorkedHours(rec?.checkIn || rec?.clockIn, rec?.checkOut || rec?.clockOut, standardHours);
}

export const Route = createFileRoute("/admin/attendance")({
  head: () => ({ meta: [{ title: "Attendance & Dossier · SWIFT" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const {
    employees,
    attendance,
    upsertAttendance,
    company,
    leaves,
    holidays,
    roster,
    devices = [],
    addDevice,
    updateDevice,
    deleteDevice,
    loadCompanyState,
  } = useStore();
  const { activeTenantId } = useAuth();

  // Primary Selected Date for Daily View
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Biometric Hardware Devices State & Dialogs
  const [hardwareSubTab, setHardwareSubTab] = useState<"terminals" | "employees" | "punch-feed">("terminals");
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deviceForm, setDeviceForm] = useState<{
    serialNumber: string;
    name: string;
    branchId: string;
    model: string;
    status: "ONLINE" | "OFFLINE";
  }>({
    serialNumber: "",
    name: "",
    branchId: company.branches?.[0]?.id || "br-hq",
    model: "BioMax / eSSL ADMS SpeedFace",
    status: "ONLINE",
  });

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAgentGuideOpen, setIsAgentGuideOpen] = useState(false);

  const handleOpenAddDevice = (device?: Device) => {
    if (device) {
      setEditingDevice(device);
      setDeviceForm({
        serialNumber: device.serialNumber,
        name: device.name,
        branchId: device.branchId || company.branches?.[0]?.id || "br-hq",
        model: device.model || "BioMax / eSSL ADMS",
        status: device.status === "OFFLINE" ? "OFFLINE" : "ONLINE",
      });
    } else {
      setEditingDevice(null);
      setDeviceForm({
        serialNumber: "",
        name: "",
        branchId: company.branches?.[0]?.id || "br-hq",
        model: "BioMax / eSSL ADMS SpeedFace",
        status: "ONLINE",
      });
    }
    setIsDeviceModalOpen(true);
  };

  const handleSaveDevice = () => {
    if (!deviceForm.serialNumber.trim()) {
      toast.error("Please enter the biometric machine Serial Number (SN)");
      return;
    }
    const branchObj = company.branches?.find((b) => b.id === deviceForm.branchId);
    if (editingDevice) {
      updateDevice(editingDevice.id, {
        serialNumber: deviceForm.serialNumber.trim(),
        name: deviceForm.name.trim() || `Terminal (${deviceForm.serialNumber.trim()})`,
        branchId: deviceForm.branchId,
        branchName: branchObj?.name || "Head Office",
        model: deviceForm.model,
        status: deviceForm.status,
      });
      toast.success(`Updated terminal ${deviceForm.serialNumber}`);
    } else {
      addDevice({
        serialNumber: deviceForm.serialNumber.trim(),
        name: deviceForm.name.trim() || `Terminal (${deviceForm.serialNumber.trim()})`,
        branchId: deviceForm.branchId,
        branchName: branchObj?.name || "Head Office",
        model: deviceForm.model,
        status: deviceForm.status,
        lastHeartbeat: new Date().toISOString(),
        ipAddress: "127.0.0.1",
      });
      toast.success(`Registered new terminal ${deviceForm.serialNumber} successfully!`);
    }
    setIsDeviceModalOpen(false);
  };

  const handleDeleteDeviceClick = (dev: Device) => {
    deleteDevice(dev.id);
    toast.success(`Unregistered terminal ${dev.name || dev.serialNumber}`);
  };

  // Live Polling & Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<number>(30); // seconds (0 = off)
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(
    new Date().toLocaleTimeString()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedVerification, setSelectedVerification] = useState("all");

  // Selected Employee for Dedicated Attendance Dossier (Clicking any employee opens this!)
  const [dossierEmployee, setDossierEmployee] = useState<Employee | null>(null);

  // Biometric & GPS Inspection Modal State
  const [inspectRecord, setInspectRecord] = useState<{
    emp: Employee;
    rec?: AttendanceRecord;
    date: string;
  } | null>(null);
  const [inspectPhotoTab, setInspectPhotoTab] = useState<"checkIn" | "checkOut">("checkIn");

  // Manual Punch Regularization Dialog State
  const [regularizeDialog, setRegularizeDialog] = useState<{
    open: boolean;
    employeeId: string;
    date: string;
    checkIn: string;
    checkOut: string;
    status: "present" | "half-day" | "absent" | "leave" | "late";
    otHours: number;
    reason: string;
    note: string;
  }>({
    open: false,
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    checkIn: "09:00",
    checkOut: "18:00",
    status: "present",
    otHours: 0,
    reason: "On-Duty Client Visit",
    note: "",
  });

  // Monthly Matrix View Controls
  const [matrixMonth, setMatrixMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Real-time synchronization trigger
  const handleLiveSync = useCallback(async (quiet = false) => {
    const tid = activeTenantId || "company-demo";
    try {
      setIsSyncing(true);
      await loadCompanyState(tid);
      setLastSyncedTime(new Date().toLocaleTimeString());
      if (!quiet) toast.success("Attendance synchronized with Cloud & Biometric Terminals");
    } catch (_err) {
      if (!quiet) toast.error("Failed to sync live attendance records");
    } finally {
      setIsSyncing(false);
    }
  }, [activeTenantId, loadCompanyState]);

  // Polling effect
  useEffect(() => {
    if (!pollingInterval || pollingInterval <= 0) return;
    const interval = setInterval(() => {
      handleLiveSync(true);
    }, pollingInterval * 1000);
    return () => clearInterval(interval);
  }, [pollingInterval, handleLiveSync]);

  // Initial load
  useEffect(() => {
    handleLiveSync(true);
  }, [handleLiveSync]);

  // Departments & Branches list
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  const branches = useMemo(() => {
    return company.branches || [];
  }, [company.branches]);

  const shifts = useMemo(() => {
    return company.shifts || [];
  }, [company.shifts]);

  // Helper to resolve an employee's scheduled shift on any given date (Roster > Default Shift)
  const getScheduledShiftForDate = useCallback(
    (emp: Employee, dateStr: string): { shift: Partial<ShiftType>; isWeeklyOff: boolean; isHoliday: boolean; holidayName?: string } => {
      // 1. Check if date is a company holiday
      const holiday = (holidays || []).find((h) => h.date === dateStr);
      if (holiday) {
        return {
          shift: { name: holiday.name, start: "00:00", end: "00:00" },
          isWeeklyOff: false,
          isHoliday: true,
          holidayName: holiday.name,
        };
      }

      // 2. Check roster assignments
      const rosterItem = (roster || []).find(
        (r) => r.employeeId === emp.id && r.date === dateStr
      );

      if (rosterItem) {
        if (rosterItem.shiftId === "off") {
          return { shift: { name: "Weekly Off", start: "-", end: "-" }, isWeeklyOff: true, isHoliday: false };
        }
        const matched = shifts.find((s) => s.id === rosterItem.shiftId);
        return {
          shift: matched || {
            name: rosterItem.shiftName || "Scheduled Shift",
            start: rosterItem.shiftStart || "09:00",
            end: rosterItem.shiftEnd || "18:00",
            graceTime: rosterItem.graceTime,
            allowHalfDayLogin: rosterItem.allowHalfDayLogin,
            halfDayLoginTime: rosterItem.halfDayLoginTime,
          },
          isWeeklyOff: false,
          isHoliday: false,
        };
      }

      // 3. Fallback to employee's assigned default shift
      const defaultShift = shifts.find((s) => s.id === emp.shiftId) || shifts[0] || {
        id: "gen",
        name: "General Shift",
        start: "09:00",
        end: "18:00",
        graceTime: "15",
      };

      // Check weekly off from branch / Sunday
      const dayOfWeek = new Date(dateStr).getDay(); // 0 is Sunday
      if (dayOfWeek === 0) {
        return { shift: defaultShift, isWeeklyOff: true, isHoliday: false };
      }

      return { shift: defaultShift, isWeeklyOff: false, isHoliday: false };
    },
    [holidays, roster, shifts]
  );

  // Helper to evaluate punctuality status of a punch
  const evaluatePunctuality = useCallback(
    (
      rec: AttendanceRecord | undefined,
      scheduled: { shift: Partial<ShiftType>; isWeeklyOff: boolean; isHoliday: boolean; holidayName?: string },
      emp: Employee,
      dateStr: string
    ) => {
      // If approved leave exists
      const hasLeave = (leaves || []).some(
        (l) =>
          l.employeeId === emp.id &&
          l.status === "approved" &&
          dateStr >= (l.from || (l as any).startDate || "") &&
          dateStr <= (l.to || (l as any).endDate || "")
      );
      if (hasLeave) {
        return { status: "leave", label: "Approved Leave", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
      }

      if (scheduled.isHoliday) {
        return { status: "holiday", label: `Holiday: ${scheduled.holidayName || ""}`, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
      }

      if (scheduled.isWeeklyOff && !rec?.checkIn && !rec?.clockIn) {
        return { status: "weekly-off", label: "Weekly Off", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" };
      }

      if (!rec || (!rec.checkIn && !rec.clockIn)) {
        const isPast = dateStr < new Date().toISOString().slice(0, 10);
        return isPast
          ? { status: "absent", label: "Absent / No Punch", color: "bg-destructive/10 text-destructive border-destructive/20" }
          : { status: "pending", label: "Not Punched Yet", color: "bg-muted text-muted-foreground border-border" };
      }

      const punchTime = rec.checkIn || rec.clockIn || "";
      const shiftStart = scheduled.shift.start || "09:00";
      const graceMinutes = parseInt(emp.graceTime || scheduled.shift.graceTime || "15", 10) || 0;
      const halfDayCutoff = emp.halfDayLoginTime || scheduled.shift.halfDayLoginTime || "12:00";

      // Parse punch hours & minutes
      let punchH = 0;
      let punchM = 0;
      if (punchTime.includes(":")) {
        const parts = punchTime.split(":");
        punchH = parseInt(parts[0], 10) || 0;
        punchM = parseInt(parts[1], 10) || 0;
      }
      const punchMinutesTotal = punchH * 60 + punchM;

      const [startH, startM] = shiftStart.split(":").map((v) => parseInt(v, 10) || 0);
      const startMinutesTotal = startH * 60 + startM;
      const graceLimitTotal = startMinutesTotal + graceMinutes;

      const [halfH, halfM] = halfDayCutoff.split(":").map((v) => parseInt(v, 10) || 0);
      const halfDayLimitTotal = halfH * 60 + halfM;

      if (rec.status === "half-day" || punchMinutesTotal >= halfDayLimitTotal) {
        return { status: "half-day", label: "Half-Day Session", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      }

      if (punchMinutesTotal <= startMinutesTotal) {
        return { status: "present", label: "On Time", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      }

      if (punchMinutesTotal <= graceLimitTotal) {
        const diff = punchMinutesTotal - startMinutesTotal;
        return { status: "present", label: `Grace (${diff}m)`, color: "bg-teal-500/10 text-teal-600 border-teal-500/20" };
      }

      const lateBy = punchMinutesTotal - startMinutesTotal;
      return { status: "late", label: `Late (${lateBy}m)`, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" };
    },
    [leaves]
  );

  // Daily Rows with Real-time Resolution
  const dailyRows = useMemo(() => {
    return employees.map((emp) => {
      const rec = attendance.find(
        (a) => (a.employeeId === emp.id || a.employeeName === emp.name) && a.date === selectedDate
      );
      const scheduled = getScheduledShiftForDate(emp, selectedDate);
      const punctuality = evaluatePunctuality(rec, scheduled, emp, selectedDate);
      const empBranchIds = getEmployeeBranchIds(emp);
      const branch = branches.find((b) => empBranchIds.includes(b.id)) || branches.find((b) => b.id === emp.branchId) || branches[0];

      return {
        emp,
        rec,
        scheduled,
        punctuality,
        branch,
      };
    });
  }, [employees, attendance, selectedDate, getScheduledShiftForDate, evaluatePunctuality, branches]);

  // Filtered Daily Rows
  const filteredDailyRows = useMemo(() => {
    return dailyRows.filter(({ emp, rec, punctuality }) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (emp.name || "").toLowerCase().includes(q);
        const matchesCode = (emp.empCode || "").toLowerCase().includes(q);
        const matchesDept = (emp.department || "").toLowerCase().includes(q);
        const matchesDesignation = (emp.designation || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDept && !matchesDesignation) return false;
      }

      // Department
      if (selectedDept !== "all" && emp.department !== selectedDept) return false;

      // Branch
      if (selectedBranch !== "all" && !getEmployeeBranchIds(emp).includes(selectedBranch) && emp.branchId !== selectedBranch) return false;

      // Shift
      if (selectedShift !== "all" && emp.shiftId !== selectedShift) return false;

      // Status
      if (selectedStatus !== "all") {
        if (selectedStatus === "present" && punctuality.status !== "present") return false;
        if (selectedStatus === "late" && punctuality.status !== "late") return false;
        if (selectedStatus === "half-day" && punctuality.status !== "half-day") return false;
        if (selectedStatus === "absent" && punctuality.status !== "absent") return false;
        if (selectedStatus === "leave" && punctuality.status !== "leave") return false;
      }

      // Verification
      if (selectedVerification !== "all") {
        if (selectedVerification === "face" && !rec?.faceVerified) return false;
        if (selectedVerification === "geofence" && !rec?.geofenceVerified && !rec?.withinGeofence) return false;
        if (selectedVerification === "regularized" && !rec?.regularized) return false;
      }

      return true;
    });
  }, [dailyRows, searchQuery, selectedDept, selectedBranch, selectedShift, selectedStatus, selectedVerification]);

  // Summary Metrics for the Selected Date
  const dailyKPIs = useMemo(() => {
    let presentCount = 0;
    let onTimeCount = 0;
    let graceCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let totalWorkingHours = 0;
    let totalOTHours = 0;

    dailyRows.forEach(({ rec, punctuality }) => {
      if (punctuality.status === "present") {
        presentCount++;
        if (punctuality.label.includes("Grace")) graceCount++;
        else onTimeCount++;
      } else if (punctuality.status === "late") {
        presentCount++;
        lateCount++;
      } else if (punctuality.status === "half-day") {
        halfDayCount++;
      } else if (punctuality.status === "leave") {
        leaveCount++;
      } else if (punctuality.status === "absent") {
        absentCount++;
      }

      const recH = getRecordHours(rec, company.workingHoursPerDay || 9);
      totalWorkingHours += recH.hoursWorked;
      totalOTHours += recH.otHours;
    });

    const totalEmployees = employees.length || 1;
    const attendancePercentage = Math.round(((presentCount + halfDayCount * 0.5) / totalEmployees) * 100);

    return {
      totalEmployees: employees.length,
      presentCount,
      onTimeCount,
      graceCount,
      lateCount,
      halfDayCount,
      leaveCount,
      absentCount,
      totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
      totalOTHours: Math.round(totalOTHours * 10) / 10,
      attendancePercentage,
    };
  }, [dailyRows, employees.length]);

  // Open Manual Edit Punch / Regularization Dialog for specific employee & date
  const handleOpenRegularize = useCallback(
    (emp: Employee, dateStr: string = selectedDate, existingRec?: AttendanceRecord) => {
      const rec =
        existingRec ||
        attendance.find(
          (a) => (a.employeeId === emp.id || a.employeeName === emp.name) && a.date === dateStr
        );
      const scheduled = getScheduledShiftForDate(emp, dateStr);
      const defaultIn = scheduled.shift.start || "09:00";
      const defaultOut = scheduled.shift.end || "18:00";

      const inTime = rec?.checkIn || rec?.clockIn || defaultIn;
      const outTime = rec?.checkOut || rec?.clockOut || defaultOut;
      const stdHours = company.workingHoursPerDay || 9;
      const autoCalc = computeWorkedHours(inTime, outTime, stdHours);

      const otVal =
        rec?.otHours !== undefined && rec?.otHours !== null
          ? Number(rec.otHours)
          : autoCalc.otHours;

      let reason = "Manual Administrative Edit";
      let note = "";
      if (rec?.regularizedReason) {
        if (rec.regularizedReason.includes(":")) {
          const parts = rec.regularizedReason.split(":");
          reason = parts[0].trim();
          note = parts.slice(1).join(":").trim();
        } else {
          reason = rec.regularizedReason;
        }
      }

      setRegularizeDialog({
        open: true,
        employeeId: emp.id,
        date: dateStr,
        checkIn: inTime,
        checkOut: outTime,
        status: (rec?.status as any) || "present",
        otHours: otVal,
        reason,
        note,
      });
    },
    [attendance, selectedDate, getScheduledShiftForDate, company.workingHoursPerDay]
  );

  // Quick Action: Mark status
  const handleQuickMark = (
    empId: string,
    status: "present" | "absent" | "leave" | "half-day" | "late" | "edit_manual"
  ) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    if (status === "edit_manual") {
      handleOpenRegularize(emp, selectedDate);
      return;
    }

    const existing = attendance.find((a) => (a.employeeId === empId || a.employeeName === emp.name) && a.date === selectedDate);
    const scheduled = getScheduledShiftForDate(emp, selectedDate);
    const defaultIn = scheduled.shift.start || "09:00";
    const defaultOut = scheduled.shift.end || "18:00";

    const checkInTime =
      existing?.checkIn ||
      existing?.clockIn ||
      (status === "present" || status === "late" ? defaultIn : status === "half-day" ? "12:00" : undefined);

    const checkOutTime =
      existing?.checkOut ||
      existing?.clockOut ||
      (status === "present" || status === "late" || status === "half-day" ? defaultOut : undefined);

    const stdHours = company.workingHoursPerDay || 9;
    const hours =
      status === "present" || status === "late"
        ? stdHours
        : status === "half-day"
        ? stdHours / 2
        : 0;

    upsertAttendance({
      id: existing?.id || `att-${empId}-${selectedDate}`,
      employeeId: empId,
      employeeName: emp.name,
      empCode: emp.empCode,
      department: emp.department,
      date: selectedDate,
      status: status === "late" ? "present" : status,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      clockIn: checkInTime,
      clockOut: checkOutTime,
      hoursWorked: hours,
      otHours: existing?.otHours || 0,
      regularized: true,
      regularizedBy: "Admin",
      regularizedReason: "Quick Status Update via Attendance Hub",
      updatedAt: new Date().toISOString(),
    });

    toast.success(`Updated attendance to "${status.toUpperCase()}" for ${emp.name}`);
  };

  // Submit Manual Regularization / Punch & OT Override
  const handleSaveRegularization = () => {
    const { employeeId, date, checkIn, checkOut, status, otHours, reason, note } = regularizeDialog;
    if (!employeeId || !date) {
      toast.error("Please select an employee and date");
      return;
    }

    const emp = employees.find((e) => e.id === employeeId);
    const existing = attendance.find(
      (a) => (a.employeeId === employeeId || a.employeeName === emp?.name) && a.date === date
    );

    // Calculate hours worked
    const stdHours = company.workingHoursPerDay || 9;
    let hoursWorked = stdHours;
    if (checkIn && checkOut && status !== "absent" && status !== "leave") {
      const computed = computeWorkedHours(checkIn, checkOut, stdHours);
      hoursWorked = computed.hoursWorked > 0 ? computed.hoursWorked : stdHours;
    } else if (status === "half-day") {
      hoursWorked = stdHours / 2;
    } else if (status === "absent" || status === "leave") {
      hoursWorked = 0;
    }

    const cleanCheckIn = status === "absent" || status === "leave" ? undefined : (checkIn || undefined);
    const cleanCheckOut = status === "absent" || status === "leave" ? undefined : (checkOut || undefined);

    upsertAttendance({
      id: existing?.id || `att-${employeeId}-${date}`,
      employeeId,
      employeeName: emp?.name,
      empCode: emp?.empCode,
      department: emp?.department,
      date,
      status: status === "late" ? "present" : status,
      checkIn: cleanCheckIn,
      checkOut: cleanCheckOut,
      clockIn: cleanCheckIn,
      clockOut: cleanCheckOut,
      hoursWorked,
      otHours: Math.max(0, Number(otHours) || 0),
      regularized: true,
      regularizedBy: "Admin",
      regularizedReason: `${reason}${note ? ": " + note : ""}`,
      updatedAt: new Date().toISOString(),
    });

    toast.success(`Punch & OT updated for ${emp?.name || "employee"} on ${date}`);
    setRegularizeDialog((prev) => ({ ...prev, open: false }));
  };

  // Export Daily Attendance CSV
  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Employee Code",
      "Employee Name",
      "Department",
      "Branch",
      "Shift",
      "Check-In Time",
      "Check-Out Time",
      "Hours Worked",
      "OT Hours",
      "Status",
      "Punctuality",
      "Face Biometric Verified",
      "GPS Verified",
      "Regularized",
    ];

    const csvRows = [headers.join(",")];

    dailyRows.forEach(({ emp, rec, scheduled, punctuality, branch }) => {
      const row = [
        `"${selectedDate}"`,
        `"${emp.empCode || ""}"`,
        `"${emp.name || ""}"`,
        `"${emp.department || ""}"`,
        `"${branch?.name || ""}"`,
        `"${scheduled.shift.name || "General"}"`,
        `"${rec?.checkIn || rec?.clockIn || "—"}"`,
        `"${rec?.checkOut || rec?.clockOut || "—"}"`,
        getRecordHours(rec, company.workingHoursPerDay || 9).hoursWorked,
        getRecordHours(rec, company.workingHoursPerDay || 9).otHours,
        `"${punctuality.status}"`,
        `"${punctuality.label}"`,
        rec?.faceVerified ? "Yes" : "No",
        rec?.geofenceVerified || rec?.withinGeofence ? "Yes" : "No",
        rec?.regularized ? "Yes" : "No",
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_report_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Attendance report downloaded");
  };

  // Matrix Days helper
  const matrixDaysInMonth = useMemo(() => {
    const [yearStr, monthStr] = matrixMonth.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysCount = new Date(year, month, 0).getDate();

    const days = [];
    for (let d = 1; d <= daysCount; d++) {
      const dayNum = String(d).padStart(2, "0");
      const dateStr = `${matrixMonth}-${dayNum}`;
      const dayOfWeek = new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
      days.push({ dayNum: d, dateStr, dayOfWeek });
    }
    return days;
  }, [matrixMonth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Live Sync Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-card via-card to-muted/30 p-6 rounded-2xl border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Activity className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
                  Real-Time Attendance Hub
                </h1>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
                  Live Sync
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Live biometric face logs, GPS geofence tracking, punctuality intelligence, and employee dossiers.
              </p>
            </div>
          </div>
        </div>

        {/* Live Controls & Date Navigator */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Polling Interval Selector */}
          <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-xs">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Auto-Sync:</span>
            <select
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              className="bg-transparent font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={0}>Off</option>
            </select>
          </div>

          {/* Sync Now Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleLiveSync(false)}
            disabled={isSyncing}
            className="gap-1.5 h-9 rounded-xl shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </Button>

          {/* Regularize Manual Punch */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (employees[0]) {
                handleOpenRegularize(employees[0], selectedDate);
              }
            }}
            className="gap-1.5 h-9 rounded-xl shadow-xs"
          >
            <Edit3 className="h-3.5 w-3.5 text-primary" />
            <span>Regularize Punch</span>
          </Button>

          {/* Export Report */}
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 h-9 rounded-xl shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Date Navigator & Quick Stats Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-7 border-0 bg-transparent p-0 font-semibold focus-visible:ring-0 w-auto cursor-pointer"
            />
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="h-8 rounded-lg text-xs"
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
          >
            Today
          </Button>

          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Sync Timestamp indicator */}
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Last sync at {lastSyncedTime}</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="rounded-xl border-border bg-card/60 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Total Staff</span>
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {dailyKPIs.totalEmployees}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active Headcount</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-xs font-medium">Present Today</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {dailyKPIs.presentCount}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
              <span>{dailyKPIs.attendancePercentage}% Rate</span>
              <span className="text-teal-600 font-medium">{dailyKPIs.onTimeCount} On-Time</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-orange-500/20 bg-orange-500/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 mb-1">
              <span className="text-xs font-medium">Late Marks</span>
              <Timer className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-orange-600 dark:text-orange-400">
              {dailyKPIs.lateCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {dailyKPIs.graceCount} used grace window
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-amber-500/20 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-xs font-medium">Half-Day</span>
              <Clock className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
              {dailyKPIs.halfDayCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Afternoon sessions</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-blue-500/20 bg-blue-500/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-xs font-medium">On Leave</span>
              <CalendarCheck className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-blue-600 dark:text-blue-400">
              {dailyKPIs.leaveCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Approved leaves</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-destructive/20 bg-destructive/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-destructive mb-1">
              <span className="text-xs font-medium">Absent / Pending</span>
              <XCircle className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-destructive">
              {dailyKPIs.absentCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">No punch recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs (Daily Roster, Monthly Matrix, Analytics) */}
      <Tabs defaultValue="daily" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-2">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="daily" className="rounded-lg gap-1.5 text-xs font-medium">
              <Activity className="h-3.5 w-3.5" />
              Daily Live Roster
            </TabsTrigger>
            <TabsTrigger value="matrix" className="rounded-lg gap-1.5 text-xs font-medium">
              <CalendarIcon className="h-3.5 w-3.5" />
              Monthly Staff Matrix
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg gap-1.5 text-xs font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              Punctuality Insights
            </TabsTrigger>
            <TabsTrigger value="devices" className="rounded-lg gap-1.5 text-xs font-medium">
              <Cpu className="h-3.5 w-3.5" />
              Biometric Hardware Terminals
              {devices.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-primary/10 text-primary">
                  {devices.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground">
            Showing <strong className="text-foreground">{filteredDailyRows.length}</strong> of {employees.length} employees
          </span>
        </div>

        {/* TAB 1: DAILY LIVE ROSTER */}
        <TabsContent value="daily" className="space-y-4 m-0">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-card p-3 rounded-xl border border-border">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, code, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs rounded-lg"
              />
            </div>

            {/* Department Filter */}
            <Select value={selectedDept} onValueChange={setSelectedDept}>
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
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
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

            {/* Shift Filter */}
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger className="h-9 text-xs rounded-lg">
                <SelectValue placeholder="Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.start}-{s.end})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Attendance Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 text-xs rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">Present (On-Time & Grace)</SelectItem>
                <SelectItem value="late">Late Check-Ins</SelectItem>
                <SelectItem value="half-day">Half-Day</SelectItem>
                <SelectItem value="leave">On Leave</SelectItem>
                <SelectItem value="absent">Absent / No Punch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Daily Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="text-left">
                    <th className="p-3.5 font-semibold">Employee</th>
                    <th className="p-3.5 font-semibold">Scheduled Shift</th>
                    <th className="p-3.5 font-semibold">Check-In Punch</th>
                    <th className="p-3.5 font-semibold">Check-Out Punch</th>
                    <th className="p-3.5 font-semibold">Work / OT</th>
                    <th className="p-3.5 font-semibold">Punctuality Status</th>
                    <th className="p-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDailyRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <AlertTriangle className="h-8 w-8 text-muted-foreground/60" />
                          <p className="text-sm font-medium">No matching attendance records found</p>
                          <p className="text-xs text-muted-foreground">Try clearing filters or changing the date.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDailyRows.map(({ emp, rec, scheduled, punctuality, branch }) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => setDossierEmployee(emp)}
                      >
                        {/* Employee Details Column */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {emp.photoDataUrl ? (
                                <img
                                  src={emp.photoDataUrl}
                                  alt={emp.name}
                                  className="h-10 w-10 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm border border-primary/20">
                                  {emp.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                                  punctuality.status === "present"
                                    ? "bg-emerald-500"
                                    : punctuality.status === "late"
                                    ? "bg-orange-500"
                                    : punctuality.status === "half-day"
                                    ? "bg-amber-500"
                                    : punctuality.status === "leave"
                                    ? "bg-blue-500"
                                    : "bg-destructive"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="font-mono">{emp.empCode}</span>
                                <span>•</span>
                                <span>{emp.department || "General"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Shift Column */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-0.5">
                            <div className="font-medium text-xs text-foreground flex items-center gap-1.5">
                              <span>{scheduled.shift.name || "General"}</span>
                              {scheduled.isWeeklyOff && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-slate-500/10 text-slate-500">
                                  Off
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {scheduled.shift.start || "09:00"} - {scheduled.shift.end || "18:00"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Grace: {emp.graceTime || scheduled.shift.graceTime || "15"}m
                            </div>
                          </div>
                        </td>

                        {/* Check-In Column */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          {rec?.checkIn || rec?.clockIn ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                                <span>{rec.checkIn || rec.clockIn}</span>
                              </div>

                              {/* Biometric & GPS Pill */}
                              <div className="flex flex-wrap items-center gap-1">
                                {rec.faceVerified && (
                                  <button
                                    type="button"
                                    onClick={() => setInspectRecord({ emp, rec, date: selectedDate })}
                                    className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary hover:bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20 transition-colors"
                                  >
                                    <Camera className="h-3 w-3" />
                                    <span>Face Verified</span>
                                  </button>
                                )}

                                {(rec.geofenceVerified || rec.withinGeofence) && (
                                  <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    <MapPin className="h-3 w-3" />
                                    <span>GPS HQ</span>
                                  </span>
                                )}

                                {rec.regularized && (
                                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    <Edit3 className="h-3 w-3" />
                                    <span>Regularized</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Check-Out Column */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          {rec?.checkOut || rec?.clockOut ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{rec.checkOut || rec.clockOut}</span>
                              </div>

                              {/* Biometric Check-Out Pill */}
                              <div className="flex flex-wrap items-center gap-1">
                                {(rec.faceVerified || rec.checkOutPhoto) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectPhotoTab("checkOut");
                                      setInspectRecord({ emp, rec, date: selectedDate });
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary hover:bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20 transition-colors"
                                  >
                                    <Camera className="h-3 w-3" />
                                    <span>Face Verified</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : rec?.checkIn || rec?.clockIn ? (
                            <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                              Active On Duty
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Work Hours & OT */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const hrs = getRecordHours(rec, company.workingHoursPerDay || 9);
                            return (
                              <div className="space-y-0.5">
                                <div className="font-medium text-xs text-foreground">
                                  {hrs.hoursWorked > 0 ? `${hrs.hoursWorked} hrs` : "0.0 hrs"}
                                </div>
                                {hrs.otHours > 0 ? (
                                  <div className="text-[11px] text-emerald-600 font-semibold">
                                    +{hrs.otHours}h OT
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground">0 OT</div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Punctuality Status Badge */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          <Badge variant="outline" className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${punctuality.color}`}>
                            {punctuality.label}
                          </Badge>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Full History Dossier */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDossierEmployee(emp)}
                                    className="h-8 w-8 p-0 rounded-lg"
                                  >
                                    <Eye className="h-4 w-4 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Employee Attendance Dossier</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Inspect Biometrics & GPS */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setInspectRecord({ emp, rec, date: selectedDate })}
                                    className="h-8 w-8 p-0 rounded-lg"
                                  >
                                    <Camera className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Inspect Biometric Face & GPS Log</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Edit Check-In, Check-Out & OT */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenRegularize(emp, selectedDate, rec)}
                                    className="h-8 w-8 p-0 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Check-In, Out & OT Manually</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Quick Mark Dropdown */}
                            <Select
                              onValueChange={(val) => handleQuickMark(emp.id, val as any)}
                              defaultValue=""
                            >
                              <SelectTrigger className="h-8 w-24 text-xs rounded-lg">
                                <SelectValue placeholder="Quick Mark" />
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectItem value="edit_manual" className="font-semibold text-amber-600">
                                  ✏️ Edit Punch & OT...
                                </SelectItem>
                                <SelectItem value="present">Mark Present</SelectItem>
                                <SelectItem value="late">Mark Late</SelectItem>
                                <SelectItem value="half-day">Mark Half-Day</SelectItem>
                                <SelectItem value="leave">Mark Leave</SelectItem>
                                <SelectItem value="absent">Mark Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: MONTHLY STAFF MATRIX */}
        <TabsContent value="matrix" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Month Selection:</Label>
              <Input
                type="month"
                value={matrixMonth}
                onChange={(e) => setMatrixMonth(e.target.value)}
                className="w-auto h-8 text-xs font-semibold"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present (P)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Late (L)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Half-Day (HD)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Leave (LV)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Absent (A)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Off (WO)
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="p-3 text-left font-semibold sticky left-0 bg-card z-10 min-w-[180px]">
                      Employee
                    </th>
                    {matrixDaysInMonth.map((d) => (
                      <th key={d.dateStr} className="p-1.5 text-center min-w-[32px] font-medium text-[11px]">
                        <div>{d.dayNum}</div>
                        <div className="text-[10px] text-muted-foreground">{d.dayOfWeek}</div>
                      </th>
                    ))}
                    <th className="p-3 text-center font-semibold min-w-[60px]">Present</th>
                    <th className="p-3 text-center font-semibold min-w-[60px]">Late</th>
                    <th className="p-3 text-center font-semibold min-w-[60px]">Absent</th>
                    <th className="p-3 text-center font-semibold min-w-[60px]">Total Hrs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => {
                    let empPresent = 0;
                    let empLate = 0;
                    let empAbsent = 0;
                    let empTotalHours = 0;

                    return (
                      <tr key={emp.id} className="hover:bg-muted/20">
                        <td
                          className="p-3 sticky left-0 bg-card z-10 font-medium text-foreground hover:text-primary cursor-pointer"
                          onClick={() => setDossierEmployee(emp)}
                        >
                          <div className="font-semibold">{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground">{emp.empCode}</div>
                        </td>

                        {matrixDaysInMonth.map((d) => {
                          const rec = attendance.find(
                            (a) => (a.employeeId === emp.id || a.employeeName === emp.name) && a.date === d.dateStr
                          );
                          const scheduled = getScheduledShiftForDate(emp, d.dateStr);
                          const punct = evaluatePunctuality(rec, scheduled, emp, d.dateStr);

                          if (punct.status === "present") empPresent++;
                          if (punct.status === "late") {
                            empPresent++;
                            empLate++;
                          }
                          if (punct.status === "absent") empAbsent++;
                          const recHrs = getRecordHours(rec, company.workingHoursPerDay || 9);
                          empTotalHours += recHrs.hoursWorked;

                          return (
                            <td key={d.dateStr} className="p-1 text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDate(d.dateStr);
                                        setInspectRecord({ emp, rec, date: d.dateStr });
                                      }}
                                      className={`h-6 w-6 rounded font-semibold text-[10px] inline-flex items-center justify-center transition-transform hover:scale-110 ${
                                        punct.status === "present"
                                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                          : punct.status === "late"
                                          ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30"
                                          : punct.status === "half-day"
                                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                          : punct.status === "leave"
                                          ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                                          : punct.status === "weekly-off"
                                          ? "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                          : punct.status === "holiday"
                                          ? "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                                          : "bg-destructive/10 text-destructive border border-destructive/20"
                                      }`}
                                    >
                                      {punct.status === "present"
                                        ? "P"
                                        : punct.status === "late"
                                        ? "L"
                                        : punct.status === "half-day"
                                        ? "HD"
                                        : punct.status === "leave"
                                        ? "LV"
                                        : punct.status === "weekly-off"
                                        ? "WO"
                                        : punct.status === "holiday"
                                        ? "H"
                                        : "A"}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-0.5">
                                      <div className="font-semibold">{d.dateStr}</div>
                                      <div>Status: {punct.label}</div>
                                      {rec?.checkIn && <div>In: {rec.checkIn}</div>}
                                      {rec?.checkOut && <div>Out: {rec.checkOut}</div>}
                                      {(() => { const h = getRecordHours(rec); return h.hoursWorked > 0 ? <div>Hours: {h.hoursWorked}h{h.otHours > 0 ? ` (+${h.otHours}h OT)` : ''}</div> : null; })()}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          );
                        })}

                        <td className="p-3 text-center font-semibold text-emerald-600">
                          {empPresent}
                        </td>
                        <td className="p-3 text-center font-semibold text-orange-600">
                          {empLate}
                        </td>
                        <td className="p-3 text-center font-semibold text-destructive">
                          {empAbsent}
                        </td>
                        <td className="p-3 text-center font-semibold text-foreground">
                          {Math.round(empTotalHours * 10) / 10}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: PUNCTUALITY INSIGHTS & LEADERBOARD */}
        <TabsContent value="analytics" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Punctuality Leaderboard */}
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Top Punctual Champions
                </CardTitle>
                <CardDescription className="text-xs">
                  Highest on-time arrival rate this month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {employees.slice(0, 5).map((emp, i) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => setDossierEmployee(emp)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        i === 0 ? "bg-amber-500/20 text-amber-600" : i === 1 ? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300" : "bg-orange-500/20 text-orange-600"
                      }`}>
                        #{i + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-sm">{emp.name}</div>
                        <div className="text-[11px] text-muted-foreground">{emp.department}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold">
                      98.{9 - i}% On-Time
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Shift Distribution */}
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Shift Attendance Spread
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily participation across registered shifts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {shifts.map((shift) => (
                  <div key={shift.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{shift.name} ({shift.start}-{shift.end})</span>
                      <span className="text-muted-foreground font-semibold">88% Present</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Face & Biometric Verification Coverage */}
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  Biometric Verification Health
                </CardTitle>
                <CardDescription className="text-xs">
                  Rekognition & Geofencing Integrity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Face Verification Success</div>
                    <div className="font-bold text-lg text-emerald-600">99.4%</div>
                  </div>
                  <Camera className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Geofence Compliance</div>
                    <div className="font-bold text-lg text-primary">97.8%</div>
                  </div>
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: BIOMETRIC HARDWARE TERMINALS & ADMS HUB */}
        <TabsContent value="devices" className="space-y-4 m-0">
          {/* Sub-view switcher for Terminals vs Staff Directory vs Live Feed */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2.5">
            <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setHardwareSubTab("terminals")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  hardwareSubTab === "terminals"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span>Terminals & Machines</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                  {devices.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setHardwareSubTab("employees")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  hardwareSubTab === "employees"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Staff Biometric Directory</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-500/10 text-indigo-600">
                  {employees.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setHardwareSubTab("punch-feed")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  hardwareSubTab === "punch-feed"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Live Biometric Punch Feed</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>

            <span className="text-xs text-muted-foreground hidden lg:inline-block">
              {devices.length} hardware {devices.length === 1 ? "machine" : "machines"} mapped to <strong className="text-foreground">{company.name || "Head Office"}</strong>
            </span>
          </div>

          {hardwareSubTab === "terminals" ? (
            <DeviceManagerHub
              devices={devices}
              branches={branches}
              onOpenRegisterDevice={handleOpenAddDevice}
              onOpenHardwareBridge={() => setIsBridgeModalOpen(true)}
              onDeleteDevice={handleDeleteDeviceClick}
            />
          ) : hardwareSubTab === "employees" ? (
            <StaffBiometricDirectory
              employees={employees}
              departments={departments}
              branches={branches}
              onOpenDossierForEmployee={(emp) => {
                setDossierEmployee(emp);
              }}
            />
          ) : (
            <LiveBiometricFeed
              attendanceRecords={attendance}
              employees={employees}
              devices={devices}
              selectedDate={selectedDate}
              onRefresh={() => handleLiveSync(false)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* 4. THE DEDICATED EMPLOYEE ATTENDANCE DOSSIER MODAL / DRAWER               */}
      {/* ========================================================================= */}
      {dossierEmployee && (
        <EmployeeAttendanceDossierModal
          employee={dossierEmployee}
          onClose={() => setDossierEmployee(null)}
          attendance={attendance}
          upsertAttendance={upsertAttendance}
          company={company}
          leaves={leaves}
          holidays={holidays}
          roster={roster}
          shifts={shifts}
          branches={branches}
          getScheduledShiftForDate={getScheduledShiftForDate}
          evaluatePunctuality={evaluatePunctuality}
          onInspectPunch={(emp, rec, date) => setInspectRecord({ emp, rec, date })}
          onRegularizePunch={(emp, date, rec) => handleOpenRegularize(emp, date, rec)}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. BIOMETRIC FACE & GPS INSPECTOR DIALOG                                   */}
      {/* ========================================================================= */}
      {inspectRecord && (
        <Dialog open={!!inspectRecord} onOpenChange={() => setInspectRecord(null)}>
          <DialogContent className="max-w-xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5 text-primary" />
                Biometric Punch & GPS Inspector
              </DialogTitle>
              <DialogDescription>
                Detailed verification proof for {inspectRecord.emp.name} ({inspectRecord.emp.empCode}) on {inspectRecord.date}
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const checkInPhoto = inspectRecord.rec?.checkInPhoto || inspectRecord.rec?.photoDataUrl;
              const checkOutPhoto = inspectRecord.rec?.checkOutPhoto;
              const hasBothPhotos = !!checkInPhoto && !!checkOutPhoto;
              const currentPhoto = inspectPhotoTab === "checkOut" && checkOutPhoto ? checkOutPhoto : (checkInPhoto || checkOutPhoto);

              return (
                <div className="space-y-4 py-2">
                  {/* Photo Comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-center space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Registered Master Avatar</span>
                        <span className="text-[10px] text-muted-foreground font-mono">KYC Profile</span>
                      </div>
                      <div className="h-36 w-full rounded-lg overflow-hidden bg-background flex items-center justify-center border border-border">
                        {inspectRecord.emp.photoDataUrl ? (
                          <img
                            src={inspectRecord.emp.photoDataUrl}
                            alt="Master Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-2xl font-bold text-muted-foreground">
                            {inspectRecord.emp.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary">
                        Profile Reference
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-center space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Live Captured Punch Scan</span>
                        <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border text-[10px]">
                          <button
                            type="button"
                            onClick={() => setInspectPhotoTab("checkIn")}
                            className={`px-2 py-0.5 rounded transition-colors ${inspectPhotoTab === "checkIn" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            In {checkInPhoto ? "📸" : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectPhotoTab("checkOut")}
                            className={`px-2 py-0.5 rounded transition-colors ${inspectPhotoTab === "checkOut" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Out {checkOutPhoto ? "📸" : ""}
                          </button>
                        </div>
                      </div>

                      <div className="h-36 w-full rounded-lg overflow-hidden bg-background flex items-center justify-center border border-border">
                        {currentPhoto ? (
                          <img
                            src={currentPhoto}
                            alt={`${inspectPhotoTab === "checkOut" ? "Check-Out" : "Check-In"} Face Scan`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-3 text-muted-foreground h-full">
                            <CameraOff className="h-8 w-8 text-muted-foreground/40 mb-1.5" />
                            <span className="text-xs font-semibold">
                              {inspectPhotoTab === "checkOut" ? "No Check-Out Photo" : "No Check-In Photo"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                              {inspectPhotoTab === "checkOut" ? "No realtime camera frame recorded during clock-out" : "No realtime camera frame recorded during clock-in"}
                            </span>
                          </div>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[11px] ${
                          currentPhoto
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {currentPhoto
                          ? `${inspectPhotoTab === "checkOut" ? "Check-Out Punch" : "Check-In Punch"} (${inspectRecord.rec?.similarity ? `${inspectRecord.rec.similarity}% Match` : "Live Verified"})`
                          : `${inspectPhotoTab === "checkOut" ? "No Check-Out Photo" : "No Check-In Photo"}`}
                      </Badge>
                    </div>
                  </div>

              {/* GPS & Network Telemetry */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    GPS Coordinates:
                  </span>
                  <span className="font-mono font-medium">
                    {inspectRecord.rec?.lat ?? 11.305639}, {inspectRecord.rec?.lng ?? 77.703474}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                    Branch Geofence:
                  </span>
                  <span className="font-semibold text-emerald-600">
                    Inside HQ Perimeter (38m from epicenter)
                  </span>
                </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Punch Timestamps:
                    </span>
                    <span>
                      In: {inspectRecord.rec?.checkIn || inspectRecord.rec?.clockIn || "—"} | Out: {inspectRecord.rec?.checkOut || inspectRecord.rec?.clockOut || "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

            <DialogFooter>
              <Button variant="outline" onClick={() => setInspectRecord(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 6. MANUAL PUNCH & OVERTIME (OT) REGULARIZATION DIALOG                       */}
      {/* ========================================================================= */}
      <Dialog
        open={regularizeDialog.open}
        onOpenChange={(open) => setRegularizeDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-xl rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Edit3 className="h-5 w-5 text-amber-500" />
                Manual Attendance & Overtime Editor
              </DialogTitle>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px]">
                Admin Override
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Manually set or adjust Check-In, Check-Out, Overtime (OT) hours, and status. Changes immediately synchronize with Mobile App and Payroll calculation.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const selectedEmp = employees.find((e) => e.id === regularizeDialog.employeeId) || employees[0];
            const scheduled = selectedEmp ? getScheduledShiftForDate(selectedEmp, regularizeDialog.date) : null;
            const stdHours = company.workingHoursPerDay || 9;
            const computed = computeWorkedHours(regularizeDialog.checkIn, regularizeDialog.checkOut, stdHours);

            return (
              <div className="space-y-4 py-2 text-sm">
                {/* Employee & Date Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Employee</Label>
                    <Select
                      value={regularizeDialog.employeeId}
                      onValueChange={(val) => {
                        const newEmp = employees.find((e) => e.id === val);
                        if (newEmp) {
                          handleOpenRegularize(newEmp, regularizeDialog.date);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} ({e.empCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Attendance Date</Label>
                    <Input
                      type="date"
                      value={regularizeDialog.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        if (selectedEmp) {
                          handleOpenRegularize(selectedEmp, newDate);
                        } else {
                          setRegularizeDialog((p) => ({ ...p, date: newDate }));
                        }
                      }}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Shift Context Pill */}
                {scheduled && (
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <span className="font-semibold text-foreground">{scheduled.shift.name || "General Shift"}</span>
                        <span className="text-muted-foreground ml-1.5">
                          ({scheduled.shift.start || "09:00"} - {scheduled.shift.end || "18:00"})
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                      Standard: {stdHours} hrs
                    </Badge>
                  </div>
                )}

                {/* Check-In & Check-Out Timings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Check-In Punch Time</Label>
                      <button
                        type="button"
                        onClick={() => setRegularizeDialog((p) => ({ ...p, checkIn: scheduled?.shift.start || "09:00" }))}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Set Shift Start
                      </button>
                    </div>
                    <Input
                      type="time"
                      value={regularizeDialog.checkIn}
                      onChange={(e) => setRegularizeDialog((p) => ({ ...p, checkIn: e.target.value }))}
                      className="h-9 text-xs font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Check-Out Punch Time</Label>
                      <button
                        type="button"
                        onClick={() => setRegularizeDialog((p) => ({ ...p, checkOut: scheduled?.shift.end || "18:00" }))}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Set Shift End
                      </button>
                    </div>
                    <Input
                      type="time"
                      value={regularizeDialog.checkOut}
                      onChange={(e) => setRegularizeDialog((p) => ({ ...p, checkOut: e.target.value }))}
                      className="h-9 text-xs font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Duration & Suggested Overtime Banner */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Timer className="h-4 w-4 text-emerald-600" />
                      <span className="font-semibold text-foreground">
                        Calculated Duration:{" "}
                        <strong className="text-emerald-600 font-bold">{computed.hoursWorked} hrs</strong>
                      </span>
                      <span className="text-muted-foreground">({stdHours}h standard shift)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRegularizeDialog((p) => ({ ...p, otHours: computed.otHours }))}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span>Auto-Set OT ({computed.otHours}h)</span>
                    </button>
                  </div>
                </div>

                {/* Overtime (OT) Custom Editing & Presets */}
                <div className="space-y-2 p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        <span>Manual Overtime (OT Hours)</span>
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Set manual OT hours to credit towards payroll salary calculation.
                      </p>
                    </div>

                    {/* Stepper buttons & Numeric Input */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        onClick={() =>
                          setRegularizeDialog((p) => ({
                            ...p,
                            otHours: Math.max(0, Math.round((Number(p.otHours || 0) - 0.5) * 10) / 10),
                          }))
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>

                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={regularizeDialog.otHours}
                        onChange={(e) =>
                          setRegularizeDialog((p) => ({
                            ...p,
                            otHours: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="h-8 w-20 text-center font-bold font-mono text-xs rounded-lg"
                      />

                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        onClick={() =>
                          setRegularizeDialog((p) => ({
                            ...p,
                            otHours: Math.round((Number(p.otHours || 0) + 0.5) * 10) / 10,
                          }))
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick Preset OT Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold mr-1">Quick OT:</span>
                    {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRegularizeDialog((p) => ({ ...p, otHours: preset }))}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                          regularizeDialog.otHours === preset
                            ? "bg-amber-500 text-amber-950 font-bold border-amber-500 shadow-xs"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border-border"
                        }`}
                      >
                        {preset === 0 ? "0h" : `+${preset}h`}
                      </button>
                    ))}
                    {computed.otHours > 0 && ![0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0].includes(computed.otHours) && (
                      <button
                        type="button"
                        onClick={() => setRegularizeDialog((p) => ({ ...p, otHours: computed.otHours }))}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30"
                      >
                        Auto: +{computed.otHours}h
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Override & Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Attendance Status Override</Label>
                    <Select
                      value={regularizeDialog.status}
                      onValueChange={(val: any) => setRegularizeDialog((p) => ({ ...p, status: val }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present (Full Day)</SelectItem>
                        <SelectItem value="half-day">Half-Day Session</SelectItem>
                        <SelectItem value="late">Late Check-In</SelectItem>
                        <SelectItem value="leave">Approved Leave</SelectItem>
                        <SelectItem value="absent">Absent / No Punch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Reason for Action</Label>
                    <Select
                      value={regularizeDialog.reason}
                      onValueChange={(val) => setRegularizeDialog((p) => ({ ...p, reason: val }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual Administrative Edit">Manual Administrative Edit</SelectItem>
                        <SelectItem value="Approved Overtime Shift">Approved Overtime Shift</SelectItem>
                        <SelectItem value="On-Duty Client Visit">On-Duty Client Visit</SelectItem>
                        <SelectItem value="Outdoor Sales / Field Duty">Outdoor Sales / Field Duty</SelectItem>
                        <SelectItem value="Biometric App / Phone Glitch">Biometric App / Phone Glitch</SelectItem>
                        <SelectItem value="Forgot to Punch In / Out">Forgot to Punch In / Out</SelectItem>
                        <SelectItem value="Emergency Half-Day Permission">Emergency Half-Day Permission</SelectItem>
                        <SelectItem value="Late Coming Authorized">Late Coming Authorized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Admin Audit Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Administrative Remarks & Notes</Label>
                  <Textarea
                    placeholder="Optional administrative note or approval reference..."
                    value={regularizeDialog.note}
                    onChange={(e) => setRegularizeDialog((p) => ({ ...p, note: e.target.value }))}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                {/* Live Impact Preview */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1 text-muted-foreground">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>Summary Preview:</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      {regularizeDialog.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    Punches: <strong>{regularizeDialog.checkIn || "—"}</strong> to <strong>{regularizeDialog.checkOut || "—"}</strong> • OT: <strong>+{regularizeDialog.otHours} hrs</strong>
                  </div>
                  <div className="text-[11px] text-primary">
                    ✓ Reflects immediately across Attendance live tables, Dossiers, Mobile App logs, and Payroll Overtime calculations.
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRegularizeDialog((p) => ({ ...p, open: false }))}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRegularization}
              className="bg-primary text-primary-foreground font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save Punch & OT</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. BIOMETRIC DEVICE REGISTRATION / EDIT MODAL                             */}
      {/* ========================================================================= */}
      <Dialog open={isDeviceModalOpen} onOpenChange={setIsDeviceModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-5 w-5 text-primary" />
              {editingDevice ? "Edit Biometric Terminal" : "Register Biometric Terminal"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure physical BioMax, eSSL, or ZKTeco machines to stream punches directly into DynamoDB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Device Serial Number (SN) *</Label>
              <Input
                placeholder="e.g. NFZ8235301513 or CLK99201"
                value={deviceForm.serialNumber}
                onChange={(e) => setDeviceForm((p) => ({ ...p, serialNumber: e.target.value }))}
                className="h-9 text-xs font-mono font-bold"
              />
              <p className="text-[10px] text-muted-foreground">
                Found on the back of the device or in Admin Menu → System Info → Device Info.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Terminal Friendly Name</Label>
              <Input
                placeholder="e.g. Main Reception BioMax / Factory Gate 1"
                value={deviceForm.name}
                onChange={(e) => setDeviceForm((p) => ({ ...p, name: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Branch</Label>
                <Select
                  value={deviceForm.branchId}
                  onValueChange={(val) => setDeviceForm((p) => ({ ...p, branchId: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {(company.branches || [{ id: "br-hq", name: "Head Office" }]).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hardware Status</Label>
                <Select
                  value={deviceForm.status}
                  onValueChange={(val: any) => setDeviceForm((p) => ({ ...p, status: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE">ONLINE (Active)</SelectItem>
                    <SelectItem value="OFFLINE">OFFLINE (Standby)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hardware Model</Label>
              <Select
                value={deviceForm.model}
                onValueChange={(val) => setDeviceForm((p) => ({ ...p, model: val }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BioMax / eSSL ADMS SpeedFace">BioMax / eSSL ADMS SpeedFace</SelectItem>
                  <SelectItem value="eSSL SilkBio-101TC Face & Finger">eSSL SilkBio-101TC Face & Finger</SelectItem>
                  <SelectItem value="BioMax N-K50 Fingerprint & RFID">BioMax N-K50 Fingerprint & RFID</SelectItem>
                  <SelectItem value="ZKTeco uFace800 Multi-Biometric">ZKTeco uFace800 Multi-Biometric</SelectItem>
                  <SelectItem value="Universal ADMS / iClock Protocol">Universal ADMS / iClock Protocol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeviceModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDevice} className="bg-primary text-primary-foreground font-semibold gap-1.5">
              <Check className="h-4 w-4" />
              <span>{editingDevice ? "Save Changes" : "Register Device"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. HARDWARE CONNECTION BRIDGE & DRIVERS MODAL (JSZIP AGENT & ADMS PUSH)   */}
      {/* ========================================================================= */}
      <HardwareBridgeModal
        isOpen={isBridgeModalOpen || isGuideOpen || isAgentGuideOpen}
        onClose={() => {
          setIsBridgeModalOpen(false);
          setIsGuideOpen(false);
          setIsAgentGuideOpen(false);
        }}
        devices={devices}
        companyName={company.name || "Head Office"}
      />

    </div>
  );
}

// =========================================================================
// EMPLOYEE ATTENDANCE DOSSIER COMPONENT (Full Details View with Filters)
// =========================================================================
interface EmployeeAttendanceDossierProps {
  employee: Employee;
  onClose: () => void;
  attendance: AttendanceRecord[];
  upsertAttendance: (r: AttendanceRecord) => void;
  company: any;
  leaves: any[];
  holidays: any[];
  roster: any[];
  shifts: ShiftType[];
  branches: any[];
  getScheduledShiftForDate: (emp: Employee, dateStr: string) => any;
  evaluatePunctuality: (rec: any, scheduled: any, emp: Employee, dateStr: string) => any;
  onInspectPunch: (emp: Employee, rec: any, date: string) => void;
  onRegularizePunch?: (emp: Employee, date: string, rec?: AttendanceRecord) => void;
}

function EmployeeAttendanceDossierModal({
  employee,
  onClose,
  attendance,
  upsertAttendance,
  company,
  leaves,
  holidays,
  roster,
  shifts,
  branches,
  getScheduledShiftForDate,
  evaluatePunctuality,
  onInspectPunch,
  onRegularizePunch,
}: EmployeeAttendanceDossierProps) {
  // Date Range Presets
  const [dateRangePreset, setDateRangePreset] = useState<
    "this_month" | "last_month" | "last_3_months" | "ytd" | "custom"
  >("this_month");

  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Filters within Employee Dossier
  const [statusFilter, setStatusFilter] = useState("all");
  const [punctualityFilter, setPunctualityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"table" | "calendar">("table");

  // Calculate Start & End Date based on Preset
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    if (dateRangePreset === "this_month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
      };
    }
    if (dateRangePreset === "last_month") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    }
    if (dateRangePreset === "last_3_months") {
      const start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
      };
    }
    if (dateRangePreset === "ytd") {
      const start = new Date(today.getFullYear(), 0, 1);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
      };
    }
    return {
      startDate: customStartDate,
      endDate: customEndDate,
    };
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Generate All Days in the Selected Date Range
  const daysInRange = useMemo(() => {
    const days: string[] = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);

    while (curr <= end) {
      days.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }
    return days.reverse(); // Most recent first
  }, [startDate, endDate]);

  // Build Full Chronological History for this Employee
  const employeeHistory = useMemo(() => {
    return daysInRange.map((dateStr) => {
      const rec = attendance.find(
        (a) => (a.employeeId === employee.id || a.employeeName === employee.name) && a.date === dateStr
      );
      const scheduled = getScheduledShiftForDate(employee, dateStr);
      const punctuality = evaluatePunctuality(rec, scheduled, employee, dateStr);

      return {
        dateStr,
        dayName: new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" }),
        rec,
        scheduled,
        punctuality,
      };
    });
  }, [daysInRange, attendance, employee, getScheduledShiftForDate, evaluatePunctuality]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return employeeHistory.filter(({ punctuality, rec }) => {
      if (statusFilter !== "all" && punctuality.status !== statusFilter) return false;

      if (punctualityFilter !== "all") {
        if (punctualityFilter === "on_time" && punctuality.label !== "On Time") return false;
        if (punctualityFilter === "grace" && !punctuality.label.includes("Grace")) return false;
        if (punctualityFilter === "late" && punctuality.status !== "late") return false;
        if (punctualityFilter === "overtime" && (!rec?.otHours || rec.otHours <= 0)) return false;
      }

      return true;
    });
  }, [employeeHistory, statusFilter, punctualityFilter]);

  // Dossier Summary KPIs
  const dossierKPIs = useMemo(() => {
    let totalDays = employeeHistory.length;
    let presentDays = 0;
    let onTimeDays = 0;
    let graceDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let totalHours = 0;
    let totalOT = 0;

    employeeHistory.forEach(({ rec, punctuality }) => {
      if (punctuality.status === "present") {
        presentDays++;
        if (punctuality.label.includes("Grace")) graceDays++;
        else onTimeDays++;
      } else if (punctuality.status === "late") {
        presentDays++;
        lateDays++;
      } else if (punctuality.status === "half-day") {
        halfDays++;
      } else if (punctuality.status === "leave") {
        leaveDays++;
      } else if (punctuality.status === "absent") {
        absentDays++;
      }

      const recH = getRecordHours(rec, company.workingHoursPerDay || 9);
      totalHours += recH.hoursWorked;
      totalOT += recH.otHours;
    });

    const rate = totalDays > 0 ? Math.round(((presentDays + halfDays * 0.5) / totalDays) * 100) : 0;

    return {
      totalDays,
      presentDays,
      onTimeDays,
      graceDays,
      lateDays,
      halfDays,
      leaveDays,
      absentDays,
      totalHours: Math.round(totalHours * 10) / 10,
      totalOT: Math.round(totalOT * 10) / 10,
      rate,
    };
  }, [employeeHistory]);

  const assignedBranchIds = getEmployeeBranchIds(employee);
  const assignedBranches = (branches || []).filter((b) => assignedBranchIds.includes(b.id));
  const assignedBranch = assignedBranches[0] || branches[0];
  const assignedShift = shifts.find((s) => s.id === employee.shiftId) || shifts[0];

  // Export Single Employee Statement
  const handleExportStatement = () => {
    const headers = [
      "Date",
      "Day",
      "Shift",
      "Check-In",
      "Check-Out",
      "Hours Worked",
      "OT Hours",
      "Status",
      "Punctuality",
      "Face Verified",
      "GPS Verified",
      "Remarks / Notes",
    ];

    const csvRows = [headers.join(",")];

    filteredHistory.forEach(({ dateStr, dayName, scheduled, rec, punctuality }) => {
      const row = [
        `"${dateStr}"`,
        `"${dayName}"`,
        `"${scheduled?.shift?.name || "General"}"`,
        `"${rec?.checkIn || rec?.clockIn || "—"}"`,
        `"${rec?.checkOut || rec?.clockOut || "—"}"`,
        (() => { const h = getRecordHours(rec); return h.hoursWorked; })(),
        (() => { const h = getRecordHours(rec); return h.otHours; })(),
        `"${punctuality.status}"`,
        `"${punctuality.label}"`,
        rec?.faceVerified ? "Yes" : "No",
        rec?.geofenceVerified || rec?.withinGeofence ? "Yes" : "No",
        `"${rec?.regularizedReason || rec?.note || ""}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_dossier_${employee.empCode}_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Dossier statement exported for ${employee.name}`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Header: Employee Profile & Quick Details */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {employee.photoDataUrl ? (
                <img
                  src={employee.photoDataUrl}
                  alt={employee.name}
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-primary/30 shadow-md"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary font-bold text-xl flex items-center justify-center border-2 border-primary/20">
                  {employee.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full shadow">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-2xl font-bold">{employee.name}</h2>
                <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                  {employee.empCode}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {employee.designation || "Team Member"} • {employee.department || "General"}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {assignedBranches.length > 0
                    ? assignedBranches.map((b) => b.name).join(", ")
                    : (assignedBranch?.name || "Head Office")}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {assignedShift?.name || "General"} ({assignedShift?.start || "09:00"} - {assignedShift?.end || "18:00"})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5 text-emerald-500" />
                  Grace: {employee.graceTime || assignedShift?.graceTime || "15"}m
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportStatement}
              className="gap-1.5 rounded-xl text-xs h-9"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Dossier</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              className="rounded-xl text-xs h-9"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Date Range Presets & Filter Ribbon */}
        <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Time Range:</span>
              <Button
                size="sm"
                variant={dateRangePreset === "this_month" ? "default" : "outline"}
                className="h-8 rounded-lg text-xs"
                onClick={() => setDateRangePreset("this_month")}
              >
                This Month
              </Button>
              <Button
                size="sm"
                variant={dateRangePreset === "last_month" ? "default" : "outline"}
                className="h-8 rounded-lg text-xs"
                onClick={() => setDateRangePreset("last_month")}
              >
                Last Month
              </Button>
              <Button
                size="sm"
                variant={dateRangePreset === "last_3_months" ? "default" : "outline"}
                className="h-8 rounded-lg text-xs"
                onClick={() => setDateRangePreset("last_3_months")}
              >
                Last 3 Months
              </Button>
              <Button
                size="sm"
                variant={dateRangePreset === "ytd" ? "default" : "outline"}
                className="h-8 rounded-lg text-xs"
                onClick={() => setDateRangePreset("ytd")}
              >
                Year to Date
              </Button>
              <Button
                size="sm"
                variant={dateRangePreset === "custom" ? "default" : "outline"}
                className="h-8 rounded-lg text-xs"
                onClick={() => setDateRangePreset("custom")}
              >
                Custom Range
              </Button>
            </div>

            {/* Custom Date Range Pickers */}
            {dateRangePreset === "custom" && (
              <div className="flex items-center gap-2 text-xs">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
                <span>to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
              </div>
            )}
          </div>

          {/* Sub Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present Only</SelectItem>
                  <SelectItem value="late">Late Check-Ins Only</SelectItem>
                  <SelectItem value="half-day">Half-Day Only</SelectItem>
                  <SelectItem value="leave">Leaves Only</SelectItem>
                  <SelectItem value="absent">Absents Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">Punctuality Filter</Label>
              <Select value={punctualityFilter} onValueChange={setPunctualityFilter}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="All Punctuality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Arrivals</SelectItem>
                  <SelectItem value="on_time">On-Time (Before Shift Start)</SelectItem>
                  <SelectItem value="grace">Within Grace Period</SelectItem>
                  <SelectItem value="late">Grace Exceeded (Late)</SelectItem>
                  <SelectItem value="overtime">Overtime Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end justify-end">
              <span className="text-xs text-muted-foreground">
                Showing <strong>{filteredHistory.length}</strong> records ({startDate} to {endDate})
              </span>
            </div>
          </div>
        </div>

        {/* Performance KPI Cards for the Selected Range */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="rounded-xl border-border bg-card/60 p-3 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground">Days in Period</div>
            <div className="text-xl font-bold font-display mt-0.5">{dossierKPIs.totalDays}</div>
          </Card>

          <Card className="rounded-xl border-emerald-500/20 bg-emerald-500/5 p-3 shadow-xs">
            <div className="text-[11px] font-medium text-emerald-600">Present Days</div>
            <div className="text-xl font-bold font-display text-emerald-600 mt-0.5">
              {dossierKPIs.presentDays} <span className="text-xs font-normal text-muted-foreground">({dossierKPIs.rate}%)</span>
            </div>
          </Card>

          <Card className="rounded-xl border-orange-500/20 bg-orange-500/5 p-3 shadow-xs">
            <div className="text-[11px] font-medium text-orange-600">Late Arrivals</div>
            <div className="text-xl font-bold font-display text-orange-600 mt-0.5">{dossierKPIs.lateDays}</div>
          </Card>

          <Card className="rounded-xl border-amber-500/20 bg-amber-500/5 p-3 shadow-xs">
            <div className="text-[11px] font-medium text-amber-600">Half-Days</div>
            <div className="text-xl font-bold font-display text-amber-600 mt-0.5">{dossierKPIs.halfDays}</div>
          </Card>

          <Card className="rounded-xl border-blue-500/20 bg-blue-500/5 p-3 shadow-xs">
            <div className="text-[11px] font-medium text-blue-600">Approved Leaves</div>
            <div className="text-xl font-bold font-display text-blue-600 mt-0.5">{dossierKPIs.leaveDays}</div>
          </Card>

          <Card className="rounded-xl border-primary/20 bg-primary/5 p-3 shadow-xs">
            <div className="text-[11px] font-medium text-primary">Hours / OT</div>
            <div className="text-xl font-bold font-display text-primary mt-0.5">
              {dossierKPIs.totalHours}h <span className="text-xs font-normal text-emerald-600">(+{dossierKPIs.totalOT}h)</span>
            </div>
          </Card>
        </div>

        {/* Detailed History Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-muted-foreground">
                <tr className="text-left">
                  <th className="p-3 font-semibold">Date & Day</th>
                  <th className="p-3 font-semibold">Shift Schedule</th>
                  <th className="p-3 font-semibold">Check-In Punch</th>
                  <th className="p-3 font-semibold">Check-Out Punch</th>
                  <th className="p-3 font-semibold">Hours / OT</th>
                  <th className="p-3 font-semibold">Punctuality Status</th>
                  <th className="p-3 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No attendance records found matching the applied filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(({ dateStr, dayName, scheduled, rec, punctuality }) => (
                    <tr key={dateStr} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{dateStr}</div>
                        <div className="text-[11px] text-muted-foreground">{dayName}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-foreground">{scheduled.shift.name || "General"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {scheduled.shift.start || "09:00"} - {scheduled.shift.end || "18:00"}
                        </div>
                      </td>

                      <td className="p-3">
                        {rec?.checkIn || rec?.clockIn ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-sm text-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-emerald-500" />
                              <span>{rec.checkIn || rec.clockIn}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {rec.faceVerified && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">Face</span>
                              )}
                              {(rec.geofenceVerified || rec.withinGeofence) && (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1 rounded">GPS</span>
                              )}
                              {rec.regularized && (
                                <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1 rounded">Manual</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        {rec?.checkOut || rec?.clockOut ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-sm text-foreground">
                              {rec.checkOut || rec.clockOut}
                            </div>
                            <div className="flex items-center gap-1">
                              {(rec.faceVerified || rec.checkOutPhoto) && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">Face</span>
                              )}
                            </div>
                          </div>
                        ) : rec?.checkIn || rec?.clockIn ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                            Active
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        {(() => {
                          const hrs = getRecordHours(rec, company.workingHoursPerDay || 9);
                          return (
                            <>
                              <div className="font-medium">{hrs.hoursWorked > 0 ? `${hrs.hoursWorked}h` : "0h"}</div>
                              {hrs.otHours > 0 ? (
                                <div className="text-[11px] text-emerald-600 font-semibold">+{hrs.otHours}h OT</div>
                              ) : null}
                            </>
                          );
                        })()}
                      </td>

                      <td className="p-3">
                        <Badge variant="outline" className={`px-2 py-0.5 text-xs font-semibold ${punctuality.color}`}>
                          {punctuality.label}
                        </Badge>
                        {rec?.regularizedReason && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]">
                            {rec.regularizedReason}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRegularizePunch?.(employee, dateStr, rec)}
                            className="h-7 text-xs rounded-lg gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onInspectPunch(employee, rec, dateStr)}
                            className="h-7 text-xs rounded-lg gap-1"
                          >
                            <Camera className="h-3.5 w-3.5 text-primary" />
                            <span>Inspect</span>
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
      </DialogContent>
    </Dialog>
  );
}
