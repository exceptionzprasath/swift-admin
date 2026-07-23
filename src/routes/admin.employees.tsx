import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, resolveAttendanceProfile, type Employee, type FamilyMember, type EducationEntry, type ExperienceEntry } from "@/lib/store";
import { computePayroll, inr } from "@/lib/payroll";
import { generateAppointmentPDF } from "@/lib/pdf";
import { DEFAULT_TEMPLATES, downloadLetter, buildGenericTemplate, renderTemplate, buildVars, type LetterKey } from "@/lib/documents";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
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
} from "lucide-react";
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

type FlowStep =
  | { kind: "form"; key: FormStepKey; title: string; icon: typeof User }
  | { kind: "doc"; key: string; title: string; icon: typeof User; docCode: string; docId: string };

function EmployeesPage() {
  const { employees, addEmployee, deleteEmployee, company, docAssets, ensureJourney, docLibrary, advanceJourneyStep, registrationDrafts, saveRegistrationDraft, deleteRegistrationDraft, addAudit, currentUser } = useStore();
  const [open, setOpen] = useState(false);
  const [resumeDraftId, setResumeDraftId] = useState<string | null>(null);
  const [actionEmp, setActionEmp] = useState<Employee | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [actionKind, setActionKind] = useState<"exit" | "transfer" | "manual">("exit");

  const openWizard = (draftId?: string) => {
    setResumeDraftId(draftId ?? null);
    setOpen(true);
    setAiGuideMode({ active: true, scope: "employee-registration" });
    aiNotify({ title: "SWIFT AI is guiding onboarding", body: "I'll walk you through every doc in order. Progress auto-saves.", kind: "info" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">Guided 20-step registration with AI validation, autosave, and audit trail.</p>
        </div>
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
                        <Button size="sm" variant="ghost" title="Edit Employee" onClick={() => setEditingEmp(e)}>
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Appointment letter" onClick={() => generateAppointmentPDF(company, e, p)}>
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
    </div>
  );
}

function RegistrationWizard({ onDone, draftId }: { onDone: () => void; draftId?: string | null }) {
  const {
    addEmployee, company, docAssets, ensureJourney, docLibrary, advanceJourneyStep,
    saveRegistrationDraft, deleteRegistrationDraft, addAudit, currentUser, employees,
  } = useStore();
  // Read initial draft ONCE without subscribing to registrationDrafts — otherwise every
  // autosave re-renders the parent and the wizard flickers/appears to reload.
  const [initialDraft] = useState(() => (draftId ? useStore.getState().registrationDrafts.find((d) => d.id === draftId) : undefined));
  const [step, setStep] = useState(initialDraft?.currentStep ?? 0);
  const [form, setForm] = useState<Omit<Employee, "id">>({ ...empty, ...(initialDraft?.data ?? {}) } as Omit<Employee, "id">);
  const [signatures, setSignatures] = useState<Record<string, SignatureRec>>({});
  const [readAck, setReadAck] = useState<Record<string, boolean>>({});
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

    const onboardingDocs = useMemo(
      () => [...docLibrary].filter((d) => d.active && d.trigger === "on_registration").sort((a, b) => a.sequence - b.sequence),
      [],
    );

    // Interleave docs between the fixed form steps in professional order.
    const flow = useMemo<FlowStep[]>(() => {
      const out: FlowStep[] = [];
      for (const fs of FORM_STEPS) {
        out.push({ kind: "form", key: fs.key, title: fs.title, icon: fs.icon });
        if (fs.key === "review") continue;
        const docsHere = onboardingDocs.filter((d) => (DOC_INSERT_AFTER[d.code] ?? "branch") === fs.key);
        docsHere.forEach((d) =>
          out.push({ kind: "doc", key: `doc-${d.code}`, title: d.title, icon: FileSignature, docCode: d.code, docId: d.id }),
        );
      }
      return out;
    }, [onboardingDocs]);

    const current = flow[step];

    const canNext = () => {
      if (!current) return false;
      if (current.kind === "form") {
        if (current.key === "photo") return !!form.photoDataUrl && !!form.name && !!form.empCode && !!form.password;
        if (current.key === "personal") return !!form.name && !!form.email && !!form.phone;
        if (current.key === "employment") return !!form.designation && !!form.department && !!form.doj;
      }
      return true;
    };

    const finish = () => {
      if (!form.empCode || !form.name) return toast.error("Employee code and name required");
      const emp = addEmployee({ ...form, faceRegistered: !!form.photoDataUrl || form.faceRegistered });
      const journey = ensureJourney(emp.id);
      Object.values(signatures).forEach((s) => {
        const meta = docLibrary.find((d) => d.code === s.docCode);
        if (!meta) return;
        const jstep = journey.steps.find((st) => st.docId === meta.id);
        if (!jstep) return;
        advanceJourneyStep(emp.id, jstep.id, "signed", s.signedBy || "HR");
      });
      const p = computePayroll({ company, employee: emp, daysWorked: company.workingDaysPerMonth, otHours: 0, incentive: 0, shiftDays: 0, loan: 0, advance: 0, bonus: 0 });
      generateAppointmentPDF(company, emp, p);
      addAudit({
        actorName: currentUser?.name ?? "HR",
        entity: "employee",
        entityId: emp.id,
        action: "onboard-complete",
        device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined,
        newValue: { docsSigned: Object.keys(signatures).length, empCode: emp.empCode },
      });
      deleteRegistrationDraft(draftIdRef.current);
      aiNotify({ title: "✨ Employee onboarded", body: `${emp.name} · ${Object.keys(signatures).length} documents signed`, kind: "success" });
      toast.success(`${emp.name} onboarded — ${Object.keys(signatures).length} documents signed`);
      onDone();
    };

    const applyCompanySignatoryAll = () => {
      const pad = document.createElement("canvas");
      pad.width = 320; pad.height = 90;
      const ctx = pad.getContext("2d")!;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pad.width, pad.height);
      ctx.fillStyle = "#0f172a";
      ctx.font = "italic 34px 'Brush Script MT', cursive";
      ctx.fillText("HR Department", 12, 55);
      const url = pad.toDataURL();
      const bulk: Record<string, SignatureRec> = { ...signatures };
      onboardingDocs.forEach((d) => {
        if (!bulk[d.code]) bulk[d.code] = { docCode: d.code, docTitle: d.title, letterKey: d.letterKey, signatureDataUrl: url, signedBy: "HR Department" };
      });
      setSignatures(bulk);
      aiNotify({ title: "✨ Company signatory applied", body: `${onboardingDocs.length - Object.keys(signatures).length} documents auto-signed`, kind: "success" });
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
              const signed = s.kind === "doc" && !!signatures[s.docCode];
              return (
                <li key={s.key}>
                  <button
                    onClick={() => setStep(i)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                      active ? "bg-gradient-brand text-white shadow-soft" : done || signed ? "text-emerald-600 hover:bg-muted" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full grid place-items-center text-[10px] font-semibold shrink-0 ${
                      active ? "bg-white/20 text-white" : done || signed ? "bg-emerald-500 text-white" : "bg-muted-foreground/15"
                    }`}>
                      {done || signed ? "✓" : i + 1}
                    </div>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-[12px]">
                      {s.kind === "doc" ? <><span className="font-mono text-[10px] opacity-70 mr-1">{s.docCode}</span>{s.title}</> : s.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 pt-3 text-[11px] text-muted-foreground border-t border-border">
            <div className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> SWIFT AI live-guiding</div>
            <div className="mt-1">Documents inserted in professional joining order.</div>
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
              {current?.kind === "form" && current.key === "photo" && (
                <div className="space-y-5">
                  <StepHead icon={Camera} title="Photo & Identity" subtitle="Photo is mandatory. Shows across HRMS, ID card, and org chart." />
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

              {current?.kind === "form" && current.key === "personal" && (
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

              {current?.kind === "form" && current.key === "address" && (
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

              {current?.kind === "form" && current.key === "family" && (
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

              {current?.kind === "form" && current.key === "education" && (
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

              {current?.kind === "form" && current.key === "experience" && (
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

              {current?.kind === "form" && current.key === "skills" && (
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

              {current?.kind === "form" && current.key === "compliance" && (
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

              {current?.kind === "form" && current.key === "verify" && (() => {
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



              {current?.kind === "form" && current.key === "employment" && (
                <div className="space-y-4">
                  <StepHead icon={Briefcase} title="Employment & Salary" subtitle="Role, joining date, salary and bank details." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Department *" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
                    <Field label="Designation *" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} />
                    <Field label="Date of Joining *" type="date" value={form.doj} onChange={(v) => setForm({ ...form, doj: v })} />
                    <Field label="Basic Salary (Monthly ₹)" type="number" value={String(form.basic)} onChange={(v) => setForm({ ...form, basic: +v || 0 })} />
                    <Field label="Bank Account" value={form.bankAcc || ""} onChange={(v) => setForm({ ...form, bankAcc: v })} />
                    <Field label="IFSC" value={form.bankIfsc || ""} onChange={(v) => setForm({ ...form, bankIfsc: v.toUpperCase() })} />
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
                  </div>
                </div>
              )}

              {current?.kind === "form" && current.key === "branch" && (
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
                </div>
              )}

              {current?.kind === "doc" && (() => {
                const d = onboardingDocs.find((x) => x.code === current.docCode);
                if (!d) return null;
                const sig = signatures[d.code];
                const seqIdx = onboardingDocs.findIndex((x) => x.code === d.code);
                const previewEmp: Employee = { ...(form as Employee), id: "preview" };
                const tpl = d.letterKey
                  ? DEFAULT_TEMPLATES.find((t) => t.key === d.letterKey) ?? buildGenericTemplate(d.code, d.title, previewEmp)
                  : buildGenericTemplate(d.code, d.title, previewEmp);
                const rendered = renderTemplate(tpl.body, buildVars(company, previewEmp));
                const hasRead = !!readAck[d.code];
                return (
                  <div className="space-y-4">
                    <StepHead
                      icon={FileSignature}
                      title={`${d.title}`}
                      subtitle={`Document ${seqIdx + 1} of ${onboardingDocs.length} · ${d.category} · Code ${d.code}`}
                    />
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{d.code}</Badge>
                          {d.mandatory && <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30">Mandatory</Badge>}
                          {d.autoGenerate && <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">AI Generated</Badge>}
                          {d.sealRequired && <Badge variant="outline" className="text-[10px]">Seal</Badge>}
                          {d.digitalSignatureRequired && <Badge variant="outline" className="text-[10px]">e-Sign</Badge>}
                        </div>
                        {sig && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Signed by {sig.signedBy}
                          </Badge>
                        )}
                      </div>

                      {/* Full letter body — readable, scrollable, on paper-like surface */}
                      <div className="rounded-xl border border-border bg-white text-neutral-900 shadow-inner max-h-[420px] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Letter preview · read before you sign</div>
                          <div className="text-[11px] text-neutral-500">{company.legalName}</div>
                        </div>
                        <pre className="px-6 py-5 whitespace-pre-wrap font-serif text-[13px] leading-relaxed">{rendered}</pre>
                        {sig?.signatureDataUrl && (
                          <div className="px-6 pb-6">
                            <div className="text-[11px] text-neutral-500 mb-1">Employee signature</div>
                            <img src={sig.signatureDataUrl} alt="signature" className="h-14 max-w-[240px] object-contain bg-white border border-neutral-200 rounded" />
                            <div className="text-[11px] text-neutral-600 mt-1">{sig.signedBy} · {new Date().toLocaleString("en-IN")}</div>
                          </div>
                        )}
                      </div>

                      {!sig && (
                        <label className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm cursor-pointer">
                          <Checkbox
                            checked={hasRead}
                            onCheckedChange={(v) => setReadAck((s) => ({ ...s, [d.code]: !!v }))}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">I have read and understood this document.</span>
                            <span className="block text-xs text-muted-foreground">Signature pad unlocks after you acknowledge.</span>
                          </span>
                        </label>
                      )}

                      {sig?.signatureDataUrl ? (
                        <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <div className="text-xs">
                            <div className="font-medium">Signed by {sig.signedBy}</div>
                            <div className="text-muted-foreground">Download the signed copy for records — signature, seal and letterhead are embedded.</div>
                          </div>
                          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setSignatures((s) => { const n = { ...s }; delete n[d.code]; return n; }); setReadAck((s) => ({ ...s, [d.code]: false })); }}>Re-sign</Button>
                        </div>
                      ) : hasRead ? (
                        <ESignPad
                          defaultName={form.name}
                          onSign={(dataUrl, meta) => {
                            setSignatures((s) => ({ ...s, [d.code]: { docCode: d.code, docTitle: d.title, letterKey: d.letterKey, signatureDataUrl: dataUrl, signedBy: meta.signedBy } }));
                            aiNotify({ title: `✍️ ${d.code} signed`, body: `${d.title} by ${meta.signedBy}`, kind: "success" });
                          }}
                        />
                      ) : (
                        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground text-center">
                          Please read the letter above and tick the acknowledgement to enable signing.
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={applyCompanySignatoryAll}>
                        <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Apply company signatory to all remaining
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!sig}
                        onClick={async () => {
                          if (!form.name || !form.empCode) { toast.error("Enter name and employee code first"); return; }
                          await downloadLetter(company, previewEmp, tpl, "pdf", docAssets);
                          toast.success(`${d.code} PDF downloaded — signature & seal embedded`);
                        }}
                      >
                        <FileDown className="h-3.5 w-3.5 mr-1.5" /> Download signed PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!sig}
                        onClick={async () => {
                          if (!form.name || !form.empCode) { toast.error("Enter name and employee code first"); return; }
                          await downloadLetter(company, previewEmp, tpl, "docx", docAssets);
                          toast.success(`${d.code} DOCX downloaded — editable`);
                        }}
                      >
                        <FileDown className="h-3.5 w-3.5 mr-1.5" /> Download DOCX
                      </Button>
                      {sig && step < flow.length - 1 && (
                        <Button size="sm" className="bg-gradient-brand text-white ml-auto" onClick={() => setStep(step + 1)}>
                          Continue <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}



              {current?.kind === "form" && current.key === "review" && (
                <div className="space-y-4">
                  <StepHead icon={CheckCircle2} title="Review & Finish" subtitle="Confirm the details before creating the employee." />
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
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="text-sm font-medium mb-2">Documents signed ({Object.keys(signatures).length}/{onboardingDocs.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {onboardingDocs.map((d) => {
                        const signed = !!signatures[d.code];
                        return (
                          <Badge key={d.id} variant={signed ? "default" : "outline"} className={signed ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : ""}>
                            {signed && "✓ "}{d.code}
                          </Badge>
                        );
                      })}
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
  const { updateEmployee, company } = useStore();
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
                <Label>Date of Joining</Label>
                <Input type="date" value={form.doj || ""} onChange={(e) => setForm({ ...form, doj: e.target.value })} />
              </div>
              <div>
                <Label>Basic Salary (₹)</Label>
                <Input type="number" value={form.basic ?? 25000} onChange={(e) => setForm({ ...form, basic: +e.target.value })} />
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
