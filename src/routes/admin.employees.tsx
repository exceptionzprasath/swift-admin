import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, resolveAttendanceProfile, type Employee, type EmployeeDocument, type FamilyMember, type EducationEntry, type ExperienceEntry, type PredefinedRole } from "@/lib/store";
import { computePayroll, inr } from "@/lib/payroll";
import { generateAppointmentPDF } from "@/lib/pdf";
import { DEFAULT_TEMPLATES, downloadLetter, buildGenericTemplate, renderTemplate, buildVars, type LetterKey } from "@/lib/documents";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
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
} from "lucide-react";
import { downloadEmployeeTemplate, parseEmployeeCsvText } from "@/lib/bulk-employee";
import { EmployeeActionsDialog } from "@/components/employee-actions-dialog";
import { toast } from "sonner";
import { aiNotify, setAiGuideMode } from "@/lib/ai-guide-bus";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "Employees · SWIFT" }] }),
  component: EmployeesPage,
});

const empty: Omit<Employee, "id"> = {
  empCode: "",
  password: "",
  name: "",
  email: "",
  phone: "",
  department: "Engineering",
  designation: "",
  doj: new Date().toISOString().slice(0, 10),
  basic: 25000,
  fixedSalary: 25000,
  pfEligible: true,
  esiEligible: false,
  ptEligible: true,
  tdsEligible: false,
  eligibleDate: new Date().toISOString().slice(0, 10),
  probationDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  leaveApplyEligible: true,
  geofencingEnabled: true,
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
  branchId: undefined,
  photoDataUrl: undefined,
};

type SignatureRec = { docCode: string; docTitle: string; letterKey?: string; signatureDataUrl?: string; signedBy?: string };

// Fixed form steps. Every onboarding document is inserted as its own step
// between them, in the professional joining order defined by DOC_INSERT_AFTER.
const FORM_STEPS = [
  { key: "photo", title: "Photo & Identity", icon: Camera },
  { key: "personal", title: "Personal Details", icon: User },
  { key: "address", title: "Address & KYC", icon: Home },
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

function EmployeesPage() {
  const { employees, addEmployee, deleteEmployee, company, docAssets, ensureJourney, docLibrary, advanceJourneyStep, registrationDrafts, saveRegistrationDraft, deleteRegistrationDraft, addAudit, currentUser, roles } = useStore();
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [resumeDraftId, setResumeDraftId] = useState<string | null>(null);
  const [actionEmp, setActionEmp] = useState<Employee | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [docsEmp, setDocsEmp] = useState<Employee | null>(null);
  const [actionKind, setActionKind] = useState<"exit" | "transfer" | "manual">("exit");

  const openWizard = (draftId?: string) => {
    setResumeDraftId(draftId ?? null);
    setOpen(true);
    setAiGuideMode({ active: true, scope: "employee-registration" });
    aiNotify({ title: "SWIFT AI is guiding employee onboarding", body: "Step-by-step registration wizard. Progress auto-saves.", kind: "info" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Employees</h1>
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
            id="trigger-bulk-upload-btn"
            variant="outline"
            className="border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
            onClick={() => setBulkOpen(true)}
            title="Upload Excel or CSV file to import employees without photos"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Bulk Upload
          </Button>

          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setAiGuideMode({ active: false }); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-brand text-white shadow-glow" onClick={() => openWizard()}>
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] max-h-[calc(100vh-40px)] p-0 overflow-hidden">
              <RegistrationWizard key={resumeDraftId ?? "new"} draftId={resumeDraftId} onDone={() => { setOpen(false); setAiGuideMode({ active: false }); }} />
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


      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">Employee</th>
              <th className="p-3">Department</th>
              <th className="p-3">Branch</th>
              <th className="p-3 text-right">Basic</th>
              <th className="p-3 text-right">Monthly CTC</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  No employees yet. Click <b>Add Employee</b> to start the guided registration.
                </td>
              </tr>
            ) : (
              employees.map((e) => {
                const p = computePayroll({ company, employee: e, daysWorked: company.workingDaysPerMonth, otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0 });
                const branch = company.branches?.find((b) => b.id === e.branchId);
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full ring-2 ring-primary/25 overflow-hidden bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">
                          {e.photoDataUrl ? <img src={e.photoDataUrl} className="h-full w-full object-cover" alt={e.name} /> : e.name.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                        </div>
                        <div>
                          <div className="font-medium">{e.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{e.empCode} · {e.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{e.department}</td>
                    <td className="p-3">{branch ? <Badge variant="outline">{branch.code}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
                    <td className="p-3 text-right">{inr(e.basic)}</td>
                    <td className="p-3 text-right text-primary font-medium">{inr(p.monthlyCTC)}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" title="Documents & App Signatures" onClick={() => setDocsEmp(e)} className="text-sky-600 hover:bg-sky-500/10">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Edit Employee" onClick={() => setEditingEmp(e)}>
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Appointment letter" onClick={() => void generateAppointmentPDF(company, e, p, docAssets)}>
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Transfer" onClick={() => { setActionEmp(e); setActionKind("transfer"); }}>
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Relieve / Exit" onClick={() => { setActionEmp(e); setActionKind("exit"); }}>
                          <DoorOpen className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Manual letter" onClick={() => { setActionEmp(e); setActionKind("manual"); }}>
                          <FileSignature className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => { deleteEmployee(e.id); toast.success("Removed"); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
      <BulkUploadDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
}

function RegistrationWizard({ onDone, draftId }: { onDone: () => void; draftId?: string | null }) {
  const {
    addEmployee, company, ensureJourney,
    saveRegistrationDraft, deleteRegistrationDraft, addAudit, currentUser, employees, roles,
  } = useStore();
  // Read initial draft ONCE without subscribing to registrationDrafts — otherwise every
  // autosave re-renders the parent and the wizard flickers/appears to reload.
  const [initialDraft] = useState(() => (draftId ? useStore.getState().registrationDrafts.find((d) => d.id === draftId) : undefined));
  const [step, setStep] = useState(initialDraft?.currentStep ?? 0);
  const [form, setForm] = useState<Omit<Employee, "id">>({ ...empty, ...(initialDraft?.data ?? {}) } as Omit<Employee, "id">);
  const draftIdRef = useRef<string>(initialDraft?.id ?? crypto.randomUUID());
  const [savedAt, setSavedAt] = useState<string | null>(initialDraft?.updatedAt ?? null);

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

  const canNext = () => {
    if (!current) return false;
    if (current.key === "photo") return !!form.photoDataUrl && !!form.name && !!form.empCode && !!form.password;
    if (current.key === "personal") return !!form.name && !!form.email && !!form.phone;
    if (current.key === "employment") return !!form.designation && !!form.department && !!form.doj;
    return true;
  };

  const finish = () => {
    if (!form.empCode || !form.name) return toast.error("Employee code and name required");
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
    <div className="grid grid-cols-[260px_1fr] h-full max-h-full overflow-hidden">
      {/* Rail */}
      <aside className="border-r border-border bg-muted/30 p-3 flex flex-col overflow-hidden h-full max-h-full">
        <DialogHeader className="mb-3 px-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Guided Registration
          </DialogTitle>
        </DialogHeader>
        <Progress value={((step + 1) / flow.length) * 100} className="h-1.5 mb-1" />
        <div className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
          <Save className="h-3 w-3" />
          {savedAt ? `Autosaved ${new Date(savedAt).toLocaleTimeString()}` : "Draft not saved yet"}
        </div>
        <ol className="space-y-0.5 text-sm overflow-y-auto pr-1 flex-1">
          {flow.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.key}>
                <button
                  onClick={() => setStep(i)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    active ? "bg-gradient-brand text-white shadow-soft" : done ? "text-emerald-600 hover:bg-muted" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className={`h-5 w-5 rounded-full grid place-items-center text-[10px] font-semibold shrink-0 ${
                    active ? "bg-white/20 text-white" : done ? "bg-emerald-500 text-white" : "bg-muted-foreground/15"
                  }`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-[12px]">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 pt-3 text-[11px] text-muted-foreground border-t border-border">
          <div className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> SWIFT AI Onboarding</div>
          <div className="mt-1">Documents and signatures are moved to the employee app.</div>
        </div>
      </aside>

      {/* Body */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-6">

        <AnimatePresence mode="wait">
          <motion.div
            key={current?.key ?? step}
            initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {current?.key === "photo" && (
                <div className="space-y-5">
                  <StepHead icon={Camera} title="Photo & Identity" subtitle="Photo is mandatory for single guided registration. Or use Bulk Upload below to import from Excel without photos." />

                  {/* Bulk Upload Banner */}
                  <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Need to register multiple employees?</div>
                        <div className="text-sm font-medium">Download the Excel template or Bulk Upload your employee list.</div>
                        <p className="text-xs text-muted-foreground mt-0.5">Imported employees appear instantly without photos. You can upload photos later in Edit Employee.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-card text-xs h-8"
                        onClick={() => {
                          downloadEmployeeTemplate(company.name);
                          toast.success("Excel template downloaded with sample employee headers.");
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
                    <PhotoCapture value={form.photoDataUrl} onChange={(u) => setForm({ ...form, photoDataUrl: u, faceRegistered: !!u })} name={form.name} size="lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                    <Field label="Employee Code *" value={form.empCode} onChange={(v) => setForm({ ...form, empCode: v })} placeholder="SW0001" />
                    <div className="col-span-2">
                      <Field label="Password *" type="password" value={form.password || ""} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />
                      <p className="text-[11px] text-muted-foreground mt-1">This password will be used by the employee to log into the Employee Portal.</p>
                    </div>
                  </div>
                </div>
              )}

              {current?.key === "personal" && (
                <div className="space-y-4">
                  <StepHead icon={User} title="Personal Details" subtitle="Contact and KYC. Fields you skip can be filled by the employee later." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Email *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                    <Field label="Phone *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                    <Field label="Date of Birth" type="date" value={form.dob || ""} onChange={(v) => setForm({ ...form, dob: v })} />
                    <div>
                      <Label>Gender</Label>
                      <Select value={form.gender || ""} onValueChange={(v) => setForm({ ...form, gender: v as Employee["gender"] })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="Blood Group" value={form.bloodGroup || ""} onChange={(v) => setForm({ ...form, bloodGroup: v })} placeholder="O+" />
                    <Field label="Emergency Contact" value={form.emergencyContact || ""} onChange={(v) => setForm({ ...form, emergencyContact: v })} />
                    <div className="col-span-2">
                      <Label>Address</Label>
                      <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <Field label="PAN" value={form.pan || ""} onChange={(v) => setForm({ ...form, pan: v.toUpperCase() })} />
                    <Field label="Aadhaar" value={form.aadhaar || ""} onChange={(v) => setForm({ ...form, aadhaar: v })} />
                  </div>
                </div>
              )}

              {current?.key === "address" && (
                <div className="space-y-4">
                  <StepHead icon={Home} title="Address & Extended KYC" subtitle="Current and permanent address, statutory numbers." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Address Line 1" value={form.addressLine1 || ""} onChange={(v) => setForm({ ...form, addressLine1: v })} />
                    <Field label="Address Line 2" value={form.addressLine2 || ""} onChange={(v) => setForm({ ...form, addressLine2: v })} />
                    <Field label="City" value={form.city || ""} onChange={(v) => setForm({ ...form, city: v })} />
                    <Field label="State" value={form.state || ""} onChange={(v) => setForm({ ...form, state: v })} />
                    <Field label="Country" value={form.country || "India"} onChange={(v) => setForm({ ...form, country: v })} />
                    <Field label="Pincode" value={form.pincode || ""} onChange={(v) => setForm({ ...form, pincode: v })} />
                    <Field label="UAN" value={form.uan || ""} onChange={(v) => setForm({ ...form, uan: v })} />
                    <Field label="ESIC" value={form.esic || ""} onChange={(v) => setForm({ ...form, esic: v })} />
                    <Field label="PF Number" value={form.pfNumber || ""} onChange={(v) => setForm({ ...form, pfNumber: v })} />
                    <Field label="Passport #" value={form.passportNumber || ""} onChange={(v) => setForm({ ...form, passportNumber: v })} />
                  </div>
                </div>
              )}

              {current?.key === "family" && (
                <div className="space-y-4">
                  <StepHead icon={UsersIcon} title="Family & Emergency" subtitle="Dependents, nominee, and emergency contact." />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Marital Status</Label>
                      <Select value={form.maritalStatus || ""} onValueChange={(v) => setForm({ ...form, maritalStatus: v as Employee["maritalStatus"] })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                    <Field label="Emergency Contact Name" value={form.emergencyName || ""} onChange={(v) => setForm({ ...form, emergencyName: v })} />
                    <Field label="Emergency Relation" value={form.emergencyRelation || ""} onChange={(v) => setForm({ ...form, emergencyRelation: v })} />
                    <Field label="Emergency Phone (Alt)" value={form.emergencyPhone2 || ""} onChange={(v) => setForm({ ...form, emergencyPhone2: v })} />
                  </div>
                  <RepeatingList<FamilyMember>
                    label="Dependents / Family"
                    items={form.family || []}
                    empty={{ name: "", relation: "" }}
                    onChange={(family) => setForm({ ...form, family })}
                    columns={[
                      { key: "name", label: "Name" },
                      { key: "relation", label: "Relation", placeholder: "Spouse / Child" },
                      { key: "dob", label: "DOB", type: "date" },
                    ]}
                  />
                </div>
              )}

              {current?.key === "education" && (
                <div className="space-y-4">
                  <StepHead icon={GraduationCap} title="Education" subtitle="Highest and prior qualifications." />
                  <RepeatingList<EducationEntry>
                    label="Qualifications"
                    items={form.education || []}
                    empty={{ level: "", institute: "" }}
                    onChange={(education) => setForm({ ...form, education })}
                    columns={[
                      { key: "level", label: "Degree / Level", placeholder: "B.E. / MBA / HSC" },
                      { key: "institute", label: "Institute" },
                      { key: "year", label: "Year" },
                      { key: "grade", label: "Grade / CGPA" },
                    ]}
                  />
                </div>
              )}

              {current?.key === "experience" && (
                <div className="space-y-4">
                  <StepHead icon={Briefcase} title="Prior Experience" subtitle="Previous employers, roles, and last drawn CTC." />
                  <RepeatingList<ExperienceEntry>
                    label="Employers"
                    items={form.experience || []}
                    empty={{ company: "", role: "" }}
                    onChange={(experience) => setForm({ ...form, experience })}
                    columns={[
                      { key: "company", label: "Company" },
                      { key: "role", label: "Role" },
                      { key: "from", label: "From", type: "date" },
                      { key: "to", label: "To", type: "date" },
                      { key: "ctc", label: "Last CTC", type: "number" },
                    ]}
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
                        placeholder="React, Payroll, MS Excel"
                      />
                    </div>
                    <div>
                      <Label>Languages Known</Label>
                      <Input
                        value={(form.languagesKnown || []).join(", ")}
                        onChange={(e) => setForm({ ...form, languagesKnown: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        placeholder="English, Hindi, Tamil"
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
                    <Field label="Department *" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
                    <Field label="Designation *" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} />
                    <Field label="Date of Joining *" type="date" value={form.doj} onChange={(v) => setForm({ ...form, doj: v })} />
                    <Field
                      label="Fixed Salary (Monthly ₹) *"
                      type="number"
                      value={String(form.fixedSalary ?? form.basic)}
                      onChange={(v) => setForm({ ...form, fixedSalary: +v || 0, basic: +v || 0 })}
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
                          onCheckedChange={(c) => setForm({ ...form, pfEligible: !!c })}
                        />
                        <span>PF (Provident Fund)</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer p-2.5 rounded-lg bg-muted/40 hover:bg-muted border border-border">
                        <Checkbox
                          checked={form.esiEligible ?? false}
                          onCheckedChange={(c) => setForm({ ...form, esiEligible: !!c })}
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
                  <StepHead icon={Building2} title="Branch & Reporting" subtitle="Assign to a branch (with its own geo-fence) and reporting manager." />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Branch</Label>
                      <Select value={form.branchId || "__none"} onValueChange={(v) => setForm({ ...form, branchId: v === "__none" ? undefined : v })}>
                        <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— Unassigned —</SelectItem>
                          {(company.branches ?? []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name} · {b.code}{b.isHead ? " · HQ" : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reports to</Label>
                      <Select value={form.managerId || "__none"} onValueChange={(v) => setForm({ ...form, managerId: v === "__none" ? undefined : v })}>
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
                  {form.branchId && (() => {
                    const b = company.branches?.find((x) => x.id === form.branchId);
                    if (!b) return null;
                    return (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-1">
                        <div className="font-medium flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> {b.name}</div>
                        <div className="text-xs text-muted-foreground">{b.address}, {b.city}, {b.state}</div>
                        {b.lat != null && b.lng != null && (
                          <div className="text-xs">Geo-fence: {b.radiusMeters ?? 150}m of {b.lat.toFixed(4)}, {b.lng.toFixed(4)}</div>
                        )}
                        {b.shiftStart && b.shiftEnd && <div className="text-xs">Shift: {b.shiftStart} – {b.shiftEnd}</div>}
                      </div>
                    );
                  })()}

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
                            ? "Employee can clock in at any time without auto-absent cutoff."
                            : `If attendance is not marked within ${form.graceTime || "15"} mins of shift start, morning is marked Absent and check-in is disabled.`}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Afternoon Login Window Start Time</Label>
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
                        <div>🏢 Branch: {company.branches?.find((b) => b.id === form.branchId)?.name || "—"}</div>
                        <div>👤 Reports to: {employees.find((e) => e.id === form.managerId)?.name || "Top of company"}</div>
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

          <div className="shrink-0 flex items-center justify-between border-t border-border bg-card/95 backdrop-blur px-6 py-3">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="text-xs text-muted-foreground">Step {step + 1} of {flow.length}</div>
            {step < flow.length - 1 ? (
              <Button className="bg-gradient-brand text-white" disabled={!canNext()} onClick={() => setStep(step + 1)}>
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button className="bg-gradient-brand text-white shadow-glow" onClick={finish}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Create Employee
              </Button>
            )}
          </div>
        </div>

      </div>
    );
  }


function EmployeeDocumentsDialog({ employee, open, onClose }: { employee: Employee | null; open: boolean; onClose: () => void }) {
  const { company, docAssets, updateEmployee } = useStore();
  const [activeTab, setActiveTab] = useState<"signed" | "uploads">("signed");
  const [uploadType, setUploadType] = useState("Aadhaar Card");
  const [uploadName, setUploadName] = useState("");
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
                  <Badge variant="outline" className="font-mono text-xs">
                    {employee.empCode}
                  </Badge>
                </DialogTitle>
                <div className="text-xs text-muted-foreground">
                  {employee.designation} · {employee.department}
                </div>
              </div>
            </div>
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
                            const w = window.open("");
                            if (w) {
                              w.document.write(`<iframe src="${doc.dataUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
                            }
                          }}
                          className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No preview data</span>
                      )}

                      <div className="flex items-center gap-1">
                        {doc.dataUrl && (
                          <a href={doc.dataUrl} download={doc.name}>
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

        <DialogFooter className="pt-3 border-t border-border">
          <Button onClick={onClose} className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
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

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
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
  const { updateEmployee, company, roles } = useStore();
  const [form, setForm] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (employee) {
      setForm({ ...employee });
    }
  }, [employee]);

  if (!employee) return null;

  const handleSave = () => {
    if (!form.name?.trim() || !form.empCode?.trim()) {
      return toast.error("Full Name and Employee Code are required");
    }
    updateEmployee(employee.id, { ...form, faceRegistered: !!form.photoDataUrl || form.faceRegistered });
    toast.success(`${form.name} updated successfully`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Pencil className="h-5 w-5 text-primary" /> Edit Employee Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo & Credentials</div>
            <PhotoCapture
              value={form.photoDataUrl}
              onChange={(u) => setForm({ ...form, photoDataUrl: u, faceRegistered: !!u })}
              name={form.name}
              size="lg"
            />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <Label>Full Name *</Label>
                <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Employee Code *</Label>
                <Input value={form.empCode || ""} onChange={(e) => setForm({ ...form, empCode: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Password * (for Employee Portal login)</Label>
                <Input type="text" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter password" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employment Information</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Work Email</Label>
                <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={form.department || "Engineering"} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Engineering", "HR", "Sales", "Operations", "Finance", "Marketing", "Legal", "Executive", "Design"].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation</Label>
                <Input value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
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
                <Label>Date of Joining</Label>
                <Input type="date" value={form.doj || ""} onChange={(e) => setForm({ ...form, doj: e.target.value })} />
              </div>
              <div>
                <Label>Fixed Salary (Monthly ₹)</Label>
                <Input type="number" value={form.fixedSalary ?? form.basic ?? 25000} onChange={(e) => setForm({ ...form, fixedSalary: +e.target.value, basic: +e.target.value })} />
              </div>
              <div>
                <Label>Benefits Eligible Date</Label>
                <Input type="date" value={form.eligibleDate || form.doj || ""} onChange={(e) => setForm({ ...form, eligibleDate: e.target.value })} />
              </div>
              <div>
                <Label>Probation End Date</Label>
                <Input type="date" value={form.probationDate || ""} onChange={(e) => setForm({ ...form, probationDate: e.target.value })} />
              </div>
              <div>
                <Label>Branch</Label>
                <Select value={form.branchId || "__none"} onValueChange={(v) => setForm({ ...form, branchId: v === "__none" ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Unassigned —</SelectItem>
                    {(company.branches ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} · {b.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned Default Shift</Label>
                <Select value={form.shiftId || "gen"} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    {(company.shifts || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status || "active"} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Statutory Deductions & Tax */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Statutory Deductions & Tax Eligibility
              </div>
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
                    onCheckedChange={(c) => setForm({ ...form, esiEligible: !!c })}
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
            </div>

            {/* Leave Apply Eligibility */}
            <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between gap-4 mt-2">
              <div>
                <div className="text-xs font-semibold flex items-center gap-2">
                  <span>Leave Apply Eligible</span>
                  <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary">
                    Employee App Control
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When unchecked, leave & permission applications are locked in the employee mobile app.
                </p>
              </div>
              <Checkbox
                checked={form.leaveApplyEligible ?? true}
                onCheckedChange={(c) => setForm({ ...form, leaveApplyEligible: !!c })}
                className="h-5 w-5"
              />
            </div>

            {/* Geofencing Verification Toggle */}
            <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between gap-4 mt-2">
              <div>
                <div className="text-xs font-semibold flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>Geofencing Attendance Verification</span>
                  <Badge variant="outline" className={`text-[9px] ${form.geofencingEnabled !== false ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-amber-500/10 text-amber-700 border-amber-500/30"}`}>
                    {form.geofencingEnabled !== false ? "Geo-fence Active" : "Face Only (Bypassed)"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {form.geofencingEnabled !== false
                    ? "Employee must be physically within branch geofence boundary to clock in/out."
                    : "Geofence check bypassed. Facial attendance verification alone is sufficient for check-in/out."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.geofencingEnabled !== false}
                  onCheckedChange={(checked) => setForm({ ...form, geofencingEnabled: checked })}
                />
              </div>
            </div>

            {/* Grace Time & Shift Attendance Policy */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-3 mt-2">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                  <span>Grace Time for Attendance</span>
                  <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-700 border-purple-500/30">
                    Morning Shift Punctuality
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Allowed late-arrival buffer window after scheduled shift start time.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Morning Grace Period</Label>
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
                  <p className="text-[10px] text-muted-foreground">
                    {form.graceTime === "always"
                      ? "Clock-in allowed at all times."
                      : `Late check-in past ${form.graceTime || "15"} mins marks morning Absent.`}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Afternoon Login Window Start Time</Label>
                  <Input
                    type="time"
                    value={form.halfDayLoginTime || "12:00"}
                    onChange={(e) => setForm({ ...form, halfDayLoginTime: e.target.value })}
                    disabled={form.allowHalfDayLogin === false || form.graceTime === "always"}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Default 12:00 PM. Unlocks check-in for afternoon half-day.
                  </p>
                </div>
              </div>

              {form.graceTime !== "always" && (
                <div className="rounded-lg bg-muted/40 p-2.5 flex items-center justify-between gap-3 border border-border/70">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <Timer className="h-3 w-3 text-primary" />
                      <span>Allow Afternoon / Half-Day Login</span>
                      <Badge variant="outline" className={`text-[8px] ${form.allowHalfDayLogin !== false ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-rose-500/10 text-rose-700 border-rose-500/30"}`}>
                        {form.allowHalfDayLogin !== false ? `After ${form.halfDayLoginTime || "12:00 PM"}` : "Locked for Full Day"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {form.allowHalfDayLogin !== false
                        ? `If morning is missed, employee can mark afternoon attendance after ${form.halfDayLoginTime || "12:00 PM"}.`
                        : "If morning grace period is missed, employee cannot mark attendance for the entire day."}
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
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-gradient-brand text-white">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addEmployee, company, employees, roles } = useStore();
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
      const text = (event.target?.result as string) || "";
      const result = parseEmployeeCsvText(text, employees, roles);
      setParsed(result);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!parsed || parsed.employees.length === 0) {
      return toast.error("No valid employees found in this file.");
    }
    setLoading(true);
    let count = 0;
    const toImport = parsed.employees.filter((emp) => {
      const isDup = employees.some((e) => e.empCode?.toLowerCase() === emp.empCode?.toLowerCase());
      if (isDup && skipDuplicates) return false;
      return true;
    });

    for (const emp of toImport) {
      addEmployee(emp);
      count++;
    }

    setLoading(false);
    aiNotify({
      title: "✨ Bulk employee import completed",
      body: `${count} employees registered without photos. Photos can be added anytime in Edit Employee.`,
      kind: "success",
    });
    toast.success(`✨ Successfully imported ${count} employees in bulk!`);
    onClose();
    setFile(null);
    setParsed(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
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
                <div className="text-xs font-semibold">Prefilled Template with Column Headers</div>
                <div className="text-[11px] text-muted-foreground">Download the formatted template, fill in your employee records, and upload below.</div>
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
              Supports .csv, .xlsx, .xls, .tsv with standard headers (Employee Code, Full Name, Fixed Salary, Role, etc.)
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
              <div className="rounded-xl border border-border overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-2 pl-3">Code</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Department</th>
                      <th className="p-2">Designation</th>
                      <th className="p-2">Fixed Salary</th>
                      <th className="p-2">Role</th>
                      <th className="p-2">Leave Eligible</th>
                      <th className="p-2">Geofence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsed.employees.slice(0, 50).map((emp, i) => {
                      const isDup = parsed.duplicates.includes(emp.empCode);
                      return (
                        <tr key={i} className={`hover:bg-muted/40 ${isDup ? "bg-amber-500/5" : ""}`}>
                          <td className="p-2 pl-3 font-mono font-medium">{emp.empCode}</td>
                          <td className="p-2 font-medium">{emp.name}</td>
                          <td className="p-2 text-muted-foreground">{emp.department}</td>
                          <td className="p-2 text-muted-foreground">{emp.designation}</td>
                          <td className="p-2 font-mono">₹{(emp.fixedSalary ?? 0).toLocaleString()}</td>
                          <td className="p-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {emp.roleName || "Standard"}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {emp.leaveApplyEligible !== false ? (
                              <span className="text-emerald-600 font-semibold">Yes</span>
                            ) : (
                              <span className="text-muted-foreground">Locked</span>
                            )}
                          </td>
                          <td className="p-2">
                            {emp.geofencingEnabled !== false ? (
                              <span className="text-emerald-600 font-medium">Required</span>
                            ) : (
                              <span className="text-amber-600 font-medium">Bypassed</span>
                            )}
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
