import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useComplianceRegistry } from "@/lib/compliance-registry-store";
import { useCompliance } from "@/lib/compliance-store";
import { useTriggerAlerts } from "@/lib/ai-trigger-store";
import { scanRegistry, alertsForEvent, type ComplianceAlert } from "@/lib/ai-trigger-engine";
import { onCompliance } from "@/lib/compliance-bus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BellRing, Sparkles, X, ArrowRight, ShieldAlert, Clock, Zap } from "lucide-react";

const SEVERITY_STYLE = {
  info: "border-primary/30 bg-primary/5",
  warn: "border-amber-500/40 bg-amber-500/5",
  critical: "border-destructive/40 bg-destructive/5",
} as const;

const KIND_ICON = { event: Zap, time: Clock, conditional: ShieldAlert } as const;

export function AiTriggerBell() {
  const { entries } = useComplianceRegistry();
  const { profile } = useCompliance();
  const { alerts, ingest, dismiss, dismissAll } = useTriggerAlerts();
  const [open, setOpen] = useState(false);

  // Periodic scan (time + conditional)
  useEffect(() => {
    const run = () => {
      const list = scanRegistry({ entries, profile });
      ingest(list);
    };
    run();
    const id = setInterval(run, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(id);
  }, [entries, profile, ingest]);

  // Event bus subscription
  useEffect(() => {
    const off = onCompliance((event, payload) => {
      const list = alertsForEvent(entries, profile, event, payload.subject);
      const added = ingest(list);
      if (added > 0) setOpen(true);
    });
    return () => { off(); };
  }, [entries, profile, ingest]);

  const grouped = useMemo(() => {
    const g: Record<ComplianceAlert["kind"], ComplianceAlert[]> = { event: [], time: [], conditional: [] };
    for (const a of alerts) g[a.kind].push(a);
    return g;
  }, [alerts]);

  const critical = alerts.filter((a) => a.severity === "critical").length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group" title="AI Compliance Alerts">
          <BellRing className={`h-5 w-5 transition-colors ${critical ? "text-destructive" : "group-hover:text-primary"} ${alerts.length > 0 ? "animate-swift-ring" : ""}`} />
          {alerts.length > 0 && (
            <>
              <span className={`absolute inset-0 rounded-full ${critical ? "bg-destructive/20" : "bg-primary/20"} animate-swift-ping`} />
              <span className={`absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background ${
                critical ? "bg-destructive animate-pulse" : "bg-gradient-brand animate-swift-gradient"
              }`}>{alerts.length > 99 ? "99+" : alerts.length}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 max-h-[80vh] overflow-hidden flex flex-col animate-swift-slide-up glass border-border/60">
        <div className="flex items-center justify-between p-3 border-b bg-gradient-brand/5">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-6 w-6 rounded-full bg-primary/10 items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </span>
            <span className="font-medium text-sm">AI Compliance Alerts</span>
            <Badge variant="outline" className="text-xs">{alerts.length}</Badge>
          </div>
          <div className="flex gap-1">
            {alerts.length > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => dismissAll()}>Clear all</Button>}
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No new alerts. SWIFT AI is watching your compliance events.
            </div>
          ) : (
            (["event", "time", "conditional"] as const).map((k) => grouped[k].length > 0 && (
              <div key={k}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40 sticky top-0">
                  {k === "event" ? "Event triggers" : k === "time" ? "Time-bound filings" : "Newly applicable"} · {grouped[k].length}
                </div>
                {grouped[k].map((a) => {
                  const Icon = KIND_ICON[a.kind];
                  return (
                    <div key={a.id} className={`p-3 border-l-2 border-b ${SEVERITY_STYLE[a.severity]}`}>
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{a.title}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{a.severity}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{a.why}</div>
                          <div className="mt-1.5 text-[11px] space-y-0.5">
                            <div><span className="text-muted-foreground">Law: </span>{a.law}</div>
                            {a.penalty && <div><span className="text-muted-foreground">Penalty: </span>{a.penalty}</div>}
                            {a.dueDate && <div><span className="text-muted-foreground">Due: </span>{a.dueDate}</div>}
                          </div>
                          <div className="mt-2 flex gap-1">
                            <Link to="/admin/compliance" onClick={() => setOpen(false)}>
                              <Button size="sm" className="h-7 text-xs">
                                {a.suggestedAction}<ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => dismiss(a.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
