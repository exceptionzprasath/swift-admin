// SWIFT AI — Compliance Document Automation Platform
// Config-driven catalog of Government Forms, Registers, Returns, Notices, Licences,
// Letters, Certificates, Inspection/Medical/Audit Reports, Declarations, Agreements.
// Everything auto-fills from Company / Branch / Employee / Attendance / Payroll / Leave
// / Assets / Visitors / Training / Medical / Government masters. Unlimited future
// forms — just push a new spec into COMPLIANCE_DOC_CATALOG (or via Super Admin at runtime).

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import type { Company, Employee } from "./store";

export type ComplianceDocKind =
  | "form" | "register" | "return" | "notice" | "licence"
  | "letter" | "certificate" | "report" | "declaration" | "agreement";

export type ComplianceDocFrequency =
  | "on_event" | "daily" | "weekly" | "monthly" | "quarterly"
  | "half_yearly" | "annual" | "one_time";

export type FieldSource =
  | `company.${string}` | `branch.${string}` | `employee.${string}`
  | `attendance.${string}` | `payroll.${string}` | `leave.${string}`
  | `asset.${string}` | `visitor.${string}` | `training.${string}`
  | `medical.${string}` | `licence.${string}` | `master.${string}`
  | `derived.${string}` | `input.${string}`;

export type ComplianceDocField = {
  label: string;
  source: FieldSource;
  fallback?: string;
  editable?: boolean;
};

export type ComplianceDocTable = {
  title: string;
  columns: string[];
  rowsSource: string;          // e.g. "employees", "attendance.month", "leave.balance"
  rowMap: Record<string, FieldSource>; // colName -> source
};

export type ComplianceDocSpec = {
  id: string;                  // stable key e.g. "tn_fact_form_25"
  code: string;                // "Form 25", "Register B", ...
  title: string;
  kind: ComplianceDocKind;
  act: string;                 // "Tamil Nadu Factories Act, 1948"
  rule?: string;
  authority?: string;          // "Directorate of Industrial Safety & Health"
  purpose?: string;
  frequency: ComplianceDocFrequency;
  dueDay?: number;
  states?: string[];
  fields: ComplianceDocField[];
  tables?: ComplianceDocTable[];
  requiresSignature?: boolean;
  requiresSeal?: boolean;
  requiresQR?: boolean;
  requiresBarcode?: boolean;
  watermark?: string;
};

// ============================================================
// CATALOG — Tamil Nadu Shops (B/C/D/H/P/Q/R/S/T) + Factories
// (2/3/3A/4/5/6/7/8/8A/9/12/14/15/18/21/22/25/25A/25B/26)
// Fully extensible; add more without any code change.
// ============================================================

export const COMPLIANCE_DOC_CATALOG: ComplianceDocSpec[] = [
  // ---------- Tamil Nadu Shops & Establishments Act ----------
  ...mkTnShops("Form B", "Register of Employment", "register", "monthly"),
  ...mkTnShops("Form C", "Register of Wages", "register", "monthly"),
  ...mkTnShops("Form D", "Register of Leave", "register", "annual"),
  ...mkTnShops("Form H", "Notice of Weekly Holidays", "notice", "annual"),
  ...mkTnShops("Form P", "Notice of Working Hours", "notice", "annual"),
  ...mkTnShops("Form Q", "Register of Deductions", "register", "monthly"),
  ...mkTnShops("Form R", "Register of Advances", "register", "monthly"),
  ...mkTnShops("Form S", "Notice of Fines Levied", "notice", "monthly"),
  ...mkTnShops("Form T", "Annual Return", "return", "annual", 31),

  // ---------- Tamil Nadu Factories Act, 1948 ----------
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
  mkFact("tn_fact_form_26", "Form 26", "Register of Inspection", "register", "on_event"),
];

function mkTnShops(code: string, title: string, kind: ComplianceDocKind, freq: ComplianceDocFrequency, dueDay?: number): ComplianceDocSpec[] {
  return [{
    id: `tn_shops_${code.toLowerCase().replace(/\s+/g, "_")}`,
    code, title,
    kind,
    act: "Tamil Nadu Shops & Establishments Act, 1947",
    authority: "Labour Department, Government of Tamil Nadu",
    purpose: `Statutory ${kind} under TN Shops & Establishments Act`,
    frequency: freq, dueDay,
    states: ["Tamil Nadu"],
    fields: baseFields(),
    tables: kind === "register" ? [defaultEmployeeTable(code)] : undefined,
    requiresSignature: true, requiresSeal: true, requiresQR: true,
    watermark: "TN SHOPS",
  }];
}

function mkFact(id: string, code: string, title: string, kind: ComplianceDocKind, freq: ComplianceDocFrequency, dueDay?: number): ComplianceDocSpec {
  return {
    id, code, title, kind,
    act: "Tamil Nadu Factories Act, 1948",
    authority: "Directorate of Industrial Safety & Health, Tamil Nadu",
    purpose: `Statutory ${kind} under the Factories Act`,
    frequency: freq, dueDay,
    states: ["Tamil Nadu"],
    fields: baseFields(),
    tables: kind === "register" ? [defaultEmployeeTable(code)] : undefined,
    requiresSignature: true, requiresSeal: true, requiresQR: true, requiresBarcode: true,
    watermark: "FACTORIES ACT",
  };
}

function baseFields(): ComplianceDocField[] {
  return [
    { label: "Establishment / Factory", source: "company.legalName" },
    { label: "Address", source: "company.address" },
    { label: "GSTIN", source: "company.gstin" },
    { label: "Branch", source: "branch.name", fallback: "Head Office" },
    { label: "Branch Address", source: "branch.address", fallback: "-" },
    { label: "Total Employees", source: "derived.headcount" },
    { label: "Total Male", source: "derived.male" },
    { label: "Total Female", source: "derived.female" },
    { label: "Period", source: "derived.period" },
    { label: "Reference No.", source: "derived.ref" },
    { label: "Prepared By", source: "input.preparedBy", editable: true },
    { label: "Designation", source: "input.preparedByDesignation", editable: true, fallback: "HR Manager" },
  ];
}

function defaultEmployeeTable(code: string): ComplianceDocTable {
  return {
    title: `${code} — Employee Details`,
    columns: ["Sl", "Emp Code", "Name", "Designation", "Department", "DOJ", "Basic (INR)", "Gross (INR)"],
    rowsSource: "employees",
    rowMap: {
      "Sl": "derived.rowIndex",
      "Emp Code": "employee.empCode",
      "Name": "employee.name",
      "Designation": "employee.designation",
      "Department": "employee.department",
      "DOJ": "employee.doj",
      "Basic (INR)": "employee.basic",
      "Gross (INR)": "derived.gross",
    },
  };
}

// ============================================================
// Auto-fill resolver
// ============================================================

export type AutoFillContext = {
  company: Company;
  employees: Employee[];
  branchId?: string;
  period?: string;
  inputs?: Record<string, string>;
};

export function autoFillFields(spec: ComplianceDocSpec, ctx: AutoFillContext): Record<string, string> {
  const b = (ctx.company.branches ?? []).find((x) => x.id === ctx.branchId);
  const emps = ctx.branchId ? ctx.employees.filter((e) => (e as any).branchId === ctx.branchId) : ctx.employees;
  const male = emps.filter((e) => (e as any).gender === "male").length;
  const female = emps.filter((e) => (e as any).gender === "female").length;
  const derived: Record<string, string> = {
    headcount: String(emps.length),
    male: String(male),
    female: String(female),
    period: ctx.period ?? new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    ref: `SWIFT/${spec.code.replace(/\s+/g, "")}/${Date.now().toString(36).toUpperCase()}`,
  };
  const out: Record<string, string> = {};
  for (const f of spec.fields) {
    out[f.label] = resolve(f.source, ctx, derived, b) ?? f.fallback ?? "";
  }
  return out;
}

function resolve(src: string, ctx: AutoFillContext, derived: Record<string, string>, branch: any): string | undefined {
  const [ns, ...rest] = src.split(".");
  const key = rest.join(".");
  if (ns === "company") return (ctx.company as any)[key];
  if (ns === "branch") return branch?.[key];
  if (ns === "derived") return derived[key];
  if (ns === "input") return ctx.inputs?.[key];
  return undefined;
}

// ============================================================
// PDF renderer — universal
// ============================================================

async function drawQR(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 120, margin: 0 });
}

function drawWatermark(doc: jsPDF, text: string) {
  const s: any = doc.internal.pageSize;
  const w = typeof s.getWidth === "function" ? s.getWidth() : s.width;
  const h = typeof s.getHeight === "function" ? s.getHeight() : s.height;
  doc.saveGraphicsState?.();
  doc.setFontSize(60);
  doc.setTextColor(230, 230, 230);
  (doc as any).text(text, w / 2, h / 2, { align: "center", angle: 45 });
  doc.restoreGraphicsState?.();
  doc.setTextColor(0, 0, 0);
}

export async function renderComplianceDocPDF(
  spec: ComplianceDocSpec,
  ctx: AutoFillContext,
  opts?: { version?: number; approvals?: { by: string; role: string; at: string }[] },
): Promise<{ blob: Blob; filename: string; ref: string }> {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); // 210 x 297 mm
  const PAGE_W = 210, PAGE_H = 297, ML = 14, MR = 14;
  const RIGHT = PAGE_W - MR; // 196
  const CONTENT_W = PAGE_W - ML - MR; // 182
  const BOTTOM_SAFE = PAGE_H - 20; // 277

  // Branch-filtered employees (so registers reflect selected branch)
  const empsAll = ctx.employees ?? [];
  const emps = ctx.branchId ? empsAll.filter((e) => (e as any).branchId === ctx.branchId) : empsAll;

  const values = autoFillFields(spec, ctx);
  const ref = values["Reference No."] || `SWIFT/${spec.code}/${Date.now()}`;

  if (spec.watermark) drawWatermark(doc, spec.watermark);

  // Header band
  doc.setFillColor(20, 160, 170);
  doc.rect(0, 0, PAGE_W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("SWIFT AI Compliance", ML, 12);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(spec.act, CONTENT_W - 90)[0] ?? spec.act, ML, 18);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(`${spec.code} — ${spec.title}`, RIGHT, 12, { align: "right" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(spec.authority ?? "", RIGHT, 18, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // Meta row
  doc.setFontSize(9);
  doc.text(`Ref: ${ref}`, ML, 32);
  doc.text(`Version: v${opts?.version ?? 1}`, ML + 76, 32);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, RIGHT, 32, { align: "right" });

  // Fields table (2-col grid)
  const rows: any[] = [];
  const fs = spec.fields;
  for (let i = 0; i < fs.length; i += 2) {
    const a = fs[i], b = fs[i + 1];
    rows.push([
      { content: a.label, styles: { fontStyle: "bold", fillColor: [240, 250, 251] } },
      values[a.label] ?? "-",
      b ? { content: b.label, styles: { fontStyle: "bold", fillColor: [240, 250, 251] } } : "",
      b ? (values[b.label] ?? "-") : "",
    ]);
  }
  autoTable(doc, {
    startY: 38, margin: { left: ML, right: MR },
    theme: "grid", styles: { fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
    body: rows,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: (CONTENT_W - 84) / 2 },
      2: { cellWidth: 42, fontStyle: "bold" },
      3: { cellWidth: (CONTENT_W - 84) / 2 },
    },
  });

  // Data tables (registers) — branch-filtered, real basic/gross via payroll pct
  const hraPct = (ctx.company as any).hraPct ?? 40;
  const specialPct = (ctx.company as any).specialPct ?? 20;
  const grossOf = (e: any) => Math.round((e.basic || 0) * (1 + hraPct / 100 + specialPct / 100));

  let y = (doc as any).lastAutoTable.finalY + 6;
  for (const t of spec.tables ?? []) {
    const body = emps.map((e, idx) => t.columns.map((c) => {
      const src = t.rowMap[c];
      if (src === "derived.rowIndex") return String(idx + 1);
      if (src === "derived.gross") return String(grossOf(e));
      const [ns, ...rest] = src.split(".");
      if (ns === "employee") return String((e as any)[rest.join(".")] ?? "-");
      return "-";
    }));
    if (y > BOTTOM_SAFE - 30) { doc.addPage(); y = 20; if (spec.watermark) drawWatermark(doc, spec.watermark); }
    autoTable(doc, {
      startY: y, margin: { left: ML, right: MR },
      theme: "striped", styles: { fontSize: 7.5, cellPadding: 1.5, overflow: "linebreak" },
      head: [t.columns], body,
      headStyles: { fillColor: [20, 160, 170], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Approvals
  if (opts?.approvals?.length) {
    if (y > BOTTOM_SAFE - 30) { doc.addPage(); y = 20; }
    autoTable(doc, {
      startY: y, margin: { left: ML, right: MR },
      theme: "grid", styles: { fontSize: 8 },
      head: [["Approval Stage", "By", "Role", "At"]],
      body: opts.approvals.map((a, i) => [`Stage ${i + 1}`, a.by, a.role, a.at]),
      headStyles: { fillColor: [230, 245, 246] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Signature block — need ~40mm vertical room; move to new page if short
  if (y > BOTTOM_SAFE - 45) { doc.addPage(); y = 20; }
  doc.setFontSize(10);
  doc.text(`For ${ctx.company.legalName}`, ML, y + 6);
  doc.text("_________________________", ML, y + 24);
  doc.text("Authorised Signatory", ML, y + 29);
  if (spec.requiresSeal) {
    doc.setDrawColor(20, 160, 170);
    doc.circle(ML + 66, y + 22, 10);
    doc.setFontSize(7); doc.text("Company Seal", ML + 66, y + 22, { align: "center" });
  }

  // QR — positioned relative to signature block y
  if (spec.requiresQR) {
    try {
      const qr = await drawQR(`${ref}|${spec.code}|${ctx.company.legalName}|v${opts?.version ?? 1}`);
      doc.addImage(qr, "PNG", RIGHT - 30, y + 8, 30, 30);
      doc.setFontSize(7); doc.text("Scan to verify", RIGHT - 15, y + 41, { align: "center" });
    } catch { /* ignore */ }
  }

  // Barcode (bar strip above footer)
  if (spec.requiresBarcode) {
    doc.setFontSize(7);
    doc.text(ref, ML, 278);
    const barCount = Math.min(ref.length, Math.floor(CONTENT_W / 1.8));
    for (let i = 0; i < barCount; i++) {
      const x = ML + i * 1.8;
      doc.setLineWidth((i % 3 === 0) ? 0.6 : 0.2);
      doc.line(x, 273, x, 276);
    }
  }

  // Footer (consistent ref across all pages)
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.text(`SWIFT AI Compliance · ${spec.act} · ${ref}`, ML, 289);
    doc.text(`Page ${i} of ${pages}`, RIGHT, 289, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  const filename = `${spec.code.replace(/\s+/g, "_")}_${spec.title.replace(/\s+/g, "_")}_v${opts?.version ?? 1}.pdf`;
  return { blob: doc.output("blob"), filename, ref };
}


// ============================================================
// Bulk generator + AI chat command parser
// ============================================================

export type BulkResult = { spec: ComplianceDocSpec; blob: Blob; filename: string; ref: string };

export async function generateManyDocs(
  specs: ComplianceDocSpec[],
  ctx: AutoFillContext,
): Promise<BulkResult[]> {
  const out: BulkResult[] = [];
  for (const s of specs) {
    const r = await renderComplianceDocPDF(s, ctx);
    out.push({ spec: s, ...r });
  }
  return out;
}

export function findDocsByQuery(q: string): ComplianceDocSpec[] {
  const t = q.toLowerCase();
  return COMPLIANCE_DOC_CATALOG.filter((d) =>
    d.code.toLowerCase().includes(t) ||
    d.title.toLowerCase().includes(t) ||
    d.id.toLowerCase().includes(t) ||
    d.act.toLowerCase().includes(t) ||
    d.kind.toLowerCase().includes(t),
  );
}

// Recognises "generate Form 12", "generate wage register", "generate annual return",
// "generate all monthly statutory documents", etc.
export function parseComplianceCommand(text: string): ComplianceDocSpec[] {
  const t = text.toLowerCase().trim();
  if (!/generate|create|produce|prepare|download/.test(t) &&
      !/register|form|return|notice|licence/.test(t)) return [];

  if (/all\s+pending|all\s+monthly|all\s+statutory/.test(t)) {
    return COMPLIANCE_DOC_CATALOG.filter((d) => d.frequency === "monthly");
  }
  if (/annual\s+return/.test(t)) return COMPLIANCE_DOC_CATALOG.filter((d) => d.kind === "return" && d.frequency === "annual");
  if (/half[-\s]?yearly/.test(t)) return COMPLIANCE_DOC_CATALOG.filter((d) => d.frequency === "half_yearly");
  if (/wage\s+register/.test(t)) return findDocsByQuery("wage");
  if (/muster/.test(t)) return findDocsByQuery("muster");
  if (/accident/.test(t)) return findDocsByQuery("accident");

  const formMatch = t.match(/form\s+([0-9]+[a-z]?)/i);
  if (formMatch) return findDocsByQuery(`Form ${formMatch[1].toUpperCase()}`);

  return findDocsByQuery(t.replace(/generate|create|prepare|download/gi, "").trim());
}
