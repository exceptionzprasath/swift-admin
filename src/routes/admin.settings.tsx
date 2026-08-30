import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { PALETTES, getPalette, type ThemePaletteId } from "@/lib/palettes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, ArrowRight, Palette, Check, Sparkles, Sun, Moon, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Company Settings · SWIFT" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    company,
    setCompany,
    docAssets,
    setDocAssets,
    saveAllCompanySettings,
    theme,
    setTheme,
    setThemePalette,
  } = useStore();
  const [saving, setSaving] = useState(false);
  const activePaletteId = company.themePalette || "copper-wave";
  const activePalette = getPalette(activePaletteId);

  const handleSelectPalette = (paletteId: ThemePaletteId) => {
    setThemePalette(paletteId);
    const selected = getPalette(paletteId);
    toast.success(`Theme updated to "${selected.name}" & saved to database!`);
  };

  const readAsset = (key: keyof typeof docAssets) => (file: File | null) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = r.result as string;
      setDocAssets({ [key]: dataUrl } as Partial<typeof docAssets>);
      if (key === "logoDataUrl") {
        setCompany({ logoDataUrl: dataUrl });
      }
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
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Company Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage company profile, working hours, document assets, office locations, and templates.
          </p>
        </div>
        <Button
          className="bg-primary text-primary-foreground font-semibold shadow-xs px-6 py-2 rounded-xl"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving to Database..." : "Save Changes"}
        </Button>
      </div>

      {/* Theme & Color Palettes Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Theme & Brand Color Palettes</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                20 Curated Palettes
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Select your organization's brand color identity. Theme changes apply instantly and auto-save directly to your cloud database.
            </p>
          </div>

          {/* Light / Dark Mode Toggle */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60 border border-border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme !== "dark"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === "dark"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Active Theme Live Showcase Card with Component Combinations */}
        <div className="p-5 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-card space-y-4 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Currently Active Theme Combination</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                {activePalette.name}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                {activePalette.vibe}
              </p>
            </div>

            {/* Quick Live Preview Simulation Strip */}
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-card border border-border shadow-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navbar text-navbar-foreground text-xs font-semibold shadow-xs">
                Navbar
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sidebar text-sidebar-foreground text-xs font-semibold shadow-xs">
                Sidebar
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-taskmenu text-taskmenu-foreground text-xs font-bold shadow-xs">
                Task Menu Active
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold">
                Accent Pill
              </div>
            </div>
          </div>

          {/* Component Color Combinations Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-3 border-t border-primary/15">
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/80">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sidebar Navigation</div>
              <div className="text-xs font-bold text-foreground mt-0.5">{activePalette.componentRoles.sidebar}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/80">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Navbar / Header</div>
              <div className="text-xs font-bold text-foreground mt-0.5">{activePalette.componentRoles.navbar}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/80">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Task Menu / CTAs</div>
              <div className="text-xs font-bold text-foreground mt-0.5">{activePalette.componentRoles.taskMenu}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/80">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Surfaces & Cards</div>
              <div className="text-xs font-bold text-foreground mt-0.5">{activePalette.componentRoles.cards}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/80 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">KPIs & Accents</div>
              <div className="text-xs font-bold text-foreground mt-0.5">{activePalette.componentRoles.accents}</div>
            </div>
          </div>
        </div>

        {/* 20 Palettes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {PALETTES.map((p, idx) => {
            const isSelected = activePaletteId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPalette(p.id)}
                className={`group relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Palette {idx + 1}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/15 border border-primary/20">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to apply
                      </span>
                    )}
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {p.vibe}
                  </p>
                </div>

                {/* 5-Color Swatch Strip with Component Combination Hints */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex h-6 w-full rounded-lg overflow-hidden border border-border/80 shadow-xs">
                    {p.colors.map((hex, cIdx) => (
                      <div
                        key={cIdx}
                        style={{ backgroundColor: hex }}
                        className="flex-1 h-full transition-transform hover:scale-110"
                        title={`${p.name} color ${cIdx + 1}: ${hex}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className="truncate max-w-[120px]" title={`Sidebar: ${p.colors[0]}`}>Side: {p.colors[0]}</span>
                    <span className="truncate max-w-[120px]" title={`Active: ${p.colors[p.colors.length - 1]}`}>Active: {p.colors[p.colors.length - 1]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct Banner to Dedicated Payroll Screen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/20 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-foreground">
              Looking for Salary Structures & Statutory Configuration?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              All payroll components, allowances (DA, HRA, OA, CA, LTA), PF, ESI, Professional Tax, and Monthly Runs are now in the dedicated Payroll screen.
            </p>
          </div>
        </div>
        <Link to="/admin/payroll">
          <Button className="font-semibold gap-1.5 rounded-xl text-xs h-9">
            <span>Open Payroll Master</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Company Profile */}
      <Card title="Company Profile">
        <Field label="Display Name">{str("name")}</Field>
        <Field label="Legal Name">{str("legalName")}</Field>
        <Field label="Address">{str("address")}</Field>
        <Field label="GSTIN">{str("gstin")}</Field>
      </Card>

      {/* Working Time */}
      <Card title="Working Time & Shift Policy">
        <Field label="Working Days / Month">{num("workingDaysPerMonth")}</Field>
        <Field label="Working Hours / Day">{num("workingHoursPerDay")}</Field>
        <Field label="Overtime Multiplier">{num("otMultiplier")}</Field>
      </Card>

      {/* Document Assets */}
      <Card title="Document Assets (Used automatically on generated appointment letters & reports)">
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

      {/* Shifts */}
      <Card title="Company Shifts">
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
            Add Shift
          </Button>
        </div>
      </Card>

      {/* Leave Types */}
      <Card title="Leave Policy Types">
        <div className="col-span-3 space-y-3">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_130px_100px_36px] gap-3 text-xs text-muted-foreground font-medium px-1">
            <span>Leave Type Name</span>
            <span>Days / Year</span>
            <span className="text-center">Type</span>
            <span />
          </div>
          {company.leaveTypes.map((l, i) => (
            <div key={l.id} className="grid grid-cols-[1fr_130px_100px_36px] gap-3 items-center">
              {/* Name */}
              <Input
                value={l.name}
                placeholder="e.g. Casual Leave"
                onChange={(e) => {
                  const copy = [...company.leaveTypes];
                  copy[i] = { ...l, name: e.target.value };
                  setCompany({ leaveTypes: copy });
                }}
              />
              {/* Annual days */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={l.days}
                  min={0}
                  placeholder="12"
                  onChange={(e) => {
                    const copy = [...company.leaveTypes];
                    copy[i] = { ...l, days: +e.target.value || 0 };
                    setCompany({ leaveTypes: copy });
                  }}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
              </div>
              {/* Paid / Unpaid toggle */}
              <button
                type="button"
                onClick={() => {
                  const copy = [...company.leaveTypes];
                  copy[i] = { ...l, paid: l.paid === false ? true : false };
                  setCompany({ leaveTypes: copy });
                }}
                className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  l.paid !== false
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {l.paid !== false ? "Paid" : "Unpaid"}
              </button>
              {/* Remove */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setCompany({ leaveTypes: company.leaveTypes.filter((_, j) => j !== i) })}
              >
                ×
              </Button>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Define annual day-based leave quotas for employees. Employees can apply for full-day or half-day leaves against these entitlements.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              setCompany({
                leaveTypes: [...company.leaveTypes, { id: crypto.randomUUID(), name: "New Leave", days: 6, paid: true }],
              })
            }
          >
            + Add Leave Type
          </Button>
        </div>
      </Card>

      {/* Permission Policy Types (Separate Standalone Section) */}
      <Card title="Permission Policy Types">
        <div className="col-span-3 space-y-3">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_130px_130px_140px_100px_36px] gap-3 text-xs text-muted-foreground font-medium px-1">
            <span>Permission Type Name</span>
            <span>Allowed Hours</span>
            <span>Reset Frequency</span>
            <span>Max Requests / Mo</span>
            <span className="text-center">Type</span>
            <span />
          </div>
          {(company.permissionTypes ?? [
            { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
          ]).map((p, i) => {
            const currentList = company.permissionTypes ?? [
              { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
            ];
            return (
              <div key={p.id} className="grid grid-cols-[1fr_130px_130px_140px_100px_36px] gap-3 items-center">
                {/* Name */}
                <Input
                  value={p.name}
                  placeholder="e.g. Standard Permission"
                  onChange={(e) => {
                    const copy = [...currentList];
                    copy[i] = { ...p, name: e.target.value };
                    setCompany({ permissionTypes: copy });
                  }}
                />
                {/* Allowed Hours */}
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={p.maxHours}
                    min={0.5}
                    step={0.5}
                    placeholder="2"
                    onChange={(e) => {
                      const copy = [...currentList];
                      copy[i] = { ...p, maxHours: +e.target.value || 0 };
                      setCompany({ permissionTypes: copy });
                    }}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">hrs</span>
                </div>
                {/* Reset Frequency / Period */}
                <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...currentList];
                      copy[i] = { ...p, period: "month" };
                      setCompany({ permissionTypes: copy });
                    }}
                    className={`flex-1 py-1.5 text-center transition-colors ${
                      p.period === "month"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    /Mo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...currentList];
                      copy[i] = { ...p, period: "year" };
                      setCompany({ permissionTypes: copy });
                    }}
                    className={`flex-1 py-1.5 text-center transition-colors ${
                      p.period === "year"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    /Yr
                  </button>
                </div>
                {/* Max Requests Per Month */}
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={p.maxRequestsPerMonth ?? ""}
                    min={1}
                    placeholder="e.g. 2"
                    onChange={(e) => {
                      const copy = [...currentList];
                      const val = e.target.value === "" ? undefined : +e.target.value || 0;
                      copy[i] = { ...p, maxRequestsPerMonth: val };
                      setCompany({ permissionTypes: copy });
                    }}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">times</span>
                </div>
                {/* Paid / Unpaid toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const copy = [...currentList];
                    copy[i] = { ...p, paid: p.paid === false ? true : false };
                    setCompany({ permissionTypes: copy });
                  }}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                    p.paid !== false
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {p.paid !== false ? "Paid" : "Unpaid"}
                </button>
                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() =>
                    setCompany({
                      permissionTypes: currentList.filter((_, j) => j !== i),
                    })
                  }
                >
                  ×
                </Button>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">
            Configure short-duration permission allowances (e.g. 2 hours per month). Employees apply in hours for late entry, early exit, or personal emergency. Quotas reset automatically based on the selected frequency (/Mo or /Yr).
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const currentList = company.permissionTypes ?? [
                { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
              ];
              setCompany({
                permissionTypes: [
                  ...currentList,
                  {
                    id: crypto.randomUUID(),
                    name: "Personal Permission",
                    maxHours: 2,
                    period: "month",
                    maxRequestsPerMonth: 2,
                    paid: true,
                  },
                ],
              });
            }}
          >
            + Add Permission Type
          </Button>
        </div>
      </Card>

    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
      <h2 className="font-display text-lg font-semibold mb-4 text-foreground">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function AssetUpload({ label, src, onFile }: { label: string; src?: string; onFile: (f: File | null) => void }) {
  return (
    <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="h-20 rounded-lg border border-dashed border-border bg-background flex items-center justify-center overflow-hidden">
        {src ? (
          <img src={src} alt={label} className="h-full w-full object-contain p-1" />
        ) : (
          <span className="text-[11px] text-muted-foreground">No file uploaded</span>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
        className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary file:font-semibold hover:file:bg-primary/20"
      />
    </div>
  );
}
