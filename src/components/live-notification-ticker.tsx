import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useStore, type LeaveRequest, type DocRequest, type Employee } from "@/lib/store";
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

function formatRelativeTime(dateStr?: string | number, fallbackTimeStr?: string): string {
  if (!dateStr) return "Just now";
  let ts = typeof dateStr === "number" ? dateStr : 0;
  if (!ts) {
    const trimmed = String(dateStr).trim();
    if (trimmed.includes("T")) {
      const d = new Date(trimmed);
      ts = !isNaN(d.getTime()) ? d.getTime() : 0;
    } else {
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
        ts = d.getTime();
      } else {
        const d = new Date(trimmed);
        ts = !isNaN(d.getTime()) ? d.getTime() : Date.now();
      }
    }
  }

  const d = new Date(ts);
  const now = new Date();
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfItem = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffCalendarDays = Math.round((startOfNow - startOfItem) / (1000 * 60 * 60 * 24));

  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffCalendarDays === 0) {
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  }
  if (diffCalendarDays === 1) return "Yesterday";
  if (diffCalendarDays < 7) return `${diffCalendarDays}d ago`;
  if (diffCalendarDays < 30) return `${Math.floor(diffCalendarDays / 7)}w ago`;
  return `${Math.floor(diffCalendarDays / 30)}mo ago`;
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

    // 1. Recent Employee Joiners (if joined within the last 30 days)
    const sortedEmployees = [...employees].sort((a, b) => {
      const dateA = new Date((a as any).doj || (a as any).joiningDate || "2024-01-01").getTime();
      const dateB = new Date((b as any).doj || (b as any).joiningDate || "2024-01-01").getTime();
      return dateB - dateA;
    });
    if (sortedEmployees[0] && ((sortedEmployees[0] as any).doj || (sortedEmployees[0] as any).joiningDate)) {
      const joinDate = (sortedEmployees[0] as any).doj || (sortedEmployees[0] as any).joiningDate;
      items.push({
        id: `emp-${sortedEmployees[0].id}`,
        title: `${sortedEmployees[0].name} joined the ${sortedEmployees[0].department || "Core"} Team`,
        timeAgo: formatRelativeTime(joinDate),
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

    // 3. Real-time Loans / Comp-Offs / Unified Requests
    const sortedRequests = [...(requests || [])].reverse();
    sortedRequests.slice(0, 3).forEach((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      const isApproved = (r.status || "").toLowerCase() === "approved";
      const reqLabel = r.type === "compoff" ? "Comp-Off" : r.type === "loan" ? "Loan/Advance" : (r.type || "Request");
      items.push({
        id: `req-${r.id}`,
        title: isApproved
          ? `${reqLabel} approved for ${emp?.name || "Employee"}`
          : `New ${reqLabel} request from ${emp?.name || "Employee"}`,
        timeAgo: formatRelativeTime((r as any).createdAt || (r as any).date),
        link: "/admin/requests",
        type: "request",
      });
    });

    // 4. Notices / Company Policy Updates
    const sortedNotices = [...(notices || [])].reverse();
    sortedNotices.slice(0, 3).forEach((n) => {
      items.push({
        id: `notice-${n.id}`,
        title: n.title || "Company Announcement",
        timeAgo: formatRelativeTime((n as any).createdAt || (n as any).date),
        link: "/admin/notices",
        type: "notice",
      });
    });

    // 5. Real-time Document Requests
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

    return items;
  }, [employees, leaves, docRequests, notices, requests]);

  // Infinite duplicate list for seamless circular ticker loop
  const tickerItems = useMemo(() => {
    if (liveItems.length === 0) return [];
    return [...liveItems, ...liveItems];
  }, [liveItems]);

  if (!isEnabled || liveItems.length === 0) return null;

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
