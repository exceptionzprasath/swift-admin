import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import JSZip from "jszip";
import { useStore } from "@/lib/store";
import {
  COMPLIANCE_DOC_CATALOG,
  renderComplianceDocPDF,
  findDocsByQuery,
  parseComplianceCommand,
  type ComplianceDocSpec,
} from "@/lib/compliance-docs";
import { MASTER_REGISTERS, specFor } from "@/lib/master-registers";
import { useComplianceDocs, blobToDataUrl } from "@/lib/compliance-docs-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, Download, Archive, FileText, ShieldCheck, Sparkles,
  QrCode, Stamp, PenLine, Layers, Trash2, Mail, MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/compliance-docs")({
  head: () => ({ meta: [{ title: "Compliance Documents · SWIFT AI" }] }),
  component: Page,
});

function Page() {
  const { company, employees } = useStore();
  const [q, setQ] = useState("");
  const [aiCmd, setAiCmd] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const { docs, archive, signDoc, remove } = useComplianceDocs();

  const results = useMemo(() => (q.trim() ? findDocsByQuery(q) : COMPLIANCE_DOC_CATALOG), [q]);
  const grouped = useMemo(() => {
    const g: Record<string, ComplianceDocSpec[]> = {};
    for (const r of results) (g[r.act] ||= []).push(r);
    return g;
  }, [results]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const generateOne = async (spec: ComplianceDocSpec) => {
    setBusy(true);
    try {
      const { blob, filename, ref } = await renderComplianceDocPDF(spec, { company, employees });
      const dataUrl = await blobToDataUrl(blob);
      archive({
        specId: spec.id, code: spec.code, title: spec.title,
        ref, filename, dataUrl, size: blob.size,
        createdBy: "admin@swift", approvals: [], signed: false, sealed: !!spec.requiresSeal,
        watermark: spec.watermark, tags: [spec.act, spec.kind],
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${spec.code} generated & archived`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const generateBulk = async (specs: ComplianceDocSpec[]) => {
    if (!specs.length) return toast.error("Nothing selected");
    setBusy(true);
    try {
      const zip = new JSZip();
      for (const s of specs) {
        const { blob, filename, ref } = await renderComplianceDocPDF(s, { company, employees });
        zip.file(filename, blob);
        const dataUrl = await blobToDataUrl(blob);
        archive({
          specId: s.id, code: s.code, title: s.title,
          ref, filename, dataUrl, size: blob.size,
          createdBy: "admin@swift", approvals: [], signed: false, sealed: !!s.requiresSeal,
          watermark: s.watermark, tags: [s.act, s.kind],
        });
      }
      const bundle = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(bundle);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SWIFT_Compliance_Bundle_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Generated ${specs.length} document(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const runAiCommand = async () => {
    const specs = parseComplianceCommand(aiCmd);
    if (!specs.length) return toast.error("I couldn't match that. Try 'generate Form 12' or 'generate all monthly statutory documents'.");
    toast(`SWIFT AI matched ${specs.length} document(s)`);
    await generateBulk(specs);
    setAiCmd("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Compliance Document Automation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Government forms, registers, returns, notices, licences, letters, certificates, reports —
          auto-filled from Company, Branches, Employees, Attendance, Payroll, Leave, Assets & Compliance masters.
        </p>
      </div>

      {/* AI Command bar */}
      <div className="rounded-xl border border-border bg-gradient-brand/10 p-4 flex flex-col sm:flex-row gap-2">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-2 sm:mt-0" />
        <Input
          value={aiCmd}
          onChange={(e) => setAiCmd(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runAiCommand(); }}
          placeholder="Ask SWIFT AI — 'Generate Form 12', 'Generate Wage Register', 'Generate all monthly statutory documents'…"
          className="flex-1 bg-background"
        />
        <Button onClick={runAiCommand} disabled={busy || !aiCmd.trim()} className="bg-gradient-brand text-white">
          <Sparkles className="h-4 w-4 mr-1" /> Run
        </Button>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog"><FileText className="h-4 w-4 mr-1" /> Catalog ({COMPLIANCE_DOC_CATALOG.length})</TabsTrigger>
          <TabsTrigger value="registers"><Layers className="h-4 w-4 mr-1" /> Master Registers ({MASTER_REGISTERS.length})</TabsTrigger>
          <TabsTrigger value="archive"><Archive className="h-4 w-4 mr-1" /> Archive ({docs.length})</TabsTrigger>
        </TabsList>

        {/* Catalog */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search forms, registers, returns…" className="pl-9" />
            </div>
            <Badge variant="outline">{selected.size} selected</Badge>
            <Button
              variant="outline"
              onClick={() => generateBulk(COMPLIANCE_DOC_CATALOG.filter((d) => selected.has(d.id)))}
              disabled={busy || selected.size === 0}
            >
              <Download className="h-4 w-4 mr-1" /> Bulk ZIP
            </Button>
          </div>

          <div className="space-y-6">
            {Object.entries(grouped).map(([act, list]) => (
              <div key={act}>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{act}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {list.map((d) => (
                    <div key={d.id} className="rounded-lg border border-border p-3 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggle(d.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium text-sm">{d.code} — {d.title}</div>
                          <Badge variant="secondary" className="text-[10px]">{d.kind}</Badge>
                          <Badge variant="outline" className="text-[10px]">{d.frequency}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{d.purpose}</div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {d.requiresSignature && <Badge variant="outline" className="text-[10px]"><PenLine className="h-3 w-3 mr-1" /> Sign</Badge>}
                          {d.requiresSeal && <Badge variant="outline" className="text-[10px]"><Stamp className="h-3 w-3 mr-1" /> Seal</Badge>}
                          {d.requiresQR && <Badge variant="outline" className="text-[10px]"><QrCode className="h-3 w-3 mr-1" /> QR</Badge>}
                          {d.watermark && <Badge variant="outline" className="text-[10px]">Watermark</Badge>}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => generateOne(d)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Registers */}
        <TabsContent value="registers" className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            {MASTER_REGISTERS.map((r) => {
              const spec = specFor(r.id);
              return (
                <div key={r.id} className="rounded-lg border border-border p-3 flex items-start gap-3">
                  <Layers className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.act} · {r.frequency} · source: {r.autoSource}</div>
                    {!spec && <div className="text-[10px] mt-1 text-amber-600 dark:text-amber-400">Auto-maintained internally · export via matching Form</div>}
                  </div>
                  {spec && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => generateOne(spec)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Archive */}
        <TabsContent value="archive" className="space-y-2">
          {docs.length === 0 && (
            <div className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-lg">
              No documents yet. Generate any form from the Catalog tab to archive it here.
            </div>
          )}
          {docs.map((d) => (
            <div key={d.id} className="rounded-lg border border-border p-3 flex items-start gap-3">
              <FileText className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-medium text-sm">{d.code} — {d.title}</div>
                  <Badge variant="outline" className="text-[10px]">v{d.version}</Badge>
                  {d.signed && <Badge className="text-[10px] bg-emerald-600">Signed</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(d.createdAt).toLocaleString("en-IN")} · Ref: {d.ref} · {(d.size / 1024).toFixed(1)} KB
                </div>
                {d.approvals.length > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Approvals: {d.approvals.map((a) => `${a.by} (${a.role})`).join(" → ")}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { const a = document.createElement("a"); a.href = d.dataUrl; a.download = d.filename; a.click(); }}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {!d.signed && (
                  <Button size="sm" variant="outline" onClick={() => { signDoc(d.id, "admin@swift", "HR Manager"); toast.success("Digitally signed"); }}>
                    <PenLine className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(d.dataUrl); toast("Attachment copied — paste into email"); }}>
                  <Mail className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => { const t = `SWIFT AI Compliance — ${d.code} v${d.version} · Ref ${d.ref}`; window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank"); }}>
                  <MessageCircle className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { remove(d.id); toast("Removed"); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
