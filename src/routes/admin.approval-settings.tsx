import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useStore, type Employee, type PredefinedRole } from "@/lib/store";
import {
  CalendarCheck, MessageSquareHeart, FileText, Banknote,
  Plus, Check, ChevronRight, ChevronDown, SlidersHorizontal, Trash2, ArrowDown,
  Sparkles, Save, UserCheck, ShieldCheck, Mail, Send, Eye,
  RefreshCw, CheckCircle2, XCircle, Zap, Clock, Info, GripVertical,
  HelpCircle, UserPlus, FileSignature, AlertCircle, Search, Edit3,
  Users as UsersIcon, MoreVertical, Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/approval-settings")({
  head: () => ({ meta: [{ title: "Approval Settings · SWIFT" }] }),
  component: CentralizedApprovalSettingsPage,
});

export type MainCategoryTab = "attendance" | "grievance" | "documents" | "loan";

export type ApprovalTypeMode = "sequential" | "all" | "any";

export type FinalLevelAction = "approve_send" | "approve_only" | "auto_approve" | "auto_decline" | "reject";

export type ManualApprovalStep = {
  id: string;
  approverId?: string;
  name: string;
  role: string;
  department?: string;
  avatarUrl?: string;
  permission: "approve_edit" | "approve_only" | "can_edit" | "view_only" | "final_approve";
  embedSignature: boolean;
  isExternal?: boolean;
};

export type WorkflowTypeItem = {
  id: string;
  name: string;
  category: string;
  group?: string;
  description: string;
  active: boolean;
  approvalType: ApprovalTypeMode;
  escalationDays: number;
  escalationAction: string;
  workflowMode: "auto" | "manual";
  finalLevelAction: FinalLevelAction;
  emailDelivery: boolean;
  manualSteps: ManualApprovalStep[];
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
};

// Initial default workflows for each category
const INITIAL_WORKFLOWS: Record<MainCategoryTab, WorkflowTypeItem[]> = {
  documents: [
    // I. Onboarding (6)
    {
      id: "doc-joining",
      name: "Joining Form",
      group: "I. Onboarding",
      category: "Documents",
      description: "Employee initial candidate registration and onboarding details form.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: "join-1", name: "HR Manager", role: "HR Head", department: "Human Resources", permission: "approve_edit", embedSignature: true },
        { id: "join-2", name: "Reporting Manager", role: "Direct Manager", department: "Operations", permission: "approve_only", embedSignature: false },
      ],
    },
    {
      id: "doc-offer",
      name: "Offer Letter",
      group: "I. Onboarding",
      category: "Documents",
      description: "Sent to employee mail after final approval & all signatures.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: "step-1", name: "Arjun Verma", role: "HR Manager", department: "Human Resources", permission: "approve_edit", embedSignature: true },
        { id: "step-2", name: "Reporting Manager", role: "Reporting Manager", department: "Manager", permission: "approve_only", embedSignature: true },
        { id: "step-3", name: "Department Head", role: "Head of Department", department: "Operations", permission: "approve_only", embedSignature: true },
        { id: "step-4", name: "Finance Manager", role: "Finance Manager", department: "Finance Department", permission: "approve_only", embedSignature: true },
        { id: "step-5", name: "MD / CEO (Final Level)", role: "Top Level Authority", department: "Executive", permission: "final_approve", embedSignature: true },
      ],
    },
    {
      id: "doc-appointment",
      name: "Appointment Letter",
      group: "I. Onboarding",
      category: "Documents",
      description: "Official contract of employment with full employment terms and conditions.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: "appt-1", name: "HR Manager", role: "HR Head", department: "Human Resources", permission: "approve_edit", embedSignature: true },
        { id: "appt-2", name: "MD / CEO", role: "Director", department: "Executive", permission: "final_approve", embedSignature: true },
      ],
    },
    {
      id: "doc-nda",
      name: "NDA",
      group: "I. Onboarding",
      category: "Documents",
      description: "Non-disclosure agreement for intellectual property and confidentiality protection.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "doc-code-conduct",
      name: "Employee Code of Conduct & Workplace Ethics",
      group: "I. Onboarding",
      category: "Documents",
      description: "Company policy compliance, ethical conduct, and workplace guidelines acknowledgment.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "doc-asset-handover",
      name: "Asset Handover Forms",
      group: "I. Onboarding",
      category: "Documents",
      description: "Asset and hardware handover acknowledgment form.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: "asset-1", name: "IT / Admin Manager", role: "Asset Custodian", department: "IT Admin", permission: "approve_edit", embedSignature: true },
        { id: "asset-2", name: "Reporting Manager", role: "Manager", department: "Operations", permission: "approve_only", embedSignature: false },
      ],
    },

    // II. After Completion of Probation (2)
    {
      id: "doc-prob-confirm",
      name: "Probation Confirmation Letter",
      group: "II. After Completion of Probation",
      category: "Documents",
      description: "Formal letter confirming successful completion of employee probation period.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "doc-prob-ext",
      name: "Probation Extension Letter",
      group: "II. After Completion of Probation",
      category: "Documents",
      description: "Notice informing extension of probation period with specific performance milestones.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: "ext-1", name: "Reporting Manager", role: "Manager", department: "Operations", permission: "approve_edit", embedSignature: true },
        { id: "ext-2", name: "HR Manager", role: "HR Head", department: "Human Resources", permission: "final_approve", embedSignature: true },
      ],
    },

    // III. Movement (3)
    {
      id: "doc-transfer",
      name: "Transfer Letter",
      group: "III. Movement",
      category: "Documents",
      description: "Official relocation or inter-department branch transfer letter.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "doc-promotion",
      name: "Promotion Letter",
      group: "III. Movement",
      category: "Documents",
      description: "Role elevation, designation advancement, and revised responsibility letter.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: "prom-1", name: "Department Head", role: "Head of Department", department: "Operations", permission: "approve_edit", embedSignature: true },
        { id: "prom-2", name: "HR Manager", role: "HR Head", department: "Human Resources", permission: "approve_only", embedSignature: true },
        { id: "prom-3", name: "MD / CEO", role: "Executive", department: "Executive", permission: "final_approve", embedSignature: true },
      ],
    },
    {
      id: "doc-increment",
      name: "Increment / Compensation Revision Letter",
      group: "III. Movement",
      category: "Documents",
      description: "Annual salary revision and appraisal increment confirmation letter.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },

    // IV. Discipline (2)
    {
      id: "doc-show-cause",
      name: "Show Cause Notice",
      group: "IV. Discipline",
      category: "Documents",
      description: "Formal notice demanding explanation for policy or attendance violations.",
      active: true,
      approvalType: "all",
      escalationDays: 1,
      escalationAction: "Send to HR Manager",
      workflowMode: "manual",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [
        { id: "sc-1", name: "HR Manager", role: "HR Head", department: "Human Resources", permission: "approve_edit", embedSignature: true },
        { id: "sc-2", name: "Compliance / Legal Head", role: "Legal Manager", department: "Legal", permission: "final_approve", embedSignature: true },
      ],
    },
    {
      id: "doc-warning",
      name: "Warning Letter",
      group: "IV. Discipline",
      category: "Documents",
      description: "Official reprimand letter documented in employee personnel file.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },

    // V. Exit (2)
    {
      id: "doc-relieve",
      name: "Relieving Letter",
      group: "V. Exit",
      category: "Documents",
      description: "Exit relieving letter upon clearance of handovers and dues.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: "rel-1", name: "HR Manager", role: "HR Head", department: "Human Resources", permission: "approve_edit", embedSignature: true },
        { id: "rel-2", name: "Department Head", role: "Head of Department", department: "Operations", permission: "approve_only", embedSignature: true },
        { id: "rel-3", name: "MD / CEO", role: "Director", department: "Executive", permission: "final_approve", embedSignature: true },
      ],
    },
    {
      id: "doc-exp",
      name: "Experience Letter / Certificate",
      group: "V. Exit",
      category: "Documents",
      description: "Formal service experience certificate with designation and tenure.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },

    // VI. Verification (2)
    {
      id: "doc-emp-verif",
      name: "Employment Verification Letter",
      group: "VI. Verification",
      category: "Documents",
      description: "Background verification request response letter.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "doc-salary-cert",
      name: "Salary Certificate / NOC",
      group: "VI. Verification",
      category: "Documents",
      description: "Income verification certificate for banking or visa requests.",
      active: true,
      approvalType: "any",
      escalationDays: 1,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
  ],
  grievance: [
    {
      id: "grv-missing-punch",
      name: "Missing Punch (Check-in / Check-out)",
      category: "Grievance",
      description: "Attendance correction ticket when clock-in or out punch was missed.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "grv-leave-not-approved",
      name: "Leave Not Approved",
      category: "Grievance",
      description: "Grievance ticket for delayed or disputed leave requests.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "grv-payroll-salary",
      name: "Payroll & Salary Issues",
      category: "Grievance",
      description: "Disputes or corrections in salary computation, deductions, or allowances.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "grv-workplace-behavior",
      name: "Workplace / Behavior",
      category: "Grievance",
      description: "Workplace environment, harassment prevention, or peer conduct issues.",
      active: true,
      approvalType: "all",
      escalationDays: 1,
      escalationAction: "Send to HR Manager",
      workflowMode: "manual",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [
        { id: "grv-w-1", name: "HR Manager", role: "HR Head", department: "Human Resources", permission: "approve_edit", embedSignature: false },
        { id: "grv-w-2", name: "Director / VP", role: "Director", department: "Executive", permission: "final_approve", embedSignature: false },
      ],
    },
    {
      id: "grv-policy-compliance",
      name: "Policy / Compliance",
      category: "Grievance",
      description: "Company policy inquiries, regulatory questions, or compliance appeals.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "grv-it-access",
      name: "IT / System Access",
      category: "Grievance",
      description: "System credentials, software licenses, or hardware access tickets.",
      active: true,
      approvalType: "any",
      escalationDays: 1,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "grv-others",
      name: "Others",
      category: "Grievance",
      description: "General employee grievances and feedback requests.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
  ],
  attendance: [
    {
      id: "att-regularization",
      name: "Regularization (Punch In/Out)",
      category: "Attendance",
      description: "Punch time adjustments and biometric exception requests.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [
        { id: "att-1", name: "Reporting Manager (Level 1)", role: "Direct Manager", department: "Management", permission: "can_edit", embedSignature: false },
        { id: "att-2", name: "Reporting Manager (Level 2)", role: "Manager's Manager", department: "Department", permission: "can_edit", embedSignature: false },
        { id: "att-3", name: "HR Manager", role: "Human Resources", department: "HR", permission: "can_edit", embedSignature: false },
        { id: "att-4", name: "Department Head", role: "Head of Department", department: "Operations", permission: "can_edit", embedSignature: false },
        { id: "att-5", name: "MD / CEO (Final Level)", role: "Top Level Authority", department: "Executive", permission: "view_only", embedSignature: false },
      ],
    },
    {
      id: "att-weekoff-holiday",
      name: "Weekly Off / Holiday Work",
      category: "Attendance",
      description: "Permission to work on assigned weekly off days or company holidays for comp-off.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "att-overtime",
      name: "Overtime Approval",
      category: "Attendance",
      description: "Pre-approval or claim for extra shift hours worked beyond standard shift.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "att-early-leave",
      name: "Early Leave",
      category: "Attendance",
      description: "Permission to depart early from office for official or emergency reasons.",
      active: true,
      approvalType: "any",
      escalationDays: 1,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "att-late-coming",
      name: "Late Coming",
      category: "Attendance",
      description: "Intimation or waiver request for arriving after grace period.",
      active: true,
      approvalType: "any",
      escalationDays: 1,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "att-short-leave",
      name: "Short Leave / Half Day",
      category: "Attendance",
      description: "Standard permission (1-2 hours) or half-day afternoon check-in request.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_only",
      emailDelivery: true,
      manualSteps: [],
    },
  ],
  loan: [
    {
      id: "loan-salary-adv",
      name: "Salary Advance (Monthly)",
      category: "Advance Loan Request",
      description: "Advance salary payout against upcoming month payroll.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: "loan-1", name: "Reporting Manager", role: "Direct Manager", department: "Management", permission: "approve_only", embedSignature: false },
        { id: "loan-2", name: "Finance Manager", role: "Finance Head", department: "Finance", permission: "approve_edit", embedSignature: true },
        { id: "loan-3", name: "MD / CEO", role: "Top Level Authority", department: "Executive", permission: "final_approve", embedSignature: true },
      ],
    },
    {
      id: "loan-medical",
      name: "Emergency Medical Loan",
      category: "Advance Loan Request",
      description: "Special medical assistance advance with custom repayment EMI installments.",
      active: true,
      approvalType: "all",
      escalationDays: 1,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },
    {
      id: "loan-festival",
      name: "Festival Advance Loan",
      category: "Advance Loan Request",
      description: "Company seasonal festival advance with standard zero-interest deduction.",
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "auto",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [],
    },
  ],
};

function CentralizedApprovalSettingsPage() {
  const { company, setCompany, employees, roles } = useStore();

  // Active top Category Tab
  const [activeTab, setActiveTab] = useState<MainCategoryTab>("documents");

  // Workflows state by category
  const [workflows, setWorkflows] = useState<Record<MainCategoryTab, WorkflowTypeItem[]>>(() => {
    // If company has stored workflows, restore them, else default to INITIAL_WORKFLOWS
    return (company as any).approvalWorkflows || INITIAL_WORKFLOWS;
  });

  // Selected Type inside active Category
  const [selectedTypeId, setSelectedTypeId] = useState<string>(() => {
    const list = workflows.documents || INITIAL_WORKFLOWS.documents;
    return list[0]?.id || "";
  });

  // Filter Search in Type list
  const [typeSearch, setTypeSearch] = useState("");

  // Search Approver in Right Panel (Manual flow)
  const [approverSearch, setApproverSearch] = useState("");

  // Accordion state for Documents groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "I. Onboarding": true,
    "II. After Completion of Probation": false,
    "III. Movement": false,
    "IV. Discipline": false,
    "V. Exit": false,
    "VI. Verification": false,
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Modals state
  const [addTypeModalOpen, setAddTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");
  const [newTypeGroup, setNewTypeGroup] = useState("I. Onboarding");

  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [emailTemplateOpen, setEmailTemplateOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const [externalApproverModalOpen, setExternalApproverModalOpen] = useState(false);
  const [extName, setExtName] = useState("");
  const [extEmail, setExtEmail] = useState("");
  const [extRole, setExtRole] = useState("External Auditor / Consultant");

  // Get active items list for current tab
  const currentCategoryList = workflows[activeTab] || [];

  // Active selected workflow item
  const activeItem = useMemo(() => {
    const found = currentCategoryList.find((w) => w.id === selectedTypeId);
    return found || currentCategoryList[0] || null;
  }, [currentCategoryList, selectedTypeId]);

  // Handler when switching main tab
  const handleTabChange = (tab: MainCategoryTab) => {
    setActiveTab(tab);
    const list = workflows[tab] || [];
    if (list.length > 0) {
      setSelectedTypeId(list[0].id);
    }
  };

  // Helper to update active item
  const updateActiveItem = (patch: Partial<WorkflowTypeItem>) => {
    if (!activeItem) return;
    setWorkflows((prev) => {
      const list = prev[activeTab].map((item) => {
        if (item.id === activeItem.id) {
          return { ...item, ...patch };
        }
        return item;
      });
      return { ...prev, [activeTab]: list };
    });
  };

  // Document Groups memo for Documents Accordion
  const documentGroups = useMemo(() => {
    if (activeTab !== "documents") return [];
    const standardOrder = [
      "I. Onboarding",
      "II. After Completion of Probation",
      "III. Movement",
      "IV. Discipline",
      "V. Exit",
      "VI. Verification",
    ];
    const docs = workflows.documents || [];
    const map = new Map<string, WorkflowTypeItem[]>();
    standardOrder.forEach((grp) => map.set(grp, []));

    docs.forEach((doc) => {
      const g = doc.group || "I. Onboarding";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(doc);
    });

    return Array.from(map.entries()).map(([groupName, items]) => {
      const filtered = items.filter((item) => {
        if (!typeSearch.trim()) return true;
        const q = typeSearch.toLowerCase().trim();
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      });
      return {
        groupName,
        totalCount: items.length,
        items: filtered,
      };
    });
  }, [workflows.documents, activeTab, typeSearch]);

  // Add new Type Modal action
  const handleCreateNewType = () => {
    if (!newTypeName.trim()) {
      return toast.error("Please enter a valid request type name.");
    }
    const newItem: WorkflowTypeItem = {
      id: `${activeTab}-${Date.now()}`,
      name: newTypeName.trim(),
      group: activeTab === "documents" ? newTypeGroup : undefined,
      category: activeTab.toUpperCase(),
      description: newTypeDesc.trim() || `Custom ${activeTab} request type`,
      active: true,
      approvalType: "sequential",
      escalationDays: 2,
      escalationAction: "Move to next approver",
      workflowMode: "manual",
      finalLevelAction: "approve_send",
      emailDelivery: true,
      manualSteps: [
        { id: `step-${Date.now()}`, name: "Reporting Manager", role: "Direct Manager", department: "Management", permission: "approve_only", embedSignature: true },
        { id: `step-${Date.now() + 1}`, name: "MD / CEO", role: "Top Level Authority", department: "Executive", permission: "final_approve", embedSignature: true },
      ],
    };

    setWorkflows((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newItem],
    }));
    setSelectedTypeId(newItem.id);
    if (activeTab === "documents" && newTypeGroup) {
      setOpenGroups((prev) => ({ ...prev, [newTypeGroup]: true }));
    }
    setNewTypeName("");
    setNewTypeDesc("");
    setAddTypeModalOpen(false);
    toast.success(`Added "${newItem.name}" to ${activeTab} approval settings!`);
  };

  // Add an Approver from Right Panel to Manual Flow
  const handleAddApproverToFlow = (person: { name: string; role: string; department?: string; id?: string }) => {
    if (!activeItem) return;
    const newStep: ManualApprovalStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      approverId: person.id,
      name: person.name,
      role: person.role,
      department: person.department || "Operations",
      permission: "approve_only",
      embedSignature: true,
    };
    updateActiveItem({
      manualSteps: [...activeItem.manualSteps, newStep],
    });
    toast.success(`Added ${person.name} (${person.role}) to approval flow.`);
  };

  // Add External Approver
  const handleAddExternalApprover = () => {
    if (!extName.trim() || !extEmail.trim()) {
      return toast.error("Name and Email are required for external approver.");
    }
    handleAddApproverToFlow({
      name: extName.trim(),
      role: `${extRole} (${extEmail.trim()})`,
      department: "External Reviewer",
    });
    setExtName("");
    setExtEmail("");
    setExternalApproverModalOpen(false);
  };

  // Remove Step from Manual Flow
  const handleRemoveStep = (stepId: string) => {
    if (!activeItem) return;
    updateActiveItem({
      manualSteps: activeItem.manualSteps.filter((s) => s.id !== stepId),
    });
  };

  // Move Step Up
  const handleMoveStepUp = (index: number) => {
    if (!activeItem || index <= 0) return;
    const steps = [...activeItem.manualSteps];
    const temp = steps[index - 1];
    steps[index - 1] = steps[index];
    steps[index] = temp;
    updateActiveItem({ manualSteps: steps });
  };

  // Move Step Down
  const handleMoveStepDown = (index: number) => {
    if (!activeItem || index >= activeItem.manualSteps.length - 1) return;
    const steps = [...activeItem.manualSteps];
    const temp = steps[index + 1];
    steps[index + 1] = steps[index];
    steps[index] = temp;
    updateActiveItem({ manualSteps: steps });
  };

  // Clear Flow
  const handleClearFlow = () => {
    if (!activeItem) return;
    updateActiveItem({ manualSteps: [] });
    toast.info("Cleared manual flow steps.");
  };

  // Save Settings Globally to Company & DynamoDB
  const handleSaveAllSettings = () => {
    setCompany({
      ...company,
      approvalWorkflows: workflows as any,
      // Sync grievanceTypes if on grievance tab
      grievanceTypes: workflows.grievance.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        active: g.active,
      })),
      // Sync documentTypes if on documents tab
      documentTypes: workflows.documents.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        workflow: d.workflowMode === "auto" ? "Hierarchical (Auto)" : "Custom Manual",
        active: d.active,
      })),
    });
    toast.success("✨ Centralized Approval & Request Workflows saved successfully!");
  };

  // Filtered available employees & authorities for right panel
  const filteredApprovers = useMemo(() => {
    const q = approverSearch.toLowerCase().trim();
    const defaults = [
      { name: "Arjun Verma", role: "HR Manager", department: "Human Resources" },
      { name: "Pooja Iyer", role: "Finance Manager", department: "Finance" },
      { name: "Karan Malhotra", role: "Department Head", department: "Operations" },
      { name: "Neha Gupta", role: "Compliance Manager", department: "Compliance & Legal" },
      { name: "Sanjay Rao", role: "Admin Manager", department: "General Administration" },
      { name: "Vikram Mehta", role: "Director / VP", department: "Executive Board" },
      { name: "MD / CEO", role: "Top Level Authority", department: "Executive Board" },
    ];

    const fromEmployees = (employees || []).map((e) => ({
      id: e.id,
      name: e.name,
      role: e.designation || "Staff",
      department: e.department || "General",
    }));

    const merged = [...fromEmployees, ...defaults];
    const unique = Array.from(new Map(merged.map((m) => [m.name, m])).values());

    if (!q) return unique;
    return unique.filter((a) => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.department.toLowerCase().includes(q));
  }, [employees, approverSearch]);

  const filteredTypeList = useMemo(() => {
    const q = typeSearch.toLowerCase().trim();
    if (!q) return currentCategoryList;
    return currentCategoryList.filter((item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
  }, [currentCategoryList, typeSearch]);

  return (
    <div className="space-y-6 pb-20 max-w-[1520px] mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer">Approval Settings</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground capitalize">{activeTab === "loan" ? "Advance Loan Request" : activeTab}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight capitalize text-foreground flex items-center gap-2.5">
            {activeTab === "documents" && <FileText className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />}
            {activeTab === "grievance" && <MessageSquareHeart className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />}
            {activeTab === "attendance" && <CalendarCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />}
            {activeTab === "loan" && <Banknote className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />}
            {activeTab === "loan" ? "Advance Loan Request" : activeTab} Approval Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configure approval workflow, escalation and final level action for {activeTab === "documents" ? "documents" : activeTab === "grievance" ? "grievance requests" : activeTab === "attendance" ? "attendance related requests" : "employee advance loan requests"}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-card border-border hover:bg-muted"
            onClick={() => setHowItWorksOpen(true)}
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1.5 text-primary" /> How it works
          </Button>
          <Button
            size="sm"
            className="h-9 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft"
            onClick={handleSaveAllSettings}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" /> Save Settings
          </Button>
        </div>
      </div>

      {/* Top 4 Primary Category Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange("attendance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "attendance"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CalendarCheck className="h-4 w-4" /> Attendance
        </button>
        <button
          onClick={() => handleTabChange("grievance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "grievance"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <MessageSquareHeart className="h-4 w-4" /> Grievance
        </button>
        <button
          onClick={() => handleTabChange("documents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "documents"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" /> Documents
        </button>
        <button
          onClick={() => handleTabChange("loan")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "loan"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Banknote className="h-4 w-4" /> Advance Loan Request
        </button>
      </div>

      {/* Main 2-Panel / 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Type Selector (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-4 space-y-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">
              Select {activeTab === "documents" ? "Document" : activeTab === "grievance" ? "Grievance" : activeTab === "attendance" ? "Attendance Request" : "Loan Request"}
            </span>
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs"
              onClick={() => setAddTypeModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add {activeTab === "documents" ? "Document" : "Type"}
            </Button>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
              placeholder={activeTab === "documents" ? "Search documents..." : "Search..."}
              className="h-8 pl-8 text-xs bg-muted/30"
            />
          </div>

          {/* DOCUMENTS TAB: Grouped Accordion Categories */}
          {activeTab === "documents" ? (
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {documentGroups.map(({ groupName, totalCount, items }) => {
                const isOpen = openGroups[groupName] ?? false;
                const hasMatch = items.length > 0;
                if (!hasMatch && typeSearch.trim()) return null;

                return (
                  <div key={groupName} className="rounded-xl border border-border/80 bg-muted/10 overflow-hidden shadow-2xs">
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-left text-xs font-bold text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="truncate">{groupName}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                        {totalCount}
                      </Badge>
                    </button>

                    {isOpen && (
                      <div className="p-1 space-y-1 bg-card border-t border-border/50">
                        {items.map((typeItem) => {
                          const isSelected = typeItem.id === activeItem?.id;
                          return (
                            <div
                              key={typeItem.id}
                              onClick={() => setSelectedTypeId(typeItem.id)}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                                isSelected
                                  ? "bg-emerald-500/10 border-emerald-500/40 text-foreground font-semibold shadow-xs"
                                  : "bg-card hover:bg-muted/50 border-transparent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                                <span className="text-[11.5px] truncate">{typeItem.name}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info(`Configuring ${typeItem.name}`);
                                  }}
                                  className="text-muted-foreground hover:text-foreground p-0.5"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* NON-DOCUMENTS TABS: Standard List */
            <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1 pb-1">
                <span>All {activeTab === "grievance" ? "Grievance Types" : activeTab === "attendance" ? "Attendance Requests" : "Loan Request Types"}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                  {currentCategoryList.length}
                </Badge>
              </div>

              {filteredTypeList.map((typeItem) => {
                const isSelected = typeItem.id === activeItem?.id;
                return (
                  <div
                    key={typeItem.id}
                    onClick={() => setSelectedTypeId(typeItem.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/40 text-foreground font-semibold shadow-xs"
                        : "bg-card hover:bg-muted/50 border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className={`h-4 w-4 shrink-0 ${isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                      <span className="text-xs truncate">{typeItem.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Area: Selected Type Configuration Studio (9 cols) */}
        {activeItem ? (
          <div className="lg:col-span-9 space-y-4">
            {/* Header of selected type */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold font-display text-foreground">{activeItem.name}</h2>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
                    Active
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Category: <span className="font-semibold text-foreground">{activeItem.name}</span> · {activeItem.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 rounded-xl text-xs font-semibold bg-card border-border hover:bg-muted"
                  onClick={() => {
                    setEmailSubject(`Notification: ${activeItem.name} Approved`);
                    setEmailBody(`Hello {{employee_name}},\n\nYour request for "${activeItem.name}" has been officially approved and processed.\n\nBest regards,\nHR & Management Team`);
                    setEmailTemplateOpen(true);
                  }}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5 text-primary" /> View / Edit Email Template
                </Button>
              </div>
            </div>

            {/* Top Settings Row: Approval Type & Escalation Settings */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Approval Type Radio Cards (7 cols) */}
              <div className="md:col-span-7 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-soft">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground">Approval Type</div>
                  <div className="text-[11px] text-muted-foreground">Choose how approvals should be handled.</div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {/* Sequential */}
                  <div
                    onClick={() => updateActiveItem({ approvalType: "sequential" })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      activeItem.approvalType === "sequential"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                        : "bg-muted/30 hover:bg-muted/60 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-3.5 w-3.5 rounded-full border grid place-items-center ${activeItem.approvalType === "sequential" ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground"}`}>
                        {activeItem.approvalType === "sequential" && <div className="h-1.5 w-1.5 rounded-full bg-white"></div>}
                      </div>
                      <span className="text-xs font-bold">Sequential</span>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground mt-2">One by one in order</span>
                  </div>

                  {/* All Must Approve */}
                  <div
                    onClick={() => updateActiveItem({ approvalType: "all" })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      activeItem.approvalType === "all"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                        : "bg-muted/30 hover:bg-muted/60 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-3.5 w-3.5 rounded-full border grid place-items-center ${activeItem.approvalType === "all" ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground"}`}>
                        {activeItem.approvalType === "all" && <div className="h-1.5 w-1.5 rounded-full bg-white"></div>}
                      </div>
                      <span className="text-xs font-bold">All Must Approve</span>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground mt-2">All approvers must approve</span>
                  </div>

                  {/* Any One Approve */}
                  <div
                    onClick={() => updateActiveItem({ approvalType: "any" })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      activeItem.approvalType === "any"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                        : "bg-muted/30 hover:bg-muted/60 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-3.5 w-3.5 rounded-full border grid place-items-center ${activeItem.approvalType === "any" ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground"}`}>
                        {activeItem.approvalType === "any" && <div className="h-1.5 w-1.5 rounded-full bg-white"></div>}
                      </div>
                      <span className="text-xs font-bold">Any One Approve</span>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground mt-2">Any one approver can approve</span>
                  </div>
                </div>
              </div>

              {/* Escalation Settings (5 cols) */}
              <div className="md:col-span-5 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-soft">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground">Escalation Settings</div>
                  <div className="text-[11px] text-muted-foreground">If no action is taken.</div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={activeItem.escalationDays}
                    onChange={(e) => updateActiveItem({ escalationDays: parseInt(e.target.value) || 2 })}
                    className="w-16 h-9 text-xs font-bold text-center bg-muted/30"
                  />
                  <Select defaultValue="days">
                    <SelectTrigger className="w-20 h-9 text-xs"><SelectValue placeholder="Days" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className="text-xs text-muted-foreground font-medium">then</span>

                  <Select
                    value={activeItem.escalationAction}
                    onValueChange={(val) => updateActiveItem({ escalationAction: val })}
                  >
                    <SelectTrigger className="flex-1 h-9 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Move to next approver">Move to next approver</SelectItem>
                      <SelectItem value="Send to HR Manager">Send to HR Manager</SelectItem>
                      <SelectItem value="Auto Approve">Auto Approve</SelectItem>
                      <SelectItem value="Auto Decline">Auto Decline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Workflow Mode Tabs (Auto Hierarchical vs Manual Drag & Drop) */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-5">
              <div className="flex items-center border-b border-border pb-3 gap-6">
                <button
                  onClick={() => updateActiveItem({ workflowMode: "auto" })}
                  className={`flex items-center gap-2 pb-2 text-xs sm:text-sm font-bold transition-all relative ${
                    activeItem.workflowMode === "auto"
                      ? "text-emerald-700 dark:text-emerald-400 after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Auto Approval Flow (Hierarchical)</span>
                  <span className="hidden sm:inline text-[11px] font-normal text-muted-foreground">· Follows employee reporting hierarchy automatically</span>
                </button>

                <button
                  onClick={() => updateActiveItem({ workflowMode: "manual" })}
                  className={`flex items-center gap-2 pb-2 text-xs sm:text-sm font-bold transition-all relative ${
                    activeItem.workflowMode === "manual"
                      ? "text-emerald-700 dark:text-emerald-400 after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UsersIcon className="h-4 w-4" />
                  <span>Manual Approval Flow</span>
                  <span className="hidden sm:inline text-[11px] font-normal text-muted-foreground">· Drag and drop to create your custom flow</span>
                </button>
              </div>

              {/* TAB 1 CONTENT: AUTO APPROVAL FLOW (HIERARCHICAL) */}
              {activeItem.workflowMode === "auto" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                  {/* Left Flow Stack (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="space-y-3">
                      {/* Step 1 */}
                      <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 grid place-items-center">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">Reporting Manager (Level 1)</div>
                            <div className="text-[11px] text-muted-foreground">Direct Manager</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold">
                          Auto
                        </Badge>
                      </div>

                      <div className="grid place-items-center text-muted-foreground py-0.5">
                        <ArrowDown className="h-4 w-4 text-emerald-600" />
                      </div>

                      {/* Step 2 */}
                      <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 grid place-items-center">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">Reporting Manager (Level 2)</div>
                            <div className="text-[11px] text-muted-foreground">Manager's Manager</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold">
                          Auto
                        </Badge>
                      </div>

                      <div className="grid place-items-center text-muted-foreground py-0.5">
                        <ArrowDown className="h-4 w-4 text-emerald-600" />
                      </div>

                      {/* Step 3 */}
                      <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 grid place-items-center">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">Reporting Manager (Level 3)</div>
                            <div className="text-[11px] text-muted-foreground">Next Level Manager</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold">
                          Auto
                        </Badge>
                      </div>

                      <div className="grid place-items-center text-muted-foreground py-0.5">
                        <ArrowDown className="h-4 w-4 text-emerald-600" />
                      </div>

                      {/* Step 4: Top Level */}
                      <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 grid place-items-center">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">Top Level Authority</div>
                            <div className="text-[11px] text-muted-foreground">MD / CEO</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold">
                          Auto
                        </Badge>
                      </div>
                    </div>

                    {/* Final Level Action Radio selector */}
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">Final Level Action (MD / CEO)</div>
                        <div className="text-[11px] text-muted-foreground">Choose action at the final level.</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Approve Manually */}
                        <div
                          onClick={() => updateActiveItem({ finalLevelAction: "approve_send" })}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                            activeItem.finalLevelAction === "approve_send" || activeItem.finalLevelAction === "approve_only"
                              ? "bg-emerald-500/15 border-emerald-500 text-foreground"
                              : "bg-card hover:bg-muted/50 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="h-6 w-6 rounded-full bg-emerald-600 text-white mx-auto grid place-items-center mb-1.5">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-xs font-bold">Approve Manually</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">MD will review and approve manually</div>
                        </div>

                        {/* Auto Approve */}
                        <div
                          onClick={() => updateActiveItem({ finalLevelAction: "auto_approve" })}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                            activeItem.finalLevelAction === "auto_approve"
                              ? "bg-blue-500/15 border-blue-500 text-foreground"
                              : "bg-card hover:bg-muted/50 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="h-6 w-6 rounded-full bg-blue-600 text-white mx-auto grid place-items-center mb-1.5">
                            <Zap className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-xs font-bold">Auto Approve</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Automatically approves if MD is not available</div>
                        </div>

                        {/* Auto Decline */}
                        <div
                          onClick={() => updateActiveItem({ finalLevelAction: "auto_decline" })}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                            activeItem.finalLevelAction === "auto_decline"
                              ? "bg-red-500/15 border-red-500 text-foreground"
                              : "bg-card hover:bg-muted/50 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="h-6 w-6 rounded-full bg-red-600 text-white mx-auto grid place-items-center mb-1.5">
                            <XCircle className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-xs font-bold">Auto Decline</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Automatically declines if MD is not available</div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 flex items-start gap-2.5 text-[11px] text-blue-700 dark:text-blue-300">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>How Auto Flow Works?</strong> The request will move automatically through the reporting hierarchy based on employee registration data until it reaches the top level. At the final level, the selected action will be applied.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Preview & Email Delivery (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Live Preview Stepper */}
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-soft">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">Approval Flow Preview</div>
                        <div className="text-[11px] text-muted-foreground">This is how the flow will work.</div>
                      </div>

                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold grid place-items-center">1</span>
                            <div>
                              <div className="text-xs font-bold">Rohit Sharma</div>
                              <div className="text-[10.5px] text-muted-foreground">Reporting Manager (Level 1)</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">Auto</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold grid place-items-center">2</span>
                            <div>
                              <div className="text-xs font-bold">Sneha Patel</div>
                              <div className="text-[10.5px] text-muted-foreground">Reporting Manager (Level 2)</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">Auto</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold grid place-items-center">3</span>
                            <div>
                              <div className="text-xs font-bold">Vikas Singh</div>
                              <div className="text-[10.5px] text-muted-foreground">Reporting Manager (Level 3)</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">Auto</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold grid place-items-center">MD</span>
                            <div>
                              <div className="text-xs font-bold">Amit Mehta</div>
                              <div className="text-[10.5px] text-muted-foreground">MD / CEO (Final Level)</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">Final</Badge>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Final Level Action:</span>
                        <span className="font-bold text-primary capitalize">
                          {activeItem.finalLevelAction === "approve_send" ? "Approve Manually" : activeItem.finalLevelAction === "auto_approve" ? "Auto Approve" : "Auto Decline"}
                        </span>
                      </div>
                    </div>

                    {/* Email Delivery Card */}
                    <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between shadow-soft">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">Email Delivery</div>
                          <div className="text-[11px] text-muted-foreground">Sent to employee mail after final approval.</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px]">
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2 CONTENT: MANUAL APPROVAL FLOW (DRAG & DROP / STEP BUILDER) */}
              {activeItem.workflowMode === "manual" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                  {/* Left Canvas: Step List Builder (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-foreground">Configure Manual Approval Flow</h3>
                        <p className="text-[11px] text-muted-foreground">Drag and drop approvers from the right panel to add workflow steps.</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                        onClick={handleClearFlow}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Clear Flow
                      </Button>
                    </div>

                    {/* Steps list */}
                    <div className="space-y-2.5 min-h-[220px]">
                      {activeItem.manualSteps.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center bg-muted/10 space-y-2">
                          <UsersIcon className="h-8 w-8 mx-auto text-muted-foreground/60" />
                          <div className="text-xs font-semibold text-foreground">No Approval Steps Configured</div>
                          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                            Click the <strong>(+)</strong> icon next to any authority in the right panel or click "Add Another Step" below.
                          </p>
                        </div>
                      ) : (
                        activeItem.manualSteps.map((step, idx) => (
                          <div
                            key={step.id}
                            className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3 shadow-xs hover:border-primary/40 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => handleMoveStepUp(idx)}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-[10px]"
                                >
                                  ▲
                                </button>
                                <button
                                  disabled={idx === activeItem.manualSteps.length - 1}
                                  onClick={() => handleMoveStepDown(idx)}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-[10px]"
                                >
                                  ▼
                                </button>
                              </div>

                              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold grid place-items-center shrink-0">
                                {idx + 1}
                              </span>

                              <div className="h-8 w-8 rounded-full bg-muted/60 grid place-items-center font-bold text-xs shrink-0">
                                {step.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">{step.name}</div>
                                <div className="text-[10.5px] text-muted-foreground truncate">{step.role} · {step.department}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              {/* Permission Select */}
                              <Select
                                value={step.permission}
                                onValueChange={(val: any) => {
                                  const updated = activeItem.manualSteps.map((s) => s.id === step.id ? { ...s, permission: val } : s);
                                  updateActiveItem({ manualSteps: updated });
                                }}
                              >
                                <SelectTrigger className="h-7 w-28 text-[11px] font-semibold bg-muted/30">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="approve_edit">Approve + Edit</SelectItem>
                                  <SelectItem value="approve_only">Approve Only</SelectItem>
                                  <SelectItem value="can_edit">Can Edit</SelectItem>
                                  <SelectItem value="view_only">View Only</SelectItem>
                                  <SelectItem value="final_approve">Final Approve</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Embed Signature Toggle */}
                              <div className="flex items-center gap-1.5 bg-muted/20 px-2 py-1 rounded-lg">
                                <span className="text-[10.5px] font-medium text-muted-foreground hidden sm:inline">Embed Signature</span>
                                <Switch
                                  checked={step.embedSignature}
                                  onCheckedChange={(checked) => {
                                    const updated = activeItem.manualSteps.map((s) => s.id === step.id ? { ...s, embedSignature: checked } : s);
                                    updateActiveItem({ manualSteps: updated });
                                  }}
                                />
                                <span className="text-xs">✍</span>
                              </div>

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600 rounded-lg"
                                onClick={() => handleRemoveStep(step.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full h-9 rounded-xl text-xs font-bold border-dashed border-border hover:border-emerald-600 hover:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      onClick={() => handleAddApproverToFlow({ name: "Department Manager", role: "Management Reviewer", department: "Operations" })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Another Step
                    </Button>
                  </div>

                  {/* Right Panel: Add Approvers Directory & Final Level Action (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Approvers Directory */}
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-soft">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-foreground">Add Approvers</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10 rounded-md font-bold"
                          onClick={() => setExternalApproverModalOpen(true)}
                        >
                          <UserPlus className="h-3 w-3 mr-1" /> External
                        </Button>
                      </div>

                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={approverSearch}
                          onChange={(e) => setApproverSearch(e.target.value)}
                          placeholder="Search approvers..."
                          className="h-8 pl-8 text-xs bg-muted/30"
                        />
                      </div>

                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        {filteredApprovers.map((person) => (
                          <div
                            key={person.name}
                            className="p-2 rounded-xl border border-border/60 bg-muted/15 flex items-center justify-between gap-2 hover:bg-muted/40 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-[10px] grid place-items-center shrink-0">
                                {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate">{person.name}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{person.role}</div>
                              </div>
                            </div>

                            <Button
                              size="icon"
                              className="h-6 w-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs"
                              onClick={() => handleAddApproverToFlow(person)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Final Level Action (MD / CEO) */}
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-soft">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">Final Level Action (MD / CEO)</div>
                        <div className="text-[11px] text-muted-foreground">Choose action at the final level.</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Approve & Send */}
                        <div
                          onClick={() => updateActiveItem({ finalLevelAction: "approve_send" })}
                          className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                            activeItem.finalLevelAction === "approve_send"
                              ? "bg-emerald-500/15 border-emerald-500 text-foreground"
                              : "bg-muted/20 hover:bg-muted/40 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="h-6 w-6 rounded-full bg-emerald-600 text-white mx-auto grid place-items-center mb-1">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-[11px] font-bold">Approve & Send</div>
                          <div className="text-[9.5px] text-muted-foreground mt-0.5">Approve, embed sign and send</div>
                        </div>

                        {/* Approve Only */}
                        <div
                          onClick={() => updateActiveItem({ finalLevelAction: "approve_only" })}
                          className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                            activeItem.finalLevelAction === "approve_only"
                              ? "bg-blue-500/15 border-blue-500 text-foreground"
                              : "bg-muted/20 hover:bg-muted/40 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="h-6 w-6 rounded-full bg-blue-600 text-white mx-auto grid place-items-center mb-1">
                            <FileSignature className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-[11px] font-bold">Approve Only</div>
                          <div className="text-[9.5px] text-muted-foreground mt-0.5">Approve & sign, do not send</div>
                        </div>

                        {/* Reject */}
                        <div
                          onClick={() => updateActiveItem({ finalLevelAction: "reject" })}
                          className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                            activeItem.finalLevelAction === "reject"
                              ? "bg-red-500/15 border-red-500 text-foreground"
                              : "bg-muted/20 hover:bg-muted/40 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="h-6 w-6 rounded-full bg-red-600 text-white mx-auto grid place-items-center mb-1">
                            <XCircle className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-[11px] font-bold">Reject</div>
                          <div className="text-[9.5px] text-muted-foreground mt-0.5">Reject the request</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Legend & Mandatory Sign Notice */}
            <div className="rounded-xl bg-muted/30 border border-border p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Approved</span>
                <span className="flex items-center gap-1.5"><span className="text-emerald-600">✍</span> Signature Embedded</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-muted-foreground"></span> Pending</span>
                <span className="flex items-center gap-1.5"><span className="text-muted-foreground">✍</span> Signature Not Embedded</span>
              </div>
            </div>

            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0" />
              <span>
                <strong>Note:</strong> Every Form & Letter is automatically dispatched to the employee's registered mail ID upon final approval. MD Sign, HOD Sign, and HR Sign are applied in accordance with the configured approval workflow.
              </span>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-9 rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            No item selected. Please select a request type from the left list.
          </div>
        )}
      </div>

      {/* MODAL 1: ADD NEW TYPE */}
      <Dialog open={addTypeModalOpen} onOpenChange={setAddTypeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {activeTab === "documents" ? "Document" : activeTab === "grievance" ? "Grievance" : activeTab === "attendance" ? "Attendance" : "Loan"} Type</DialogTitle>
            <DialogDescription>
              Define a new request category to configure its dedicated multi-stage approval workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {activeTab === "documents" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Document Category Group *</Label>
                <Select value={newTypeGroup} onValueChange={setNewTypeGroup}>
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I. Onboarding">I. Onboarding</SelectItem>
                    <SelectItem value="II. After Completion of Probation">II. After Completion of Probation</SelectItem>
                    <SelectItem value="III. Movement">III. Movement</SelectItem>
                    <SelectItem value="IV. Discipline">IV. Discipline</SelectItem>
                    <SelectItem value="V. Exit">V. Exit</SelectItem>
                    <SelectItem value="VI. Verification">VI. Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Document / Type Name *</Label>
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder={activeTab === "documents" ? "e.g. Internship Completion Certificate" : "e.g. Custom Request Type"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={newTypeDesc}
                onChange={(e) => setNewTypeDesc(e.target.value)}
                placeholder="Brief summary of this request or letter workflow"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTypeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateNewType} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Add {activeTab === "documents" ? "Document" : "Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: HOW IT WORKS */}
      <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Info className="h-5 w-5 text-primary" /> Centralized Approvals & Requests Engine
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <p>
              The <strong>Centralized Approval Settings</strong> module allows company administrators to configure standard multi-level workflows across 4 critical pillars: <strong>Attendance</strong>, <strong>Grievances</strong>, <strong>Company Documents</strong>, and <strong>Advance Loan Requests</strong>.
            </p>
            <div className="space-y-2 rounded-xl bg-muted/40 p-3">
              <div className="font-bold text-foreground">1. Auto Approval Flow (Hierarchical)</div>
              <p>Follows the dynamic upward reporting manager chain of the requesting employee (Level 1 $\rightarrow$ Level 2 $\rightarrow$ Level 3 $\rightarrow$ MD/CEO) automatically.</p>
              
              <div className="font-bold text-foreground mt-2">2. Manual Approval Flow</div>
              <p>Allows precise custom stage configurations by dragging & dropping specific approvers (HR, Finance, HOD, MD) and specifying custom permissions (Approve + Edit, Approve Only, Final Approve) with optional digital signature embedding.</p>

              <div className="font-bold text-foreground mt-2">3. Auto Escalation & Final Level Actions</div>
              <p>Defines automated rule escalation if an approver does not act within specified threshold days, and triggers automatic email delivery of the approved letters/forms to the employee's inbox.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setHowItWorksOpen(false)} className="w-full bg-primary text-primary-foreground font-bold">
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VIEW / EDIT EMAIL TEMPLATE */}
      <Dialog open={emailTemplateOpen} onOpenChange={setEmailTemplateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Email Template: {activeItem?.name}
            </DialogTitle>
            <DialogDescription>
              Customize the automatic email notification sent to employees upon final approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message Body</Label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full h-36 p-2.5 text-xs rounded-xl border border-border bg-card font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground">Available tags: <code>{"{{employee_name}}"}</code>, <code>{"{{emp_code}}"}</code>, <code>{"{{company_name}}"}</code></span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailTemplateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                updateActiveItem({ emailSubjectTemplate: emailSubject, emailBodyTemplate: emailBody });
                setEmailTemplateOpen(false);
                toast.success("Email template saved!");
              }}
              className="bg-primary text-primary-foreground font-bold"
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ADD EXTERNAL APPROVER */}
      <Dialog open={externalApproverModalOpen} onOpenChange={setExternalApproverModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add External Approver</DialogTitle>
            <DialogDescription>Include an external consultant, auditor, or legal reviewer in this workflow.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input value={extName} onChange={(e) => setExtName(e.target.value)} placeholder="e.g. Advocate Rajesh Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address *</Label>
              <Input type="email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} placeholder="rajesh@legalconsult.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role / Designation</Label>
              <Input value={extRole} onChange={(e) => setExtRole(e.target.value)} placeholder="External Legal Consultant" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalApproverModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExternalApprover} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Add External Approver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
