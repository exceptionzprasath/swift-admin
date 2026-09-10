import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Company, Employee, CompanyDocumentAssets } from "./store";
import type { PayrollComputation } from "./payroll";
import { drawImageSafe, drawImageContained, prepareDocAssets, resolveImageToDataUrl } from "./documents";
import { extractLogoPalette, DEFAULT_LOGO_PALETTE } from "./logo-theme";

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
  assetsOrLogo?: CompanyDocumentAssets | string
) {
  const company = c || ({} as Company);
  const employee = e || ({} as Employee);
  const comp = p || ({} as PayrollComputation);
  const deductions = comp.deductions || ({} as any);
  const earnings = comp.earnings || ({} as any);
  const net = Math.round(comp.net || 0);
  const gross = Math.round(comp.gross || 0);
  const totalDeductions = Math.round(comp.totalDeductions || 0);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const assets: CompanyDocumentAssets | undefined =
    typeof assetsOrLogo === "object" ? assetsOrLogo : undefined;

  const rawLogo = typeof assetsOrLogo === "string" ? assetsOrLogo : (assets?.logoDataUrl || company.logoDataUrl);
  let effectiveLogo: string | undefined = undefined;
  let letterheadUrl: string | undefined = undefined;
  let watermarkUrl: string | undefined = undefined;
  let footerUrl: string | undefined = undefined;

  try {
    effectiveLogo = await resolveImageToDataUrl(rawLogo);
    letterheadUrl = assets?.letterheadDataUrl ? await resolveImageToDataUrl(assets.letterheadDataUrl) : undefined;
    watermarkUrl = assets?.watermarkDataUrl ? await resolveImageToDataUrl(assets.watermarkDataUrl) : effectiveLogo;
    footerUrl = assets?.footerDataUrl ? await resolveImageToDataUrl(assets.footerDataUrl) : undefined;
  } catch (err) {
    console.warn("[PDF] Image resolution warning:", err);
  }

  // Extract dynamic colors matching uploaded company letterhead or logo
  let palette = DEFAULT_LOGO_PALETTE;
  try {
    const brandImageSource = letterheadUrl || effectiveLogo;
    if (brandImageSource) {
      palette = await extractLogoPalette(brandImageSource);
    }
  } catch {
    palette = DEFAULT_LOGO_PALETTE;
  }

  const safeR = (val: any, def: number) =>
    typeof val === "number" && !isNaN(val) ? Math.max(0, Math.min(255, Math.round(val))) : def;

  const pR = safeR(palette?.primaryRgb?.[0], 15);
  const pG = safeR(palette?.primaryRgb?.[1], 23);
  const pB = safeR(palette?.primaryRgb?.[2], 42);

  const pdR = safeR(palette?.primaryDarkRgb?.[0], 10);
  const pdG = safeR(palette?.primaryDarkRgb?.[1], 15);
  const pdB = safeR(palette?.primaryDarkRgb?.[2], 30);

  const aR = safeR(palette?.accentRgb?.[0], 6);
  const aG = safeR(palette?.accentRgb?.[1], 182);
  const aB = safeR(palette?.accentRgb?.[2], 212);

  const cleanPrimaryRgb: [number, number, number] = [pR, pG, pB];
  const cleanPrimaryDarkRgb: [number, number, number] = [pdR, pdG, pdB];
  const cleanAccentRgb: [number, number, number] = [aR, aG, aB];

  // Helper to safely get finalY from autoTable
  const getLastTableY = (defaultY: number): number => {
    const finalY = (doc as any).lastAutoTable?.finalY;
    return typeof finalY === "number" && !isNaN(finalY) ? finalY : defaultY;
  };

  // Format Month & Year strings
  const safeMonth = month || new Date().toISOString().slice(0, 7);
  let formattedMonthDateStr = `01-${safeMonth}`;
  let formattedMonthNameStr = safeMonth;
  try {
    const [y, m] = safeMonth.split("-");
    if (y && m) {
      formattedMonthDateStr = `01-${m}-${y}`;
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      formattedMonthNameStr = d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
    }
  } catch {
    // fallback
  }

  const workingDays = company.workingDaysPerMonth || 26;
  const actualPresent = comp.daysWorked !== undefined ? comp.daysWorked : (paidDays !== undefined ? paidDays : workingDays);
  const weekOffs = weekOffDaysCount !== undefined ? weekOffDaysCount : 4;
  const effectivePaidDays = paidDays !== undefined ? paidDays : actualPresent + weekOffs;

  let totalMonthDays = 30;
  try {
    const [y, m] = safeMonth.split("-");
    if (y && m) {
      totalMonthDays = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    }
  } catch {
    totalMonthDays = 30;
  }

  const fixedGross = comp.fixedGross || employee.basic || 30000;
  const dailyPaySlab = workingDays > 0 ? Math.round(fixedGross / workingDays) : Math.round(fixedGross / 30);
  const prorateFactor = workingDays > 0 ? Math.min(1, actualPresent / workingDays) : 1;

  // Master Rate Breakdown
  const basicPct = company.basicPct ?? 20;
  const daPct = company.daEnabled !== false ? (company.daPct ?? 13.33) : 0;
  const combinedBasicDaPct = basicPct + daPct;
  const hraPct = company.hraPct ?? 16.67;
  const caPct = company.caPct ?? 16.67;
  const oaPct = company.oaPct ?? 16.67;
  const ltaPct = company.ltaPct ?? 16.67;

  // Rate of Pay (Monthly Target / Base Rates)
  const rateBasicDA = Math.round(fixedGross * (combinedBasicDaPct / 100));
  const rateHRA = company.hraEnabled !== false ? Math.round(fixedGross * (hraPct / 100)) : 0;
  const rateCA = company.caEnabled !== false ? Math.round(fixedGross * (caPct / 100)) : 0;
  const rateOA = company.oaEnabled !== false ? Math.round(fixedGross * (oaPct / 100)) : 0;
  const rateLTA = company.ltaEnabled !== false ? Math.round(fixedGross * (ltaPct / 100)) : 0;

  const rateItems: { name: string; rate: number }[] = [
    { name: "BASIC + DA", rate: rateBasicDA },
  ];
  if (rateHRA > 0) rateItems.push({ name: "HRA (HOUSE RENT)", rate: rateHRA });
  if (rateCA > 0) rateItems.push({ name: "CONVEYANCE ALW", rate: rateCA });
  if (rateOA > 0) rateItems.push({ name: "SPECIAL / OTHER ALW", rate: rateOA });
  if (rateLTA > 0) rateItems.push({ name: "L.T.A", rate: rateLTA });

  const customEarnings = (company.earnings || []).filter(
    (item) => !["basic", "da", "hra", "oa", "ca", "lta", "ot", "shift", "incentive", "bonus", "arrears"].includes(item.id)
  );
  customEarnings.forEach((compItem) => {
    let monthlyVal = 0;
    if (compItem.formula === "pctOfBasic") monthlyVal = Math.round(rateBasicDA * (compItem.value / 100));
    else if ((compItem as any).formula === "pctOfGross") monthlyVal = Math.round(fixedGross * (compItem.value / 100));
    else monthlyVal = compItem.value || 0;
    if (monthlyVal > 0) rateItems.push({ name: (compItem.name || "ALLOWANCE").toUpperCase(), rate: monthlyVal });
  });

  const totalRateOfPay = rateItems.reduce((acc, r) => acc + r.rate, 0);

  // Dynamic Earned Items directly from comp.earningsList
  const earnedItems: { name: string; amount: number }[] = [];

  if (comp.earningsList && comp.earningsList.length > 0) {
    let combinedBasicDaAmt = 0;
    let foundBasicOrDa = false;

    // Extract basic + da
    comp.earningsList.forEach((el) => {
      const idLower = (el.id || "").toLowerCase();
      const nameLower = (el.name || "").toLowerCase();
      if (idLower === "basic" || idLower === "da" || nameLower.includes("basic") || nameLower.includes("dearness")) {
        combinedBasicDaAmt += el.amount || 0;
        foundBasicOrDa = true;
      }
    });

    if (foundBasicOrDa || combinedBasicDaAmt > 0) {
      earnedItems.push({ name: "BASIC + DA", amount: combinedBasicDaAmt });
    }

    // Extract other known heads and custom heads
    comp.earningsList.forEach((el) => {
      const idLower = (el.id || "").toLowerCase();
      const nameLower = (el.name || "").toLowerCase();

      if (idLower === "basic" || idLower === "da" || nameLower.includes("basic") || nameLower.includes("dearness")) {
        return;
      }

      let displayName = (el.name || "ALLOWANCE").toUpperCase();
      if (idLower === "hra" || nameLower.includes("hra") || nameLower.includes("house rent")) {
        displayName = "HRA (HOUSE RENT)";
      } else if (idLower === "ca" || nameLower.includes("conveyance")) {
        displayName = "CONVEYANCE ALW";
      } else if (idLower === "oa" || nameLower.includes("other allowance") || nameLower.includes("special")) {
        displayName = "SPECIAL / OTHER ALW";
      } else if (idLower === "lta" || nameLower.includes("leave travel")) {
        displayName = "L.T.A";
      } else if (idLower === "bonus" || nameLower.includes("bonus")) {
        displayName = "ATTENDANCE / BONUS";
      } else if (idLower === "incentive" || nameLower.includes("incentive")) {
        displayName = "PERF. INCENTIVE";
      } else if (idLower === "overtime" || idLower === "ot" || nameLower.includes("overtime")) {
        displayName = "OVERTIME PAY (OT)";
      } else if (idLower === "variablepay" || nameLower.includes("variable")) {
        displayName = "VARIABLE PAY";
      } else if (idLower === "night" || nameLower.includes("night")) {
        displayName = "NIGHT SHIFT ALW";
      }

      if (el.amount > 0 && !earnedItems.some((item) => item.name === displayName)) {
        earnedItems.push({ name: displayName, amount: el.amount });
      }
    });
  }

  // Fallback if comp.earningsList was not populated
  if (earnedItems.length === 0) {
    const rawBasic = (earnings?.basic || 0) + ((earnings as any)?.da || 0);
    const earnedBasicDA = rawBasic > 0 ? rawBasic : Math.round(rateBasicDA * prorateFactor);
    earnedItems.push({ name: "BASIC + DA", amount: earnedBasicDA });

    const earnedHRA = earnings?.hra > 0 ? earnings.hra : Math.round(rateHRA * prorateFactor);
    if (earnedHRA > 0) earnedItems.push({ name: "HRA (HOUSE RENT)", amount: earnedHRA });

    const earnedCA = earnings?.conveyance > 0 ? earnings.conveyance : Math.round(rateCA * prorateFactor);
    if (earnedCA > 0) earnedItems.push({ name: "CONVEYANCE ALW", amount: earnedCA });

    const earnedOA = earnings?.special > 0 ? earnings.special : Math.round(rateOA * prorateFactor);
    if (earnedOA > 0) earnedItems.push({ name: "SPECIAL / OTHER ALW", amount: earnedOA });

    const earnedLTA = earnings?.other > 0 ? earnings.other : Math.round(rateLTA * prorateFactor);
    if (earnedLTA > 0) earnedItems.push({ name: "L.T.A", amount: earnedLTA });

    if (earnings?.bonus > 0) earnedItems.push({ name: "ATTENDANCE / BONUS", amount: earnings.bonus });
    if (earnings?.incentive > 0) earnedItems.push({ name: "PERF. INCENTIVE", amount: earnings.incentive });
    if (earnings?.overtime > 0) earnedItems.push({ name: "OVERTIME PAY (OT)", amount: earnings.overtime });
    if (earnings?.variablePay > 0) earnedItems.push({ name: "VARIABLE PAY", amount: earnings.variablePay });
  }

  if (!earnedItems.some((ei) => ei.name === "BASIC + DA")) {
    earnedItems.unshift({ name: "BASIC + DA", amount: Math.round(rateBasicDA * prorateFactor) });
  }

  // Dynamic Deductions Items
  const deductionItems: { name: string; amount: number }[] = [];
  if ((deductions.employeePF || 0) > 0) deductionItems.push({ name: "EPF (EMPLOYEE PF)", amount: deductions.employeePF });
  if ((deductions.employeeESI || 0) > 0) deductionItems.push({ name: "ESIC (ESI)", amount: deductions.employeeESI });
  if ((deductions.professionalTax || 0) > 0) deductionItems.push({ name: "PROFESSIONAL TAX", amount: deductions.professionalTax });
  if ((deductions.tds || 0) > 0) deductionItems.push({ name: "TDS (INCOME TAX)", amount: deductions.tds });
  if ((deductions.lwf || 0) > 0) deductionItems.push({ name: "LABOUR WELFARE", amount: deductions.lwf });
  if ((deductions.advance || 0) > 0) deductionItems.push({ name: "SALARY ADVANCE", amount: deductions.advance });
  if ((deductions.loan || 0) > 0) deductionItems.push({ name: "LOAN EMI DEDUCTION", amount: deductions.loan });

  (comp.extraDeductions || []).forEach((ed) => {
    if (ed.amount > 0 && !deductionItems.some((d) => d.name.toLowerCase() === (ed.name || "").toLowerCase())) {
      deductionItems.push({ name: (ed.name || "DEDUCTION").toUpperCase(), amount: ed.amount });
    }
  });

  if (deductionItems.length === 0) {
    deductionItems.push({ name: "NIL DEDUCTIONS", amount: 0 });
  }

  // =========================================================================
  // WATERMARK (Center of A4 Page with subtle opacity and proportional scaling)
  // =========================================================================
  if (watermarkUrl) {
    try {
      if (typeof (doc as any).saveGraphicsState === "function") {
        (doc as any).saveGraphicsState();
        const gs = doc as any;
        if (gs.setGState && typeof gs.GState === "function") {
          gs.setGState(new gs.GState({ opacity: 0.045 }));
        }
        drawImageContained(doc, watermarkUrl, (210 - 100) / 2, 95, 100, 100);
        (doc as any).restoreGraphicsState();
      }
    } catch {
      // ignore watermark error
    }
  }

  let tableStartY = 35;
  let currentHeaderY = 8;

  // =========================================================================
  // TOP LETTERHEAD & BRAND HEADER BANNER (Matching Logo Color Palette)
  // =========================================================================
  if (letterheadUrl) {
    const renderedLetterhead = drawImageContained(doc, letterheadUrl, 14, 8, 182, 22);
    const letterheadBottom = renderedLetterhead ? renderedLetterhead.y + renderedLetterhead.h + 2 : 28;
    doc.setFillColor(aR, aG, aB);
    doc.rect(14, letterheadBottom, 182, 0.6, "F");
    currentHeaderY = letterheadBottom + 2.5;
  }

  // Dynamic Primary Dark Banner from Logo (Always rendered for consistent corporate appearance)
  const bannerHeight = letterheadUrl ? 18 : 22;
  doc.setFillColor(pdR, pdG, pdB);
  doc.rect(14, currentHeaderY, 182, bannerHeight, "F");

  // Dynamic Accent Strip from Logo
  doc.setFillColor(aR, aG, aB);
  doc.rect(14, currentHeaderY + bannerHeight, 182, 0.8, "F");

  // Company Name (Left)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(letterheadUrl ? 10.5 : 12);
  doc.text((company.legalName || company.name || "SWIFT HRMS").toUpperCase(), 18, currentHeaderY + (letterheadUrl ? 6.5 : 7.5));

  // Subtitle Badge (Left)
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("SALARY / WAGE SLIP & TIME CARD", 18, currentHeaderY + (letterheadUrl ? 13 : 14.5));

  // Address (Right Side - clean right-aligned)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(226, 232, 240); // High contrast light text #E2E8F0
  const addressText = company.address || "Corporate Office";
  const addressLines = doc.splitTextToSize(addressText, 85);
  doc.text(addressLines, 192, currentHeaderY + (letterheadUrl ? 6.5 : 7.5), { align: "right" });

  tableStartY = currentHeaderY + bannerHeight + 3;

  // 2. Employee Metadata Table
  const employeeMetaRows = [
    [
      { content: "Name", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.name || "—"}`, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
      { content: "Employee Code", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.empCode || "—"}`, styles: { fontStyle: "bold", textColor: cleanPrimaryRgb } },
      { content: "Designation", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.designation || "—"}`, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
    ],
    [
      { content: "Gender", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.gender ? employee.gender.toUpperCase() : "—"}`, styles: { textColor: [15, 23, 42] } },
      { content: "Month & Year", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${formattedMonthDateStr}`, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
      { content: "Father Name", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.fatherName || "—"}`, styles: { textColor: [15, 23, 42] } },
    ],
    [
      { content: "D.O.J", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.doj || "—"}`, styles: { textColor: [15, 23, 42] } },
      { content: "D.O.B", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.dob || "—"}`, styles: { textColor: [15, 23, 42] } },
      { content: "Pay Slab", styles: { fontStyle: "bold", textColor: cleanPrimaryRgb, fillColor: [240, 249, 255] } },
      { content: `: Rs. ${dailyPaySlab}/day`, styles: { fontStyle: "bold", textColor: cleanPrimaryRgb } },
    ],
    [
      { content: "PF / UAN", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.uan || employee.pfNumber || "—"}`, styles: { textColor: [15, 23, 42] } },
      { content: "ESI No", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.esic || (comp.esiEligible ? "Applicable" : "NA")}`, styles: { textColor: [15, 23, 42] } },
      { content: "PAN / Dept", styles: { fontStyle: "bold", textColor: [71, 85, 105], fillColor: [248, 250, 252] } },
      { content: `: ${employee.pan || "—"} · ${employee.department || "General"}`, styles: { textColor: [15, 23, 42] } },
    ],
  ];

  // 2. Employee Metadata Table
  console.log("[PDF Step] 1: Drawing Employee Metadata");
  autoTable(doc, {
    startY: tableStartY,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      font: "helvetica",
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 42 },
      2: { cellWidth: 24 },
      3: { cellWidth: 36 },
      4: { cellWidth: 22 },
      5: { cellWidth: 38 },
    },
    body: employeeMetaRows as any,
    margin: { left: 14, right: 14 },
  });

  // 3. Attendance Section Table
  console.log("[PDF Step] 2: Drawing Attendance Summary");
  const yAfterEmp = getLastTableY(60) + 1.5;

  autoTable(doc, {
    startY: yAfterEmp,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      font: "helvetica",
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 18 },
      2: { cellWidth: 24 },
      3: { cellWidth: 22 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20 },
      6: { cellWidth: 28 },
      7: { cellWidth: 20 },
    },
    head: [
      [
        {
          content: "Attendance Summary",
          colSpan: 8,
          styles: {
            fillColor: cleanPrimaryRgb,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            fontSize: 8,
            cellPadding: 1.2,
          },
        },
      ],
    ],
    body: [
      [
        { content: "Month Days", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
        { content: `${totalMonthDays}`, styles: { fontStyle: "bold", halign: "center" } },
        { content: "Pay Days", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
        { content: `: ${effectivePaidDays}`, styles: { fontStyle: "bold", halign: "left" } },
        { content: "Sunday Work", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
        { content: `: 0`, styles: { halign: "left" } },
        { content: "Pending Advance", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
        { content: `: Rs. ${(deductions.advance || 0).toLocaleString("en-IN")}`, styles: { halign: "left" } },
      ],
      [
        { content: "Present", styles: { fontStyle: "bold", fillColor: [240, 253, 244], textColor: [21, 128, 61] } },
        { content: `: ${actualPresent}`, styles: { fontStyle: "bold", textColor: [21, 128, 61] } },
        { content: "Leave", styles: { fontStyle: "bold", fillColor: [254, 242, 242], textColor: [185, 28, 28] } },
        { content: `: 0`, styles: { textColor: [185, 28, 28] } },
        { content: "Week Off", styles: { fontStyle: "bold", fillColor: [238, 242, 255], textColor: [67, 56, 202] } },
        { content: `: ${weekOffs}`, styles: { fontStyle: "bold", textColor: [67, 56, 202] } },
        { content: "Holidays", styles: { fontStyle: "bold", fillColor: [254, 243, 199], textColor: [180, 83, 9] } },
        { content: `: 0`, styles: { fontStyle: "bold", textColor: [180, 83, 9] } },
      ],
    ],
    margin: { left: 14, right: 14 },
  });

  // 4. Earnings and Deductions Grid (2-Column Balanced Layout)
  console.log("[PDF Step] 3: Drawing Earnings & Deductions Grid");
  const yAfterAtt = getLastTableY(100) + 2;
  const maxRows = Math.max(earnedItems.length, deductionItems.length, 6);
  const mainTableRows: any[] = [];

  for (let i = 0; i < maxRows; i++) {
    const eItem = earnedItems[i];
    const dItem = deductionItems[i];

    mainTableRows.push([
      eItem ? eItem.name : "",
      eItem ? `: Rs. ${eItem.amount.toLocaleString("en-IN")}` : "",
      dItem ? dItem.name : "",
      dItem ? `: Rs. ${dItem.amount.toLocaleString("en-IN")}` : "",
    ]);
  }

  // Add Totals & Net Pay row
  mainTableRows.push([
    { content: "Gross Earnings", styles: { fontStyle: "bold", fillColor: [236, 253, 245], textColor: [5, 150, 105] } },
    { content: `: Rs. ${gross.toLocaleString("en-IN")}`, styles: { fontStyle: "bold", fillColor: [236, 253, 245], textColor: [5, 150, 105] } },
    { content: "Total Deductions", styles: { fontStyle: "bold", fillColor: [255, 241, 242], textColor: [225, 29, 72] } },
    { content: `: Rs. ${totalDeductions.toLocaleString("en-IN")}`, styles: { fontStyle: "bold", fillColor: [255, 241, 242], textColor: [225, 29, 72] } },
  ]);

  autoTable(doc, {
    startY: yAfterAtt,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.6,
      textColor: [30, 41, 59],
      font: "helvetica",
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    head: [
      [
        { content: "EARNINGS (ACTUAL EARNED)", colSpan: 2, styles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" } },
        { content: "DEDUCTIONS & RECOVERIES", colSpan: 2, styles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" } },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 59 },
      1: { cellWidth: 32 },
      2: { cellWidth: 59 },
      3: { cellWidth: 32 },
    },
    body: mainTableRows,
    margin: { left: 14, right: 14 },
  });

  // 5. Net Take Home Highlight Box & Bank Account Footer
  console.log("[PDF Step] 4: Drawing Net Take Home");
  const yAfterMain = getLastTableY(180) + 1.5;

  autoTable(doc, {
    startY: yAfterMain,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      font: "helvetica",
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 59 },
      2: { cellWidth: 46 },
      3: { cellWidth: 45 },
    },
    body: [
      [
        { content: "NET TAKE-HOME PAY", colSpan: 2, styles: { fontStyle: "bold", fillColor: cleanPrimaryDarkRgb, textColor: [255, 255, 255], fontSize: 8.5 } },
        { content: `: Rs. ${net.toLocaleString("en-IN")}`, colSpan: 2, styles: { fontStyle: "bold", fillColor: cleanPrimaryDarkRgb, textColor: [255, 255, 255], fontSize: 9.5, halign: "right" } },
      ],
      [
        { content: "IFSC CODE", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
        { content: `: ${employee.bankIfsc || "—"}`, styles: { fontStyle: "bold" } },
        { content: "CREDITED INTO ACCOUNT", styles: { fontStyle: "bold", fillColor: [248, 250, 252], halign: "center" } },
        { content: `: A/C NO : ${employee.bankAcc || "—"}`, styles: { fontStyle: "bold" } },
      ],
      [
        {
          content: `Amount in Words: ${numberToWordsIndian(net)}`,
          colSpan: 4,
          styles: {
            fontSize: 7.5,
            fontStyle: "bold",
            textColor: [71, 85, 105],
            fillColor: [248, 250, 252],
            cellPadding: 2,
          },
        },
      ],
    ],
    margin: { left: 14, right: 14 },
  });

  console.log("[PDF Step] 5: Drawing Security Footer");

  // 6. Security Footer & Optional Company Document Footer
  const yFooter = getLastTableY(248) + 3;

  if (footerUrl) {
    drawImageContained(doc, footerUrl, 14, yFooter, 182, 14);
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This is a computer-generated salary slip and time card issued via SWIFT HRMS and does not require a physical signature.",
      14,
      yFooter + 16
    );
    doc.text(
      `Generated on ${new Date().toLocaleString()} · Confidential & Privileged Document`,
      14,
      yFooter + 19.5
    );
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.line(14, yFooter, 196, yFooter);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This is a computer-generated salary slip and time card issued via SWIFT HRMS and does not require a physical signature.",
      14,
      yFooter + 3.5
    );
    doc.text(
      `Generated on ${new Date().toLocaleString()} · Confidential & Privileged Document`,
      14,
      yFooter + 7
    );
  }

  // Save the PDF with reliable browser trigger
  const safeEmpCode = (employee.empCode || "EMP001").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Payslip_${safeEmpCode}_${safeMonth}.pdf`;

  try {
    doc.save(filename);
  } catch (saveErr) {
    console.warn("[PDF] Direct doc.save failed, triggering blob URL fallback:", saveErr);
    try {
      const blob = doc.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch {
          // ignore
        }
      }, 1500);
    } catch (blobErr) {
      console.error("[PDF] Blob fallback failed:", blobErr);
      throw blobErr;
    }
  }
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
