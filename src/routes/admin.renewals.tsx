import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useBilling } from "@/lib/billing-store";
import { useSubscriptionContext } from "@/components/feature-gate";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BellRing, Mail, MessageSquare, Phone, Radio, Play, Clock, AlertTriangle, ShieldOff } from "lucide-react";
import type { ReminderChannel, ReminderStage } from "@/lib/renewal-scheduler";

export const Route = createFileRoute("/admin/renewals")({
  head: () => ({ meta: [{ title: "Renewal Scheduler · SWIFT AI" }] }),
  component: RenewalsPage,
});

const channelMeta: Record<ReminderChannel, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: Phone },
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  push: { label: "Push", icon: BellRing },
  banner: { label: "In-app banner", icon: Radio },
};

const stageMeta: Record<ReminderStage, { label: string; tone: string }> = {
  "pre-30": { label: "30 days before", tone: "bg-emerald-500/10 text-emerald-600" },
  "pre-15": { label: "15 days before", tone: "bg-emerald-500/10 text-emerald-600" },
  "pre-7":  { label: "7 days before",  tone: "bg-amber-500/10 text-amber-600" },
  "pre-3":  { label: "3 days before",  tone: "bg-amber-500/10 text-amber-600" },
  "pre-1":  { label: "1 day before",   tone: "bg-orange-500/10 text-orange-600" },
  "renewal-day":   { label: "Renewal day",   tone: "bg-primary/10 text-primary" },
  "grace":         { label: "Grace start",   tone: "bg-yellow-500/10 text-yellow-700" },
  "final-warning": { label: "Final warning", tone: "bg-red-500/10 text-red-600" },
  "expired":       { label: "Expired",       tone: "bg-destructive/10 text-destructive" },
};

function RenewalsPage() {
  const { tenantId, sub } = useSubscriptionContext();
  const {
    reminderConfig, reminderLog,
    updateReminderConfig, setReminderChannel, runRenewalScheduler,
    previewReminderPlan, clearReminderLog,
  } = useBilling();

  const [offsetsText, setOffsetsText] = useState(reminderConfig.offsets.join(", "));

  useEffect(() => { setOffsetsText(reminderConfig.offsets.join(", ")); }, [reminderConfig.offsets]);

  // Auto-tick every 30s so grace/suspend/status flips are visible without reload.
  useEffect(() => {
    runRenewalScheduler();
    const id = setInterval(() => runRenewalScheduler(), 30_000);
    return () => clearInterval(id);
  }, [runRenewalScheduler]);

  const plan = useMemo(() => (sub ? previewReminderPlan(sub.id) : []), [sub, previewReminderPlan, reminderConfig]);
  const subLog = reminderLog.filter((l) => !sub || l.subscriptionId === sub.id);

  const saveOffsets = () => {
    const arr = offsetsText.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
    updateReminderConfig({ offsets: Array.from(new Set(arr)).sort((a, b) => b - a) });
    toast.success("Reminder offsets updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BellRing className="h-6 w-6 text-primary" /> Renewal Scheduler</h1>
          <p className="text-sm text-muted-foreground">Automated multi-channel reminders with grace period and status transitions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { runRenewalScheduler(); toast.success("Scheduler tick executed"); }}>
            <Play className="h-4 w-4 mr-2" /> Run now
          </Button>
        </div>
      </div>

      {sub && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Current status</CardDescription><CardTitle className="capitalize">{sub.status}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Expires {new Date(sub.expiresAt).toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Grace period</CardDescription><CardTitle>{reminderConfig.gracePeriodDays} days</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Final warning at {reminderConfig.finalWarningDays} days remaining</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Auto-suspend</CardDescription><CardTitle>{reminderConfig.autoSuspend ? "Enabled" : "Off"}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground flex items-center gap-1"><ShieldOff className="h-3 w-3" /> Locks access after grace</CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming reminders</TabsTrigger>
          <TabsTrigger value="log">Send log ({subLog.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Reminder schedule</CardTitle><CardDescription>Days before expiry to notify. Comma separated.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Offsets (days before)</Label>
                <div className="flex gap-2">
                  <Input value={offsetsText} onChange={(e) => setOffsetsText(e.target.value)} placeholder="30, 15, 7, 3, 1" />
                  <Button onClick={saveOffsets}>Save</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {reminderConfig.offsets.map((o) => <Badge key={o} variant="secondary">T-{o}d</Badge>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Grace period (days)</Label>
                  <Input type="number" min={0} value={reminderConfig.gracePeriodDays}
                    onChange={(e) => updateReminderConfig({ gracePeriodDays: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div className="space-y-2">
                  <Label>Final warning (days before suspend)</Label>
                  <Input type="number" min={0} value={reminderConfig.finalWarningDays}
                    onChange={(e) => updateReminderConfig({ finalWarningDays: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                  <div><Label>Auto-suspend after grace</Label><p className="text-xs text-muted-foreground">Move to suspended when grace ends.</p></div>
                  <Switch checked={reminderConfig.autoSuspend} onCheckedChange={(v) => updateReminderConfig({ autoSuspend: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Quiet hours start (0-23)</Label>
                  <Input type="number" min={0} max={23} value={reminderConfig.quietHours?.start ?? ""}
                    onChange={(e) => updateReminderConfig({ quietHours: { start: Number(e.target.value || 0), end: reminderConfig.quietHours?.end ?? 8 } })} />
                </div>
                <div className="space-y-2">
                  <Label>Quiet hours end (0-23)</Label>
                  <Input type="number" min={0} max={23} value={reminderConfig.quietHours?.end ?? ""}
                    onChange={(e) => updateReminderConfig({ quietHours: { start: reminderConfig.quietHours?.start ?? 22, end: Number(e.target.value || 0) } })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Channels</CardTitle><CardDescription>Global default channels. Per-subscription overrides below.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              {(Object.keys(channelMeta) as ReminderChannel[]).map((c) => {
                const Icon = channelMeta[c].icon;
                return (
                  <div key={c} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><span className="text-sm">{channelMeta[c].label}</span></div>
                    <Switch checked={reminderConfig.channels[c]}
                      onCheckedChange={(v) => updateReminderConfig({ channels: { ...reminderConfig.channels, [c]: v } })} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {sub && (
            <Card>
              <CardHeader><CardTitle>This subscription — channel overrides</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-5">
                {(Object.keys(channelMeta) as ReminderChannel[]).map((c) => {
                  const Icon = channelMeta[c].icon;
                  return (
                    <div key={c} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="text-sm">{channelMeta[c].label}</span></div>
                      <Switch checked={sub.reminderChannels[c]} onCheckedChange={(v) => setReminderChannel(sub.id, c, v)} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Reminder timeline</CardTitle><CardDescription>Computed from current expiry + config.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Stage</TableHead><TableHead>Due at</TableHead><TableHead>Δ from expiry</TableHead>
                  <TableHead>Channels</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {plan.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No subscription yet.</TableCell></TableRow>}
                  {plan.map((p) => (
                    <TableRow key={p.stage}>
                      <TableCell><span className={`px-2 py-0.5 rounded text-xs ${stageMeta[p.stage].tone}`}>{stageMeta[p.stage].label}</span></TableCell>
                      <TableCell className="text-sm">{new Date(p.dueAt).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{p.daysFromExpiry === 0 ? "renewal day" : (p.daysFromExpiry < 0 ? `T${p.daysFromExpiry}d` : `+${p.daysFromExpiry}d`)}</TableCell>
                      <TableCell className="text-xs">{p.channels.join(", ") || "—"}</TableCell>
                      <TableCell><Badge variant={p.status === "due" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Send log</CardTitle><CardDescription>Latest reminder dispatches.</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => { clearReminderLog(sub?.id); toast.success("Log cleared"); }}>Clear</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Sent</TableHead><TableHead>Stage</TableHead><TableHead>Channels</TableHead><TableHead>Message</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {subLog.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No reminders sent yet. Click "Run now" to trigger.</TableCell></TableRow>}
                  {subLog.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(l.sentAt).toLocaleString()}</TableCell>
                      <TableCell><span className={`px-2 py-0.5 rounded text-xs ${stageMeta[l.stage].tone}`}>{stageMeta[l.stage].label}</span></TableCell>
                      <TableCell className="text-xs">{l.channels.join(", ")}</TableCell>
                      <TableCell className="text-sm">{l.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Message templates</CardTitle><CardDescription>Supports {"{graceDays}"} and {"{daysLeft}"} placeholders.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(stageMeta) as ReminderStage[]).map((stage) => (
                <div key={stage} className="grid gap-1">
                  <Label className="text-xs uppercase tracking-wide">{stageMeta[stage].label}</Label>
                  <Textarea rows={2} value={reminderConfig.templates[stage] ?? ""}
                    onChange={(e) => updateReminderConfig({ templates: { ...reminderConfig.templates, [stage]: e.target.value } })} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
