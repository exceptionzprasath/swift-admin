import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useStore, CompanyHoliday, HolidayType } from "@/lib/store";
import {
  CalendarDays, ChevronLeft, ChevronRight, Download, Upload, Plus,
  Search, Building2, CheckCircle2,
  Calendar as CalendarIcon, ListFilter, LayoutGrid, Eye,
  FileSpreadsheet, PartyPopper, ShieldCheck, Flag, Star, Tag,
  Edit2, Trash2
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
  } = useStore();

  // ==========================================
  // OFFICE HOLIDAY CALENDAR STATE
  // ==========================================
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToday = () => setCurrentDate(new Date());

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
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
      if (typeFilter !== "all" && h.type !== typeFilter) return false;
      if (branchFilter !== "all") {
        const hBranches = h.branchIds || ["all"];
        if (!hBranches.includes("all") && !hBranches.includes(branchFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = h.name.toLowerCase().includes(q);
        const matchesDesc = (h.description || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [holidays, typeFilter, branchFilter, searchQuery]);

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

        {/* Action Buttons: Template, Bulk Upload, Add Holiday */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadHolidayCSVTemplate()}
            className="text-xs h-9 gap-1.5"
          >
            <Download className="h-4 w-4" /> Download CSV Template
          </Button>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild className="text-xs h-9 gap-1.5 cursor-pointer">
              <span>
                <Upload className="h-4 w-4" /> Bulk Upload CSV
              </span>
            </Button>
          </label>

          <Button onClick={handleOpenAdd} className="bg-gradient-brand text-white shadow-soft text-xs h-9 gap-1.5">
            <Plus className="h-4 w-4" /> Add Office Holiday
          </Button>
        </div>
      </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Holidays</p>
                  <h3 className="text-2xl font-black tracking-tight mt-1">{stats.totalCount} Days</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Official company off-days</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mandatory / Public</p>
                  <h3 className="text-2xl font-black text-emerald-600 tracking-tight mt-1">{stats.mandatoryCount}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Compulsory paid holidays</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optional / Floating</p>
                  <h3 className="text-2xl font-black text-sky-600 tracking-tight mt-1">{stats.optionalCount}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Restricted holidays</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Star className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Upcoming</p>
                  <h3 className="text-base font-bold text-foreground tracking-tight mt-1 truncate">
                    {stats.upcoming ? stats.upcoming.name : "None scheduled"}
                  </h3>
                  <p className="text-xs text-purple-600 font-semibold mt-0.5">
                    {stats.upcoming
                      ? `${stats.daysRemaining === 0 ? "Today" : `${stats.daysRemaining} days left`} (${new Date(stats.upcoming.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
                      : "All holidays completed"}
                  </p>
                </div>
                <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <PartyPopper className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control & Filter Bar */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Month Navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-bold min-w-[170px] text-center">
                    {monthName} {year}
                  </h2>
                  <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={jumpToday} className="text-xs font-medium ml-1">
                    Today
                  </Button>
                </div>

                {/* Filter Dropdowns & View Toggle */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative min-w-[180px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search holiday name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 text-xs min-w-[150px]">
                      <Tag className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Holiday Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Holiday Types</SelectItem>
                      {Object.entries(HOLIDAY_TYPE_CONFIG).map(([typeKey, cfg]) => (
                        <SelectItem key={typeKey} value={typeKey}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="h-9 text-xs min-w-[140px]">
                      <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30">
                    <Button
                      variant={viewMode === "calendar" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("calendar")}
                      className="h-8 px-2.5 text-xs gap-1"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Calendar
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="h-8 px-2.5 text-xs gap-1"
                    >
                      <ListFilter className="h-3.5 w-3.5" />
                      Holiday List
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Calendar Grid */}
          {viewMode === "calendar" && (
            <Card className="border-border shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-bold text-muted-foreground py-2.5">
                <div className="text-rose-500">SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div className="text-indigo-500">SAT</div>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
                {calendarDays.map((cd, index) => {
                  const dayHolidays = holidaysByDate.get(cd.dateStr) || [];
                  const isWeekend = index % 7 === 0 || index % 7 === 6;

                  return (
                    <div
                      key={cd.dateStr}
                      className={`min-h-[105px] p-2 transition-colors flex flex-col justify-between ${
                        !cd.isCurrentMonth
                          ? "bg-muted/15 text-muted-foreground/40"
                          : isWeekend
                          ? "bg-muted/5"
                          : "bg-card"
                      } ${cd.isToday ? "ring-2 ring-inset ring-purple-500/80 bg-purple-500/5" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold ${
                            cd.isToday
                              ? "h-6 w-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs"
                              : !cd.isCurrentMonth
                              ? "text-muted-foreground/40"
                              : isWeekend
                              ? "text-rose-500 font-semibold"
                              : "text-foreground"
                          }`}
                        >
                          {cd.dayNumber}
                        </span>

                        {cd.isToday && (
                          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Today</span>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        {dayHolidays.map((h) => {
                          const cfg = getHolidayConfig(h.type);
                          return (
                            <div
                              key={h.id}
                              onClick={() => setSelectedHoliday(h)}
                              className={`cursor-pointer px-2 py-1.5 rounded-lg border text-[11px] font-bold truncate flex items-center justify-between gap-1 shadow-2xs transition-transform hover:scale-[1.02] ${cfg.color}`}
                            >
                              <div className="flex items-center gap-1.5 truncate min-w-0">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                                <span className="truncate">{h.name}</span>
                              </div>
                              {h.isMandatory === false && (
                                <span className="text-[9px] px-1 bg-sky-500/20 text-sky-800 rounded font-normal">
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

          {/* List View */}
          {viewMode === "list" && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Annual Company Holidays ({filteredHolidays.length})</CardTitle>
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
    </div>
  );
}
