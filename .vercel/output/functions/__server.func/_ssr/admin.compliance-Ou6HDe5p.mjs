import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { A as Save, D as Search, Dt as Download, Ft as CircleCheck, L as Plus, M as Rocket, Mt as ClipboardList, Qt as Bell, S as ShieldCheck, St as FileSpreadsheet, T as Settings2, Wt as CalendarClock, Zt as BookOpen, ct as Library, f as TriangleAlert, h as Trash2, it as LockOpen, j as RotateCcw, jt as Clock, rt as Lock, sn as Archive, t as Zap, wt as FileExclamationPoint, y as Sparkles, yt as Funnel } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { t as require_jspdf_node_min } from "../_libs/jspdf.mjs";
import { t as autoTable } from "../_libs/jspdf-autotable.mjs";
import { a as evaluateApplicability, i as complianceScore, n as analyzeRisks, o as useCompliance, r as buildCalendar, t as DEFAULT_TRIGGERS } from "./compliance-store-DybZ7xWR.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-CiapfthD.mjs";
import { t as Switch } from "./switch-CCza_WcE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.compliance-Ou6HDe5p.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_jspdf_node_min = /* @__PURE__ */ __toESM(require_jspdf_node_min());
var PW = 210, ML = 14, MR = 14, RIGHT = PW - MR, CONTENT_W = PW - ML - MR;
function drawHeader(doc, title, subtitle, company) {
	doc.setFillColor(20, 160, 170);
	doc.rect(0, 0, PW, 22, "F");
	doc.setTextColor(255, 255, 255);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.text("GOVERNMENT OF INDIA · STATUTORY FORM", ML, 9);
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.text("Auto-filled by SWIFT AI Compliance Engine", ML, 15);
	doc.setTextColor(0, 0, 0);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(14);
	doc.text(doc.splitTextToSize(title, CONTENT_W)[0] ?? title, PW / 2, 30, { align: "center" });
	doc.setFontSize(9);
	doc.setFont("helvetica", "italic");
	doc.text(doc.splitTextToSize(subtitle, CONTENT_W)[0] ?? subtitle, PW / 2, 35, { align: "center" });
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	const addr = doc.splitTextToSize(`Address: ${company.address ?? "-"}`, CONTENT_W - 60);
	doc.text(`Establishment: ${(company.legalName ?? "").slice(0, 70)}`, ML, 44);
	doc.text(`GSTIN: ${company.gstin || "—"}`, ML, 49);
	doc.text(addr, ML, 54);
	doc.text(`Date: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")}`, RIGHT, 44, { align: "right" });
}
function footer(doc, form, company) {
	const page = doc.getNumberOfPages();
	for (let i = 1; i <= page; i++) {
		doc.setPage(i);
		const y = 285;
		doc.setDrawColor(200);
		doc.line(ML, y, RIGHT, y);
		doc.setFontSize(8);
		doc.setTextColor(100);
		doc.text(`${form.formName} · v${form.version} · Generated ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN")}`, ML, 290);
		doc.text(`Page ${i} of ${page}`, RIGHT, 290, { align: "right" });
		if (form.requiresSignature) {
			doc.setTextColor(0);
			doc.setFontSize(9);
			doc.text("_____________________________", RIGHT - 46, y - 18, { align: "left" });
			doc.text("Authorised Signatory", RIGHT - 46, y - 13);
			doc.text(`For ${company.legalName}`, RIGHT - 46, y - 8);
		}
	}
}
function keyValueTable(doc, startY, rows) {
	autoTable(doc, {
		startY,
		margin: {
			left: ML,
			right: MR
		},
		theme: "grid",
		styles: {
			fontSize: 9,
			cellPadding: 2,
			overflow: "linebreak"
		},
		columnStyles: {
			0: {
				fontStyle: "bold",
				cellWidth: 60,
				fillColor: [
					240,
					246,
					247
				]
			},
			1: { cellWidth: CONTENT_W - 60 }
		},
		body: rows
	});
	return doc.lastAutoTable.finalY;
}
function last(doc) {
	return doc.lastAutoTable?.finalY ?? 60;
}
function fillGeneric(doc, ctx) {
	const { form, company, profile, employees } = ctx;
	drawHeader(doc, form.formName, form.purpose, company);
	let y = keyValueTable(doc, 60, [
		["Module", form.moduleKey.toUpperCase()],
		["Frequency", form.frequency.replace("_", " ")],
		["Version", form.version],
		["Mandatory", form.mandatory ? "Yes" : "No"]
	]);
	y += 4;
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text("Auto-filled particulars", 14, y + 4);
	const values = autoFillMap(ctx);
	const rows = form.autoFillFields.length ? form.autoFillFields.map((f) => [labelFor(f), values[f] ?? "—"]) : Object.entries(values).slice(0, 12).map(([k, v]) => [labelFor(k), v]);
	y = keyValueTable(doc, y + 6, rows);
	if (form.instructions) {
		y += 6;
		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.text("Instructions", 14, y);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.text(doc.splitTextToSize(form.instructions, 180), 14, y + 5);
	}
	if (form.attachments.length) {
		const yy = last(doc) + 12;
		doc.setFont("helvetica", "bold");
		doc.text("Required attachments", 14, yy);
		doc.setFont("helvetica", "normal");
		form.attachments.forEach((a, i) => doc.text(`• ${a}`, 18, yy + 5 + i * 5));
	}
	if (employees.length) {
		doc.addPage();
		drawHeader(doc, form.formName + " — Annexure A", "Employees on rolls", company);
		autoTable(doc, {
			startY: 60,
			margin: {
				left: ML,
				right: MR
			},
			theme: "grid",
			styles: { fontSize: 8 },
			head: [[
				"#",
				"Emp Code",
				"Name",
				"Designation",
				"Department",
				"UAN",
				"ESIC",
				"Aadhaar",
				"DOJ"
			]],
			body: employees.map((e, i) => [
				i + 1,
				e.empCode,
				e.name,
				e.designation,
				e.department,
				e.uan || "—",
				e.esic || "—",
				e.aadhaar ? "****" + String(e.aadhaar).slice(-4) : "—",
				e.doj
			]),
			headStyles: {
				fillColor: [
					20,
					160,
					170
				],
				textColor: 255
			}
		});
		doc.setFontSize(8);
		doc.text(`Total employees: ${employees.length}  ·  Women: ${profile.womenEmployees}`, 14, last(doc) + 6);
	}
}
function labelFor(k) {
	return k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/_/g, " ");
}
function autoFillMap(ctx) {
	const { company, profile, employees, period } = ctx;
	const totalGross = employees.reduce((s, e) => s + (e.basic || 0) * 2, 0);
	const totalPfBase = employees.reduce((s, e) => s + Math.min(e.basic || 0, 15e3), 0);
	return {
		companyName: company.legalName,
		name: company.legalName,
		address: company.address,
		gstin: company.gstin,
		state: profile.state,
		occupier: employees.find((e) => /director|owner|proprietor/i.test(e.designation))?.name ?? employees[0]?.name ?? "—",
		manager: employees.find((e) => /manager|head/i.test(e.designation))?.name ?? "—",
		employees: String(profile.employeeCount || employees.length),
		workersMale: String(employees.length - profile.womenEmployees),
		workersFemale: String(profile.womenEmployees),
		shifts: profile.shiftOperations ? "Multiple" : "General shift",
		workers: String(employees.length),
		manDays: String(employees.length * 22),
		period: period ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 7),
		gross: inrRaw(totalGross),
		net: inrRaw(totalGross * .85),
		pfWages: inrRaw(totalPfBase),
		employerShare: inrRaw(Math.round(totalPfBase * .12)),
		employeeShare: inrRaw(Math.round(totalPfBase * .12)),
		ptDeducted: inrRaw(employees.length * (company.ptAmount || 200)),
		ip: String(employees.filter((e) => e.esic).length),
		uan: String(employees.filter((e) => e.uan).length),
		grossWages: inrRaw(totalGross),
		year: String((/* @__PURE__ */ new Date()).getFullYear()),
		date: (/* @__PURE__ */ new Date()).toLocaleDateString("en-IN"),
		expiryDate: new Date((/* @__PURE__ */ new Date()).getFullYear(), 11, 31).toLocaleDateString("en-IN"),
		licenceNo: `KA/${profile.state.slice(0, 2).toUpperCase()}/${(/* @__PURE__ */ new Date()).getFullYear()}/00${company.legalName.length % 90 + 10}`,
		regNo: `SE/${profile.state.slice(0, 2).toUpperCase()}/${(/* @__PURE__ */ new Date()).getFullYear()}/${company.legalName.length * 7 % 9999}`
	};
}
function inrRaw(n) {
	return "₹ " + n.toLocaleString("en-IN");
}
function factoryForm21(doc, ctx) {
	const { company, profile, employees } = ctx;
	drawHeader(doc, "FORM 21 · ANNUAL RETURN", "The Factories Act, 1948 · Rule 119", company);
	let y = keyValueTable(doc, 60, [
		["1. Name of Factory", company.legalName],
		["2. Address & District", company.address],
		["3. State", profile.state],
		["4. Nature of industry", profile.natureOfBusiness],
		["5. Manufacturing process", profile.manufacturing ? "Yes" : "No"],
		["6. Power used", profile.powerUsed ? "Yes" : "No"],
		["7. Hazardous process", profile.hazardous ? "Yes" : "No"],
		["8. Occupier", autoFillMap(ctx).occupier],
		["9. Manager", autoFillMap(ctx).manager],
		["10. Weekly working hours", String(profile.weeklyHours)],
		["11. Total workers on rolls", String(employees.length)],
		["12. Men", String(employees.length - profile.womenEmployees)],
		["13. Women", String(profile.womenEmployees)],
		["14. Contract workers", String(profile.contractorCount ?? 0)],
		["15. Apprentices", String(profile.apprentices)],
		["16. Days factory worked", "300"],
		["17. Man-days worked", String(employees.length * 300)]
	]);
	y += 8;
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text("Declaration", 14, y);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);
	doc.text(doc.splitTextToSize("I hereby certify that the particulars furnished above are true to the best of my knowledge and belief. Books, registers and records required under the Factories Act, 1948 and the rules made thereunder are being maintained at the premises.", 180), 14, y + 5);
}
function factoryForm12(doc, ctx) {
	const { company, employees } = ctx;
	drawHeader(doc, "FORM 12 · REGISTER OF ADULT WORKERS", "The Factories Act, 1948 · Rule 78", company);
	autoTable(doc, {
		startY: 60,
		margin: {
			left: ML,
			right: MR
		},
		theme: "grid",
		styles: { fontSize: 8 },
		head: [[
			"Sl.",
			"Name of worker",
			"Emp Code",
			"Sex",
			"Date of birth",
			"Nature of work",
			"Group",
			"Shift",
			"Relay",
			"Date of joining"
		]],
		body: employees.map((e, i) => [
			i + 1,
			e.name,
			e.empCode,
			(e.gender ?? "—").slice(0, 1).toUpperCase(),
			e.dob ?? "—",
			e.designation,
			e.department,
			"A",
			"1",
			e.doj
		]),
		headStyles: {
			fillColor: [
				20,
				160,
				170
			],
			textColor: 255
		}
	});
}
function factoryReg1A(doc, ctx) {
	const { company, profile } = ctx;
	drawHeader(doc, "FORM 1-A · APPLICATION FOR REGISTRATION", "The Factories Act, 1948 · Rule 4", company);
	keyValueTable(doc, 60, [
		["Name of applicant", autoFillMap(ctx).occupier],
		["Name of factory", company.legalName],
		["Full postal address", company.address],
		["State / District", profile.state],
		["Nature of manufacturing process", profile.natureOfBusiness],
		["Maximum workers proposed", String(profile.employeeCount)],
		["Whether power is to be used", profile.powerUsed ? "Yes" : "No"],
		["Total HP installed / proposed", "—"],
		["Whether hazardous process", profile.hazardous ? "Yes" : "No"],
		["Site plan enclosed", "Yes"],
		["Occupier declaration enclosed", "Yes"]
	]);
}
function shopsReg(doc, ctx) {
	const { company, profile, employees } = ctx;
	drawHeader(doc, "S&E REGISTRATION CERTIFICATE (APPLICATION)", `${profile.state} Shops & Establishments Act`, company);
	keyValueTable(doc, 60, [
		["1. Name of establishment", company.legalName],
		["2. Postal address", company.address],
		["3. Category", profile.establishmentType],
		["4. Nature of business", profile.natureOfBusiness],
		["5. Name of employer", autoFillMap(ctx).occupier],
		["6. Date of commencement", (/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")],
		["7. Number of employees", String(employees.length)],
		["8. Weekly holiday", "Sunday"],
		["9. Working hours per day", String(Math.round(profile.weeklyHours / 6))],
		["10. GSTIN / PAN", company.gstin]
	]);
}
function shopsAnnual(doc, ctx) {
	const { company, profile, employees } = ctx;
	drawHeader(doc, "S&E ANNUAL RETURN", `${profile.state} Shops & Establishments Act`, company);
	const wages = employees.reduce((s, e) => s + (e.basic || 0) * 2, 0) * 12;
	keyValueTable(doc, 60, [
		["Registration number", autoFillMap(ctx).regNo],
		["Return period", `${(/* @__PURE__ */ new Date()).getFullYear() - 1}-04-01 to ${(/* @__PURE__ */ new Date()).getFullYear()}-03-31`],
		["Total employees", String(employees.length)],
		["Male employees", String(employees.length - profile.womenEmployees)],
		["Female employees", String(profile.womenEmployees)],
		["Total wages paid", inrRaw(wages)],
		["Weekly holidays observed", "52"],
		["Public holidays observed", "10"],
		["Number of prosecutions / notices", "0"]
	]);
}
function epfEcr(doc, ctx) {
	const { company, employees, period } = ctx;
	drawHeader(doc, "EPF ECR · ELECTRONIC CHALLAN CUM RETURN", `Wage month ${period ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 7)}`, company);
	const rows = employees.map((e, i) => {
		const pfBase = Math.min(e.basic || 0, 15e3);
		const ee = Math.round(pfBase * .12);
		const er = Math.round(pfBase * .12);
		const eps = Math.round(pfBase * .0833);
		return [
			i + 1,
			e.uan || `UAN-PENDING-${i + 1}`,
			e.name,
			inrRaw(e.basic || 0),
			inrRaw(pfBase),
			inrRaw(ee),
			inrRaw(er - eps),
			inrRaw(eps)
		];
	});
	const totBase = employees.reduce((s, e) => s + Math.min(e.basic || 0, 15e3), 0);
	autoTable(doc, {
		startY: 60,
		margin: {
			left: ML,
			right: MR
		},
		theme: "grid",
		styles: { fontSize: 8 },
		head: [[
			"Sl.",
			"UAN",
			"Name",
			"Gross wages",
			"PF wages",
			"EE 12%",
			"ER EPF",
			"ER EPS 8.33%"
		]],
		body: rows,
		foot: [[
			{
				content: "TOTAL",
				colSpan: 4,
				styles: {
					halign: "right",
					fontStyle: "bold"
				}
			},
			inrRaw(totBase),
			inrRaw(Math.round(totBase * .12)),
			inrRaw(Math.round(totBase * .036699999999999997)),
			inrRaw(Math.round(totBase * .0833))
		]],
		headStyles: {
			fillColor: [
				20,
				160,
				170
			],
			textColor: 255
		},
		footStyles: {
			fillColor: [
				240,
				246,
				247
			],
			textColor: 0
		}
	});
}
function esiMonthly(doc, ctx) {
	const { company, employees, period } = ctx;
	drawHeader(doc, "ESI · MONTHLY CONTRIBUTION STATEMENT", `Contribution period ${period ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 7)}`, company);
	const rows = employees.filter((e) => (e.basic || 0) * 2 <= 21e3).map((e, i) => {
		const gross = (e.basic || 0) * 2;
		const ee = Math.round(gross * .0075);
		const er = Math.round(gross * .0325);
		return [
			i + 1,
			e.esic || "PENDING",
			e.name,
			inrRaw(gross),
			inrRaw(ee),
			inrRaw(er),
			inrRaw(ee + er)
		];
	});
	autoTable(doc, {
		startY: 60,
		margin: {
			left: ML,
			right: MR
		},
		theme: "grid",
		styles: { fontSize: 8 },
		head: [[
			"Sl.",
			"IP number",
			"Name",
			"Gross wages",
			"EE 0.75%",
			"ER 3.25%",
			"Total"
		]],
		body: rows,
		headStyles: {
			fillColor: [
				20,
				160,
				170
			],
			textColor: 255
		}
	});
}
function ptReturn(doc, ctx) {
	const { company, profile, employees } = ctx;
	drawHeader(doc, "PROFESSIONAL TAX MONTHLY RETURN", `${profile.state} Professional Tax`, company);
	const rows = employees.map((e, i) => [
		i + 1,
		e.empCode,
		e.name,
		inrRaw((e.basic || 0) * 2),
		inrRaw(company.ptAmount || 200)
	]);
	autoTable(doc, {
		startY: 60,
		margin: {
			left: ML,
			right: MR
		},
		theme: "grid",
		styles: { fontSize: 9 },
		head: [[
			"Sl.",
			"Emp Code",
			"Name",
			"Monthly wages",
			"PT deducted"
		]],
		body: rows,
		foot: [[
			{
				content: "TOTAL",
				colSpan: 3,
				styles: {
					halign: "right",
					fontStyle: "bold"
				}
			},
			"—",
			inrRaw(employees.length * (company.ptAmount || 200))
		]],
		headStyles: {
			fillColor: [
				20,
				160,
				170
			],
			textColor: 255
		},
		footStyles: {
			fillColor: [
				240,
				246,
				247
			],
			textColor: 0
		}
	});
}
function poshAnnual(doc, ctx) {
	const { company, profile } = ctx;
	drawHeader(doc, "POSH · ANNUAL REPORT OF THE INTERNAL COMMITTEE", "Sexual Harassment of Women at Workplace Act, 2013 · Section 21", company);
	keyValueTable(doc, 60, [
		["1. Number of complaints received", "0"],
		["2. Number of complaints disposed off", "0"],
		["3. Number of cases pending > 90 days", "0"],
		["4. Number of workshops conducted", "4"],
		["5. Nature of action taken by employer", "Policy displayed, IC constituted, awareness sessions held"],
		["6. Total women employees", String(profile.womenEmployees)],
		["7. IC constituted?", "Yes"],
		["8. External member present?", "Yes"],
		["9. Filed with", `District Officer, ${profile.state}`],
		["Employer", company.legalName]
	]);
}
function bonusFormD(doc, ctx) {
	const { company, employees } = ctx;
	drawHeader(doc, "FORM D · ANNUAL BONUS RETURN", "Payment of Bonus Act, 1965 · Rule 5", company);
	const rows = employees.filter((e) => (e.basic || 0) <= 21e3).map((e, i) => {
		const salary = (e.basic || 0) * 12;
		const bonus = Math.round(salary * .0833);
		return [
			i + 1,
			e.empCode,
			e.name,
			e.doj,
			inrRaw(e.basic || 0),
			inrRaw(salary),
			inrRaw(bonus)
		];
	});
	autoTable(doc, {
		startY: 60,
		margin: {
			left: ML,
			right: MR
		},
		theme: "grid",
		styles: { fontSize: 8 },
		head: [[
			"Sl.",
			"Emp Code",
			"Name",
			"DOJ",
			"Basic (m)",
			"Annual salary",
			"Bonus paid"
		]],
		body: rows,
		headStyles: {
			fillColor: [
				20,
				160,
				170
			],
			textColor: 255
		}
	});
}
function wageRegister(doc, ctx) {
	const { company, employees, period } = ctx;
	drawHeader(doc, "FORM X · WAGE REGISTER", `Wage period ${period ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 7)}`, company);
	const rows = employees.map((e, i) => {
		const gross = (e.basic || 0) * 2;
		const pf = Math.round(Math.min(e.basic || 0, 15e3) * .12);
		const pt = company.ptAmount || 200;
		const esi = gross <= 21e3 ? Math.round(gross * .0075) : 0;
		return [
			i + 1,
			e.empCode,
			e.name,
			inrRaw(e.basic || 0),
			inrRaw(gross),
			inrRaw(pf),
			inrRaw(esi),
			inrRaw(pt),
			inrRaw(gross - pf - esi - pt)
		];
	});
	autoTable(doc, {
		startY: 60,
		margin: {
			left: ML,
			right: MR
		},
		theme: "grid",
		styles: { fontSize: 8 },
		head: [[
			"Sl.",
			"Code",
			"Name",
			"Basic",
			"Gross",
			"PF",
			"ESI",
			"PT",
			"Net"
		]],
		body: rows,
		headStyles: {
			fillColor: [
				20,
				160,
				170
			],
			textColor: 255
		}
	});
}
var TEMPLATES = {
	"factory-form21": factoryForm21,
	"factory-form22": factoryForm21,
	"factory-form12": factoryForm12,
	"factory-form14": factoryForm12,
	"factory-form1a": factoryReg1A,
	"factory-licence-renew": factoryReg1A,
	"shops-registration": shopsReg,
	"shops-renewal": shopsReg,
	"shops-annual": shopsAnnual,
	"epf-ecr": epfEcr,
	"esi-mc": esiMonthly,
	"pt-return": ptReturn,
	"posh-annual": poshAnnual,
	"bonus-formD": bonusFormD,
	"bonus-formC": bonusFormD,
	"wages-registerA": wageRegister
};
function generateComplianceFormPDF(ctx) {
	const doc = new import_jspdf_node_min.default({
		unit: "mm",
		format: "a4"
	});
	(TEMPLATES[ctx.form.id] ?? fillGeneric)(doc, ctx);
	footer(doc, ctx.form, ctx.company);
	const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	const filename = `${ctx.form.formName.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}_${stamp}.pdf`;
	doc.save(filename);
	return filename;
}
var rid = () => globalThis.crypto?.randomUUID?.() ?? `mi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function materialize(ci) {
	const expr = ci.appliesExpr ?? "always";
	const applies = expr === "always" ? () => true : expr === "factory" ? (p) => p.establishmentType === "factory" : expr === "shop" ? (p) => p.establishmentType !== "factory" : expr === "women" ? (p) => p.womenEmployees > 0 : expr === "contract" ? (p) => p.contractLabour : (p) => p.hazardous;
	return {
		...ci,
		applies
	};
}
var useComplianceMaster = create()(persist((set, get) => ({
	customItems: [],
	statuses: {},
	addItem: (i) => {
		const id = rid();
		set((s) => ({ customItems: [{
			...i,
			id
		}, ...s.customItems] }));
		return id;
	},
	updateItem: (id, patch) => set((s) => ({ customItems: s.customItems.map((c) => c.id === id ? {
		...c,
		...patch
	} : c) })),
	deleteItem: (id) => set((s) => ({ customItems: s.customItems.filter((c) => c.id !== id) })),
	setStatus: (itemId, patch) => set((s) => ({ statuses: {
		...s.statuses,
		[itemId]: {
			itemId,
			status: patch.status ?? s.statuses[itemId]?.status ?? "pending",
			remarks: patch.remarks ?? s.statuses[itemId]?.remarks,
			reference: patch.reference ?? s.statuses[itemId]?.reference,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			updatedBy: patch.updatedBy ?? s.statuses[itemId]?.updatedBy ?? "admin"
		}
	} })),
	bulkSet: (ids, status, by) => set((s) => {
		const next = { ...s.statuses };
		const now = (/* @__PURE__ */ new Date()).toISOString();
		for (const id of ids) next[id] = {
			itemId: id,
			status,
			remarks: next[id]?.remarks,
			reference: next[id]?.reference,
			updatedAt: now,
			updatedBy: by
		};
		return { statuses: next };
	}),
	reset: () => set({ statuses: {} }),
	materializedCustom: () => get().customItems.map(materialize)
}), {
	name: "swift-compliance-master",
	version: 1
}));
var all = () => true;
var MASTER_ACTS = [
	{
		id: "act-factories",
		title: "Factories Act 1948 & State Factories Rules",
		act: "Factories Act",
		category: "general",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "act-clra",
		title: "Contract Labour (Regulation & Abolition) Act 1970",
		act: "CLRA",
		category: "general",
		frequency: "ongoing",
		applies: (p) => p.contractLabour || (p.contractorCount ?? 0) >= 20
	},
	{
		id: "act-eecn",
		title: "Employment Exchanges (Compulsory Notification of Vacancies) Act 1959",
		act: "EECN",
		category: "return",
		frequency: "quarterly",
		dueDay: 30,
		applies: (p) => p.employeeCount >= 25
	},
	{
		id: "act-child",
		title: "Child Labour (Prohibition & Regulation) Act 1986",
		act: "Child Labour",
		category: "notice",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "act-equal",
		title: "Equal Remuneration Act 1976",
		act: "Equal Remuneration",
		category: "register",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "act-standing",
		title: "Industrial Employment (Standing Orders) Act 1946",
		act: "Standing Orders",
		category: "general",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 100
	},
	{
		id: "act-minwages",
		title: "Minimum Wages Act 1948",
		act: "Minimum Wages",
		category: "general",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "act-paywages",
		title: "Payment of Wages Act 1936",
		act: "Payment of Wages",
		category: "general",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "act-esi",
		title: "Employees' State Insurance Act 1948",
		act: "ESI",
		category: "general",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "act-epf",
		title: "EPF & Miscellaneous Provisions Act 1952",
		act: "EPF",
		category: "general",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 20
	},
	{
		id: "act-ec",
		title: "Employee's Compensation Act 1923",
		act: "EC",
		category: "return",
		frequency: "annual",
		dueMonth: 1,
		dueDay: 31,
		applies: all
	},
	{
		id: "act-mb",
		title: "Maternity Benefit Act 1961",
		act: "Maternity Benefit",
		category: "general",
		frequency: "ongoing",
		applies: (p) => p.womenEmployees > 0
	},
	{
		id: "act-bonus",
		title: "Payment of Bonus Act 1965",
		act: "Bonus",
		category: "general",
		frequency: "annual",
		dueMonth: 12,
		dueDay: 30,
		applies: (p) => p.employeeCount >= 20
	},
	{
		id: "act-gratuity",
		title: "Payment of Gratuity Act 1972",
		act: "Gratuity",
		category: "general",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "act-lwf",
		title: "State Labour Welfare Fund Act",
		act: "LWF",
		category: "remittance",
		frequency: "half_yearly",
		applies: (p) => p.employeeCount >= 5
	},
	{
		id: "act-apprentice",
		title: "Apprentices Act 1961",
		act: "Apprentices",
		category: "general",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 30 || p.apprentices > 0
	},
	{
		id: "act-posh",
		title: "Sexual Harassment of Women at Workplace Act 2013",
		act: "POSH",
		category: "notice",
		frequency: "annual",
		dueMonth: 1,
		dueDay: 31,
		applies: (p) => p.womenEmployees >= 1
	},
	{
		id: "act-permstatus",
		title: "State Conferment of Permanent Status to Workmen Act",
		act: "Permanent Status",
		category: "return",
		frequency: "half_yearly",
		applies: all
	},
	{
		id: "act-subsist",
		title: "State Payment of Subsistence Allowance Act",
		act: "Subsistence",
		category: "return",
		frequency: "half_yearly",
		applies: all
	},
	{
		id: "act-nfh",
		title: "State Industrial Establishments (National & Festival Holidays) Act",
		act: "NFH",
		category: "general",
		frequency: "annual",
		dueMonth: 12,
		dueDay: 31,
		applies: all
	}
];
var MASTER_REGISTERS = [
	{
		id: "reg-fa-07",
		code: "Form 7",
		title: "Record of Lime Washing, Painting etc.",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-11",
		code: "Form 11",
		title: "Notice of work for Adult workers and children",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-10",
		code: "Form 10",
		title: "Overtime Register",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-12",
		code: "Form 12",
		title: "Register of Adult Workers and Young Persons",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-29",
		code: "Form 29",
		title: "Particulars of Rooms in the Factory",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-15",
		code: "Form 15",
		title: "Register of Leave with Wages",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-25",
		code: "Form 25",
		title: "Muster Roll & Compensatory Holiday",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-36",
		code: "Form 36",
		title: "Report of Examination of Hoist and Lifts",
		act: "Factories Act",
		category: "testing",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-08",
		code: "Form 8",
		title: "Report of Examination of Pressure Vessel/Plant",
		act: "Factories Act",
		category: "testing",
		frequency: "half_yearly",
		applies: (p) => p.establishmentType === "factory" && p.manufacturing
	},
	{
		id: "reg-fa-27",
		code: "Form 27",
		title: "Inspection Visit Book",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-fa-supv",
		title: "Register of Persons Holding Supervision/Management Position",
		act: "Factories Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "reg-pw-3",
		code: "Form III",
		title: "Register of Advances",
		act: "Payment of Wages Act",
		category: "register",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "reg-pw-1",
		code: "Form I",
		title: "Register of Fines",
		act: "Payment of Wages Act",
		category: "register",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "reg-pw-2",
		code: "Form II",
		title: "Register of Deductions for Damages/Loss",
		act: "Payment of Wages Act",
		category: "register",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "reg-mw-wages",
		title: "Register of Wages",
		act: "Minimum Wages Act",
		category: "register",
		frequency: "monthly",
		dueDay: 7,
		applies: all
	},
	{
		id: "reg-mb-a",
		code: "Form A",
		title: "Muster Roll of Women Employees (Maternity)",
		act: "Maternity Benefit Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.womenEmployees > 0
	},
	{
		id: "reg-esi-15",
		code: "Form 15",
		title: "Accident Book",
		act: "ESI Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "reg-esi-6",
		code: "Form 6",
		title: "Register of Employees",
		act: "ESI Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "reg-esi-insp",
		title: "ESI Inspection Book",
		act: "ESI Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "reg-clra-12",
		code: "Form XII",
		title: "Register of Contractors",
		act: "CLRA",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.contractLabour
	},
	{
		id: "reg-clra-13",
		code: "Form XIII",
		title: "Register of Workmen employed by Contractor",
		act: "CLRA",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.contractLabour
	},
	{
		id: "reg-bonus-ab",
		code: "Form A & B",
		title: "Register of Set-on / Set-off Allocable Surplus",
		act: "Bonus Act",
		category: "register",
		frequency: "annual",
		applies: (p) => p.employeeCount >= 20
	},
	{
		id: "reg-bonus-c",
		code: "Form C",
		title: "Register of Bonus",
		act: "Bonus Act",
		category: "register",
		frequency: "annual",
		applies: (p) => p.employeeCount >= 20
	},
	{
		id: "reg-epf-insp",
		title: "EPF Inspection Book",
		act: "EPF Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 20
	},
	{
		id: "reg-lwf-b",
		code: "Form B",
		title: "LWF Register of Wages",
		act: "State LWF Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 5
	},
	{
		id: "reg-lwf-c",
		code: "Form C",
		title: "LWF Register of Unpaid Accumulations, Fines & Deductions",
		act: "State LWF Act",
		category: "register",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 5
	},
	{
		id: "reg-er-d",
		code: "Form D",
		title: "Register maintained by Employer (Equal Remuneration)",
		act: "Equal Remuneration Act",
		category: "register",
		frequency: "ongoing",
		applies: all
	}
];
var MASTER_ABSTRACTS = [
	{
		id: "abs-fa",
		title: "Abstract of the Factories Act",
		act: "Factories Act",
		category: "abstract",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "abs-pg",
		title: "Abstract of the Payment of Gratuity Act",
		act: "Payment of Gratuity",
		category: "abstract",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "abs-pw",
		title: "Abstract of the Payment of Wages Act",
		act: "Payment of Wages",
		category: "abstract",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "abs-mw",
		title: "Abstract of the Minimum Wages Act",
		act: "Minimum Wages",
		category: "abstract",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "abs-mb",
		title: "Abstract of the Maternity Benefit Act",
		act: "Maternity Benefit",
		category: "abstract",
		frequency: "ongoing",
		applies: (p) => p.womenEmployees > 0
	},
	{
		id: "abs-wc",
		title: "Abstract of the Workmen's Compensation Act",
		act: "EC Act",
		category: "abstract",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "abs-cl",
		title: "Abstract of the Contract Labour Act",
		act: "CLRA",
		category: "abstract",
		frequency: "ongoing",
		applies: (p) => p.contractLabour
	},
	{
		id: "abs-so",
		title: "Abstract of the Industrial Employment (Standing Orders) Act",
		act: "Standing Orders",
		category: "abstract",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 100
	},
	{
		id: "abs-bn",
		title: "Abstract of the Payment of Bonus Act",
		act: "Bonus Act",
		category: "abstract",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 20
	}
];
var MASTER_NOTICES = [
	{
		id: "not-fa-11",
		code: "Form 11",
		title: "Notice of Period of Works for Adult Worker",
		act: "Factories Act",
		category: "notice",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "not-pg-a",
		code: "Form A",
		title: "Notice of Opening (Gratuity)",
		act: "Payment of Gratuity",
		category: "notice",
		frequency: "one_time",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "not-pg-auth",
		title: "Notice of Authorised Officer (Gratuity)",
		act: "Payment of Gratuity",
		category: "notice",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "not-pw-rates",
		title: "Notice of Rates of Wages",
		act: "Payment of Wages",
		category: "notice",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "not-pw-pdate",
		title: "Notice furnishing Wage Period, Wage Date and Pay-Master",
		act: "Payment of Wages",
		category: "notice",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "not-cl-pdate",
		title: "Notice furnishing Wage Period, Wage Date and Pay-Master (Contract Labour)",
		act: "CLRA",
		category: "notice",
		frequency: "ongoing",
		applies: (p) => p.contractLabour
	},
	{
		id: "not-child",
		title: "'No Child Labour is Engaged' Notice",
		act: "Child Labour Act",
		category: "notice",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "not-posh",
		title: "Display of POSH Internal Committee Members",
		act: "POSH Act",
		category: "notice",
		frequency: "ongoing",
		applies: (p) => p.womenEmployees >= 1
	}
];
var MASTER_RETURNS = [
	{
		id: "ret-pf-monthly",
		code: "Form 5/10/12A/IW1",
		title: "EPF Monthly Return",
		act: "EPF Act",
		category: "return",
		frequency: "monthly",
		dueDay: 15,
		applies: (p) => p.employeeCount >= 20
	},
	{
		id: "ret-esi-half",
		title: "ESI Half-Yearly Return",
		act: "ESI Act",
		category: "return",
		frequency: "half_yearly",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "ret-fa-half",
		title: "Half-Yearly Return under Factories Act",
		act: "Factories Act",
		category: "return",
		frequency: "half_yearly",
		dueMonth: 7,
		dueDay: 15,
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "ret-fa-annual",
		title: "Annual Return under Factories Act (Jan–Dec)",
		act: "Factories Act",
		category: "return",
		frequency: "annual",
		dueMonth: 1,
		dueDay: 31,
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "ret-clra-annual",
		title: "Annual Return under CLRA Act",
		act: "CLRA",
		category: "return",
		frequency: "annual",
		dueMonth: 2,
		dueDay: 15,
		applies: (p) => p.contractLabour
	},
	{
		id: "ret-subsist-half",
		title: "Half-Yearly Return under Subsistence Allowance",
		act: "Subsistence Act",
		category: "return",
		frequency: "half_yearly",
		applies: all
	},
	{
		id: "ret-perm-half",
		title: "Half-Yearly Return under Conferment of Permanent Status",
		act: "Permanent Status Act",
		category: "return",
		frequency: "half_yearly",
		applies: all
	},
	{
		id: "ret-mb-annual",
		title: "Annual Return under Maternity Benefit Act",
		act: "Maternity Benefit",
		category: "return",
		frequency: "annual",
		dueMonth: 1,
		dueDay: 31,
		applies: (p) => p.womenEmployees > 0
	},
	{
		id: "ret-mw-annual",
		title: "Annual Return under Minimum Wages Act",
		act: "Minimum Wages",
		category: "return",
		frequency: "annual",
		dueMonth: 2,
		dueDay: 1,
		applies: all
	},
	{
		id: "ret-bonus-annual",
		title: "Annual Return under Bonus Act",
		act: "Bonus Act",
		category: "return",
		frequency: "annual",
		dueMonth: 12,
		dueDay: 30,
		applies: (p) => p.employeeCount >= 20
	},
	{
		id: "ret-pw-annual",
		title: "Annual Return under Payment of Wages Act",
		act: "Payment of Wages",
		category: "return",
		frequency: "annual",
		dueMonth: 2,
		dueDay: 15,
		applies: all
	},
	{
		id: "ret-pf-annual",
		code: "Form 3A/6A",
		title: "Annual Return under EPF Act",
		act: "EPF Act",
		category: "return",
		frequency: "annual",
		dueMonth: 4,
		dueDay: 30,
		applies: (p) => p.employeeCount >= 20
	},
	{
		id: "ret-ec-annual",
		title: "Annual Return under Employee's Compensation Act",
		act: "EC Act",
		category: "return",
		frequency: "annual",
		dueMonth: 1,
		dueDay: 31,
		applies: all
	},
	{
		id: "ret-eecn-quarter",
		title: "Quarterly Return under Employment Exchanges Notification Act (ER-1)",
		act: "EECN",
		category: "return",
		frequency: "quarterly",
		dueDay: 30,
		applies: (p) => p.employeeCount >= 25
	},
	{
		id: "ret-eecn-biennial",
		title: "Biennial Return under Employment Exchanges Act (ER-2)",
		act: "EECN",
		category: "return",
		frequency: "biennial",
		applies: (p) => p.employeeCount >= 25
	},
	{
		id: "ret-lwf-half",
		title: "LWF Contribution & Statement",
		act: "State LWF Act",
		category: "remittance",
		frequency: "half_yearly",
		applies: (p) => p.employeeCount >= 5
	},
	{
		id: "ret-esi-monthly",
		title: "ESI Monthly Remittance (by 21st)",
		act: "ESI Act",
		category: "remittance",
		frequency: "monthly",
		dueDay: 21,
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "ret-pf-remit",
		title: "EPF Monthly Remittance (by 15th)",
		act: "EPF Act",
		category: "remittance",
		frequency: "monthly",
		dueDay: 15,
		applies: (p) => p.employeeCount >= 20
	}
];
var MASTER_LICENCES = [
	{
		id: "lic-factory",
		title: "Factory Licence",
		act: "Factories Act",
		category: "licence",
		frequency: "annual",
		dueMonth: 10,
		dueDay: 31,
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "lic-plan",
		title: "Factory Plan Approval",
		act: "Factories Act",
		category: "licence",
		frequency: "one_time",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "lic-stability",
		title: "Building Stability Certificate",
		act: "Factories Act",
		category: "licence",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "lic-se",
		title: "Shops & Establishments Registration",
		act: "S&E Act",
		category: "licence",
		frequency: "annual",
		applies: (p) => p.establishmentType !== "factory"
	},
	{
		id: "lic-clra-rc",
		title: "CLRA Registration Certificate (Principal Employer)",
		act: "CLRA",
		category: "licence",
		frequency: "one_time",
		applies: (p) => p.contractLabour
	},
	{
		id: "lic-clra-lic",
		title: "CLRA Licence (Contractor)",
		act: "CLRA",
		category: "licence",
		frequency: "annual",
		applies: (p) => p.contractLabour
	},
	{
		id: "lic-gratuity",
		title: "Notice of Opening – Payment of Gratuity Act",
		act: "Gratuity Act",
		category: "licence",
		frequency: "one_time",
		applies: (p) => p.employeeCount >= 10
	},
	{
		id: "lic-standing",
		title: "Certified Standing Orders",
		act: "Standing Orders Act",
		category: "licence",
		frequency: "one_time",
		applies: (p) => p.employeeCount >= 100
	},
	{
		id: "lic-fire-noc",
		title: "Fire NOC",
		act: "State Fire Services Act",
		category: "licence",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "lic-cte",
		title: "Consent to Establish (Pollution Board)",
		act: "Water & Air Acts",
		category: "licence",
		frequency: "one_time",
		applies: (p) => p.establishmentType === "factory" && p.manufacturing
	},
	{
		id: "lic-cto",
		title: "Consent to Operate (Pollution Board)",
		act: "Water & Air Acts",
		category: "licence",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory" && p.manufacturing
	},
	{
		id: "lic-form-v",
		code: "Form V",
		title: "Form V – Certificate by Principal Employer to Contractors",
		act: "CLRA",
		category: "licence",
		frequency: "one_time",
		applies: (p) => p.contractLabour
	}
];
var MASTER_TESTING = [
	{
		id: "test-pv-ext",
		title: "External Test of Pressure Vessels",
		act: "Factories Act – Rule 61",
		category: "testing",
		frequency: "half_yearly",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "test-pv-int",
		title: "Internal Test of Pressure Vessels",
		act: "Factories Act – Rule 61",
		category: "testing",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "test-hoist",
		title: "Examination of Hoists & Lifts",
		act: "Factories Act",
		category: "testing",
		frequency: "half_yearly",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "test-crane",
		title: "Testing of Cranes & Chain Pulley Blocks",
		act: "Factories Act",
		category: "testing",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "test-lifting",
		title: "Inspection of Lifting Tackles",
		act: "Factories Act",
		category: "testing",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "test-dust",
		title: "Testing of Dust Extraction System",
		act: "Factories Act",
		category: "testing",
		frequency: "annual",
		applies: (p) => p.hazardous
	},
	{
		id: "test-forklift-eye",
		title: "Eye Examination for Fork-Lift Operators",
		act: "Factories Act",
		category: "testing",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "test-fire-drill",
		title: "Mock Fire Drill",
		act: "Factories Act",
		category: "safety",
		frequency: "quarterly",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "test-safety-mtg",
		title: "Safety Committee Meeting",
		act: "Factories Act",
		category: "safety",
		frequency: "quarterly",
		applies: (p) => p.establishmentType === "factory" && p.employeeCount >= 250
	},
	{
		id: "test-fire-training",
		title: "Basic Fire Fighter Training",
		act: "Factories Act",
		category: "training",
		frequency: "annual",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "test-first-aid",
		title: "First-Aid Training",
		act: "Factories Act",
		category: "training",
		frequency: "annual",
		applies: (p) => p.employeeCount >= 50
	},
	{
		id: "test-medical-haz",
		title: "Periodical Medical Examination – Hazardous Workers",
		act: "Factories Act",
		category: "training",
		frequency: "half_yearly",
		applies: (p) => p.hazardous
	}
];
var MASTER_WELFARE = [
	{
		id: "wel-drinking",
		title: "Drinking Water Facility",
		act: "Factories Act – S.18",
		category: "welfare",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "wel-toilet",
		title: "Male & Female Toilets/Urinals",
		act: "Factories Act – S.19",
		category: "welfare",
		frequency: "ongoing",
		applies: all
	},
	{
		id: "wel-washing",
		title: "Washing Facility / Safety Shower",
		act: "Factories Act – S.42",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "wel-first-aid",
		title: "First-Aid Box (1 per 150 workers)",
		act: "Factories Act – S.45",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.establishmentType === "factory"
	},
	{
		id: "wel-canteen",
		title: "Canteen (≥250 workers)",
		act: "Factories Act – S.46",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 250
	},
	{
		id: "wel-rest",
		title: "Rest Room / Lunch Room (≥150 workers)",
		act: "Factories Act – S.47",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 150
	},
	{
		id: "wel-creche",
		title: "Creche (≥30 women workers)",
		act: "Factories Act – S.48",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.womenEmployees >= 30
	},
	{
		id: "wel-ohc",
		title: "Occupational Health Centre",
		act: "Factories Act",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.hazardous || p.employeeCount >= 500
	},
	{
		id: "wel-ambulance",
		title: "Ambulance Room / Ambulance Van",
		act: "Factories Act",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 500
	},
	{
		id: "wel-welfare-officer",
		title: "Welfare Officer (≥500 workers)",
		act: "Factories Act – S.49",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 500
	},
	{
		id: "wel-safety-officer",
		title: "Safety Officer (≥1000 workers or hazardous)",
		act: "Factories Act – S.40B",
		category: "welfare",
		frequency: "ongoing",
		applies: (p) => p.employeeCount >= 1e3 || p.hazardous
	}
];
var MASTER_LIBRARY = [
	...MASTER_ACTS,
	...MASTER_REGISTERS,
	...MASTER_ABSTRACTS,
	...MASTER_NOTICES,
	...MASTER_RETURNS,
	...MASTER_LICENCES,
	...MASTER_TESTING,
	...MASTER_WELFARE
];
var CATEGORY_LABEL = {
	general: "General",
	register: "Registers",
	abstract: "Abstracts",
	notice: "Notices",
	return: "Returns",
	licence: "Licences",
	remittance: "Remittances",
	testing: "Testing",
	welfare: "Welfare Facilities",
	safety: "Safety",
	training: "Training"
};
function applicableMaster(profile, custom = []) {
	return [...MASTER_LIBRARY, ...custom].filter((i) => {
		try {
			return i.applies(profile);
		} catch {
			return true;
		}
	});
}
function summariseMaster(items, statuses) {
	let green = 0, amber = 0, red = 0, na = 0, pending = 0;
	for (const it of items) {
		const s = statuses[it.id]?.status ?? "pending";
		if (s === "green") green++;
		else if (s === "amber") amber++;
		else if (s === "red") red++;
		else if (s === "na") na++;
		else pending++;
	}
	const total = items.length || 1;
	const complianceScore = Math.round((green + na * .5) / total * 100);
	return {
		green,
		amber,
		red,
		na,
		pending,
		total: items.length,
		complianceScore
	};
}
var STATUS_COLORS = {
	green: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
	amber: "bg-amber-500/15 text-amber-600 border-amber-500/30",
	red: "bg-destructive/15 text-destructive border-destructive/30",
	na: "bg-muted text-muted-foreground border-border",
	pending: "bg-primary/10 text-primary border-primary/30"
};
var STATUSES = [
	"green",
	"amber",
	"red",
	"na",
	"pending"
];
var FREQ_LABEL = {
	daily: "Daily",
	monthly: "Monthly",
	quarterly: "Quarterly",
	half_yearly: "Half-Yearly",
	annual: "Annual",
	biennial: "Biennial",
	one_time: "One-Time",
	on_event: "On Event",
	ongoing: "Ongoing"
};
function ComplianceMasterTab() {
	const { profile } = useCompliance();
	const { customItems, statuses, addItem, deleteItem, setStatus, materializedCustom } = useComplianceMaster();
	const [cat, setCat] = (0, import_react.useState)("all");
	const [q, setQ] = (0, import_react.useState)("");
	const items = (0, import_react.useMemo)(() => applicableMaster(profile, materializedCustom()), [
		profile,
		customItems,
		materializedCustom
	]);
	const filtered = items.filter((i) => (cat === "all" || i.category === cat) && (q === "" || (i.title + i.act + (i.code ?? "")).toLowerCase().includes(q.toLowerCase())));
	const summary = summariseMaster(items, statuses);
	const categoryCounts = (0, import_react.useMemo)(() => {
		const m = {};
		for (const i of items) m[i.category] = (m[i.category] || 0) + 1;
		return m;
	}, [items]);
	function exportConsolidatedPDF() {
		const doc = new import_jspdf_node_min.default();
		doc.setFontSize(14);
		doc.text("Consolidated Statutory Compliance Status", 14, 15);
		doc.setFontSize(9);
		doc.text(`Profile: ${profile.state} · ${profile.industry} · ${profile.establishmentType} · ${profile.employeeCount} employees`, 14, 22);
		doc.text(`Score: ${summary.complianceScore}%  ·  Green ${summary.green}  ·  Amber ${summary.amber}  ·  Red ${summary.red}  ·  N/A ${summary.na}  ·  Pending ${summary.pending}`, 14, 28);
		autoTable(doc, {
			startY: 34,
			styles: { fontSize: 7 },
			headStyles: { fillColor: [
				20,
				160,
				170
			] },
			head: [[
				"#",
				"Compliance",
				"Category",
				"Frequency",
				"Status",
				"Remarks"
			]],
			body: items.map((it, idx) => {
				const s = statuses[it.id]?.status ?? "pending";
				const r = statuses[it.id]?.remarks ?? "";
				return [
					String(idx + 1),
					`${it.title}${it.code ? ` (${it.code})` : ""}\n${it.act}`,
					CATEGORY_LABEL[it.category],
					FREQ_LABEL[it.frequency] || it.frequency,
					s.toUpperCase(),
					r
				];
			})
		});
		doc.save(`compliance-consolidated-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf`);
		toast.success("Consolidated PDF downloaded");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border p-4 bg-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3 flex-wrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-medium",
						children: "Consolidated Statutory Master"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground",
						children: "Every applicable Act, Register, Notice, Abstract, Return, Licence, Testing item and Welfare facility — filtered by state, industry, headcount, women, contract & hazardous flags."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] uppercase text-muted-foreground",
									children: "Compliance Score"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-2xl font-semibold",
									children: [summary.complianceScore, "%"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "outline",
								size: "sm",
								onClick: exportConsolidatedPDF,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 mr-1" }), "Consolidated PDF"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddMasterItemDialog, {})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							label: "Green (Complied)",
							value: summary.green,
							tone: "green"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							label: "Amber (Partial)",
							value: summary.amber,
							tone: "amber"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							label: "Red (Not Complied)",
							value: summary.red,
							tone: "red"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							label: "Not Applicable",
							value: summary.na,
							tone: "na"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							label: "Pending Review",
							value: summary.pending,
							tone: "pending"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						className: "pl-8 h-9 w-64",
						placeholder: "Search Act, Form, Register…",
						value: q,
						onChange: (e) => setQ(e.target.value)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1 flex-wrap",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "h-4 w-4 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setCat("all"),
							className: `text-xs px-2 py-1 rounded border ${cat === "all" ? "bg-primary text-primary-foreground border-primary" : ""}`,
							children: [
								"All (",
								items.length,
								")"
							]
						}),
						Object.keys(CATEGORY_LABEL).map((c) => categoryCounts[c] ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setCat(c),
							className: `text-xs px-2 py-1 rounded border ${cat === c ? "bg-primary text-primary-foreground border-primary" : ""}`,
							children: [
								CATEGORY_LABEL[c],
								" (",
								categoryCounts[c],
								")"
							]
						}, c) : null)
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border bg-card overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-muted/40 text-xs text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-3 py-2",
								children: "Compliance"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-3 py-2",
								children: "Category"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-3 py-2",
								children: "Frequency"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-3 py-2",
								children: "Status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-3 py-2",
								children: "Remarks"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "w-20" })
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [filtered.map((it) => {
						const rec = statuses[it.id];
						const s = rec?.status ?? "pending";
						const isCustom = customItems.some((c) => c.id === it.id);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t align-top",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "font-medium",
										children: [
											it.title,
											it.code && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "ml-1 text-xs text-muted-foreground",
												children: [
													"(",
													it.code,
													")"
												]
											}),
											isCustom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: "outline",
												className: "ml-2 text-[10px]",
												children: "Custom"
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-muted-foreground",
										children: [it.act, it.authority ? ` · ${it.authority}` : ""]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs",
									children: CATEGORY_LABEL[it.category]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2 text-xs",
									children: [FREQ_LABEL[it.frequency] || it.frequency, it.dueDay ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[10px] text-muted-foreground",
										children: [
											"Due day ",
											it.dueDay,
											it.dueMonth ? `/${it.dueMonth}` : ""
										]
									}) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										className: `h-8 text-xs rounded border px-2 ${STATUS_COLORS[s]}`,
										value: s,
										onChange: (e) => setStatus(it.id, {
											status: e.target.value,
											updatedBy: "admin"
										}),
										children: STATUSES.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: x,
											children: x.toUpperCase()
										}, x))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										className: "h-8 text-xs",
										placeholder: "e.g. Filed on 12.04.2024 – Ref #1234",
										defaultValue: rec?.remarks ?? "",
										onBlur: (e) => setStatus(it.id, {
											remarks: e.target.value,
											updatedBy: "admin"
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-right",
									children: isCustom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => {
											deleteItem(it.id);
											toast.success("Removed");
										},
										children: "×"
									})
								})
							]
						}, it.id);
					}), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 6,
						className: "px-3 py-8 text-center text-sm text-muted-foreground",
						children: "No compliance items match the current filter."
					}) })] })]
				})
			})
		]
	});
	function AddMasterItemDialog() {
		const [open, setOpen] = (0, import_react.useState)(false);
		const [form, setForm] = (0, import_react.useState)({
			title: "",
			act: "",
			code: "",
			authority: "",
			category: "register",
			frequency: "ongoing",
			appliesExpr: "always"
		});
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
			open,
			onOpenChange: setOpen,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-1" }), "Add Item"]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Add Compliance Item" }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs col-span-2",
							children: ["Title", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.title,
								onChange: (e) => setForm({
									...form,
									title: e.target.value
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs",
							children: ["Act / Rule", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.act,
								onChange: (e) => setForm({
									...form,
									act: e.target.value
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs",
							children: ["Form / Code", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.code,
								onChange: (e) => setForm({
									...form,
									code: e.target.value
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs",
							children: ["Authority", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.authority,
								onChange: (e) => setForm({
									...form,
									authority: e.target.value
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs",
							children: ["Category", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "h-9 w-full rounded border px-2 text-sm bg-background",
								value: form.category,
								onChange: (e) => setForm({
									...form,
									category: e.target.value
								}),
								children: Object.keys(CATEGORY_LABEL).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: c,
									children: CATEGORY_LABEL[c]
								}, c))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs",
							children: ["Frequency", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "h-9 w-full rounded border px-2 text-sm bg-background",
								value: form.frequency,
								onChange: (e) => setForm({
									...form,
									frequency: e.target.value
								}),
								children: Object.entries(FREQ_LABEL).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: k,
									children: v
								}, k))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs col-span-2",
							children: ["Applies When", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "h-9 w-full rounded border px-2 text-sm bg-background",
								value: form.appliesExpr,
								onChange: (e) => setForm({
									...form,
									appliesExpr: e.target.value
								}),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "always",
										children: "Always applies"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "factory",
										children: "Only if establishment = factory"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "shop",
										children: "Only if establishment ≠ factory"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "women",
										children: "Only if women employees > 0"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "contract",
										children: "Only if contract labour engaged"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "hazardous",
										children: "Only if hazardous process"
									})
								]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					onClick: () => setOpen(false),
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => {
						if (!form.title || !form.act) return toast.error("Title and Act are required");
						addItem(form);
						toast.success("Added to master library");
						setOpen(false);
					},
					children: "Add"
				})] })
			] })]
		});
	}
}
function Chip({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-md border p-2 ${STATUS_COLORS[tone]}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[10px] uppercase opacity-80",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-lg font-semibold",
			children: value
		})]
	});
}
var ACT_MAP = {
	FA: "Factories Act, 1948 & TN Factories Rules 1950",
	FASO: "Factories Act 1948 and the Tamilnadu Safety Officers Rules 2005",
	FAWO: "Factories Act 1948 and Tamilnadu Welfare Officers Act, 1973",
	PW: "The Payment of Wages Act - 1936 and Tamilnadu Rules 1937",
	APP: "The Apprentices Act, 1961 and the Apprenticeship Rules, 1991",
	PERM: "TN Industrial Establishments (Conferment of Permanent Status to Workmen) Act 1981",
	EECN: "The Employment Exchanges (Compulsory Notification of Vacancies) Act 1959 & Rules 1960",
	SUB: "TN Payment of Subsistence Allowance Act - 1981 and Rules 1981",
	MW: "The Minimum Wages Act - 1948 and Tamilnadu Rules 1953",
	ER: "The Equal Remuneration Act 1976 & Rules 1976",
	SO: "The Industrial Employment (Standing Orders) Act 1946 and TN Rules 1953",
	LWF: "The Tamilnadu Labour Welfare Fund Act 1972 and Rules 1973",
	ESI: "The Employees' State Insurance Act 1948",
	EPF: "The Employees' Provident Funds & Miscellaneous Provisions Act 1952",
	CL: "Tamilnadu Child Labour Regulation and Abolition Act",
	MB: "The Maternity Benefit Act 1961 and Rules 1963",
	BON: "The Payment of Bonus Act 1965 & Rules 1975",
	GRA: "The Payment of Gratuity Act 1972 & TN Rules 1972",
	NFH: "TN Industrial Establishments (National and Festival Holidays) Act 1958 & Rules 1959",
	EC: "The Employee Compensation Act 1923 and TN Workmen Compensation Rules 1934",
	CLRA: "The Contract Labour (Regulation & Abolition) Act 1970 and Rules 1975",
	PT: "Profession Tax Act 1975",
	POSH: "Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act 2013"
};
var TN_MONTHLY_CHECKLIST = `
1|FA|Manager nominated/appointed by the Occupier|Manager - a person nominated or appointed as such by the occupier of the factory|P
2|FA|Occupier|Occupier of a factory means the person who has ultimate control over the affairs of the Factory|P
3|FA|Application for permission to Construct, Extend or take into any building as a Factory|Approval of site, construction or extension of factory|P
4|FA|Application for registration and Grant of License|Registration and grant of license or to renew license|P
5|FA|Grant of license|Registration and grant of license or to renew license|P
6|FA|Amendment of Licence|Change in Directors, Occupier, strength, HP or manufacturing process|P
7|FA|Renewal of License|Renewal 2 months before due date with treasury receipt to DISH|P
8|FA|Transfer of license|Transfer of license to another person before expiry|NA
9|FA|Notice of change of Manager|Within 7 days from the date of change|P
10|FA|Stability Certificate|From competent person before starting manufacturing process (3 yr validity)|P
11|FA|Health Register|Form 17 — record of medical exam for dangerous/hazardous process workers|P
12|FA|Fitness certificate|Fitness certificate in Form 27|P
13|FA|Disclosing of information - Hazardous|Copy of hazardous information furnished to workers|P
14|FA|Safety & Health Policy|Written policy for hazardous units / factories employing >50 workers|P
15|FA|Onsite emergency plan|For factories covered under Section 2(cb) — Hazardous process|P
16|FA|Displayed Emergency Plan|On every floor area-wise in the Factory|P
17|FA|Information regarding hazardous process|Workers & public informed of safety measures during accident|P
18|FA|Handling/storage/disposal of hazardous substances|Approved by Chief Inspector; published to workers and public|P
19|FA|Information under Rule 62D & 62K|Copy sent to CIF and State Pollution Control Board|P
20|FA|Review of information Rule 62D & 62K|Review on process change or serious accident|NA
21|FA|Appointment of supervisors|Qualified persons per Rule 62S for hazardous substances|P
22|FA|Medical examination and Health records|Pre-employment + 6-monthly for hazardous workers (Form 17 & 39)|P
23|FA|Medical examination - periodicity|Once every 6 months after appointment|P
24|FA|Pre-employment & periodical exam records|Recorded in prescribed Form|P
25|FA|Safety committee|Equal number of worker & management reps|P
26|FA|Safety committee meeting|Date to be captured|P
27|FA|Safety Officer|1 safety officer for every 1000 employees|P
28|FA|Mock fire drill|Once in two months; records with photos|P
29|FA|Fire prevention & escape training|Measures to prevent outbreak/spread & train workers|P
30|FA|Emergency exit for high-hazard storage|Travel distance <=22.5m; 2 escape routes per room|P
31|FA|Reporting of dangerous occurrences|Within 12 hours - accident with fatal injury|NA
32|FA|Reporting of accident|Accident with fatal injury|NA
33|FA|OHC (51-200 workers)|Occupational health centre fully equipped|D
34|FA|OHC floor area|Room with 15 sq.m floor area|D
35|FA|OHC finishes|Smooth impervious floors and walls|P
36|FA|OHC equipment|Equipment as per schedule|D
37|FA|OHC Medical officer appointment|Medical officer to be appointed|D
38|FA|Medical officer availability|Readily available during medical emergencies|D
39|FA|Medical officer visits|At least twice per week|D
40|FA|OHC dressers|3 qualified dresser-cum-compounders on duty|N
41|FA|First aid box|Fully equipped and available|P
42|FA|Ambulance Van|Available and in use|P
43|FA|Ambulance driver-cum-mechanic|Full-time driver-cum-mechanic|P
44|FA|Ambulance helper|Full-time helper trained in first aid|N
45|FA|Ambulance stationing|Stationed at or near OHC|P
46|FA|Tie-up with nearby hospital|For factories with less than 200 workers|P
47|FA|Decontamination — drenching shower|51-200: 2+1 for every additional 50|P
48|FA|Eye-wash bottles|Sufficient number filled with distilled water|N
49|FA|Locker/drying room|Facility for clothing not worn during work & drying wet clothes|P
50|FA|Material Safety Data Sheet|MSDS for every hazardous material handled|P
51|FA|Exemption to disclosure (Hazardous)|Applicability of exemption under hazardous units|NA
52|FA|Notice regarding First Aid boxes|For hazardous process units|P
53|FA|First Aid trained persons|St. Johns Ambulance Association training|P
54|FA|Ambulance Room staffing|Medical Officer + qualified nurse/dresser + attendant per shift|N
55|FA|Work permit system|Hot/cold work, height, welding, vessel entry, blanket permit|P
56|FA|Risk assessment report|Evaluation of risk factors ascertained|P
57|FA|Emergency evacuation plan / route map|Written statement of policy for hazardous & >50 worker units|P
58|FA|Marking safe assembly points|Assembly points clearly marked|P
59|FA|Self contained breathing apparatus|Breathing apparatus for medical emergency|N
60|FA|Fire suit|Fire suit availability during fire emergency|P
61|FA|Traffic safety on internal roads|Speed breakers every 500m; dividers >16m; cautionary signals|P
62|FA|Speed restriction display|Speed limit boards inside factory|P
63|FA|Disposal of wastes|Effective arrangement per TNPCB Air & Water Act|P
64|FA|Review of policies for dangerous process|Review on change in manufacturing process|NA
65|FA|Pipe line safety|Flammable/explosive pipelines protected from mechanical damage|P
66|FA|Public address system|Provision of PA system|N
67|FA|Wind sack|Wind direction indicator for evacuation|P
68|FA|Fire hydrant system|Ring main designed as per standards|N
69|FA|Ventilation system|To maintain room temperature|P
70|FA|Monthly machinery examination|Test & certificate of certain machines|NA
71|FA|Temperature/pressure/relief valve testing|Prevention of fire due to ignition|P
72|FA|Sparking equipment in hazardous areas|No spark-generating electrical equipment in hazardous zones|P
73|FA|Earthing of machinery & pipe lines|Static charge earthed effectively|P
74|FA|Lime washing/painting record|Record of white washing|P
75|FA|Room temperature|Max wet bulb temp 30 C at 1.5m above floor|P
76|FA|Spittoons|Number and location provided|P
77|FA|Planting of trees|150+ workers: plant & maintain trees approved by DAO|P
78|FA|Form 35 - Register of specially trained adult workers|Register for adults near moving machinery|NA
79|FA|Form 36 - Hoist & lifts examination|Record particulars of examination of hoists & lifts|P
80|FA|Register of lifting machines/chains/ropes|Examination records|P
81|FA|Form 8 - Pressure vessel examination|Testing of gas holder, pressure plant or vessel|P
82|FA|Canteen|Ordinarily employing 250+ workers|NA
83|FA|Canteen seats vs strength|Seats for 30% of workers working at a time|P
84|FA|Medical exam of canteen workers|Food handlers examined every 12 months|NA
85|FA|Canteen committee|Managing committee for canteen|P
86|FA|Shelter, Locker and Rest room|Factories with 150+ workers|P
87|FA|Creche|Factories with 30+ women workers|NA
88|FA|Compensatory holidays in Form 25|Not more than 2 holidays per week|NA
89|FA|Muster roll for exempted workers (OT) Form 10|OT hours & payment recorded|NA
90|FA|Overtime slip|OT slips issued to workers|NA
91|FA|Notice of work Form 11|Period of work for adults in English & regional language|P
92|FA|Register of adult workers|Adult workers register maintained|P
93|FA|List of Supervision/Management/Confidential|List maintained|P
94|FA|Working Hours|Shift schedule|P
95|FA|Weekly holiday|Weekly off|P
96|FA|Spread Over|Not more than 10.5 hours|P
97|FA|Prohibition of Overlapping Shift|Overlapping of shift restriction|P
98|FA|Quarterly Overtime Limit|OT limits|NA
99|FA|Rest intervals|Statutory rest intervals|P
100|FA|Register & certificate of young workers|For factories permitting young persons|NA
101|FA|Register of Leave with Wages|Leave book|P
102|FA|Nomination|Payment of wages if worker dies|P
103|FA|Medical examination record|Pre-employment record for dangerous operations|P
104|FA|Further details of accident|Fatal accident report|NA
105|FA|Notice of poisoning or disease|Dangerous occurrence|NA
106|FA|Display of Factories Rules|TN Factory Rules & Act displayed|P
107|FA|Display of Notice|Working hours, holidays & intervals|P
108|FA|Half yearly return|Returns submitted|P
109|FA|Annual return|Combined Annual Return Form 22|P
110|FA|Muster roll Form 25|All workers|P
111|FA|Time card|Service card for each calendar month|P
112|FA|ID card|Photo identity card|P
113|FA|Register of Exemptions|Exemption details|NA
114|FA|Particulars of Rooms|Room particulars in factory|P
115|FA|Display of persons engaged per shop floor|Max workers per workroom per relay|P
116|FA|Per person space|Workers x 3.3 m3|P
117|FA|Display of Name board|In English and Tamil|P
118|FA|Fire Extinguishers|Prevention for exposure of substances|P
119|FASO|Fire Hydrant|Measures to prevent fire outbreak|N
120|FA|Fire fighting training|Emergency exit training|P
121|FAWO|Welfare Officer|1 WO for employee count >=500|NA
122|FAWO|Assistant Welfare Officer|Additional for count 2000-4000|NA
123|FAWO|Welfare Officer appointment vs engaged|As per strength|NA
124|PW|Register of fines|Maintained|P
125|PW|Register of deductions for damages/loss|Maintained|P
126|PW|Register of wages|Maintained|P
127|PW|Wage Slip|Maintained|P
128|PW|Register of advances|Maintained|P
129|PW|Annual return|Combined annual return|P
130|PW|Abstract of the act|Displayed|P
131|PW|Notice of rates of wages|Displayed|P
132|PW|Notice of wage period & wage date|Displayed|P
133|PW|Power to impose fine|Notice displayed|NA
134|PW|Particulars of Paymaster|Displayed|P
135|APP|Contract of apprenticeship training|Maintained|NA
136|APP|Work diary|Maintained|NA
137|APP|Register of attendance of trade apprentices|Maintained|NA
138|APP|Form 3 & 3A|Maintained|NA
139|APP|Form 4|Maintained|NA
140|APP|Form Apprenticeship 1|Maintained|NA
141|APP|Form Apprenticeship 2|Maintained|NA
142|APP|Form 3|Maintained|NA
143|APP|Hours of Work - Graduate Apprentices|42 to 48 hours/week|NA
144|APP|Hours of Work - Trade Apprentices|42 hours/week|NA
145|APP|Hours of Work - Trade Apprentices Night|Not between 10pm-6am|NA
146|APP|Payment of Stipend|Stipend paid|NA
147|APP|Casual Leave|Grant of leave|NA
148|APP|Medical Leave|Grant of leave|NA
149|PERM|Register of workmen|Maintained|P
150|PERM|Half yearly return|Submitted|P
151|EECN|Notification of vacancy|Maintained|P
152|EECN|Quarterly return|Submitted|P
153|EECN|Biennial return|Submitted alternate years|P
154|SUB|Register of employees under suspension|Maintained|P
155|SUB|Half yearly return|Submitted|P
156|MW|Register of fines|Maintained|P
157|MW|Register of deductions for damage/loss|Maintained|P
158|MW|Annual return|Combined annual return|P
159|MW|Register of overtime for workers|Maintained|P
160|MW|Muster roll|Maintained under Factories Act|P
161|MW|Wage Slip|Given through email|P
162|MW|Register of wages|Maintained under PW Act|P
163|MW|Register of employees|Maintained under Factories Act|P
164|MW|Abstract of the act|Displayed|P
165|ER|Register by employer|Maintained|P
166|SO|Certified Standing Orders|Displayed|D
167|SO|Abstract of the act/Display|Displayed|P
168|LWF|Statement of contributions|Contribution made|P
169|LWF|Register of wages|Maintained centrally at HO|P
170|LWF|Register of unpaid accumulations/fines/deductions|Maintained|P
171|ESI|Employers' registration form|Submitted|P
172|ESI|Annual Return|Submitted|P
173|ESI|Declaration form (TIC)|Updated online|P
174|ESI|Smart Card - Pechan card|Received for all applicable employees|P
175|ESI|Accident report|Maintained|NA
176|ESI|Accident book|Maintained|P
177|ESI|Register of employees|Maintained|P
178|ESI|Return of contributions|Half-yearly submission|P
179|ESI|Monthly contribution remittance challan|Online remittance|P
180|ESI|Inspection Book|Maintained|P
181|EPF|Establishment Code|Registration code|P
182|EPF|Nomination and Declaration form|On joining and change of status|P
183|EPF|Policy details - Annually (EDLI exempted units)|Maintained|NA
184|EPF|EDLI exemption - monthly return|Maintained|NA
185|EPF|Updation and allotment of PF account number|Maintained|P
186|EPF|Monthly contribution remittance|Before due date|P
187|EPF|International workers monthly statement|NIL return if no IW|P
188|EPF|Declaration from new joinee|Maintained|P
189|EPF|Inspection Book|Maintained|P
190|CL|Display of notice|Displayed|P
191|MB|Abstract of the Act|Displayed|P
192|MB|Maternity benefit Register|Maintained|P
193|MB|Annual Return|Submitted annually|P
194|BON|Register of computation of allocable surplus|Maintained|P
195|BON|Register of set-on & set-off allocable surplus|Maintained|P
196|BON|Register of bonus|Maintained|P
197|BON|Annual return|Submitted annually|P
198|GRA|Notice of opening|Submitted|P
199|GRA|Notice of Change|Maintained on change|NA
200|GRA|Notice of closure|At time of closure|NA
201|GRA|Nomination|Obtained & filed in personnel file|P
202|GRA|Application of gratuity by employee|Nomination Form I|NA
203|GRA|Notice for payment of gratuity|On such occurrence|NA
204|GRA|Abstract of the act|Displayed|P
205|GRA|Notice of authorized officer|Displayed|P
206|NFH|Proposal for festival holidays|Submitted|P
207|NFH|Notice of festival holidays|Submitted|P
208|NFH|Communication from Labour authority|Issued by DISH office|P
209|NFH|Application to change festival holidays|Confirmation from union/worker reps|NA
210|NFH|Statement of holidays|Prepared & submitted by 31 Dec|P
211|NFH|Notice to employees to work on N&F holidays|Submitted to JDISH|NA
212|EC|Annual Return|Submitted annually|P
213|EC|Abstract of the act|Displayed|P
214|CLRA|Application for Registration|Form I|P
215|CLRA|Grant of registration certificate|Amendment with change|P
216|CLRA|RC Amendment|As required|P
217|CLRA|Form of Certificate by Principal Employer|Issued to all contractors|P
218|CLRA|Register of contractors|Maintained|P
219|CLRA|Abstract of the act|Displayed|P
220|CLRA|Notice display|Displayed|P
221|CLRA|Annual return|Combined annual return|P
222|CLRA|Half-yearly return|Submitted by licensed contractors|P
223|PT|Half yearly payment|Paid at local Taxing office|P
224|PT|Code no./Zone|Panchayat code|NA
225|POSH|Annual Report|Submitted by 31 Dec|P
226|POSH|Constitution of Internal Complaints Committee|Formation of factory-level POSH committee|D
`.trim().split("\n").map((line) => {
	const [n, actKey, compliance, description, seed] = line.split("|");
	return {
		n: Number(n),
		act: ACT_MAP[actKey] ?? actKey,
		compliance,
		description,
		seed: seed ?? "P"
	};
});
var EMPTY_HEADER = {
	factoryName: "",
	address: "",
	dateOfOpening: "",
	factoryManager: "",
	natureOfIndustry: "",
	hrHead: "",
	factoryCoordinator: "",
	medicalAdvisor: "",
	sheRepresentative: "",
	dateOfObservation: ""
};
function seedFor() {
	const out = {};
	for (const it of TN_MONTHLY_CHECKLIST) out[it.n] = {
		status: it.seed,
		remarks: ""
	};
	return out;
}
var useMonthlyReports = create()(persist((set, get) => ({
	reports: {},
	ensureReport: (branchId, month) => {
		const key = `${branchId}::${month}`;
		const cur = get().reports[key];
		if (cur) return cur;
		const fresh = {
			month,
			header: {
				...EMPTY_HEADER,
				dateOfObservation: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
			},
			items: seedFor()
		};
		set((s) => ({ reports: {
			...s.reports,
			[key]: fresh
		} }));
		return fresh;
	},
	updateHeader: (branchId, month, patch) => {
		const key = `${branchId}::${month}`;
		set((s) => {
			const cur = s.reports[key] ?? {
				month,
				header: EMPTY_HEADER,
				items: seedFor()
			};
			return { reports: {
				...s.reports,
				[key]: {
					...cur,
					header: {
						...cur.header,
						...patch
					}
				}
			} };
		});
	},
	updateItem: (branchId, month, n, patch) => {
		const key = `${branchId}::${month}`;
		set((s) => {
			const cur = s.reports[key] ?? {
				month,
				header: EMPTY_HEADER,
				items: seedFor()
			};
			const items = {
				...cur.items,
				[n]: {
					...cur.items[n],
					...patch
				}
			};
			return { reports: {
				...s.reports,
				[key]: {
					...cur,
					items
				}
			} };
		});
	},
	bulkSeed: (branchId, month) => {
		const key = `${branchId}::${month}`;
		set((s) => {
			const cur = s.reports[key];
			if (!cur) return s;
			return { reports: {
				...s.reports,
				[key]: {
					...cur,
					items: seedFor()
				}
			} };
		});
	},
	finalize: (branchId, month, by) => {
		const key = `${branchId}::${month}`;
		set((s) => {
			const cur = s.reports[key];
			if (!cur) return s;
			return { reports: {
				...s.reports,
				[key]: {
					...cur,
					finalizedAt: (/* @__PURE__ */ new Date()).toISOString(),
					finalizedBy: by
				}
			} };
		});
	},
	remove: (branchId, month) => {
		set((s) => {
			const next = { ...s.reports };
			delete next[`${branchId}::${month}`];
			return { reports: next };
		});
	}
}), {
	name: "swift-monthly-reports",
	version: 1
}));
function summarize(items) {
	let P = 0, D = 0, N = 0, NA = 0;
	for (const it of TN_MONTHLY_CHECKLIST) {
		const s = items[it.n]?.status ?? it.seed;
		if (s === "P") P++;
		else if (s === "D") D++;
		else if (s === "N") N++;
		else NA++;
	}
	const total = TN_MONTHLY_CHECKLIST.length;
	const applicable = total - NA;
	const score = applicable > 0 ? Math.round(P / applicable * 100) : 0;
	return {
		P,
		D,
		N,
		NA,
		total,
		score
	};
}
var STATUS_LABEL = {
	P: "Complied",
	D: "Delay/Default",
	N: "Not Complied",
	NA: "Not Applicable"
};
var STATUS_COLOR = {
	P: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
	D: "bg-amber-500/15 text-amber-600 border-amber-500/30",
	N: "bg-destructive/15 text-destructive border-destructive/30",
	NA: "bg-muted text-muted-foreground border-border"
};
function MonthlyReportTab() {
	const company = useStore((s) => s.company);
	const branches = company.branches ?? [];
	const [branchId, setBranchId] = (0, import_react.useState)(branches[0]?.id ?? "hq");
	const branch = branches.find((b) => b.id === branchId);
	const [month, setMonth] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 7));
	const [q, setQ] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const { ensureReport, updateHeader, updateItem, bulkSeed, finalize, remove } = useMonthlyReports();
	const report = ensureReport(branchId, month);
	const s = summarize(report.items);
	const filtered = (0, import_react.useMemo)(() => {
		const ql = q.trim().toLowerCase();
		return TN_MONTHLY_CHECKLIST.filter((it) => {
			const status = report.items[it.n]?.status ?? it.seed;
			if (statusFilter !== "all" && status !== statusFilter) return false;
			if (!ql) return true;
			return String(it.n).includes(ql) || it.act.toLowerCase().includes(ql) || it.compliance.toLowerCase().includes(ql) || it.description.toLowerCase().includes(ql);
		});
	}, [
		q,
		statusFilter,
		report.items
	]);
	const monthLabel = (/* @__PURE__ */ new Date(month + "-01")).toLocaleString("en-IN", {
		month: "long",
		year: "numeric"
	});
	const factoryName = report.header.factoryName || branch?.name || company.legalName;
	const downloadPDF = () => {
		const doc = new import_jspdf_node_min.default({
			orientation: "landscape",
			unit: "mm",
			format: "a4"
		});
		const pageW = doc.internal.pageSize.getWidth();
		doc.setFillColor(20, 160, 170);
		doc.rect(0, 0, pageW, 16, "F");
		doc.setTextColor(255);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(14);
		doc.text(`${company.legalName.toUpperCase()} — MONTHLY REPORT (${monthLabel})`, pageW / 2, 10, { align: "center" });
		doc.setTextColor(0);
		const h = report.header;
		const meta = [
			["Name of the Factory", factoryName],
			["Address", h.address || branch?.address || company.address],
			["Date of opening / Commencement", h.dateOfOpening],
			["Name of the Factory Manager", h.factoryManager],
			["Nature of Industry", h.natureOfIndustry],
			["Name of the UHRM", h.hrHead],
			["Name of the Factory Co-ordinator", h.factoryCoordinator],
			["Factory Medical Advisor", h.medicalAdvisor],
			["Safety, Health & Environment Representative", h.sheRepresentative],
			["Date of Observation", h.dateOfObservation]
		];
		const ML = 10, MR = 10;
		const contentW = pageW - ML - MR;
		autoTable(doc, {
			startY: 20,
			margin: {
				left: ML,
				right: MR
			},
			theme: "grid",
			styles: {
				fontSize: 8,
				cellPadding: 1.5,
				overflow: "linebreak"
			},
			body: meta,
			columnStyles: {
				0: {
					cellWidth: 70,
					fontStyle: "bold"
				},
				1: { cellWidth: contentW - 70 }
			}
		});
		const startY = doc.lastAutoTable.finalY + 3;
		const body = TN_MONTHLY_CHECKLIST.map((it) => {
			const st = report.items[it.n];
			const status = st?.status ?? it.seed;
			const marks = {
				P: "",
				D: "",
				N: "",
				NA: ""
			};
			marks[status] = "P";
			return [
				String(it.n),
				it.act,
				it.compliance,
				it.description,
				marks.P,
				marks.D,
				marks.N,
				marks.NA,
				st?.remarks ?? ""
			];
		});
		autoTable(doc, {
			startY,
			margin: {
				left: ML,
				right: MR
			},
			theme: "grid",
			styles: {
				fontSize: 6.5,
				cellPadding: 1,
				valign: "top",
				overflow: "linebreak"
			},
			headStyles: {
				fillColor: [
					20,
					160,
					170
				],
				textColor: 255,
				fontSize: 7,
				halign: "center"
			},
			head: [[
				"S.No",
				"Act",
				"Compliance",
				"Description",
				"Complied",
				"Delay",
				"Not Complied",
				"N/A",
				"Remarks"
			]],
			body,
			columnStyles: {
				0: {
					cellWidth: 10,
					halign: "center"
				},
				1: { cellWidth: 45 },
				2: { cellWidth: 45 },
				3: { cellWidth: 60 },
				4: {
					cellWidth: 12,
					halign: "center",
					fontStyle: "bold"
				},
				5: {
					cellWidth: 12,
					halign: "center",
					fontStyle: "bold"
				},
				6: {
					cellWidth: 15,
					halign: "center",
					fontStyle: "bold"
				},
				7: {
					cellWidth: 12,
					halign: "center",
					fontStyle: "bold"
				},
				8: { cellWidth: "auto" }
			},
			didDrawPage: () => {
				const p = doc.getNumberOfPages();
				doc.setFontSize(7);
				doc.setTextColor(120);
				doc.text(`Page ${p}`, pageW - 10, doc.internal.pageSize.getHeight() - 5, { align: "right" });
				doc.setTextColor(0);
			}
		});
		autoTable(doc, {
			startY: doc.lastAutoTable.finalY + 3,
			margin: {
				left: ML,
				right: MR
			},
			theme: "grid",
			styles: {
				fontSize: 8,
				cellPadding: 1.5,
				fontStyle: "bold"
			},
			body: [
				[
					"COMPLIED",
					String(s.P),
					"",
					"",
					""
				],
				[
					"DELAY / DEFAULT COMPLIANCE",
					"",
					String(s.D),
					"",
					""
				],
				[
					"NOT COMPLIED",
					"",
					"",
					String(s.N),
					""
				],
				[
					"Not Applicable",
					"",
					"",
					"",
					String(s.NA)
				],
				[
					"TOTAL",
					"",
					"",
					"",
					String(s.total)
				]
			],
			columnStyles: {
				0: { cellWidth: 70 },
				1: {
					cellWidth: 25,
					halign: "center"
				},
				2: {
					cellWidth: 25,
					halign: "center"
				},
				3: {
					cellWidth: 25,
					halign: "center"
				},
				4: {
					cellWidth: 25,
					halign: "center"
				}
			}
		});
		doc.save(`Monthly_Compliance_${(factoryName || "Factory").replace(/\s+/g, "_")}_${month}.pdf`);
		toast.success("Monthly compliance report downloaded");
	};
	const finalized = !!report.finalizedAt;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border p-4 bg-card grid gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: "Branch"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "h-10 w-full rounded-md border bg-background px-3 text-sm",
						value: branchId,
						onChange: (e) => setBranchId(e.target.value),
						children: [branches.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "hq",
							children: "Head Office"
						}), branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: b.id,
							children: [
								b.name,
								" — ",
								b.state
							]
						}, b.id))]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: "Report Month"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "month",
						value: month,
						onChange: (e) => setMonth(e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:col-span-2 flex items-end gap-2 flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								onClick: downloadPDF,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 mr-1" }), "Download Monthly PDF"]
							}),
							!finalized ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "secondary",
								onClick: () => {
									finalize(branchId, month, "admin");
									toast.success("Report finalized & locked");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "h-4 w-4 mr-1" }), "Finalize"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "secondary",
								onClick: () => {
									remove(branchId, month);
									toast.success("Report reopened");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { className: "h-4 w-4 mr-1" }), "Reopen"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => {
									bulkSeed(branchId, month);
									toast.success("Reset to seed statuses");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4 mr-1" }), "Reset to Seed"]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border p-4 bg-card space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-semibold",
					children: "Report Header"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
					children: [
						["factoryName", "Name of the Factory"],
						["address", "Address"],
						["dateOfOpening", "Date of opening / Commencement"],
						["factoryManager", "Factory Manager"],
						["natureOfIndustry", "Nature of Industry"],
						["hrHead", "UHRM / HR Head"],
						["factoryCoordinator", "Factory Co-ordinator"],
						["medicalAdvisor", "Factory Medical Advisor"],
						["sheRepresentative", "SHE Representative"],
						["dateOfObservation", "Date of Observation"]
					].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						disabled: finalized,
						value: report.header[key] ?? "",
						onChange: (e) => updateHeader(branchId, month, { [key]: e.target.value })
					})] }, key))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 sm:grid-cols-5 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border p-4 bg-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Complied"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-emerald-600",
							children: s.P
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border p-4 bg-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Delay / Default"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-amber-600",
							children: s.D
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border p-4 bg-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Not Complied"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-destructive",
							children: s.N
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border p-4 bg-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Not Applicable"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold",
							children: s.NA
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border p-4 bg-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Compliance Score"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-2xl font-bold text-primary",
							children: [s.score, "%"]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2 items-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex-1 min-w-[220px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4 absolute left-3 top-3 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							className: "pl-9",
							placeholder: "Search act / compliance / description…",
							value: q,
							onChange: (e) => setQ(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-1",
						children: [
							"all",
							"P",
							"D",
							"N",
							"NA"
						].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: statusFilter === k ? "default" : "outline",
							onClick: () => setStatusFilter(k),
							children: k === "all" ? "All" : STATUS_LABEL[k]
						}, k))
					}),
					finalized && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						variant: "secondary",
						className: "ml-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "h-3 w-3 mr-1" }),
							"Locked — ",
							new Date(report.finalizedAt).toLocaleString()
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border bg-card overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-h-[70vh] overflow-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "bg-muted/50 sticky top-0 z-10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "text-left",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-2 w-10",
										children: "#"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-2 w-56",
										children: "Act"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-2 w-52",
										children: "Compliance"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-2",
										children: "Description"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-2 w-36",
										children: "Status"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "p-2 w-64",
										children: "Remarks"
									})
								]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [filtered.map((it) => {
							const cur = report.items[it.n] ?? {
								status: it.seed,
								remarks: ""
							};
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t align-top hover:bg-muted/20",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-2 font-mono",
										children: it.n
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-2 text-muted-foreground",
										children: it.act
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-2 font-medium",
										children: it.compliance
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-2 text-muted-foreground",
										children: it.description
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-2",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											disabled: finalized,
											className: `h-8 w-full rounded-md border bg-background px-2 text-xs ${STATUS_COLOR[cur.status]}`,
											value: cur.status,
											onChange: (e) => updateItem(branchId, month, it.n, { status: e.target.value }),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "P",
													children: "Complied"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "D",
													children: "Delay / Default"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "N",
													children: "Not Complied"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "NA",
													children: "Not Applicable"
												})
											]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-2",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
											disabled: finalized,
											rows: 1,
											className: "min-h-[36px] text-xs",
											value: cur.remarks,
											onChange: (e) => updateItem(branchId, month, it.n, { remarks: e.target.value }),
											placeholder: "Remarks / evidence / reference…"
										})
									})
								]
							}, it.n);
						}), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							colSpan: 6,
							className: "p-8 text-center text-muted-foreground",
							children: "No items match the current filter."
						}) })] })]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-xs text-muted-foreground flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-3 w-3" }),
					"All changes are saved automatically to this browser for ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: branch?.name ?? "Head Office" }),
					" · ",
					monthLabel,
					"."
				]
			})
		]
	});
}
var PRIORITY_COLOR = {
	critical: "bg-destructive/15 text-destructive border-destructive/30",
	high: "bg-amber-500/15 text-amber-600 border-amber-500/30",
	medium: "bg-primary/10 text-primary border-primary/30",
	low: "bg-muted text-muted-foreground border-border"
};
var STATUS_ICON = {
	filed: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5" }),
	overdue: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3.5 w-3.5" }),
	due: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3.5 w-3.5" }),
	upcoming: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { className: "h-3.5 w-3.5" }),
	waived: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { className: "h-3.5 w-3.5" })
};
function CompliancePage() {
	const { employees, company } = useStore();
	const { profile, setProfile, reminderSettings, setReminderSettings, channels, setChannel, triggers, updateTrigger, resetTriggers, customForms, addCustomForm, updateCustomForm, deleteCustomForm, allForms, fireEvent, fileEvent, waiveEvent, effectiveStatus, addDocument, documents, deleteDocument, audit, addAudit, rules, toggleRule, deleteRule, knowledge, deleteKnowledge, formVersions, deleteFormVersion } = useCompliance();
	const forms = allForms();
	const applicability = (0, import_react.useMemo)(() => evaluateApplicability(profile), [profile]);
	const applicableKeys = (0, import_react.useMemo)(() => new Set(applicability.filter((a) => a.applicable).map((a) => a.key)), [applicability]);
	const enriched = (0, import_react.useMemo)(() => buildCalendar(profile, forms), [profile, forms]).map((e) => ({
		...e,
		status: effectiveStatus(e)
	}));
	const missing = (0, import_react.useMemo)(() => ({
		uan: employees.filter((e) => !e.uan).length,
		esic: employees.filter((e) => !e.esic).length,
		aadhaar: employees.filter((e) => !e.aadhaar).length,
		pan: employees.filter((e) => !e.pan).length
	}), [employees]);
	const risks = (0, import_react.useMemo)(() => analyzeRisks({
		profile,
		missingUAN: missing.uan,
		missingESIC: missing.esic,
		missingAadhaar: missing.aadhaar,
		missingPAN: missing.pan,
		expiredLicenses: documents.filter((d) => d.expiryDate && d.expiryDate < (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)).length,
		overdueFilings: enriched.filter((e) => e.status === "overdue").length,
		latePayrollRuns: 0,
		unapprovedOT: 0
	}), [
		profile,
		missing,
		documents,
		enriched
	]);
	const score = complianceScore(risks, enriched.filter((e) => e.status === "overdue").length);
	const dueToday = enriched.filter((e) => e.status === "due");
	const overdue = enriched.filter((e) => e.status === "overdue");
	const upcoming = enriched.filter((e) => e.status === "upcoming").slice(0, 20);
	const activeTriggers = triggers.filter((t) => t.enabled).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "font-display text-2xl font-semibold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-6 w-6 text-primary" }), " AI Compliance & Statutory Intelligence"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Event- and time-triggered filings, extensible government forms library, all settings-driven."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreDial, { value: score })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-6 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Applicable acts",
						value: applicability.filter((a) => a.applicable).length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Active triggers",
						value: activeTriggers
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Due today",
						value: dueToday.length,
						tone: dueToday.length ? "warn" : "ok"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Overdue",
						value: overdue.length,
						tone: overdue.length ? "bad" : "ok"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Upcoming (120d)",
						value: upcoming.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Risk findings",
						value: risks.length,
						tone: risks.some((r) => r.severity === "critical") ? "bad" : "ok"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "applicability",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
						className: "flex-wrap h-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "applicability",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardList, { className: "h-4 w-4 mr-1" }), "Applicability"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "master",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "h-4 w-4 mr-1" }), "Master Registry"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "monthly",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSpreadsheet, { className: "h-4 w-4 mr-1" }), "Monthly Report"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "triggers",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-4 w-4 mr-1" }), "Triggers"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "calendar",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { className: "h-4 w-4 mr-1" }), "Calendar"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "forms",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Library, { className: "h-4 w-4 mr-1" }), "Forms"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "repository",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { className: "h-4 w-4 mr-1" }), "Repository"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "risk",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileExclamationPoint, { className: "h-4 w-4 mr-1" }), "Risk"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "reminders",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4 mr-1" }), "Reminders"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "rules",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, { className: "h-4 w-4 mr-1" }), "Rule Engine"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "knowledge",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Library, { className: "h-4 w-4 mr-1" }), "Knowledge Base"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "versions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "h-4 w-4 mr-1" }), "Versions"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "audit",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4 mr-1" }), "Audit"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "master",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ComplianceMasterTab, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "monthly",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonthlyReportTab, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "applicability",
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border p-4 bg-card grid sm:grid-cols-3 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "State",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: profile.state,
										onChange: (e) => setProfile({ state: e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Industry",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										className: "h-10 w-full rounded-md border bg-background px-3 text-sm",
										value: profile.industry,
										onChange: (e) => setProfile({ industry: e.target.value }),
										children: [
											"manufacturing",
											"it_services",
											"retail",
											"logistics",
											"healthcare",
											"hospitality",
											"construction",
											"other"
										].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: i,
											children: i
										}, i))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Establishment",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										className: "h-10 w-full rounded-md border bg-background px-3 text-sm",
										value: profile.establishmentType,
										onChange: (e) => setProfile({ establishmentType: e.target.value }),
										children: [
											"factory",
											"shop",
											"office",
											"warehouse"
										].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: i,
											children: i
										}, i))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Employees",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: profile.employeeCount,
										onChange: (e) => setProfile({ employeeCount: +e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Women employees",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: profile.womenEmployees,
										onChange: (e) => setProfile({ womenEmployees: +e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Weekly hours",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: profile.weeklyHours,
										onChange: (e) => setProfile({ weeklyHours: +e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Apprentices",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: profile.apprentices,
										onChange: (e) => setProfile({ apprentices: +e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Contractor workers",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: profile.contractorCount ?? 0,
										onChange: (e) => setProfile({
											contractorCount: +e.target.value,
											contractLabour: +e.target.value > 0
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Consultants",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: profile.consultants,
										onChange: (e) => setProfile({ consultants: +e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sm:col-span-3 flex flex-wrap gap-3",
									children: [
										"shiftOperations",
										"hazardous",
										"manufacturing",
										"powerUsed",
										"seasonal",
										"interStateMigrants"
									].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: !!profile[k],
											onChange: (e) => setProfile({ [k]: e.target.checked })
										}), k]
									}, k))
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border bg-card overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
									className: "bg-muted/40 text-xs text-muted-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Act"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Authority"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Applicable"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Why"
										})
									] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: applicability.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "px-3 py-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-medium",
												children: a.short
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs text-muted-foreground",
												children: a.act
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs",
											children: a.authority
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2",
											children: a.applicable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												className: "bg-emerald-500/15 text-emerald-600",
												children: "Yes"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: "outline",
												children: "No"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs text-muted-foreground",
											children: a.reason || "—"
										})
									]
								}, a.key)) })]
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "triggers",
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-medium flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-4 w-4 text-primary" }), "Compliance Automation Triggers"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground",
								children: "Every event (join, exit, maternity, accident, wages paid, licence expiring…) can auto-generate the right statutory form and notify chosen channels. Time-bound filings still run via the Calendar."
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FireEventDialog, { onFire: (ev, subject, note) => {
									const ids = fireEvent(ev, {
										subject,
										by: "admin",
										note
									});
									toast.success(ids.length ? `Fired ${ev} → ${ids.length} form(s)` : `Trigger disabled for ${ev}`);
								} }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => {
										resetTriggers();
										toast.info("Triggers reset to defaults");
									},
									children: "Reset"
								})]
							})]
						}), triggers.map((t) => {
							const matching = t.forms.length ? t.forms : forms.filter((f) => f.eventTrigger === t.event).map((f) => f.id);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border bg-card p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start justify-between gap-3 flex-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 flex-wrap",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-medium",
														children: t.label
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														className: PRIORITY_COLOR[t.priority],
														children: t.priority
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
														variant: "outline",
														className: "text-xs",
														children: [matching.length, " form(s)"]
													}),
													t.autoFile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: "outline",
														className: "text-xs",
														children: "auto-file"
													})
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs text-muted-foreground mt-0.5",
												children: t.description
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-muted-foreground",
												children: "Enabled"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: t.enabled,
												onCheckedChange: (v) => updateTrigger(t.event, { enabled: v })
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid sm:grid-cols-4 gap-2 mt-3",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Fire offset (days)",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "number",
													value: t.daysOffset,
													onChange: (e) => updateTrigger(t.event, { daysOffset: +e.target.value })
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Escalate after (days)",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "number",
													value: t.escalateAfterDays ?? 0,
													onChange: (e) => updateTrigger(t.event, { escalateAfterDays: +e.target.value || void 0 })
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Priority",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
													className: "h-10 w-full rounded-md border bg-background px-3 text-sm",
													value: t.priority,
													onChange: (e) => updateTrigger(t.event, { priority: e.target.value }),
													children: [
														"low",
														"medium",
														"high",
														"critical"
													].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: p,
														children: p
													}, p))
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Auto-file on generation",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "h-10 flex items-center",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
														checked: t.autoFile,
														onCheckedChange: (v) => updateTrigger(t.event, { autoFile: v })
													})
												})
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-3 flex flex-wrap gap-3",
										children: Object.keys(t.channels).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex items-center gap-1.5 text-xs capitalize",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: t.channels[c],
												onChange: (e) => updateTrigger(t.event, { channels: {
													...t.channels,
													[c]: e.target.checked
												} })
											}), c]
										}, c))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											className: "text-xs",
											children: "Forms bound to this event"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap gap-1.5 mt-1",
											children: [forms.filter((f) => f.eventTrigger === t.event).map((f) => {
												const on = t.forms.length === 0 || t.forms.includes(f.id);
												return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => {
														const cur = t.forms.length === 0 ? forms.filter((x) => x.eventTrigger === t.event).map((x) => x.id) : t.forms;
														const next = on ? cur.filter((id) => id !== f.id) : Array.from(/* @__PURE__ */ new Set([...cur, f.id]));
														updateTrigger(t.event, { forms: next });
													},
													className: `text-xs border rounded px-2 py-0.5 ${on ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted text-muted-foreground"}`,
													children: f.formName
												}, f.id);
											}), forms.filter((f) => f.eventTrigger === t.event).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-muted-foreground",
												children: "No forms bound yet. Add a custom form under Forms tab with this event trigger."
											})]
										})]
									})
								]
							}, t.event);
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "calendar",
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted-foreground flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "h-3 w-3" }), " Next 120 days · applicable acts only."]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border bg-card overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
									className: "bg-muted/40 text-xs text-muted-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Due"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Form"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Frequency"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Priority"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Status"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
									] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [enriched.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 whitespace-nowrap",
											children: e.dueDate
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2",
											children: e.formName
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs uppercase text-muted-foreground",
											children: e.frequency.replace("_", " ")
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `text-xs border rounded px-2 py-0.5 ${PRIORITY_COLOR[e.priority]}`,
												children: e.priority
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "inline-flex items-center gap-1 text-xs",
												children: [STATUS_ICON[e.status], e.status]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-right",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileEventDialog, {
												event: e,
												onFile: (ref) => {
													fileEvent({
														eventId: e.id,
														formId: e.formId,
														reference: ref,
														filedBy: "admin"
													});
													toast.success("Filing recorded");
												},
												onWaive: (reason) => {
													waiveEvent(e.id, reason, "admin");
													toast.info("Waived");
												}
											})
										})
									]
								}, e.id)), enriched.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									colSpan: 6,
									className: "px-3 py-8 text-center text-sm text-muted-foreground",
									children: "No filings in horizon."
								}) })] })]
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "forms",
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border bg-card p-4 flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: "Government Form Library"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted-foreground",
								children: [
									forms.length,
									" forms loaded (",
									customForms.length,
									" custom). Add new forms as government releases them — no code change needed."
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddFormDialog, { onAdd: (f) => {
								addCustomForm(f);
								toast.success(`${f.formName} added to library`);
							} })]
						}), forms.filter((f) => f.moduleKey === "custom" || applicableKeys.has(f.moduleKey)).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormCard, {
							form: f,
							companyName: company.name,
							onGenerate: () => {
								const filename = generateComplianceFormPDF({
									form: f,
									company,
									profile,
									employees,
									period: (/* @__PURE__ */ new Date()).toISOString().slice(0, 7)
								});
								addDocument({
									name: filename,
									category: "Statutory",
									tags: [f.moduleKey],
									moduleKey: f.moduleKey,
									uploadedBy: "SWIFT AI",
									version: 1,
									status: "generated"
								});
								addAudit({
									by: "SWIFT AI",
									action: "generated",
									target: filename,
									reason: `Auto-fill: ${f.autoFillFields.join(", ") || "standard fields"}`
								});
								toast.success(`${f.formName} downloaded & logged in Repository.`);
							},
							onDelete: f.custom ? () => {
								deleteCustomForm(f.id);
								toast.info("Custom form removed");
							} : void 0,
							onEdit: f.custom ? (patch) => {
								updateCustomForm(f.id, patch);
								toast.success("Form updated");
							} : void 0
						}, f.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "repository",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border bg-card overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
									className: "bg-muted/40 text-xs text-muted-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Name"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Category"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Triggered by"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Status"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Version"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Uploaded"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
									] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [documents.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2",
											children: d.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs",
											children: d.category
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs",
											children: d.triggeredBy ?? "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: "outline",
												className: "text-xs",
												children: d.status ?? "generated"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "px-3 py-2 text-xs",
											children: ["v", d.version]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs",
											children: d.uploadedAt.slice(0, 10)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "px-3 py-2 text-right",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												onClick: () => {
													addAudit({
														by: "admin",
														action: "downloaded",
														target: d.name
													});
													toast.success("Recorded download");
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-3 w-3" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												onClick: () => deleteDocument(d.id, "admin"),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3 w-3" })
											})]
										})
									]
								}, d.id)), documents.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									colSpan: 7,
									className: "px-3 py-8 text-center text-sm text-muted-foreground",
									children: "Repository empty. Fire a trigger or generate a form to populate it."
								}) })] })]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "risk",
						className: "space-y-2",
						children: [risks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 text-emerald-500" }), "No active compliance risks detected."]
						}), risks.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border bg-card p-3 flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: r.area
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: r.impact
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-primary mt-1",
									children: ["→ ", r.recommendation]
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: PRIORITY_COLOR[r.severity],
									children: r.severity
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-muted-foreground mt-1",
									children: ["Score ", r.score]
								})]
							})]
						}, r.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "reminders",
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border bg-card p-4 grid sm:grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Reminder ladder (days before due)",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: reminderSettings.ladder.join(","),
										onChange: (e) => setReminderSettings({ ladder: e.target.value.split(",").map((n) => +n.trim()).filter((n) => !Number.isNaN(n)) })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Grace period (days after due)",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: reminderSettings.gracePeriodDays,
										onChange: (e) => setReminderSettings({ gracePeriodDays: +e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Final warning (days into grace)",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: reminderSettings.finalWarningDays,
										onChange: (e) => setReminderSettings({ finalWarningDays: +e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Escalate to",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: reminderSettings.escalateTo,
										onChange: (e) => setReminderSettings({ escalateTo: e.target.value }),
										placeholder: "role or email"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Quiet hours start",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "time",
										value: reminderSettings.quietHoursStart,
										onChange: (e) => setReminderSettings({ quietHoursStart: e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Quiet hours end",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "time",
										value: reminderSettings.quietHoursEnd,
										onChange: (e) => setReminderSettings({ quietHoursEnd: e.target.value })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-2 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: reminderSettings.escalateOnOverdue,
										onCheckedChange: (v) => setReminderSettings({ escalateOnOverdue: v })
									}), "Escalate on overdue"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-2 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: reminderSettings.weekendsOff,
										onCheckedChange: (v) => setReminderSettings({ weekendsOff: v })
									}), "Skip weekends"]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border bg-card p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "mb-2 block text-xs",
									children: "Global notification channels"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid sm:grid-cols-5 gap-3",
									children: Object.keys(channels).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 text-sm capitalize",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: channels[c],
											onChange: (e) => setChannel(c, e.target.checked)
										}), c]
									}, c))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground mt-2",
									children: "Per-trigger channel overrides configured under the Triggers tab."
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "rules",
						className: "space-y-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border bg-card p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "font-semibold",
									children: "Compliance Rule Engine"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Event · Time · Conditional · Manual rules with per-rule approval chain, escalation, and reminder ladder."
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "outline",
									children: [
										rules.filter((r) => r.active).length,
										"/",
										rules.length,
										" active"
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [rules.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "rounded-xl border p-3 bg-background/60",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex flex-wrap items-center gap-2",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "font-medium",
															children: r.name
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
															variant: "outline",
															className: "text-[10px]",
															children: [r.act, r.section ? ` · ${r.section}` : ""]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
															className: PRIORITY_COLOR[r.priority],
															children: r.priority
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
															variant: "outline",
															className: "text-[10px]",
															children: ["risk: ", r.risk]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
															variant: "outline",
															className: "text-[10px]",
															children: r.triggerTypes.join(" · ")
														})
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs text-muted-foreground mt-1 truncate",
													children: [
														"Events: ",
														r.triggerEvents.join(", ") || "—",
														" · Forms: ",
														r.generatedFormIds.length,
														" · Approvers: ",
														r.approvalChain.map((a) => a.role).join(" → ") || "—",
														r.escalation ? ` · Escalate after ${r.escalation.afterDays}d → ${r.escalation.toRole}` : ""
													]
												}),
												r.aiSuggestions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[11px] text-primary mt-1 flex items-center gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), r.aiSuggestions[0]]
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 shrink-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: r.active,
												onCheckedChange: (v) => toggleRule(r.id, v)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												onClick: () => {
													if (confirm(`Delete rule "${r.name}"?`)) deleteRule(r.id);
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
											})]
										})]
									})
								}, r.id)), rules.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm text-muted-foreground text-center py-8",
									children: "No rules defined."
								})]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "knowledge",
						className: "space-y-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border bg-card p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "font-semibold",
									children: "Compliance Knowledge Base"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Acts, sections, amendments, notifications, penalties, inspections & AI explanation."
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "outline",
									children: [knowledge.length, " acts indexed"]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3 md:grid-cols-2",
								children: [knowledge.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border p-3 bg-background/60 space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-medium",
												children: k.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[11px] text-muted-foreground",
												children: [
													k.department,
													k.state ? ` · ${k.state}` : " · Central",
													" · ",
													k.version,
													" · effective ",
													k.effectiveDate
												]
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: "outline",
												className: "text-[10px] capitalize",
												children: k.status
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted-foreground",
											children: k.aiExplanation
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[11px] flex flex-wrap gap-1",
											children: [k.sections.slice(0, 3).map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: "secondary",
												className: "text-[10px]",
												children: s.split("–")[0].trim()
											}, i)), k.requiredLicenses.map((l, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
												variant: "outline",
												className: "text-[10px]",
												children: ["📄 ", l]
											}, `l${i}`))]
										}),
										k.penalties[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[11px] text-destructive/80",
											children: [
												"⚠ ",
												k.penalties[0].violation,
												": ",
												k.penalties[0].penalty
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex justify-end",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												onClick: () => {
													if (confirm(`Delete "${k.name}" from knowledge base?`)) deleteKnowledge(k.id);
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
											})
										})
									]
								}, k.id)), knowledge.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-2 text-sm text-muted-foreground text-center py-8",
									children: "No acts indexed."
								})]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "versions",
						className: "space-y-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border bg-card p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "font-semibold",
									children: "Form Version Management"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Track PDF layouts, field mapping, validation & approval flow per form version."
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "outline",
									children: [formVersions.length, " versions"]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-xl border overflow-hidden",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
									className: "w-full text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
										className: "bg-muted/40 text-xs text-muted-foreground",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "text-left px-3 py-2",
												children: "Form"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "text-left px-3 py-2",
												children: "Version"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "text-left px-3 py-2",
												children: "Status"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "text-left px-3 py-2",
												children: "Effective"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "text-left px-3 py-2",
												children: "Change summary"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-3 py-2" })
										] })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [formVersions.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-3 py-2 font-mono text-xs",
												children: v.formId
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-3 py-2 text-xs",
												children: v.version
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-3 py-2 text-xs",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
													variant: "outline",
													className: "text-[10px] capitalize",
													children: v.status
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-3 py-2 text-xs",
												children: v.effectiveDate
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-3 py-2 text-xs text-muted-foreground truncate max-w-[280px]",
												children: v.changeSummary || "—"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-3 py-2 text-right",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
													size: "sm",
													variant: "ghost",
													onClick: () => {
														if (confirm("Delete this version?")) deleteFormVersion(v.id);
													},
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
												})
											})
										]
									}, v.id)), formVersions.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										colSpan: 6,
										className: "px-3 py-8 text-center text-sm text-muted-foreground",
										children: [
											"No versions recorded yet. Add a version via ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "useCompliance.getState().addFormVersion(...)" }),
											" or via the Government portal auto-sync scheduler."
										]
									}) })] })]
								})
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "audit",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border bg-card overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
									className: "bg-muted/40 text-xs text-muted-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "When"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Action"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Target"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "By"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left px-3 py-2",
											children: "Reason"
										})
									] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [audit.slice(0, 200).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs",
											children: new Date(a.at).toLocaleString()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs uppercase",
											children: a.action
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs",
											children: a.target
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs",
											children: a.by
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2 text-xs text-muted-foreground truncate max-w-[280px]",
											children: a.reason ?? "—"
										})
									]
								}, a.id)), audit.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									colSpan: 5,
									className: "px-3 py-8 text-center text-sm text-muted-foreground",
									children: "No compliance activity yet."
								}) })] })]
							})
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiComplianceChat, {
				profileHint: `${profile.state} · ${profile.industry} · ${profile.employeeCount} emp`,
				events: enriched,
				risks
			})
		]
	});
}
function Stat({ label, value, tone = "neutral" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border bg-card p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-2xl font-semibold ${tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : ""}`,
			children: value
		})]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
		className: "text-xs",
		children: label
	}), children] });
}
function ScoreDial({ value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border bg-card px-4 py-2 flex items-center gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-3xl font-bold ${value >= 80 ? "text-emerald-500" : value >= 60 ? "text-amber-500" : "text-destructive"}`,
			children: value
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-xs text-muted-foreground leading-tight",
			children: [
				"Compliance",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
				"Score"
			]
		})]
	});
}
function FileEventDialog({ event, onFile, onWaive }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [ref, setRef] = (0, import_react.useState)("");
	const [reason, setReason] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "outline",
				children: "Record"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: event.formName }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-muted-foreground",
						children: ["Due ", event.dueDate]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Reference / Challan #" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: ref,
						onChange: (e) => setRef(e.target.value),
						placeholder: "TRRN / SRN"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Or waive reason" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						value: reason,
						onChange: (e) => setReason(e.target.value),
						placeholder: "e.g. Not applicable this cycle"
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
				className: "gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					onClick: () => {
						if (!reason) return;
						onWaive(reason);
						setOpen(false);
					},
					children: "Waive"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => {
						if (!ref) return;
						onFile(ref);
						setOpen(false);
					},
					children: "Mark filed"
				})]
			})
		] })]
	});
}
function FormCard({ form, onGenerate, companyName, onDelete, onEdit }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border bg-card p-4 flex items-start justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "font-medium flex items-center gap-2 flex-wrap",
					children: [
						form.formName,
						form.custom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "outline",
							className: "text-xs",
							children: "custom"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "outline",
							className: "text-xs",
							children: form.moduleKey
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-muted-foreground",
					children: [
						form.purpose,
						" · ",
						form.frequency.replace("_", " "),
						form.eventTrigger ? ` · on ${form.eventTrigger}` : "",
						" · v",
						form.version
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-muted-foreground mt-1",
					children: ["Auto-fill: ", form.autoFillFields.join(", ") || "—"]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 flex-wrap justify-end",
			children: [
				form.mandatory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: "outline",
					className: "text-destructive border-destructive/30",
					children: "Mandatory"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: onGenerate,
					className: "bg-gradient-brand text-white",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3 mr-1" }),
						"Generate for ",
						companyName
					]
				}),
				onEdit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditFormDialog, {
					form,
					onSave: onEdit
				}),
				onDelete && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "ghost",
					onClick: onDelete,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3 w-3" })
				})
			]
		})]
	});
}
var MODULE_OPTIONS = [
	"factory_act",
	"shops_estab",
	"epf",
	"esi",
	"pt",
	"lwf",
	"wages",
	"min_wages",
	"bonus",
	"gratuity",
	"maternity",
	"equal_remun",
	"contract_labour",
	"migrant",
	"posh",
	"apprentices",
	"industrial_relations",
	"osh",
	"trade_licence",
	"fire_safety",
	"pollution",
	"building_plan",
	"custom"
];
var FREQ_OPTIONS = [
	"monthly",
	"quarterly",
	"half_yearly",
	"annual",
	"one_time",
	"on_event"
];
function AddFormDialog({ onAdd }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [f, setF] = (0, import_react.useState)({
		id: "custom-" + Math.random().toString(36).slice(2, 8),
		formName: "",
		moduleKey: "custom",
		purpose: "",
		frequency: "annual",
		dueMonth: 3,
		dueDay: 31,
		mandatory: true,
		requiresSignature: true,
		attachments: [],
		instructions: "",
		autoFillFields: [],
		version: "v1"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3 mr-1" }), "Add form"]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Add government / custom form" }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid sm:grid-cols-2 gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Form name",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: f.formName,
								onChange: (e) => setF({
									...f,
									formName: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Module",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "h-10 w-full rounded-md border bg-background px-3 text-sm",
								value: f.moduleKey,
								onChange: (e) => setF({
									...f,
									moduleKey: e.target.value
								}),
								children: MODULE_OPTIONS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: m,
									children: m
								}, m))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Purpose",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: f.purpose,
								onChange: (e) => setF({
									...f,
									purpose: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Frequency",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "h-10 w-full rounded-md border bg-background px-3 text-sm",
								value: f.frequency,
								onChange: (e) => setF({
									...f,
									frequency: e.target.value
								}),
								children: FREQ_OPTIONS.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: x,
									children: x
								}, x))
							})
						}),
						f.frequency === "monthly" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Due day of month",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: f.dueDayOfMonth ?? 15,
								onChange: (e) => setF({
									...f,
									dueDayOfMonth: +e.target.value
								})
							})
						}),
						(f.frequency === "annual" || f.frequency === "half_yearly" || f.frequency === "quarterly") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [f.frequency !== "quarterly" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Due month (1-12)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: f.dueMonth ?? 3,
								onChange: (e) => setF({
									...f,
									dueMonth: +e.target.value
								})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Due day",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: f.dueDay ?? 31,
								onChange: (e) => setF({
									...f,
									dueDay: +e.target.value
								})
							})
						})] }),
						f.frequency === "on_event" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Event trigger",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "h-10 w-full rounded-md border bg-background px-3 text-sm",
								value: f.eventTrigger ?? "custom_event",
								onChange: (e) => setF({
									...f,
									eventTrigger: e.target.value
								}),
								children: DEFAULT_TRIGGERS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: t.event,
									children: t.label
								}, t.event))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Version",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: f.version,
								onChange: (e) => setF({
									...f,
									version: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Auto-fill fields (comma)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: f.autoFillFields.join(","),
								onChange: (e) => setF({
									...f,
									autoFillFields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Attachments (comma)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: f.attachments.join(","),
								onChange: (e) => setF({
									...f,
									attachments: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "sm:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Instructions",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									value: f.instructions,
									onChange: (e) => setF({
										...f,
										instructions: e.target.value
									})
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: f.mandatory,
								onCheckedChange: (v) => setF({
									...f,
									mandatory: v
								})
							}), "Mandatory"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: f.requiresSignature,
								onCheckedChange: (v) => setF({
									...f,
									requiresSignature: v
								})
							}), "Requires signature"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => {
						if (!f.formName) {
							toast.error("Name required");
							return;
						}
						onAdd(f);
						setOpen(false);
					},
					children: "Add to library"
				}) })
			]
		})]
	});
}
function EditFormDialog({ form, onSave }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [f, setF] = (0, import_react.useState)(form);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: (o) => {
			setOpen(o);
			if (o) setF(form);
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "h-3 w-3" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-lg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Edit — ", form.formName] }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Form name",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: f.formName,
								onChange: (e) => setF({
									...f,
									formName: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Purpose",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: f.purpose,
								onChange: (e) => setF({
									...f,
									purpose: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Version",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: f.version,
								onChange: (e) => setF({
									...f,
									version: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Instructions",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								value: f.instructions,
								onChange: (e) => setF({
									...f,
									instructions: e.target.value
								})
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => {
						onSave({
							formName: f.formName,
							purpose: f.purpose,
							version: f.version,
							instructions: f.instructions
						});
						setOpen(false);
					},
					children: "Save"
				}) })
			]
		})]
	});
}
function FireEventDialog({ onFire }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [event, setEvent] = (0, import_react.useState)("employee_joined");
	const [subject, setSubject] = (0, import_react.useState)("");
	const [note, setNote] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				className: "bg-gradient-brand text-white",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, { className: "h-3 w-3 mr-1" }), "Fire event"]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Simulate compliance event" }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Event",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: "h-10 w-full rounded-md border bg-background px-3 text-sm",
							value: event,
							onChange: (e) => setEvent(e.target.value),
							children: DEFAULT_TRIGGERS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: t.event,
								children: t.label
							}, t.event))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Subject (employee / contractor / branch)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: subject,
							onChange: (e) => setSubject(e.target.value),
							placeholder: "e.g. Priya Sharma"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Note (optional)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: note,
							onChange: (e) => setNote(e.target.value)
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => {
					if (!subject) {
						toast.error("Subject required");
						return;
					}
					onFire(event, subject, note);
					setOpen(false);
				},
				children: "Fire trigger"
			}) })
		] })]
	});
}
function AiComplianceChat({ profileHint, events, risks }) {
	const [q, setQ] = (0, import_react.useState)("");
	const [a, setA] = (0, import_react.useState)("");
	function answer() {
		const query = q.toLowerCase();
		if (!query) return;
		const thisMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).slice(0, 7);
		let out = "";
		if (query.includes("this month") || query.includes("checklist")) {
			const rows = events.filter((e) => e.dueDate.startsWith(thisMonth));
			out = rows.length ? `${rows.length} filings this month:\n` + rows.map((r) => `• ${r.dueDate} — ${r.formName} (${r.status})`).join("\n") : "No filings this month.";
		} else if (query.includes("trigger")) out = `Triggers automate form generation on real events. Configure them under the Triggers tab — enable/disable, choose forms, offset, channels, escalation.`;
		else if (query.includes("expire") || query.includes("license")) out = "License expiry uses the license_expiring trigger (default: 60-day lead). Add expiry dates on upload to see them here.";
		else if (query.includes("uan")) out = "Employees missing UAN appear in the Risk tab under 'EPF – Missing UAN'.";
		else if (query.includes("risk")) out = risks.length ? risks.slice(0, 5).map((r) => `${r.severity.toUpperCase()} · ${r.area} — ${r.recommendation}`).join("\n") : "No active risks.";
		else if (query.includes("factory")) out = "Factory registration needs: site plan, list of workers, power sanction, occupier declaration, Form 1-A + Form 2.";
		else out = `Ask me: "what's due this month?", "how do triggers work?", "show risks". Context: ${profileHint}.`;
		setA(out);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border bg-card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 mb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium text-sm",
					children: "SWIFT AI Compliance Chat"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Try \"how do triggers work?\"",
					value: q,
					onChange: (e) => setQ(e.target.value),
					onKeyDown: (e) => e.key === "Enter" && answer()
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: answer,
					children: "Ask"
				})]
			}),
			a && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "mt-3 whitespace-pre-wrap text-sm bg-muted/40 rounded p-3",
				children: a
			})
		]
	});
}
//#endregion
export { CompliancePage as component };
