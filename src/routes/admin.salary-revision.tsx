import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { inr } from "@/lib/payroll";
import {
  simulateRevision,
  revisionReasonLabels,
  revisionTargetLabels,
  type RevisionReason,
  type RevisionTarget,
  type SalaryRevisionDraft,
} from "@/lib/salary-revision";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, RotateCcw, AlertTriangle, History, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/salary-revision")({
  head: () => ({ meta: [{ title: "Salary Revision · SWIFT AI" }] }),
  component: SalaryRevisionPage,
});

type Step = 1 | 2 | 3 | 4 | 5;

function SalaryRevisionPage() {
  const { employees, company, salaryRevisions, applySalaryRevision, rollbackSalaryRevision } = useStore();
  const [step, setStep] = useState<Step>(1);
  const [empId, setEmpId] = useState(employees[0]?.id || "");
  const [amount, setAmount] = useState(1000);
  const [target, setTarget] = useState<RevisionTarget>("special");
  const [reason, setReason] = useState<RevisionReason>("increment");
  const [reasonNote, setReasonNote] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [flags, setFlags] = useState({
    arrears: false,
    retro: false,
    recalcAttendance: true,
    recalcLeave: true,
    recalcOt: false,
    recalcBonus: false,
    recalcIncentive: false,
    updateTaxProjection: true,
    applyToFuture: true,
  });
  const [confirmed, setConfirmed] = useState(false);

  const emp = employees.find((e) => e.id === empId);
  const sim = useMemo(() => (emp ? simulateRevision(company, emp, { amount, target }) : null), [company, emp, amount, target]);

  const empHistory = salaryRevisions.filter((r) => r.employeeId === empId);

  const apply = () => {
    if (!emp) return;
    const draft: SalaryRevisionDraft = {
      employeeId: emp.id, amount, target, reason, reasonNote,
      effectiveDate, ...flags,
    };
    const rev = applySalaryRevision(draft, "AI Payroll Officer");
    if (rev) {
      toast.success(`Revision applied · ${emp.name}`);
      setStep(1);
      setConfirmed(false);
    }
  };

  if (employees.length === 0) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">Add employees first.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> AI Salary Revision Engine
          </h1>
          <p className="text-sm text-muted-foreground">SWIFT AI acts as your payroll officer — it analyses statutory impact and asks before changing anything.</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={`h-1.5 w-8 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          {step === 1 && (
            <>
              <StepTitle n={1} title="Who and how much?" hint="AI will analyse the impact before anything is saved." />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Employee</Label>
                  <Select value={empId} onValueChange={setEmpId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name} · {e.empCode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (₹, per month)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value || 0)} />
                </div>
              </div>
              {emp && (
                <div className="rounded-xl bg-muted/50 p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Stat label="Basic" v={inr(emp.basic)} />
                  <Stat label="Dept" v={emp.department} />
                  <Stat label="Designation" v={emp.designation} />
                  <Stat label="Status" v={emp.status} />
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <StepTitle n={2} title="Reason for revision" hint="AI logs this in the revision history and approval trail." />
              <div>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as RevisionReason)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(revisionReasonLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Textarea value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} placeholder="Context, board approval reference, etc." />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <StepTitle n={3} title="How should ₹ be applied?" hint="Choose the component — AI recomputes PF/ESI/PT/TDS impact instantly." />
              <div className="grid gap-2">
                {(Object.keys(revisionTargetLabels) as RevisionTarget[]).map((t) => (
                  <label key={t} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-sm ${target === t ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name="target" checked={target === t} onChange={() => setTarget(t)} className="mt-1" />
                    <div>
                      <div className="font-medium">{revisionTargetLabels[t]}</div>
                      <div className="text-xs text-muted-foreground">{targetHint(t)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <StepTitle n={4} title="Effective date & recomputation" hint="AI can trigger retro payroll, arrears, and downstream recalcs." />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Effective Date</Label>
                  <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                </div>
                <FlagBox label="Arrears required" k="arrears" flags={flags} setFlags={setFlags} />
                <FlagBox label="Retro payroll" k="retro" flags={flags} setFlags={setFlags} />
                <FlagBox label="Recalculate attendance" k="recalcAttendance" flags={flags} setFlags={setFlags} />
                <FlagBox label="Recalculate leave deduction" k="recalcLeave" flags={flags} setFlags={setFlags} />
                <FlagBox label="Recalculate overtime" k="recalcOt" flags={flags} setFlags={setFlags} />
                <FlagBox label="Recalculate bonus" k="recalcBonus" flags={flags} setFlags={setFlags} />
                <FlagBox label="Recalculate incentives" k="recalcIncentive" flags={flags} setFlags={setFlags} />
                <FlagBox label="Update tax projection" k="updateTaxProjection" flags={flags} setFlags={setFlags} />
                <FlagBox label="Apply to all future payrolls" k="applyToFuture" flags={flags} setFlags={setFlags} />
              </div>
            </>
          )}

          {step === 5 && sim && emp && (
            <>
              <StepTitle n={5} title="AI Simulation & Confirmation" hint="Review the before/after snapshot. Nothing is saved until you confirm." />
              <div className="grid gap-3 sm:grid-cols-2">
                <SimCard title="Before" c={sim.before} />
                <SimCard title="After" c={sim.after} highlight />
              </div>
              <div className="rounded-xl border border-border p-3 space-y-1.5 text-sm">
                <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Recommendations</div>
                {sim.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <Delta label="Δ Gross" v={sim.diff.gross} />
                <Delta label="Δ Net" v={sim.diff.net} />
                <Delta label="Δ Employer PF" v={sim.diff.employerPF} />
                <Delta label="Δ Employer Cost" v={sim.diff.employerCost} />
                <Delta label="Δ Annual CTC" v={sim.diff.annualCTC} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                I have reviewed the AI analysis and confirm this revision for {emp.name}.
              </label>
            </>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => (s - 1) as Step)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < 5 ? (
              <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!emp || (step === 1 && !amount)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={apply} disabled={!confirmed} className="bg-gradient-brand text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Apply Revision
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4 text-primary" /> Revision History
          </div>
          {empHistory.length === 0 ? (
            <div className="text-xs text-muted-foreground">No revisions yet for this employee.</div>
          ) : (
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {empHistory.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{revisionReasonLabels[r.reason]}</span>
                    <span className={`text-[10px] uppercase tracking-wider ${r.status === "rolled_back" ? "text-destructive" : "text-primary"}`}>{r.status}</span>
                  </div>
                  <div className="text-muted-foreground">
                    +{inr(r.amount)} via {revisionTargetLabels[r.target]}
                  </div>
                  <div className="text-muted-foreground">
                    Basic: {inr(r.beforeBasic)} → {inr(r.afterBasic)} · Eff {r.effectiveDate}
                  </div>
                  {r.status === "applied" && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { rollbackSalaryRevision(r.id); toast.success("Rolled back"); }}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Step {n}</div>
      <div className="font-display text-xl font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string | number }) {
  return <div><div className="text-muted-foreground">{label}</div><div className="font-medium">{v}</div></div>;
}

function FlagBox<T extends Record<string, boolean>>({ label, k, flags, setFlags }: { label: string; k: keyof T & string; flags: T; setFlags: React.Dispatch<React.SetStateAction<T>> }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
      <input type="checkbox" checked={!!flags[k]} onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })} />
      {label}
    </label>
  );
}


function SimCard({ title, c, highlight }: { title: string; c: ReturnType<typeof simulateRevision>["before"]; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 space-y-1 text-sm ${highlight ? "border-primary bg-primary/5" : "border-border"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      <Row label="Gross" v={c.gross} />
      <Row label="Employee PF" v={c.deductions.employeePF} />
      <Row label="Employee ESI" v={c.deductions.employeeESI} />
      <Row label="PT" v={c.deductions.professionalTax} />
      <Row label="TDS" v={c.deductions.tds} />
      <Row label="Net" v={c.net} bold />
      <Row label="Employer Cost" v={c.totalEmployer} />
      <Row label="Monthly CTC" v={c.monthlyCTC} />
    </div>
  );
}

function Row({ label, v, bold }: { label: string; v: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold border-t border-border pt-1 mt-1" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{inr(v)}</span>
    </div>
  );
}

function Delta({ label, v }: { label: string; v: number }) {
  const positive = v >= 0;
  return (
    <div className={`rounded-lg p-2 ${positive ? "bg-primary/10" : "bg-destructive/10"}`}>
      <div className="text-muted-foreground">{label}</div>
      <div className={`font-semibold ${positive ? "text-primary" : "text-destructive"}`}>
        {positive ? "+" : ""}{inr(v)}
      </div>
    </div>
  );
}

function targetHint(t: RevisionTarget): string {
  const map: Record<RevisionTarget, string> = {
    basic: "Increases PF, ESI base, gratuity, and downstream % components.",
    gross: "Adds a flat monthly earning; counts in PF & ESI bases.",
    ctc: "Treats delta as CTC-only loading; no PF/ESI/gratuity impact.",
    special: "Adds Special Allowance; usually counts in PF & ESI.",
    fixed: "Fixed monthly earning; ESI eligible, PF excluded.",
    performance: "Variable performance component; ESI eligible.",
    noPfEsi: "Taxable allowance excluded from PF and ESI bases.",
    proportional: "Scales Basic so gross rises by the target amount, preserving % structure.",
  };
  return map[t];
}

// suppress unused import warning for AlertTriangle in strict builds
void AlertTriangle;
