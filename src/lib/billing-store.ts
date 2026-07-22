import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  defaultPlans, defaultCoupons, defaultReferralPrograms,
  emptyUsage, buildInvoice, cycleDays, prorateCredit, referralCodeFor,
  type Plan, type Coupon, type ReferralProgram, type TenantSubscription,
  type Invoice, type ModuleKey, type ModuleStatus, type PlanLimits,
  type PaymentMethod, type UsageCounters, type SubscriptionHistoryEntry,
} from "./billing";
import {
  defaultReminderConfig, computeReminderPlan, dueReminders, resolveScheduledStatus,
  type ReminderConfig, type ReminderLogEntry, type ReminderPlan,
} from "./renewal-scheduler";

type ReferralLedger = {
  tenantId: string;
  code: string;
  invited: string[];
  registered: string[];
  activated: string[];
  paid: string[];
  rewardsEarned: number;
};

type BillingState = {
  plans: Plan[];
  coupons: Coupon[];
  referralPrograms: ReferralProgram[];
  subscriptions: TenantSubscription[];
  invoices: Invoice[];
  referrals: ReferralLedger[];
  audit: SubscriptionHistoryEntry[];
  reminderConfig: ReminderConfig;
  reminderLog: ReminderLogEntry[];

  // plan CRUD
  addPlan: (p: Plan) => void;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;

  // subscription
  ensureSubscription: (tenantId: string, planId?: string) => TenantSubscription;
  updateSubscription: (id: string, patch: Partial<TenantSubscription>) => void;
  setModuleOverride: (subId: string, module: ModuleKey, status: ModuleStatus | null) => void;
  setFeatureOverride: (subId: string, key: string, value: boolean | null) => void;
  setLimitOverride: (subId: string, key: keyof PlanLimits, value: number | null) => void;
  bumpUsage: (tenantId: string, key: keyof UsageCounters, by?: number) => void;
  setUsage: (tenantId: string, patch: Partial<UsageCounters>) => void;

  // billing actions
  upgrade: (subId: string, toPlanId: string, employees: number, opts?: { immediate?: boolean; couponCode?: string; paymentMethod?: PaymentMethod; actor?: string }) => Invoice | null;
  downgrade: (subId: string, toPlanId: string, actor?: string) => void;
  renew: (subId: string, employees: number, opts?: { couponCode?: string; paymentMethod?: PaymentMethod; actor?: string }) => Invoice | null;
  markInvoicePaid: (invoiceId: string, method: PaymentMethod) => void;

  // coupons / referrals
  addCoupon: (c: Coupon) => void;
  updateCoupon: (id: string, patch: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  addReferralProgram: (p: ReferralProgram) => void;
  updateReferralProgram: (id: string, patch: Partial<ReferralProgram>) => void;
  deleteReferralProgram: (id: string) => void;
  recordReferral: (referrerTenantId: string, invitedIdentifier: string, stage: "invited" | "registered" | "activated" | "paid") => void;

  // renewal scheduler
  updateReminderConfig: (patch: Partial<ReminderConfig>) => void;
  setReminderChannel: (subId: string, channel: keyof TenantSubscription["reminderChannels"], on: boolean) => void;
  runRenewalScheduler: (now?: Date) => ReminderLogEntry[];
  previewReminderPlan: (subId: string, now?: Date) => ReminderPlan[];
  clearReminderLog: (subId?: string) => void;

  // reset
  resetBilling: () => void;
};

const initial = () => ({
  plans: defaultPlans(),
  coupons: defaultCoupons(),
  referralPrograms: defaultReferralPrograms(),
  subscriptions: [] as TenantSubscription[],
  invoices: [] as Invoice[],
  referrals: [] as ReferralLedger[],
  audit: [] as SubscriptionHistoryEntry[],
  reminderConfig: defaultReminderConfig,
  reminderLog: [] as ReminderLogEntry[],
});

export const useBilling = create<BillingState>()(
  persist(
    (set, get) => ({
      ...initial(),

      addPlan: (p) => set((s) => ({ plans: [...s.plans, p] })),
      updatePlan: (id, patch) => set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch, limits: { ...p.limits, ...(patch.limits ?? {}) } } : p)) })),
      deletePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),

      ensureSubscription: (tenantId, planId) => {
        const existing = get().subscriptions.find((s) => s.tenantId === tenantId);
        if (existing) return existing;
        const plan = get().plans.find((p) => p.id === (planId ?? get().plans[0]?.id));
        const cycle = plan?.cycle ?? "monthly";
        const now = new Date();
        const days = cycleDays(cycle);
        const expires = new Date(now.getTime() + days * 86400_000);
        const sub: TenantSubscription = {
          id: crypto.randomUUID(),
          tenantId,
          planId: plan?.id ?? "plan-starter",
          cycle,
          status: (plan?.trialDays ?? 0) > 0 ? "trial" : "active",
          activatedAt: now.toISOString(),
          renewalAt: expires.toISOString(),
          expiresAt: expires.toISOString(),
          paymentStatus: "pending",
          moduleOverrides: {},
          featureOverrides: {},
          limitOverrides: {},
          usage: emptyUsage(),
          history: [{ ts: now.toISOString(), actor: "system", kind: "activation", toPlanId: plan?.id, note: "Subscription initialised" }],
          reminderChannels: { email: true, sms: false, whatsapp: false, push: true, banner: true },
        };
        // referral ledger
        const ledger: ReferralLedger = {
          tenantId, code: referralCodeFor(tenantId),
          invited: [], registered: [], activated: [], paid: [], rewardsEarned: 0,
        };
        set((s) => ({
          subscriptions: [...s.subscriptions, sub],
          referrals: s.referrals.find((r) => r.tenantId === tenantId) ? s.referrals : [...s.referrals, ledger],
        }));
        return sub;
      },

      updateSubscription: (id, patch) => set((s) => ({
        subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      })),

      setModuleOverride: (subId, module, status) => set((s) => ({
        subscriptions: s.subscriptions.map((x) => {
          if (x.id !== subId) return x;
          const next = { ...x.moduleOverrides };
          if (status === null) delete next[module]; else next[module] = status;
          return {
            ...x, moduleOverrides: next,
            history: [{ ts: new Date().toISOString(), actor: "admin", kind: status ? "feature_unlock" : "feature_lock", note: `Module ${module} → ${status ?? "reset"}` }, ...x.history],
          };
        }),
      })),

      setFeatureOverride: (subId, key, value) => set((s) => ({
        subscriptions: s.subscriptions.map((x) => {
          if (x.id !== subId) return x;
          const next = { ...x.featureOverrides };
          if (value === null) delete next[key]; else next[key] = value;
          return { ...x, featureOverrides: next };
        }),
      })),

      setLimitOverride: (subId, key, value) => set((s) => ({
        subscriptions: s.subscriptions.map((x) => {
          if (x.id !== subId) return x;
          const next = { ...x.limitOverrides };
          if (value === null) delete (next as any)[key]; else (next as any)[key] = value;
          return { ...x, limitOverrides: next };
        }),
      })),

      bumpUsage: (tenantId, key, by = 1) => set((s) => ({
        subscriptions: s.subscriptions.map((x) => {
          if (x.tenantId !== tenantId) return x;
          const usage = { ...x.usage, [key]: (x.usage[key] ?? 0) + by };
          return { ...x, usage };
        }),
      })),

      setUsage: (tenantId, patch) => set((s) => ({
        subscriptions: s.subscriptions.map((x) => x.tenantId === tenantId ? { ...x, usage: { ...x.usage, ...patch } } : x),
      })),

      upgrade: (subId, toPlanId, employees, opts = {}) => {
        const sub = get().subscriptions.find((x) => x.id === subId);
        const toPlan = get().plans.find((p) => p.id === toPlanId);
        const fromPlan = sub && get().plans.find((p) => p.id === sub.planId);
        if (!sub || !toPlan) return null;
        const coupon = opts.couponCode ? get().coupons.find((c) => c.code === opts.couponCode) : undefined;
        const proration = fromPlan ? prorateCredit(sub, fromPlan, employees) : 0;
        const invoice = buildInvoice({
          tenantId: sub.tenantId, plan: toPlan, employees,
          coupon, prorationCredit: proration, kind: "upgrade",
          paymentMethod: opts.paymentMethod,
        });
        const now = new Date();
        const activateAt = opts.immediate === false ? new Date(sub.expiresAt) : now;
        const expires = new Date(activateAt.getTime() + cycleDays(toPlan.cycle) * 86400_000);
        set((s) => ({
          invoices: [invoice, ...s.invoices],
          coupons: coupon ? s.coupons.map((c) => c.id === coupon.id ? { ...c, used: c.used + 1 } : c) : s.coupons,
          subscriptions: s.subscriptions.map((x) => x.id === subId ? {
            ...x, planId: toPlan.id, cycle: toPlan.cycle,
            status: "active", paymentStatus: opts.paymentMethod ? "paid" : "pending",
            activatedAt: activateAt.toISOString(),
            renewalAt: expires.toISOString(), expiresAt: expires.toISOString(),
            couponCode: coupon?.code ?? x.couponCode,
            history: [{ ts: now.toISOString(), actor: opts.actor ?? "admin", kind: "upgrade", fromPlanId: sub.planId, toPlanId: toPlan.id, amount: invoice.total, note: `Upgraded to ${toPlan.name}` }, ...x.history],
          } : x),
          audit: [{ ts: now.toISOString(), actor: opts.actor ?? "admin", kind: "upgrade", fromPlanId: sub.planId, toPlanId: toPlan.id, amount: invoice.total }, ...s.audit],
        }));
        return invoice;
      },

      downgrade: (subId, toPlanId, actor = "admin") => {
        const sub = get().subscriptions.find((x) => x.id === subId);
        const toPlan = get().plans.find((p) => p.id === toPlanId);
        if (!sub || !toPlan) return;
        const now = new Date().toISOString();
        set((s) => ({
          subscriptions: s.subscriptions.map((x) => x.id === subId ? {
            ...x, planId: toPlan.id,
            history: [{ ts: now, actor, kind: "downgrade", fromPlanId: sub.planId, toPlanId: toPlan.id, note: "Premium features locked; data retained." }, ...x.history],
          } : x),
          audit: [{ ts: now, actor, kind: "downgrade", fromPlanId: sub.planId, toPlanId: toPlan.id }, ...s.audit],
        }));
      },

      renew: (subId, employees, opts = {}) => {
        const sub = get().subscriptions.find((x) => x.id === subId);
        const plan = sub && get().plans.find((p) => p.id === sub.planId);
        if (!sub || !plan) return null;
        const coupon = opts.couponCode ? get().coupons.find((c) => c.code === opts.couponCode) : undefined;
        const invoice = buildInvoice({ tenantId: sub.tenantId, plan, employees, coupon, kind: "renewal", paymentMethod: opts.paymentMethod });
        const now = new Date();
        const expires = new Date(now.getTime() + cycleDays(plan.cycle) * 86400_000);
        set((s) => ({
          invoices: [invoice, ...s.invoices],
          coupons: coupon ? s.coupons.map((c) => c.id === coupon.id ? { ...c, used: c.used + 1 } : c) : s.coupons,
          subscriptions: s.subscriptions.map((x) => x.id === subId ? {
            ...x, status: "active", paymentStatus: opts.paymentMethod ? "paid" : "pending",
            renewalAt: expires.toISOString(), expiresAt: expires.toISOString(),
            history: [{ ts: now.toISOString(), actor: opts.actor ?? "admin", kind: "renewal", amount: invoice.total }, ...x.history],
          } : x),
          audit: [{ ts: now.toISOString(), actor: opts.actor ?? "admin", kind: "renewal", amount: invoice.total }, ...s.audit],
        }));
        return invoice;
      },

      markInvoicePaid: (invoiceId, method) => set((s) => {
        const inv = s.invoices.find((i) => i.id === invoiceId);
        if (!inv) return {};
        return {
          invoices: s.invoices.map((i) => i.id === invoiceId ? { ...i, status: "paid", paymentMethod: method } : i),
          subscriptions: s.subscriptions.map((x) => x.tenantId === inv.tenantId ? { ...x, paymentStatus: "paid" } : x),
          audit: [{ ts: new Date().toISOString(), actor: "admin", kind: "payment", amount: inv.total, note: `Invoice ${inv.number} paid via ${method}` }, ...s.audit],
        };
      }),

      addCoupon: (c) => set((s) => ({ coupons: [...s.coupons, c] })),
      updateCoupon: (id, patch) => set((s) => ({ coupons: s.coupons.map((c) => c.id === id ? { ...c, ...patch } : c) })),
      deleteCoupon: (id) => set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) })),

      addReferralProgram: (p) => set((s) => ({ referralPrograms: [...s.referralPrograms, p] })),
      updateReferralProgram: (id, patch) => set((s) => ({ referralPrograms: s.referralPrograms.map((r) => r.id === id ? { ...r, ...patch } : r) })),
      deleteReferralProgram: (id) => set((s) => ({ referralPrograms: s.referralPrograms.filter((r) => r.id !== id) })),

      recordReferral: (referrerTenantId, invitedIdentifier, stage) => set((s) => ({
        referrals: s.referrals.map((r) => {
          if (r.tenantId !== referrerTenantId) return r;
          const bucket = { ...r, [stage]: Array.from(new Set([...(r as any)[stage], invitedIdentifier])) };
          return bucket;
        }),
      })),

      updateReminderConfig: (patch) => set((s) => ({
        reminderConfig: {
          ...s.reminderConfig, ...patch,
          channels: { ...s.reminderConfig.channels, ...(patch.channels ?? {}) },
          templates: { ...s.reminderConfig.templates, ...(patch.templates ?? {}) },
        },
      })),

      setReminderChannel: (subId, channel, on) => set((s) => ({
        subscriptions: s.subscriptions.map((x) =>
          x.id === subId ? { ...x, reminderChannels: { ...x.reminderChannels, [channel]: on } } : x,
        ),
      })),

      previewReminderPlan: (subId, now) => {
        const sub = get().subscriptions.find((x) => x.id === subId);
        if (!sub) return [];
        return computeReminderPlan(sub, get().reminderConfig, now);
      },

      clearReminderLog: (subId) => set((s) => ({
        reminderLog: subId ? s.reminderLog.filter((l) => l.subscriptionId !== subId) : [],
      })),

      runRenewalScheduler: (now = new Date()) => {
        const { subscriptions, reminderConfig, reminderLog } = get();
        const newLog: ReminderLogEntry[] = [];
        const statusPatches: Record<string, TenantSubscription["status"]> = {};

        for (const sub of subscriptions) {
          // status transition
          const nextStatus = resolveScheduledStatus(sub, reminderConfig, now);
          if (nextStatus !== sub.status) statusPatches[sub.id] = nextStatus;

          // per-sub enabled channels intersect global config
          const subChans = sub.reminderChannels;
          const due = dueReminders(sub, reminderConfig, reminderLog, now)
            .map((r) => ({
              ...r,
              channels: r.channels.filter((c) => (subChans as any)[c]),
            }))
            .filter((r) => r.channels.length > 0);

          for (const r of due) {
            newLog.push({
              id: crypto.randomUUID(),
              subscriptionId: sub.id,
              tenantId: sub.tenantId,
              stage: r.stage,
              channels: r.channels,
              sentAt: now.toISOString(),
              message: r.message,
            });
          }
        }

        if (newLog.length === 0 && Object.keys(statusPatches).length === 0) return [];

        set((s) => ({
          reminderLog: [...newLog, ...s.reminderLog].slice(0, 500),
          subscriptions: s.subscriptions.map((x) => {
            const newStatus = statusPatches[x.id];
            if (!newStatus) return x;
            return {
              ...x, status: newStatus,
              history: [
                { ts: now.toISOString(), actor: "scheduler", kind: newStatus === "grace" ? "grace_start" : newStatus === "suspended" ? "suspension" : "status_change", note: `Auto status → ${newStatus}` },
                ...x.history,
              ],
            };
          }),
          audit: [
            ...newLog.map((l): SubscriptionHistoryEntry => ({ ts: l.sentAt, actor: "scheduler", kind: "reminder", note: `${l.stage} via ${l.channels.join(",")}` })),
            ...s.audit,
          ].slice(0, 500),
        }));
        return newLog;
      },

      resetBilling: () => set(initial()),
    }),
    { name: "swift-billing" }
  )
);
