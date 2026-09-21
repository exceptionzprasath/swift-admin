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
  const colWidths: number[] = new Array(colCount).fill(12);

  rows.forEach((row) => {
    row.forEach((val, idx) => {
      const len = val != null ? String(val).length : 0;
      if (len + 3 > colWidths[idx]) {
        colWidths[idx] = Math.min(len + 3, 50);
      }
    });
  });

  return colWidths.map((w) => ({ wch: Math.max(w, 12) }));
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
    return found ? `${found.name} (${found.code})` : bId;
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
    "Aadhaar Number",
    "PAN Number",
    "Passport Number",
    "Driving License",
    "Bank Account Number",
    "Bank IFSC Code",
    "Bank Name",
    "Bank Branch",
    "Bank Account Type",
    // 4. Branches & Policy
    "Assigned Branches",
    "Primary Branch",
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
      e.status === "active" ? "Active" : "Inactive",
      e.gender ? e.gender.toUpperCase() : "—",
      e.dob || "—",
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
      e.doj || "—",
      e.eligibleDate || e.doj || "—",
      e.probationDate || "—",
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
      e.aadhaar || "—",
      e.pan || "—",
      e.passportNumber || "—",
      e.drivingLicense || "—",
      e.bankAcc || "—",
      e.bankIfsc || "—",
      e.bankName || "—",
      e.bankBranch || "—",
      e.bankAccountType ? e.bankAccountType.toUpperCase() : "SAVINGS",
      getBranchNamesList(e),
      getBranchName(e.branchId),
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
    "Gender",
    "Date of Birth",
    "Blood Group",
    "Marital Status",
    "Nationality",
    "Father's Name",
    "Mother's Name",
    "Spouse's Name",
    "Personal Email (Alt)",
    "Emergency Contact Person",
    "Emergency Relation",
    "Emergency Phone Number",
    "Face Registered",
    "Portal Activated",
  ];
  const identityRows = employees.map((e) => [
    e.empCode || "—",
    e.name || "—",
    e.status === "active" ? "Active" : "Inactive",
    e.gender ? e.gender.toUpperCase() : "—",
    e.dob || "—",
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
    e.doj || "—",
    e.eligibleDate || e.doj || "—",
    e.probationDate || "—",
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
    "Aadhaar Number",
    "PAN Card Number",
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
    e.aadhaar || "—",
    e.pan || "—",
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
    "Authorized Branches",
    "Primary Branch",
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
      getBranchNamesList(e),
      getBranchName(e.branchId),
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
        f.dob || "—",
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
          ex.from || "—",
          ex.to || "—",
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
    e.finalApproval?.approvedAt || "—",
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
  "Employment Type (regular/contract)",
  "Work Email",
  "Personal Email",
  "Phone Number",
  "Gender (male/female/other)",
  "Date of Birth (YYYY-MM-DD)",
  "Blood Group",
  "Marital Status (single/married/divorced/widowed)",
  "Nationality",
  "Father Name",
  "Mother Name",
  "Spouse Name",

  // 2. Employment & Compensation
  "Department",
  "Designation",
  "Assigned Role",
  "Reporting Manager",
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
  "Branch Code",
  "Shift",
  "Morning Grace Time (always/10/15/20/25/30 mins)",
  "Allow Afternoon Login (TRUE/FALSE)",
  "Afternoon Login Time (HH:MM)",
  "Afternoon Grace Time (always/10/15/20/25/30 mins)",
  "Geofencing Required (TRUE/FALSE)",
  "Leave Apply Mobile Eligible (TRUE/FALSE)",
  "Biometric Enabled (TRUE/FALSE)",
];

export const SAMPLE_EMPLOYEE_ROWS: any[][] = [];

/**
 * Generates and triggers download of the clean Excel (.xlsx) template without mock data
 */
export function downloadEmployeeTemplate(companyName = "SWIFT") {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([BULK_TEMPLATE_HEADERS]);
  ws["!cols"] = autoFitColumns([BULK_TEMPLATE_HEADERS]);
  XLSX.utils.book_append_sheet(wb, ws, "Employee Template");

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${companyName.replace(/\s+/g, "_")}_Bulk_Employee_Registration_Template_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Parses CSV/TSV or Excel (.xlsx / .xls) spreadsheet lines/buffers into structured Employee objects
 */
export function parseEmployeeCsvText(
  input: string | ArrayBuffer | Uint8Array,
  existingEmployees: Employee[],
  availableRoles: PredefinedRole[] = []
): {
  employees: Omit<Employee, "id">[];
  duplicates: string[];
  errors: string[];
  totalParsed: number;
} {
  let rawRows: string[][] = [];

  if (typeof input !== "string") {
    try {
      const wb = XLSX.read(input, { type: "array" });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
      rawRows = jsonRows.map((r) => r.map((c) => (c != null ? String(c).trim() : "")));
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
        const wb = XLSX.read(input, { type: "binary" });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        rawRows = jsonRows.map((r) => r.map((c) => (c != null ? String(c).trim() : "")));
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

  // Parse header line
  const headers = rawRows[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));

  const parsedList: Omit<Employee, "id">[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  const existingCodes = new Set(existingEmployees.map((e) => e.empCode?.toLowerCase().trim()));

  for (let i = 1; i < rawRows.length; i++) {
    const values = rawRows[i];
    if (!values || values.every((v) => !v.trim())) continue; // empty row

    const getVal = (possibleKeys: string[]): string => {
      for (const pk of possibleKeys) {
        const cleanKey = pk.toLowerCase().replace(/[^a-z0-9]/g, "");
        const idx = headers.findIndex((h) => h === cleanKey || h.includes(cleanKey));
        if (idx !== -1 && values[idx] !== undefined) {
          return values[idx].trim();
        }
      }
      return "";
    };

    const empCode = getVal(["employeecode", "empcode", "code", "empid", "id"]) || `EMP-${1000 + i}`;
    const name = getVal(["fullname", "name", "employeename", "empname", "staffname", "firstname", "firstlast", "employee", "staff"]);
    const email = getVal(["workemail", "officialemail", "email", "mail"]) || `${empCode.toLowerCase().replace(/[^a-z0-9]/g, "")}@company.com`;
    const personalEmail = getVal(["personalemail", "personalmail", "email2"]) || undefined;
    const password = getVal(["password", "pass"]) || generateEmployeePassword();
    const phone = getVal(["phonenumber", "phone", "mobile", "contact", "contactnumber", "mobilenumber"]) || "9876543210";
    const department = getVal(["department", "dept", "division"]) || "Engineering";
    const designation = getVal(["designation", "role", "title", "position", "jobtitle"]) || "Software Engineer";
    
    const salaryRaw = getVal(["fixedsalary", "salary", "grosssalary", "fixed", "monthlyctc"]);
    const basicRaw = getVal(["basicsalary", "basic"]);
    const fixedSalary = parseFloat(salaryRaw) || parseFloat(basicRaw) || 25000;
    const basic = parseFloat(basicRaw) || fixedSalary;

    const doj = getVal(["dateofjoining", "doj", "joiningdate"]) || new Date().toISOString().slice(0, 10);
    const empTypeRaw = getVal(["employmenttype", "employment", "type", "contract", "emptype"]).toLowerCase();
    const employmentType: Employee["employmentType"] = empTypeRaw.includes("contract") ? "contract" : "regular";
    const dob = getVal(["dateofbirth", "dob", "birthdate"]) || undefined;
    const genderRaw = getVal(["gender", "sex"]).toLowerCase();
    const gender = genderRaw === "female" ? "female" : genderRaw === "other" ? "other" : "male";
    const bloodGroup = getVal(["bloodgroup", "blood", "bg"]) || undefined;
    
    const pan = getVal(["pannumber", "pan"]).toUpperCase() || undefined;
    const aadhaar = getVal(["aadhaarnumber", "aadhaar", "uidai", "aadhar"]) || undefined;
    const passportNumber = getVal(["passportnumber", "passport", "passportno"]) || undefined;
    const drivingLicense = getVal(["drivinglicense", "dl", "dlno", "license"]) || undefined;
    
    const bankAcc = getVal(["bankaccountnumber", "bankacc", "account", "accountnumber", "bankaccountno"]) || undefined;
    const bankIfsc = getVal(["bankifsccode", "ifsc", "bankifsc", "ifsccode"]).toUpperCase() || undefined;
    const bankName = getVal(["bankname", "bank"]) || undefined;
    const bankBranch = getVal(["bankbranch", "branchname"]) || undefined;
    const bankAccountTypeRaw = getVal(["bankaccounttype", "accounttype"]).toLowerCase();
    const bankAccountType: "savings" | "current" = bankAccountTypeRaw.includes("current") ? "current" : "savings";

    const roleName = getVal(["assignedrole", "role", "rolename"]);
    const reportingManager = getVal(["reportingmanager", "manager", "managername", "reportsto"]) || undefined;
    const shiftId = getVal(["shift", "shiftid", "shifttype"]) || "gen";
    
    const branchRaw = getVal(["branchcode", "branch", "branchid", "assignedbranches"]) || "";
    const branchParts = branchRaw ? branchRaw.split(/[,;/|]+/).map((b) => b.trim()).filter(Boolean) : [];
    const branchId = branchParts[0] || undefined;
    const branchIds = branchParts.length > 0 ? branchParts : undefined;

    const parseBool = (str: string, def = true): boolean => {
      if (!str) return def;
      const s = str.toLowerCase().trim();
      return s === "true" || s === "yes" || s === "1" || s === "y";
    };

    const pfEligible = parseBool(getVal(["pfeligible", "pf"]), true);
    const uan = getVal(["pfuan", "uan", "uanno", "pfuannumber"]) || undefined;
    const pfNumber = getVal(["pfnumber", "pfno", "memberid"]) || undefined;
    
    const esiEligible = parseBool(getVal(["esieligible", "esi", "esiceligible"]), false);
    const esic = getVal(["esicnumber", "esic", "esicno", "esino"]) || undefined;
    
    const ptEligible = parseBool(getVal(["pteligible", "pt", "professionaltaxeligible"]), true);
    const ptNumber = getVal(["ptnumber", "ptno", "ptregno"]) || undefined;
    
    const tdsEligible = parseBool(getVal(["tdseligible", "tds"]), false);
    const leaveApplyEligible = parseBool(getVal(["leaveapplymobileeligible", "leaveapplyeligible", "leaveeligible", "leaveapply"]), true);
    const geofencingEnabled = parseBool(getVal(["geofencingrequired", "geofencingenabled", "geofence", "geofencing"]), true);
    const biometricEnabled = parseBool(getVal(["biometricenabled", "biometric", "bioenabled"]), false);

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

    const allowHalfDayLogin = parseBool(getVal(["allowafternoonlogin", "allowhalfdaylogin", "halfdaylogin", "afternoonlogin"]), true);
    const halfDayLoginTime = getVal(["afternoonlogintime", "halfdaylogintime", "halfdaytime", "afternoontime"]) || "12:00";

    const eligibleDate = getVal(["benefitseligibledate", "eligibledate"]) || doj;
    const probationDate =
      getVal(["probationenddate", "probationdate"]) || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    
    const maritalStatusRaw = getVal(["maritalstatus", "marital"]).toLowerCase();
    const maritalStatus =
      maritalStatusRaw === "married" || maritalStatusRaw === "divorced" || maritalStatusRaw === "widowed"
        ? (maritalStatusRaw as Employee["maritalStatus"])
        : "single";

    const nationality = getVal(["nationality", "nation"]) || "Indian";
    const fatherName = getVal(["fathername", "father"]) || undefined;
    const motherName = getVal(["mothername", "mother"]) || undefined;
    const spouseName = getVal(["spousename", "spouse"]) || undefined;

    const addressLine1 = getVal(["addressline1", "address", "address1", "street"]) || undefined;
    const addressLine2 = getVal(["addressline2", "address2"]) || undefined;
    const city = getVal(["city", "town"]) || undefined;
    const state = getVal(["state", "province"]) || undefined;
    const country = getVal(["country", "nation"]) || "India";
    const pincode = getVal(["pincode", "zip", "postalcode", "zipcode"]) || undefined;
    
    const emergencyName = getVal(["emergencycontactperson", "emergencycontactname", "emergencyname", "emergencycontact"]) || undefined;
    const emergencyRelation = getVal(["emergencyrelation", "relationship", "emergencyrelationship"]) || undefined;
    const emergencyPhone = getVal(["emergencycontactphone", "emergencyphone", "emergencyphone2", "emergencycontactnumber"]) || undefined;

    if (!name) {
      errors.push(`Row ${i + 1}: Missing Full Name`);
      continue;
    }

    if (existingCodes.has(empCode.toLowerCase())) {
      duplicates.push(empCode);
    }

    // Match role
    const matchedRole = (availableRoles || []).find(
      (r) => r.name.toLowerCase().trim() === (roleName || "").toLowerCase().trim()
    );

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
      passportNumber,
      drivingLicense,
      bankAcc,
      bankIfsc,
      bankName,
      bankBranch,
      bankAccountType,
      roleId: matchedRole?.id,
      roleName: matchedRole ? matchedRole.name : roleName || undefined,
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
      status: "active",
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
