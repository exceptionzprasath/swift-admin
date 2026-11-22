import { useState } from "react";
import { PeriodicLeavePolicy } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  RotateCcw,
  Check,
  RefreshCw,
  Tag,
  ShieldCheck,
  Info,
  Calendar,
  Sparkles,
} from "lucide-react";

interface PeriodicLeavePolicyCardProps {
  leaveType: "CL" | "SL";
  title: string;
  description: string;
  policy: PeriodicLeavePolicy;
  onUpdate: (updated: PeriodicLeavePolicy) => void;
  onSave?: () => Promise<void>;
  onPreviewRun?: (type: "CL" | "SL") => void;
}

export function PeriodicLeavePolicyCard({
  leaveType,
  title,
  description,
  policy,
  onUpdate,
  onSave,
  onPreviewRun,
}: PeriodicLeavePolicyCardProps) {
  const [saving, setSaving] = useState(false);

  const isCL = leaveType === "CL";
  const icon = isCL ? (
    <Tag className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
  );

  const themeBorder = isCL ? "border-emerald-500/25" : "border-sky-500/25";
  const themeGradient = isCL
    ? "from-card via-card to-emerald-500/5"
    : "from-card via-card to-sky-500/5";
  const themeBadge = isCL
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30";

  const handleCycleChange = (cycle: "quarterly" | "half_yearly" | "annual") => {
    // suggest standard defaults if matching previous default
    let defaultQuota = policy.cycleQuota;
    if (cycle === "quarterly") defaultQuota = 3;
    else if (cycle === "half_yearly") defaultQuota = 6;
    else if (cycle === "annual") defaultQuota = 12;

    onUpdate({
      ...policy,
      renewalCycle: cycle,
      cycleQuota: defaultQuota,
    });
  };

  const handleSave = async () => {
    if (!onSave) return;
    try {
      setSaving(true);
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const cycleLabels = {
    quarterly: "Quarterly (Every 3 Months)",
    half_yearly: "Half-Yearly (Every 6 Months)",
    annual: "Annual (Once a Year)",
  };

  const cycleDates = {
    quarterly: "Jan 1, Apr 1, Jul 1, Oct 1",
    half_yearly: "Jan 1 & Jul 1",
    annual: "Jan 1",
  };

  return (
    <Card className={`rounded-2xl ${themeBorder} bg-gradient-to-br ${themeGradient} shadow-xs`}>
      <CardHeader className="pb-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                  isCL
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                }`}
              >
                {icon}
              </div>
              <CardTitle className="text-base font-bold">{title}</CardTitle>
              <Badge variant="outline" className={`text-[10px] font-semibold ${themeBadge}`}>
                Periodic Allocation &amp; Rollover
              </Badge>
            </div>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>

          {onPreviewRun && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onPreviewRun(leaveType)}
              className="text-xs h-8 rounded-xl font-semibold gap-1.5 shrink-0 shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span>Preview / Run Renewal</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* SUB-SECTION A: Allocation & Renewal Frequency */}
        <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
          <div className="space-y-0.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Sub-section A: Allocation &amp; Renewal Frequency
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Determines how frequently new {leaveType} quotas are credited to employees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Quarterly */}
            <div
              onClick={() => handleCycleChange("quarterly")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                policy.renewalCycle === "quarterly"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                  : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <span className="font-bold text-xs text-foreground">Quarterly</span>
                {policy.renewalCycle === "quarterly" && (
                  <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Credits once every 3 months</p>
              <span className="text-[10px] font-mono text-muted-foreground mt-2 block">
                Jan 1, Apr 1, Jul 1, Oct 1
              </span>
            </div>

            {/* 2. Half-Yearly */}
            <div
              onClick={() => handleCycleChange("half_yearly")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                policy.renewalCycle === "half_yearly"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                  : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <span className="font-bold text-xs text-foreground">Half-Yearly</span>
                {policy.renewalCycle === "half_yearly" && (
                  <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Credits once every 6 months</p>
              <span className="text-[10px] font-mono text-muted-foreground mt-2 block">
                Jan 1 &amp; Jul 1
              </span>
            </div>

            {/* 3. Annual */}
            <div
              onClick={() => handleCycleChange("annual")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                policy.renewalCycle === "annual"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                  : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <span className="font-bold text-xs text-foreground">Annual</span>
                {policy.renewalCycle === "annual" && (
                  <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Credits once every year</p>
              <span className="text-[10px] font-mono text-muted-foreground mt-2 block">
                Jan 1 (New Year reset)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quota Credited Per Cycle (Days)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={policy.cycleQuota}
                  onChange={(e) =>
                    onUpdate({
                      ...policy,
                      cycleQuota: Math.max(0.5, +e.target.value || 1),
                    })
                  }
                  className="text-xs h-9 font-semibold"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Days / {policy.renewalCycle}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <div className="leading-relaxed">
                Active schedule: <strong className="text-foreground">{policy.cycleQuota} {leaveType} days</strong> credited on{" "}
                <strong className="text-foreground">{cycleDates[policy.renewalCycle]}</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* SUB-SECTION B: Leave Rollover Toggle */}
        <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                Sub-section B: Leave Rollover Policy
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Controls whether unused {leaveType} transfers into the next period or expires.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {policy.rolloverEnabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={policy.rolloverEnabled}
                onCheckedChange={(checked) =>
                  onUpdate({
                    ...policy,
                    rolloverEnabled: checked,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/60">
            {policy.rolloverEnabled ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Maximum Rollover Cap (Days)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="No Cap (100% Transfers)"
                        value={policy.maxRolloverDays ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            ...policy,
                            maxRolloverDays: e.target.value ? Math.max(0, +e.target.value) : undefined,
                          })
                        }
                        className="text-xs h-9 font-medium"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Days Cap
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-2">
                      {policy.maxRolloverDays && policy.maxRolloverDays > 0
                        ? `Caps carried-over ${leaveType} to ${policy.maxRolloverDays} days. Any excess above ${policy.maxRolloverDays} days expires.`
                        : "Optional cap left blank: 100% of unused balance rolls over into the next cycle."}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-foreground leading-relaxed">
                  <span className="font-semibold text-primary">Helper Rule: </span>
                  Unused {leaveType} balance from the previous period transfers forward and adds to the new cycle&apos;s quota (e.g., 2 unused days + {policy.cycleQuota} new {policy.renewalCycle} days = <strong>{2 + policy.cycleQuota} days</strong> available).
                </div>
              </>
            ) : (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                <span className="font-semibold text-amber-700 dark:text-amber-300">Helper Rule: </span>
                Unused {leaveType} balance expires at the end of each cycle/year, and the employee&apos;s balance resets strictly to the new cycle quota (<strong>{policy.cycleQuota} days</strong>).
              </div>
            )}
          </div>
        </div>

        {/* SUB-SECTION C: Prorate New Joiners */}
        <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Sub-section C: Mid-Cycle Joiner Proration
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Pro-rates leave quota for employees joining mid-quarter, half-year, or year.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {policy.prorateNewJoiners !== false ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={policy.prorateNewJoiners !== false}
                onCheckedChange={(checked) =>
                  onUpdate({
                    ...policy,
                    prorateNewJoiners: checked,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Save Policy Button */}
        {onSave && (
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground">
              Changes take effect immediately across all employee leave balance tables and self-service portals.
            </p>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-primary text-primary-foreground font-semibold px-6 h-9 rounded-xl shadow-xs"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{saving ? `Saving ${leaveType}...` : `Save ${leaveType} Policy`}</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
