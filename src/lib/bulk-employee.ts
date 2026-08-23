import type { Employee, PredefinedRole } from "./store";

export const BULK_TEMPLATE_HEADERS = [
  "Employee Code",
  "Full Name",
  "Password",
  "Work Email",
  "Phone",
  "Department",
  "Designation",
  "Fixed Salary",
  "Date of Joining (YYYY-MM-DD)",
  "Assigned Role",
  "Shift",
  "Branch Code",
  "Date of Birth (YYYY-MM-DD)",
  "Gender (male/female/other)",
  "Blood Group",
  "PAN Number",
  "Aadhaar Number",
  "Bank Account Number",
  "Bank IFSC Code",
  "PF Eligible (TRUE/FALSE)",
  "ESI Eligible (TRUE/FALSE)",
  "PT Eligible (TRUE/FALSE)",
  "TDS Eligible (TRUE/FALSE)",
  "Benefits Eligible Date (YYYY-MM-DD)",
  "Probation End Date (YYYY-MM-DD)",
  "Leave Apply Eligible (TRUE/FALSE)",
  "Geofencing Required (TRUE/FALSE)",
  "Grace Time (always/10/15/20/25/30 mins)",
  "Allow Half Day Login (TRUE/FALSE)",
  "Half Day Login Time (HH:MM)",
  "Marital Status (single/married/divorced/widowed)",
  "Address Line 1",
  "City",
  "State",
  "Pincode",
  "Emergency Contact Name",
  "Emergency Contact Phone",
];

export const SAMPLE_EMPLOYEE_ROWS = [
  [
    "SW0101",
    "Aarav Patel",
    "Swift@2026",
    "aarav.patel@company.com",
    "9876543210",
    "Engineering",
    "Senior Frontend Engineer",
    "65000",
    "2026-08-01",
    "General Employee",
    "General",
    "HQ",
    "1995-04-12",
    "male",
    "O+",
    "ABCDE1234F",
    "123456789012",
    "987654321098",
    "HDFC0001234",
    "TRUE",
    "FALSE",
    "TRUE",
    "FALSE",
    "2026-08-01",
    "2026-11-01",
    "TRUE",
    "married",
    "Flat 402, Skyline Heights",
    "Bengaluru",
    "Karnataka",
    "560001",
    "Meera Patel",
    "9876543211",
  ],
  [
    "SW0102",
    "Pooja Sundaram",
    "Swift@2026",
    "pooja.sundaram@company.com",
    "9876543220",
    "HR",
    "HR Operations Specialist",
    "48000",
    "2026-08-05",
    "HR Manager",
    "General",
    "HQ",
    "1997-09-20",
    "female",
    "B+",
    "FGHIJ5678K",
    "234567890123",
    "876543210987",
    "ICIC0005678",
    "TRUE",
    "TRUE",
    "TRUE",
    "FALSE",
    "2026-08-05",
    "2026-11-05",
    "TRUE",
    "single",
    "12/4 Anna Salai",
    "Chennai",
    "Tamil Nadu",
    "600002",
    "Sundaram K",
    "9876543222",
  ],
  [
    "SW0103",
    "Vikram Malhotra",
    "Swift@2026",
    "vikram.malhotra@company.com",
    "9876543230",
    "Finance",
    "Accounts Lead",
    "58000",
    "2026-08-10",
    "Finance / Payroll Manager",
    "General",
    "HQ",
    "1994-01-18",
    "male",
    "A+",
    "KLMNO9012P",
    "345678901234",
    "765432109876",
    "SBIN0004321",
    "TRUE",
    "FALSE",
    "TRUE",
    "TRUE",
    "2026-08-10",
    "2026-11-10",
    "TRUE",
    "married",
    "7th Cross, MG Road",
    "Mumbai",
    "Maharashtra",
    "400001",
    "Ritu Malhotra",
    "9876543233",
  ],
];

/**
 * Generates and triggers download of the prefilled CSV/Excel template with standard BOM
 */
export function downloadEmployeeTemplate(companyName = "SWIFT") {
  const sanitize = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvRows: string[] = [];
  csvRows.push(BULK_TEMPLATE_HEADERS.map(sanitize).join(","));
  SAMPLE_EMPLOYEE_ROWS.forEach((row) => {
    csvRows.push(row.map(sanitize).join(","));
  });

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `${companyName.replace(/\s+/g, "_")}_Bulk_Employee_Registration_Template.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses CSV/TSV or spreadsheet lines into structured Employee objects
 */
export function parseEmployeeCsvText(
  text: string,
  existingEmployees: Employee[],
  availableRoles: PredefinedRole[] = []
): {
  employees: Omit<Employee, "id">[];
  duplicates: string[];
  errors: string[];
  totalParsed: number;
} {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return { employees: [], duplicates: [], errors: ["File contains no data rows."], totalParsed: 0 };
  }

  // Parse header line
  const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));

  const parsedList: Omit<Employee, "id">[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  const existingCodes = new Set(existingEmployees.map((e) => e.empCode?.toLowerCase().trim()));

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const values = parseCsvRow(rawLine);
    if (values.every((v) => !v.trim())) continue; // empty row

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

    const empCode = getVal(["employeecode", "empcode", "code"]) || `EMP-${1000 + i}`;
    const name = getVal(["fullname", "name", "employeename"]);
    const email = getVal(["workemail", "email", "mail"]) || `${empCode.toLowerCase()}@company.com`;
    const password = getVal(["password", "pass"]) || "Swift@2026";
    const phone = getVal(["phone", "mobile", "contact"]) || "9876543210";
    const department = getVal(["department", "dept"]) || "Engineering";
    const designation = getVal(["designation", "role", "title", "position"]) || "Software Engineer";
    const salaryRaw = getVal(["fixedsalary", "salary", "basic", "basicsalary"]);
    const fixedSalary = parseFloat(salaryRaw) || 25000;
    const doj = getVal(["dateofjoining", "doj", "joiningdate"]) || new Date().toISOString().slice(0, 10);
    const dob = getVal(["dateofbirth", "dob", "birthdate"]) || undefined;
    const genderRaw = getVal(["gender", "sex"]).toLowerCase();
    const gender = genderRaw === "female" ? "female" : genderRaw === "other" ? "other" : "male";
    const bloodGroup = getVal(["bloodgroup", "blood"]) || undefined;
    const pan = getVal(["pannumber", "pan"]).toUpperCase() || undefined;
    const aadhaar = getVal(["aadhaarnumber", "aadhaar"]) || undefined;
    const bankAcc = getVal(["bankaccountnumber", "bankacc", "account"]) || undefined;
    const bankIfsc = getVal(["bankifsccode", "ifsc", "bankifsc"]).toUpperCase() || undefined;
    const roleName = getVal(["assignedrole", "role", "rolename"]);
    const shiftId = getVal(["shift", "shiftid"]) || "gen";
    const branchId = getVal(["branchcode", "branch", "branchid"]) || undefined;

    const parseBool = (str: string, def = true): boolean => {
      if (!str) return def;
      const s = str.toLowerCase().trim();
      return s === "true" || s === "yes" || s === "1" || s === "y";
    };

    const pfEligible = parseBool(getVal(["pfeligible", "pf"]), true);
    const esiEligible = parseBool(getVal(["esieligible", "esi"]), false);
    const ptEligible = parseBool(getVal(["pteligible", "pt", "professionaltaxeligible"]), true);
    const tdsEligible = parseBool(getVal(["tdseligible", "tds"]), false);
    const leaveApplyEligible = parseBool(getVal(["leaveapplyeligible", "leaveeligible", "leaveapply"]), true);
    const geofencingEnabled = parseBool(getVal(["geofencingrequired", "geofencingenabled", "geofence", "geofencing"]), true);

    const graceTimeRaw = getVal(["gracetime", "grace", "graceperiod"]).toLowerCase();
    let graceTime: Employee["graceTime"] = "15";
    if (graceTimeRaw.includes("always") || graceTimeRaw.includes("none") || graceTimeRaw.includes("0")) graceTime = "always";
    else if (graceTimeRaw.includes("10")) graceTime = "10";
    else if (graceTimeRaw.includes("15")) graceTime = "15";
    else if (graceTimeRaw.includes("20")) graceTime = "20";
    else if (graceTimeRaw.includes("25")) graceTime = "25";
    else if (graceTimeRaw.includes("30")) graceTime = "30";

    const allowHalfDayLogin = parseBool(getVal(["allowhalfdaylogin", "halfdaylogin", "allowafternoonlogin"]), true);
    const halfDayLoginTime = getVal(["halfdaylogintime", "afternoonlogintime", "halfdaytime"]) || "12:00";

    const eligibleDate = getVal(["benefitseligibledate", "eligibledate"]) || doj;
    const probationDate =
      getVal(["probationenddate", "probationdate"]) || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const maritalStatusRaw = getVal(["maritalstatus", "marital"]).toLowerCase();
    const maritalStatus =
      maritalStatusRaw === "married" || maritalStatusRaw === "divorced" || maritalStatusRaw === "widowed"
        ? (maritalStatusRaw as Employee["maritalStatus"])
        : "single";

    const addressLine1 = getVal(["addressline1", "address"]) || undefined;
    const city = getVal(["city"]) || undefined;
    const state = getVal(["state"]) || undefined;
    const pincode = getVal(["pincode", "zip"]) || undefined;
    const emergencyName = getVal(["emergencycontactname", "emergencyname"]) || undefined;
    const emergencyPhone = getVal(["emergencycontactphone", "emergencyphone", "emergencycontact"]) || undefined;

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
      password,
      phone,
      department,
      designation,
      fixedSalary,
      basic: fixedSalary,
      doj,
      dob,
      gender,
      bloodGroup,
      pan,
      aadhaar,
      bankAcc,
      bankIfsc,
      roleId: matchedRole?.id,
      roleName: matchedRole ? matchedRole.name : roleName || undefined,
      shiftId,
      branchId,
      pfEligible,
      esiEligible,
      ptEligible,
      tdsEligible,
      eligibleDate,
      probationDate,
      leaveApplyEligible,
      geofencingEnabled,
      graceTime,
      allowHalfDayLogin,
      halfDayLoginTime,
      maritalStatus,
      addressLine1,
      city,
      state,
      pincode,
      emergencyName,
      emergencyContact: emergencyPhone,
      status: "active",
      faceRegistered: false,
      photoDataUrl: undefined, // Bulk imported employees do not have photos initially
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
