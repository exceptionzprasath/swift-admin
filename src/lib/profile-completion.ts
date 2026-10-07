import type { Employee } from "./store";

export interface MissingFieldItem {
  key: string;
  label: string;
  tab: "personal" | "work" | "statutory" | "history" | "documents";
}

export interface ProfileCompletionResult {
  percentage: number;
  isComplete: boolean;
  totalFieldsCount: number;
  completedFieldsCount: number;
  missingFields: MissingFieldItem[];
  missingCountByTab: Record<"personal" | "work" | "statutory" | "history" | "documents", number>;
  firstIncompleteTab: "personal" | "work" | "statutory" | "history" | "documents";
}

export interface OverallOnboardingResult {
  overallPercentage: number;
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
  stageBreakdown: {
    personal: number;
    work: number;
    statutory: number;
    history: number;
    documents: number;
  };
  mostMissingFields: Array<{ label: string; key: string; count: number }>;
}

/**
 * Calculates individual profile & onboarding completion for an employee,
 * identical to the algorithm used in the SWIFT HR employee mobile app.
 */
export function calculateProfileCompletion(employee: Employee | null | undefined): ProfileCompletionResult {
  if (!employee) {
    return {
      percentage: 0,
      isComplete: false,
      totalFieldsCount: 0,
      completedFieldsCount: 0,
      missingFields: [],
      missingCountByTab: { personal: 0, work: 0, statutory: 0, history: 0, documents: 0 },
      firstIncompleteTab: "personal",
    };
  }

  const checklist: {
    key: string;
    label: string;
    tab: "personal" | "work" | "statutory" | "history" | "documents";
    isFilled: boolean;
  }[] = [
    // 1. Personal & Contact Details
    {
      key: "name",
      label: "Full Legal Name",
      tab: "personal",
      isFilled: Boolean(employee.name && employee.name.trim() !== ""),
    },
    {
      key: "gender",
      label: "Gender",
      tab: "personal",
      isFilled: Boolean(employee.gender && String(employee.gender).trim() !== ""),
    },
    {
      key: "dob",
      label: "Date of Birth",
      tab: "personal",
      isFilled: Boolean(employee.dob && employee.dob.trim() !== "" && employee.dob !== "-"),
    },
    {
      key: "bloodGroup",
      label: "Blood Group",
      tab: "personal",
      isFilled: Boolean(employee.bloodGroup && employee.bloodGroup.trim() !== "" && employee.bloodGroup !== "-"),
    },
    {
      key: "maritalStatus",
      label: "Marital Status",
      tab: "personal",
      isFilled: Boolean(employee.maritalStatus && String(employee.maritalStatus).trim() !== ""),
    },
    {
      key: "phone",
      label: "Contact Phone Number",
      tab: "personal",
      isFilled: Boolean(employee.phone && employee.phone.trim() !== "" && employee.phone !== "-"),
    },
    {
      key: "emergencyContact",
      label: "Emergency Contact Phone",
      tab: "personal",
      isFilled: Boolean(
        (employee.emergencyContact && employee.emergencyContact.trim() !== "" && employee.emergencyContact !== "-") ||
        (employee.emergencyPhone2 && employee.emergencyPhone2.trim() !== "")
      ),
    },
    {
      key: "emergencyName",
      label: "Emergency Contact Person",
      tab: "personal",
      isFilled: Boolean(employee.emergencyName && employee.emergencyName.trim() !== "" && employee.emergencyName !== "-"),
    },
    {
      key: "address",
      label: "Residential Address",
      tab: "personal",
      isFilled: Boolean(
        (employee.address && employee.address.trim() !== "" && employee.address !== "-") ||
        (employee.addressLine1 && employee.addressLine1.trim() !== "") ||
        (employee.city && employee.city.trim() !== "")
      ),
    },

    // 2. Work & Organization Details
    {
      key: "department",
      label: "Department",
      tab: "work",
      isFilled: Boolean(employee.department && employee.department.trim() !== "" && employee.department !== "-"),
    },
    {
      key: "designation",
      label: "Designation / Title",
      tab: "work",
      isFilled: Boolean(employee.designation && employee.designation.trim() !== "" && employee.designation !== "-"),
    },
    {
      key: "doj",
      label: "Date of Joining",
      tab: "work",
      isFilled: Boolean((employee.doj || (employee as any).joiningDate) && employee.doj !== "-"),
    },
    {
      key: "shiftId",
      label: "Shift & Timings",
      tab: "work",
      isFilled: Boolean(employee.shiftId || (employee as any).shift || (employee as any).shiftStart),
    },

    // 3. Bank & Statutory Identifiers
    {
      key: "bankName",
      label: "Salary Bank Name",
      tab: "statutory",
      isFilled: Boolean(
        (employee.bankName && employee.bankName.trim() !== "" && employee.bankName !== "-") ||
        ((employee as any).bankAccount && (employee as any).bankAccount.trim() !== "")
      ),
    },
    {
      key: "bankAcc",
      label: "Bank Account Number",
      tab: "statutory",
      isFilled: Boolean(
        (employee.bankAcc && employee.bankAcc.trim() !== "" && employee.bankAcc !== "-") ||
        ((employee as any).bankAccount && (employee as any).bankAccount.trim() !== "")
      ),
    },
    {
      key: "bankIfsc",
      label: "Bank IFSC Code",
      tab: "statutory",
      isFilled: Boolean(employee.bankIfsc && employee.bankIfsc.trim() !== "" && employee.bankIfsc !== "-"),
    },
    {
      key: "pan",
      label: "PAN Card Number",
      tab: "statutory",
      isFilled: Boolean(
        (employee.pan && employee.pan !== "-") ||
        ((employee as any).panNumber && (employee as any).panNumber !== "-")
      ),
    },
    {
      key: "aadhaar",
      label: "Aadhaar Number",
      tab: "statutory",
      isFilled: Boolean(employee.aadhaar && employee.aadhaar.trim() !== "" && employee.aadhaar !== "-"),
    },
    {
      key: "uan",
      label: "PF UAN / Enrollment",
      tab: "statutory",
      isFilled: Boolean(
        (employee.uan && employee.uan.trim() !== "" && employee.uan !== "-") ||
        employee.pfEligible !== undefined
      ),
    },

    // 4. Education, History & Skills
    {
      key: "skills",
      label: "Professional Skills",
      tab: "history",
      isFilled: Boolean(Array.isArray(employee.skills) && employee.skills.length > 0),
    },
    {
      key: "languagesKnown",
      label: "Languages Known",
      tab: "history",
      isFilled: Boolean(Array.isArray(employee.languagesKnown) && employee.languagesKnown.length > 0),
    },
    {
      key: "education",
      label: "Educational Qualification",
      tab: "history",
      isFilled: Boolean(Array.isArray(employee.education) && employee.education.length > 0),
    },

    // 5. Verification & Documents
    {
      key: "documentsUploaded",
      label: "Identity / Verification Documents",
      tab: "documents",
      isFilled: Boolean(
        (Array.isArray(employee.documentsUploaded) && employee.documentsUploaded.length > 0) ||
        employee.faceRegistered ||
        (employee.photoDataUrl && employee.photoDataUrl.startsWith("http")) ||
        employee.acceptance?.signed ||
        (employee as any).signedDocs
      ),
    },
  ];

  const totalFieldsCount = checklist.length;
  const completedList = checklist.filter((item) => item.isFilled);
  const completedFieldsCount = completedList.length;
  const missingList = checklist.filter((item) => !item.isFilled);

  const missingFields: MissingFieldItem[] = missingList.map((item) => ({
    key: item.key,
    label: item.label,
    tab: item.tab,
  }));

  const missingCountByTab: Record<"personal" | "work" | "statutory" | "history" | "documents", number> = {
    personal: 0,
    work: 0,
    statutory: 0,
    history: 0,
    documents: 0,
  };

  missingFields.forEach((item) => {
    missingCountByTab[item.tab] = (missingCountByTab[item.tab] || 0) + 1;
  });

  const percentage = Math.round((completedFieldsCount / totalFieldsCount) * 100);
  const isComplete = percentage === 100;

  const tabPriority: ("personal" | "statutory" | "work" | "history" | "documents")[] = [
    "personal",
    "statutory",
    "history",
    "documents",
    "work",
  ];

  let firstIncompleteTab: "personal" | "work" | "statutory" | "history" | "documents" = "personal";
  for (const tab of tabPriority) {
    if (missingCountByTab[tab] > 0) {
      firstIncompleteTab = tab;
      break;
    }
  }

  return {
    percentage,
    isComplete,
    totalFieldsCount,
    completedFieldsCount,
    missingFields,
    missingCountByTab,
    firstIncompleteTab,
  };
}

/**
 * Aggregates overall onboarding metrics across all employees in the organization.
 */
export function calculateOverallOnboarding(employees: Employee[]): OverallOnboardingResult {
  const activeEmployees = (employees || []).filter(
    (e) => !e.status || e.status === "active"
  );

  if (activeEmployees.length === 0) {
    return {
      overallPercentage: 0,
      completedCount: 0,
      inProgressCount: 0,
      totalCount: 0,
      stageBreakdown: { personal: 0, work: 0, statutory: 0, history: 0, documents: 0 },
      mostMissingFields: [],
    };
  }

  let totalPctSum = 0;
  let completedCount = 0;
  let inProgressCount = 0;

  const tabCompletes: Record<"personal" | "work" | "statutory" | "history" | "documents", number> = {
    personal: 0,
    work: 0,
    statutory: 0,
    history: 0,
    documents: 0,
  };

  const missingFieldFrequency: Record<string, { label: string; count: number }> = {};

  activeEmployees.forEach((emp) => {
    const res = calculateProfileCompletion(emp);
    totalPctSum += res.percentage;
    if (res.isComplete) {
      completedCount++;
    } else {
      inProgressCount++;
    }

    // Tab level rates
    const tabs: ("personal" | "work" | "statutory" | "history" | "documents")[] = [
      "personal",
      "work",
      "statutory",
      "history",
      "documents",
    ];
    tabs.forEach((t) => {
      if (res.missingCountByTab[t] === 0) {
        tabCompletes[t]++;
      }
    });

    res.missingFields.forEach((m) => {
      if (!missingFieldFrequency[m.key]) {
        missingFieldFrequency[m.key] = { label: m.label, count: 0 };
      }
      missingFieldFrequency[m.key].count++;
    });
  });

  const totalCount = activeEmployees.length;
  const overallPercentage = Math.round(totalPctSum / totalCount);

  const stageBreakdown = {
    personal: Math.round((tabCompletes.personal / totalCount) * 100),
    work: Math.round((tabCompletes.work / totalCount) * 100),
    statutory: Math.round((tabCompletes.statutory / totalCount) * 100),
    history: Math.round((tabCompletes.history / totalCount) * 100),
    documents: Math.round((tabCompletes.documents / totalCount) * 100),
  };

  const mostMissingFields = Object.entries(missingFieldFrequency)
    .map(([key, data]) => ({ key, label: data.label, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    overallPercentage,
    completedCount,
    inProgressCount,
    totalCount,
    stageBreakdown,
    mostMissingFields,
  };
}
