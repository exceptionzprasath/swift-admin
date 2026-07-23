import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/billing-store-CiCO_-nX.js
var ALL_MODULES = [
	{
		key: "company",
		label: "Company Registration",
		group: "Core"
	},
	{
		key: "employees",
		label: "Employee Management",
		group: "Core"
	},
	{
		key: "recruitment",
		label: "Recruitment",
		group: "HR"
	},
	{
		key: "attendance",
		label: "Attendance",
		group: "Attendance"
	},
	{
		key: "biometric",
		label: "Biometric",
		group: "Attendance"
	},
	{
		key: "geofence",
		label: "Geo Fence",
		group: "Attendance"
	},
	{
		key: "leave",
		label: "Leave",
		group: "HR"
	},
	{
		key: "payroll",
		label: "Payroll",
		group: "Payroll"
	},
	{
		key: "loan",
		label: "Loan",
		group: "Payroll"
	},
	{
		key: "advance",
		label: "Advance",
		group: "Payroll"
	},
	{
		key: "reimbursement",
		label: "Reimbursement",
		group: "Payroll"
	},
	{
		key: "performance",
		label: "Performance",
		group: "HR"
	},
	{
		key: "training",
		label: "Training",
		group: "HR"
	},
	{
		key: "visitor",
		label: "Visitor",
		group: "Ops"
	},
	{
		key: "asset",
		label: "Asset",
		group: "Ops"
	},
	{
		key: "compliance_factory",
		label: "Factory Compliance",
		group: "Compliance"
	},
	{
		key: "compliance_shops",
		label: "Shops & Establishment",
		group: "Compliance"
	},
	{
		key: "pf",
		label: "PF",
		group: "Statutory"
	},
	{
		key: "esi",
		label: "ESI",
		group: "Statutory"
	},
	{
		key: "pt",
		label: "Professional Tax",
		group: "Statutory"
	},
	{
		key: "lwf",
		label: "Labour Welfare Fund",
		group: "Statutory"
	},
	{
		key: "bonus",
		label: "Bonus",
		group: "Statutory"
	},
	{
		key: "gratuity",
		label: "Gratuity",
		group: "Statutory"
	},
	{
		key: "factory_forms",
		label: "Factory Forms",
		group: "Compliance"
	},
	{
		key: "shops_forms",
		label: "Shops Forms",
		group: "Compliance"
	},
	{
		key: "reports",
		label: "Reports",
		group: "Insights"
	},
	{
		key: "analytics",
		label: "Analytics",
		group: "Insights"
	},
	{
		key: "dashboard",
		label: "Dashboard",
		group: "Insights"
	},
	{
		key: "ai_chat",
		label: "AI Chat",
		group: "AI"
	},
	{
		key: "ai_documents",
		label: "AI Documents",
		group: "AI"
	},
	{
		key: "ai_compliance",
		label: "AI Compliance",
		group: "AI"
	},
	{
		key: "ai_payroll",
		label: "AI Payroll",
		group: "AI"
	},
	{
		key: "ai_attendance",
		label: "AI Attendance",
		group: "AI"
	},
	{
		key: "notifications",
		label: "Notifications",
		group: "Platform"
	},
	{
		key: "api",
		label: "API",
		group: "Platform"
	},
	{
		key: "mobile_app",
		label: "Mobile App",
		group: "Platform"
	}
];
var emptyLimits = {
	employees: 0,
	branches: 0,
	hrUsers: 0,
	adminUsers: 0,
	departments: 0,
	attendanceDevices: 0,
	storageMB: 0,
	documents: 0,
	pdfDownloads: 0,
	reports: 0,
	apiCalls: 0,
	notifications: 0,
	aiCredits: 0,
	smsCredits: 0,
	emailCredits: 0,
	whatsappCredits: 0,
	ocrCredits: 0
};
({ ...emptyLimits });
var emptyUsage = () => ({
	employees: 0,
	branches: 0,
	hrUsers: 0,
	adminUsers: 0,
	aiCredits: 0,
	storageMB: 0,
	documents: 0,
	pdfDownloads: 0,
	reports: 0,
	apiCalls: 0,
	smsCredits: 0,
	emailCredits: 0,
	whatsappCredits: 0,
	ocrCredits: 0,
	notifications: 0
});
var FEATURE_KEYS = [
	{
		key: "attendance.face",
		label: "Face Recognition",
		module: "attendance"
	},
	{
		key: "attendance.qr",
		label: "QR Attendance",
		module: "attendance"
	},
	{
		key: "attendance.gps",
		label: "GPS Attendance",
		module: "attendance"
	},
	{
		key: "attendance.offline",
		label: "Offline Attendance",
		module: "attendance"
	},
	{
		key: "attendance.geofence",
		label: "Geo Fence",
		module: "attendance"
	},
	{
		key: "attendance.shifts",
		label: "Shift Management",
		module: "attendance"
	},
	{
		key: "attendance.ot",
		label: "OT Calculation",
		module: "attendance"
	},
	{
		key: "attendance.analytics",
		label: "Attendance Analytics",
		module: "attendance"
	},
	{
		key: "payroll.arrears",
		label: "Arrears",
		module: "payroll"
	},
	{
		key: "payroll.retro",
		label: "Retro Payroll",
		module: "payroll"
	},
	{
		key: "payroll.bulk_revision",
		label: "Bulk Salary Revision",
		module: "payroll"
	},
	{
		key: "documents.bulk_zip",
		label: "Bulk ZIP Downloads",
		module: "ai_documents"
	},
	{
		key: "documents.esign",
		label: "E-Signatures",
		module: "ai_documents"
	},
	{
		key: "ai.copilot",
		label: "AI Copilot",
		module: "ai_chat"
	},
	{
		key: "ai.predictive",
		label: "Predictive AI",
		module: "ai_chat"
	}
];
function makePlan(patch) {
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
		limits: {
			...emptyLimits,
			...patch.limits ?? {}
		},
		active: patch.active ?? true,
		createdAt: patch.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
	};
}
var allEnabled = () => {
	const m = {};
	ALL_MODULES.forEach((x) => {
		m[x.key] = "enabled";
	});
	return m;
};
var allFlags = (v = true) => {
	const f = {};
	FEATURE_KEYS.forEach((x) => {
		f[x.key] = v;
	});
	return f;
};
function defaultPlans() {
	return [
		makePlan({
			id: "plan-starter",
			name: "Starter",
			description: "Small teams getting started",
			cycle: "monthly",
			pricing: "per_employee",
			basePrice: 999,
			perEmployeePrice: 49,
			modules: {
				company: "enabled",
				employees: "enabled",
				attendance: "enabled",
				leave: "enabled",
				dashboard: "enabled",
				notifications: "enabled",
				payroll: "trial",
				ai_chat: "trial",
				ai_documents: "locked",
				ai_compliance: "locked",
				ai_payroll: "locked",
				performance: "locked",
				recruitment: "locked",
				api: "locked"
			},
			featureFlags: {
				...allFlags(false),
				"attendance.gps": true,
				"attendance.shifts": true,
				"attendance.ot": true
			},
			limits: {
				...emptyLimits,
				employees: 25,
				branches: 1,
				hrUsers: 2,
				adminUsers: 1,
				departments: 5,
				storageMB: 500,
				aiCredits: 100,
				pdfDownloads: 50,
				reports: 20,
				apiCalls: 0,
				notifications: 500,
				smsCredits: 100,
				emailCredits: 500,
				whatsappCredits: 50,
				ocrCredits: 20,
				documents: 100,
				attendanceDevices: 1
			}
		}),
		makePlan({
			id: "plan-professional",
			name: "Professional",
			description: "Growing companies with multi-branch teams",
			cycle: "monthly",
			pricing: "per_employee",
			basePrice: 2499,
			perEmployeePrice: 79,
			modules: {
				...allEnabled(),
				ai_compliance: "trial",
				api: "trial"
			},
			featureFlags: {
				...allFlags(true),
				"ai.predictive": false
			},
			limits: {
				...emptyLimits,
				employees: 150,
				branches: 5,
				hrUsers: 5,
				adminUsers: 3,
				departments: 20,
				storageMB: 5e3,
				aiCredits: 1e3,
				pdfDownloads: 500,
				reports: 200,
				apiCalls: 1e4,
				notifications: 5e3,
				smsCredits: 1e3,
				emailCredits: 5e3,
				whatsappCredits: 500,
				ocrCredits: 200,
				documents: 1e3,
				attendanceDevices: 5
			}
		}),
		makePlan({
			id: "plan-business",
			name: "Business",
			description: "Mid-market with advanced compliance and AI",
			cycle: "yearly",
			pricing: "per_employee",
			basePrice: 24999,
			perEmployeePrice: 69,
			modules: allEnabled(),
			featureFlags: allFlags(true),
			limits: {
				...emptyLimits,
				employees: 500,
				branches: 15,
				hrUsers: 15,
				adminUsers: 8,
				departments: 50,
				storageMB: 25e3,
				aiCredits: 5e3,
				pdfDownloads: 2500,
				reports: 1e3,
				apiCalls: 1e5,
				notifications: 25e3,
				smsCredits: 5e3,
				emailCredits: 25e3,
				whatsappCredits: 2500,
				ocrCredits: 1e3,
				documents: 1e4,
				attendanceDevices: 15
			}
		}),
		makePlan({
			id: "plan-enterprise",
			name: "Enterprise",
			description: "Unlimited everything with dedicated support",
			cycle: "yearly",
			pricing: "custom",
			basePrice: 99999,
			perEmployeePrice: 0,
			modules: allEnabled(),
			featureFlags: allFlags(true),
			limits: {
				employees: -1,
				branches: -1,
				hrUsers: -1,
				adminUsers: -1,
				departments: -1,
				attendanceDevices: -1,
				storageMB: -1,
				documents: -1,
				pdfDownloads: -1,
				reports: -1,
				apiCalls: -1,
				notifications: -1,
				aiCredits: -1,
				smsCredits: -1,
				emailCredits: -1,
				whatsappCredits: -1,
				ocrCredits: -1
			}
		})
	];
}
function defaultCoupons() {
	return [{
		id: "cpn-welcome",
		code: "WELCOME10",
		kind: "percent",
		value: 10,
		maxUses: -1,
		used: 0,
		active: true
	}, {
		id: "cpn-launch",
		code: "LAUNCH25",
		kind: "percent",
		value: 25,
		maxUses: 100,
		used: 0,
		active: true,
		expiresAt: new Date(Date.now() + 30 * 864e5).toISOString()
	}];
}
function defaultReferralPrograms() {
	return [{
		id: "ref-standard",
		name: "Standard Referral",
		active: true,
		tiers: [
			{
				referrals: 1,
				rewardKind: "discount_pct",
				value: 5
			},
			{
				referrals: 5,
				rewardKind: "discount_pct",
				value: 10
			},
			{
				referrals: 10,
				rewardKind: "discount_pct",
				value: 20
			},
			{
				referrals: 25,
				rewardKind: "ai_credits",
				value: 5e3
			}
		]
	}];
}
function cycleDays(cycle) {
	switch (cycle) {
		case "monthly": return 30;
		case "quarterly": return 90;
		case "half_yearly": return 180;
		case "yearly": return 365;
		default: return 30;
	}
}
function calcPlanPrice(plan, employees) {
	if (plan.pricing === "flat" || plan.pricing === "custom") return plan.basePrice;
	if (plan.pricing === "per_employee") return plan.basePrice + (plan.perEmployeePrice ?? 0) * Math.max(0, employees);
	if (plan.pricing === "tiered") {
		const tier = Math.ceil(employees / 25);
		return plan.basePrice + (plan.perEmployeePrice ?? 0) * tier * 25;
	}
	return plan.basePrice;
}
function applyCoupon(subtotal, coupon) {
	if (!coupon || !coupon.active) return 0;
	if (coupon.expiresAt && Date.parse(coupon.expiresAt) < Date.now()) return 0;
	if (coupon.maxUses !== -1 && coupon.used >= coupon.maxUses) return 0;
	if (coupon.kind === "percent") return Math.round(subtotal * coupon.value / 100);
	if (coupon.kind === "flat") return Math.min(subtotal, coupon.value);
	return 0;
}
function prorateCredit(sub, oldPlan, employees) {
	const now = Date.now();
	const remainingMs = Math.max(0, Date.parse(sub.expiresAt) - now);
	const total = cycleDays(sub.cycle) * 864e5;
	if (total === 0) return 0;
	const oldCost = calcPlanPrice(oldPlan, employees);
	return Math.round(oldCost * remainingMs / total);
}
function buildInvoice(input) {
	const { tenantId, plan, employees, coupon, prorationCredit = 0, kind = "subscription", paymentMethod } = input;
	const subtotal = calcPlanPrice(plan, employees);
	const couponDiscount = applyCoupon(subtotal, coupon);
	const discount = couponDiscount + prorationCredit;
	const taxable = Math.max(0, subtotal - discount);
	const gst = Math.round(taxable * plan.gstPct / 100);
	const total = taxable + gst;
	const now = /* @__PURE__ */ new Date();
	const due = new Date(now.getTime() + 7 * 864e5);
	const lines = [{
		label: `${plan.name} — base (${plan.cycle})`,
		qty: 1,
		rate: plan.basePrice,
		amount: plan.basePrice
	}];
	if (plan.pricing === "per_employee" && plan.perEmployeePrice) lines.push({
		label: "Per-employee usage",
		qty: employees,
		rate: plan.perEmployeePrice,
		amount: plan.perEmployeePrice * employees
	});
	if (couponDiscount > 0 && coupon) lines.push({
		label: `Coupon ${coupon.code}`,
		qty: 1,
		rate: -couponDiscount,
		amount: -couponDiscount
	});
	if (prorationCredit > 0) lines.push({
		label: "Prorated credit (previous plan)",
		qty: 1,
		rate: -prorationCredit,
		amount: -prorationCredit
	});
	return {
		id: crypto.randomUUID(),
		number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9e3) + 1e3}`,
		tenantId,
		planId: plan.id,
		cycle: plan.cycle,
		issueDate: now.toISOString(),
		dueDate: due.toISOString(),
		lines,
		subtotal,
		discount,
		gst,
		total,
		status: paymentMethod ? "paid" : "sent",
		paymentMethod,
		couponCode: coupon?.code,
		proration: prorationCredit,
		kind
	};
}
function resolveModuleStatus(plan, sub, module) {
	if (sub.moduleOverrides[module]) return sub.moduleOverrides[module];
	return plan.modules[module] ?? "locked";
}
function resolveLimit(plan, sub, key) {
	const o = sub.limitOverrides?.[key];
	if (typeof o === "number") return o;
	return plan.limits[key];
}
function usagePct(used, limit) {
	if (limit === -1) return 0;
	if (limit === 0) return 100;
	return Math.min(100, Math.round(used * 100 / limit));
}
function aiSubscriptionRecommendations(plan, sub) {
	const tips = [];
	const push = (k, verb) => {
		const p = usagePct(sub.usage[k], resolveLimit(plan, sub, k));
		if (p >= 90) tips.push(`You are using ${p}% of your ${verb}. Consider upgrading or purchasing an add-on.`);
	};
	push("employees", "employee limit");
	push("aiCredits", "AI credits");
	push("storageMB", "storage");
	push("smsCredits", "SMS credits");
	push("emailCredits", "email credits");
	const days = Math.max(0, Math.round((Date.parse(sub.expiresAt) - Date.now()) / 864e5));
	if (days <= 7) tips.push(`Your subscription renews in ${days} day${days === 1 ? "" : "s"}. Renew now to avoid a service interruption.`);
	const lockedAI = [
		"ai_compliance",
		"ai_payroll",
		"ai_attendance"
	].filter((m) => resolveModuleStatus(plan, sub, m) === "locked");
	if (lockedAI.length > 0) tips.push(`Unlock ${lockedAI.length} AI module${lockedAI.length === 1 ? "" : "s"} to automate statutory filings and payroll audits.`);
	return tips;
}
function referralCodeFor(tenantId) {
	return "SWIFT-" + tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
}
var defaultReminderConfig = {
	offsets: [
		30,
		15,
		7,
		3,
		1
	],
	gracePeriodDays: 7,
	finalWarningDays: 5,
	channels: {
		email: true,
		sms: true,
		whatsapp: true,
		push: true,
		banner: true
	},
	autoSuspend: true,
	templates: {
		"pre-30": "Your SWIFT subscription renews in 30 days. Review your plan to avoid disruption.",
		"pre-15": "Heads up — 15 days until renewal. Confirm billing details are up to date.",
		"pre-7": "7 days to renewal. Renew now to lock in current pricing.",
		"pre-3": "3 days left. Please complete renewal to keep all modules active.",
		"pre-1": "Final day before renewal. Payment required within 24 hours.",
		"renewal-day": "Today is your renewal day. Complete payment to continue uninterrupted service.",
		"grace": "Your subscription has expired and is now in a {graceDays}-day grace period.",
		"final-warning": "FINAL WARNING — Access will be suspended in {daysLeft} days if not renewed.",
		"expired": "Subscription suspended. Please renew to restore access."
	}
};
var DAY = 864e5;
function fmt(template, vars) {
	return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
function activeChannels(cfg) {
	return Object.keys(cfg.channels).filter((c) => cfg.channels[c]);
}
/** Compute all reminder points for a subscription against config. */
function computeReminderPlan(sub, cfg, now = /* @__PURE__ */ new Date()) {
	const expiry = new Date(sub.expiresAt);
	const channels = activeChannels(cfg);
	const plan = [];
	const push = (stage, due, daysFromExpiry, vars = {}) => {
		const tpl = cfg.templates[stage] ?? "";
		plan.push({
			stage,
			dueAt: due.toISOString(),
			daysFromExpiry,
			channels,
			message: fmt(tpl, vars),
			status: now.getTime() >= due.getTime() ? "due" : "scheduled"
		});
	};
	for (const off of [...cfg.offsets].sort((a, b) => b - a)) {
		const due = /* @__PURE__ */ new Date(expiry.getTime() - off * DAY);
		push(`pre-${off}`, due, -off);
	}
	push("renewal-day", expiry, 0);
	if (cfg.gracePeriodDays > 0) push("grace", new Date(expiry.getTime() + DAY), 1, { graceDays: cfg.gracePeriodDays });
	if (cfg.finalWarningDays > 0 && cfg.gracePeriodDays > cfg.finalWarningDays) push("final-warning", new Date(expiry.getTime() + (cfg.gracePeriodDays - cfg.finalWarningDays) * DAY), cfg.gracePeriodDays - cfg.finalWarningDays, { daysLeft: cfg.finalWarningDays });
	push("expired", new Date(expiry.getTime() + cfg.gracePeriodDays * DAY), cfg.gracePeriodDays);
	return plan.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
/** Resolve the correct subscription status based on now vs expiresAt+grace. */
function resolveScheduledStatus(sub, cfg, now = /* @__PURE__ */ new Date()) {
	if (sub.status === "cancelled" || sub.status === "trial") return sub.status;
	const expiry = new Date(sub.expiresAt).getTime();
	const t = now.getTime();
	if (t < expiry) return "active";
	if (t < expiry + cfg.gracePeriodDays * DAY) return "grace";
	return cfg.autoSuspend ? "suspended" : "past_due";
}
function inQuietHours(cfg, now) {
	const q = cfg.quietHours;
	if (!q) return false;
	const h = now.getHours();
	return q.start <= q.end ? h >= q.start && h < q.end : h >= q.start || h < q.end;
}
/** Determine which reminders should fire now (not previously logged today for that stage). */
function dueReminders(sub, cfg, log, now = /* @__PURE__ */ new Date()) {
	if (inQuietHours(cfg, now)) return [];
	const already = new Set(log.filter((l) => l.subscriptionId === sub.id).map((l) => l.stage));
	return computeReminderPlan(sub, cfg, now).filter((p) => p.status === "due" && !already.has(p.stage));
}
var initial = () => ({
	plans: defaultPlans(),
	coupons: defaultCoupons(),
	referralPrograms: defaultReferralPrograms(),
	subscriptions: [],
	invoices: [],
	referrals: [],
	audit: [],
	reminderConfig: defaultReminderConfig,
	reminderLog: []
});
var useBilling = create()(persist((set, get) => ({
	...initial(),
	addPlan: (p) => set((s) => ({ plans: [...s.plans, p] })),
	updatePlan: (id, patch) => set((s) => ({ plans: s.plans.map((p) => p.id === id ? {
		...p,
		...patch,
		limits: {
			...p.limits,
			...patch.limits ?? {}
		}
	} : p) })),
	deletePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
	ensureSubscription: (tenantId, planId) => {
		const existing = get().subscriptions.find((s) => s.tenantId === tenantId);
		if (existing) return existing;
		const plan = get().plans.find((p) => p.id === (planId ?? get().plans[0]?.id));
		const cycle = plan?.cycle ?? "monthly";
		const now = /* @__PURE__ */ new Date();
		const days = cycleDays(cycle);
		const expires = new Date(now.getTime() + days * 864e5);
		const sub = {
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
			history: [{
				ts: now.toISOString(),
				actor: "system",
				kind: "activation",
				toPlanId: plan?.id,
				note: "Subscription initialised"
			}],
			reminderChannels: {
				email: true,
				sms: false,
				whatsapp: false,
				push: true,
				banner: true
			}
		};
		const ledger = {
			tenantId,
			code: referralCodeFor(tenantId),
			invited: [],
			registered: [],
			activated: [],
			paid: [],
			rewardsEarned: 0
		};
		set((s) => ({
			subscriptions: [...s.subscriptions, sub],
			referrals: s.referrals.find((r) => r.tenantId === tenantId) ? s.referrals : [...s.referrals, ledger]
		}));
		return sub;
	},
	updateSubscription: (id, patch) => set((s) => ({ subscriptions: s.subscriptions.map((x) => x.id === id ? {
		...x,
		...patch
	} : x) })),
	setModuleOverride: (subId, module, status) => set((s) => ({ subscriptions: s.subscriptions.map((x) => {
		if (x.id !== subId) return x;
		const next = { ...x.moduleOverrides };
		if (status === null) delete next[module];
		else next[module] = status;
		return {
			...x,
			moduleOverrides: next,
			history: [{
				ts: (/* @__PURE__ */ new Date()).toISOString(),
				actor: "admin",
				kind: status ? "feature_unlock" : "feature_lock",
				note: `Module ${module} → ${status ?? "reset"}`
			}, ...x.history]
		};
	}) })),
	setFeatureOverride: (subId, key, value) => set((s) => ({ subscriptions: s.subscriptions.map((x) => {
		if (x.id !== subId) return x;
		const next = { ...x.featureOverrides };
		if (value === null) delete next[key];
		else next[key] = value;
		return {
			...x,
			featureOverrides: next
		};
	}) })),
	setLimitOverride: (subId, key, value) => set((s) => ({ subscriptions: s.subscriptions.map((x) => {
		if (x.id !== subId) return x;
		const next = { ...x.limitOverrides };
		if (value === null) delete next[key];
		else next[key] = value;
		return {
			...x,
			limitOverrides: next
		};
	}) })),
	bumpUsage: (tenantId, key, by = 1) => set((s) => ({ subscriptions: s.subscriptions.map((x) => {
		if (x.tenantId !== tenantId) return x;
		const usage = {
			...x.usage,
			[key]: (x.usage[key] ?? 0) + by
		};
		return {
			...x,
			usage
		};
	}) })),
	setUsage: (tenantId, patch) => set((s) => ({ subscriptions: s.subscriptions.map((x) => x.tenantId === tenantId ? {
		...x,
		usage: {
			...x.usage,
			...patch
		}
	} : x) })),
	upgrade: (subId, toPlanId, employees, opts = {}) => {
		const sub = get().subscriptions.find((x) => x.id === subId);
		const toPlan = get().plans.find((p) => p.id === toPlanId);
		const fromPlan = sub && get().plans.find((p) => p.id === sub.planId);
		if (!sub || !toPlan) return null;
		const coupon = opts.couponCode ? get().coupons.find((c) => c.code === opts.couponCode) : void 0;
		const proration = fromPlan ? prorateCredit(sub, fromPlan, employees) : 0;
		const invoice = buildInvoice({
			tenantId: sub.tenantId,
			plan: toPlan,
			employees,
			coupon,
			prorationCredit: proration,
			kind: "upgrade",
			paymentMethod: opts.paymentMethod
		});
		const now = /* @__PURE__ */ new Date();
		const activateAt = opts.immediate === false ? new Date(sub.expiresAt) : now;
		const expires = new Date(activateAt.getTime() + cycleDays(toPlan.cycle) * 864e5);
		set((s) => ({
			invoices: [invoice, ...s.invoices],
			coupons: coupon ? s.coupons.map((c) => c.id === coupon.id ? {
				...c,
				used: c.used + 1
			} : c) : s.coupons,
			subscriptions: s.subscriptions.map((x) => x.id === subId ? {
				...x,
				planId: toPlan.id,
				cycle: toPlan.cycle,
				status: "active",
				paymentStatus: opts.paymentMethod ? "paid" : "pending",
				activatedAt: activateAt.toISOString(),
				renewalAt: expires.toISOString(),
				expiresAt: expires.toISOString(),
				couponCode: coupon?.code ?? x.couponCode,
				history: [{
					ts: now.toISOString(),
					actor: opts.actor ?? "admin",
					kind: "upgrade",
					fromPlanId: sub.planId,
					toPlanId: toPlan.id,
					amount: invoice.total,
					note: `Upgraded to ${toPlan.name}`
				}, ...x.history]
			} : x),
			audit: [{
				ts: now.toISOString(),
				actor: opts.actor ?? "admin",
				kind: "upgrade",
				fromPlanId: sub.planId,
				toPlanId: toPlan.id,
				amount: invoice.total
			}, ...s.audit]
		}));
		return invoice;
	},
	downgrade: (subId, toPlanId, actor = "admin") => {
		const sub = get().subscriptions.find((x) => x.id === subId);
		const toPlan = get().plans.find((p) => p.id === toPlanId);
		if (!sub || !toPlan) return;
		const now = (/* @__PURE__ */ new Date()).toISOString();
		set((s) => ({
			subscriptions: s.subscriptions.map((x) => x.id === subId ? {
				...x,
				planId: toPlan.id,
				history: [{
					ts: now,
					actor,
					kind: "downgrade",
					fromPlanId: sub.planId,
					toPlanId: toPlan.id,
					note: "Premium features locked; data retained."
				}, ...x.history]
			} : x),
			audit: [{
				ts: now,
				actor,
				kind: "downgrade",
				fromPlanId: sub.planId,
				toPlanId: toPlan.id
			}, ...s.audit]
		}));
	},
	renew: (subId, employees, opts = {}) => {
		const sub = get().subscriptions.find((x) => x.id === subId);
		const plan = sub && get().plans.find((p) => p.id === sub.planId);
		if (!sub || !plan) return null;
		const coupon = opts.couponCode ? get().coupons.find((c) => c.code === opts.couponCode) : void 0;
		const invoice = buildInvoice({
			tenantId: sub.tenantId,
			plan,
			employees,
			coupon,
			kind: "renewal",
			paymentMethod: opts.paymentMethod
		});
		const now = /* @__PURE__ */ new Date();
		const expires = new Date(now.getTime() + cycleDays(plan.cycle) * 864e5);
		set((s) => ({
			invoices: [invoice, ...s.invoices],
			coupons: coupon ? s.coupons.map((c) => c.id === coupon.id ? {
				...c,
				used: c.used + 1
			} : c) : s.coupons,
			subscriptions: s.subscriptions.map((x) => x.id === subId ? {
				...x,
				status: "active",
				paymentStatus: opts.paymentMethod ? "paid" : "pending",
				renewalAt: expires.toISOString(),
				expiresAt: expires.toISOString(),
				history: [{
					ts: now.toISOString(),
					actor: opts.actor ?? "admin",
					kind: "renewal",
					amount: invoice.total
				}, ...x.history]
			} : x),
			audit: [{
				ts: now.toISOString(),
				actor: opts.actor ?? "admin",
				kind: "renewal",
				amount: invoice.total
			}, ...s.audit]
		}));
		return invoice;
	},
	markInvoicePaid: (invoiceId, method) => set((s) => {
		const inv = s.invoices.find((i) => i.id === invoiceId);
		if (!inv) return {};
		return {
			invoices: s.invoices.map((i) => i.id === invoiceId ? {
				...i,
				status: "paid",
				paymentMethod: method
			} : i),
			subscriptions: s.subscriptions.map((x) => x.tenantId === inv.tenantId ? {
				...x,
				paymentStatus: "paid"
			} : x),
			audit: [{
				ts: (/* @__PURE__ */ new Date()).toISOString(),
				actor: "admin",
				kind: "payment",
				amount: inv.total,
				note: `Invoice ${inv.number} paid via ${method}`
			}, ...s.audit]
		};
	}),
	addCoupon: (c) => set((s) => ({ coupons: [...s.coupons, c] })),
	updateCoupon: (id, patch) => set((s) => ({ coupons: s.coupons.map((c) => c.id === id ? {
		...c,
		...patch
	} : c) })),
	deleteCoupon: (id) => set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) })),
	addReferralProgram: (p) => set((s) => ({ referralPrograms: [...s.referralPrograms, p] })),
	updateReferralProgram: (id, patch) => set((s) => ({ referralPrograms: s.referralPrograms.map((r) => r.id === id ? {
		...r,
		...patch
	} : r) })),
	deleteReferralProgram: (id) => set((s) => ({ referralPrograms: s.referralPrograms.filter((r) => r.id !== id) })),
	recordReferral: (referrerTenantId, invitedIdentifier, stage) => set((s) => ({ referrals: s.referrals.map((r) => {
		if (r.tenantId !== referrerTenantId) return r;
		return {
			...r,
			[stage]: Array.from(/* @__PURE__ */ new Set([...r[stage], invitedIdentifier]))
		};
	}) })),
	updateReminderConfig: (patch) => set((s) => ({ reminderConfig: {
		...s.reminderConfig,
		...patch,
		channels: {
			...s.reminderConfig.channels,
			...patch.channels ?? {}
		},
		templates: {
			...s.reminderConfig.templates,
			...patch.templates ?? {}
		}
	} })),
	setReminderChannel: (subId, channel, on) => set((s) => ({ subscriptions: s.subscriptions.map((x) => x.id === subId ? {
		...x,
		reminderChannels: {
			...x.reminderChannels,
			[channel]: on
		}
	} : x) })),
	previewReminderPlan: (subId, now) => {
		const sub = get().subscriptions.find((x) => x.id === subId);
		if (!sub) return [];
		return computeReminderPlan(sub, get().reminderConfig, now);
	},
	clearReminderLog: (subId) => set((s) => ({ reminderLog: subId ? s.reminderLog.filter((l) => l.subscriptionId !== subId) : [] })),
	runRenewalScheduler: (now = /* @__PURE__ */ new Date()) => {
		const { subscriptions, reminderConfig, reminderLog } = get();
		const newLog = [];
		const statusPatches = {};
		for (const sub of subscriptions) {
			const nextStatus = resolveScheduledStatus(sub, reminderConfig, now);
			if (nextStatus !== sub.status) statusPatches[sub.id] = nextStatus;
			const subChans = sub.reminderChannels;
			const due = dueReminders(sub, reminderConfig, reminderLog, now).map((r) => ({
				...r,
				channels: r.channels.filter((c) => subChans[c])
			})).filter((r) => r.channels.length > 0);
			for (const r of due) newLog.push({
				id: crypto.randomUUID(),
				subscriptionId: sub.id,
				tenantId: sub.tenantId,
				stage: r.stage,
				channels: r.channels,
				sentAt: now.toISOString(),
				message: r.message
			});
		}
		if (newLog.length === 0 && Object.keys(statusPatches).length === 0) return [];
		set((s) => ({
			reminderLog: [...newLog, ...s.reminderLog].slice(0, 500),
			subscriptions: s.subscriptions.map((x) => {
				const newStatus = statusPatches[x.id];
				if (!newStatus) return x;
				return {
					...x,
					status: newStatus,
					history: [{
						ts: now.toISOString(),
						actor: "scheduler",
						kind: newStatus === "grace" ? "grace_start" : newStatus === "suspended" ? "suspension" : "status_change",
						note: `Auto status → ${newStatus}`
					}, ...x.history]
				};
			}),
			audit: [...newLog.map((l) => ({
				ts: l.sentAt,
				actor: "scheduler",
				kind: "reminder",
				note: `${l.stage} via ${l.channels.join(",")}`
			})), ...s.audit].slice(0, 500)
		}));
		return newLog;
	},
	resetBilling: () => set(initial())
}), { name: "swift-billing" }));
//#endregion
export { resolveLimit as a, useBilling as c, calcPlanPrice as i, FEATURE_KEYS as n, resolveModuleStatus as o, aiSubscriptionRecommendations as r, usagePct as s, ALL_MODULES as t };
