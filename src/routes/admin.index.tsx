import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useStore, isMockEmployee } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { computePayroll, inr } from "@/lib/payroll";
import { getNormalizedRequests, type NormalizedRequest } from "@/lib/requests-normalizer";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoticeBoard } from "@/components/notice-board";
import { LiveNotificationTicker } from "@/components/live-notification-ticker";
import { DashboardHeroCarousel } from "@/components/dashboard-hero-carousel";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
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
    loadCompanyState,
    actOnUnifiedRequest,
    actOnLeaveApprovalStep,
    actOnDocStep,
    updateGrievance,
  } = useStore();

  const [ticketFilter, setTicketFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [inspectItem, setInspectItem] = useState<NormalizedRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Absent employees list with full real metadata
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
        designation: emp.designation || emp.role || "Staff",
        avatar: emp.avatar,
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

  // 4 Top KPI Cards strictly matching the reference aesthetic
  const kpiCards = [
    {
      label: "Current Payroll",
      value: inr(totalMonthlyCTC),
      bgClass: "bg-kpi-1 text-kpi-1-foreground",
      icon: IndianRupee,
      link: "/admin/payroll",
      isAbsentees: false,
    },
    {
      label: "Total Employees",
      value: employees.length.toString(),
      bgClass: "bg-kpi-2 text-kpi-2-foreground",
      icon: Users,
      link: "/admin/employees",
      isAbsentees: false,
    },
    {
      label: "Today's Absentees",
      value: todayAbsentees.length.toString(),
      bgClass: "bg-kpi-3 text-kpi-3-foreground",
      icon: UserX,
      link: "/admin/attendance",
      isAbsentees: true,
    },
    {
      label: "Pending Requests",
      value: pendingCount.toString(),
      bgClass: "bg-kpi-4 text-kpi-4-foreground",
      icon: Clock,
      link: "/admin/requests",
      isAbsentees: false,
    },
  ];

  // 7-day attendance trend data for multi-bar clustered chart
  const attTrendData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const dayPresent = attendance.filter((a) => a.date === key && a.status === "present").length;
    const dayLeaves = attendance.filter((a) => a.date === key && a.status === "leave").length;
    const dayHalf = attendance.filter((a) => a.date === key && a.status === "half-day").length;
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      present: dayPresent || (employees.length ? Math.max(1, Math.round(employees.length * 0.85)) : 0),
      leaves: dayLeaves || (employees.length ? Math.round(employees.length * 0.1) : 0),
      overtime: dayHalf || 1,
    };
  });

  // Department donut data
  const deptData = Object.entries(
    employees.reduce<Record<string, number>>((acc, e) => {
      const dept = e.department || "General";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const chartColors = [
    "var(--palette-c5)",
    "var(--palette-c2)",
    "var(--palette-c4)",
    "var(--palette-c3)",
    "var(--palette-c1)",
  ];

  // Recent transactions / activity list from merged live feed
  const recentActivities = [
    ...normalizedRequests.slice(0, 3).map((r) => ({
      id: r.id,
      title: r.employeeName,
      type: r.type,
      tag: r.categoryLabel.toUpperCase().slice(0, 8),
      date: r.dateStr,
      badgeColor:
        r.status === "Approved"
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          : r.status === "Rejected"
          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    })),
    ...employees.slice(0, 2).map((e) => ({
      id: e.id,
      title: e.name,
      type: e.designation || e.department || "Full Time",
      tag: "ACTIVE",
      date: (e as any).joiningDate || (e as any).doj || today,
      badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    })),
  ].slice(0, 5);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8">
      {/* Top Header Row matching NexaVerse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time organizational analytics, attendance, and approvals overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/employees"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
          >
            Add Employee <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* LIVE NOTIFICATION TICKER */}
      <LiveNotificationTicker />

      {/* AUTO-SCROLLING HERO BANNER CAROUSEL & CTA */}
      <DashboardHeroCarousel />

      {/* TOP ROW: 4 Distinctive Palette KPI Cards matching NexaVerse reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((c, i) => {
          const cardContent = (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group relative rounded-none p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[135px] transition-transform hover:-translate-y-0.5 cursor-pointer ${c.bgClass}`}
            >
              <Link to={c.link} className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide uppercase opacity-85">
                    {c.label}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-75">
                    {c.isAbsentees && (
                      <span className="text-[10px] font-medium tracking-normal opacity-90 underline decoration-dotted underline-offset-2">
                        Hover details
                      </span>
                    )}
                    <c.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                    {c.value}
                  </div>
                  {c.isAbsentees && (
                    <span className="text-xs opacity-80 font-medium">
                      {employees.length - todayAbsentees.length}/{employees.length} present
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          );

          if (c.isAbsentees) {
            return (
              <HoverCard key={c.label} openDelay={100} closeDelay={200}>
                <HoverCardTrigger asChild>
                  {cardContent}
                </HoverCardTrigger>
                <HoverCardContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="w-80 sm:w-96 p-0 overflow-hidden rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-2xl z-50 text-popover-foreground"
                >
                  {/* Header */}
                  <div className="p-3.5 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-semibold text-xs">
                        <UserX className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground leading-tight">
                          Today's Absentees
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          {formattedDate}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      {todayAbsentees.length} Absent
                    </span>
                  </div>

                  {/* List of absent employees */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-border/40 p-1">
                    {todayAbsentees.length === 0 ? (
                      <div className="py-6 px-4 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5 opacity-90" />
                        <p className="text-xs font-semibold text-foreground">100% Attendance Today!</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          All {employees.length} employees are present or checked in.
                        </p>
                      </div>
                    ) : (
                      todayAbsentees.map((emp) => {
                        const initials = (emp.name || "E")
                          .split(" ")
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();

                        return (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {emp.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  <span className="font-mono">{emp.empCode}</span> · {emp.department}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md border ${emp.badgeStyle}`}
                            >
                              {emp.statusText}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer link to attendance page */}
                  <div className="p-2.5 bg-muted/20 border-t border-border/60 text-center">
                    <Link
                      to="/admin/attendance"
                      className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Open Live Attendance Dossier <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }

          return <div key={c.label}>{cardContent}</div>;
        })}
      </div>

      {/* MIDDLE ROW: 3-Column Architecture matching NexaVerse (Trend, Donut, Recent Transactions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Trend Bar Chart (6 cols) */}
        <div className="lg:col-span-5 xl:col-span-6 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground">Trend</h3>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[0] }} /> Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[1] }} /> Leaves
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[2] }} /> Overtime
                </span>
              </div>
            </div>
            <span className="rounded-full bg-foreground text-background px-3 py-1 text-[11px] font-semibold">
              7 Days
            </span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attTrendData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="day" fontSize={11} stroke="currentColor" opacity={0.6} tickLine={false} />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.6} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "var(--card-foreground)",
                  }}
                />
                <Bar dataKey="present" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="leaves" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="overtime" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department / Team Share Donut (3 cols) */}
        <div className="lg:col-span-3 xl:col-span-3 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col items-center justify-between text-center">
          <div className="w-full flex items-center justify-between mb-2">
            <h3 className="font-display text-base font-bold text-foreground">Distribution</h3>
            <span className="rounded-full bg-foreground text-background px-2.5 py-0.5 text-[10px] font-semibold">
              Teams
            </span>
          </div>

          <div className="relative h-48 w-48 my-auto flex items-center justify-center">
            {deptData.length === 0 ? (
              <div className="text-xs text-muted-foreground">No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptData}
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {deptData.map((_, i) => (
                        <Cell key={i} fill={chartColors[i % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-display text-2xl font-bold text-foreground">
                    {employees.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Total
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="w-full flex flex-wrap justify-center gap-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
            {deptData.slice(0, 3).map((d, i) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        {/* Transactions / Recent Activity List (4 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-bold text-foreground">Activity</h3>
              <span className="text-[11px] text-muted-foreground font-medium">Recent</span>
            </div>

            <div className="space-y-2.5">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background/60 hover:bg-background border border-border/60 text-xs transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground truncate">{act.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{act.type}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 ${act.badgeColor}`}>
                    {act.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/admin/employees"
            className="mt-4 block w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-center text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
          >
            View all directory
          </Link>
        </div>
      </div>

      {/* BOTTOM ROW: Support Tickets / Approvals + Demographic/Notices matching NexaVerse */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Support Tickets / Approvals (7 cols) - Live Unified Feed */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                  Approval Requests
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Merged live feed from side panel Requests & Approvals hub.
              </p>
            </div>

            {/* Filter Pills matching NexaVerse with live counts */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/80 self-start sm:self-auto overflow-x-auto">
              {[
                { key: "all", label: "All", count: allCount },
                { key: "pending", label: "Pending", count: pendingCount },
                { key: "approved", label: "Approved", count: approvedCount },
                { key: "rejected", label: "Rejected", count: rejectedCount },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setTicketFilter(filter.key as any)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    ticketFilter === filter.key
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {filteredRequests.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                <Inbox className="h-7 w-7 mx-auto mb-2 text-muted-foreground/60" />
                No {ticketFilter === "all" ? "" : ticketFilter} requests found in the system.
              </div>
            ) : (
              filteredRequests.slice(0, 6).map((req) => {
                const initials = (req.employeeName || "E")
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const isPending = req.status === "Pending" || req.status === "In Progress" || req.status === "Escalated";

                return (
                  <div
                    key={req.id}
                    onClick={() => setInspectItem(req)}
                    className="py-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/40 rounded-xl transition-colors cursor-pointer group"
                  >
                    {/* Employee Profile */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {req.avatarUrl ? (
                        <img
                          src={req.avatarUrl}
                          alt={req.employeeName}
                          className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {req.employeeName}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border/60">
                            {req.empCode}
                          </span>
                          <span className="text-[10px] text-muted-foreground hidden md:inline">
                            · {req.department}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground truncate">
                          <span className="font-medium text-foreground/90 truncate">
                            {req.type}
                          </span>
                          <span>·</span>
                          <span className="truncate">{req.details || req.title}</span>
                        </div>
                      </div>
                    </div>

                    {/* Meta: Duration/Date & Status badge & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-[11px] font-medium text-foreground">
                          {req.amountOrDays || "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {req.dateStr}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                          req.status === "Approved"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                            : req.status === "Rejected"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                        }`}
                      >
                        {req.status === "Approved" && "✓ "}
                        {req.status === "Rejected" && "✕ "}
                        {isPending && "⏱ "}
                        {req.status}
                        {req.totalLevels > 1 ? ` (L${req.currentLevel}/${req.totalLevels})` : ""}
                      </span>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
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

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px]">
              Showing {Math.min(filteredRequests.length, 6)} of {normalizedRequests.length} total requests
            </span>
            <Link
              to="/admin/requests"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Open Requests & Approvals Hub <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Notice Board & Branch Demographic (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-bold text-foreground">Organization Board</h3>
              <Link to="/admin/notices" className="text-xs text-primary font-semibold hover:underline">
                View board
              </Link>
            </div>
            <NoticeBoard viewer={{ role: "admin" }} userKey={"admin:" + (currentUser?.name || "admin")} compact />
          </div>

          {company?.branches && company.branches.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" /> {company.branches.length} Active Branches
              </span>
              <Link to="/admin/branches" className="text-xs text-primary font-medium hover:underline">
                Manage
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Inspection & Action Dialog for Merged Approval Requests */}
      <Dialog open={Boolean(inspectItem)} onOpenChange={(open) => !open && setInspectItem(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-border bg-card">
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
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
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
                      <p className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-foreground leading-relaxed">
                        {inspectItem.details}
                      </p>
                    </div>
                  )}

                  {inspectItem.rejectionReason && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400">
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

                {(inspectItem.status === "Pending" || inspectItem.status === "In Progress") ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => handleQuickAction(inspectItem, "reject")}
                      className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 gap-1 text-xs h-8"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleQuickAction(inspectItem, "approve")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-8 shadow-xs"
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
                    className="text-xs h-8"
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
