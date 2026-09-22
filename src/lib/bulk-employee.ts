import type { Employee, PredefinedRole, Branch, ShiftType, Device } from "./store";
import * as XLSX from "xlsx";

export function generateEmployeePassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const smalls = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const specials = "!@#$%";

  let p = "";
  p += letters[Math.floor(Math.random() * letters.length)];
  p += smalls[Math.floor(Math.random() * smalls.length)];
  p += smalls[Math.floor(Math.random() * smalls.length)];
  p += specials[Math.floor(Math.random() * specials.length)];
  for (let i = 0; i < 4; i++) {
    p += digits[Math.floor(Math.random() * digits.length)];
  }
  return p;
}

function autoFitColumns(rows: any[][]): { wch: number }[] {
  if (!rows || rows.length === 0) return [];
  const colCount = Math.max(...rows.map((r) => r.length));
  const colWidths: number[] = new Array(colCount).fill(14);

  rows.forEach((row) => {
    row.forEach((val, idx) => {
      const len = val != null ? String(val).length : 0;
      if (len + 3 > colWidths[idx]) {
        colWidths[idx] = Math.min(len + 3, 50);
      }
    });
  });

  return colWidths.map((w) => ({ wch: Math.max(w, 14) }));
}

/**
 * Normalizes Excel date representations (Date objects, numeric serial numbers, or formatted strings)
 * into ISO format YYYY-MM-DD.
 */
export function normalizeExcelDate(val: any): string {
  if (val == null || val === "") return "";
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  if (!str) return "";

  // Check if it's an Excel numeric serial date (e.g. 45000)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    // Excel epoch starts 1899-12-30 (accounting for leap year 1900 bug)
    const excelEpoch = new Date(1899, 11, 30);
    const dateObj = new Date(excelEpoch.getTime() + serial * 86400000);
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const d = String(dateObj.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Native Date fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return str;
}

/**
 * Cleans string cells: handles scientific notation, trailing .0, and whitespace
 */
function cleanCellString(val: any): string {
  if (val == null) return "";
  if (val instanceof Date) return normalizeExcelDate(val);
  let str = String(val).trim();

  // Strip trailing .0 from numeric codes (e.g. 1001.0 -> 1001)
  if (/^\d+\.0+$/.test(str)) {
    str = str.replace(/\.0+$/, "");
  }

  // Convert scientific notation if present (e.g. 9.87654E+09)
  if (/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = num.toLocaleString("fullwide", { useGrouping: false });
    }
  }

  return str;
}

/**
 * Parses numeric currency/salary strings, stripping currency symbols and commas
 */
function parseSalaryNumber(val: any, fallback = 0): number {
  if (val == null) return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * Parses boolean strings ("TRUE", "YES", "1", "T") vs ("FALSE", "NO", "0", "N")
 */
function parseBoolString(str: string, def = true): boolean {
  if (!str) return def;
  const s = str.toLowerCase().trim();
  if (s === "true" || s === "yes" || s === "1" || s === "y" || s === "t" || s === "eligible" || s === "enabled") return true;
  if (s === "false" || s === "no" || s === "0" || s === "n" || s === "f" || s === "ineligible" || s === "disabled") return false;
  return def;
}

/**
 * Generates and downloads a comprehensive multi-tabbed Excel (.xlsx) workbook
 * containing all 7 modules of Employee Master Data.
 */
export function downloadBulkEmployeesExcel(
  companyName: string = "SWIFT",
  employees: Employee[] = [],
  branches: Branch[] = [],
  shifts: ShiftType[] = [],
  roles: PredefinedRole[] = [],
  devices: Device[] = []
) {
  const wb = XLSX.utils.book_new();

  const getBranchName = (bId?: string) => {
    if (!bId) return "—";
    const found = (branches || []).find((b) => b.id === bId);
    return found ? `${found.name} (${found.code || found.id})` : bId;
  };

  const getBranchNamesList = (emp: Employee) => {
    const ids = emp.branchIds && emp.branchIds.length > 0 ? emp.branchIds : emp.branchId ? [emp.branchId] : [];
    if (ids.length === 0) return "All Branches / Unrestricted";
    return ids.map((id) => getBranchName(id)).join(", ");
  };

  const getShiftName = (sId?: string) => {
    if (!sId) return "General Shift";
    const found = (shifts || []).find((s) => s.id === sId);
    return found ? `${found.name} (${found.start} - ${found.end})` : sId;
  };

  const getRoleTitle = (emp: Employee) => {
    if (emp.roleName) return emp.roleName;
    if (emp.roleId) {
      const found = (roles || []).find((r) => r.id === emp.roleId);
      if (found) return found.name;
    }
    return "Standard Employee";
  };

  const getManagerName = (emp: Employee) => {
    if (emp.reportingManager) return emp.reportingManager;
    if (emp.managerId) {
      const found = (employees || []).find((e) => e.id === emp.managerId);
      if (found) return `${found.name} (${found.empCode})`;
    }
    return "— (Top Level)";
  };

  const formatBool = (val?: boolean, def = true) => ((val ?? def) ? "YES" : "NO");

  // ==========================================
  // SHEET 1: Master All Details (Consolidated)
  // ==========================================
  const masterHeaders = [
    // 1. Profile & Identity
    "Employee Code",
    "Full Name",
    "Status",
    "Employment Type",
    "Gender",
    "Date of Birth",
    "Blood Group",
    "Marital Status",
    "Nationality",
    "Father Name",
    "Mother Name",
    "Spouse Name",
    "Personal Email",
    "Emergency Contact Person",
    "Emergency Relation",
    "Emergency Contact Phone",
    // 2. Employment & Salary
    "Work Email",
    "Phone Number",
    "Department",
    "Designation",
    "Assigned Role",
    "Reporting Manager",
    "Date of Joining",
    "Benefits Eligible Date",
    "Probation End Date",
    "Fixed Salary (Monthly ₹)",
    "Basic Salary (₹)",
    "PF UAN",
    "PF Number",
    "ESIC Number",
    "PT Number",
    // 3. Address & KYC
    "Address Line 1",
    "Address Line 2",
    "City",
    "State",
    "Country",
    "Pincode",
    "PAN Number",
    "Aadhaar Number",
    "Name as per Aadhaar",
    "Passport Number",
    "Driving License",
    "Bank Account Number",
    "Bank IFSC Code",
    "Bank Name",
    "Bank Branch",
    "Bank Account Type",
    // 4. Branches & Policy
    "Primary Branch",
    "Assigned Branches",
    "Shift",
    "Morning Grace Time",
    "Allow Afternoon Login",
    "Afternoon Login Time",
    "Afternoon Grace Time",
    "Geofencing Enabled",
    "Leave Apply Mobile Eligible",
    "PF Eligible",
    "ESI Eligible",
    "PT Eligible",
    "TDS Eligible",
    "Biometric Enabled",
    "Biometric Terminals Mapped",
    // 5. Family & Education Summary
    "Family Members Count",
    "Family Details Summary",
    "Education Qualifications Count",
    "Education Summary",
    // 6. Experience & Skills Summary
    "Prior Companies Count",
    "Experience Summary",
    "Technical Skills",
    "Languages Known",
    // 7. Compliance & BGV
    "BGV Status",
    "Police Verification",
    "Medical Fitness",
    "NDA Signed",
    "Compliance Notes",
    "AI Verification Passed",
    "Final Approval Status",
    "Portal Activated",
  ];

  const masterRows = employees.map((e) => {
    const familySummary = (e.family || []).map((f) => `${f.name} (${f.relation}${f.dob ? ` - ${f.dob}` : ""})`).join("; ");
    const eduSummary = (e.education || []).map((ed) => `${ed.level} from ${ed.institute}${ed.year ? ` (${ed.year})` : ""}${ed.grade ? ` [${ed.grade}]` : ""}`).join("; ");
    const expSummary = (e.experience || []).map((ex) => `${ex.company} - ${ex.role}${ex.from && ex.to ? ` (${ex.from} to ${ex.to})` : ""}${ex.ctc ? ` [₹${ex.ctc}]` : ""}`).join("; ");
    const bioSummary = (e.biometricMappings || []).map((b) => `SN: ${b.deviceSn} (PIN: ${b.biometricEmpCode})`).join("; ");

    return [
      e.empCode || "—",
      e.name || "—",
      e.status ? e.status.toUpperCase() : "ACTIVE",
      e.employmentType ? e.employmentType.toUpperCase() : "REGULAR",
      e.gender ? e.gender.toUpperCase() : "—",
      normalizeExcelDate(e.dob) || "—",
      e.bloodGroup || "—",
      e.maritalStatus ? e.maritalStatus.toUpperCase() : "SINGLE",
      e.nationality || "Indian",
      e.fatherName || "—",
      e.motherName || "—",
      e.spouseName || "—",
      e.about || "—",
      e.emergencyName || e.emergencyContact || "—",
      e.emergencyRelation || "—",
      e.emergencyPhone2 || e.emergencyContact || "—",
      e.email || "—",
      e.phone || "—",
      e.department || "—",
      e.designation || "—",
      getRoleTitle(e),
      getManagerName(e),
      normalizeExcelDate(e.doj) || "—",
      normalizeExcelDate(e.eligibleDate || e.doj) || "—",
      normalizeExcelDate(e.probationDate) || "—",
      e.fixedSalary ?? e.basic ?? 0,
      e.basic ?? e.fixedSalary ?? 0,
      e.uan || "—",
      e.pfNumber || "—",
      e.esic || "—",
      e.ptNumber || "—",
      e.addressLine1 || e.address || "—",
      e.addressLine2 || "—",
      e.city || "—",
      e.state || "—",
      e.country || "India",
      e.pincode || "—",
      e.pan || "—",
      e.aadhaar || "—",
      e.nameAsPerAadhaar || e.aadhaarName || e.name || "—",
      e.passportNumber || "—",
      e.drivingLicense || "—",
      e.bankAcc || "—",
      e.bankIfsc || "—",
      e.bankName || "—",
      e.bankBranch || "—",
      e.bankAccountType ? e.bankAccountType.toUpperCase() : "SAVINGS",
      getBranchName(e.branchId),
      getBranchNamesList(e),
      getShiftName(e.shiftId),
      e.graceTime ? `${e.graceTime} mins` : "15 mins",
      formatBool(e.allowHalfDayLogin, true),
      e.halfDayLoginTime || "12:00",
      e.afternoonGraceTime ? `${e.afternoonGraceTime} mins` : "15 mins",
      formatBool(e.geofencingEnabled, true),
      formatBool(e.leaveApplyEligible, true),
      formatBool(e.pfEligible, true),
      formatBool(e.esiEligible, false),
      formatBool(e.ptEligible, true),
      formatBool(e.tdsEligible, false),
      formatBool(e.biometricEnabled, false),
      bioSummary || "—",
      (e.family || []).length,
      familySummary || "—",
      (e.education || []).length,
      eduSummary || "—",
      (e.experience || []).length,
      expSummary || "—",
      (e.skills || []).join(", ") || "—",
      (e.languagesKnown || []).join(", ") || "—",
      e.backgroundCheckStatus ? e.backgroundCheckStatus.toUpperCase() : "PENDING",
      formatBool(e.policeVerification, false),
      formatBool(e.medicalFitness, false),
      formatBool(e.ndaSigned, false),
      e.complianceNotes || "—",
      e.aiVerification?.passed ? "PASSED" : e.aiVerification ? "FLAGGED" : "NOT RUN",
      e.finalApproval?.status ? e.finalApproval.status.toUpperCase() : "PENDING",
      formatBool(e.portalActivated, false),
    ];
  });

  const wsMaster = XLSX.utils.aoa_to_sheet([masterHeaders, ...masterRows]);
  wsMaster["!cols"] = autoFitColumns([masterHeaders, ...masterRows]);
  XLSX.utils.book_append_sheet(wb, wsMaster, "Master All Records");

  // ==========================================
  // SHEET 2: 1. Profile & Identity
  // ==========================================
  const identityHeaders = [
    "Employee Code",
    "Full Name",
    "Status",
    "Employment Type",
    "Gender",
    "Date of Birth",
    "Blood Group",
    "Marital Status",
    "Nationality",
    "Father's Name",
    "Mother's Name",
    "Spouse's Name",
    "Personal Email",
    "Emergency Contact Person",
    "Emergency Relation",
    "Emergency Phone Number",
    "Face Registered",
    "Portal Activated",
  ];
  const identityRows = employees.map((e) => [
    e.empCode || "—",
    e.name || "—",
    e.status ? e.status.toUpperCase() : "ACTIVE",
    e.employmentType ? e.employmentType.toUpperCase() : "REGULAR",
    e.gender ? e.gender.toUpperCase() : "—",
    normalizeExcelDate(e.dob) || "—",
    e.bloodGroup || "—",
    e.maritalStatus ? e.maritalStatus.toUpperCase() : "SINGLE",
    e.nationality || "Indian",
    e.fatherName || "—",
    e.motherName || "—",
    e.spouseName || "—",
    e.about || "—",
    e.emergencyName || e.emergencyContact || "—",
    e.emergencyRelation || "—",
    e.emergencyPhone2 || e.emergencyContact || "—",
    formatBool(e.faceRegistered, false),
    formatBool(e.portalActivated, false),
  ]);
  const wsIdentity = XLSX.utils.aoa_to_sheet([identityHeaders, ...identityRows]);
  wsIdentity["!cols"] = autoFitColumns([identityHeaders, ...identityRows]);
  XLSX.utils.book_append_sheet(wb, wsIdentity, "1. Profile & Identity");

  // ==========================================
  // SHEET 3: 2. Employment & Salary
  // ==========================================
  const employmentHeaders = [
    "Employee Code",
    "Full Name",
    "Work Email",
    "Phone Number",
    "Department",
    "Designation",
    "Assigned Role",
    "Reporting Manager",
    "Date of Joining",
    "Benefits Eligible Date",
    "Probation End Date",
    "Fixed Salary (Monthly ₹)",
    "Basic Salary (₹)",
    "PF UAN Number",
    "PF Member ID",
    "ESIC Insurance Number",
    "PT Registration Number",
  ];
  const employmentRows = employees.map((e) => [
    e.empCode || "—",
    e.name || "—",
    e.email || "—",
    e.phone || "—",
    e.department || "—",
    e.designation || "—",
    getRoleTitle(e),
    getManagerName(e),
    normalizeExcelDate(e.doj) || "—",
    normalizeExcelDate(e.eligibleDate || e.doj) || "—",
    normalizeExcelDate(e.probationDate) || "—",
    e.fixedSalary ?? e.basic ?? 0,
    e.basic ?? e.fixedSalary ?? 0,
    e.uan || "—",
    e.pfNumber || "—",
    e.esic || "—",
    e.ptNumber || "—",
  ]);
  const wsEmployment = XLSX.utils.aoa_to_sheet([employmentHeaders, ...employmentRows]);
  wsEmployment["!cols"] = autoFitColumns([employmentHeaders, ...employmentRows]);
  XLSX.utils.book_append_sheet(wb, wsEmployment, "2. Employment & Salary");

  // ==========================================
  // SHEET 4: 3. Address & KYC
  // ==========================================
  const addressHeaders = [
    "Employee Code",
    "Full Name",
    "Address Line 1",
    "Address Line 2",
    "City",
    "State",
    "Country",
    "Pincode",
    "PAN Card Number",
    "Aadhaar Number",
    "Name as per Aadhaar",
    "Passport Number",
    "Driving License Number",
    "Bank Account Number",
    "Bank IFSC Code",
    "Bank Name",
    "Bank Branch Name",
    "Bank Account Type",
  ];
  const addressRows = employees.map((e) => [
    e.empCode || "—",
    e.name || "—",
    e.addressLine1 || e.address || "—",
    e.addressLine2 || "—",
    e.city || "—",
    e.state || "—",
    e.country || "India",
    e.pincode || "—",
    e.pan || "—",
    e.aadhaar || "—",
    e.nameAsPerAadhaar || e.aadhaarName || e.name || "—",
    e.passportNumber || "—",
    e.drivingLicense || "—",
    e.bankAcc || "—",
    e.bankIfsc || "—",
    e.bankName || "—",
    e.bankBranch || "—",
    e.bankAccountType ? e.bankAccountType.toUpperCase() : "SAVINGS",
  ]);
  const wsAddress = XLSX.utils.aoa_to_sheet([addressHeaders, ...addressRows]);
  wsAddress["!cols"] = autoFitColumns([addressHeaders, ...addressRows]);
  XLSX.utils.book_append_sheet(wb, wsAddress, "3. Address & KYC");

  // ==========================================
  // SHEET 5: 4. Branches & Policy
  // ==========================================
  const policyHeaders = [
    "Employee Code",
    "Full Name",
    "Primary Branch",
    "Authorized Branches",
    "Assigned Shift",
    "Morning Grace Time",
    "Allow Afternoon Login",
    "Afternoon Login Time",
    "Afternoon Grace Time",
    "Geofencing Verification",
    "Leave Apply in Mobile App",
    "PF Eligible",
    "ESI Eligible",
    "PT Eligible",
    "TDS Eligible",
    "Biometric Enabled",
    "Biometric Mappings",
  ];
  const policyRows = employees.map((e) => {
    const bioSummary = (e.biometricMappings || []).map((b) => `SN: ${b.deviceSn} (PIN: ${b.biometricEmpCode})`).join("; ");
    return [
      e.empCode || "—",
      e.name || "—",
      getBranchName(e.branchId),
      getBranchNamesList(e),
      getShiftName(e.shiftId),
      e.graceTime ? `${e.graceTime} mins` : "15 mins",
      formatBool(e.allowHalfDayLogin, true),
      e.halfDayLoginTime || "12:00",
      e.afternoonGraceTime ? `${e.afternoonGraceTime} mins` : "15 mins",
      formatBool(e.geofencingEnabled, true),
      formatBool(e.leaveApplyEligible, true),
      formatBool(e.pfEligible, true),
      formatBool(e.esiEligible, false),
      formatBool(e.ptEligible, true),
      formatBool(e.tdsEligible, false),
      formatBool(e.biometricEnabled, false),
      bioSummary || "—",
    ];
  });
  const wsPolicy = XLSX.utils.aoa_to_sheet([policyHeaders, ...policyRows]);
  wsPolicy["!cols"] = autoFitColumns([policyHeaders, ...policyRows]);
  XLSX.utils.book_append_sheet(wb, wsPolicy, "4. Branches & Policy");

  // ==========================================
  // SHEET 6: 5. Family & Education
  // ==========================================
  const familyHeaders = [
    "Employee Code",
    "Full Name",
    "Member Type / Category",
    "Nominee / Relative Name",
    "Relationship / Level",
    "Date of Birth / Year",
    "Institution / Grade / Notes",
  ];
  const familyRows: any[][] = [];
  employees.forEach((e) => {
    let hasEntries = false;
    (e.family || []).forEach((f) => {
      hasEntries = true;
      familyRows.push([
        e.empCode || "—",
        e.name || "—",
        "Family & Nominee",
        f.name || "—",
        f.relation || "—",
        normalizeExcelDate(f.dob) || "—",
        f.dependent ? "Dependent" : "Non-dependent",
      ]);
    });
    (e.education || []).forEach((ed) => {
      hasEntries = true;
      familyRows.push([
        e.empCode || "—",
        e.name || "—",
        "Education Qualification",
        ed.institute || "—",
        ed.level || "—",
        ed.year || "—",
        ed.grade ? `Grade/CGPA: ${ed.grade}` : "—",
      ]);
    });
    if (!hasEntries) {
      familyRows.push([
        e.empCode || "—",
        e.name || "—",
        "No Records Added",
        "—",
        "—",
        "—",
        "—",
      ]);
    }
  });
  const wsFamily = XLSX.utils.aoa_to_sheet([familyHeaders, ...familyRows]);
  wsFamily["!cols"] = autoFitColumns([familyHeaders, ...familyRows]);
  XLSX.utils.book_append_sheet(wb, wsFamily, "5. Family & Education");

  // ==========================================
  // SHEET 7: 6. Experience & Skills
  // ==========================================
  const expHeaders = [
    "Employee Code",
    "Full Name",
    "Prior Company Name",
    "Designation / Role",
    "From Date",
    "To Date",
    "Last CTC (₹)",
    "Technical Skills",
    "Languages Known",
  ];
  const expRows: any[][] = [];
  employees.forEach((e) => {
    const skillsStr = (e.skills || []).join(", ") || "—";
    const langsStr = (e.languagesKnown || []).join(", ") || "—";
    if (e.experience && e.experience.length > 0) {
      e.experience.forEach((ex) => {
        expRows.push([
          e.empCode || "—",
          e.name || "—",
          ex.company || "—",
          ex.role || "—",
          normalizeExcelDate(ex.from) || "—",
          normalizeExcelDate(ex.to) || "—",
          ex.ctc ? `₹${ex.ctc}` : "—",
          skillsStr,
          langsStr,
        ]);
      });
    } else {
      expRows.push([
        e.empCode || "—",
        e.name || "—",
        "Fresher / No Prior Experience Recorded",
        "—",
        "—",
        "—",
        "—",
        skillsStr,
        langsStr,
      ]);
    }
  });
  const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
  wsExp["!cols"] = autoFitColumns([expHeaders, ...expRows]);
  XLSX.utils.book_append_sheet(wb, wsExp, "6. Experience & Skills");

  // ==========================================
  // SHEET 8: 7. Compliance & BGV
  // ==========================================
  const complianceHeaders = [
    "Employee Code",
    "Full Name",
    "Department",
    "Background Verification (BGV) Status",
    "Police Verification Submitted",
    "Medical Fitness Certificate",
    "NDA Signed",
    "Compliance & HR Notes",
    "AI Verification Status",
    "AI Verification Issues",
    "Final Approval Status",
    "Approved By",
    "Approved At",
  ];
  const complianceRows = employees.map((e) => [
    e.empCode || "—",
    e.name || "—",
    e.department || "—",
    e.backgroundCheckStatus ? e.backgroundCheckStatus.toUpperCase() : "PENDING",
    formatBool(e.policeVerification, false),
    formatBool(e.medicalFitness, false),
    formatBool(e.ndaSigned, false),
    e.complianceNotes || "—",
    e.aiVerification?.passed ? "PASSED" : e.aiVerification ? "FLAGGED" : "NOT RUN",
    (e.aiVerification?.issues || []).join("; ") || "None",
    e.finalApproval?.status ? e.finalApproval.status.toUpperCase() : "PENDING",
    e.finalApproval?.approvedBy || "—",
    normalizeExcelDate(e.finalApproval?.approvedAt) || "—",
  ]);
  const wsCompliance = XLSX.utils.aoa_to_sheet([complianceHeaders, ...complianceRows]);
  wsCompliance["!cols"] = autoFitColumns([complianceHeaders, ...complianceRows]);
  XLSX.utils.book_append_sheet(wb, wsCompliance, "7. Compliance & BGV");

  // ==========================================
  // Generate and trigger download of .xlsx file
  // ==========================================
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${companyName.replace(/\s+/g, "_")}_Bulk_Employee_Master_Data_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export const BULK_TEMPLATE_HEADERS = [
  // 1. Identity & Profile
  "Employee Code",
  "Full Name",
  "Status (active/inactive/suspended)",
  "Employment Type (regular/contract)",
  "Work Email",
  "Personal Email",
  "Phone Number",
  "Gender (male/female/other)",
  "Date of Birth (YYYY-MM-DD)",
  "Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)",
  "Marital Status (single/married/divorced/widowed)",
  "Nationality",
  "Father Name",
  "Mother Name",
  "Spouse Name",

  // 2. Employment & Compensation
  "Department",
  "Designation",
  "Assigned Role",
  "Reporting Manager (Name or Code)",
  "Date of Joining (YYYY-MM-DD)",
  "Fixed Salary (Monthly ₹)",
  "Basic Salary (₹)",
  "Benefits Eligible Date (YYYY-MM-DD)",
  "Probation End Date (YYYY-MM-DD)",

  // 3. Statutory & Tax Deductions
  "PF Eligible (TRUE/FALSE)",
  "PF UAN",
  "PF Number",
  "ESI Eligible (TRUE/FALSE)",
  "ESIC Number",
  "PT Eligible (TRUE/FALSE)",
  "PT Number",
  "TDS Eligible (TRUE/FALSE)",

  // 4. KYC & Banking
  "PAN Number",
  "Aadhaar Number",
  "Name as per Aadhaar",
  "Passport Number",
  "Driving License",
  "Bank Account Number",
  "Bank IFSC Code",
  "Bank Name",
  "Bank Branch",
  "Bank Account Type (savings/current)",

  // 5. Address & Emergency Contact
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "Country",
  "Pincode",
  "Emergency Contact Person",
  "Emergency Relation",
  "Emergency Contact Phone",

  // 6. Branch, Shift & Policy Controls
  "Primary Branch (Code or Name)",
  "Assigned Branches (comma separated)",
  "Shift (General/Morning/Night)",
  "Morning Grace Time (always/10/15/20/25/30 mins)",
  "Allow Afternoon Login (TRUE/FALSE)",
  "Afternoon Login Time (HH:MM)",
  "Afternoon Grace Time (always/10/15/20/25/30 mins)",
  "Geofencing Required (TRUE/FALSE)",
  "Leave Apply Mobile Eligible (TRUE/FALSE)",
  "Biometric Enabled (TRUE/FALSE)",

  // 7. Compliance & Verification
  "Background Check (pending/clear/flagged)",
  "Police Verification (TRUE/FALSE)",
  "Medical Fitness (TRUE/FALSE)",
  "NDA Signed (TRUE/FALSE)",
  "Compliance Notes",
];

export const SAMPLE_EMPLOYEE_ROWS: any[][] = [
  [
    "EMP-1001",
    "Aarav Sharma",
    "active",
    "regular",
    "aarav.sharma@example.com",
    "aarav.personal@gmail.com",
    "9876543210",
    "male",
    "1994-06-15",
    "O+",
    "married",
    "Indian",
    "Ramesh Sharma",
    "Sunita Sharma",
    "Pooja Sharma",
    "Engineering",
    "Senior Software Engineer",
    "Senior Engineer",
    "Priya Iyer",
    "2023-04-01",
    50000,
    30000,
    "2023-04-01",
    "2023-07-01",
    "TRUE",
    "100987654321",
    "PF-12345/678",
    "FALSE",
    "",
    "TRUE",
    "PT-KAR-56789",
    "FALSE",
    "ABCDE1234F",
    "1234 5678 9012",
    "Aarav Sharma",
    "Z1234567",
    "DL-0420110012345",
    "50100123456789",
    "HDFC0001234",
    "HDFC Bank",
    "Koramangala, Bangalore",
    "savings",
    "123 Tech Park, 4th Cross",
    "Indiranagar",
    "Bengaluru",
    "Karnataka",
    "India",
    "560038",
    "Pooja Sharma",
    "Spouse",
    "9876543211",
    "Headquarters",
    "Headquarters, Branch-2",
    "General Shift",
    "15",
    "TRUE",
    "12:00",
    "15",
    "TRUE",
    "TRUE",
    "FALSE",
    "clear",
    "TRUE",
    "TRUE",
    "TRUE",
    "Verified all original identity documents.",
  ],
  [
    "EMP-1002",
    "Priya Iyer",
    "active",
    "regular",
    "priya.iyer@example.com",
    "priya.iyer@gmail.com",
    "9876543211",
    "female",
    "1992-09-20",
    "A+",
    "single",
    "Indian",
    "Sundaram Iyer",
    "Lakshmi Iyer",
    "",
    "HR",
    "HR Manager",
    "HR Executive",
    "",
    "2022-08-15",
    55000,
    35000,
    "2022-08-15",
    "2022-11-15",
    "TRUE",
    "100987654322",
    "PF-12345/679",
    "FALSE",
    "",
    "TRUE",
    "PT-KAR-56790",
    "FALSE",
    "PQRST5678K",
    "2345 6789 0123",
    "Priya Iyer",
    "A9876543",
    "DL-0420120023456",
    "50100987654321",
    "ICIC0004321",
    "ICICI Bank",
    "MG Road, Bangalore",
    "savings",
    "45 Palm Grove, 2nd Main",
    "Jayanagar",
    "Bengaluru",
    "Karnataka",
    "India",
    "560041",
    "Sundaram Iyer",
    "Father",
    "9876543212",
    "Headquarters",
    "Headquarters",
    "General Shift",
    "15",
    "TRUE",
    "12:00",
    "15",
    "TRUE",
    "TRUE",
    "FALSE",
    "clear",
    "TRUE",
    "TRUE",
    "TRUE",
    "Background verification completed successfully.",
  ],
];

/**
 * Generates and triggers download of the formatted Excel (.xlsx) template
 */
export function downloadEmployeeTemplate(companyName = "SWIFT") {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template with sample rows
  const templateData = [BULK_TEMPLATE_HEADERS, ...SAMPLE_EMPLOYEE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(templateData);
  ws["!cols"] = autoFitColumns(templateData);
  XLSX.utils.book_append_sheet(wb, ws, "Employee Template");

  // Sheet 2: Field Reference & Instructions Guide
  const instructions = [
    ["Employee Bulk Import — Field & Format Guide"],
    [""],
    ["Field Name", "Format / Allowed Values", "Example", "Mandatory / Default"],
    ["Employee Code", "Unique alphanumeric ID", "EMP-1001", "Mandatory (Auto-generated if empty)"],
    ["Full Name", "Employee full legal name", "Aarav Sharma", "Mandatory"],
    ["Status", "active / inactive / suspended / relieved", "active", "Default: active"],
    ["Employment Type", "regular / contract", "regular", "Default: regular"],
    ["Work Email", "Official work email address", "aarav@company.com", "Mandatory"],
    ["Personal Email", "Alternate/Personal email", "aarav.personal@gmail.com", "Optional"],
    ["Phone Number", "10-digit mobile number", "9876543210", "Mandatory"],
    ["Gender", "male / female / other", "male", "Default: male"],
    ["Date of Birth", "YYYY-MM-DD or Excel date", "1994-06-15", "Optional"],
    ["Blood Group", "A+, A-, B+, B-, AB+, AB-, O+, O-", "O+", "Optional"],
    ["Marital Status", "single / married / divorced / widowed", "single", "Default: single"],
    ["Department", "Department name", "Engineering", "Default: Engineering"],
    ["Designation", "Job title / Designation", "Senior Software Engineer", "Default: Software Engineer"],
    ["Assigned Role", "Role name configured in HRMS", "Senior Engineer", "Optional"],
    ["Reporting Manager", "Manager name or employee code", "Priya Iyer", "Optional"],
    ["Date of Joining", "YYYY-MM-DD or Excel date", "2023-04-01", "Mandatory (Default: Today)"],
    ["Fixed Salary (Monthly ₹)", "Gross fixed salary in INR (number)", "50000", "Default: 25000"],
    ["Basic Salary (₹)", "Basic pay component in INR (number)", "30000", "Default: 50% of Fixed Salary"],
    ["PF Eligible", "TRUE / FALSE", "TRUE", "Default: TRUE"],
    ["PF UAN", "12-digit Universal Account Number", "100987654321", "Optional"],
    ["ESI Eligible", "TRUE / FALSE", "FALSE", "Default: FALSE"],
    ["ESIC Number", "17-digit ESIC Insurance Number", "31001234560010001", "Optional"],
    ["PT Eligible", "TRUE / FALSE", "TRUE", "Default: TRUE"],
    ["PAN Number", "10-digit alphanumeric PAN", "ABCDE1234F", "Optional"],
    ["Aadhaar Number", "12-digit Aadhaar Number", "1234 5678 9012", "Optional"],
    ["Name as per Aadhaar", "Name matching Aadhaar card", "Aarav Sharma", "Optional"],
    ["Bank Account Number", "Numeric account number", "50100123456789", "Optional"],
    ["Bank IFSC Code", "11-character IFSC", "HDFC0001234", "Optional"],
    ["Bank Account Type", "savings / current", "savings", "Default: savings"],
    ["Address Line 1", "Street address / building", "123 Tech Park", "Optional"],
    ["City", "City name", "Bengaluru", "Optional"],
    ["State", "State name", "Karnataka", "Optional"],
    ["Pincode", "6-digit postal code", "560038", "Optional"],
    ["Emergency Contact Person", "Full name of emergency contact", "Pooja Sharma", "Optional"],
    ["Emergency Relation", "Spouse / Father / Mother / Friend / etc.", "Spouse", "Optional"],
    ["Emergency Contact Phone", "10-digit phone number", "9876543211", "Optional"],
    ["Primary Branch", "Branch Code or Branch Name", "HQ", "Optional"],
    ["Shift", "Shift Name or Shift Code", "General Shift", "Default: General Shift"],
    ["Morning Grace Time", "always / 10 / 15 / 20 / 25 / 30", "15", "Default: 15"],
    ["Geofencing Required", "TRUE / FALSE", "TRUE", "Default: TRUE"],
    ["Leave Apply Mobile Eligible", "TRUE / FALSE", "TRUE", "Default: TRUE"],
    ["Biometric Enabled", "TRUE / FALSE", "FALSE", "Default: FALSE"],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(instructions);
  wsGuide["!cols"] = autoFitColumns(instructions);
  XLSX.utils.book_append_sheet(wb, wsGuide, "Field Guide & Instructions");

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${companyName.replace(/\s+/g, "_")}_Bulk_Employee_Registration_Template_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Parses CSV/TSV or Excel (.xlsx / .xls) spreadsheet lines/buffers into structured Employee objects.
 * Features exact-key-prioritized column mapping, date normalizers, and branch/shift/manager resolution.
 */
export function parseEmployeeCsvText(
  input: string | ArrayBuffer | Uint8Array,
  existingEmployees: Employee[] = [],
  availableRoles: PredefinedRole[] = [],
  availableBranches: Branch[] = [],
  availableShifts: ShiftType[] = []
): {
  employees: Omit<Employee, "id">[];
  duplicates: string[];
  errors: string[];
  totalParsed: number;
} {
  let rawRows: any[][] = [];

  if (typeof input !== "string") {
    try {
      const wb = XLSX.read(input, { type: "array", cellDates: true });
      // Pick first non-empty sheet
      let firstSheetName = wb.SheetNames[0];
      for (const name of wb.SheetNames) {
        if (name.toLowerCase().includes("template") || name.toLowerCase().includes("employee") || name.toLowerCase().includes("master") || name.toLowerCase().includes("sheet1")) {
          firstSheetName = name;
          break;
        }
      }
      const ws = wb.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
      rawRows = jsonRows.map((r) => r.map((c) => (c != null ? cleanCellString(c) : "")));
    } catch (err: any) {
      return {
        employees: [],
        duplicates: [],
        errors: [`Failed to parse Excel file: ${err.message || err}`],
        totalParsed: 0,
      };
    }
  } else {
    if (input.startsWith("PK") || input.includes("\u0000") || input.includes("\ufffd")) {
      try {
        const wb = XLSX.read(input, { type: "binary", cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        rawRows = jsonRows.map((r) => r.map((c) => (c != null ? cleanCellString(c) : "")));
      } catch (err: any) {
        return {
          employees: [],
          duplicates: [],
          errors: [`Failed to parse Excel file: ${err.message || err}`],
          totalParsed: 0,
        };
      }
    } else {
      const lines = input
        .split(/\r\n|\n|\r/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      rawRows = lines.map((l) => parseCsvRow(l));
    }
  }

  if (rawRows.length <= 1) {
    return { employees: [], duplicates: [], errors: ["File contains no employee data rows."], totalParsed: 0 };
  }

  // Find header row (skip introductory banner rows if any)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    const rowStr = rawRows[r].join(" ").toLowerCase();
    if (rowStr.includes("employee") || rowStr.includes("name") || rowStr.includes("email") || rowStr.includes("empcode")) {
      headerRowIndex = r;
      break;
    }
  }

  // Clean and normalize headers
  const headers = rawRows[headerRowIndex].map((h: any) =>
    String(h || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
  );

  const parsedList: Omit<Employee, "id">[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  const existingCodes = new Set(existingEmployees.map((e) => e.empCode?.toLowerCase().trim()));

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const values = rawRows[i];
    if (!values || values.every((v) => !v || !String(v).trim())) continue; // empty row

    // Prioritized header extraction to prevent substring mis-matching
    const getVal = (possibleKeys: string[]): string => {
      const cleanedKeys = possibleKeys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""));

      // Pass 1: EXACT MATCH across all possible keys
      for (const k of cleanedKeys) {
        const exactIdx = headers.findIndex((h) => h === k);
        if (exactIdx !== -1 && values[exactIdx] !== undefined) {
          const val = cleanCellString(values[exactIdx]);
          if (val) return val;
        }
      }

      // Pass 2: Exact prefix or suffix match (e.g. "fullname" matching "name")
      for (const k of cleanedKeys) {
        if (k.length < 3) continue;
        const fixIdx = headers.findIndex((h) => h.startsWith(k) || h.endsWith(k));
        if (fixIdx !== -1 && values[fixIdx] !== undefined) {
          const val = cleanCellString(values[fixIdx]);
          if (val) return val;
        }
      }

      // Pass 3: Substring match for longer descriptive keys
      for (const k of cleanedKeys) {
        if (k.length < 5) continue;
        const subIdx = headers.findIndex((h) => h.includes(k));
        if (subIdx !== -1 && values[subIdx] !== undefined) {
          const val = cleanCellString(values[subIdx]);
          if (val) return val;
        }
      }

      return "";
    };

    // 1. Identity & Profile
    const empCode = getVal(["employeecode", "empcode", "code", "empid", "id"]) || `EMP-${1000 + i}`;
    const name = getVal(["fullname", "name", "employeename", "empname", "staffname", "firstname", "firstlast"]);
    const statusRaw = getVal(["status", "employeestatus", "state"]).toLowerCase();
    const status: Employee["status"] = statusRaw.includes("inact")
      ? "inactive"
      : statusRaw.includes("susp")
      ? "suspended"
      : statusRaw.includes("relie")
      ? "relieved"
      : statusRaw.includes("term")
      ? "terminated"
      : "active";

    const email = getVal(["workemail", "officialemail", "officeemail", "email", "mail"]) || `${empCode.toLowerCase().replace(/[^a-z0-9]/g, "")}@company.com`;
    const personalEmail = getVal(["personalemail", "personalmail", "alternateemail", "email2"]) || undefined;
    const password = getVal(["password", "pass"]) || generateEmployeePassword();
    const phone = getVal(["phonenumber", "phone", "mobile", "mobilenumber", "contactnumber", "cell"]) || "9876543210";
    const department = getVal(["department", "dept", "division", "team"]) || "Engineering";
    const designation = getVal(["designation", "jobtitle", "title", "position"]) || "Software Engineer";

    const empTypeRaw = getVal(["employmenttype", "employment", "type", "contract", "emptype"]).toLowerCase();
    const employmentType: Employee["employmentType"] = empTypeRaw.includes("contract") ? "contract" : "regular";

    const genderRaw = getVal(["gender", "sex"]).toLowerCase();
    const gender: Employee["gender"] = genderRaw === "female" ? "female" : genderRaw === "other" ? "other" : "male";
    const dobRaw = getVal(["dateofbirth", "dob", "birthdate"]);
    const dob = normalizeExcelDate(dobRaw) || undefined;
    const bloodGroup = getVal(["bloodgroup", "blood", "bg"]) || undefined;

    const maritalStatusRaw = getVal(["maritalstatus", "marital"]).toLowerCase();
    const maritalStatus: Employee["maritalStatus"] =
      maritalStatusRaw === "married" || maritalStatusRaw === "divorced" || maritalStatusRaw === "widowed"
        ? (maritalStatusRaw as Employee["maritalStatus"])
        : "single";

    const nationality = getVal(["nationality", "nation"]) || "Indian";
    const fatherName = getVal(["fathername", "father"]) || undefined;
    const motherName = getVal(["mothername", "mother"]) || undefined;
    const spouseName = getVal(["spousename", "spouse"]) || undefined;

    // 2. Employment & Compensation
    const dojRaw = getVal(["dateofjoining", "doj", "joiningdate", "hiredate"]);
    const doj = normalizeExcelDate(dojRaw) || new Date().toISOString().slice(0, 10);

    const salaryRaw = getVal(["fixedsalary", "monthlyfixedsalary", "grosssalary", "fixed", "monthlyctc", "salary"]);
    const basicRaw = getVal(["basicsalary", "basic", "basicpay"]);
    const fixedSalary = parseSalaryNumber(salaryRaw) || parseSalaryNumber(basicRaw) || 25000;
    const basic = parseSalaryNumber(basicRaw) || Math.round(fixedSalary * 0.5);

    const eligibleDateRaw = getVal(["benefitseligibledate", "eligibledate", "eligibilitydate"]);
    const eligibleDate = normalizeExcelDate(eligibleDateRaw) || doj;

    const probationDateRaw = getVal(["probationenddate", "probationdate", "probationend"]);
    const probationDate =
      normalizeExcelDate(probationDateRaw) ||
      new Date(new Date(doj).getTime() + 90 * 86400000).toISOString().slice(0, 10);

    // 3. Statutory & Deductions
    const pfEligible = parseBoolString(getVal(["pfeligible", "pf", "pfopted"]), true);
    const uan = getVal(["pfuan", "uan", "uanno", "pfuannumber"]) || undefined;
    const pfNumber = getVal(["pfnumber", "pfno", "memberid"]) || undefined;

    const esiEligible = parseBoolString(getVal(["esieligible", "esi", "esiceligible"]), false);
    const esic = getVal(["esicnumber", "esic", "esicno", "esino"]) || undefined;

    const ptEligible = parseBoolString(getVal(["pteligible", "pt", "professionaltaxeligible"]), true);
    const ptNumber = getVal(["ptnumber", "ptno", "ptregno"]) || undefined;

    const tdsEligible = parseBoolString(getVal(["tdseligible", "tds", "tdsdeduction"]), false);

    // 4. KYC & Banking
    const pan = getVal(["pannumber", "pan", "pancard"]).toUpperCase() || undefined;
    const aadhaar = getVal(["aadhaarnumber", "aadhaar", "uidai", "aadhar"]) || undefined;
    const nameAsPerAadhaar = getVal(["nameasperaadhaar", "aadhaarname", "nameonaadhaar"]) || name || undefined;
    const passportNumber = getVal(["passportnumber", "passport", "passportno"]) || undefined;
    const drivingLicense = getVal(["drivinglicense", "dl", "dlno", "license"]) || undefined;

    const bankAcc = getVal(["bankaccountnumber", "bankacc", "accountnumber", "bankaccountno", "accountno"]) || undefined;
    const bankIfsc = getVal(["bankifsccode", "ifsc", "bankifsc", "ifsccode"]).toUpperCase() || undefined;
    const bankName = getVal(["bankname", "bank"]) || undefined;
    const bankBranch = getVal(["bankbranch", "branchname", "bankcity"]) || undefined;
    const bankAccountTypeRaw = getVal(["bankaccounttype", "accounttype"]).toLowerCase();
    const bankAccountType: "savings" | "current" = bankAccountTypeRaw.includes("current") ? "current" : "savings";

    // 5. Address & Emergency Contact
    const addressLine1 = getVal(["addressline1", "address", "address1", "street"]) || undefined;
    const addressLine2 = getVal(["addressline2", "address2"]) || undefined;
    const city = getVal(["city", "town"]) || undefined;
    const state = getVal(["state", "province"]) || undefined;
    const country = getVal(["country", "nation"]) || "India";
    const pincode = getVal(["pincode", "zip", "postalcode", "zipcode"]) || undefined;

    const emergencyName = getVal(["emergencycontactperson", "emergencycontactname", "emergencyname"]) || undefined;
    const emergencyRelation = getVal(["emergencyrelation", "relationship", "emergencyrelationship"]) || undefined;
    const emergencyPhone = getVal(["emergencycontactphone", "emergencyphone", "emergencyphone2", "emergencycontactnumber"]) || undefined;

    // 6. Branch, Shift, Role & Manager Resolution
    const branchRaw = getVal(["primarybranch", "branchcode", "branch", "branchid", "assignedbranches"]) || "";
    let branchId: string | undefined = undefined;
    let branchIds: string[] | undefined = undefined;
    if (branchRaw) {
      const parts = branchRaw.split(/[,;/|]+/).map((b) => b.trim()).filter(Boolean);
      const matchedIds: string[] = [];
      for (const p of parts) {
        const found = (availableBranches || []).find(
          (b) =>
            b.id.toLowerCase() === p.toLowerCase() ||
            b.code?.toLowerCase() === p.toLowerCase() ||
            b.name.toLowerCase() === p.toLowerCase()
        );
        if (found) matchedIds.push(found.id);
      }
      if (matchedIds.length > 0) {
        branchId = matchedIds[0];
        branchIds = matchedIds;
      } else if (parts.length > 0) {
        branchId = parts[0];
        branchIds = parts;
      }
    }

    const shiftRaw = getVal(["shift", "shiftid", "shifttype", "assignedshift"]) || "";
    let shiftId = "gen";
    if (shiftRaw) {
      const foundShift = (availableShifts || []).find(
        (s) =>
          s.id.toLowerCase() === shiftRaw.toLowerCase() ||
          s.name.toLowerCase().includes(shiftRaw.toLowerCase()) ||
          shiftRaw.toLowerCase().includes(s.name.toLowerCase())
      );
      if (foundShift) {
        shiftId = foundShift.id;
      } else if (shiftRaw.toLowerCase().includes("night")) {
        shiftId = "night";
      } else if (shiftRaw.toLowerCase().includes("morn")) {
        shiftId = "morn";
      }
    }

    const roleRaw = getVal(["assignedrole", "role", "rolename"]);
    let roleId: string | undefined = undefined;
    let roleName: string | undefined = undefined;
    if (roleRaw) {
      const foundRole = (availableRoles || []).find(
        (r) =>
          r.id.toLowerCase() === roleRaw.toLowerCase() ||
          r.name.toLowerCase() === roleRaw.toLowerCase()
      );
      if (foundRole) {
        roleId = foundRole.id;
        roleName = foundRole.name;
      } else {
        roleName = roleRaw;
      }
    }

    const managerRaw = getVal(["reportingmanager", "manager", "managername", "reportsto"]);
    let managerId: string | undefined = undefined;
    let reportingManager: string | undefined = undefined;
    if (managerRaw) {
      const foundEmp = existingEmployees.find(
        (e) =>
          e.id.toLowerCase() === managerRaw.toLowerCase() ||
          e.empCode?.toLowerCase() === managerRaw.toLowerCase() ||
          e.name?.toLowerCase() === managerRaw.toLowerCase()
      );
      if (foundEmp) {
        managerId = foundEmp.id;
        reportingManager = foundEmp.name;
      } else {
        reportingManager = managerRaw;
      }
    }

    // 7. Policy & Controls
    const leaveApplyEligible = parseBoolString(getVal(["leaveapplymobileeligible", "leaveapplyeligible", "leaveeligible", "leaveapply"]), true);
    const geofencingEnabled = parseBoolString(getVal(["geofencingrequired", "geofencingenabled", "geofence", "geofencing"]), true);
    const biometricEnabled = parseBoolString(getVal(["biometricenabled", "biometric", "bioenabled"]), false);

    const graceTimeRaw = getVal(["morninggracetime", "gracetime", "grace", "graceperiod"]).toLowerCase();
    let graceTime: Employee["graceTime"] = "15";
    if (graceTimeRaw.includes("always") || graceTimeRaw.includes("none") || graceTimeRaw.includes("0")) graceTime = "always";
    else if (graceTimeRaw.includes("10")) graceTime = "10";
    else if (graceTimeRaw.includes("15")) graceTime = "15";
    else if (graceTimeRaw.includes("20")) graceTime = "20";
    else if (graceTimeRaw.includes("25")) graceTime = "25";
    else if (graceTimeRaw.includes("30")) graceTime = "30";

    const afternoonGraceRaw = getVal(["afternoongracetime", "afternoongrace"]).toLowerCase();
    let afternoonGraceTime: Employee["afternoonGraceTime"] = "15";
    if (afternoonGraceRaw.includes("always") || afternoonGraceRaw.includes("none") || afternoonGraceRaw.includes("0")) afternoonGraceTime = "always";
    else if (afternoonGraceRaw.includes("10")) afternoonGraceTime = "10";
    else if (afternoonGraceRaw.includes("15")) afternoonGraceTime = "15";
    else if (afternoonGraceRaw.includes("20")) afternoonGraceTime = "20";
    else if (afternoonGraceRaw.includes("25")) afternoonGraceTime = "25";
    else if (afternoonGraceRaw.includes("30")) afternoonGraceTime = "30";

    const allowHalfDayLogin = parseBoolString(getVal(["allowafternoonlogin", "allowhalfdaylogin", "halfdaylogin", "afternoonlogin"]), true);
    const halfDayLoginTime = getVal(["afternoonlogintime", "halfdaylogintime", "halfdaytime", "afternoontime"]) || "12:00";

    // 8. Compliance & BGV
    const bgvRaw = getVal(["backgroundcheck", "bgvstatus", "bgv", "backgroundverification"]).toLowerCase();
    const backgroundCheckStatus: Employee["backgroundCheckStatus"] = bgvRaw.includes("clear")
      ? "clear"
      : bgvRaw.includes("flag")
      ? "flagged"
      : "pending";

    const policeVerification = parseBoolString(getVal(["policeverification", "policeverificationsubmitted"]), false);
    const medicalFitness = parseBoolString(getVal(["medicalfitness", "medicalfitnesscertificate"]), false);
    const ndaSigned = parseBoolString(getVal(["ndasigned", "nda"]), false);
    const complianceNotes = getVal(["compliancenotes", "notes", "remarks"]) || undefined;

    if (!name) {
      errors.push(`Row ${i + 1}: Missing Full Name`);
      continue;
    }

    if (existingCodes.has(empCode.toLowerCase())) {
      duplicates.push(empCode);
    }

    parsedList.push({
      empCode,
      name,
      email,
      about: personalEmail,
      password,
      phone,
      department,
      designation,
      employmentType,
      fixedSalary,
      basic,
      doj,
      dob,
      gender,
      bloodGroup,
      maritalStatus,
      nationality,
      fatherName,
      motherName,
      spouseName,
      pan,
      aadhaar,
      nameAsPerAadhaar,
      aadhaarName: nameAsPerAadhaar,
      passportNumber,
      drivingLicense,
      bankAcc,
      bankIfsc,
      bankName,
      bankBranch,
      bankAccountType,
      roleId,
      roleName,
      managerId,
      reportingManager,
      shiftId,
      branchId,
      branchIds,
      pfEligible,
      uan,
      pfNumber,
      esiEligible,
      esic,
      ptEligible,
      ptNumber,
      tdsEligible,
      eligibleDate,
      probationDate,
      leaveApplyEligible,
      geofencingEnabled,
      biometricEnabled,
      graceTime,
      afternoonGraceTime,
      allowHalfDayLogin,
      halfDayLoginTime,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      pincode,
      emergencyName,
      emergencyRelation,
      emergencyContact: emergencyPhone,
      emergencyPhone2: emergencyPhone,
      status,
      backgroundCheckStatus,
      policeVerification,
      medicalFitness,
      ndaSigned,
      complianceNotes,
      faceRegistered: false,
      photoDataUrl: undefined,
    });
  }

  return {
    employees: parsedList,
    duplicates,
    errors,
    totalParsed: parsedList.length,
  };
}

/**
 * Standard CSV line tokenizer supporting quotes and commas
 */
function parseCsvRow(rowText: string): string[] {
  const result: string[] = [];
  let cur = "";
  let insideQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    const nextChar = rowText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cur += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === "," || char === "\t") && !insideQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}
