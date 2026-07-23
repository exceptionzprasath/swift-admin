import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/super-admin-store-DqYK3rMv.js
var CHECKLIST_ITEMS = [
	{
		key: "company_created",
		label: "Company created",
		group: "Setup"
	},
	{
		key: "branch_added",
		label: "Branch added",
		group: "Setup"
	},
	{
		key: "employees_imported",
		label: "Employees imported",
		group: "Setup"
	},
	{
		key: "attendance_configured",
		label: "Attendance configured",
		group: "Modules"
	},
	{
		key: "payroll_configured",
		label: "Payroll configured",
		group: "Modules"
	},
	{
		key: "pf_configured",
		label: "PF configured",
		group: "Statutory"
	},
	{
		key: "esi_configured",
		label: "ESI configured",
		group: "Statutory"
	},
	{
		key: "leave_configured",
		label: "Leave configured",
		group: "Modules"
	},
	{
		key: "ai_configured",
		label: "AI configured",
		group: "AI"
	},
	{
		key: "compliance_configured",
		label: "Compliance configured",
		group: "Compliance"
	},
	{
		key: "documents_configured",
		label: "Documents configured",
		group: "Documents"
	},
	{
		key: "training_completed",
		label: "Training completed",
		group: "Onboarding"
	}
];
var emptyChecklist = () => Object.fromEntries(CHECKLIST_ITEMS.map((c) => [c.key, false]));
var defaultWhiteLabel = {
	brandName: "SWIFT AI",
	tagline: "Enterprise HR, Payroll & Compliance",
	primaryColor: "#4f46e5",
	secondaryColor: "#0ea5e9",
	pdfHeader: "Powered by SWIFT AI",
	pdfFooter: "Confidential — for internal use only",
	emailFromName: "SWIFT AI",
	emailFromAddress: "no-reply@swift.ai",
	supportEmail: "support@swift.ai",
	supportPhone: "+91 00000 00000",
	smtpHost: "smtp.swift.ai",
	smsGateway: "MSG91",
	whatsappGateway: "Gupshup",
	paymentGateway: "Razorpay",
	storageProvider: "Cloudflare R2",
	aiProvider: "OpenAI ChatGPT"
};
var defaultUpi = {
	payeeName: "SWIFT AI Technologies",
	upiId: "swiftai@icici",
	instructions: "Scan the QR with any UPI app (GPay, PhonePe, Paytm, BHIM). After payment, upload the screenshot for verification.",
	bankName: "ICICI Bank",
	accountNumber: "1234567890",
	ifsc: "ICIC0001234"
};
var initial = () => ({
	tickets: [],
	touchpoints: [],
	checklists: {},
	impersonation: [],
	whiteLabel: defaultWhiteLabel,
	usage: [],
	upi: defaultUpi,
	paymentSubmissions: []
});
var useSuperAdmin = create()(persist((set, get) => ({
	...initial(),
	addTicket: (t) => set((s) => ({ tickets: [{
		...t,
		id: crypto.randomUUID(),
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		notes: []
	}, ...s.tickets] })),
	updateTicket: (id, patch) => set((s) => ({ tickets: s.tickets.map((t) => t.id === id ? {
		...t,
		...patch,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	} : t) })),
	addTicketNote: (id, note) => set((s) => ({ tickets: s.tickets.map((t) => t.id === id ? {
		...t,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		notes: [{
			...note,
			id: crypto.randomUUID(),
			ts: (/* @__PURE__ */ new Date()).toISOString()
		}, ...t.notes]
	} : t) })),
	deleteTicket: (id) => set((s) => ({ tickets: s.tickets.filter((t) => t.id !== id) })),
	addTouchpoint: (t) => set((s) => ({ touchpoints: [{
		...t,
		id: crypto.randomUUID(),
		ts: (/* @__PURE__ */ new Date()).toISOString()
	}, ...s.touchpoints] })),
	deleteTouchpoint: (id) => set((s) => ({ touchpoints: s.touchpoints.filter((t) => t.id !== id) })),
	getChecklist: (tenantId) => get().checklists[tenantId] ?? emptyChecklist(),
	setChecklistItem: (tenantId, key, val) => set((s) => {
		const cur = s.checklists[tenantId] ?? emptyChecklist();
		return { checklists: {
			...s.checklists,
			[tenantId]: {
				...cur,
				[key]: val
			}
		} };
	}),
	recordImpersonation: (tenantId, actor, note) => set((s) => ({ impersonation: [{
		id: crypto.randomUUID(),
		ts: (/* @__PURE__ */ new Date()).toISOString(),
		tenantId,
		actor,
		note
	}, ...s.impersonation].slice(0, 200) })),
	updateWhiteLabel: (patch) => set((s) => ({ whiteLabel: {
		...s.whiteLabel,
		...patch
	} })),
	resetWhiteLabel: () => set({ whiteLabel: defaultWhiteLabel }),
	updateUpi: (patch) => set((s) => ({ upi: {
		...s.upi,
		...patch
	} })),
	resetUpi: () => set({ upi: defaultUpi }),
	submitPayment: (p) => {
		const rec = {
			...p,
			id: crypto.randomUUID(),
			submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
			status: "pending"
		};
		set((s) => ({ paymentSubmissions: [rec, ...s.paymentSubmissions] }));
		return rec;
	},
	verifyPayment: (id, verifiedBy) => {
		const rec = get().paymentSubmissions.find((p) => p.id === id);
		if (!rec) return null;
		const updated = {
			...rec,
			status: "verified",
			verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
			verifiedBy
		};
		set((s) => ({ paymentSubmissions: s.paymentSubmissions.map((x) => x.id === id ? updated : x) }));
		return updated;
	},
	rejectPayment: (id, verifiedBy, reason) => set((s) => ({ paymentSubmissions: s.paymentSubmissions.map((x) => x.id === id ? {
		...x,
		status: "rejected",
		verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
		verifiedBy,
		rejectionReason: reason
	} : x) })),
	deletePayment: (id) => set((s) => ({ paymentSubmissions: s.paymentSubmissions.filter((x) => x.id !== id) })),
	seedDemoOps: () => {
		if (get().tickets.length > 0) return;
		const now = /* @__PURE__ */ new Date();
		set({
			tickets: [{
				id: crypto.randomUUID(),
				tenantId: "demo-tenant",
				subject: "PF challan generation issue",
				body: "PF challan for April 2026 shows wrong wage ceiling.",
				priority: "high",
				status: "in_progress",
				assignedTo: "Aditi (Support L2)",
				channel: "email",
				createdAt: now.toISOString(),
				updatedAt: now.toISOString(),
				notes: [{
					id: crypto.randomUUID(),
					ts: now.toISOString(),
					author: "Aditi",
					text: "Reproduced. Escalating to payroll AI team."
				}]
			}, {
				id: crypto.randomUUID(),
				tenantId: "demo-tenant",
				subject: "Onboarding walk-through",
				body: "HR team wants a live walk-through of registration + attendance profiles.",
				priority: "normal",
				status: "waiting",
				assignedTo: "Priya (CSM)",
				channel: "meeting",
				createdAt: now.toISOString(),
				updatedAt: now.toISOString(),
				notes: []
			}],
			touchpoints: [{
				id: crypto.randomUUID(),
				tenantId: "demo-tenant",
				ts: now.toISOString(),
				kind: "call",
				summary: "Renewal call — plan upgrade discussed",
				by: "Priya (CSM)"
			}, {
				id: crypto.randomUUID(),
				tenantId: "demo-tenant",
				ts: now.toISOString(),
				kind: "whatsapp",
				summary: "Sent implementation checklist",
				by: "Aditi"
			}]
		});
	},
	resetOps: () => set(initial())
}), { name: "swift-super-admin-ops" }));
//#endregion
export { useSuperAdmin as t };
