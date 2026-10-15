import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, isMockEmployee, isFrozenEmployee, resolveAttendanceProfile, getEmployeeBranchIds, type Employee, type EmployeeDocument, type EducationDocument, type PriorEmployerDoc, type FamilyMember, type EducationEntry, type ExperienceEntry, type PredefinedRole, type BiometricDeviceMapping, type Device } from "@/lib/store";
import { computePayroll, inr } from "@/lib/payroll";
import { aiNotify } from "@/lib/ai-guide-bus";
import { generateAppointmentPDF, generateAppointmentPDFBlob } from "@/lib/pdf";
import { DEFAULT_TEMPLATES, downloadLetter, buildGenericTemplate, renderTemplate, buildVars, prepareDocAssets, generateLetterPDF, type LetterKey, saveAs } from "@/lib/documents";
import JSZip from "jszip";
import { calculateProfileCompletion, calculateOverallOnboarding, type ProfileCompletionResult } from "@/lib/profile-completion";

import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PhotoCapture } from "@/components/photo-capture";
import { ESignPad } from "@/components/esign-pad";
import {
  Plus, FileDown, Trash2, ChevronLeft, ChevronRight, User, Briefcase, Building2,
  FileSignature, CheckCircle2, Sparkles, Wand2, Camera, Home, Users as UsersIcon,
  GraduationCap, Award, ShieldCheck, ScanFace, Save, X, ArrowRightLeft, DoorOpen, Pencil,
  FileSpreadsheet, Upload, Download, AlertTriangle, FileText, MapPin, Clock, Timer, Eye,
  KeyRound, RefreshCw, Copy, Check, Fingerprint, Database, ChevronDown, ShieldAlert,
  UserX, Snowflake, MoreHorizontal, FileCheck, AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadEmployeeTemplate, parseEmployeeCsvText, generateEmployeePassword, downloadBulkEmployeesExcel } from "@/lib/bulk-employee";
import { EmployeeActionsDialog } from "@/components/employee-actions-dialog";
import { DesignationSelect } from "@/components/designation-select";
import { DepartmentSelect } from "@/components/department-select";
import { EmploymentTypeSelect, EmploymentTypeBadge } from "@/components/employment-type-select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { INDIAN_STATES, lookupPincode } from "@/lib/india-locations";
import { OnboardingChecklistDialog } from "@/components/OnboardingChecklistDialog";
import {
  findEmployeeDuplicates,
  checkEmployeeDuplicatesRemote,
  validatePanFormat,
  validateAadhaarFormat,
  validateDrivingLicenseFormat,
  validateVoterIdFormat,
  validateRationCardFormat,
  validateBankAccountFormat,
} from "@/lib/employee-validation";
import { useAuth } from "@/lib/auth";
import { DeleteEmployeeDialog } from "@/components/delete-employee-dialog";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "Employees · CreatonsHR" }] }),
  component: EmployeesPage,
});

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] as const;
export const EMERGENCY_RELATIONS = [
  "Spouse",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Friend",
  "Guardian",
  "Other",
] as const;

function computeCalculatedCtc(company: any, employeeForm: any, fixedSalaryValue: number): number {
  if (!fixedSalaryValue || fixedSalaryValue <= 0) return 0;
  try {
    const dummyEmp: Employee = {
      ...employeeForm,
      fixedSalary: fixedSalaryValue,
      basic: fixedSalaryValue,
      salary: fixedSalaryValue,
    };
    const p = computePayroll({
      company,
      employee: dummyEmp,
      daysWorked: company?.workingDaysPerMonth || 26,
      otHours: 0,
      incentive: 0,
      shiftDays: 0,
      loan: 0,
      advance: 0,
      bonus: 0,
    });
    return Math.round(p.monthlyCTC || fixedSalaryValue);
  } catch (err) {
    return fixedSalaryValue;
  }
}

const empty: Omit<Employee, "id"> = {
  empCode: "",
  password: generateEmployeePassword(),
  name: "",
  email: "",
  phone: "",
  department: "Engineering",
  designation: "",
  doj: new Date().toISOString().slice(0, 10),
  basic: 25000,
  fixedSalary: 25000,
  ctc: 27800,
  insuranceForNonEsi: true,
  pfEligible: true,
  esiEligible: false,
  ptEligible: true,
  tdsEligible: false,
  eligibleDate: new Date().toISOString().slice(0, 10),
  probationDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  leaveApplyEligible: true,
  geofencingEnabled: true,
  biometricEnabled: false,
  biometricMappings: [],
  graceTime: "15",
  allowHalfDayLogin: true,
  halfDayLoginTime: "12:00",
  pan: "",
  aadhaar: "",
  bankAcc: "",
  bankIfsc: "",
  shiftId: "gen",
  faceRegistered: false,
  status: "active",
  employmentType: "regular",
  branchId: undefined,
  branchIds: [],
  photoDataUrl: undefined,
  education: [],
  educationDocuments: [],
};

type SignatureRec = { docCode: string; docTitle: string; letterKey?: string; signatureDataUrl?: string; signedBy?: string };

// Fixed form steps. Every onboarding document is inserted as its own step
// between them, in the professional joining order defined by DOC_INSERT_AFTER.
const FORM_STEPS = [
  { key: "photo", title: "Photo & Identity", icon: Camera },
  { key: "personal", title: "Personal Details", icon: User },
  { key: "address", title: "KYC", icon: FileCheck },
  { key: "family", title: "Family & Emergency", icon: UsersIcon },
  { key: "education", title: "Education", icon: GraduationCap },
  { key: "experience", title: "Prior Experience", icon: Briefcase },
  { key: "skills", title: "Skills & Languages", icon: Award },
  { key: "compliance", title: "Compliance & BGV", icon: ShieldCheck },
  { key: "employment", title: "Employment & Salary", icon: Briefcase },
  { key: "branch", title: "Branch & Reporting", icon: Building2 },
  { key: "verify", title: "AI Verification", icon: ScanFace },
  { key: "review", title: "Review & Finish", icon: CheckCircle2 },
] as const;
type FormStepKey = typeof FORM_STEPS[number]["key"];

// Where each doc code lives in the flow. Produces:
// Photo → OFR → CAC → Personal → EIF → Employment → PAY → BNK →
// Branch → APT → JOR → NDA → COC → POL → PFR → ESI → AST → IDC →
// IND → TRN → Review.
const DOC_INSERT_AFTER: Record<string, FormStepKey> = {
  OFR: "photo", CAC: "photo",
  EIF: "personal",
  PAY: "employment", BNK: "employment",
  APT: "branch", JOR: "branch", NDA: "branch", COC: "branch", POL: "branch",
  PFR: "branch", ESI: "branch", AST: "branch", IDC: "branch",
  IND: "branch", TRN: "branch",
};

type FlowStep = { key: FormStepKey; title: string; icon: typeof User };

export function renderEmployeeStatusBadge(status?: string) {
  const s = (status || "active").toLowerCase().trim();
  if (s === "suspended") {
    return (
      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 whitespace-nowrap gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>Suspended</span>
      </Badge>
    );
  }
  if (s === "relieved" || s === "releived") {
    return (
      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 whitespace-nowrap gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
        <span>Releived</span>
      </Badge>
    );
  }
  if (s === "terminated") {
    return (
      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 whitespace-nowrap gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>Terminated</span>
      </Badge>
    );
  }
  if (s === "frozen" || s === "freezed") {
    return (
      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 whitespace-nowrap gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
        <span>Freezed</span>
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 whitespace-nowrap gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      <span>Active</span>
    </Badge>
  );
}

function EmployeesPage() {
  const {
    employees: rawEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    company,
    docAssets,
    ensureJourney,
    docLibrary,
    advanceJourneyStep,
    registrationDrafts,
    saveRegistrationDraft,
    deleteRegistrationDraft,
    addAudit,
    currentUser,
    roles,
    devices,
    purgeMockEmployees,
  } = useStore();

  const employees = useMemo(() => (rawEmployees || []).filter((e) => !isMockEmployee(e) && !isFrozenEmployee(e)), [rawEmployees]);

  useEffect(() => {
    purgeMockEmployees();
  }, [purgeMockEmployees]);

  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDownloadOpen, setBulkDownloadOpen] = useState(false);
  const [resumeDraftId, setResumeDraftId] = useState<string | null>(null);
  const [actionEmp, setActionEmp] = useState<Employee | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [docsEmp, setDocsEmp] = useState<Employee | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<Employee | null>(null);
  const [freezeConfirmEmp, setFreezeConfirmEmp] = useState<Employee | null>(null);
  const [freezeReasonNote, setFreezeReasonNote] = useState<string>("");
  const [actionKind, setActionKind] = useState<"exit" | "transfer" | "manual">("exit");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "relieved" | "terminated">("all");
  const [onboardingFilter, setOnboardingFilter] = useState<"all" | "completed" | "incomplete">("all");
  const [inspectOnboardingEmp, setInspectOnboardingEmp] = useState<Employee | null>(null);

  const overallOnboarding = useMemo(() => calculateOverallOnboarding(employees), [employees]);

  const employeesWithCompletion = useMemo(() => {
    return employees.map((e) => ({
      employee: e,
      completion: calculateProfileCompletion(e),
    }));
  }, [employees]);

  const statusCounts = useMemo(() => {
    const counts = { all: employees.length, active: 0, suspended: 0, relieved: 0, terminated: 0 };
    for (const e of employees) {
      const s = (e.status || "active").toLowerCase().trim();
      if (s === "suspended") counts.suspended++;
      else if (s === "relieved" || s === "releived") counts.relieved++;
      else if (s === "terminated") counts.terminated++;
      else counts.active++;
    }
    return counts;
  }, [employees]);

  const displayedEmployees = useMemo(() => {
    let list = employeesWithCompletion;
    if (statusFilter !== "all") {
      list = list.filter(({ employee: e }) => {
        const s = (e.status || "active").toLowerCase().trim();
        if (statusFilter === "relieved") return s === "relieved" || s === "releived";
        return s === statusFilter;
      });
    }
    if (onboardingFilter === "completed") {
      list = list.filter(({ completion }) => completion.isComplete);
    } else if (onboardingFilter === "incomplete") {
      list = list.filter(({ completion }) => !completion.isComplete);
    }
    return list;
  }, [employeesWithCompletion, statusFilter, onboardingFilter]);

  // Status Change Dialog State
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    employee: Employee;
    newStatus: "suspended" | "relieved" | "terminated";
  } | null>(null);
  const [statusEffectiveDate, setStatusEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [statusReasonNote, setStatusReasonNote] = useState<string>("");
  const [statusConfirmStep, setStatusConfirmStep] = useState<boolean>(false);

  const handleStatusChange = (emp: Employee, newStatus: "active" | "suspended" | "relieved" | "terminated") => {
    if (newStatus === "active") {
      updateEmployee(emp.id, {
        status: "active",
        statusNote: undefined,
      });
      toast.success(`${emp.name}'s status restored to Active.`);
      return;
    }

    // For Suspended, Relieved, or Terminated: open Date & Note popup
    setStatusChangeTarget({ employee: emp, newStatus });
    setStatusEffectiveDate(new Date().toISOString().slice(0, 10));
    setStatusReasonNote("");
    setStatusConfirmStep(false);
  };

  const handleFinalizeStatusChange = () => {
    if (!statusChangeTarget) return;
    const { employee, newStatus } = statusChangeTarget;
    const label = newStatus === "relieved" ? "Relieved" : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

    updateEmployee(employee.id, {
      status: newStatus,
      statusDate: statusEffectiveDate,
      statusNote: statusReasonNote.trim() || undefined,
    });

    toast.warning(`${employee.name}'s status changed to ${label}. Moved to Past Employees.`);
    setStatusChangeTarget(null);
    setStatusConfirmStep(false);
    setStatusReasonNote("");
  };

  const openWizard = (draftId?: string) => {
    setResumeDraftId(draftId ?? null);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Guided 20-step registration with AI validation, bulk Excel import, autosave, and audit trail.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="border-border hover:bg-muted"
            onClick={() => {
              downloadEmployeeTemplate(company.name);
              toast.success("Excel template downloaded with sample employee columns.");
            }}
            title="Download Excel / CSV template with prefilled column headers"
          >
            <Download className="mr-2 h-4 w-4 text-primary" /> Download Template
          </Button>

          <Button
            id="trigger-bulk-download-btn"
            variant="outline"
            className="border-border hover:bg-muted text-foreground font-medium"
            onClick={() => setBulkDownloadOpen(true)}
            title="Download all employee details across all 7 modules into Excel"
          >
            <FileDown className="mr-2 h-4 w-4 text-emerald-600" /> Bulk Download
          </Button>

          <Button
            id="trigger-bulk-upload-btn"
            variant="outline"
            className="border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
            onClick={() => setBulkOpen(true)}
            title="Upload Excel or CSV file to import employees without photos"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Bulk Upload
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-brand text-white shadow-glow" onClick={() => openWizard()}>
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl w-[96vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-primary/25 shadow-2xl bg-card/95 backdrop-blur-xl transition-colors">
              <RegistrationWizard key={resumeDraftId ?? "new"} draftId={resumeDraftId} onDone={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {registrationDrafts.length > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Save className="h-4 w-4 text-primary" />
            <div className="font-medium text-sm">Resume saved drafts ({registrationDrafts.length})</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {registrationDrafts.map((d) => (
              <div key={d.id} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs">
                <button className="hover:underline" onClick={() => openWizard(d.id)}>
                  {d.data.name || "Unnamed"} · step {d.currentStep + 1} · {new Date(d.updatedAt).toLocaleString()}
                </button>
                <button className="ml-1 opacity-60 hover:opacity-100" onClick={() => deleteRegistrationDraft(d.id)}><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* ONBOARDING JOURNEY & COMPLIANCE OVERVIEW BAR                              */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Overall Progress & Summary */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                  <span>Workforce Onboarding Journey</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    Live Tracker
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Real-time compliance, KYC, personal details, and biometric registration across all employees.
                </p>
              </div>
            </div>

            {/* Progress Bar & Percentage */}
            <div className="space-y-1.5 pt-1 max-w-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Overall Completion Rate: <strong className="text-primary font-bold">{overallOnboarding.overallPercentage}%</strong>
                </span>
                <span className="text-muted-foreground">
                  {overallOnboarding.completedCount} of {overallOnboarding.totalCount} staff 100% onboarded
                </span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/50 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    overallOnboarding.overallPercentage >= 90
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : overallOnboarding.overallPercentage >= 65
                      ? "bg-gradient-to-r from-primary to-amber-400"
                      : "bg-gradient-to-r from-rose-500 to-amber-500"
                  }`}
                  style={{ width: `${Math.max(4, overallOnboarding.overallPercentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Quick Onboarding Filter Badges */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setOnboardingFilter("all")}
              className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                onboardingFilter === "all"
                  ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20 shadow-2xs"
                  : "bg-muted/40 border-border hover:bg-muted/80"
              }`}
            >
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">All Staff</div>
              <div className="text-base font-bold text-foreground">{overallOnboarding.totalCount}</div>
            </button>

            <button
              type="button"
              onClick={() => setOnboardingFilter("completed")}
              className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                onboardingFilter === "completed"
                  ? "bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-2xs"
                  : "bg-muted/40 border-border hover:bg-muted/80"
              }`}
            >
              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> 100% Complete
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{overallOnboarding.completedCount}</div>
            </button>

            <button
              type="button"
              onClick={() => setOnboardingFilter("incomplete")}
              className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                onboardingFilter === "incomplete"
                  ? "bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/20 shadow-2xs"
                  : "bg-muted/40 border-border hover:bg-muted/80"
              }`}
            >
              <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Incomplete
              </div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400">{overallOnboarding.inProgressCount}</div>
            </button>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border">
          {[
            { id: "all", label: "All Employees", count: statusCounts.all, color: "text-foreground" },
            { id: "active", label: "Active", count: statusCounts.active, color: "text-emerald-600 dark:text-emerald-400" },
            { id: "suspended", label: "Suspended", count: statusCounts.suspended, color: "text-amber-600 dark:text-amber-400" },
            { id: "relieved", label: "Releived", count: statusCounts.relieved, color: "text-purple-600 dark:text-purple-400" },
            { id: "terminated", label: "Terminated", count: statusCounts.terminated, color: "text-rose-600 dark:text-rose-400" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === tab.id ? "bg-muted font-bold " + tab.color : "bg-muted/70 text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {onboardingFilter !== "all" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Onboarding Filter:</span>
            <Badge variant="secondary" className="gap-1">
              <span>{onboardingFilter === "completed" ? "100% Onboarded" : "Incomplete Onboarding"}</span>
              <X className="h-3 w-3 cursor-pointer" onClick={() => setOnboardingFilter("all")} />
            </Badge>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1050px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                <th className="p-3 pl-4 whitespace-nowrap sticky left-0 z-20 bg-muted border-r border-border/60 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)] min-w-[240px]">Employee</th>
                <th className="p-3 whitespace-nowrap">Status</th>
                <th className="p-3 whitespace-nowrap">Department</th>
                <th className="p-3 whitespace-nowrap">Branch</th>
                <th className="p-3 whitespace-nowrap min-w-[220px]">Onboarding Progress</th>
                <th className="p-3 text-right whitespace-nowrap">Basic</th>
                <th className="p-3 text-right whitespace-nowrap">Monthly CTC</th>
                <th className="p-3 text-center pr-4 whitespace-nowrap w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    {statusFilter === "all" && onboardingFilter === "all"
                      ? "No employees yet. Click Add Employee to start the guided registration."
                    : `No employees matching current filters found.`}
                </td>
              </tr>
            ) : (
              displayedEmployees.map(({ employee: e, completion }) => {
                const p = computePayroll({ company, employee: e, daysWorked: company.workingDaysPerMonth, otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0 });
                const assignedBranchIds = getEmployeeBranchIds(e);
                const assignedBranches = (company.branches ?? []).filter((b) => assignedBranchIds.includes(b.id));
                return (
                  <tr key={e.id} className="border-t border-border group hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4 whitespace-nowrap sticky left-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-r border-border/60 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)] min-w-[240px]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full ring-2 ring-primary/25 overflow-hidden bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">
                          {e.photoDataUrl ? <img src={e.photoDataUrl} className="h-full w-full object-cover" alt={e.name} /> : e.name.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-1.5">
                            <span>{e.name}</span>
                            <EmploymentTypeBadge type={e.employmentType} />
                            {(e.faceRegistered || (e.photoDataUrl && e.photoDataUrl.startsWith("http"))) && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium"
                                title="Biometric Face Enrolled (Rekognition & Mobile Verified)"
                              >
                                ✓ Face Enrolled
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{e.empCode} · {e.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {renderEmployeeStatusBadge(e.status)}
                    </td>
                    <td className="p-3 whitespace-nowrap">{e.department}</td>
                    <td className="p-3 whitespace-nowrap">
                      {assignedBranches.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {assignedBranches.map((b) => (
                            <Badge
                              key={b.id}
                              variant={b.id === e.branchId ? "default" : "outline"}
                              className={`text-[10px] px-1.5 py-0.5 ${b.id === e.branchId ? "bg-primary/90 text-primary-foreground font-medium" : "text-muted-foreground"}`}
                              title={`${b.name} (${b.city || b.state})${b.id === e.branchId ? " — Primary Branch" : ""}`}
                            >
                              {b.code}
                              {b.id === e.branchId && assignedBranches.length > 1 && <span className="ml-1 opacity-75">★</span>}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 min-w-[200px]">
                      <div 
                        onClick={() => setInspectOnboardingEmp(e)}
                        className="group/pb cursor-pointer p-2 -m-1 rounded-xl hover:bg-muted/70 transition-all border border-transparent hover:border-border/60"
                        title="Click to view detailed onboarding & verification checklist"
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              completion.isComplete
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : completion.percentage >= 70
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            }`}>
                              {completion.percentage}%
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground group-hover/pb:text-foreground transition-colors">
                              {completion.isComplete ? "100% Verified" : `${completion.missingFields.length} pending`}
                            </span>
                          </div>
                          <Eye className="h-3 w-3 text-muted-foreground opacity-60 group-hover/pb:opacity-100 transition-opacity" />
                        </div>

                        {/* Styled Progress Bar Track */}
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              completion.isComplete
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                : completion.percentage >= 70
                                ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                                : "bg-gradient-to-r from-rose-500 to-amber-500"
                            }`}
                            style={{ width: `${Math.max(6, completion.percentage)}%` }}
                          />
                        </div>

                        {/* Missing fields mini tags if incomplete */}
                        {!completion.isComplete && completion.missingFields.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {completion.missingFields.slice(0, 2).map((m) => (
                              <span
                                key={m.key}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-muted/90 text-muted-foreground border border-border/40 truncate max-w-[120px]"
                                title={`Missing: ${m.label}`}
                              >
                                {m.label}
                              </span>
                            ))}
                            {completion.missingFields.length > 2 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-muted/60 text-muted-foreground font-mono">
                                +{completion.missingFields.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap font-mono">{inr(e.basic)}</td>
                    <td className="p-3 text-right text-primary font-medium whitespace-nowrap font-mono">{inr(p.monthlyCTC)}</td>
                    <td className="p-3 text-center pr-4 whitespace-nowrap w-16">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors"
                            title="Employee Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 shadow-lg">
                          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">
                            Actions · {e.empCode || e.name}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setEditingEmp(e)}
                            className="gap-2 cursor-pointer font-medium"
                          >
                            <Pencil className="h-4 w-4 text-primary" />
                            <span>Edit Employee</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setDocsEmp(e)}
                            className="gap-2 cursor-pointer"
                          >
                            <FileText className="h-4 w-4 text-sky-600" />
                            <span>Documents & Signatures</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => void generateAppointmentPDF(company, e, p, docAssets)}
                            className="gap-2 cursor-pointer"
                          >
                            <FileDown className="h-4 w-4 text-emerald-600" />
                            <span>Appointment Letter</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                              <ShieldAlert className="h-4 w-4 text-primary" />
                              <span>Change Status</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-44">
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(e, "active")}
                                className="gap-2 cursor-pointer"
                              >
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="font-medium">Active</span>
                                {(e.status === "active" || !e.status) && <Check className="h-3.5 w-3.5 ml-auto text-emerald-600" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(e, "suspended")}
                                className="gap-2 cursor-pointer"
                              >
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span className="font-medium">Suspended</span>
                                {e.status === "suspended" && <Check className="h-3.5 w-3.5 ml-auto text-amber-600" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(e, "relieved")}
                                className="gap-2 cursor-pointer"
                              >
                                <span className="h-2 w-2 rounded-full bg-purple-500" />
                                <span className="font-medium">Relieved</span>
                                {(e.status === "relieved" || e.status === "releived") && <Check className="h-3.5 w-3.5 ml-auto text-purple-600" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(e, "terminated")}
                                className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-500/10"
                              >
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                <span className="font-medium">Terminated</span>
                                {e.status === "terminated" && <Check className="h-3.5 w-3.5 ml-auto text-rose-600" />}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          <DropdownMenuItem
                            onClick={() => {
                              setFreezeReasonNote("");
                              setFreezeConfirmEmp(e);
                            }}
                            className="gap-2 cursor-pointer text-sky-600 focus:text-sky-600 focus:bg-sky-500/10"
                          >
                            <Snowflake className="h-4 w-4 text-sky-500" />
                            <span>Freeze Employee</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmEmp(e)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span>Delete Employee</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
      <EmployeeActionsDialog
        employee={actionEmp}
        open={!!actionEmp}
        defaultKind={actionKind}
        onClose={() => setActionEmp(null)}
      />
      <EditEmployeeDialog
        employee={editingEmp}
        open={!!editingEmp}
        onClose={() => setEditingEmp(null)}
      />
      <EmployeeDocumentsDialog
        employee={docsEmp}
        open={!!docsEmp}
        onClose={() => setDocsEmp(null)}
      />
      <DeleteEmployeeDialog
        employee={deleteConfirmEmp}
        open={!!deleteConfirmEmp}
        onClose={() => setDeleteConfirmEmp(null)}
        onConfirmDelete={(emp) => {
          deleteEmployee(emp.id);
          toast.success(`Employee ${emp.name} (${emp.empCode}) removed successfully.`);
        }}
      />
      {/* Freeze Employee Dialog */}
      <Dialog open={!!freezeConfirmEmp} onOpenChange={(o) => !o && setFreezeConfirmEmp(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 bg-sky-500/10 text-sky-600 border border-sky-500/20">
                <Snowflake className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Freeze Employee Account?</DialogTitle>
                <DialogDescription className="text-xs">
                  Archive {freezeConfirmEmp?.name} safely without losing any data.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs text-muted-foreground">
            <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 text-foreground space-y-1.5">
              <div className="font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Snowflake className="h-3.5 w-3.5" /> What freezing does:
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                <li><strong>Hides from all operations:</strong> Excluded from Active Directory, Attendance, Payroll runs, and Shift Rosters.</li>
                <li><strong>Zero data loss:</strong> All employee KYC, past records, contracts, and salary setups remain safely stored in the database.</li>
                <li><strong>Easily retrievable:</strong> You can unfreeze this employee at any time from the <strong>Past Employees &gt; Freezed Employees</strong> tab.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reason / Freeze Note (Optional)</Label>
              <Textarea
                placeholder="e.g. Sabbatical, extended leave, seasonal pause..."
                value={freezeReasonNote}
                onChange={(e) => setFreezeReasonNote(e.target.value)}
                rows={2}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setFreezeConfirmEmp(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!freezeConfirmEmp) return;
                const emp = freezeConfirmEmp;
                updateEmployee(emp.id, {
                  status: "frozen",
                  statusDate: new Date().toISOString().slice(0, 10),
                  statusNote: freezeReasonNote.trim() || "Account frozen by administrator",
                });
                addAudit({
                  actorName: currentUser?.name || "System",
                  entity: "employee",
                  entityId: emp.id,
                  action: "update",
                  oldValue: { status: emp.status },
                  newValue: { status: "frozen", note: freezeReasonNote.trim() },
                });
                toast.success(`Employee ${emp.name} frozen. You can find and unfreeze them in Past Employees > Freezed Employees.`);
                setFreezeConfirmEmp(null);
                setFreezeReasonNote("");
              }}
              className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium"
            >
              <Snowflake className="h-3.5 w-3.5" />
              Freeze Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkUploadDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />
      <OnboardingChecklistDialog
        employee={inspectOnboardingEmp}
        open={!!inspectOnboardingEmp}
        onClose={() => setInspectOnboardingEmp(null)}
        onEditProfile={(emp) => {
          setInspectOnboardingEmp(null);
          setEditingEmp(emp);
        }}
      />
      <BulkDownloadConfirmDialog
        open={bulkDownloadOpen}
        onClose={() => setBulkDownloadOpen(false)}
        companyName={company.name}
        employees={employees}
        branches={company.branches ?? []}
        shifts={company.shifts ?? []}
        roles={roles ?? []}
        devices={devices ?? []}
      />

      {/* 1. Status Change Dialog: Select Date and Note */}
      <Dialog
        open={statusChangeTarget !== null && !statusConfirmStep}
        onOpenChange={(o) => {
          if (!o) setStatusChangeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  statusChangeTarget?.newStatus === "suspended"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : statusChangeTarget?.newStatus === "terminated"
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                }`}
              >
                {statusChangeTarget?.newStatus === "suspended" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : statusChangeTarget?.newStatus === "terminated" ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <UserX className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {statusChangeTarget?.newStatus === "suspended"
                    ? "Suspend Employee"
                    : statusChangeTarget?.newStatus === "terminated"
                    ? "Terminate Employee"
                    : "Relieve Employee"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {statusChangeTarget?.employee.name} · {statusChangeTarget?.employee.empCode}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
              This employee will be moved to <strong className="text-foreground">Past Employees</strong> and will no longer show in the active <strong className="text-foreground">Attendance</strong> area.
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Effective Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={statusEffectiveDate}
                onChange={(e) => setStatusEffectiveDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Note / Reason (Optional)</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Resignation accepted, contract completed, disciplinary action, mutual release..."
                value={statusReasonNote}
                onChange={(e) => setStatusReasonNote(e.target.value)}
                className="text-xs resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                This note will be saved with the employee record and visible under Past Employees.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusChangeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!statusEffectiveDate) {
                  toast.error("Please select an effective date");
                  return;
                }
                setStatusConfirmStep(true);
              }}
              className="gap-1.5 font-semibold"
            >
              <span>Confirm</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. "Are you sure?" Second Confirmation Popup */}
      <Dialog
        open={statusChangeTarget !== null && statusConfirmStep}
        onOpenChange={(o) => {
          if (!o) setStatusConfirmStep(false);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Are you sure?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Please confirm status change for {statusChangeTarget?.employee.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            <p className="text-muted-foreground">
              Are you sure you want to mark{" "}
              <strong className="text-foreground">{statusChangeTarget?.employee.name}</strong> as{" "}
              <span className="font-semibold uppercase text-foreground">
                {statusChangeTarget?.newStatus === "relieved" ? "Relieved" : statusChangeTarget?.newStatus}
              </span>
              ?
            </p>

            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective Date:</span>
                <span className="font-semibold text-foreground">{statusEffectiveDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason / Note:</span>
                <span className="font-medium text-foreground text-right max-w-[200px] truncate">
                  {statusReasonNote || "None (Optional)"}
                </span>
              </div>
            </div>

            <p className="text-[11.5px] text-amber-600 dark:text-amber-400 font-medium">
              ⚠ Once confirmed, this employee will be moved to Past Employees and will no longer show in Attendance.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusConfirmStep(false)}
            >
              Cancel / Back
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleFinalizeStatusChange}
              className="gap-1.5 font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Yes, Confirm Status Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegistrationWizard({ onDone, draftId }: { onDone: () => void; draftId?: string | null }) {
  const {
    addEmployee, company, ensureJourney,
    saveRegistrationDraft, deleteRegistrationDraft, addAudit, currentUser, employees, roles, devices,
  } = useStore();
  // Read initial draft ONCE without subscribing to registrationDrafts — otherwise every
  // autosave re-renders the parent and the wizard flickers/appears to reload.
  const [initialDraft] = useState(() => (draftId ? useStore.getState().registrationDrafts.find((d) => d.id === draftId) : undefined));
  const [step, setStep] = useState(initialDraft?.currentStep ?? 0);
  const [form, setForm] = useState<Omit<Employee, "id">>({ ...empty, ...(initialDraft?.data ?? {}) } as Omit<Employee, "id">);
  const draftIdRef = useRef<string>(initialDraft?.id ?? crypto.randomUUID());
  const [savedAt, setSavedAt] = useState<string | null>(initialDraft?.updatedAt ?? null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [previewPdfModal, setPreviewPdfModal] = useState<{ name?: string; fileName?: string; dataUrl?: string; fileSize?: string } | null>(null);

  const handlePincodeChange = async (pinValue: string) => {
    const cleanPin = pinValue.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await lookupPincode(cleanPin);
        if (res) {
          setForm((prev) => ({
            ...prev,
            pincode: cleanPin,
            city: res.city || prev.city,
            state: res.state || prev.state,
            country: "India",
          }));
          toast.success(`Auto-detected ${res.city}, ${res.state} for PIN ${cleanPin}`);
        } else {
          toast.info(`PIN ${cleanPin} entered. Please select State and City.`);
        }
      } catch (err) {
        console.error("Pincode lookup error:", err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  // Autosave with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (!form.name && !form.empCode && step === 0) return;
      saveRegistrationDraft({ id: draftIdRef.current, data: form, currentStep: step, createdBy: currentUser?.name ?? "HR" });
      setSavedAt(new Date().toISOString());
    }, 800);
    return () => clearTimeout(t);
  }, [form, step]);

  const flow = FORM_STEPS;
  const current = flow[step];

  // Real-time duplicate employee validation against in-memory loaded employee database
  const duplicatesResult = useMemo(() => {
    return findEmployeeDuplicates(form, employees);
  }, [form, employees]);

  const currentStepConflict = useMemo(() => {
    if (!current) return null;
    if (current.key === "photo") return duplicatesResult.byField.empCode || null;
    if (current.key === "personal") {
      return (
        duplicatesResult.byField.email ||
        duplicatesResult.byField.phone ||
        null
      );
    }
    if (current.key === "address") {
      return (
        duplicatesResult.byField.pan ||
        duplicatesResult.byField.aadhaar ||
        duplicatesResult.byField.uan ||
        null
      );
    }
    if (current.key === "employment") return duplicatesResult.byField.uan || null;
    return null;
  }, [current, duplicatesResult]);

  const [visitedSteps, setVisitedSteps] = useState<Record<number, boolean>>({ 0: true });
  const [direction, setDirection] = useState<number>(0);
  const activeStepRef = useRef<HTMLDivElement>(null);
  const stepperScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [step]);

  const goToStep = (newStep: number) => {
    if (newStep < 0 || newStep >= flow.length) return;
    setDirection(newStep > step ? 1 : -1);
    setVisitedSteps((prev) => ({ ...prev, [step]: true, [newStep]: true }));
    setStep(newStep);
  };

  const getStepStatus = (stepKey: FormStepKey): { isComplete: boolean; missingCount: number; missingFields: string[] } => {
    const missing: string[] = [];

    switch (stepKey) {
      case "photo":
        if (!form.name?.trim()) missing.push("Full Name");
        if (!form.empCode?.trim()) missing.push("Employee Code");
        break;

      case "personal":
        if (!form.email?.trim()) missing.push("Work/Personal Email");
        if (!form.phone?.trim()) missing.push("Phone Number");
        if (!form.gender) missing.push("Gender");
        if (!form.dob) missing.push("Date of Birth");
        break;

      case "address":
        if (!form.pan || !validatePanFormat(form.pan, true).valid) missing.push("Valid PAN");
        if (!form.aadhaar || !validateAadhaarFormat(form.aadhaar, true).valid) missing.push("Valid Aadhaar");
        if (!form.bankAcc?.trim()) missing.push("Bank Account");
        break;

      case "family":
        if (!form.emergencyContact?.trim() && !form.emergencyPhone2?.trim() && !form.emergencyName?.trim()) {
          missing.push("Emergency Contact");
        }
        break;

      case "education":
        const hasEdu = (form.education && form.education.length > 0) || (form.educationDocuments && form.educationDocuments.length > 0);
        if (!hasEdu) missing.push("Educational Details");
        break;

      case "experience":
        if (form.experience && form.experience.length > 0) {
          if (form.experience.some((e) => !e.company?.trim())) missing.push("Company Name");
        }
        break;

      case "skills":
        if (!form.skills || form.skills.length === 0) missing.push("Skills");
        if (!form.languagesKnown || form.languagesKnown.length === 0) missing.push("Languages");
        break;

      case "compliance":
        if (!form.backgroundCheckStatus) missing.push("Background Check Status");
        break;

      case "employment":
        if (!form.department?.trim()) missing.push("Department");
        if (!form.designation?.trim()) missing.push("Designation");
        if (!form.doj) missing.push("Date of Joining");
        if ((form.fixedSalary ?? 0) <= 0) missing.push("Fixed Salary");
        break;

      case "branch":
        const hasBranch = form.branchId || (form.branchIds && form.branchIds.length > 0);
        if (!hasBranch) missing.push("Branch");
        break;

      case "verify":
      case "review":
        break;
    }

    return {
      isComplete: missing.length === 0,
      missingCount: missing.length,
      missingFields: missing,
    };
  };

  const canNext = () => {
    if (!current) return false;
    if (currentStepConflict) return false;
    // On photo step, at least require name and empCode so the draft/employee has an identity
    if (current.key === "photo") {
      return !!form.name?.trim() && !!form.empCode?.trim() && !duplicatesResult.byField.empCode;
    }
    // Allow navigation across subsequent steps even if fields are missing,
    // so the stepper marks incomplete modules with the warning downward icon!
    return true;
  };

  const finish = async () => {
    if (!form.empCode || !form.name) return toast.error("Employee code and name required");

    // 1. Immediate in-memory database check
    const localDup = findEmployeeDuplicates(form, employees);
    if (localDup.hasDuplicate) {
      const topConflict = localDup.conflicts[0];
      toast.error(`Already in database: ${topConflict.message}`);
      // Automatically jump to the step containing the conflict so HR can see and resolve it
      if (topConflict.field === "empCode") {
        setStep(flow.findIndex((s) => s.key === "photo"));
      } else if (["email", "phone"].includes(topConflict.field)) {
        setStep(flow.findIndex((s) => s.key === "personal"));
      } else if (["pan", "aadhaar", "uan"].includes(topConflict.field)) {
        setStep(flow.findIndex((s) => s.key === "address"));
      }
      return;
    }

    // 2. Real-time remote check against backend DynamoDB database
    const activeTenantId = useAuth.getState().activeTenantId || (company as any).id;
    if (activeTenantId && !activeTenantId.startsWith("demo-tenant-")) {
      const remoteDup = await checkEmployeeDuplicatesRemote(activeTenantId, form);
      if (remoteDup.hasDuplicate) {
        const topConflict = remoteDup.conflicts[0];
        toast.error(`Already in database: ${topConflict.message}`);
        if (topConflict.field === "empCode") {
          setStep(flow.findIndex((s) => s.key === "photo"));
        } else if (["email", "phone"].includes(topConflict.field)) {
          setStep(flow.findIndex((s) => s.key === "personal"));
        } else if (["pan", "aadhaar", "uan"].includes(topConflict.field)) {
          setStep(flow.findIndex((s) => s.key === "address"));
        }
        return;
      }
    }

    const emp = addEmployee({ ...form, faceRegistered: !!form.photoDataUrl || form.faceRegistered });
    ensureJourney(emp.id);
    const p = computePayroll({ company, employee: emp, daysWorked: company.workingDaysPerMonth, otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0 });
    generateAppointmentPDF(company, emp, p);
    addAudit({
      actorName: currentUser?.name ?? "HR",
      entity: "employee",
      entityId: emp.id,
      action: "onboard-complete",
      device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined,
      newValue: { empCode: emp.empCode, name: emp.name },
    });
    deleteRegistrationDraft(draftIdRef.current);
    aiNotify({ title: "✨ Employee onboarded", body: `${emp.name} created. Onboarding documents are ready for signature in employee app.`, kind: "success" });
    toast.success(`${emp.name} onboarded! Documents ready for employee app signing.`);
    onDone();
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-background">
      {/* Top Header */}
      <div className="shrink-0 px-6 py-3 border-b border-border/70 flex items-center justify-between bg-card/70 backdrop-blur-md">
        <DialogHeader className="m-0 p-0 text-left">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold font-display text-foreground">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm ring-2 ring-primary/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>Add Employee</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  Guided Wizard
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium px-3 py-1 rounded-full bg-muted/60 border border-border/60 shadow-2xs">
            <Save className="h-3 w-3 text-primary" />
            <span>{savedAt ? `Autosaved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Draft autosave active"}</span>
          </div>
        </div>
      </div>

      {/* Top Horizontal Connected Stepper Bar */}
      <div className="shrink-0 border-b border-border/70 bg-muted/20 backdrop-blur-xs py-3 px-4 sm:px-6 overflow-hidden">
        <div
          ref={stepperScrollRef}
          className="flex items-start overflow-x-auto no-scrollbar scroll-smooth py-1"
        >
          <div className="flex items-start min-w-max mx-auto px-2">
            {flow.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isPast = i < step;
              const isVisited = !!visitedSteps[i] || isPast;
              const status = getStepStatus(s.key);
              const isComplete = status.isComplete;
              const isWarning = isVisited && !isComplete && !isActive;

              return (
                <div
                  key={s.key}
                  ref={isActive ? activeStepRef : undefined}
                  className="flex items-start shrink-0"
                >
                  {/* Step Node */}
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    className="flex flex-col items-center group focus:outline-hidden transition-transform duration-200 hover:scale-[1.02]"
                    title={
                      isWarning
                        ? `${s.title}: Incomplete (${status.missingCount} fields missing: ${status.missingFields.join(", ")})`
                        : s.title
                    }
                  >
                    {/* Circle Node */}
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 select-none ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20 scale-105 z-10"
                            : isWarning
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-2 border-amber-500 shadow-2xs"
                            : isVisited && isComplete
                            ? "bg-primary/15 text-primary border-2 border-primary/90 font-semibold"
                            : "bg-muted/70 text-muted-foreground border border-border/80 group-hover:bg-muted group-hover:text-foreground"
                        }`}
                      >
                        {isActive ? (
                          <span>{i + 1}</span>
                        ) : isWarning ? (
                          <div className="flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 stroke-[2.2]" />
                          </div>
                        ) : isVisited && isComplete ? (
                          <Check className="h-5 w-5 stroke-[2.5]" />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>

                      {/* Warning downward indicator badge */}
                      {isWarning && (
                        <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <ChevronDown className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Step Icon & Title Label */}
                    <div className="mt-2 flex flex-col items-center text-center max-w-[80px] sm:max-w-[95px] px-0.5">
                      <div
                        className={`flex items-center gap-1 transition-colors duration-200 ${
                          isActive
                            ? "text-primary font-bold"
                            : isWarning
                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                            : isVisited && isComplete
                            ? "text-foreground/90 font-medium"
                            : "text-muted-foreground group-hover:text-foreground font-normal"
                        }`}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="text-[11px] sm:text-xs truncate tracking-tight">
                          {s.title}
                        </span>
                      </div>
                      {isWarning ? (
                        <span className="text-[9.5px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 leading-none">
                          {status.missingCount} pending
                        </span>
                      ) : isActive ? (
                        <span className="text-[9.5px] text-primary font-medium mt-0.5 leading-none">
                          In Progress
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {/* Connecting Line between steps */}
                  {i < flow.length - 1 && (
                    <div className="w-5 sm:w-8 md:w-12 flex items-center justify-center px-1 self-start mt-4 sm:mt-5">
                      <div
                        className={`h-[2px] w-full rounded-full transition-all duration-300 ${
                          i < step
                            ? "bg-primary"
                            : "bg-border/80"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body / Fields Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-card/20">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current?.key ?? step}
              custom={direction}
              variants={{
                enter: (dir: number) => ({
                  opacity: 0,
                  x: dir > 0 ? 20 : -20,
                }),
                center: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.2, ease: "easeOut" },
                },
                exit: (dir: number) => ({
                  opacity: 0,
                  x: dir > 0 ? -20 : 20,
                  transition: { duration: 0.15, ease: "easeIn" },
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-5"
            >
              {current?.key === "photo" && (
                <div className="space-y-5">
                  <StepHead icon={Camera} title="Photo & Identity" subtitle="Photo upload is optional. Employees will register their face for fast AI attendance on first-time login via the SwiftHR Mobile App." />

                  {/* Bulk Upload Banner */}
                  <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Need to register multiple employees?</div>
                        <div className="text-sm font-medium">Download the Excel template or Bulk Upload your employee list.</div>
                        <p className="text-xs text-muted-foreground mt-0.5">Imported employees are created with auto-generated secure passwords. Employees register faces on first mobile app login.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-card text-xs h-8"
                        onClick={() => {
                          downloadEmployeeTemplate(company.name);
                          toast.success("Excel template downloaded.");
                        }}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download Template
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary text-white text-xs h-8 shadow-sm"
                        onClick={() => {
                          onDone();
                          setTimeout(() => {
                            const btn = document.getElementById("trigger-bulk-upload-btn");
                            if (btn) btn.click();
                          }, 100);
                        }}
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" /> Bulk Upload Excel
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile Photo (Optional)</span>
                      <span className="text-[11px] text-primary font-medium bg-primary/10 px-2.5 py-0.5 rounded-full">
                        Employee will register face in mobile app
                      </span>
                    </div>
                    <PhotoCapture value={form.photoDataUrl} onChange={(u) => setForm({ ...form, photoDataUrl: u, faceRegistered: !!u })} name={form.name} size="lg" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                    <Field
                      label="Employee Code *"
                      value={form.empCode}
                      onChange={(v) => setForm({ ...form, empCode: v })}
                      placeholder="SW0001"
                      error={duplicatesResult.byField.empCode?.message}
                    />

                    {/* Auto Generated Password Card */}
                    <div className="col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold text-foreground">Auto-Generated Login Password</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] bg-card border-border hover:bg-muted"
                            onClick={() => {
                              const newP = generateEmployeePassword();
                              setForm({ ...form, password: newP });
                              toast.info(`Generated new password: ${newP}`);
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1 text-primary" /> Regenerate
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] bg-card border-border hover:bg-muted"
                            onClick={() => {
                              if (form.password) {
                                navigator.clipboard.writeText(form.password);
                                toast.success("Password copied to clipboard!");
                              }
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1 text-primary" /> Copy
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={form.password || ""}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="Auto-generated password"
                          className="font-mono text-sm font-semibold bg-card border-border h-9"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>✨</span>
                        <span>This Employee Code and auto-generated password will be emailed to the employee along with mobile app login instructions.</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {current?.key === "personal" && (
                <div className="space-y-4">
                  <StepHead icon={User} title="Personal Details" subtitle="Contact and residential address details." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Email *"
                      value={form.email}
                      onChange={(v) => setForm({ ...form, email: v })}
                      error={duplicatesResult.byField.email?.message}
                    />
                    <Field
                      label="Phone *"
                      value={form.phone}
                      onChange={(v) => setForm({ ...form, phone: v })}
                      error={duplicatesResult.byField.phone?.message}
                    />
                    <Field label="Date of Birth" type="date" value={form.dob || ""} onChange={(v) => setForm({ ...form, dob: v })} />
                    <div>
                      <Label>Gender</Label>
                      <Select value={form.gender || ""} onValueChange={(v) => setForm({ ...form, gender: v as Employee["gender"] })}>
                        <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Blood Group</Label>
                      <Select value={form.bloodGroup || ""} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
                        <SelectTrigger><SelectValue placeholder="Select Blood Group" /></SelectTrigger>
                        <SelectContent>
                          {BLOOD_GROUPS.map((bg) => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="hidden sm:block" />
                    <Field
                      label="Address Line 1"
                      value={form.addressLine1 || form.address || ""}
                      onChange={(v) => setForm({ ...form, addressLine1: v, address: v })}
                    />
                    <Field
                      label="Address Line 2"
                      value={form.addressLine2 || ""}
                      onChange={(v) => setForm({ ...form, addressLine2: v })}
                    />
                    <Field
                      label="City"
                      value={form.city || ""}
                      onChange={(v) => setForm({ ...form, city: v })}
                    />
                    <div>
                      <Label>State</Label>
                      <Select value={form.state || ""} onValueChange={(v) => setForm({ ...form, state: v })}>
                        <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                        <SelectContent className="max-h-56">
                          {INDIAN_STATES.map((st) => (
                            <SelectItem key={st} value={st}>{st}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field
                      label="Country"
                      value={form.country || "India"}
                      onChange={(v) => setForm({ ...form, country: v })}
                    />
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>PIN</Label>
                        {pincodeLoading && (
                          <span className="text-[11px] text-primary font-medium animate-pulse">Detecting City & State...</span>
                        )}
                      </div>
                      <Input
                        value={form.pincode || ""}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                  </div>
                </div>
              )}

              {current?.key === "address" && (
                <div className="space-y-4">
                  <StepHead icon={FileCheck} title="KYC" subtitle="Government identity cards, statutory KYC, and bank account details." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="PAN Card Number"
                      value={form.pan || ""}
                      onChange={(v) => setForm({ ...form, pan: v.replace(/[\s-]/g, "").toUpperCase().slice(0, 10) })}
                      error={duplicatesResult.byField.pan?.message || (form.pan ? validatePanFormat(form.pan).message : undefined)}
                    />
                    <Field
                      label="Aadhaar Card Number"
                      value={form.aadhaar || ""}
                      onChange={(v) => setForm({ ...form, aadhaar: v.replace(/\D/g, "").slice(0, 12) })}
                      error={duplicatesResult.byField.aadhaar?.message || (form.aadhaar ? validateAadhaarFormat(form.aadhaar).message : undefined)}
                    />
                    <Field
                      label="Bank Account Number"
                      value={form.bankAcc || ""}
                      onChange={(v) => setForm({ ...form, bankAcc: v.replace(/\D/g, "").slice(0, 18) })}
                      error={form.bankAcc ? validateBankAccountFormat(form.bankAcc).message : undefined}
                    />
                    <Field
                      label="Bank IFSC Code"
                      value={form.bankIfsc || ""}
                      onChange={(v) => setForm({ ...form, bankIfsc: v.replace(/[\s-]/g, "").toUpperCase().slice(0, 11) })}
                    />
                    <div className="col-span-2">
                      <Field
                        label="Driving License (DL)"
                        value={form.drivingLicense || ""}
                        onChange={(v) => setForm({ ...form, drivingLicense: v.replace(/[\s-]/g, "").toUpperCase().slice(0, 15) })}
                        error={form.drivingLicense ? validateDrivingLicenseFormat(form.drivingLicense).message : undefined}
                      />
                    </div>
                    <Field
                      label="Voter ID (EPIC)"
                      value={form.voterId || ""}
                      onChange={(v) => setForm({ ...form, voterId: v.replace(/[\s-]/g, "").toUpperCase().slice(0, 10) })}
                      error={form.voterId ? validateVoterIdFormat(form.voterId).message : undefined}
                    />
                    <Field
                      label="Ration Card"
                      value={form.rationCard || ""}
                      onChange={(v) => setForm({ ...form, rationCard: v.trim().toUpperCase().slice(0, 20) })}
                      error={form.rationCard ? validateRationCardFormat(form.rationCard).message : undefined}
                    />
                    <Field
                      label="PF Number"
                      value={form.pfNumber || ""}
                      onChange={(v) => setForm({ ...form, pfNumber: v })}
                    />
                    <Field
                      label="UAN Number"
                      value={form.uan || ""}
                      onChange={(v) => setForm({ ...form, uan: v.replace(/\D/g, "").slice(0, 12) })}
                      error={duplicatesResult.byField.uan?.message}
                    />
                    <Field
                      label="Passport Number"
                      value={form.passportNumber || ""}
                      onChange={(v) => setForm({ ...form, passportNumber: v.toUpperCase() })}
                    />
                    <Field
                      label="ESIC Number"
                      value={form.esic || ""}
                      onChange={(v) => setForm({ ...form, esic: v })}
                    />
                  </div>
                </div>
              )}

              {current?.key === "family" && (
                <div className="space-y-4">
                  <StepHead icon={UsersIcon} title="Family & Emergency" subtitle="Family members, statutory Aadhaar, family photograph, and emergency contact." />

                  {/* Personal & Family Core Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Marital Status</Label>
                      <Select value={form.maritalStatus || ""} onValueChange={(v) => setForm({ ...form, maritalStatus: v as Employee["maritalStatus"] })}>
                        <SelectTrigger><SelectValue placeholder="Select Marital Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="Nationality" value={form.nationality || "Indian"} onChange={(v) => setForm({ ...form, nationality: v })} />
                    <Field label="Father's Name" value={form.fatherName || ""} onChange={(v) => setForm({ ...form, fatherName: v })} />
                    <Field label="Mother's Name" value={form.motherName || ""} onChange={(v) => setForm({ ...form, motherName: v })} />
                    <Field label="Spouse Name" value={form.spouseName || ""} onChange={(v) => setForm({ ...form, spouseName: v })} />
                  </div>

                  {/* Emergency Contact Section */}
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>Emergency Contact Details</span>
                      <span className="text-[11px] text-primary lowercase tracking-normal">Primary emergency reach</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Emergency Contact Name</Label>
                        <Input
                          value={form.emergencyName || ""}
                          onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                          className="text-xs h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Emergency Relation</Label>
                        <Select value={form.emergencyRelation || ""} onValueChange={(v) => setForm({ ...form, emergencyRelation: v })}>
                          <SelectTrigger className="text-xs h-9 mt-1"><SelectValue placeholder="Select Relation" /></SelectTrigger>
                          <SelectContent>
                            {EMERGENCY_RELATIONS.map((rel) => (
                              <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Emergency Contact</Label>
                        <Input
                          type="tel"
                          value={form.emergencyContact || ""}
                          maxLength={10}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setForm({ ...form, emergencyContact: digits });
                          }}
                          className="text-xs h-9 mt-1 font-mono tracking-wider"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Family Photograph with *ESI Toggle */}
                  <FamilyPhotoCard
                    value={form.familyPhotoUrl}
                    esiCovered={form.familyPhotoEsiCovered}
                    onChange={(url) => setForm({ ...form, familyPhotoUrl: url })}
                    onEsiChange={(esi) => setForm({ ...form, familyPhotoEsiCovered: esi })}
                  />

                  {/* Family Members with Relation and Aadhaar */}
                  <FamilyMembersManager
                    members={form.family || []}
                    onChange={(family) => setForm({ ...form, family })}
                  />
                </div>
              )}

              {current?.key === "education" && (
                <div className="space-y-4">
                  <StepHead icon={GraduationCap} title="Education & Certificates" subtitle="Academic qualifications and certified document PDF uploads." />

                  {/* Educational Qualifications List */}
                  <EducationQualificationsManager
                    items={form.education || []}
                    onChange={(education) => setForm({ ...form, education })}
                  />

                  {/* Education Documents Upload Option (PDFs with Name Type Box) */}
                  <EducationDocumentsManager
                    documents={form.educationDocuments || []}
                    onChange={(educationDocuments) => setForm({ ...form, educationDocuments })}
                    onPreview={(doc) => setPreviewPdfModal(doc)}
                  />
                </div>
              )}

              {current?.key === "experience" && (
                <div className="space-y-4">
                  <StepHead icon={Briefcase} title="Prior Experience" subtitle="Previous employers, roles, CTC, payslips, experience and appointment letters." />
                  <PriorExperienceManager
                    items={form.experience || []}
                    onChange={(experience) => setForm({ ...form, experience })}
                    onPreview={(doc) => setPreviewPdfModal(doc)}
                  />
                </div>
              )}

              {current?.key === "skills" && (
                <div className="space-y-4">
                  <StepHead icon={Award} title="Skills & Languages" subtitle="Comma-separated. AI will match to open requisitions." />
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Skills</Label>
                      <Input
                        value={(form.skills || []).join(", ")}
                        onChange={(e) => setForm({ ...form, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      />
                    </div>
                    <div>
                      <Label>Languages Known</Label>
                      <Input
                        value={(form.languagesKnown || []).join(", ")}
                        onChange={(e) => setForm({ ...form, languagesKnown: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      />
                    </div>
                    <div>
                      <Label>Extra Curricular</Label>
                      <Input
                        value={(form.extraCurricular || []).join(", ")}
                        onChange={(e) => setForm({ ...form, extraCurricular: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {current?.key === "compliance" && (
                <div className="space-y-4">
                  <StepHead icon={ShieldCheck} title="Compliance & Background Verification" subtitle="Statutory declarations and BGV status." />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Background Check</Label>
                      <Select value={form.backgroundCheckStatus || "pending"} onValueChange={(v) => setForm({ ...form, backgroundCheckStatus: v as Employee["backgroundCheckStatus"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="clear">Clear</SelectItem>
                          <SelectItem value="flagged">Flagged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input type="checkbox" checked={!!form.policeVerification} onChange={(e) => setForm({ ...form, policeVerification: e.target.checked })} />
                      <Label>Police verification submitted</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={!!form.medicalFitness} onChange={(e) => setForm({ ...form, medicalFitness: e.target.checked })} />
                      <Label>Medical fitness certified</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={!!form.ndaSigned} onChange={(e) => setForm({ ...form, ndaSigned: e.target.checked })} />
                      <Label>NDA acknowledged</Label>
                    </div>
                    <div className="col-span-2">
                      <Label>Compliance Notes</Label>
                      <Input value={form.complianceNotes || ""} onChange={(e) => setForm({ ...form, complianceNotes: e.target.value })} placeholder="Any exceptions, waivers, or clarifications" />
                    </div>
                  </div>
                </div>
              )}

              {current?.key === "verify" && (() => {
                const issues: string[] = [];
                if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) issues.push("PAN format looks invalid");
                if (form.aadhaar && form.aadhaar.replace(/\s/g, "").length !== 12) issues.push("Aadhaar should be 12 digits");
                if (form.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc)) issues.push("IFSC format looks invalid");
                if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) issues.push("Email format looks invalid");
                if (!form.emergencyName && !form.emergencyContact) issues.push("No emergency contact captured");
                if (!form.family || form.family.length === 0) issues.push("No family/nominee entries");
                const dup = employees.find((e) => e.empCode.toLowerCase() === form.empCode.toLowerCase());
                if (dup) issues.push(`Employee code ${form.empCode} already exists`);
                const passed = issues.length === 0;
                return (
                  <div className="space-y-4">
                    <StepHead icon={ScanFace} title="AI Verification" subtitle="SWIFT AI checks the entered data before onboarding." />
                    <div className={`rounded-2xl border p-5 ${passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className={`h-4 w-4 ${passed ? "text-emerald-600" : "text-amber-600"}`} />
                        <div className="font-medium">{passed ? "All checks passed" : `${issues.length} issue(s) detected`}</div>
                      </div>
                      {passed ? (
                        <div className="text-sm text-muted-foreground">Format, duplicates, and completeness look good. Safe to onboard.</div>
                      ) : (
                        <ul className="text-sm list-disc pl-5 space-y-1">
                          {issues.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      )}
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => setForm({ ...form, aiVerification: { ranAt: new Date().toISOString(), issues, passed } })}>
                          <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Record AI verification
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}



              {current?.key === "employment" && (
                <div className="space-y-4">
                  <StepHead icon={Briefcase} title="Employment, Fixed Salary & Compliance" subtitle="Fixed salary, statutory deductions, eligibility dates, and role assignment." />
                  <div className="grid grid-cols-2 gap-4">
                    <DepartmentSelect
                      label="Department *"
                      value={form.department}
                      onChange={(v) => setForm({ ...form, department: v })}
                      triggerClassName="h-9"
                    />
                    <DesignationSelect
                      label="Designation *"
                      value={form.designation}
                      onChange={(v) => setForm({ ...form, designation: v })}
                      triggerClassName="h-9"
                    />
                    <EmploymentTypeSelect
                      label="Employment Type"
                      value={form.employmentType || "Regular"}
                      onChange={(v) => setForm({ ...form, employmentType: v })}
                      triggerClassName="h-9"
                    />
                    <Field label="Date of Joining *" type="date" value={form.doj} onChange={(v) => setForm({ ...form, doj: v })} />
                    <Field
                      label="Fixed Salary (Monthly ₹) *"
                      type="number"
                      value={String(form.fixedSalary ?? form.basic ?? 0)}
                      onChange={(v) => {
                        const salaryVal = +v || 0;
                        const ctcVal = computeCalculatedCtc(company, form, salaryVal);
                        setForm({ ...form, fixedSalary: salaryVal, basic: salaryVal, salary: salaryVal, ctc: ctcVal });
                      }}
                    />
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-primary">CTC (Monthly ₹) *</Label>
                        {(form.ctc || computeCalculatedCtc(company, form, form.fixedSalary ?? form.basic ?? 0)) > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ₹{((form.ctc || computeCalculatedCtc(company, form, form.fixedSalary ?? form.basic ?? 0)) * 12).toLocaleString("en-IN")}/yr
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        className="font-bold text-xs h-9 mt-1 font-mono"
                        value={String(form.ctc ?? computeCalculatedCtc(company, form, form.fixedSalary ?? form.basic ?? 0))}
                        onChange={(e) => setForm({ ...form, ctc: +e.target.value || 0 })}
                      />
                    </div>
                    <Field
                      label="PF Number"
                      value={form.pfNumber || ""}
                      onChange={(v) => setForm({ ...form, pfNumber: v })}
                    />
                    <Field
                      label="UAN Number"
                      value={form.uan || ""}
                      onChange={(v) => setForm({ ...form, uan: v.replace(/\D/g, "").slice(0, 12) })}
                      error={duplicatesResult.byField.uan?.message}
                    />
                    <Field label="Bank Account" value={form.bankAcc || ""} onChange={(v) => setForm({ ...form, bankAcc: v })} />
                    <Field label="IFSC" value={form.bankIfsc || ""} onChange={(v) => setForm({ ...form, bankIfsc: v.toUpperCase() })} />
                    <div>
                      <Label>Assigned Role</Label>
                      <Select
                        value={form.roleId || "__none"}
                        onValueChange={(v) => {
                          const selected = (roles || []).find((r: PredefinedRole) => r.id === v);
                          setForm({
                            ...form,
                            roleId: v === "__none" ? undefined : v,
                            roleName: selected ? selected.name : undefined,
                          });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Predefined Role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— Standard / Default —</SelectItem>
                          {(roles || []).map((r: PredefinedRole) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} {r.isSystemDefault ? "(Default)" : "(Custom)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Shift</Label>
                      <Select value={form.shiftId} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {company.shifts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field
                      label="Benefits Eligible Date"
                      type="date"
                      value={form.eligibleDate || form.doj}
                      onChange={(v) => setForm({ ...form, eligibleDate: v })}
                    />
                    <Field
                      label="Probation End Date"
                      type="date"
                      value={form.probationDate || ""}
                      onChange={(v) => setForm({ ...form, probationDate: v })}
                    />
                  </div>

                  {/* Statutory & Tax Deduction Checkboxes */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Statutory Deductions & Tax Eligibility
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer p-2.5 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                        <Checkbox
                          checked={form.pfEligible ?? true}
                          onCheckedChange={(c) => {
                            const pfEligible = !!c;
                            const nextForm = { ...form, pfEligible };
                            const ctcVal = computeCalculatedCtc(company, nextForm, form.fixedSalary ?? form.basic ?? 0);
                            setForm({ ...nextForm, ctc: ctcVal });
                          }}
                        />
                        <span>PF (Provident Fund)</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer p-2.5 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                        <Checkbox
                          checked={form.esiEligible ?? false}
                          onCheckedChange={(c) => {
                            const esiEligible = !!c;
                            const nextForm = {
                              ...form,
                              esiEligible,
                              insuranceForNonEsi: !esiEligible ? form.insuranceForNonEsi : false,
                            };
                            const ctcVal = computeCalculatedCtc(company, nextForm, form.fixedSalary ?? form.basic ?? 0);
                            setForm({ ...nextForm, ctc: ctcVal });
                          }}
                        />
                        <span>ESI (Medical Scheme)</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer p-2.5 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                        <Checkbox
                          checked={form.ptEligible ?? true}
                          onCheckedChange={(c) => setForm({ ...form, ptEligible: !!c })}
                        />
                        <span>Professional Tax (PT)</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer p-2.5 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                        <Checkbox
                          checked={form.tdsEligible ?? false}
                          onCheckedChange={(c) => setForm({ ...form, tdsEligible: !!c })}
                        />
                        <span>TDS (Income Tax)</span>
                      </label>
                    </div>

                    {/* Insurance for Non-ESI Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 mt-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span>Insurance for Non-ESI</span>
                          {form.esiEligible && (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground">
                              Covered under ESI
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Commercial medical & accident insurance coverage for employees not covered under statutory ESI scheme.
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(form.insuranceForNonEsi ?? (!form.esiEligible && (form.fixedSalary ?? 0) > 21000))}
                        disabled={form.esiEligible}
                        onCheckedChange={(c) => setForm({ ...form, insuranceForNonEsi: c })}
                      />
                    </div>
                  </div>

                  {/* Leave Apply Eligibility Checkbox */}
                  <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span>Leave Apply Eligible</span>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                          Employee App Feature Gate
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        When disabled, the Leave & Permission application action will be locked in the employee mobile app.
                      </p>
                    </div>
                    <Checkbox
                      checked={form.leaveApplyEligible ?? true}
                      onCheckedChange={(c) => setForm({ ...form, leaveApplyEligible: !!c })}
                      className="h-5 w-5"
                    />
                  </div>
                </div>
              )}

              {current?.key === "branch" && (
                <div className="space-y-4">
                  <StepHead icon={Building2} title="Branch & Reporting" subtitle="Assign to single or multiple branches (authorizing punch within each branch's geo-fence) and reporting manager." />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Assigned Branches</Label>
                        <p className="text-xs text-muted-foreground">Select all branches where this employee is authorized to check-in / check-out.</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => {
                            const allIds = (company.branches ?? []).map((b) => b.id);
                            setForm({ ...form, branchIds: allIds, branchId: form.branchId || allIds[0] });
                          }}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => setForm({ ...form, branchIds: [], branchId: undefined })}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    {(company.branches ?? []).length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed text-xs text-muted-foreground text-center">
                        No branches configured yet. You can create branches under <b>Branches</b> menu.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(company.branches ?? []).map((b) => {
                          const currentSelectedIds = getEmployeeBranchIds(form);
                          const isSelected = currentSelectedIds.includes(b.id);
                          const isPrimary = (form.branchId || currentSelectedIds[0]) === b.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                let nextIds: string[];
                                if (isSelected) {
                                  nextIds = currentSelectedIds.filter((id) => id !== b.id);
                                } else {
                                  nextIds = [...currentSelectedIds, b.id];
                                }
                                const nextPrimary = isPrimary
                                  ? (nextIds[0] || undefined)
                                  : (form.branchId || nextIds[0] || undefined);
                                setForm({ ...form, branchIds: nextIds, branchId: nextPrimary });
                              }}
                              className={`cursor-pointer rounded-xl border p-3 transition-all flex flex-col justify-between gap-2 ${isSelected
                                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                                  : "border-border bg-card hover:bg-muted/40 opacity-75"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => { }}
                                    className="pointer-events-none"
                                  />
                                  <div className="font-medium text-xs flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-primary" />
                                    <span>{b.name}</span>
                                    {b.isHead && <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0">HQ</Badge>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {isPrimary && isSelected && (
                                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1 py-0">Primary</Badge>
                                  )}
                                  <Badge variant="outline" className="text-[10px] font-mono">{b.code}</Badge>
                                </div>
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                                <span className="truncate">{b.city ? `${b.city}, ${b.state}` : b.address}</span>
                                {b.lat != null && b.lng != null ? (
                                  <span className="text-emerald-600 font-mono text-[10px] flex items-center gap-0.5 shrink-0">
                                    <MapPin className="h-2.5 w-2.5" /> {b.radiusMeters ?? 150}m
                                  </span>
                                ) : (
                                  <span className="text-amber-600 text-[10px] shrink-0">No GPS</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Primary Branch Selector if multiple selected */}
                    {getEmployeeBranchIds(form).length > 1 && (
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
                        <div className="flex items-center gap-2 font-medium">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span>Primary Branch (for Payroll & Tax jurisdiction):</span>
                        </div>
                        <Select
                          value={form.branchId || getEmployeeBranchIds(form)[0] || "__none"}
                          onValueChange={(v) => setForm({ ...form, branchId: v === "__none" ? undefined : v })}
                        >
                          <SelectTrigger className="h-8 w-48 text-xs bg-background">
                            <SelectValue placeholder="Select primary" />
                          </SelectTrigger>
                          <SelectContent>
                            {(company.branches ?? [])
                              .filter((b) => getEmployeeBranchIds(form).includes(b.id))
                              .map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name} ({b.code})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="col-span-2">
                      <Label>Reports to</Label>
                      <Select
                        value={form.managerId || "__none"}
                        onValueChange={(v) => {
                          const m = employees.find((e) => e.id === v);
                          setForm({
                            ...form,
                            managerId: v === "__none" ? undefined : v,
                            reportingManager: v === "__none" ? undefined : (m?.name || v),
                          });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— Top of company —</SelectItem>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.name} · {e.designation}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Geofencing Verification Toggle */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>Geofencing Attendance Verification</span>
                          <Badge variant="outline" className={`text-[10px] ${form.geofencingEnabled !== false ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-amber-500/10 text-amber-700 border-amber-500/30"}`}>
                            {form.geofencingEnabled !== false ? "Active (Geo-fence Required)" : "Bypassed (Face Attendance Only)"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {form.geofencingEnabled !== false
                            ? "Employee must be physically within the assigned branch geofence boundary radius to check-in / check-out."
                            : "Geofence boundary check is bypassed for this employee. Facial verification attendance alone is sufficient for check-in & check-out (ideal for remote, field staff, or traveling employees)."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="geofence-toggle-wizard" className="text-xs font-semibold cursor-pointer">
                          {form.geofencingEnabled !== false ? "Enabled" : "Disabled"}
                        </Label>
                        <Switch
                          id="geofence-toggle-wizard"
                          checked={form.geofencingEnabled !== false}
                          onCheckedChange={(checked) => setForm({ ...form, geofencingEnabled: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Biometric Attendance & Multi-Device Mapping */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          <Fingerprint className="h-4 w-4 text-primary" />
                          <span>Biometric Terminal Attendance</span>
                          <Badge variant="outline" className={`text-[10px] ${form.biometricEnabled ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                            {form.biometricEnabled ? "Biometric Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Assign physical biometric hardware machines to this employee by Device Serial Number (SN) and Biometric User ID.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="biometric-toggle-wizard" className="text-xs font-semibold cursor-pointer">
                          {form.biometricEnabled ? "Enabled" : "Disabled"}
                        </Label>
                        <Switch
                          id="biometric-toggle-wizard"
                          checked={form.biometricEnabled === true}
                          onCheckedChange={(checked) => {
                            const defaultMappings: BiometricDeviceMapping[] = (form.biometricMappings && form.biometricMappings.length > 0)
                              ? form.biometricMappings
                              : [{
                                  id: "bm-" + Date.now(),
                                  deviceSn: (devices && devices[0]?.serialNumber) || "",
                                  biometricEmpCode: form.empCode || "",
                                  deviceName: (devices && devices[0]?.name) || "",
                                }];
                            setForm({
                              ...form,
                              biometricEnabled: checked,
                              biometricMappings: checked ? defaultMappings : form.biometricMappings,
                            });
                          }}
                        />
                      </div>
                    </div>

                    {form.biometricEnabled && (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Assigned Biometric Terminals ({form.biometricMappings?.length || 0})
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => {
                              const newMapping: BiometricDeviceMapping = {
                                id: "bm-" + Date.now(),
                                deviceSn: (devices && devices[0]?.serialNumber) || "",
                                biometricEmpCode: form.empCode || "",
                                deviceName: (devices && devices[0]?.name) || "",
                              };
                              setForm({
                                ...form,
                                biometricMappings: [...(form.biometricMappings || []), newMapping],
                              });
                            }}
                          >
                            <Plus className="h-3 w-3" /> Add Another Biometric Device
                          </Button>
                        </div>

                        {(!form.biometricMappings || form.biometricMappings.length === 0) ? (
                          <div className="p-4 rounded-xl border border-dashed text-xs text-muted-foreground text-center">
                            No biometric devices mapped yet. Click "+ Add Another Biometric Device" to link this employee to a terminal.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {form.biometricMappings.map((m, idx) => (
                              <div key={m.id || idx} className="p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-all space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                    <Fingerprint className="h-3.5 w-3.5 text-primary" /> Biometric Device #{idx + 1}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      const next = (form.biometricMappings || []).filter((_, i) => i !== idx);
                                      setForm({ ...form, biometricMappings: next });
                                    }}
                                    title="Remove Device Mapping"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <div>
                                    <Label className="text-[11px] font-medium">Device Serial Number (SN) *</Label>
                                    <div className="space-y-1">
                                      <Input
                                        placeholder="e.g. SN-ZK101"
                                        value={m.deviceSn || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const matchedDev = (devices || []).find((d: Device) => d.serialNumber === val);
                                          const next = [...(form.biometricMappings || [])];
                                          next[idx] = {
                                            ...next[idx],
                                            deviceSn: val,
                                            deviceName: matchedDev ? matchedDev.name : next[idx].deviceName,
                                          };
                                          setForm({ ...form, biometricMappings: next });
                                        }}
                                        className="h-8 text-xs font-mono"
                                      />
                                      {(devices || []).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {(devices || []).slice(0, 3).map((d: Device) => (
                                            <button
                                              key={d.id}
                                              type="button"
                                              onClick={() => {
                                                const next = [...(form.biometricMappings || [])];
                                                next[idx] = { ...next[idx], deviceSn: d.serialNumber, deviceName: d.name };
                                                setForm({ ...form, biometricMappings: next });
                                              }}
                                              className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted font-mono"
                                            >
                                              {d.name ? `${d.name} (${d.serialNumber})` : d.serialNumber}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-[11px] font-medium">Employee Code on Biometric *</Label>
                                    <Input
                                      placeholder="e.g. 101 or User PIN"
                                      value={m.biometricEmpCode || ""}
                                      onChange={(e) => {
                                        const next = [...(form.biometricMappings || [])];
                                        next[idx] = { ...next[idx], biometricEmpCode: e.target.value };
                                        setForm({ ...form, biometricMappings: next });
                                      }}
                                      className="h-8 text-xs font-mono font-semibold text-primary"
                                    />
                                    <p className="text-[9.5px] text-muted-foreground mt-0.5">Machine User ID / PIN</p>
                                  </div>

                                  <div>
                                    <Label className="text-[11px] font-medium">Device Label / Location (Optional)</Label>
                                    <Input
                                      placeholder="e.g. Main Gate Terminal"
                                      value={m.deviceName || ""}
                                      onChange={(e) => {
                                        const next = [...(form.biometricMappings || [])];
                                        next[idx] = { ...next[idx], deviceName: e.target.value };
                                        setForm({ ...form, biometricMappings: next });
                                      }}
                                      className="h-8 text-xs"
                                    />
                                    <p className="text-[9.5px] text-muted-foreground mt-0.5">Friendly machine name</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Grace Time & Shift Attendance Policy */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span>Grace Time for Attendance</span>
                          <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 border-purple-500/30">
                            Morning Shift Punctuality
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Allowed late-arrival buffer window after scheduled shift start time.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Morning Grace Period</Label>
                        <Select
                          value={form.graceTime || "15"}
                          onValueChange={(v: any) => setForm({ ...form, graceTime: v })}
                        >
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue placeholder="Select grace time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always">Always (No cutoff / Full flexibility)</SelectItem>
                            <SelectItem value="10">Within 10 mins</SelectItem>
                            <SelectItem value="15">Within 15 mins (Standard Default)</SelectItem>
                            <SelectItem value="20">Within 20 mins</SelectItem>
                            <SelectItem value="25">Within 25 mins</SelectItem>
                            <SelectItem value="30">Within 30 mins</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                          {form.graceTime === "always"
                            ? "Employee can clock in at any time in morning without cutoff."
                            : `If not marked within ${form.graceTime || "15"} mins of shift start, morning is marked Absent.`}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Afternoon Login Start Time</Label>
                        <Input
                          type="time"
                          value={form.halfDayLoginTime || "12:00"}
                          onChange={(e) => setForm({ ...form, halfDayLoginTime: e.target.value })}
                          disabled={form.allowHalfDayLogin === false || form.graceTime === "always"}
                          className="text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Default 12:00 PM. Unlocks check-in for afternoon / half-day attendance.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Afternoon Grace Period</Label>
                        <Select
                          value={form.afternoonGraceTime || "15"}
                          onValueChange={(v: any) => setForm({ ...form, afternoonGraceTime: v })}
                          disabled={form.allowHalfDayLogin === false || form.graceTime === "always"}
                        >
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue placeholder="Select afternoon grace" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always">Always (No cutoff / Flexible)</SelectItem>
                            <SelectItem value="10">Within 10 mins</SelectItem>
                            <SelectItem value="15">Within 15 mins (Standard Default)</SelectItem>
                            <SelectItem value="20">Within 20 mins</SelectItem>
                            <SelectItem value="25">Within 25 mins</SelectItem>
                            <SelectItem value="30">Within 30 mins</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                          {form.afternoonGraceTime === "always"
                            ? "Afternoon check-in allowed at all times after afternoon window."
                            : `Late check-in past ${form.afternoonGraceTime || "15"} mins of afternoon window locks attendance.`}
                        </p>
                      </div>
                    </div>

                    {/* Afternoon / Half-Day Login Toggle */}
                    {form.graceTime !== "always" && (
                      <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between gap-3 border border-border/70">
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            <Timer className="h-3.5 w-3.5 text-primary" />
                            <span>Allow Afternoon / Half-Day Login</span>
                            <Badge variant="outline" className={`text-[9px] ${form.allowHalfDayLogin !== false ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-rose-500/10 text-rose-700 border-rose-500/30"}`}>
                              {form.allowHalfDayLogin !== false ? `Allowed after ${form.halfDayLoginTime || "12:00 PM"}` : "Locked for Full Day"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {form.allowHalfDayLogin !== false
                              ? `If morning grace period is missed, employee can mark attendance after ${form.halfDayLoginTime || "12:00 PM"} as a Half-Day.`
                              : "If morning grace period is missed, employee is strictly prohibited from marking attendance for the entire day (Marked Full Day Absent)."}
                          </p>
                        </div>
                        <Switch
                          checked={form.allowHalfDayLogin !== false}
                          onCheckedChange={(checked) => setForm({ ...form, allowHalfDayLogin: checked })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {current?.key === "review" && (
                <div className="space-y-4">
                  <StepHead icon={CheckCircle2} title="Review & Finish" subtitle="Confirm the details before creating the employee profile." />
                  <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
                    <div className="h-20 w-20 rounded-full ring-2 ring-primary/30 overflow-hidden bg-primary/10 grid place-items-center text-primary text-xl font-semibold shrink-0">
                      {form.photoDataUrl ? <img src={form.photoDataUrl} className="h-full w-full object-cover" alt="" /> : form.name.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold">{form.name || "Unnamed"}</div>
                      <div className="text-sm text-muted-foreground">{form.designation || "—"} · {form.department} · {form.empCode || "—"}</div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                        <div>📧 {form.email || "—"}</div>
                        <div>📞 {form.phone || "—"}</div>
                        <div>💰 Basic {inr(form.basic)}</div>
                        <div>📅 DOJ {form.doj}</div>
                        <div>
                          🏢 Branches:{" "}
                          {(() => {
                            const bIds = getEmployeeBranchIds(form);
                            const assigned = (company.branches ?? []).filter((b) => bIds.includes(b.id));
                            if (assigned.length === 0) return "—";
                            return assigned.map((b) => `${b.name} (${b.code})`).join(", ");
                          })()}
                        </div>
                        <div>👤 Reports to: {employees.find((e) => e.id === form.managerId)?.name || "Top of company"}</div>
                        <div>
                          🖲️ Biometric: {form.biometricEnabled ? `Enabled (${form.biometricMappings?.length || 0} device${(form.biometricMappings?.length || 0) === 1 ? "" : "s"})` : "Disabled"}
                        </div>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const p = resolveAttendanceProfile(form, company);
                    const shiftName = company.shifts.find((s) => s.id === p.shiftId)?.name;
                    const leaveNames = (p.leaveTypeIds ?? []).map((id) => company.leaveTypes.find((l) => l.id === id)?.name).filter(Boolean);
                    return (
                      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Auto-assigned attendance profile
                          {p.ruleName && <Badge variant="outline" className="ml-1">{p.ruleName}</Badge>}
                        </div>
                        {p.ruleId ? (
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>🕒 Shift: <span className="text-foreground">{shiftName ?? "—"}</span></div>
                            <div>📅 Weekly off: <span className="text-foreground">{(p.weeklyOff ?? []).join(", ") || "—"}</span></div>
                            <div>🌴 Leave types: <span className="text-foreground">{leaveNames.join(", ") || "—"}</span></div>
                            <div>📍 Geo-fence: <span className="text-foreground">{p.geofenceFromBranch ? "Branch-based" : "None"}</span></div>
                            <div>💼 Payroll group: <span className="text-foreground">{p.payrollGroup ?? "—"}</span></div>
                            <div>🏷 Cost centre: <span className="text-foreground">{p.costCentre ?? "—"}</span></div>
                            <div className="col-span-2">🗓 Holiday calendar: <span className="text-foreground">{p.holidayCalendar ?? "—"}</span></div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">No matching rule — configure defaults in Settings → Attendance Profile Defaults.</div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 shrink-0">
                      <FileSignature className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                        Employee App Document Signing &amp; Acknowledgement
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Onboarding agreements (Appointment Letter, NDA, Code of Conduct &amp; Statutory Declarations) will be available in the employee&apos;s mobile app. The employee will sign and upload their documents directly from their app.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="shrink-0 flex items-center justify-between border-t border-border bg-card/95 backdrop-blur px-6 py-3.5 shadow-lg">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => goToStep(step - 1)}
          className="rounded-xl border-border/80 text-xs sm:text-sm font-medium hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        <div className="flex flex-col items-center">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <span>Step {step + 1} of {flow.length}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="font-semibold text-foreground">{current?.title}</span>
          </div>
          {currentStepConflict ? (
            <span className="text-[11px] font-semibold text-destructive animate-pulse mt-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{currentStepConflict.label} already in database</span>
            </span>
          ) : (
            (() => {
              const currStatus = getStepStatus(current?.key);
              if (!currStatus.isComplete && currStatus.missingCount > 0) {
                return (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{currStatus.missingCount} recommended field{currStatus.missingCount > 1 ? "s" : ""} empty ({currStatus.missingFields.slice(0, 2).join(", ")}{currStatus.missingCount > 2 ? "..." : ""})</span>
                  </span>
                );
              }
              return null;
            })()
          )}
        </div>

        {step < flow.length - 1 ? (
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm rounded-xl px-5"
            disabled={!canNext()}
            onClick={() => goToStep(step + 1)}
          >
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-semibold rounded-xl px-6"
            disabled={duplicatesResult.hasDuplicate}
            onClick={finish}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Complete Onboarding
          </Button>
        )}
      </div>

      {/* PDF Document Preview Modal */}
      <PdfPreviewDialog
        doc={previewPdfModal}
        open={!!previewPdfModal}
        onClose={() => setPreviewPdfModal(null)}
      />
    </div>
  );
}


function EmployeeDocumentsDialog({ employee, open, onClose }: { employee: Employee | null; open: boolean; onClose: () => void }) {
  const { company, docAssets, updateEmployee } = useStore();
  const [activeTab, setActiveTab] = useState<"signed" | "uploads">("signed");
  const [uploadType, setUploadType] = useState("Aadhaar Card");
  const [uploadName, setUploadName] = useState("");
  const [previewDocModal, setPreviewDocModal] = useState<EmployeeDocument | null>(null);
  const [adminPreviewPageIndex, setAdminPreviewPageIndex] = useState(0);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!employee) return null;

  const signedDocs = employee.signedDocs || {};
  const uploadedList = employee.documentsUploaded || [];

  // Standard onboarding agreements to track employee app e-signing
  const companyAgreements = [
    { code: "APT", title: "Appointment Letter & Terms of Employment", key: "appointment" as LetterKey },
    { code: "NDA", title: "Non-Disclosure & Confidentiality Agreement", key: "nda" as LetterKey },
    { code: "COC", title: "Employee Code of Conduct & Workplace Ethics", key: "coc" as LetterKey },
    { code: "POL", title: "Information Security & IT Usage Policy", key: "pol" as LetterKey },
    { code: "PFR", title: "EPF / EPS Statutory Declaration (Form 11)", key: "pfr" as LetterKey },
    { code: "ESI", title: "ESIC Medical Benefit Joining Declaration", key: "esi" as LetterKey },
  ];

  const handleDownloadZip = async () => {
    if (!employee) return;
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      let totalFilesAdded = 0;

      const appSignedFolder = zip.folder("App_Signed_Documents");
      const uploadsFolder = zip.folder("Employee_Uploads_and_KYC");

      // 1. Process App Signed Documents (ONLY verified/signed documents)
      const { company: prepCompany, assets: prepAssets } = await prepareDocAssets(company, docAssets);
      const payroll = computePayroll({
        company,
        employee,
        daysWorked: company.workingDaysPerMonth,
        otHours: 0,
        incentive: 0,
        shiftDays: 0,
        loan: 0,
        advance: 0,
        bonus: 0,
      });

      for (const agr of companyAgreements) {
        const isSigned = !!signedDocs[agr.code] || (agr.code === "APT" && employee.acceptance?.signed);
        if (!isSigned) continue; // Skip pending documents

        if (agr.code === "APT") {
          const { blob, filename } = await generateAppointmentPDFBlob(prepCompany, employee, payroll, prepAssets);
          appSignedFolder?.file(filename, blob);
          totalFilesAdded++;
        } else {
          const tpl =
            DEFAULT_TEMPLATES.find((t) => t.key === agr.key || t.code === agr.code) ||
            buildGenericTemplate(agr.code, agr.title, employee);
          const { blob, filename } = generateLetterPDF(prepCompany, employee, tpl, prepAssets);
          appSignedFolder?.file(filename, blob);
          totalFilesAdded++;
        }
      }

      // Helper to detect true format and extension from payload magic bytes / data URI
      const detectFileExtensionAndData = (
        rawSrc: string,
        origName: string
      ): { ext: string; base64Payload: string | null; isRemoteUrl: boolean } => {
        let ext = "";
        let base64Payload: string | null = null;
        let isRemoteUrl = false;

        const cleanOrigName = (origName || "document").trim();
        const origExtMatch = cleanOrigName.match(/\.(png|jpe?g|webp|pdf|docx?)$/i);
        const origExt = origExtMatch ? origExtMatch[0].toLowerCase() : "";

        if (rawSrc.startsWith("data:")) {
          const commaIdx = rawSrc.indexOf(",");
          const header = commaIdx !== -1 ? rawSrc.slice(0, commaIdx).toLowerCase() : "";
          base64Payload = commaIdx !== -1 ? rawSrc.slice(commaIdx + 1) : "";

          if (header.includes("image/png") || base64Payload.startsWith("iVBORw0KGgo")) {
            ext = ".png";
          } else if (header.includes("image/jpeg") || header.includes("image/jpg") || base64Payload.startsWith("/9j/")) {
            ext = ".jpg";
          } else if (header.includes("image/webp") || base64Payload.startsWith("UklGR")) {
            ext = ".webp";
          } else if (header.includes("application/pdf") || base64Payload.startsWith("JVBERi0")) {
            ext = ".pdf";
          } else {
            if (base64Payload.startsWith("JVBERi0")) ext = ".pdf";
            else if (base64Payload.startsWith("iVBORw0KGgo")) ext = ".png";
            else if (base64Payload.startsWith("/9j/")) ext = ".jpg";
            else if (base64Payload.startsWith("UklGR")) ext = ".webp";
            else ext = origExt || ".jpg";
          }
        } else if (/^[A-Za-z0-9+/=\r\n]{50,}$/.test(rawSrc.trim())) {
          base64Payload = rawSrc.trim();
          if (base64Payload.startsWith("JVBERi0")) ext = ".pdf";
          else if (base64Payload.startsWith("iVBORw0KGgo")) ext = ".png";
          else if (base64Payload.startsWith("/9j/")) ext = ".jpg";
          else if (base64Payload.startsWith("UklGR")) ext = ".webp";
          else ext = origExt || ".jpg";
        } else {
          isRemoteUrl = true;
          ext = origExt || ".jpg";
        }

        return { ext: ext === ".jpeg" ? ".jpg" : ext, base64Payload, isRemoteUrl };
      };

      for (const doc of uploadedList) {
        const sources: string[] =
          doc.files && doc.files.length > 0
            ? doc.files
            : doc.dataUrl
            ? [doc.dataUrl]
            : [];

        const baseTitle = (doc.name || doc.type || "Document")
          .replace(/\.(png|jpe?g|webp|pdf|docx?)$/i, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .replace(/_+/g, "_")
          .trim() || "document";

        for (let idx = 0; idx < sources.length; idx++) {
          const src = sources[idx];
          if (!src) continue;

          const { ext, base64Payload, isRemoteUrl } = detectFileExtensionAndData(src, doc.name || doc.type || "");
          const finalExt = ext || ".jpg";
          const fileName =
            sources.length > 1
              ? `${baseTitle}_page_${idx + 1}${finalExt}`
              : `${baseTitle}${finalExt}`;

          if (base64Payload) {
            uploadsFolder?.file(fileName, base64Payload, { base64: true });
            totalFilesAdded++;
          } else if (isRemoteUrl) {
            try {
              const res = await fetch(src);
              if (res.ok) {
                const blob = await res.blob();
                let remoteExt = finalExt;
                if (blob.type === "application/pdf") remoteExt = ".pdf";
                else if (blob.type === "image/png") remoteExt = ".png";
                else if (blob.type === "image/jpeg") remoteExt = ".jpg";
                else if (blob.type === "image/webp") remoteExt = ".webp";

                const remoteFileName =
                  sources.length > 1
                    ? `${baseTitle}_page_${idx + 1}${remoteExt}`
                    : `${baseTitle}${remoteExt}`;

                uploadsFolder?.file(remoteFileName, blob);
                totalFilesAdded++;
              }
            } catch (err) {
              console.warn("Failed to fetch remote document file:", fileName, err);
            }
          }
        }
      }

      if (totalFilesAdded === 0) {
        toast.warning("No verified signed documents or uploaded files found to download.");
        return;
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const safeName = (employee.name || "employee")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
      const zipFileName = `${safeName || "employee"}_documents.zip`;

      saveAs(zipBlob, zipFileName);
      toast.success(`Downloaded ${zipFileName} (${totalFilesAdded} document${totalFilesAdded > 1 ? "s" : ""})`);
    } catch (err) {
      console.error("Download ZIP failed:", err);
      toast.error("Failed to generate ZIP. Please try again.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newDoc: EmployeeDocument = {
        id: "edoc-" + crypto.randomUUID().slice(0, 8),
        type: uploadType,
        name: uploadName.trim() || file.name,
        dataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
        verified: true,
      };
      const updatedDocs = [...uploadedList, newDoc];
      updateEmployee(employee.id, { documentsUploaded: updatedDocs });
      toast.success(`Uploaded ${newDoc.name} for ${employee.name}`);
      setUploadName("");
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleVerifyDoc = (docId: string) => {
    const updated = uploadedList.map((d) => (d.id === docId ? { ...d, verified: !d.verified } : d));
    updateEmployee(employee.id, { documentsUploaded: updated });
    toast.success("Document verification status updated");
  };

  const deleteDoc = (docId: string) => {
    const updated = uploadedList.filter((d) => d.id !== docId);
    updateEmployee(employee.id, { documentsUploaded: updated });
    toast.success("Document removed");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full ring-2 ring-primary/30 overflow-hidden bg-primary/10 grid place-items-center text-primary font-bold text-sm">
                {employee.photoDataUrl ? (
                  <img src={employee.photoDataUrl} className="h-full w-full object-cover" alt="" />
                ) : (
                  employee.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{employee.name}</span>
                  <EmploymentTypeBadge type={employee.employmentType} />
                  <Badge variant="outline" className="font-mono text-xs">
                    {employee.empCode}
                  </Badge>
                </DialogTitle>
                <div className="text-xs text-muted-foreground">
                  {employee.designation} · {employee.department}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="rounded-xl text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
            >
              {isDownloadingZip ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isDownloadingZip ? "Generating ZIP..." : "Download ZIP"}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-border pb-2 pt-2">
          <Button
            size="sm"
            variant={activeTab === "signed" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("signed")}
            className="rounded-xl text-xs gap-1.5 font-semibold"
          >
            <FileSignature className="h-3.5 w-3.5 text-primary" />
            <span>App Signed Documents</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === "uploads" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("uploads")}
            className="rounded-xl text-xs gap-1.5 font-semibold"
          >
            <Upload className="h-3.5 w-3.5 text-sky-600" />
            <span>Employee Uploads &amp; KYC ({uploadedList.length})</span>
          </Button>
        </div>

        {/* Tab 1: App Signed Documents */}
        {activeTab === "signed" && (
          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground">
              These documents are signed and acknowledged by the employee directly from their <b>Employee App</b>.
            </div>

            <div className="space-y-2.5">
              {companyAgreements.map((agr) => {
                const isSigned = !!signedDocs[agr.code] || (agr.code === "APT" && employee.acceptance?.signed);
                const sigInfo = signedDocs[agr.code];
                const signedDate = sigInfo?.signedAt || employee.acceptance?.signedAt;
                const sigImage = sigInfo?.signatureDataUrl || employee.acceptance?.signatureDataUrl;

                return (
                  <div
                    key={agr.code}
                    className="p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${isSigned ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/60 text-muted-foreground"}`}>
                        {isSigned ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-foreground flex items-center gap-2">
                          <span>{agr.title}</span>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {agr.code}
                          </Badge>
                        </div>

                        {isSigned ? (
                          <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                            <span>✍️ Signed on Employee App</span>
                            <span>•</span>
                            <span className="text-muted-foreground">
                              {signedDate ? new Date(signedDate).toLocaleString("en-IN") : "Signed"}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-600 font-medium">
                            ⏳ Awaiting Employee Signature in App
                          </div>
                        )}

                        {sigImage && (
                          <div className="pt-1">
                            <img
                              src={sigImage}
                              alt="signature"
                              className="h-9 max-w-[150px] object-contain bg-white rounded border border-border px-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const p = computePayroll({ company, employee, daysWorked: company.workingDaysPerMonth, otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0 });
                          if (agr.code === "APT") {
                            await generateAppointmentPDF(company, employee, p, docAssets);
                          } else {
                            const tpl = DEFAULT_TEMPLATES.find((t) => t.key === agr.key || t.code === agr.code)
                              || buildGenericTemplate(agr.code, agr.title, employee);
                            await downloadLetter(company, employee, tpl, "pdf", docAssets);
                          }
                          toast.success(`${agr.title} PDF downloaded with signature & stamp`);
                        }}
                        className="h-8 text-xs rounded-xl gap-1"
                      >
                        <FileDown className="h-3.5 w-3.5 text-primary" />
                        <span>Download PDF</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Uploaded Files & KYC Proofs */}
        {activeTab === "uploads" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-muted/40 border border-border">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">Upload Additional Employee Document</div>
                <div className="text-[11px] text-muted-foreground">Admin can also attach verification proofs directly.</div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="h-8 text-xs w-36 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                    <SelectItem value="PAN Card">PAN Card</SelectItem>
                    <SelectItem value="Degree Certificate">Degree Certificate</SelectItem>
                    <SelectItem value="Bank Passbook">Bank Passbook</SelectItem>
                    <SelectItem value="Experience Letter">Experience Letter</SelectItem>
                    <SelectItem value="Other">Other Document</SelectItem>
                  </SelectContent>
                </Select>

                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs rounded-xl gap-1 bg-primary text-primary-foreground font-semibold"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Attach File</span>
                </Button>
              </div>
            </div>

            {uploadedList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-border bg-muted/10 space-y-2">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                <div className="text-xs font-semibold">No Documents Uploaded Yet</div>
                <div className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  When the employee uploads their Aadhaar, PAN, degree, or certificates in the mobile app, they will appear here instantly.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uploadedList.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground truncate max-w-[180px]">{doc.name}</div>
                          <div className="text-[10px] text-muted-foreground">{doc.type} · {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[9px] cursor-pointer ${doc.verified ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}
                        onClick={() => toggleVerifyDoc(doc.id)}
                      >
                        {doc.verified ? "✅ Verified" : "⏳ Review"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      {doc.dataUrl ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAdminPreviewPageIndex(0);
                            setPreviewDocModal(doc);
                          }}
                          className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Preview {doc.files && doc.files.length > 1 ? `(${doc.files.length}p)` : ""}
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No preview data</span>
                      )}

                      <div className="flex items-center gap-1">
                        {doc.dataUrl && (
                          <a href={doc.dataUrl} download={doc.name} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-500/10">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteDoc(doc.id)} className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            size="sm"
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="rounded-xl text-xs h-9 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
          >
            {isDownloadingZip ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{isDownloadingZip ? "Generating ZIP..." : "Download All as ZIP"}</span>
          </Button>
          <Button onClick={onClose} variant="outline" className="rounded-xl text-xs h-9 font-semibold w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Sub-Dialog: Full In-App Document Preview (Supports Multi-Page) */}
      {previewDocModal && (
        <Dialog open={!!previewDocModal} onOpenChange={() => setPreviewDocModal(null)}>
          <DialogContent className="max-w-2xl p-6 rounded-3xl border border-border shadow-2xl">
            {(() => {
              const allPages = (previewDocModal.files && previewDocModal.files.length > 0)
                ? previewDocModal.files
                : (previewDocModal.dataUrl ? [previewDocModal.dataUrl] : []);
              const activePageUrl = allPages[adminPreviewPageIndex] || allPages[0] || "";

              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <FileText className="h-5 w-5 text-primary" />
                        <span>{previewDocModal.name}</span>
                      </DialogTitle>
                      {allPages.length > 1 && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          Page {adminPreviewPageIndex + 1} of {allPages.length}
                        </Badge>
                      )}
                    </div>
                    <DialogDescription className="text-xs">
                      {previewDocModal.type} · Uploaded on {new Date(previewDocModal.uploadedAt).toLocaleString()}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="my-3 rounded-2xl overflow-hidden bg-muted/40 border border-border flex flex-col items-center justify-center min-h-[280px] max-h-[60vh] p-2">
                    {activePageUrl && (activePageUrl.startsWith("http") || activePageUrl.startsWith("data:image")) ? (
                      <img
                        src={activePageUrl}
                        alt={`${previewDocModal.name} - Page ${adminPreviewPageIndex + 1}`}
                        className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-xs"
                      />
                    ) : activePageUrl ? (
                      <iframe
                        src={activePageUrl}
                        title={previewDocModal.name}
                        className="w-full h-[50vh] border-none rounded-lg"
                      />
                    ) : (
                      <div className="p-8 text-center text-muted-foreground text-xs">
                        No preview available
                      </div>
                    )}

                    {/* Multi-page Thumbnail & Navigation Strip */}
                    {allPages.length > 1 && (
                      <div className="flex items-center justify-between w-full px-3 py-2 mt-2 border-t border-border bg-background/80 rounded-xl text-xs">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={adminPreviewPageIndex === 0}
                          onClick={() => setAdminPreviewPageIndex((p) => Math.max(0, p - 1))}
                          className="h-7 text-xs px-2"
                        >
                          ◀ Prev
                        </Button>

                        <div className="flex items-center gap-1">
                          {allPages.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setAdminPreviewPageIndex(idx)}
                              className={`h-6 px-2 rounded-md text-[11px] font-bold transition-all ${
                                adminPreviewPageIndex === idx
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              Page {idx + 1}
                            </button>
                          ))}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={adminPreviewPageIndex === allPages.length - 1}
                          onClick={() => setAdminPreviewPageIndex((p) => Math.min(allPages.length - 1, p + 1))}
                          className="h-7 text-xs px-2"
                        >
                          Next ▶
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant={previewDocModal.verified ? "default" : "outline"}
                      onClick={() => {
                        toggleVerifyDoc(previewDocModal.id);
                        setPreviewDocModal({ ...previewDocModal, verified: !previewDocModal.verified });
                      }}
                      className="gap-1.5 text-xs h-8"
                    >
                      {previewDocModal.verified ? "✅ Verified" : "⏳ Mark as Verified"}
                    </Button>

                    <div className="flex items-center gap-2">
                      {activePageUrl && (
                        <a href={activePageUrl} download={`${previewDocModal.name}_page${adminPreviewPageIndex + 1}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="secondary" className="gap-1.5 text-xs h-8">
                            <Download className="h-3.5 w-3.5" /> Download Current Page
                          </Button>
                        </a>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setPreviewDocModal(null)} className="text-xs h-8">
                        Close
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

function StepHead({ icon: Icon, title, subtitle }: { icon: typeof User; title: string; subtitle: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-soft">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  warning,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  warning?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <Label className={`text-xs font-medium ${error ? "text-destructive font-semibold" : "text-foreground/90"}`}>{label}</Label>
      </div>
      <div className="relative">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-10 text-xs sm:text-sm rounded-xl border-border/80 bg-background/70 hover:bg-background focus:bg-background transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary ${
            error
              ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5 text-destructive pr-9 font-medium"
              : warning
              ? "border-amber-500 focus-visible:ring-amber-500/30 bg-amber-500/5 pr-9 font-medium"
              : ""
          }`}
        />
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive pointer-events-none">
            <AlertTriangle className="h-4 w-4" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1.5 animate-in fade-in-50">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && warning && (
        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
          <span>⚠ {warning}</span>
        </p>
      )}
    </div>
  );
}

function FamilyPhotoCard({
  value,
  esiCovered,
  onChange,
  onEsiChange,
}: {
  value?: string;
  esiCovered?: boolean;
  onChange: (url?: string) => void;
  onEsiChange: (val: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onChange(result);
      toast.success("Family photograph attached");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <UsersIcon className="h-4 w-4 text-primary" />
            <span>Family Photo</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group photo of employee and dependent family members for statutory records.
          </p>
        </div>

        {/* ESI Toggle when adding family photo */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/20 shrink-0">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <span className="text-destructive font-bold">*</span>
              <span>ESI Family Medical Scheme</span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 ${
                  esiCovered
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {esiCovered ? "ESI Enrolled" : "Not Enrolled"}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Enroll family for ESIC Pehchan Card dependent healthcare benefits
            </p>
          </div>
          <Switch
            checked={!!esiCovered}
            onCheckedChange={onEsiChange}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {value ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/80">
          <div className="relative h-32 w-48 sm:h-28 sm:w-44 rounded-xl overflow-hidden border border-border shadow-sm shrink-0 bg-muted">
            <img src={value} alt="Family" className="h-full w-full object-cover" />
          </div>
          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground">Family Photo Attached</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This photograph will be attached to the employee&apos;s digital statutory profile and ESIC dependent enrollment dossier.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs bg-card"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3 w-3 mr-1 text-primary" /> Change Photo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => onChange(undefined)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2 group"
        >
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <Upload className="h-4 w-4" />
          </div>
          <div className="text-xs font-semibold text-foreground">Click to upload Family Photo</div>
          <p className="text-[11px] text-muted-foreground max-w-sm">
            Upload clear photo of employee with family members. Supports JPG, PNG, WEBP.
          </p>
        </div>
      )}
    </div>
  );
}

function FamilyMembersManager({
  members,
  onChange,
  isSubmitting = false,
}: {
  members: FamilyMember[];
  onChange: (members: FamilyMember[]) => void;
  isSubmitting?: boolean;
}) {
  const addMember = () => {
    onChange([
      ...members,
      { name: "", relation: "Spouse", aadhaar: "", esiCovered: true },
    ]);
  };

  const updateMember = (index: number, patch: Partial<FamilyMember>) => {
    const next = [...members];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeMember = (index: number) => {
    onChange(members.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <UsersIcon className="h-4 w-4 text-primary" />
            <span>Family Members &amp; Aadhaars</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
              {members.length} {members.length === 1 ? "Member" : "Members"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add multiple family members with relationship and 12-digit Aadhaar for statutory &amp; ESI compliance.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addMember}
          className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Family Member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/80 rounded-xl bg-muted/20">
          <p className="text-xs text-muted-foreground">No family members added yet.</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={addMember}
            className="mt-2 text-xs text-primary font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Family Member
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m, idx) => {
            const cleanAadhaar = String(m.aadhaar || "").replace(/\D/g, "");
            const aadhaarCheck = validateAadhaarFormat(m.aadhaar, isSubmitting);
            const hasError = !aadhaarCheck.valid;

            return (
              <div
                key={idx}
                className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-3 relative group transition-all hover:border-primary/40 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-foreground">{m.name || "Family Member"}</span>
                    {m.relation && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                        {m.relation}
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(idx)}
                    title="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  {/* Name */}
                  <div className="sm:col-span-4">
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      value={m.name || ""}
                      onChange={(e) => updateMember(idx, { name: e.target.value })}
                      className="text-xs h-9 mt-1"
                    />
                  </div>

                  {/* Relation */}
                  <div className="sm:col-span-3">
                    <Label className="text-xs">Relation</Label>
                    <Select
                      value={m.relation || "Spouse"}
                      onValueChange={(val) => updateMember(idx, { relation: val })}
                    >
                      <SelectTrigger className="text-xs h-9 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMERGENCY_RELATIONS.map((rel) => (
                          <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Aadhaar Number */}
                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between">
                      <Label className={`text-xs ${hasError ? "text-destructive font-medium" : ""}`}>
                        Aadhaar Number
                      </Label>
                      {cleanAadhaar.length > 0 && cleanAadhaar.length < 12 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {cleanAadhaar.length}/12
                        </span>
                      )}
                    </div>
                    <div className="relative mt-1">
                      <Input
                        value={m.aadhaar || ""}
                        maxLength={12}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 12);
                          updateMember(idx, { aadhaar: digitsOnly });
                        }}
                        className={`text-xs font-mono tracking-wider h-9 ${
                          hasError
                            ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5 text-destructive"
                            : ""
                        }`}
                      />
                    </div>
                    {hasError && (
                      <p className="text-[10px] text-destructive mt-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>{aadhaarCheck.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs">DOB</Label>
                    <Input
                      type="date"
                      value={m.dob || ""}
                      onChange={(e) => updateMember(idx, { dob: e.target.value })}
                      className="text-xs h-9 mt-1"
                    />
                  </div>
                </div>

                {/* ESI Toggle per family member */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`esi-member-${idx}`}
                      checked={m.esiCovered !== false}
                      onCheckedChange={(checked) => updateMember(idx, { esiCovered: !!checked })}
                    />
                    <Label htmlFor={`esi-member-${idx}`} className="text-xs text-muted-foreground cursor-pointer font-normal">
                      Include in ESIC Dependent Healthcare Card
                    </Label>
                  </div>
                  {cleanAadhaar.length === 12 && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Aadhaar Valid
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function PdfPreviewDialog({
  doc,
  open,
  onClose,
}: {
  doc: { name?: string; dataUrl?: string; fileName?: string; fileSize?: string } | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!doc) return null;

  const isImg =
    doc.dataUrl?.startsWith("data:image/") ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.fileName || doc.dataUrl || "");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 rounded-3xl overflow-hidden border border-border shadow-2xl bg-card">
        <DialogHeader className="px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              <Badge
                variant="outline"
                className={`text-[10px] font-bold shrink-0 ${
                  isImg
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                }`}
              >
                {isImg ? "IMAGE" : "PDF"}
              </Badge>
              <DialogTitle className="text-sm font-semibold truncate text-foreground">
                {doc.name || doc.fileName || "Document Preview"}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {doc.dataUrl && (
                <a
                  href={doc.dataUrl}
                  download={doc.fileName || `${doc.name || "document"}.${isImg ? "png" : "pdf"}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-card">
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </a>
              )}
              <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs">
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 bg-muted/10 p-2 overflow-hidden flex items-center justify-center">
          {doc.dataUrl ? (
            isImg ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={doc.dataUrl}
                  alt={doc.name || doc.fileName || "Document Preview"}
                  className="max-h-full max-w-full object-contain rounded-xl border border-border shadow-md"
                />
              </div>
            ) : (
              <iframe
                src={doc.dataUrl}
                className="w-full h-full rounded-xl border border-border bg-white shadow-inner"
                title={doc.name || "Document Preview"}
              />
            )
          ) : (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              No document preview available.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EducationQualificationsManager({
  items,
  onChange,
}: {
  items: EducationEntry[];
  onChange: (items: EducationEntry[]) => void;
}) {
  const addEntry = () => {
    onChange([
      ...items,
      { level: "", institute: "", year: "", grade: "" },
    ]);
  };

  const updateEntry = (index: number, patch: Partial<EducationEntry>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeEntry = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>Educational Qualifications</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
              {items.length} {items.length === 1 ? "Entry" : "Entries"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Academic degrees, board examinations, diplomas, and higher qualifications.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addEntry}
          className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Qualification
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/80 rounded-xl bg-muted/20">
          <p className="text-xs text-muted-foreground">No qualifications entered yet.</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={addEntry}
            className="mt-2 text-xs text-primary font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Qualification
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-3 relative group transition-all hover:border-primary/40 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-foreground">{it.level || "Qualification"}</span>
                  {it.institute && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                      {it.institute}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntry(idx)}
                  title="Remove qualification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                <div className="sm:col-span-4">
                  <Label className="text-xs">Degree / Level</Label>
                  <Input
                    value={it.level || ""}
                    onChange={(e) => updateEntry(idx, { level: e.target.value })}
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-xs">Institute / University</Label>
                  <Input
                    value={it.institute || ""}
                    onChange={(e) => updateEntry(idx, { institute: e.target.value })}
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Passing Year</Label>
                  <Input
                    value={it.year || ""}
                    maxLength={4}
                    onChange={(e) => updateEntry(idx, { year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    className="text-xs h-9 mt-1 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Grade / CGPA</Label>
                  <Input
                    value={it.grade || ""}
                    onChange={(e) => updateEntry(idx, { grade: e.target.value })}
                    className="text-xs h-9 mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EducationDocumentsManager({
  documents,
  onChange,
  onPreview,
}: {
  documents: EducationDocument[];
  onChange: (docs: EducationDocument[]) => void;
  onPreview?: (doc: EducationDocument) => void;
}) {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addDocumentRow = () => {
    const newDoc: EducationDocument = {
      id: "edudoc-" + crypto.randomUUID().slice(0, 8),
      name: "",
      uploadedAt: new Date().toISOString(),
    };
    onChange([...documents, newDoc]);
  };

  const updateDoc = (index: number, patch: Partial<EducationDocument>) => {
    const next = [...documents];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeDoc = (index: number) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Please upload PDF documents only");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("PDF size exceeds 15 MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const currentDoc = documents[index];
      const autoName = currentDoc.name.trim() || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      updateDoc(index, {
        name: autoName,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        dataUrl,
        uploadedAt: new Date().toISOString(),
      });
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <span>Educational Documents (PDFs)</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
              {documents.filter((d) => !!d.dataUrl).length} Uploaded
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload marksheet and degree certificate PDFs. Enter the document name for every upload.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addDocumentRow}
          className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/80 rounded-xl bg-muted/20">
          <p className="text-xs text-muted-foreground">No educational documents attached yet.</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={addDocumentRow}
            className="mt-2 text-xs text-primary font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc, idx) => (
            <div
              key={doc.id || idx}
              className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-3 relative group transition-all hover:border-primary/40 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-foreground">{doc.name || "Untitled Document"}</span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeDoc(idx)}
                  title="Remove document"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Document Name / Type Box */}
                <div className="sm:col-span-6 space-y-1">
                  <Label className="text-xs font-medium">Document Name / Type *</Label>
                  <Input
                    value={doc.name}
                    onChange={(e) => updateDoc(idx, { name: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                {/* PDF File Upload / Status */}
                <div className="sm:col-span-6 space-y-1">
                  <Label className="text-xs font-medium">Document PDF *</Label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    ref={(el) => { fileInputRefs.current[doc.id || idx] = el; }}
                    className="hidden"
                    onChange={(e) => handleFileUpload(idx, e)}
                  />

                  {doc.dataUrl ? (
                    <div className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg border border-border bg-muted/40 h-9">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30 px-1 py-0 font-bold shrink-0">
                          PDF
                        </Badge>
                        <span className="text-xs font-mono truncate text-foreground" title={doc.fileName}>
                          {doc.fileName || "document.pdf"}
                        </span>
                        {doc.fileSize && (
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                            ({doc.fileSize})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
                          onClick={() => {
                            if (onPreview) onPreview(doc);
                            else if (doc.dataUrl) window.open(doc.dataUrl, "_blank");
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:bg-muted"
                          onClick={() => fileInputRefs.current[doc.id || idx]?.click()}
                          title="Replace PDF"
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRefs.current[doc.id || idx]?.click()}
                      className="w-full h-9 text-xs border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary justify-center gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload PDF File
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorExperienceManager({
  items,
  onChange,
  onPreview,
}: {
  items: ExperienceEntry[];
  onChange: (items: ExperienceEntry[]) => void;
  onPreview?: (doc: { name?: string; fileName?: string; dataUrl?: string; fileSize?: string }) => void;
}) {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addEmployer = () => {
    onChange([
      ...items,
      {
        company: "",
        role: "",
        from: "",
        to: "",
        ctc: undefined,
        payslips: [],
        experienceLetter: undefined,
        appointmentLetter: undefined,
      },
    ]);
  };

  const updateEntry = (index: number, patch: Partial<ExperienceEntry>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeEmployer = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const processFileUpload = (
    file: File,
    allowedTypes: "pdf" | "any",
    onSuccess: (doc: PriorEmployerDoc) => void
  ) => {
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

    if (allowedTypes === "pdf" && !isPdf) {
      toast.error("Please upload PDF document only for Experience Letter");
      return;
    }

    if (!isPdf && !isImage) {
      toast.error("Please upload a PDF or image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15 MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const doc: PriorEmployerDoc = {
        id: "expdoc-" + crypto.randomUUID().slice(0, 8),
        name: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      onSuccess(doc);
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handlePayslipUpload = (empIdx: number, slotIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const entry = items[empIdx];
    processFileUpload(file, "any", (newDoc) => {
      const payslips = [...(entry.payslips || [])];
      payslips[slotIdx] = {
        ...newDoc,
        name: `${entry.company ? entry.company + " - " : ""}Payslip ${slotIdx + 1}`,
      };
      updateEntry(empIdx, { payslips });
    });
    if (e.target) e.target.value = "";
  };

  const removePayslip = (empIdx: number, slotIdx: number) => {
    const entry = items[empIdx];
    const payslips = [...(entry.payslips || [])];
    payslips.splice(slotIdx, 1);
    updateEntry(empIdx, { payslips });
  };

  const handleExperienceLetterUpload = (empIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const entry = items[empIdx];
    processFileUpload(file, "pdf", (newDoc) => {
      updateEntry(empIdx, {
        experienceLetter: {
          ...newDoc,
          name: `${entry.company ? entry.company + " - " : ""}Experience Letter`,
        },
      });
    });
    if (e.target) e.target.value = "";
  };

  const handleAppointmentLetterUpload = (empIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const entry = items[empIdx];
    processFileUpload(file, "any", (newDoc) => {
      updateEntry(empIdx, {
        appointmentLetter: {
          ...newDoc,
          name: `${entry.company ? entry.company + " - " : ""}Appointment Letter`,
        },
      });
    });
    if (e.target) e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>Previous Employers & Verification Documents</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
              {items.length} {items.length === 1 ? "Employer" : "Employers"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record previous work experience, last drawn CTC, payslips, experience letters, and appointment letters.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addEmployer}
          className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Previous Employer
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/80 rounded-2xl bg-muted/20">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No prior experience added</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click below to record previous employment history and upload verification documents.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addEmployer}
            className="mt-3 text-xs border-primary/30 text-primary hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Previous Employer
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((entry, idx) => {
            const expLetterKey = `exp-${idx}-experience-letter`;
            const apptLetterKey = `exp-${idx}-appointment-letter`;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card p-4 space-y-4 relative shadow-sm"
              >
                {/* Employer Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {entry.company || `Previous Employer #${idx + 1}`}
                      </div>
                      {entry.role && (
                        <div className="text-xs text-muted-foreground">
                          {entry.role}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeEmployer(idx)}
                    title="Remove employer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Primary Employer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Company Name *</Label>
                    <Input
                      value={entry.company || ""}
                      onChange={(e) => updateEntry(idx, { company: e.target.value })}
                      className="text-xs h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Designation / Role *</Label>
                    <Input
                      value={entry.role || ""}
                      onChange={(e) => updateEntry(idx, { role: e.target.value })}
                      className="text-xs h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Last Drawn CTC (₹ / annum)</Label>
                    <Input
                      type="number"
                      value={entry.ctc ?? ""}
                      onChange={(e) => updateEntry(idx, { ctc: e.target.value ? Number(e.target.value) : undefined })}
                      className="text-xs h-9 mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">From Date</Label>
                    <Input
                      type="date"
                      value={entry.from || ""}
                      onChange={(e) => updateEntry(idx, { from: e.target.value })}
                      className="text-xs h-9 mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">To Date</Label>
                    <Input
                      type="date"
                      value={entry.to || ""}
                      onChange={(e) => updateEntry(idx, { to: e.target.value })}
                      className="text-xs h-9 mt-1 font-mono"
                    />
                  </div>
                </div>

                {/* Verification Documents Container */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Verification Documents
                    </span>
                    <span className="text-[11px] text-muted-foreground">PDF or Photos (Max 15MB)</span>
                  </div>

                  {/* 1. Last 3 Payslips Section */}
                  <div className="space-y-2 rounded-xl bg-muted/20 border border-border/70 p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-2">
                        <span>Last 3 Payslips from previous company</span>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          {(entry.payslips || []).filter((p) => !!p?.dataUrl).length}/3 Uploaded
                        </Badge>
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Photo or PDF</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[0, 1, 2].map((slotIdx) => {
                        const slotDoc = (entry.payslips || [])[slotIdx];
                        const payslipInputKey = `exp-${idx}-payslip-${slotIdx}`;
                        const isSlotImg =
                          slotDoc?.dataUrl?.startsWith("data:image/") ||
                          /\.(png|jpe?g|webp|gif|svg)$/i.test(slotDoc?.fileName || slotDoc?.dataUrl || "");

                        return (
                          <div key={slotIdx} className="space-y-1">
                            <input
                              type="file"
                              accept="application/pdf,image/*,.pdf"
                              ref={(el) => {
                                fileInputRefs.current[payslipInputKey] = el;
                              }}
                              className="hidden"
                              onChange={(e) => handlePayslipUpload(idx, slotIdx, e)}
                            />

                            <div className="text-[11px] font-medium text-muted-foreground">
                              {slotIdx === 0 ? "Payslip 1 (Latest)" : `Payslip ${slotIdx + 1}`}
                            </div>

                            {slotDoc?.dataUrl ? (
                              <div className="p-2 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 font-bold shrink-0 ${
                                      isSlotImg
                                        ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                        : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                    }`}
                                  >
                                    {isSlotImg ? "PHOTO" : "PDF"}
                                  </Badge>
                                  <span className="text-[11px] font-mono truncate text-foreground flex-1" title={slotDoc.fileName}>
                                    {slotDoc.fileName || `Payslip ${slotIdx + 1}`}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                                  <span>{slotDoc.fileSize || "Attached"}</span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                                      onClick={() => {
                                        if (onPreview) onPreview(slotDoc);
                                        else if (slotDoc.dataUrl) window.open(slotDoc.dataUrl, "_blank");
                                      }}
                                    >
                                      <Eye className="h-3 w-3 mr-0.5" /> View
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-1 text-[10px] text-muted-foreground hover:bg-muted"
                                      onClick={() => fileInputRefs.current[payslipInputKey]?.click()}
                                      title="Replace"
                                    >
                                      <Upload className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-1 text-[10px] text-muted-foreground hover:text-destructive"
                                      onClick={() => removePayslip(idx, slotIdx)}
                                      title="Remove"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRefs.current[payslipInputKey]?.click()}
                                className="w-full h-14 text-xs border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-primary/5 text-muted-foreground hover:text-primary flex flex-col items-center justify-center gap-0.5"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                <span className="text-[10px]">Upload {slotIdx === 0 ? "Payslip 1" : `Payslip ${slotIdx + 1}`}</span>
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Experience Letter & Appointment Letter (Side by Side) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Experience Letter (PDF Only) */}
                    <div className="space-y-1.5 rounded-xl bg-muted/20 border border-border/70 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <span>Experience Letter</span>
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30 font-bold">
                            PDF ONLY
                          </Badge>
                        </Label>
                      </div>

                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        ref={(el) => {
                          fileInputRefs.current[expLetterKey] = el;
                        }}
                        className="hidden"
                        onChange={(e) => handleExperienceLetterUpload(idx, e)}
                      />

                      {entry.experienceLetter?.dataUrl ? (
                        <div className="p-2 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold shrink-0 bg-rose-500/10 text-rose-600 border-rose-500/30">
                              PDF
                            </Badge>
                            <span className="text-[11px] font-mono truncate text-foreground flex-1" title={entry.experienceLetter.fileName}>
                              {entry.experienceLetter.fileName || "experience_letter.pdf"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                            <span>{entry.experienceLetter.fileSize || "Attached"}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                                onClick={() => {
                                  if (onPreview) onPreview(entry.experienceLetter!);
                                  else if (entry.experienceLetter?.dataUrl) window.open(entry.experienceLetter.dataUrl, "_blank");
                                }}
                              >
                                <Eye className="h-3 w-3 mr-0.5" /> View
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1 text-[10px] text-muted-foreground hover:bg-muted"
                                onClick={() => fileInputRefs.current[expLetterKey]?.click()}
                                title="Replace"
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1 text-[10px] text-muted-foreground hover:text-destructive"
                                onClick={() => updateEntry(idx, { experienceLetter: undefined })}
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.current[expLetterKey]?.click()}
                          className="w-full h-14 text-xs border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-primary/5 text-muted-foreground hover:text-primary flex flex-col items-center justify-center gap-0.5"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span className="text-[10px]">Upload Experience Letter (PDF)</span>
                        </Button>
                      )}
                    </div>

                    {/* Appointment Letter (Photo or PDF) */}
                    <div className="space-y-1.5 rounded-xl bg-muted/20 border border-border/70 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <span>Appointment Letter</span>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            Photo or PDF
                          </Badge>
                        </Label>
                      </div>

                      <input
                        type="file"
                        accept="application/pdf,image/*,.pdf"
                        ref={(el) => {
                          fileInputRefs.current[apptLetterKey] = el;
                        }}
                        className="hidden"
                        onChange={(e) => handleAppointmentLetterUpload(idx, e)}
                      />

                      {entry.appointmentLetter?.dataUrl ? (
                        (() => {
                          const isApptImg =
                            entry.appointmentLetter.dataUrl?.startsWith("data:image/") ||
                            /\.(png|jpe?g|webp|gif|svg)$/i.test(entry.appointmentLetter.fileName || entry.appointmentLetter.dataUrl || "");

                          return (
                            <div className="p-2 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 font-bold shrink-0 ${
                                    isApptImg
                                      ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                      : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                  }`}
                                >
                                  {isApptImg ? "PHOTO" : "PDF"}
                                </Badge>
                                <span className="text-[11px] font-mono truncate text-foreground flex-1" title={entry.appointmentLetter.fileName}>
                                  {entry.appointmentLetter.fileName || "appointment_letter"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                                <span>{entry.appointmentLetter.fileSize || "Attached"}</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                                    onClick={() => {
                                      if (onPreview) onPreview(entry.appointmentLetter!);
                                      else if (entry.appointmentLetter?.dataUrl) window.open(entry.appointmentLetter.dataUrl, "_blank");
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-0.5" /> View
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1 text-[10px] text-muted-foreground hover:bg-muted"
                                    onClick={() => fileInputRefs.current[apptLetterKey]?.click()}
                                    title="Replace"
                                  >
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1 text-[10px] text-muted-foreground hover:text-destructive"
                                    onClick={() => updateEntry(idx, { appointmentLetter: undefined })}
                                    title="Remove"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.current[apptLetterKey]?.click()}
                          className="w-full h-14 text-xs border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-primary/5 text-muted-foreground hover:text-primary flex flex-col items-center justify-center gap-0.5"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span className="text-[10px]">Upload Appointment Letter (PDF/Photo)</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Col<T> = { key: keyof T & string; label: string; type?: string; placeholder?: string };
function RepeatingList<T extends Record<string, unknown>>({
  label, items, empty, onChange, columns,
}: { label: string; items: T[]; empty: T; onChange: (next: T[]) => void; columns: Col<T>[] }) {
  const update = (i: number, patch: Partial<T>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        <Button size="sm" variant="outline" onClick={() => onChange([...(items ?? []), { ...empty }])}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">No entries yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 items-end" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr)) auto` }}>
              {columns.map((c) => (
                <div key={c.key}>
                  <Label className="text-[11px] text-muted-foreground">{c.label}</Label>
                  <Input
                    type={c.type ?? "text"}
                    value={String(it[c.key] ?? "")}
                    placeholder={c.placeholder}
                    onChange={(e) => update(i, { [c.key]: c.type === "number" ? (Number(e.target.value) || 0) : e.target.value } as Partial<T>)}
                  />
                </div>
              ))}
              <Button size="icon" variant="ghost" onClick={() => onChange(items.filter((_, x) => x !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditEmployeeDialog({ employee, open, onClose }: { employee: Employee | null; open: boolean; onClose: () => void }) {
  const { updateEmployee, company, roles, employees, devices } = useStore();
  const [form, setForm] = useState<Partial<Employee>>({});
  const [activeTab, setActiveTab] = useState<"identity" | "employment" | "address_kyc" | "branches_policy" | "family_edu" | "experience_skills" | "compliance">("identity");

  useEffect(() => {
    if (employee) {
      setForm({ ...employee });
    }
  }, [employee]);

  const editDupCheck = useMemo(() => {
    if (!employee) return { hasDuplicate: false, conflicts: [], byField: {} };
    return findEmployeeDuplicates(form, employees, employee.id);
  }, [form, employees, employee]);

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [previewPdfModal, setPreviewPdfModal] = useState<{ name?: string; fileName?: string; dataUrl?: string; fileSize?: string } | null>(null);

  const handlePincodeChange = async (pinValue: string) => {
    const cleanPin = pinValue.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await lookupPincode(cleanPin);
        if (res) {
          setForm((prev) => ({
            ...prev,
            pincode: cleanPin,
            city: res.city || prev.city,
            state: res.state || prev.state,
            country: "India",
          }));
          toast.success(`Auto-detected ${res.city}, ${res.state} for PIN ${cleanPin}`);
        } else {
          toast.info(`PIN ${cleanPin} entered. Please select State and City.`);
        }
      } catch (err) {
        console.error("Pincode lookup error:", err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  if (!employee) return null;

  const handleSave = async () => {
    if (!form.name?.trim() || !form.empCode?.trim()) {
      return toast.error("Full Name and Employee Code are required");
    }

    const panCheck = validatePanFormat(form.pan);
    if (!panCheck.valid) return toast.error(panCheck.message);
    const aadhaarCheck = validateAadhaarFormat(form.aadhaar);
    if (!aadhaarCheck.valid) return toast.error(aadhaarCheck.message);
    const dlCheck = validateDrivingLicenseFormat(form.drivingLicense);
    if (!dlCheck.valid) return toast.error(dlCheck.message);
    const voterCheck = validateVoterIdFormat(form.voterId);
    if (!voterCheck.valid) return toast.error(voterCheck.message);
    const rcCheck = validateRationCardFormat(form.rationCard);
    if (!rcCheck.valid) return toast.error(rcCheck.message);
    const bankCheck = validateBankAccountFormat(form.bankAcc);
    if (!bankCheck.valid) return toast.error(bankCheck.message);

    for (const m of form.family || []) {
      if (m.aadhaar) {
        const chk = validateAadhaarFormat(m.aadhaar, true);
        if (!chk.valid) return toast.error(`${m.name || "Family member"}: ${chk.message}`);
      }
    }

    for (const d of form.educationDocuments || []) {
      if (d.dataUrl && !d.name.trim()) {
        return toast.error("Please enter a name for all uploaded education documents");
      }
    }

    if (editDupCheck.hasDuplicate) {
      return toast.error(`Already in database: ${editDupCheck.conflicts[0].message}`);
    }

    const activeTenantId = useAuth.getState().activeTenantId || (company as any).id;
    if (activeTenantId && !activeTenantId.startsWith("demo-tenant-")) {
      const remoteDup = await checkEmployeeDuplicatesRemote(activeTenantId, form, employee.id);
      if (remoteDup.hasDuplicate) {
        return toast.error(`Already in database: ${remoteDup.conflicts[0].message}`);
      }
    }

    updateEmployee(employee.id, { ...form, faceRegistered: !!form.photoDataUrl || form.faceRegistered });
    toast.success(`${form.name} updated successfully`);
    onClose();
  };

  const tabs = [
    { id: "identity", label: "Profile & Identity", icon: User },
    { id: "employment", label: "Employment & Salary", icon: Briefcase },
    { id: "address_kyc", label: "KYC", icon: FileCheck },
    { id: "branches_policy", label: "Branches & Policy", icon: Building2 },
    { id: "family_edu", label: "Family & Education", icon: GraduationCap },
    { id: "experience_skills", label: "Experience & Skills", icon: Award },
    { id: "compliance", label: "Compliance & BGV", icon: ShieldCheck },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-primary/25 shadow-2xl bg-card/95 backdrop-blur-xl transition-colors">
        {/* Theme-Adaptive Gradient Header */}
        <div className="px-6 pt-5 pb-4 border-b border-primary/15 shrink-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg sm:text-xl font-display font-bold flex items-center gap-3 text-foreground">
                <div className="h-10 w-10 rounded-2xl bg-gradient-brand text-white flex items-center justify-center shrink-0 shadow-glow ring-2 ring-primary/20">
                  <Pencil className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Edit Employee: {employee.name}</span>
                    <Badge variant="outline" className="text-xs font-mono font-semibold border-primary/30 text-primary bg-primary/10">
                      {employee.empCode}
                    </Badge>
                    <EmploymentTypeBadge type={employee.employmentType} size="sm" />
                  </div>
                </div>
              </DialogTitle>
              {renderEmployeeStatusBadge(form.status)}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Modify employee profile, statutory KYC, compensation, shift rules, geofencing, or background verification.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Tab Strip with animated sliding pill */}
        <div className="px-6 pt-3 shrink-0 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 relative">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                    active
                      ? "text-primary-foreground font-bold shadow-glow"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="editEmpTabPill"
                      className="absolute inset-0 bg-gradient-brand rounded-xl"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon className="h-3.5 w-3.5 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* TAB 1: PROFILE & IDENTITY */}
              {activeTab === "identity" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo & System Credentials</div>
                      <span className="text-[11px] text-primary font-medium bg-primary/10 px-2.5 py-0.5 rounded-full">
                        Face registration is optional here (completed on mobile app)
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <PhotoCapture
                        value={form.photoDataUrl}
                        onChange={(u) => setForm({ ...form, photoDataUrl: u, faceRegistered: !!u })}
                        name={form.name}
                        size="lg"
                      />
                      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Full Name *</Label>
                          <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                          <Label className={`text-xs ${editDupCheck.byField.empCode ? "text-destructive font-medium" : ""}`}>Employee Code *</Label>
                          <Input
                            value={form.empCode || ""}
                            onChange={(e) => setForm({ ...form, empCode: e.target.value })}
                            className={editDupCheck.byField.empCode ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                          />
                          {editDupCheck.byField.empCode && (
                            <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>{editDupCheck.byField.empCode.message}</span>
                            </p>
                          )}
                        </div>
                        <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <KeyRound className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold">Auto-Generated Password</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] bg-card border-border"
                                onClick={() => {
                                  const newP = generateEmployeePassword();
                                  setForm({ ...form, password: newP });
                                  toast.info(`Generated: ${newP}`);
                                }}
                              >
                                <RefreshCw className="h-2.5 w-2.5 mr-1 text-primary" /> Regenerate
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] bg-card border-border"
                                onClick={() => {
                                  if (form.password) {
                                    navigator.clipboard.writeText(form.password);
                                    toast.success("Password copied!");
                                  }
                                }}
                              >
                                <Copy className="h-2.5 w-2.5 mr-1 text-primary" /> Copy
                              </Button>
                            </div>
                          </div>
                          <Input
                            type="text"
                            value={form.password || ""}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Auto-generated password"
                            className="font-mono text-xs font-semibold bg-card border-border h-8"
                          />
                          <p className="text-[10.5px] text-muted-foreground">Credentials and mobile login steps will be automatically sent to the employee's email.</p>
                        </div>
                        <div>
                          <Label className="text-xs">Employee Status</Label>
                          <Select value={form.status || "active"} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="relieved">Releived</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                          {form.status && form.status !== "active" && (
                            <div className="space-y-2 mt-2 p-2.5 rounded-xl bg-muted/40 border border-border">
                              <div>
                                <Label className="text-xs">Status Effective Date</Label>
                                <Input
                                  type="date"
                                  value={form.statusDate || new Date().toISOString().slice(0, 10)}
                                  onChange={(e) => setForm({ ...form, statusDate: e.target.value })}
                                  className="text-xs h-8 mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Status Reason / Note (Optional)</Label>
                                <Textarea
                                  rows={2}
                                  value={form.statusNote || ""}
                                  onChange={(e) => setForm({ ...form, statusNote: e.target.value })}
                                  placeholder="Departure reason / HR remarks..."
                                  className="text-xs mt-1 resize-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Demographics</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Gender</Label>
                        <Select value={form.gender || "male"} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select gender" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Date of Birth</Label>
                        <Input type="date" value={form.dob || ""} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Blood Group</Label>
                        <Select value={form.bloodGroup || ""} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select Blood Group" /></SelectTrigger>
                          <SelectContent>
                            {BLOOD_GROUPS.map((bg) => (
                              <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Marital Status</Label>
                        <Select value={form.maritalStatus || "single"} onValueChange={(v) => setForm({ ...form, maritalStatus: v as any })}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Nationality</Label>
                        <Input value={form.nationality || "Indian"} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Spouse Name (if married)</Label>
                        <Input value={form.spouseName || ""} onChange={(e) => setForm({ ...form, spouseName: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Father's Name</Label>
                        <Input value={form.fatherName || ""} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Mother's Name</Label>
                        <Input value={form.motherName || ""} onChange={(e) => setForm({ ...form, motherName: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Personal Email (Alt)</Label>
                        <Input type="email" value={form.about || ""} onChange={(e) => setForm({ ...form, about: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address Details</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Address Line 1</Label>
                        <Input
                          value={form.addressLine1 || form.address || ""}
                          onChange={(e) => setForm({ ...form, addressLine1: e.target.value, address: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Address Line 2</Label>
                        <Input
                          value={form.addressLine2 || ""}
                          onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input
                          value={form.city || ""}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">State</Label>
                        <Select value={form.state || ""} onValueChange={(v) => setForm({ ...form, state: v })}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select State" /></SelectTrigger>
                          <SelectContent className="max-h-56">
                            {INDIAN_STATES.map((st) => (
                              <SelectItem key={st} value={st}>{st}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Country</Label>
                        <Input
                          value={form.country || "India"}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">PIN</Label>
                          {pincodeLoading && (
                            <span className="text-[11px] text-primary font-medium animate-pulse">Detecting...</span>
                          )}
                        </div>
                        <Input
                          value={form.pincode || ""}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          maxLength={6}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

          {/* TAB 2: EMPLOYMENT & SALARY */}
          {activeTab === "employment" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Assignment & Role</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className={`text-xs ${editDupCheck.byField.email ? "text-destructive font-medium" : ""}`}>Work Email</Label>
                    <Input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={editDupCheck.byField.email ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {editDupCheck.byField.email && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{editDupCheck.byField.email.message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className={`text-xs ${editDupCheck.byField.phone ? "text-destructive font-medium" : ""}`}>Phone Number</Label>
                    <Input
                      type="tel"
                      value={form.phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={editDupCheck.byField.phone ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {editDupCheck.byField.phone && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{editDupCheck.byField.phone.message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <EmploymentTypeSelect
                      label="Employment Type"
                      value={form.employmentType || "Regular"}
                      onChange={(v) => setForm({ ...form, employmentType: v })}
                      triggerClassName="text-xs h-9"
                    />
                  </div>
                  <div>
                    <DepartmentSelect
                      label="Department"
                      value={form.department || ""}
                      onChange={(v) => setForm({ ...form, department: v })}
                      triggerClassName="text-xs h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Designation</Label>
                    <DesignationSelect
                      value={form.designation || ""}
                      onChange={(v) => setForm({ ...form, designation: v })}
                      triggerClassName="text-xs h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Assigned Predefined Role</Label>
                    <Select
                      value={form.roleId || "__none"}
                      onValueChange={(v) => {
                        const selected = (roles || []).find((r: PredefinedRole) => r.id === v);
                        setForm({
                          ...form,
                          roleId: v === "__none" ? undefined : v,
                          roleName: selected ? selected.name : undefined,
                        });
                      }}
                    >
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select Role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Standard / Default —</SelectItem>
                        {(roles || []).map((r: PredefinedRole) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} {r.isSystemDefault ? "(Default)" : "(Custom)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Reporting Manager</Label>
                    <Select
                      value={form.managerId || form.reportingManager || "__none"}
                      onValueChange={(v) => {
                        const m = (employees || []).find((e) => e.id === v || e.name === v);
                        setForm({
                          ...form,
                          managerId: v === "__none" ? undefined : (m?.id || v),
                          reportingManager: v === "__none" ? undefined : (m?.name || v),
                        });
                      }}
                    >
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select Manager" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— None (Top Level) —</SelectItem>
                        {(employees || [])
                          .filter((e) => e.id !== employee.id)
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} ({e.empCode} · {e.designation})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Date of Joining</Label>
                    <Input type="date" value={form.doj || ""} onChange={(e) => setForm({ ...form, doj: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Benefits Eligible Date</Label>
                    <Input type="date" value={form.eligibleDate || form.doj || ""} onChange={(e) => setForm({ ...form, eligibleDate: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Probation End Date</Label>
                    <Input type="date" value={form.probationDate || ""} onChange={(e) => setForm({ ...form, probationDate: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary & Compensation</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-primary">Fixed Salary (Monthly ₹) *</Label>
                    <Input
                      type="number"
                      value={form.fixedSalary ?? form.basic ?? 0}
                      onChange={(e) => {
                        const salaryVal = +e.target.value || 0;
                        const ctcVal = computeCalculatedCtc(company, form, salaryVal);
                        setForm({
                          ...form,
                          fixedSalary: salaryVal,
                          basic: salaryVal,
                          salary: salaryVal,
                          ctc: ctcVal,
                        });
                      }}
                      className="font-bold text-xs h-9 mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-primary">CTC (Monthly ₹) *</Label>
                      {((form.ctc || computeCalculatedCtc(company, form, form.fixedSalary ?? form.basic ?? 0)) > 0) && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ₹{(((form.ctc || computeCalculatedCtc(company, form, form.fixedSalary ?? form.basic ?? 0))) * 12).toLocaleString("en-IN")}/yr
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      value={form.ctc ?? computeCalculatedCtc(company, form, form.fixedSalary ?? form.basic ?? 0)}
                      onChange={(e) => setForm({ ...form, ctc: +e.target.value || 0 })}
                      className="font-bold text-xs h-9 mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">PF Number</Label>
                    <Input
                      value={form.pfNumber || ""}
                      onChange={(e) => setForm({ ...form, pfNumber: e.target.value })}
                      className="text-xs h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${editDupCheck.byField.uan ? "text-destructive font-medium" : ""}`}>UAN Number</Label>
                    <Input
                      value={form.uan || ""}
                      onChange={(e) => setForm({ ...form, uan: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                      className={`text-xs h-9 mt-1 ${editDupCheck.byField.uan ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}`}
                    />
                    {editDupCheck.byField.uan && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{editDupCheck.byField.uan.message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">ESIC Insurance Number</Label>
                    <Input value={form.esic || ""} onChange={(e) => setForm({ ...form, esic: e.target.value })} className="text-xs h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Professional Tax (PT) Reg No</Label>
                    <Input value={form.ptNumber || ""} onChange={(e) => setForm({ ...form, ptNumber: e.target.value })} className="text-xs h-9 mt-1" />
                  </div>
                </div>

                {/* Insurance for Non-ESI Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>Insurance for Non-ESI</span>
                      {form.esiEligible && (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">
                          Covered under ESI
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Commercial medical & accident insurance coverage for employees exempt from statutory ESI scheme.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(form.insuranceForNonEsi ?? (!form.esiEligible && (form.fixedSalary ?? 0) > 21000))}
                    disabled={form.esiEligible}
                    onCheckedChange={(c) => setForm({ ...form, insuranceForNonEsi: c })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KYC & BANK */}
          {activeTab === "address_kyc" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statutory KYC & Government IDs</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className={`text-xs ${editDupCheck.byField.pan || (form.pan && !validatePanFormat(form.pan).valid) ? "text-destructive font-medium" : ""}`}>PAN Card Number</Label>
                    <Input
                      value={form.pan || ""}
                      onChange={(e) => setForm({ ...form, pan: e.target.value.replace(/[\s-]/g, "").toUpperCase().slice(0, 10) })}
                      className={editDupCheck.byField.pan || (form.pan && !validatePanFormat(form.pan).valid) ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {editDupCheck.byField.pan && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{editDupCheck.byField.pan.message}</span>
                      </p>
                    )}
                    {!editDupCheck.byField.pan && form.pan && !validatePanFormat(form.pan).valid && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{validatePanFormat(form.pan).message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className={`text-xs ${editDupCheck.byField.aadhaar || (form.aadhaar && !validateAadhaarFormat(form.aadhaar).valid) ? "text-destructive font-medium" : ""}`}>Aadhaar Card Number</Label>
                    <Input
                      value={form.aadhaar || ""}
                      onChange={(e) => setForm({ ...form, aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                      className={editDupCheck.byField.aadhaar || (form.aadhaar && !validateAadhaarFormat(form.aadhaar).valid) ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {editDupCheck.byField.aadhaar && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{editDupCheck.byField.aadhaar.message}</span>
                      </p>
                    )}
                    {!editDupCheck.byField.aadhaar && form.aadhaar && !validateAadhaarFormat(form.aadhaar).valid && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{validateAadhaarFormat(form.aadhaar).message}</span>
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className={`text-xs ${form.drivingLicense && !validateDrivingLicenseFormat(form.drivingLicense).valid ? "text-destructive font-medium" : ""}`}>Driving License Number (DL)</Label>
                    <Input
                      value={form.drivingLicense || ""}
                      onChange={(e) => setForm({ ...form, drivingLicense: e.target.value.replace(/[\s-]/g, "").toUpperCase().slice(0, 15) })}
                      className={form.drivingLicense && !validateDrivingLicenseFormat(form.drivingLicense).valid ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {form.drivingLicense && !validateDrivingLicenseFormat(form.drivingLicense).valid && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{validateDrivingLicenseFormat(form.drivingLicense).message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className={`text-xs ${form.voterId && !validateVoterIdFormat(form.voterId).valid ? "text-destructive font-medium" : ""}`}>Voter ID (EPIC)</Label>
                    <Input
                      value={form.voterId || ""}
                      onChange={(e) => setForm({ ...form, voterId: e.target.value.replace(/[\s-]/g, "").toUpperCase().slice(0, 10) })}
                      className={form.voterId && !validateVoterIdFormat(form.voterId).valid ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {form.voterId && !validateVoterIdFormat(form.voterId).valid && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{validateVoterIdFormat(form.voterId).message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className={`text-xs ${form.rationCard && !validateRationCardFormat(form.rationCard).valid ? "text-destructive font-medium" : ""}`}>Ration Card</Label>
                    <Input
                      value={form.rationCard || ""}
                      onChange={(e) => setForm({ ...form, rationCard: e.target.value.trim().toUpperCase().slice(0, 20) })}
                      className={form.rationCard && !validateRationCardFormat(form.rationCard).valid ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {form.rationCard && !validateRationCardFormat(form.rationCard).valid && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{validateRationCardFormat(form.rationCard).message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Passport Number</Label>
                    <Input value={form.passportNumber || ""} onChange={(e) => setForm({ ...form, passportNumber: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <Label className="text-xs">PF Number</Label>
                    <Input value={form.pfNumber || ""} onChange={(e) => setForm({ ...form, pfNumber: e.target.value })} />
                  </div>
                  <div>
                    <Label className={`text-xs ${editDupCheck.byField.uan ? "text-destructive font-medium" : ""}`}>UAN Number</Label>
                    <Input
                      value={form.uan || ""}
                      onChange={(e) => setForm({ ...form, uan: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                      className={editDupCheck.byField.uan ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {editDupCheck.byField.uan && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{editDupCheck.byField.uan.message}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bank Account Details (for Direct Deposit)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className={`text-xs ${form.bankAcc && !validateBankAccountFormat(form.bankAcc).valid ? "text-destructive font-medium" : ""}`}>Bank Account Number</Label>
                    <Input
                      value={form.bankAcc || ""}
                      onChange={(e) => setForm({ ...form, bankAcc: e.target.value.replace(/\D/g, "").slice(0, 18) })}
                      className={form.bankAcc && !validateBankAccountFormat(form.bankAcc).valid ? "border-destructive text-destructive bg-destructive/5 font-medium" : ""}
                    />
                    {form.bankAcc && !validateBankAccountFormat(form.bankAcc).valid && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{validateBankAccountFormat(form.bankAcc).message}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">IFSC Code</Label>
                    <Input value={form.bankIfsc || ""} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.replace(/[\s-]/g, "").toUpperCase().slice(0, 11) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Bank Name</Label>
                    <Input value={form.bankName || ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Branch Name</Label>
                    <Input value={form.bankBranch || ""} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BRANCHES & ATTENDANCE POLICIES */}
          {activeTab === "branches_policy" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Assigned Branches & Geofences
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select branches where this employee is authorized to mark attendance.
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => {
                        const allIds = (company.branches ?? []).map((b) => b.id);
                        setForm({ ...form, branchIds: allIds, branchId: form.branchId || allIds[0] });
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setForm({ ...form, branchIds: [], branchId: undefined })}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(company.branches ?? []).map((b) => {
                    const currentSelectedIds = getEmployeeBranchIds(form);
                    const isSelected = currentSelectedIds.includes(b.id);
                    const isPrimary = (form.branchId || currentSelectedIds[0]) === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          let nextIds: string[];
                          if (isSelected) {
                            nextIds = currentSelectedIds.filter((id) => id !== b.id);
                          } else {
                            nextIds = [...currentSelectedIds, b.id];
                          }
                          const nextPrimary = isPrimary
                            ? (nextIds[0] || undefined)
                            : (form.branchId || nextIds[0] || undefined);
                          setForm({ ...form, branchIds: nextIds, branchId: nextPrimary });
                        }}
                        className={`cursor-pointer rounded-xl border p-2.5 transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-card hover:bg-muted/30 opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}}
                            className="pointer-events-none"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium flex items-center gap-1.5 truncate">
                              <Building2 className="h-3 w-3 text-primary shrink-0" />
                              <span className="truncate">{b.name}</span>
                              {b.isHead && <Badge className="bg-primary text-primary-foreground text-[8px] px-1 py-0">HQ</Badge>}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {b.city || b.state || b.address}
                              {b.lat != null && b.lng != null && (
                                <span className="text-emerald-600 ml-1 font-mono">
                                  ({b.radiusMeters ?? 150}m geo)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isPrimary && isSelected && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1 py-0">Primary</Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] font-mono">{b.code}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {getEmployeeBranchIds(form).length > 1 && (
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs">
                    <span className="font-medium text-xs flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" /> Primary Branch:
                    </span>
                    <Select
                      value={form.branchId || getEmployeeBranchIds(form)[0] || "__none"}
                      onValueChange={(v) => setForm({ ...form, branchId: v === "__none" ? undefined : v })}
                    >
                      <SelectTrigger className="h-7 w-44 text-xs bg-background">
                        <SelectValue placeholder="Select primary" />
                      </SelectTrigger>
                      <SelectContent>
                        {(company.branches ?? [])
                          .filter((b) => getEmployeeBranchIds(form).includes(b.id))
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance Shift & Timing Policy</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Assigned Shift</Label>
                    <Select value={form.shiftId || "gen"} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select shift" /></SelectTrigger>
                      <SelectContent>
                        {(company.shifts || []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <Label className="text-xs">Morning Grace Period</Label>
                    <Select
                      value={form.graceTime || "15"}
                      onValueChange={(v: any) => setForm({ ...form, graceTime: v })}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select grace time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Always (Flexible)</SelectItem>
                        <SelectItem value="10">10 mins</SelectItem>
                        <SelectItem value="15">15 mins (Default)</SelectItem>
                        <SelectItem value="20">20 mins</SelectItem>
                        <SelectItem value="25">25 mins</SelectItem>
                        <SelectItem value="30">30 mins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Afternoon Login Time</Label>
                    <Input
                      type="time"
                      value={form.halfDayLoginTime || "12:00"}
                      onChange={(e) => setForm({ ...form, halfDayLoginTime: e.target.value })}
                      disabled={form.allowHalfDayLogin === false || form.graceTime === "always"}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Afternoon Grace Period</Label>
                    <Select
                      value={form.afternoonGraceTime || "15"}
                      onValueChange={(v: any) => setForm({ ...form, afternoonGraceTime: v })}
                      disabled={form.allowHalfDayLogin === false || form.graceTime === "always"}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Afternoon grace" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Always (Flexible)</SelectItem>
                        <SelectItem value="10">10 mins</SelectItem>
                        <SelectItem value="15">15 mins (Default)</SelectItem>
                        <SelectItem value="20">20 mins</SelectItem>
                        <SelectItem value="25">25 mins</SelectItem>
                        <SelectItem value="30">30 mins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> Geofencing Verification
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {form.geofencingEnabled !== false ? "Strict geofence radius check active." : "Bypassed (Facial recognition only)."}
                      </p>
                    </div>
                    <Switch
                      checked={form.geofencingEnabled !== false}
                      onCheckedChange={(checked) => setForm({ ...form, geofencingEnabled: checked })}
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 text-purple-600" /> Allow Afternoon / Half-Day Login
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {form.allowHalfDayLogin !== false ? "Can login for afternoon session if morning is missed." : "Locked for full day."}
                      </p>
                    </div>
                    <Switch
                      checked={form.allowHalfDayLogin !== false}
                      onCheckedChange={(checked) => setForm({ ...form, allowHalfDayLogin: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Biometric Attendance & Multi-Device Mapping */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-primary" />
                      <span>Biometric Terminal Attendance</span>
                      <Badge variant="outline" className={`text-[10px] ${form.biometricEnabled ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                        {form.biometricEnabled ? "Biometric Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Map one or multiple physical biometric machines to this employee by Device Serial Number (SN) and Biometric User ID.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="biometric-toggle-edit" className="text-xs font-semibold cursor-pointer">
                      {form.biometricEnabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id="biometric-toggle-edit"
                      checked={form.biometricEnabled === true}
                      onCheckedChange={(checked) => {
                        const defaultMappings: BiometricDeviceMapping[] = (form.biometricMappings && form.biometricMappings.length > 0)
                          ? form.biometricMappings
                          : [{
                              id: "bm-" + Date.now(),
                              deviceSn: (devices && devices[0]?.serialNumber) || "",
                              biometricEmpCode: form.empCode || "",
                              deviceName: (devices && devices[0]?.name) || "",
                            }];
                        setForm({
                          ...form,
                          biometricEnabled: checked,
                          biometricMappings: checked ? defaultMappings : form.biometricMappings,
                        });
                      }}
                    />
                  </div>
                </div>

                {form.biometricEnabled && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Assigned Biometric Terminals ({form.biometricMappings?.length || 0})
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => {
                          const newMapping: BiometricDeviceMapping = {
                            id: "bm-" + Date.now(),
                            deviceSn: (devices && devices[0]?.serialNumber) || "",
                            biometricEmpCode: form.empCode || "",
                            deviceName: (devices && devices[0]?.name) || "",
                          };
                          setForm({
                            ...form,
                            biometricMappings: [...(form.biometricMappings || []), newMapping],
                          });
                        }}
                      >
                        <Plus className="h-3 w-3" /> Add Another Biometric Device
                      </Button>
                    </div>

                    {(!form.biometricMappings || form.biometricMappings.length === 0) ? (
                      <div className="p-4 rounded-xl border border-dashed text-xs text-muted-foreground text-center">
                        No biometric devices mapped yet. Click "+ Add Another Biometric Device" to link this employee to a terminal.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {form.biometricMappings.map((m, idx) => (
                          <div key={m.id || idx} className="p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-all space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                <Fingerprint className="h-3.5 w-3.5 text-primary" /> Biometric Device #{idx + 1}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  const next = (form.biometricMappings || []).filter((_, i) => i !== idx);
                                  setForm({ ...form, biometricMappings: next });
                                }}
                                title="Remove Device Mapping"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <Label className="text-[11px] font-medium">Device Serial Number (SN) *</Label>
                                <div className="space-y-1">
                                  <Input
                                    placeholder="e.g. SN-ZK101"
                                    value={m.deviceSn || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const matchedDev = (devices || []).find((d: Device) => d.serialNumber === val);
                                      const next = [...(form.biometricMappings || [])];
                                      next[idx] = {
                                        ...next[idx],
                                        deviceSn: val,
                                        deviceName: matchedDev ? matchedDev.name : next[idx].deviceName,
                                      };
                                      setForm({ ...form, biometricMappings: next });
                                    }}
                                    className="h-8 text-xs font-mono"
                                  />
                                  {(devices || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(devices || []).slice(0, 3).map((d: Device) => (
                                        <button
                                          key={d.id}
                                          type="button"
                                          onClick={() => {
                                            const next = [...(form.biometricMappings || [])];
                                            next[idx] = { ...next[idx], deviceSn: d.serialNumber, deviceName: d.name };
                                            setForm({ ...form, biometricMappings: next });
                                          }}
                                          className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted font-mono"
                                        >
                                          {d.name ? `${d.name} (${d.serialNumber})` : d.serialNumber}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <Label className="text-[11px] font-medium">Employee Code on Biometric *</Label>
                                <Input
                                  placeholder="e.g. 101 or User PIN"
                                  value={m.biometricEmpCode || ""}
                                  onChange={(e) => {
                                    const next = [...(form.biometricMappings || [])];
                                    next[idx] = { ...next[idx], biometricEmpCode: e.target.value };
                                    setForm({ ...form, biometricMappings: next });
                                  }}
                                  className="h-8 text-xs font-mono font-semibold text-primary"
                                />
                                <p className="text-[9.5px] text-muted-foreground mt-0.5">Machine User ID / PIN</p>
                              </div>

                              <div>
                                <Label className="text-[11px] font-medium">Device Label / Location (Optional)</Label>
                                <Input
                                  placeholder="e.g. Main Gate Terminal"
                                  value={m.deviceName || ""}
                                  onChange={(e) => {
                                    const next = [...(form.biometricMappings || [])];
                                    next[idx] = { ...next[idx], deviceName: e.target.value };
                                    setForm({ ...form, biometricMappings: next });
                                  }}
                                  className="h-8 text-xs"
                                />
                                <p className="text-[9.5px] text-muted-foreground mt-0.5">Friendly machine name</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statutory Deductions & Employee App Eligibility</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                    <Checkbox
                      checked={form.pfEligible ?? true}
                      onCheckedChange={(c) => setForm({ ...form, pfEligible: !!c })}
                    />
                    <span>PF (Provident Fund)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                    <Checkbox
                      checked={form.esiEligible ?? false}
                      onCheckedChange={(c) => {
                        const esiEligible = !!c;
                        const nextForm = {
                          ...form,
                          esiEligible,
                          insuranceForNonEsi: !esiEligible ? form.insuranceForNonEsi : false,
                        };
                        const ctcVal = computeCalculatedCtc(company, nextForm, form.fixedSalary ?? form.basic ?? 0);
                        setForm({ ...nextForm, ctc: ctcVal });
                      }}
                    />
                    <span>ESI (Medical)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                    <Checkbox
                      checked={form.ptEligible ?? true}
                      onCheckedChange={(c) => setForm({ ...form, ptEligible: !!c })}
                    />
                    <span>Prof. Tax (PT)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                    <Checkbox
                      checked={form.tdsEligible ?? false}
                      onCheckedChange={(c) => setForm({ ...form, tdsEligible: !!c })}
                    />
                    <span>TDS (Tax)</span>
                  </label>
                </div>

                {/* Insurance for Non-ESI Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 mt-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>Insurance for Non-ESI</span>
                      {form.esiEligible && (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">
                          Covered under ESI
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Commercial medical & accident insurance coverage for employees exempt from statutory ESI scheme.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(form.insuranceForNonEsi ?? (!form.esiEligible && (form.fixedSalary ?? 0) > 21000))}
                    disabled={form.esiEligible}
                    onCheckedChange={(c) => setForm({ ...form, insuranceForNonEsi: c })}
                  />
                </div>

                <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-4 mt-2">
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-2">
                      <span>Leave Apply Eligibility in Mobile App</span>
                      <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary">Mobile App Control</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      When unchecked, leave application submission is disabled on the employee's mobile device.
                    </p>
                  </div>
                  <Checkbox
                    checked={form.leaveApplyEligible ?? true}
                    onCheckedChange={(c) => setForm({ ...form, leaveApplyEligible: !!c })}
                    className="h-5 w-5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FAMILY & EDUCATION */}
          {activeTab === "family_edu" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Emergency Contact Details</span>
                  <span className="text-[11px] text-primary lowercase tracking-normal">Primary emergency reach</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Emergency Contact Person</Label>
                    <Input
                      value={form.emergencyName || ""}
                      onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                      className="text-xs h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Emergency Relation</Label>
                    <Select value={form.emergencyRelation || ""} onValueChange={(v) => setForm({ ...form, emergencyRelation: v })}>
                      <SelectTrigger className="text-xs h-9 mt-1"><SelectValue placeholder="Select Relation" /></SelectTrigger>
                      <SelectContent>
                        {EMERGENCY_RELATIONS.map((rel) => (
                          <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Emergency Contact</Label>
                    <Input
                      type="tel"
                      value={form.emergencyContact || ""}
                      maxLength={10}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm({ ...form, emergencyContact: digits });
                      }}
                      className="text-xs h-9 mt-1 font-mono tracking-wider"
                    />
                  </div>
                </div>
              </div>

              {/* Family Photograph & ESI Card Toggle */}
              <FamilyPhotoCard
                value={form.familyPhotoUrl}
                esiCovered={form.familyPhotoEsiCovered}
                onChange={(url) => setForm({ ...form, familyPhotoUrl: url })}
                onEsiChange={(esi) => setForm({ ...form, familyPhotoEsiCovered: esi })}
              />

              {/* Family Members with Relation and Aadhaar */}
              <FamilyMembersManager
                members={form.family || []}
                onChange={(family) => setForm({ ...form, family })}
              />

              {/* Educational Qualifications List */}
              <EducationQualificationsManager
                items={form.education || []}
                onChange={(education) => setForm({ ...form, education })}
              />

              {/* Education Documents Upload Option (PDFs with Name Type Box) */}
              <EducationDocumentsManager
                documents={form.educationDocuments || []}
                onChange={(educationDocuments) => setForm({ ...form, educationDocuments })}
                onPreview={(doc) => setPreviewPdfModal(doc)}
              />
            </div>
          )}

          {/* TAB 6: EXPERIENCE & SKILLS */}
          {activeTab === "experience_skills" && (
            <div className="space-y-4">
              <PriorExperienceManager
                items={form.experience || []}
                onChange={(experience) => setForm({ ...form, experience })}
                onPreview={(doc) => setPreviewPdfModal(doc)}
              />

              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills & Language Proficiencies</div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Technical / Job Skills (Comma-separated)</Label>
                    <Input
                      value={(form.skills || []).join(", ")}
                      onChange={(e) => setForm({ ...form, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Languages Known (Comma-separated)</Label>
                    <Input
                      value={(form.languagesKnown || []).join(", ")}
                      onChange={(e) => setForm({ ...form, languagesKnown: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Extra Curricular (Comma-separated)</Label>
                    <Input
                      value={(form.extraCurricular || []).join(", ")}
                      onChange={(e) => setForm({ ...form, extraCurricular: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: COMPLIANCE & BGV */}
          {activeTab === "compliance" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Background Verification & Clearances</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Background Check Status</Label>
                    <Select value={form.backgroundCheckStatus || "pending"} onValueChange={(v) => setForm({ ...form, backgroundCheckStatus: v as any })}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">⏳ Pending Verification</SelectItem>
                        <SelectItem value="clear">✅ Verified & Clear</SelectItem>
                        <SelectItem value="flagged">⚠️ Discrepancy / Flagged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Checkbox
                        checked={!!form.policeVerification}
                        onCheckedChange={(c) => setForm({ ...form, policeVerification: !!c })}
                      />
                      <span>Police Verification Submitted</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Checkbox
                        checked={!!form.medicalFitness}
                        onCheckedChange={(c) => setForm({ ...form, medicalFitness: !!c })}
                      />
                      <span>Medical Fitness Certificate Cleared</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Checkbox
                        checked={!!form.ndaSigned}
                        onCheckedChange={(c) => setForm({ ...form, ndaSigned: !!c })}
                      />
                      <span>NDA & Confidentiality Signed</span>
                    </label>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Compliance & HR Special Notes</Label>
                    <Input
                      value={form.complianceNotes || ""}
                      onChange={(e) => setForm({ ...form, complianceNotes: e.target.value })}
                      placeholder="Enter any waivers, verification notes, or audit trail remarks"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-border bg-card/95 backdrop-blur px-6 py-3.5">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs h-9">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} className="rounded-xl text-xs h-9 bg-gradient-brand text-white font-bold shadow-glow">
              <Save className="h-3.5 w-3.5 mr-1.5" /> Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* PDF Document Preview Modal */}
      <PdfPreviewDialog
        doc={previewPdfModal}
        open={!!previewPdfModal}
        onClose={() => setPreviewPdfModal(null)}
      />
    </Dialog>
  );
}

function BulkUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addEmployee, company, employees, roles } = useStore();
  const branches = company.branches || [];
  const shifts = company.shifts || [];
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{
    employees: Omit<Employee, "id">[];
    duplicates: string[];
    errors: string[];
    totalParsed: number;
  } | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        const result = parseEmployeeCsvText(buffer, employees, roles, branches, shifts);
        setParsed(result);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleImport = async () => {
    if (!parsed || parsed.employees.length === 0) {
      return toast.error("No valid employees found in this file.");
    }
    setLoading(true);
    let count = 0;
    const toImport = parsed.employees.filter((emp) => {
      const dupCheck = findEmployeeDuplicates(emp, employees);
      if (dupCheck.hasDuplicate && skipDuplicates) return false;
      return true;
    });

    if (!skipDuplicates) {
      const conflicting = parsed.employees.find((emp) => findEmployeeDuplicates(emp, employees).hasDuplicate);
      if (conflicting) {
        const dupResult = findEmployeeDuplicates(conflicting, employees);
        setLoading(false);
        return toast.error(`Cannot import duplicate employee: ${dupResult.conflicts[0]?.message || "Record already exists in database"}`);
      }
    }

    for (const emp of toImport) {
      addEmployee(emp);
      count++;
    }

    setLoading(false);
    aiNotify({
      title: "✨ Bulk employee import completed",
      body: `${count} employees registered with auto-generated secure credentials. Welcome emails sent to employee addresses. Face registration will be completed by employees upon first mobile app login.`,
      kind: "success",
    });
    toast.success(`✨ Successfully imported ${count} employees in bulk! Welcome emails sent.`);
    onClose();
    setFile(null);
    setParsed(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Bulk Upload Employee List (Excel / CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1 py-2">
          {/* Download template banner */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileDown className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">Prefilled Template with Column Headers & Instructions</div>
                <div className="text-[11px] text-muted-foreground">Download the formatted template with sample data & field guide, enter your records, and upload below.</div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => {
                downloadEmployeeTemplate(company.name);
                toast.success("Excel template downloaded.");
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download Template
            </Button>
          </div>

          {/* Drag and drop file area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-all rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls,.tsv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <div className="font-semibold text-sm">
              {file ? file.name : "Click to select or drag & drop Excel / CSV file"}
            </div>
            <p className="text-xs text-muted-foreground">
              Supports .xlsx, .xls, .csv, .tsv with standard headers (Employee Code, Full Name, Contact, Salary, KYC, Branch, Shift, etc.)
            </p>
          </div>

          {/* Validation & Preview */}
          {parsed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> {parsed.employees.length} valid rows
                  </Badge>
                  {parsed.duplicates.length > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <AlertTriangle className="mr-1 h-3 w-3" /> {parsed.duplicates.length} duplicate codes
                    </Badge>
                  )}
                  {parsed.errors.length > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                      {parsed.errors.length} errors
                    </Badge>
                  )}
                </div>

                {parsed.duplicates.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={skipDuplicates} onCheckedChange={(c) => setSkipDuplicates(!!c)} />
                    <span>Skip duplicate employee codes</span>
                  </label>
                )}
              </div>

              {/* Preview table */}
              <div className="rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-2 pl-3">Code</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Contact</th>
                      <th className="p-2">Department</th>
                      <th className="p-2">Designation</th>
                      <th className="p-2">Fixed Salary</th>
                      <th className="p-2">DOJ</th>
                      <th className="p-2">Branch / Shift</th>
                      <th className="p-2">KYC</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsed.employees.slice(0, 50).map((emp, i) => {
                      const isDup = parsed.duplicates.includes(emp.empCode);
                      const branchObj = branches.find((b) => b.id === emp.branchId);
                      const shiftObj = shifts.find((s) => s.id === emp.shiftId);
                      return (
                        <tr key={i} className={`hover:bg-muted/40 ${isDup ? "bg-amber-500/5" : ""}`}>
                          <td className="p-2 pl-3 font-mono font-medium">{emp.empCode}</td>
                          <td className="p-2 font-medium">
                            <div>{emp.name}</div>
                            {emp.gender && <span className="text-[10px] text-muted-foreground uppercase">{emp.gender} {emp.bloodGroup ? `· ${emp.bloodGroup}` : ""}</span>}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            <div className="font-mono text-[11px]">{emp.phone}</div>
                            <div className="text-[10px] truncate max-w-[120px]">{emp.email}</div>
                          </td>
                          <td className="p-2 text-muted-foreground">{emp.department}</td>
                          <td className="p-2 text-muted-foreground">{emp.designation}</td>
                          <td className="p-2 font-mono">₹{(emp.fixedSalary ?? emp.basic ?? emp.salary ?? 0).toLocaleString()}</td>
                          <td className="p-2 font-mono text-[11px]">{emp.doj}</td>
                          <td className="p-2">
                            <div className="text-[11px] font-medium">{branchObj ? branchObj.name : emp.branchId || "All Branches"}</div>
                            <div className="text-[10px] text-muted-foreground">{shiftObj ? shiftObj.name : emp.shiftId || "General"}</div>
                          </td>
                          <td className="p-2">
                            <div className="font-mono text-[10px]">{emp.pan ? `PAN: ${emp.pan}` : "—"}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{emp.aadhaar ? `UID: ${emp.aadhaar.slice(-4).padStart(emp.aadhaar.length, "•")}` : ""}</div>
                          </td>
                          <td className="p-2">
                            <Badge variant={emp.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">
                              {emp.status || "active"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Employees will be registered without photos. You can easily click &quot;Edit&quot; on any employee later to upload or capture their photo.
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border mt-auto">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || parsed.employees.length === 0 || loading}
            className="bg-gradient-brand text-white shadow-glow"
          >
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Importing..." : `Import ${parsed?.employees?.length ?? 0} Employees`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkDownloadConfirmDialog({
  open,
  onClose,
  companyName,
  employees,
  branches,
  shifts,
  roles,
  devices,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
  employees: Employee[];
  branches: any[];
  shifts: any[];
  roles: any[];
  devices: any[];
}) {
  const [downloading, setDownloading] = useState(false);

  const modules = [
    {
      name: "Profile & Identity",
      icon: User,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      desc: "Employee Code, Full Name, Status, Demographics (DOB, Gender, Blood Group, Marital Status), Nationality, Parents/Spouse info, Personal Email & Emergency Contacts.",
    },
    {
      name: "Employment & Salary",
      icon: Briefcase,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      desc: "Work Email, Mobile, Password, Department, Designation, Predefined Role, Reporting Manager, Date of Joining, Probation Dates, Monthly Fixed Salary, Basic & Statutory Numbers (PF UAN, ESIC, PT).",
    },
    {
      name: "Address & KYC",
      icon: Home,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      desc: "Residential Addresses (Lines 1 & 2, City, State, Pincode), Aadhaar Number, PAN Number, Passport Number, Driving License & Bank Account Direct Deposit Details (Account, IFSC, Branch).",
    },
    {
      name: "Branches & Policy",
      icon: Building2,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      desc: "Authorized Branch Geofences, Primary Branch, Assigned Shifts, Morning/Afternoon Grace Timings, Afternoon Login Permissions, App Leave Permissions, PF/ESI/PT/TDS Eligibilities & Biometric Hardware Mappings.",
    },
    {
      name: "Family & Education",
      icon: GraduationCap,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      desc: "Family Members & Nominees (Relations, DOB, Dependency) and Educational Qualifications (Degrees, Universities/Institutes, Passing Years, Grades/CGPA).",
    },
    {
      name: "Experience & Skills",
      icon: Award,
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      desc: "Prior Employment History (Companies, Designations, Tenures, Last CTC), Verified Technical/Job Skills & Language Proficiencies.",
    },
    {
      name: "Compliance & BGV",
      icon: ShieldCheck,
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      desc: "Background Verification (BGV) Clearance Status, Police Verification, Medical Fitness Certificate, NDA & Confidentiality Agreements, AI Verification Findings, HR Compliance Notes & Final Approvals.",
    },
    {
      name: "Mobile Login Credentials",
      icon: KeyRound,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      desc: "Employee ID, Official Work Email, Phone Number, Mobile Login Password, Assigned Branch & Portal Activation Status.",
    },
  ];

  const handleConfirmDownload = () => {
    try {
      setDownloading(true);
      downloadBulkEmployeesExcel(companyName, employees, branches, shifts, roles, devices);
      toast.success(`Successfully exported ${employees.length} employee records to Excel!`);
      onClose();
    } catch (err) {
      console.error("Bulk download error:", err);
      toast.error("Failed to generate Excel download. Please check the logs.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <span>Bulk Download Employee Master Records</span>
            </DialogTitle>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
              {employees.length} Records Available
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
            Confirming this action will generate and download an exhaustive, multi-tab Microsoft Excel (<strong className="text-foreground font-semibold">.xlsx</strong>) workbook containing the complete master profile for all registered employees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Summary Box */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-primary" /> Included Data Modules (8 Sections + Master)
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Format: Microsoft Excel (.xlsx)
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {modules.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div key={m.name} className="flex items-start gap-3 p-2.5 rounded-xl border border-border/70 bg-card hover:bg-card/80 transition-colors">
                    <div className={`p-1.5 rounded-lg shrink-0 border ${m.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>{idx + 1}. {m.name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{m.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="text-[11.5px] text-muted-foreground">
                <strong className="text-foreground font-medium">Consolidated Master Sheet:</strong> A unified summary tab is also created for easy spreadsheet filtering and pivot analysis.
              </span>
            </div>
          </div>

          {/* Confidentiality Warning */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-xs">Confidential Master Export</div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                This workbook contains sensitive personally identifiable information (PII), bank credentials, and statutory salary figures. Please ensure safe handling and storage.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-3 border-t border-border mt-2">
          <Button variant="outline" onClick={onClose} disabled={downloading} className="rounded-xl text-xs h-9">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDownload}
            disabled={downloading || employees.length === 0}
            className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20"
          >
            {downloading ? (
              <>
                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> Generating Excel...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" /> Download Complete Excel ({employees.length} Records)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

