import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, ImageRun,
} from "docx";
import pkg from "file-saver";
const { saveAs } = pkg;
import JSZip from "jszip";
import type { Company, Employee } from "./store";
import type { CompanyDocumentAssets } from "./lifecycle";
import { computePayroll, inr } from "./payroll";

// ============================================================
// Template Registry — 26 letter types
// ============================================================

export type LetterCategory =
  | "Onboarding" | "Confirmation" | "Movement" | "Discipline"
  | "Exit" | "Verification" | "Compliance" | "Custom";

export type LetterKey =
  | "offer" | "appointment" | "joining_report" | "internship" | "nda" | "contract"
  | "probation_extension" | "confirmation"
  | "increment" | "promotion" | "transfer"
  | "warning" | "show_cause" | "suspension"
  | "termination" | "relieving" | "experience" | "full_final" | "exit_clearance"
  | "salary_certificate" | "bonafide" | "employment_verification" | "address_proof"
  | "notice_common" | "memo_late_attendance" | "custom";

export type LetterTemplate = {
  key: LetterKey;
  title: string;
  category: LetterCategory;
  description: string;
  body: string; // supports {{variables}}
};

export const DEFAULT_TEMPLATES: LetterTemplate[] = [
  { key: "offer", title: "Offer Letter", category: "Onboarding", description: "Pre-joining offer with CTC breakup.",
    body: `Dear {{name}},

We are delighted to extend an offer of employment for the position of {{designation}} in our {{department}} department at {{company}}.

Your proposed date of joining is {{doj}}. Your annual CTC will be INR {{annualCTC}}, with a monthly gross of INR {{gross}}.

This offer is contingent on satisfactory background verification and submission of required documents. Please confirm your acceptance within 7 days.

We look forward to welcoming you to the team.

Warm regards,
HR Department
{{company}}` },

  { key: "appointment", title: "Appointment Letter", category: "Onboarding", description: "Formal appointment with terms & salary breakup.",
    body: `Dear {{name}},

With reference to your acceptance of our offer, we are pleased to appoint you as {{designation}} in the {{department}} department at {{company}} with effect from {{doj}}.

Your Employee Code is {{empCode}}. Your consolidated CTC is INR {{annualCTC}} per annum (monthly gross INR {{gross}}). The detailed salary structure is annexed below.

You shall be governed by the company's HR policies, code of conduct, and confidentiality obligations. This appointment is subject to a probation period of six (6) months.

Warm regards,
For {{company}}` },

  { key: "joining_report", title: "Joining Report", category: "Onboarding", description: "First-day joining acknowledgement.",
    body: `This is to certify that {{name}} (Employee Code: {{empCode}}) has joined {{company}} as {{designation}} in the {{department}} department on {{today}}.

Reporting Manager: __________________
Workstation / Location: __________________

Signature of Employee: __________________     Signature of HR: __________________` },

  { key: "internship", title: "Internship Letter", category: "Onboarding", description: "Internship engagement letter.",
    body: `Dear {{name}},

We are pleased to offer you an internship at {{company}} as an intern in the {{department}} department, commencing {{doj}}. The internship carries a monthly stipend of INR {{gross}}.

You will report to {{department}} leadership and be governed by our conduct and confidentiality policies.

For {{company}}` },

  { key: "nda", title: "Non-Disclosure Agreement", category: "Onboarding", description: "Confidentiality undertaking.",
    body: `NON-DISCLOSURE AGREEMENT

I, {{name}} (Employee Code {{empCode}}), engaged as {{designation}} with {{company}}, acknowledge that during the course of my employment I will have access to confidential and proprietary information belonging to {{company}}.

I agree not to disclose, reproduce, or use such information for any purpose other than the performance of my duties, both during and after my employment.

Signed at __________________ on {{today}}.

Signature: __________________` },

  { key: "contract", title: "Contract of Employment", category: "Onboarding", description: "Full contract with terms.",
    body: `CONTRACT OF EMPLOYMENT

This contract is executed on {{today}} between {{company}} ("Employer") and {{name}} ("Employee"), Employee Code {{empCode}}.

1. Position: {{designation}}, {{department}}
2. Effective date: {{doj}}
3. Remuneration: INR {{annualCTC}} per annum (monthly gross INR {{gross}})
4. Working hours & leave: as per company policy
5. Confidentiality, IP assignment and non-solicitation clauses apply

For {{company}}                                             Employee` },

  { key: "probation_extension", title: "Probation Extension", category: "Confirmation", description: "Extends probation period.",
    body: `Dear {{name}},

Following a review of your performance during the initial probation period, the management has decided to extend your probation for a further period of three (3) months with effect from {{today}}.

You are advised to work closely with your reporting manager to meet the agreed performance expectations during this extended period.

For {{company}}` },

  { key: "confirmation", title: "Confirmation Letter", category: "Confirmation", description: "Confirms employment post-probation.",
    body: `Dear {{name}},

We are pleased to inform you that your services with {{company}} as {{designation}} stand confirmed with effect from {{today}}, subject to the terms of your appointment.

We look forward to your continued contribution.

For {{company}}` },

  { key: "increment", title: "Increment Letter", category: "Movement", description: "Salary revision letter.",
    body: `Dear {{name}},

In recognition of your performance and contribution, the management has revised your compensation with effect from {{today}}.

Your revised annual CTC is INR {{annualCTC}}, with a monthly gross of INR {{gross}}. The detailed breakup is annexed.

For {{company}}` },

  { key: "promotion", title: "Promotion Letter", category: "Movement", description: "Promotion with new designation.",
    body: `Dear {{name}},

We are pleased to inform you of your promotion to the position of {{designation}} in the {{department}} department, effective {{today}}.

Your revised annual CTC will be INR {{annualCTC}}. All other terms of employment remain unchanged.

Congratulations!

For {{company}}` },

  { key: "transfer", title: "Transfer Letter", category: "Movement", description: "Inter-branch / inter-department transfer.",
    body: `Dear {{name}},

Consequent upon organisational requirements, you are hereby transferred to __________________ with effect from {{today}}. You will continue as {{designation}} reporting to __________________.

All other terms and conditions remain unchanged.

For {{company}}` },

  { key: "warning", title: "Warning Letter", category: "Discipline", description: "Formal written warning.",
    body: `Dear {{name}},

It has come to our notice that on __________________ you were found to be in breach of the company's policy relating to __________________.

You are hereby issued a formal warning and advised to ensure such conduct is not repeated. Any further breach will invite stricter disciplinary action, including termination.

Please acknowledge receipt.

For {{company}}` },

  { key: "show_cause", title: "Show Cause Notice", category: "Discipline", description: "Notice to explain conduct.",
    body: `Dear {{name}},

You are hereby called upon to show cause, in writing, within 72 (seventy-two) hours from receipt of this notice, as to why disciplinary action should not be initiated against you for the following:

__________________

Failure to respond within the stipulated time will constrain the management to proceed ex-parte.

For {{company}}` },

  { key: "suspension", title: "Suspension Letter", category: "Discipline", description: "Suspension pending enquiry.",
    body: `Dear {{name}},

Pending enquiry into the alleged misconduct set out in the show cause notice dated __________________, you are hereby placed under suspension with effect from {{today}}. You will be entitled to subsistence allowance as per the applicable Standing Orders.

You shall not enter company premises without prior written permission.

For {{company}}` },

  { key: "termination", title: "Termination Letter", category: "Exit", description: "Termination of employment.",
    body: `Dear {{name}},

Consequent upon the enquiry conducted, the management has decided to terminate your services as {{designation}} with {{company}}, with effect from close of business on {{today}}.

You are directed to complete exit formalities and hand over company property. Your full and final settlement will be processed as per policy.

For {{company}}` },

  { key: "relieving", title: "Relieving Letter", category: "Exit", description: "Relieving on resignation acceptance.",
    body: `Dear {{name}},

This is to confirm that you have been relieved from the services of {{company}} at the close of business on {{today}}, pursuant to your resignation.

We take this opportunity to thank you for your services and wish you the very best in your future endeavours.

For {{company}}` },

  { key: "experience", title: "Experience Certificate", category: "Verification", description: "Service certificate on exit.",
    body: `TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{name}} (Employee Code {{empCode}}) was employed with {{company}} as {{designation}} in the {{department}} department from {{doj}} to {{today}}.

During the tenure, we found {{name}} to be sincere, hardworking and of good conduct. We wish {{name}} success in future endeavours.

For {{company}}` },

  { key: "full_final", title: "Full & Final Settlement", category: "Exit", description: "F&F statement summary.",
    body: `Dear {{name}},

Please find below the summary of your full and final settlement as {{designation}} on separation dated {{today}}.

Payable components: Basic dues, leave encashment, statutory recoveries, and net payable amount as computed. Detailed working is annexed.

Kindly acknowledge receipt.

For {{company}}` },

  { key: "exit_clearance", title: "Exit Clearance Form", category: "Exit", description: "Departmental clearance form.",
    body: `EXIT CLEARANCE — {{name}} ({{empCode}})

Last working day: {{today}}
Designation: {{designation}}   Department: {{department}}

Clearances required:
[ ] IT — laptop, email, VPN
[ ] Admin — access card, keys
[ ] Finance — advances, imprest
[ ] Reporting Manager — handover
[ ] HR — documents & F&F

Signatures: __________________` },

  { key: "salary_certificate", title: "Salary Certificate", category: "Verification", description: "Salary certification for banks/visa.",
    body: `TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{name}} (Employee Code {{empCode}}) is employed with {{company}} as {{designation}} since {{doj}}. The current annual CTC is INR {{annualCTC}} with a monthly gross of INR {{gross}}.

This certificate is issued on request of the employee for official purposes.

For {{company}}` },

  { key: "bonafide", title: "Bonafide Certificate", category: "Verification", description: "Certificate of bonafide employment.",
    body: `TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{name}} (Employee Code {{empCode}}) is a bonafide employee of {{company}}, currently working as {{designation}} in the {{department}} department.

Issued on {{today}} on request of the employee.

For {{company}}` },

  { key: "employment_verification", title: "Employment Verification", category: "Verification", description: "Verification for third parties.",
    body: `TO WHOMSOEVER IT MAY CONCERN

We confirm that {{name}} is employed with {{company}} as {{designation}} since {{doj}}. This letter is issued for third-party verification purposes.

For {{company}}` },

  { key: "address_proof", title: "Address Proof Letter", category: "Verification", description: "Employer-issued address confirmation.",
    body: `TO WHOMSOEVER IT MAY CONCERN

We confirm that {{name}} (Employee Code {{empCode}}), employed with {{company}} as {{designation}}, has provided the following residential address on record:

__________________

Issued on {{today}}.

For {{company}}` },

  { key: "notice_common", title: "Common Notice / Circular", category: "Compliance", description: "Notice for all employees.",
    body: `NOTICE

Date: {{today}}

To: All employees of {{company}}

Subject: __________________

__________________

For {{company}}
HR Department` },

  { key: "memo_late_attendance", title: "Memo — Late Attendance", category: "Discipline", description: "Late attendance memo.",
    body: `Dear {{name}},

Our records indicate that you have been reporting late to work on multiple occasions in the recent past. Punctuality and adherence to work timings are essential to the smooth functioning of operations.

You are hereby advised to report to work on time going forward. Repeated late attendance shall invite disciplinary action.

For {{company}}` },

  { key: "custom", title: "Custom Letter", category: "Custom", description: "Blank template — write your own.",
    body: `Dear {{name}},

__________________

For {{company}}` },
];

// ============================================================
// Variable resolution
// ============================================================

export function buildVars(company: Company, employee: Employee): Record<string, string> {
  const p = computePayroll({
    company, employee, daysWorked: company.workingDaysPerMonth,
    otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0,
  });
  return {
    name: employee.name,
    empCode: employee.empCode,
    designation: employee.designation,
    department: employee.department,
    doj: employee.doj,
    email: employee.email,
    phone: employee.phone,
    pan: employee.pan || "-",
    aadhaar: employee.aadhaar || "-",
    bankAcc: employee.bankAcc || "-",
    bankIfsc: employee.bankIfsc || "-",
    basic: inr(employee.basic),
    gross: inr(p.gross),
    annualCTC: inr(p.annualCTC),
    monthlyCTC: inr(p.monthlyCTC),
    net: inr(p.net),
    company: company.legalName,
    companyShort: company.name,
    address: company.address,
    gstin: company.gstin,
    today: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
  };
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

// ============================================================
// PDF generation — branded letterhead
// ============================================================

// A4 (portrait) constants — 210 x 297 mm, 14 mm side margins
const A4_W = 210, A4_H = 297, ML = 14, MR = 14;
const RIGHT = A4_W - MR; // 196
const CONTENT_W = A4_W - ML - MR; // 182
const BOTTOM_SAFE = A4_H - 20; // 277

function pdfHeader(doc: jsPDF, company: Company, title: string) {
  doc.setFillColor(20, 160, 170);
  doc.rect(0, 0, A4_W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("SWIFT", ML, 15);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("People. Performance. Progress.", ML, 21);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  // Title truncated so it never overlaps the logo slot at right edge
  const safeTitle = doc.splitTextToSize(title, 110)[0] ?? title;
  doc.text(safeTitle, RIGHT, 15, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(company.legalName.slice(0, 60), RIGHT, 21, { align: "right" });
  doc.text((company.address ?? "").slice(0, 70), RIGHT, 26, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function pdfFooter(doc: jsPDF, refId: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Generated by SWIFT AI HRMS · ${new Date().toLocaleString("en-IN")} · Ref: ${refId}`,
      ML, 289,
    );
    doc.text(`Page ${i} of ${pages}`, RIGHT, 289, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
}

export function generateLetterPDF(
  company: Company,
  employee: Employee,
  template: LetterTemplate,
  assets?: CompanyDocumentAssets,
): { blob: Blob; filename: string } {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const refId = `SWIFT-${template.key.toUpperCase()}-${employee.empCode}-${Date.now().toString(36).toUpperCase()}`;
  pdfHeader(doc, company, template.title);

  // Company logo overlay in header if provided (fits inside the 30mm band)
  if (assets?.logoDataUrl) {
    try { doc.addImage(assets.logoDataUrl, "PNG", RIGHT - 26, 4, 22, 22); } catch { /* ignore */ }
  }

  // Watermark (behind body) — centred within content area
  if (assets?.watermarkDataUrl) {
    try {
      const gs = (doc as unknown as { GState: new (o: { opacity: number }) => unknown; setGState: (g: unknown) => void });
      if (gs.GState && gs.setGState) gs.setGState(new gs.GState({ opacity: 0.08 }));
      doc.addImage(assets.watermarkDataUrl, "PNG", (A4_W - 130) / 2, 90, 130, 130);
      if (gs.GState && gs.setGState) gs.setGState(new gs.GState({ opacity: 1 }));
    } catch { /* ignore */ }
  }

  const vars = buildVars(company, employee);
  const body = renderTemplate(template.body, vars);

  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Date: ${vars.today}`, ML, 40);
  doc.text(`Ref: SWIFT/${template.key.toUpperCase()}/${employee.empCode}`, RIGHT, 40, { align: "right" });
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(body, CONTENT_W);
  doc.text(lines, ML, 52);

  let y = 52 + lines.length * 6 + 8;

  // Attach salary breakup for salary-related letters
  if (["offer", "appointment", "increment", "salary_certificate"].includes(template.key)) {
    if (y > BOTTOM_SAFE - 80) { doc.addPage(); y = 30; }
    const p = computePayroll({
      company, employee, daysWorked: company.workingDaysPerMonth,
      otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0,
    });
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      theme: "striped",
      styles: { fontSize: 9, overflow: "linebreak" },
      head: [["Salary Component", "Monthly (INR)", "Annual (INR)"]],
      body: [
        ["Basic", inr(p.earnings.basic), inr(p.earnings.basic * 12)],
        ["HRA", inr(p.earnings.hra), inr(p.earnings.hra * 12)],
        ["Special Allowance", inr(p.earnings.special), inr(p.earnings.special * 12)],
        ["Medical", inr(p.earnings.medical), inr(p.earnings.medical * 12)],
        ["Conveyance", inr(p.earnings.conveyance), inr(p.earnings.conveyance * 12)],
        ["Washing", inr(p.earnings.washing), inr(p.earnings.washing * 12)],
        ["Other Allowance", inr(p.earnings.other), inr(p.earnings.other * 12)],
        [
          { content: "Gross", styles: { fontStyle: "bold" } },
          { content: inr(p.gross), styles: { fontStyle: "bold" } },
          { content: inr(p.gross * 12), styles: { fontStyle: "bold" } },
        ],
        ["Employer PF + ESI + Gratuity", inr(p.totalEmployer), inr(p.totalEmployer * 12)],
        [
          { content: "Total CTC", styles: { fontStyle: "bold", fillColor: [230, 245, 246] } },
          { content: inr(p.monthlyCTC), styles: { fontStyle: "bold", fillColor: [230, 245, 246] } },
          { content: inr(p.annualCTC), styles: { fontStyle: "bold", fillColor: [230, 245, 246] } },
        ],
      ],
      columnStyles: {
        0: { cellWidth: CONTENT_W - 80 },
        1: { cellWidth: 40, halign: "right" },
        2: { cellWidth: 40, halign: "right" },
      },
      headStyles: { fillColor: [20, 160, 170], textColor: 255 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Signature block — reserve ~40mm; move to new page if not enough
  if (y > BOTTOM_SAFE - 40) { doc.addPage(); y = 40; }
  doc.setFontSize(10);
  doc.text(`For ${company.legalName}`, ML, y);
  const sigImg = assets?.authorisedSignatoryDataUrl
    ?? assets?.hrSignatureDataUrl
    ?? assets?.mdSignatureDataUrl;
  if (sigImg) {
    try { doc.addImage(sigImg, "PNG", ML, y + 4, 55, 18); } catch { /* ignore */ }
  }
  doc.text("_____________________", ML, y + 24);
  doc.text("Authorised Signatory", ML, y + 29);
  if (assets?.digitalCertificateName) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Digitally signed: ${assets.digitalCertificateName}`, ML, y + 34);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
  }

  // Company seal overlaid between the two signature blocks
  const seal = assets?.companySealDataUrl ?? assets?.departmentSealDataUrl;
  if (seal) {
    try { doc.addImage(seal, "PNG", (A4_W - 30) / 2, y + 2, 30, 30); } catch { /* ignore */ }
  }

  // Employee acknowledgement — anchored to right column
  const ACK_X = RIGHT - 60;
  doc.text("Employee Acknowledgement", ACK_X, y);
  doc.text("_____________________", ACK_X, y + 24);
  doc.text(employee.name, ACK_X, y + 29);

  // QR verification — placed right below signature block so it never overlaps
  if (assets?.qrCodeDataUrl) {
    try { doc.addImage(assets.qrCodeDataUrl, "PNG", RIGHT - 18, y + 34, 18, 18); } catch { /* ignore */ }
  }

  pdfFooter(doc, refId);

  const filename = `${template.title.replace(/\s+/g, "_")}_${employee.empCode}.pdf`;
  return { blob: doc.output("blob"), filename };
}



// ============================================================
// DOCX generation — branded editable Word
// ============================================================

const BRAND_HEX = "14A0AA";

function docxHeader(company: Company, title: string): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({ text: "SWIFT", bold: true, size: 40, color: BRAND_HEX, font: "Arial" }),
          new TextRun({ text: "  " + title, size: 24, bold: true, font: "Arial" }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: company.legalName + " · " + company.address, size: 16, color: "6B7280", font: "Arial" })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND_HEX, space: 4 } },
      }),
    ],
  });
}

function docxFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Generated by SWIFT AI HRMS · ", size: 14, color: "9CA3AF", font: "Arial" }),
          new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 14, color: "9CA3AF", font: "Arial" }),
        ],
      }),
    ],
  });
}

export async function generateLetterDOCX(
  company: Company,
  employee: Employee,
  template: LetterTemplate,
): Promise<{ blob: Blob; filename: string }> {
  const vars = buildVars(company, employee);
  const body = renderTemplate(template.body, vars);
  const paragraphs = body.split(/\n/).map((line) =>
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: line || " ", size: 22, font: "Arial" })],
    }),
  );

  const meta: Paragraph[] = [
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: `Date: ${vars.today}`, size: 20, color: "6B7280", font: "Arial" }),
        new TextRun({ text: `\t\tRef: SWIFT/${template.key.toUpperCase()}/${employee.empCode}`, size: 20, color: "6B7280", font: "Arial" }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
      children: [new TextRun({ text: template.title, bold: true, size: 32, color: BRAND_HEX, font: "Arial" })],
    }),
  ];

  const signatures: Paragraph[] = [
    new Paragraph({ spacing: { before: 400, after: 100 }, children: [new TextRun({ text: `For ${company.legalName}`, bold: true, size: 22, font: "Arial" })] }),
    new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "_____________________", size: 22, font: "Arial" })] }),
    new Paragraph({ children: [new TextRun({ text: "Authorised Signatory", size: 20, font: "Arial" })] }),
  ];

  const includeBreakup = ["offer", "appointment", "increment", "salary_certificate"].includes(template.key);
  let breakupTable: Table | null = null;
  if (includeBreakup) {
    const p = computePayroll({
      company, employee, daysWorked: company.workingDaysPerMonth,
      otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0,
    });
    const rows: [string, number, number][] = [
      ["Basic", p.earnings.basic, p.earnings.basic * 12],
      ["HRA", p.earnings.hra, p.earnings.hra * 12],
      ["Special Allowance", p.earnings.special, p.earnings.special * 12],
      ["Medical", p.earnings.medical, p.earnings.medical * 12],
      ["Conveyance", p.earnings.conveyance, p.earnings.conveyance * 12],
      ["Washing", p.earnings.washing, p.earnings.washing * 12],
      ["Other Allowance", p.earnings.other, p.earnings.other * 12],
      ["Gross", p.gross, p.gross * 12],
      ["Employer PF + ESI + Gratuity", p.totalEmployer, p.totalEmployer * 12],
      ["Total CTC", p.monthlyCTC, p.annualCTC],
    ];
    const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" };
    const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
    breakupTable = new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 2340, 2340],
      rows: [
        new TableRow({
          tableHeader: true,
          children: ["Component", "Monthly (INR)", "Annual (INR)"].map((h, i) =>
            new TableCell({
              borders,
              width: { size: i === 0 ? 4680 : 2340, type: WidthType.DXA },
              shading: { fill: BRAND_HEX, type: ShadingType.CLEAR, color: "auto" },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: "Arial" })] })],
            }),
          ),
        }),
        ...rows.map(([label, m, a], idx) => {
          const isTotal = label === "Total CTC" || label === "Gross";
          return new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: isTotal ? { fill: "E6F5F6", type: ShadingType.CLEAR, color: "auto" } : undefined,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: isTotal, size: 20, font: "Arial" })] })],
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                shading: isTotal ? { fill: "E6F5F6", type: ShadingType.CLEAR, color: "auto" } : undefined,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: inr(m), bold: isTotal, size: 20, font: "Arial" })] })],
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                shading: isTotal ? { fill: "E6F5F6", type: ShadingType.CLEAR, color: "auto" } : undefined,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: inr(a), bold: isTotal, size: 20, font: "Arial" })] })],
              }),
            ],
          });
        }),
      ],
    });
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: { default: docxHeader(company, template.title) },
      footers: { default: docxFooter() },
      children: [
        ...meta,
        ...paragraphs,
        ...(breakupTable ? [new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: " " })] }), breakupTable] : []),
        ...signatures,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${template.title.replace(/\s+/g, "_")}_${employee.empCode}.docx`;
  return { blob, filename };
}

// ============================================================
// Download helpers
// ============================================================

export async function downloadLetter(
  company: Company,
  employee: Employee,
  template: LetterTemplate,
  format: "pdf" | "docx",
  assets?: CompanyDocumentAssets,
) {
  if (format === "pdf") {
    const { blob, filename } = generateLetterPDF(company, employee, template, assets);
    saveAs(blob, filename);
  } else {
    const { blob, filename } = await generateLetterDOCX(company, employee, template);
    saveAs(blob, filename);
  }
}

export async function bulkZipLetters(
  company: Company,
  employees: Employee[],
  template: LetterTemplate,
  format: "pdf" | "docx" | "both",
  assets?: CompanyDocumentAssets,
) {
  const zip = new JSZip();
  const folder = zip.folder(template.title.replace(/\s+/g, "_"))!;
  for (const e of employees) {
    if (format === "pdf" || format === "both") {
      const { blob, filename } = generateLetterPDF(company, e, template, assets);
      folder.file(filename, blob);
    }
    if (format === "docx" || format === "both") {
      const { blob, filename } = await generateLetterDOCX(company, e, template);
      folder.file(filename, blob);
    }
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(zipBlob, `${template.title.replace(/\s+/g, "_")}_${stamp}.zip`);
}

// ============================================================
// Generic template builder — for onboarding docs without a bundled letter
// (e.g. AST, IDC, PFR, ESI). Renders a proper branded PDF/DOCX with the
// standard signature/seal block so every doc in the wizard is downloadable.
// ============================================================
export function buildGenericTemplate(code: string, title: string, employee: Employee, extra?: string): LetterTemplate {
  const body = `This document (${code} — ${title}) is issued to {{name}} (Employee Code: {{empCode}}) at {{company}}, in the capacity of {{designation}}, {{department}} department, dated {{today}}.

${extra ?? "The employee acknowledges receipt of this document and agrees to comply with the terms recorded herein."}

Ref: SWIFT/${code}/{{empCode}}
Employee: ${employee.name}`;
  return { key: "custom", title, category: "Onboarding", description: `${code} document`, body };
}

// Asset handover / return letter helper. Uses the branded PDF pipeline so
// the letterhead, signature and seal are automatically embedded.
export function generateAssetHandoverPDF(
  company: Company,
  employee: Employee,
  asset: { name: string; tag: string; serial?: string; category?: string; condition?: string; notes?: string },
  kind: "handover" | "return",
  assets?: CompanyDocumentAssets,
): { blob: Blob; filename: string } {
  const title = kind === "handover" ? "Asset Allocation & Handover" : "Asset Return Acknowledgement";
  const verb = kind === "handover" ? "issued to" : "returned by";
  const template: LetterTemplate = {
    key: "custom", title, category: "Onboarding", description: "Asset movement",
    body: `This is to record that the asset described below has been ${verb} the employee named herein.

Asset Description   : ${asset.name}
Asset Tag           : ${asset.tag}
Serial Number       : ${asset.serial ?? "—"}
Category            : ${asset.category ?? "—"}
Condition           : ${asset.condition ?? "—"}
Notes               : ${asset.notes ?? "—"}

Employee            : {{name}} ({{empCode}})
Designation         : {{designation}}
Department          : {{department}}
Date                : {{today}}

The employee acknowledges ${kind === "handover" ? "receipt of the above asset in the stated condition and undertakes to use it responsibly, maintain it, and return it to {{company}} upon separation or on demand." : "the return of the above asset. On inspection the condition has been recorded as above."}`,
  };
  return generateLetterPDF(company, employee, template, assets);
}

