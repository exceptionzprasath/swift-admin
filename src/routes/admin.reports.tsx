import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { inr } from "@/lib/payroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Payroll Reports · SWIFT" }] }),
  component: ReportsPage,
});

type ReportKey =
  | "salary_register"
  | "bank_transfer"
  | "epf"
  | "esi"
  | "pt"
  | "bonus"
  | "gratuity"
  | "department"
  | "variance"
  | "audit";

const REPORTS: { key: ReportKey; label: string; desc: string }[] = [
  { key: "salary_register", label: "Salary Register", desc: "Complete payslip snapshot for the month." },
  { key: "bank_transfer", label: "Bank Transfer Statement", desc: "Net-pay bank file with IFSC and account." },
  { key: "epf", label: "EPF Report", desc: "Employee + employer PF with UAN placeholder." },
  { key: "esi", label: "ESI Report", desc: "Employee + employer ESI contributions." },
  { key: "pt", label: "Professional Tax", desc: "PT collected per employee." },
  { key: "bonus", label: "Bonus Register", desc: "Bonus / incentive / arrears paid." },
  { key: "gratuity", label: "Gratuity Provision", desc: "Employer gratuity accrual for the month." },
  { key: "department", label: "Department Cost", desc: "Aggregated employer cost per department." },
  { key: "variance", label: "Variance vs Last Month", desc: "Month-on-month delta in gross / net / employer cost." },
  { key: "audit", label: "Audit Report", desc: "Payroll runs, revisions, approvals trail." },
];

function ReportsPage() {
  const { payrolls, employees, salaryRevisions } = useStore();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [active, setActive] = useState<ReportKey>("salary_register");

  const rows = useMemo(() => buildRows(active, { payrolls, employees, salaryRevisions, month }), [active, payrolls, employees, salaryRevisions, month]);

  const download = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Payroll Reports</h1>
        <p className="text-sm text-muted-foreground">Every statutory, compliance and audit register — one click to CSV.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-3 space-y-1">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${active === r.key ? "bg-gradient-brand text-white shadow-soft" : "hover:bg-muted"}`}
            >
              <div className="font-medium flex items-center gap-2"><FileText className="h-3.5 w-3.5" />{r.label}</div>
              <div className={`text-xs ${active === r.key ? "text-white/80" : "text-muted-foreground"}`}>{r.desc}</div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <Button className="ml-auto" onClick={download} disabled={!rows.length}>
              <FileDown className="h-4 w-4 mr-2" /> Download CSV
            </Button>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No data for {month}. Run payroll first.
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>{Object.keys(rows[0]).map((h) => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {Object.keys(rows[0]).map((h) => <td key={h} className="px-3 py-2">{formatCell(r[h])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCell(v: unknown) {
  if (typeof v === "number") return inr(v);
  return String(v ?? "");
}

type Ctx = { payrolls: ReturnType<typeof useStore.getState>["payrolls"]; employees: ReturnType<typeof useStore.getState>["employees"]; salaryRevisions: ReturnType<typeof useStore.getState>["salaryRevisions"]; month: string };

function buildRows(key: ReportKey, ctx: Ctx): Array<Record<string, string | number>> {
  const { payrolls, employees, salaryRevisions, month } = ctx;
  const monthly = payrolls.filter((p) => p.month === month);
  const empOf = (id: string) => employees.find((e) => e.id === id);

  switch (key) {
    case "salary_register":
      return monthly.map((p) => {
        const e = empOf(p.employeeId);
        return {
          EmpCode: e?.empCode ?? "", Name: e?.name ?? "", Department: e?.department ?? "",
          Days: p.daysWorked, Gross: p.computed.gross,
          EmployeePF: p.computed.deductions.employeePF, EmployeeESI: p.computed.deductions.employeeESI,
          PT: p.computed.deductions.professionalTax, TDS: p.computed.deductions.tds,
          TotalDed: p.computed.totalDeductions, Net: p.computed.net,
        };
      });
    case "bank_transfer":
      return monthly.map((p) => {
        const e = empOf(p.employeeId);
        return { EmpCode: e?.empCode ?? "", Name: e?.name ?? "", Bank: e?.bankAcc ?? "MISSING", IFSC: e?.bankIfsc ?? "MISSING", Amount: p.computed.net };
      });
    case "epf":
      return monthly
        .filter((p) => p.computed.deductions.employeePF > 0)
        .map((p) => {
          const e = empOf(p.employeeId);
          return {
            EmpCode: e?.empCode ?? "", Name: e?.name ?? "", UAN: (e as { uan?: string } | undefined)?.uan ?? "MISSING",
            PFBase: p.computed.pfBase, EmployeePF: p.computed.deductions.employeePF, EmployerPF: p.computed.employerContrib.employerPF,
          };
        });
    case "esi":
      return monthly
        .filter((p) => p.computed.deductions.employeeESI > 0)
        .map((p) => {
          const e = empOf(p.employeeId);
          return {
            EmpCode: e?.empCode ?? "", Name: e?.name ?? "", Gross: p.computed.gross,
            EmployeeESI: p.computed.deductions.employeeESI, EmployerESI: p.computed.employerContrib.employerESI,
          };
        });
    case "pt":
      return monthly.map((p) => {
        const e = empOf(p.employeeId);
        return { EmpCode: e?.empCode ?? "", Name: e?.name ?? "", Gross: p.computed.gross, PT: p.computed.deductions.professionalTax };
      });
    case "bonus":
      return monthly.map((p) => {
        const e = empOf(p.employeeId);
        return { EmpCode: e?.empCode ?? "", Name: e?.name ?? "", Bonus: p.bonus, Incentive: p.incentive, OTHours: p.otHours };
      });
    case "gratuity":
      return monthly.map((p) => {
        const e = empOf(p.employeeId);
        return { EmpCode: e?.empCode ?? "", Name: e?.name ?? "", GratuityProvision: p.computed.employerContrib.gratuity };
      });
    case "department": {
      const map = new Map<string, { Employees: number; Gross: number; EmployerCost: number; Net: number }>();
      for (const p of monthly) {
        const e = empOf(p.employeeId);
        const d = e?.department ?? "—";
        const row = map.get(d) ?? { Employees: 0, Gross: 0, EmployerCost: 0, Net: 0 };
        row.Employees += 1;
        row.Gross += p.computed.gross;
        row.EmployerCost += p.computed.totalEmployer;
        row.Net += p.computed.net;
        map.set(d, row);
      }
      return Array.from(map.entries()).map(([Department, r]) => ({ Department, ...r }));
    }
    case "variance": {
      const [y, m] = month.split("-").map(Number);
      const prev = new Date(y, m - 2, 1).toISOString().slice(0, 7);
      const prevRuns = payrolls.filter((p) => p.month === prev);
      return monthly.map((cur) => {
        const p = prevRuns.find((r) => r.employeeId === cur.employeeId);
        const e = empOf(cur.employeeId);
        return {
          EmpCode: e?.empCode ?? "", Name: e?.name ?? "",
          PrevGross: p?.computed.gross ?? 0, CurGross: cur.computed.gross,
          DeltaGross: cur.computed.gross - (p?.computed.gross ?? 0),
          DeltaNet: cur.computed.net - (p?.computed.net ?? 0),
        };
      });
    }
    case "audit":
      return [
        ...monthly.map((p) => {
          const e = empOf(p.employeeId);
          return { Type: "Payroll Run", When: p.createdAt.slice(0, 10), Employee: e?.name ?? "", Detail: `Net ${inr(p.computed.net)}`, Ref: p.id.slice(0, 8) };
        }),
        ...salaryRevisions.map((r) => {
          const e = empOf(r.employeeId);
          return { Type: `Revision · ${r.status}`, When: r.createdAt.slice(0, 10), Employee: e?.name ?? "", Detail: `+${inr(r.amount)} (${r.target})`, Ref: r.id.slice(0, 8) };
        }),
      ];
  }
}
