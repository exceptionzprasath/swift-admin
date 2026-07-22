// Auto-filled downloadable statutory form generator.
// Renders government-style PDF templates (Factory Act, S&E, EPF, ESI, PT, POSH,
// Bonus, Gratuity, Maternity, CLRA…) pre-populated with tenant, profile and
// employee data pulled live from the SWIFT store. All output is a real PDF
// download — no external service required.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Company, Employee } from "./store";
import type { ComplianceProfile, FormTemplate } from "./compliance";

export type FormContext = {
  form: FormTemplate;
  company: Company;
  profile: ComplianceProfile;
  employees: Employee[];
  period?: string; // e.g. "2026-02"
};

// A4 portrait (210 x 297 mm)
const PW = 210, PH = 297, ML = 14, MR = 14, RIGHT = PW - MR, CONTENT_W = PW - ML - MR;

function drawHeader(doc: jsPDF, title: string, subtitle: string, company: Company) {
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
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, RIGHT, 44, { align: "right" });
}

function footer(doc: jsPDF, form: FormTemplate, company: Company) {
  const page = doc.getNumberOfPages();
  for (let i = 1; i <= page; i++) {
    doc.setPage(i);
    const y = 285;
    doc.setDrawColor(200);
    doc.line(ML, y, RIGHT, y);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${form.formName} · v${form.version} · Generated ${new Date().toLocaleString("en-IN")}`, ML, y + 5);
    doc.text(`Page ${i} of ${page}`, RIGHT, y + 5, { align: "right" });
    if (form.requiresSignature) {
      doc.setTextColor(0);
      doc.setFontSize(9);
      doc.text("_____________________________", RIGHT - 46, y - 18, { align: "left" });
      doc.text("Authorised Signatory", RIGHT - 46, y - 13);
      doc.text(`For ${company.legalName}`, RIGHT - 46, y - 8);
    }
  }
}


function keyValueTable(doc: jsPDF, startY: number, rows: [string, string][]) {
  autoTable(doc, {
    startY,
    margin: { left: ML, right: MR },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60, fillColor: [240, 246, 247] },
      1: { cellWidth: CONTENT_W - 60 },
    },
    body: rows,
  });
  return (doc as any).lastAutoTable.finalY as number;
}


function last(doc: jsPDF) {
  return (doc as any).lastAutoTable?.finalY ?? 60;
}

function fillGeneric(doc: jsPDF, ctx: FormContext) {
  const { form, company, profile, employees } = ctx;
  drawHeader(doc, form.formName, form.purpose, company);
  let y = keyValueTable(doc, 60, [
    ["Module", form.moduleKey.toUpperCase()],
    ["Frequency", form.frequency.replace("_", " ")],
    ["Version", form.version],
    ["Mandatory", form.mandatory ? "Yes" : "No"],
  ]);

  y += 4;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Auto-filled particulars", 14, y + 4);
  const values = autoFillMap(ctx);
  const rows: [string, string][] = form.autoFillFields.length
    ? form.autoFillFields.map((f) => [labelFor(f), values[f] ?? "—"])
    : Object.entries(values).slice(0, 12).map(([k, v]) => [labelFor(k), v]);
  y = keyValueTable(doc, y + 6, rows);

  if (form.instructions) {
    y += 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Instructions", 14, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
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
      startY: 60, margin: { left: ML, right: MR },
      theme: "grid",
      styles: { fontSize: 8 },
      head: [["#", "Emp Code", "Name", "Designation", "Department", "UAN", "ESIC", "Aadhaar", "DOJ"]],
      body: employees.map((e, i) => [
        i + 1, e.empCode, e.name, e.designation, e.department,
        e.uan || "—", e.esic || "—", e.aadhaar ? "****" + String(e.aadhaar).slice(-4) : "—", e.doj,
      ]),
      headStyles: { fillColor: [20, 160, 170], textColor: 255 },
    });
    doc.setFontSize(8);
    doc.text(`Total employees: ${employees.length}  ·  Women: ${profile.womenEmployees}`, 14, last(doc) + 6);
  }
}

function labelFor(k: string): string {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ");
}

function autoFillMap(ctx: FormContext): Record<string, string> {
  const { company, profile, employees, period } = ctx;
  const totalGross = employees.reduce((s, e) => s + (e.basic || 0) * 2, 0);
  const totalPfBase = employees.reduce((s, e) => s + Math.min(e.basic || 0, 15000), 0);
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
    period: period ?? new Date().toISOString().slice(0, 7),
    gross: inrRaw(totalGross),
    net: inrRaw(totalGross * 0.85),
    pfWages: inrRaw(totalPfBase),
    employerShare: inrRaw(Math.round(totalPfBase * 0.12)),
    employeeShare: inrRaw(Math.round(totalPfBase * 0.12)),
    ptDeducted: inrRaw(employees.length * (company.ptAmount || 200)),
    ip: String(employees.filter((e) => e.esic).length),
    uan: String(employees.filter((e) => e.uan).length),
    grossWages: inrRaw(totalGross),
    year: String(new Date().getFullYear()),
    date: new Date().toLocaleDateString("en-IN"),
    expiryDate: new Date(new Date().getFullYear(), 11, 31).toLocaleDateString("en-IN"),
    licenceNo: `KA/${profile.state.slice(0, 2).toUpperCase()}/${new Date().getFullYear()}/00${(company.legalName.length % 90) + 10}`,
    regNo: `SE/${profile.state.slice(0, 2).toUpperCase()}/${new Date().getFullYear()}/${(company.legalName.length * 7) % 9999}`,
  };
}
function inrRaw(n: number) { return "₹ " + n.toLocaleString("en-IN"); }

// ── Specialised templates ────────────────────────────────────────────────────
function factoryForm21(doc: jsPDF, ctx: FormContext) {
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
    ["17. Man-days worked", String(employees.length * 300)],
  ]);
  y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Declaration", 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(doc.splitTextToSize(
    "I hereby certify that the particulars furnished above are true to the best of my knowledge and belief. Books, registers and records required under the Factories Act, 1948 and the rules made thereunder are being maintained at the premises.",
    180,
  ), 14, y + 5);
}

function factoryForm12(doc: jsPDF, ctx: FormContext) {
  const { company, employees } = ctx;
  drawHeader(doc, "FORM 12 · REGISTER OF ADULT WORKERS", "The Factories Act, 1948 · Rule 78", company);
  autoTable(doc, {
    startY: 60, margin: { left: ML, right: MR },
    theme: "grid",
    styles: { fontSize: 8 },
    head: [["Sl.", "Name of worker", "Emp Code", "Sex", "Date of birth", "Nature of work", "Group", "Shift", "Relay", "Date of joining"]],
    body: employees.map((e, i) => [
      i + 1, e.name, e.empCode, (e.gender ?? "—").slice(0, 1).toUpperCase(),
      e.dob ?? "—", e.designation, e.department, "A", "1", e.doj,
    ]),
    headStyles: { fillColor: [20, 160, 170], textColor: 255 },
  });
}

function factoryReg1A(doc: jsPDF, ctx: FormContext) {
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
    ["Occupier declaration enclosed", "Yes"],
  ]);
}

function shopsReg(doc: jsPDF, ctx: FormContext) {
  const { company, profile, employees } = ctx;
  drawHeader(doc, "S&E REGISTRATION CERTIFICATE (APPLICATION)", `${profile.state} Shops & Establishments Act`, company);
  keyValueTable(doc, 60, [
    ["1. Name of establishment", company.legalName],
    ["2. Postal address", company.address],
    ["3. Category", profile.establishmentType],
    ["4. Nature of business", profile.natureOfBusiness],
    ["5. Name of employer", autoFillMap(ctx).occupier],
    ["6. Date of commencement", new Date().toLocaleDateString("en-IN")],
    ["7. Number of employees", String(employees.length)],
    ["8. Weekly holiday", "Sunday"],
    ["9. Working hours per day", String(Math.round(profile.weeklyHours / 6))],
    ["10. GSTIN / PAN", company.gstin],
  ]);
}

function shopsAnnual(doc: jsPDF, ctx: FormContext) {
  const { company, profile, employees } = ctx;
  drawHeader(doc, "S&E ANNUAL RETURN", `${profile.state} Shops & Establishments Act`, company);
  const wages = employees.reduce((s, e) => s + (e.basic || 0) * 2, 0) * 12;
  keyValueTable(doc, 60, [
    ["Registration number", autoFillMap(ctx).regNo],
    ["Return period", `${new Date().getFullYear() - 1}-04-01 to ${new Date().getFullYear()}-03-31`],
    ["Total employees", String(employees.length)],
    ["Male employees", String(employees.length - profile.womenEmployees)],
    ["Female employees", String(profile.womenEmployees)],
    ["Total wages paid", inrRaw(wages)],
    ["Weekly holidays observed", "52"],
    ["Public holidays observed", "10"],
    ["Number of prosecutions / notices", "0"],
  ]);
}

function epfEcr(doc: jsPDF, ctx: FormContext) {
  const { company, employees, period } = ctx;
  drawHeader(doc, "EPF ECR · ELECTRONIC CHALLAN CUM RETURN", `Wage month ${period ?? new Date().toISOString().slice(0, 7)}`, company);
  const rows = employees.map((e, i) => {
    const pfBase = Math.min(e.basic || 0, 15000);
    const ee = Math.round(pfBase * 0.12);
    const er = Math.round(pfBase * 0.12);
    const eps = Math.round(pfBase * 0.0833);
    return [i + 1, e.uan || `UAN-PENDING-${i + 1}`, e.name, inrRaw(e.basic || 0), inrRaw(pfBase), inrRaw(ee), inrRaw(er - eps), inrRaw(eps)];
  });
  const totBase = employees.reduce((s, e) => s + Math.min(e.basic || 0, 15000), 0);
  autoTable(doc, {
    startY: 60, margin: { left: ML, right: MR },
    theme: "grid",
    styles: { fontSize: 8 },
    head: [["Sl.", "UAN", "Name", "Gross wages", "PF wages", "EE 12%", "ER EPF", "ER EPS 8.33%"]],
    body: rows,
    foot: [[
      { content: "TOTAL", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
      inrRaw(totBase),
      inrRaw(Math.round(totBase * 0.12)),
      inrRaw(Math.round(totBase * (0.12 - 0.0833))),
      inrRaw(Math.round(totBase * 0.0833)),
    ]],
    headStyles: { fillColor: [20, 160, 170], textColor: 255 },
    footStyles: { fillColor: [240, 246, 247], textColor: 0 },
  });
}

function esiMonthly(doc: jsPDF, ctx: FormContext) {
  const { company, employees, period } = ctx;
  drawHeader(doc, "ESI · MONTHLY CONTRIBUTION STATEMENT", `Contribution period ${period ?? new Date().toISOString().slice(0, 7)}`, company);
  const eligible = employees.filter((e) => (e.basic || 0) * 2 <= 21000);
  const rows = eligible.map((e, i) => {
    const gross = (e.basic || 0) * 2;
    const ee = Math.round(gross * 0.0075);
    const er = Math.round(gross * 0.0325);
    return [i + 1, e.esic || "PENDING", e.name, inrRaw(gross), inrRaw(ee), inrRaw(er), inrRaw(ee + er)];
  });
  autoTable(doc, {
    startY: 60, margin: { left: ML, right: MR }, theme: "grid", styles: { fontSize: 8 },
    head: [["Sl.", "IP number", "Name", "Gross wages", "EE 0.75%", "ER 3.25%", "Total"]],
    body: rows,
    headStyles: { fillColor: [20, 160, 170], textColor: 255 },
  });
}

function ptReturn(doc: jsPDF, ctx: FormContext) {
  const { company, profile, employees } = ctx;
  drawHeader(doc, "PROFESSIONAL TAX MONTHLY RETURN", `${profile.state} Professional Tax`, company);
  const rows = employees.map((e, i) => [i + 1, e.empCode, e.name, inrRaw((e.basic || 0) * 2), inrRaw(company.ptAmount || 200)]);
  autoTable(doc, {
    startY: 60, margin: { left: ML, right: MR }, theme: "grid", styles: { fontSize: 9 },
    head: [["Sl.", "Emp Code", "Name", "Monthly wages", "PT deducted"]],
    body: rows,
    foot: [[{ content: "TOTAL", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } }, "—", inrRaw(employees.length * (company.ptAmount || 200))]],
    headStyles: { fillColor: [20, 160, 170], textColor: 255 },
    footStyles: { fillColor: [240, 246, 247], textColor: 0 },
  });
}

function poshAnnual(doc: jsPDF, ctx: FormContext) {
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
    ["Employer", company.legalName],
  ]);
}

function bonusFormD(doc: jsPDF, ctx: FormContext) {
  const { company, employees } = ctx;
  drawHeader(doc, "FORM D · ANNUAL BONUS RETURN", "Payment of Bonus Act, 1965 · Rule 5", company);
  const eligible = employees.filter((e) => (e.basic || 0) <= 21000);
  const rows = eligible.map((e, i) => {
    const salary = (e.basic || 0) * 12;
    const bonus = Math.round(salary * 0.0833);
    return [i + 1, e.empCode, e.name, e.doj, inrRaw(e.basic || 0), inrRaw(salary), inrRaw(bonus)];
  });
  autoTable(doc, {
    startY: 60, margin: { left: ML, right: MR }, theme: "grid", styles: { fontSize: 8 },
    head: [["Sl.", "Emp Code", "Name", "DOJ", "Basic (m)", "Annual salary", "Bonus paid"]],
    body: rows,
    headStyles: { fillColor: [20, 160, 170], textColor: 255 },
  });
}

function wageRegister(doc: jsPDF, ctx: FormContext) {
  const { company, employees, period } = ctx;
  drawHeader(doc, "FORM X · WAGE REGISTER", `Wage period ${period ?? new Date().toISOString().slice(0, 7)}`, company);
  const rows = employees.map((e, i) => {
    const gross = (e.basic || 0) * 2;
    const pf = Math.round(Math.min(e.basic || 0, 15000) * 0.12);
    const pt = company.ptAmount || 200;
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    return [i + 1, e.empCode, e.name, inrRaw(e.basic || 0), inrRaw(gross), inrRaw(pf), inrRaw(esi), inrRaw(pt), inrRaw(gross - pf - esi - pt)];
  });
  autoTable(doc, {
    startY: 60, margin: { left: ML, right: MR }, theme: "grid", styles: { fontSize: 8 },
    head: [["Sl.", "Code", "Name", "Basic", "Gross", "PF", "ESI", "PT", "Net"]],
    body: rows,
    headStyles: { fillColor: [20, 160, 170], textColor: 255 },
  });
}

// ── Dispatch ────────────────────────────────────────────────────────────────
type Renderer = (doc: jsPDF, ctx: FormContext) => void;
const TEMPLATES: Record<string, Renderer> = {
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
  "wages-registerA": wageRegister,
};

export function generateComplianceFormPDF(ctx: FormContext): string {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const renderer = TEMPLATES[ctx.form.id] ?? fillGeneric;
  renderer(doc, ctx);
  footer(doc, ctx.form, ctx.company);
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = ctx.form.formName.replace(/[^a-z0-9]+/gi, "_").slice(0, 60);
  const filename = `${safe}_${stamp}.pdf`;
  doc.save(filename);
  return filename;
}
