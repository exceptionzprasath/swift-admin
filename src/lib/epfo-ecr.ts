import * as XLSX from "xlsx";
import type { Company, Employee, AttendanceRecord } from "./store";
import { computePayroll } from "./payroll";

function saveBlob(blob: Blob, fileName: string) {
  if (typeof window === "undefined") return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 200);
}

export interface EpfoEcrRecord {
  sNo: number;
  empId: string;
  uan: string;
  memberName: string;
  grossWages: number;
  epfWages: number;
  epsWages: number;
  edliWages: number;
  eeShare: number;
  epsShare: number;
  erShare: number;
  ncpDays: number;
  refundOfAdvance: number;
  isMissingUan: boolean;
  isPfEligible: boolean;
  age?: number;
  status: string;
}

export interface EpfoEcrParams {
  company: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  roster?: any[];
  requests?: any[];
  monthlyOverrides?: Record<string, any>;
  selectedMonth: string; // e.g. "2026-09"
  includeAllStaff?: boolean;
}

function getRosterWeekOffDays(
  empId: string,
  empName: string,
  selectedMonth: string,
  roster: any[] = []
): number {
  const [yearStr, monthStr] = selectedMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDays = new Date(year, month, 0).getDate();

  const empRoster = roster.filter(
    (r) =>
      (r.employeeId === empId || r.employeeName === empName) &&
      r.date &&
      r.date.startsWith(selectedMonth) &&
      (r.shiftId === "off" || r.status === "off" || r.isOff)
  );

  if (empRoster.length > 0) return empRoster.length;

  let sundays = 0;
  for (let d = 1; d <= totalDays; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundays++;
  }
  return sundays;
}

function autoFitColumns(rows: any[][]): { wch: number }[] {
  if (!rows || rows.length === 0) return [];
  const colCount = Math.max(...rows.map((r) => (r ? r.length : 0)));
  const colWidths: number[] = new Array(colCount).fill(12);

  rows.forEach((row) => {
    if (!row) return;
    row.forEach((val, idx) => {
      const len = val != null ? String(val).length : 0;
      if (len + 3 > colWidths[idx]) {
        colWidths[idx] = Math.min(len + 3, 40);
      }
    });
  });

  return colWidths.map((w) => ({ wch: Math.max(w, 12) }));
}

/**
 * Computes official EPFO ECR 11-field records for all eligible employees for the selected month.
 */
export function computeEpfoEcrRecords({
  company,
  employees,
  attendance,
  roster = [],
  requests = [],
  monthlyOverrides = {},
  selectedMonth,
  includeAllStaff = false,
}: EpfoEcrParams): EpfoEcrRecord[] {
  const [yearStr, monthStr] = selectedMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  let sundaysInMonth = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundaysInMonth++;
  }

  const workingDaysBase = company.workingDaysPerMonth || (totalDaysInMonth - sundaysInMonth) || 26;

  // Filter employees eligible for PF return:
  // If includeAllStaff is true, include all active employees
  // Otherwise, filter for active employees where pfEligible !== false
  const eligibleStaff = employees.filter((e) => {
    if (!includeAllStaff && e.pfEligible === false) return false;
    if (e.status === "inactive" && e.doj && e.doj > `${selectedMonth}-31`) return false;
    return true;
  });

  const targetList = eligibleStaff.length > 0 ? eligibleStaff : employees;

  const records: EpfoEcrRecord[] = [];

  targetList.forEach((emp, index) => {
    const sNo = index + 1;
    const empId = emp.empCode || `EMP-${1000 + sNo}`;
    const isPfEligible = emp.pfEligible !== false;

    // Clean 12-digit UAN
    const rawUan = String(emp.uan || emp.pfNumber || "").replace(/\D/g, "");
    const isMissingUan = !rawUan || rawUan.length !== 12;
    const uan = rawUan || "000000000000";

    // Clean member name as per Aadhaar / Official EPFO format (uppercase, clean spaces, alpha only)
    const rawName =
      (emp as any).nameAsPerAadhaar ||
      (emp as any).aadhaarName ||
      (emp as any).aadhaarCardName ||
      emp.name ||
      "MEMBER";
    const memberName = rawName
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 85);

    // Attendance computation
    const empAtt = attendance.filter(
      (a) =>
        (a.employeeId === emp.id || a.employeeName === emp.name || (emp.empCode && a.empCode === emp.empCode)) &&
        a.date &&
        a.date.startsWith(selectedMonth)
    );

    const daysPresent = empAtt.filter((a) => a.status === "present").length;
    const daysHalf = empAtt.filter((a) => a.status === "half-day" || a.status === "halfday").length;
    const daysLeave = empAtt.filter((a) => a.status === "leave").length;
    const workedDays = daysPresent + daysHalf * 0.5;

    // Overrides check
    const overrideKey = `${selectedMonth}_${emp.id}`;
    const ov = monthlyOverrides[overrideKey] || {};

    const basePresentDays = workedDays + daysLeave;
    const calculatedPaidDays = ov.daysWorked !== undefined ? ov.daysWorked : basePresentDays;

    // NCP Days (Non-Contributory Period / loss-of-pay absent days)
    const absentDays = Math.max(0, workingDaysBase - calculatedPaidDays);
    const ncpDays = Math.min(totalDaysInMonth, Math.max(0, Math.round(absentDays)));

    // Salary & Pay computation
    const fixedSalary = ov.customBasic ? ov.customBasic : (emp.fixedSalary ?? emp.basic ?? 25000);

    const effectiveCompany: Company = {
      ...company,
      basicPct: ov.basicPct !== undefined ? ov.basicPct : company.basicPct,
      employeePfEnabled: ov.pfEmployeeEnabled !== undefined ? ov.pfEmployeeEnabled : (ov.pfEnabled !== undefined ? ov.pfEnabled : (company.employeePfEnabled ?? true)),
      employerPfEnabled: ov.pfEmployerEnabled !== undefined ? ov.pfEmployerEnabled : (ov.pfEnabled !== undefined ? ov.pfEnabled : (company.employerPfEnabled ?? true)),
      employeePfPct: ov.employeePfPct !== undefined ? ov.employeePfPct : (company.employeePfPct ?? 12),
      employerPfPct: ov.employerPfPct !== undefined ? ov.employerPfPct : (company.employerPfPct ?? 13),
      pfRules: {
        ...company.pfRules,
        enabled: ov.pfEnabled !== undefined ? ov.pfEnabled : ((ov.pfEmployeeEnabled === false && ov.pfEmployerEnabled === false) ? false : (company.pfRules?.enabled !== false)),
        employeePct: ov.employeePfPct !== undefined ? ov.employeePfPct : (company.employeePfPct ?? company.pfRules?.employeePct ?? 12),
        employerPct: ov.employerPfPct !== undefined ? ov.employerPfPct : (company.employerPfPct ?? company.pfRules?.employerPct ?? 13),
      },
    };

    const effectiveEmp = ov.customBasic
      ? { ...emp, basic: ov.customBasic, pfEligible: includeAllStaff ? true : isPfEligible }
      : { ...emp, basic: fixedSalary, pfEligible: includeAllStaff ? true : isPfEligible };

    const comp = computePayroll({
      company: effectiveCompany,
      employee: effectiveEmp,
      daysWorked: calculatedPaidDays,
      otHours: 0,
      incentive: ov.incentive || 0,
      shiftDays: daysPresent + daysHalf,
      loan: ov.loan || 0,
      advance: ov.advance || 0,
      bonus: ov.bonus || 0,
    });

    // Gross Wages
    const grossWages = Math.round(comp.gross);

    // Basic + DA qualifying for PF
    const basicDA = comp.earningsList.find((e) => e.id === "basic")?.amount || Math.round(fixedSalary * 0.5 * (calculatedPaidDays / workingDaysBase));

    // EPF Wages: statutory ceiling of ₹15,000 (0 if zero paid days or 0 basic)
    const epfWages = calculatedPaidDays > 0 ? Math.min(basicDA, 15000) : 0;

    // Age calculation for EPS: 58 years and above are not eligible for Pension scheme
    let age: number | undefined;
    if (emp.dob) {
      const birthDate = new Date(emp.dob);
      const refDate = new Date(`${selectedMonth}-01`);
      age = Math.floor((refDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000));
    }
    const isOver58 = age !== undefined && age >= 58;
    const isEpsExempt =
      isOver58 ||
      (emp as any).epsEligible === false ||
      (emp as any).epsMember === false ||
      (emp as any).isEpsMember === false ||
      (emp as any).pensionEligible === false;

    // EPS Wages: 0 if age >= 58 or exempt, else equal to EPF wages up to ₹15,000 ceiling
    const epsWages = isEpsExempt ? 0 : epfWages;

    // EDLI Wages: equal to EPF wages up to ₹15,000 ceiling
    const edliWages = epfWages;

    // EE Share: Employee PF Contribution (12% of EPF wages, or ₹1,800 if base >= ₹15,000)
    let eeShare = 0;
    if (epfWages >= 15000) {
      eeShare = 1800;
    } else {
      eeShare = Math.round(epfWages * 0.12);
    }
    if (comp.deductions.employeePF > 0 && calculatedPaidDays > 0) {
      eeShare = comp.deductions.employeePF;
    }

    // EPS Share: Employer Pension Scheme Contribution (8.33% of EPS wages, max ₹1,250; 0 if age >= 58 or exempt)
    const epsShare = isEpsExempt ? 0 : Math.min(1250, Math.round(epsWages * 0.0833));

    // ER Share: Employer EPF Contribution (Difference between EE Share 12% and EPS Share)
    const erShare = Math.max(0, eeShare - epsShare);

    // Refund of Advance: Always 0 for EPFO return
    const refundOfAdvance = 0;

    records.push({
      sNo,
      empId,
      uan,
      memberName,
      grossWages,
      epfWages,
      epsWages,
      edliWages,
      eeShare,
      epsShare,
      erShare,
      ncpDays,
      refundOfAdvance,
      isMissingUan,
      isPfEligible,
      age,
      status: emp.status || "active",
    });
  });

  return records;
}

/**
 * Generates the raw text content for the EPFO ECR return file.
 * Format: 11 fields per row delimited by #~# with no header row.
 * Delimiter: #~#
 */
export function generateEpfoEcrTxtContent(records: EpfoEcrRecord[]): string {
  const lines = records.map((r) => {
    return [
      r.uan,
      r.memberName,
      r.grossWages,
      r.epfWages,
      r.epsWages,
      r.edliWages,
      r.eeShare,
      r.epsShare,
      r.erShare,
      r.ncpDays,
      r.refundOfAdvance,
    ].join("#~#");
  });

  return lines.join("\r\n");
}

/**
 * Downloads the official EPFO ECR .txt file formatted with #~# delimiter.
 */
export function downloadEpfoEcrTxt(params: EpfoEcrParams, customRecords?: EpfoEcrRecord[]) {
  const records = customRecords || computeEpfoEcrRecords(params);
  const textContent = generateEpfoEcrTxtContent(records);
  const companyClean = (params.company.name || "COMPANY").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `ECR_${companyClean}_${params.selectedMonth}.txt`;

  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
  saveBlob(blob, fileName);
}

/**
 * Downloads the detailed EPFO ECR Statement as an Excel (.xlsx) workbook.
 * Matches the reference design with the exact 11 standard columns starting with UAN at Column A:
 * UAN, Member Name, Gross Wages, EPF Wages, EPS Wages, EDLI Wages, EE Share, EPS Share, ER Share, NCP Days, Refund of Advance.
 * Column A (UAN) is explicitly formatted as Text ('s' with '@' format) so 12-digit UAN numbers are never converted to scientific notation.
 */
export function downloadEpfoEcrXlsx(params: EpfoEcrParams, customRecords?: EpfoEcrRecord[]) {
  const records = customRecords || computeEpfoEcrRecords(params);
  const wb = XLSX.utils.book_new();

  // Table Column Headers (11 Standard EPFO ECR Fields starting at Column A with UAN)
  const headers = [
    "UAN",
    "Member Name",
    "Gross Wages",
    "EPF Wages",
    "EPS Wages",
    "EDLI Wages",
    "EE Share",
    "EPS Share",
    "ER Share",
    "NCP Days",
    "Refund of Advance",
  ];

  // Data Rows matching the reference structure
  const dataRows = records.map((r) => [
    String(r.uan || ""),
    r.memberName,
    r.grossWages,
    r.epfWages,
    r.epsWages,
    r.edliWages,
    r.eeShare,
    r.epsShare,
    r.erShare,
    r.ncpDays,
    r.refundOfAdvance,
  ]);

  const allRows = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Explicitly ensure UAN column is stored as Text format ('s' with '@' format)
  // so Excel will not convert 12-digit numbers into scientific notation (e.g. 1.0182E+11)
  for (let r = 1; r <= records.length; r++) {
    const uanRef = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[uanRef]) {
      ws[uanRef].t = "s";
      ws[uanRef].z = "@";
    }
    // Numeric columns
    for (let c = 2; c <= 10; c++) {
      const numRef = XLSX.utils.encode_cell({ r, c });
      if (ws[numRef]) {
        ws[numRef].t = "n";
        ws[numRef].z = "0";
      }
    }
  }

  // Set clean column widths matching content
  ws["!cols"] = [
    { wch: 16 }, // UAN
    { wch: 28 }, // Member Name
    { wch: 14 }, // Gross Wages
    { wch: 14 }, // EPF Wages
    { wch: 14 }, // EPS Wages
    { wch: 14 }, // EDLI Wages
    { wch: 12 }, // EE Share
    { wch: 12 }, // EPS Share
    { wch: 12 }, // ER Share
    { wch: 12 }, // NCP Days
    { wch: 18 }, // Refund of Advance
  ];

  XLSX.utils.book_append_sheet(wb, ws, "ECR");

  const companyClean = (params.company.name || "Company").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `${companyClean}_EPFO_ECR_${params.selectedMonth}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
