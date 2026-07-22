import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computePayroll, inr, explainPayroll } from "@/lib/payroll";
import { auditPayroll, preflightPayroll } from "@/lib/payroll-audit";
import { generateSalarySlipPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, Calculator, AlertTriangle, CheckCircle2, Info, Sparkles, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { simulateRevision, revisionTargetLabels, revisionReasonLabels, type RevisionTarget, type RevisionReason } from "@/lib/salary-revision";

export const Route = createFileRoute("/admin/payroll")({
  head: () => ({ meta: [{ title: "Payroll · SWIFT" }] }),
  component: PayrollPage,
});

function PayrollPage() {
  const { employees, company, attendance, addPayroll, applySalaryRevision, rollbackSalaryRevision, salaryRevisions, currentUser } = useStore();
  const branches = company.branches ?? [];
  const [branchFilter, setBranchFilter] = useState<string>("__all");
  const filteredEmployees = useMemo(
    () => (branchFilter === "__all" ? employees : employees.filter((e) => (e.branchId || "") === branchFilter)),
    [employees, branchFilter],
  );
  const [empId, setEmpId] = useState(filteredEmployees[0]?.id || employees[0]?.id || "");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const emp = employees.find((e) => e.id === empId);

  const monthAtt = useMemo(
    () => attendance.filter((a) => a.employeeId === empId && a.date.startsWith(month)),
    [attendance, empId, month]
  );

  const daysAuto = monthAtt.filter((a) => a.status === "present").length + monthAtt.filter((a) => a.status === "half-day").length * 0.5;
  const otAuto = monthAtt.reduce((sum, a) => sum + (a.otHours || 0), 0);
  const shiftDaysAuto = monthAtt.filter((a) => a.status === "present" || a.status === "half-day").length;

  const [daysWorked, setDaysWorked] = useState(company.workingDaysPerMonth);
  const [otHours, setOtHours] = useState(0);
  const [nightHours, setNightHours] = useState(0);
  const [incentive, setIncentive] = useState(0);
  const [shiftDays, setShiftDays] = useState(0);
  const [loan, setLoan] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [arrears, setArrears] = useState(0);
  const [reimbursement, setReimbursement] = useState(0);
  const [variablePay, setVariablePay] = useState(0);
  const [otherEarnings, setOtherEarnings] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  // AI Payroll Decision (inline salary revision simulator)
  const [revAmount, setRevAmount] = useState(0);
  const [revTarget, setRevTarget] = useState<RevisionTarget>("basic");
  const [revReason, setRevReason] = useState<RevisionReason>("increment");
  const [revEffective, setRevEffective] = useState(new Date().toISOString().slice(0, 10));

  const sim = useMemo(
    () => (emp && revAmount !== 0 ? simulateRevision(company, emp, { amount: revAmount, target: revTarget }) : null),
    [emp, company, revAmount, revTarget],
  );

  const empRevisions = useMemo(
    () => salaryRevisions.filter((r) => r.employeeId === empId).slice(0, 5),
    [salaryRevisions, empId],
  );

  const applyRev = () => {
    if (!emp || revAmount === 0) return toast.error("Enter a non-zero amount");
    const rev = applySalaryRevision(
      {
        employeeId: emp.id, amount: revAmount, target: revTarget, reason: revReason, effectiveDate: revEffective,
        arrears: false, retro: false, recalcAttendance: true, recalcLeave: true, recalcOt: true, recalcBonus: true,
        recalcIncentive: true, updateTaxProjection: true, applyToFuture: true,
      },
      currentUser?.name || "Admin",
    );
    if (rev) { toast.success("Revision applied — payroll updated"); setRevAmount(0); }
  };

  const useAuto = () => {
    setDaysWorked(daysAuto || company.workingDaysPerMonth);
    setOtHours(otAuto);
    setShiftDays(shiftDaysAuto);
    toast.success("Pulled from attendance");
  };

  const p = emp
    ? computePayroll({ company, employee: emp, daysWorked, otHours, incentive, shiftDays, loan, advance, bonus, arrears, reimbursement, nightHours, variablePay, otherEarnings, otherDeductions })
    : null;

  const preflight = emp ? preflightPayroll({ company, employee: emp, daysWorked }) : [];
  const issues = emp && p ? auditPayroll({ company, employee: emp, daysWorked, otHours, p, nightHours, reimbursement }) : [];
  const explanations = emp && p ? explainPayroll(company, emp, p) : [];
  const hasErrors = issues.some((i) => i.level === "error");
  const hasWarnings = issues.some((i) => i.level === "warn");
  const hardBlocked = preflight.length > 0;

  const process = () => {
    if (!emp || !p) return;
    if (hardBlocked) return toast.error(`Compliance block: ${preflight[0].title}`);
    if (hasErrors) return toast.error("Fix payroll errors before finalizing");
    if (hasWarnings && !acknowledged) return toast.error("Acknowledge AI warnings before finalizing");
    addPayroll({
      id: crypto.randomUUID(),
      employeeId: emp.id,
      month,
      daysWorked,
      otHours,
      incentive,
      shiftDays,
      loan,
      advance,
      bonus,
      computed: p,
      createdAt: new Date().toISOString(),
    });
    generateSalarySlipPDF(company, emp, month, p);
    toast.success("Payroll processed & payslip downloaded");
  };

  if (employees.length === 0) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">Add employees first to run payroll.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Payroll Engine · AI Decisions</h1>
          <p className="text-sm text-muted-foreground">Compute payroll, audit with AI, and simulate salary decisions inline — all in one place.</p>
        </div>
        {branches.length > 0 && (
          <div className="min-w-[220px]">
            <Label className="text-xs">Branch</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All branches</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Employee</Label>
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((e) => {
                    const br = branches.find((b) => b.id === e.branchId);
                    return (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.empCode}){br ? ` · ${br.code}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </div>


          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <span>Auto from attendance: {daysAuto} days, {otAuto} OT hrs, {shiftDaysAuto} shift days</span>
            <Button size="sm" variant="outline" onClick={useAuto}>Pull</Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumField label="Days Worked" value={daysWorked} onChange={setDaysWorked} />
            <NumField label="OT Hours" value={otHours} onChange={setOtHours} />
            <NumField label="Night Hours" value={nightHours} onChange={setNightHours} />
            <NumField label="Shift Days" value={shiftDays} onChange={setShiftDays} />
            <NumField label="Incentive (₹)" value={incentive} onChange={setIncentive} />
            <NumField label="Variable Pay (₹)" value={variablePay} onChange={setVariablePay} />
            <NumField label="Bonus (₹)" value={bonus} onChange={setBonus} />
            <NumField label="Arrears (₹)" value={arrears} onChange={setArrears} />
            <NumField label="Reimbursements (₹)" value={reimbursement} onChange={setReimbursement} />
            <NumField label="Other Earnings (₹)" value={otherEarnings} onChange={setOtherEarnings} />
            <NumField label="Loan (₹)" value={loan} onChange={setLoan} />
            <NumField label="Advance (₹)" value={advance} onChange={setAdvance} />
            <NumField label="Other Deductions (₹)" value={otherDeductions} onChange={setOtherDeductions} />
          </div>

          {p && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <StatChip label="Gross" value={inr(p.gross)} />
              <StatChip label="Net" value={inr(p.net)} tone="brand" />
              <StatChip label="Employer" value={inr(p.totalEmployer)} />
              <StatChip label="CTC/yr" value={inr(p.annualCTC)} />
              <StatChip label="PF Base" value={inr(p.pfBase)} />
              <StatChip label="ESI" value={p.esiEligible ? "Eligible" : "Above ceiling"} tone={p.esiEligible ? undefined : "warn"} />
              <StatChip label="PT" value={inr(p.deductions.professionalTax)} />
              <StatChip label={p.lwfSource} value={inr(p.deductions.lwf)} />
            </div>
          )}
          {p?.structureName && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" /> Structure applied: <span className="font-medium text-foreground">{p.structureName}</span>
            </div>
          )}

          {hardBlocked && (
            <div className="rounded-xl border-2 border-destructive bg-destructive/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" /> Compliance block — cannot process payroll
              </div>
              {preflight.map((b) => (
                <div key={b.code} className="rounded-md bg-background/60 p-2 text-xs">
                  <div className="font-medium text-destructive">{b.title}</div>
                  <div className="text-muted-foreground mt-0.5">{b.detail}</div>
                  <div className="text-[10px] uppercase tracking-wide text-destructive/80 mt-1">Ref: {b.law}</div>
                </div>
              ))}
              <div className="text-[11px] text-muted-foreground">Resolve in the Employees module (age, DOB, activation) and try again.</div>
            </div>
          )}

          {p && p.age !== undefined && (
            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-primary/40 pl-2">
              <span>Age <span className="font-medium text-foreground">{p.age}</span></span>
              <span>EPS eligible: <span className={p.epsEligible ? "text-emerald-600" : "text-yellow-600"}>{p.epsEligible ? "Yes" : "Age ≥ 58 — stopped"}</span></span>
              {p.age < 18 && <span className="text-destructive font-medium">Minor — restricted work rules apply</span>}
            </div>
          )}

          {p && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> AI Payroll Audit
                <span className="ml-auto text-xs text-muted-foreground">{issues.length} finding(s)</span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {issues.map((i, idx) => (
                  <div key={idx} className={`flex gap-2 rounded-md p-2 text-xs ${
                    i.level === "error" ? "bg-destructive/10 text-destructive"
                    : i.level === "warn" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                    : "bg-muted/60"
                  }`}>
                    {i.level === "error" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      : i.level === "warn" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <div className="font-medium">{i.title}</div>
                      <div className="opacity-80">{i.detail}</div>
                      {i.suggestion && <div className="opacity-70 mt-0.5 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5" /> {i.suggestion}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {hasWarnings && !hasErrors && (
                <label className="flex items-center gap-2 text-xs pt-1">
                  <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                  I have reviewed the AI warnings and want to proceed.
                </label>
              )}
            </div>
          )}

          {p && explanations.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5">
              <button type="button" onClick={() => setShowExplain((s) => !s)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium">
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI explains every line ({explanations.length})</span>
                <span className="text-xs text-muted-foreground">{showExplain ? "Hide" : "Show"}</span>
              </button>
              {showExplain && (
                <div className="border-t border-primary/20 px-3 py-2 space-y-1.5 max-h-72 overflow-y-auto">
                  {explanations.map((x) => (
                    <div key={x.id} className="text-xs flex gap-1.5">
                      <Info className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{x.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button className="w-full bg-gradient-brand text-white shadow-glow" onClick={process} disabled={hasErrors || hardBlocked}>
            <FileDown className="mr-2 h-4 w-4" /> {hardBlocked ? "Compliance blocked" : "Process & Download Payslip"}
          </Button>
        </div>

        {p && emp && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="font-display font-semibold">{emp.name}</div>
                <div className="text-xs text-muted-foreground">{emp.empCode} · {emp.designation}</div>
              </div>
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <Section title="Earnings">
              {p.earningsList.map((row) => (
                <Row key={row.id} label={row.name} value={row.amount} />
              ))}
              <Row label="Gross Earnings" value={p.gross} bold />
            </Section>
            <Section title="Deductions">
              {company.pfRules.enabled && <Row label={`Employee PF (${company.pfRules.employeePct}% of ₹${Math.round(p.pfBase)})`} value={p.deductions.employeePF} />}
              {company.esiRules.enabled && <Row label={`Employee ESI (${company.esiRules.employeePct}%)${p.esiEligible ? "" : " — not eligible"}`} value={p.deductions.employeeESI} />}
              <Row label="Professional Tax" value={p.deductions.professionalTax} />
              {company.tdsRules.enabled && <Row label="TDS (monthly)" value={p.deductions.tds} />}
              {company.lwfRules.enabled && <Row label="LWF" value={p.deductions.lwf} />}
              <Row label="Loan" value={p.deductions.loan} />
              <Row label="Advance" value={p.deductions.advance} />
              {p.extraDeductions.map((d) => <Row key={d.id} label={d.name} value={d.amount} />)}
              <Row label="Total Deductions" value={p.totalDeductions} bold />
            </Section>
            <div className="rounded-xl bg-gradient-brand p-4 text-white flex justify-between">
              <span>Net Salary Payable</span>
              <span className="font-display text-xl font-semibold">{inr(p.net)}</span>
            </div>
            <Section title="Employer Contribution (part of CTC)">
              {company.pfRules.enabled && <Row label={`Employer PF total (${company.pfRules.employerPct}%)`} value={p.employerContrib.employerPF} />}
              {company.pfRules.enabled && p.employerContrib.eps > 0 && <Row label="  ↳ EPS diversion (8.33% cap ₹1,250)" value={p.employerContrib.eps} />}
              {company.pfRules.enabled && <Row label="  ↳ EPF (employer share)" value={p.employerContrib.epfEmployer} />}
              {company.pfRules.enabled && <Row label="EDLI (0.5% cap ₹75)" value={p.employerContrib.edli} />}
              {company.pfRules.enabled && <Row label="PF Admin (0.5%)" value={p.employerContrib.pfAdmin} />}
              {company.esiRules.enabled && <Row label={`Employer ESI (${company.esiRules.employerPct}%)`} value={p.employerContrib.employerESI} />}
              {company.lwfRules.enabled && <Row label="Employer LWF" value={p.employerContrib.employerLwf} />}
              {company.gratuityRules.enabled && <Row label={`Gratuity (${company.gratuityRules.numerator}/${company.gratuityRules.denominator} monthly)`} value={p.employerContrib.gratuity} />}
              <Row label="Monthly CTC" value={p.monthlyCTC} bold />
              <Row label="Annual CTC" value={p.annualCTC} bold />
            </Section>
          </div>
        )}
      </div>

      {emp && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Payroll Decision — inline salary revision
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Change {emp.name}'s pay right here. AI shows the impact live on gross, net, PF/ESI/PT/TDS and employer cost before you apply.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">Current Basic: {inr(emp.basic)}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Amount (₹, +/-)</Label>
              <Input type="number" value={revAmount} onChange={(e) => setRevAmount(+e.target.value || 0)} placeholder="e.g. 5000" />
            </div>
            <div>
              <Label className="text-xs">Apply to</Label>
              <Select value={revTarget} onValueChange={(v) => setRevTarget(v as RevisionTarget)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(revisionTargetLabels) as RevisionTarget[]).map((k) => (
                    <SelectItem key={k} value={k}>{revisionTargetLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={revReason} onValueChange={(v) => setRevReason(v as RevisionReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(revisionReasonLabels) as RevisionReason[]).map((k) => (
                    <SelectItem key={k} value={k}>{revisionReasonLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Effective from</Label>
              <Input type="date" value={revEffective} onChange={(e) => setRevEffective(e.target.value)} />
            </div>
          </div>

          {sim ? (
            <>
              <div className="grid gap-2 md:grid-cols-4">
                <DiffTile label="Gross" before={sim.before.gross} after={sim.after.gross} d={sim.diff.gross} />
                <DiffTile label="Net take-home" before={sim.before.net} after={sim.after.net} d={sim.diff.net} />
                <DiffTile label="Employer cost" before={sim.before.totalEmployer} after={sim.after.totalEmployer} d={sim.diff.employerCost} />
                <DiffTile label="Annual CTC" before={sim.before.annualCTC} after={sim.after.annualCTC} d={sim.diff.annualCTC} />
              </div>
              <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
                <div className="text-xs font-medium flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> AI impact analysis</div>
                {sim.recommendations.map((r, i) => (
                  <div key={i} className="text-xs flex items-start gap-1.5 text-muted-foreground">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" /> {r}
                  </div>
                ))}
              </div>
              <Button onClick={applyRev} className="bg-gradient-brand text-white">
                Apply revision & update payroll
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground text-center">
              Enter a non-zero amount above to see the live AI decision.
            </div>
          )}

          {empRevisions.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <div className="text-xs font-medium mb-2">Recent revisions</div>
              <div className="space-y-1.5">
                {empRevisions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium">{revisionReasonLabels[r.reason]}</span>
                      <span className="text-muted-foreground"> · {revisionTargetLabels[r.target]} · ₹{r.amount.toLocaleString("en-IN")}</span>
                      <span className="text-muted-foreground"> · {new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === "applied" ? "default" : "secondary"} className="text-[10px] uppercase">{r.status}</Badge>
                      {r.status === "applied" && (
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { rollbackSalaryRevision(r.id); toast.success("Rolled back"); }}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffTile({ label, before, after, d }: { label: string; before: number; after: number; d: number }) {
  const up = d > 0.5, down = d < -0.5;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{inr(after)}</div>
      <div className="text-[10px] text-muted-foreground">was {inr(before)}</div>
      <div className={`text-xs mt-1 flex items-center gap-1 ${up ? "text-emerald-600 dark:text-emerald-400" : down ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : null}
        {d >= 0 ? "+" : ""}{inr(d)}
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(+e.target.value || 0)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold border-t border-border pt-1 mt-1" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{inr(value)}</span>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: "brand" | "warn" }) {
  const cls = tone === "brand"
    ? "bg-gradient-brand text-white border-transparent"
    : tone === "warn"
    ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
    : "bg-muted/50 border-border";
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${cls}`}>
      <div className={`text-[10px] uppercase ${tone === "brand" ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="text-xs font-semibold truncate">{value}</div>
    </div>
  );
}
