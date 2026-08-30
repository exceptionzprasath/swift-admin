import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { computePayroll, inr } from "@/lib/payroll";
import { motion } from "framer-motion";
import {
  Users,
  CalendarCheck,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoticeBoard } from "@/components/notice-board";
import { LiveNotificationTicker } from "@/components/live-notification-ticker";
import { DashboardHeroCarousel } from "@/components/dashboard-hero-carousel";
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
  const { employees, attendance, company, payrolls, currentUser, leaves, docRequests } = useStore();
  const [ticketFilter, setTicketFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const today = new Date().toISOString().slice(0, 10);
  const todaysAtt = attendance.filter((a) => a.date === today);
  const present = todaysAtt.filter((a) => a.status === "present" || a.status === "half-day").length;
  const attendanceRate = employees.length > 0 ? Math.round((present / employees.length) * 100) : 100;

  const pendingLeaves = (leaves || []).filter(
    (l) => (l.status || "pending").toLowerCase() === "pending"
  );
  const pendingDocs = (docRequests || []).filter(
    (d) => d.status === "pending"
  );
  const totalPending = pendingLeaves.length + pendingDocs.length;

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
    },
    {
      label: "Total Employees",
      value: employees.length.toString(),
      bgClass: "bg-kpi-2 text-kpi-2-foreground",
      icon: Users,
      link: "/admin/employees",
    },
    {
      label: "Active Attendance",
      value: `${attendanceRate}%`,
      bgClass: "bg-kpi-3 text-kpi-3-foreground",
      icon: CalendarCheck,
      link: "/admin/attendance",
    },
    {
      label: "Pending Requests",
      value: totalPending.toString(),
      bgClass: "bg-kpi-4 text-kpi-4-foreground",
      icon: Clock,
      link: "/admin/leave-calendar",
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

  // Recent transactions / activity list
  const recentActivities = [
    ...pendingLeaves.slice(0, 3).map((l) => ({
      id: l.id,
      title: employees.find((e) => e.id === l.employeeId)?.name || "Employee",
      type: `${l.type} Leave`,
      tag: "LEAVE",
      date: l.startDate,
      badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    })),
    ...pendingDocs.slice(0, 2).map((d) => ({
      id: d.id,
      title: employees.find((e) => e.id === d.employeeId)?.name || "Employee",
      type: `${d.letterTitle || d.letterKey || "Doc"} Request`,
      tag: "DOC",
      date: today,
      badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
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

  // All combined requests for the bottom approval card
  const allRequests = [
    ...(leaves || []).map((l) => ({
      id: l.id,
      name: employees.find((e) => e.id === l.employeeId)?.name || "Employee",
      email: employees.find((e) => e.id === l.employeeId)?.email || "employee@company.com",
      topic: `${l.type} Leave Request (${l.days} days)`,
      status: (l.status || "pending").toLowerCase(),
    })),
    ...(docRequests || []).map((d) => ({
      id: d.id,
      name: employees.find((e) => e.id === d.employeeId)?.name || "Employee",
      email: employees.find((e) => e.id === d.employeeId)?.email || "employee@company.com",
      topic: `${d.letterTitle || d.letterKey || "Document"} Approval`,
      status: (d.status || "pending").toLowerCase(),
    })),
  ];

  const filteredRequests = allRequests.filter((r) => {
    if (ticketFilter === "all") return true;
    return r.status === ticketFilter;
  });

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
        {kpiCards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-none p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[135px] transition-transform hover:-translate-y-0.5 cursor-pointer ${c.bgClass}`}
          >
            <Link to={c.link} className="flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide uppercase opacity-85">
                  {c.label}
                </span>
                <c.icon className="h-4 w-4 opacity-75" />
              </div>
              <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-3">
                {c.value}
              </div>
            </Link>
          </motion.div>
        ))}
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
        {/* Support Tickets / Approvals (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                Approval Requests
              </h3>
              <p className="text-xs text-muted-foreground">Manage pending employee leaves and document approvals.</p>
            </div>

            {/* Filter Pills matching NexaVerse */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/60 border border-border/80 self-start sm:self-auto">
              {(["all", "pending", "approved", "rejected"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setTicketFilter(filter)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                    ticketFilter === filter
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {filteredRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No {ticketFilter === "all" ? "" : ticketFilter} requests found.
              </div>
            ) : (
              filteredRequests.slice(0, 5).map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                      {req.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{req.email}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{req.topic}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      req.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                        : req.status === "rejected"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))
            )}
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
    </div>
  );
}
