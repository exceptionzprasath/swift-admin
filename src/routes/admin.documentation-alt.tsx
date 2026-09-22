import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useStore, getUpwardHierarchyChain, type Employee } from "@/lib/store";
import {
  useDigitalDocStore,
  PRESET_DOCUMENTS,
  DOCUMENT_CATEGORIES,
  DYNAMIC_FIELDS,
  resolveDocumentTags,
  type DigitalDocument,
  type DigitalDocumentStatus,
  type DocumentCategory,
  type ApprovalMode,
  type ApprovalStepItem,
  type DocCustomTable,
  type DocLetterheadConfig,
  type DocFooterConfig,
  type SignatorySlot,
  getSignatoryRank,
  getOrderedSignatories,
  ORG_SIGNATORY_TIERS,
} from "@/lib/digital-documents";
import { DocWordEditor } from "@/components/doc-word-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Send,
  Save,
  ArrowLeft,
  Trash2,
  Edit3,
  GitBranch,
  ShieldCheck,
  Building2,
  User,
  Users,
  Mail,
  Smartphone,
  Layers,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  Image as ImageIcon,
  Sparkles,
  History,
  FileDown,
  Check,
  X,
  Forward,
  ChevronRight,
  Printer,
  Copy,
  PenTool,
  AlertTriangle,
  RotateCcw,
  Sliders,
  BellRing,
  Crown,
  UserCheck,
  Zap,
  Network,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/admin/documentation-alt")({
  head: () => ({ meta: [{ title: "Digital Document Composer · CreatonsHR" }] }),
  component: DigitalDocumentationPage,
});

type ViewMode = "list" | "composer" | "detail";

export default function DigitalDocumentationPage() {
  const { company, employees, currentUser, roles, docAssets } = useStore();
  const {
    documents,
    addDocument,
    updateDocument,
    deleteDocument,
    sendDocument,
    approveStep,
    rejectStep,
    forwardStep,
    acknowledgeDocument,
    createNewVersion,
    resetToDefaults,
  } = useDigitalDocStore();

  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // List Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Composer Form State
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [composerCategory, setComposerCategory] = useState<string>("ALL");
  const [docTypePresetId, setDocTypePresetId] = useState<string>("appointment_letter");
  const [isCustomDocName, setIsCustomDocName] = useState(false);
  const [customDocName, setCustomDocName] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");

  const selectedPreset = useMemo(
    () => PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId) || null,
    [docTypePresetId]
  );

  const displayedCategories = useMemo(() => {
    if (composerCategory === "ALL") {
      return DOCUMENT_CATEGORIES;
    }
    return DOCUMENT_CATEGORIES.filter((c) => c === composerCategory);
  }, [composerCategory]);

  // Sample employee for WYSIWYG editor placeholder resolution
  const selectedEmployee = useMemo(() => employees[0] || null, [employees]);

  // Content
  const [docContentHtml, setDocContentHtml] = useState<string>("");
  const [customTable, setCustomTable] = useState<DocCustomTable | null>(null);

  // Letterhead & Footer Configuration
  const [docLetterhead, setDocLetterhead] = useState<DocLetterheadConfig>({
    enabled: true,
    style: docAssets?.letterheadDataUrl ? "uploaded" : "modern",
    showLogo: true,
    companyName: company?.name || "CreatonsHR Technologies Pvt. Ltd.",
    tagline: "Enterprise Workforce & People Operations",
    address: company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096",
    email: company?.email || "hr@creatonshr.com",
    phone: company?.phone || "+91 44 2876 5400",
    website: "www.creatonshr.com",
    cin: "U72200TN2026PTC109823",
  });

  const [docFooter, setDocFooter] = useState<DocFooterConfig>({
    enabled: true,
    style: docAssets?.footerDataUrl ? "uploaded" : "standard",
    showPageNumbers: true,
    showConfidentialNotice: true,
    confidentialText: "STRICTLY CONFIDENTIAL • FOR AUTHORIZED RECIPIENT ONLY",
    registeredOfficeText: `${company?.name || "CreatonsHR"} | Reg. Office: ${company?.address || "Tower B, Silicon Heights, OMR, Chennai"}`,
  });

  // Delivery
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "app" | "both">("both");
  const [deliverySubject, setDeliverySubject] = useState("");

  // Approval Matrix & Signatory Configuration
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("sequential");
  const [approvers, setApprovers] = useState<ApprovalStepItem[]>([
    {
      id: "s-1",
      category: "role",
      roleType: "HR Manager",
      approverRoleOrName: "HR Manager",
      order: 1,
      status: "pending",
      requireSignature: true,
    },
    {
      id: "s-2",
      category: "role",
      roleType: "HR Head",
      approverRoleOrName: "HR Head",
      order: 2,
      status: "pending",
      requireSignature: true,
    },
    {
      id: "s-3",
      category: "role",
      roleType: "Authorized Signatory",
      approverRoleOrName: "Authorized Signatory",
      order: 3,
      status: "pending",
      requireSignature: true,
    },
  ]);
  const [includeCompanySeal, setIncludeCompanySeal] = useState(true);
  const [approverEmpSearchText, setApproverEmpSearchText] = useState<Record<string, string>>({});

  const APPROVER_POSITION_OPTIONS = useMemo(
    () => [
      { value: "Employee", label: "Employee (Single / Multi / All)" },
      { value: "Team Leader", label: "Team Leader / Supervisor" },
      { value: "HR Manager", label: "HR Manager" },
      { value: "HR Head", label: "HR Head (Priya Kumar)" },
      { value: "Admin", label: "Admin / Super Admin" },
      { value: "Authorized Signatory", label: "Authorized Signatory" },
      { value: "Director", label: "Managing Director / Board Signatory" },
      { value: "Department Head", label: "Department Head (HOD)" },
      { value: "Finance Head", label: "Finance / Accounts Head" },
      { value: "custom", label: "✨ Custom Position / Title..." },
    ],
    []
  );

  function handleAddApproverStep() {
    const newStep: ApprovalStepItem = {
      id: `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: "role",
      roleType: "HR Manager",
      approverRoleOrName: "HR Manager",
      order: approvers.length + 1,
      status: "pending",
      requireSignature: true,
    };
    setApprovers([...approvers, newStep]);
    toast.success(`Added Approver Step ${approvers.length + 1}`);
  }

  function handlePositionChange(index: number, newPosition: string) {
    const updated = [...approvers];
    const step = { ...updated[index] };
    step.roleType = newPosition;

    if (newPosition === "Employee") {
      step.category = "employee";
      step.employeeSelectionMode = step.employeeSelectionMode || "single";
      if (!step.approverEmployeeId && employees.length > 0) {
        step.approverEmployeeId = employees[0].id;
        step.approverRoleOrName = `Employee: ${employees[0].name}`;
      } else if (step.approverEmployeeId) {
        const emp = employees.find((e) => e.id === step.approverEmployeeId);
        step.approverRoleOrName = `Employee: ${emp?.name || "Selected"}`;
      }
    } else if (newPosition === "custom") {
      step.category = "role";
      step.approverRoleOrName = "";
    } else {
      step.category = "role";
      step.approverRoleOrName = newPosition;
    }

    updated[index] = step;
    setApprovers(updated);
  }

  function handleEmployeeSelectionModeChange(index: number, mode: "single" | "multiple" | "all") {
    const updated = [...approvers];
    const step = { ...updated[index] };
    step.employeeSelectionMode = mode;

    if (mode === "all") {
      step.approverEmployeeIds = employees.map((e) => e.id);
      step.approverRoleOrName = `All Employees (${employees.length})`;
    } else if (mode === "multiple") {
      if (!step.approverEmployeeIds || step.approverEmployeeIds.length === 0) {
        step.approverEmployeeIds = employees.slice(0, 2).map((e) => e.id);
      }
      step.approverRoleOrName = `${step.approverEmployeeIds.length} Selected Employees`;
    } else {
      const empId = step.approverEmployeeId || employees[0]?.id || "";
      step.approverEmployeeId = empId;
      const emp = employees.find((e) => e.id === empId);
      step.approverRoleOrName = `Employee: ${emp?.name || "Selected"}`;
    }

    updated[index] = step;
    setApprovers(updated);
  }

  function handleSingleEmployeeChange(index: number, empId: string) {
    const updated = [...approvers];
    const step = { ...updated[index] };
    step.approverEmployeeId = empId;
    const emp = employees.find((e) => e.id === empId);
    step.approverRoleOrName = `Employee: ${emp?.name || "Selected"}`;
    updated[index] = step;
    setApprovers(updated);
  }

  function handleToggleMultiEmployee(index: number, empId: string) {
    const updated = [...approvers];
    const step = { ...updated[index] };
    const currentIds = step.approverEmployeeIds || [];
    let nextIds: string[];
    if (currentIds.includes(empId)) {
      nextIds = currentIds.filter((id) => id !== empId);
    } else {
      nextIds = [...currentIds, empId];
    }
    step.approverEmployeeIds = nextIds;
    step.approverRoleOrName = `${nextIds.length} Selected Employees`;
    updated[index] = step;
    setApprovers(updated);
  }

  function handleSelectAllMultiEmployees(index: number, selectAll: boolean) {
    const updated = [...approvers];
    const step = { ...updated[index] };
    const nextIds = selectAll ? employees.map((e) => e.id) : [];
    step.approverEmployeeIds = nextIds;
    step.approverRoleOrName = selectAll ? `All Employees (${employees.length})` : `0 Selected Employees`;
    updated[index] = step;
    setApprovers(updated);
  }

  function handleToggleSignatureNeeded(index: number, requireSig: boolean) {
    const updated = [...approvers];
    const targetStep = { ...updated[index], requireSignature: requireSig };
    updated[index] = targetStep;
    setApprovers(updated);

    const roleName = targetStep.approverRoleOrName || targetStep.roleType || "Approver";
    const rank = getSignatoryRank(roleName, targetStep.category);
    const positionLabel = rank <= 1 ? "Left" : rank <= 4 ? "Middle" : "Right";

    toast.success(
      requireSig
        ? `Added ${roleName} signature to document (${positionLabel} position per Org Hierarchy)`
        : `Removed ${roleName} signature requirement from document`
    );
  }

  function handleAutomationActionChange(
    index: number,
    action: "manual" | "auto_approve" | "auto_decline"
  ) {
    const updated = [...approvers];
    updated[index] = { ...updated[index], automationAction: action };
    setApprovers(updated);
    const actionLabel =
      action === "auto_approve"
        ? "⚡ Auto Approve"
        : action === "auto_decline"
        ? "⛔ Auto Decline"
        : "👤 Manual Approval";
    toast.success(`Set step ${index + 1} to ${actionLabel}`);
  }

  function handleMoveStep(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= approvers.length) return;
    const updated = [...approvers];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setApprovers(updated.map((s, i) => ({ ...s, order: i + 1 })));
  }

  function handleDeleteStep(index: number) {
    if (approvers.length <= 1) {
      toast.error("At least one approver step is required when approval is enabled");
      return;
    }
    const updated = approvers.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setApprovers(updated);
    toast.success("Approver step removed");
  }

  // Escalation
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [escalationDelay, setEscalationDelay] = useState(2);
  const [escalationTarget, setEscalationTarget] = useState("HR Head");
  const [secondEscalationEnabled, setSecondEscalationEnabled] = useState(false);
  const [secondEscalationDelay, setSecondEscalationDelay] = useState(2);
  const [secondEscalationTarget, setSecondEscalationTarget] = useState("Director");

  // Modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoHierarchyModalOpen, setAutoHierarchyModalOpen] = useState(false);
  const [selectedHierarchyTargetEmpId, setSelectedHierarchyTargetEmpId] = useState<string>("");
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [newTableRows, setNewTableRows] = useState(3);
  const [newTableCols, setNewTableCols] = useState(3);

  // Auto Hierarchy Target Employee & Computed Upward Tree Chain
  const hierarchyTargetEmployee = useMemo(() => {
    if (selectedHierarchyTargetEmpId) {
      return employees.find((e) => e.id === selectedHierarchyTargetEmpId) || employees[0] || null;
    }
    return employees.find((e) => !!e.managerId) || employees[0] || null;
  }, [employees, selectedHierarchyTargetEmpId]);

  const targetUpwardChain = useMemo(() => {
    if (!hierarchyTargetEmployee) return [];
    return getUpwardHierarchyChain(hierarchyTargetEmployee, employees, true);
  }, [hierarchyTargetEmployee, employees]);

  // Preloaded Signatures from Settings / docAssets
  const PRELOADED_SIGNATURES = useMemo(
    () => [
      {
        key: "authorisedSignatoryDataUrl",
        label: "Authorised Signatory",
        roleName: "Authorized Signatory",
        description: "Official Legal & Company Signatory",
        dataUrl: docAssets?.authorisedSignatoryDataUrl,
      },
      {
        key: "hrSignatureDataUrl",
        label: "HR Head / Manager",
        roleName: "HR Head (Priya Kumar)",
        description: "Human Resources Department",
        dataUrl: docAssets?.hrSignatureDataUrl,
      },
      {
        key: "mdSignatureDataUrl",
        label: "MD / Director",
        roleName: "Managing Director / Director",
        description: "Executive Director & MD Signature",
        dataUrl: docAssets?.mdSignatureDataUrl,
      },
      {
        key: "branchManagerSignatureDataUrl",
        label: "Branch Manager",
        roleName: "Branch Manager",
        description: "Branch & Unit Operations Signatory",
        dataUrl: docAssets?.branchManagerSignatureDataUrl,
      },
      {
        key: "factoryManagerSignatureDataUrl",
        label: "Factory Manager",
        roleName: "Factory Manager",
        description: "Plant & Factory Head Signatory",
        dataUrl: docAssets?.factoryManagerSignatureDataUrl,
      },
    ],
    [docAssets]
  );

  // Signature Block Builder Dialog
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [sigSourceType, setSigSourceType] = useState<"preloaded" | "custom">("preloaded");
  const [selectedPreloadedKey, setSelectedPreloadedKey] = useState<string>("authorisedSignatoryDataUrl");
  const [sigLayout, setSigLayout] = useState<"both" | "company_only" | "employee_only" | "three_parties">("both");
  const [sigCompanySignerRole, setSigCompanySignerRole] = useState("Authorized Signatory");
  const [sigCompanySignerCustom, setSigCompanySignerCustom] = useState("");
  const [sigCompanyOrgLabel, setSigCompanyOrgLabel] = useState("For {{company_name}}");
  const [sigMiddleSignerRole, setSigMiddleSignerRole] = useState("Reporting Manager");
  const [sigMiddleSignerCustom, setSigMiddleSignerCustom] = useState("");
  const [sigRecipientLabel, setSigRecipientLabel] = useState("Employee Acceptance");
  const [sigRecipientName, setSigRecipientName] = useState("{{employee_name}}");
  const [sigIncludeDate, setSigIncludeDate] = useState(true);
  const [sigIncludeDigitalStamp, setSigIncludeDigitalStamp] = useState(false);
  const [sigIncludeCompanySeal, setSigIncludeCompanySeal] = useState(false);

  // Approval Action Dialog
  const [approvalActionModalOpen, setApprovalActionModalOpen] = useState(false);
  const [approvalActionType, setApprovalActionType] = useState<"approve" | "forward" | "reject">("approve");
  const [approvalComment, setApprovalComment] = useState("");
  const [forwardTargetRole, setForwardTargetRole] = useState("CEO / Super Admin");
  const [activeStepIdToAct, setActiveStepIdToAct] = useState<string>("");

  // Detail View Tab
  const [detailActiveTab, setDetailActiveTab] = useState<"preview" | "tracking" | "versions" | "audit">("preview");

  // Dynamically ordered signatories for live composer preview based on Org Hierarchy Priority
  const previewSignatories = useMemo(() => {
    return getOrderedSignatories(
      approvers,
      selectedEmployee?.name || "Employee Signature",
      docLetterhead.companyName || company?.name || "CreatonsHR",
      docAssets
    );
  }, [approvers, selectedEmployee?.name, docLetterhead.companyName, company?.name, docAssets]);

  const activeDetailDoc = useMemo(() => {
    return documents.find((d) => d.id === selectedDocId) || documents[0] || null;
  }, [documents, selectedDocId]);

  // Filtered documents for hub table
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        doc.employeeName.toLowerCase().includes(q) ||
        doc.employeeCode.toLowerCase().includes(q) ||
        doc.docNumber.toLowerCase().includes(q) ||
        doc.department.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "DRAFT" && doc.status === "DRAFT") ||
        (statusFilter === "PENDING_APPROVAL" && (doc.status === "PENDING_APPROVAL" || doc.status === "PARTIALLY_APPROVED")) ||
        (statusFilter === "WAITING_EMPLOYEE" && doc.status === "PENDING_EMPLOYEE_ACTION") ||
        (statusFilter === "COMPLETED" && (doc.status === "COMPLETED" || doc.status === "ACKNOWLEDGED")) ||
        (statusFilter === "REJECTED" && doc.status === "REJECTED");

      return matchesQuery && matchesStatus;
    });
  }, [documents, searchQuery, statusFilter]);

  // Quick stats
  const stats = useMemo(() => {
    const total = documents.length;
    const inApproval = documents.filter((d) => d.status === "PENDING_APPROVAL" || d.status === "PARTIALLY_APPROVED").length;
    const waitingEmp = documents.filter((d) => d.status === "PENDING_EMPLOYEE_ACTION").length;
    const completed = documents.filter((d) => d.status === "COMPLETED" || d.status === "ACKNOWLEDGED").length;
    const drafts = documents.filter((d) => d.status === "DRAFT").length;
    return { total, inApproval, waitingEmp, completed, drafts };
  }, [documents]);

  // Handle Category Filter Change in Composer
  function handleCategoryFilterChange(cat: string) {
    setComposerCategory(cat);
    if (cat === "Custom") {
      setIsCustomDocName(true);
      setDocTypePresetId("custom");
      return;
    }
    const matchingPresets = cat === "ALL" 
      ? PRESET_DOCUMENTS 
      : PRESET_DOCUMENTS.filter((p) => p.category === cat);
    
    if (matchingPresets.length > 0 && !matchingPresets.some((p) => p.id === docTypePresetId)) {
      handlePresetChange(matchingPresets[0].id);
    }
  }

  function handleOpenAutoHierarchyModal() {
    if (!selectedHierarchyTargetEmpId) {
      const firstWithMgr = employees.find((e) => !!e.managerId) || employees[0];
      if (firstWithMgr) setSelectedHierarchyTargetEmpId(firstWithMgr.id);
    }
    setAutoHierarchyModalOpen(true);
  }

  // Build approval flow directly from Organization > Tree Structure for a specific employee
  function handleApplyAutoHierarchy(targetEmp?: Employee | null) {
    const emp = targetEmp || hierarchyTargetEmployee;
    if (!emp) {
      toast.error("Please select an employee to build the hierarchy");
      return;
    }

    // Extract exact upward tree branch (e.g. Employee 5 -> Employee 2 -> Employee 1)
    const upwardChain = getUpwardHierarchyChain(emp, employees, true);
    let newSteps: ApprovalStepItem[] = [];

    if (upwardChain.length > 0) {
      newSteps = upwardChain.map((mgr, idx) => {
        const isDirect = idx === 0;
        const isTop = idx === upwardChain.length - 1;
        let rolePosition = isDirect
          ? "Direct Reporting Manager (L1)"
          : isTop
          ? "Top Level Authority / Executive Signatory"
          : `Reporting Manager (L${idx + 1})`;

        return {
          id: `auto-hier-${mgr.id}-${idx + 1}`,
          category: "employee" as const,
          roleType: mgr.designation || rolePosition,
          approverEmployeeId: mgr.id,
          employeeSelectionMode: "single" as const,
          approverRoleOrName: `${mgr.name} (${mgr.designation || rolePosition})`,
          order: idx + 1,
          status: "pending" as const,
          requireSignature: true,
        };
      });
    } else {
      // Top Level Employee / CEO (has no upward manager in tree)
      newSteps = [
        {
          id: `auto-hier-${emp.id}-top`,
          category: "employee" as const,
          roleType: emp.designation || "Executive / Authorized Signatory",
          approverEmployeeId: emp.id,
          employeeSelectionMode: "single" as const,
          approverRoleOrName: `${emp.name} (${emp.designation || "Managing Director / CEO"})`,
          order: 1,
          status: "pending" as const,
          requireSignature: true,
        },
      ];
    }

    setApprovalRequired(true);
    setApprovalMode("sequential");
    setApprovers(newSteps);
    setAutoHierarchyModalOpen(false);

    const stepSummary = newSteps.map((s) => s.approverRoleOrName).join(" → ");
    toast.success(`✨ Auto Hierarchy applied for ${emp.name}!`, {
      description: `Tree Flow: ${emp.name} → ${stepSummary}`,
    });
  }

  // Start new document flow
  function handleStartNewDoc(presetId = "appointment_letter") {
    const preset = PRESET_DOCUMENTS.find((p) => p.id === presetId) || PRESET_DOCUMENTS[0];

    setEditingDocId(null);
    setDocTypePresetId(preset.id);
    setComposerCategory(preset.category || "I. Onboarding");
    setIsCustomDocName(false);
    setCustomDocName("");
    setCustomCategoryName("");
    setDocContentHtml(preset.templateBody);
    setDeliveryChannel("both");
    setDeliverySubject(preset.defaultSubject);
    setApprovalRequired(true);
    setApprovalMode(preset.defaultApprovalMode);
    setApprovers(
      preset.defaultApprovers.map((name, i) => ({
        id: `s-${i + 1}`,
        category: "role" as const,
        roleType: name,
        approverRoleOrName: name,
        order: i + 1,
        status: "pending",
        requireSignature: true,
      }))
    );
    setIncludeCompanySeal(true);
    setEscalationEnabled(true);
    setEscalationDelay(2);
    setEscalationTarget("HR Head");
    setSecondEscalationEnabled(false);

    // Initial table if appointment letter
    if (preset.id === "appointment_letter") {
      setCustomTable({
        id: "tbl-salary",
        caption: "Compensation Breakdown",
        headers: ["Component", "Monthly (INR)", "Annual (INR)", "Tax Rule"],
        rows: [
          ["Basic Pay", "₹ 35,000", "₹ 4,20,000", "Taxable"],
          ["House Rent Allowance (HRA)", "₹ 17,500", "₹ 2,10,000", "Exemption per IT rules"],
          ["Special Allowance", "₹ 12,500", "₹ 1,50,000", "Taxable"],
          ["Total Gross CTC", "₹ 65,000", "₹ 7,80,000", "Gross Package"],
        ],
      });
    } else {
      setCustomTable(null);
    }

    setDocLetterhead(
      preset.defaultLetterhead || {
        enabled: true,
        style: docAssets?.letterheadDataUrl ? "uploaded" : "modern",
        showLogo: true,
        companyName: company?.name || "CreatonsHR Technologies Pvt. Ltd.",
        tagline: "Enterprise Workforce & People Operations",
        address: company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096",
        email: company?.email || "hr@creatonshr.com",
        phone: company?.phone || "+91 44 2876 5400",
        website: "www.creatonshr.com",
        cin: "U72200TN2026PTC109823",
      }
    );

    setDocFooter(
      preset.defaultFooter || {
        enabled: true,
        style: docAssets?.footerDataUrl ? "uploaded" : "standard",
        showPageNumbers: true,
        showConfidentialNotice: true,
        confidentialText: "STRICTLY CONFIDENTIAL • FOR AUTHORIZED RECIPIENT ONLY",
        registeredOfficeText: `${company?.name || "CreatonsHR"} | Reg. Office: ${company?.address || "Tower B, Silicon Heights, OMR, Chennai"}`,
      }
    );

    setViewMode("composer");
  }

  // Load existing document into composer (for Drafts or Rejected docs)
  function handleEditExistingDoc(doc: DigitalDocument) {
    setEditingDocId(doc.id);
    setIsCustomDocName(doc.isCustomName);
    setCustomDocName(doc.isCustomName ? doc.name : "");
    setCustomCategoryName(doc.isCustomName ? ((doc as any).category || "") : "");
    const matchedPreset = PRESET_DOCUMENTS.find((p) => p.name === doc.documentType || p.name === doc.name);
    setDocTypePresetId(matchedPreset ? matchedPreset.id : "custom");
    if (matchedPreset?.category) {
      setComposerCategory(matchedPreset.category);
    }

    setDocContentHtml(doc.contentHtml);
    setCustomTable(doc.tableData || null);
    if (doc.letterhead) {
      setDocLetterhead(doc.letterhead);
    }
    if (doc.footer) {
      setDocFooter(doc.footer);
    }
    setDeliveryChannel(doc.delivery.channel);
    setDeliverySubject(doc.delivery.subject);
    setApprovalRequired(doc.approvalRequired);
    setApprovalMode(doc.approvalMode);
    setApprovers(
      doc.approvers?.length > 0
        ? doc.approvers.map((a) => ({
            ...a,
            requireSignature: a.requireSignature ?? true,
          }))
        : [
            {
              id: "s-1",
              category: "role",
              roleType: "HR Manager",
              approverRoleOrName: "HR Manager",
              order: 1,
              status: "pending",
              requireSignature: true,
            },
          ]
    );
    setIncludeCompanySeal(doc.includeCompanySeal !== false);
    setEscalationEnabled(doc.escalation.enabled);
    setEscalationDelay(doc.escalation.delayDays);
    setEscalationTarget(doc.escalation.escalateTo);
    setSecondEscalationEnabled(!!doc.escalation.secondEscalationEnabled);
    setSecondEscalationDelay(doc.escalation.secondDelayDays || 2);
    setSecondEscalationTarget(doc.escalation.secondEscalateTo || "Director");

    setViewMode("composer");
  }

  // Handle Preset Change
  function handlePresetChange(presetId: string) {
    if (presetId === "custom") {
      setIsCustomDocName(true);
      setDocTypePresetId("custom");
      return;
    }
    const preset = PRESET_DOCUMENTS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsCustomDocName(false);
    setDocTypePresetId(preset.id);
    if (preset.category) {
      setComposerCategory(preset.category);
    }
    setDocContentHtml(preset.templateBody);
    setDeliverySubject(preset.defaultSubject);
    setApprovalMode(preset.defaultApprovalMode);
    setApprovers(
      preset.defaultApprovers.map((name, i) => ({
        id: `s-${Date.now()}-${i}`,
        category: "role" as const,
        roleType: name,
        approverRoleOrName: name,
        order: i + 1,
        status: "pending",
        requireSignature: true,
      }))
    );
  }

  // Insert Dynamic Tag at cursor / append
  function insertDynamicTag(tag: string) {
    setDocContentHtml((prev) => `${prev} <strong>${tag}</strong> `);
    toast.success(`Inserted ${tag}`);
  }

  // Insert Table
  function handleInsertTable() {
    const headers = Array.from({ length: newTableCols }, (_, i) => `Column ${i + 1}`);
    const rows = Array.from({ length: newTableRows }, () =>
      Array.from({ length: newTableCols }, () => "—")
    );
    setCustomTable({
      id: `tbl-${Date.now()}`,
      caption: "Document Table Annexure",
      headers,
      rows,
    });
    setTableModalOpen(false);
    toast.success(`Inserted ${newTableRows}x${newTableCols} Table`);
  }

  // Insert Configured Signature Block
  function handleInsertSignatureBlock() {
    const selectedSigObj = PRELOADED_SIGNATURES.find((s) => s.key === selectedPreloadedKey);
    const activeSigImgUrl = sigSourceType === "preloaded" ? selectedSigObj?.dataUrl : undefined;

    const firstRole = sigSourceType === "preloaded"
      ? (selectedSigObj?.roleName || sigCompanySignerRole)
      : sigCompanySignerRole === "custom"
      ? (sigCompanySignerCustom.trim() || "Authorized Official")
      : sigCompanySignerRole;

    const middleRole = sigMiddleSignerRole === "custom" ? (sigMiddleSignerCustom.trim() || "Witness / Counterpart") : sigMiddleSignerRole;
    const dateLine = sigIncludeDate ? '<p style="color: #64748b; font-size: 11px; margin-top: 6px;">Date: ____________ &nbsp;&nbsp; Place: ____________</p>' : '';
    const digitalStamp = sigIncludeDigitalStamp ? '<div style="margin-top: 8px; display: inline-block; padding: 4px 8px; border: 1px dashed #6366f1; background: #eef2ff; color: #4338ca; border-radius: 4px; font-size: 10px; font-family: monospace;">✓ Digitally Signed via CreatonsHR</div>' : '';

    const sigImageBlock = activeSigImgUrl
      ? `<div style="margin-bottom: 6px;"><img src="${activeSigImgUrl}" alt="${firstRole}" style="max-height: 48px; max-width: 160px; object-fit: contain; display: block;" /></div>`
      : '';

    const sealBox = (sigIncludeCompanySeal && docAssets?.companySealDataUrl)
      ? `<div style="margin-top: 6px;"><img src="${docAssets.companySealDataUrl}" alt="Company Seal" style="max-height: 48px; max-width: 48px; object-fit: contain; display: block;" /></div>`
      : sigIncludeCompanySeal
      ? '<div style="margin-top: 6px; width: 70px; height: 32px; border: 1px dotted #cbd5e1; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px;">[ Seal ]</div>'
      : '';

    let blockHtml = "";

    if (sigLayout === "both") {
      blockHtml = `\n<div style="margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; gap: 24px;">
  <div style="min-width: 200px; flex: 1;">
    <p style="font-weight: bold; margin-bottom: 16px; color: #1e293b;">${sigCompanyOrgLabel}</p>
    ${sigImageBlock}
    <div style="border-top: 1px solid #94a3b8; width: 170px; margin-bottom: 4px;"></div>
    <p style="font-weight: 600; margin: 0; font-size: 12px; color: #0f172a;">${firstRole}</p>
    <p style="color: #64748b; font-size: 11px; margin: 0;">{{company_name}}</p>
    ${sealBox}
    ${digitalStamp}
    ${dateLine}
  </div>
  <div style="min-width: 200px; flex: 1; text-align: right;">
    <p style="font-weight: bold; margin-bottom: 24px; color: #1e293b;">${sigRecipientLabel}</p>
    <div style="border-top: 1px solid #94a3b8; width: 170px; margin-left: auto; margin-bottom: 4px;"></div>
    <p style="font-weight: 600; margin: 0; font-size: 12px; color: #0f172a;">${sigRecipientName}</p>
    <p style="color: #64748b; font-size: 11px; margin: 0;">Signature & Acknowledgment</p>
    ${dateLine}
  </div>
</div>\n`;
    } else if (sigLayout === "company_only") {
      blockHtml = `\n<div style="margin-top: 36px; max-width: 260px; page-break-inside: avoid;">
  <p style="font-weight: bold; margin-bottom: 16px; color: #1e293b;">${sigCompanyOrgLabel}</p>
  ${sigImageBlock}
  <div style="border-top: 1px solid #94a3b8; width: 180px; margin-bottom: 4px;"></div>
  <p style="font-weight: 600; margin: 0; font-size: 12px; color: #0f172a;">${firstRole}</p>
  <p style="color: #64748b; font-size: 11px; margin: 0;">{{company_name}}</p>
  ${sealBox}
  ${digitalStamp}
  ${dateLine}
</div>\n`;
    } else if (sigLayout === "employee_only") {
      blockHtml = `\n<div style="margin-top: 36px; max-width: 260px; margin-left: auto; text-align: right; page-break-inside: avoid;">
  <p style="font-weight: bold; margin-bottom: 24px; color: #1e293b;">${sigRecipientLabel}</p>
  <div style="border-top: 1px solid #94a3b8; width: 180px; margin-left: auto; margin-bottom: 4px;"></div>
  <p style="font-weight: 600; margin: 0; font-size: 12px; color: #0f172a;">${sigRecipientName}</p>
  <p style="color: #64748b; font-size: 11px; margin: 0;">Recipient Signature</p>
  ${dateLine}
</div>\n`;
    } else if (sigLayout === "three_parties") {
      blockHtml = `\n<div style="margin-top: 36px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; page-break-inside: avoid;">
  <div>
    <p style="font-weight: bold; margin-bottom: 16px; color: #1e293b;">${sigCompanyOrgLabel}</p>
    ${sigImageBlock}
    <div style="border-top: 1px solid #94a3b8; width: 130px; margin-bottom: 4px;"></div>
    <p style="font-weight: 600; margin: 0; font-size: 12px; color: #0f172a;">${firstRole}</p>
    <p style="color: #64748b; font-size: 11px; margin: 0;">Authorized Official</p>
    ${sealBox}
    ${dateLine}
  </div>
  <div>
    <p style="font-weight: bold; margin-bottom: 24px; color: #1e293b;">Department / Witness</p>
    <div style="border-top: 1px solid #94a3b8; width: 130px; margin-bottom: 4px;"></div>
    <p style="font-weight: 600; margin: 0; font-size: 12px; color: #0f172a;">${middleRole}</p>
    <p style="color: #64748b; font-size: 11px; margin: 0;">Countersignatory</p>
    ${dateLine}
  </div>
  <div style="text-align: right;">
    <p style="font-weight: bold; margin-bottom: 24px; color: #1e293b;">${sigRecipientLabel}</p>
    <div style="border-top: 1px solid #94a3b8; width: 130px; margin-left: auto; margin-bottom: 4px;"></div>
    <p style="font-weight: 600; margin: 0; font-size: 12px; color: #0f172a;">${sigRecipientName}</p>
    <p style="color: #64748b; font-size: 11px; margin: 0;">Recipient Signature</p>
    ${dateLine}
  </div>
</div>\n`;
    }

    setDocContentHtml((prev) => `${prev}${blockHtml}`);
    setSignatureModalOpen(false);
    toast.success("Configured signature block added to document!");
  }

  // Save Document Template / Draft
  function handleSaveDraft() {
    const docName = isCustomDocName
      ? customDocName.trim() || "Custom HR Document"
      : PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId)?.name || "HR Digital Document";

    const matchedPreset = PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId);
    const matchedCategory = (isCustomDocName || composerCategory === "Custom")
      ? (customCategoryName.trim() || (composerCategory !== "ALL" && composerCategory !== "Custom" ? composerCategory : "Custom"))
      : matchedPreset?.category || composerCategory || "General";
    const sampleEmp = employees[0];

    const payload = {
      name: docName,
      documentType: isCustomDocName ? "Custom" : docName,
      isCustomName: isCustomDocName,
      category: matchedCategory,
      employeeId: sampleEmp?.id || "sample-emp",
      employeeName: sampleEmp?.name || "Sample Employee",
      employeeCode: sampleEmp?.empCode || "EMP-001",
      designation: sampleEmp?.designation || "Staff Member",
      department: sampleEmp?.department || "General",
      employeeEmail: sampleEmp?.email || "employee@company.com",
      contentHtml: docContentHtml,
      tableData: customTable,
      letterhead: docLetterhead,
      footer: docFooter,
      delivery: {
        channel: deliveryChannel,
        recipientEmail: sampleEmp?.email || "employee@company.com",
        subject: deliverySubject || `${docName} — Template`,
      },
      approvalRequired,
      approvalMode,
      approvers,
      includeCompanySeal,
      currentStepIndex: 0,
      escalation: {
        enabled: escalationEnabled,
        delayDays: escalationDelay,
        escalateTo: escalationTarget,
        secondEscalationEnabled,
        secondDelayDays: secondEscalationDelay,
        secondEscalateTo: secondEscalationTarget,
      },
      status: "DRAFT" as DigitalDocumentStatus,
    };

    if (editingDocId) {
      updateDocument(editingDocId, payload, "Saved updated document template");
      toast.success("Document template updated successfully");
    } else {
      const created = addDocument(payload);
      setEditingDocId(created.id);
      toast.success("Document template saved successfully");
    }
  }

  // Open Approval Dialog for a step
  function openApprovalStepDialog(stepId: string, actionType: "approve" | "forward" | "reject") {
    setActiveStepIdToAct(stepId);
    setApprovalActionType(actionType);
    setApprovalComment("");
    setForwardTargetRole("CEO / Super Admin");
    setApprovalActionModalOpen(true);
  }

  function handleExecuteApprovalStep() {
    if (!activeDetailDoc || !activeStepIdToAct) return;

    const actorName = currentUser?.name || "HR Manager";

    if (approvalActionType === "approve") {
      approveStep(activeDetailDoc.id, activeStepIdToAct, actorName, approvalComment);
      toast.success("Approval step confirmed!");
    } else if (approvalActionType === "forward") {
      forwardStep(activeDetailDoc.id, activeStepIdToAct, forwardTargetRole, actorName, approvalComment);
      toast.success(`Approved and forwarded to ${forwardTargetRole}`);
    } else {
      if (!approvalComment.trim()) {
        toast.error("Please provide a reason for rejection");
        return;
      }
      rejectStep(activeDetailDoc.id, activeStepIdToAct, actorName, approvalComment);
      toast.error("Document rejected with remarks");
    }

    setApprovalActionModalOpen(false);
  }

  // Download PDF
  function handleDownloadPDF(doc: DigitalDocument) {
    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const emp = employees.find((e) => e.id === doc.employeeId) || {
        id: doc.employeeId,
        name: doc.employeeName,
        empCode: doc.employeeCode,
        designation: doc.designation,
        department: doc.department,
        email: doc.employeeEmail,
      };

      const resolved = resolveDocumentTags(doc.contentHtml, emp, company);
      // Strip HTML tags for PDF text
      const cleanText = resolved.replace(/<[^>]*>?/gm, "\n").replace(/\n\s*\n/g, "\n\n");

      const lh = doc.letterhead;
      const ft = doc.footer;
      let startBodyY = 70;

      // 1. Company Letterhead Header (if enabled)
      if (!lh || lh.enabled !== false) {
        const lhImage = (lh?.style === "uploaded" && docAssets?.letterheadDataUrl) || lh?.customBannerUrl;
        if (lhImage) {
          try {
            pdf.addImage(lhImage, "PNG", 40, 20, 515, 60);
            startBodyY = 95;
          } catch {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(15);
            pdf.setTextColor(15, 23, 42);
            const compName = lh?.companyName || company?.name || "CreatonsHR Technologies Pvt. Ltd.";
            pdf.text(compName, 40, 50);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8.5);
            pdf.setTextColor(100, 116, 139);
            const addr = lh?.address || company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096";
            pdf.text(addr, 40, 64);
            const contact = `Email: ${lh?.email || company?.email || "hr@creatonshr.com"} | Phone: ${lh?.phone || company?.phone || "+91 44 2876 5400"}${lh?.cin ? ` | CIN: ${lh.cin}` : ""}`;
            pdf.text(contact, 40, 76);

            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(1.5);
            pdf.line(40, 88, 555, 88);

            startBodyY = 115;
          }
        } else {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(15);
          pdf.setTextColor(15, 23, 42);
          const compName = lh?.companyName || company?.name || "CreatonsHR Technologies Pvt. Ltd.";
          pdf.text(compName, 40, 50);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 116, 139);
          const addr = lh?.address || company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096";
          pdf.text(addr, 40, 64);
          const contact = `Email: ${lh?.email || company?.email || "hr@creatonshr.com"} | Phone: ${lh?.phone || company?.phone || "+91 44 2876 5400"}${lh?.cin ? ` | CIN: ${lh.cin}` : ""}`;
          pdf.text(contact, 40, 76);

          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(1.5);
          pdf.line(40, 88, 555, 88);

          startBodyY = 115;
        }
      }

      // 2. Doc Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(30, 41, 59);
      pdf.text(doc.name.toUpperCase(), 40, startBodyY);

      // 3. Body Content
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(51, 65, 85);
      const splitLines = pdf.splitTextToSize(cleanText, 515);
      pdf.text(splitLines, 40, startBodyY + 22);

      let currentY = startBodyY + 22 + splitLines.length * 12 + 20;

      // 4. Table if exists
      if (doc.tableData && doc.tableData.rows.length > 0) {
        autoTable(pdf, {
          startY: currentY,
          head: [doc.tableData.headers],
          body: doc.tableData.rows,
          theme: "striped",
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
          margin: { left: 40, right: 40 },
        });
        currentY = (pdf as any).lastAutoTable.finalY + 30;
      }

      // 5. Signatures (Distributed Left to Right by Organizational Priority)
      if (currentY > 660) {
        pdf.addPage();
        currentY = 60;
      }

      const pdfSignatories = getOrderedSignatories(
        doc.approvers,
        doc.employeeName,
        company?.name || "CreatonsHR Technologies Pvt. Ltd.",
        docAssets
      );

      const numSigners = pdfSignatories.length;
      if (numSigners > 0 || (doc.includeCompanySeal !== false && docAssets?.companySealDataUrl)) {
        if (currentY > 660) {
          pdf.addPage();
          currentY = 60;
        }

        const startX = 40;
        const endX = 390;
        const spacing = numSigners > 1 ? (endX - startX) / (numSigners - 1) : 0;

        pdfSignatories.forEach((sig, sIdx) => {
          const x = numSigners === 1 ? startX : startX + sIdx * spacing;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(15, 23, 42);
          pdf.text(sig.label || sig.roleTitle, x, currentY);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(sig.signerName, x, currentY + 14);
          if (sig.roleTitle && sig.roleTitle !== sig.label) {
            pdf.text(sig.roleTitle, x, currentY + 24);
          }
        });

        if (doc.includeCompanySeal !== false && docAssets?.companySealDataUrl) {
          try {
            const sealX = numSigners === 2 ? (startX + endX) / 2 - 8 : numSigners === 0 ? 200 : 240;
            pdf.addImage(docAssets.companySealDataUrl, "PNG", sealX, currentY - 15, 42, 42);
          } catch {
            // Ignore seal render error in PDF if format unsupported
          }
        }
      }

      // 6. Footer (if enabled)
      if (!ft || ft.enabled !== false) {
        const pageCount = (pdf as any).internal.getNumberOfPages();
        const ftImage = (ft?.style === "uploaded" && docAssets?.footerDataUrl) || ft?.customBannerUrl;
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          if (ftImage) {
            try {
              pdf.addImage(ftImage, "PNG", 40, 785, 515, 38);
            } catch {
              pdf.setDrawColor(226, 232, 240);
              pdf.setLineWidth(1);
              pdf.line(40, 800, 555, 800);

              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(8);
              pdf.setTextColor(148, 163, 184);
              const conf = ft?.confidentialText || "STRICTLY CONFIDENTIAL • FOR AUTHORIZED RECIPIENT USE ONLY";
              pdf.text(conf, 40, 814);

              if (ft?.showPageNumbers !== false) {
                pdf.text(`Page ${i} of ${pageCount}`, 510, 814);
              }
            }
          } else {
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(1);
            pdf.line(40, 800, 555, 800);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184);
            const conf = ft?.confidentialText || "STRICTLY CONFIDENTIAL • FOR AUTHORIZED RECIPIENT USE ONLY";
            pdf.text(conf, 40, 814);

            if (ft?.showPageNumbers !== false) {
              pdf.text(`Page ${i} of ${pageCount}`, 510, 814);
            }
          }
        }
      }

      pdf.save(`${doc.docNumber}_${doc.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF generated and downloaded!");
    } catch (err) {
      console.error("PDF generation failed", err);
      toast.error("Failed to generate PDF");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* VIEW 1: HUB / LIST VIEW */}
      {viewMode === "list" && (
        <div className="space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Compose, approve, dispatch, and track verifiable digital HR documents with one smooth email-like workflow.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="text-xs text-muted-foreground hover:text-foreground"
                title="Reset mock documents to default"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Demo
              </Button>
              <Button
                size="lg"
                onClick={() => handleStartNewDoc()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md gap-2 rounded-xl px-5"
              >
                <Plus className="h-5 w-5" />
                <span>+ Create Document</span>
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div
              onClick={() => setStatusFilter("ALL")}
              className={`p-3.5 rounded-xl border bg-card cursor-pointer transition-all hover:border-primary/40 ${
                statusFilter === "ALL" ? "ring-2 ring-primary border-transparent shadow-sm" : ""
              }`}
            >
              <div className="text-xs text-muted-foreground font-medium">All Documents</div>
              <div className="text-2xl font-bold mt-1 text-foreground">{stats.total}</div>
            </div>

            <div
              onClick={() => setStatusFilter("PENDING_APPROVAL")}
              className={`p-3.5 rounded-xl border bg-card cursor-pointer transition-all hover:border-amber-500/40 ${
                statusFilter === "PENDING_APPROVAL" ? "ring-2 ring-amber-500 border-transparent shadow-sm" : ""
              }`}
            >
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> In Approval
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">{stats.inApproval}</div>
            </div>

            <div
              onClick={() => setStatusFilter("WAITING_EMPLOYEE")}
              className={`p-3.5 rounded-xl border bg-card cursor-pointer transition-all hover:border-blue-500/40 ${
                statusFilter === "WAITING_EMPLOYEE" ? "ring-2 ring-blue-500 border-transparent shadow-sm" : ""
              }`}
            >
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" /> Waiting on Emp
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">{stats.waitingEmp}</div>
            </div>

            <div
              onClick={() => setStatusFilter("COMPLETED")}
              className={`p-3.5 rounded-xl border bg-card cursor-pointer transition-all hover:border-emerald-500/40 ${
                statusFilter === "COMPLETED" ? "ring-2 ring-emerald-500 border-transparent shadow-sm" : ""
              }`}
            >
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">{stats.completed}</div>
            </div>

            <div
              onClick={() => setStatusFilter("DRAFT")}
              className={`p-3.5 rounded-xl border bg-card cursor-pointer transition-all hover:border-slate-500/40 ${
                statusFilter === "DRAFT" ? "ring-2 ring-slate-500 border-transparent shadow-sm" : ""
              }`}
            >
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Edit3 className="h-3.5 w-3.5" /> Drafts
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">{stats.drafts}</div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search document, employee, ID, ref..."
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "PENDING_APPROVAL", "WAITING_EMPLOYEE", "COMPLETED", "REJECTED", "DRAFT"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {st === "ALL"
                    ? "All"
                    : st === "PENDING_APPROVAL"
                    ? "In Approval"
                    : st === "WAITING_EMPLOYEE"
                    ? "Waiting Employee"
                    : st === "COMPLETED"
                    ? "Completed"
                    : st === "REJECTED"
                    ? "Rejected"
                    : "Drafts"}
                </button>
              ))}
            </div>
          </div>

          {/* Document Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Recipient Employee</th>
                    <th className="px-4 py-3">Delivery</th>
                    <th className="px-4 py-3">Approval Workflow</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDocuments.map((doc) => {
                    const emp = employees.find((e) => e.id === doc.employeeId);
                    return (
                      <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <div
                                onClick={() => {
                                  setSelectedDocId(doc.id);
                                  setViewMode("detail");
                                }}
                                className="font-semibold text-sm text-foreground hover:text-primary cursor-pointer hover:underline"
                              >
                                {doc.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {doc.docNumber} · {new Date(doc.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs">
                              {doc.employeeName[0]}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{doc.employeeName}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {doc.employeeCode} · {doc.designation}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {doc.delivery.channel === "email" && (
                              <Badge variant="outline" className="text-[10px] gap-1 font-normal bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20">
                                <Mail className="h-3 w-3" /> Email
                              </Badge>
                            )}
                            {doc.delivery.channel === "app" && (
                              <Badge variant="outline" className="text-[10px] gap-1 font-normal bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                                <Smartphone className="h-3 w-3" /> CreatonsHR App
                              </Badge>
                            )}
                            {doc.delivery.channel === "both" && (
                              <Badge variant="outline" className="text-[10px] gap-1 font-normal bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                                <Layers className="h-3 w-3" /> Email + App
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {!doc.approvalRequired ? (
                            <span className="text-[11px] text-muted-foreground">Not Required (Direct)</span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1 font-medium capitalize text-[11px]">
                                <GitBranch className="h-3 w-3 text-primary" />
                                <span>{doc.approvalMode.replace(/_/g, " ")}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                {doc.approvers.map((a) => a.approverRoleOrName).join(" → ")}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadgeView status={doc.status} />
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted border border-border">
                            v{doc.currentVersion}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedDocId(doc.id);
                                setViewMode("detail");
                                setDetailActiveTab("tracking");
                              }}
                              className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                              title="Track progress timeline"
                            >
                              <Clock className="h-3.5 w-3.5 mr-1" /> Track
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDocId(doc.id);
                                setViewMode("detail");
                                setDetailActiveTab("preview");
                              }}
                              className="h-7 text-xs px-2"
                              title="View Document"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Edit allowed for Draft or Rejected */}
                            {(doc.status === "DRAFT" || doc.status === "REJECTED") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditExistingDoc(doc)}
                                className="h-7 text-xs px-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                title="Edit Document"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  •••
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onClick={() => handleDownloadPDF(doc)}>
                                  <FileDown className="h-3.5 w-3.5 mr-2 text-primary" /> Download PDF
                                </DropdownMenuItem>
                                {doc.status === "PENDING_EMPLOYEE_ACTION" && (
                                  <DropdownMenuItem onClick={() => acknowledgeDocument(doc.id)}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Simulate Employee Ack
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => deleteDocument(doc.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Document
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDocuments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        No documents found matching the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DIGITAL DOCUMENT COMPOSER */}
      {viewMode === "composer" && (
        <div className="space-y-5">
          {/* Top Header */}
          <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Documents
              </Button>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div>
                <h2 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                  {editingDocId ? "Edit Digital Document" : "Create Digital Document"}
                  <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                    Composer
                  </Badge>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewOpen(true)}
                className="text-xs gap-1.5 h-9 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDraft}
                className="text-xs gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm px-4"
              >
                <Save className="h-3.5 w-3.5" /> Save Document
              </Button>
            </div>
          </div>

          {/* Section 2: Document Category, Name & Template Configuration (Reference: Approval Settings > Documents) */}
          <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-display">
                    Document Category & Template Selection
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Select standard document category and predefined template, or compose a custom document.
                  </p>
                </div>
              </div>
              {selectedPreset && !isCustomDocName && (
                <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20">
                  {selectedPreset.category}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* 1. Category Dropdown */}
              <div className="md:col-span-4 space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" /> Document Category
                </Label>
                <Select value={composerCategory} onValueChange={handleCategoryFilterChange}>
                  <SelectTrigger className="text-xs h-9 font-medium bg-background">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-72">
                    <SelectItem value="ALL" className="font-semibold">
                      📁 All Categories ({PRESET_DOCUMENTS.length})
                    </SelectItem>
                    <DropdownMenuSeparator />
                    {DOCUMENT_CATEGORIES.map((cat) => {
                      const count = PRESET_DOCUMENTS.filter((p) => p.category === cat).length;
                      return (
                        <SelectItem key={cat} value={cat}>
                          {cat} ({count})
                        </SelectItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <SelectItem value="Custom" className="font-semibold text-primary">
                      ✨ Custom / Other Documents
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Document Name & Template Dropdown */}
              <div className="md:col-span-8 space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Document Name & Template
                </Label>
                <Select
                  value={isCustomDocName ? "custom" : docTypePresetId}
                  onValueChange={handlePresetChange}
                >
                  <SelectTrigger className="text-xs h-9 font-medium bg-background">
                    <SelectValue placeholder="Select document template" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-80">
                    {displayedCategories.map((cat) => {
                      const items = PRESET_DOCUMENTS.filter((p) => p.category === cat);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat}>
                          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-bold px-2 py-1 bg-muted/30">
                            {cat}
                          </DropdownMenuLabel>
                          {items.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.name}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <SelectItem value="custom" className="font-semibold text-primary">
                      ✨ + Create Custom Document Name
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Category & Custom Document Title Inputs */}
            {(isCustomDocName || composerCategory === "Custom") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" /> Custom Document Category
                  </Label>
                  <Input
                    placeholder="Enter custom category (e.g., Legal, HR Policy, Operations)..."
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Specify the category or functional area for this custom document.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Custom Document Name / Title
                  </Label>
                  <Input
                    placeholder="Enter custom document title (e.g., Relocation Letter, Project Bonus)..."
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                    className="text-xs h-9 bg-background"
                    autoFocus
                  />
                  <p className="text-[10px] text-muted-foreground">
                    This document title will appear in document headers, PDFs, and approval matrices.
                  </p>
                </div>
              </div>
            )}

            {/* Active Template Quick Info Description */}
            {!isCustomDocName && selectedPreset && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{selectedPreset.description}</span>
              </div>
            )}
          </div>

          {/* Section 4 & 5: Primary MS Word WYSIWYG Document Editor */}
          <DocWordEditor
            value={docContentHtml}
            onChange={setDocContentHtml}
            selectedEmployee={selectedEmployee}
            company={company}
            docAssets={docAssets}
            letterhead={docLetterhead}
            onLetterheadChange={setDocLetterhead}
            footer={docFooter}
            onFooterChange={setDocFooter}
            customTable={customTable}
            onTableChange={setCustomTable}
            onOpenSignatureModal={() => setSignatureModalOpen(true)}
            onOpenTableModal={() => setTableModalOpen(true)}
            documentTitle={
              isCustomDocName
                ? customDocName.trim() || "Custom Document"
                : PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId)?.name || "Document"
            }
            recipientInfoText={
              selectedEmployee
                ? `Resolving sample: ${selectedEmployee.name} (${selectedEmployee.empCode})`
                : undefined
            }
          />

          {/* Section 9: Approval & Escalation Configuration */}
          <div className="space-y-6">
            {/* Auto-Escalation Protocol */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Auto-Escalation & SLA Protocol
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Enabled</span>
                  <Switch checked={escalationEnabled} onCheckedChange={setEscalationEnabled} />
                </div>
              </div>

                {escalationEnabled ? (
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground font-semibold">Level 1 Escalation Trigger</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Escalate after</span>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={escalationDelay}
                          onChange={(e) => setEscalationDelay(Number(e.target.value))}
                          className="h-8 w-16 text-center text-xs"
                        />
                        <span className="text-muted-foreground">days without action to:</span>
                      </div>
                    </div>

                    <Select value={escalationTarget} onValueChange={setEscalationTarget}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="HR Head">HR Head (Priya Kumar)</SelectItem>
                        <SelectItem value="Director">Director / Board Signatory</SelectItem>
                        <SelectItem value="CEO / Super Admin">CEO / Super Admin</SelectItem>
                        {roles?.map((r) => (
                          <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="pt-2 border-t border-border">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-muted-foreground">
                        <Checkbox
                          checked={secondEscalationEnabled}
                          onCheckedChange={(c) => setSecondEscalationEnabled(!!c)}
                        />
                        <span>Enable Level 2 Escalation Chain</span>
                      </label>

                      {secondEscalationEnabled && (
                        <div className="mt-2 space-y-2 pl-4 border-l-2 border-primary/30 animate-in fade-in-50">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span>After additional +</span>
                            <Input
                              type="number"
                              value={secondEscalationDelay}
                              onChange={(e) => setSecondEscalationDelay(Number(e.target.value))}
                              className="h-7 w-12 text-center text-xs"
                            />
                            <span>days → Escalate to Director / Board</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/20 border border-dashed text-center text-xs text-muted-foreground">
                    Escalation protocol is disabled. Unapproved documents will stay in current queue.
                  </div>
                )}
              </div>

            {/* Prominent Full-Width Approval Matrix & Signatory Workflow Designer */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground uppercase tracking-wider font-display">
                      3. Multi-Stage Approval Matrix & Sign-off Hierarchy
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure custom approver sequence, assign specific employees or organizational roles, and enforce e-signatures.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border">
                    <span className="text-xs font-semibold text-foreground">Approval Required</span>
                    <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
                  </div>

                  {approvalRequired && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleOpenAutoHierarchyModal}
                        className="border-primary/40 text-primary bg-primary/5 hover:bg-primary hover:text-white text-xs font-semibold rounded-xl shadow-xs gap-1.5 h-9"
                        title="Automatically generate approval pipeline from Organization Tree Structure"
                      >
                        <Network className="h-3.5 w-3.5" /> Auto Hierarchy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddApproverStep}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl shadow-xs gap-1.5 h-9"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Approver
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {approvalRequired ? (
                <div className="space-y-4">
                  {/* Approval Mode Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                    <div>
                      <span className="text-xs font-bold text-foreground">Workflow Execution Strategy</span>
                      <p className="text-[11px] text-muted-foreground">
                        Control how document moves through multiple approvers
                      </p>
                    </div>

                    <div className="w-full sm:w-72">
                      <Select
                        value={approvalMode}
                        onValueChange={(v) => setApprovalMode(v as ApprovalMode)}
                      >
                        <SelectTrigger className="text-xs h-8 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="sequential">
                            Sequential (Ordered Step-by-Step Flow)
                          </SelectItem>
                          <SelectItem value="all_must_approve">
                            Parallel (All Approvers Must Approve)
                          </SelectItem>
                          <SelectItem value="any_one">
                            Quorum (Any One Approver Can Approve)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Configured Approvers List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                        Approver Hierarchy Pipeline ({approvers.length} Steps Configured)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Drag/order steps and mark required signatures
                      </span>
                    </div>

                    <div className="space-y-3">
                      {approvers.map((step, idx) => {
                        const isEmployeeCategory =
                          step.category === "employee" || step.roleType === "Employee";
                        const empSearch = approverEmpSearchText[step.id] || "";
                        const filteredEmps = employees.filter((e) => {
                          const q = empSearch.toLowerCase().trim();
                          return (
                            !q ||
                            e.name.toLowerCase().includes(q) ||
                            e.empCode.toLowerCase().includes(q) ||
                            e.department.toLowerCase().includes(q)
                          );
                        });

                        const roleName = step.approverRoleOrName || step.roleType || "";
                        const sigRank = getSignatoryRank(roleName, step.category);
                        const positionPlacement =
                          sigRank <= 1
                            ? "Left (Employee)"
                            : sigRank <= 4
                            ? "Middle (HR / Management)"
                            : "Right (CEO / MD / Signatory)";

                        const isExecRole =
                          step.category !== "employee" &&
                          (step.roleType === "Director" ||
                            step.roleType === "Admin" ||
                            (step.approverRoleOrName &&
                              (step.approverRoleOrName.toLowerCase().includes("md") ||
                                step.approverRoleOrName.toLowerCase().includes("director") ||
                                step.approverRoleOrName.toLowerCase().includes("ceo") ||
                                step.approverRoleOrName.toLowerCase().includes("super admin") ||
                                step.approverRoleOrName.toLowerCase().includes("managing director"))));

                        return (
                          <div key={step.id} className="space-y-2">
                            {/* Step Card */}
                            <div className="p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-all shadow-xs space-y-3">
                              {/* Step Card Header */}
                              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[11px] font-bold px-2 py-0.5">
                                    Step {idx + 1}
                                  </Badge>
                                  <span className="text-xs font-bold text-foreground">
                                    {approvalMode === "sequential"
                                      ? `Stage ${idx + 1} Sign-off`
                                      : `Approver ${idx + 1}`}
                                  </span>
                                  {step.requireSignature && (
                                    <Badge
                                      variant="outline"
                                      className="text-indigo-600 border-indigo-400/40 bg-indigo-50 dark:bg-indigo-950/30 text-[10px] px-1.5 py-0 h-5 flex items-center gap-1"
                                    >
                                      <PenTool className="h-2.5 w-2.5" /> Signature · {positionPlacement}
                                    </Badge>
                                  )}
                                  {isExecRole && (
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 h-5 flex items-center gap-1 ${
                                        step.automationAction === "auto_approve"
                                          ? "text-emerald-700 dark:text-emerald-300 border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30"
                                          : step.automationAction === "auto_decline"
                                          ? "text-rose-700 dark:text-rose-300 border-rose-400/50 bg-rose-50 dark:bg-rose-950/30"
                                          : "text-amber-700 dark:text-amber-300 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30"
                                      }`}
                                    >
                                      {step.automationAction === "auto_approve" ? (
                                        <>
                                          <Zap className="h-2.5 w-2.5" /> Auto Approve
                                        </>
                                      ) : step.automationAction === "auto_decline" ? (
                                        <>
                                          <XCircle className="h-2.5 w-2.5" /> Auto Decline
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="h-2.5 w-2.5" /> Manual Approval
                                        </>
                                      )}
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Reorder Arrows */}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveStep(idx, idx - 1)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Move Step Up"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={idx === approvers.length - 1}
                                    onClick={() => handleMoveStep(idx, idx + 1)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Move Step Down"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <div className="h-4 w-px bg-border mx-1" />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStep(idx)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    title="Delete Step"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Step Card Body: Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                {/* Column A: Position / Approver Designation */}
                                <div className="md:col-span-4 space-y-1.5">
                                  <Label className="text-[11px] text-muted-foreground font-semibold">
                                    Select Approver Role / Position
                                  </Label>
                                  <Select
                                    value={
                                      step.category === "employee"
                                        ? "Employee"
                                        : APPROVER_POSITION_OPTIONS.some(
                                            (opt) => opt.value === (step.roleType || step.approverRoleOrName)
                                          )
                                        ? step.roleType || step.approverRoleOrName
                                        : "custom"
                                    }
                                    onValueChange={(val) => handlePositionChange(idx, val)}
                                  >
                                    <SelectTrigger className="text-xs h-9 bg-card">
                                      <SelectValue placeholder="Choose Position / Role" />
                                    </SelectTrigger>
                                    <SelectContent className="text-xs max-h-60">
                                      {APPROVER_POSITION_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {/* Custom Position Name Input */}
                                  {(step.roleType === "custom" ||
                                    (!isEmployeeCategory &&
                                      !APPROVER_POSITION_OPTIONS.some(
                                        (opt) => opt.value === (step.roleType || step.approverRoleOrName)
                                      ))) && (
                                    <div className="pt-1 animate-in fade-in-50">
                                      <Input
                                        placeholder="Enter custom designation / title..."
                                        value={step.approverRoleOrName}
                                        onChange={(e) => {
                                          const updated = [...approvers];
                                          updated[idx].approverRoleOrName = e.target.value;
                                          setApprovers(updated);
                                        }}
                                        className="h-8 text-xs bg-card"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Column B: Employee Selector (Single / Multiple / All) OR Role Details */}
                                <div className="md:col-span-5 space-y-1.5">
                                  {isEmployeeCategory ? (
                                    <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border">
                                      <div className="flex items-center justify-between gap-1">
                                        <Label className="text-[11px] font-semibold text-foreground">
                                          Employee Selection Target
                                        </Label>
                                        {/* Selection Mode Pills */}
                                        <div className="inline-flex rounded-lg bg-background border border-border p-0.5 text-[10px]">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleEmployeeSelectionModeChange(idx, "single")
                                            }
                                            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                                              step.employeeSelectionMode !== "multiple" &&
                                              step.employeeSelectionMode !== "all"
                                                ? "bg-primary text-primary-foreground font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                            }`}
                                          >
                                            Single
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleEmployeeSelectionModeChange(idx, "multiple")
                                            }
                                            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                                              step.employeeSelectionMode === "multiple"
                                                ? "bg-primary text-primary-foreground font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                            }`}
                                          >
                                            Multiple
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleEmployeeSelectionModeChange(idx, "all")
                                            }
                                            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                                              step.employeeSelectionMode === "all"
                                                ? "bg-primary text-primary-foreground font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                            }`}
                                          >
                                            All
                                          </button>
                                        </div>
                                      </div>

                                      {/* Mode 1: Single Employee Select */}
                                      {step.employeeSelectionMode !== "multiple" &&
                                        step.employeeSelectionMode !== "all" && (
                                          <div className="space-y-1">
                                            <Select
                                              value={
                                                step.approverEmployeeId ||
                                                employees[0]?.id ||
                                                ""
                                              }
                                              onValueChange={(empId) =>
                                                handleSingleEmployeeChange(idx, empId)
                                              }
                                            >
                                              <SelectTrigger className="text-xs h-8 bg-background">
                                                <SelectValue placeholder="Select specific employee..." />
                                              </SelectTrigger>
                                              <SelectContent className="text-xs max-h-60">
                                                {employees.map((e) => (
                                                  <SelectItem key={e.id} value={e.id}>
                                                    <span className="font-semibold">{e.name}</span>
                                                    <span className="text-muted-foreground ml-1.5 font-mono text-[10px]">
                                                      ({e.empCode} · {e.designation})
                                                    </span>
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}

                                      {/* Mode 2: Multi-Employee Select Checkable Box */}
                                      {step.employeeSelectionMode === "multiple" && (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="relative flex-1">
                                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                              <Input
                                                placeholder="Search employees..."
                                                value={empSearch}
                                                onChange={(e) =>
                                                  setApproverEmpSearchText({
                                                    ...approverEmpSearchText,
                                                    [step.id]: e.target.value,
                                                  })
                                                }
                                                className="h-7 text-[11px] pl-7 bg-background"
                                              />
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 text-[10px]">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleSelectAllMultiEmployees(idx, true)
                                                }
                                                className="text-primary hover:underline font-semibold"
                                              >
                                                Select All
                                              </button>
                                              <span className="text-muted-foreground">/</span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleSelectAllMultiEmployees(idx, false)
                                                }
                                                className="text-muted-foreground hover:underline"
                                              >
                                                Clear
                                              </button>
                                            </div>
                                          </div>

                                          <div className="max-h-32 overflow-y-auto space-y-1 p-1 rounded-lg border border-border bg-background">
                                            {filteredEmps.map((emp) => {
                                              const isChecked = (
                                                step.approverEmployeeIds || []
                                              ).includes(emp.id);
                                              return (
                                                <label
                                                  key={emp.id}
                                                  className={`flex items-center gap-2 p-1.5 rounded text-[11px] cursor-pointer transition-colors ${
                                                    isChecked
                                                      ? "bg-primary/10 text-primary font-medium"
                                                      : "hover:bg-muted text-foreground"
                                                  }`}
                                                >
                                                  <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={() =>
                                                      handleToggleMultiEmployee(idx, emp.id)
                                                    }
                                                    className="h-3.5 w-3.5"
                                                  />
                                                  <div className="truncate flex-1">
                                                    <span>{emp.name}</span>
                                                    <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                                                      ({emp.empCode})
                                                    </span>
                                                  </div>
                                                </label>
                                              );
                                            })}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                                            <span>
                                              {(step.approverEmployeeIds || []).length} of{" "}
                                              {employees.length} employees selected
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Mode 3: All Employees */}
                                      {step.employeeSelectionMode === "all" && (
                                        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                                          <Users className="h-4 w-4 shrink-0" />
                                          <div>
                                            <div className="font-bold text-[11px]">
                                              All {employees.length} Organisation Employees
                                            </div>
                                            <div className="text-[10px] opacity-80">
                                              All active employees must review/sign off in parallel.
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border text-xs space-y-1">
                                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                        <span>Role-based Assignment</span>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        Any active user assigned to <strong>{step.approverRoleOrName || step.roleType}</strong> authority will be eligible to review and approve.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Column C: Signature Needed Checkbox & Toggle */}
                                <div className="md:col-span-3 space-y-1.5">
                                  <Label className="text-[11px] text-muted-foreground font-semibold">
                                    Verification Requirement
                                  </Label>

                                  <div
                                    onClick={() =>
                                      handleToggleSignatureNeeded(
                                        idx,
                                        !(step.requireSignature ?? true)
                                      )
                                    }
                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                                      step.requireSignature
                                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40"
                                        : "border-border hover:border-border/80 bg-muted/20 text-muted-foreground"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                        <PenTool className="h-3.5 w-3.5 text-primary" />
                                        <span>Signature Needed</span>
                                      </div>
                                      <Checkbox
                                        checked={step.requireSignature ?? true}
                                        onCheckedChange={(c) =>
                                          handleToggleSignatureNeeded(idx, !!c)
                                        }
                                        className="h-4 w-4 pointer-events-none"
                                      />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                      {step.requireSignature
                                        ? `Assigned to ${positionPlacement} signatory block per Org Hierarchy.`
                                        : "Review & acknowledgment without digital signature."}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Executive Protocol Section for MD / CEO */}
                              {isExecRole && (
                                <div className="mt-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-indigo-50/30 to-background dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-background space-y-2.5 animate-in fade-in-50 duration-200">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <Crown className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                                      <span className="text-xs font-bold text-foreground">
                                        Executive Decision Protocol ({roleName || "MD / CEO"})
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/40"
                                      >
                                        Tier 5 Leadership
                                      </Badge>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      Choose executive workflow policy
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                                    {/* 1. Approve Manually */}
                                    <button
                                      type="button"
                                      onClick={() => handleAutomationActionChange(idx, "manual")}
                                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                        !step.automationAction || step.automationAction === "manual"
                                          ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/40 shadow-xs font-semibold"
                                          : "border-border hover:border-border/80 bg-card text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs">
                                          <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                          <span>Approve Manually</span>
                                        </div>
                                        {(!step.automationAction || step.automationAction === "manual") && (
                                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        )}
                                      </div>
                                      <p className="text-[10px] opacity-80 leading-tight font-normal">
                                        Requires explicit manual review and physical / digital sign-off by MD/CEO.
                                      </p>
                                    </button>

                                    {/* 2. Auto Approve */}
                                    <button
                                      type="button"
                                      onClick={() => handleAutomationActionChange(idx, "auto_approve")}
                                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                        step.automationAction === "auto_approve"
                                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/40 shadow-xs font-semibold"
                                          : "border-border hover:border-border/80 bg-card text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs">
                                          <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                          <span>Auto Approve</span>
                                        </div>
                                        {step.automationAction === "auto_approve" && (
                                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        )}
                                      </div>
                                      <p className="text-[10px] opacity-80 leading-tight font-normal">
                                        Automatically signs and completes approval as soon as previous stages pass.
                                      </p>
                                    </button>

                                    {/* 3. Auto Decline */}
                                    <button
                                      type="button"
                                      onClick={() => handleAutomationActionChange(idx, "auto_decline")}
                                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                        step.automationAction === "auto_decline"
                                          ? "border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500/40 shadow-xs font-semibold"
                                          : "border-border hover:border-border/80 bg-card text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs">
                                          <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                                          <span>Auto Decline</span>
                                        </div>
                                        {step.automationAction === "auto_decline" && (
                                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                                        )}
                                      </div>
                                      <p className="text-[10px] opacity-80 leading-tight font-normal">
                                        Automatically declines/blocks requests that escalate to executive level.
                                      </p>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Sequential Connector Arrow */}
                            {approvalMode === "sequential" &&
                              idx < approvers.length - 1 && (
                                <div className="flex justify-center items-center py-0.5">
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full border border-border">
                                    <span>↓ Passes forward to Step {idx + 2}</span>
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Approver Button (Dashed) */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddApproverStep}
                    className="w-full py-2.5 border-dashed border-2 hover:border-primary text-xs font-semibold text-primary hover:bg-primary/5 rounded-xl gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Another Approver Step
                  </Button>

                  {/* Company Seal Checkbox Card at bottom of Approval Matrix */}
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-background dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-card space-y-2 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <Checkbox
                          checked={includeCompanySeal}
                          onCheckedChange={(checked) => setIncludeCompanySeal(!!checked)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Include Official Company Seal</span>
                            <Badge className="bg-indigo-600 text-white text-[9px] px-1.5 py-0 h-4">
                              Company Seal
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            When enabled, the official company round seal from Settings will be stamped on the document canvas, signature annexure, and exported PDF.
                          </p>
                        </div>
                      </label>

                      {/* Live Seal Preview / Status */}
                      <div className="flex items-center gap-2 shrink-0 bg-background/80 p-2 rounded-lg border border-border self-start sm:self-auto">
                        {docAssets?.companySealDataUrl ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={docAssets.companySealDataUrl}
                              alt="Company Seal"
                              className="h-9 w-9 rounded-full object-contain border border-border p-0.5 bg-white"
                            />
                            <div className="text-[10px]">
                              <div className="font-semibold text-emerald-600 flex items-center gap-1">
                                ✓ Seal Loaded
                              </div>
                              <div className="text-muted-foreground">from Settings</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <div className="h-8 w-8 rounded-full border border-dashed border-indigo-400/50 flex items-center justify-center font-bold text-[8px] text-indigo-600">
                              SEAL
                            </div>
                            <div>
                              <div className="font-medium text-foreground">Standard Seal</div>
                              <div className="opacity-75">Upload logo/seal in Settings</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-muted/20 border border-dashed border-border text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="font-bold text-xs text-foreground">
                    Direct Dispatch Mode Enabled (No Approval Workflow)
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    This document will bypass internal hierarchical approvals and be dispatched immediately to the recipient upon confirmation.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setApprovalRequired(true)}
                    className="text-xs text-primary border-primary/30 hover:bg-primary/10 mt-2"
                  >
                    Enable Approval Matrix
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DOCUMENT DETAIL & E-COMMERCE STYLE TRACKING */}
      {viewMode === "detail" && activeDetailDoc && (
        <div className="space-y-6">
          {/* Detail Top Header */}
          <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> All Documents
              </Button>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground font-display">
                    {activeDetailDoc.name}
                  </h2>
                  <StatusBadgeView status={activeDetailDoc.status} />
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted border border-border">
                    v{activeDetailDoc.currentVersion}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Recipient: <span className="font-medium text-foreground">{activeDetailDoc.employeeName}</span> ({activeDetailDoc.employeeCode}) · {activeDetailDoc.designation} · {activeDetailDoc.department}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadPDF(activeDetailDoc)}
                className="text-xs gap-1.5 h-9"
              >
                <FileDown className="h-3.5 w-3.5" /> Download PDF
              </Button>

              {/* If Rejected or Draft, show Edit button */}
              {(activeDetailDoc.status === "REJECTED" || activeDetailDoc.status === "DRAFT") && (
                <Button
                  size="sm"
                  onClick={() => handleEditExistingDoc(activeDetailDoc)}
                  className="text-xs gap-1.5 h-9 bg-primary text-primary-foreground font-semibold"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Revise / Edit Document
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <button
              onClick={() => setDetailActiveTab("tracking")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                detailActiveTab === "tracking"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Clock className="h-4 w-4" /> Live Status Tracking
            </button>
            <button
              onClick={() => setDetailActiveTab("preview")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                detailActiveTab === "preview"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Eye className="h-4 w-4" /> Document Preview
            </button>
            <button
              onClick={() => setDetailActiveTab("versions")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                detailActiveTab === "versions"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4" /> Version History ({activeDetailDoc.versions?.length || 1})
            </button>
            <button
              onClick={() => setDetailActiveTab("audit")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                detailActiveTab === "audit"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <History className="h-4 w-4" /> Audit Trail ({activeDetailDoc.auditLogs?.length || 0})
            </button>
          </div>

          {/* TAB 1: E-COMMERCE VERTICAL TRACKING TIMELINE */}
          {detailActiveTab === "tracking" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vertical E-Commerce Timeline Column */}
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="text-base font-bold text-foreground font-display">
                      Document Journey Timeline
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Real-time delivery, multi-tier approvals, and acknowledgement milestone tracking.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    Ref: {activeDetailDoc.docNumber}
                  </Badge>
                </div>

                {/* E-Commerce Vertical Flow */}
                <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {/* Step 1: Created */}
                  <div className="relative flex items-start gap-4">
                    <div className="absolute -left-6 top-0 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs ring-4 ring-card">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Document Created</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(activeDetailDoc.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Authored by HR Admin for {activeDetailDoc.employeeName} ({activeDetailDoc.employeeCode}).
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Sent */}
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`absolute -left-6 top-0 h-6 w-6 rounded-full flex items-center justify-center text-xs ring-4 ring-card ${
                        activeDetailDoc.sentAt
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {activeDetailDoc.sentAt ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Dispatched / Sent</span>
                        {activeDetailDoc.sentAt && (
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(activeDetailDoc.sentAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sent via {activeDetailDoc.delivery.channel.toUpperCase()} to {activeDetailDoc.employeeEmail}.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Approval Stages */}
                  {activeDetailDoc.approvalRequired && (
                    <div className="relative flex items-start gap-4">
                      <div
                        className={`absolute -left-6 top-0 h-6 w-6 rounded-full flex items-center justify-center text-xs ring-4 ring-card ${
                          activeDetailDoc.status === "APPROVED" ||
                          activeDetailDoc.status === "PENDING_EMPLOYEE_ACTION" ||
                          activeDetailDoc.status === "COMPLETED"
                            ? "bg-emerald-500 text-white"
                            : activeDetailDoc.status === "REJECTED"
                            ? "bg-red-500 text-white"
                            : "bg-amber-500 text-white animate-pulse"
                        }`}
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                      </div>
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">
                            Approval Workflow ({activeDetailDoc.approvalMode.replace(/_/g, " ")})
                          </span>
                        </div>

                        <div className="space-y-2">
                          {activeDetailDoc.approvers.map((step, idx) => {
                            const isCurrentStep =
                              (activeDetailDoc.status === "PENDING_APPROVAL" || activeDetailDoc.status === "PARTIALLY_APPROVED") &&
                              idx === activeDetailDoc.currentStepIndex &&
                              step.status === "pending";

                            return (
                              <div
                                key={step.id}
                                className={`p-3 rounded-xl border text-xs transition-all ${
                                  step.status === "approved"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                                    : step.status === "rejected"
                                    ? "bg-red-500/10 border-red-500/30 text-foreground"
                                    : isCurrentStep
                                    ? "bg-amber-500/10 border-amber-500/40 text-foreground ring-1 ring-amber-500/30"
                                    : "bg-muted/30 border-border text-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">
                                      {idx + 1}. {step.approverRoleOrName}
                                    </span>
                                    {step.status === "approved" && (
                                      <Badge className="bg-emerald-600 text-white text-[10px] h-5">
                                        ✓ Approved
                                      </Badge>
                                    )}
                                    {step.status === "rejected" && (
                                      <Badge className="bg-red-600 text-white text-[10px] h-5">
                                        ✗ Rejected
                                      </Badge>
                                    )}
                                    {step.status === "forwarded" && (
                                      <Badge className="bg-indigo-600 text-white text-[10px] h-5">
                                        → Forwarded
                                      </Badge>
                                    )}
                                    {isCurrentStep && (
                                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40 bg-amber-500/10 font-bold animate-pulse">
                                        ● In Review
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Action buttons on active step */}
                                  {isCurrentStep && (
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        size="sm"
                                        onClick={() => openApprovalStepDialog(step.id, "approve")}
                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                                      >
                                        <Check className="h-3 w-3 mr-1" /> Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openApprovalStepDialog(step.id, "forward")}
                                        className="h-7 text-xs px-2 text-primary border-primary/30 hover:bg-primary/10"
                                      >
                                        <Forward className="h-3 w-3 mr-1" /> Forward
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openApprovalStepDialog(step.id, "reject")}
                                        className="h-7 text-xs px-2 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                                      >
                                        <X className="h-3 w-3 mr-1" /> Reject
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {step.actedAt && (
                                  <div className="text-[11px] text-muted-foreground mt-1">
                                    By {step.actedBy} on {step.actedAt}
                                    {step.comment && <div className="italic text-foreground mt-0.5">"{step.comment}"</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Employee Acknowledgement */}
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`absolute -left-6 top-0 h-6 w-6 rounded-full flex items-center justify-center text-xs ring-4 ring-card ${
                        activeDetailDoc.employeeAcknowledgedAt
                          ? "bg-emerald-500 text-white"
                          : activeDetailDoc.status === "PENDING_EMPLOYEE_ACTION"
                          ? "bg-blue-500 text-white animate-pulse"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                          Employee Digital Acknowledgement
                        </span>
                        {activeDetailDoc.status === "PENDING_EMPLOYEE_ACTION" && (
                          <Button
                            size="sm"
                            onClick={() => acknowledgeDocument(activeDetailDoc.id)}
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Simulate Sign & Accept
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeDetailDoc.employeeAcknowledgedAt
                          ? `Digitally acknowledged & accepted by ${activeDetailDoc.employeeName} on ${new Date(activeDetailDoc.employeeAcknowledgedAt).toLocaleString()}`
                          : "Awaiting digital acknowledgement from employee via CreatonsHR portal."}
                      </p>
                    </div>
                  </div>

                  {/* Step 5: Completed */}
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`absolute -left-6 top-0 h-6 w-6 rounded-full flex items-center justify-center text-xs ring-4 ring-card ${
                        activeDetailDoc.status === "COMPLETED"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-foreground">Completed & Archived</span>
                      <p className="text-xs text-muted-foreground">
                        {activeDetailDoc.completedAt
                          ? `Official document generated and permanently vaulted on ${new Date(activeDetailDoc.completedAt).toLocaleString()}`
                          : "Document will be marked completed once all required steps are satisfied."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Summary & Configuration Panel */}
              <div className="space-y-4">
                {/* Configuration Summary Card */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Document Configuration
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-muted-foreground text-[11px]">Delivery Channel</div>
                      <div className="font-semibold text-foreground capitalize mt-0.5">
                        {activeDetailDoc.delivery.channel} ({activeDetailDoc.delivery.recipientEmail})
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground text-[11px]">Approval Policy</div>
                      <div className="font-semibold text-foreground capitalize mt-0.5">
                        {activeDetailDoc.approvalRequired
                          ? `${activeDetailDoc.approvalMode.replace(/_/g, " ")} (${activeDetailDoc.approvers.length} Approvers)`
                          : "Direct Dispatch (No Approval)"}
                      </div>
                    </div>

                    {activeDetailDoc.escalation.enabled && (
                      <div>
                        <div className="text-muted-foreground text-[11px]">Auto-Escalation</div>
                        <div className="font-semibold text-foreground mt-0.5">
                          After {activeDetailDoc.escalation.delayDays} days → {activeDetailDoc.escalation.escalateTo}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipient Quick Card */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Recipient Profile
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center">
                      {activeDetailDoc.employeeName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {activeDetailDoc.employeeName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activeDetailDoc.employeeCode} · {activeDetailDoc.designation}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REALISTIC DOCUMENT PREVIEW */}
          {detailActiveTab === "preview" && (
            <div className="bg-muted/40 p-6 rounded-2xl border border-border flex justify-center">
              <RealisticDocumentPaper doc={activeDetailDoc} company={company} employees={employees} docAssets={docAssets} />
            </div>
          )}

          {/* TAB 3: VERSION HISTORY */}
          {detailActiveTab === "versions" && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-sm text-foreground font-display">
                  Document Version History
                </h3>
                <span className="text-xs text-muted-foreground">
                  Current Active: <b>v{activeDetailDoc.currentVersion}</b>
                </span>
              </div>

              <div className="space-y-3">
                {activeDetailDoc.versions?.map((ver) => (
                  <div
                    key={ver.version}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      ver.version === activeDetailDoc.currentVersion
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-foreground">
                          v{ver.version}
                        </span>
                        {ver.version === activeDetailDoc.currentVersion && (
                          <Badge variant="default" className="text-[10px]">
                            Current Version
                          </Badge>
                        )}
                        <span className="text-muted-foreground">· Created {ver.createdAt}</span>
                      </div>
                      <span className="text-muted-foreground font-medium">By {ver.createdBy}</span>
                    </div>

                    <p className="text-muted-foreground">{ver.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOG */}
          {detailActiveTab === "audit" && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-sm text-foreground font-display">
                  Immutable Audit Trail
                </h3>
                <span className="text-xs text-muted-foreground">
                  Compliance and tamper-proof event records
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {activeDetailDoc.auditLogs?.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-muted/30 border border-border flex items-start justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground font-sans">{log.action}</span>
                        <span className="text-[11px] text-muted-foreground">by {log.actor} ({log.actorRole})</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] font-sans">{log.details}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REALISTIC DOCUMENT PREVIEW MODAL */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-8 rounded-3xl border border-border shadow-2xl">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold font-display">
                  Document Preview (Print / PDF View)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Review resolved dynamic fields and formatting before dispatching.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center bg-muted/40 rounded-2xl gap-3">
            <div className="w-full max-w-[650px] p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Live Template Preview with sample employee data ({selectedEmployee?.name || "Employee"}).
              </span>
              <Badge variant="secondary" className="text-[10px]">
                Template Mode
              </Badge>
            </div>
            <div className="w-full max-w-[650px] bg-white text-slate-900 shadow-xl border border-slate-200 p-8 sm:p-12 rounded-lg text-xs leading-relaxed space-y-5">
              {/* Header */}
              {docLetterhead.enabled && (
                <div className="border-b pb-4 border-slate-200">
                  {docLetterhead.style === "uploaded" && (docAssets?.letterheadDataUrl || docLetterhead.customBannerUrl) ? (
                    <img
                      src={docAssets?.letterheadDataUrl || docLetterhead.customBannerUrl}
                      alt="Official Letterhead"
                      className="w-full max-h-28 object-contain"
                    />
                  ) : docLetterhead.style === "classic" ? (
                    <div className="text-center space-y-1">
                      {docAssets?.logoDataUrl || company?.logoDataUrl ? (
                        <img
                          src={docAssets?.logoDataUrl || company?.logoDataUrl}
                          alt="Logo"
                          className="h-10 w-10 mx-auto rounded-lg object-contain bg-white p-0.5"
                        />
                      ) : (
                        <div className="h-8 w-8 mx-auto rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                          {docLetterhead.companyName ? docLetterhead.companyName.charAt(0) : "S"}
                        </div>
                      )}
                      <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                        {docLetterhead.companyName || company?.name || "CREATONSHR TECHNOLOGIES PVT. LTD."}
                      </h2>
                      <p className="text-[10px] text-slate-500">{docLetterhead.address || company?.address || "OMR, Chennai"}</p>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">
                          {docLetterhead.companyName || company?.name || "CreatonsHR Technologies Pvt. Ltd."}
                        </h2>
                        <p className="text-[11px] text-slate-500">{docLetterhead.address || company?.address || "Tower B, Silicon Heights, OMR, Chennai"}</p>
                        <p className="text-[11px] text-slate-500">Email: {docLetterhead.email || company?.email || "hr@creatonshr.com"} | Web: {docLetterhead.website || "www.creatonshr.com"}</p>
                      </div>
                      {docAssets?.logoDataUrl || company?.logoDataUrl ? (
                        <img
                          src={docAssets?.logoDataUrl || company?.logoDataUrl}
                          alt="Logo"
                          className="h-10 w-10 rounded-lg object-contain bg-white p-0.5 border border-slate-200"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                          {docLetterhead.companyName ? docLetterhead.companyName.charAt(0) : "S"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div className="text-center py-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  {isCustomDocName
                    ? customDocName || "Custom HR Document"
                    : PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId)?.name || "HR Digital Document"}
                </h3>
              </div>

              {/* Resolved Content */}
              <div
                className="space-y-3 text-slate-700 font-sans"
                dangerouslySetInnerHTML={{
                  __html: resolveDocumentTags(docContentHtml, selectedEmployee, company),
                }}
              />

              {/* Table Annexure if table configured */}
              {customTable && (
                <div className="pt-2">
                  <p className="font-bold text-slate-800 mb-1">{customTable.caption || "Annexure"}</p>
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        {customTable.headers.map((h, i) => (
                          <th key={i} className="border border-slate-300 p-2 font-bold text-left">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customTable.rows.map((r, ri) => (
                        <tr key={ri} className={ri % 2 === 1 ? "bg-slate-50" : ""}>
                          {r.map((c, ci) => (
                            <td key={ci} className="border border-slate-300 p-2">
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Dynamic Signatures: Distributed Left to Right by Organizational Priority */}
              {(previewSignatories.length > 0 || includeCompanySeal) && (
                <div className="pt-8 border-t border-slate-200">
                  <div className="flex flex-wrap items-end justify-between gap-6 text-[11px]">
                    {previewSignatories.length === 2 && includeCompanySeal ? (
                      <>
                        {/* Left: 1st Priority (e.g. Employee Acceptance) */}
                        <div className="flex flex-col text-left items-start min-w-[140px] flex-1">
                          <p className="font-bold text-slate-800">{previewSignatories[0].label}</p>
                          <div className="h-10 flex items-center">
                            {previewSignatories[0].dataUrl ? (
                              <img
                                src={previewSignatories[0].dataUrl}
                                alt={previewSignatories[0].roleTitle}
                                className="max-h-9 object-contain"
                              />
                            ) : previewSignatories[0].isEmployee ? (
                              <span className="text-[10px] text-slate-400 italic">Recipient Sign-off</span>
                            ) : (
                              <div className="h-8 border-b border-dashed border-slate-300 w-28" />
                            )}
                          </div>
                          <p className="text-slate-700 font-semibold">{previewSignatories[0].signerName}</p>
                          <p className="text-[10px] text-slate-500">{previewSignatories[0].roleTitle}</p>
                        </div>

                        {/* Center: Official Company Seal */}
                        <div className="flex flex-col items-center px-4 shrink-0">
                          {docAssets?.companySealDataUrl ? (
                            <img
                              src={docAssets.companySealDataUrl}
                              alt="Company Seal"
                              className="h-14 w-14 object-contain filter contrast-125 opacity-90"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-full border-2 border-dashed border-indigo-400/60 bg-indigo-50/50 flex flex-col items-center justify-center text-center p-1">
                              <span className="text-[8px] font-bold text-indigo-700 tracking-tighter uppercase leading-tight">
                                {company?.name || "CreatonsHR"}
                              </span>
                              <span className="text-[6px] text-indigo-500 font-mono">SEAL</span>
                            </div>
                          )}
                          <span className="text-[8px] text-slate-400 font-mono mt-0.5">Official Seal</span>
                        </div>

                        {/* Right: 2nd Priority (e.g. HR / CEO / Authorized Signatory) */}
                        <div className="flex flex-col text-right items-end min-w-[140px] flex-1">
                          <p className="font-bold text-slate-800">{previewSignatories[1].label}</p>
                          <div className="h-10 flex items-center justify-end">
                            {previewSignatories[1].dataUrl ? (
                              <img
                                src={previewSignatories[1].dataUrl}
                                alt={previewSignatories[1].roleTitle}
                                className="max-h-9 object-contain"
                              />
                            ) : (
                              <div className="h-8 border-b border-dashed border-slate-300 w-28" />
                            )}
                          </div>
                          <p className="text-slate-700 font-semibold">{previewSignatories[1].signerName}</p>
                          <p className="text-[10px] text-slate-500">{previewSignatories[1].roleTitle}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        {previewSignatories.map((sig, sIdx) => {
                          const isFirst = sIdx === 0;
                          const isLast = sIdx === previewSignatories.length - 1;
                          const alignClass =
                            previewSignatories.length === 1
                              ? "text-left items-start"
                              : isFirst
                              ? "text-left items-start"
                              : isLast
                              ? "text-right items-end"
                              : "text-center items-center";

                          return (
                            <div
                              key={sig.key}
                              className={`flex flex-col ${alignClass} min-w-[130px] flex-1`}
                            >
                              <p className="font-bold text-slate-800">{sig.label}</p>
                              <div className="h-10 flex items-center justify-center">
                                {sig.dataUrl ? (
                                  <img
                                    src={sig.dataUrl}
                                    alt={sig.roleTitle}
                                    className="max-h-9 object-contain"
                                  />
                                ) : sig.isEmployee ? (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Recipient Sign-off
                                  </span>
                                ) : (
                                  <div className="h-8 border-b border-dashed border-slate-300 w-24" />
                                )}
                              </div>
                              <p className="text-slate-700 font-semibold">{sig.signerName}</p>
                              <p className="text-[10px] text-slate-500">{sig.roleTitle}</p>
                            </div>
                          );
                        })}

                        {includeCompanySeal && previewSignatories.length !== 2 && (
                          <div className="flex flex-col items-center px-2 shrink-0">
                            {docAssets?.companySealDataUrl ? (
                              <img
                                src={docAssets.companySealDataUrl}
                                alt="Company Seal"
                                className="h-14 w-14 object-contain filter contrast-125 opacity-90"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-full border-2 border-dashed border-indigo-400/60 bg-indigo-50/50 flex flex-col items-center justify-center text-center p-1">
                                <span className="text-[8px] font-bold text-indigo-700 tracking-tighter uppercase leading-tight">
                                  {company?.name || "CreatonsHR"}
                                </span>
                                <span className="text-[6px] text-indigo-500 font-mono">SEAL</span>
                              </div>
                            )}
                            <span className="text-[8px] text-slate-400 font-mono mt-0.5">Official Seal</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              {docFooter.enabled && (
                <div className="pt-4 mt-auto border-t border-slate-100 text-[10px] text-slate-400">
                  {docFooter.style === "uploaded" && (docAssets?.footerDataUrl || docFooter.customBannerUrl) ? (
                    <img
                      src={docAssets?.footerDataUrl || docFooter.customBannerUrl}
                      alt="Official Footer"
                      className="w-full max-h-16 object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>{docFooter.confidentialText || "STRICTLY CONFIDENTIAL • FOR RECIPIENT USE ONLY"}</span>
                      {docFooter.showPageNumbers !== false && <span className="font-mono">Page 1 of 1</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPreviewOpen(false);
                handleSaveDraft();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Save className="h-3.5 w-3.5 mr-1" /> Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TABLE INSERTION CONFIGURATION MODAL */}
      <Dialog open={tableModalOpen} onOpenChange={setTableModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-primary" /> Insert Custom Table
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure initial dimensions for your in-document table.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Rows</Label>
              <Input
                type="number"
                min={1}
                max={15}
                value={newTableRows}
                onChange={(e) => setNewTableRows(Number(e.target.value))}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Columns</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={newTableCols}
                onChange={(e) => setNewTableCols(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTableModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsertTable} className="bg-primary text-primary-foreground">
              Insert Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SIGNATURE CONFIGURATION & SIGNATORY CHOOSER MODAL */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display flex items-center gap-2">
              <PenTool className="h-4 w-4 text-emerald-600" /> Configure & Insert Signature Block
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select signatories, roles, layout, and e-verification marks for this document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Layout Mode Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">1. Signatory Layout</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSigLayout("both")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    sigLayout === "both"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <div className="font-semibold text-xs text-foreground">🏢 + 👤 Dual Party</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Company + Employee</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSigLayout("company_only")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    sigLayout === "company_only"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <div className="font-semibold text-xs text-foreground">🏢 Company Only</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Official Signatory</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSigLayout("employee_only")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    sigLayout === "employee_only"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <div className="font-semibold text-xs text-foreground">👤 Recipient Only</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Employee Accept</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSigLayout("three_parties")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    sigLayout === "three_parties"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <div className="font-semibold text-xs text-foreground">🏢+👥+👤 Tri-Party</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">+ Manager / Witness</div>
                </button>
              </div>
            </div>

            {/* 2. Signatory Configuration Fields */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3.5">
              <div className="text-xs font-semibold text-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>2. Select Signature & Designation</span>
                </div>
                {/* 2 Options: Preloaded Signature vs Custom Signature */}
                {sigLayout !== "employee_only" && (
                  <div className="inline-flex rounded-lg bg-background/80 border border-border p-0.5 text-xs shadow-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSigSourceType("preloaded");
                        const item = PRELOADED_SIGNATURES.find((s) => s.key === selectedPreloadedKey);
                        if (item) setSigCompanySignerRole(item.roleName);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                        sigSourceType === "preloaded"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Preloaded Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigSourceType("custom")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                        sigSourceType === "custom"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Custom Signature
                    </button>
                  </div>
                )}
              </div>

              {/* Option A: PRELOADED SIGNATURE (Uploaded in Settings) */}
              {sigLayout !== "employee_only" && sigSourceType === "preloaded" && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Choose from company signatures uploaded in <b>Settings</b>:</span>
                    <a
                      href="/admin/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
                    >
                      Settings → Doc Assets ↗
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {PRELOADED_SIGNATURES.map((sig) => {
                      const isSelected = selectedPreloadedKey === sig.key;
                      const hasImg = Boolean(sig.dataUrl);

                      return (
                        <div
                          key={sig.key}
                          onClick={() => {
                            setSelectedPreloadedKey(sig.key);
                            setSigCompanySignerRole(sig.roleName);
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 text-left relative ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm ring-1.5 ring-primary"
                              : "border-border hover:border-primary/50 bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                                {sig.label}
                              </div>
                              <div className="text-[10px] text-muted-foreground line-clamp-1">{sig.description}</div>
                            </div>
                            {isSelected ? (
                              <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4 shrink-0">
                                Selected
                              </Badge>
                            ) : hasImg ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-[9px] px-1.5 py-0 h-4 shrink-0">
                                Uploaded
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-[9px] px-1.5 py-0 h-4 shrink-0">
                                No Image
                              </Badge>
                            )}
                          </div>

                          {/* Signature preview container */}
                          <div className="h-14 w-full rounded-lg bg-white dark:bg-slate-900 border border-dashed border-border flex items-center justify-center p-1.5 overflow-hidden">
                            {hasImg ? (
                              <img
                                src={sig.dataUrl}
                                alt={sig.label}
                                className="max-h-full max-w-full object-contain filter contrast-125 dark:brightness-110"
                              />
                            ) : (
                              <div className="text-center text-[10px] text-muted-foreground flex flex-col items-center">
                                <span>✍️ No upload</span>
                                <span className="text-[9px] opacity-75">Upload in Settings</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-1">
                    <Label className="text-[10px] text-muted-foreground">Header Label</Label>
                    <Input
                      value={sigCompanyOrgLabel}
                      onChange={(e) => setSigCompanyOrgLabel(e.target.value)}
                      placeholder="For {{company_name}}"
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                </div>
              )}

              {/* Option B: CUSTOM SIGNATURE */}
              {sigLayout !== "employee_only" && sigSourceType === "custom" && (
                <div className="space-y-2 pt-1">
                  <Label className="text-[11px] text-muted-foreground font-semibold">Select or Type Designation / Role</Label>
                  <Select value={sigCompanySignerRole} onValueChange={setSigCompanySignerRole}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs max-h-60">
                      <SelectItem value="Authorized Signatory">Authorized Signatory</SelectItem>
                      <SelectItem value="Director / Board Signatory">Director / Board Signatory</SelectItem>
                      <SelectItem value="HR Head (Priya Kumar)">HR Head (Priya Kumar)</SelectItem>
                      <SelectItem value="HR Manager">HR Manager</SelectItem>
                      <SelectItem value="CEO / Super Admin">CEO / Super Admin</SelectItem>
                      <SelectItem value="Chief Financial Officer (CFO)">Chief Financial Officer (CFO)</SelectItem>
                      <SelectItem value="Talent Acquisition Lead">Talent Acquisition Lead</SelectItem>
                      <SelectItem value="Reporting Manager">Reporting Manager</SelectItem>
                      {roles?.map((r) => (
                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                      ))}
                      <DropdownMenuSeparator />
                      <SelectItem value="custom" className="text-primary font-semibold">✨ Custom Signatory...</SelectItem>
                    </SelectContent>
                  </Select>

                  {sigCompanySignerRole === "custom" && (
                    <Input
                      placeholder="Enter custom title / signatory designation..."
                      value={sigCompanySignerCustom}
                      onChange={(e) => setSigCompanySignerCustom(e.target.value)}
                      className="h-8 text-xs bg-background mt-1"
                    />
                  )}

                  <div className="pt-1">
                    <Label className="text-[10px] text-muted-foreground">Header Label</Label>
                    <Input
                      value={sigCompanyOrgLabel}
                      onChange={(e) => setSigCompanyOrgLabel(e.target.value)}
                      placeholder="For {{company_name}}"
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                </div>
              )}

              {/* Middle Signer & Recipient Party Choice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                {/* Middle Signer (for Tri-Party) */}
                {sigLayout === "three_parties" && (
                  <div className="space-y-2">
                    <Label className="text-[11px] text-muted-foreground font-semibold">Second / Middle Signatory</Label>
                    <Select value={sigMiddleSignerRole} onValueChange={setSigMiddleSignerRole}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Reporting Manager">Reporting Manager ({"{{manager_name}}"}</SelectItem>
                        <SelectItem value="Department Head">Department Head ({"{{department}}"} Head)</SelectItem>
                        <SelectItem value="Official Witness 1">Official Witness 1</SelectItem>
                        <SelectItem value="Official Witness 2">Official Witness 2</SelectItem>
                        <SelectItem value="Legal Counsel / Notary">Legal Counsel / Notary</SelectItem>
                        <SelectItem value="Project Lead">Project Lead</SelectItem>
                        <DropdownMenuSeparator />
                        <SelectItem value="custom" className="text-primary font-semibold">✨ Custom Signatory...</SelectItem>
                      </SelectContent>
                    </Select>

                    {sigMiddleSignerRole === "custom" && (
                      <Input
                        placeholder="Enter custom title / name..."
                        value={sigMiddleSignerCustom}
                        onChange={(e) => setSigMiddleSignerCustom(e.target.value)}
                        className="h-8 text-xs bg-background mt-1"
                      />
                    )}
                  </div>
                )}

                {/* Recipient Party Choice (if both, employee_only, or three_parties) */}
                {sigLayout !== "company_only" && (
                  <div className="space-y-2">
                    <Label className="text-[11px] text-muted-foreground font-semibold">Recipient Signatory Title</Label>
                    <Select value={sigRecipientLabel} onValueChange={setSigRecipientLabel}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Employee Acceptance">Employee Acceptance</SelectItem>
                        <SelectItem value="Candidate Acceptance">Candidate Acceptance</SelectItem>
                        <SelectItem value="Contractor / Consultant Acknowledgment">Contractor / Consultant Acknowledgment</SelectItem>
                        <SelectItem value="Intern Acceptance">Intern Acceptance</SelectItem>
                        <SelectItem value="Parent / Guardian Signature">Parent / Guardian Signature</SelectItem>
                        <SelectItem value="Acknowledged & Confirmed By">Acknowledged & Confirmed By</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="pt-1">
                      <Label className="text-[10px] text-muted-foreground">Signer Name / Placeholder</Label>
                      <Input
                        value={sigRecipientName}
                        onChange={(e) => setSigRecipientName(e.target.value)}
                        placeholder="{{employee_name}}"
                        className="h-7 text-xs bg-background font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Additional Elements & Stamps */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">3. Additional Signature Elements</Label>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={sigIncludeDate}
                    onChange={(e) => setSigIncludeDate(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Date & Place Line</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={sigIncludeDigitalStamp}
                    onChange={(e) => setSigIncludeDigitalStamp(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Digital e-Sign Stamp (CreatonsHR Verified)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={sigIncludeCompanySeal}
                    onChange={(e) => setSigIncludeCompanySeal(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Company Seal</span>
                </label>
              </div>
            </div>

            {/* 4. Live Visual Preview */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                Live Signature Preview
              </Label>
              <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm text-xs">
                <div
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      const selectedSigObj = PRELOADED_SIGNATURES.find((s) => s.key === selectedPreloadedKey);
                      const activeSigImgUrl = sigSourceType === "preloaded" ? selectedSigObj?.dataUrl : undefined;

                      const firstRole = sigSourceType === "preloaded"
                        ? (selectedSigObj?.roleName || sigCompanySignerRole)
                        : sigCompanySignerRole === "custom"
                        ? (sigCompanySignerCustom || "Authorized Official")
                        : sigCompanySignerRole;

                      const middleRole = sigMiddleSignerRole === "custom" ? (sigMiddleSignerCustom || "Witness / Counterpart") : sigMiddleSignerRole;
                      const dateLine = sigIncludeDate ? '<p style="color: #64748b; font-size: 10px; margin-top: 4px;">Date: ____________ &nbsp;&nbsp; Place: ____________</p>' : '';
                      const digitalStamp = sigIncludeDigitalStamp ? '<div style="margin-top: 6px; display: inline-block; padding: 3px 6px; border: 1px dashed #6366f1; background: #eef2ff; color: #4338ca; border-radius: 4px; font-size: 9px; font-family: monospace;">✓ Digitally Signed via CreatonsHR</div>' : '';

                      const previewSigImg = activeSigImgUrl
                        ? `<div style="margin-bottom: 4px;"><img src="${activeSigImgUrl}" alt="${firstRole}" style="max-height: 40px; max-width: 140px; object-fit: contain; display: block;" /></div>`
                        : '';

                      const sealBox = (sigIncludeCompanySeal && docAssets?.companySealDataUrl)
                        ? `<div style="margin-top: 4px;"><img src="${docAssets.companySealDataUrl}" alt="Company Seal" style="max-height: 36px; max-width: 36px; object-fit: contain; display: block;" /></div>`
                        : sigIncludeCompanySeal
                        ? '<div style="margin-top: 4px; width: 60px; height: 26px; border: 1px dotted #cbd5e1; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 8px;">[ Seal ]</div>'
                        : '';

                      if (sigLayout === "both") {
                        return `<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;">
                          <div>
                            <p style="font-weight: bold; margin-bottom: 12px;">${sigCompanyOrgLabel.replace("{{company_name}}", company?.name || "CreatonsHR Technologies")}</p>
                            ${previewSigImg}
                            <div style="border-top: 1px solid #94a3b8; width: 140px; margin-bottom: 3px;"></div>
                            <p style="font-weight: 600; margin: 0; font-size: 11px;">${firstRole}</p>
                            <p style="color: #64748b; font-size: 10px; margin: 0;">${company?.name || "CreatonsHR Technologies"}</p>
                            ${sealBox}
                            ${digitalStamp}
                            ${dateLine}
                          </div>
                          <div style="text-align: right;">
                            <p style="font-weight: bold; margin-bottom: 20px;">${sigRecipientLabel}</p>
                            <div style="border-top: 1px solid #94a3b8; width: 140px; margin-left: auto; margin-bottom: 3px;"></div>
                            <p style="font-weight: 600; margin: 0; font-size: 11px;">${sigRecipientName.replace("{{employee_name}}", selectedEmployee?.name || "Employee Name")}</p>
                            <p style="color: #64748b; font-size: 10px; margin: 0;">Signature & Date</p>
                            ${dateLine}
                          </div>
                        </div>`;
                      } else if (sigLayout === "company_only") {
                        return `<div>
                          <p style="font-weight: bold; margin-bottom: 12px;">${sigCompanyOrgLabel.replace("{{company_name}}", company?.name || "CreatonsHR Technologies")}</p>
                          ${previewSigImg}
                          <div style="border-top: 1px solid #94a3b8; width: 150px; margin-bottom: 3px;"></div>
                          <p style="font-weight: 600; margin: 0; font-size: 11px;">${firstRole}</p>
                          <p style="color: #64748b; font-size: 10px; margin: 0;">${company?.name || "CreatonsHR Technologies"}</p>
                          ${sealBox}
                          ${digitalStamp}
                          ${dateLine}
                        </div>`;
                      } else if (sigLayout === "employee_only") {
                        return `<div style="text-align: right;">
                          <p style="font-weight: bold; margin-bottom: 20px;">${sigRecipientLabel}</p>
                          <div style="border-top: 1px solid #94a3b8; width: 150px; margin-left: auto; margin-bottom: 3px;"></div>
                          <p style="font-weight: 600; margin: 0; font-size: 11px;">${sigRecipientName.replace("{{employee_name}}", selectedEmployee?.name || "Employee Name")}</p>
                          <p style="color: #64748b; font-size: 10px; margin: 0;">Recipient Signature</p>
                          ${dateLine}
                        </div>`;
                      } else {
                        return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                          <div>
                            <p style="font-weight: bold; margin-bottom: 12px;">${sigCompanyOrgLabel.replace("{{company_name}}", company?.name || "CreatonsHR Technologies")}</p>
                            ${previewSigImg}
                            <div style="border-top: 1px solid #94a3b8; width: 110px; margin-bottom: 3px;"></div>
                            <p style="font-weight: 600; margin: 0; font-size: 11px;">${firstRole}</p>
                            ${sealBox}
                            ${dateLine}
                          </div>
                          <div>
                            <p style="font-weight: bold; margin-bottom: 20px;">Department / Witness</p>
                            <div style="border-top: 1px solid #94a3b8; width: 110px; margin-bottom: 3px;"></div>
                            <p style="font-weight: 600; margin: 0; font-size: 11px;">${middleRole}</p>
                            ${dateLine}
                          </div>
                          <div style="text-align: right;">
                            <p style="font-weight: bold; margin-bottom: 20px;">${sigRecipientLabel}</p>
                            <div style="border-top: 1px solid #94a3b8; width: 110px; margin-left: auto; margin-bottom: 3px;"></div>
                            <p style="font-weight: 600; margin: 0; font-size: 11px;">${sigRecipientName.replace("{{employee_name}}", selectedEmployee?.name || "Employee Name")}</p>
                            ${dateLine}
                          </div>
                        </div>`;
                      }
                    })(),
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSignatureModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsertSignatureBlock} className="bg-primary text-primary-foreground font-semibold">
              <PenTool className="h-3.5 w-3.5 mr-1" /> Insert Signature Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AUTO HIERARCHY SELECTION & TREE FLOW MODAL */}
      <Dialog open={autoHierarchyModalOpen} onOpenChange={setAutoHierarchyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-display">
                  Auto Hierarchy from Organization Tree
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Select the employee for this document to dynamically calculate their upward reporting chain.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* 1. Target Employee Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Select Target Employee (Originating Member)
              </Label>
              <Select
                value={hierarchyTargetEmployee?.id || ""}
                onValueChange={(val) => setSelectedHierarchyTargetEmpId(val)}
              >
                <SelectTrigger className="h-10 text-xs bg-background">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent className="max-h-64 text-xs">
                  {employees.map((e) => {
                    const mgr = employees.find((m) => m.id === e.managerId);
                    return (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2 py-0.5">
                          <span className="font-semibold text-foreground">{e.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">({e.empCode})</span>
                          <span className="text-[11px] text-muted-foreground">· {e.designation}</span>
                          {mgr ? (
                            <span className="text-[10px] text-primary/80 font-medium">↳ reports to {mgr.name}</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">★ Top Level</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Visual Upward Tree Flow Preview */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-primary" /> Generated Approval Tree Pathway
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {targetUpwardChain.length > 0 ? `${targetUpwardChain.length} Approval Level(s)` : "Top Executive / 1 Level"}
                </Badge>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                {/* Level 0: Requester / Subject Employee */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-primary/20 shadow-xs">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                    {hierarchyTargetEmployee?.name.slice(0, 2).toUpperCase() || "EM"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground truncate">{hierarchyTargetEmployee?.name}</span>
                      <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 font-mono text-muted-foreground">
                        {hierarchyTargetEmployee?.empCode}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {hierarchyTargetEmployee?.designation} · {hierarchyTargetEmployee?.department}
                    </div>
                  </div>
                  <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 text-[10px] shrink-0 font-medium">
                    Document Subject
                  </Badge>
                </div>

                {/* Arrow up & Chain Steps */}
                {targetUpwardChain.length > 0 ? (
                  targetUpwardChain.map((mgr, idx) => {
                    const isDirect = idx === 0;
                    const isTop = idx === targetUpwardChain.length - 1;
                    return (
                      <div key={mgr.id} className="space-y-3">
                        <div className="flex items-center justify-center">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-primary/80 bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/20">
                            <ArrowDown className="h-3 w-3 rotate-180" />
                            <span>Routes Upward to Level {idx + 1}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
                          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {mgr.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-foreground truncate">{mgr.name}</span>
                              <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 font-mono text-muted-foreground">
                                {mgr.empCode}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {isDirect ? "Direct Reporting Manager" : isTop ? "Top Authority / Final Stage" : "Reporting Manager"} · {mgr.designation} ({mgr.department})
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold">
                              Stage {idx + 1} Approver
                            </Badge>
                            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">✓ e-Signature Required</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center space-y-1">
                    <div className="text-xs font-bold text-foreground">Top-Level Executive / Direct Authority</div>
                    <div className="text-[11px] text-muted-foreground">
                      This employee is at the top of the Organization Tree with no higher reporting managers.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setAutoHierarchyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleApplyAutoHierarchy(hierarchyTargetEmployee)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 gap-1.5"
            >
              <Network className="h-3.5 w-3.5" /> Apply Tree Flow to Matrix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPROVAL ACTION MODAL (APPROVE / FORWARD / REJECT) */}
      <Dialog open={approvalActionModalOpen} onOpenChange={setApprovalActionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display">
              {approvalActionType === "approve"
                ? "Confirm Approval"
                : approvalActionType === "forward"
                ? "Approve & Forward to Role"
                : "Reject Document Step"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeDetailDoc?.name} for {activeDetailDoc?.employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {approvalActionType === "forward" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Next Approver Role</Label>
                <Select value={forwardTargetRole} onValueChange={setForwardTargetRole}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="CEO / Super Admin">CEO / Super Admin</SelectItem>
                    <SelectItem value="Director">Director / Board Signatory</SelectItem>
                    <SelectItem value="General Manager">General Manager</SelectItem>
                    {roles?.map((r) => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">
                {approvalActionType === "reject" ? "Reason for Rejection (Required)" : "Remarks / Comments (Optional)"}
              </Label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={approvalActionType === "reject" ? "Enter specific reason for rejection..." : "Add optional note..."}
                className="w-full h-20 p-2.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setApprovalActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteApprovalStep}
              className={
                approvalActionType === "reject"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {approvalActionType === "reject" ? "Confirm Rejection" : "Confirm Step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Realistic A4 Document Paper Component
function RealisticDocumentPaper({
  doc,
  company,
  employees,
  docAssets,
}: {
  doc: DigitalDocument;
  company: any;
  employees: Employee[];
  docAssets?: any;
}) {
  const emp = employees.find((e) => e.id === doc.employeeId) || {
    id: doc.employeeId,
    name: doc.employeeName,
    empCode: doc.employeeCode,
    designation: doc.designation,
    department: doc.department,
    email: doc.employeeEmail,
  };

  const resolvedHtml = resolveDocumentTags(doc.contentHtml, emp, company);
  const lh = doc.letterhead;
  const ft = doc.footer;

  return (
    <div className="w-full max-w-[650px] bg-white text-slate-900 shadow-2xl border border-slate-200 p-8 sm:p-12 rounded-lg text-xs leading-relaxed space-y-6 flex flex-col">
      {/* 1. Letterhead */}
      {(!lh || lh.enabled !== false) && (
        <div className="border-b pb-4 border-slate-200">
          {lh?.style === "uploaded" && (docAssets?.letterheadDataUrl || lh?.customBannerUrl) ? (
            <img
              src={docAssets?.letterheadDataUrl || lh?.customBannerUrl}
              alt="Letterhead Banner"
              className="w-full max-h-32 object-contain"
            />
          ) : lh?.style === "classic" ? (
            <div className="text-center space-y-1">
              {docAssets?.logoDataUrl || company?.logoDataUrl ? (
                <img
                  src={docAssets?.logoDataUrl || company?.logoDataUrl}
                  alt="Company Logo"
                  className="h-10 w-10 mx-auto rounded-lg object-contain mb-1 bg-white p-0.5"
                />
              ) : (
                <div className="h-8 w-8 mx-auto rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs mb-1">
                  {lh?.companyName ? lh.companyName.charAt(0) : "S"}
                </div>
              )}
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                {lh?.companyName || company?.name || "CREATONSHR TECHNOLOGIES PVT. LTD."}
              </h2>
              <p className="text-[10px] text-slate-500">
                {lh?.address || company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096"}
              </p>
              <p className="text-[10px] text-slate-400">
                Email: {lh?.email || company?.email || "hr@creatonshr.com"} | Web: {lh?.website || "www.creatonshr.com"}
              </p>
            </div>
          ) : lh?.style === "executive" ? (
            <div className="bg-slate-900 text-white p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                {docAssets?.logoDataUrl || company?.logoDataUrl ? (
                  <img
                    src={docAssets?.logoDataUrl || company?.logoDataUrl}
                    alt="Company Logo"
                    className="h-8 w-8 rounded-lg object-contain bg-white p-0.5"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-white text-indigo-900 font-black flex items-center justify-center text-xs">
                    {lh?.companyName ? lh.companyName.charAt(0) : "C"}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-bold tracking-tight">{lh?.companyName || company?.name || "CreatonsHR"}</h2>
                  <p className="text-[10px] text-slate-300">{lh?.tagline || "Enterprise Workforce Operations"}</p>
                </div>
              </div>
              <div className="text-right text-[9px] text-slate-400 font-mono">
                <p>{lh?.email || company?.email || "hr@creatonshr.com"}</p>
                <p>Ref: {doc.docNumber}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {lh?.companyName || company?.name || "CreatonsHR Technologies Pvt. Ltd."}
                </h2>
                <p className="text-[11px] text-slate-500">{lh?.address || company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096"}</p>
                <p className="text-[10px] text-slate-500">
                  Email: {lh?.email || company?.email || "hr@creatonshr.com"} | Phone: {lh?.phone || company?.phone || "+91 44 2876 5400"}
                  {lh?.cin ? ` | CIN: ${lh.cin}` : ""}
                </p>
              </div>
              {docAssets?.logoDataUrl || company?.logoDataUrl ? (
                <img
                  src={docAssets?.logoDataUrl || company?.logoDataUrl}
                  alt="Company Logo"
                  className="h-10 w-10 rounded-lg object-contain border border-slate-200 p-0.5 bg-white shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  {lh?.companyName ? lh.companyName.charAt(0) : "C"}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Title */}
      <div className="text-center py-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
          {doc.name}
        </h3>
      </div>

      {/* 3. Body Content */}
      <div
        className="space-y-3 text-slate-700 font-sans"
        dangerouslySetInnerHTML={{ __html: resolvedHtml }}
      />

      {/* 4. Table Annexure if exists */}
      {doc.tableData && doc.tableData.rows.length > 0 && (
        <div className="pt-2">
          <p className="font-bold text-slate-800 mb-1.5">{doc.tableData.caption || "Annexure"}</p>
          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                {doc.tableData.headers.map((h, i) => (
                  <th key={i} className="border border-slate-300 p-2 font-bold text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.tableData.rows.map((r, ri) => (
                <tr key={ri} className={ri % 2 === 1 ? "bg-slate-50" : ""}>
                  {r.map((c, ci) => (
                    <td key={ci} className="border border-slate-300 p-2">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Signatures (Distributed Left to Right by Organizational Priority) */}
      {(() => {
        const docSignatories = getOrderedSignatories(
          doc.approvers,
          doc.employeeName || "Employee Signature",
          lh?.companyName || company?.name || "CreatonsHR",
          docAssets
        );

        if (docSignatories.length === 0 && doc.includeCompanySeal === false) {
          return null;
        }

        return (
          <div className="pt-10 border-t border-slate-200">
            <div className="flex flex-wrap items-end justify-between gap-6 text-[11px]">
              {docSignatories.length === 2 && doc.includeCompanySeal !== false ? (
                <>
                  {/* Left: 1st Priority (e.g. Employee Acceptance) */}
                  <div className="flex flex-col text-left items-start min-w-[140px] flex-1">
                    <p className="font-bold text-slate-800">{docSignatories[0].label}</p>
                    <div className="h-12 flex items-center">
                      {docSignatories[0].dataUrl ? (
                        <img
                          src={docSignatories[0].dataUrl}
                          alt={docSignatories[0].roleTitle}
                          className="max-h-10 object-contain"
                        />
                      ) : docSignatories[0].isEmployee ? (
                        <span className="text-[10px] text-slate-400 italic">Recipient Sign-off</span>
                      ) : (
                        <div className="h-8 border-b border-dashed border-slate-300 w-28" />
                      )}
                    </div>
                    <p className="text-slate-700 font-semibold">{docSignatories[0].signerName}</p>
                    <p className="text-[10px] text-slate-500">{docSignatories[0].roleTitle}</p>
                  </div>

                  {/* Center: Official Company Seal */}
                  <div className="flex flex-col items-center px-4 shrink-0">
                    {docAssets?.companySealDataUrl ? (
                      <img
                        src={docAssets.companySealDataUrl}
                        alt="Company Seal"
                        className="h-16 w-16 object-contain filter contrast-125 opacity-90"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full border-2 border-dashed border-indigo-400/60 bg-indigo-50/50 flex flex-col items-center justify-center text-center p-1">
                        <span className="text-[9px] font-bold text-indigo-700 tracking-tighter uppercase leading-tight">
                          {company?.name || "CreatonsHR"}
                        </span>
                        <span className="text-[7px] text-indigo-500 font-mono mt-0.5">OFFICIAL SEAL</span>
                      </div>
                    )}
                    <span className="text-[9px] text-slate-400 font-mono mt-1">Official Seal</span>
                  </div>

                  {/* Right: 2nd Priority (e.g. HR / CEO / Authorized Signatory) */}
                  <div className="flex flex-col text-right items-end min-w-[140px] flex-1">
                    <p className="font-bold text-slate-800">{docSignatories[1].label}</p>
                    <div className="h-12 flex items-center justify-end">
                      {docSignatories[1].dataUrl ? (
                        <img
                          src={docSignatories[1].dataUrl}
                          alt={docSignatories[1].roleTitle}
                          className="max-h-10 object-contain"
                        />
                      ) : (
                        <div className="h-8 border-b border-dashed border-slate-300 w-28" />
                      )}
                    </div>
                    <p className="text-slate-700 font-semibold">{docSignatories[1].signerName}</p>
                    <p className="text-[10px] text-slate-500">{docSignatories[1].roleTitle}</p>
                  </div>
                </>
              ) : (
                <>
                  {docSignatories.map((sig, sIdx) => {
                    const isFirst = sIdx === 0;
                    const isLast = sIdx === docSignatories.length - 1;
                    const alignClass =
                      docSignatories.length === 1
                        ? "text-left items-start"
                        : isFirst
                        ? "text-left items-start"
                        : isLast
                        ? "text-right items-end"
                        : "text-center items-center";

                    return (
                      <div
                        key={sig.key}
                        className={`flex flex-col ${alignClass} min-w-[130px] flex-1`}
                      >
                        <p className="font-bold text-slate-800">{sig.label}</p>
                        <div className="h-12 flex items-center justify-center">
                          {sig.dataUrl ? (
                            <img
                              src={sig.dataUrl}
                              alt={sig.roleTitle}
                              className="max-h-10 object-contain"
                            />
                          ) : sig.isEmployee ? (
                            <span className="text-[10px] text-slate-400 italic">
                              Recipient Sign-off
                            </span>
                          ) : (
                            <div className="h-8 border-b border-dashed border-slate-300 w-24" />
                          )}
                        </div>
                        <p className="text-slate-700 font-semibold">{sig.signerName}</p>
                        <p className="text-[10px] text-slate-500">{sig.roleTitle}</p>
                      </div>
                    );
                  })}

                  {doc.includeCompanySeal !== false && docSignatories.length !== 2 && (
                    <div className="flex flex-col items-center px-2 shrink-0">
                      {docAssets?.companySealDataUrl ? (
                        <img
                          src={docAssets.companySealDataUrl}
                          alt="Company Seal"
                          className="h-16 w-16 object-contain filter contrast-125 opacity-90"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full border-2 border-dashed border-indigo-400/60 bg-indigo-50/50 flex flex-col items-center justify-center text-center p-1">
                          <span className="text-[9px] font-bold text-indigo-700 tracking-tighter uppercase leading-tight">
                            {company?.name || "CreatonsHR"}
                          </span>
                          <span className="text-[7px] text-indigo-500 font-mono mt-0.5">OFFICIAL SEAL</span>
                        </div>
                      )}
                      <span className="text-[9px] text-slate-400 font-mono mt-1">Official Seal</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* 6. Footer */}
      {(!ft || ft.enabled !== false) && (
        <div className="pt-4 mt-auto border-t border-slate-100 text-[10px] text-slate-400">
          {ft?.style === "uploaded" && (docAssets?.footerDataUrl || ft?.customBannerUrl) ? (
            <img
              src={docAssets?.footerDataUrl || ft?.customBannerUrl}
              alt="Footer Graphic"
              className="w-full max-h-20 object-contain"
            />
          ) : (
            <div className="flex items-center justify-between">
              <span>{ft?.confidentialText || "STRICTLY CONFIDENTIAL • FOR RECIPIENT USE ONLY"}</span>
              {ft?.showPageNumbers !== false && <span className="font-mono">Page 1 of 1</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Human-friendly status badge mapping
function StatusBadgeView({ status }: { status: DigitalDocumentStatus }) {
  const map: Record<DigitalDocumentStatus, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20" },
    SENT: { label: "Sent", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
    PENDING_APPROVAL: { label: "Waiting for Approval", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
    PARTIALLY_APPROVED: { label: "In Approval (Partial)", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
    APPROVED: { label: "Approved", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
    REJECTED: { label: "Rejected", className: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
    PENDING_EMPLOYEE_ACTION: { label: "Waiting on Employee", className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
    ACKNOWLEDGED: { label: "Acknowledged", className: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" },
    COMPLETED: { label: "Completed", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
    CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
    EXPIRED: { label: "Expired", className: "bg-red-500/10 text-red-700 border-red-300" },
    OVERDUE: { label: "Overdue", className: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
  };

  const item = map[status] || { label: status, className: "bg-muted text-muted-foreground border-border" };

  return (
    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${item.className} inline-flex items-center gap-1`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {item.label}
    </span>
  );
}
