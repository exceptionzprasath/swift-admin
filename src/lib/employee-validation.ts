import type { Employee } from "./store";
import { safeFetch } from "./store";

export type DuplicateFieldKey = "empCode" | "email" | "phone" | "pan" | "aadhaar" | "uan";

export type DuplicateConflict = {
  field: DuplicateFieldKey;
  label: string;
  value: string;
  message: string;
  existingEmployeeName: string;
  existingEmpCode: string;
  existingEmployeeId?: string;
};

export type DuplicateCheckResult = {
  hasDuplicate: boolean;
  conflicts: DuplicateConflict[];
  byField: Partial<Record<DuplicateFieldKey, DuplicateConflict>>;
};

export const FIELD_LABELS: Record<DuplicateFieldKey, string> = {
  empCode: "Employee Code",
  email: "Email Address",
  phone: "Phone Number",
  pan: "PAN Card",
  aadhaar: "Aadhaar Card",
  uan: "PF UAN Number",
};

/**
 * Normalizers for comparison
 */
export function normalizeEmpCode(val?: string | null): string {
  return String(val || "").trim().toLowerCase();
}

export function normalizeEmail(val?: string | null): string {
  return String(val || "").trim().toLowerCase();
}

export function normalizePhone(val?: string | null): string {
  const digits = String(val || "").replace(/\D/g, "");
  // If starts with 91 and has 12 digits, extract last 10 digits
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  // If starts with 0 and has 11 digits, extract last 10 digits
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function normalizePan(val?: string | null): string {
  return String(val || "").replace(/[\s-]/g, "").trim().toUpperCase();
}

export function normalizeAadhaar(val?: string | null): string {
  return String(val || "").replace(/\D/g, "");
}

export function normalizeUan(val?: string | null): string {
  return String(val || "").replace(/\D/g, "");
}

/**
 * Checks in-memory list of employees for any matching duplicate fields
 */
export function findEmployeeDuplicates(
  candidate: Partial<Employee>,
  existingEmployees: Employee[] = [],
  excludeId?: string | null
): DuplicateCheckResult {
  const conflicts: DuplicateConflict[] = [];

  const cCode = normalizeEmpCode(candidate.empCode);
  const cEmail = normalizeEmail(candidate.email);
  const cPhone = normalizePhone(candidate.phone);
  const cPan = normalizePan(candidate.pan);
  const cAadhaar = normalizeAadhaar(candidate.aadhaar);
  const cUan = normalizeUan(candidate.uan);

  for (const emp of existingEmployees) {
    if (!emp) continue;
    // Skip if comparing with same employee (e.g. during edit)
    if (excludeId && (emp.id === excludeId || String(emp.id).toLowerCase() === String(excludeId).toLowerCase())) {
      continue;
    }

    const empName = emp.name || "Existing Employee";
    const empCode = emp.empCode || "—";

    // 1. Employee Code
    if (cCode && normalizeEmpCode(emp.empCode) === cCode) {
      if (!conflicts.some((c) => c.field === "empCode")) {
        conflicts.push({
          field: "empCode",
          label: FIELD_LABELS.empCode,
          value: candidate.empCode || "",
          message: `Employee Code "${candidate.empCode}" already exists in database (assigned to ${empName})`,
          existingEmployeeName: empName,
          existingEmpCode: empCode,
          existingEmployeeId: emp.id,
        });
      }
    }

    // 2. Email
    if (cEmail && (normalizeEmail(emp.email) === cEmail || normalizeEmail((emp as any).workEmail) === cEmail)) {
      if (!conflicts.some((c) => c.field === "email")) {
        conflicts.push({
          field: "email",
          label: FIELD_LABELS.email,
          value: candidate.email || "",
          message: `Email "${candidate.email}" already exists in database (assigned to ${empName} - ${empCode})`,
          existingEmployeeName: empName,
          existingEmpCode: empCode,
          existingEmployeeId: emp.id,
        });
      }
    }

    // 3. Phone Number
    if (cPhone && cPhone.length >= 7) {
      const ePhone = normalizePhone(emp.phone);
      if (ePhone && ePhone.length >= 7) {
        const isMatch = ePhone === cPhone || (ePhone.length >= 10 && cPhone.length >= 10 && ePhone.slice(-10) === cPhone.slice(-10));
        if (isMatch && !conflicts.some((c) => c.field === "phone")) {
          conflicts.push({
            field: "phone",
            label: FIELD_LABELS.phone,
            value: candidate.phone || "",
            message: `Phone number "${candidate.phone}" already exists in database (assigned to ${empName} - ${empCode})`,
            existingEmployeeName: empName,
            existingEmpCode: empCode,
            existingEmployeeId: emp.id,
          });
        }
      }
    }

    // 4. PAN Card (minimum 8 chars)
    if (cPan && cPan.length >= 8 && normalizePan(emp.pan) === cPan) {
      if (!conflicts.some((c) => c.field === "pan")) {
        conflicts.push({
          field: "pan",
          label: FIELD_LABELS.pan,
          value: candidate.pan || "",
          message: `PAN Card "${candidate.pan}" already exists in database (assigned to ${empName} - ${empCode})`,
          existingEmployeeName: empName,
          existingEmpCode: empCode,
          existingEmployeeId: emp.id,
        });
      }
    }

    // 5. Aadhaar (12 digits or min 10 digits)
    if (cAadhaar && cAadhaar.length >= 10 && normalizeAadhaar(emp.aadhaar) === cAadhaar) {
      if (!conflicts.some((c) => c.field === "aadhaar")) {
        conflicts.push({
          field: "aadhaar",
          label: FIELD_LABELS.aadhaar,
          value: candidate.aadhaar || "",
          message: `Aadhaar Card "${candidate.aadhaar}" already exists in database (assigned to ${empName} - ${empCode})`,
          existingEmployeeName: empName,
          existingEmpCode: empCode,
          existingEmployeeId: emp.id,
        });
      }
    }

    // 6. PF UAN Number (min 8 digits)
    if (cUan && cUan.length >= 8 && normalizeUan(emp.uan) === cUan) {
      if (!conflicts.some((c) => c.field === "uan")) {
        conflicts.push({
          field: "uan",
          label: FIELD_LABELS.uan,
          value: candidate.uan || "",
          message: `PF UAN "${candidate.uan}" already exists in database (assigned to ${empName} - ${empCode})`,
          existingEmployeeName: empName,
          existingEmpCode: empCode,
          existingEmployeeId: emp.id,
        });
      }
    }
  }

  const byField: Partial<Record<DuplicateFieldKey, DuplicateConflict>> = {};
  for (const c of conflicts) {
    byField[c.field] = c;
  }

  return {
    hasDuplicate: conflicts.length > 0,
    conflicts,
    byField,
  };
}

/**
 * Remote verification against the backend DynamoDB database
 */
export async function checkEmployeeDuplicatesRemote(
  tenantId: string,
  candidate: Partial<Employee>,
  excludeId?: string | null
): Promise<DuplicateCheckResult> {
  if (!tenantId) {
    return { hasDuplicate: false, conflicts: [], byField: {} };
  }

  try {
    const res = await safeFetch("/api/employees/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        empCode: candidate.empCode,
        email: candidate.email,
        phone: candidate.phone,
        pan: candidate.pan,
        aadhaar: candidate.aadhaar,
        uan: candidate.uan,
        excludeId,
      }),
    });

    if (res && res.ok) {
      const data = await res.json();
      const conflicts: DuplicateConflict[] = Array.isArray(data.conflicts) ? data.conflicts : [];
      const byField: Partial<Record<DuplicateFieldKey, DuplicateConflict>> = {};
      for (const c of conflicts) {
        byField[c.field] = c;
      }
      return {
        hasDuplicate: conflicts.length > 0,
        conflicts,
        byField,
      };
    }
  } catch (err) {
    console.warn("[checkEmployeeDuplicatesRemote] Failed:", err);
  }

  return { hasDuplicate: false, conflicts: [], byField: {} };
}

/**
 * Format Validators for Statutory & KYC IDs
 * 
 * Notice: While typing (isSubmitting === false), we do NOT show premature errors
 * for incomplete inputs. Errors are only shown when:
 * 1. The input exceeds the limit
 * 2. The input has reached the required length and format is invalid
 * 3. On final submission/Next step check (isSubmitting === true)
 */

export function validatePanFormat(pan?: string | null, isSubmitting = false): { valid: boolean; message?: string } {
  const clean = String(pan || "").replace(/[\s-]/g, "").trim().toUpperCase();
  if (!clean) return { valid: true };
  if (clean.length > 10) {
    return { valid: false, message: `PAN cannot exceed 10 characters (${clean.length}/10)` };
  }
  if (clean.length === 10) {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
      return { valid: false, message: "Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)" };
    }
    return { valid: true };
  }
  if (isSubmitting) {
    return { valid: false, message: `PAN must be exactly 10 characters (${clean.length}/10)` };
  }
  return { valid: true };
}

export function validateAadhaarFormat(aadhaar?: string | null, isSubmitting = false): { valid: boolean; message?: string } {
  const clean = String(aadhaar || "").replace(/\D/g, "");
  if (!clean) return { valid: true };
  if (clean.length > 12) {
    return { valid: false, message: `Aadhaar cannot exceed 12 digits (${clean.length}/12)` };
  }
  if (clean.length === 12) {
    return { valid: true };
  }
  if (isSubmitting) {
    return { valid: false, message: `Aadhaar must be exactly 12 digits (${clean.length}/12)` };
  }
  return { valid: true };
}

/**
 * Validates Indian Driving License number:
 * 2 letters: State Code (e.g. TN, KL, KA, DL)
 * 2 digits: RTO Code (e.g. 37, 01)
 * 4 digits: Year of issue (e.g. 2021)
 * 7 digits: Unique license number
 * Total: 15 alphanumeric characters
 */
export function validateDrivingLicenseFormat(dl?: string | null, isSubmitting = false): { valid: boolean; message?: string } {
  const clean = String(dl || "").replace(/[\s-]/g, "").trim().toUpperCase();
  if (!clean) return { valid: true };

  if (clean.length > 15) {
    return {
      valid: false,
      message: `Driving License cannot exceed 15 characters (${clean.length}/15)`,
    };
  }

  if (clean.length === 15) {
    const regex = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;
    if (!regex.test(clean)) {
      return {
        valid: false,
        message: "Invalid DL format. Expected State(2 letters) + RTO(2 digits) + Year(4 digits) + Number(7 digits)",
      };
    }

    const year = parseInt(clean.slice(4, 8), 10);
    const currentYear = new Date().getFullYear();
    if (year < 1950 || year > currentYear) {
      return {
        valid: false,
        message: `Invalid year of issue (${year}). Must be between 1950 and ${currentYear}`,
      };
    }

    return { valid: true };
  }

  if (isSubmitting) {
    return {
      valid: false,
      message: `Driving License must be 15 characters (${clean.length}/15)`,
    };
  }
  return { valid: true };
}

/**
 * Validates Voter ID (EPIC):
 * 3 letters (alphabetic code) + 7 digits (e.g. ABC1234567)
 */
export function validateVoterIdFormat(voterId?: string | null, isSubmitting = false): { valid: boolean; message?: string } {
  const clean = String(voterId || "").replace(/[\s-]/g, "").trim().toUpperCase();
  if (!clean) return { valid: true };
  if (clean.length > 10) {
    return {
      valid: false,
      message: `Voter ID cannot exceed 10 characters (${clean.length}/10)`,
    };
  }
  if (clean.length === 10) {
    if (!/^[A-Z]{3}[0-9]{7}$/.test(clean)) {
      return {
        valid: false,
        message: "Invalid Voter ID format. Expected 3 letters + 7 digits (e.g. ABC1234567)",
      };
    }
    return { valid: true };
  }
  if (isSubmitting) {
    return {
      valid: false,
      message: `Voter ID must be 10 characters (${clean.length}/10)`,
    };
  }
  return { valid: true };
}

/**
 * Validates Ration Card:
 * 8 to 20 alphanumeric characters
 */
export function validateRationCardFormat(rc?: string | null, isSubmitting = false): { valid: boolean; message?: string } {
  const clean = String(rc || "").trim().toUpperCase();
  if (!clean) return { valid: true };
  if (clean.length > 20) {
    return {
      valid: false,
      message: `Ration Card number cannot exceed 20 characters (${clean.length}/20)`,
    };
  }
  if (clean.length < 8) {
    if (isSubmitting) {
      return {
        valid: false,
        message: `Ration Card number must be at least 8 characters (${clean.length}/8)`,
      };
    }
    return { valid: true };
  }
  return { valid: true };
}

/**
 * Validates Indian Bank Account Number:
 * 9 to 18 numeric digits
 */
export function validateBankAccountFormat(acc?: string | null, isSubmitting = false): { valid: boolean; message?: string } {
  const clean = String(acc || "").replace(/\D/g, "");
  if (!clean) return { valid: true };
  if (clean.length > 18) {
    return {
      valid: false,
      message: `Bank Account number cannot exceed 18 digits (${clean.length}/18)`,
    };
  }
  if (clean.length < 9) {
    if (isSubmitting) {
      return {
        valid: false,
        message: `Bank Account number must be between 9 and 18 digits (${clean.length} digits)`,
      };
    }
    return { valid: true };
  }
  return { valid: true };
}

