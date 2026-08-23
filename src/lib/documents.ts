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
  | "coc" | "pol" | "pfr" | "esi"
  | "probation_extension" | "confirmation"
  | "increment" | "promotion" | "transfer"
  | "warning" | "show_cause" | "suspension"
  | "termination" | "relieving" | "experience" | "full_final" | "exit_clearance"
  | "salary_certificate" | "bonafide" | "employment_verification" | "address_proof"
  | "notice_common" | "memo_late_attendance" | "custom";

export type LetterTemplate = {
  key: LetterKey;
  code?: string;
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

  { key: "nda", code: "NDA", title: "Non-Disclosure & Confidentiality Agreement", category: "Onboarding", description: "Confidentiality and IP undertaking.",
    body: `NON-DISCLOSURE & CONFIDENTIALITY AGREEMENT

I, {{name}} (Employee Code {{empCode}}), engaged as {{designation}} in {{department}} with {{company}}, acknowledge that during the course of my employment I will have access to confidential, proprietary, and sensitive information belonging to {{company}} and its clients.

1. Confidential Information: All software code, customer data, business plans, trade secrets, financial records, and proprietary materials.
2. Non-Disclosure: I agree to hold all such information in strict confidence and not disclose, reproduce, or use it for unauthorized purposes.
3. Return of Assets: Upon separation, I will return all devices, storage media, documents, and credentials immediately.
4. Survival of Obligations: These confidentiality covenants shall survive termination of employment indefinitely.` },

  { key: "coc", code: "COC", title: "Employee Code of Conduct & Workplace Ethics", category: "Onboarding", description: "Workplace ethics, anti-harassment, and conduct standards.",
    body: `EMPLOYEE CODE OF CONDUCT & WORKPLACE ETHICS

I, {{name}} (Employee Code {{empCode}}), appointed as {{designation}} with {{company}}, hereby acknowledge and undertake to uphold the highest standards of professional integrity, workplace ethics, and compliance.

1. Professional Conduct: Treat colleagues, clients, and visitors with dignity, fairness, and mutual respect.
2. POSH & Anti-Harassment: Maintain zero tolerance towards any form of sexual harassment, discrimination, or abusive conduct.
3. Conflict of Interest: Avoid outside business engagements or personal financial interests that conflict with duties at {{company}}.
4. Proper Asset Usage: Company hardware, software licenses, and accounts must be utilized solely for official business activities.` },

  { key: "pol", code: "POL", title: "Information Security & IT Usage Policy", category: "Onboarding", description: "IT equipment, data protection, and cybersecurity rules.",
    body: `INFORMATION SECURITY & ACCEPTABLE IT USE POLICY

I, {{name}} (Employee Code {{empCode}}), employed as {{designation}} at {{company}}, hereby acknowledge and agree to comply with company IT Security and Data Protection policies.

1. Credential Security: Passwords, OTPs, and access tokens are strictly confidential and must never be shared.
2. Device & Data Protection: Company laptops, files, and customer records must be protected from unauthorized access, copying, or cloud uploading.
3. Software Regulations: Downloading unauthorized software or connecting unapproved personal storage is strictly prohibited.
4. Incident Reporting: Any suspected security breach, malware, or lost device must be reported immediately to the IT administrator.` },

  { key: "pfr", code: "PFR", title: "EPF / EPS Statutory Declaration (Form 11)", category: "Compliance", description: "Declaration for EPF/EPS statutory registration.",
    body: `DECLARATION BY A PERSON TAKING UP EMPLOYMENT IN AN ESTABLISHMENT (EPF FORM 11)

I, {{name}} (Employee Code {{empCode}}), having joined {{company}} as {{designation}} on {{doj}}, hereby submit this statutory declaration under the Employees' Provident Funds & Miscellaneous Provisions Act, 1952.

1. Statutory Deduction: I agree to contribute to the Employees' Provident Fund (EPF) and Pension Scheme (EPS) as applicable by statutory wage limits.
2. Identification Details: The Aadhaar and PAN details submitted by me are authentic and authorized for UAN linking and KYC generation.
3. Prior PF Declarations: All details regarding previous employment and Universal Account Number (UAN) provided during onboarding are accurate.` },

  { key: "esi", code: "ESI", title: "ESIC Medical Benefit Joining Declaration", category: "Compliance", description: "Declaration for ESIC health insurance coverage.",
    body: `EMPLOYEES' STATE INSURANCE CORPORATION (ESIC) JOINING DECLARATION

I, {{name}} (Employee Code {{empCode}}), appointed as {{designation}} at {{company}}, hereby submit this declaration for statutory registration under the Employees' State Insurance Act, 1948.

1. Benefit Eligibility: I agree to enroll under the ESI medical and health scheme in accordance with statutory wage eligibility thresholds.
2. Dependent Family Details: Details of dependent family members provided during registration are accurate for biometric e-Pehchan card issuance.
3. Address & Family Updates: I undertake to report any change in family dependents or residential address promptly to HR.` },

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

export function buildGenericTemplate(code: string, title: string, employee?: Employee, extra?: string): LetterTemplate {
  return {
    key: (code.toLowerCase() as LetterKey),
    code: code.toUpperCase(),
    title: title,
    category: "Onboarding",
    description: `Official ${title} document.`,
    body: `${title.toUpperCase()}

I, {{name}} (Employee Code {{empCode}}), engaged as {{designation}} with {{company}}, hereby acknowledge that I have reviewed, understood, and voluntarily agree to all terms, policies, and statutory conditions outlined in this ${title}.

1. The terms stated herein shall govern my official employment with {{company}} with effect from {{doj}}.
2. I undertake to adhere to all corporate guidelines, statutory requirements, and company policies throughout my tenure.
3. This agreement has been acknowledged and executed via the SWIFT Employee Portal.${extra ? `\n\nAdditional Terms:\n${extra}` : ""}

Signed and submitted for official employment records.`,
  };
}

// ============================================================
// PDF generation — branded letterhead
// ============================================================

// A4 (portrait) constants — 210 x 297 mm, 14 mm side margins
const A4_W = 210, A4_H = 297, ML = 14, MR = 14;
const RIGHT = A4_W - MR; // 196
const CONTENT_W = A4_W - ML - MR; // 182
const BOTTOM_SAFE = A4_H - 20; // 277

const imageCache = new Map<string, string>();

/** Converts URL / S3 / blob / relative path / DataURL into a base64 DataURL for jsPDF */
export async function resolveImageToDataUrl(src?: string): Promise<string | undefined> {
  if (!src || typeof src !== "string" || !src.trim()) return undefined;
  if (src.startsWith("data:image/")) return src;
  if (imageCache.has(src)) return imageCache.get(src);

  try {
    const res = await fetch(src, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        imageCache.set(src, dataUrl);
        resolve(dataUrl);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            imageCache.set(src, dataUrl);
            resolve(dataUrl);
            return;
          }
        } catch {
          // ignore
        }
        resolve(undefined);
      };
      img.onerror = () => resolve(undefined);
      img.src = src;
    });
  }
}

export async function prepareDocAssets(
  company: Company,
  assets?: CompanyDocumentAssets
): Promise<{ company: Company; assets?: CompanyDocumentAssets }> {
  const companyLogo = await resolveImageToDataUrl(company.logoDataUrl);
  const updatedCompany = companyLogo ? { ...company, logoDataUrl: companyLogo } : company;

  if (!assets) return { company: updatedCompany, assets };

  const [
    logoDataUrl,
    letterheadDataUrl,
    footerDataUrl,
    watermarkDataUrl,
    companySealDataUrl,
    departmentSealDataUrl,
    mdSignatureDataUrl,
    hrSignatureDataUrl,
    authorisedSignatoryDataUrl,
    qrCodeDataUrl,
  ] = await Promise.all([
    resolveImageToDataUrl(assets.logoDataUrl),
    resolveImageToDataUrl(assets.letterheadDataUrl),
    resolveImageToDataUrl(assets.footerDataUrl),
    resolveImageToDataUrl(assets.watermarkDataUrl),
    resolveImageToDataUrl(assets.companySealDataUrl),
    resolveImageToDataUrl(assets.departmentSealDataUrl),
    resolveImageToDataUrl(assets.mdSignatureDataUrl),
    resolveImageToDataUrl(assets.hrSignatureDataUrl),
    resolveImageToDataUrl(assets.authorisedSignatoryDataUrl),
    resolveImageToDataUrl(assets.qrCodeDataUrl),
  ]);

  const updatedAssets: CompanyDocumentAssets = {
    ...assets,
    ...(logoDataUrl ? { logoDataUrl } : {}),
    ...(letterheadDataUrl ? { letterheadDataUrl } : {}),
    ...(footerDataUrl ? { footerDataUrl } : {}),
    ...(watermarkDataUrl ? { watermarkDataUrl } : {}),
    ...(companySealDataUrl ? { companySealDataUrl } : {}),
    ...(departmentSealDataUrl ? { departmentSealDataUrl } : {}),
    ...(mdSignatureDataUrl ? { mdSignatureDataUrl } : {}),
    ...(hrSignatureDataUrl ? { hrSignatureDataUrl } : {}),
    ...(authorisedSignatoryDataUrl ? { authorisedSignatoryDataUrl } : {}),
    ...(qrCodeDataUrl ? { qrCodeDataUrl } : {}),
  };

  return { company: updatedCompany, assets: updatedAssets };
}

/** Safely renders base64 image (PNG, JPEG, WebP) or Image element in jsPDF without crashing */
export function drawImageSafe(
  doc: jsPDF,
  imgSource: string | HTMLImageElement | HTMLCanvasElement | undefined | null,
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  if (!imgSource) return false;
  try {
    if (typeof imgSource === "string") {
      let format = "PNG";
      if (/^data:image\/(jpe?g|jfif)/i.test(imgSource) || /\.(jpe?g|jfif)(\?.*)?$/i.test(imgSource)) format = "JPEG";
      else if (/^data:image\/webp/i.test(imgSource) || /\.webp(\?.*)?$/i.test(imgSource)) format = "WEBP";
      else if (/^data:image\/png/i.test(imgSource) || /\.png(\?.*)?$/i.test(imgSource)) format = "PNG";

      doc.addImage(imgSource, format, x, y, w, h);
      return true;
    } else {
      doc.addImage(imgSource, "PNG", x, y, w, h);
      return true;
    }
  } catch {
    try {
      if (typeof imgSource === "string") {
        doc.addImage(imgSource, x, y, w, h);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}

function pdfHeader(doc: jsPDF, company: Company, title: string, logoDataUrl?: string) {
  // Top deep navy brand bar matching payslip (#0F172A / [15, 23, 42])
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, A4_W, 32, "F");

  const effectiveLogo = logoDataUrl || company.logoDataUrl;
  let textLeft = ML; // 14

  if (effectiveLogo) {
    const ok = drawImageSafe(doc, effectiveLogo, ML, 5, 22, 22);
    if (ok) {
      textLeft = 40;
    }
  }

  // Left Brand & Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text((company.name || "SWIFT HRMS").toUpperCase(), textLeft, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #CBD5E1
  doc.text(company.legalName || company.name || "Company Legal Name", textLeft, 19);

  const addressLine = `${company.address || ""} ${company.gstin ? " · GSTIN: " + company.gstin : ""}`.trim();
  if (addressLine) {
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // #94A3B8
    const maxW = textLeft > ML ? 85 : 110;
    doc.text(doc.splitTextToSize(addressLine, maxW)[0] || "", textLeft, 25);
  }

  // Right Title & Accent Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const safeTitle = doc.splitTextToSize(title.toUpperCase(), 85)[0] ?? title.toUpperCase();
  doc.text(safeTitle, RIGHT, 14, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(56, 189, 248); // Cyan accent #38BDF8
  doc.text("OFFICIAL COMPANY DOCUMENT", RIGHT, 21, { align: "right" });

  // Reset text color to dark slate
  doc.setTextColor(15, 23, 42);
}

function pdfFooter(doc: jsPDF, refId: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by SWIFT AI HRMS · ${new Date().toLocaleString("en-IN")} · Ref: ${refId}`,
      ML, 289,
    );
    doc.text(`Page ${i} of ${pages}`, RIGHT, 289, { align: "right" });
    doc.setTextColor(15, 23, 42);
  }
}

export function generateLetterPDF(
  company: Company,
  employee: Employee,
  template: LetterTemplate,
  assets?: CompanyDocumentAssets,
): { blob: Blob; filename: string } {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const docKey = (template.code || template.key || "DOC").toUpperCase();
  const refId = `SWIFT-${docKey}-${employee.empCode}-${Date.now().toString(36).toUpperCase()}`;
  const effectiveLogo = assets?.logoDataUrl || company.logoDataUrl;
  pdfHeader(doc, company, template.title, effectiveLogo);

  // Watermark (behind body) — ONLY if watermark is provided and handle state properly
  if (assets?.watermarkDataUrl && typeof (doc as any).saveGraphicsState === "function") {
    try {
      (doc as any).saveGraphicsState();
      const gs = (doc as unknown as { GState: new (o: { opacity: number }) => unknown; setGState: (g: unknown) => void });
      if (gs.GState && gs.setGState) gs.setGState(new gs.GState({ opacity: 0.05 }));
      drawImageSafe(doc, assets.watermarkDataUrl, (A4_W - 130) / 2, 90, 130, 130);
      (doc as any).restoreGraphicsState();
    } catch {
      // ignore
    }
  }

  const vars = buildVars(company, employee);
  const body = renderTemplate(template.body, vars);

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // Slate-700
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${vars.today}`, ML, 40);
  doc.text(`Ref: SWIFT/${docKey}/${employee.empCode}`, RIGHT, 40, { align: "right" });

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // Slate-900 (crisp high contrast)
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(body, CONTENT_W);
  doc.text(lines, ML, 48);

  let y = 48 + lines.length * 5.2 + 8;

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
      styles: { fontSize: 8.5, overflow: "linebreak", cellPadding: 2.2, font: "helvetica", textColor: [30, 41, 59] },
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
          { content: "Total CTC", styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
          { content: inr(p.monthlyCTC), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
          { content: inr(p.annualCTC), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        ],
      ],
      columnStyles: {
        0: { cellWidth: CONTENT_W - 80 },
        1: { cellWidth: 40, halign: "right" },
        2: { cellWidth: 40, halign: "right" },
      },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Signature block — reserve ~45mm; move to new page if not enough
  if (y > BOTTOM_SAFE - 45) { doc.addPage(); y = 40; }

  // Left: Company Authorised Signatory
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`For ${company.legalName || company.name}`, ML, y);

  const sigImg = assets?.authorisedSignatoryDataUrl
    ?? assets?.hrSignatureDataUrl
    ?? assets?.mdSignatureDataUrl;
  if (sigImg) {
    drawImageSafe(doc, sigImg, ML, y + 3, 45, 14);
  }
  doc.setFont("helvetica", "normal");
  doc.text("_____________________", ML, y + 20);
  doc.text("Authorised Signatory", ML, y + 25);
  if (assets?.digitalCertificateName) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Digitally signed: ${assets.digitalCertificateName}`, ML, y + 29);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
  }

  // Company seal overlaid between the two signature blocks
  const seal = assets?.companySealDataUrl ?? assets?.departmentSealDataUrl;
  if (seal) {
    drawImageSafe(doc, seal, (A4_W - 28) / 2, y + 1, 28, 28);
  }

  // Right: Employee Acknowledgement & E-Signature
  const ACK_X = 130;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Employee Acceptance & E-Signature", ACK_X, y);

  // Check all signature keys for this document
  const sigInfo = employee.signedDocs?.[docKey]
    || employee.signedDocs?.[template.key]
    || (docKey === "APT" || docKey === "APPOINTMENT" ? employee.acceptance : undefined)
    || Object.values(employee.signedDocs || {}).find(
      (s) => s.docCode.toUpperCase() === docKey || s.docTitle.toLowerCase() === template.title.toLowerCase()
    );

  const isEmpSigned = !!sigInfo || (docKey === "APT" && employee.acceptance?.signed);
  const empSigImg = (sigInfo as any)?.signatureDataUrl || (docKey === "APT" ? employee.acceptance?.signatureDataUrl : undefined);
  const empSigText = (sigInfo as any)?.signatureText || (employee.acceptance?.signed && docKey === "APT" ? employee.name : "") || employee.name;
  const empSignedAt = (sigInfo as any)?.signedAt || (docKey === "APT" ? employee.acceptance?.signedAt : undefined);

  if (isEmpSigned) {
    if (empSigImg) {
      drawImageSafe(doc, empSigImg, ACK_X, y + 3, 45, 14);
    } else if (empSigText) {
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(empSigText, ACK_X, y + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
    }
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129); // emerald
    doc.setFont("helvetica", "bold");
    doc.text("DIGITALLY SIGNED & ACCEPTED (App)", ACK_X, y + 19);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Signed: " + (empSignedAt ? new Date(empSignedAt).toLocaleString("en-IN") : "Recorded on App"), ACK_X, y + 23);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Awaiting digital signature in app", ACK_X, y + 14);
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text("_____________________", ACK_X, y + 26);
  doc.setFont("helvetica", "bold");
  doc.text(`${employee.name} (${employee.empCode})`, ACK_X, y + 31);

  // QR verification — placed right below signature block
  if (assets?.qrCodeDataUrl) {
    drawImageSafe(doc, assets.qrCodeDataUrl, RIGHT - 16, y + 34, 16, 16);
  }

  pdfFooter(doc, refId);

  const cleanTitle = (template.title || "Document").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${cleanTitle}_${employee.empCode}.pdf`;
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
    const { company: prepCompany, assets: prepAssets } = await prepareDocAssets(company, assets);
    const { blob, filename } = generateLetterPDF(prepCompany, employee, template, prepAssets);
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
  const { company: prepCompany, assets: prepAssets } = await prepareDocAssets(company, assets);
  const zip = new JSZip();
  const folder = zip.folder(template.title.replace(/\s+/g, "_"))!;
  for (const e of employees) {
    if (format === "pdf" || format === "both") {
      const { blob, filename } = generateLetterPDF(prepCompany, e, template, prepAssets);
      folder.file(filename, blob);
    }
    if (format === "docx" || format === "both") {
      const { blob, filename } = await generateLetterDOCX(prepCompany, e, template);
      folder.file(filename, blob);
    }
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(zipBlob, `${template.title.replace(/\s+/g, "_")}_${stamp}.zip`);
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

