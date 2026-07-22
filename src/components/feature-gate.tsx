import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, ShoppingCart, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBilling } from "@/lib/billing-store";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import {
  resolveModuleStatus, isFeatureEnabled, type ModuleKey,
} from "@/lib/billing";

export function useSubscriptionContext() {
  const { activeTenantId } = useAuth();
  const { demoMode } = useStore();
  const tenantId = activeTenantId ?? (demoMode ? "demo-tenant" : "default");
  const { plans, subscriptions, ensureSubscription } = useBilling();
  const sub = subscriptions.find((s) => s.tenantId === tenantId) ?? ensureSubscription(tenantId);
  const plan = plans.find((p) => p.id === sub.planId) ?? plans[0];
  return { tenantId, plan, sub };
}

export function useModuleStatus(module: ModuleKey) {
  const { plan, sub } = useSubscriptionContext();
  return resolveModuleStatus(plan, sub, module);
}

export function useFeature(key: string) {
  const { plan, sub } = useSubscriptionContext();
  return isFeatureEnabled(plan, sub, key);
}

type Props = {
  module: ModuleKey;
  title?: string;
  children: React.ReactNode;
};

const STATUS_LABEL: Record<string, string> = {
  enabled: "Enabled", trial: "Trial", read_only: "Read-only", locked: "Locked",
  expired: "Expired", coming_soon: "Coming soon", disabled: "Disabled",
  purchased: "Purchased", custom: "Custom",
};

export function FeatureGate({ module, title, children }: Props) {
  const status = useModuleStatus(module);
  if (status === "enabled" || status === "trial" || status === "purchased" || status === "custom") return <>{children}</>;
  if (status === "read_only") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <Badge variant="outline" className="mr-2">Read-only</Badge>
          This module is included in view-only mode. Upgrade to unlock actions.
          <Button asChild size="sm" className="ml-3"><Link to="/admin/subscription">Upgrade</Link></Button>
        </div>
        <div className="pointer-events-none opacity-70">{children}</div>
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-8 shadow-card text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="font-display text-xl font-semibold">{title ?? "Module locked"}</h2>
      <p className="text-sm text-muted-foreground mt-2">
        This module is <span className="font-medium">{STATUS_LABEL[status]}</span> on your current plan.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild className="bg-gradient-brand text-white"><Link to="/admin/subscription"><Sparkles className="h-4 w-4 mr-2" />Upgrade plan</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/subscription"><ShoppingCart className="h-4 w-4 mr-2" />Purchase add-on</Link></Button>
        <Button variant="ghost"><PhoneCall className="h-4 w-4 mr-2" />Contact sales</Button>
      </div>
    </div>
  );
}
