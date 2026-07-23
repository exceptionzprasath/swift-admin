import { r as createServerFn } from "./ssr.mjs";
import { t as createSsrRpc } from "./createSsrRpc-DaycN9GT.mjs";
import { n as computePayroll } from "./store-Dj1aT4sf.mjs";
import { t as auditPayroll } from "./payroll-audit-OuxFUWsb.mjs";
import { a as unknownType, i as stringType, n as enumType, r as objectType, t as arrayType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai.functions-MiXBoOZ2.js
function buildAiSnapshot(opts) {
	const { company, attendance, payrolls, docRequests, role, viewerEmployeeId } = opts;
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	const month = today.slice(0, 7);
	let employees = opts.employees;
	if (role === "employee" && viewerEmployeeId) employees = employees.filter((e) => e.id === viewerEmployeeId);
	else if (role === "manager" && viewerEmployeeId) employees = employees.filter((e) => e.id === viewerEmployeeId || e.managerId === viewerEmployeeId);
	const empIds = new Set(employees.map((e) => e.id));
	const attScoped = attendance.filter((a) => empIds.has(a.employeeId));
	const payScoped = payrolls.filter((p) => empIds.has(p.employeeId));
	const docScoped = docRequests.filter((d) => empIds.has(d.employeeId));
	const todayAtt = attScoped.filter((a) => a.date === today);
	const present = todayAtt.filter((a) => a.status === "present").length;
	const absent = employees.length - todayAtt.length + todayAtt.filter((a) => a.status === "absent").length;
	const leaveCount = todayAtt.filter((a) => a.status === "leave").length;
	const halfDay = todayAtt.filter((a) => a.status === "half-day").length;
	const late = todayAtt.filter((a) => (a.checkIn ?? "") > "09:15").length;
	const last7 = /* @__PURE__ */ new Date();
	last7.setDate(last7.getDate() - 7);
	const last7Iso = last7.toISOString().slice(0, 10);
	const last7Records = attScoped.filter((a) => a.date >= last7Iso);
	const last7Present = last7Records.filter((a) => a.status === "present").length;
	const last7DayPresentPct = last7Records.length ? Math.round(last7Present / last7Records.length * 100) : 0;
	const monthPay = payScoped.filter((p) => p.month === month);
	const totalMonthlyGross = monthPay.reduce((a, b) => a + (b.computed?.gross || 0), 0);
	const missingAadhaar = employees.filter((e) => !e.aadhaar).length;
	const missingPan = employees.filter((e) => !e.pan).length;
	const missingBank = employees.filter((e) => !e.bankAcc || !e.bankIfsc).length;
	const alerts = [];
	let esiBreaches = 0;
	let pfIssues = 0;
	for (const emp of employees) {
		const p = computePayroll({
			company,
			employee: emp,
			daysWorked: company.workingDaysPerMonth,
			otHours: 0,
			incentive: 0,
			shiftDays: 0,
			loan: 0,
			advance: 0,
			bonus: 0
		});
		const issues = auditPayroll({
			company,
			employee: emp,
			daysWorked: company.workingDaysPerMonth,
			otHours: 0,
			p
		});
		for (const i of issues) {
			if (i.level === "info" && i.title === "All checks passed") continue;
			if (/ESI/i.test(i.title)) esiBreaches++;
			if (/PF/i.test(i.title)) pfIssues++;
			if (i.level === "error") alerts.push({
				id: `pay-${emp.id}-${i.title}`,
				level: "critical",
				category: "payroll",
				title: `${emp.name}: ${i.title}`,
				detail: i.detail,
				action: i.suggestion
			});
		}
	}
	if (missingAadhaar) alerts.push({
		id: "aadhaar",
		level: "warn",
		category: "employees",
		title: `${missingAadhaar} employees missing Aadhaar`,
		detail: "Required for PF/ESI compliance.",
		action: "Update in Employees module."
	});
	if (missingPan) alerts.push({
		id: "pan",
		level: "warn",
		category: "employees",
		title: `${missingPan} employees missing PAN`,
		detail: "Required for TDS and Form 16.",
		action: "Capture PAN before next payroll."
	});
	if (missingBank) alerts.push({
		id: "bank",
		level: "critical",
		category: "payroll",
		title: `${missingBank} employees missing bank details`,
		detail: "Payroll payout will fail without bank account & IFSC.",
		action: "Update employee bank details."
	});
	const pendingDocs = docScoped.filter((d) => d.status === "pending");
	if (pendingDocs.length) alerts.push({
		id: "docs-pending",
		level: "info",
		category: "documents",
		title: `${pendingDocs.length} document(s) awaiting approval`,
		detail: pendingDocs.slice(0, 3).map((d) => d.letterTitle).join(", ") + (pendingDocs.length > 3 ? "…" : "")
	});
	const denom = Math.max(1, employees.length);
	const complianceScore = Math.max(0, Math.round(100 - (missingAadhaar + missingPan) / denom * 30 - missingBank / denom * 40 - Math.min(30, esiBreaches * 5 + pfIssues * 5)));
	return {
		tenant: {
			name: company.name,
			legalName: company.legalName,
			gstin: company.gstin
		},
		role,
		viewerEmployeeId,
		today,
		headcount: {
			total: employees.length,
			active: employees.filter((e) => e.status === "active").length,
			inactive: employees.filter((e) => e.status === "inactive").length
		},
		attendance: {
			today: {
				present,
				absent,
				leave: leaveCount,
				halfDay,
				late
			},
			last7DayPresentPct
		},
		payroll: {
			lastRunMonth: payScoped[payScoped.length - 1]?.month,
			processedThisMonth: monthPay.length,
			pending: Math.max(0, employees.length - monthPay.length),
			totalMonthlyGross
		},
		compliance: {
			score: complianceScore,
			missingAadhaar,
			missingPan,
			missingBank,
			esiBreaches,
			pfIssues
		},
		documents: {
			pendingApproval: pendingDocs.length,
			approvedThisMonth: docScoped.filter((d) => d.status === "approved" && d.requestedAt.startsWith(month)).length,
			rejected: docScoped.filter((d) => d.status === "rejected").length
		},
		alerts,
		employees: employees.map((e) => ({
			id: e.id,
			empCode: e.empCode,
			name: e.name,
			department: e.department,
			designation: e.designation,
			doj: e.doj,
			status: e.status,
			shiftId: e.shiftId,
			hasPan: !!e.pan,
			hasAadhaar: !!e.aadhaar,
			hasBank: !!(e.bankAcc && e.bankIfsc)
		}))
	};
}
function healthScores(s) {
	const attn = s.attendance.last7DayPresentPct;
	const payHealth = s.headcount.active === 0 ? 100 : Math.round(s.payroll.processedThisMonth / Math.max(1, s.headcount.active) * 100);
	const hrHealth = Math.round(s.compliance.score * .6 + attn * .4);
	return {
		compliance: s.compliance.score,
		attendance: attn,
		payroll: payHealth,
		hr: hrHealth
	};
}
var InputSchema = objectType({
	messages: arrayType(objectType({
		role: enumType([
			"user",
			"assistant",
			"system"
		]),
		content: stringType().max(2e4)
	})).min(1).max(30),
	snapshot: unknownType()
});
var askSwiftAi = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema.parse(input)).handler(createSsrRpc("af211be017b1f11806ab14644bd9fb219a3adb1d3414d2bf890a471ecad5d6d9"));
//#endregion
export { buildAiSnapshot as n, healthScores as r, askSwiftAi as t };
