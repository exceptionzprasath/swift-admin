import React from "react";
import { type Company, type Employee, type CompanyDocumentAssets } from "@/lib/store";
import { type PayrollComputation } from "@/lib/payroll";
import { numberToWordsIndian } from "@/lib/pdf";
import { useLogoPalette } from "@/lib/logo-theme";
import { Building2, Calendar, CreditCard, ShieldCheck, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PayslipTemplateViewProps {
  company: Company;
  employee: Employee;
  month: string; // e.g. "2025-02" or "2026-08"
  computation: PayrollComputation;
  docAssets?: CompanyDocumentAssets;
  paidDays?: number;
  rawPresentDays?: number;
  weekOffDays?: number;
  weekOffEnabled?: boolean;
  leaveDays?: number;
  holidayDays?: number;
  sundayWorkDays?: number;
  pendingAdvance?: number;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
  onClose?: () => void;
  hideActions?: boolean;
}

function formatInr(val: number): string {
  return (Math.round(val) || 0).toLocaleString("en-IN");
}

export const PayslipTemplateView: React.FC<PayslipTemplateViewProps> = ({
  company,
  employee,
  month,
  computation,
  docAssets,
  paidDays,
  rawPresentDays,
  weekOffDays = 4,
  weekOffEnabled = true,
  leaveDays = 0,
  holidayDays = 0,
  sundayWorkDays = 0,
  pendingAdvance = 0,
  onDownloadPdf,
  onPrint,
  onClose,
  hideActions = false,
}) => {
  // Extract dynamic colors matching uploaded company letterhead or logo
  const brandImageUrl = docAssets?.letterheadDataUrl || docAssets?.logoDataUrl || company.logoDataUrl;
  const palette = useLogoPalette(brandImageUrl);

  // Format Month & Year for display (e.g. "01-08-2026" and "AUGUST 2026")
  let formattedMonthDateStr = `01-${month}`;
  let formattedMonthNameStr = month;
  try {
    const [y, m] = month.split("-");
    if (y && m) {
      formattedMonthDateStr = `01-${m}-${y}`;
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      formattedMonthNameStr = d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
    }
  } catch {
    // fallback
  }

  const workingDays = company.workingDaysPerMonth || 26;
  const actualPresent = rawPresentDays !== undefined ? rawPresentDays : (computation.daysWorked !== undefined ? computation.daysWorked : workingDays);
  const effectivePaidDays = paidDays !== undefined ? paidDays : (weekOffEnabled ? actualPresent + weekOffDays : actualPresent);
  
  // Total calendar days in month
  let totalMonthDays = 30;
  try {
    const [y, m] = month.split("-");
    if (y && m) {
      totalMonthDays = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    }
  } catch {
    totalMonthDays = 30;
  }

  const fixedGross = computation.fixedGross || employee.basic || 30000;
  const dailyPaySlab = workingDays > 0 ? Math.round(fixedGross / workingDays) : Math.round(fixedGross / 30);
  const prorateFactor = workingDays > 0 ? Math.min(1, actualPresent / workingDays) : 1;

  // =========================================================================
  // DYNAMIC BREAKDOWN OF ACTIVE PROJECT EARNING HEADS
  // =========================================================================
  const basicPct = company.basicPct ?? 20;
  const daPct = company.daEnabled !== false ? (company.daPct ?? 13.33) : 0;
  const combinedBasicDaPct = basicPct + daPct;
  const hraPct = company.hraPct ?? 16.67;
  const caPct = company.caPct ?? 16.67;
  const oaPct = company.oaPct ?? 16.67;
  const ltaPct = company.ltaPct ?? 16.67;

  // -------------------------------------------------------------------------
  // 1. RATE OF PAY (MONTHLY TARGET / BASE RATES)
  // -------------------------------------------------------------------------
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

  // Custom Allowances (Rate of Pay)
  const customEarnings = (company.earnings || []).filter(
    (item) => !["basic", "da", "hra", "oa", "ca", "lta", "ot", "shift", "incentive", "bonus", "arrears"].includes(item.id)
  );
  customEarnings.forEach((c) => {
    let monthlyVal = 0;
    if (c.formula === "pctOfBasic") monthlyVal = Math.round(rateBasicDA * (c.value / 100));
    else if ((c as any).formula === "pctOfGross") monthlyVal = Math.round(fixedGross * (c.value / 100));
    else monthlyVal = c.value || 0;
    if (monthlyVal > 0) rateItems.push({ name: c.name.toUpperCase(), rate: monthlyVal });
  });

  const totalRateOfPay = rateItems.reduce((acc, r) => acc + r.rate, 0);

  // -------------------------------------------------------------------------
  // 2. EARNINGS (ACTUAL EARNED IN THIS MONTH)
  // Read directly from computation.earningsList & computation.earnings
  // -------------------------------------------------------------------------
  const earnedItems: { name: string; amount: number }[] = [];

  if (computation.earningsList && computation.earningsList.length > 0) {
    let combinedBasicDaAmt = 0;
    let foundBasicOrDa = false;

    // First pass: extract basic + da
    computation.earningsList.forEach((el) => {
      const idLower = el.id.toLowerCase();
      const nameLower = el.name.toLowerCase();
      if (idLower === "basic" || idLower === "da" || nameLower.includes("basic") || nameLower.includes("dearness")) {
        combinedBasicDaAmt += el.amount || 0;
        foundBasicOrDa = true;
      }
    });

    if (foundBasicOrDa || combinedBasicDaAmt > 0) {
      earnedItems.push({ name: "BASIC + DA", amount: combinedBasicDaAmt });
    }

    // Second pass: extract other known heads and custom heads
    computation.earningsList.forEach((el) => {
      const idLower = el.id.toLowerCase();
      const nameLower = el.name.toLowerCase();

      // Skip basic/da as they are already merged
      if (idLower === "basic" || idLower === "da" || nameLower.includes("basic") || nameLower.includes("dearness")) {
        return;
      }

      let displayName = el.name.toUpperCase();
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
        displayName = "PERFORMANCE INCENTIVE";
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

  // Fallback: If earnedItems is still empty or missing, derive from computation.earnings / rates
  if (earnedItems.length === 0) {
    const rawBasic = (computation.earnings?.basic || 0) + (computation.earnings as any)?.da;
    const earnedBasicDA = rawBasic > 0 ? rawBasic : Math.round(rateBasicDA * prorateFactor);
    earnedItems.push({ name: "BASIC + DA", amount: earnedBasicDA });

    const earnedHRA = computation.earnings?.hra > 0 ? computation.earnings.hra : Math.round(rateHRA * prorateFactor);
    if (earnedHRA > 0) earnedItems.push({ name: "HRA (HOUSE RENT)", amount: earnedHRA });

    const earnedCA = computation.earnings?.conveyance > 0 ? computation.earnings.conveyance : Math.round(rateCA * prorateFactor);
    if (earnedCA > 0) earnedItems.push({ name: "CONVEYANCE ALW", amount: earnedCA });

    const earnedOA = computation.earnings?.special > 0 ? computation.earnings.special : Math.round(rateOA * prorateFactor);
    if (earnedOA > 0) earnedItems.push({ name: "SPECIAL / OTHER ALW", amount: earnedOA });

    const earnedLTA = computation.earnings?.other > 0 ? computation.earnings.other : Math.round(rateLTA * prorateFactor);
    if (earnedLTA > 0) earnedItems.push({ name: "L.T.A", amount: earnedLTA });

    if (computation.earnings?.bonus > 0) earnedItems.push({ name: "ATTENDANCE / BONUS", amount: computation.earnings.bonus });
    if (computation.earnings?.incentive > 0) earnedItems.push({ name: "PERFORMANCE INCENTIVE", amount: computation.earnings.incentive });
    if (computation.earnings?.overtime > 0) earnedItems.push({ name: "OVERTIME PAY (OT)", amount: computation.earnings.overtime });
    if (computation.earnings?.variablePay > 0) earnedItems.push({ name: "VARIABLE PAY", amount: computation.earnings.variablePay });
  }

  // Ensure "BASIC + DA" is present as the primary wage row
  if (!earnedItems.some((ei) => ei.name === "BASIC + DA")) {
    earnedItems.unshift({ name: "BASIC + DA", amount: Math.round(rateBasicDA * prorateFactor) });
  }

  // =========================================================================
  // DYNAMIC BREAKDOWN OF ACTIVE PROJECT DEDUCTION HEADS
  // =========================================================================
  const deductionItems: { name: string; amount: number }[] = [];
  if (computation.deductions.employeePF > 0) {
    deductionItems.push({ name: "EPF (EMPLOYEE PF)", amount: computation.deductions.employeePF });
  }
  if (computation.deductions.employeeESI > 0) {
    deductionItems.push({ name: "ESIC (ESI)", amount: computation.deductions.employeeESI });
  }
  if (computation.deductions.professionalTax > 0) {
    deductionItems.push({ name: "PROFESSIONAL TAX (PT)", amount: computation.deductions.professionalTax });
  }
  if (computation.deductions.tds > 0) {
    deductionItems.push({ name: "TDS (INCOME TAX)", amount: computation.deductions.tds });
  }
  if (computation.deductions.lwf > 0) {
    deductionItems.push({ name: "LABOUR WELFARE (LWF)", amount: computation.deductions.lwf });
  }
  if (computation.deductions.advance > 0) {
    deductionItems.push({ name: "SALARY ADVANCE", amount: computation.deductions.advance });
  }
  if (computation.deductions.loan > 0) {
    deductionItems.push({ name: "LOAN EMI DEDUCTION", amount: computation.deductions.loan });
  }
  (computation.extraDeductions || []).forEach((ed) => {
    if (ed.amount > 0 && !deductionItems.some((d) => d.name.toLowerCase() === ed.name.toLowerCase())) {
      deductionItems.push({ name: ed.name.toUpperCase(), amount: ed.amount });
    }
  });

  if (deductionItems.length === 0) {
    deductionItems.push({ name: "NIL STATUTORY DEDUCTIONS", amount: 0 });
  }

  // Calculate table rows count to align all 3 columns evenly
  const rowCount = Math.max(rateItems.length, earnedItems.length, deductionItems.length, 6);

  // Employee details
  const empName = employee.name || "—";
  const empCode = employee.empCode || "—";
  const designation = employee.designation || "—";
  const department = employee.department || "—";
  const gender = employee.gender ? employee.gender.toUpperCase() : "—";
  const doj = employee.doj || "—";
  const dob = employee.dob || "—";
  const fatherName = employee.fatherName || "—";
  const pan = employee.pan || "—";
  const pfNo = employee.uan || employee.pfNumber || "—";
  const esiNo = employee.esic || (computation.esiEligible ? "Applicable" : "NA");
  const bankAcc = employee.bankAcc || "—";
  const bankIfsc = employee.bankIfsc || "—";
  const bankName = employee.bankName || "Corporate Bank Transfer";

  const letterheadUrl = docAssets?.letterheadDataUrl;
  const watermarkUrl = docAssets?.watermarkDataUrl || brandImageUrl;
  const footerUrl = docAssets?.footerDataUrl;

  return (
    <div className="w-full bg-background text-foreground select-text transition-colors">
      {/* Container with High-End Card & Dynamic Logo-Themed Borders */}
      <div
        className="relative border-2 rounded-2xl overflow-hidden shadow-xl bg-card transition-all"
        style={{ borderColor: `${palette.primaryHex}40` }}
      >
        
        {/* ========================================================================= */}
        {/* BACKGROUND WATERMARK (Center Positioned Behind Body)                      */}
        {/* ========================================================================= */}
        {watermarkUrl && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none">
            <img
              src={watermarkUrl}
              alt="Watermark"
              className="w-1/3 max-w-[280px] opacity-[0.045] grayscale contrast-125 object-contain select-none transform -rotate-12"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* COMPANY LETTERHEAD (Rendered at Top if available)                         */}
        {/* ========================================================================= */}
        {letterheadUrl && (
          <div className="w-full border-b bg-white dark:bg-slate-950/90 p-2 sm:p-3 flex justify-center transition-colors" style={{ borderColor: `${palette.primaryHex}30` }}>
            <img
              src={letterheadUrl}
              alt="Company Letterhead"
              className="w-full max-h-28 object-contain mx-auto"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TOP BRAND HEADER (Left: Title & Name | Right: Address)                   */}
        {/* ========================================================================= */}
        <div
          className="text-white p-4 sm:p-5 border-b-2 relative z-10 transition-colors"
          style={{
            background: `linear-gradient(135deg, ${palette.primaryDarkHex} 0%, ${palette.primaryHex} 60%, ${palette.primaryDarkHex} 100%)`,
            borderBottomColor: `${palette.accentHex}90`,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Left: Company Name & Title */}
            <div className="md:col-span-7 space-y-1.5">
              <h2 className="text-lg sm:text-2xl font-black font-display tracking-tight text-white drop-shadow-sm">
                {company.legalName || company.name || "SWIFT HRMS"}
              </h2>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase border shadow-xs"
                style={{
                  backgroundColor: `${palette.accentHex}35`,
                  color: "#FFFFFF",
                  borderColor: `${palette.accentHex}80`,
                }}
              >
                SALARY / WAGE SLIP &amp; TIME CARD
              </div>
            </div>

            {/* Right: Company Address */}
            <div className="md:col-span-5 text-xs text-slate-100 leading-relaxed border-t md:border-t-0 md:border-l border-white/20 md:pl-4 flex md:justify-end">
              <div className="flex items-start gap-2 md:text-right md:justify-end">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-white" />
                <span className="text-[12px] font-medium text-slate-100 max-w-sm">
                  {company.address || "Corporate Office"}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* EMPLOYEE METADATA GRID (Crisp Tabular Layout)                             */}
        {/* ========================================================================= */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 text-xs border-b border-border/80 divide-y sm:divide-y-0 sm:divide-x divide-border/60 bg-muted/20">
          
          {/* Column 1: Name, Gender, DOJ, PF.No */}
          <div className="lg:col-span-4 divide-y divide-border/60">
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">Name</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-black text-foreground truncate">{empName}</span>
            </div>
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">Gender</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-semibold text-foreground">{gender}</span>
            </div>
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">D.O.J</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-medium text-foreground">{doj}</span>
            </div>
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">PF.No / UAN</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-mono font-medium text-foreground">{pfNo}</span>
            </div>
          </div>

          {/* Column 2: Emp Code, Month & Year, DOB, ESI.No */}
          <div className="lg:col-span-4 divide-y divide-border/60">
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">Employee Code</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-bold font-mono" style={{ color: palette.primaryHex }}>{empCode}</span>
            </div>
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">Month &amp; Year</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-bold text-foreground">{formattedMonthDateStr} ({formattedMonthNameStr})</span>
            </div>
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">D.O.B</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-medium text-foreground">{dob}</span>
            </div>
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">ESI.No</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-mono font-medium text-foreground">{esiNo}</span>
            </div>
          </div>

          {/* Column 3: Designation, Father Name, Pay Slab, PAN */}
          <div className="lg:col-span-4 divide-y divide-border/60">
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">Designation</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-semibold text-foreground truncate">{designation}</span>
            </div>
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">Father Name</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-medium text-foreground">{fatherName}</span>
            </div>
            <div
              className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors"
              style={{ backgroundColor: `${palette.primaryHex}10` }}
            >
              <span className="col-span-4 font-bold uppercase text-[11px]" style={{ color: palette.primaryHex }}>Pay Slab</span>
              <span className="col-span-1 text-center" style={{ color: palette.primaryHex }}>:</span>
              <span className="col-span-7 font-bold font-mono" style={{ color: palette.primaryHex }}>₹{formatInr(dailyPaySlab)} / day</span>
            </div>
            <div className="grid grid-cols-12 p-2 hover:bg-muted/40 transition-colors">
              <span className="col-span-4 font-bold text-muted-foreground uppercase text-[11px]">PAN / Dept</span>
              <span className="col-span-1 text-center text-muted-foreground">:</span>
              <span className="col-span-7 font-medium text-foreground">{pan} · {department}</span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ATTENDANCE SECTION (Dynamic Logo Accent Header)                           */}
        {/* ========================================================================= */}
        <div className="border-b border-border/80 relative z-10">
          <div
            className="text-white text-center py-1 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-inner"
            style={{ background: `linear-gradient(90deg, ${palette.primaryHex} 0%, ${palette.accentHex} 100%)` }}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Attendance Summary</span>
          </div>
          
          <div className="p-3 bg-muted/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs text-center">
            
            <div className="p-2 rounded-xl bg-card border border-border/70 shadow-2xs">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Month Days</span>
              <span className="text-sm font-black text-foreground">{totalMonthDays}</span>
            </div>

            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300">
              <span className="block text-[10px] uppercase font-bold">Pay Days</span>
              <span className="text-sm font-black">{effectivePaidDays}</span>
            </div>

            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              <span className="block text-[10px] uppercase font-bold">Present</span>
              <span className="text-sm font-black">{actualPresent}</span>
            </div>

            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
              <span className="block text-[10px] uppercase font-bold">Leave</span>
              <span className="text-sm font-black">{leaveDays}</span>
            </div>

            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
              <span className="block text-[10px] uppercase font-bold">Week Off</span>
              <span className="text-sm font-black">{weekOffDays}</span>
            </div>

            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
              <span className="block text-[10px] uppercase font-bold">Holidays</span>
              <span className="text-sm font-black">{holidayDays}</span>
            </div>

            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300">
              <span className="block text-[10px] uppercase font-bold">Sunday Work</span>
              <span className="text-sm font-black">{sundayWorkDays}</span>
            </div>

            <div className="p-2 rounded-xl bg-card border border-border/70 shadow-2xs">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Pending Adv.</span>
              <span className="text-sm font-black text-foreground">₹{formatInr(pendingAdvance)}</span>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2-COLUMN TABLE: EARNINGS (ACTUAL EARNED) | DEDUCTIONS & RECOVERIES        */}
        {/* ========================================================================= */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/80 text-xs">
          
          {/* ----------------------------------------------------------------------- */}
          {/* COLUMN 1: EARNINGS (ACTUAL EARNED) (50% Width)                          */}
          {/* ----------------------------------------------------------------------- */}
          <div className="flex flex-col justify-between bg-card/90">
            <div>
              <div className="bg-emerald-700 text-white font-black text-center py-2 uppercase tracking-wider text-[11px] border-b border-border/80">
                EARNINGS (ACTUAL EARNED)
              </div>
              
              <div className="divide-y divide-border/50 text-[11px]">
                {Array.from({ length: rowCount }).map((_, idx) => {
                  const item = earnedItems[idx];
                  return (
                    <div key={idx} className="flex justify-between items-center px-4 py-2 hover:bg-emerald-500/5 min-h-[32px]">
                      <span className="font-semibold text-foreground truncate">{item ? item.name : ""}</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {item ? `: ₹${formatInr(item.amount)}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Gross Earnings Footer */}
            <div className="border-t-2 border-border/80 bg-emerald-500/10 px-4 py-2.5 flex justify-between items-center font-bold text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-black uppercase tracking-wide">Gross Earnings</span>
              <span className="font-mono font-black text-sm">: ₹{formatInr(computation.gross)}</span>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* COLUMN 2: DEDUCTIONS & RECOVERIES (50% Width)                            */}
          {/* ----------------------------------------------------------------------- */}
          <div className="flex flex-col justify-between bg-card/90">
            <div>
              <div className="bg-rose-700 text-white font-black text-center py-2 uppercase tracking-wider text-[11px] border-b border-border/80">
                DEDUCTIONS &amp; RECOVERIES
              </div>
              
              <div className="divide-y divide-border/50 text-[11px]">
                {Array.from({ length: rowCount }).map((_, idx) => {
                  const item = deductionItems[idx];
                  return (
                    <div key={idx} className="flex justify-between items-center px-4 py-2 hover:bg-rose-500/5 min-h-[32px]">
                      <span className="font-semibold text-foreground truncate">{item ? item.name : ""}</span>
                      <span className="font-mono font-bold text-rose-600">
                        {item ? `: ₹${formatInr(item.amount)}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Deductions Footer */}
            <div className="border-t-2 border-border/80 bg-rose-500/10 px-4 py-2.5 flex justify-between items-center font-bold text-xs text-rose-700 dark:text-rose-300">
              <span className="font-black uppercase tracking-wide">Total Deductions</span>
              <span className="font-mono font-black text-sm">: ₹{formatInr(computation.totalDeductions)}</span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* FULL WIDTH NET TAKE-HOME PAY HIGHLIGHT BANNER                             */}
        {/* ========================================================================= */}
        <div
          className="relative z-10 text-white px-4 sm:px-6 py-2.5 flex justify-between items-center font-extrabold text-sm border-t-2 shadow-inner transition-colors"
          style={{
            background: `linear-gradient(90deg, ${palette.primaryDarkHex} 0%, ${palette.primaryHex} 100%)`,
            borderTopColor: `${palette.accentHex}80`,
          }}
        >
          <span className="uppercase tracking-wider font-bold text-white/90">Net Take-Home Pay</span>
          <span className="font-mono text-lg sm:text-xl font-black text-white tracking-tight drop-shadow-sm">
            : ₹{formatInr(computation.net)}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* BANK DISBURSEMENT FOOTER (IFSC, A/C NO, BANK NAME)                       */}
        {/* ========================================================================= */}
        <div className="relative z-10 bg-muted/40 border-t-2 p-3 sm:p-4 text-xs" style={{ borderTopColor: `${palette.primaryHex}40` }}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            <div className="md:col-span-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0" style={{ color: palette.primaryHex }} />
              <div className="space-y-0.5">
                <span className="font-bold text-muted-foreground uppercase text-[10px] block">IFSC CODE</span>
                <span className="font-mono font-black text-foreground">{bankIfsc}</span>
              </div>
            </div>

            <div className="md:col-span-4 flex items-center gap-2 border-t md:border-t-0 md:border-l border-border/60 md:pl-4">
              <div className="space-y-0.5">
                <span className="font-bold text-muted-foreground uppercase text-[10px] block">CREDITED INTO ACCOUNT</span>
                <span className="font-mono font-black text-foreground">A/C NO : {bankAcc}</span>
              </div>
            </div>

            <div className="md:col-span-4 flex items-center md:justify-end gap-2 border-t md:border-t-0 md:border-l border-border/60 md:pl-4">
              <div className="text-left md:text-right space-y-0.5">
                <span className="font-bold text-muted-foreground uppercase text-[10px] block">BANK NAME</span>
                <span className="font-bold font-display" style={{ color: palette.primaryHex }}>{bankName}</span>
              </div>
            </div>

          </div>

          {/* Amount In Words */}
          <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground">
            <div>
              <span className="font-bold uppercase text-foreground">Amount in Words: </span>
              <span className="italic font-medium text-foreground">{numberToWordsIndian(computation.net)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1 sm:mt-0">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verified Computer Generated Payslip</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COMPANY DOCUMENT FOOTER (Rendered at Bottom if available)                 */}
        {/* ========================================================================= */}
        {footerUrl && (
          <div className="relative z-10 w-full border-t bg-white dark:bg-slate-950/80 p-2 flex justify-center" style={{ borderTopColor: `${palette.primaryHex}30` }}>
            <img
              src={footerUrl}
              alt="Company Document Footer"
              className="w-full max-h-14 object-contain mx-auto"
            />
          </div>
        )}

      </div>

      {/* Action Buttons (Print / Download) */}
      {!hideActions && (
        <div className="flex items-center justify-between pt-4 mt-2">
          <div className="text-xs text-muted-foreground">
            Official payslip format matching corporate template.
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                Close
              </Button>
            )}
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5 rounded-xl font-medium">
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </Button>
            )}
            {onDownloadPdf && (
              <Button size="sm" onClick={onDownloadPdf} className="gap-1.5 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm">
                <FileDown className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
