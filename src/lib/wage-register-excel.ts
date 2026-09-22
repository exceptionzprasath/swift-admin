import * as XLSX from "xlsx";
import type { Company, Employee, AttendanceRecord } from "./store";
import { computePayroll } from "./payroll";

function autoFitColumns(rows: any[][]): { wch: number }[] {
  if (!rows || rows.length === 0) return [];
  const colCount = Math.max(...rows.map((r) => (r ? r.length : 0)));
  const colWidths: number[] = new Array(colCount).fill(12);

  rows.forEach((row) => {
    if (!row) return;
    row.forEach((val, idx) => {
      const len = val != null ? String(val).length : 0;
      if (len + 3 > colWidths[idx]) {
        colWidths[idx] = Math.min(len + 3, 45);
      }
    });
  });

  return colWidths.map((w) => ({ wch: Math.max(w, 12) }));
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

export interface WageRegisterExportParams {
  company: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  roster?: any[];
  requests?: any[];
  monthlyOverrides?: Record<string, any>;
  selectedMonth: string; // e.g. "2026-09"
}

/**
 * Generates and downloads the Wage Register Workbook containing all 50 statutory columns.
 */
export function downloadWageRegisterExcel({
  company,
  employees,
  attendance,
  roster = [],
  requests = [],
  monthlyOverrides = {},
  selectedMonth,
}: WageRegisterExportParams) {
  const wb = XLSX.utils.book_new();

  const [yearStr, monthStr] = selectedMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Calculate Sundays in the month
  let sundaysInMonth = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundaysInMonth++;
  }

  const workingDaysBase = company.workingDaysPerMonth || (totalDaysInMonth - sundaysInMonth) || 26;
  const stdWorkingHours = company.workingHoursPerDay || 8;

  // Filter valid active employees
  const validEmployees = employees.filter((e) => e.status !== "inactive" || (e.doj && e.doj <= `${selectedMonth}-31`));
  const activeList = validEmployees.length > 0 ? validEmployees : employees;

  // =========================================================================
  // WAGE REGISTER (STAFF SALARY with Statutory & Banking/Demographic Columns)
  // =========================================================================
  const wageRegisterHeaders = [
    "S.No",
    "EMP ID",
    "Name of the Employee",
    "Name as per Aadhaar",
    "Date of Birth",
    "Date of Joining",
    "Designation",
    "Location (Branch)",
    "Bank Name",
    "Account Number",
    "IFSC Code",
    "UAN No",
    "ESI No",
    "Gender",
    "Present Address",
    "Permanent Address",
    "Number of  days Calculate",
    "No of Days Worked",
    "FH/NH/PL/ML",
    "Sunday",
    "Half day",
    "PAID LEAVES DAYS",
    "Sundays work",
    "No of days in month",
    "Number of days Calculate paid",
    "Absent days",
    "Fixed Salary",
    "Pay Slab",
    "Per hrs",
    "Per Hrs working time",
    "Per hrs Amt",
    "LATE PUNCHING Hrs",
    "LATE PUNCHING  Amt",
    "Basic+DA",
    "HRA",
    "Conveyance Allowance",
    "Other Allowances",
    "LTA",
    "Sundays days Amount",
    "Incentives",
    "Gross Salary",
    "Basic +DA for PF",
    "EPF  Elig",
    "EPF - 12%",
    "ESI Elig",
    "ESI- 0.75%",
    "Advance",
    "PT",
    "TDS/4% Cass",
    "LWF",
    "Deductions",
    "NCP Days",
    "Net Salary",
    "Month",
    "Remarks",
    "13%",
    "EPF",
    "ESI",
  ];

  const wageRegisterRows: any[][] = [];

  activeList.forEach((emp, index) => {
    const sNo = index + 1;
    const empId = emp.empCode || `EMP-${1000 + sNo}`;
    const empName = emp.name || "—";
    const nameAsPerAadhaar =
      (emp as any).nameAsPerAadhaar ||
      (emp as any).aadhaarName ||
      (emp as any).aadhaarCardName ||
      emp.name ||
      "—";
    const dob = emp.dob || "—";
    const doj = emp.doj || "—";
    const designation = emp.designation || "—";
    const branchObj = company.branches?.find(
      (b) => b.id === emp.branchId || (emp.branchIds && emp.branchIds.includes(b.id))
    );
    const locationBranch = branchObj
      ? (branchObj.city ? `${branchObj.name} (${branchObj.city})` : branchObj.name)
      : (emp.bankBranch || emp.city || "Head Office");
    const bankName = emp.bankName || (emp.bankIfsc ? `${emp.bankIfsc.slice(0, 4).toUpperCase()} Bank` : "—");
    const bankAcc = emp.bankAcc || "—";
    const bankIfsc = emp.bankIfsc || "—";
    const uanNo = emp.uan || emp.pfNumber || "—";
    const esiNo = emp.esic || emp.phone || "NA";
    const gender = emp.gender ? emp.gender.toUpperCase() : "MALE";
    const presentAddress = emp.addressLine1 || emp.address || emp.city || "—";
    const permanentAddress = emp.addressLine2 || emp.addressLine1 || emp.address || emp.city || "—";

    // Attendance computation for employee in selectedMonth
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

    // Check for late punch hours
    const latePunchMinutes = empAtt.reduce((sum, a) => sum + (Number(a.lateBy) || 0), 0);
    const latePunchHours = Math.round((latePunchMinutes / 60) * 10) / 10;

    // Sundays worked
    const sundaysWorked = empAtt.filter((a) => {
      const d = new Date(a.date);
      return d.getDay() === 0 && (a.status === "present" || a.status === "half-day");
    }).length;

    // OT Hours
    const otHours = empAtt.reduce((sum, a) => {
      if (a.otHours !== undefined && a.otHours !== null) return sum + (Number(a.otHours) || 0);
      return sum;
    }, 0);

    // Overrides check
    const overrideKey = `${selectedMonth}_${emp.id}`;
    const ov = monthlyOverrides[overrideKey] || {};

    const rosterWeekOffDays = getRosterWeekOffDays(emp.id, emp.name, selectedMonth, roster);
    const weekOffEnabled = ov.weekOffEnabled !== undefined ? ov.weekOffEnabled : company.includeWeekOff !== false;
    const weekOffDays = ov.weekOffDays !== undefined ? ov.weekOffDays : rosterWeekOffDays;

    // Calculate Paid Days (prorated on present days, consistent with monthly register)
    const basePresentDays = workedDays + daysLeave;
    const calculatedPaidDays = ov.daysWorked !== undefined ? ov.daysWorked : basePresentDays;

    const absentDays = Math.max(0, workingDaysBase - calculatedPaidDays);
    const ncpDays = absentDays;

    // Salary & Pay Slab
    const fixedSalary = ov.customBasic ? ov.customBasic : (emp.fixedSalary ?? emp.basic ?? 25000);
    const paySlab = Math.round(fixedSalary / workingDaysBase);
    const perHrAmt = Math.round(paySlab / stdWorkingHours);
    const latePunchingAmt = Math.round(latePunchHours * perHrAmt);

    // Compute Payroll using company rules and overrides
    const effectiveCompany: Company = {
      ...company,
      basicPct: ov.basicPct !== undefined ? ov.basicPct : company.basicPct,
      daEnabled: ov.daEnabled !== undefined ? ov.daEnabled : company.daEnabled,
      daPct: ov.daPct !== undefined ? ov.daPct : company.daPct,
      hraEnabled: ov.hraEnabled !== undefined ? ov.hraEnabled : company.hraEnabled,
      hraPct: ov.hraPct !== undefined ? ov.hraPct : company.hraPct,
      oaEnabled: ov.oaEnabled !== undefined ? ov.oaEnabled : company.oaEnabled,
      oaPct: ov.oaPct !== undefined ? ov.oaPct : company.oaPct,
      caEnabled: ov.caEnabled !== undefined ? ov.caEnabled : company.caEnabled,
      caPct: ov.caPct !== undefined ? ov.caPct : company.caPct,
      ltaEnabled: ov.ltaEnabled !== undefined ? ov.ltaEnabled : company.ltaEnabled,
      ltaPct: ov.ltaPct !== undefined ? ov.ltaPct : company.ltaPct,
      ptEnabled: ov.ptEnabled !== undefined ? ov.ptEnabled : company.ptEnabled,
      ptAmount: ov.ptAmountOverride !== undefined ? ov.ptAmountOverride : company.ptAmount,
      employeePfEnabled: ov.pfEmployeeEnabled !== undefined ? ov.pfEmployeeEnabled : true,
      employerPfEnabled: ov.pfEmployerEnabled !== undefined ? ov.pfEmployerEnabled : true,
      employeePfPct: ov.employeePfPct !== undefined ? ov.employeePfPct : (company.employeePfPct ?? 12),
      employerPfPct: ov.employerPfPct !== undefined ? ov.employerPfPct : (company.employerPfPct ?? 13),
      pfRules: {
        ...company.pfRules,
        enabled: ov.pfEnabled !== undefined ? ov.pfEnabled : (company.pfRules?.enabled !== false),
        employeePct: ov.employeePfPct !== undefined ? ov.employeePfPct : (company.employeePfPct ?? company.pfRules?.employeePct ?? 12),
        employerPct: ov.employerPfPct !== undefined ? ov.employerPfPct : (company.employerPfPct ?? company.pfRules?.employerPct ?? 13),
      },
      employeeEsiEnabled: ov.esiEmployeeEnabled !== undefined ? ov.esiEmployeeEnabled : true,
      employerEsiEnabled: ov.esiEmployerEnabled !== undefined ? ov.esiEmployerEnabled : true,
      employeeEsiPct: ov.employeeEsiPct !== undefined ? ov.employeeEsiPct : (company.employeeEsiPct ?? 0.75),
      employerEsiPct: ov.employerEsiPct !== undefined ? ov.employerEsiPct : (company.employerEsiPct ?? 3.25),
      esiRules: {
        ...company.esiRules,
        enabled: ov.esiEnabled !== undefined ? ov.esiEnabled : (company.esiRules?.enabled !== false),
        employeePct: ov.employeeEsiPct !== undefined ? ov.employeeEsiPct : (company.employeeEsiPct ?? company.esiRules?.employeePct ?? 0.75),
        employerPct: ov.employerEsiPct !== undefined ? ov.employerEsiPct : (company.employerEsiPct ?? company.esiRules?.employerPct ?? 3.25),
      },
      lwfRules: {
        ...company.lwfRules,
        enabled: ov.lwfEnabled !== undefined ? ov.lwfEnabled : (company.lwfRules?.enabled === true),
        employeeAmount: ov.lwfAmountOverride !== undefined ? ov.lwfAmountOverride : (company.lwfRules?.employeeAmount ?? 10),
      },
      earnings: ov.customAllowances !== undefined ? (ov.customAllowances as any) : company.earnings,
    };

    // Calculate Active Loan EMI deductions with monthly tenor matching
    const activeLoanRequests = (requests || []).filter((r: any) => {
      if (r.category !== "loan" && r.category !== "advance_loan") return false;
      const matchesEmp =
        r.employeeId === emp.id ||
        (emp.empCode && r.empCode === emp.empCode) ||
        r.employeeName === emp.name;
      if (!matchesEmp) return false;
      const isApproved = r.status === "Approved" || r.status === "Disbursed";
      if (!isApproved) return false;

      const startMonth = r.metadata?.startMonth || (r.date ? r.date.slice(0, 7) : (r.createdAt ? r.createdAt.slice(0, 7) : ""));
      const tenorMonths = r.metadata?.tenorMonths || (r.tenor?.includes("1") ? 1 : r.tenor?.includes("2") ? 2 : r.tenor?.includes("3") ? 3 : r.tenor?.includes("6") ? 6 : 1);
      if (!startMonth) return true;

      const [sYear, sMonth] = startMonth.split("-").map(Number);
      const [curYear, curMonth] = selectedMonth.split("-").map(Number);
      const startTotalMonths = sYear * 12 + sMonth;
      const curTotalMonths = curYear * 12 + curMonth;
      const endTotalMonths = startTotalMonths + tenorMonths - 1;

      return curTotalMonths >= startTotalMonths && curTotalMonths <= endTotalMonths;
    });

    const autoLoanEmi = activeLoanRequests.reduce((sum: number, r: any) => {
      const tenorMonths = r.metadata?.tenorMonths || (r.tenor?.includes("1") ? 1 : r.tenor?.includes("2") ? 2 : r.tenor?.includes("3") ? 3 : r.tenor?.includes("6") ? 6 : 1);
      const emi = r.metadata?.monthlyEmi || Math.round((Number(r.amount) || 0) / tenorMonths);
      return sum + emi;
    }, 0);

    // Overtime Approval Workflow
    const isOtApproved = ov.otStatus === "approved";
    const otApprovedHours = ov.otApprovedHours !== undefined ? ov.otApprovedHours : (ov.otHours !== undefined && isOtApproved ? ov.otHours : otHours);
    const effectiveOtHours = isOtApproved ? otApprovedHours : 0;

    // Bonuses & Incentives
    const attBonusEnabled = ov.attBonusEnabled !== undefined ? ov.attBonusEnabled : (company.attendanceBonusRules?.enabled === true);
    const attBonusEligible = attBonusEnabled && empAtt.filter((a) => a.status === "absent").length === 0;
    const attBonus = attBonusEligible ? (ov.attBonusAmount !== undefined ? ov.attBonusAmount : (company.attendanceBonusRules?.value ?? 500)) : 0;

    const yrBonusEnabled = ov.yrBonusEnabled !== undefined ? ov.yrBonusEnabled : (company.yearlyBonusRules?.enabled === true);
    const yrBonus = yrBonusEnabled ? (ov.yrBonusAmount !== undefined ? ov.yrBonusAmount : (company.yearlyBonusRules?.value ?? 500)) : 0;

    const effectiveIncentive = ov.incentive !== undefined ? ov.incentive : 0;
    const effectiveBonus = (ov.bonus !== undefined ? ov.bonus : 0) + attBonus + yrBonus;
    const effectiveLoan = ov.loan !== undefined ? ov.loan : autoLoanEmi;
    const effectiveAdvance = ov.advance !== undefined ? ov.advance : 0;
    const effectiveOtherDeductions = ov.otherDeductions !== undefined ? ov.otherDeductions : 0;
    const effectiveVariablePay = ov.variablePay !== undefined ? ov.variablePay : 0;
    const effectiveOtherEarnings = ov.otherEarnings !== undefined ? ov.otherEarnings : 0;

    const effectiveEmp = ov.customBasic ? { ...emp, basic: ov.customBasic } : { ...emp, basic: fixedSalary };

    const comp = computePayroll({
      company: effectiveCompany,
      employee: effectiveEmp,
      daysWorked: calculatedPaidDays,
      otHours: effectiveOtHours,
      incentive: effectiveIncentive,
      shiftDays: daysPresent + daysHalf,
      loan: effectiveLoan,
      advance: effectiveAdvance,
      bonus: effectiveBonus,
      otherDeductions: effectiveOtherDeductions,
      variablePay: effectiveVariablePay,
      otherEarnings: effectiveOtherEarnings,
    });

    const basicDA = comp.earningsList.find((e) => e.id === "basic")?.amount || Math.round(fixedSalary * 0.5 * (calculatedPaidDays / workingDaysBase));
    const hra = comp.earningsList.find((e) => e.id === "hra")?.amount || 0;
    const ca = comp.earningsList.find((e) => e.id === "ca")?.amount || 0;
    const oa = comp.earningsList.find((e) => e.id === "oa")?.amount || 0;
    const lta = comp.earningsList.find((e) => e.id === "lta")?.amount || 0;
    const sundaysDaysAmount = sundaysWorked > 0 ? Math.round(sundaysWorked * paySlab) : 0;
    const totalIncentives = effectiveIncentive + effectiveBonus;
    const grossSalary = comp.gross;

    const basicDAPF = Math.min(basicDA, 15000);
    const epfElig = emp.pfEligible !== false && comp.deductions.employeePF > 0 ? "YES" : "NO";
    const epf12 = comp.deductions.employeePF;
    const esiElig = comp.deductions.employeeESI > 0 || (emp.esiEligible || fixedSalary <= (company.esiRules?.threshold || 21000)) ? "YES" : "NO";
    const esi075 = comp.deductions.employeeESI;
    const advance = effectiveAdvance + effectiveLoan + effectiveOtherDeductions;
    const pt = comp.deductions.professionalTax;
    const tds = comp.deductions.tds;
    const lwf = comp.deductions.lwf;
    const totalDeductions = comp.totalDeductions;
    const netSalary = comp.net;

    // Employer shares
    const employerPF = comp.employerContrib?.employerPF || Math.round(basicDAPF * 0.13);
    const employerESI = comp.employerContrib?.employerESI || (esiElig === "YES" ? Math.round(grossSalary * 0.0325) : 0);

    // Populate Sheet Row
    wageRegisterRows.push([
      sNo,
      empId,
      empName,
      nameAsPerAadhaar,
      dob,
      doj,
      designation,
      locationBranch,
      bankName,
      bankAcc,
      bankIfsc,
      uanNo,
      esiNo,
      gender,
      presentAddress,
      permanentAddress,
      workingDaysBase, // Number of days Calculate
      workedDays, // No of Days Worked
      daysLeave, // FH/NH/PL/ML
      sundaysInMonth, // Sunday
      daysHalf, // Half day
      daysLeave, // PAID LEAVES DAYS
      sundaysWorked, // Sundays work
      totalDaysInMonth, // No of days in month
      calculatedPaidDays, // Number of days Calculate paid
      absentDays, // Absent days
      fixedSalary, // Fixed Salary
      paySlab, // Pay Slab
      perHrAmt, // Per hrs
      stdWorkingHours, // Per Hrs working time
      perHrAmt, // Per hrs Amt
      latePunchHours, // LATE PUNCHING Hrs
      latePunchingAmt, // LATE PUNCHING Amt
      basicDA, // Basic+DA
      hra, // HRA
      ca, // Conveyance Allowance
      oa, // Other Allowances
      lta, // LTA
      sundaysDaysAmount, // Sundays days Amount
      totalIncentives, // Incentives
      grossSalary, // Gross Salary
      basicDAPF, // Basic +DA for PF
      epfElig, // EPF Elig
      epf12, // EPF - 12%
      esiElig, // ESI Elig
      esi075, // ESI- 0.75%
      advance, // Advance
      pt, // PT
      tds, // TDS/4% Cass
      lwf, // LWF
      totalDeductions, // Deductions
      ncpDays, // NCP Days
      netSalary, // Net Salary
      selectedMonth, // Month
      emp.status === "active" ? "Regular" : "Inactive / Notice", // Remarks
      "13%", // 13%
      employerPF, // EPF (Employer)
      employerESI, // ESI (Employer)
    ]);
  });

  // Create Wage Register Sheet
  const wsWage = XLSX.utils.aoa_to_sheet([wageRegisterHeaders, ...wageRegisterRows]);
  wsWage["!cols"] = autoFitColumns([wageRegisterHeaders, ...wageRegisterRows]);
  XLSX.utils.book_append_sheet(wb, wsWage, "Wage Register");

  // Generate and save file
  const fileName = `${(company.name || "CreatonsHR").replace(/\s+/g, "_")}_Wage_Register_${selectedMonth}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
