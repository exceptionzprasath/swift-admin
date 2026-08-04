import { createFileRoute } from "@tanstack/react-router";
import { useStore, type EarningComponent, type DeductionComponent, type PtSlab, type TdsSlab, type AttendanceProfileRule } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { useState } from "react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings · SWIFT" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { company, setCompany, docAssets, setDocAssets, saveAllCompanySettings } = useStore();
  const [saving, setSaving] = useState(false);

  const readAsset = (key: keyof typeof docAssets) => (file: File | null) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      setDocAssets({ [key]: r.result as string } as Partial<typeof docAssets>);
      toast.success("File uploaded to assets draft");
    };
    r.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAllCompanySettings();
      toast.success("Settings & document assets saved to DynamoDB and S3!");
    } catch (err: any) {
      toast.error("Save error: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const num = (k: keyof typeof company) => (
    <Input
      type="number"
      value={company[k] as number}
      onChange={(e) => setCompany({ [k]: +e.target.value || 0 } as any)}
    />
  );
  const str = (k: keyof typeof company) => (
    <Input value={company[k] as string} onChange={(e) => setCompany({ [k]: e.target.value } as any)} />
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-semibold">Company Settings</h1>
        <p className="text-sm text-muted-foreground">All payroll rates, thresholds, geo-fence, shifts and templates are editable per company.</p>
      </div>

      <Card title="Company Profile">
        <Field label="Display Name">{str("name")}</Field>
        <Field label="Legal Name">{str("legalName")}</Field>
        <Field label="Address">{str("address")}</Field>
        <Field label="GSTIN">{str("gstin")}</Field>
      </Card>

      <Card title="Working Time">
        <Field label="Working Days / Month">{num("workingDaysPerMonth")}</Field>
        <Field label="Working Hours / Day">{num("workingHoursPerDay")}</Field>
        <Field label="Overtime Multiplier">{num("otMultiplier")}</Field>
      </Card>

      <Card title="Document Assets (used automatically on every generated letter)">
        <AssetUpload label="Company Logo" src={docAssets.logoDataUrl} onFile={readAsset("logoDataUrl")} />
        <AssetUpload label="Letterhead" src={docAssets.letterheadDataUrl} onFile={readAsset("letterheadDataUrl")} />
        <AssetUpload label="Footer" src={docAssets.footerDataUrl} onFile={readAsset("footerDataUrl")} />
        <AssetUpload label="Watermark" src={docAssets.watermarkDataUrl} onFile={readAsset("watermarkDataUrl")} />
        <AssetUpload label="Company Seal" src={docAssets.companySealDataUrl} onFile={readAsset("companySealDataUrl")} />
        <AssetUpload label="Department Seal" src={docAssets.departmentSealDataUrl} onFile={readAsset("departmentSealDataUrl")} />
        <AssetUpload label="MD Signature" src={docAssets.mdSignatureDataUrl} onFile={readAsset("mdSignatureDataUrl")} />
        <AssetUpload label="HR Signature" src={docAssets.hrSignatureDataUrl} onFile={readAsset("hrSignatureDataUrl")} />
        <AssetUpload label="Authorised Signatory" src={docAssets.authorisedSignatoryDataUrl} onFile={readAsset("authorisedSignatoryDataUrl")} />
        <AssetUpload label="Branch Manager Signature" src={docAssets.branchManagerSignatureDataUrl} onFile={readAsset("branchManagerSignatureDataUrl")} />
        <AssetUpload label="Factory Manager Signature" src={docAssets.factoryManagerSignatureDataUrl} onFile={readAsset("factoryManagerSignatureDataUrl")} />
        <AssetUpload label="QR Verification" src={docAssets.qrCodeDataUrl} onFile={readAsset("qrCodeDataUrl")} />
        <Field label="Document Number Prefix">
          <Input value={docAssets.docNumberPrefix} onChange={(e) => setDocAssets({ docNumberPrefix: e.target.value })} />
        </Field>
        <Field label="Document Number Format">
          <Input value={docAssets.docNumberFormat} onChange={(e) => setDocAssets({ docNumberFormat: e.target.value })} />
        </Field>
        <Field label="Digital Certificate Name">
          <Input value={docAssets.digitalCertificateName ?? ""} onChange={(e) => setDocAssets({ digitalCertificateName: e.target.value })} />
        </Field>
      </Card>

      <Card title="Salary Structure (% of Basic)">
        <Field label="HRA %">{num("hraPct")}</Field>
        <Field label="Special %">{num("specialPct")}</Field>
        <Field label="Medical %">{num("medicalPct")}</Field>
        <Field label="Conveyance %">{num("conveyancePct")}</Field>
        <Field label="Washing %">{num("washingPct")}</Field>
        <Field label="Other %">{num("otherPct")}</Field>
      </Card>


      <Card title="Statutory">
        <Field label="Employee PF %">{num("employeePfPct")}</Field>
        <Field label="Employer PF %">{num("employerPfPct")}</Field>
        <Field label="Employee ESI %">{num("employeeEsiPct")}</Field>
        <Field label="Employer ESI %">{num("employerEsiPct")}</Field>
        <Field label="ESI Threshold (₹ Gross)">{num("esiThreshold")}</Field>
        <Field label="Professional Tax (₹)">{num("ptAmount")}</Field>
      </Card>

      <Card title="Geo-Fence (Office Location)">
        <Field label="Latitude">
          <Input
            type="number"
            step="0.0001"
            value={company.geofence.lat}
            onChange={(e) => setCompany({ geofence: { ...company.geofence, lat: +e.target.value || 0 } })}
          />
        </Field>
        <Field label="Longitude">
          <Input
            type="number"
            step="0.0001"
            value={company.geofence.lng}
            onChange={(e) => setCompany({ geofence: { ...company.geofence, lng: +e.target.value || 0 } })}
          />
        </Field>
        <Field label="Radius (m)">
          <Input
            type="number"
            value={company.geofence.radiusM}
            onChange={(e) => setCompany({ geofence: { ...company.geofence, radiusM: +e.target.value || 0 } })}
          />
        </Field>
        <div className="col-span-3">
          <Button
            variant="outline"
            onClick={() => {
              if (!navigator.geolocation) return toast.error("Geolocation not supported");
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setCompany({
                    geofence: {
                      ...company.geofence,
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                    },
                  });
                  toast.success("Office location set to current position");
                },
                () => toast.error("Location permission denied")
              );
            }}
          >
            Use my current location
          </Button>
        </div>
      </Card>

      <Card title="Shifts">
        <div className="col-span-3 space-y-2">
          {company.shifts.map((s, i) => (
            <div key={s.id} className="grid grid-cols-5 gap-2">
              <Input
                value={s.name}
                onChange={(e) => {
                  const copy = [...company.shifts];
                  copy[i] = { ...s, name: e.target.value };
                  setCompany({ shifts: copy });
                }}
              />
              <Input
                value={s.start}
                onChange={(e) => {
                  const copy = [...company.shifts];
                  copy[i] = { ...s, start: e.target.value };
                  setCompany({ shifts: copy });
                }}
              />
              <Input
                value={s.end}
                onChange={(e) => {
                  const copy = [...company.shifts];
                  copy[i] = { ...s, end: e.target.value };
                  setCompany({ shifts: copy });
                }}
              />
              <Input
                type="number"
                placeholder="₹ per day"
                value={s.allowancePerDay}
                onChange={(e) => {
                  const copy = [...company.shifts];
                  copy[i] = { ...s, allowancePerDay: +e.target.value || 0 };
                  setCompany({ shifts: copy });
                }}
              />
              <Button
                variant="ghost"
                onClick={() => setCompany({ shifts: company.shifts.filter((_, j) => j !== i) })}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setCompany({
                shifts: [
                  ...company.shifts,
                  { id: crypto.randomUUID(), name: "New Shift", start: "09:00", end: "18:00", allowancePerDay: 0 },
                ],
              })
            }
          >
            Add shift
          </Button>
        </div>
      </Card>

      <Card title="Leave Types">
        <div className="col-span-3 space-y-2">
          {company.leaveTypes.map((l, i) => (
            <div key={l.id} className="grid grid-cols-3 gap-2">
              <Input
                value={l.name}
                onChange={(e) => {
                  const copy = [...company.leaveTypes];
                  copy[i] = { ...l, name: e.target.value };
                  setCompany({ leaveTypes: copy });
                }}
              />
              <Input
                type="number"
                value={l.days}
                onChange={(e) => {
                  const copy = [...company.leaveTypes];
                  copy[i] = { ...l, days: +e.target.value || 0 };
                  setCompany({ leaveTypes: copy });
                }}
              />
              <Button variant="ghost" onClick={() => setCompany({ leaveTypes: company.leaveTypes.filter((_, j) => j !== i) })}>Remove</Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setCompany({
                leaveTypes: [...company.leaveTypes, { id: crypto.randomUUID(), name: "New Leave", days: 6 }],
              })
            }
          >
            Add leave type
          </Button>
        </div>
      </Card>

      <Card title="Appointment Letter Template">
        <div className="col-span-3">
          <Label>Template (use {"{{name}}, {{designation}}, {{department}}, {{company}}, {{doj}}, {{empCode}}, {{ctc}}, {{gross}}"})</Label>
          <Textarea
            rows={10}
            value={company.appointmentTemplate}
            onChange={(e) => setCompany({ appointmentTemplate: e.target.value })}
          />
        </div>
      </Card>

      <Card title="Earnings Components (fully configurable)">
        <div className="col-span-3 space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-muted-foreground px-1">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Formula</div>
            <div className="col-span-1">Value</div>
            <div className="col-span-1">Prorate</div>
            <div className="col-span-1">Tax</div>
            <div className="col-span-1">PF</div>
            <div className="col-span-1">ESI</div>
            <div className="col-span-1">Grat.</div>
            <div className="col-span-1">Input key</div>
            <div className="col-span-1"></div>
          </div>
          {company.earnings.map((e, i) => (
            <div key={e.id} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-3" value={e.name} onChange={(ev) => updateEarning(i, { name: ev.target.value })} />
              <Select value={e.formula} onValueChange={(v) => updateEarning(i, { formula: v as EarningComponent["formula"] })}>
                <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pctOfBasic">% of Basic</SelectItem>
                  <SelectItem value="pctOfCtc">% of Basic (CTC ref)</SelectItem>
                  <SelectItem value="flatMonthly">Flat Monthly</SelectItem>
                  <SelectItem value="perDay">Per Day Worked</SelectItem>
                  <SelectItem value="perShiftDay">Per Shift Day</SelectItem>
                  <SelectItem value="perOtHour">Per OT Hour (× multiplier)</SelectItem>
                  <SelectItem value="input">User Input</SelectItem>
                </SelectContent>
              </Select>
              <Input className="col-span-1" type="number" value={e.value} onChange={(ev) => updateEarning(i, { value: +ev.target.value || 0 })} />
              <div className="col-span-1 flex justify-center"><Switch checked={e.prorate} onCheckedChange={(v) => updateEarning(i, { prorate: v })} /></div>
              <div className="col-span-1 flex justify-center"><Switch checked={e.taxable} onCheckedChange={(v) => updateEarning(i, { taxable: v })} /></div>
              <div className="col-span-1 flex justify-center"><Switch checked={e.includeInPf} onCheckedChange={(v) => updateEarning(i, { includeInPf: v })} /></div>
              <div className="col-span-1 flex justify-center"><Switch checked={e.includeInEsi} onCheckedChange={(v) => updateEarning(i, { includeInEsi: v })} /></div>
              <div className="col-span-1 flex justify-center"><Switch checked={e.includeInGratuity} onCheckedChange={(v) => updateEarning(i, { includeInGratuity: v })} /></div>
              <Input className="col-span-1" placeholder="key" value={e.inputKey ?? ""} onChange={(ev) => updateEarning(i, { inputKey: ev.target.value })} />
              <Button className="col-span-1" variant="ghost" size="icon" onClick={() => setCompany({ earnings: company.earnings.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setCompany({ earnings: [...company.earnings, { id: crypto.randomUUID(), name: "New Component", formula: "flatMonthly", value: 0, prorate: true, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false }] })}>
            <Plus className="h-3 w-3 mr-1" /> Add earning
          </Button>
        </div>
      </Card>

      <Card title="Custom Deductions">
        <div className="col-span-3 space-y-2">
          {company.deductions.map((d, i) => (
            <div key={d.id} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-4" value={d.name} onChange={(ev) => updateDeduction(i, { name: ev.target.value })} />
              <Select value={d.formula} onValueChange={(v) => updateDeduction(i, { formula: v as DeductionComponent["formula"] })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat ₹</SelectItem>
                  <SelectItem value="pctOfGross">% of Gross</SelectItem>
                  <SelectItem value="pctOfBasic">% of Basic</SelectItem>
                  <SelectItem value="pctOfPfBase">% of PF Base</SelectItem>
                  <SelectItem value="input">User Input</SelectItem>
                </SelectContent>
              </Select>
              <Input className="col-span-2" type="number" value={d.value} onChange={(ev) => updateDeduction(i, { value: +ev.target.value || 0 })} />
              <Input className="col-span-2" placeholder="input key" value={d.inputKey ?? ""} onChange={(ev) => updateDeduction(i, { inputKey: ev.target.value })} />
              <Button className="col-span-1" variant="ghost" size="icon" onClick={() => setCompany({ deductions: company.deductions.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setCompany({ deductions: [...company.deductions, { id: crypto.randomUUID(), name: "New Deduction", formula: "flat", value: 0 }] })}>
            <Plus className="h-3 w-3 mr-1" /> Add deduction
          </Button>
        </div>
      </Card>

      <Card title="Provident Fund (PF)">
        <Field label="Enabled">
          <div className="pt-2"><Switch checked={company.pfRules.enabled} onCheckedChange={(v) => setCompany({ pfRules: { ...company.pfRules, enabled: v } })} /></div>
        </Field>
        <Field label="Employee %"><Input type="number" value={company.pfRules.employeePct} onChange={(e) => setCompany({ pfRules: { ...company.pfRules, employeePct: +e.target.value || 0 } })} /></Field>
        <Field label="Employer %"><Input type="number" value={company.pfRules.employerPct} onChange={(e) => setCompany({ pfRules: { ...company.pfRules, employerPct: +e.target.value || 0 } })} /></Field>
        <Field label="Wage Ceiling (₹, 0 = none)"><Input type="number" value={company.pfRules.ceiling} onChange={(e) => setCompany({ pfRules: { ...company.pfRules, ceiling: +e.target.value || 0 } })} /></Field>
      </Card>

      <Card title="ESI">
        <Field label="Enabled"><div className="pt-2"><Switch checked={company.esiRules.enabled} onCheckedChange={(v) => setCompany({ esiRules: { ...company.esiRules, enabled: v } })} /></div></Field>
        <Field label="Employee %"><Input type="number" step="0.01" value={company.esiRules.employeePct} onChange={(e) => setCompany({ esiRules: { ...company.esiRules, employeePct: +e.target.value || 0 } })} /></Field>
        <Field label="Employer %"><Input type="number" step="0.01" value={company.esiRules.employerPct} onChange={(e) => setCompany({ esiRules: { ...company.esiRules, employerPct: +e.target.value || 0 } })} /></Field>
        <Field label="Gross Threshold (₹)"><Input type="number" value={company.esiRules.threshold} onChange={(e) => setCompany({ esiRules: { ...company.esiRules, threshold: +e.target.value || 0 } })} /></Field>
      </Card>

      <Card title="Professional Tax Slabs">
        <div className="col-span-3 space-y-2">
          {company.ptSlabs.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Label className="col-span-2">Gross up to (₹)</Label>
              <Input className="col-span-4" type="number" value={s.upTo} onChange={(e) => updateSlab<PtSlab>("ptSlabs", i, { upTo: +e.target.value || 0 })} />
              <Label className="col-span-2">PT (₹)</Label>
              <Input className="col-span-3" type="number" value={s.amount} onChange={(e) => updateSlab<PtSlab>("ptSlabs", i, { amount: +e.target.value || 0 })} />
              <Button className="col-span-1" variant="ghost" size="icon" onClick={() => setCompany({ ptSlabs: company.ptSlabs.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setCompany({ ptSlabs: [...company.ptSlabs, { upTo: 0, amount: 0 }] })}><Plus className="h-3 w-3 mr-1" /> Add slab</Button>
        </div>
      </Card>

      <Card title="TDS (Income Tax)">
        <Field label="Enabled"><div className="pt-2"><Switch checked={company.tdsRules.enabled} onCheckedChange={(v) => setCompany({ tdsRules: { enabled: v } })} /></div></Field>
        <div className="col-span-3 space-y-2">
          <Label>Annual slabs</Label>
          {company.tdsSlabs.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Label className="col-span-2">Up to (₹)</Label>
              <Input className="col-span-4" type="number" value={s.upTo} onChange={(e) => updateSlab<TdsSlab>("tdsSlabs", i, { upTo: +e.target.value || 0 })} />
              <Label className="col-span-2">Rate %</Label>
              <Input className="col-span-3" type="number" step="0.01" value={s.pct} onChange={(e) => updateSlab<TdsSlab>("tdsSlabs", i, { pct: +e.target.value || 0 })} />
              <Button className="col-span-1" variant="ghost" size="icon" onClick={() => setCompany({ tdsSlabs: company.tdsSlabs.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setCompany({ tdsSlabs: [...company.tdsSlabs, { upTo: 0, pct: 0 }] })}><Plus className="h-3 w-3 mr-1" /> Add slab</Button>
        </div>
      </Card>

      <Card title="Labour Welfare Fund (LWF)">
        <Field label="Enabled"><div className="pt-2"><Switch checked={company.lwfRules.enabled} onCheckedChange={(v) => setCompany({ lwfRules: { ...company.lwfRules, enabled: v } })} /></div></Field>
        <Field label="Employee (₹)"><Input type="number" value={company.lwfRules.employeeAmount} onChange={(e) => setCompany({ lwfRules: { ...company.lwfRules, employeeAmount: +e.target.value || 0 } })} /></Field>
        <Field label="Employer (₹)"><Input type="number" value={company.lwfRules.employerAmount} onChange={(e) => setCompany({ lwfRules: { ...company.lwfRules, employerAmount: +e.target.value || 0 } })} /></Field>
        <Field label="Frequency">
          <Select value={company.lwfRules.frequency} onValueChange={(v) => setCompany({ lwfRules: { ...company.lwfRules, frequency: v as "monthly" | "half-yearly" } })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="half-yearly">Half-yearly</SelectItem></SelectContent>
          </Select>
        </Field>
      </Card>

      <Card title="Gratuity & LOP">
        <Field label="Gratuity Enabled"><div className="pt-2"><Switch checked={company.gratuityRules.enabled} onCheckedChange={(v) => setCompany({ gratuityRules: { ...company.gratuityRules, enabled: v } })} /></div></Field>
        <Field label="Numerator (days)"><Input type="number" value={company.gratuityRules.numerator} onChange={(e) => setCompany({ gratuityRules: { ...company.gratuityRules, numerator: +e.target.value || 0 } })} /></Field>
        <Field label="Denominator (days/mo)"><Input type="number" value={company.gratuityRules.denominator} onChange={(e) => setCompany({ gratuityRules: { ...company.gratuityRules, denominator: +e.target.value || 0 } })} /></Field>
        <Field label="Loss of Pay Basis">
          <Select value={company.lopBasis} onValueChange={(v) => setCompany({ lopBasis: v as "basic" | "gross" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="basic">Basic</SelectItem><SelectItem value="gross">Gross</SelectItem></SelectContent>
          </Select>
        </Field>
      </Card>

      <Button
        className="bg-gradient-brand text-white shadow-glow px-6 py-2"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving to Database & S3..." : "Save changes"}
      </Button>
    </div>
  );

  function updateEarning(i: number, patch: Partial<EarningComponent>) {
    const copy = [...company.earnings];
    copy[i] = { ...copy[i], ...patch };
    setCompany({ earnings: copy });
  }
  function updateDeduction(i: number, patch: Partial<DeductionComponent>) {
    const copy = [...company.deductions];
    copy[i] = { ...copy[i], ...patch };
    setCompany({ deductions: copy });
  }
  function updateSlab<T>(key: "ptSlabs" | "tdsSlabs", i: number, patch: Partial<T>) {
    const arr = [...(company[key] as T[])];
    arr[i] = { ...arr[i], ...patch };
    setCompany({ [key]: arr } as never);
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-display font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AssetUpload({ label, src, onFile }: { label: string; src?: string; onFile: (f: File | null) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <div className="h-14 w-14 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground">
          {src ? <img src={src} alt={label} className="h-full w-full object-contain" /> : "—"}
        </div>
        <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-xs" />
      </div>
    </div>
  );
}

function AttendanceDefaultsCard() {
  const { company, setCompany } = useStore();
  const rules = company.attendanceDefaults ?? [];
  const update = (i: number, patch: Partial<AttendanceProfileRule>) => {
    const next = rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    setCompany({ attendanceDefaults: next });
  };
  const updateMatch = (i: number, patch: Partial<AttendanceProfileRule["match"]>) => {
    const next = rules.map((r, idx) => (idx === i ? { ...r, match: { ...r.match, ...patch } } : r));
    setCompany({ attendanceDefaults: next });
  };
  const add = () => {
    const r: AttendanceProfileRule = {
      id: `apd-${Date.now()}`,
      name: "New Rule",
      priority: (rules[0]?.priority ?? 0) + 10,
      match: {},
      shiftId: company.shifts[0]?.id,
      weeklyOff: ["Sun"],
      leaveTypeIds: company.leaveTypes.map((l) => l.id),
      geofenceFromBranch: true,
      payrollGroup: "Monthly",
      costCentre: "General",
      holidayCalendar: "India-Standard",
    };
    setCompany({ attendanceDefaults: [r, ...rules] });
  };
  const remove = (id: string) => setCompany({ attendanceDefaults: rules.filter((r) => r.id !== id) });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold">Attendance Profile Defaults</h3>
          <p className="text-xs text-muted-foreground">Auto-assigned on registration. Most specific match wins; ties broken by priority.</p>
        </div>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Add rule</Button>
      </div>
      <div className="space-y-3">
        {rules.length === 0 && <div className="text-xs text-muted-foreground">No rules configured — every employee is registered without an auto-profile.</div>}
        {rules.map((r, i) => (
          <div key={r.id} className="rounded-xl border border-border p-4 grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3">
              <Label>Name</Label>
              <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
            </div>
            <div className="col-span-1">
              <Label>Priority</Label>
              <Input type="number" value={r.priority} onChange={(e) => update(i, { priority: +e.target.value || 0 })} />
            </div>
            <div className="col-span-2">
              <Label>Match Branch</Label>
              <Select value={r.match.branchId ?? "any"} onValueChange={(v) => updateMatch(i, { branchId: v === "any" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {(company.branches ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Match Dept</Label>
              <Input placeholder="Any" value={r.match.department ?? ""} onChange={(e) => updateMatch(i, { department: e.target.value || undefined })} />
            </div>
            <div className="col-span-2">
              <Label>Match Designation</Label>
              <Input placeholder="Any" value={r.match.designation ?? ""} onChange={(e) => updateMatch(i, { designation: e.target.value || undefined })} />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>

            <div className="col-span-3">
              <Label>Shift</Label>
              <Select value={r.shiftId ?? ""} onValueChange={(v) => update(i, { shiftId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {company.shifts.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label>Weekly Off (comma)</Label>
              <Input value={(r.weeklyOff ?? []).join(",")} onChange={(e) => update(i, { weeklyOff: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </div>
            <div className="col-span-2">
              <Label>Payroll Group</Label>
              <Input value={r.payrollGroup ?? ""} onChange={(e) => update(i, { payrollGroup: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Cost Centre</Label>
              <Input value={r.costCentre ?? ""} onChange={(e) => update(i, { costCentre: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Holiday Calendar</Label>
              <Input value={r.holidayCalendar ?? ""} onChange={(e) => update(i, { holidayCalendar: e.target.value })} />
            </div>
            <div className="col-span-6 flex items-center gap-2 pt-1">
              <Switch checked={!!r.geofenceFromBranch} onCheckedChange={(v) => update(i, { geofenceFromBranch: v })} />
              <span className="text-xs text-muted-foreground">Inherit geo-fence from assigned branch</span>
            </div>
            <div className="col-span-6">
              <Label>Leave Types</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {company.leaveTypes.map((lt) => {
                  const on = (r.leaveTypeIds ?? []).includes(lt.id);
                  return (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => {
                        const next = on ? (r.leaveTypeIds ?? []).filter((x) => x !== lt.id) : [...(r.leaveTypeIds ?? []), lt.id];
                        update(i, { leaveTypeIds: next });
                      }}
                      className={`text-xs rounded-full border px-2 py-0.5 ${on ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {lt.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

