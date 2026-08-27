import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Company, Employee } from "./store";
import type { PayrollComputation } from "./payroll";
import { drawImageSafe, prepareDocAssets, resolveImageToDataUrl } from "./documents";

/** Format amount in Indian Rupees for PDF without corrupted unicode glyphs */
export function formatPdfCurrency(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `Rs. ${rounded.toLocaleString("en-IN")}`;
}

/** Convert numbers to Indian English Words (e.g. 31000 -> Rupees Thirty-One Thousand Only) */
export function numberToWordsIndian(num: number): string {
  const val = Math.round(num || 0);
  if (val <= 0) return "Rupees Zero Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const inWords = (n: number): string => {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let temp = val;
  const crore = Math.floor(temp / 10000000);
  temp %= 10000000;
  const lakh = Math.floor(temp / 100000);
  temp %= 100000;
  const thousand = Math.floor(temp / 1000);
  temp %= 1000;
  const remainder = Math.floor(temp);

  let res = "";
  if (crore > 0) res += inWords(crore) + "Crore ";
  if (lakh > 0) res += inWords(lakh) + "Lakh ";
  if (thousand > 0) res += inWords(thousand) + "Thousand ";
  if (remainder > 0) res += inWords(remainder);

  return "Rupees " + res.trim() + " Only";
}

/** Format month string "2026-08" to "AUGUST 2026" */
function formatMonthYear(monthStr: string): string {
  try {
    const [y, m] = monthStr.split("-");
    if (!y || !m) return monthStr;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
  } catch {
    return monthStr;
  }
}

/** Header banner for corporate PDFs */
export function drawCorporateHeader(
  doc: jsPDF,
  c: Company,
  title: string,
  subtitle?: string,
  logoDataUrl?: string
) {
  // Top deep navy brand bar
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, 210, 32, "F");

  const effectiveLogo = logoDataUrl || c.logoDataUrl;
  let textLeft = 14;

  if (effectiveLogo) {
    const ok = drawImageSafe(doc, effectiveLogo, 14, 5, 22, 22);
    if (ok) {
      textLeft = 40;
    }
  }

  // Left Brand & Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text((c.name || "SWIFT HRMS").toUpperCase(), textLeft, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #CBD5E1
  doc.text(c.legalName || c.name || "Company Legal Name", textLeft, 19);

  const addressLine = (c.address || "").trim();
  if (addressLine) {
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // #94A3B8
    const maxW = textLeft > 14 ? 85 : 110;
    doc.text(doc.splitTextToSize(addressLine, maxW)[0] || "", textLeft, 25);
  }

  // Right Title & Month Badge
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), 196, 14, { align: "right" });

  if (subtitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(56, 189, 248); // Cyan highlight #38BDF8
    doc.text(subtitle.toUpperCase(), 196, 21, { align: "right" });
  }

  // Reset text color
  doc.setTextColor(0, 0, 0);
}

export async function generateSalarySlipPDF(
  c: Company,
  e: Employee,
  month: string,
  p: PayrollComputation,
  paidDays?: number,
  weekOffDaysCount?: number,
  logoDataUrl?: string
) {
  const doc = new jsPDF();
  const formattedMonth = formatMonthYear(month);
  const effectiveLogo = await resolveImageToDataUrl(logoDataUrl || c.logoDataUrl);

  // 1. Corporate Header
  drawCorporateHeader(doc, c, "SALARY PAYSLIP", formattedMonth, effectiveLogo);

  // 2. Employee Metadata Card (Working Days, Present Days & Weekoff allocation)
  const totalWorkingDays = c.workingDaysPerMonth || 26;
  const presentDays = paidDays !== undefined ? paidDays : totalWorkingDays;

  let presentDaysDisplay = `${presentDays} Days`;
  if (weekOffDaysCount !== undefined && weekOffDaysCount > 0) {
    presentDaysDisplay = `${presentDays} Days + Weekoff: ${weekOffDaysCount} days`;
  }

  const employeeDetails = [
    ["Employee Name", e.name || "-", "Employee Code", e.empCode || "-"],
    ["Designation", e.designation || "-", "Department", e.department || "-"],
    ["Date of Joining", e.doj || "-", "PAN Number", e.pan || "-"],
    ["PF UAN No", e.uan || "—", "Bank Account", e.bankAcc ? `XXXX${e.bankAcc.slice(-4)}` : "-"],
    ["Bank IFSC", e.bankIfsc || "-", "Present Days", presentDaysDisplay],
  ];

  autoTable(doc, {
    startY: 37,
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      font: "helvetica",
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
      1: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 58 },
      2: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
      3: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 58 },
    },
    body: employeeDetails,
    margin: { left: 14, right: 14 },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.5,
  });

  // 3. Itemized Earnings & Deductions Table
  // Build active earnings rows from computed earnings list
  const earningsRows: { label: string; amount: number }[] = [];
  (p.earningsList || []).forEach((el) => {
    if (el.amount > 0) {
      earningsRows.push({ label: el.name, amount: el.amount });
    }
  });

  // Build active deductions rows
  const deductionsRows: { label: string; amount: number }[] = [];
  if (p.deductions.employeePF > 0) deductionsRows.push({ label: "Provident Fund (Employee PF)", amount: p.deductions.employeePF });
  if (p.deductions.employeeESI > 0) deductionsRows.push({ label: "Employee State Insurance (ESI)", amount: p.deductions.employeeESI });
  if (p.deductions.professionalTax > 0) deductionsRows.push({ label: "Professional Tax (PT)", amount: p.deductions.professionalTax });
  if (p.deductions.tds > 0) deductionsRows.push({ label: "Tax Deducted at Source (TDS)", amount: p.deductions.tds });
  if (p.deductions.loan > 0) deductionsRows.push({ label: "Loan EMI Deduction", amount: p.deductions.loan });
  if (p.deductions.advance > 0) deductionsRows.push({ label: "Salary Advance Recovery", amount: p.deductions.advance });
  if (p.deductions.lwf > 0) deductionsRows.push({ label: "Labour Welfare Fund (LWF)", amount: p.deductions.lwf });

  // Add any extra dynamic deductions
  (p.extraDeductions || []).forEach((ed) => {
    if (ed.amount > 0 && !deductionsRows.some((r) => r.label === ed.name)) {
      deductionsRows.push({ label: ed.name, amount: ed.amount });
    }
  });

  // Pair earnings and deductions rows side-by-side
  const maxRows = Math.max(earningsRows.length, deductionsRows.length);
  const tableBody: any[] = [];

  for (let i = 0; i < maxRows; i++) {
    const earn = earningsRows[i];
    const ded = deductionsRows[i];
    tableBody.push([
      earn ? earn.label : "",
      earn ? formatPdfCurrency(earn.amount) : "",
      ded ? ded.label : "",
      ded ? formatPdfCurrency(ded.amount) : "",
    ]);
  }

  // Add Gross & Total Deductions Summary row
  tableBody.push([
    { content: "Total Gross Earnings", styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
    { content: formatPdfCurrency(p.gross), styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249] } },
    { content: "Total Deductions", styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
    { content: formatPdfCurrency(p.totalDeductions), styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249], textColor: [225, 29, 72] } },
  ]);

  const yAfterMeta = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: yAfterMeta,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      font: "helvetica",
    },
    head: [["EARNINGS", "AMOUNT", "DEDUCTIONS", "AMOUNT"]],
    headStyles: {
      fillColor: [15, 23, 42], // Corporate dark slate #0F172A
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 56 },
      1: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 56 },
      3: { cellWidth: 35, halign: "right", fontStyle: "bold" },
    },
    body: tableBody,
    margin: { left: 14, right: 14 },
  });

  // 4. Net Salary Payable Box (Corporate Dark Slate/Black Theme matching Header)
  const yAfterTable = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: yAfterTable,
    theme: "plain",
    styles: { font: "helvetica" },
    body: [
      [
        {
          content: "NET TAKE-HOME SALARY PAYABLE",
          styles: {
            fontSize: 9.5,
            fontStyle: "bold",
            textColor: [255, 255, 255],
            fillColor: [15, 23, 42], // Deep Navy / Slate #0F172A
            cellPadding: 4,
          },
        },
        {
          content: formatPdfCurrency(p.net),
          styles: {
            fontSize: 13,
            fontStyle: "bold",
            halign: "right",
            textColor: [255, 255, 255],
            fillColor: [15, 23, 42],
            cellPadding: 4,
          },
        },
      ],
      [
        {
          content: `Amount in Words: ${numberToWordsIndian(p.net)}`,
          colSpan: 2,
          styles: {
            fontSize: 8,
            fontStyle: "bold",
            textColor: [71, 85, 105],
            fillColor: [248, 250, 252],
            cellPadding: 3,
          },
        },
      ],
    ],
    margin: { left: 14, right: 14 },
    tableLineColor: [15, 23, 42],
    tableLineWidth: 0.5,
  });

  // 5. Security Footer & Compliance Notice
  const yFooter = (doc as any).lastAutoTable.finalY + 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, yFooter, 196, yFooter);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This is a computer-generated payslip issued via SWIFT HRMS and does not require a physical signature.",
    14,
    yFooter + 5
  );
  doc.text(
    `Generated on ${new Date().toLocaleString()} · Confidential & Privileged Document`,
    14,
    yFooter + 9
  );

  // Save the PDF
  doc.save(`Payslip_${e.empCode || "EMP"}_${month}.pdf`);
}

export async function generateAppointmentPDF(
  c: Company,
  e: Employee,
  p: PayrollComputation,
  assets?: {
    logoDataUrl?: string;
    companySealDataUrl?: string;
    authorisedSignatoryDataUrl?: string;
    digitalCertificateName?: string;
  }
) {
  const { company: prepCompany, assets: prepAssets } = await prepareDocAssets(c, assets as any);
  const doc = new jsPDF();
  const effectiveLogo = prepAssets?.logoDataUrl || prepCompany.logoDataUrl;
  drawCorporateHeader(doc, prepCompany, "LETTER OF APPOINTMENT", undefined, effectiveLogo);

  // Date and Reference
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 14, 39);
  doc.text(`Ref: SWIFT/APT/${e.empCode || "EMP"}`, 196, 39, { align: "right" });

  const body = (c.appointmentTemplate || "")
    .replaceAll("{{name}}", e.name || "")
    .replaceAll("{{designation}}", e.designation || "")
    .replaceAll("{{department}}", e.department || "")
    .replaceAll("{{company}}", c.legalName || c.name || "")
    .replaceAll("{{doj}}", e.doj || "")
    .replaceAll("{{empCode}}", e.empCode || "")
    .replaceAll("{{ctc}}", formatPdfCurrency(p.annualCTC))
    .replaceAll("{{gross}}", formatPdfCurrency(p.gross));

  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(body, 182);
  doc.text(lines, 14, 46);

  const yBreakup = 46 + lines.length * 5 + 4;

  autoTable(doc, {
    startY: yBreakup,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 2.2, font: "helvetica", textColor: [30, 41, 59] },
    head: [["Salary Component", "Monthly Amount", "Annual Amount"]],
    body: [
      ["Basic Pay", formatPdfCurrency(e.basic), formatPdfCurrency(e.basic * 12)],
      ["House Rent Allowance (HRA)", formatPdfCurrency(e.basic * ((c.hraPct || 16.67) / 100)), formatPdfCurrency(e.basic * ((c.hraPct || 16.67) / 100) * 12)],
      ["Dearness Allowance (DA)", formatPdfCurrency(e.basic * ((c.daPct || 13.33) / 100)), formatPdfCurrency(e.basic * ((c.daPct || 13.33) / 100) * 12)],
      ["Other Allowances (OA / CA / LTA)", formatPdfCurrency(e.basic * (((c.oaPct || 16.67) + (c.caPct || 16.67) + (c.ltaPct || 16.67)) / 100)), formatPdfCurrency(e.basic * (((c.oaPct || 16.67) + (c.caPct || 16.67) + (c.ltaPct || 16.67)) / 100) * 12)],
      [
        { content: "Total Gross Salary", styles: { fontStyle: "bold" } },
        { content: formatPdfCurrency(p.gross), styles: { fontStyle: "bold" } },
        { content: formatPdfCurrency(p.gross * 12), styles: { fontStyle: "bold" } },
      ],
      ["Employer Statutory (PF + ESI + Gratuity)", formatPdfCurrency(p.totalEmployer), formatPdfCurrency(p.totalEmployer * 12)],
      [
        { content: "Total Cost to Company (CTC)", styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        { content: formatPdfCurrency(p.monthlyCTC), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        { content: formatPdfCurrency(p.annualCTC), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
      ],
    ],
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  let yEnd = (doc as any).lastAutoTable.finalY + 12;
  if (yEnd > 235) {
    doc.addPage();
    yEnd = 35;
  }

  // Two column signature block (Company Authorised Signatory + Employee E-Signature)
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  // Left: Company Signatory
  doc.setFont("helvetica", "bold");
  doc.text("For " + (prepCompany.legalName || prepCompany.name), 14, yEnd);
  const compSig = prepAssets?.authorisedSignatoryDataUrl;
  if (compSig) {
    drawImageSafe(doc, compSig, 14, yEnd + 3, 45, 14);
  }
  doc.setFont("helvetica", "normal");
  doc.text("_________________________", 14, yEnd + 20);
  doc.text("Authorised Signatory", 14, yEnd + 25);
  if (prepAssets?.digitalCertificateName) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Digitally verified: ${prepAssets.digitalCertificateName}`, 14, yEnd + 29);
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
  }

  // Company Seal overlay in middle
  const seal = prepAssets?.companySealDataUrl;
  if (seal) {
    drawImageSafe(doc, seal, 90, yEnd + 1, 28, 28);
  }

  // Right: Employee Signature & Acceptance
  const ACK_X = 130;
  doc.setFont("helvetica", "bold");
  doc.text("Employee Acceptance & E-Signature", ACK_X, yEnd);

  const empSigInfo = e.signedDocs?.["APT"] || e.signedDocs?.["appointment"];
  const isEmpSigned = !!empSigInfo || !!e.acceptance?.signed;
  const empSigImage = empSigInfo?.signatureDataUrl || e.acceptance?.signatureDataUrl;
  const empSigText = empSigInfo?.signatureText || (e.acceptance?.signed ? e.name : "");
  const empSignedAt = empSigInfo?.signedAt || e.acceptance?.signedAt;

  if (isEmpSigned) {
    if (empSigImage) {
      drawImageSafe(doc, empSigImage, ACK_X, yEnd + 3, 45, 14);
    } else if (empSigText) {
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(empSigText, ACK_X, yEnd + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
    }
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129); // emerald
    doc.setFont("helvetica", "bold");
    doc.text("DIGITALLY SIGNED & ACCEPTED (App)", ACK_X, yEnd + 19);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Signed: " + (empSignedAt ? new Date(empSignedAt).toLocaleString("en-IN") : "Recorded"), ACK_X, yEnd + 23);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Awaiting digital signature in app", ACK_X, yEnd + 14);
  }

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.text("_________________________", ACK_X, yEnd + 26);
  doc.setFont("helvetica", "bold");
  doc.text(`${e.name} (${e.empCode})`, ACK_X, yEnd + 31);

  // Security footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 285, 196, 285);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated via SWIFT HRMS · Confidential Employment Document · ${c.legalName || c.name}`, 14, 290);
  doc.text(`Page 1 of 1`, 196, 290, { align: "right" });

  doc.save(`Appointment_${e.empCode || "EMP"}.pdf`);
}
