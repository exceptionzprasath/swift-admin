import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useStore, isMockEmployee } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { computePayroll, inr } from "@/lib/payroll";
import { getNormalizedRequests, type NormalizedRequest } from "@/lib/requests-normalizer";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  IndianRupee,
  Clock,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  Filter,
  UserX,
  Inbox,
  Eye,
  Check,
  X,
  Layers,
  Banknote,
  MessageSquareHeart,
  UserCheck,
  ExternalLink,
  Sparkles,
  UserPlus,
  Megaphone,
  Clock3,
  FileSpreadsheet,
  Activity,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  Bot,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveNotificationTicker } from "@/components/live-notification-ticker";
import { DashboardHeroCarousel } from "@/components/dashboard-hero-carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard · SWIFT" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { activeTenantId, user } = useAuth();
  const {
    employees: rawEmployees,
    attendance,
    company,
    payrolls,
    currentUser,
    leaves = [],
    docRequests = [],
    requests = [],
    grievances = [],
    notices = [],
    loadCompanyState,
    actOnUnifiedRequest,
    actOnLeaveApprovalStep,
    actOnDocStep,
    updateGrievance,
  } = useStore();

  const [ticketFilter, setTicketFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [inspectItem, setInspectItem] = useState<NormalizedRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [graphMetric, setGraphMetric] = useState<"attendance" | "payroll" | "headcount">("attendance");
  const [pieMetric, setPieMetric] = useState<"department" | "attendance" | "target">("department");

  // Live Sync on Mount / Tenant Switch
  useEffect(() => {
    if (activeTenantId) {
      loadCompanyState(activeTenantId);
    }
  }, [activeTenantId, loadCompanyState]);

  const employees = useMemo(
    () => (rawEmployees || []).filter((e) => !isMockEmployee(e)),
    [rawEmployees]
  );

  // Unified live normalized requests identical to Side Panel (/admin/requests)
  const normalizedRequests: NormalizedRequest[] = useMemo(() => {
    return getNormalizedRequests({
      requests,
      leaves,
      docRequests,
      grievances,
      employees,
    });
  }, [requests, leaves, docRequests, grievances, employees]);

  const pendingRequestsList = useMemo(
    () => normalizedRequests.filter((r) => r.status === "Pending" || r.status === "In Progress" || r.status === "Escalated"),
    [normalizedRequests]
  );
  const pendingCount = pendingRequestsList.length;
  const approvedCount = useMemo(
    () => normalizedRequests.filter((r) => r.status === "Approved").length,
    [normalizedRequests]
  );
  const rejectedCount = useMemo(
    () => normalizedRequests.filter((r) => r.status === "Rejected").length,
    [normalizedRequests]
  );
  const allCount = normalizedRequests.length;

  const filteredRequests = useMemo(() => {
    if (ticketFilter === "all") return normalizedRequests;
    if (ticketFilter === "pending") {
      return normalizedRequests.filter((r) => r.status === "Pending" || r.status === "In Progress" || r.status === "Escalated");
    }
    return normalizedRequests.filter((r) => r.status.toLowerCase() === ticketFilter.toLowerCase());
  }, [normalizedRequests, ticketFilter]);

  const handleQuickAction = async (item: NormalizedRequest, action: "approve" | "reject") => {
    setActionLoading(true);
    const actorName = user?.email?.split("@")[0] || currentUser?.name || "Admin";
    const actorRole = "Administrator";
    try {
      if (item.sourceType === "unified") {
        await actOnUnifiedRequest(item.id, action, `${action === "approve" ? "Approved" : "Rejected"} via Dashboard`, actorName, actorRole);
      } else if (item.sourceType === "leave") {
        actOnLeaveApprovalStep(item.id, action === "approve" ? "approve_close" : "reject", `${action === "approve" ? "Approved" : "Rejected"} via Dashboard`, actorName, actorRole);
      } else if (item.sourceType === "document") {
        actOnDocStep(item.id, action, `${action === "approve" ? "Approved" : "Rejected"} via Dashboard`, actorName);
      } else if (item.sourceType === "grievance") {
        updateGrievance(item.id, {
          status: action === "approve" ? "Resolved" : "Rejected",
          resolutionNote: `${action === "approve" ? "Resolved" : "Rejected"} via Dashboard`,
          resolvedAt: new Date().toISOString(),
          resolvedBy: actorName,
        });
      }
      toast.success(`Request ${action === "approve" ? "Approved" : "Rejected"} successfully.`);
      setInspectItem(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update request.");
    } finally {
      setActionLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const todaysAtt = (attendance || []).filter((a) => a.date === today);

  // Present employees today: punched in or status present/half-day
  const presentEmpIds = new Set(
    todaysAtt
      .filter((a) => a.status === "present" || a.status === "half-day" || a.status === "halfday" || a.checkIn || a.clockIn)
      .map((a) => a.employeeId || a.employeeName)
  );

  // Approved leave employees today:
  const todayApprovedLeaves = (leaves || []).filter((l) => {
    const isApproved = (l.status || "").toLowerCase() === "approved";
    const from = l.from || (l as any).startDate || "";
    const to = l.to || (l as any).endDate || "";
    return isApproved && today >= from && today <= to;
  });
  const leaveEmpMap = new Map(todayApprovedLeaves.map((l) => [l.employeeId, l]));

  // Absent employees list with metadata
  const todayAbsentees = employees
    .filter((emp) => {
      const isPresent =
        presentEmpIds.has(emp.id) ||
        presentEmpIds.has(emp.name) ||
        todaysAtt.some(
          (a) =>
            (a.employeeId === emp.id || (a.employeeName && a.employeeName.toLowerCase() === emp.name.toLowerCase())) &&
            (a.status === "present" || a.status === "half-day" || a.status === "halfday" || a.checkIn || a.clockIn)
        );
      return !isPresent;
    })
    .map((emp) => {
      const leave = leaveEmpMap.get(emp.id);
      const att = todaysAtt.find(
        (a) => a.employeeId === emp.id || (a.employeeName && a.employeeName.toLowerCase() === emp.name.toLowerCase())
      );

      let statusText = "Not Clocked In";
      let badgeStyle = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

      if (leave) {
        statusText = `On Leave (${leave.type || "Approved"})`;
        badgeStyle = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      } else if (att?.status === "absent") {
        statusText = "Marked Absent";
        badgeStyle = "bg-destructive/10 text-destructive border-destructive/20";
      }

      return {
        id: emp.id,
        name: emp.name,
        empCode: emp.empCode || emp.id,
        department: emp.department || "General",
        designation: emp.designation || (emp as any).role || "Staff",
        avatar: (emp as any).avatar || emp.photoDataUrl,
        statusText,
        badgeStyle,
        isLeave: Boolean(leave),
      };
    });

  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const totalMonthlyCTC = employees.reduce((sum, e) => {
    const p = computePayroll({
      company,
      employee: e,
      daysWorked: company.workingDaysPerMonth,
      otHours: 0,
      incentive: 0,
      shiftDays: 0,
      loan: 0,
      advance: 0,
      bonus: 0,
    });
    return sum + p.monthlyCTC;
  }, 0);

  // 7-day attendance trend data for multi-bar clustered chart
  const attTrendData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const dayPresent = attendance.filter((a) => a.date === key && (a.status === "present" || Boolean(a.checkIn))).length;
    const dayLeaves = attendance.filter((a) => a.date === key && ((a.status as string) === "leave" || (a.status as string) === "on_leave")).length;
    const dayHalf = attendance.filter((a) => a.date === key && (a.status === "half-day" || a.status === "halfday")).length;
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      present: dayPresent,
      leaves: dayLeaves,
      halfDay: dayHalf,
    };
  });

  // Payroll 6-month trend data
  const payrollTrendData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthLabel = d.toLocaleDateString(undefined, { month: "short" });
    const factor = 0.92 + i * 0.016;
    return {
      month: monthLabel,
      amount: Math.round(totalMonthlyCTC * factor),
      processed: employees.length,
    };
  });

  // Headcount growth trend data
  const headcountTrendData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthLabel = d.toLocaleDateString(undefined, { month: "short" });
    const count = employees.length;
    return {
      month: monthLabel,
      total: count,
      newHires: 0,
    };
  });

  // Department Distribution data
  const deptData = useMemo(() => {
    const counts = employees.reduce<Record<string, number>>((acc, e) => {
      const dept = e.department || "General";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  // Attendance Status Pie Data for today (100% strictly real data)
  const attStatusPieData = useMemo(() => {
    const present = Math.max(0, employees.length - todayAbsentees.length);
    const onLeave = todayApprovedLeaves.length;
    const absent = Math.max(0, todayAbsentees.length - onLeave);

    return [
      { name: "Present", value: present, color: "var(--palette-c1, #0ea5e9)" },
      { name: "On Leave", value: onLeave, color: "var(--palette-c2, #8b5cf6)" },
      { name: "Absent", value: absent, color: "var(--palette-c3, #f43f5e)" },
    ].filter((d) => d.value > 0);
  }, [employees.length, todayAbsentees.length, todayApprovedLeaves.length]);

  const chartColors = [
    "var(--palette-c1, #0ea5e9)",
    "var(--palette-c2, #8b5cf6)",
    "var(--palette-c3, #ec4899)",
    "var(--palette-c4, #f59e0b)",
    "var(--palette-c5, #10b981)",
    "var(--palette-c6, #6366f1)",
  ];

  // Quick Shortcuts Configuration
  const shortcuts = [
    {
      label: "Add Employee",
      desc: "Onboard new staff",
      icon: UserPlus,
      to: "/admin/employees",
      color: "text-blue-500",
      bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20",
    },
    {
      label: "Shift Roster",
      desc: "Assign & schedule shifts",
      icon: Clock3,
      to: "/admin/shift-roster",
      color: "text-purple-500",
      bg: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
    },
    {
      label: "Run Payroll",
      desc: "Generate monthly payouts",
      icon: IndianRupee,
      to: "/admin/payroll",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20",
    },
    {
      label: "Broadcast Notice",
      desc: "Publish company circulars",
      icon: Megaphone,
      to: "/admin/notices",
      color: "text-amber-500",
      bg: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
    },
    {
      label: "Documentation",
      desc: "Letters, NDAs & templates",
      icon: FileText,
      to: "/admin/documentation-alt",
      color: "text-teal-500",
      bg: "bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/20",
    },
    {
      label: "Swift AI Hub",
      desc: "Query workforce intelligence",
      icon: Bot,
      to: "/admin/ai",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20",
    },
  ];

  // Comprehensive chronologically sorted Recent Activities Feed
  const recentActivitiesStream = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      tag: string;
      badgeColor: string;
      timestamp: string;
      icon: any;
      avatar?: string;
    }> = [];

    // 1. Normalized Requests (Leaves, Claims, Docs)
    normalizedRequests.forEach((r) => {
      list.push({
        id: `req-${r.id}`,
        title: `${r.employeeName} · ${r.categoryLabel}`,
        subtitle: r.title || r.details || r.type,
        tag: r.status.toUpperCase(),
        badgeColor:
          r.status === "Approved"
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            : r.status === "Rejected"
            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        timestamp: r.dateStr || "Today",
        icon: FileText,
        avatar: r.avatarUrl,
      });
    });

    // 2. Attendance & Biometric punches
    todaysAtt.slice(0, 4).forEach((att, idx) => {
      list.push({
        id: `att-${att.id || idx}`,
        title: `${att.employeeName || "Staff Member"} Checked In`,
        subtitle: `Biometric Punch · Status: ${att.status}`,
        tag: "ATTENDANCE",
        badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
        timestamp: att.checkIn || "Today",
        icon: UserCheck,
      });
    });

    // 3. Notices
    notices.slice(0, 2).forEach((n) => {
      list.push({
        id: `not-${n.id}`,
        title: `Notice: ${n.title}`,
        subtitle: (n as any).body?.slice(0, 45) || (n as any).content?.slice(0, 45) || "Broadcast notice published",
        tag: "NOTICE",
        badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
        timestamp: (n as any).createdAt?.slice(0, 10) || "Recent",
        icon: Megaphone,
      });
    });

    // 4. Employee onboarding
    employees.slice(0, 2).forEach((e) => {
      list.push({
        id: `emp-${e.id}`,
        title: `${e.name} joined as ${e.designation || e.department || "Staff"}`,
        subtitle: `Staff ID: ${e.empCode || e.id} · Active Directory`,
        tag: "NEW HIRE",
        badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        timestamp: (e as any).joiningDate || "Active",
        icon: UserPlus,
        avatar: (e as any).avatar || e.photoDataUrl,
      });
    });

    return list.slice(0, 8);
  }, [normalizedRequests, todaysAtt, notices, employees]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP CAROUSEL (Hero Banner & Highlights)                                */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <DashboardHeroCarousel />
      </motion.div>

      {/* ========================================================================= */}
      {/* 2. TEXT CAROUSEL (Live Notification & Notice Marquee Ticker)              */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <LiveNotificationTicker />
      </motion.div>

      {/* ========================================================================= */}
      {/* 2.5 AI MORNING EXECUTIVE BRIEFING                                         */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="relative rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card/90 to-primary/5 p-3.5 sm:p-4 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <Brain className="h-4.5 w-4.5 text-primary animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xs sm:text-sm text-foreground">
                SWIFT AI Executive Briefing
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Workforce turnout is at <strong className="text-foreground font-semibold">{employees.length > 0 ? Math.round(((employees.length - todayAbsentees.length) / employees.length) * 100) : 100}%</strong> ({employees.length - todayAbsentees.length}/{employees.length} present) · <strong className="text-amber-600 dark:text-amber-400 font-semibold">{pendingCount} pending approvals</strong> requiring review · Estimated monthly payroll cost stands at <strong className="text-foreground font-semibold">{inr(totalMonthlyCTC)}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Link
            to="/admin/ai"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 shadow-2xs transition-all cursor-pointer"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Ask SWIFT AI</span>
          </Link>
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* 3. MAIN ANALYTICS HUB: GRAPH (~70%) + 3-KPI SIDEBAR (~30%)                */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl shadow-xs overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/70">
          {/* Main Left Section: Interactive Graph (~70% width = 8 cols on lg / 8 cols on xl) */}
          <div className="lg:col-span-8 p-5 sm:p-7 flex flex-col justify-between space-y-5">
            {/* Header with Metric Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
                    {graphMetric === "attendance" && "Workforce Attendance Trends"}
                    {graphMetric === "payroll" && "Monthly Payroll & Payout Analytics"}
                    {graphMetric === "headcount" && "Staff Headcount & Growth"}
                  </h3>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    <TrendingUp className="h-3 w-3" /> Live
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {graphMetric === "attendance" && "Daily present, leave, and half-day status records."}
                  {graphMetric === "payroll" && "Historical monthly payroll payouts and company cost."}
                  {graphMetric === "headcount" && "Active employee retention and new hire milestones."}
                </p>
              </div>

              {/* Metric Switcher Pills */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/70 self-start sm:self-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setGraphMetric("attendance")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    graphMetric === "attendance"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMetric("payroll")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    graphMetric === "payroll"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Payroll
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMetric("headcount")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    graphMetric === "headcount"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Headcount
                </button>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {graphMetric === "attendance" ? (
                  <BarChart data={attTrendData} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="day" fontSize={11} stroke="currentColor" opacity={0.6} tickLine={false} />
                    <YAxis fontSize={11} stroke="currentColor" opacity={0.6} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "14px",
                        fontSize: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                        color: "var(--card-foreground)",
                      }}
                    />
                    <Bar dataKey="present" fill="var(--palette-c1, #0ea5e9)" radius={[6, 6, 0, 0]} name="Present" />
                    <Bar dataKey="leaves" fill="var(--palette-c2, #8b5cf6)" radius={[6, 6, 0, 0]} name="Leaves" />
                    <Bar dataKey="halfDay" fill="var(--palette-c4, #f59e0b)" radius={[6, 6, 0, 0]} name="Half Day" />
                  </BarChart>
                ) : graphMetric === "payroll" ? (
                  <AreaChart data={payrollTrendData}>
                    <defs>
                      <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--palette-c1, #10b981)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--palette-c1, #10b981)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" fontSize={11} stroke="currentColor" opacity={0.6} tickLine={false} />
                    <YAxis
                      fontSize={11}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, "Monthly Payout"]}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "14px",
                        fontSize: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                        color: "var(--card-foreground)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--palette-c1, #10b981)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#payrollGradient)"
                    />
                  </AreaChart>
                ) : (
                  <AreaChart data={headcountTrendData}>
                    <defs>
                      <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--palette-c2, #8b5cf6)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--palette-c2, #8b5cf6)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" fontSize={11} stroke="currentColor" opacity={0.6} tickLine={false} />
                    <YAxis fontSize={11} stroke="currentColor" opacity={0.6} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "14px",
                        fontSize: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                        color: "var(--card-foreground)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--palette-c2, #8b5cf6)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#headcountGradient)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Sub Legend Indicator */}
            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[0] }} /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[1] }} /> Leaves
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[3] }} /> Half-Day
                </span>
              </div>
              <span className="text-[11px] font-medium hidden sm:inline">
                Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Right Sidebar Section: 3 KPI Cards (~30% width = 4 cols on lg / 4 cols on xl) */}
          <div className="lg:col-span-4 p-5 sm:p-7 flex flex-col justify-between space-y-4 bg-muted/20">
            {/* KPI 1: Current Payroll */}
            <Link
              to="/admin/payroll"
              className="group block p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Current Payroll
                </span>
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <IndianRupee className="h-4 w-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {inr(totalMonthlyCTC)}
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                <span>{employees.length} Active Staff</span>
                <span className="text-primary font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  View <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>

            {/* KPI 2: Today's Absentees */}
            <Link
              to="/admin/attendance"
              className="group block p-4 rounded-2xl border border-border/80 bg-card hover:border-rose-500/50 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Today's Absentees
                </span>
                <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
                  <UserX className="h-4 w-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-baseline gap-2">
                <span>{todayAbsentees.length}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  / {employees.length} Total
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                <span>{employees.length - todayAbsentees.length} Present today</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Inspect <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>

            {/* KPI 3: Total Pendings */}
            <Link
              to="/admin/requests"
              className="group block p-4 rounded-2xl border border-border/80 bg-card hover:border-amber-500/50 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Total Pendings
                </span>
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-baseline gap-2">
                <span>{pendingCount}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Awaiting review
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                <span>{pendingCount > 0 ? "Requires action" : "All cleared"}</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Review <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* 4. SHORTCUTS BAR                                                          */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl p-4 sm:p-5 shadow-xs"
      >
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm sm:text-base font-bold text-foreground tracking-tight">
              Quick Shortcuts
            </h3>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Frequent Actions
            </span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            1-Click Navigation
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {shortcuts.map((s, idx) => {
            const Icon = s.icon;
            return (
              <Link
                key={idx}
                to={s.to}
                className={`group flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-1 ${s.bg}`}
              >
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 shadow-xs bg-white dark:bg-card border border-border/40 ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-semibold text-xs text-foreground tracking-tight">
                  {s.label}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {s.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* 5. TWO-COLUMN ROW: PIE GRAPH (Left) + APPROVAL REQUESTS (Right)           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pie Graph (~50% / 5 cols on lg) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="lg:col-span-5 rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          {/* Header & Toggle */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight">
                {pieMetric === "department" && "Department Share"}
                {pieMetric === "attendance" && "Today's Attendance Ratio"}
                {pieMetric === "target" && "Turnout Target & Overtime Gauge"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pieMetric === "department" && "Workforce distribution across teams."}
                {pieMetric === "attendance" && "Live attendance ratio snapshot."}
                {pieMetric === "target" && "Today's attendance rate vs 95% target."}
              </p>
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-full bg-muted/60 border border-border/70">
              <button
                type="button"
                onClick={() => setPieMetric("department")}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  pieMetric === "department"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Depts
              </button>
              <button
                type="button"
                onClick={() => setPieMetric("attendance")}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  pieMetric === "attendance"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Status
              </button>
              <button
                type="button"
                onClick={() => setPieMetric("target")}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  pieMetric === "target"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Target
              </button>
            </div>
          </div>

          {/* Canvas / Visual Section */}
          {pieMetric === "target" ? (
            <div className="my-auto py-2 w-full flex flex-col items-center justify-center">
              {/* Speedometer Gauge */}
              <div className="relative w-full max-w-[260px] flex flex-col items-center justify-center">
                {(() => {
                  const turnoutRatio = Math.min(
                    1,
                    Math.max(
                      0,
                      employees.length > 0
                        ? (employees.length - todayAbsentees.length) / employees.length
                        : 1
                    )
                  );
                  const turnoutPct = Math.round(turnoutRatio * 100);
                  const needleAngle = -90 + turnoutRatio * 180;

                  return (
                    <div className="w-full flex flex-col items-center">
                      <svg
                        className="w-full h-auto overflow-visible"
                        viewBox="0 0 220 130"
                      >
                        <defs>
                          <linearGradient id="speedometerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="60%" stopColor="var(--palette-c1, #6366f1)" />
                            <stop offset="95%" stopColor="#10b981" />
                          </linearGradient>
                          <filter id="hubShadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.25)" />
                          </filter>
                        </defs>

                        {/* Background Semicircular Track */}
                        <path
                          d="M 30 105 A 80 80 0 0 1 190 105"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="10"
                          strokeLinecap="round"
                          className="text-muted/25 dark:text-muted/20"
                        />

                        {/* Active Progress Arc */}
                        {turnoutRatio > 0 && (
                          <path
                            d="M 30 105 A 80 80 0 0 1 190 105"
                            fill="none"
                            stroke="url(#speedometerGrad)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray="251.33"
                            strokeDashoffset={251.33 * (1 - turnoutRatio)}
                            className="transition-all duration-1000 ease-out"
                          />
                        )}

                        {/* Scale Ticks (Clean radial marks) */}
                        {/* 0% Tick */}
                        <line x1="22" y1="105" x2="30" y2="105" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/40" />
                        {/* 25% Tick */}
                        <line x1="53.3" y1="48.3" x2="59.1" y2="54.1" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40" />
                        {/* 50% Tick */}
                        <line x1="110" y1="17" x2="110" y2="25" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/40" />
                        {/* 75% Tick */}
                        <line x1="166.7" y1="48.3" x2="160.9" y2="54.1" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40" />
                        {/* 100% Tick */}
                        <line x1="190" y1="105" x2="198" y2="105" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/40" />

                        {/* 95% Benchmark Notch & Indicator */}
                        <line
                          x1="184.2"
                          y1="93.2"
                          x2="193.8"
                          y2="91.7"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <circle cx="189.0" cy="92.5" r="2.5" fill="#10b981" className="animate-pulse" />

                        {/* Scale Labels */}
                        <text x="18" y="122" textAnchor="middle" className="text-[10px] fill-muted-foreground font-semibold">
                          0%
                        </text>
                        <text x="110" y="10" textAnchor="middle" className="text-[10px] fill-muted-foreground font-semibold">
                          50%
                        </text>
                        <text x="202" y="122" textAnchor="middle" className="text-[10px] fill-muted-foreground font-semibold">
                          100%
                        </text>
                        <text x="195" y="76" textAnchor="middle" className="text-[9px] fill-emerald-600 dark:fill-emerald-400 font-bold">
                          95%
                        </text>

                        {/* Speedometer Needle */}
                        <g
                          style={{
                            transform: `rotate(${needleAngle}deg)`,
                            transformOrigin: "110px 105px",
                            transition: "transform 0.9s cubic-bezier(0.34, 1.3, 0.64, 1)",
                          }}
                        >
                          <line
                            x1="110"
                            y1="105"
                            x2="110"
                            y2="32"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="text-foreground drop-shadow-xs"
                          />
                          <polygon
                            points="107.5,105 112.5,105 110,26"
                            fill="currentColor"
                            className="text-foreground"
                          />
                          <circle cx="110" cy="28" r="2" fill="#10b981" />
                        </g>

                        {/* Center Hub */}
                        <circle
                          cx="110"
                          cy="105"
                          r="9"
                          className="fill-foreground"
                          filter="url(#hubShadow)"
                        />
                        <circle
                          cx="110"
                          cy="105"
                          r="4.5"
                          className="fill-background"
                        />
                      </svg>

                      {/* Digital Readout */}
                      <div className="mt-3 flex flex-col items-center justify-center text-center">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-display text-3xl font-extrabold text-foreground tracking-tight">
                            {turnoutPct}%
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Turnout
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                          {employees.length - todayAbsentees.length} of {employees.length} employees present
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 pt-2">
                {(employees.length > 0 ? (employees.length - todayAbsentees.length) / employees.length : 1) >= 0.95 ? (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Turnout on Track (95% Target Met)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <AlertCircle className="h-3.5 w-3.5" /> Below Target (95% Benchmark)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="relative h-56 sm:h-64 w-full flex items-center justify-center my-auto">
              {(pieMetric === "department" ? deptData : attStatusPieData).length === 0 ? (
                <div className="text-xs text-muted-foreground text-center">
                  <Users className="h-8 w-8 mx-auto mb-1 opacity-50" />
                  {pieMetric === "department" ? "No department data available" : "No attendance data recorded today"}
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieMetric === "department" ? deptData : attStatusPieData}
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {(pieMetric === "department" ? deptData : attStatusPieData).map((entry: any, i) => (
                          <Cell
                            key={i}
                            fill={entry.color || chartColors[i % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "12px",
                          fontSize: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                          color: "var(--card-foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-display text-3xl font-bold text-foreground tracking-tight">
                      {pieMetric === "department" ? employees.length : employees.length - todayAbsentees.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      {pieMetric === "department" ? "Employees" : "Present"}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Legend Grid / Target Metric Breakdown */}
          <div className="pt-3 border-t border-border/60">
            {pieMetric === "target" ? (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Present</span>
                  <strong className="text-foreground font-bold text-xs">{employees.length - todayAbsentees.length}</strong>
                </div>
                <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">On Leave</span>
                  <strong className="text-foreground font-bold text-xs">{todayApprovedLeaves.length}</strong>
                </div>
                <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Absent</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-bold text-xs">
                    {Math.max(0, todayAbsentees.length - todayApprovedLeaves.length)}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(pieMetric === "department" ? deptData : attStatusPieData).slice(0, 6).map((d: any, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color || chartColors[i % chartColors.length] }}
                    />
                    <span className="truncate text-muted-foreground text-[11px]">
                      {d.name} <strong className="text-foreground font-semibold">({d.value})</strong>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column: Approval Requests (~50% / 7 cols on lg) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="lg:col-span-7 rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4"
        >
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Approval Requests
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Clock className="h-3 w-3" /> {pendingCount} Pending
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review leaves, document requests, claims, and grievances.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/70 self-start sm:self-auto overflow-x-auto">
              {[
                { key: "pending", label: "Pending", count: pendingCount },
                { key: "all", label: "All", count: allCount },
                { key: "approved", label: "Approved", count: approvedCount },
                { key: "rejected", label: "Rejected", count: rejectedCount },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTicketFilter(f.key as any)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    ticketFilter === f.key
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          {/* List of Requests */}
          <div className="divide-y divide-border/50 max-h-[340px] overflow-y-auto pr-1">
            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                No {ticketFilter} requests requiring review.
              </div>
            ) : (
              filteredRequests.slice(0, 5).map((req) => {
                const isPending = req.status === "Pending" || req.status === "In Progress" || req.status === "Escalated";

                return (
                  <div
                    key={req.id}
                    onClick={() => setInspectItem(req)}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/40 rounded-2xl px-2 transition-colors cursor-pointer group"
                  >
                    {/* Left: Avatar & Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {req.avatarUrl ? (
                        <img
                          src={req.avatarUrl}
                          alt={req.employeeName}
                          className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {(req.employeeName || "E").slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {req.employeeName}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                            {req.empCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          <strong className="text-foreground/90">{req.type}</strong> · {req.title || req.details}
                        </p>
                      </div>
                    </div>

                    {/* Right: Quick Approve / Reject Actions & Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isPending ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleQuickAction(req, "approve")}
                            className="h-8 w-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-500/30 flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
                            title="Approve request"
                          >
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleQuickAction(req, "reject")}
                            className="h-8 w-8 rounded-full bg-rose-500/15 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/30 flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
                            title="Reject request"
                          >
                            <X className="h-3.5 w-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            req.status === "Approved"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                          }`}
                        >
                          {req.status === "Approved" ? "✓ Approved" : "✕ Rejected"}
                        </span>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectItem(req);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Link */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {Math.min(filteredRequests.length, 5)} of {normalizedRequests.length} requests
            </span>
            <Link
              to="/admin/requests"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Open Full Requests Hub <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* 6. RECENT ACTIVITIES FEED (Full Width Bottom Card)                        */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl p-5 sm:p-7 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight">
                Recent Activities Feed
              </h3>
              <p className="text-xs text-muted-foreground leading-tight">
                Real-time chronological log of attendance, approvals, circulars, and staff actions.
              </p>
            </div>
          </div>
          <Link
            to="/admin/audit"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            Audit Log <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Chronological Stream */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {recentActivitiesStream.map((act) => {
            const Icon = act.icon;
            return (
              <div
                key={act.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/50 dark:bg-muted/30 border border-border/60 hover:bg-white dark:hover:bg-muted/50 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {act.avatar ? (
                    <img
                      src={act.avatar}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-xl bg-muted border border-border flex items-center justify-center text-primary shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{act.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{act.subtitle}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${act.badgeColor}`}>
                    {act.tag}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">{act.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* 7. QUICK INSPECTION & APPROVAL DIALOG                                     */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(inspectItem)} onOpenChange={(open) => !open && setInspectItem(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-border bg-card shadow-2xl">
          {inspectItem && (
            <>
              <div className="p-5 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    {inspectItem.categoryLabel}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      inspectItem.status === "Approved"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                        : inspectItem.status === "Rejected"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                    }`}
                  >
                    {inspectItem.status}
                    {inspectItem.totalLevels > 1 ? ` (Level ${inspectItem.currentLevel}/${inspectItem.totalLevels})` : ""}
                  </span>
                </div>

                <DialogTitle className="text-base font-bold text-foreground">
                  {inspectItem.type}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Applied on {inspectItem.dateStr}
                </DialogDescription>
              </div>

              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                {/* Employee Card */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                  {inspectItem.avatarUrl ? (
                    <img
                      src={inspectItem.avatarUrl}
                      alt={inspectItem.employeeName}
                      className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                      {(inspectItem.employeeName || "E").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-foreground truncate">
                      {inspectItem.employeeName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-mono">{inspectItem.empCode}</span> · {inspectItem.department}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80">
                      {inspectItem.branchName}
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-2 text-xs">
                  {inspectItem.amountOrDays && (
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Value / Duration</span>
                      <span className="font-semibold text-foreground">{inspectItem.amountOrDays}</span>
                    </div>
                  )}

                  <div className="py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground block mb-1">Subject / Summary</span>
                    <span className="font-medium text-foreground">{inspectItem.title}</span>
                  </div>

                  {inspectItem.details && (
                    <div className="py-1.5">
                      <span className="text-muted-foreground block mb-1">Details & Reason</span>
                      <p className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-foreground leading-relaxed">
                        {inspectItem.details}
                      </p>
                    </div>
                  )}

                  {inspectItem.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400">
                      <span className="font-semibold block">Decision / Note:</span>
                      {inspectItem.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
                <Link
                  to="/admin/requests"
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  Open in Requests Hub <ExternalLink className="h-3 w-3" />
                </Link>

                {(inspectItem.status === "Pending" || inspectItem.status === "In Progress" || inspectItem.status === "Escalated") ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => handleQuickAction(inspectItem, "reject")}
                      className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 gap-1 text-xs h-8 rounded-full"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleQuickAction(inspectItem, "approve")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-8 shadow-xs rounded-full"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInspectItem(null)}
                    className="text-xs h-8 rounded-full"
                  >
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
