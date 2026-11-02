import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type Employee, type Company, useStore, getBackendUrl } from "@/lib/store";
import {
  useDigitalDocStore,
  PRESET_DOCUMENTS,
  type DigitalDocument,
} from "@/lib/digital-documents";
import { useAuth } from "@/lib/auth";
import { computePayroll } from "@/lib/payroll";
import { toast } from "sonner";

/**
 * Fetches doc assets for the active tenant converted to base64 Data URLs,
 * preventing any CORS or asynchronous image loading issues in jsPDF.
 */
async function fetchBase64DocAssets(tenantId?: string | null): Promise<{
  letterheadDataUrl?: string;
  logoDataUrl?: string;
  companySealDataUrl?: string;
  authorisedSignatoryDataUrl?: string;
  footerDataUrl?: string;
}> {
  if (!tenantId) return {};
  try {
    const res = await fetch(`${getBackendUrl()}/api/companies/doc-assets-base64?tenantId=${tenantId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.docAssets) {
        return data.docAssets;
      }
    }
  } catch (err) {
    console.warn("[AppointmentLetterService] Error fetching base64 doc assets:", err);
  }

  // Fallback to locally stored docAssets if already base64
  const local = useStore.getState().docAssets || {};
  return {
    letterheadDataUrl: local.letterheadDataUrl?.startsWith("data:") ? local.letterheadDataUrl : undefined,
    logoDataUrl: local.logoDataUrl?.startsWith("data:") ? local.logoDataUrl : undefined,
    companySealDataUrl: local.companySealDataUrl?.startsWith("data:") ? local.companySealDataUrl : undefined,
    authorisedSignatoryDataUrl: local.authorisedSignatoryDataUrl?.startsWith("data:") ? local.authorisedSignatoryDataUrl : undefined,
    footerDataUrl: local.footerDataUrl?.startsWith("data:") ? local.footerDataUrl : undefined,
  };
}

/**
 * Finds the saved Appointment Letter template from the Documentations store,
 * strictly matching the active tenant and verifying it has template placeholders,
 * or falls back to the official preset template from the Documentations composer.
 */
export function getSavedAppointmentLetterTemplate(): {
  template: Partial<DigitalDocument>;
  isCustom: boolean;
} {
  const { documents } = useDigitalDocStore.getState();
  const activeTenantId = useAuth.getState().activeTenantId;

  // 1. Look for custom saved template explicitly saved under active tenant with template placeholders
  const savedDoc = (documents || []).find(
    (d) =>
      d.tenantId === activeTenantId &&
      !d.id.startsWith("doc-10") && // Exclude seed demo documents
      (d.documentType?.toLowerCase() === "appointment letter" ||
        d.name?.toLowerCase().includes("appointment") ||
        d.id === "appointment_letter") &&
      (d.contentHtml?.includes("{{") || d.status === "DRAFT")
  );

  if (savedDoc) {
    return { template: savedDoc, isCustom: true };
  }

  // 2. Use the official preset template from Documentations Composer
  const preset = PRESET_DOCUMENTS.find((p) => p.id === "appointment_letter") || PRESET_DOCUMENTS[0];
  return {
    template: {
      name: preset.name,
      documentType: preset.name,
      contentHtml: preset.templateBody,
      letterhead: preset.defaultLetterhead,
      footer: preset.defaultFooter,
      approvalMode: preset.defaultApprovalMode,
      approvers: (preset.defaultApprovers || ["HR Manager", "Authorized Signatory"]).map((role, idx) => ({
        id: `appr-${idx}`,
        approverRoleOrName: role,
        order: idx + 1,
        status: "approved",
      })),
      includeCompanySeal: true,
    },
    isCustom: false,
  };
}

/**
 * Resolves all placeholders in the template with the employee's actual verified profile and salary data.
 */
/**
 * Formats currency safely for jsPDF without character encoding corruption.
 * Standard built-in PDF fonts (Helvetica) use WinAnsiEncoding (Windows-1252) where
 * the Unicode Rupee symbol (₹ / \u20B9) is not defined and is misrendered as '¹' (superscript 1).
 * Using "Rs. " guarantees crisp, professional rendering across all PDF viewers and systems.
 */
export function formatInrForPdf(n: number, prefix: string = "Rs. "): string {
  const rounded = Math.round(n || 0);
  return `${prefix}${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(rounded)}`;
}

export function resolveAppointmentPlaceholders(
  rawTemplate: string,
  employee: Employee,
  company?: Company | null
): string {
  const safeComp = company || useStore.getState().company || ({} as Company);
  const nowStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Calculate actual CTC from payroll
  const p = computePayroll({
    company: safeComp,
    employee,
    daysWorked: safeComp.workingDaysPerMonth || 26,
    otHours: 0,
    incentive: 0,
    shiftDays: 0,
    loan: 0,
    advance: 0,
    bonus: 0,
  });

  const annualCTC = p.annualCTC || (employee.salary ? employee.salary * 12 : (employee.basic ? employee.basic * 12 : 720000));
  const monthlyCTC = p.monthlyCTC || Math.round(annualCTC / 12);
  const formattedCTC = `${formatInrForPdf(annualCTC)} per annum (${formatInrForPdf(monthlyCTC)}/month)`;

  const compName = company?.name || company?.legalName || safeComp.name || "Inkpen Erode";
  const compAddress = company?.address || safeComp.address || "Erode, Tamil Nadu, India";
  const compEmail = company?.email || safeComp.email || "inkpen.in@gmail.com";
  const compPhone = company?.phone || safeComp.phone || "+91 98765 43210";

  const prefixCode = compName.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "SWIFT";
  const refNo = `${prefixCode}/HR/${new Date().getFullYear()}/APPT-${employee.empCode || "101"}`;

  const dojFormatted = employee.doj && employee.doj !== "-"
    ? employee.doj
    : (employee as any).joiningDate || nowStr;

  const replacements: Record<string, string> = {
    "{{employee_name}}": employee.name || "Employee Name",
    "{{name}}": employee.name || "Employee Name",
    "{{emp_code}}": employee.empCode || "EMP-001",
    "{{empCode}}": employee.empCode || "EMP-001",
    "{{employee_code}}": employee.empCode || "EMP-001",
    "{{designation}}": employee.designation || "Staff Member",
    "{{role}}": employee.designation || "Staff Member",
    "{{department}}": employee.department || "General",
    "{{date_of_joining}}": dojFormatted,
    "{{doj}}": dojFormatted,
    "{{joining_date}}": dojFormatted,
    "{{manager_name}}": employee.reportingManager || (employee as any).reportingTo || "Managing Director",
    "{{salary}}": formattedCTC,
    "{{annualCTC}}": formatInrForPdf(annualCTC),
    "{{monthlyCTC}}": formatInrForPdf(monthlyCTC),
    "{{gross}}": formatInrForPdf(p.gross || monthlyCTC),
    "{{employee_email}}": employee.email || (employee as any).workEmail || "employee@company.com",
    "{{employee_phone}}": employee.phone || "+91 98765 43210",
    "{{employee_address}}": employee.address || (employee as any).addressLine1 || "Tamil Nadu, India",
    "{{company_name}}": compName,
    "{{company}}": compName,
    "{{company_address}}": compAddress,
    "{{company_email}}": compEmail,
    "{{company_phone}}": compPhone,
    "{{authorized_signatory}}": (company as any)?.authorizedSignatory || "Managing Director",
    "{{current_date}}": nowStr,
    "{{today}}": nowStr,
    "{{reference_no}}": refNo,
  };

  let resolved = rawTemplate;
  for (const [key, val] of Object.entries(replacements)) {
    const escaped = key.replace(/[{()}]/g, "\\$&");
    resolved = resolved.replace(new RegExp(escaped, "g"), val);
  }

  // Strip editor artifacts
  resolved = resolved.replace(/<button[^>]*class=["'][^"']*delete-payslip-btn[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, "");
  return resolved;
}

/**
 * Compiles and generates a professional PDF from the saved Appointment Letter template,
 * with full letterhead logo embedding, dynamic placeholder resolution, salary table, and dual signatures.
 */
export async function generateAppointmentLetterPDF(
  employee: Employee,
  company?: Company | null
): Promise<{ pdfBase64: string; fileName: string; resolvedHtml: string }> {
  const activeTenantId = useAuth.getState().activeTenantId;
  const safeComp = company || useStore.getState().company || ({} as Company);

  // 1. Fetch base64 assets from backend to ensure error-free embedding in jsPDF
  const base64Assets = await fetchBase64DocAssets(activeTenantId);

  // 2. Retrieve template and resolve placeholders
  const { template } = getSavedAppointmentLetterTemplate();
  const rawHtml = template.contentHtml || "<p>Formal Appointment Letter</p>";
  const resolvedHtml = resolveAppointmentPlaceholders(rawHtml, employee, safeComp);

  // Clean HTML to readable paragraphs for PDF text layout
  const cleanText = resolvedHtml
    .replace(/<li[^>]*>/gi, "\n  • ")
    .replace(/<\/li>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[₹\u20B9]/g, "Rs. ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();

  // 3. Initialize PDF (A4 format)
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  let currentY = 40;

  // 4. Render Letterhead
  const letterheadImg = base64Assets.letterheadDataUrl || base64Assets.logoDataUrl;
  if (letterheadImg && letterheadImg.startsWith("data:")) {
    try {
      // Draw letterhead banner / logo centered at top
      const imgWidth = 140;
      const imgHeight = 55;
      const xPos = (595.28 - imgWidth) / 2; // Centered on A4 (595.28 pt wide)
      pdf.addImage(letterheadImg, "PNG", xPos, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 15;

      // Subtle company divider
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(1);
      pdf.line(40, currentY, 555, currentY);
      currentY += 20;
    } catch (imgErr) {
      console.warn("[AppointmentLetterPDF] Error rendering letterhead image:", imgErr);
    }
  }

  // If no letterhead image or below image, ensure header text exists if needed
  if (!letterheadImg) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42);
    pdf.text(safeComp.name || "INKPEN ERODE", 40, currentY + 15);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(safeComp.address || "Erode, Tamil Nadu, India", 40, currentY + 28);
    pdf.text(`Email: ${safeComp.email || "inkpen.in@gmail.com"} | Phone: ${safeComp.phone || "+91 98765 43210"}`, 40, currentY + 40);

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(1.5);
    pdf.line(40, currentY + 50, 555, currentY + 50);
    currentY += 70;
  }

  // 5. Document Header Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(30, 41, 59);
  pdf.text("OFFICIAL LETTER OF APPOINTMENT", 40, currentY);
  currentY += 20;

  // 6. Body Text
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(51, 65, 85);
  const splitLines = pdf.splitTextToSize(cleanText, 515);

  // Check if text exceeds page height
  for (const line of splitLines) {
    if (currentY > 750) {
      pdf.addPage();
      currentY = 50;
    }
    pdf.text(line, 40, currentY);
    currentY += 13.5;
  }

  currentY += 15;

  // 7. Compensation Breakdown Table (Annexure)
  const p = computePayroll({
    company: safeComp,
    employee,
    daysWorked: safeComp.workingDaysPerMonth || 26,
    otHours: 0,
    incentive: 0,
    shiftDays: 0,
    loan: 0,
    advance: 0,
    bonus: 0,
  });

  const annualCTC = p.annualCTC || (employee.salary ? employee.salary * 12 : (employee.basic ? employee.basic * 12 : 720000));
  const monthlyCTC = p.monthlyCTC || Math.round(annualCTC / 12);
  const basicMonthly = p.earnings?.basic || employee.basic || Math.round(monthlyCTC * 0.5);
  const hraMonthly = p.earnings?.hra || Math.round(basicMonthly * 0.4);
  const specialMonthly = Math.max(0, (p.gross || monthlyCTC) - basicMonthly - hraMonthly);

  const tableRows = [
    ["Basic Pay", formatInrForPdf(basicMonthly), formatInrForPdf(basicMonthly * 12), "Base Compensation (Taxable)"],
    ["House Rent Allowance (HRA)", formatInrForPdf(hraMonthly), formatInrForPdf(hraMonthly * 12), "Tax Exemption per IT Rules"],
    ["Special Allowance", formatInrForPdf(specialMonthly), formatInrForPdf(specialMonthly * 12), "Monthly Allowance (Taxable)"],
    ["Monthly Gross Pay", formatInrForPdf(p.gross || monthlyCTC), formatInrForPdf((p.gross || monthlyCTC) * 12), "Pre-tax Gross Earnings"],
    ["Total Annual CTC", formatInrForPdf(monthlyCTC), formatInrForPdf(annualCTC), "Cost to Company (Annual)"],
  ];

  if (currentY > 600) {
    pdf.addPage();
    currentY = 50;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text("Annexure: Compensation Structure", 40, currentY);
  currentY += 10;

  autoTable(pdf, {
    startY: currentY,
    head: [["Salary Component", "Monthly (INR)", "Annual (INR)", "Structure / Remarks"]],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  currentY = (pdf as any).lastAutoTable.finalY + 35;

  // 8. Signatures (Dual-Party Layout: Company Official on Left, Employee Acceptance on Right)
  if (currentY > 680) {
    pdf.addPage();
    currentY = 60;
  }

  const compName = safeComp.name || "Inkpen Erode";
  const leftX = 40;
  const rightX = 380;

  // Company Side (Left)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`For ${compName}`, leftX, currentY);

  // Embed Authorized Signature if present
  if (base64Assets.authorisedSignatoryDataUrl && base64Assets.authorisedSignatoryDataUrl.startsWith("data:")) {
    try {
      pdf.addImage(base64Assets.authorisedSignatoryDataUrl, "PNG", leftX, currentY + 8, 70, 28);
    } catch (e) {
      console.warn("Could not render signature image:", e);
    }
  }

  // Embed Company Seal if present
  if (base64Assets.companySealDataUrl && base64Assets.companySealDataUrl.startsWith("data:")) {
    try {
      pdf.addImage(base64Assets.companySealDataUrl, "PNG", leftX + 110, currentY + 2, 45, 45);
    } catch (e) {
      console.warn("Could not render seal image:", e);
    }
  }

  // Signature divider lines
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(1);
  pdf.line(leftX, currentY + 45, leftX + 140, currentY + 45);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(30, 41, 59);
  pdf.text("Authorized Signatory", leftX, currentY + 58);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(compName, leftX, currentY + 70);

  // Employee Side (Right)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Employee Acceptance", rightX, currentY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("I accept the terms & conditions of employment.", rightX, currentY + 14);

  // If employee has a signed signature in profile
  const empSig = employee.acceptance?.signatureDataUrl || (employee as any).signedDocs?.appointment_letter?.signatureDataUrl;
  if (empSig && empSig.startsWith("data:")) {
    try {
      pdf.addImage(empSig, "PNG", rightX, currentY + 18, 70, 24);
    } catch {
      // ignore
    }
  }

  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(1);
  pdf.line(rightX, currentY + 45, rightX + 160, currentY + 45);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(30, 41, 59);
  pdf.text(employee.name || "Employee Signature", rightX, currentY + 58);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`ID: ${employee.empCode} | Date: ${new Date().toLocaleDateString("en-IN")}`, rightX, currentY + 70);

  // 9. Footers across all pages
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(1);
    pdf.line(40, 800, 555, 800);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`${compName} · Strictly Confidential Employment Agreement`, 40, 814);
    pdf.text(`Page ${i} of ${pageCount}`, 515, 814);
  }

  const fileName = `Appointment_Letter_${(employee.empCode || employee.name || "Employee").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  const pdfBase64 = pdf.output("datauristring");

  return { pdfBase64, fileName, resolvedHtml };
}

/**
 * Dispatches the appointment letter email with the attached PDF to the employee.
 */
export async function sendAppointmentLetterForEmployee(
  employee: Employee,
  company?: Company | null,
  options?: { manual?: boolean; notifySuccess?: boolean }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const recipientEmail = employee.email || (employee as any).workEmail || (employee as any).personalEmail;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    const errMsg = `Cannot send appointment letter: No valid email address on file for ${employee.name} (${employee.empCode}).`;
    if (options?.manual) toast.error(errMsg);
    return { success: false, error: errMsg };
  }

  try {
    const activeTenantId = useAuth.getState().activeTenantId;
    const safeComp = company || useStore.getState().company || ({} as Company);
    const compName = safeComp.name || safeComp.legalName || "Inkpen Erode";

    // Generate accurate PDF with real values and base64 letterhead & signatures
    const { pdfBase64, fileName } = await generateAppointmentLetterPDF(employee, safeComp);

    const subject = `Formal Letter of Appointment — ${employee.name} (${employee.empCode})`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #059669; margin: 0; font-size: 22px;">Formal Letter of Appointment</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 6px;">${compName} Workforce Operations</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Dear <strong>${employee.name}</strong> (Employee ID: <strong>${employee.empCode}</strong>),</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Congratulations on successfully completing <strong>100% of your onboarding process</strong> at <strong>${compName}</strong>!
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0; color: #166534; font-weight: bold; font-size: 14px;">📄 Official Appointment Letter Attached</p>
          <p style="margin: 8px 0 0 0; color: #15803d; font-size: 13px; line-height: 1.5;">
            Your officially verified Appointment Letter has been generated with your formal designation (<strong>${employee.designation || "Staff Member"}</strong>), department (<strong>${employee.department || "General"}</strong>), and approved compensation structure, and is attached to this email as a PDF document for your records.
          </p>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          We are thrilled to welcome you officially to our team and look forward to an impactful journey together.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          This is an official automated dispatch from ${compName} via SwiftHR Systems.
        </p>
      </div>
    `;

    const res = await fetch(`${getBackendUrl()}/api/employees/send-appointment-letter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: activeTenantId,
        employeeId: employee.id,
        empCode: employee.empCode,
        employeeName: employee.name,
        to: recipientEmail,
        subject,
        companyName: compName,
        htmlBody,
        pdfBase64,
        pdfFileName: fileName,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to dispatch appointment letter email");
    }

    // Update local store with sent timestamp
    const nowIso = new Date().toISOString();
    useStore.getState().updateEmployee(employee.id, {
      appointmentLetterSent: true,
      appointmentLetterSentAt: nowIso,
    });

    if (options?.notifySuccess !== false) {
      toast.success(
        `Appointment letter with attached PDF successfully emailed to ${employee.name} (${recipientEmail})!`
      );
    }

    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    console.error("[AppointmentLetterService] Error:", err);
    if (options?.manual) {
      toast.error(`Failed to send appointment letter: ${err.message}`);
    }
    return { success: false, error: err.message };
  }
}
