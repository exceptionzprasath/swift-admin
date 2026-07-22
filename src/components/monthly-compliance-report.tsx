import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useMonthlyReports, summarize, type MonthlyStatus } from "@/lib/monthly-report-store";
import { TN_MONTHLY_CHECKLIST } from "@/lib/tn-monthly-checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Save, RotateCcw, Search, Lock, Unlock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_LABEL: Record<MonthlyStatus, string> = { P: "Complied", D: "Delay/Default", N: "Not Complied", NA: "Not Applicable" };
const STATUS_COLOR: Record<MonthlyStatus, string> = {
  P: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  D: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  N: "bg-destructive/15 text-destructive border-destructive/30",
  NA: "bg-muted text-muted-foreground border-border",
};

export function MonthlyReportTab() {
  const company = useStore((s) => s.company);
  const branches = company.branches ?? [];
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "hq");
  const branch = branches.find((b) => b.id === branchId);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MonthlyStatus>("all");

  const { ensureReport, updateHeader, updateItem, bulkSeed, finalize, remove } = useMonthlyReports();
  const report = ensureReport(branchId, month);
  const s = summarize(report.items);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return TN_MONTHLY_CHECKLIST.filter((it) => {
      const status = report.items[it.n]?.status ?? it.seed;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!ql) return true;
      return (
        String(it.n).includes(ql) ||
        it.act.toLowerCase().includes(ql) ||
        it.compliance.toLowerCase().includes(ql) ||
        it.description.toLowerCase().includes(ql)
      );
    });
  }, [q, statusFilter, report.items]);

  const monthLabel = new Date(month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });
  const factoryName = report.header.factoryName || branch?.name || company.legalName;

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Title bar
    doc.setFillColor(20, 160, 170);
    doc.rect(0, 0, pageW, 16, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${company.legalName.toUpperCase()} — MONTHLY REPORT (${monthLabel})`, pageW / 2, 10, { align: "center" });
    doc.setTextColor(0);

    // Header meta
    const h = report.header;
    const meta: [string, string][] = [
      ["Name of the Factory", factoryName],
      ["Address", h.address || branch?.address || company.address],
      ["Date of opening / Commencement", h.dateOfOpening],
      ["Name of the Factory Manager", h.factoryManager],
      ["Nature of Industry", h.natureOfIndustry],
      ["Name of the UHRM", h.hrHead],
      ["Name of the Factory Co-ordinator", h.factoryCoordinator],
      ["Factory Medical Advisor", h.medicalAdvisor],
      ["Safety, Health & Environment Representative", h.sheRepresentative],
      ["Date of Observation", h.dateOfObservation],
    ];
    const ML = 10, MR = 10;
    const contentW = pageW - ML - MR;
    autoTable(doc, {
      startY: 20,
      margin: { left: ML, right: MR },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      body: meta,
      columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 1: { cellWidth: contentW - 70 } },
    });


    // Checklist
    const startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
    const body = TN_MONTHLY_CHECKLIST.map((it) => {
      const st = report.items[it.n];
      const status = st?.status ?? it.seed;
      const marks = { P: "", D: "", N: "", NA: "" };
      marks[status] = "P";
      return [
        String(it.n),
        it.act,
        it.compliance,
        it.description,
        marks.P, marks.D, marks.N, marks.NA,
        st?.remarks ?? "",
      ];
    });
    autoTable(doc, {
      startY,
      margin: { left: ML, right: MR },
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: 1, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: [20, 160, 170], textColor: 255, fontSize: 7, halign: "center" },
      head: [["S.No", "Act", "Compliance", "Description", "Complied", "Delay", "Not Complied", "N/A", "Remarks"]],
      body,
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 60 },
        4: { cellWidth: 12, halign: "center", fontStyle: "bold" },
        5: { cellWidth: 12, halign: "center", fontStyle: "bold" },
        6: { cellWidth: 15, halign: "center", fontStyle: "bold" },
        7: { cellWidth: 12, halign: "center", fontStyle: "bold" },
        8: { cellWidth: "auto" },
      },
      didDrawPage: () => {
        const p = doc.getNumberOfPages();
        doc.setFontSize(7); doc.setTextColor(120);
        doc.text(`Page ${p}`, pageW - 10, doc.internal.pageSize.getHeight() - 5, { align: "right" });
        doc.setTextColor(0);
      },
    });

    // Summary
    const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
    autoTable(doc, {
      startY: y2,
      margin: { left: ML, right: MR },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.5, fontStyle: "bold" },
      body: [
        ["COMPLIED", String(s.P), "", "", ""],
        ["DELAY / DEFAULT COMPLIANCE", "", String(s.D), "", ""],
        ["NOT COMPLIED", "", "", String(s.N), ""],
        ["Not Applicable", "", "", "", String(s.NA)],
        ["TOTAL", "", "", "", String(s.total)],
      ],
      columnStyles: {
        0: { cellWidth: 70 }, 1: { cellWidth: 25, halign: "center" }, 2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 25, halign: "center" }, 4: { cellWidth: 25, halign: "center" },
      },
    });

    doc.save(`Monthly_Compliance_${(factoryName || "Factory").replace(/\s+/g, "_")}_${month}.pdf`);
    toast.success("Monthly compliance report downloaded");
  };

  const finalized = !!report.finalizedAt;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-2xl border p-4 bg-card grid gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">Branch</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches.length === 0 && <option value="hq">Head Office</option>}
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.state}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Report Month</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex items-end gap-2 flex-wrap">
          <Button size="sm" onClick={downloadPDF}><Download className="h-4 w-4 mr-1" />Download Monthly PDF</Button>
          {!finalized ? (
            <Button size="sm" variant="secondary" onClick={() => { finalize(branchId, month, "admin"); toast.success("Report finalized & locked"); }}>
              <Lock className="h-4 w-4 mr-1" />Finalize
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => { remove(branchId, month); toast.success("Report reopened"); }}>
              <Unlock className="h-4 w-4 mr-1" />Reopen
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => { bulkSeed(branchId, month); toast.success("Reset to seed statuses"); }}>
            <RotateCcw className="h-4 w-4 mr-1" />Reset to Seed
          </Button>
        </div>
      </div>

      {/* Header meta editor */}
      <div className="rounded-2xl border p-4 bg-card space-y-3">
        <div className="text-sm font-semibold">Report Header</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["factoryName", "Name of the Factory"],
            ["address", "Address"],
            ["dateOfOpening", "Date of opening / Commencement"],
            ["factoryManager", "Factory Manager"],
            ["natureOfIndustry", "Nature of Industry"],
            ["hrHead", "UHRM / HR Head"],
            ["factoryCoordinator", "Factory Co-ordinator"],
            ["medicalAdvisor", "Factory Medical Advisor"],
            ["sheRepresentative", "SHE Representative"],
            ["dateOfObservation", "Date of Observation"],
          ].map(([key, label]) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                disabled={finalized}
                value={(report.header as unknown as Record<string, string>)[key] ?? ""}
                onChange={(e) => updateHeader(branchId, month, { [key]: e.target.value } as never)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border p-4 bg-card"><div className="text-xs text-muted-foreground">Complied</div><div className="text-2xl font-bold text-emerald-600">{s.P}</div></div>
        <div className="rounded-2xl border p-4 bg-card"><div className="text-xs text-muted-foreground">Delay / Default</div><div className="text-2xl font-bold text-amber-600">{s.D}</div></div>
        <div className="rounded-2xl border p-4 bg-card"><div className="text-xs text-muted-foreground">Not Complied</div><div className="text-2xl font-bold text-destructive">{s.N}</div></div>
        <div className="rounded-2xl border p-4 bg-card"><div className="text-xs text-muted-foreground">Not Applicable</div><div className="text-2xl font-bold">{s.NA}</div></div>
        <div className="rounded-2xl border p-4 bg-card"><div className="text-xs text-muted-foreground">Compliance Score</div><div className="text-2xl font-bold text-primary">{s.score}%</div></div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search act / compliance / description…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(["all", "P", "D", "N", "NA"] as const).map((k) => (
            <Button key={k} size="sm" variant={statusFilter === k ? "default" : "outline"} onClick={() => setStatusFilter(k)}>
              {k === "all" ? "All" : STATUS_LABEL[k]}
            </Button>
          ))}
        </div>
        {finalized && <Badge variant="secondary" className="ml-auto"><Lock className="h-3 w-3 mr-1" />Locked — {new Date(report.finalizedAt!).toLocaleString()}</Badge>}
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="text-left">
                <th className="p-2 w-10">#</th>
                <th className="p-2 w-56">Act</th>
                <th className="p-2 w-52">Compliance</th>
                <th className="p-2">Description</th>
                <th className="p-2 w-36">Status</th>
                <th className="p-2 w-64">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const cur = report.items[it.n] ?? { status: it.seed as MonthlyStatus, remarks: "" };
                return (
                  <tr key={it.n} className="border-t align-top hover:bg-muted/20">
                    <td className="p-2 font-mono">{it.n}</td>
                    <td className="p-2 text-muted-foreground">{it.act}</td>
                    <td className="p-2 font-medium">{it.compliance}</td>
                    <td className="p-2 text-muted-foreground">{it.description}</td>
                    <td className="p-2">
                      <select
                        disabled={finalized}
                        className={`h-8 w-full rounded-md border bg-background px-2 text-xs ${STATUS_COLOR[cur.status]}`}
                        value={cur.status}
                        onChange={(e) => updateItem(branchId, month, it.n, { status: e.target.value as MonthlyStatus })}
                      >
                        <option value="P">Complied</option>
                        <option value="D">Delay / Default</option>
                        <option value="N">Not Complied</option>
                        <option value="NA">Not Applicable</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <Textarea
                        disabled={finalized}
                        rows={1}
                        className="min-h-[36px] text-xs"
                        value={cur.remarks}
                        onChange={(e) => updateItem(branchId, month, it.n, { remarks: e.target.value })}
                        placeholder="Remarks / evidence / reference…"
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No items match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Save className="h-3 w-3" />All changes are saved automatically to this browser for <b>{branch?.name ?? "Head Office"}</b> · {monthLabel}.
      </div>
    </div>
  );
}
