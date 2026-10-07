import React, { useState } from "react";
import { type Employee } from "@/lib/store";
import { calculateProfileCompletion, type MissingFieldItem } from "@/lib/profile-completion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  User,
  Briefcase,
  Building2,
  GraduationCap,
  ShieldCheck,
  Camera,
  Copy,
  Pencil,
  Check,
  ExternalLink,
  BellRing,
} from "lucide-react";
import { toast } from "sonner";

interface OnboardingChecklistDialogProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onEditProfile?: (employee: Employee) => void;
}

export function OnboardingChecklistDialog({
  employee,
  open,
  onClose,
  onEditProfile,
}: OnboardingChecklistDialogProps) {
  const [activeTab, setActiveTab] = useState<"all" | "personal" | "work" | "statutory" | "history" | "documents">("all");
  const [copied, setCopied] = useState(false);

  if (!employee) return null;

  const completion = calculateProfileCompletion(employee);

  // Grouped checklist items for display
  const categories = [
    {
      id: "personal" as const,
      title: "Personal & Contact",
      icon: User,
      color: "text-blue-500",
      items: [
        { label: "Full Legal Name", isFilled: Boolean(employee.name?.trim()), value: employee.name },
        { label: "Gender", isFilled: Boolean(employee.gender), value: employee.gender },
        { label: "Date of Birth", isFilled: Boolean(employee.dob && employee.dob !== "-"), value: employee.dob },
        { label: "Blood Group", isFilled: Boolean(employee.bloodGroup && employee.bloodGroup !== "-"), value: employee.bloodGroup },
        { label: "Marital Status", isFilled: Boolean(employee.maritalStatus), value: employee.maritalStatus },
        { label: "Primary Phone Number", isFilled: Boolean(employee.phone && employee.phone !== "-"), value: employee.phone },
        { label: "Emergency Contact Phone", isFilled: Boolean(employee.emergencyContact || employee.emergencyPhone2), value: employee.emergencyContact || employee.emergencyPhone2 },
        { label: "Emergency Contact Person", isFilled: Boolean(employee.emergencyName && employee.emergencyName !== "-"), value: employee.emergencyName },
        { label: "Residential Address", isFilled: Boolean(employee.address || employee.addressLine1 || employee.city), value: employee.address || employee.city },
      ],
    },
    {
      id: "work" as const,
      title: "Work & Organization",
      icon: Briefcase,
      color: "text-purple-500",
      items: [
        { label: "Department", isFilled: Boolean(employee.department && employee.department !== "-"), value: employee.department },
        { label: "Designation / Role", isFilled: Boolean(employee.designation && employee.designation !== "-"), value: employee.designation },
        { label: "Date of Joining", isFilled: Boolean(employee.doj && employee.doj !== "-"), value: employee.doj },
        { label: "Assigned Shift", isFilled: Boolean(employee.shiftId || (employee as any).shift), value: employee.shiftId || "Configured" },
      ],
    },
    {
      id: "statutory" as const,
      title: "Salary Bank & Statutory",
      icon: Building2,
      color: "text-emerald-500",
      items: [
        { label: "Salary Bank Name", isFilled: Boolean(employee.bankName || (employee as any).bankAccount), value: employee.bankName },
        { label: "Bank Account Number", isFilled: Boolean(employee.bankAcc || (employee as any).bankAccount), value: employee.bankAcc ? `••••${employee.bankAcc.slice(-4)}` : undefined },
        { label: "Bank IFSC Code", isFilled: Boolean(employee.bankIfsc && employee.bankIfsc !== "-"), value: employee.bankIfsc },
        { label: "PAN Card Number", isFilled: Boolean(employee.pan || (employee as any).panNumber), value: employee.pan || (employee as any).panNumber },
        { label: "Aadhaar Number", isFilled: Boolean(employee.aadhaar && employee.aadhaar !== "-"), value: employee.aadhaar ? `••••••••${employee.aadhaar.slice(-4)}` : undefined },
        { label: "PF UAN / Registration", isFilled: Boolean(employee.uan || employee.pfEligible !== undefined), value: employee.uan || "Enrolled" },
      ],
    },
    {
      id: "history" as const,
      title: "Education & Skills",
      icon: GraduationCap,
      color: "text-amber-500",
      items: [
        { label: "Professional Skills", isFilled: Boolean(Array.isArray(employee.skills) && employee.skills.length > 0), value: employee.skills?.join(", ") },
        { label: "Languages Known", isFilled: Boolean(Array.isArray(employee.languagesKnown) && employee.languagesKnown.length > 0), value: employee.languagesKnown?.join(", ") },
        { label: "Educational Qualification", isFilled: Boolean(Array.isArray(employee.education) && employee.education.length > 0), value: employee.education?.[0]?.level },
      ],
    },
    {
      id: "documents" as const,
      title: "Biometrics & Verification",
      icon: ShieldCheck,
      color: "text-rose-500",
      items: [
        { label: "Uploaded Identity / KYC Proofs", isFilled: Boolean(Array.isArray(employee.documentsUploaded) && employee.documentsUploaded.length > 0), value: employee.documentsUploaded ? `${employee.documentsUploaded.length} files` : undefined },
        { label: "Rekognition Face ID Enrollment", isFilled: Boolean(employee.faceRegistered || (employee.photoDataUrl && employee.photoDataUrl.startsWith("http"))), value: employee.faceRegistered ? "Enrolled ✓" : undefined },
        { label: "Mobile App E-Signed Documents", isFilled: Boolean(employee.acceptance?.signed || (employee as any).signedDocs), value: employee.acceptance?.signed ? "Signed ✓" : undefined },
      ],
    },
  ];

  const filteredCategories = activeTab === "all" ? categories : categories.filter((c) => c.id === activeTab);

  const handleCopyMissing = () => {
    if (completion.missingFields.length === 0) {
      toast.info("All fields are complete. Nothing missing!");
      return;
    }
    const lines = [
      `Onboarding Checklist for ${employee.name} (${employee.empCode})`,
      `Current Completion: ${completion.percentage}%`,
      `Pending Requirements (${completion.missingFields.length}):`,
      ...completion.missingFields.map((m, i) => `${i + 1}. ${m.label}`),
      `\nPlease submit these details to complete your official HR profile.`,
    ].join("\n");

    navigator.clipboard.writeText(lines);
    setCopied(true);
    toast.success("Missing requirements checklist copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendReminder = () => {
    toast.success(`Onboarding reminder sent to ${employee.name}'s mobile app!`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-start sm:items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary overflow-hidden grid place-items-center font-bold text-base shrink-0 border border-primary/20 shadow-2xs">
                {employee.photoDataUrl ? (
                  <img src={employee.photoDataUrl} className="h-full w-full object-cover" alt={employee.name} />
                ) : (
                  employee.name.split(" ").slice(0, 2).map((s) => s[0]).join("")
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{employee.name}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {employee.empCode}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {employee.designation || "Staff Member"} • {employee.department || "General"}
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-1 font-bold ${
                completion.isComplete
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : completion.percentage >= 70
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              }`}
            >
              {completion.isComplete ? "100% Complete" : `${completion.percentage}% Onboarded`}
            </Badge>
          </div>
        </DialogHeader>

        {/* Hero Progress Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                {completion.isComplete ? "Onboarding Status: Fully Verified" : "Onboarding Status: Incomplete"}
              </span>
              <span className="text-muted-foreground">
                ({completion.completedFieldsCount} of {completion.totalFieldsCount} items completed)
              </span>
            </div>
            <span className="font-bold font-mono text-primary text-sm">
              {completion.percentage}%
            </span>
          </div>

          {/* Styled progress bar */}
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/50 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completion.isComplete
                  ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400"
                  : completion.percentage >= 70
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                  : "bg-gradient-to-r from-rose-500 via-amber-500 to-yellow-400"
              }`}
              style={{ width: `${Math.max(6, completion.percentage)}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {completion.isComplete
              ? "All personal, KYC, banking, shift, and biometric identity requirements are complete and verified."
              : `${completion.missingFields.length} mandatory or recommended onboarding fields require attention.`}
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2">
          {[
            { id: "all", label: "All Items", count: completion.totalFieldsCount },
            { id: "personal", label: "Personal", count: categories[0].items.length },
            { id: "work", label: "Work", count: categories[1].items.length },
            { id: "statutory", label: "Statutory & Bank", count: categories[2].items.length },
            { id: "history", label: "Skills & Edu", count: categories[3].items.length },
            { id: "documents", label: "Biometrics & Docs", count: categories[4].items.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Grouped Checklist */}
        <div className="space-y-4 py-1">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const completedCount = cat.items.filter((i) => i.isFilled).length;
            const isAllDone = completedCount === cat.items.length;

            return (
              <div key={cat.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cat.color}`} />
                    <span className="font-bold text-xs text-foreground">{cat.title}</span>
                  </div>
                  <Badge
                    variant={isAllDone ? "default" : "outline"}
                    className={`text-[10px] font-mono ${
                      isAllDone
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "text-muted-foreground"
                    }`}
                  >
                    {completedCount} / {cat.items.length} Complete
                  </Badge>
                </div>

                <div className="divide-y divide-border/60">
                  {cat.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.isFilled ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className={`font-medium ${item.isFilled ? "text-foreground" : "text-amber-700 dark:text-amber-400 font-semibold"}`}>
                          {item.label}
                        </span>
                      </div>

                      <div className="shrink-0 text-right">
                        {item.isFilled ? (
                          <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px] inline-block">
                            {item.value || "Filled ✓"}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20">
                            Missing
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyMissing}
              disabled={completion.isComplete}
              className="text-xs h-9 gap-1.5 rounded-xl w-full sm:w-auto"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy Missing List"}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendReminder}
              disabled={completion.isComplete}
              className="text-xs h-9 gap-1.5 rounded-xl text-amber-600 dark:text-amber-400 w-full sm:w-auto"
            >
              <BellRing className="h-3.5 w-3.5" />
              <span>Nudge Staff</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs h-9 rounded-xl">
              Close
            </Button>
            {onEditProfile && (
              <Button
                size="sm"
                onClick={() => onEditProfile(employee)}
                className="text-xs h-9 gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
