import { o as __toESM } from "../_runtime.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { t as require_jspdf_node_min } from "../_libs/jspdf.mjs";
import { t as autoTable } from "../_libs/jspdf-autotable.mjs";
import { t as require_lib } from "../_libs/qrcode.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/compliance-docs-store-DGgrXYQT.js
var import_jspdf_node_min = /* @__PURE__ */ __toESM(require_jspdf_node_min());
var import_lib = /* @__PURE__ */ __toESM(require_lib());
var COMPLIANCE_DOC_CATALOG = [
	...mkTnShops("Form B", "Register of Employment", "register", "monthly"),
	...mkTnShops("Form C", "Register of Wages", "register", "monthly"),
	...mkTnShops("Form D", "Register of Leave", "register", "annual"),
	...mkTnShops("Form H", "Notice of Weekly Holidays", "notice", "annual"),
	...mkTnShops("Form P", "Notice of Working Hours", "notice", "annual"),
	...mkTnShops("Form Q", "Register of Deductions", "register", "monthly"),
	...mkTnShops("Form R", "Register of Advances", "register", "monthly"),
	...mkTnShops("Form S", "Notice of Fines Levied", "notice", "monthly"),
	...mkTnShops("Form T", "Annual Return", "return", "annual", 31),
	mkFact("tn_fact_form_2", "Form 2", "Application for Factory Licence", "licence", "annual"),
	mkFact("tn_fact_form_3", "Form 3", "Grant / Renewal of Factory Licence", "licence", "annual"),
	mkFact("tn_fact_form_3a", "Form 3A", "Amendment of Factory Licence", "licence", "on_event"),
	mkFact("tn_fact_form_4", "Form 4", "Certificate of Stability", "certificate", "one_time"),
	mkFact("tn_fact_form_5", "Form 5", "Certificate of Fitness (Adult Worker)", "certificate", "on_event"),
	mkFact("tn_fact_form_6", "Form 6", "Notice of Occupation", "notice", "on_event"),
	mkFact("tn_fact_form_7", "Form 7", "Notice of Change of Manager", "notice", "on_event"),
	mkFact("tn_fact_form_8", "Form 8", "Register of Adult Workers", "register", "monthly"),
	mkFact("tn_fact_form_8a", "Form 8A", "Register of Young Workers", "register", "monthly"),
	mkFact("tn_fact_form_9", "Form 9", "Notice of Periods of Work — Adult", "notice", "annual"),
	mkFact("tn_fact_form_12", "Form 12", "Register of Leave with Wages", "register", "annual"),
	mkFact("tn_fact_form_14", "Form 14", "Leave with Wages Book", "register", "annual"),
	mkFact("tn_fact_form_15", "Form 15", "Register of Accidents & Dangerous Occurrences", "register", "on_event"),
	mkFact("tn_fact_form_18", "Form 18", "Notice of Accident / Dangerous Occurrence", "notice", "on_event"),
	mkFact("tn_fact_form_21", "Form 21", "Annual Return", "return", "annual", 31),
	mkFact("tn_fact_form_22", "Form 22", "Half-Yearly Return", "return", "half_yearly", 31),
	mkFact("tn_fact_form_25", "Form 25", "Muster Roll", "register", "monthly"),
	mkFact("tn_fact_form_25a", "Form 25A", "Register of Overtime", "register", "monthly"),
	mkFact("tn_fact_form_25b", "Form 25B", "Register of Wages", "register", "monthly"),
	mkFact("tn_fact_form_26", "Form 26", "Register of Inspection", "register", "on_event")
];
function mkTnShops(code, title, kind, freq, dueDay) {
	return [{
		id: `tn_shops_${code.toLowerCase().replace(/\s+/g, "_")}`,
		code,
		title,
		kind,
		act: "Tamil Nadu Shops & Establishments Act, 1947",
		authority: "Labour Department, Government of Tamil Nadu",
		purpose: `Statutory ${kind} under TN Shops & Establishments Act`,
		frequency: freq,
		dueDay,
		states: ["Tamil Nadu"],
		fields: baseFields(),
		tables: kind === "register" ? [defaultEmployeeTable(code)] : void 0,
		requiresSignature: true,
		requiresSeal: true,
		requiresQR: true,
		watermark: "TN SHOPS"
	}];
}
function mkFact(id, code, title, kind, freq, dueDay) {
	return {
		id,
		code,
		title,
		kind,
		act: "Tamil Nadu Factories Act, 1948",
		authority: "Directorate of Industrial Safety & Health, Tamil Nadu",
		purpose: `Statutory ${kind} under the Factories Act`,
		frequency: freq,
		dueDay,
		states: ["Tamil Nadu"],
		fields: baseFields(),
		tables: kind === "register" ? [defaultEmployeeTable(code)] : void 0,
		requiresSignature: true,
		requiresSeal: true,
		requiresQR: true,
		requiresBarcode: true,
		watermark: "FACTORIES ACT"
	};
}
function baseFields() {
	return [
		{
			label: "Establishment / Factory",
			source: "company.legalName"
		},
		{
			label: "Address",
			source: "company.address"
		},
		{
			label: "GSTIN",
			source: "company.gstin"
		},
		{
			label: "Branch",
			source: "branch.name",
			fallback: "Head Office"
		},
		{
			label: "Branch Address",
			source: "branch.address",
			fallback: "-"
		},
		{
			label: "Total Employees",
			source: "derived.headcount"
		},
		{
			label: "Total Male",
			source: "derived.male"
		},
		{
			label: "Total Female",
			source: "derived.female"
		},
		{
			label: "Period",
			source: "derived.period"
		},
		{
			label: "Reference No.",
			source: "derived.ref"
		},
		{
			label: "Prepared By",
			source: "input.preparedBy",
			editable: true
		},
		{
			label: "Designation",
			source: "input.preparedByDesignation",
			editable: true,
			fallback: "HR Manager"
		}
	];
}
function defaultEmployeeTable(code) {
	return {
		title: `${code} — Employee Details`,
		columns: [
			"Sl",
			"Emp Code",
			"Name",
			"Designation",
			"Department",
			"DOJ",
			"Basic (INR)",
			"Gross (INR)"
		],
		rowsSource: "employees",
		rowMap: {
			"Sl": "derived.rowIndex",
			"Emp Code": "employee.empCode",
			"Name": "employee.name",
			"Designation": "employee.designation",
			"Department": "employee.department",
			"DOJ": "employee.doj",
			"Basic (INR)": "employee.basic",
			"Gross (INR)": "derived.gross"
		}
	};
}
function autoFillFields(spec, ctx) {
	const b = (ctx.company.branches ?? []).find((x) => x.id === ctx.branchId);
	const emps = ctx.branchId ? ctx.employees.filter((e) => e.branchId === ctx.branchId) : ctx.employees;
	const male = emps.filter((e) => e.gender === "male").length;
	const female = emps.filter((e) => e.gender === "female").length;
	const derived = {
		headcount: String(emps.length),
		male: String(male),
		female: String(female),
		period: ctx.period ?? (/* @__PURE__ */ new Date()).toLocaleDateString("en-IN", {
			month: "long",
			year: "numeric"
		}),
		ref: `SWIFT/${spec.code.replace(/\s+/g, "")}/${Date.now().toString(36).toUpperCase()}`
	};
	const out = {};
	for (const f of spec.fields) out[f.label] = resolve(f.source, ctx, derived, b) ?? f.fallback ?? "";
	return out;
}
function resolve(src, ctx, derived, branch) {
	const [ns, ...rest] = src.split(".");
	const key = rest.join(".");
	if (ns === "company") return ctx.company[key];
	if (ns === "branch") return branch?.[key];
	if (ns === "derived") return derived[key];
	if (ns === "input") return ctx.inputs?.[key];
}
async function drawQR(text) {
	return import_lib.toDataURL(text, {
		width: 120,
		margin: 0
	});
}
function drawWatermark(doc, text) {
	const s = doc.internal.pageSize;
	const w = typeof s.getWidth === "function" ? s.getWidth() : s.width;
	const h = typeof s.getHeight === "function" ? s.getHeight() : s.height;
	doc.saveGraphicsState?.();
	doc.setFontSize(60);
	doc.setTextColor(230, 230, 230);
	doc.text(text, w / 2, h / 2, {
		align: "center",
		angle: 45
	});
	doc.restoreGraphicsState?.();
	doc.setTextColor(0, 0, 0);
}
async function renderComplianceDocPDF(spec, ctx, opts) {
	const doc = new import_jspdf_node_min.default({
		unit: "mm",
		format: "a4"
	});
	const PAGE_W = 210, PAGE_H = 297, ML = 14, MR = 14;
	const RIGHT = PAGE_W - MR;
	const CONTENT_W = PAGE_W - ML - MR;
	const BOTTOM_SAFE = PAGE_H - 20;
	const empsAll = ctx.employees ?? [];
	const emps = ctx.branchId ? empsAll.filter((e) => e.branchId === ctx.branchId) : empsAll;
	const values = autoFillFields(spec, ctx);
	const ref = values["Reference No."] || `SWIFT/${spec.code}/${Date.now()}`;
	if (spec.watermark) drawWatermark(doc, spec.watermark);
	doc.setFillColor(20, 160, 170);
	doc.rect(0, 0, PAGE_W, 26, "F");
	doc.setTextColor(255, 255, 255);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.text("SWIFT AI Compliance", ML, 12);
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.text(doc.splitTextToSize(spec.act, CONTENT_W - 90)[0] ?? spec.act, ML, 18);
	doc.setFontSize(13);
	doc.setFont("helvetica", "bold");
	doc.text(`${spec.code} — ${spec.title}`, RIGHT, 12, { align: "right" });
	doc.setFontSize(8);
	doc.setFont("helvetica", "normal");
	doc.text(spec.authority ?? "", RIGHT, 18, { align: "right" });
	doc.setTextColor(0, 0, 0);
	doc.setFontSize(9);
	doc.text(`Ref: ${ref}`, ML, 32);
	doc.text(`Version: v${opts?.version ?? 1}`, 90, 32);
	doc.text(`Generated: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN")}`, RIGHT, 32, { align: "right" });
	const rows = [];
	const fs = spec.fields;
	for (let i = 0; i < fs.length; i += 2) {
		const a = fs[i], b = fs[i + 1];
		rows.push([
			{
				content: a.label,
				styles: {
					fontStyle: "bold",
					fillColor: [
						240,
						250,
						251
					]
				}
			},
			values[a.label] ?? "-",
			b ? {
				content: b.label,
				styles: {
					fontStyle: "bold",
					fillColor: [
						240,
						250,
						251
					]
				}
			} : "",
			b ? values[b.label] ?? "-" : ""
		]);
	}
	autoTable(doc, {
		startY: 38,
		margin: {
			left: ML,
			right: MR
		},
		theme: "grid",
		styles: {
			fontSize: 8.5,
			cellPadding: 2,
			overflow: "linebreak"
		},
		body: rows,
		columnStyles: {
			0: {
				cellWidth: 42,
				fontStyle: "bold"
			},
			1: { cellWidth: (CONTENT_W - 84) / 2 },
			2: {
				cellWidth: 42,
				fontStyle: "bold"
			},
			3: { cellWidth: (CONTENT_W - 84) / 2 }
		}
	});
	const hraPct = ctx.company.hraPct ?? 40;
	const specialPct = ctx.company.specialPct ?? 20;
	const grossOf = (e) => Math.round((e.basic || 0) * (1 + hraPct / 100 + specialPct / 100));
	let y = doc.lastAutoTable.finalY + 6;
	for (const t of spec.tables ?? []) {
		const body = emps.map((e, idx) => t.columns.map((c) => {
			const src = t.rowMap[c];
			if (src === "derived.rowIndex") return String(idx + 1);
			if (src === "derived.gross") return String(grossOf(e));
			const [ns, ...rest] = src.split(".");
			if (ns === "employee") return String(e[rest.join(".")] ?? "-");
			return "-";
		}));
		if (y > BOTTOM_SAFE - 30) {
			doc.addPage();
			y = 20;
			if (spec.watermark) drawWatermark(doc, spec.watermark);
		}
		autoTable(doc, {
			startY: y,
			margin: {
				left: ML,
				right: MR
			},
			theme: "striped",
			styles: {
				fontSize: 7.5,
				cellPadding: 1.5,
				overflow: "linebreak"
			},
			head: [t.columns],
			body,
			headStyles: {
				fillColor: [
					20,
					160,
					170
				],
				textColor: 255
			}
		});
		y = doc.lastAutoTable.finalY + 6;
	}
	if (opts?.approvals?.length) {
		if (y > BOTTOM_SAFE - 30) {
			doc.addPage();
			y = 20;
		}
		autoTable(doc, {
			startY: y,
			margin: {
				left: ML,
				right: MR
			},
			theme: "grid",
			styles: { fontSize: 8 },
			head: [[
				"Approval Stage",
				"By",
				"Role",
				"At"
			]],
			body: opts.approvals.map((a, i) => [
				`Stage ${i + 1}`,
				a.by,
				a.role,
				a.at
			]),
			headStyles: { fillColor: [
				230,
				245,
				246
			] }
		});
		y = doc.lastAutoTable.finalY + 6;
	}
	if (y > BOTTOM_SAFE - 45) {
		doc.addPage();
		y = 20;
	}
	doc.setFontSize(10);
	doc.text(`For ${ctx.company.legalName}`, ML, y + 6);
	doc.text("_________________________", ML, y + 24);
	doc.text("Authorised Signatory", ML, y + 29);
	if (spec.requiresSeal) {
		doc.setDrawColor(20, 160, 170);
		doc.circle(80, y + 22, 10);
		doc.setFontSize(7);
		doc.text("Company Seal", 80, y + 22, { align: "center" });
	}
	if (spec.requiresQR) try {
		const qr = await drawQR(`${ref}|${spec.code}|${ctx.company.legalName}|v${opts?.version ?? 1}`);
		doc.addImage(qr, "PNG", RIGHT - 30, y + 8, 30, 30);
		doc.setFontSize(7);
		doc.text("Scan to verify", RIGHT - 15, y + 41, { align: "center" });
	} catch {}
	if (spec.requiresBarcode) {
		doc.setFontSize(7);
		doc.text(ref, ML, 278);
		const barCount = Math.min(ref.length, Math.floor(CONTENT_W / 1.8));
		for (let i = 0; i < barCount; i++) {
			const x = ML + i * 1.8;
			doc.setLineWidth(i % 3 === 0 ? .6 : .2);
			doc.line(x, 273, x, 276);
		}
	}
	const pages = doc.getNumberOfPages();
	for (let i = 1; i <= pages; i++) {
		doc.setPage(i);
		doc.setFontSize(7);
		doc.setTextColor(140, 140, 140);
		doc.text(`SWIFT AI Compliance · ${spec.act} · ${ref}`, ML, 289);
		doc.text(`Page ${i} of ${pages}`, RIGHT, 289, { align: "right" });
		doc.setTextColor(0, 0, 0);
	}
	const filename = `${spec.code.replace(/\s+/g, "_")}_${spec.title.replace(/\s+/g, "_")}_v${opts?.version ?? 1}.pdf`;
	return {
		blob: doc.output("blob"),
		filename,
		ref
	};
}
function findDocsByQuery(q) {
	const t = q.toLowerCase();
	return COMPLIANCE_DOC_CATALOG.filter((d) => d.code.toLowerCase().includes(t) || d.title.toLowerCase().includes(t) || d.id.toLowerCase().includes(t) || d.act.toLowerCase().includes(t) || d.kind.toLowerCase().includes(t));
}
function parseComplianceCommand(text) {
	const t = text.toLowerCase().trim();
	if (!/generate|create|produce|prepare|download/.test(t) && !/register|form|return|notice|licence/.test(t)) return [];
	if (/all\s+pending|all\s+monthly|all\s+statutory/.test(t)) return COMPLIANCE_DOC_CATALOG.filter((d) => d.frequency === "monthly");
	if (/annual\s+return/.test(t)) return COMPLIANCE_DOC_CATALOG.filter((d) => d.kind === "return" && d.frequency === "annual");
	if (/half[-\s]?yearly/.test(t)) return COMPLIANCE_DOC_CATALOG.filter((d) => d.frequency === "half_yearly");
	if (/wage\s+register/.test(t)) return findDocsByQuery("wage");
	if (/muster/.test(t)) return findDocsByQuery("muster");
	if (/accident/.test(t)) return findDocsByQuery("accident");
	const formMatch = t.match(/form\s+([0-9]+[a-z]?)/i);
	if (formMatch) return findDocsByQuery(`Form ${formMatch[1].toUpperCase()}`);
	return findDocsByQuery(t.replace(/generate|create|prepare|download/gi, "").trim());
}
var useComplianceDocs = create()(persist((set, get) => ({
	docs: [],
	audit: [],
	archive: (d) => {
		const prior = get().docs.filter((x) => x.specId === d.specId);
		const version = d.version ?? prior.length + 1;
		const doc = {
			...d,
			id: `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
			version,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		set((s) => ({
			docs: [doc, ...s.docs],
			audit: [{
				id: `a_${Date.now().toString(36)}`,
				at: (/* @__PURE__ */ new Date()).toISOString(),
				actor: d.createdBy,
				action: "generate",
				target: `${d.code} v${version}`,
				meta: { ref: d.ref }
			}, ...s.audit]
		}));
		return doc;
	},
	signDoc: (id, by, role, note) => set((s) => ({
		docs: s.docs.map((d) => d.id === id ? {
			...d,
			signed: true,
			approvals: [...d.approvals, {
				by,
				role,
				at: (/* @__PURE__ */ new Date()).toISOString(),
				note
			}]
		} : d),
		audit: [{
			id: `a_${Date.now().toString(36)}`,
			at: (/* @__PURE__ */ new Date()).toISOString(),
			actor: by,
			action: "sign",
			target: id,
			meta: { role }
		}, ...s.audit]
	})),
	remove: (id) => set((s) => ({
		docs: s.docs.filter((d) => d.id !== id),
		audit: [{
			id: `a_${Date.now().toString(36)}`,
			at: (/* @__PURE__ */ new Date()).toISOString(),
			actor: "system",
			action: "delete",
			target: id
		}, ...s.audit]
	})),
	log: (a) => set((s) => ({ audit: [{
		...a,
		id: `a_${Date.now().toString(36)}`,
		at: (/* @__PURE__ */ new Date()).toISOString()
	}, ...s.audit].slice(0, 2e3) }))
}), { name: "swift-compliance-docs" }));
async function blobToDataUrl(b) {
	return new Promise((res, rej) => {
		const r = new FileReader();
		r.onload = () => res(r.result);
		r.onerror = () => rej(r.error);
		r.readAsDataURL(b);
	});
}
//#endregion
export { renderComplianceDocPDF as a, parseComplianceCommand as i, blobToDataUrl as n, useComplianceDocs as o, findDocsByQuery as r, COMPLIANCE_DOC_CATALOG as t };
