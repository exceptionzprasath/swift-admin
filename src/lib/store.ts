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



export function getBackendUrl(): string {
  const customUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
  if (customUrl) return customUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0") {
      return "";
    }
  }
  return "http://localhost:5000";
}

export async function safeFetch(path: string, options?: RequestInit): Promise<Response | null> {
  const baseUrl = getBackendUrl();
  if (!baseUrl && typeof window !== "undefined") {
    return null;
  }
  try {
    const fullUrl = path.startsWith("http") ? path : `${baseUrl}${path}`;
    const res = await fetch(fullUrl, options);
    return res;
  } catch (_err) {
    return null;
  }
}

async function syncItem(table: string, item: any) {
  const res = await safeFetch("/api/companies/mutate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, item }),
  });
  if (res && !res.ok) {
    console.warn(`[SWIFT] Failed to sync ${table}:`, res.status, res.statusText);
  } else if (!res) {
    console.warn(`[SWIFT] Network error syncing ${table} — data saved locally only`);
  }
}

async function syncDelete(table: string, tenantId: string, id: string) {
  await safeFetch("/api/companies/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, tenantId, id }),
  });
}

async function uploadToS3(tenantId: string, path: string, fileDataUrl: string) {
  if (!fileDataUrl || !fileDataUrl.startsWith("data:")) return fileDataUrl;
  const res = await safeFetch("/api/companies/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, path, fileDataUrl }),
  });
  if (res && res.ok) {
    try {
      const data = await res.json();
      return data.url;
    } catch (_err) {}
  }
  return fileDataUrl;
}

export type LeaveType = { id: string; name: string; days: number; paid?: boolean };
export type ShiftType = {
  id: string;
  name: string;
  code?: string;
  start: string;
  end: string;
  allowancePerDay: number;
  graceTime?: "always" | "10" | "15" | "20" | "25" | "30";
  allowHalfDayLogin?: boolean;
  halfDayLoginTime?: string;
  color?: string;
  description?: string;
};

export type ShiftAssignment = {
  id: string;
  tenantId?: string;
  employeeId: string;
  employeeName?: string;
  empCode?: string;
  department?: string;
  date: string; // YYYY-MM-DD
  shiftId: string; // shift id or "off"
  shiftName?: string;
  shiftStart?: string;
  shiftEnd?: string;
  graceTime?: "always" | "10" | "15" | "20" | "25" | "30";
  allowHalfDayLogin?: boolean;
  halfDayLoginTime?: string;
  note?: string;
  assignedBy?: string;
  updatedAt?: string;
};

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
  geofenceDisabled?: boolean;
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
  basicPct?: number;
  hraEnabled?: boolean;
  hraPct: number;
  specialPct: number;
  medicalPct: number;
  conveyancePct: number;
  washingPct: number;
  otherPct: number;
  daEnabled?: boolean;
  daPct?: number;
  oaEnabled?: boolean;
  oaPct?: number;
  caEnabled?: boolean;
  caPct?: number;
  ltaEnabled?: boolean;
  ltaPct?: number;
  attendanceBonusRules?: { enabled: boolean; type: "flat" | "pct"; value: number; requireFullAttendance?: boolean };
  yearlyBonusRules?: { enabled: boolean; type: "flat" | "pct"; value: number };
  payrollLockedMonths?: Record<string, boolean>;
  ptEnabled?: boolean;
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
  /** Whether to include and credit weekly offs from Swift Roster into attendance and salary computation */
  includeWeekOff?: boolean;
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
  branchIds?: string[];
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
  signedDocs?: Record<string, {
    docCode: string;
    docTitle: string;
    signedAt: string;
    signatureText: string;
    signatureDataUrl?: string;
    acknowledged: boolean;
  }>;
  finalApproval?: {
    approvedBy?: string;
    approvedAt?: string;
    status: "pending" | "approved" | "rejected";
    comment?: string;
  };
  portalActivated?: boolean;
  portalActivatedAt?: string;
  roleId?: string;
  roleName?: string;
  fixedSalary?: number;
  pfEligible?: boolean;
  esiEligible?: boolean;
  ptEligible?: boolean;
  tdsEligible?: boolean;
  eligibleDate?: string;
  probationDate?: string;
  leaveApplyEligible?: boolean;
  geofencingEnabled?: boolean;
  graceTime?: "always" | "10" | "15" | "20" | "25" | "30";
  allowHalfDayLogin?: boolean;
  halfDayLoginTime?: string;
};

export type GraceTimeOption = "always" | "10" | "15" | "20" | "25" | "30";

export type DocumentPermissionTypes = {
  offerLetter: boolean;
  appointmentLetter: boolean;
  incrementLetter: boolean;
  promotionLetter: boolean;
  relievingLetter: boolean;
  experienceLetter: boolean;
  salaryCertificate: boolean;
  warningLetter: boolean;
  showCauseNotice: boolean;
};

export type RolePermissions = {
  leaveApproval: boolean;
  attendanceApproval: boolean;
  payrollDashboard: boolean;
  employeeManagement: boolean;
  expenseHandloanApproval: boolean;
  documentsApproval: boolean;
  documentTypes: DocumentPermissionTypes;
  invoiceApproval: boolean;
  resignationApproval: boolean;
  assetManagement: boolean;
  noticesAnnouncements: boolean;
  performanceReviews: boolean;
  auditLogView: boolean;
};

export type PredefinedRole = {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystemDefault?: boolean;
  createdAt: string;
};

export function canRoleApproveDocument(
  role: PredefinedRole | null | undefined,
  letterKey: string
): boolean {
  if (!role || !role.permissions) return false;
  if (!role.permissions.documentsApproval) return false;

  const docTypes = role.permissions.documentTypes;
  if (!docTypes) return true;

  const key = (letterKey || "").toLowerCase().replace(/[^a-z]/g, "");
  if (key.includes("offer")) return !!docTypes.offerLetter;
  if (key.includes("appoint")) return !!docTypes.appointmentLetter;
  if (key.includes("increment")) return !!docTypes.incrementLetter;
  if (key.includes("promot")) return !!docTypes.promotionLetter;
  if (key.includes("reliev")) return !!docTypes.relievingLetter;
  if (key.includes("experien")) return !!docTypes.experienceLetter;
  if (key.includes("salary") || key.includes("certif")) return !!docTypes.salaryCertificate;
  if (key.includes("warn")) return !!docTypes.warningLetter;
  if (key.includes("show") || key.includes("cause")) return !!docTypes.showCauseNotice;

  return true;
}

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
  tenantId?: string;
  employeeId: string;
  employeeName?: string;
  empCode?: string;
  department?: string;
  date: string; // YYYY-MM-DD
  checkIn?: string;
  checkOut?: string;
  clockIn?: string;
  clockOut?: string;
  hoursWorked?: number;
  otHours?: number;
  otPay?: number;
  lat?: number;
  lng?: number;
  withinGeofence?: boolean;
  geofenceVerified?: boolean;
  faceVerified?: boolean;
  similarity?: number;
  photoDataUrl?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  branchId?: string;
  branchName?: string;
  shiftId?: string;
  shiftName?: string;
  shiftStart?: string;
  shiftEnd?: string;
  graceTime?: string;
  punctuality?: "on-time" | "within-grace" | "late" | "half-day" | "absent" | "flexible";
  isAfternoonHalfDay?: boolean;
  status: "present" | "absent" | "leave" | "half-day" | "late" | "holiday" | "weekly-off";
  note?: string;
  regularized?: boolean;
  regularizedBy?: string;
  regularizedReason?: string;
  updatedAt?: string;
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
  tenantId?: string;
  employeeId: string;
  employeeName?: string;
  type: string;
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  days?: number | string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "Pending" | "Approved" | "Rejected";
  appliedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  actedBy?: string;
  approverComment?: string;
};

export type HolidayType = "National Holiday" | "Public Holiday" | "Festival Holiday" | "Optional Holiday" | "Company Off";

export type CompanyHoliday = {
  id: string;
  tenantId?: string;
  name: string;
  date: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  type: HolidayType;
  branchIds?: string[];
  description?: string;
  isMandatory?: boolean;
  createdAt?: string;
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
  tenantId?: string;
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
  employeeAccepted?: boolean;
  employeeAcceptedAt?: string;
  employeeSignature?: string;
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
  roles: PredefinedRole[];
  addRole: (r: Omit<PredefinedRole, "id" | "createdAt">) => PredefinedRole;
  updateRole: (id: string, patch: Partial<PredefinedRole>) => void;
  deleteRole: (id: string) => void;
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
  saveAllCompanySettings: () => Promise<void>;
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
  resetTenantState: () => void;
  setTheme: (t: "light" | "dark") => void;
  setCompany: (c: Partial<Company>) => void;
  addEmployee: (e: Omit<Employee, "id">) => Employee;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  upsertAttendance: (r: AttendanceRecord) => void;
  addPayroll: (p: PayrollRun) => void;
  lockPayrollMonth: (month: string, locked: boolean) => void;
  addLeave: (l: Omit<LeaveRequest, "id" | "status"> & { id?: string; status?: LeaveRequest["status"] }) => LeaveRequest;
  updateLeave: (id: string, status: LeaveRequest["status"], note?: string) => void;
  deleteLeave: (id: string) => void;
  bulkAddLeaves: (newLeaves: Array<Omit<LeaveRequest, "id"> & { id?: string }>) => Promise<number>;
  holidays: CompanyHoliday[];
  addHoliday: (h: Omit<CompanyHoliday, "id"> & { id?: string }) => CompanyHoliday;
  updateHoliday: (id: string, patch: Partial<CompanyHoliday>) => void;
  deleteHoliday: (id: string) => void;
  bulkAddHolidays: (items: Array<Omit<CompanyHoliday, "id"> & { id?: string }>) => Promise<number>;
  addShift: (s: Omit<ShiftType, "id"> & { id?: string }) => ShiftType;
  updateShift: (id: string, patch: Partial<ShiftType>) => void;
  deleteShift: (id: string) => void;
  roster: ShiftAssignment[];
  assignRoster: (r: Omit<ShiftAssignment, "id"> & { id?: string }) => ShiftAssignment;
  bulkAssignRoster: (items: Array<Omit<ShiftAssignment, "id"> & { id?: string }>) => Promise<number>;
  deleteRosterAssignment: (id: string) => void;
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
  // Vault Documents & Folder System
  vaultFolders: VaultFolder[];
  vaultFiles: VaultFile[];
  addVaultFolder: (f: Omit<VaultFolder, "id" | "createdAt">) => VaultFolder;
  updateVaultFolder: (id: string, patch: Partial<VaultFolder>) => void;
  deleteVaultFolder: (id: string) => void;
  addVaultFile: (f: Omit<VaultFile, "id" | "uploadedAt">) => VaultFile;
  updateVaultFile: (id: string, patch: Partial<VaultFile>) => void;
  deleteVaultFile: (id: string) => void;
  moveVaultFile: (fileId: string, targetFolderId: string | null) => void;
};

export interface VaultFolder {
  id: string;
  name: string;
  parentId?: string | null;
  color?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VaultFile {
  id: string;
  name: string;
  folderId?: string | null;
  fileType: string;
  fileSize: number;
  fileSizeFormatted: string;
  dataUrl?: string;
  category: "Legal" | "Tax & GST" | "Finance & Banking" | "Incorporation" | "Agreements & Contracts" | "HR Policies" | "Certificates & Licenses" | "Audit & Board" | "Other";
  confidentiality: "Public" | "Internal" | "Restricted" | "Strictly Confidential";
  tags?: string[];
  notes?: string;
  uploadedBy: string;
  uploadedAt: string;
  expiryDate?: string;
}

export const DEFAULT_VAULT_FOLDERS: VaultFolder[] = [
  {
    id: "folder-incorporation",
    name: "01. Company Incorporation & MoA",
    color: "#4f46e5",
    description: "Certificate of Incorporation, MoA, AoA, PAN, TAN & DIN filings",
    createdAt: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "folder-gst-tax",
    name: "02. GST & Tax Registrations",
    color: "#0284c7",
    description: "GST Certificates, Annual Returns, TDS & Form 16 master documents",
    createdAt: "2026-01-12T11:30:00.000Z",
  },
  {
    id: "folder-contracts",
    name: "03. Vendor & Client Contracts",
    color: "#059669",
    description: "Master Service Agreements, NDAs, Vendor SLAs & Client Contracts",
    createdAt: "2026-01-15T09:15:00.000Z",
  },
  {
    id: "folder-policies",
    name: "04. Corporate Policies & Handbooks",
    color: "#d97706",
    description: "Code of Conduct, POSH Policy, Information Security & Leave Handbook",
    createdAt: "2026-01-20T14:00:00.000Z",
  },
  {
    id: "folder-licenses",
    name: "05. Certificates & IP Trademark",
    color: "#7c3aed",
    description: "ISO 27001 Certification, Trademark Registrations & Brand Assets",
    createdAt: "2026-01-22T16:45:00.000Z",
  },
  {
    id: "folder-audits",
    name: "06. Board Resolutions & Audit Reports",
    color: "#dc2626",
    description: "Audited Balance Sheets, Annual Financial Filings & Board Minutes",
    createdAt: "2026-02-01T12:00:00.000Z",
  },
];

export const DEFAULT_VAULT_FILES: VaultFile[] = [];

export const defaultCompanyHolidaysList: CompanyHoliday[] = [
  { id: "hol-1", name: "Republic Day", date: "2026-01-26", type: "National Holiday", branchIds: ["all"], isMandatory: true, description: "National Republic Day Celebration" },
  { id: "hol-2", name: "Holi", date: "2026-03-25", type: "Festival Holiday", branchIds: ["all"], isMandatory: true, description: "Festival of Colors" },
  { id: "hol-3", name: "Good Friday", date: "2026-04-10", type: "Public Holiday", branchIds: ["all"], isMandatory: true, description: "Christian Public Holiday" },
  { id: "hol-4", name: "Tamil New Year / Ambedkar Jayanti", date: "2026-04-14", type: "Public Holiday", branchIds: ["all"], isMandatory: true, description: "State & National Holiday" },
  { id: "hol-5", name: "Labor Day / May Day", date: "2026-05-01", type: "Public Holiday", branchIds: ["all"], isMandatory: true, description: "International Workers' Day" },
  { id: "hol-6", name: "Bakrid / Eid al-Adha", date: "2026-06-17", type: "Festival Holiday", branchIds: ["all"], isMandatory: true, description: "Islamic Festival of Sacrifice" },
  { id: "hol-7", name: "Independence Day", date: "2026-08-15", type: "National Holiday", branchIds: ["all"], isMandatory: true, description: "National Independence Day celebration" },
  { id: "hol-8", name: "Ganesh Chaturthi", date: "2026-09-04", type: "Festival Holiday", branchIds: ["all"], isMandatory: true, description: "Vinayaka Chaturthi Festival" },
  { id: "hol-9", name: "Gandhi Jayanti", date: "2026-10-02", type: "National Holiday", branchIds: ["all"], isMandatory: true, description: "Mahatma Gandhi's Birthday" },
  { id: "hol-10", name: "Ayudha Pooja / Vijaya Dashami", date: "2026-10-20", type: "Festival Holiday", branchIds: ["all"], isMandatory: true, description: "Dussehra Celebrations" },
  { id: "hol-11", name: "Diwali (Deepavali)", date: "2026-11-01", type: "Festival Holiday", branchIds: ["all"], isMandatory: true, description: "Festival of Lights" },
  { id: "hol-12", name: "Christmas Day", date: "2026-12-25", type: "Festival Holiday", branchIds: ["all"], isMandatory: true, description: "Christmas Day Celebration" },
  { id: "hol-13", name: "New Year's Day", date: "2027-01-01", type: "Optional Holiday", branchIds: ["all"], isMandatory: false, description: "New Year Day (Floating / Optional Holiday)" },
  { id: "hol-14", name: "Pongal / Makar Sankranti", date: "2027-01-14", type: "Festival Holiday", branchIds: ["all"], isMandatory: true, description: "Traditional Harvest Festival" },
];

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
  geofence: { lat: 11.30564, lng: 77.70347, radiusM: 50 },
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
    { id: "br-hq", name: "Head Office", code: "HQ", address: "123 Business Ave", city: "Erode", state: "Tamil Nadu", isHead: true, lat: 11.30564, lng: 77.70347, radiusMeters: 50, shiftStart: "09:00", shiftEnd: "18:00", weeklyOff: ["Sun"] },
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

export const DEFAULT_PREDEFINED_ROLES: PredefinedRole[] = [
  {
    id: "role-hr-manager",
    name: "HR Manager",
    description: "Full access to employee management, leaves, attendance, documents, and onboarding.",
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    permissions: {
      leaveApproval: true,
      attendanceApproval: true,
      payrollDashboard: true,
      employeeManagement: true,
      expenseHandloanApproval: true,
      documentsApproval: true,
      documentTypes: {
        offerLetter: true,
        appointmentLetter: true,
        incrementLetter: true,
        promotionLetter: true,
        relievingLetter: true,
        experienceLetter: true,
        salaryCertificate: true,
        warningLetter: true,
        showCauseNotice: true,
      },
      invoiceApproval: true,
      resignationApproval: true,
      assetManagement: true,
      noticesAnnouncements: true,
      performanceReviews: true,
      auditLogView: true,
    },
  },
  {
    id: "role-team-lead",
    name: "Team Lead / Reporting Manager",
    description: "Leave approval, attendance verification, performance reviews, and document approvals.",
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    permissions: {
      leaveApproval: true,
      attendanceApproval: true,
      payrollDashboard: false,
      employeeManagement: false,
      expenseHandloanApproval: true,
      documentsApproval: true,
      documentTypes: {
        offerLetter: false,
        appointmentLetter: false,
        incrementLetter: true,
        promotionLetter: true,
        relievingLetter: true,
        experienceLetter: true,
        salaryCertificate: false,
        warningLetter: true,
        showCauseNotice: false,
      },
      invoiceApproval: false,
      resignationApproval: true,
      assetManagement: false,
      noticesAnnouncements: true,
      performanceReviews: true,
      auditLogView: false,
    },
  },
  {
    id: "role-finance-manager",
    name: "Finance / Payroll Manager",
    description: "Payroll dashboard access, expense & handloan approvals, and invoice approvals.",
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    permissions: {
      leaveApproval: false,
      attendanceApproval: false,
      payrollDashboard: true,
      employeeManagement: false,
      expenseHandloanApproval: true,
      documentsApproval: true,
      documentTypes: {
        offerLetter: false,
        appointmentLetter: false,
        incrementLetter: true,
        promotionLetter: false,
        relievingLetter: false,
        experienceLetter: false,
        salaryCertificate: true,
        warningLetter: false,
        showCauseNotice: false,
      },
      invoiceApproval: true,
      resignationApproval: false,
      assetManagement: false,
      noticesAnnouncements: false,
      performanceReviews: false,
      auditLogView: true,
    },
  },
  {
    id: "role-general-employee",
    name: "General Employee",
    description: "Standard self-service employee access.",
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    permissions: {
      leaveApproval: false,
      attendanceApproval: false,
      payrollDashboard: false,
      employeeManagement: false,
      expenseHandloanApproval: false,
      documentsApproval: false,
      documentTypes: {
        offerLetter: false,
        appointmentLetter: false,
        incrementLetter: false,
        promotionLetter: false,
        relievingLetter: false,
        experienceLetter: false,
        salaryCertificate: false,
        warningLetter: false,
        showCauseNotice: false,
      },
      invoiceApproval: false,
      resignationApproval: false,
      assetManagement: false,
      noticesAnnouncements: false,
      performanceReviews: false,
      auditLogView: false,
    },
  },
];

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
      roles: DEFAULT_PREDEFINED_ROLES,
      vaultFolders: DEFAULT_VAULT_FOLDERS,
      vaultFiles: DEFAULT_VAULT_FILES,
      addVaultFolder: (f) => {
        const folder: VaultFolder = {
          ...f,
          id: "vfld-" + crypto.randomUUID().slice(0, 8),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ vaultFolders: [...(s.vaultFolders || []), folder] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !tenantId.startsWith("demo-tenant-")) {
          syncItem("vault_folders", { tenantId, ...folder });
        }
        return folder;
      },
      updateVaultFolder: (id, patch) =>
        set((s) => {
          const next = (s.vaultFolders || []).map((f) => (f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f));
          const tenantId = useAuth.getState().activeTenantId;
          const item = next.find((f) => f.id === id);
          if (tenantId && item && !tenantId.startsWith("demo-tenant-")) {
            syncItem("vault_folders", { tenantId, ...item });
          }
          return { vaultFolders: next };
        }),
      deleteVaultFolder: (id) =>
        set((s) => {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncDelete("vault_folders", tenantId, id);
          }
          return {
            vaultFolders: (s.vaultFolders || []).filter((f) => f.id !== id),
            vaultFiles: (s.vaultFiles || []).filter((file) => file.folderId !== id),
          };
        }),
      addVaultFile: (f) => {
        const file: VaultFile = {
          ...f,
          id: "vfil-" + crypto.randomUUID().slice(0, 8),
          uploadedAt: new Date().toISOString(),
        };
        set((s) => ({ vaultFiles: [file, ...(s.vaultFiles || [])] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !tenantId.startsWith("demo-tenant-")) {
          syncItem("vault_files", { tenantId, ...file });
        }
        return file;
      },
      updateVaultFile: (id, patch) =>
        set((s) => {
          const next = (s.vaultFiles || []).map((f) => (f.id === id ? { ...f, ...patch } : f));
          const tenantId = useAuth.getState().activeTenantId;
          const item = next.find((f) => f.id === id);
          if (tenantId && item && !tenantId.startsWith("demo-tenant-")) {
            syncItem("vault_files", { tenantId, ...item });
          }
          return { vaultFiles: next };
        }),
      deleteVaultFile: (id) =>
        set((s) => {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncDelete("vault_files", tenantId, id);
          }
          return { vaultFiles: (s.vaultFiles || []).filter((f) => f.id !== id) };
        }),
      moveVaultFile: (fileId, targetFolderId) =>
        set((s) => {
          const next = (s.vaultFiles || []).map((f) => (f.id === fileId ? { ...f, folderId: targetFolderId } : f));
          const tenantId = useAuth.getState().activeTenantId;
          const item = next.find((f) => f.id === fileId);
          if (tenantId && item && !tenantId.startsWith("demo-tenant-")) {
            syncItem("vault_files", { tenantId, ...item });
          }
          return { vaultFiles: next };
        }),
      addRole: (r) => {
        const role: PredefinedRole = {
          ...r,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ roles: [role, ...s.roles] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !tenantId.startsWith("demo-tenant-")) {
          syncItem("roles", { tenantId, ...role });
        }
        return role;
      },
      updateRole: (id, patch) =>
        set((s) => {
          const nextRoles = s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r));
          const updated = nextRoles.find((r) => r.id === id);
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && updated && !tenantId.startsWith("demo-tenant-")) {
            syncItem("roles", { tenantId, ...updated });
          }
          return { roles: nextRoles };
        }),
      deleteRole: (id) =>
        set((s) => {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncDelete("roles", tenantId, id);
          }
          return { roles: s.roles.filter((r) => r.id !== id) };
        }),
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
        if (tenantId && !tenantId.startsWith("demo-tenant-")) {
          syncItem("assets", { tenantId, ...asset });
        }
        return asset;
      },
      updateAsset: (id, patch) =>
        set((s) => {
          const nextAssets = s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a));
          const item = nextAssets.find((a) => a.id === id);
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && item && !tenantId.startsWith("demo-tenant-")) {
            syncItem("assets", { tenantId, ...item });
          }
          return { assets: nextAssets };
        }),
      deleteAsset: (id) =>
        set((s) => {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
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
        if (tenantId && !tenantId.startsWith("demo-tenant-")) {
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
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
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
      setDocAssets: (patch) =>
        set((s) => {
          const nextDocAssets = { ...s.docAssets, ...patch };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            const runUploadAndSync = async () => {
              const updatedPatch: Partial<CompanyDocumentAssets> = {};
              for (const k of Object.keys(patch) as (keyof CompanyDocumentAssets)[]) {
                const val = patch[k];
                if (typeof val === "string" && val.startsWith("data:")) {
                  const s3Url = await uploadToS3(tenantId, `doc-assets/${k}.png`, val);
                  updatedPatch[k] = s3Url as any;
                }
              }
              const finalDocAssets = { ...nextDocAssets, ...updatedPatch };
              if (Object.keys(updatedPatch).length) {
                set((st) => ({ docAssets: { ...st.docAssets, ...updatedPatch } }));
              }
              syncItem("docAssets", { id: "doc_assets", tenantId, ...finalDocAssets });
            };
            runUploadAndSync();
          }
          return { docAssets: nextDocAssets };
        }),
      saveAllCompanySettings: async () => {
        const st = get();
        const tenantId = useAuth.getState().activeTenantId;
        if (!tenantId || tenantId.startsWith("demo-tenant-")) return;

        const docAssets = st.docAssets;
        const uploadedDocAssets: Partial<CompanyDocumentAssets> = {};
        for (const k of Object.keys(docAssets) as (keyof CompanyDocumentAssets)[]) {
          const val = docAssets[k];
          if (typeof val === "string" && val.startsWith("data:")) {
            const s3Url = await uploadToS3(tenantId, `doc-assets/${k}.png`, val);
            uploadedDocAssets[k] = s3Url as any;
          }
        }
        const finalDocAssets = { ...docAssets, ...uploadedDocAssets };
        if (Object.keys(uploadedDocAssets).length) {
          set({ docAssets: finalDocAssets });
        }

        syncItem("config", { id: "config", tenantId, ...st.company });
        syncItem("docAssets", { id: "doc_assets", tenantId, ...finalDocAssets });
      },
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
        if (tenantId && !tenantId.startsWith("demo-tenant-")) {
          syncItem("notices", { tenantId, ...notice });
        }
        return notice;
      },
      updateNotice: (id, patch) =>
        set((s) => {
          const nextNotices = s.notices.map((n) => (n.id === id ? { ...n, ...patch } : n));
          const tenantId = useAuth.getState().activeTenantId;
          const item = nextNotices.find((n) => n.id === id);
          if (tenantId && item && !tenantId.startsWith("demo-tenant-")) {
            syncItem("notices", { tenantId, ...item });
          }
          return { notices: nextNotices };
        }),
      deleteNotice: (id) =>
        set((s) => {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncDelete("notices", tenantId, id);
          }
          return { notices: s.notices.filter((n) => n.id !== id) };
        }),
      markNoticeRead: (id, userKey) =>
        set((s) => {
          const nextNotices = s.notices.map((n) => {
            if (n.id !== id) return n;
            const readBy = Array.isArray(n.readBy) ? n.readBy : [];
            return !readBy.includes(userKey) ? { ...n, readBy: [...readBy, userKey] } : n;
          });
          const tenantId = useAuth.getState().activeTenantId;
          const item = nextNotices.find((n) => n.id === id);
          if (tenantId && item && !tenantId.startsWith("demo-tenant-")) {
            syncItem("notices", { tenantId, ...item });
          }
          return { notices: nextNotices };
        }),
      addBranch: (b) => {
        const branch: Branch = { ...b, id: crypto.randomUUID() };
        set((s) => {
          const updatedBranches = [...(s.company.branches ?? []), branch];
          const headBranch = updatedBranches.find((x) => x.isHead) || updatedBranches[0];
          const nextGeofence = (headBranch && headBranch.lat != null && headBranch.lng != null)
            ? { lat: headBranch.lat, lng: headBranch.lng, radiusM: headBranch.radiusMeters ?? 150 }
            : s.company.geofence;
          const nextCompany = {
            ...s.company,
            geofence: nextGeofence,
            branches: updatedBranches,
          };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
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
          const updatedBranches = (s.company.branches ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b));
          const headBranch = updatedBranches.find((x) => x.isHead) || updatedBranches[0];
          const nextGeofence = (headBranch && headBranch.lat != null && headBranch.lng != null)
            ? { lat: headBranch.lat, lng: headBranch.lng, radiusM: headBranch.radiusMeters ?? 150 }
            : s.company.geofence;
          const nextCompany = {
            ...s.company,
            geofence: nextGeofence,
            branches: updatedBranches,
          };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
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
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncItem("config", { id: "config", tenantId, ...nextCompany });
            s.employees.forEach((e) => {
              if (e.branchId === id || e.branchIds?.includes(id)) {
                const nextBranchIds = e.branchIds ? e.branchIds.filter((bid) => bid !== id) : undefined;
                const nextBranchId = e.branchId === id ? (nextBranchIds && nextBranchIds.length > 0 ? nextBranchIds[0] : undefined) : e.branchId;
                syncItem("employees", { tenantId, ...e, branchId: nextBranchId, branchIds: nextBranchIds });
              }
            });
          }
          return {
            company: nextCompany,
            employees: s.employees.map((e) => {
              if (e.branchId === id || e.branchIds?.includes(id)) {
                const nextBranchIds = e.branchIds ? e.branchIds.filter((bid) => bid !== id) : undefined;
                const nextBranchId = e.branchId === id ? (nextBranchIds && nextBranchIds.length > 0 ? nextBranchIds[0] : undefined) : e.branchId;
                return { ...e, branchId: nextBranchId, branchIds: nextBranchIds };
              }
              return e;
            }),
          };
        }),
      loadCompanyState: async (tenantId) => {
        const res = await safeFetch(`/api/companies/initial-state?tenantId=${tenantId}`);
        if (res && res.ok) {
          try {
            const data = await res.json();
            let nextCompany = get().company;
            if (data.config) {
              // Strip DynamoDB key fields that aren't part of the Company type
              const { id: _id, tenantId: _tid, ...backendConfig } = data.config;
              nextCompany = { ...get().company, ...backendConfig };
              // Re-derive geofence from the head branch to ensure geo-coordinates
              // stay consistent (mirrors admin-side updateBranch logic)
              const headBranch = (nextCompany.branches ?? []).find((b: any) => b.isHead)
                || (nextCompany.branches ?? [])[0];
              if (headBranch && headBranch.lat != null && headBranch.lng != null) {
                nextCompany = {
                  ...nextCompany,
                  geofence: {
                    lat: headBranch.lat,
                    lng: headBranch.lng,
                    radiusM: headBranch.radiusMeters ?? nextCompany.geofence?.radiusM ?? 150,
                  },
                };
              }
            }
            set({
              company: nextCompany,
              docAssets: data.docAssets || get().docAssets,
              employees: data.employees || [],
              attendance: data.attendance || [],
              leaves: data.leaves || [],
              payrolls: data.payrolls || [],
              assets: data.assets || [],
              assetAssignments: data.assignments || [],
              docLibrary: data.docLibrary || [],
              journeys: data.journeys || [],
              notices: (data.notices || []).map((n: any) => ({
                ...n,
                readBy: Array.isArray(n.readBy) ? n.readBy : [],
                audience: n.audience ? { ...n.audience, values: Array.isArray(n.audience.values) ? n.audience.values : [] } : { scope: "company", values: [] },
              })),
              roles: data.roles && data.roles.length ? data.roles : get().roles,
              docRequests: data.docRequests || [],
              holidays: data.holidays && data.holidays.length ? data.holidays : (get().holidays?.length ? get().holidays : defaultCompanyHolidaysList),
              roster: data.roster || [],
              vaultFolders: data.vaultFolders && data.vaultFolders.length ? data.vaultFolders : (get().vaultFolders?.length ? get().vaultFolders : DEFAULT_VAULT_FOLDERS),
              vaultFiles: data.vaultFiles && data.vaultFiles.length ? data.vaultFiles : (get().vaultFiles?.length ? get().vaultFiles : DEFAULT_VAULT_FILES),
              demoMode: false,
            });
          } catch (_err) {}
        }
      },
      resetTenantState: () => {
        set({
          employees: [],
          attendance: [],
          leaves: [],
          payrolls: [],
          assets: [],
          assetAssignments: [],
          docRequests: [],
          vaultFolders: DEFAULT_VAULT_FOLDERS,
          vaultFiles: DEFAULT_VAULT_FILES,
          salaryRevisions: [],
          auditLog: [],
          roles: DEFAULT_PREDEFINED_ROLES,
          currentUser: null,
          demoMode: false,
        });
      },
      setTheme: (t) => set({ theme: t }),
      setCompany: (c) =>
        set((s) => {
          const nextCompany = { ...s.company, ...c };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            // Background S3 upload if appointmentTemplate has image/logo in base64, or just sync config
            syncItem("config", { id: "config", tenantId, ...nextCompany });
          }
          return { company: nextCompany };
        }),
      addEmployee: (e) => {
        const st = get();
        const company = st.company;
        const normalizedBranchIds = Array.isArray(e.branchIds) && e.branchIds.length > 0
          ? e.branchIds
          : (e.branchId ? [e.branchId] : []);
        const primaryBranchId = e.branchId || normalizedBranchIds[0] || undefined;
        const resolved = resolveAttendanceProfile({ ...e, branchId: primaryBranchId, branchIds: normalizedBranchIds }, company);
        const emp: Employee = {
          ...e,
          id: crypto.randomUUID(),
          branchId: primaryBranchId,
          branchIds: normalizedBranchIds.length > 0 ? normalizedBranchIds : undefined,
          shiftId: e.shiftId || resolved.shiftId,
          attendanceProfile: resolved,
        };
        set((s) => ({ employees: [...s.employees, emp] }));

        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !tenantId.startsWith("demo-tenant-")) {
          const runRegisterAndSync = async () => {
            let finalPhotoUrl = emp.photoDataUrl;
            if (emp.photoDataUrl && emp.photoDataUrl.startsWith("data:")) {
              try {
                const res = await fetch(`${getBackendUrl()}/api/companies/face-register`, {
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
          meta: { employeeId: emp.id, gender: (emp as { gender?: string }).gender, branchId: emp.branchId, branchIds: emp.branchIds },
        });
        if (String((emp as { gender?: string }).gender ?? "").toLowerCase().startsWith("f")) {
          emitCompliance("women_employee_added", { subject: emp.name, by: st.currentUser?.name ?? "System", meta: { employeeId: emp.id } });
        }
        return emp;
      },
      updateEmployee: (id, patch) => {
        const st = get();
        const before = st.employees.find((e) => e.id === id);

        // Normalize patch branchIds / branchId if present
        let normalizedPatch: Partial<Employee> = { ...patch };
        if ("branchIds" in patch && patch.branchIds !== undefined) {
          const bIds = Array.isArray(patch.branchIds) ? patch.branchIds : [];
          normalizedPatch.branchIds = bIds;
          if (!("branchId" in patch)) {
            normalizedPatch.branchId = bIds[0] || undefined;
          }
        } else if ("branchId" in patch && patch.branchId !== undefined) {
          const bId = patch.branchId;
          if (bId && !before?.branchIds?.includes(bId)) {
            normalizedPatch.branchIds = [bId];
          }
        }

        set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...normalizedPatch } : e)) }));
        if (before) {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            const runUpdateAndSync = async () => {
              let finalPhotoUrl = normalizedPatch.photoDataUrl ?? before.photoDataUrl;
              let isFaceRegistered = normalizedPatch.faceRegistered ?? before.faceRegistered;

              if (normalizedPatch.photoDataUrl && normalizedPatch.photoDataUrl.startsWith("data:")) {
                try {
                  const res = await fetch(`${getBackendUrl()}/api/companies/face-register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tenantId, employeeId: id, photoDataUrl: normalizedPatch.photoDataUrl }),
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

              let docs = normalizedPatch.documentsUploaded ?? before.documentsUploaded ?? [];
              if (normalizedPatch.documentsUploaded) {
                const uploadedDocs = await Promise.all(
                  normalizedPatch.documentsUploaded.map(async (doc) => {
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
                ...normalizedPatch,
                photoDataUrl: finalPhotoUrl,
                faceRegistered: isFaceRegistered,
                documentsUploaded: docs
              });
            };
            runUpdateAndSync();
          }

          const changed: Record<string, { from: unknown; to: unknown }> = {};
          Object.keys(normalizedPatch).forEach((k) => {
            const key = k as keyof Employee;
            if ((before as Record<string, unknown>)[k] !== (normalizedPatch as Record<string, unknown>)[k]) {
              changed[k] = { from: before[key], to: (normalizedPatch as Record<string, unknown>)[k] };
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
          const p = normalizedPatch as Record<string, unknown>;
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
      lockPayrollMonth: (month, locked) => {
        set((s) => {
          const lockedMonths = { ...(s.company.payrollLockedMonths || {}), [month]: locked };
          const nextComp = { ...s.company, payrollLockedMonths: lockedMonths };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !get().demoMode) {
            syncItem("config", { tenantId, id: "config", ...nextComp });
          }
          return { company: nextComp };
        });
      },
      addLeave: (l) => {
        const item: LeaveRequest = {
          ...l,
          id: l.id || crypto.randomUUID(),
          status: l.status || "pending",
          appliedAt: l.appliedAt || new Date().toISOString(),
        };
        set((s) => ({ leaves: [item, ...s.leaves] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !get().demoMode) {
          syncItem("leaves", { tenantId, ...item });
        }
        return item;
      },
      updateLeave: (id, status, note) =>
        set((s) => {
          const nextLeaves = s.leaves.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status,
                  approvedBy: status === "approved" ? s.currentUser?.name ?? "Admin" : l.approvedBy,
                  rejectedReason: status === "rejected" ? note : l.rejectedReason,
                }
              : l
          );
          const tenantId = useAuth.getState().activeTenantId;
          const item = nextLeaves.find((l) => l.id === id);
          if (tenantId && item && !s.demoMode) {
            syncItem("leaves", { tenantId, ...item });
          }
          return { leaves: nextLeaves };
        }),
      deleteLeave: (id) => {
        const tenantId = useAuth.getState().activeTenantId;
        set((s) => ({ leaves: s.leaves.filter((l) => l.id !== id) }));
        if (tenantId && !get().demoMode) {
          syncDelete("leaves", tenantId, id);
        }
      },
      bulkAddLeaves: async (newLeaves) => {
        const tenantId = useAuth.getState().activeTenantId;
        const formatted: LeaveRequest[] = newLeaves.map((l) => ({
          ...l,
          id: l.id || crypto.randomUUID(),
          status: l.status || "approved",
          appliedAt: l.appliedAt || new Date().toISOString(),
        }));

        set((s) => ({ leaves: [...formatted, ...s.leaves] }));

        if (tenantId && !get().demoMode) {
          await Promise.all(
            formatted.map((item) => syncItem("leaves", { tenantId, ...item }))
          );
        }
        return formatted.length;
      },
      holidays: defaultCompanyHolidaysList,
      addHoliday: (h) => {
        const item: CompanyHoliday = {
          ...h,
          id: h.id || crypto.randomUUID(),
          createdAt: h.createdAt || new Date().toISOString(),
        };
        set((s) => ({ holidays: [item, ...s.holidays] }));
        const tenantId = useAuth.getState().activeTenantId;
        if (tenantId && !get().demoMode) {
          syncItem("holidays", { tenantId, ...item });
        }
        return item;
      },
      updateHoliday: (id, patch) =>
        set((s) => {
          const nextHolidays = s.holidays.map((h) => (h.id === id ? { ...h, ...patch } : h));
          const tenantId = useAuth.getState().activeTenantId;
          const item = nextHolidays.find((h) => h.id === id);
          if (tenantId && item && !s.demoMode) {
            syncItem("holidays", { tenantId, ...item });
          }
          return { holidays: nextHolidays };
        }),
      deleteHoliday: (id) => {
        const tenantId = useAuth.getState().activeTenantId;
        set((s) => ({ holidays: s.holidays.filter((h) => h.id !== id) }));
        if (tenantId && !get().demoMode) {
          syncDelete("holidays", tenantId, id);
        }
      },
      bulkAddHolidays: async (newHolidays) => {
        const tenantId = useAuth.getState().activeTenantId;
        const formatted: CompanyHoliday[] = newHolidays.map((h) => ({
          ...h,
          id: h.id || crypto.randomUUID(),
          createdAt: h.createdAt || new Date().toISOString(),
        }));

        set((s) => ({ holidays: [...formatted, ...s.holidays] }));

        if (tenantId && !get().demoMode) {
          await Promise.all(
            formatted.map((item) => syncItem("holidays", { tenantId, ...item }))
          );
        }
        return formatted.length;
      },
      addShift: (s) => {
        const shift: ShiftType = {
          ...s,
          id: s.id || `shift-${crypto.randomUUID().slice(0, 8)}`,
        };
        set((st) => {
          const nextShifts = [...(st.company.shifts ?? []), shift];
          const nextCompany = { ...st.company, shifts: nextShifts };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncItem("config", { id: "config", tenantId, ...nextCompany });
          }
          return { company: nextCompany };
        });
        return shift;
      },
      updateShift: (id, patch) => {
        set((st) => {
          const nextShifts = (st.company.shifts ?? []).map((sh) => (sh.id === id ? { ...sh, ...patch } : sh));
          const nextCompany = { ...st.company, shifts: nextShifts };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncItem("config", { id: "config", tenantId, ...nextCompany });
          }
          return { company: nextCompany };
        });
      },
      deleteShift: (id) => {
        set((st) => {
          const nextShifts = (st.company.shifts ?? []).filter((sh) => sh.id !== id);
          const nextCompany = { ...st.company, shifts: nextShifts };
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncItem("config", { id: "config", tenantId, ...nextCompany });
          }
          return { company: nextCompany };
        });
      },
      roster: [],
      assignRoster: (r) => {
        const assignment: ShiftAssignment = {
          ...r,
          id: r.id || `ros-${r.employeeId}-${r.date}`,
          updatedAt: new Date().toISOString(),
        };
        set((st) => {
          const filtered = st.roster.filter((item) => !(item.employeeId === r.employeeId && item.date === r.date));
          const nextRoster = [assignment, ...filtered];
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncItem("roster", { tenantId, ...assignment });
          }
          return { roster: nextRoster };
        });
        return assignment;
      },
      bulkAssignRoster: async (items) => {
        if (!items || items.length === 0) return 0;
        const tenantId = useAuth.getState().activeTenantId;
        const mapped: ShiftAssignment[] = items.map((r) => ({
          ...r,
          id: r.id || `ros-${r.employeeId}-${r.date}`,
          updatedAt: new Date().toISOString(),
        }));

        set((st) => {
          const keySet = new Set(mapped.map((m) => `${m.employeeId}_${m.date}`));
          const remaining = st.roster.filter((item) => !keySet.has(`${item.employeeId}_${item.date}`));
          return { roster: [...mapped, ...remaining] };
        });

        if (tenantId && !tenantId.startsWith("demo-tenant-")) {
          try {
            await safeFetch("/api/roster/bulk-assign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tenantId, assignments: mapped }),
            });
          } catch (err) {
            console.warn("[Store] Failed to bulk sync roster:", err);
          }
        }
        return mapped.length;
      },
      deleteRosterAssignment: (id) => {
        set((st) => {
          const tenantId = useAuth.getState().activeTenantId;
          if (tenantId && !tenantId.startsWith("demo-tenant-")) {
            syncDelete("roster", tenantId, id);
          }
          return { roster: st.roster.filter((r) => r.id !== id) };
        });
      },
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
        const tenantId = useAuth.getState().activeTenantId || "demo-tenant-1";
        const req: DocRequest = {
          ...r,
          id: crypto.randomUUID(),
          tenantId,
          steps,
          currentStep: 0,
          status: "pending",
          requestedAt: new Date().toISOString(),
        };
        set((s) => ({ docRequests: [req, ...s.docRequests] }));
        if (tenantId && !get().demoMode) {
          syncItem("docRequests", req);
        }
        return req;
      },
      actOnDocStep: (id, action, comment, actedBy) => {
        const tenantId = useAuth.getState().activeTenantId;
        let updatedReq: DocRequest | null = null;
        set((s) => ({
          docRequests: s.docRequests.map((d) => {
            if (d.id !== id || d.status !== "pending") return d;
            const steps = d.steps.slice();
            const idx = d.currentStep;
            if (idx >= steps.length) return d;
            steps[idx] = { ...steps[idx], status: action === "approve" ? "approved" : "rejected", comment, actedAt: new Date().toISOString(), actedBy };
            if (action === "reject") {
              updatedReq = { ...d, steps, status: "rejected" };
              return updatedReq;
            }
            const nextIdx = idx + 1;
            const done = nextIdx >= steps.length;
            updatedReq = { ...d, steps, currentStep: done ? idx : nextIdx, status: done ? "approved" : "pending" };
            return updatedReq;
          }),
        }));
        if (tenantId && updatedReq !== null && !get().demoMode) {
          const itemToSync: DocRequest = updatedReq;
          syncItem("docRequests", { tenantId, ...itemToSync });
        }
      },
      forwardDocStep: (id, toApprover, comment, actedBy) => {
        const tenantId = useAuth.getState().activeTenantId;
        let updatedReq: DocRequest | null = null;
        set((s) => ({
          docRequests: s.docRequests.map((d) => {
            if (d.id !== id || d.status !== "pending") return d;
            const steps = d.steps.slice();
            const idx = d.currentStep;
            if (idx >= steps.length) return d;
            const original = steps[idx];
            steps[idx] = { ...original, status: "approved", comment: `Forwarded to ${toApprover}${comment ? " · " + comment : ""}`, actedAt: new Date().toISOString(), actedBy };
            steps.splice(idx + 1, 0, { approver: toApprover, status: "pending", forwardedFrom: actedBy });
            updatedReq = { ...d, steps, currentStep: idx + 1 };
            return updatedReq;
          }),
        }));
        if (tenantId && updatedReq !== null && !get().demoMode) {
          const itemToSync: DocRequest = updatedReq;
          syncItem("docRequests", { tenantId, ...itemToSync });
        }
      },
      deleteDocRequest: (id) => {
        const tenantId = useAuth.getState().activeTenantId;
        set((s) => ({ docRequests: s.docRequests.filter((d) => d.id !== id) }));
        if (tenantId && !get().demoMode) {
          syncDelete("docRequests", tenantId, id);
        }
      },
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
      storage: {
        getItem: (name) => {
          const tenantId = typeof window !== "undefined" ? localStorage.getItem("swift-active-tenant") : null;
          const key = tenantId ? `${name}-${tenantId}` : name;
          const str = localStorage.getItem(key);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          const tenantId = typeof window !== "undefined" ? localStorage.getItem("swift-active-tenant") : null;
          const key = tenantId ? `${name}-${tenantId}` : name;
          localStorage.setItem(key, JSON.stringify(value));
        },
        removeItem: (name) => {
          const tenantId = typeof window !== "undefined" ? localStorage.getItem("swift-active-tenant") : null;
          const key = tenantId ? `${name}-${tenantId}` : name;
          localStorage.removeItem(key);
        },
      },
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

export function getEmployeeBranchIds(emp?: { branchId?: string; branchIds?: string[] } | null): string[] {
  if (!emp) return [];
  if (Array.isArray(emp.branchIds) && emp.branchIds.length > 0) {
    return emp.branchIds;
  }
  if (emp.branchId) {
    return [emp.branchId];
  }
  return [];
}

export function resolveAttendanceProfile(
  emp: Pick<Employee, "branchId" | "department" | "designation"> & { branchIds?: string[] },
  company: Company,
): ResolvedAttendanceProfile {
  const rules = (company.attendanceDefaults ?? []).slice().sort((a, b) => b.priority - a.priority);
  const empBranchIds = getEmployeeBranchIds(emp);
  const matches = (r: AttendanceProfileRule) => {
    const m = r.match || {};
    if (m.branchId && !empBranchIds.includes(m.branchId) && m.branchId !== emp.branchId) return false;
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


