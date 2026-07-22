import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  journeyProgress,
  LIFECYCLE_QUESTIONS,
  type DocumentLibraryItem,
  type JourneyStepStatus,
  type LifecyclePhase,
} from "@/lib/lifecycle";
import { DEFAULT_TEMPLATES, downloadLetter } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ESignPad } from "@/components/esign-pad";
import {
  Sparkles, FileText, CheckCircle2, Clock, Wand2, Download, ArrowUp, ArrowDown, Plus, Trash2,
  Rocket, ShieldCheck, GitBranch, LogOut as ExitIcon, RefreshCw, FileSignature,
} from "lucide-react";
import { toast } from "sonner";
import { aiNotify } from "@/lib/ai-guide-bus";


export const Route = createFileRoute("/admin/lifecycle")({
  head: () => ({ meta: [{ title: "Employee Lifecycle · SWIFT AI" }] }),
  component: LifecyclePage,
});

const PHASES: { value: LifecyclePhase; label: string; icon: typeof Rocket }[] = [
  { value: "recruitment", label: "Recruitment", icon: Sparkles },
  { value: "onboarding", label: "Onboarding", icon: Rocket },
  { value: "probation", label: "Probation", icon: Clock },
  { value: "confirmed", label: "Confirmed", icon: ShieldCheck },
  { value: "active", label: "Active", icon: CheckCircle2 },
  { value: "notice", label: "Notice", icon: GitBranch },
  { value: "exiting", label: "Exiting", icon: ExitIcon },
  { value: "exited", label: "Exited", icon: ExitIcon },
];

function LifecyclePage() {
  const {
    employees, company, docLibrary, journeys, ensureJourney,
    advanceJourneyStep, autoGenerateAllPending, setJourneyPhase,
    addLibraryItem, updateLibraryItem, deleteLibraryItem, reorderLibrary, resetLibrary,
  } = useStore();

  const [selectedId, setSelectedId] = useState<string>(employees[0]?.id ?? "");
  const selected = employees.find((e) => e.id === selectedId);
  const journey = selected ? journeys.find((j) => j.employeeId === selected.id) : undefined;
  const progress = journeyProgress(journey);

  const startJourney = () => {
    if (!selected) return;
    ensureJourney(selected.id);
    toast.success(`Onboarding journey started for ${selected.name}`);
  };

  const autoGenerate = () => {
    if (!selected) return;
    ensureJourney(selected.id);
    const n = autoGenerateAllPending(selected.id, "SWIFT AI");
    toast.success(`SWIFT AI generated ${n} document${n === 1 ? "" : "s"} automatically`);
  };

  const downloadStep = async (stepId: string) => {
    if (!selected || !journey) return;
    const step = journey.steps.find((s) => s.id === stepId);
    const meta = step ? docLibrary.find((d) => d.id === step.docId) : undefined;
    if (!step || !meta) return;
    const tpl = meta.letterKey
      ? DEFAULT_TEMPLATES.find((t) => t.key === meta.letterKey)
      : undefined;
    if (!tpl) {
      toast.error("This document is a manual form (no auto-template). Configure a template first.");
      return;
    }
    if (!["generated", "signed", "approved"].includes(step.status)) {
      toast.error("Not generated yet — click Auto-generate first.");
      return;
    }
    try {
      await downloadLetter(company, selected, tpl, "pdf");
      toast.success(`${meta.title} downloaded`);
    } catch (e) { console.error(e); toast.error("Download failed"); }
  };

  const stats = useMemo(() => {
    const total = employees.length;
    const started = journeys.length;
    const done = journeys.filter((j) => journeyProgress(j).pct === 100).length;
    const inProgress = started - done;
    return { total, started, done, inProgress };
  }, [employees, journeys]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> AI Employee Lifecycle
          </h1>
          <p className="text-sm text-muted-foreground">
            SWIFT AI orchestrates every document from joining to exit — fully configurable per company.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Employees" value={stats.total} />
          <Stat label="Journeys" value={stats.started} />
          <Stat label="In Progress" value={stats.inProgress} tint="text-amber-600" />
          <Stat label="Completed" value={stats.done} tint="text-emerald-600" />
        </div>
      </div>

      <Tabs defaultValue="journeys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journeys">Employee Journeys</TabsTrigger>
          <TabsTrigger value="library">Document Library</TabsTrigger>
        </TabsList>

        <TabsContent value="journeys" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            <div className="rounded-2xl border border-border bg-card p-2 max-h-[70vh] overflow-y-auto">
              {employees.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No employees yet.</div>
              ) : (
                employees.map((e) => {
                  const j = journeys.find((x) => x.employeeId === e.id);
                  const pct = journeyProgress(j).pct;
                  const active = e.id === selectedId;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full text-left rounded-lg p-3 mb-1 transition-colors ${
                        active ? "bg-gradient-brand text-white" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{e.name}</div>
                          <div className={`text-xs truncate ${active ? "text-white/80" : "text-muted-foreground"}`}>
                            {e.designation} · {e.empCode}
                          </div>
                        </div>
                        <Badge variant={j ? "secondary" : "outline"} className="shrink-0">
                          {j ? `${pct}%` : "New"}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              {!selected ? (
                <div className="text-center py-16 text-muted-foreground">Select an employee.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Current Employee</div>
                      <div className="text-xl font-semibold">{selected.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selected.designation} · {selected.department} · {selected.empCode}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!journey ? (
                        <Button onClick={startJourney} className="bg-gradient-brand text-white">
                          <Rocket className="h-4 w-4 mr-2" /> Start Onboarding Journey
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" onClick={autoGenerate}>
                            <Wand2 className="h-4 w-4 mr-2" /> AI Auto-generate Pending
                          </Button>
                          <Select
                            value={journey.phase}
                            onValueChange={(v) => setJourneyPhase(selected.id, v as LifecyclePhase)}
                          >
                            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PHASES.map((p) => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  </div>

                  {journey && (
                    <>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{progress.done} / {progress.total} · {progress.pct}%</span>
                        </div>
                        <Progress value={progress.pct} className="h-2" />
                      </div>

                      {LIFECYCLE_QUESTIONS[`on_${journey.phase}`] && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                          <div className="flex items-center gap-2 font-medium mb-1">
                            <Sparkles className="h-4 w-4 text-primary" /> SWIFT AI needs to know
                          </div>
                          <ul className="list-disc pl-6 text-muted-foreground space-y-0.5">
                            {LIFECYCLE_QUESTIONS[`on_${journey.phase}`].map((q) => <li key={q}>{q}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="space-y-2">
                        {journey.steps.map((s, i) => {
                          const meta = docLibrary.find((d) => d.id === s.docId);
                          return (
                            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                              <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                                s.status === "approved" || s.status === "signed" || s.status === "generated"
                                  ? "bg-emerald-500 text-white"
                                  : s.status === "rejected"
                                    ? "bg-red-500 text-white"
                                    : "bg-muted text-muted-foreground"
                              }`}>
                                {i + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">{s.title}</span>
                                  <Badge variant="outline" className="text-[10px]">{s.code}</Badge>
                                  {meta?.mandatory && <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30">Mandatory</Badge>}
                                  {meta?.autoGenerate && <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">AI</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Status: <StatusChip status={s.status} />
                                  {s.approvedBy && ` · by ${s.approvedBy}`}
                                </div>
                              </div>
                              <div className="flex gap-1 items-center">
                                {s.signatureDataUrl && (
                                  <img src={s.signatureDataUrl} alt="sig" className="h-7 max-w-[80px] object-contain bg-white rounded border border-border" title={`Signed by ${s.signedBy}`} />
                                )}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" title="Sign / e-sign">
                                      <FileSignature className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-lg">
                                    <DialogHeader><DialogTitle>Sign · {s.title}</DialogTitle></DialogHeader>
                                    <ESignPad
                                      defaultName={selected.name}
                                      onSign={(dataUrl, meta) => {
                                        useStore.setState((st) => ({
                                          journeys: st.journeys.map((j) => j.employeeId === selected.id ? {
                                            ...j,
                                            steps: j.steps.map((x) => x.id === s.id ? { ...x, status: "signed", signedAt: new Date().toISOString(), signatureDataUrl: dataUrl, signedBy: meta.signedBy, signedByRole: "HR" } : x),
                                          } : j),
                                        }));
                                        aiNotify({ title: `✍️ ${s.code} signed`, body: `${s.title} by ${meta.signedBy}`, kind: "success" });
                                        toast.success("Signed");
                                      }}
                                    />
                                  </DialogContent>
                                </Dialog>
                                {meta?.letterKey && s.status !== "pending" && (
                                  <Button size="sm" variant="ghost" onClick={() => downloadStep(s.id)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}

                                <Select
                                  value={s.status}
                                  onValueChange={(v) => advanceJourneyStep(selected.id, s.id, v as JourneyStepStatus, "HR")}
                                >
                                  <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In progress</SelectItem>
                                    <SelectItem value="generated">Generated</SelectItem>
                                    <SelectItem value="signed">Signed</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="skipped">Skipped</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Every document is configurable — sequence, permissions, mandatory, auto-generate, seals, signatures.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { resetLibrary(); toast.success("Library reset to defaults"); }}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reset
              </Button>
              <Button
                size="sm"
                className="bg-gradient-brand text-white"
                onClick={() => {
                  const item = addLibraryItem({
                    code: "NEW", title: "New Document", category: "Custom",
                    sequence: docLibrary.length + 1, mandatory: false, autoGenerate: false,
                    approvalRequired: true, digitalSignatureRequired: false, sealRequired: false,
                    confidential: false, employeeVisible: true,
                    permissions: { create: ["hr"], read: ["employee","hr","admin"], edit: ["hr"], approve: ["hr"], download: ["employee","hr"] },
                    trigger: "manual", language: "en", version: "1.0", active: true,
                  });
                  toast.success(`Added ${item.code}`);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Document
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 w-16">Seq</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Trigger</th>
                  <th className="p-3 text-center">Auto AI</th>
                  <th className="p-3 text-center">Mandatory</th>
                  <th className="p-3 text-center">Signature</th>
                  <th className="p-3 text-center">Seal</th>
                  <th className="p-3 text-center">Active</th>
                  <th className="p-3 text-right">Order</th>
                </tr>
              </thead>
              <tbody>
                {[...docLibrary].sort((a, b) => a.sequence - b.sequence).map((d, idx, arr) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{d.sequence}</td>
                    <td className="p-3">
                      <Input value={d.code} onChange={(e) => updateLibraryItem(d.id, { code: e.target.value })} className="h-8 w-20 font-mono" />
                    </td>
                    <td className="p-3">
                      <Input value={d.title} onChange={(e) => updateLibraryItem(d.id, { title: e.target.value })} className="h-8 min-w-[200px]" />
                    </td>
                    <td className="p-3">
                      <Input value={d.category} onChange={(e) => updateLibraryItem(d.id, { category: e.target.value })} className="h-8 w-32" />
                    </td>
                    <td className="p-3">
                      <Select value={d.trigger} onValueChange={(v) => updateLibraryItem(d.id, { trigger: v as DocumentLibraryItem["trigger"] })}>
                        <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["on_registration","on_probation","on_confirmation","on_promotion","on_transfer","on_exit","on_request","manual"] as const).map((t) => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-center"><Switch checked={d.autoGenerate} onCheckedChange={(v) => updateLibraryItem(d.id, { autoGenerate: v })} /></td>
                    <td className="p-3 text-center"><Switch checked={d.mandatory} onCheckedChange={(v) => updateLibraryItem(d.id, { mandatory: v })} /></td>
                    <td className="p-3 text-center"><Switch checked={d.digitalSignatureRequired} onCheckedChange={(v) => updateLibraryItem(d.id, { digitalSignatureRequired: v })} /></td>
                    <td className="p-3 text-center"><Switch checked={d.sealRequired} onCheckedChange={(v) => updateLibraryItem(d.id, { sealRequired: v })} /></td>
                    <td className="p-3 text-center"><Switch checked={d.active} onCheckedChange={(v) => updateLibraryItem(d.id, { active: v })} /></td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0}
                          onClick={() => {
                            const ids = arr.map((x) => x.id);
                            [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                            reorderLibrary(ids);
                          }}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === arr.length - 1}
                          onClick={() => {
                            const ids = arr.map((x) => x.id);
                            [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                            reorderLibrary(ids);
                          }}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500"
                          onClick={() => { deleteLibraryItem(d.id); toast.success(`Removed ${d.code}`); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 min-w-[90px]">
      <div className={`text-xl font-semibold ${tint ?? ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusChip({ status }: { status: JourneyStepStatus }) {
  const map: Record<JourneyStepStatus, string> = {
    pending: "text-muted-foreground",
    in_progress: "text-amber-600",
    generated: "text-primary",
    signed: "text-primary",
    approved: "text-emerald-600",
    skipped: "text-muted-foreground",
    rejected: "text-red-600",
  };
  return <span className={`font-medium ${map[status]}`}>{status.replace(/_/g, " ")}</span>;
}
