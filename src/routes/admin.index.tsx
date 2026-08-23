import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { computePayroll, inr } from "@/lib/payroll";
import { motion } from "framer-motion";
import { Users, CalendarCheck, IndianRupee, TrendingUp, ArrowUpRight, Clock, FileText, CheckCircle2 } from "lucide-react";
import { NoticeBoard } from "@/components/notice-board";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard · SWIFT" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { employees, attendance, company, payrolls, currentUser, leaves, docRequests } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const todaysAtt = attendance.filter((a) => a.date === today);
  const present = todaysAtt.filter((a) => a.status === "present" || a.status === "half-day").length;

  const pendingLeavesCount = (leaves || []).filter(
    (l) => (l.status || "pending").toLowerCase() === "pending"
  ).length;

  const pendingDocsCount = (docRequests || []).filter(
    (d) => d.status === "pending"
  ).length;

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

  const cards = [
    { label: "Total Employees", value: employees.length.toString(), icon: Users, tint: "from-teal to-primary" },
    {
      label: "Present Today",
      value: `${present}/${employees.length}`,
      icon: CalendarCheck,
      tint: "from-primary to-teal",
    },
    {
      label: "Pending Approvals",
      value: `${pendingLeavesCount} Leaves · ${pendingDocsCount} Docs`,
      icon: Clock,
      tint: "from-amber-500 to-orange-500",
      link: "/admin/leave-calendar",
    },
    { label: "Monthly Payroll", value: inr(totalMonthlyCTC), icon: IndianRupee, tint: "from-coral to-primary" },
  ];

  const attByDay = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      present: attendance.filter((a) => a.date === key && a.status === "present").length,
    };
  });

  const deptData = Object.entries(
    employees.reduce<Record<string, number>>((acc, e) => {
      acc[e.department || "Unassigned"] = (acc[e.department || "Unassigned"] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));
  const COLORS = ["#14a0aa", "#f87171", "#5eead4", "#fb923c", "#a78bfa"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Welcome back 👋</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening in your organization today.</p>
        </div>
        <Link
          to="/admin/employees"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm text-white shadow-glow"
        >
          Add Employee <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => {
          const CardInner = (
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="mt-2 font-display text-2xl font-semibold">{c.value}</div>
              </div>
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.tint} text-white`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          );

          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors"
            >
              {c.link ? (
                <Link to={c.link} className="block cursor-pointer">
                  {CardInner}
                </Link>
              ) : (
                CardInner
              )}
            </motion.div>
          );
        })}
      </div>

      <NoticeBoard viewer={{ role: "admin" }} userKey={"admin:" + (currentUser?.name || "admin")} compact />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-semibold">Attendance last 7 days</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={attByDay}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14a0aa" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#14a0aa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Area dataKey="present" stroke="#14a0aa" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold">Departments</h3>
          <div className="h-64">
            {deptData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No employees yet
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={deptData} innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                    {deptData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 font-display font-semibold">Payroll by employee (monthly gross)</h3>
        <div className="h-64">
          {employees.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Add employees to see payroll breakdown
            </div>
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={employees.map((e) => {
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
                  return { name: e.name.split(" ")[0], gross: Math.round(p.gross) };
                })}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => inr(v)} />
                <Bar dataKey="gross" fill="#14a0aa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
