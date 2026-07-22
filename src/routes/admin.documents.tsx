import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, type DocRequest } from "@/lib/store";
import { inr } from "@/lib/payroll";
import { generateSalarySlipPDF } from "@/lib/pdf";
import {
  DEFAULT_TEMPLATES, downloadLetter, bulkZipLetters, renderTemplate, buildVars,
  type LetterTemplate, type LetterCategory,
} from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileDown, FileText, Package, Eye, FileType, Send, MessageCircle, Search,
  ShieldCheck, Check, X, Clock, GitBranch, Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/documents")({
  head: () => ({ meta: [{ title: "AI Documents · SWIFT" }] }),
  component: DocumentsPage,
});

const CATEGORIES: LetterCategory[] = [
  "Onboarding", "Confirmation", "Movement", "Discipline", "Exit", "Verification", "Compliance", "Custom",
];

function DocumentsPage() {
  const {
    employees, company, payrolls,
    approvalMatrix, docRequests, currentUser,
    setApprovalChain, createDocRequest, actOnDocStep, deleteDocRequest,
  } = useStore();
  const [templates, setTemplates] = useState<LetterTemplate[]>(DEFAULT_TEMPLATES);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"letters" | "approvals" | "payslips">("letters");

  // Request-approval dialog state
  const [reqOpen, setReqOpen] = useState(false);
  const [reqTemplate, setReqTemplate] = useState<LetterTemplate | null>(null);
  const [reqEmpId, setReqEmpId] = useState<string>("");
  const [reqFormat, setReqFormat] = useState<"pdf" | "docx">("pdf");
  const [reqBody, setReqBody] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Bulk request dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTemplate, setBulkTemplate] = useState<LetterTemplate | null>(null);
  const [bulkFormat, setBulkFormat] = useState<"pdf" | "docx">("pdf");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  // Template editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState<LetterTemplate | null>(null);
  const [editorBody, setEditorBody] = useState("");

  // Approval-matrix editor
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [matrixTemplate, setMatrixTemplate] = useState<LetterTemplate | null>(null);
  const [matrixChain, setMatrixChain] = useState<string[]>([]);

  // Act-on-step dialog
  const [actOpen, setActOpen] = useState(false);
  const [actReq, setActReq] = useState<DocRequest | null>(null);
  const [actMode, setActMode] = useState<"approve" | "reject">("approve");
  const [actComment, setActComment] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    );
  }, [templates, query]);

  const byCategory = useMemo(() => {
    const map = new Map<LetterCategory, LetterTemplate[]>();
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return map;
  }, [filtered]);

  const pendingCount = docRequests.filter((d) => d.status === "pending").length;
  const approvedCount = docRequests.filter((d) => d.status === "approved").length;

  function chainFor(key: string): string[] {
    return approvalMatrix[key] ?? ["HR Manager"];
  }

  function openRequest(t: LetterTemplate) {
    setReqTemplate(t);
    setReqEmpId(employees[0]?.id ?? "");
    setReqFormat("pdf");
    setReqBody(t.body);
    setReqNote("");
    setReqOpen(true);
  }

  function openBulk(t: LetterTemplate) {
    setBulkTemplate(t);
    setBulkFormat("pdf");
    setBulkSelected(new Set(employees.map((e) => e.id)));
    setBulkOpen(true);
  }

  function openEditor(t: LetterTemplate) {
    setEditorTemplate(t);
    setEditorBody(t.body);
    setEditorOpen(true);
  }

  function openMatrix(t: LetterTemplate) {
    setMatrixTemplate(t);
    setMatrixChain(chainFor(t.key));
    setMatrixOpen(true);
  }

  function saveEditor() {
    if (!editorTemplate) return;
    setTemplates((prev) => prev.map((t) => (t.key === editorTemplate.key ? { ...t, body: editorBody } : t)));
    toast.success("Template saved for this session");
    setEditorOpen(false);
  }

  function saveMatrix() {
    if (!matrixTemplate) return;
    const cleaned = matrixChain.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) return toast.error("Add at least one approver");
    setApprovalChain(matrixTemplate.key, cleaned);
    toast.success(`Approval chain saved (${cleaned.length} step${cleaned.length > 1 ? "s" : ""})`);
    setMatrixOpen(false);
  }

  function submitRequest() {
    if (!reqTemplate || !reqEmpId) return;
    createDocRequest({
      letterKey: reqTemplate.key,
      letterTitle: reqTemplate.title,
      employeeId: reqEmpId,
      templateBody: reqBody,
      format: reqFormat,
      requestedBy: currentUser?.name ?? "Admin",
      note: reqNote,
    });
    toast.success(`Sent for approval → ${chainFor(reqTemplate.key).join(" → ")}`);
    setReqOpen(false);
    setActiveTab("approvals");
  }

  function submitBulk() {
    if (!bulkTemplate) return;
    const chosen = employees.filter((e) => bulkSelected.has(e.id));
    if (chosen.length === 0) return toast.error("Select at least one employee");
    chosen.forEach((e) => {
      createDocRequest({
        letterKey: bulkTemplate.key,
        letterTitle: bulkTemplate.title,
        employeeId: e.id,
        templateBody: bulkTemplate.body,
        format: bulkFormat,
        requestedBy: currentUser?.name ?? "Admin",
      });
    });
    toast.success(`${chosen.length} approval request${chosen.length > 1 ? "s" : ""} created`);
    setBulkOpen(false);
    setActiveTab("approvals");
  }

  function openAct(req: DocRequest, mode: "approve" | "reject") {
    setActReq(req);
    setActMode(mode);
    setActComment("");
    setActOpen(true);
  }

  function submitAct() {
    if (!actReq) return;
    actOnDocStep(actReq.id, actMode, actComment, currentUser?.name ?? "Approver");
    toast.success(actMode === "approve" ? "Step approved" : "Request rejected");
    setActOpen(false);
  }

  async function downloadApproved(req: DocRequest) {
    const emp = employees.find((e) => e.id === req.employeeId);
    if (!emp) return toast.error("Employee not found");
    const tpl = templates.find((t) => t.key === req.letterKey);
    if (!tpl) return toast.error("Template not found");
    setBusy(true);
    try {
      await downloadLetter(company, emp, { ...tpl, body: req.templateBody }, req.format);
      toast.success(`${req.letterTitle} downloaded (${req.format.toUpperCase()})`);
    } catch (err) {
      toast.error("Download failed");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function downloadApprovedBulkZip(key: string) {
    const approved = docRequests.filter((d) => d.letterKey === key && d.status === "approved");
    if (approved.length === 0) return;
    const tpl = templates.find((t) => t.key === key);
    if (!tpl) return;
    const empsForZip = approved
      .map((d) => employees.find((e) => e.id === d.employeeId))
      .filter(Boolean) as ReturnType<typeof useStore.getState>["employees"];
    setBusy(true);
    try {
      await bulkZipLetters(company, empsForZip, tpl, "pdf");
      toast.success(`ZIP of ${empsForZip.length} approved letters downloaded`);
    } catch (err) {
      toast.error("ZIP failed");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">AI Document Engine</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} letter types · configurable approval workflow · download unlocks after full approval
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search letter templates…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="letters">Letters & Certificates</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            {pendingCount > 0 && <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="payslips">Salary Slips ({payrolls.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="letters" className="space-y-6 mt-4">
          {CATEGORIES.map((cat) => {
            const list = byCategory.get(cat);
            if (!list?.length) return null;
            return (
              <section key={cat}>
                <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                  {cat}
                  <Badge variant="secondary" className="text-xs">{list.length}</Badge>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((t) => {
                    const chain = chainFor(t.key);
                    return (
                      <div key={t.key} className="rounded-xl border border-border bg-card p-4 flex flex-col hover:shadow-soft transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <h3 className="font-medium text-sm truncate">{t.title}</h3>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{t.description}</p>
                        <div className="flex items-center gap-1 mb-3 text-[11px] text-muted-foreground">
                          <GitBranch className="h-3 w-3" />
                          <span className="truncate" title={chain.join(" → ")}>{chain.join(" → ")}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" onClick={() => openRequest(t)} className="flex-1 min-w-[100px]">
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Request approval
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openBulk(t)} title="Bulk request">
                            <Package className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openMatrix(t)} title="Edit approval chain">
                            <GitBranch className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditor(t)} title="Edit template">
                            <FileType className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">No templates match your search.</div>
          )}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <StatChip icon={<Clock className="h-3 w-3" />} label="Pending" value={pendingCount} tone="warn" />
            <StatChip icon={<Check className="h-3 w-3" />} label="Approved" value={approvedCount} tone="ok" />
            <StatChip icon={<X className="h-3 w-3" />} label="Rejected" value={docRequests.filter((d) => d.status === "rejected").length} tone="bad" />
          </div>

          {docRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No document requests yet. Request approval for a letter from the Letters tab.
            </div>
          ) : (
            <div className="space-y-2">
              {docRequests.map((req) => {
                const emp = employees.find((e) => e.id === req.employeeId);
                const step = req.steps[req.currentStep];
                return (
                  <div key={req.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{req.letterTitle}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">{req.format}</Badge>
                          <StatusBadge status={req.status} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {emp?.name ?? "?"} · {emp?.empCode} · requested by {req.requestedBy} · {new Date(req.requestedAt).toLocaleString()}
                        </div>
                        {req.note && <div className="text-xs mt-1 italic text-muted-foreground">Note: {req.note}</div>}
                      </div>
                      <div className="flex gap-1.5">
                        {req.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => openAct(req, "approve")}>
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openAct(req, "reject")}>
                              <X className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {req.status === "approved" && (
                          <Button size="sm" onClick={() => downloadApproved(req)} disabled={busy}>
                            <FileDown className="h-3.5 w-3.5 mr-1" /> Download {req.format.toUpperCase()}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteDocRequest(req.id)} title="Delete request">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <ol className="flex flex-wrap gap-2 text-xs">
                      {req.steps.map((s, i) => {
                        const active = req.status === "pending" && i === req.currentStep;
                        return (
                          <li key={i} className={
                            "px-2.5 py-1 rounded-md border " +
                            (s.status === "approved" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" :
                             s.status === "rejected" ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300" :
                             active ? "bg-primary/10 border-primary/40 text-primary" :
                             "bg-muted/40 border-border text-muted-foreground")
                          } title={s.comment}>
                            <span className="font-medium">{i + 1}. {s.approver}</span>
                            {s.status !== "pending" && (
                              <span className="ml-1.5 opacity-80">
                                · {s.status}{s.actedBy ? ` by ${s.actedBy}` : ""}
                              </span>
                            )}
                            {active && <span className="ml-1.5 opacity-80">· waiting</span>}
                          </li>
                        );
                      })}
                    </ol>
                    {req.status === "pending" && step && (
                      <div className="text-[11px] text-muted-foreground mt-2">
                        Next approver: <span className="font-medium text-foreground">{step.approver}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {approvedCount > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm">
                  <span className="font-medium">Bulk download approved</span>
                  <div className="text-xs text-muted-foreground">Group all approved letters of one type into a ZIP</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(docRequests.filter((d) => d.status === "approved").map((d) => d.letterKey))).map((key) => {
                    const tpl = templates.find((t) => t.key === key);
                    const count = docRequests.filter((d) => d.letterKey === key && d.status === "approved").length;
                    return (
                      <Button key={key} size="sm" variant="outline" onClick={() => downloadApprovedBulkZip(key)} disabled={busy}>
                        <Package className="h-3.5 w-3.5 mr-1" /> {tpl?.title ?? key} ({count})
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payslips" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            {payrolls.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Run payroll to generate salary slips.</p>
            ) : (
              <div className="space-y-2">
                {payrolls.map((pr) => {
                  const emp = employees.find((e) => e.id === pr.employeeId);
                  if (!emp) return null;
                  return (
                    <div key={pr.id} className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{emp.name} · {pr.month}</div>
                        <div className="text-xs text-muted-foreground">Net {inr(pr.computed.net)}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => generateSalarySlipPDF(company, emp, pr.month, pr.computed)}>
                        <FileDown className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Request approval dialog */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Request approval · {reqTemplate?.title}</DialogTitle>
            <DialogDescription>
              This letter enters the approval chain: <b>{reqTemplate ? chainFor(reqTemplate.key).join(" → ") : ""}</b>. Download unlocks after every step approves.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 overflow-y-auto pr-1">
            <div>
              <Label className="text-xs">Employee</Label>
              <Select value={reqEmpId} onValueChange={setReqEmpId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} · {e.empCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Format on approval</Label>
              <Select value={reqFormat} onValueChange={(v) => setReqFormat(v as "pdf" | "docx")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF · branded, print-ready</SelectItem>
                  <SelectItem value="docx">DOCX · editable Word</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Note for approvers (optional)</Label>
            <Input value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="Why this letter, urgency…" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Label className="text-xs">Letter body ({"{{variables}}"} auto-resolved)</Label>
            <Textarea value={reqBody} onChange={(e) => setReqBody(e.target.value)} rows={10} className="font-mono text-xs mt-1" />
            {reqEmpId && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Preview with resolved variables
                </summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted/40 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {renderTemplate(reqBody, buildVars(company, employees.find((e) => e.id === reqEmpId)!))}
                </pre>
              </details>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled title="Requires Email connector"><Send className="h-4 w-4 mr-1" /> Email on approval</Button>
            <Button variant="outline" size="sm" disabled title="Requires WhatsApp connector"><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp on approval</Button>
            <Button onClick={submitRequest} disabled={!reqEmpId}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Send for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk request dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk request approval · {bulkTemplate?.title}</DialogTitle>
            <DialogDescription>
              One approval request per selected employee, routed through: <b>{bulkTemplate ? chainFor(bulkTemplate.key).join(" → ") : ""}</b>
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Format on approval</Label>
            <Select value={bulkFormat} onValueChange={(v) => setBulkFormat(v as "pdf" | "docx")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx">DOCX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{bulkSelected.size} of {employees.length} selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setBulkSelected(new Set(employees.map((e) => e.id)))}>All</Button>
              <Button size="sm" variant="ghost" onClick={() => setBulkSelected(new Set())}>None</Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border">
            {employees.map((e) => (
              <label key={e.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/40 cursor-pointer">
                <Checkbox
                  checked={bulkSelected.has(e.id)}
                  onCheckedChange={(v) => {
                    setBulkSelected((prev) => {
                      const next = new Set(prev);
                      if (v) next.add(e.id); else next.delete(e.id);
                      return next;
                    });
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{e.empCode} · {e.designation}</div>
                </div>
              </label>
            ))}
            {employees.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No employees yet.</div>}
          </div>
          <DialogFooter>
            <Button onClick={submitBulk} disabled={bulkSelected.size === 0}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Send {bulkSelected.size} for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval matrix editor */}
      <Dialog open={matrixOpen} onOpenChange={setMatrixOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approval chain · {matrixTemplate?.title}</DialogTitle>
            <DialogDescription>Ordered list of approvers. Each step must approve before the letter can be downloaded.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {matrixChain.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs w-6 text-muted-foreground">{i + 1}.</span>
                <Input
                  value={a}
                  onChange={(e) => setMatrixChain((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder="e.g. HR Manager"
                />
                <Button size="sm" variant="ghost" onClick={() => setMatrixChain((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setMatrixChain((prev) => [...prev, ""])}>
              + Add approver
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatrixOpen(false)}>Cancel</Button>
            <Button onClick={saveMatrix}>Save chain</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Act on step dialog */}
      <Dialog open={actOpen} onOpenChange={setActOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actMode === "approve" ? "Approve step" : "Reject request"}</DialogTitle>
            <DialogDescription>
              {actReq && (
                <>
                  {actReq.letterTitle} for {employees.find((e) => e.id === actReq.employeeId)?.name} — acting as{" "}
                  <b>{actReq.steps[actReq.currentStep]?.approver}</b>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Comment {actMode === "reject" ? "(required)" : "(optional)"}</Label>
            <Textarea value={actComment} onChange={(e) => setActComment(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActOpen(false)}>Cancel</Button>
            <Button
              onClick={submitAct}
              disabled={actMode === "reject" && actComment.trim().length === 0}
              variant={actMode === "reject" ? "destructive" : "default"}
            >
              {actMode === "approve" ? <><Check className="h-4 w-4 mr-1" /> Approve</> : <><X className="h-4 w-4 mr-1" /> Reject</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit template · {editorTemplate?.title}</DialogTitle>
            <DialogDescription>
              Use {"{{name}}"}, {"{{designation}}"}, {"{{annualCTC}}"}, {"{{today}}"}, {"{{company}}"} etc.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={editorBody} onChange={(e) => setEditorBody(e.target.value)} rows={18} className="font-mono text-xs flex-1" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveEditor}>Save template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  } as const;
  return <span className={`text-[10px] uppercase font-medium px-2 py-0.5 rounded border ${map[status]}`}>{status}</span>;
}

function StatChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "ok" | "warn" | "bad" }) {
  const toneCls = tone === "ok"
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : tone === "warn"
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "bg-red-500/10 text-red-700 dark:text-red-300";
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${toneCls}`}>
      {icon}
      <span className="font-medium">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}
