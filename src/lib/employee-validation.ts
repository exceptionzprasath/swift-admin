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
