import { useMemo, useState } from "react";
import { useCompliance } from "@/lib/compliance-store";
import { useComplianceMaster } from "@/lib/compliance-master-store";
import {
  applicableMaster, summariseMaster, CATEGORY_LABEL,
  type Category, type MasterItem, type MasterStatus,
} from "@/lib/compliance-master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Download, Search, Filter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_COLORS: Record<MasterStatus, string> = {
  green: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  red: "bg-destructive/15 text-destructive border-destructive/30",
  na: "bg-muted text-muted-foreground border-border",
  pending: "bg-primary/10 text-primary border-primary/30",
};
const STATUSES: MasterStatus[] = ["green", "amber", "red", "na", "pending"];

const FREQ_LABEL: Record<string, string> = {
  daily: "Daily", monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-Yearly",
  annual: "Annual", biennial: "Biennial", one_time: "One-Time", on_event: "On Event", ongoing: "Ongoing",
};

export function ComplianceMasterTab() {
  const { profile } = useCompliance();
  const { customItems, statuses, addItem, deleteItem, setStatus, materializedCustom } = useComplianceMaster();
  const [cat, setCat] = useState<Category | "all">("all");
  const [q, setQ] = useState("");

  const items = useMemo(() => applicableMaster(profile, materializedCustom()), [profile, customItems, materializedCustom]);
  const filtered = items.filter((i) =>
    (cat === "all" || i.category === cat) &&
    (q === "" || (i.title + i.act + (i.code ?? "")).toLowerCase().includes(q.toLowerCase()))
  );
  const summary = summariseMaster(items, statuses);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of items) m[i.category] = (m[i.category] || 0) + 1;
    return m;
  }, [items]);

  function exportConsolidatedPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text("Consolidated Statutory Compliance Status", 14, 15);
    doc.setFontSize(9);
    doc.text(`Profile: ${profile.state} · ${profile.industry} · ${profile.establishmentType} · ${profile.employeeCount} employees`, 14, 22);
    doc.text(`Score: ${summary.complianceScore}%  ·  Green ${summary.green}  ·  Amber ${summary.amber}  ·  Red ${summary.red}  ·  N/A ${summary.na}  ·  Pending ${summary.pending}`, 14, 28);
    autoTable(doc, {
      startY: 34, styles: { fontSize: 7 }, headStyles: { fillColor: [20, 160, 170] },
      head: [["#", "Compliance", "Category", "Frequency", "Status", "Remarks"]],
      body: items.map((it, idx) => {
        const s = statuses[it.id]?.status ?? "pending";
        const r = statuses[it.id]?.remarks ?? "";
        return [String(idx + 1), `${it.title}${it.code ? ` (${it.code})` : ""}\n${it.act}`, CATEGORY_LABEL[it.category], FREQ_LABEL[it.frequency] || it.frequency, s.toUpperCase(), r];
      }),
    });
    doc.save(`compliance-consolidated-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Consolidated PDF downloaded");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4 bg-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-medium">Consolidated Statutory Master</div>
            <div className="text-xs text-muted-foreground">Every applicable Act, Register, Notice, Abstract, Return, Licence, Testing item and Welfare facility — filtered by state, industry, headcount, women, contract & hazardous flags.</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] uppercase text-muted-foreground">Compliance Score</div>
              <div className="text-2xl font-semibold">{summary.complianceScore}%</div>
            </div>
            <Button variant="outline" size="sm" onClick={exportConsolidatedPDF}><Download className="h-4 w-4 mr-1" />Consolidated PDF</Button>
            <AddMasterItemDialog />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
          <Chip label="Green (Complied)" value={summary.green} tone="green" />
          <Chip label="Amber (Partial)" value={summary.amber} tone="amber" />
          <Chip label="Red (Not Complied)" value={summary.red} tone="red" />
          <Chip label="Not Applicable" value={summary.na} tone="na" />
          <Chip label="Pending Review" value={summary.pending} tone="pending" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9 w-64" placeholder="Search Act, Form, Register…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button onClick={() => setCat("all")} className={`text-xs px-2 py-1 rounded border ${cat === "all" ? "bg-primary text-primary-foreground border-primary" : ""}`}>All ({items.length})</button>
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => categoryCounts[c] ? (
            <button key={c} onClick={() => setCat(c)} className={`text-xs px-2 py-1 rounded border ${cat === c ? "bg-primary text-primary-foreground border-primary" : ""}`}>{CATEGORY_LABEL[c]} ({categoryCounts[c]})</button>
          ) : null)}
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Compliance</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Frequency</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Remarks</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const rec = statuses[it.id];
              const s = rec?.status ?? "pending";
              const isCustom = customItems.some((c) => c.id === it.id);
              return (
                <tr key={it.id} className="border-t align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {it.title}
                      {it.code && <span className="ml-1 text-xs text-muted-foreground">({it.code})</span>}
                      {isCustom && <Badge variant="outline" className="ml-2 text-[10px]">Custom</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{it.act}{it.authority ? ` · ${it.authority}` : ""}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{CATEGORY_LABEL[it.category]}</td>
                  <td className="px-3 py-2 text-xs">
                    {FREQ_LABEL[it.frequency] || it.frequency}
                    {it.dueDay ? <div className="text-[10px] text-muted-foreground">Due day {it.dueDay}{it.dueMonth ? `/${it.dueMonth}` : ""}</div> : null}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={`h-8 text-xs rounded border px-2 ${STATUS_COLORS[s]}`}
                      value={s}
                      onChange={(e) => setStatus(it.id, { status: e.target.value as MasterStatus, updatedBy: "admin" })}
                    >
                      {STATUSES.map((x) => <option key={x} value={x}>{x.toUpperCase()}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. Filed on 12.04.2024 – Ref #1234"
                      defaultValue={rec?.remarks ?? ""}
                      onBlur={(e) => setStatus(it.id, { remarks: e.target.value, updatedBy: "admin" })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isCustom && (
                      <Button variant="ghost" size="sm" onClick={() => { deleteItem(it.id); toast.success("Removed"); }}>×</Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">No compliance items match the current filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  function AddMasterItemDialog() {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
      title: "", act: "", code: "", authority: "",
      category: "register" as Category, frequency: "ongoing" as MasterItem["frequency"],
      appliesExpr: "always" as "always" | "factory" | "shop" | "women" | "contract" | "hazardous",
    });
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Item</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs col-span-2">Title<Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="text-xs">Act / Rule<Input value={form.act} onChange={(e) => setForm({ ...form, act: e.target.value })} /></label>
            <label className="text-xs">Form / Code<Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            <label className="text-xs">Authority<Input value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} /></label>
            <label className="text-xs">Category
              <select className="h-9 w-full rounded border px-2 text-sm bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </label>
            <label className="text-xs">Frequency
              <select className="h-9 w-full rounded border px-2 text-sm bg-background" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as MasterItem["frequency"] })}>
                {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="text-xs col-span-2">Applies When
              <select className="h-9 w-full rounded border px-2 text-sm bg-background" value={form.appliesExpr} onChange={(e) => setForm({ ...form, appliesExpr: e.target.value as typeof form.appliesExpr })}>
                <option value="always">Always applies</option>
                <option value="factory">Only if establishment = factory</option>
                <option value="shop">Only if establishment ≠ factory</option>
                <option value="women">Only if women employees &gt; 0</option>
                <option value="contract">Only if contract labour engaged</option>
                <option value="hazardous">Only if hazardous process</option>
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.title || !form.act) return toast.error("Title and Act are required");
              addItem(form);
              toast.success("Added to master library");
              setOpen(false);
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}

function Chip({ label, value, tone }: { label: string; value: number; tone: MasterStatus }) {
  return (
    <div className={`rounded-md border p-2 ${STATUS_COLORS[tone]}`}>
      <div className="text-[10px] uppercase opacity-80">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
