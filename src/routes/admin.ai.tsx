import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { buildAiSnapshot, healthScores, type AiAlert } from "@/lib/ai-context";
import { askSwiftAi } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ShieldCheck, Users, Calculator, CalendarCheck, AlertTriangle, Info, TrendingUp, Send, Loader2, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "SWIFT AI · Copilot" }] }),
  component: AiDashboard,
});

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_ASKS = [
  "Give me the payroll health summary for this month.",
  "Which compliance items expire soonest?",
  "List employees who joined this month.",
  "Draft a bullet action plan to raise our compliance score by 10 points.",
  "Which employees are eligible for confirmation?",
  "Summarise today's attendance anomalies.",
];

function AiDashboard() {
  const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();
  const snapshot = useMemo(
    () => buildAiSnapshot({ company, employees, attendance, payrolls, leaves, docRequests, role: "admin" }),
    [company, employees, attendance, payrolls, leaves, docRequests]
  );
  const scores = useMemo(() => healthScores(snapshot), [snapshot]);

  const ask = useServerFn(askSwiftAi);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { messages: next, snapshot } });
      setMessages((m) => [...m, { role: "assistant", content: res.ok ? res.content : `⚠️ ${res.error}` }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...snapshot.alerts].sort((a, b) => rank(a) - rank(b));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="font-display text-3xl font-semibold">SWIFT AI Copilot</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Live intelligence for <strong>{company.name}</strong>. Ask anything — every answer is grounded in your tenant's data only.
          </p>
        </div>
        <div className="text-xs text-muted-foreground rounded-lg border border-border px-3 py-2">
          Data scope: {snapshot.headcount.total} employees · {snapshot.payroll.processedThisMonth} payroll runs · {snapshot.documents.pendingApproval} pending docs
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard icon={ShieldCheck} title="Compliance" score={scores.compliance} tone="primary" />
        <ScoreCard icon={CalendarCheck} title="Attendance (7d)" score={scores.attendance} tone="emerald" />
        <ScoreCard icon={Calculator} title="Payroll" score={scores.payroll} tone="violet" />
        <ScoreCard icon={Users} title="HR Health" score={scores.hr} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card flex flex-col h-[560px]">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <div className="font-display font-semibold text-sm">Ask SWIFT AI</div>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Tenant-isolated</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Start with a quick ask:</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {QUICK_ASKS.map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-left text-sm rounded-lg border border-border p-2.5 hover:bg-muted transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <Bot className="h-5 w-5 shrink-0 text-primary mt-1" />}
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-table:my-2 prose-headings:my-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {busy && <div className="flex gap-2 items-center text-muted-foreground text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reasoning over your live tenant data…</div>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 border-t border-border flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Show employees whose probation ends this week" disabled={busy} />
            <Button type="submit" disabled={busy || !input.trim()} className="bg-gradient-brand text-white shadow-glow"><Send className="h-4 w-4" /></Button>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-card flex flex-col h-[560px]">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div className="font-display font-semibold text-sm">AI Recommendations</div>
            <span className="ml-auto text-xs text-muted-foreground">{sorted.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sorted.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 text-center">All clear — no anomalies detected.</div>
            )}
            {sorted.map((a) => <AlertRow key={a.id} a={a} />)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Attendance Today" rows={[
          ["Present", snapshot.attendance.today.present],
          ["Absent", snapshot.attendance.today.absent],
          ["On leave", snapshot.attendance.today.leave],
          ["Half day", snapshot.attendance.today.halfDay],
          ["Late arrivals", snapshot.attendance.today.late],
        ]} />
        <MetricCard title="Payroll (this month)" rows={[
          ["Processed", snapshot.payroll.processedThisMonth],
          ["Pending", snapshot.payroll.pending],
          ["Total gross (₹)", Math.round(snapshot.payroll.totalMonthlyGross).toLocaleString("en-IN")],
        ]} />
        <MetricCard title="Employee Data Gaps" rows={[
          ["Missing Aadhaar", snapshot.compliance.missingAadhaar],
          ["Missing PAN", snapshot.compliance.missingPan],
          ["Missing Bank", snapshot.compliance.missingBank],
          ["PF issues", snapshot.compliance.pfIssues],
          ["ESI breaches", snapshot.compliance.esiBreaches],
        ]} />
      </div>
    </div>
  );
}

function rank(a: AiAlert) { return a.level === "critical" ? 0 : a.level === "warn" ? 1 : 2; }

function ScoreCard({ icon: Icon, title, score, tone }: { icon: typeof Sparkles; title: string; score: number; tone: string }) {
  const ring = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        <Icon className={`h-4 w-4 ${ring}`} /> {title}
      </div>
      <div className={`font-display text-3xl font-semibold mt-1 ${ring}`}>{score}<span className="text-sm text-muted-foreground font-normal">/100</span></div>
      <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
        <div className={`h-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${score}%` }} />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{tone}</div>
    </div>
  );
}

function AlertRow({ a }: { a: AiAlert }) {
  const styles = a.level === "critical" ? "bg-destructive/10 text-destructive"
    : a.level === "warn" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    : "bg-muted/60";
  const Icon = a.level === "info" ? Info : AlertTriangle;
  return (
    <div className={`rounded-lg p-2.5 text-xs ${styles}`}>
      <div className="flex gap-2">
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{a.title}</div>
          <div className="opacity-80">{a.detail}</div>
          {a.action && <div className="opacity-70 mt-1">→ {a.action}</div>}
          <div className="mt-1 uppercase tracking-wider text-[9px] opacity-60">{a.category}</div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="font-display font-semibold text-sm mb-2">{title}</div>
      <div className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
