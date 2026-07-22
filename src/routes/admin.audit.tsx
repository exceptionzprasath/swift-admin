import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log · SWIFT" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { auditLog } = useStore();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return auditLog;
    return auditLog.filter((e) =>
      [e.actorName, e.entity, e.action, e.entityId, e.ip, e.device].some((x) => (x ?? "").toString().toLowerCase().includes(t)),
    );
  }, [auditLog, q]);

  const exportCsv = () => {
    const rows = [
      ["Timestamp", "Actor", "Entity", "EntityId", "Action", "Device", "Old", "New"],
      ...filtered.map((e) => [
        e.ts, e.actorName, e.entity, e.entityId ?? "", e.action, e.device ?? "",
        JSON.stringify(e.oldValue ?? ""), JSON.stringify(e.newValue ?? ""),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Audit Log</h1>
          <p className="text-sm text-muted-foreground">Every registration, update, and approval is tracked here.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, entity, action…" className="w-64" />
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1.5" /> CSV</Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No audit entries yet.</td></tr>
            ) : filtered.map((e) => (
              <tr key={e.id} className="border-t border-border align-top">
                <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(e.ts).toLocaleString()}</td>
                <td className="p-3">{e.actorName}</td>
                <td className="p-3"><Badge variant="outline">{e.action}</Badge></td>
                <td className="p-3 text-xs">{e.entity}{e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ""}</td>
                <td className="p-3 text-xs text-muted-foreground max-w-md">
                  {e.newValue ? <div><b>new:</b> {JSON.stringify(e.newValue).slice(0, 160)}</div> : null}
                  {e.oldValue ? <div><b>old:</b> {JSON.stringify(e.oldValue).slice(0, 160)}</div> : null}
                  {e.device ? <div className="opacity-70">{e.device}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
