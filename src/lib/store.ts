import { create } from "zustand";
import { persist } from "zustand/middleware";
import { emitCompliance } from "./compliance-bus";
import { useAuth } from "./auth";
import { computePayroll } from "./payroll";
import type { SalaryRevision, SalaryRevisionDraft } from "./salary-revision";
import { projectRevision } from "./salary-revision";
import {
  buildDefaultLibrary,
  buildEmployeeJourney,
  DEFAULT_DOC_ASSETS,
  type CompanyDocumentAssets,
  type DocumentLibraryItem,
  type EmployeeJourney,
  type JourneyStep,
  type JourneyStepStatus,
  type LifecyclePhase,
} from "./lifecycle";
import {
  DEFAULT_ASSET_CATEGORIES,
  type Asset,
  type AssetAssignment,
  type AssetCategory,
  type AssetCondition,
  type AssetStatus,
} from "./assets";



const API_URL = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

async function syncItem(table: string, item: any) {
  try {
    await fetch(`${API_URL}/api/companies/mutate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, item }),
    });
  } catch (err) {
    console.error(`[Sync] Error mutating table ${table}:`, err);
  }
}

async function syncDelete(table: string, tenantId: string, id: string) {
  try {
    await fetch(`${API_URL}/api/companies/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, tenantId, id }),
    });
  } catch (err) {
    console.error(`[Sync] Error deleting from table ${table}:`, err);
  }
}

async function uploadToS3(tenantId: string, path: string, fileDataUrl: string) {
  if (!fileDataUrl || !fileDataUrl.startsWith("data:")) return fileDataUrl;
  try {
    const res = await fetch(`${API_URL}/api/companies/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, path, fileDataUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
  } catch (err) {
    console.error(`[S3] Upload failed for ${path}:`, err);
  }
  return fileDataUrl;
}

export type LeaveType = { id: string; name: string; days: number; paid?: boolean };
export type ShiftType = { id: string; name: string; start: string; end: string; allowancePerDay: number };

export type EarningFormula =
  | "pctOfBasic"
  | "flatMonthly"
  | "perDay"
  | "perShiftDay"
  | "perOtHour"
  | "perNightHour"
  | "input"
  | "pctOfCtc";
export type EarningComponent = {
  id: string;
  name: string;
  formula: EarningFormula;
  value: number;
  prorate: boolean;
  taxable: boolean;
  includeInPf: boolean;
  includeInEsi: boolean;
  includeInGratuity: boolean;
  inputKey?: string;
};

export type DeductionFormula = "flat" | "pctOfGross" | "pctOfBasic" | "pctOfPfBase" | "input";
export type DeductionComponent = {
  id: string;
  name: string;
  formula: DeductionFormula;
  value: number;
  inputKey?: string;
};

export type PtSlab = { upTo: number; amount: number };
export type TdsSlab = { upTo: number; pct: number };

export type Branch = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  gstin?: string;
  isHead?: boolean;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  wifiSSIDs?: string[];
  ipAllowlist?: string[];
  shiftStart?: string;
  shiftEnd?: string;
  weeklyOff?: string[];
  photoDataUrl?: string;
  managerId?: string;
};


export type NoticeAudienceScope = "company" | "branch" | "department" | "role" | "employees";
export type NoticePriority = "info" | "important" | "urgent";
export type Notice = {
  id: string;
  title: string;
  body: string;
  priority: NoticePriority;
  audience: { scope: NoticeAudienceScope; values: string[] };
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  pinned?: boolean;
  readBy: string[];
};

export type Company = {
  name: string;
  legalName: string;
  address: string;
  gstin: string;
  logoDataUrl?: string;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  otMultiplier: number;
  esiThreshold: number;
  employeePfPct: number;
  employerPfPct: number;
  employeeEsiPct: number;
  employerEsiPct: number;
  hraPct: number;
  specialPct: number;
  medicalPct: number;
  conveyancePct: number;
  washingPct: number;
  otherPct: number;
  ptAmount: number;
  geofence: { lat: number; lng: number; radiusM: number };
  leaveTypes: LeaveType[];
  shifts: ShiftType[];
  appointmentTemplate: string;
  branches: Branch[];
  earnings: EarningComponent[];
  deductions: DeductionComponent[];
  pfRules: { enabled: boolean; employeePct: number; employerPct: number; ceiling: number };
  esiRules: { enabled: boolean; employeePct: number; employerPct: number; threshold: number };
  ptSlabs: PtSlab[];
  tdsRules: { enabled: boolean };
  tdsSlabs: TdsSlab[];
  lwfRules: { enabled: boolean; employeeAmount: number; employerAmount: number; frequency: "monthly" | "half-yearly" };
  gratuityRules: { enabled: boolean; numerator: number; denominator: number };
  lopBasis: "basic" | "gross";
  attendanceDefaults?: AttendanceProfileRule[];
  /** Optional state-wise LWF overrides. When branch state matches, these amounts win over lwfRules. */
  lwfByState?: { state: string; employeeAmount: number; employerAmount: number; frequency?: "monthly" | "half-yearly" }[];
  /** Optional per-segment salary structure overrides. First match wins; falls back to company earnings/deductions. */
  salaryStructures?: SalaryStructure[];
  /** Optional minimum wage floor (monthly basic + DA) used by the AI audit. */
  minimumWageMonthly?: number;
};

export type SalaryStructure = {
  id: string;
  name: string;
  priority: number;
  match: { branchId?: string; department?: string; designation?: string; category?: string };
  earnings?: EarningComponent[];
  deductions?: DeductionComponent[];
};

export type AttendanceProfileRule = {
  id: string;
  name: string;
  priority: number;
  match: { branchId?: string; department?: string; designation?: string };
  shiftId?: string;
  weeklyOff?: string[];
  leaveTypeIds?: string[];
  geofenceFromBranch?: boolean;
  payrollGroup?: string;
  costCentre?: string;
  holidayCalendar?: string;
};

export type ResolvedAttendanceProfile = {
  ruleId?: string;
  ruleName?: string;
  shiftId?: string;
  weeklyOff?: string[];
  leaveTypeIds?: string[];
  geofenceFromBranch?: boolean;
  payrollGroup?: string;
  costCentre?: string;
  holidayCalendar?: string;
};

export type Employee = {
  id: string;
  empCode: string;
  password?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  doj: string;
  basic: number;
  pan?: string;
  aadhaar?: string;
  bankAcc?: string;
  bankIfsc?: string;
  shiftId?: string;
  faceRegistered?: boolean;
  status: "active" | "inactive";
  managerId?: string;
  about?: string;
  branchId?: string;
  photoDataUrl?: string;
  gender?: "male" | "female" | "other";
  dob?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  attendanceProfile?: ResolvedAttendanceProfile;
  category?: string;
  // Extended registration fields
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  currentAddress?: string;
  permanentSameAsCurrent?: boolean;
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  nationality?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  uan?: string;
  esic?: string;
  pfNumber?: string;
  ptNumber?: string;
  passportNumber?: string;
  drivingLicense?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountType?: "savings" | "current";
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone2?: string;
  family?: FamilyMember[];
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  skills?: string[];
  languagesKnown?: string[];
  complianceNotes?: string;
  policeVerification?: boolean;
  backgroundCheckStatus?: "pending" | "clear" | "flagged";
  medicalFitness?: boolean;
  ndaSigned?: boolean;
  documentsUploaded?: EmployeeDocument[];
  aiVerification?: {
    ranAt?: string;
    issues?: string[];
    passed?: boolean;
  };
  acceptance?: {
    signed: boolean;
    signatureDataUrl?: string;
    signedAt?: string;
    ip?: string;
  };
  finalApproval?: {
    approvedBy?: string;
    approvedAt?: string;
    status: "pending" | "approved" | "rejected";
    comment?: string;
  };
  portalActivated?: boolean;
  portalActivatedAt?: string;
};

export type FamilyMember = { name: string; relation: string; dob?: string; dependent?: boolean };
export type EducationEntry = { level: string; institute: string; year?: string; grade?: string };
export type ExperienceEntry = { company: string; role: string; from?: string; to?: string; ctc?: number };
export type EmployeeDocument = { id: string; type: string; name: string; dataUrl?: string; uploadedAt: string; verified?: boolean };

export type RegistrationDraft = {
  id: string;
  data: Partial<Employee>;
  currentStep: number;
  updatedAt: string;
  createdBy: string;
};

export type AuditEntry = {
  id: string;
  ts: string;
  actorId?: string;
  actorName: string;
  entity: string;
  entityId?: string;
  action: string;
  ip?: string;
  device?: string;
  location?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
};


export type DemoTenant = {
  id: string;
  name: string;
  slug: string;
  legalName: string;
  plan: "starter" | "growth" | "enterprise";
  status: "active" | "trial" | "suspended";
  employees: number;
  createdAt: string;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  otHours?: number;
  lat?: number;
  lng?: number;
  withinGeofence?: boolean;
  status: "present" | "absent" | "leave" | "half-day";
};

export type PayrollInput = {
  employeeId: string;
  month: string; // YYYY-MM
  daysWorked: number;
  otHours: number;
  incentive: number;
  shiftDays: number;
  loan: number;
  advance: number;
  bonus: number;
};

export type PayrollRun = PayrollInput & {
  id: string;
  computed: ReturnType<typeof import("./payroll").computePayroll>;
  createdAt: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
};

type User = { role: "admin" | "employee"; employeeId?: string; name: string };

export type ApprovalStepStatus = "pending" | "approved" | "rejected";
export type ApprovalStep = {
  approver: string;
  status: ApprovalStepStatus;
  comment?: string;
  actedAt?: string;
  actedBy?: string;
  forwardedFrom?: string;
};
export type DocRequest = {
  id: string;
  letterKey: string;
  letterTitle: string;
  employeeId: string;
  templateBody: string;
  format: "pdf" | "docx";
  requestedBy: string;
  requestedAt: string;
  steps: ApprovalStep[];
  currentStep: number;
  status: ApprovalStepStatus;
  note?: string;
};

type State = {
  company: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  payrolls: PayrollRun[];
  leaves: LeaveRequest[];
  currentUser: User | null;
  theme: "light" | "dark";
  demoMode: boolean;
  demoSuper: boolean;
  demoTenants: DemoTenant[];
  approvalMatrix: Record<string, string[]>;
  docRequests: DocRequest[];
  salaryRevisions: SalaryRevision[];
  notices: Notice[];
  docAssets: CompanyDocumentAssets;
  docLibrary: DocumentLibraryItem[];
  journeys: EmployeeJourney[];
  assetCategories: AssetCategory[];
  assets: Asset[];
  assetAssignments: AssetAssignment[];
  auditLog: AuditEntry[];
  registrationDrafts: RegistrationDraft[];
  addAudit: (entry: Omit<AuditEntry, "id" | "ts">) => AuditEntry;
  saveRegistrationDraft: (draft: Omit<RegistrationDraft, "updatedAt">) => void;
  deleteRegistrationDraft: (id: string) => void;
  addAssetCategory: (c: Omit<AssetCategory, "id">) => AssetCategory;
  updateAssetCategory: (id: string, patch: Partial<AssetCategory>) => void;
  deleteAssetCategory: (id: string) => void;
  addAsset: (a: Omit<Asset, "id" | "status"> & { status?: AssetStatus }) => Asset;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  assignAsset: (input: { assetId: string; employeeId: string; assignedBy: string; conditionOnAssign?: AssetCondition; acknowledgementSignatureDataUrl?: string; notes?: string }) => AssetAssignment | null;
  returnAsset: (assignmentId: string, actor: string, conditionOnReturn?: AssetCondition, notes?: string) => void;
  setDocAssets: (patch: Partial<CompanyDocumentAssets>) => void;
  addLibraryItem: (item: Omit<DocumentLibraryItem, "id">) => DocumentLibraryItem;
  updateLibraryItem: (id: string, patch: Partial<DocumentLibraryItem>) => void;
  deleteLibraryItem: (id: string) => void;
  reorderLibrary: (ids: string[]) => void;
  resetLibrary: () => void;
  ensureJourney: (employeeId: string) => EmployeeJourney;
  updateJourneyStep: (employeeId: string, stepId: string, patch: Partial<JourneyStep>) => void;
  advanceJourneyStep: (employeeId: string, stepId: string, status: JourneyStepStatus, actor?: string) => void;
  setJourneyPhase: (employeeId: string, phase: LifecyclePhase) => void;
  autoGenerateAllPending: (employeeId: string, actor: string) => number;
  addNotice: (n: Omit<Notice, "id" | "createdAt" | "readBy">) => Notice;
  updateNotice: (id: string, patch: Partial<Notice>) => void;
  deleteNotice: (id: string) => void;
  markNoticeRead: (id: string, userKey: string) => void;
  addBranch: (b: Omit<Branch, "id">) => Branch;
  updateBranch: (id: string, patch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  loadCompanyState: (tenantId: string) => Promise<void>;
  setTheme: (t: "light" | "dark") => void;
  setCompany: (c: Partial<Company>) => void;
  addEmployee: (e: Omit<Employee, "id">) => Employee;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  upsertAttendance: (r: AttendanceRecord) => void;
  addPayroll: (p: PayrollRun) => void;
  addLeave: (l: Omit<LeaveRequest, "id" | "status">) => void;
  updateLeave: (id: string, status: LeaveRequest["status"]) => void;
  login: (u: User) => void;
  logout: () => void;
  seedDemo: (asRole: "admin" | "employee") => void;
  seedSuperDemo: () => void;
  addDemoTenant: (t: Omit<DemoTenant, "id" | "createdAt">) => void;
  updateDemoTenant: (id: string, patch: Partial<DemoTenant>) => void;
  deleteDemoTenant: (id: string) => void;
  exitDemo: () => void;
  setApprovalChain: (letterKey: string, approvers: string[]) => void;
  createDocRequest: (r: Omit<DocRequest, "id" | "steps" | "currentStep" | "status" | "requestedAt">) => DocRequest;
  actOnDocStep: (id: string, action: "approve" | "reject", comment: string, actedBy: string) => void;
  forwardDocStep: (id: string, toApprover: string, comment: string, actedBy: string) => void;
  deleteDocRequest: (id: string) => void;
  applySalaryRevision: (draft: SalaryRevisionDraft, actor: string) => SalaryRevision | null;
  rollbackSalaryRevision: (id: string) => void;
};


const defaultCompany: Company = {
  name: "SWIFT Demo Pvt Ltd",
  legalName: "SWIFT Demo Private Limited",
  address: "123 Business Ave, Suite 100, Bangalore, India",
  gstin: "29ABCDE1234F1Z5",
  workingDaysPerMonth: 26,
  workingHoursPerDay: 8,
  otMultiplier: 2,
  esiThreshold: 21000,
  employeePfPct: 12,
  employerPfPct: 13,
  employeeEsiPct: 0.75,
  employerEsiPct: 3.25,
  hraPct: 30,
  specialPct: 10,
  medicalPct: 10,
  conveyancePct: 20,
  washingPct: 10,
  otherPct: 20,
  ptAmount: 200,
  geofence: { lat: 12.9716, lng: 77.5946, radiusM: 150 },
  leaveTypes: [
    { id: "cl", name: "Casual Leave", days: 12 },
    { id: "sl", name: "Sick Leave", days: 12 },
    { id: "el", name: "Earned Leave", days: 15 },
  ],
  shifts: [
    { id: "gen", name: "General", start: "09:00", end: "18:00", allowancePerDay: 0 },
    { id: "night", name: "Night", start: "22:00", end: "06:00", allowancePerDay: 250 },
  ],
  branches: [
    { id: "br-hq", name: "Head Office", code: "HQ", address: "123 Business Ave", city: "Bangalore", state: "Karnataka", isHead: true, lat: 12.9716, lng: 77.5946, radiusMeters: 150, shiftStart: "09:00", shiftEnd: "18:00", weeklyOff: ["Sun"] },
  ],

  appointmentTemplate: `Dear {{name}},

We are pleased to offer you the position of {{designation}} in the {{department}} department at {{company}}, effective {{doj}}.

Your consolidated CTC is INR {{ctc}} per annum, with a monthly gross of INR {{gross}}. Detailed salary breakup is attached.

You will be reporting to the {{department}} team. Your Employee Code is {{empCode}}.

We look forward to a long and mutually rewarding association.

Warm regards,
HR Department
{{company}}`,
  earnings: [
    { id: "hra", name: "HRA", formula: "pctOfBasic", value: 30, prorate: true, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    { id: "special", name: "Special Allowance", formula: "pctOfBasic", value: 10, prorate: true, taxable: true, includeInPf: true, includeInEsi: true, includeInGratuity: true },
    { id: "medical", name: "Medical", formula: "pctOfBasic", value: 10, prorate: true, taxable: false, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    { id: "conveyance", name: "Conveyance", formula: "pctOfBasic", value: 20, prorate: true, taxable: false, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    { id: "washing", name: "Washing", formula: "pctOfBasic", value: 10, prorate: true, taxable: false, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    { id: "other", name: "Other Allowance", formula: "pctOfBasic", value: 20, prorate: true, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    { id: "ot", name: "Overtime", formula: "perOtHour", value: 2, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    { id: "shift", name: "Shift Allowance", formula: "perShiftDay", value: 250, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false },
    { id: "incentive", name: "Incentive", formula: "input", value: 0, prorate: false, taxable: true, includeInPf: false, includeInEsi: true, includeInGratuity: false, inputKey: "incentive" },
    { id: "bonus", name: "Bonus", formula: "input", value: 0, prorate: false, taxable: true, includeInPf: false, includeInEsi: false, includeInGratuity: false, inputKey: "bonus" },
    { id: "arrears", name: "Arrears", formula: "input", value: 0, prorate: false, taxable: true, includeInPf: false, includeInEsi: false, includeInGratuity: false, inputKey: "arrears" },
  ],
  deductions: [],
  pfRules: { enabled: true, employeePct: 12, employerPct: 13, ceiling: 15000 },
  esiRules: { enabled: true, employeePct: 0.75, employerPct: 3.25, threshold: 21000 },
  ptSlabs: [
    { upTo: 15000, amount: 0 },
    { upTo: 25000, amount: 150 },
    { upTo: 999999999, amount: 200 },
  ],
  tdsRules: { enabled: false },
  tdsSlabs: [
    { upTo: 300000, pct: 0 },
    { upTo: 700000, pct: 5 },
    { upTo: 1000000, pct: 10 },
    { upTo: 1200000, pct: 15 },
    { upTo: 1500000, pct: 20 },
    { upTo: 999999999, pct: 30 },
  ],
  lwfRules: { enabled: false, employeeAmount: 10, employerAmount: 20, frequency: "monthly" },
  gratuityRules: { enabled: true, numerator: 15, denominator: 26 },
  lopBasis: "basic",
  attendanceDefaults: [
    {
      id: "apd-default",
      name: "Default (All Employees)",
      priority: 0,
      match: {},
      shiftId: "gen",
      weeklyOff: ["Sun"],
      leaveTypeIds: ["cl", "sl", "el"],
      geofenceFromBranch: true,
      payrollGroup: "Monthly",
      costCentre: "General",
      holidayCalendar: "India-Standard",
    },
  ],
};

function buildDemoData() {
  const empIds = ["demo-emp-1", "demo-emp-2", "demo-emp-3", "demo-emp-4"];
  const employees: Employee[] = [
    { id: empIds[0], empCode: "SWF001", password: "demo123", name: "Aarav Sharma", email: "aarav@demo.swift", phone: "+91 98765 43210", department: "Engineering", designation: "Senior Engineer", doj: "2023-04-01", basic: 45000, pan: "ABCDE1234F", aadhaar: "1234 5678 9012", bankAcc: "50100123456789", bankIfsc: "HDFC0001234", shiftId: "gen", faceRegistered: true, status: "active", managerId: empIds[1], about: "Full-stack engineer leading the payroll module. 4 yrs experience with React & Node." },
    { id: empIds[1], empCode: "SWF002", password: "demo123", name: "Priya Iyer", email: "priya@demo.swift", phone: "+91 98765 43211", department: "HR", designation: "HR Manager", doj: "2022-08-15", basic: 55000, pan: "PQRST5678K", aadhaar: "2345 6789 0123", bankAcc: "50100987654321", bankIfsc: "ICIC0004321", shiftId: "gen", faceRegistered: true, status: "active", about: "Head of People. Owns compliance, hiring pipeline, and employee experience." },
    { id: empIds[2], empCode: "SWF003", password: "demo123", name: "Rahul Verma", email: "rahul@demo.swift", phone: "+91 98765 43212", department: "Sales", designation: "Sales Executive", doj: "2024-01-10", basic: 28000, pan: "LMNOP9012Q", aadhaar: "3456 7890 1234", bankAcc: "50100555512345", bankIfsc: "SBIN0001111", shiftId: "gen", faceRegistered: true, status: "active", managerId: empIds[3], about: "SMB sales — southern territory. Top performer last quarter." },
    { id: empIds[3], empCode: "SWF004", password: "demo123", name: "Meera Nair", email: "meera@demo.swift", phone: "+91 98765 43213", department: "Operations", designation: "Ops Lead", doj: "2023-11-20", basic: 38000, pan: "XYZAB3456C", aadhaar: "4567 8901 2345", bankAcc: "50100444498765", bankIfsc: "AXIS0002222", shiftId: "night", faceRegistered: true, status: "active", managerId: empIds[1], about: "Runs 24×7 ops shift. Coordinates vendor SLAs and night-shift roster." },
  ];
  const attendance: AttendanceRecord[] = [];
  const today = new Date();
  for (let d = 0; d < 20; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const iso = date.toISOString().slice(0, 10);
    const dow = date.getDay();
    if (dow === 0) continue;
    employees.forEach((e) => {
      attendance.push({
        id: crypto.randomUUID(),
        employeeId: e.id,
        date: iso,
        checkIn: "09:0" + (d % 6),
        checkOut: "18:" + (10 + (d % 30)),
        hoursWorked: 8,
        otHours: d % 5 === 0 ? 2 : 0,
        status: "present",
        withinGeofence: true,
      });
    });
  }
  const leaves: LeaveRequest[] = [
    { id: crypto.randomUUID(), employeeId: empIds[2], type: "Casual Leave", from: "2026-07-08", to: "2026-07-09", reason: "Family function", status: "pending" },
    { id: crypto.randomUUID(), employeeId: empIds[0], type: "Sick Leave", from: "2026-06-20", to: "2026-06-20", reason: "Fever", status: "approved" },
  ];
  return { employees, attendance, leaves };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      company: defaultCompany,
      employees: [],
      attendance: [],
      payrolls: [],
      leaves: [],
      currentUser: null,
      theme: "light",
      demoMode: false,
      demoSuper: false,
      demoTenants: [],
      notices: [],
      docAssets: DEFAULT_DOC_ASSETS,
      docLibrary: buildDefaultLibrary(),
      journeys: [],
      assetCategories: DEFAULT_ASSET_CATEGORIES,
      assets: [],
      assetAssignments: [],
      auditLog: [],
      registrationDrafts: [],
      addAudit: (entry) => {
        const e: AuditEntry = { ...entry, id: crypto.randomUUID(), ts: new Date().toISOString() };
        set((s) => ({ auditLog: [e, ...s.auditLog].slice(0, 2000) }));
        return e;
      },
      saveRegistrationDraft: (draft) => {
        const updated: RegistrationDraft = { ...draft, updatedAt: new Date().toISOString() };
        set((s) => {
          const idx = s.registrationDrafts.findIndex((d) => d.id === draft.id);
          const next = [...s.registrationDrafts];
          if (idx >= 0) next[idx] = updated;
          else next.unshift(updated);
          return { registrationDrafts: next.slice(0, 100) };
        });
      },
      deleteRegistrationDraft: (id) => set((s) => ({ registrationDrafts: s.registrationDrafts.filter((d) => d.id !== id) })),
      addAssetCategory: (c) => {
        const cat: AssetCategory = { ...c, id: crypto.randomUUID() };
        set((s) => ({ assetCategories: [...s.assetCategories, cat] }));
        return cat;
      },
      updateAssetCategory: (id, patch) =>
        set((s) => ({ assetCategories: s.assetCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteAssetCategory: (id) =>
        set((s) => ({ assetCategories: s.assetCategories.filter((c) => c.id !== id) })),
      addAsset: (a) => {
        const asset: Asset = { ...a, id: crypto.randomUUID(), status: a.status ?? "available" };
        set((s) => ({ assets: [...s.assets, asset] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !get().demoMode) {
          syncItem("assets", { tenantId, ...asset });
        }
        return asset;
      },
      updateAsset: (id, patch) =>
        set((s) => {
          const nextAssets = s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a));
          const item = nextAssets.find((a) => a.id === id);
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && item && !s.demoMode) {
            syncItem("assets", { tenantId, ...item });
          }
          return { assets: nextAssets };
        }),
      deleteAsset: (id) =>
        set((s) => {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !s.demoMode) {
            syncDelete("assets", tenantId, id);
            s.assetAssignments.forEach((x) => {
              if (x.assetId === id) {
                syncDelete("assetAssignments", tenantId, x.id);
              }
            });
          }
          return {
            assets: s.assets.filter((a) => a.id !== id),
            assetAssignments: s.assetAssignments.filter((x) => x.assetId !== id),
          };
        }),
      assignAsset: ({ assetId, employeeId, assignedBy, conditionOnAssign, acknowledgementSignatureDataUrl, notes }) => {
        const asset = get().assets.find((a) => a.id === assetId);
        if (!asset || asset.status === "assigned" || asset.status === "retired") return null;
        const assignment: AssetAssignment = {
          id: crypto.randomUUID(),
          assetId,
          employeeId,
          assignedAt: new Date().toISOString(),
          assignedBy,
          conditionOnAssign: conditionOnAssign ?? asset.condition,
          acknowledgementSignatureDataUrl,
          notes,
        };
        set((s) => ({
          assetAssignments: [assignment, ...s.assetAssignments],
          assets: s.assets.map((a) => (a.id === assetId ? { ...a, status: "assigned" } : a)),
        }));

        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !get().demoMode) {
          const runAssignAndSync = async () => {
            let finalSigUrl = acknowledgementSignatureDataUrl;
            if (acknowledgementSignatureDataUrl && acknowledgementSignatureDataUrl.startsWith("data:")) {
              finalSigUrl = await uploadToS3(tenantId, `asset-signatures/${assignment.id}_sig.png`, acknowledgementSignatureDataUrl);
              set((s) => ({
                assetAssignments: s.assetAssignments.map((x) => x.id === assignment.id ? { ...x, acknowledgementSignatureDataUrl: finalSigUrl } : x)
              }));
            }
            const updatedAsset = get().assets.find((a) => a.id === assetId);
            if (updatedAsset) syncItem("assets", { tenantId, ...updatedAsset });
            syncItem("assetAssignments", { tenantId, ...assignment, acknowledgementSignatureDataUrl: finalSigUrl });
          };
          runAssignAndSync();
        }
        return assignment;
      },
      returnAsset: (assignmentId, actor, conditionOnReturn, notes) =>
        set((s) => {
          const assn = s.assetAssignments.find((x) => x.id === assignmentId);
          if (!assn || assn.returnedAt) return {};
          const now = new Date().toISOString();
          const nextAssignments = s.assetAssignments.map((x) =>
            x.id === assignmentId ? { ...x, returnedAt: now, returnedBy: actor, conditionOnReturn, notes: notes ?? x.notes } : x,
          );
          const nextAssets = s.assets.map((a) =>
            a.id === assn.assetId ? { ...a, status: "available" as const, condition: conditionOnReturn ?? a.condition } : a,
          );

          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !s.demoMode) {
            const updatedAssn = nextAssignments.find((x) => x.id === assignmentId);
            const updatedAsset = nextAssets.find((a) => a.id === assn.assetId);
            if (updatedAssn) syncItem("assetAssignments", { tenantId, ...updatedAssn });
            if (updatedAsset) syncItem("assets", { tenantId, ...updatedAsset });
          }

          return {
            assetAssignments: nextAssignments,
            assets: nextAssets,
          };
        }),
      setDocAssets: (patch) => set((s) => ({ docAssets: { ...s.docAssets, ...patch } })),
      addLibraryItem: (item) => {
        const it: DocumentLibraryItem = { ...item, id: crypto.randomUUID() };
        set((s) => ({ docLibrary: [...s.docLibrary, it].sort((a, b) => a.sequence - b.sequence) }));
        return it;
      },
      updateLibraryItem: (id, patch) =>
        set((s) => ({ docLibrary: s.docLibrary.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      deleteLibraryItem: (id) => set((s) => ({ docLibrary: s.docLibrary.filter((d) => d.id !== id) })),
      reorderLibrary: (ids) =>
        set((s) => {
          const map = new Map(s.docLibrary.map((d) => [d.id, d]));
          const next = ids.map((id, i) => ({ ...(map.get(id) as DocumentLibraryItem), sequence: i + 1 })).filter(Boolean);
          return { docLibrary: next as DocumentLibraryItem[] };
        }),
      resetLibrary: () => set({ docLibrary: buildDefaultLibrary() }),
      ensureJourney: (employeeId) => {
        const existing = get().journeys.find((j) => j.employeeId === employeeId);
        if (existing) return existing;
        const j = buildEmployeeJourney(employeeId, get().docLibrary);
        set((s) => ({ journeys: [...s.journeys, j] }));
        return j;
      },
      updateJourneyStep: (employeeId, stepId, patch) =>
        set((s) => ({
          journeys: s.journeys.map((j) =>
            j.employeeId === employeeId
              ? { ...j, steps: j.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)) }
              : j
          ),
        })),
      advanceJourneyStep: (employeeId, stepId, status, actor) =>
        set((s) => ({
          journeys: s.journeys.map((j) => {
            if (j.employeeId !== employeeId) return j;
            const now = new Date().toISOString();
            const steps = j.steps.map((st) =>
              st.id === stepId
                ? {
                    ...st,
                    status,
                    generatedAt: status === "generated" ? now : st.generatedAt,
                    signedAt: status === "signed" ? now : st.signedAt,
                    approvedAt: status === "approved" ? now : st.approvedAt,
                    approvedBy: status === "approved" ? actor : st.approvedBy,
                  }
                : st
            );
            const allDone = steps.every((st) => ["approved", "signed", "skipped"].includes(st.status));
            return { ...j, steps, phase: allDone && j.phase === "onboarding" ? "probation" : j.phase };
          }),
        })),
      setJourneyPhase: (employeeId, phase) =>
        set((s) => ({
          journeys: s.journeys.map((j) =>
            j.employeeId === employeeId
              ? { ...j, phase, confirmedAt: phase === "confirmed" ? new Date().toISOString() : j.confirmedAt }
              : j
          ),
        })),
      autoGenerateAllPending: (employeeId, actor) => {
        const lib = get().docLibrary;
        const j = get().journeys.find((x) => x.employeeId === employeeId);
        if (!j) return 0;
        let count = 0;
        const now = new Date().toISOString();
        const steps = j.steps.map((st) => {
          const meta = lib.find((d) => d.id === st.docId);
          if (!meta) return st;
          if (st.status !== "pending" || !meta.autoGenerate) return st;
          count++;
          return { ...st, status: "generated" as JourneyStepStatus, generatedAt: now, approvedBy: actor };
        });
        set((s) => ({ journeys: s.journeys.map((x) => (x.employeeId === employeeId ? { ...x, steps } : x)) }));
        return count;
      },
      addNotice: (n) => {
        const notice: Notice = { ...n, id: crypto.randomUUID(), createdAt: new Date().toISOString(), readBy: [] };
        set((s) => ({ notices: [notice, ...s.notices] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !get().demoMode) {
          syncItem("notices", { tenantId, ...notice });
        }
        return notice;
      },
      updateNotice: (id, patch) =>
        set((s) => {
          const nextNotices = s.notices.map((n) => (n.id === id ? { ...n, ...patch } : n));
          const tenantId = useAuth.getState().activeTenantId;
          const item = nextNotices.find((n) => n.id === id);
          if (tenantId && item && !s.demoMode) {
            syncItem("notices", { tenantId, ...item });
          }
          return { notices: nextNotices };
        }),
      deleteNotice: (id) =>
        set((s) => {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !s.demoMode) {
            syncDelete("notices", tenantId, id);
          }
          return { notices: s.notices.filter((n) => n.id !== id) };
        }),
      markNoticeRead: (id, userKey) =>
        set((s) => {
          const nextNotices = s.notices.map((n) =>
            n.id === id && !n.readBy.includes(userKey) ? { ...n, readBy: [...n.readBy, userKey] } : n
          );
          const tenantId = useAuth.getState().activeTenantId;
          const item = nextNotices.find((n) => n.id === id);
          if (tenantId && item && !s.demoMode) {
            syncItem("notices", { tenantId, ...item });
          }
          return { notices: nextNotices };
        }),
      addBranch: (b) => {
        const branch: Branch = { ...b, id: crypto.randomUUID() };
        set((s) => {
          const nextCompany = { ...s.company, branches: [...(s.company.branches ?? []), branch] };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !s.demoMode) {
            syncItem("config", { id: "config", tenantId, ...nextCompany });
          }
          return { company: nextCompany };
        });
        const btype = String((b as { type?: string }).type ?? "branch").toLowerCase();
        emitCompliance(btype === "factory" ? "factory_created" : "branch_created", {
          subject: branch.name ?? "New branch", by: "system", meta: { branchId: branch.id, branchType: btype },
        });
        return branch;
      },
      updateBranch: (id, patch) =>
        set((s) => {
          const nextCompany = {
            ...s.company,
            branches: (s.company.branches ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b)),
          };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !s.demoMode) {
            syncItem("config", { id: "config", tenantId, ...nextCompany });
          }
          return { company: nextCompany };
        }),
      deleteBranch: (id) =>
        set((s) => {
          const nextCompany = {
            ...s.company,
            branches: (s.company.branches ?? []).filter((b) => b.id !== id),
          };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !s.demoMode) {
            syncItem("config", { id: "config", tenantId, ...nextCompany });
            s.employees.forEach((e) => {
              if (e.branchId === id) {
                syncItem("employees", { tenantId, ...e, branchId: undefined });
              }
            });
          }
          return {
            company: nextCompany,
            employees: s.employees.map((e) => (e.branchId === id ? { ...e, branchId: undefined } : e)),
          };
        }),
      loadCompanyState: async (tenantId) => {
        try {
          const res = await fetch(`${API_URL}/api/companies/initial-state?tenantId=${tenantId}`);
          if (!res.ok) throw new Error("Failed to load initial state");
          const data = await res.json();
          set({
            company: data.config ? { ...get().company, ...data.config } : get().company,
            employees: data.employees || [],
            attendance: data.attendance || [],
            leaves: data.leaves || [],
            payrolls: data.payrolls || [],
            assets: data.assets || [],
            assetAssignments: data.assignments || [],
            docLibrary: data.docLibrary && data.docLibrary.length ? data.docLibrary : get().docLibrary,
            journeys: data.journeys || [],
            notices: data.notices || [],
            demoMode: false,
          });
        } catch (err) {
          console.error("[Store] loadCompanyState failed:", err);
        }
      },
      setTheme: (t) => set({ theme: t }),
      setCompany: (c) =>
        set((s) => {
          const nextCompany = { ...s.company, ...c };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !s.demoMode) {
            // Background S3 upload if appointmentTemplate has image/logo in base64, or just sync config
            syncItem("config", { id: "config", tenantId, ...nextCompany });
          }
          return { company: nextCompany };
        }),
      addEmployee: (e) => {
        const st = get();
        const company = st.company;
        const resolved = resolveAttendanceProfile(e, company);
        const emp: Employee = {
          ...e,
          id: crypto.randomUUID(),
          shiftId: e.shiftId || resolved.shiftId,
          attendanceProfile: resolved,
        };
        set((s) => ({ employees: [...s.employees, emp] }));

        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !st.demoMode) {
          const runRegisterAndSync = async () => {
            let finalPhotoUrl = emp.photoDataUrl;
            if (emp.photoDataUrl && emp.photoDataUrl.startsWith("data:")) {
              try {
                const res = await fetch(`${API_URL}/api/companies/face-register`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tenantId, employeeId: emp.id, photoDataUrl: emp.photoDataUrl }),
                });
                if (res.ok) {
                  const data = await res.json();
                  finalPhotoUrl = data.url;
                  set((s) => ({
                    employees: s.employees.map((x) => x.id === emp.id ? { ...x, photoDataUrl: finalPhotoUrl, faceRegistered: true } : x)
                  }));
                }
              } catch (err) {
                console.error("Face registration failed:", err);
              }
            }
            syncItem("employees", { tenantId, ...emp, photoDataUrl: finalPhotoUrl, faceRegistered: !!finalPhotoUrl && finalPhotoUrl.startsWith("http") });
          };
          runRegisterAndSync();
        }

        st.addAudit({
          actorName: st.currentUser?.name ?? "System",
          entity: "employee",
          entityId: emp.id,
          action: "register",
          newValue: { empCode: emp.empCode, name: emp.name },
        });
        emitCompliance("employee_joined", {
          subject: `${emp.name} (${emp.empCode})`,
          by: st.currentUser?.name ?? "System",
          meta: { employeeId: emp.id, gender: (emp as { gender?: string }).gender, branchId: emp.branchId },
        });
        if (String((emp as { gender?: string }).gender ?? "").toLowerCase().startsWith("f")) {
          emitCompliance("women_employee_added", { subject: emp.name, by: st.currentUser?.name ?? "System", meta: { employeeId: emp.id } });
        }
        return emp;
      },
      updateEmployee: (id, patch) => {
        const st = get();
        const before = st.employees.find((e) => e.id === id);
        set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
        if (before) {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !st.demoMode) {
            const runUpdateAndSync = async () => {
              let finalPhotoUrl = patch.photoDataUrl ?? before.photoDataUrl;
              let isFaceRegistered = patch.faceRegistered ?? before.faceRegistered;

              if (patch.photoDataUrl && patch.photoDataUrl.startsWith("data:")) {
                try {
                  const res = await fetch(`${API_URL}/api/companies/face-register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tenantId, employeeId: id, photoDataUrl: patch.photoDataUrl }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    finalPhotoUrl = data.url;
                    isFaceRegistered = true;
                    set((s) => ({
                      employees: s.employees.map((x) => x.id === id ? { ...x, photoDataUrl: finalPhotoUrl, faceRegistered: true } : x)
                    }));
                  }
                } catch (err) {
                  console.error("Face registration update failed:", err);
                }
              }

              let docs = patch.documentsUploaded ?? before.documentsUploaded ?? [];
              if (patch.documentsUploaded) {
                const uploadedDocs = await Promise.all(
                  patch.documentsUploaded.map(async (doc) => {
                    if (doc.dataUrl && doc.dataUrl.startsWith("data:")) {
                      const s3Url = await uploadToS3(tenantId, `employee-documents/${id}/${doc.id}.pdf`, doc.dataUrl);
                      const { dataUrl: _, ...restDoc } = doc; void _;
                      return { ...restDoc, dataUrl: s3Url };
                    }
                    return doc;
                  })
                );
                docs = uploadedDocs;
                set((s) => ({
                  employees: s.employees.map((x) => x.id === id ? { ...x, documentsUploaded: docs } : x)
                }));
              }

              syncItem("employees", {
                tenantId,
                ...before,
                ...patch,
                photoDataUrl: finalPhotoUrl,
                faceRegistered: isFaceRegistered,
                documentsUploaded: docs
              });
            };
            runUpdateAndSync();
          }

          const changed: Record<string, { from: unknown; to: unknown }> = {};
          Object.keys(patch).forEach((k) => {
            const key = k as keyof Employee;
            if ((before as Record<string, unknown>)[k] !== (patch as Record<string, unknown>)[k]) {
              changed[k] = { from: before[key], to: (patch as Record<string, unknown>)[k] };
            }
          });
          if (Object.keys(changed).length) {
            st.addAudit({
              actorName: st.currentUser?.name ?? "System",
              entity: "employee",
              entityId: id,
              action: "update",
              oldValue: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.from])),
              newValue: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.to])),
            });
          }
          const p = patch as Record<string, unknown>;
          if ("ctc" in p || "basicSalary" in p || "grossSalary" in p) {
            emitCompliance("salary_revised", { subject: `${before.name} (${before.empCode})`, by: st.currentUser?.name ?? "System", meta: { employeeId: id } });
          }
          if ("branchId" in p && p.branchId !== before.branchId) {
            emitCompliance("employee_transferred", { subject: before.name, by: st.currentUser?.name ?? "System", meta: { employeeId: id, from: before.branchId, to: p.branchId } });
          }
          if ("status" in p && String(p.status).toLowerCase() === "confirmed") {
            emitCompliance("employee_confirmed", { subject: before.name, by: st.currentUser?.name ?? "System", meta: { employeeId: id } });
          }
        }
      },
      deleteEmployee: (id) => {
        const st = get();
        const before = st.employees.find((e) => e.id === id);
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) }));
        
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !st.demoMode) {
          syncDelete("employees", tenantId, id);
        }

        st.addAudit({
          actorName: st.currentUser?.name ?? "System",
          entity: "employee",
          entityId: id,
          action: "delete",
          oldValue: before ? { empCode: before.empCode, name: before.name } : undefined,
        });
        if (before) {
          emitCompliance("employee_exited", { subject: `${before.name} (${before.empCode})`, by: st.currentUser?.name ?? "System", meta: { employeeId: id } });
        }
      },
      upsertAttendance: (r) =>
        set((s) => {
          const idx = s.attendance.findIndex((a) => a.employeeId === r.employeeId && a.date === r.date);
          const next = [...s.attendance];
          if (idx >= 0) next[idx] = r;
          else next.push(r);
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !s.demoMode) {
            syncItem("attendance", { tenantId, ...r });
          }
          return { attendance: next };
        }),
      addPayroll: (p) => {
        set((s) => ({ payrolls: [...s.payrolls, p] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !get().demoMode) {
          syncItem("payrolls", { tenantId, ...p });
        }
      },
      addLeave: (l) => {
        const item = { ...l, id: crypto.randomUUID(), status: "pending" as const };
        set((s) => ({ leaves: [...s.leaves, item] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !get().demoMode) {
          syncItem("leaves", { tenantId, ...item });
        }
      },
      updateLeave: (id, status) =>
        set((s) => {
          const nextLeaves = s.leaves.map((l) => (l.id === id ? { ...l, status } : l));
          const tenantId = useAuth.getState().activeTenantId;
          const item = nextLeaves.find((l) => l.id === id);
          if (tenantId && item && !s.demoMode) {
            syncItem("leaves", { tenantId, ...item });
          }
          return { leaves: nextLeaves };
        }),
      login: (u) => set({ currentUser: u }),
      logout: () => set({ currentUser: null }),
      approvalMatrix: {
        offer: ["HR Manager", "Director"],
        appointment: ["HR Manager", "Director"],
        increment: ["Reporting Manager", "HR Manager", "Director"],
        promotion: ["Reporting Manager", "HR Manager", "Director"],
        transfer: ["Reporting Manager", "HR Manager"],
        warning: ["Reporting Manager", "HR Manager"],
        show_cause: ["HR Manager"],
        suspension: ["HR Manager", "Director"],
        termination: ["HR Manager", "Director"],
        relieving: ["Reporting Manager", "HR Manager"],
        experience: ["HR Manager"],
        full_final: ["HR Manager", "Finance Head"],
        salary_certificate: ["HR Manager"],
      },
      docRequests: [],
      salaryRevisions: [],
      applySalaryRevision: (draft, actor) => {
        const emp = get().employees.find((e) => e.id === draft.employeeId);
        if (!emp) return null;
        const company = get().company;
        const projected = projectRevision(company, emp, draft);
        const rev: SalaryRevision = {
          ...draft,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          createdBy: actor,
          status: "applied",
          beforeBasic: emp.basic || 0,
          afterBasic: projected.employee.basic || 0,
          addedComponent: projected.addedComponent
            ? { id: projected.addedComponent.id, name: projected.addedComponent.name, monthly: draft.amount }
            : undefined,
        };
        set((s) => ({
          employees: s.employees.map((e) => (e.id === emp.id ? { ...e, basic: projected.employee.basic } : e)),
          company: projected.addedComponent
            ? { ...s.company, earnings: [...(s.company.earnings || []), projected.addedComponent!] }
            : s.company,
          salaryRevisions: [rev, ...s.salaryRevisions],
        }));
        return rev;
      },
      rollbackSalaryRevision: (id) =>
        set((s) => {
          const rev = s.salaryRevisions.find((r) => r.id === id);
          if (!rev || rev.status !== "applied") return {};
          return {
            employees: s.employees.map((e) => (e.id === rev.employeeId ? { ...e, basic: rev.beforeBasic } : e)),
            company: rev.addedComponent
              ? { ...s.company, earnings: (s.company.earnings || []).filter((c) => c.id !== rev.addedComponent!.id) }
              : s.company,
            salaryRevisions: s.salaryRevisions.map((r) => (r.id === id ? { ...r, status: "rolled_back" } : r)),
          };
        }),
      setApprovalChain: (letterKey, approvers) =>
        set((s) => ({ approvalMatrix: { ...s.approvalMatrix, [letterKey]: approvers } })),
      createDocRequest: (r) => {
        const chain = get().approvalMatrix[r.letterKey] ?? ["HR Manager"];
        const steps: ApprovalStep[] = (chain.length ? chain : ["HR Manager"]).map((a) => ({ approver: a, status: "pending" as const }));
        const req: DocRequest = {
          ...r,
          id: crypto.randomUUID(),
          steps,
          currentStep: 0,
          status: "pending",
          requestedAt: new Date().toISOString(),
        };
        set((s) => ({ docRequests: [req, ...s.docRequests] }));
        return req;
      },
      actOnDocStep: (id, action, comment, actedBy) =>
        set((s) => ({
          docRequests: s.docRequests.map((d) => {
            if (d.id !== id || d.status !== "pending") return d;
            const steps = d.steps.slice();
            const idx = d.currentStep;
            if (idx >= steps.length) return d;
            steps[idx] = { ...steps[idx], status: action === "approve" ? "approved" : "rejected", comment, actedAt: new Date().toISOString(), actedBy };
            if (action === "reject") return { ...d, steps, status: "rejected" };
            const nextIdx = idx + 1;
            const done = nextIdx >= steps.length;
            return { ...d, steps, currentStep: done ? idx : nextIdx, status: done ? "approved" : "pending" };
          }),
        })),
      forwardDocStep: (id, toApprover, comment, actedBy) =>
        set((s) => ({
          docRequests: s.docRequests.map((d) => {
            if (d.id !== id || d.status !== "pending") return d;
            const steps = d.steps.slice();
            const idx = d.currentStep;
            if (idx >= steps.length) return d;
            const original = steps[idx];
            steps[idx] = { ...original, status: "approved", comment: `Forwarded to ${toApprover}${comment ? " · " + comment : ""}`, actedAt: new Date().toISOString(), actedBy };
            steps.splice(idx + 1, 0, { approver: toApprover, status: "pending", forwardedFrom: actedBy });
            return { ...d, steps, currentStep: idx + 1 };
          }),
        })),
      deleteDocRequest: (id) => set((s) => ({ docRequests: s.docRequests.filter((d) => d.id !== id) })),
      seedDemo: (asRole) => {
        const { employees, attendance, leaves } = buildDemoData();
        const company = get().company;
        const month = new Date().toISOString().slice(0, 7);
        const payrolls: PayrollRun[] = employees.map((e) => {
          const computed = computePayroll({
            company, employee: e, daysWorked: company.workingDaysPerMonth,
            otHours: 4, incentive: 1500, shiftDays: e.shiftId === "night" ? 10 : 0,
            loan: 0, advance: 0, bonus: 0,
          });
          return {
            id: crypto.randomUUID(), employeeId: e.id, month,
            daysWorked: company.workingDaysPerMonth, otHours: 4, incentive: 1500,
            shiftDays: e.shiftId === "night" ? 10 : 0, loan: 0, advance: 0, bonus: 0,
            computed, createdAt: new Date().toISOString(),
          };
        });
        const currentUser: User =
          asRole === "admin"
            ? { role: "admin", name: "Demo Admin" }
            : { role: "employee", employeeId: employees[0].id, name: employees[0].name };
        set({ employees, attendance, leaves, payrolls, currentUser, demoMode: true });
      },
      seedSuperDemo: () => {
        const now = new Date();
        const mkDate = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
        const demoTenants: DemoTenant[] = [
          { id: crypto.randomUUID(), name: "Acme Manufacturing", slug: "acme", legalName: "Acme Manufacturing Pvt Ltd", plan: "enterprise", status: "active", employees: 248, createdAt: mkDate(120) },
          { id: crypto.randomUUID(), name: "Nova Retail", slug: "nova", legalName: "Nova Retail India Pvt Ltd", plan: "growth", status: "active", employees: 87, createdAt: mkDate(64) },
          { id: crypto.randomUUID(), name: "Meridian Logistics", slug: "meridian", legalName: "Meridian Logistics LLP", plan: "starter", status: "trial", employees: 22, createdAt: mkDate(9) },
        ];
        set({ demoSuper: true, demoMode: true, demoTenants, currentUser: { role: "admin", name: "Super Admin (Demo)" } });
      },
      addDemoTenant: (t) =>
        set((s) => ({ demoTenants: [{ ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.demoTenants] })),
      updateDemoTenant: (id, patch) =>
        set((s) => ({ demoTenants: s.demoTenants.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteDemoTenant: (id) => set((s) => ({ demoTenants: s.demoTenants.filter((t) => t.id !== id) })),
      exitDemo: () => set({ currentUser: null, demoMode: false, demoSuper: false }),
    }),
    {
      name: "swift-hrms",
      version: 6,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          company: { ...current.company, ...(p.company ?? {}) },
          docAssets: { ...current.docAssets, ...(p.docAssets ?? {}) },
          docLibrary: p.docLibrary && p.docLibrary.length ? p.docLibrary : current.docLibrary,
          journeys: p.journeys ?? [],
          assetCategories: p.assetCategories && p.assetCategories.length ? p.assetCategories : current.assetCategories,
          assets: p.assets ?? [],
          assetAssignments: p.assetAssignments ?? [],
          auditLog: p.auditLog ?? [],
          registrationDrafts: p.registrationDrafts ?? [],
        } as State;
      },
    }
  )
);

export function resolveAttendanceProfile(
  emp: Pick<Employee, "branchId" | "department" | "designation">,
  company: Company,
): ResolvedAttendanceProfile {
  const rules = (company.attendanceDefaults ?? []).slice().sort((a, b) => b.priority - a.priority);
  const matches = (r: AttendanceProfileRule) => {
    const m = r.match || {};
    if (m.branchId && m.branchId !== emp.branchId) return false;
    if (m.department && m.department.toLowerCase() !== (emp.department || "").toLowerCase()) return false;
    if (m.designation && m.designation.toLowerCase() !== (emp.designation || "").toLowerCase()) return false;
    return true;
  };
  const specificity = (r: AttendanceProfileRule) =>
    (r.match?.branchId ? 1 : 0) + (r.match?.department ? 1 : 0) + (r.match?.designation ? 1 : 0);
  const eligible = rules.filter(matches).sort((a, b) => specificity(b) - specificity(a) || b.priority - a.priority);
  const winner = eligible[0];
  if (!winner) return {};
  return {
    ruleId: winner.id,
    ruleName: winner.name,
    shiftId: winner.shiftId,
    weeklyOff: winner.weeklyOff,
    leaveTypeIds: winner.leaveTypeIds,
    geofenceFromBranch: winner.geofenceFromBranch,
    payrollGroup: winner.payrollGroup,
    costCentre: winner.costCentre,
    holidayCalendar: winner.holidayCalendar,
  };
}


