import { useMemo, useState } from "react";
import JSZip from "jszip";
import pkg from "file-saver";
import { toast } from "sonner";
import { useStore, type Employee } from "@/lib/store";
import {
  DEFAULT_TEMPLATES,
  generateLetterPDF,
  generateLetterDOCX,
  generateAssetHandoverPDF,
  buildGenericTemplate,
  downloadLetter,
  type LetterKey,
  type LetterTemplate,
} from "@/lib/documents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DoorOpen, ArrowRightLeft, FileSignature, FileDown, PackageCheck,
  MessageSquareQuote, CheckCircle2, Wallet, Building2, Sparkles,
} from "lucide-react";

const { saveAs } = pkg;

type Kind = "exit" | "transfer" | "manual";

const EXIT_REASONS = [
  "Resignation (Better Opportunity)",
  "Resignation (Personal / Family)",
  "Resignation (Higher Studies)",
  "Retirement",
  "Contract Completion",
  "Termination (Performance)",
  "Termination (Misconduct)",
  "Absconding",
  "Death / Medical",
  "Other",
];

const EXIT_DOC_KEYS: LetterKey[] = [
  "relieving",
  "experience",
  "full_final",
  "exit_clearance",
];

export function EmployeeActionsDialog({
  employee, open, onClose, defaultKind = "exit",
}: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  defaultKind?: Kind;
}) {
  if (!employee) return null;
  return <Inner employee={employee} open={open} onClose={onClose} defaultKind={defaultKind} />;
}

function Inner({
  employee, open, onClose, defaultKind = "exit",
}: {
  employee: Employee;
  open: boolean;
  onClose: () => void;
  defaultKind?: Kind;
}) {
  const {
    company, docAssets, updateEmployee, assets, assetAssignments, assetCategories,
    returnAsset, currentUser, addAudit,
  } = useStore();
  const [kind, setKind] = useState<Kind>(defaultKind);

  // ---------- EXIT state ----------
  const [reason, setReason] = useState(EXIT_REASONS[0]);
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().slice(0, 10));
  const [lastWorkingDate, setLastWorkingDate] = useState(new Date().toISOString().slice(0, 10));
  const [rehireEligible, setRehireEligible] = useState(true);
  const [selectedExitDocs, setSelectedExitDocs] = useState<Record<LetterKey, boolean>>({
    relieving: true, experience: true, full_final: true, exit_clearance: true,
  } as Record<LetterKey, boolean>);
  // Exit interview
  const [ei, setEi] = useState({
    reasonDetails: "",
    likedMost: "",
    likedLeast: "",
    suggestions: "",
    ratingCulture: "4",
    ratingManager: "4",
    ratingCompensation: "3",
    wouldRecommend: "yes",
  });

  // ---------- TRANSFER state ----------
  const [toBranchId, setToBranchId] = useState<string>("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [transferEffective, setTransferEffective] = useState(new Date().toISOString().slice(0, 10));
  const [transferReason, setTransferReason] = useState("Business requirement");

  // ---------- MANUAL state ----------
  const [manualKey, setManualKey] = useState<LetterKey>("bonafide");
  const [manualExtra, setManualExtra] = useState("");

  const heldAssets = useMemo(() => {
    if (!employee) return [];
    return assetAssignments
      .filter((x) => x.employeeId === employee.id && !x.returnedAt)
      .map((x) => {
        const a = assets.find((y) => y.id === x.assetId);
        const cat = a && assetCategories.find((c) => c.id === a.categoryId);
        return { assignment: x, asset: a, category: cat };
      })
      .filter((x) => !!x.asset);
  }, [assets, assetAssignments, assetCategories, employee]);

  const [returnChecked, setReturnChecked] = useState<Record<string, boolean>>({});


  // ---------- helpers ----------
  function buildExitInterviewTemplate(): LetterTemplate {
    const body = `EXIT INTERVIEW — CONFIDENTIAL

Employee            : {{name}} ({{empCode}})
Designation         : {{designation}}
Department          : {{department}}
Date of Interview   : {{today}}
Notice Date         : ${noticeDate}
Last Working Date   : ${lastWorkingDate}
Primary Reason      : ${reason}
Details             : ${ei.reasonDetails || "—"}

1. What did you like most about working with {{company}}?
${ei.likedMost || "—"}

2. What did you like least, and what would you change?
${ei.likedLeast || "—"}

3. Suggestions for improvement:
${ei.suggestions || "—"}

4. Ratings (out of 5):
   Culture & Work Environment : ${ei.ratingCulture}
   Reporting Manager          : ${ei.ratingManager}
   Compensation & Benefits    : ${ei.ratingCompensation}

5. Would you recommend {{company}} as an employer?
   ${ei.wouldRecommend.toUpperCase()}

6. Re-hire eligibility (HR use): ${rehireEligible ? "YES — eligible" : "NO — not eligible"}

Signed by HR: ${currentUser?.name ?? "HR Officer"}
Employee acknowledgement: ${employee.name}`;
    return { key: "custom", title: "Exit Interview Report", category: "Exit", description: "Exit interview", body };
  }

  function buildAssetClearanceTemplate(): LetterTemplate {
    const rows = heldAssets.length === 0
      ? "No company assets are recorded against this employee."
      : heldAssets.map((x, i) => `${i + 1}. ${x.asset!.name} — Tag ${x.asset!.tag}${x.asset!.serial ? ` · SN ${x.asset!.serial}` : ""} · ${x.category?.name ?? "—"}  [${returnChecked[x.assignment.id] ? "RETURNED ✓" : "PENDING"}]`).join("\n");
    const body = `ASSET RETURN & CLEARANCE FORM

Employee            : {{name}} ({{empCode}})
Last Working Date   : ${lastWorkingDate}

Company assets held / to be returned:
${rows}

I confirm that all company assets listed above have been returned in acceptable condition,
except as noted. Any pending items will be recovered from full & final settlement per policy.

Employee Signature       : ______________________
IT / Admin Verification  : ______________________
Finance Sign-off (FnF)   : ______________________
HR Sign-off              : ${currentUser?.name ?? "HR Officer"}`;
    return { key: "custom", title: "Asset Return & Clearance", category: "Exit", description: "Asset clearance", body };
  }

  function buildTransferTemplate(): LetterTemplate {
    const toBranch = company.branches?.find((b) => b.id === toBranchId);
    const body = `Dear {{name}},

Consequent upon organisational requirements, and further to your discussions with the management, you are hereby transferred with effect from ${transferEffective}.

From : ${company.branches?.find((b) => b.id === employee.branchId)?.name ?? company.name} — ${employee.department} — ${employee.designation}
To   : ${toBranch?.name ?? "—"}${toBranch?.city ? ` (${toBranch.city}, ${toBranch.state})` : ""} — ${newDepartment || employee.department} — ${newDesignation || employee.designation}

Reason: ${transferReason}

All other terms and conditions of your employment shall remain unchanged. You are requested to complete a formal handover of your current responsibilities and report at the new location on the effective date.

We wish you the very best in this new assignment.`;
    return { key: "transfer", title: "Transfer Letter", category: "Movement", description: "Transfer", body };
  }

  // ---------- actions ----------
  async function generateExitBundle() {
    const zip = new JSZip();
    const folder = zip.folder(`Exit_${employee.empCode}_${employee.name.replace(/\s+/g, "_")}`)!;

    // Standard exit letters (selected)
    for (const key of EXIT_DOC_KEYS) {
      if (!selectedExitDocs[key]) continue;
      const tpl = DEFAULT_TEMPLATES.find((t) => t.key === key);
      if (!tpl) continue;
      const { blob, filename } = generateLetterPDF(company, employee, tpl, docAssets);
      folder.file(filename, blob);
    }

    // Exit interview
    const ei = generateLetterPDF(company, employee, buildExitInterviewTemplate(), docAssets);
    folder.file(ei.filename, ei.blob);

    // Asset clearance form
    const ac = generateLetterPDF(company, employee, buildAssetClearanceTemplate(), docAssets);
    folder.file(ac.filename, ac.blob);

    // Per-asset return acknowledgements for anything ticked as returned
    for (const x of heldAssets) {
      if (!returnChecked[x.assignment.id] || !x.asset) continue;
      const { blob, filename } = generateAssetHandoverPDF(
        company, employee,
        { name: x.asset.name, tag: x.asset.tag, serial: x.asset.serial, category: x.category?.name, condition: x.asset.condition },
        "return", docAssets,
      );
      folder.file(`AssetReturn_${filename}`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `Exit_${employee.empCode}_${new Date().toISOString().slice(0, 10)}.zip`);
    toast.success("Exit bundle generated");
  }

  function applyExit() {
    // Auto-return every asset the user ticked
    for (const x of heldAssets) {
      if (returnChecked[x.assignment.id] && x.asset) {
        returnAsset(x.assignment.id, currentUser?.name ?? "System", x.asset.condition);
      }
    }
    // Record separation on employee + audit
    updateEmployee(employee.id, {
      // status stays as-is to preserve type safety; separation captured in audit
      remarks: `Exited on ${lastWorkingDate} — ${reason}${rehireEligible ? "" : " · NOT eligible for rehire"}`,
    } as Partial<Employee>);
    addAudit({
      actorName: currentUser?.name ?? "System",
      entity: "employee",
      entityId: employee.id,
      action: "exit",
      newValue: { reason, noticeDate, lastWorkingDate, rehireEligible, exitInterview: ei },
    });
    toast.success(`${employee.name} marked as exited · assets released · audit logged`);
    onClose();
  }

  function applyTransfer() {
    if (!toBranchId) return toast.error("Pick destination branch");
    const patch: Partial<Employee> = { branchId: toBranchId };
    if (newDesignation) patch.designation = newDesignation;
    if (newDepartment) patch.department = newDepartment;
    updateEmployee(employee.id, patch);
    addAudit({
      actorName: currentUser?.name ?? "System",
      entity: "employee",
      entityId: employee.id,
      action: "transfer",
      newValue: { toBranchId, transferEffective, reason: transferReason, newDesignation, newDepartment },
    });
    toast.success(`Transfer applied — letter downloaded`);
    // Auto-download the transfer letter
    void downloadLetter(company, employee, buildTransferTemplate(), "pdf", docAssets);
    onClose();
  }

  async function generateManual(fmt: "pdf" | "docx") {
    const base = DEFAULT_TEMPLATES.find((t) => t.key === manualKey);
    const tpl = base
      ? (manualExtra
          ? { ...base, body: `${base.body}\n\nAdditional Notes:\n${manualExtra}` }
          : base)
      : buildGenericTemplate(manualKey.toUpperCase(), manualKey.replace(/_/g, " "), employee, manualExtra);
    if (fmt === "pdf") {
      const { blob, filename } = generateLetterPDF(company, employee, tpl, docAssets);
      saveAs(blob, filename);
    } else {
      const { blob, filename } = await generateLetterDOCX(company, employee, tpl);
      saveAs(blob, filename);
    }
    toast.success(`${tpl.title} downloaded`);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Employee Lifecycle Actions — {employee.name}
          </DialogTitle>
          <DialogDescription>
            {employee.empCode} · {employee.designation} · {employee.department}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="exit"><DoorOpen className="h-4 w-4 mr-1.5" /> Relieve / Exit</TabsTrigger>
            <TabsTrigger value="transfer"><ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer</TabsTrigger>
            <TabsTrigger value="manual"><FileSignature className="h-4 w-4 mr-1.5" /> Manual Letter</TabsTrigger>
          </TabsList>

          {/* ---------- EXIT ---------- */}
          <TabsContent value="exit" className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Notice Date"><Input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} /></Field>
              <Field label="Last Working Date"><Input type="date" value={lastWorkingDate} onChange={(e) => setLastWorkingDate(e.target.value)} /></Field>
              <Field label="Reason">
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXIT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Reason details">
              <Textarea rows={2} value={ei.reasonDetails} onChange={(e) => setEi({ ...ei, reasonDetails: e.target.value })} placeholder="Optional context…" />
            </Field>

            <div className="rounded-xl border p-3 space-y-2 bg-muted/30">
              <div className="text-sm font-semibold flex items-center gap-1.5"><MessageSquareQuote className="h-4 w-4 text-primary" /> Exit Interview</div>
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="What did you like most?"><Textarea rows={2} value={ei.likedMost} onChange={(e) => setEi({ ...ei, likedMost: e.target.value })} /></Field>
                <Field label="What would you change?"><Textarea rows={2} value={ei.likedLeast} onChange={(e) => setEi({ ...ei, likedLeast: e.target.value })} /></Field>
                <Field label="Suggestions"><Textarea rows={2} value={ei.suggestions} onChange={(e) => setEi({ ...ei, suggestions: e.target.value })} /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Culture (/5)"><Input type="number" min={1} max={5} value={ei.ratingCulture} onChange={(e) => setEi({ ...ei, ratingCulture: e.target.value })} /></Field>
                  <Field label="Manager (/5)"><Input type="number" min={1} max={5} value={ei.ratingManager} onChange={(e) => setEi({ ...ei, ratingManager: e.target.value })} /></Field>
                  <Field label="Comp (/5)"><Input type="number" min={1} max={5} value={ei.ratingCompensation} onChange={(e) => setEi({ ...ei, ratingCompensation: e.target.value })} /></Field>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={rehireEligible} onCheckedChange={(v) => setRehireEligible(!!v)} />
                Eligible for re-hire
              </label>
            </div>

            <div className="rounded-xl border p-3 space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1.5"><PackageCheck className="h-4 w-4 text-primary" /> Asset Return Checklist</div>
              {heldAssets.length === 0 ? (
                <div className="text-xs text-muted-foreground">No company assets are currently held by this employee.</div>
              ) : (
                <div className="space-y-1.5">
                  {heldAssets.map((x) => (
                    <label key={x.assignment.id} className="flex items-center gap-2 text-sm rounded border p-2 hover:bg-muted/40">
                      <Checkbox
                        checked={!!returnChecked[x.assignment.id]}
                        onCheckedChange={(v) => setReturnChecked((s) => ({ ...s, [x.assignment.id]: !!v }))}
                      />
                      <span className="flex-1">
                        <b>{x.asset!.name}</b> <span className="text-xs text-muted-foreground">· {x.asset!.tag}{x.asset!.serial ? ` · SN ${x.asset!.serial}` : ""} · {x.category?.name ?? "—"}</span>
                      </span>
                      {returnChecked[x.assignment.id] && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Return acknowledged</Badge>}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border p-3 space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1.5"><FileSignature className="h-4 w-4 text-primary" /> Exit Documents</div>
              <div className="grid gap-1.5 md:grid-cols-2">
                {EXIT_DOC_KEYS.map((k) => {
                  const t = DEFAULT_TEMPLATES.find((x) => x.key === k)!;
                  return (
                    <label key={k} className="flex items-center gap-2 text-sm rounded border p-2 hover:bg-muted/40">
                      <Checkbox
                        checked={!!selectedExitDocs[k]}
                        onCheckedChange={(v) => setSelectedExitDocs((s) => ({ ...s, [k]: !!v }))}
                      />
                      <span className="flex-1">{t.title} <span className="text-xs text-muted-foreground">· {t.description}</span></span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">Exit Interview report and Asset Clearance form are always included.</p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={generateExitBundle}>
                <FileDown className="h-4 w-4 mr-1.5" /> Generate Exit Bundle (ZIP)
              </Button>
              <Button onClick={applyExit} className="bg-gradient-brand text-white">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Complete Exit
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ---------- TRANSFER ---------- */}
          <TabsContent value="transfer" className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Destination Branch">
                <Select value={toBranchId} onValueChange={setToBranchId}>
                  <SelectTrigger><SelectValue placeholder="Pick a branch…" /></SelectTrigger>
                  <SelectContent>
                    {(company.branches ?? []).filter((b) => b.id !== employee.branchId).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {b.name} · {b.city}, {b.state}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Effective Date"><Input type="date" value={transferEffective} onChange={(e) => setTransferEffective(e.target.value)} /></Field>
              <Field label="New Designation (optional)"><Input value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} placeholder={employee.designation} /></Field>
              <Field label="New Department (optional)"><Input value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder={employee.department} /></Field>
            </div>
            <Field label="Reason"><Textarea rows={2} value={transferReason} onChange={(e) => setTransferReason(e.target.value)} /></Field>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!toBranchId) return toast.error("Pick destination branch");
                  await downloadLetter(company, employee, buildTransferTemplate(), "pdf", docAssets);
                  toast.success("Transfer letter downloaded");
                }}
              >
                <FileDown className="h-4 w-4 mr-1.5" /> Download Transfer Letter
              </Button>
              <Button onClick={applyTransfer} className="bg-gradient-brand text-white">
                <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Apply Transfer
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ---------- MANUAL ---------- */}
          <TabsContent value="manual" className="space-y-4 pt-4">
            <Field label="Letter template">
              <Select value={manualKey} onValueChange={(v) => setManualKey(v as LetterKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {DEFAULT_TEMPLATES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      <span className="text-xs"><b>{t.title}</b> · <span className="text-muted-foreground">{t.category}</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Additional notes (appended to letter body)">
              <Textarea rows={4} value={manualExtra} onChange={(e) => setManualExtra(e.target.value)} placeholder="Add any custom clauses, remarks or amounts…" />
            </Field>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5" />
              Letters auto-embed your uploaded letterhead, seal and signature from <b>Settings → Company Documents</b>.
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => generateManual("docx")}>
                <FileDown className="h-4 w-4 mr-1.5" /> Download DOCX
              </Button>
              <Button onClick={() => generateManual("pdf")} className="bg-gradient-brand text-white">
                <FileDown className="h-4 w-4 mr-1.5" /> Download PDF
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
