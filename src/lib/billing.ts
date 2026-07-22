// SWIFT AI — Subscription, Billing, Licensing & Feature Management Engine
// Everything below is data-driven. No module, price, limit, credit, coupon,
// referral tier or feature flag is hardcoded into UI — plans define them.

export type ModuleKey =
  | "company" | "employees" | "recruitment" | "attendance" | "biometric" | "geofence"
  | "leave" | "payroll" | "loan" | "advance" | "reimbursement" | "performance"
  | "training" | "visitor" | "asset" | "compliance_factory" | "compliance_shops"
  | "pf" | "esi" | "pt" | "lwf" | "bonus" | "gratuity" | "factory_forms" | "shops_forms"
  | "reports" | "analytics" | "dashboard"
  | "ai_chat" | "ai_documents" | "ai_compliance" | "ai_payroll" | "ai_attendance"
  | "notifications" | "api" | "mobile_app";

export const ALL_MODULES: { key: ModuleKey; label: string; group: string }[] = [
  { key: "company", label: "Company Registration", group: "Core" },
  { key: "employees", label: "Employee Management", group: "Core" },
  { key: "recruitment", label: "Recruitment", group: "HR" },
  { key: "attendance", label: "Attendance", group: "Attendance" },
  { key: "biometric", label: "Biometric", group: "Attendance" },
  { key: "geofence", label: "Geo Fence", group: "Attendance" },
  { key: "leave", label: "Leave", group: "HR" },
  { key: "payroll", label: "Payroll", group: "Payroll" },
  { key: "loan", label: "Loan", group: "Payroll" },
  { key: "advance", label: "Advance", group: "Payroll" },
  { key: "reimbursement", label: "Reimbursement", group: "Payroll" },
  { key: "performance", label: "Performance", group: "HR" },
  { key: "training", label: "Training", group: "HR" },
  { key: "visitor", label: "Visitor", group: "Ops" },
  { key: "asset", label: "Asset", group: "Ops" },
  { key: "compliance_factory", label: "Factory Compliance", group: "Compliance" },
  { key: "compliance_shops", label: "Shops & Establishment", group: "Compliance" },
  { key: "pf", label: "PF", group: "Statutory" },
  { key: "esi", label: "ESI", group: "Statutory" },
  { key: "pt", label: "Professional Tax", group: "Statutory" },
  { key: "lwf", label: "Labour Welfare Fund", group: "Statutory" },
  { key: "bonus", label: "Bonus", group: "Statutory" },
  { key: "gratuity", label: "Gratuity", group: "Statutory" },
  { key: "factory_forms", label: "Factory Forms", group: "Compliance" },
  { key: "shops_forms", label: "Shops Forms", group: "Compliance" },
  { key: "reports", label: "Reports", group: "Insights" },
  { key: "analytics", label: "Analytics", group: "Insights" },
  { key: "dashboard", label: "Dashboard", group: "Insights" },
  { key: "ai_chat", label: "AI Chat", group: "AI" },
  { key: "ai_documents", label: "AI Documents", group: "AI" },
  { key: "ai_compliance", label: "AI Compliance", group: "AI" },
  { key: "ai_payroll", label: "AI Payroll", group: "AI" },
  { key: "ai_attendance", label: "AI Attendance", group: "AI" },
  { key: "notifications", label: "Notifications", group: "Platform" },
  { key: "api", label: "API", group: "Platform" },
  { key: "mobile_app", label: "Mobile App", group: "Platform" },
];

export type ModuleStatus =
  | "enabled" | "disabled" | "trial" | "read_only" | "locked"
  | "expired" | "coming_soon" | "purchased" | "custom";

export type BillingCycle = "monthly" | "quarterly" | "half_yearly" | "yearly" | "custom";
export type PricingModel = "per_employee" | "flat" | "tiered" | "usage" | "custom";

export type PlanLimits = {
  employees: number;      // -1 = unlimited
  branches: number;
  hrUsers: number;
  adminUsers: number;
  departments: number;
  attendanceDevices: number;
  storageMB: number;
  documents: number;
  pdfDownloads: number;
  reports: number;
  apiCalls: number;
  notifications: number;
  aiCredits: number;
  smsCredits: number;
  emailCredits: number;
  whatsappCredits: number;
  ocrCredits: number;
};

export type FeatureFlags = Record<string, boolean>;

export type Plan = {
  id: string;
  name: string;
  description?: string;
  cycle: BillingCycle;
  pricing: PricingModel;
  basePrice: number;         // per cycle in local currency
  perEmployeePrice?: number; // for per_employee / tiered
  gstPct: number;
  trialDays: number;
  gracePeriodDays: number;
  modules: Partial<Record<ModuleKey, ModuleStatus>>;
  featureFlags: FeatureFlags; // e.g. "attendance.face", "attendance.qr"
  limits: PlanLimits;
  active: boolean;
  createdAt: string;
};

export type Coupon = {
  id: string;
  code: string;
  kind: "percent" | "flat" | "module" | "plan";
  value: number;
  target?: string;         // module key or plan id
  maxUses: number;         // -1 unlimited
  used: number;
  expiresAt?: string;
  tenantRestriction?: string[];
  active: boolean;
};

export type ReferralTier = { referrals: number; rewardKind: "discount_pct" | "ai_credits" | "storage_mb" | "users" | "modules"; value: number };
export type ReferralProgram = {
  id: string;
  name: string;
  active: boolean;
  tiers: ReferralTier[];
};

export type InvoiceLine = { label: string; qty: number; rate: number; amount: number };
export type Invoice = {
  id: string;
  number: string;
  tenantId: string;
  planId: string;
  cycle: BillingCycle;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue" | "refunded";
  paymentMethod?: PaymentMethod;
  couponCode?: string;
  proration?: number;
  kind: "subscription" | "renewal" | "upgrade" | "addon" | "refund" | "credit_note" | "debit_note";
};

export type PaymentMethod =
  | "razorpay" | "cashfree" | "phonepe" | "stripe" | "paypal"
  | "bank_transfer" | "upi" | "cheque" | "offline";

export type SubscriptionHistoryEntry = {
  ts: string;
  actor: string;
  kind: "activation" | "renewal" | "upgrade" | "downgrade" | "payment" | "feature_unlock" | "feature_lock" | "coupon" | "referral" | "refund" | "admin_change" | "reminder" | "grace_start" | "suspension" | "status_change";
  fromPlanId?: string;
  toPlanId?: string;
  amount?: number;
  note?: string;
};

export type UsageCounters = {
  employees: number;
  branches: number;
  hrUsers: number;
  adminUsers: number;
  aiCredits: number;
  storageMB: number;
  documents: number;
  pdfDownloads: number;
  reports: number;
  apiCalls: number;
  smsCredits: number;
  emailCredits: number;
  whatsappCredits: number;
  ocrCredits: number;
  notifications: number;
};

export type TenantSubscription = {
  id: string;
  tenantId: string;
  planId: string;
  cycle: BillingCycle;
  status: "trial" | "active" | "past_due" | "grace" | "suspended" | "cancelled";
  activatedAt: string;
  renewalAt: string;
  expiresAt: string;
  paymentStatus: "paid" | "pending" | "failed" | "refunded";
  couponCode?: string;
  referralCode?: string;
  moduleOverrides: Partial<Record<ModuleKey, ModuleStatus>>;
  featureOverrides: FeatureFlags;
  limitOverrides: Partial<PlanLimits>;
  usage: UsageCounters;
  history: SubscriptionHistoryEntry[];
  reminderChannels: { email: boolean; sms: boolean; whatsapp: boolean; push: boolean; banner: boolean };
};

/* --------------------------- defaults / seeds --------------------------- */

const emptyLimits: PlanLimits = {
  employees: 0, branches: 0, hrUsers: 0, adminUsers: 0, departments: 0,
  attendanceDevices: 0, storageMB: 0, documents: 0, pdfDownloads: 0, reports: 0,
  apiCalls: 0, notifications: 0, aiCredits: 0, smsCredits: 0, emailCredits: 0,
  whatsappCredits: 0, ocrCredits: 0,
};

export const EMPTY_LIMITS: PlanLimits = { ...emptyLimits };

export const emptyUsage = (): UsageCounters => ({
  employees: 0, branches: 0, hrUsers: 0, adminUsers: 0, aiCredits: 0,
  storageMB: 0, documents: 0, pdfDownloads: 0, reports: 0, apiCalls: 0,
  smsCredits: 0, emailCredits: 0, whatsappCredits: 0, ocrCredits: 0, notifications: 0,
});

export const FEATURE_KEYS: { key: string; label: string; module: ModuleKey }[] = [
  { key: "attendance.face", label: "Face Recognition", module: "attendance" },
  { key: "attendance.qr", label: "QR Attendance", module: "attendance" },
  { key: "attendance.gps", label: "GPS Attendance", module: "attendance" },
  { key: "attendance.offline", label: "Offline Attendance", module: "attendance" },
  { key: "attendance.geofence", label: "Geo Fence", module: "attendance" },
  { key: "attendance.shifts", label: "Shift Management", module: "attendance" },
  { key: "attendance.ot", label: "OT Calculation", module: "attendance" },
  { key: "attendance.analytics", label: "Attendance Analytics", module: "attendance" },
  { key: "payroll.arrears", label: "Arrears", module: "payroll" },
  { key: "payroll.retro", label: "Retro Payroll", module: "payroll" },
  { key: "payroll.bulk_revision", label: "Bulk Salary Revision", module: "payroll" },
  { key: "documents.bulk_zip", label: "Bulk ZIP Downloads", module: "ai_documents" },
  { key: "documents.esign", label: "E-Signatures", module: "ai_documents" },
  { key: "ai.copilot", label: "AI Copilot", module: "ai_chat" },
  { key: "ai.predictive", label: "Predictive AI", module: "ai_chat" },
];

export function makePlan(patch: Partial<Plan> & { name: string }): Plan {
  return {
    id: patch.id ?? crypto.randomUUID(),
    name: patch.name,
    description: patch.description ?? "",
    cycle: patch.cycle ?? "monthly",
    pricing: patch.pricing ?? "per_employee",
    basePrice: patch.basePrice ?? 0,
    perEmployeePrice: patch.perEmployeePrice ?? 0,
    gstPct: patch.gstPct ?? 18,
    trialDays: patch.trialDays ?? 14,
    gracePeriodDays: patch.gracePeriodDays ?? 7,
    modules: patch.modules ?? {},
    featureFlags: patch.featureFlags ?? {},
    limits: { ...emptyLimits, ...(patch.limits ?? {}) },
    active: patch.active ?? true,
    createdAt: patch.createdAt ?? new Date().toISOString(),
  };
}

const allEnabled = (): Partial<Record<ModuleKey, ModuleStatus>> => {
  const m: Partial<Record<ModuleKey, ModuleStatus>> = {};
  ALL_MODULES.forEach((x) => { m[x.key] = "enabled"; });
  return m;
};

const allFlags = (v = true): FeatureFlags => {
  const f: FeatureFlags = {};
  FEATURE_KEYS.forEach((x) => { f[x.key] = v; });
  return f;
};

export function defaultPlans(): Plan[] {
  return [
    makePlan({
      id: "plan-starter", name: "Starter",
      description: "Small teams getting started",
      cycle: "monthly", pricing: "per_employee",
      basePrice: 999, perEmployeePrice: 49,
      modules: {
        company: "enabled", employees: "enabled", attendance: "enabled",
        leave: "enabled", dashboard: "enabled", notifications: "enabled",
        payroll: "trial", ai_chat: "trial",
        ai_documents: "locked", ai_compliance: "locked", ai_payroll: "locked",
        performance: "locked", recruitment: "locked", api: "locked",
      },
      featureFlags: { ...allFlags(false), "attendance.gps": true, "attendance.shifts": true, "attendance.ot": true },
      limits: { ...emptyLimits, employees: 25, branches: 1, hrUsers: 2, adminUsers: 1, departments: 5, storageMB: 500, aiCredits: 100, pdfDownloads: 50, reports: 20, apiCalls: 0, notifications: 500, smsCredits: 100, emailCredits: 500, whatsappCredits: 50, ocrCredits: 20, documents: 100, attendanceDevices: 1 },
    }),
    makePlan({
      id: "plan-professional", name: "Professional",
      description: "Growing companies with multi-branch teams",
      cycle: "monthly", pricing: "per_employee",
      basePrice: 2499, perEmployeePrice: 79,
      modules: { ...allEnabled(), ai_compliance: "trial", api: "trial" },
      featureFlags: { ...allFlags(true), "ai.predictive": false },
      limits: { ...emptyLimits, employees: 150, branches: 5, hrUsers: 5, adminUsers: 3, departments: 20, storageMB: 5000, aiCredits: 1000, pdfDownloads: 500, reports: 200, apiCalls: 10000, notifications: 5000, smsCredits: 1000, emailCredits: 5000, whatsappCredits: 500, ocrCredits: 200, documents: 1000, attendanceDevices: 5 },
    }),
    makePlan({
      id: "plan-business", name: "Business",
      description: "Mid-market with advanced compliance and AI",
      cycle: "yearly", pricing: "per_employee",
      basePrice: 24999, perEmployeePrice: 69,
      modules: allEnabled(),
      featureFlags: allFlags(true),
      limits: { ...emptyLimits, employees: 500, branches: 15, hrUsers: 15, adminUsers: 8, departments: 50, storageMB: 25000, aiCredits: 5000, pdfDownloads: 2500, reports: 1000, apiCalls: 100000, notifications: 25000, smsCredits: 5000, emailCredits: 25000, whatsappCredits: 2500, ocrCredits: 1000, documents: 10000, attendanceDevices: 15 },
    }),
    makePlan({
      id: "plan-enterprise", name: "Enterprise",
      description: "Unlimited everything with dedicated support",
      cycle: "yearly", pricing: "custom",
      basePrice: 99999, perEmployeePrice: 0,
      modules: allEnabled(),
      featureFlags: allFlags(true),
      limits: { employees: -1, branches: -1, hrUsers: -1, adminUsers: -1, departments: -1, attendanceDevices: -1, storageMB: -1, documents: -1, pdfDownloads: -1, reports: -1, apiCalls: -1, notifications: -1, aiCredits: -1, smsCredits: -1, emailCredits: -1, whatsappCredits: -1, ocrCredits: -1 },
    }),
  ];
}

export function defaultCoupons(): Coupon[] {
  return [
    { id: "cpn-welcome", code: "WELCOME10", kind: "percent", value: 10, maxUses: -1, used: 0, active: true },
    { id: "cpn-launch", code: "LAUNCH25", kind: "percent", value: 25, maxUses: 100, used: 0, active: true, expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString() },
  ];
}

export function defaultReferralPrograms(): ReferralProgram[] {
  return [
    {
      id: "ref-standard", name: "Standard Referral", active: true,
      tiers: [
        { referrals: 1, rewardKind: "discount_pct", value: 5 },
        { referrals: 5, rewardKind: "discount_pct", value: 10 },
        { referrals: 10, rewardKind: "discount_pct", value: 20 },
        { referrals: 25, rewardKind: "ai_credits", value: 5000 },
      ],
    },
  ];
}

/* --------------------------- engine --------------------------- */

export function cycleDays(cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly": return 30;
    case "quarterly": return 90;
    case "half_yearly": return 180;
    case "yearly": return 365;
    default: return 30;
  }
}

export function calcPlanPrice(plan: Plan, employees: number): number {
  if (plan.pricing === "flat" || plan.pricing === "custom") return plan.basePrice;
  if (plan.pricing === "per_employee") return plan.basePrice + (plan.perEmployeePrice ?? 0) * Math.max(0, employees);
  if (plan.pricing === "tiered") {
    const tier = Math.ceil(employees / 25);
    return plan.basePrice + (plan.perEmployeePrice ?? 0) * tier * 25;
  }
  return plan.basePrice;
}

export function applyCoupon(subtotal: number, coupon?: Coupon): number {
  if (!coupon || !coupon.active) return 0;
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) < Date.now()) return 0;
  if (coupon.maxUses !== -1 && coupon.used >= coupon.maxUses) return 0;
  if (coupon.kind === "percent") return Math.round((subtotal * coupon.value) / 100);
  if (coupon.kind === "flat") return Math.min(subtotal, coupon.value);
  return 0;
}

export function prorateCredit(sub: TenantSubscription, oldPlan: Plan, employees: number): number {
  const now = Date.now();
  const remainingMs = Math.max(0, Date.parse(sub.expiresAt) - now);
  const total = cycleDays(sub.cycle) * 86400_000;
  if (total === 0) return 0;
  const oldCost = calcPlanPrice(oldPlan, employees);
  return Math.round((oldCost * remainingMs) / total);
}

export function buildInvoice(input: {
  tenantId: string; plan: Plan; employees: number;
  coupon?: Coupon; prorationCredit?: number; kind?: Invoice["kind"];
  paymentMethod?: PaymentMethod;
}): Invoice {
  const { tenantId, plan, employees, coupon, prorationCredit = 0, kind = "subscription", paymentMethod } = input;
  const subtotal = calcPlanPrice(plan, employees);
  const couponDiscount = applyCoupon(subtotal, coupon);
  const discount = couponDiscount + prorationCredit;
  const taxable = Math.max(0, subtotal - discount);
  const gst = Math.round((taxable * plan.gstPct) / 100);
  const total = taxable + gst;
  const now = new Date();
  const due = new Date(now.getTime() + 7 * 86400_000);
  const lines: InvoiceLine[] = [
    { label: `${plan.name} — base (${plan.cycle})`, qty: 1, rate: plan.basePrice, amount: plan.basePrice },
  ];
  if (plan.pricing === "per_employee" && plan.perEmployeePrice) {
    lines.push({ label: "Per-employee usage", qty: employees, rate: plan.perEmployeePrice, amount: plan.perEmployeePrice * employees });
  }
  if (couponDiscount > 0 && coupon) lines.push({ label: `Coupon ${coupon.code}`, qty: 1, rate: -couponDiscount, amount: -couponDiscount });
  if (prorationCredit > 0) lines.push({ label: "Prorated credit (previous plan)", qty: 1, rate: -prorationCredit, amount: -prorationCredit });
  return {
    id: crypto.randomUUID(),
    number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`,
    tenantId, planId: plan.id, cycle: plan.cycle,
    issueDate: now.toISOString(), dueDate: due.toISOString(),
    lines, subtotal, discount, gst, total,
    status: paymentMethod ? "paid" : "sent",
    paymentMethod, couponCode: coupon?.code, proration: prorationCredit, kind,
  };
}

export function resolveModuleStatus(plan: Plan, sub: TenantSubscription, module: ModuleKey): ModuleStatus {
  if (sub.moduleOverrides[module]) return sub.moduleOverrides[module]!;
  return plan.modules[module] ?? "locked";
}

export function isFeatureEnabled(plan: Plan, sub: TenantSubscription, key: string): boolean {
  if (key in sub.featureOverrides) return sub.featureOverrides[key];
  if (key in plan.featureFlags) return plan.featureFlags[key];
  return false;
}

export function resolveLimit(plan: Plan, sub: TenantSubscription, key: keyof PlanLimits): number {
  const o = sub.limitOverrides?.[key];
  if (typeof o === "number") return o;
  return plan.limits[key];
}

export function usagePct(used: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used * 100) / limit));
}

export function aiSubscriptionRecommendations(plan: Plan, sub: TenantSubscription): string[] {
  const tips: string[] = [];
  const push = (k: keyof PlanLimits, verb: string) => {
    const p = usagePct(sub.usage[k as keyof UsageCounters] as number, resolveLimit(plan, sub, k));
    if (p >= 90) tips.push(`You are using ${p}% of your ${verb}. Consider upgrading or purchasing an add-on.`);
  };
  push("employees", "employee limit");
  push("aiCredits", "AI credits");
  push("storageMB", "storage");
  push("smsCredits", "SMS credits");
  push("emailCredits", "email credits");
  const days = Math.max(0, Math.round((Date.parse(sub.expiresAt) - Date.now()) / 86400_000));
  if (days <= 7) tips.push(`Your subscription renews in ${days} day${days === 1 ? "" : "s"}. Renew now to avoid a service interruption.`);
  const lockedAI = (["ai_compliance", "ai_payroll", "ai_attendance"] as ModuleKey[]).filter((m) => resolveModuleStatus(plan, sub, m) === "locked");
  if (lockedAI.length > 0) tips.push(`Unlock ${lockedAI.length} AI module${lockedAI.length === 1 ? "" : "s"} to automate statutory filings and payroll audits.`);
  return tips;
}

export function referralCodeFor(tenantId: string): string {
  return "SWIFT-" + tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
}

export function nextReferralReward(program: ReferralProgram, referrals: number): ReferralTier | null {
  return program.tiers.find((t) => referrals < t.referrals) ?? null;
}
