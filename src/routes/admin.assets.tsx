import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Asset, AssetCategory, AssetCondition, AssetStatus } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Trash2, UserPlus, Undo2, Boxes, ListChecks, History, FileDown } from "lucide-react";
import { toast } from "sonner";
import { ESignPad } from "@/components/esign-pad";
import { generateAssetHandoverPDF } from "@/lib/documents";
import pkg from "file-saver";
const { saveAs } = pkg;

export const Route = createFileRoute("/admin/assets")({
  head: () => ({ meta: [{ title: "Asset Management · SWIFT" }] }),
  component: AssetsPage,
});

const CONDITIONS: AssetCondition[] = ["new", "good", "fair", "damaged"];
const STATUSES: AssetStatus[] = ["available", "assigned", "repair", "retired", "lost"];

const statusColor: Record<AssetStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  assigned: "bg-primary/15 text-primary border-primary/30",
  repair: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  retired: "bg-muted text-muted-foreground border-border",
  lost: "bg-red-500/15 text-red-600 border-red-500/30",
};

function AssetsPage() {
  const {
    assetCategories, assets, assetAssignments, employees, company, docAssets,
    addAsset, updateAsset, deleteAsset,
    addAssetCategory, updateAssetCategory, deleteAssetCategory,
    assignAsset, returnAsset, currentUser,
  } = useStore();

  const [tab, setTab] = useState("inventory");
  const [assetOpen, setAssetOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<Asset | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";
  const catName = (id: string) => assetCategories.find((c) => c.id === id)?.name ?? "—";
  const branchName = (id?: string) => company.branches?.find((b) => b.id === id)?.name ?? "—";

  const totals = useMemo(() => {
    const t = { total: assets.length, assigned: 0, available: 0, repair: 0, retired: 0, value: 0 };
    for (const a of assets) {
      if (a.status === "assigned") t.assigned++;
      else if (a.status === "available") t.available++;
      else if (a.status === "repair") t.repair++;
      else if (a.status === "retired") t.retired++;
      t.value += a.purchaseCost ?? 0;
    }
    return t;
  }, [assets]);

  const activeAssignments = assetAssignments.filter((x) => !x.returnedAt);
  const history = assetAssignments.filter((x) => x.returnedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Asset Management
          </h1>
          <p className="text-sm text-muted-foreground">Track laptops, phones, ID cards, uniforms and every company-issued asset — with e-signed handovers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatOpen(true)}><ListChecks className="h-4 w-4 mr-2" /> Categories</Button>
          <Button onClick={() => setAssetOpen(true)} className="bg-gradient-brand text-white"><Plus className="h-4 w-4 mr-2" /> New Asset</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Boxes className="h-4 w-4" />} label="Total" value={totals.total} />
        <StatCard label="Assigned" value={totals.assigned} tone="primary" />
        <StatCard label="Available" value={totals.available} tone="emerald" />
        <StatCard label="In Repair" value={totals.repair} tone="amber" />
        <StatCard label="Book Value" value={`₹${totals.value.toLocaleString("en-IN")}`} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="assignments">Active Assignments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-3 pt-4">
          {assets.length === 0 && (
            <EmptyState onNew={() => setAssetOpen(true)} />
          )}
          <div className="grid gap-3">
            {assets.map((a) => {
              const active = activeAssignments.find((x) => x.assetId === a.id);
              return (
                <Card key={a.id} className="hover:shadow-soft transition-shadow">
                  <CardContent className="p-4 flex flex-wrap items-center gap-4">
                    <div className="h-14 w-14 rounded-lg bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0">
                      {a.photoDataUrl
                        ? <img src={a.photoDataUrl} alt="" className="h-full w-full object-cover" />
                        : <Package className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold truncate">{a.name}</div>
                        <Badge variant="outline" className={statusColor[a.status]}>{a.status}</Badge>
                        <Badge variant="secondary">{catName(a.categoryId)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Tag <code className="text-foreground">{a.tag}</code>
                        {a.serial && <> · SN {a.serial}</>}
                        {a.brand && <> · {a.brand} {a.model}</>}
                        {" · "}Condition: {a.condition}
                        {" · "}Branch: {branchName(a.branchId)}
                        {active && <> · Held by <b className="text-foreground">{empName(active.employeeId)}</b></>}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {a.status === "available" && (
                        <Button size="sm" onClick={() => setAssignOpen(a)}><UserPlus className="h-3.5 w-3.5 mr-1" /> Assign</Button>
                      )}
                      {a.status === "assigned" && active && (
                        <Button size="sm" variant="outline" onClick={() => {
                          returnAsset(active.id, currentUser?.name || "System", a.condition);
                          const emp = employees.find((e) => e.id === active.employeeId);
                          const cat = assetCategories.find((c) => c.id === a.categoryId);
                          if (emp) {
                            try {
                              const { blob, filename } = generateAssetHandoverPDF(
                                company, emp,
                                { name: a.name, tag: a.tag, serial: a.serial, category: cat?.name, condition: a.condition },
                                "return", docAssets,
                              );
                              saveAs(blob, filename);
                            } catch { /* ignore */ }
                          }
                          toast.success("Asset returned · Return letter generated");
                        }}><Undo2 className="h-3.5 w-3.5 mr-1" /> Return</Button>
                      )}
                      <Select value={a.status} onValueChange={(v) => updateAsset(a.id, { status: v as AssetStatus })}>
                        <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this asset?")) deleteAsset(a.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Currently held assets</CardTitle></CardHeader>
            <CardContent className="p-0">
              {activeAssignments.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Nothing is currently held out.</div>
              ) : (
                <div className="divide-y">
                  {activeAssignments.map((x) => {
                    const a = assets.find((y) => y.id === x.assetId);
                    if (!a) return null;
                    return (
                      <div key={x.id} className="p-3 flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{a.name} <span className="text-muted-foreground">· {a.tag}</span></div>
                          <div className="text-xs text-muted-foreground">
                            Held by <b className="text-foreground">{empName(x.employeeId)}</b> since {new Date(x.assignedAt).toLocaleDateString()}
                            {" · "}Cond: {x.conditionOnAssign}
                            {x.acknowledgementSignatureDataUrl && " · ✍️ signed"}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => {
                          returnAsset(x.id, currentUser?.name || "System", a.condition);
                          const emp = employees.find((e) => e.id === x.employeeId);
                          const cat = assetCategories.find((c) => c.id === a.categoryId);
                          if (emp) {
                            try {
                              const { blob, filename } = generateAssetHandoverPDF(
                                company, emp,
                                { name: a.name, tag: a.tag, serial: a.serial, category: cat?.name, condition: a.condition },
                                "return", docAssets,
                              );
                              saveAs(blob, filename);
                            } catch { /* ignore */ }
                          }
                          toast.success("Returned · Letter generated");
                        }}><Undo2 className="h-3.5 w-3.5 mr-1" /> Return</Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Returned assets</CardTitle></CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No return history yet.</div>
              ) : (
                <div className="divide-y">
                  {history.map((x) => {
                    const a = assets.find((y) => y.id === x.assetId);
                    return (
                      <div key={x.id} className="p-3 text-sm">
                        <div className="font-medium">{a?.name ?? "(deleted asset)"} <span className="text-muted-foreground">· {a?.tag}</span></div>
                        <div className="text-xs text-muted-foreground">
                          {empName(x.employeeId)} · assigned {new Date(x.assignedAt).toLocaleDateString()} → returned {x.returnedAt && new Date(x.returnedAt).toLocaleDateString()}
                          {x.conditionOnReturn && ` · returned as ${x.conditionOnReturn}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssetDialog open={assetOpen} onClose={() => setAssetOpen(false)} />
      <AssignDialog asset={assignOpen} onClose={() => setAssignOpen(null)} />
      <CategoriesDialog open={catOpen} onClose={() => setCatOpen(false)} />
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: React.ReactNode; tone?: "primary" | "emerald" | "amber" }) {
  const toneCls = tone === "primary" ? "text-primary" : tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
        <div className={`text-2xl font-display font-bold mt-1 ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <div className="font-semibold">No assets yet</div>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Add laptops, phones, ID cards, uniforms or anything the company issues to employees.</p>
        <Button onClick={onNew}><Plus className="h-4 w-4 mr-2" /> Add your first asset</Button>
      </CardContent>
    </Card>
  );
}

function AssetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { assetCategories, addAsset, company } = useStore();
  const [form, setForm] = useState<Partial<Asset>>({
    categoryId: assetCategories[0]?.id,
    condition: "new",
    status: "available",
  });
  const patch = (k: keyof Asset, v: Asset[keyof Asset]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name || !form.tag || !form.categoryId) return toast.error("Name, tag and category are required");
    addAsset({
      categoryId: form.categoryId,
      name: form.name!,
      tag: form.tag!,
      serial: form.serial,
      brand: form.brand,
      model: form.model,
      purchaseDate: form.purchaseDate,
      purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
      vendor: form.vendor,
      warrantyUntil: form.warrantyUntil,
      branchId: form.branchId,
      condition: form.condition as AssetCondition,
      status: form.status as AssetStatus,
      notes: form.notes,
      photoDataUrl: form.photoDataUrl,
    });
    toast.success("Asset added to inventory");
    setForm({ categoryId: assetCategories[0]?.id, condition: "new", status: "available" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Asset</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.categoryId} onValueChange={(v) => patch("categoryId", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{assetCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Asset name"><Input value={form.name ?? ""} onChange={(e) => patch("name", e.target.value)} placeholder="MacBook Pro 14" /></Field>
          <Field label="Asset tag"><Input value={form.tag ?? ""} onChange={(e) => patch("tag", e.target.value)} placeholder="SW-LAP-0007" /></Field>
          <Field label="Serial number"><Input value={form.serial ?? ""} onChange={(e) => patch("serial", e.target.value)} /></Field>
          <Field label="Brand"><Input value={form.brand ?? ""} onChange={(e) => patch("brand", e.target.value)} /></Field>
          <Field label="Model"><Input value={form.model ?? ""} onChange={(e) => patch("model", e.target.value)} /></Field>
          <Field label="Purchase date"><Input type="date" value={form.purchaseDate ?? ""} onChange={(e) => patch("purchaseDate", e.target.value)} /></Field>
          <Field label="Purchase cost (₹)"><Input type="number" value={form.purchaseCost ?? ""} onChange={(e) => patch("purchaseCost", Number(e.target.value))} /></Field>
          <Field label="Vendor"><Input value={form.vendor ?? ""} onChange={(e) => patch("vendor", e.target.value)} /></Field>
          <Field label="Warranty until"><Input type="date" value={form.warrantyUntil ?? ""} onChange={(e) => patch("warrantyUntil", e.target.value)} /></Field>
          <Field label="Branch">
            <Select value={form.branchId ?? "__none"} onValueChange={(v) => patch("branchId", v === "__none" ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— None —</SelectItem>
                {(company.branches ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Condition">
            <Select value={form.condition} onValueChange={(v) => patch("condition", v as AssetCondition)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => patch("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} className="bg-gradient-brand text-white">Add Asset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const { employees, assetCategories, assignAsset, currentUser, company, docAssets } = useStore();
  const [employeeId, setEmployeeId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | undefined>();
  const [signOpen, setSignOpen] = useState(false);

  const category = asset ? assetCategories.find((c) => c.id === asset.categoryId) : undefined;
  const needsSign = !!category?.requireAcknowledgement;

  const submit = () => {
    if (!asset) return;
    if (!employeeId) return toast.error("Pick an employee");
    if (needsSign && !signature) return toast.error("Employee acknowledgement signature is required");
    const r = assignAsset({
      assetId: asset.id,
      employeeId,
      assignedBy: currentUser?.name || "HR",
      conditionOnAssign: asset.condition,
      acknowledgementSignatureDataUrl: signature,
      notes,
    });
    if (!r) return toast.error("Could not assign — check asset status");

    // Auto-generate the asset handover letter (branded with sign + seal)
    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      try {
        const { blob, filename } = generateAssetHandoverPDF(
          company, emp,
          { name: asset.name, tag: asset.tag, serial: asset.serial, category: category?.name, condition: asset.condition, notes },
          "handover", docAssets,
        );
        saveAs(blob, filename);
        toast.success(`Asset assigned · Handover letter generated for ${emp.name}`);
      } catch {
        toast.success("Asset assigned");
      }
    } else {
      toast.success("Asset assigned");
    }
    setEmployeeId(""); setNotes(""); setSignature(undefined);
    onClose();
  };

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign asset</DialogTitle>
        </DialogHeader>
        {asset && (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 bg-muted/40 text-sm">
              <div className="font-medium">{asset.name}</div>
              <div className="text-xs text-muted-foreground">{asset.tag} · {category?.name} · Condition: {asset.condition}</div>
            </div>
            <Field label="Assign to employee">
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Pick employee…" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} · {e.empCode}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Handover notes, accessories…" />
            </Field>
            {needsSign && (
              <div>
                <Label className="text-xs">Employee acknowledgement</Label>
                <div className="mt-1 flex items-center gap-3">
                  {signature ? (
                    <img src={signature} alt="signature" className="h-14 border rounded bg-white" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Required — employee signs on handover.</span>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={() => setSignOpen(true)}>{signature ? "Re-sign" : "Capture signature"}</Button>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-gradient-brand text-white">Assign</Button>
        </DialogFooter>
        <Dialog open={signOpen} onOpenChange={setSignOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Acknowledgement signature</DialogTitle></DialogHeader>
            <ESignPad onSign={(d) => { setSignature(d); setSignOpen(false); }} />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { assetCategories, addAssetCategory, updateAssetCategory, deleteAssetCategory } = useStore();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [requireReturn, setRequireReturn] = useState(true);
  const [requireAck, setRequireAck] = useState(false);

  const add = () => {
    if (!name.trim() || !code.trim()) return toast.error("Name and code required");
    addAssetCategory({ name: name.trim(), code: code.trim().toUpperCase(), requireReturn, requireAcknowledgement: requireAck });
    setName(""); setCode(""); setRequireReturn(true); setRequireAck(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Asset categories</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border divide-y">
            {assetCategories.map((c: AssetCategory) => (
              <div key={c.id} className="p-3 flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{c.name} <span className="text-muted-foreground text-xs">· {c.code}</span></div>
                  <div className="text-[11px] text-muted-foreground">
                    Return required: {c.requireReturn ? "yes" : "no"} · Sign on handover: {c.requireAcknowledgement ? "yes" : "no"}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch checked={c.requireReturn} onCheckedChange={(v) => updateAssetCategory(c.id, { requireReturn: v })} />
                  Return
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch checked={c.requireAcknowledgement} onCheckedChange={(v) => updateAssetCategory(c.id, { requireAcknowledgement: v })} />
                  Sign
                </label>
                <Button size="icon" variant="ghost" onClick={() => deleteAssetCategory(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Add category</div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name (e.g. Headset)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Code (e.g. HDS)" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <label className="flex items-center gap-1.5"><Switch checked={requireReturn} onCheckedChange={setRequireReturn} /> Requires return</label>
              <label className="flex items-center gap-1.5"><Switch checked={requireAck} onCheckedChange={setRequireAck} /> Signed handover</label>
              <Button size="sm" onClick={add} className="ml-auto"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Close</Button></DialogFooter>
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
