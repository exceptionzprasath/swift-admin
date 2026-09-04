import React, { useState, useMemo } from "react";
import {
  Search,
  Fingerprint,
  ScanFace,
  CreditCard,
  KeyRound,
  Download,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
  HardDrive,
  Eye,
  CheckCircle2,
  LogIn,
  LogOut,
  Coffee,
  Sparkles,
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type AttendanceRecord, type Employee, type Device } from "@/lib/store";
import { toast } from "sonner";

interface LiveBiometricFeedProps {
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
  devices: Device[];
  selectedDate?: string;
  onRefresh?: () => void;
}

export function LiveBiometricFeed({
  attendanceRecords = [],
  employees = [],
  devices = [],
  selectedDate,
  onRefresh,
}: LiveBiometricFeedProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilterMode, setDateFilterMode] = useState<
    "ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "CUSTOM"
  >("ALL");
  const [customDate, setCustomDate] = useState(
    selectedDate || new Date().toISOString().slice(0, 10)
  );
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState("ALL");
  const [selectedStateFilter, setSelectedStateFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<
    "timestamp_desc" | "timestamp_asc" | "name_asc" | "name_desc" | "pin_asc" | "pin_desc"
  >("timestamp_desc");

  const [inspectPunch, setInspectPunch] = useState<{
    record: AttendanceRecord;
    emp?: Employee;
    dev?: Device;
  } | null>(null);

  // Synthesize flat punches from attendance records (extracting checkIn and checkOut punches)
  const punchFeedItems = useMemo(() => {
    const items: Array<{
      id: string;
      recordId: string;
      employeeId: string;
      employeeName: string;
      empCode?: string;
      department?: string;
      branchName?: string;
      deviceSerial: string;
      timestamp: string;
      date: string;
      timeStr: string;
      punchState: "CHECK_IN" | "CHECK_OUT";
      punchType: string;
      source: string;
      rawRecord: AttendanceRecord;
    }> = [];

    attendanceRecords.forEach((rec) => {
      const emp = employees.find((e) => e.id === rec.employeeId);
      const name = rec.employeeName || emp?.name || `Staff #${rec.employeeId.slice(0, 6)}`;
      const empCode = rec.empCode || emp?.empCode || "EMP";
      const dept = rec.department || emp?.department || "Operations";
      const branch = rec.branchName || "Head Office";
      const devSn = rec.deviceSerial || "BIO-TERM-001";
      const pType = rec.punchType || "FINGERPRINT";

      if (rec.checkIn || rec.clockIn) {
        const timeVal = rec.checkIn || rec.clockIn || "09:00";
        items.push({
          id: `${rec.id}-in`,
          recordId: rec.id,
          employeeId: rec.employeeId,
          employeeName: name,
          empCode,
          department: dept,
          branchName: branch,
          deviceSerial: devSn,
          timestamp: `${rec.date}T${timeVal}:00`,
          date: rec.date,
          timeStr: timeVal,
          punchState: "CHECK_IN",
          punchType: pType,
          source: rec.source || "BIOMETRIC_TERMINAL",
          rawRecord: rec,
        });
      }

      if (rec.checkOut || rec.clockOut) {
        const timeVal = rec.checkOut || rec.clockOut || "18:00";
        items.push({
          id: `${rec.id}-out`,
          recordId: rec.id,
          employeeId: rec.employeeId,
          employeeName: name,
          empCode,
          department: dept,
          branchName: branch,
          deviceSerial: devSn,
          timestamp: `${rec.date}T${timeVal}:00`,
          date: rec.date,
          timeStr: timeVal,
          punchState: "CHECK_OUT",
          punchType: pType,
          source: rec.source || "BIOMETRIC_TERMINAL",
          rawRecord: rec,
        });
      }
    });

    return items;
  }, [attendanceRecords, employees]);

  // Filter and sort items
  const filteredAndSortedPunches = useMemo(() => {
    return punchFeedItems
      .filter((punch) => {
        // 1. Text search
        const query = searchTerm.toLowerCase().trim();
        const matchesQuery =
          !query ||
          punch.employeeName.toLowerCase().includes(query) ||
          (punch.empCode && punch.empCode.toLowerCase().includes(query)) ||
          punch.deviceSerial.toLowerCase().includes(query) ||
          (punch.department && punch.department.toLowerCase().includes(query));

        // 2. Device filter
        const matchesDevice =
          selectedDeviceFilter === "ALL" || punch.deviceSerial === selectedDeviceFilter;

        // 3. State filter
        const matchesState =
          selectedStateFilter === "ALL" || punch.punchState === selectedStateFilter;

        // 4. Date filter
        let matchesDate = true;
        const pDate = new Date(`${punch.date}T00:00:00`);
        if (!isNaN(pDate.getTime())) {
          if (dateFilterMode === "TODAY") {
            matchesDate = isToday(pDate);
          } else if (dateFilterMode === "YESTERDAY") {
            matchesDate = isYesterday(pDate);
          } else if (dateFilterMode === "THIS_WEEK") {
            matchesDate = isThisWeek(pDate);
          } else if (dateFilterMode === "CUSTOM" && customDate) {
            matchesDate = punch.date === customDate;
          }
        }

        return matchesQuery && matchesDevice && matchesState && matchesDate;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        const nameA = a.employeeName.toLowerCase();
        const nameB = b.employeeName.toLowerCase();

        switch (sortBy) {
          case "timestamp_asc":
            return timeA - timeB;
          case "timestamp_desc":
            return timeB - timeA;
          case "name_asc":
            return nameA.localeCompare(nameB);
          case "name_desc":
            return nameB.localeCompare(nameA);
          default:
            return timeB - timeA;
        }
      });
  }, [punchFeedItems, searchTerm, selectedDeviceFilter, selectedStateFilter, dateFilterMode, customDate, sortBy]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredAndSortedPunches.length === 0) {
      toast.error("No biometric punches to export.");
      return;
    }

    const headers = [
      "Staff Name",
      "Employee Code",
      "Department",
      "Branch",
      "Punch State",
      "Auth Type",
      "Date",
      "Time",
      "Device Serial",
      "Source",
    ];

    const rows = filteredAndSortedPunches.map((p) => [
      `"${p.employeeName.replace(/"/g, '""')}"`,
      `"${p.empCode || ""}"`,
      `"${p.department || ""}"`,
      `"${p.branchName || ""}"`,
      `"${p.punchState}"`,
      `"${p.punchType}"`,
      `"${p.date}"`,
      `"${p.timeStr}"`,
      `"${p.deviceSerial}"`,
      `"${p.source}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `biometric_punches_${format(new Date(), "yyyyMMdd_HHmm")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Biometric punches exported to CSV!");
  };

  const getPunchTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "FACE_RECOGNITION":
        return <ScanFace className="w-3.5 h-3.5 text-blue-500" />;
      case "CARD_RFID":
        return <CreditCard className="w-3.5 h-3.5 text-purple-500" />;
      case "PIN_PASSWORD":
        return <KeyRound className="w-3.5 h-3.5 text-amber-500" />;
      case "FINGERPRINT":
      default:
        return <Fingerprint className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bar: Search, Filters & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search staff, code, or serial..."
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
            {(["TODAY", "YESTERDAY", "THIS_WEEK", "ALL"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDateFilterMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  dateFilterMode === mode
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "TODAY"
                  ? "Today"
                  : mode === "YESTERDAY"
                  ? "Yesterday"
                  : mode === "THIS_WEEK"
                  ? "This Week"
                  : "All Time"}
              </button>
            ))}
          </div>

          {/* Device Filter */}
          <Select
            value={selectedDeviceFilter}
            onValueChange={setSelectedDeviceFilter}
          >
            <SelectTrigger className="h-8 text-xs w-[150px] rounded-xl font-mono">
              <SelectValue placeholder="All Machines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Machines</SelectItem>
              {devices.map((d) => (
                <SelectItem key={d.id} value={d.serialNumber}>
                  {d.name || d.serialNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Punch State Filter */}
          <Select
            value={selectedStateFilter}
            onValueChange={setSelectedStateFilter}
          >
            <SelectTrigger className="h-8 text-xs w-[125px] rounded-xl">
              <SelectValue placeholder="All Punches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All States</SelectItem>
              <SelectItem value="CHECK_IN">Check-In</SelectItem>
              <SelectItem value="CHECK_OUT">Check-Out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Selector */}
          <Select
            value={sortBy}
            onValueChange={(val: any) => setSortBy(val)}
          >
            <SelectTrigger className="h-8 text-xs w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timestamp_desc">Newest First</SelectItem>
              <SelectItem value="timestamp_asc">Oldest First</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="h-8 text-xs rounded-xl gap-1.5 font-medium border-border"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Punches Stream Table */}
      <Card className="rounded-2xl border-border shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Live Ingestion Stream ({filteredAndSortedPunches.length} Punches)
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time feed of hardware punches received from all registered biometric terminals
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
            Live Buffer Synced
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          {filteredAndSortedPunches.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                <Clock className="w-6 h-6" />
              </div>
              <div className="font-semibold text-foreground text-sm">No Biometric Punches Found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No biometric attendance events recorded matching the current filter criteria. Use the simulator or start the local sync agent to stream events.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Punch State</th>
                  <th className="p-3">Auth Method</th>
                  <th className="p-3">Punch Time</th>
                  <th className="p-3">Terminal (SN)</th>
                  <th className="p-3">Branch Location</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSortedPunches.map((punch) => {
                  const emp = employees.find((e) => e.id === punch.employeeId);
                  const dev = devices.find((d) => d.serialNumber === punch.deviceSerial);

                  return (
                    <tr key={punch.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-foreground text-sm flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {punch.employeeName}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {punch.empCode} • {punch.department}
                        </div>
                      </td>

                      <td className="p-3">
                        {punch.punchState === "CHECK_IN" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px] gap-1">
                            <LogIn className="w-3 h-3" />
                            Check-In (0)
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-[10px] gap-1">
                            <LogOut className="w-3 h-3" />
                            Check-Out (1)
                          </Badge>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          {getPunchTypeIcon(punch.punchType)}
                          <span className="capitalize text-[11px]">
                            {punch.punchType?.toLowerCase().replace(/_/g, " ") || "Fingerprint"}
                          </span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-mono font-bold text-foreground">
                          {punch.timeStr}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {punch.date}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded-md border border-border text-[11px]">
                          {punch.deviceSerial}
                        </span>
                      </td>

                      <td className="p-3 text-muted-foreground font-medium">
                        {punch.branchName}
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInspectPunch({ record: punch.rawRecord, emp, dev })}
                          className="h-7 px-2 text-[11px] rounded-lg gap-1 text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Payload</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Raw Punch Inspector Dialog */}
      {inspectPunch && (
        <Dialog open={!!inspectPunch} onOpenChange={() => setInspectPunch(null)}>
          <DialogContent className="max-w-lg rounded-2xl p-6">
            <DialogHeader className="pb-2 border-b border-border">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" />
                Biometric Punch Packet Inspector
              </DialogTitle>
              <DialogDescription className="text-xs">
                Detailed ADMS packet and attendance attributes for {inspectPunch.emp?.name || inspectPunch.record.employeeName || "Staff"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Staff Member</span>
                  <strong className="text-foreground">{inspectPunch.emp?.name || inspectPunch.record.employeeName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Employee Code / PIN</span>
                  <strong className="font-mono text-foreground">{inspectPunch.emp?.empCode || inspectPunch.record.employeeId}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Target Machine Serial</span>
                  <strong className="font-mono text-foreground">{inspectPunch.record.deviceSerial || "BIO-TERM-001"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Ingestion Source</span>
                  <strong className="text-foreground">{inspectPunch.record.source || "BIOMETRIC_TERMINAL"}</strong>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-foreground block mb-1">
                  Full DynamoDB Record JSON:
                </span>
                <pre className="p-3 rounded-xl bg-black text-emerald-400 font-mono text-[11px] max-h-48 overflow-y-auto">
                  {JSON.stringify(inspectPunch.record, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setInspectPunch(null)}>
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
