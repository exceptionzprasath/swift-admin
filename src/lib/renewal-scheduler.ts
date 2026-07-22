import type { TenantSubscription } from "./billing";

export type ReminderChannel = "email" | "sms" | "whatsapp" | "push" | "banner";

export type ReminderStage =
  | "pre-30" | "pre-15" | "pre-7" | "pre-3" | "pre-1"
  | "renewal-day" | "grace" | "final-warning" | "expired";

export type ReminderConfig = {
  offsets: number[];                 // days before expiry to notify (positive numbers)
  gracePeriodDays: number;           // days after expiry before suspension
  finalWarningDays: number;          // days after expiry (during grace) for final warning
  channels: Record<ReminderChannel, boolean>;
  autoSuspend: boolean;              // suspend when grace ends
  quietHours?: { start: number; end: number }; // 0-23 hour, skip sending
  templates: Partial<Record<ReminderStage, string>>;
};

export const defaultReminderConfig: ReminderConfig = {
  offsets: [30, 15, 7, 3, 1],
  gracePeriodDays: 7,
  finalWarningDays: 5,
  channels: { email: true, sms: true, whatsapp: true, push: true, banner: true },
  autoSuspend: true,
  templates: {
    "pre-30": "Your SWIFT subscription renews in 30 days. Review your plan to avoid disruption.",
    "pre-15": "Heads up — 15 days until renewal. Confirm billing details are up to date.",
    "pre-7":  "7 days to renewal. Renew now to lock in current pricing.",
    "pre-3":  "3 days left. Please complete renewal to keep all modules active.",
    "pre-1":  "Final day before renewal. Payment required within 24 hours.",
    "renewal-day": "Today is your renewal day. Complete payment to continue uninterrupted service.",
    "grace": "Your subscription has expired and is now in a {graceDays}-day grace period.",
    "final-warning": "FINAL WARNING — Access will be suspended in {daysLeft} days if not renewed.",
    "expired": "Subscription suspended. Please renew to restore access.",
  },
};

export type ReminderPlan = {
  stage: ReminderStage;
  dueAt: string;   // ISO
  daysFromExpiry: number; // negative = before, 0 = renewal day, positive = after (grace)
  channels: ReminderChannel[];
  message: string;
  status: "scheduled" | "due" | "sent" | "skipped";
};

export type ReminderLogEntry = {
  id: string;
  subscriptionId: string;
  tenantId: string;
  stage: ReminderStage;
  channels: ReminderChannel[];
  sentAt: string;
  message: string;
};

const DAY = 86400_000;

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function activeChannels(cfg: ReminderConfig): ReminderChannel[] {
  return (Object.keys(cfg.channels) as ReminderChannel[]).filter((c) => cfg.channels[c]);
}

/** Compute all reminder points for a subscription against config. */
export function computeReminderPlan(
  sub: TenantSubscription,
  cfg: ReminderConfig,
  now: Date = new Date(),
): ReminderPlan[] {
  const expiry = new Date(sub.expiresAt);
  const channels = activeChannels(cfg);
  const plan: ReminderPlan[] = [];

  const push = (stage: ReminderStage, due: Date, daysFromExpiry: number, vars: Record<string, string | number> = {}) => {
    const tpl = cfg.templates[stage] ?? "";
    plan.push({
      stage,
      dueAt: due.toISOString(),
      daysFromExpiry,
      channels,
      message: fmt(tpl, vars),
      status: now.getTime() >= due.getTime() ? "due" : "scheduled",
    });
  };

  // Pre-expiry offsets
  for (const off of [...cfg.offsets].sort((a, b) => b - a)) {
    const due = new Date(expiry.getTime() - off * DAY);
    push(`pre-${off}` as ReminderStage, due, -off);
  }
  // Renewal day
  push("renewal-day", expiry, 0);
  // Grace start
  if (cfg.gracePeriodDays > 0) {
    push("grace", new Date(expiry.getTime() + DAY), 1,
      { graceDays: cfg.gracePeriodDays });
  }
  // Final warning near end of grace
  if (cfg.finalWarningDays > 0 && cfg.gracePeriodDays > cfg.finalWarningDays) {
    const due = new Date(expiry.getTime() + (cfg.gracePeriodDays - cfg.finalWarningDays) * DAY);
    push("final-warning", due, cfg.gracePeriodDays - cfg.finalWarningDays,
      { daysLeft: cfg.finalWarningDays });
  }
  // Expiry / suspension
  push("expired", new Date(expiry.getTime() + cfg.gracePeriodDays * DAY), cfg.gracePeriodDays);

  return plan.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** Resolve the correct subscription status based on now vs expiresAt+grace. */
export function resolveScheduledStatus(
  sub: TenantSubscription,
  cfg: ReminderConfig,
  now: Date = new Date(),
): TenantSubscription["status"] {
  if (sub.status === "cancelled" || sub.status === "trial") return sub.status;
  const expiry = new Date(sub.expiresAt).getTime();
  const t = now.getTime();
  if (t < expiry) return "active";
  if (t < expiry + cfg.gracePeriodDays * DAY) return "grace";
  return cfg.autoSuspend ? "suspended" : "past_due";
}

function inQuietHours(cfg: ReminderConfig, now: Date): boolean {
  const q = cfg.quietHours;
  if (!q) return false;
  const h = now.getHours();
  return q.start <= q.end ? h >= q.start && h < q.end : h >= q.start || h < q.end;
}

/** Determine which reminders should fire now (not previously logged today for that stage). */
export function dueReminders(
  sub: TenantSubscription,
  cfg: ReminderConfig,
  log: ReminderLogEntry[],
  now: Date = new Date(),
): ReminderPlan[] {
  if (inQuietHours(cfg, now)) return [];
  const already = new Set(
    log.filter((l) => l.subscriptionId === sub.id).map((l) => l.stage),
  );
  return computeReminderPlan(sub, cfg, now).filter(
    (p) => p.status === "due" && !already.has(p.stage),
  );
}
