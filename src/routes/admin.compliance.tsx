import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useCompliance } from "@/lib/compliance-store";
import {
  ACT_LIBRARY, buildCalendar, evaluateApplicability, analyzeRisks, complianceScore,
  DEFAULT_TRIGGERS,
  type CalendarEvent, type FormTemplate, type ComplianceEventKey, type FilingFrequency,
  type ComplianceModuleKey,
} from "@/lib/compliance";
import { generateComplianceFormPDF } from "@/lib/compliance-forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ShieldCheck, CalendarClock, FileWarning, Sparkles, Library, Archive, Bell, ClipboardList,
  AlertTriangle, CheckCircle2, Clock, Download, Filter, Zap, Plus, Settings2, Trash2, Rocket, BookOpen,
} from "lucide-react";
import { ComplianceMasterTab } from "@/components/compliance-master-tab";
import { MonthlyReportTab } from "@/components/monthly-compliance-report";
import { FileSpreadsheet } from "lucide-react";


export const Route = createFileRoute("/admin/compliance")({
  head: () => ({ meta: [{ title: "Compliance · SWIFT AI" }] }),
  component: CompliancePage,
});

const PRIORITY_COLOR: Record<CalendarEvent["priority"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICON = {
  filed: <CheckCircle2 className="h-3.5 w-3.5" />,
  overdue: <AlertTriangle className="h-3.5 w-3.5" />,
  due: <Clock className="h-3.5 w-3.5" />,
  upcoming: <CalendarClock className="h-3.5 w-3.5" />,
  waived: <Archive className="h-3.5 w-3.5" />,
} as const;

function CompliancePage() {
  const { employees, company } = useStore();
  const {
    profile, setProfile, reminderSettings, setReminderSettings, channels, setChannel,
    triggers, updateTrigger, resetTriggers,
    customForms, addCustomForm, updateCustomForm, deleteCustomForm, allForms,
    fireEvent,
    fileEvent, waiveEvent, effectiveStatus, addDocument, documents, deleteDocument, audit, addAudit,
    rules, toggleRule, deleteRule,
    knowledge, deleteKnowledge,
    formVersions, deleteFormVersion,
  } = useCompliance();

  const forms = allForms();
  const applicability = useMemo(() => evaluateApplicability(profile), [profile]);
  const applicableKeys = useMemo(() => new Set(applicability.filter((a) => a.applicable).map((a) => a.key)), [applicability]);
  const calendar = useMemo(() => buildCalendar(profile, forms), [profile, forms]);
  const enriched = calendar.map((e) => ({ ...e, status: effectiveStatus(e) }));

  const missing = useMemo(() => ({
    uan: employees.filter((e) => !e.uan).length,
    esic: employees.filter((e) => !e.esic).length,
    aadhaar: employees.filter((e) => !e.aadhaar).length,
    pan: employees.filter((e) => !e.pan).length,
  }), [employees]);

  const risks = useMemo(() => analyzeRisks({
    profile,
    missingUAN: missing.uan, missingESIC: missing.esic,
    missingAadhaar: missing.aadhaar, missingPAN: missing.pan,
    expiredLicenses: documents.filter((d) => d.expiryDate && d.expiryDate < new Date().toISOString().slice(0, 10)).length,
    overdueFilings: enriched.filter((e) => e.status === "overdue").length,
    latePayrollRuns: 0, unapprovedOT: 0,
  }), [profile, missing, documents, enriched]);

  const score = complianceScore(risks, enriched.filter((e) => e.status === "overdue").length);

  const dueToday = enriched.filter((e) => e.status === "due");
  const overdue = enriched.filter((e) => e.status === "overdue");
  const upcoming = enriched.filter((e) => e.status === "upcoming").slice(0, 20);
  const activeTriggers = triggers.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> AI Compliance & Statutory Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">Event- and time-triggered filings, extensible government forms library, all settings-driven.</p>
        </div>
        <ScoreDial value={score} />
      </header>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="Applicable acts" value={applicability.filter((a) => a.applicable).length} />
        <Stat label="Active triggers" value={activeTriggers} />
        <Stat label="Due today" value={dueToday.length} tone={dueToday.length ? "warn" : "ok"} />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "bad" : "ok"} />
        <Stat label="Upcoming (120d)" value={upcoming.length} />
        <Stat label="Risk findings" value={risks.length} tone={risks.some((r) => r.severity === "critical") ? "bad" : "ok"} />
      </div>

      <Tabs defaultValue="applicability">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="applicability"><ClipboardList className="h-4 w-4 mr-1" />Applicability</TabsTrigger>
          <TabsTrigger value="master"><BookOpen className="h-4 w-4 mr-1" />Master Registry</TabsTrigger>
          <TabsTrigger value="monthly"><FileSpreadsheet className="h-4 w-4 mr-1" />Monthly Report</TabsTrigger>
          <TabsTrigger value="triggers"><Zap className="h-4 w-4 mr-1" />Triggers</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarClock className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
          <TabsTrigger value="forms"><Library className="h-4 w-4 mr-1" />Forms</TabsTrigger>
          <TabsTrigger value="repository"><Archive className="h-4 w-4 mr-1" />Repository</TabsTrigger>
          <TabsTrigger value="risk"><FileWarning className="h-4 w-4 mr-1" />Risk</TabsTrigger>
          <TabsTrigger value="reminders"><Bell className="h-4 w-4 mr-1" />Reminders</TabsTrigger>
          <TabsTrigger value="rules"><Rocket className="h-4 w-4 mr-1" />Rule Engine</TabsTrigger>
          <TabsTrigger value="knowledge"><Library className="h-4 w-4 mr-1" />Knowledge Base</TabsTrigger>
          <TabsTrigger value="versions"><Settings2 className="h-4 w-4 mr-1" />Versions</TabsTrigger>
          <TabsTrigger value="audit"><ShieldCheck className="h-4 w-4 mr-1" />Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="master"><ComplianceMasterTab /></TabsContent>
        <TabsContent value="monthly"><MonthlyReportTab /></TabsContent>



        {/* ── Applicability ─────────────────────────────────────────────── */}
        <TabsContent value="applicability" className="space-y-4">
          <div className="rounded-2xl border p-4 bg-card grid sm:grid-cols-3 gap-3">
            <Field label="State"><Input value={profile.state} onChange={(e) => setProfile({ state: e.target.value })} /></Field>
            <Field label="Industry">
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={profile.industry} onChange={(e) => setProfile({ industry: e.target.value as never })}>
                {["manufacturing","it_services","retail","logistics","healthcare","hospitality","construction","other"].map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Establishment">
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={profile.establishmentType} onChange={(e) => setProfile({ establishmentType: e.target.value as never })}>
                {["factory","shop","office","warehouse"].map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Employees"><Input type="number" value={profile.employeeCount} onChange={(e) => setProfile({ employeeCount: +e.target.value })} /></Field>
            <Field label="Women employees"><Input type="number" value={profile.womenEmployees} onChange={(e) => setProfile({ womenEmployees: +e.target.value })} /></Field>
            <Field label="Weekly hours"><Input type="number" value={profile.weeklyHours} onChange={(e) => setProfile({ weeklyHours: +e.target.value })} /></Field>
            <Field label="Apprentices"><Input type="number" value={profile.apprentices} onChange={(e) => setProfile({ apprentices: +e.target.value })} /></Field>
            <Field label="Contractor workers"><Input type="number" value={profile.contractorCount ?? 0} onChange={(e) => setProfile({ contractorCount: +e.target.value, contractLabour: +e.target.value > 0 })} /></Field>
            <Field label="Consultants"><Input type="number" value={profile.consultants} onChange={(e) => setProfile({ consultants: +e.target.value })} /></Field>
            <div className="sm:col-span-3 flex flex-wrap gap-3">
              {(["shiftOperations","hazardous","manufacturing","powerUsed","seasonal","interStateMigrants"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!profile[k]} onChange={(e) => setProfile({ [k]: e.target.checked } as never)} />{k}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr><th className="text-left px-3 py-2">Act</th><th className="text-left px-3 py-2">Authority</th><th className="text-left px-3 py-2">Applicable</th><th className="text-left px-3 py-2">Why</th></tr>
              </thead>
              <tbody>
                {applicability.map((a) => (
                  <tr key={a.key} className="border-t">
                    <td className="px-3 py-2"><div className="font-medium">{a.short}</div><div className="text-xs text-muted-foreground">{a.act}</div></td>
                    <td className="px-3 py-2 text-xs">{a.authority}</td>
                    <td className="px-3 py-2">{a.applicable ? <Badge className="bg-emerald-500/15 text-emerald-600">Yes</Badge> : <Badge variant="outline">No</Badge>}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{a.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Triggers (event + time-bound) ─────────────────────────────── */}
        <TabsContent value="triggers" className="space-y-3">
          <div className="rounded-2xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Compliance Automation Triggers</div>
              <div className="text-xs text-muted-foreground">Every event (join, exit, maternity, accident, wages paid, licence expiring…) can auto-generate the right statutory form and notify chosen channels. Time-bound filings still run via the Calendar.</div>
            </div>
            <div className="flex gap-2">
              <FireEventDialog onFire={(ev, subject, note) => { const ids = fireEvent(ev, { subject, by: "admin", note }); toast.success(ids.length ? `Fired ${ev} → ${ids.length} form(s)` : `Trigger disabled for ${ev}`); }} />
              <Button variant="outline" size="sm" onClick={() => { resetTriggers(); toast.info("Triggers reset to defaults"); }}>Reset</Button>
            </div>
          </div>

          {triggers.map((t) => {
            const matching = t.forms.length ? t.forms : forms.filter((f) => f.eventTrigger === t.event).map((f) => f.id);
            return (
              <div key={t.event} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{t.label}</span>
                      <Badge className={PRIORITY_COLOR[t.priority]}>{t.priority}</Badge>
                      <Badge variant="outline" className="text-xs">{matching.length} form(s)</Badge>
                      {t.autoFile && <Badge variant="outline" className="text-xs">auto-file</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch checked={t.enabled} onCheckedChange={(v) => updateTrigger(t.event, { enabled: v })} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-4 gap-2 mt-3">
                  <Field label="Fire offset (days)">
                    <Input type="number" value={t.daysOffset} onChange={(e) => updateTrigger(t.event, { daysOffset: +e.target.value })} />
                  </Field>
                  <Field label="Escalate after (days)">
                    <Input type="number" value={t.escalateAfterDays ?? 0} onChange={(e) => updateTrigger(t.event, { escalateAfterDays: +e.target.value || undefined })} />
                  </Field>
                  <Field label="Priority">
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={t.priority} onChange={(e) => updateTrigger(t.event, { priority: e.target.value as never })}>
                      {["low","medium","high","critical"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Auto-file on generation">
                    <div className="h-10 flex items-center"><Switch checked={t.autoFile} onCheckedChange={(v) => updateTrigger(t.event, { autoFile: v })} /></div>
                  </Field>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(Object.keys(t.channels) as (keyof typeof t.channels)[]).map((c) => (
                    <label key={c} className="flex items-center gap-1.5 text-xs capitalize">
                      <input type="checkbox" checked={t.channels[c]} onChange={(e) => updateTrigger(t.event, { channels: { ...t.channels, [c]: e.target.checked } })} />{c}
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Forms bound to this event</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {forms.filter((f) => f.eventTrigger === t.event).map((f) => {
                      const on = t.forms.length === 0 || t.forms.includes(f.id);
                      return (
                        <button key={f.id} type="button"
                          onClick={() => {
                            const cur = t.forms.length === 0 ? forms.filter((x) => x.eventTrigger === t.event).map((x) => x.id) : t.forms;
                            const next = on ? cur.filter((id) => id !== f.id) : Array.from(new Set([...cur, f.id]));
                            updateTrigger(t.event, { forms: next });
                          }}
                          className={`text-xs border rounded px-2 py-0.5 ${on ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {f.formName}
                        </button>
                      );
                    })}
                    {forms.filter((f) => f.eventTrigger === t.event).length === 0 && (
                      <span className="text-xs text-muted-foreground">No forms bound yet. Add a custom form under Forms tab with this event trigger.</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ── Calendar ──────────────────────────────────────────────────── */}
        <TabsContent value="calendar" className="space-y-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Next 120 days · applicable acts only.</div>
          <div className="rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr><th className="text-left px-3 py-2">Due</th><th className="text-left px-3 py-2">Form</th><th className="text-left px-3 py-2">Frequency</th><th className="text-left px-3 py-2">Priority</th><th className="text-left px-3 py-2">Status</th><th></th></tr>
              </thead>
              <tbody>
                {enriched.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{e.dueDate}</td>
                    <td className="px-3 py-2">{e.formName}</td>
                    <td className="px-3 py-2 text-xs uppercase text-muted-foreground">{e.frequency.replace("_", " ")}</td>
                    <td className="px-3 py-2"><span className={`text-xs border rounded px-2 py-0.5 ${PRIORITY_COLOR[e.priority]}`}>{e.priority}</span></td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1 text-xs">{STATUS_ICON[e.status]}{e.status}</span></td>
                    <td className="px-3 py-2 text-right">
                      <FileEventDialog event={e} onFile={(ref) => { fileEvent({ eventId: e.id, formId: e.formId, reference: ref, filedBy: "admin" }); toast.success("Filing recorded"); }} onWaive={(reason) => { waiveEvent(e.id, reason, "admin"); toast.info("Waived"); }} />
                    </td>
                  </tr>
                ))}
                {enriched.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">No filings in horizon.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Forms library ─────────────────────────────────────────────── */}
        <TabsContent value="forms" className="space-y-3">
          <div className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Government Form Library</div>
              <div className="text-xs text-muted-foreground">{forms.length} forms loaded ({customForms.length} custom). Add new forms as government releases them — no code change needed.</div>
            </div>
            <AddFormDialog onAdd={(f) => { addCustomForm(f); toast.success(`${f.formName} added to library`); }} />
          </div>

          {forms.filter((f) => f.moduleKey === "custom" || applicableKeys.has(f.moduleKey)).map((f) => (
            <FormCard key={f.id} form={f} companyName={company.name}
              onGenerate={() => {
                const filename = generateComplianceFormPDF({
                  form: f, company, profile, employees,
                  period: new Date().toISOString().slice(0, 7),
                });
                addDocument({ name: filename, category: "Statutory", tags: [f.moduleKey], moduleKey: f.moduleKey, uploadedBy: "SWIFT AI", version: 1, status: "generated" });
                addAudit({ by: "SWIFT AI", action: "generated", target: filename, reason: `Auto-fill: ${f.autoFillFields.join(", ") || "standard fields"}` });
                toast.success(`${f.formName} downloaded & logged in Repository.`);
              }}
              onDelete={f.custom ? () => { deleteCustomForm(f.id); toast.info("Custom form removed"); } : undefined}
              onEdit={f.custom ? (patch) => { updateCustomForm(f.id, patch); toast.success("Form updated"); } : undefined}
            />
          ))}
        </TabsContent>

        {/* ── Repository ────────────────────────────────────────────────── */}
        <TabsContent value="repository">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Category</th><th className="text-left px-3 py-2">Triggered by</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Version</th><th className="text-left px-3 py-2">Uploaded</th><th></th></tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="px-3 py-2">{d.name}</td>
                    <td className="px-3 py-2 text-xs">{d.category}</td>
                    <td className="px-3 py-2 text-xs">{d.triggeredBy ?? "—"}</td>
                    <td className="px-3 py-2 text-xs"><Badge variant="outline" className="text-xs">{d.status ?? "generated"}</Badge></td>
                    <td className="px-3 py-2 text-xs">v{d.version}</td>
                    <td className="px-3 py-2 text-xs">{d.uploadedAt.slice(0, 10)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => { addAudit({ by: "admin", action: "downloaded", target: d.name }); toast.success("Recorded download"); }}><Download className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDocument(d.id, "admin")}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">Repository empty. Fire a trigger or generate a form to populate it.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Risk ──────────────────────────────────────────────────────── */}
        <TabsContent value="risk" className="space-y-2">
          {risks.length === 0 && <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />No active compliance risks detected.</div>}
          {risks.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{r.area}</div>
                <div className="text-xs text-muted-foreground">{r.impact}</div>
                <div className="text-xs text-primary mt-1">→ {r.recommendation}</div>
              </div>
              <div className="text-right">
                <Badge className={PRIORITY_COLOR[r.severity as never]}>{r.severity}</Badge>
                <div className="text-xs text-muted-foreground mt-1">Score {r.score}</div>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── Reminders ─────────────────────────────────────────────────── */}
        <TabsContent value="reminders" className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 grid sm:grid-cols-2 gap-3">
            <Field label="Reminder ladder (days before due)">
              <Input value={reminderSettings.ladder.join(",")} onChange={(e) => setReminderSettings({ ladder: e.target.value.split(",").map((n) => +n.trim()).filter((n) => !Number.isNaN(n)) })} />
            </Field>
            <Field label="Grace period (days after due)"><Input type="number" value={reminderSettings.gracePeriodDays} onChange={(e) => setReminderSettings({ gracePeriodDays: +e.target.value })} /></Field>
            <Field label="Final warning (days into grace)"><Input type="number" value={reminderSettings.finalWarningDays} onChange={(e) => setReminderSettings({ finalWarningDays: +e.target.value })} /></Field>
            <Field label="Escalate to"><Input value={reminderSettings.escalateTo} onChange={(e) => setReminderSettings({ escalateTo: e.target.value })} placeholder="role or email" /></Field>
            <Field label="Quiet hours start"><Input type="time" value={reminderSettings.quietHoursStart} onChange={(e) => setReminderSettings({ quietHoursStart: e.target.value })} /></Field>
            <Field label="Quiet hours end"><Input type="time" value={reminderSettings.quietHoursEnd} onChange={(e) => setReminderSettings({ quietHoursEnd: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><Switch checked={reminderSettings.escalateOnOverdue} onCheckedChange={(v) => setReminderSettings({ escalateOnOverdue: v })} />Escalate on overdue</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={reminderSettings.weekendsOff} onCheckedChange={(v) => setReminderSettings({ weekendsOff: v })} />Skip weekends</label>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <Label className="mb-2 block text-xs">Global notification channels</Label>
            <div className="grid sm:grid-cols-5 gap-3">
              {(Object.keys(channels) as (keyof typeof channels)[]).map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm capitalize">
                  <input type="checkbox" checked={channels[c]} onChange={(e) => setChannel(c, e.target.checked)} />{c}
                </label>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Per-trigger channel overrides configured under the Triggers tab.</div>
          </div>
        </TabsContent>

        {/* ── Rule Engine ───────────────────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-3">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Compliance Rule Engine</h3>
                <p className="text-xs text-muted-foreground">Event · Time · Conditional · Manual rules with per-rule approval chain, escalation, and reminder ladder.</p>
              </div>
              <Badge variant="outline">{rules.filter((r) => r.active).length}/{rules.length} active</Badge>
            </div>
            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="rounded-xl border p-3 bg-background/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        <Badge variant="outline" className="text-[10px]">{r.act}{r.section ? ` · ${r.section}` : ""}</Badge>
                        <Badge className={PRIORITY_COLOR[r.priority]}>{r.priority}</Badge>
                        <Badge variant="outline" className="text-[10px]">risk: {r.risk}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.triggerTypes.join(" · ")}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        Events: {r.triggerEvents.join(", ") || "—"} · Forms: {r.generatedFormIds.length} · Approvers: {r.approvalChain.map((a) => a.role).join(" → ") || "—"}
                        {r.escalation ? ` · Escalate after ${r.escalation.afterDays}d → ${r.escalation.toRole}` : ""}
                      </div>
                      {r.aiSuggestions.length > 0 && (
                        <div className="text-[11px] text-primary mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />{r.aiSuggestions[0]}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={r.active} onCheckedChange={(v) => toggleRule(r.id, v)} />
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete rule "${r.name}"?`)) deleteRule(r.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {rules.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No rules defined.</div>}
            </div>
          </div>
        </TabsContent>

        {/* ── Knowledge Base ────────────────────────────────────────────── */}
        <TabsContent value="knowledge" className="space-y-3">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Compliance Knowledge Base</h3>
                <p className="text-xs text-muted-foreground">Acts, sections, amendments, notifications, penalties, inspections & AI explanation.</p>
              </div>
              <Badge variant="outline">{knowledge.length} acts indexed</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {knowledge.map((k) => (
                <div key={k.id} className="rounded-xl border p-3 bg-background/60 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{k.name}</div>
                      <div className="text-[11px] text-muted-foreground">{k.department}{k.state ? ` · ${k.state}` : " · Central"} · {k.version} · effective {k.effectiveDate}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{k.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{k.aiExplanation}</p>
                  <div className="text-[11px] flex flex-wrap gap-1">
                    {k.sections.slice(0, 3).map((s, i) => <Badge key={i} variant="secondary" className="text-[10px]">{s.split("–")[0].trim()}</Badge>)}
                    {k.requiredLicenses.map((l, i) => <Badge key={`l${i}`} variant="outline" className="text-[10px]">📄 {l}</Badge>)}
                  </div>
                  {k.penalties[0] && (
                    <div className="text-[11px] text-destructive/80">⚠ {k.penalties[0].violation}: {k.penalties[0].penalty}</div>
                  )}
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${k.name}" from knowledge base?`)) deleteKnowledge(k.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {knowledge.length === 0 && <div className="col-span-2 text-sm text-muted-foreground text-center py-8">No acts indexed.</div>}
            </div>
          </div>
        </TabsContent>

        {/* ── Form Version Control ──────────────────────────────────────── */}
        <TabsContent value="versions" className="space-y-3">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Form Version Management</h3>
                <p className="text-xs text-muted-foreground">Track PDF layouts, field mapping, validation & approval flow per form version.</p>
              </div>
              <Badge variant="outline">{formVersions.length} versions</Badge>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Form</th>
                    <th className="text-left px-3 py-2">Version</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Effective</th>
                    <th className="text-left px-3 py-2">Change summary</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {formVersions.map((v) => (
                    <tr key={v.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{v.formId}</td>
                      <td className="px-3 py-2 text-xs">{v.version}</td>
                      <td className="px-3 py-2 text-xs">
                        <Badge variant="outline" className="text-[10px] capitalize">{v.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{v.effectiveDate}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[280px]">{v.changeSummary || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this version?")) deleteFormVersion(v.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {formVersions.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No versions recorded yet. Add a version via <code>useCompliance.getState().addFormVersion(...)</code> or via the Government portal auto-sync scheduler.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">Target</th><th className="text-left px-3 py-2">By</th><th className="text-left px-3 py-2">Reason</th></tr></thead>
              <tbody>
                {audit.slice(0, 200).map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2 text-xs">{new Date(a.at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs uppercase">{a.action}</td>
                    <td className="px-3 py-2 text-xs">{a.target}</td>
                    <td className="px-3 py-2 text-xs">{a.by}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[280px]">{a.reason ?? "—"}</td>
                  </tr>
                ))}
                {audit.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">No compliance activity yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <AiComplianceChat profileHint={`${profile.state} · ${profile.industry} · ${profile.employeeCount} emp`} events={enriched} risks={risks} />
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "ok" | "warn" | "bad" | "neutral" }) {
  const cls = tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "";
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}

function ScoreDial({ value }: { value: number }) {
  const color = value >= 80 ? "text-emerald-500" : value >= 60 ? "text-amber-500" : "text-destructive";
  return (
    <div className="rounded-xl border bg-card px-4 py-2 flex items-center gap-3">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground leading-tight">Compliance<br />Score</div>
    </div>
  );
}

function FileEventDialog({ event, onFile, onWaive }: { event: CalendarEvent; onFile: (ref: string) => void; onWaive: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Record</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{event.formName}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Due {event.dueDate}</div>
          <div><Label>Reference / Challan #</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="TRRN / SRN" /></div>
          <div><Label>Or waive reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Not applicable this cycle" /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { if (!reason) return; onWaive(reason); setOpen(false); }}>Waive</Button>
          <Button onClick={() => { if (!ref) return; onFile(ref); setOpen(false); }}>Mark filed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormCard({ form, onGenerate, companyName, onDelete, onEdit }: {
  form: FormTemplate; onGenerate: () => void; companyName: string;
  onDelete?: () => void; onEdit?: (patch: Partial<FormTemplate>) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium flex items-center gap-2 flex-wrap">
          {form.formName}
          {form.custom && <Badge variant="outline" className="text-xs">custom</Badge>}
          <Badge variant="outline" className="text-xs">{form.moduleKey}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">{form.purpose} · {form.frequency.replace("_", " ")}{form.eventTrigger ? ` · on ${form.eventTrigger}` : ""} · v{form.version}</div>
        <div className="text-xs text-muted-foreground mt-1">Auto-fill: {form.autoFillFields.join(", ") || "—"}</div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {form.mandatory && <Badge variant="outline" className="text-destructive border-destructive/30">Mandatory</Badge>}
        <Button size="sm" onClick={onGenerate} className="bg-gradient-brand text-white"><Sparkles className="h-3 w-3 mr-1" />Generate for {companyName}</Button>
        {onEdit && <EditFormDialog form={form} onSave={onEdit} />}
        {onDelete && <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>}
      </div>
    </div>
  );
}

const MODULE_OPTIONS: ComplianceModuleKey[] = [
  "factory_act","shops_estab","epf","esi","pt","lwf","wages","min_wages","bonus","gratuity",
  "maternity","equal_remun","contract_labour","migrant","posh","apprentices","industrial_relations",
  "osh","trade_licence","fire_safety","pollution","building_plan","custom",
];
const FREQ_OPTIONS: FilingFrequency[] = ["monthly","quarterly","half_yearly","annual","one_time","on_event"];

function AddFormDialog({ onAdd }: { onAdd: (f: FormTemplate) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<FormTemplate>({
    id: "custom-" + Math.random().toString(36).slice(2, 8),
    formName: "", moduleKey: "custom", purpose: "", frequency: "annual",
    dueMonth: 3, dueDay: 31, mandatory: true, requiresSignature: true,
    attachments: [], instructions: "", autoFillFields: [], version: "v1",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />Add form</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Add government / custom form</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Form name"><Input value={f.formName} onChange={(e) => setF({ ...f, formName: e.target.value })} /></Field>
          <Field label="Module">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={f.moduleKey} onChange={(e) => setF({ ...f, moduleKey: e.target.value as ComplianceModuleKey })}>
              {MODULE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Purpose"><Input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></Field>
          <Field label="Frequency">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as FilingFrequency })}>
              {FREQ_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          {f.frequency === "monthly" && <Field label="Due day of month"><Input type="number" value={f.dueDayOfMonth ?? 15} onChange={(e) => setF({ ...f, dueDayOfMonth: +e.target.value })} /></Field>}
          {(f.frequency === "annual" || f.frequency === "half_yearly" || f.frequency === "quarterly") && (
            <>
              {f.frequency !== "quarterly" && <Field label="Due month (1-12)"><Input type="number" value={f.dueMonth ?? 3} onChange={(e) => setF({ ...f, dueMonth: +e.target.value })} /></Field>}
              <Field label="Due day"><Input type="number" value={f.dueDay ?? 31} onChange={(e) => setF({ ...f, dueDay: +e.target.value })} /></Field>
            </>
          )}
          {f.frequency === "on_event" && (
            <Field label="Event trigger">
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={f.eventTrigger ?? "custom_event"} onChange={(e) => setF({ ...f, eventTrigger: e.target.value as ComplianceEventKey })}>
                {DEFAULT_TRIGGERS.map((t) => <option key={t.event} value={t.event}>{t.label}</option>)}
              </select>
            </Field>
          )}
          <Field label="Version"><Input value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
          <Field label="Auto-fill fields (comma)"><Input value={f.autoFillFields.join(",")} onChange={(e) => setF({ ...f, autoFillFields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
          <Field label="Attachments (comma)"><Input value={f.attachments.join(",")} onChange={(e) => setF({ ...f, attachments: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
          <div className="sm:col-span-2"><Field label="Instructions"><Textarea value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></Field></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.mandatory} onCheckedChange={(v) => setF({ ...f, mandatory: v })} />Mandatory</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.requiresSignature} onCheckedChange={(v) => setF({ ...f, requiresSignature: v })} />Requires signature</label>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (!f.formName) { toast.error("Name required"); return; } onAdd(f); setOpen(false); }}>Add to library</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditFormDialog({ form, onSave }: { form: FormTemplate; onSave: (patch: Partial<FormTemplate>) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<FormTemplate>(form);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(form); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Settings2 className="h-3 w-3" /></Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit — {form.formName}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Form name"><Input value={f.formName} onChange={(e) => setF({ ...f, formName: e.target.value })} /></Field>
          <Field label="Purpose"><Input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></Field>
          <Field label="Version"><Input value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
          <Field label="Instructions"><Textarea value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></Field>
        </div>
        <DialogFooter><Button onClick={() => { onSave({ formName: f.formName, purpose: f.purpose, version: f.version, instructions: f.instructions }); setOpen(false); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FireEventDialog({ onFire }: { onFire: (event: ComplianceEventKey, subject: string, note?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<ComplianceEventKey>("employee_joined");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="bg-gradient-brand text-white"><Rocket className="h-3 w-3 mr-1" />Fire event</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Simulate compliance event</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Event">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={event} onChange={(e) => setEvent(e.target.value as ComplianceEventKey)}>
              {DEFAULT_TRIGGERS.map((t) => <option key={t.event} value={t.event}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Subject (employee / contractor / branch)"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Priya Sharma" /></Field>
          <Field label="Note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <DialogFooter><Button onClick={() => { if (!subject) { toast.error("Subject required"); return; } onFire(event, subject, note); setOpen(false); }}>Fire trigger</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AiComplianceChat({ profileHint, events, risks }: { profileHint: string; events: CalendarEvent[]; risks: ReturnType<typeof analyzeRisks> }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState<string>("");

  function answer() {
    const query = q.toLowerCase();
    if (!query) return;
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);
    let out = "";
    if (query.includes("this month") || query.includes("checklist")) {
      const rows = events.filter((e) => e.dueDate.startsWith(thisMonth));
      out = rows.length ? `${rows.length} filings this month:\n` + rows.map((r) => `• ${r.dueDate} — ${r.formName} (${r.status})`).join("\n") : "No filings this month.";
    } else if (query.includes("trigger")) {
      out = `Triggers automate form generation on real events. Configure them under the Triggers tab — enable/disable, choose forms, offset, channels, escalation.`;
    } else if (query.includes("expire") || query.includes("license")) {
      out = "License expiry uses the license_expiring trigger (default: 60-day lead). Add expiry dates on upload to see them here.";
    } else if (query.includes("uan")) {
      out = "Employees missing UAN appear in the Risk tab under 'EPF – Missing UAN'.";
    } else if (query.includes("risk")) {
      out = risks.length ? risks.slice(0, 5).map((r) => `${r.severity.toUpperCase()} · ${r.area} — ${r.recommendation}`).join("\n") : "No active risks.";
    } else if (query.includes("factory")) {
      out = "Factory registration needs: site plan, list of workers, power sanction, occupier declaration, Form 1-A + Form 2.";
    } else {
      out = `Ask me: "what's due this month?", "how do triggers work?", "show risks". Context: ${profileHint}.`;
    }
    setA(out);
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /><span className="font-medium text-sm">SWIFT AI Compliance Chat</span></div>
      <div className="flex gap-2"><Input placeholder='Try "how do triggers work?"' value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && answer()} /><Button onClick={answer}>Ask</Button></div>
      {a && <pre className="mt-3 whitespace-pre-wrap text-sm bg-muted/40 rounded p-3">{a}</pre>}
    </div>
  );
}
