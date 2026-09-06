import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore, type Employee } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bell,
  BellRing,
  Sparkles,
  X,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  Banknote,
  MessageSquareHeart,
  CalendarCheck,
  Megaphone,
  UserCheck,
  AlertTriangle,
  Layers,
  Inbox,
  Check,
  RotateCcw,
  Coffee,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export type LiveNotificationItem = {
  id: string;
  category: "request" | "attendance" | "notice" | "payroll" | "compliance";
  title: string;
  description: string;
  exactDateTime: string;
  exactDate: string;
  exactTime: string;
  relativeTime: string;
  timestamp: number;
  link: string;
  priority: "low" | "medium" | "high" | "critical";
  isActionRequired?: boolean;
  avatarUrl?: string;
  employeeName?: string;
};

// Robustly parses various date formats (ISO, YYYY-MM-DD, timestamp) to avoid UTC timezone offset shifts
function parseNotificationTimestamp(rawDate?: string | number, fallbackTimeStr?: string): number {
  if (!rawDate) return Date.now();
  if (typeof rawDate === "number") return rawDate;

  const trimmed = String(rawDate).trim();
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Pattern YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);

    let hours = 10;
    let minutes = 0;
    if (fallbackTimeStr && fallbackTimeStr.includes(":")) {
      const parts = fallbackTimeStr.split(":");
      hours = parseInt(parts[0], 10) || 10;
      minutes = parseInt(parts[1], 10) || 0;
    }
    const d = new Date(year, month, day, hours, minutes, 0, 0);
    return d.getTime();
  }

  const d = new Date(trimmed);
  return !isNaN(d.getTime()) ? d.getTime() : Date.now();
}

// Formats both the exact human-readable date & time and contextual smart label
function formatNotificationDateTime(timestamp: number | string | undefined, fallbackTimeStr?: string): {
  exactDate: string;
  exactTime: string;
  exactDateTime: string;
  relativeTime: string;
} {
  const ts = typeof timestamp === "number" ? timestamp : parseNotificationTimestamp(timestamp, fallbackTimeStr);
  const d = new Date(ts);
  if (isNaN(d.getTime())) {
    return {
      exactDate: "—",
      exactTime: "—",
      exactDateTime: "Recently",
      relativeTime: "Recently",
    };
  }

  const now = new Date();

  // Exact Time string: e.g. "10:25 AM"
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Exact Date string: e.g. "05 Sep 2026"
  const dateStr = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Normalized calendar start of days for exact day calculation
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfItem = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffCalendarDays = Math.round((startOfNow - startOfItem) / (1000 * 60 * 60 * 24));

  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  let relativeTime = "Just now";
  let exactDateTime = `${dateStr} at ${timeStr}`;

  if (diffCalendarDays === 0) {
    // Happened TODAY
    exactDateTime = `Today at ${timeStr}`;
    if (diffMins < 1) {
      relativeTime = "Just now";
    } else if (diffMins < 60) {
      relativeTime = `${diffMins}m ago`;
    } else {
      relativeTime = `${diffHours}h ago`;
    }
  } else if (diffCalendarDays === 1) {
    // Happened YESTERDAY
    exactDateTime = `Yesterday at ${timeStr}`;
    relativeTime = "Yesterday";
  } else if (diffCalendarDays > 1 && diffCalendarDays < 7) {
    exactDateTime = `${dateStr} at ${timeStr}`;
    relativeTime = `${diffCalendarDays}d ago`;
  } else if (diffCalendarDays >= 7 && diffCalendarDays < 30) {
    const weeks = Math.floor(diffCalendarDays / 7);
    exactDateTime = `${dateStr} at ${timeStr}`;
    relativeTime = `${weeks}w ago`;
  } else {
    exactDateTime = `${dateStr} at ${timeStr}`;
    const months = Math.floor(diffCalendarDays / 30);
    relativeTime = `${months}mo ago`;
  }

  return {
    exactDate: dateStr,
    exactTime: timeStr,
    exactDateTime,
    relativeTime,
  };
}

export function LiveNotificationBell() {
  const {
    requests = [],
    leaves = [],
    docRequests = [],
    grievances = [],
    attendance = [],
    notices = [],
    employees = [],
    company,
    loadCompanyState,
  } = useStore();

  const { activeTenantId } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "attendance" | "notices">("all");

  // Read notifications stored in local storage
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(`swift_read_notifications_${activeTenantId || "default"}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync read state
  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem(
          `swift_read_notifications_${activeTenantId || "default"}`,
          JSON.stringify(updated)
        );
      } catch {}
      return updated;
    });
  };

  const markAllAsRead = () => {
    const allIds = liveNotifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(
        `swift_read_notifications_${activeTenantId || "default"}`,
        JSON.stringify(allIds)
      );
    } catch {}
    toast.success("All notifications marked as read");
  };

  // Compile real-time notifications from active state with exact date & timestamps
  const liveNotifications = useMemo<LiveNotificationItem[]>(() => {
    const items: LiveNotificationItem[] = [];
    const empMap = new Map<string, Employee>();
    for (const emp of employees) {
      if (emp.id) empMap.set(emp.id, emp);
      if (emp.empCode) empMap.set(emp.empCode, emp);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Unified Engine Requests (Advance Loans, Comp-offs, etc.)
    (requests || []).forEach((r) => {
      const emp = empMap.get(r.employeeId) || empMap.get(r.empCode || "");
      const isPending = (r.status || "Pending").toLowerCase() === "pending";
      const ts = parseNotificationTimestamp(r.createdAt || r.date, "10:00");
      const dt = formatNotificationDateTime(ts);

      items.push({
        id: `req-${r.id}`,
        category: "request",
        title: isPending
          ? `New ${r.type || "Request"} Application`
          : `${r.type || "Request"} Status: ${r.status}`,
        description: `${r.employeeName || emp?.name || "Employee"} submitted ${r.title || r.type} (${r.amountOrDays || ""})`,
        exactDateTime: dt.exactDateTime,
        exactDate: dt.exactDate,
        exactTime: dt.exactTime,
        relativeTime: dt.relativeTime,
        timestamp: ts,
        link: "/admin/requests",
        priority: isPending ? "high" : "medium",
        isActionRequired: isPending,
        avatarUrl: emp?.photoDataUrl,
        employeeName: r.employeeName || emp?.name,
      });
    });

    // 2. Real-time Leave Requests
    (leaves || []).forEach((l) => {
      const emp = empMap.get(l.employeeId);
      const isPending = (l.status || "pending").toLowerCase() === "pending";
      const ts = parseNotificationTimestamp(l.appliedAt || (l as any).createdAt || l.startDate, "09:30");
      const dt = formatNotificationDateTime(ts);

      items.push({
        id: `leave-${l.id}`,
        category: "request",
        title: isPending
          ? `Leave Approval Required`
          : `Leave ${l.status === "approved" ? "Approved" : "Rejected"}`,
        description: `${emp?.name || "Employee"} requested ${l.days ? `${l.days} day(s)` : ""} ${l.type || "Leave"} (${l.from || l.startDate || ""})`,
        exactDateTime: dt.exactDateTime,
        exactDate: dt.exactDate,
        exactTime: dt.exactTime,
        relativeTime: dt.relativeTime,
        timestamp: ts,
        link: "/admin/requests",
        priority: isPending ? "high" : "medium",
        isActionRequired: isPending,
        avatarUrl: emp?.photoDataUrl,
        employeeName: emp?.name,
      });
    });

    // 3. Document Certificate Requests
    (docRequests || []).forEach((d) => {
      const emp = empMap.get(d.employeeId);
      const isPending = (d.status || "pending").toLowerCase() === "pending";
      const ts = parseNotificationTimestamp(d.requestedAt || (d as any).createdAt, "11:00");
      const dt = formatNotificationDateTime(ts);

      items.push({
        id: `doc-${d.id}`,
        category: "request",
        title: isPending ? `Document Certificate Request` : `Document ${d.status}`,
        description: `${emp?.name || d.requestedBy || "Employee"} requested ${d.letterTitle || "Official Certificate Letter"}`,
        exactDateTime: dt.exactDateTime,
        exactDate: dt.exactDate,
        exactTime: dt.exactTime,
        relativeTime: dt.relativeTime,
        timestamp: ts,
        link: "/admin/requests",
        priority: isPending ? "high" : "low",
        isActionRequired: isPending,
        avatarUrl: emp?.photoDataUrl,
        employeeName: emp?.name || d.requestedBy,
      });
    });

    // 4. Grievance Tickets
    (grievances || []).forEach((g) => {
      const emp = empMap.get(g.employeeId) || empMap.get(g.empCode || "");
      const isOpen = (g.status || "Open").toLowerCase() === "open";
      const ts = parseNotificationTimestamp(g.createdAt, "14:00");
      const dt = formatNotificationDateTime(ts);

      items.push({
        id: `grv-${g.id}`,
        category: "request",
        title: isOpen ? `Grievance Ticket Raised` : `Grievance ${g.status}`,
        description: `${g.ticketNumber}: ${g.subject || g.category} from ${g.employeeName || emp?.name || "Employee"}`,
        exactDateTime: dt.exactDateTime,
        exactDate: dt.exactDate,
        exactTime: dt.exactTime,
        relativeTime: dt.relativeTime,
        timestamp: ts,
        link: "/admin/requests",
        priority: g.priority === "Critical" || g.priority === "High" ? "critical" : "medium",
        isActionRequired: isOpen,
        avatarUrl: emp?.photoDataUrl,
        employeeName: g.employeeName || emp?.name,
      });
    });

    // 5. Today's Attendance & Punctuality Live Alerts
    const todayRecords = (attendance || []).filter((a) => a.date === todayStr);
    todayRecords.forEach((a) => {
      const emp = empMap.get(a.employeeId) || empMap.get(a.empCode || "");
      const empName = a.employeeName || emp?.name || "Employee";

      // Late In check
      if (a.punctuality === "late" || a.status === "late" || (a.lateBy && a.lateBy > 0)) {
        const punchTs = parseNotificationTimestamp(a.date, a.checkIn || a.clockIn || "10:00");
        const dt = formatNotificationDateTime(punchTs);

        items.push({
          id: `att-late-${a.id || a.employeeId}-${a.date}`,
          category: "attendance",
          title: `Late Arrival Logged`,
          description: `${empName} clocked in at ${a.checkIn || a.clockIn || "late"} (${a.lateBy ? `Late by ${a.lateBy}m` : "Past Grace"})`,
          exactDateTime: dt.exactDateTime,
          exactDate: dt.exactDate,
          exactTime: dt.exactTime,
          relativeTime: dt.relativeTime,
          timestamp: punchTs,
          link: "/admin/attendance",
          priority: "medium",
          isActionRequired: false,
          avatarUrl: emp?.photoDataUrl,
          employeeName: empName,
        });
      }

      // Missed Check-out / Auto-Closed
      if (a.isMissedCheckout || a.isAutoClosed) {
        const closedTs = (a as any).autoClosedAt
          ? parseNotificationTimestamp((a as any).autoClosedAt)
          : parseNotificationTimestamp(a.date, "22:00");
        const dt = formatNotificationDateTime(closedTs);

        items.push({
          id: `att-missed-${a.id || a.employeeId}-${a.date}`,
          category: "attendance",
          title: `Missed Check-Out Recorded`,
          description: `${empName} missed check-out punch. Auto-marked as ${a.status === "absent" ? "Absent" : "Half-Day"}.`,
          exactDateTime: dt.exactDateTime,
          exactDate: dt.exactDate,
          exactTime: dt.exactTime,
          relativeTime: dt.relativeTime,
          timestamp: closedTs,
          link: "/admin/attendance",
          priority: "high",
          isActionRequired: true,
          avatarUrl: emp?.photoDataUrl,
          employeeName: empName,
        });
      }
    });

    // 6. Company Broadcast Notices
    (notices || []).forEach((n) => {
      const ts = parseNotificationTimestamp(n.createdAt || (n as any).date, "09:00");
      const dt = formatNotificationDateTime(ts);

      items.push({
        id: `notice-${n.id}`,
        category: "notice",
        title: `Company Announcement: ${n.title}`,
        description: n.body ? n.body.slice(0, 80) + "..." : "New notice published on the board.",
        exactDateTime: dt.exactDateTime,
        exactDate: dt.exactDate,
        exactTime: dt.exactTime,
        relativeTime: dt.relativeTime,
        timestamp: ts,
        link: "/admin/notices",
        priority: n.priority === "urgent" ? "critical" : n.priority === "important" ? "high" : "low",
        isActionRequired: false,
      });
    });

    // Sort chronologically (latest timestamp first)
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [requests, leaves, docRequests, grievances, attendance, notices, employees]);

  // Filtered by Active Tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return liveNotifications;
    if (activeTab === "requests") return liveNotifications.filter((n) => n.category === "request");
    if (activeTab === "attendance") return liveNotifications.filter((n) => n.category === "attendance");
    if (activeTab === "notices") return liveNotifications.filter((n) => n.category === "notice");
    return liveNotifications;
  }, [liveNotifications, activeTab]);

  // Unread Count
  const unreadCount = useMemo(() => {
    return liveNotifications.filter((n) => !readIds.includes(n.id)).length;
  }, [liveNotifications, readIds]);

  const hasCritical = useMemo(() => {
    return liveNotifications.some((n) => !readIds.includes(n.id) && (n.priority === "critical" || n.priority === "high"));
  }, [liveNotifications, readIds]);

  const getCategoryIcon = (category: LiveNotificationItem["category"]) => {
    switch (category) {
      case "request":
        return <Inbox className="h-4 w-4 text-primary" />;
      case "attendance":
        return <CalendarCheck className="h-4 w-4 text-emerald-500" />;
      case "notice":
        return <Megaphone className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative group h-9 w-9 rounded-full"
          title="Live Notifications & Alerts"
        >
          <BellRing
            className={`h-5 w-5 transition-colors ${
              hasCritical
                ? "text-destructive"
                : unreadCount > 0
                ? "text-primary"
                : "text-muted-foreground group-hover:text-primary"
            } ${unreadCount > 0 ? "animate-swift-ring" : ""}`}
          />

          {unreadCount > 0 && (
            <>
              <span
                className={`absolute inset-0 rounded-full ${
                  hasCritical ? "bg-destructive/20" : "bg-primary/20"
                } animate-swift-ping`}
              />
              <span
                className={`absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background ${
                  hasCritical
                    ? "bg-destructive animate-pulse"
                    : "bg-gradient-brand shadow-xs"
                }`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[400px] sm:w-[440px] p-0 max-h-[85vh] overflow-hidden flex flex-col rounded-2xl shadow-xl border border-border bg-card/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-foreground">Live Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-bold">
                    {unreadCount} New
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Real-time company events & activity stream</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                onClick={markAllAsRead}
              >
                <Check className="h-3 w-3" />
                <span>Mark all read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-border bg-card/60 text-xs overflow-x-auto">
          <Button
            size="sm"
            variant={activeTab === "all" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("all")}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            All ({liveNotifications.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "requests" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("requests")}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Requests ({liveNotifications.filter((n) => n.category === "request").length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "attendance" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("attendance")}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Attendance ({liveNotifications.filter((n) => n.category === "attendance").length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "notices" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("notices")}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Notices ({liveNotifications.filter((n) => n.category === "notice").length})
          </Button>
        </div>

        {/* Notifications Scrollable List */}
        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="font-medium text-foreground">All caught up!</p>
              <p>No new alerts in this stream right now.</p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isRead = readIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 transition-colors hover:bg-muted/40 flex items-start gap-3 group relative cursor-pointer ${
                    !isRead ? "bg-primary/[0.03]" : ""
                  }`}
                  onClick={() => {
                    markAsRead(item.id);
                    setOpen(false);
                    navigate({ to: item.link });
                  }}
                >
                  {/* Category / Avatar Indicator */}
                  <div className="relative shrink-0 mt-0.5">
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border">
                        {getCategoryIcon(item.category)}
                      </div>
                    )}
                    {!isRead && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs ${!isRead ? "text-foreground font-bold" : "text-foreground font-medium"}`}>
                          {item.title}
                        </span>
                        {item.isActionRequired && !isRead && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold">
                            Action
                          </Badge>
                        )}
                      </div>

                      {/* Exact Date & Time Pill */}
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/90 bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                          <Clock className="h-3 w-3 text-primary/70 shrink-0" />
                          <span>{item.exactDateTime}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium mt-0.5 pr-0.5">
                          {item.relativeTime}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-primary font-medium flex items-center gap-1 group-hover:underline">
                        <span>View details</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>

                      {!isRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(item.id);
                          }}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Quick Links */}
        <div className="p-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
          <Link
            to="/admin/requests"
            onClick={() => setOpen(false)}
            className="text-primary hover:underline font-medium text-[11px] flex items-center gap-1"
          >
            <Inbox className="h-3 w-3" />
            <span>Open Requests Hub</span>
          </Link>
          <Link
            to="/admin/attendance"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground font-medium text-[11px]"
          >
            Live Attendance
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
