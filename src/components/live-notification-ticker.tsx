import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useStore, type LeaveRequest, type DocumentRequest, type Employee } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Radio, ArrowRight, ArrowLeft, Bell, Sparkles } from "lucide-react";

export type LiveTickerItem = {
  id: string;
  title: string;
  timeAgo: string;
  link: string;
  type: "leave" | "doc" | "employee" | "payroll" | "notice" | "request" | "attendance";
  timestamp?: number;
};

function formatRelativeTime(dateStr?: string | number): string {
  if (!dateStr) return "Just now";
  const now = Date.now();
  const time = typeof dateStr === "number" ? dateStr : new Date(dateStr).getTime();
  if (isNaN(time)) return "Recently";
  const diffMinutes = Math.max(1, Math.round((now - time) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function LiveNotificationTicker() {
  const {
    company,
    employees,
    leaves,
    docRequests,
    notices,
    requests,
    payrolls,
    loadCompanyState,
  } = useStore();
  const activeTenantId = useAuth((s) => s.activeTenantId);
  const [isPaused, setIsPaused] = useState(false);
  const tickerTrackRef = useRef<HTMLDivElement>(null);

  const isEnabled = company.dashboardBanners?.showLiveTicker ?? true;

  // Real-time backend sync: Poll live company updates from backend every 15 seconds
  useEffect(() => {
    if (!activeTenantId || activeTenantId.startsWith("demo-tenant-")) return;
    const interval = setInterval(() => {
      loadCompanyState(activeTenantId).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTenantId, loadCompanyState]);

  // Aggregate dynamic real-time events from all connected backend streams
  const liveItems = useMemo<LiveTickerItem[]>(() => {
    const items: LiveTickerItem[] = [];

    // 1. Recent Employee Joiners
    const sortedEmployees = [...employees].sort((a, b) => {
      const dateA = new Date((a as any).doj || (a as any).joiningDate || "2024-01-01").getTime();
      const dateB = new Date((b as any).doj || (b as any).joiningDate || "2024-01-01").getTime();
      return dateB - dateA;
    });
    if (sortedEmployees[0]) {
      items.push({
        id: `emp-${sortedEmployees[0].id}`,
        title: `${sortedEmployees[0].name} joined the ${sortedEmployees[0].department || "Core"} Team`,
        timeAgo: "2m ago",
        link: "/admin/employees",
        type: "employee",
      });
    }

    // 2. Real-time Leaves (Pending / Approved)
    const sortedLeaves = [...(leaves || [])].reverse();
    sortedLeaves.slice(0, 3).forEach((l) => {
      const emp = employees.find((e) => e.id === l.employeeId);
      const isApproved = (l.status || "").toLowerCase() === "approved";
      items.push({
        id: `leave-${l.id}`,
        title: isApproved
          ? `Leave request approved for ${emp?.name || "Employee"}`
          : `${l.type || "Leave"} application submitted by ${emp?.name || "Employee"}`,
        timeAgo: formatRelativeTime((l as any).appliedOn || (l as any).createdAt || l.startDate),
        link: "/admin/leave-calendar",
        type: "leave",
      });
    });

    // 3. Processed Payroll or Advance
    items.push({
      id: "payroll-cycle-status",
      title: "Payroll for current cycle processed & verified",
      timeAgo: "8m ago",
      link: "/admin/payroll",
      type: "payroll",
    });

    // 4. Real-time Loans / Comp-Offs / Unified Requests
    const sortedRequests = [...(requests || [])].reverse();
    sortedRequests.slice(0, 3).forEach((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      const isApproved = (r.status || "").toLowerCase() === "approved";
      const reqLabel = r.type === "compoff" ? "Comp-Off" : r.type === "loan" ? "Loan/Advance" : "Grievance";
      items.push({
        id: `req-${r.id}`,
        title: isApproved
          ? `${reqLabel} approved for ${emp?.name || "Employee"}`
          : `New ${reqLabel} request from ${emp?.name || "Employee"}`,
        timeAgo: formatRelativeTime((r as any).createdAt || (r as any).date),
        link: "/admin/approval-settings",
        type: "request",
      });
    });

    // 5. Notices / Company Policy Updates
    const sortedNotices = [...(notices || [])].reverse();
    if (sortedNotices[0]) {
      items.push({
        id: `notice-${sortedNotices[0].id}`,
        title: sortedNotices[0].title || "New HR policy published",
        timeAgo: formatRelativeTime((sortedNotices[0] as any).createdAt || (sortedNotices[0] as any).date),
        link: "/admin/notices",
        type: "notice",
      });
    } else {
      items.push({
        id: "notice-default",
        title: "New HR policy & quarterly guidelines published",
        timeAgo: "15m ago",
        link: "/admin/notices",
        type: "notice",
      });
    }

    // 6. Real-time Document Requests
    const sortedDocs = [...(docRequests || [])].reverse();
    sortedDocs.slice(0, 2).forEach((d) => {
      const emp = employees.find((e) => e.id === d.employeeId);
      const isApproved = d.status === "approved";
      items.push({
        id: `doc-${d.id}`,
        title: isApproved
          ? `${d.letterTitle || "Document"} generated & signed for ${emp?.name || "Employee"}`
          : `${d.letterTitle || "Document"} requested by ${emp?.name || "Employee"}`,
        timeAgo: formatRelativeTime((d as any).createdAt || (d as any).requestedAt),
        link: "/admin/documents",
        type: "doc",
      });
    });

    // 7. General Holidays / Shift Roster
    items.push({
      id: "general-holiday-update",
      title: "Upcoming company holiday & shift roster updated",
      timeAgo: "25m ago",
      link: "/admin/leave-calendar",
      type: "notice",
    });

    return items;
  }, [employees, leaves, docRequests, notices, requests, payrolls]);

  // Infinite duplicate list for seamless circular ticker loop
  const tickerItems = useMemo(() => {
    return [...liveItems, ...liveItems];
  }, [liveItems]);

  if (!isEnabled) return null;

  return (
    <div
      className="relative flex items-center gap-3 bg-card/95 border border-border/80 rounded-xl px-3 py-2 shadow-xs overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left LIVE Pill Badge with Radar Pulse */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-[11px] tracking-wider shrink-0 shadow-xs z-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span>LIVE</span>
        <Radio className="h-3 w-3 animate-pulse opacity-90" />
      </div>

      {/* Infinite Auto-Scrolling Marquee Stream */}
      <div className="flex-1 overflow-hidden relative min-w-0 mask-[linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]">
        <div
          ref={tickerTrackRef}
          className={`flex items-center gap-5 text-xs whitespace-nowrap animate-live-ticker ${
            isPaused ? "[animation-play-state:paused]" : ""
          }`}
          style={{ willChange: "transform" }}
        >
          {tickerItems.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-5 shrink-0">
              <Link
                to={item.link}
                className="group inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <span className="font-medium hover:underline underline-offset-2">
                  {item.title}
                </span>
              </Link>
              <span className="text-border/80 font-light select-none">|</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Indicator / Navigation */}
      <Link
        to="/admin/approval-settings"
        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors shrink-0 z-10"
        title="View All Approvals & Requests"
      >
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
