import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useStore, type Employee } from "@/lib/store";
import {
  useDigitalDocStore,
  PRESET_DOCUMENTS,
  DYNAMIC_FIELDS,
  resolveDocumentTags,
  type DigitalDocument,
  type DigitalDocumentStatus,
  type ApprovalMode,
  type ApprovalStepItem,
  type DocCustomTable,
} from "@/lib/digital-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/admin/documentation-alt")({
  head: () => ({ meta: [{ title: "Digital Document Composer · SWIFT HRMS" }] }),
  component: DigitalDocumentationPage,
});

type ViewMode = "list" | "composer" | "detail";
type RecipientSelectionMode = "single" | "custom" | "all" | "multiple";

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
  const [docTypePresetId, setDocTypePresetId] = useState<string>("appointment_letter");
  const [isCustomDocName, setIsCustomDocName] = useState(false);
  const [customDocName, setCustomDocName] = useState("");

  // Recipient Selection State
  const [recipientMode, setRecipientMode] = useState<RecipientSelectionMode>("single");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [previewEmpId, setPreviewEmpId] = useState<string>("");
  const [multiSelectSearch, setMultiSelectSearch] = useState<string>("");
  const [customRecipient, setCustomRecipient] = useState({
    name: "",
    empCode: "EXT-" + Math.floor(1000 + Math.random() * 9000),
    designation: "External Consultant",
    department: "Consulting / Advisory",
    email: "",
    phone: "",
  });

  // Content
  const [docContentHtml, setDocContentHtml] = useState<string>("");
  const [customTable, setCustomTable] = useState<DocCustomTable | null>(null);

  // Delivery
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "app" | "both">("both");
  const [deliverySubject, setDeliverySubject] = useState("");

  // Approval
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("sequential");
  const [approvers, setApprovers] = useState<ApprovalStepItem[]>([
    { id: "s-1", approverRoleOrName: "HR Manager", order: 1, status: "pending" },
    { id: "s-2", approverRoleOrName: "HR Head", order: 2, status: "pending" },
    { id: "s-3", approverRoleOrName: "Authorized Signatory", order: 3, status: "pending" },
  ]);

  // Escalation
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [escalationDelay, setEscalationDelay] = useState(2);
  const [escalationTarget, setEscalationTarget] = useState("HR Head");
  const [secondEscalationEnabled, setSecondEscalationEnabled] = useState(false);
  const [secondEscalationDelay, setSecondEscalationDelay] = useState(2);
  const [secondEscalationTarget, setSecondEscalationTarget] = useState("Director");

  // Modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [newTableRows, setNewTableRows] = useState(3);
  const [newTableCols, setNewTableCols] = useState(3);

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

  // Dynamic Selected Employee for Preview / Resolution
  const selectedEmployee = useMemo(() => {
    if (recipientMode === "custom") {
      return {
        id: "custom-ext",
        name: customRecipient.name || "Custom Recipient",
        empCode: customRecipient.empCode || "EXT-001",
        designation: customRecipient.designation || "External / Consultant",
        department: customRecipient.department || "External",
        email: customRecipient.email || "recipient@external.com",
        phone: customRecipient.phone || "",
      } as unknown as Employee;
    }
    if (recipientMode === "all" || recipientMode === "multiple") {
      const targetId = previewEmpId || selectedEmpIds[0] || employees[0]?.id;
      return employees.find((e) => e.id === targetId) || employees[0] || null;
    }
    return employees.find((e) => e.id === selectedEmpId) || employees[0] || null;
  }, [recipientMode, customRecipient, previewEmpId, selectedEmpIds, selectedEmpId, employees]);

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

  // Handle Recipient Dropdown Selection
  function handleRecipientChange(value: string) {
    if (value === "custom") {
      setRecipientMode("custom");
    } else if (value === "select_all") {
      setRecipientMode("all");
      const allIds = employees.map((e) => e.id);
      setSelectedEmpIds(allIds);
      if (allIds.length > 0) setPreviewEmpId(allIds[0]);
    } else if (value === "multiple") {
      setRecipientMode("multiple");
      if (selectedEmpIds.length === 0) {
        const initial = selectedEmpId ? [selectedEmpId] : employees.slice(0, 2).map((e) => e.id);
        setSelectedEmpIds(initial);
        if (initial.length > 0) setPreviewEmpId(initial[0]);
      }
    } else {
      setRecipientMode("single");
      setSelectedEmpId(value);
      setSelectedEmpIds([value]);
      setPreviewEmpId(value);
    }
  }

  // Start new document flow
  function handleStartNewDoc(presetId = "appointment_letter") {
    const preset = PRESET_DOCUMENTS.find((p) => p.id === presetId) || PRESET_DOCUMENTS[0];
    const firstEmp = employees[0];

    setEditingDocId(null);
    setDocTypePresetId(preset.id);
    setIsCustomDocName(false);
    setCustomDocName("");
    setRecipientMode("single");
    setSelectedEmpId(firstEmp?.id || "");
    setSelectedEmpIds(firstEmp ? [firstEmp.id] : []);
    setPreviewEmpId(firstEmp?.id || "");
    setCustomRecipient({
      name: "",
      empCode: "EXT-" + Math.floor(1000 + Math.random() * 9000),
      designation: "External Consultant",
      department: "Consulting / Advisory",
      email: "",
      phone: "",
    });
    setDocContentHtml(preset.templateBody);
    setDeliveryChannel("both");
    setDeliverySubject(preset.defaultSubject);
    setApprovalRequired(true);
    setApprovalMode(preset.defaultApprovalMode);
    setApprovers(
      preset.defaultApprovers.map((name, i) => ({
        id: `s-${i + 1}`,
        approverRoleOrName: name,
        order: i + 1,
        status: "pending",
      }))
    );
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

    setViewMode("composer");
  }

  // Load existing document into composer (for Drafts or Rejected docs)
  function handleEditExistingDoc(doc: DigitalDocument) {
    setEditingDocId(doc.id);
    setIsCustomDocName(doc.isCustomName);
    setCustomDocName(doc.isCustomName ? doc.name : "");
    const matchedPreset = PRESET_DOCUMENTS.find((p) => p.name === doc.documentType);
    setDocTypePresetId(matchedPreset ? matchedPreset.id : "custom");

    const matchedEmp = employees.find((e) => e.id === doc.employeeId);
    if (matchedEmp) {
      setRecipientMode("single");
      setSelectedEmpId(doc.employeeId);
      setSelectedEmpIds([doc.employeeId]);
      setPreviewEmpId(doc.employeeId);
    } else {
      setRecipientMode("custom");
      setCustomRecipient({
        name: doc.employeeName,
        empCode: doc.employeeCode,
        designation: doc.designation,
        department: doc.department,
        email: doc.employeeEmail,
        phone: "",
      });
    }

    setDocContentHtml(doc.contentHtml);
    setCustomTable(doc.tableData || null);
    setDeliveryChannel(doc.delivery.channel);
    setDeliverySubject(doc.delivery.subject);
    setApprovalRequired(doc.approvalRequired);
    setApprovalMode(doc.approvalMode);
    setApprovers(doc.approvers);
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
    setDocContentHtml(preset.templateBody);
    setDeliverySubject(preset.defaultSubject);
    setApprovalMode(preset.defaultApprovalMode);
    setApprovers(
      preset.defaultApprovers.map((name, i) => ({
        id: `s-${Date.now()}-${i}`,
        approverRoleOrName: name,
        order: i + 1,
        status: "pending",
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
    const digitalStamp = sigIncludeDigitalStamp ? '<div style="margin-top: 8px; display: inline-block; padding: 4px 8px; border: 1px dashed #6366f1; background: #eef2ff; color: #4338ca; border-radius: 4px; font-size: 10px; font-family: monospace;">✓ Digitally Signed via SWIFT HRMS</div>' : '';

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

  // Save Draft
  function handleSaveDraft() {
    const docName = isCustomDocName
      ? customDocName.trim() || "Custom HR Document"
      : PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId)?.name || "HR Digital Document";

    // Custom Mode
    if (recipientMode === "custom") {
      if (!customRecipient.name.trim()) {
        toast.error("Please enter a custom recipient name");
        return;
      }
      const payload = {
        name: docName,
        documentType: isCustomDocName ? "Custom" : docName,
        isCustomName: isCustomDocName,
        employeeId: "custom-ext",
        employeeName: customRecipient.name.trim(),
        employeeCode: customRecipient.empCode.trim() || "EXT-001",
        designation: customRecipient.designation.trim() || "External / Consultant",
        department: customRecipient.department.trim() || "External",
        employeeEmail: customRecipient.email.trim() || "recipient@external.com",
        contentHtml: docContentHtml,
        tableData: customTable,
        delivery: {
          channel: deliveryChannel,
          recipientEmail: customRecipient.email.trim() || "recipient@external.com",
          subject: deliverySubject || `${docName} — ${customRecipient.name.trim()}`,
        },
        approvalRequired,
        approvalMode,
        approvers,
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
        updateDocument(editingDocId, payload, "Saved updated draft");
        toast.success("Draft updated successfully");
      } else {
        const created = addDocument(payload);
        setEditingDocId(created.id);
        toast.success("Document saved as Draft");
      }
      return;
    }

    // Bulk Mode (All or Multiple)
    if (recipientMode === "all" || recipientMode === "multiple") {
      const targetEmpIds = recipientMode === "all" ? employees.map((e) => e.id) : selectedEmpIds;
      if (targetEmpIds.length === 0) {
        toast.error("Please select at least one employee");
        return;
      }

      const targetEmps = employees.filter((e) => targetEmpIds.includes(e.id));
      targetEmps.forEach((emp) => {
        const payload = {
          name: docName,
          documentType: isCustomDocName ? "Custom" : docName,
          isCustomName: isCustomDocName,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeCode: emp.empCode,
          designation: emp.designation,
          department: emp.department,
          employeeEmail: emp.email,
          contentHtml: docContentHtml,
          tableData: customTable,
          delivery: {
            channel: deliveryChannel,
            recipientEmail: emp.email,
            subject: deliverySubject || `${docName} — ${emp.name}`,
          },
          approvalRequired,
          approvalMode,
          approvers,
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
        addDocument(payload);
      });

      toast.success(`Saved drafts for ${targetEmps.length} employees`);
      setViewMode("list");
      return;
    }

    // Single Mode
    if (!selectedEmployee) {
      toast.error("Please select a recipient employee");
      return;
    }

    const payload = {
      name: docName,
      documentType: isCustomDocName ? "Custom" : docName,
      isCustomName: isCustomDocName,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      employeeCode: selectedEmployee.empCode,
      designation: selectedEmployee.designation,
      department: selectedEmployee.department,
      employeeEmail: selectedEmployee.email,
      contentHtml: docContentHtml,
      tableData: customTable,
      delivery: {
        channel: deliveryChannel,
        recipientEmail: selectedEmployee.email,
        subject: deliverySubject || `${docName} — ${selectedEmployee.name}`,
      },
      approvalRequired,
      approvalMode,
      approvers,
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
      updateDocument(editingDocId, payload, "Saved updated draft");
      toast.success("Draft updated successfully");
    } else {
      const created = addDocument(payload);
      setEditingDocId(created.id);
      toast.success("Document saved as Draft");
    }
  }

  // Send Validation
  function handleValidateAndPromptSend() {
    if (recipientMode === "custom") {
      if (!customRecipient.name.trim()) {
        toast.error("Validation Failed: Please enter a recipient name");
        return;
      }
      if (deliveryChannel !== "app" && !customRecipient.email.trim()) {
        toast.error("Validation Failed: Please enter a recipient email address");
        return;
      }
    } else if (recipientMode === "all" || recipientMode === "multiple") {
      const targetIds = recipientMode === "all" ? employees.map((e) => e.id) : selectedEmpIds;
      if (targetIds.length === 0) {
        toast.error("Validation Failed: Please select at least one recipient employee");
        return;
      }
    } else {
      if (!selectedEmployee) {
        toast.error("Validation Failed: Please select a recipient employee");
        return;
      }
    }

    const docName = isCustomDocName ? customDocName.trim() : PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId)?.name;
    if (!docName) {
      toast.error("Validation Failed: Document name cannot be empty");
      return;
    }
    if (!docContentHtml || docContentHtml.trim().length < 10) {
      toast.error("Validation Failed: Document content is too short or empty");
      return;
    }
    if (approvalRequired && approvers.length === 0) {
      toast.error("Validation Failed: Please configure at least one approver");
      return;
    }

    setSendConfirmOpen(true);
  }

  // Final Send Execution
  function handleConfirmSend() {
    const docName = isCustomDocName
      ? customDocName.trim() || "Custom HR Document"
      : PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId)?.name || "HR Digital Document";

    // Custom Mode Send
    if (recipientMode === "custom") {
      const payload = {
        name: docName,
        documentType: isCustomDocName ? "Custom" : docName,
        isCustomName: isCustomDocName,
        employeeId: "custom-ext",
        employeeName: customRecipient.name.trim(),
        employeeCode: customRecipient.empCode.trim() || "EXT-001",
        designation: customRecipient.designation.trim() || "External / Consultant",
        department: customRecipient.department.trim() || "External",
        employeeEmail: customRecipient.email.trim() || "recipient@external.com",
        contentHtml: docContentHtml,
        tableData: customTable,
        delivery: {
          channel: deliveryChannel,
          recipientEmail: customRecipient.email.trim() || "recipient@external.com",
          subject: deliverySubject || `${docName} — ${customRecipient.name.trim()}`,
        },
        approvalRequired,
        approvalMode,
        approvers: approvers.map((a) => ({ ...a, status: "pending" as const })),
        currentStepIndex: 0,
        escalation: {
          enabled: escalationEnabled,
          delayDays: escalationDelay,
          escalateTo: escalationTarget,
          secondEscalationEnabled,
          secondDelayDays: secondEscalationDelay,
          secondEscalateTo: secondEscalationTarget,
        },
        status: (approvalRequired ? "PENDING_APPROVAL" : "SENT") as DigitalDocumentStatus,
      };

      let targetDocId = editingDocId;

      if (editingDocId) {
        const existing = documents.find((d) => d.id === editingDocId);
        if (existing && (existing.status === "REJECTED" || existing.currentVersion > 1)) {
          createNewVersion(editingDocId, docContentHtml, customTable, "Dispatched revised version for approval");
        } else {
          updateDocument(editingDocId, payload, "Dispatched document");
        }
        sendDocument(editingDocId, currentUser?.name || "HR Admin");
      } else {
        const created = addDocument(payload);
        targetDocId = created.id;
        sendDocument(created.id, currentUser?.name || "HR Admin");
      }

      setSendConfirmOpen(false);
      toast.success(
        approvalRequired
          ? `Document sent! Initiated ${approvalMode} approval workflow.`
          : `Document dispatched successfully to ${customRecipient.name}`
      );

      if (targetDocId) {
        setSelectedDocId(targetDocId);
        setViewMode("detail");
        setDetailActiveTab("tracking");
      } else {
        setViewMode("list");
      }
      return;
    }

    // Bulk Mode Send (All or Multiple)
    if (recipientMode === "all" || recipientMode === "multiple") {
      const targetEmpIds = recipientMode === "all" ? employees.map((e) => e.id) : selectedEmpIds;
      const targetEmps = employees.filter((e) => targetEmpIds.includes(e.id));

      targetEmps.forEach((emp) => {
        const payload = {
          name: docName,
          documentType: isCustomDocName ? "Custom" : docName,
          isCustomName: isCustomDocName,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeCode: emp.empCode,
          designation: emp.designation,
          department: emp.department,
          employeeEmail: emp.email,
          contentHtml: docContentHtml,
          tableData: customTable,
          delivery: {
            channel: deliveryChannel,
            recipientEmail: emp.email,
            subject: deliverySubject || `${docName} — ${emp.name}`,
          },
          approvalRequired,
          approvalMode,
          approvers: approvers.map((a) => ({ ...a, status: "pending" as const })),
          currentStepIndex: 0,
          escalation: {
            enabled: escalationEnabled,
            delayDays: escalationDelay,
            escalateTo: escalationTarget,
            secondEscalationEnabled,
            secondDelayDays: secondEscalationDelay,
            secondEscalateTo: secondEscalationTarget,
          },
          status: (approvalRequired ? "PENDING_APPROVAL" : "SENT") as DigitalDocumentStatus,
        };

        const created = addDocument(payload);
        sendDocument(created.id, currentUser?.name || "HR Admin");
      });

      setSendConfirmOpen(false);
      toast.success(`Dispatched ${targetEmps.length} personalized documents successfully!`);
      setViewMode("list");
      return;
    }

    // Single Mode Send
    if (!selectedEmployee) return;

    const payload = {
      name: docName,
      documentType: isCustomDocName ? "Custom" : docName,
      isCustomName: isCustomDocName,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      employeeCode: selectedEmployee.empCode,
      designation: selectedEmployee.designation,
      department: selectedEmployee.department,
      employeeEmail: selectedEmployee.email,
      contentHtml: docContentHtml,
      tableData: customTable,
      delivery: {
        channel: deliveryChannel,
        recipientEmail: selectedEmployee.email,
        subject: deliverySubject || `${docName} — ${selectedEmployee.name}`,
      },
      approvalRequired,
      approvalMode,
      approvers: approvers.map((a) => ({ ...a, status: "pending" as const })),
      currentStepIndex: 0,
      escalation: {
        enabled: escalationEnabled,
        delayDays: escalationDelay,
        escalateTo: escalationTarget,
        secondEscalationEnabled,
        secondDelayDays: secondEscalationDelay,
        secondEscalateTo: secondEscalationTarget,
      },
      status: (approvalRequired ? "PENDING_APPROVAL" : "SENT") as DigitalDocumentStatus,
    };

    let targetDocId = editingDocId;

    if (editingDocId) {
      const existing = documents.find((d) => d.id === editingDocId);
      if (existing && (existing.status === "REJECTED" || existing.currentVersion > 1)) {
        // Create new version
        createNewVersion(editingDocId, docContentHtml, customTable, "Dispatched revised version for approval");
      } else {
        updateDocument(editingDocId, payload, "Dispatched document");
      }
      sendDocument(editingDocId, currentUser?.name || "HR Admin");
    } else {
      const created = addDocument(payload);
      targetDocId = created.id;
      sendDocument(created.id, currentUser?.name || "HR Admin");
    }

    setSendConfirmOpen(false);
    toast.success(
      approvalRequired
        ? `Document sent! Initiated ${approvalMode} approval workflow.`
        : `Document dispatched successfully to ${selectedEmployee.name}`
    );

    if (targetDocId) {
      setSelectedDocId(targetDocId);
      setViewMode("detail");
      setDetailActiveTab("tracking");
    } else {
      setViewMode("list");
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

      // Company Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(20, 20, 20);
      pdf.text(company?.name || "SWIFT Technologies Pvt. Ltd.", 40, 50);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096", 40, 65);
      pdf.text(`Email: ${company?.email || "hr@swift.io"} | Phone: ${company?.phone || "+91 44 2876 5400"}`, 40, 78);

      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(1);
      pdf.line(40, 90, 555, 90);

      // Doc Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text(doc.name.toUpperCase(), 40, 120);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      const splitLines = pdf.splitTextToSize(cleanText, 515);
      pdf.text(splitLines, 40, 145);

      let currentY = 145 + splitLines.length * 12 + 20;

      // Table if exists
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

      // Signatures
      if (currentY > 700) {
        pdf.addPage();
        currentY = 60;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Authorized Signatory", 40, currentY);
      pdf.text("Employee Signature", 380, currentY);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(company?.name || "SWIFT Technologies Pvt. Ltd.", 40, currentY + 15);
      pdf.text(doc.employeeName, 380, currentY + 15);

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
                  <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
                    Digital Document Engine
                  </h1>
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
                                <Smartphone className="h-3 w-3" /> SWIFT App
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

      {/* VIEW 2: DIGITAL DOCUMENT COMPOSER (EMAIL-LIKE FLOW) */}
      {viewMode === "composer" && (
        <div className="space-y-5">
          {/* Top Sticky Header */}
          <div className="sticky top-16 z-20 bg-card/95 backdrop-blur border border-border p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                className="text-xs gap-1.5 h-9"
              >
                <Save className="h-3.5 w-3.5" /> Save Draft
              </Button>
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
                onClick={handleValidateAndPromptSend}
                className="text-xs gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm px-4"
              >
                <Send className="h-3.5 w-3.5" /> Send Document
              </Button>
            </div>
          </div>

          {/* Section 2: Document Configuration & Recipient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
            {/* Document Name */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> Document Name & Template
              </Label>
              <div className="flex gap-2">
                <Select
                  value={isCustomDocName ? "custom" : docTypePresetId}
                  onValueChange={handlePresetChange}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-72">
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase font-bold px-2 py-1">
                      Standard HR Documents
                    </DropdownMenuLabel>
                    {PRESET_DOCUMENTS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name} ({preset.category})
                      </SelectItem>
                    ))}
                    <DropdownMenuSeparator />
                    <SelectItem value="custom" className="font-semibold text-primary">
                      ✨ + Create Custom Document Name
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isCustomDocName && (
                <div className="mt-2 animate-in fade-in-50 duration-200">
                  <Input
                    placeholder="Enter custom document title (e.g., Performance PIP Letter, Relocation Agreement)..."
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                    className="text-xs h-9"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Recipient Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Recipient Employee / Audience
                </Label>
                {recipientMode !== "single" && (
                  <Badge variant="outline" className="text-[10px] capitalize font-mono bg-primary/5 text-primary border-primary/20">
                    Mode: {recipientMode === "all" ? "Select All" : recipientMode === "multiple" ? "Multiple Select" : "Custom Recipient"}
                  </Badge>
                )}
              </div>

              {/* Main Select Dropdown with custom, select_all, multiple, and individual employees */}
              <Select
                value={recipientMode === "single" ? selectedEmpId : recipientMode}
                onValueChange={handleRecipientChange}
              >
                <SelectTrigger className="text-xs h-9 font-medium">
                  <SelectValue placeholder="Select employee recipient" />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-80">
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-bold px-2 py-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Special & Bulk Options
                  </DropdownMenuLabel>
                  <SelectItem value="custom" className="font-semibold text-primary focus:text-primary">
                    ✨ Custom / External Recipient (Manual Entry)
                  </SelectItem>
                  <SelectItem value="select_all" className="font-semibold text-emerald-600 dark:text-emerald-400 focus:text-emerald-600">
                    👥 Select All Employees ({employees.length} Total)
                  </SelectItem>
                  <SelectItem value="multiple" className="font-semibold text-indigo-600 dark:text-indigo-400 focus:text-indigo-600">
                    ☑️ Multiple Select... ({selectedEmpIds.length > 0 ? `${selectedEmpIds.length} Selected` : "Choose Multiple"})
                  </SelectItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-bold px-2 py-1">
                    Individual Employees
                  </DropdownMenuLabel>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} · {emp.empCode} ({emp.designation} — {emp.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 1. CUSTOM RECIPIENT FORM */}
              {recipientMode === "custom" && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Custom / External Recipient Details</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRecipientMode("single");
                        setSelectedEmpId(employees[0]?.id || "");
                      }}
                      className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-foreground"
                    >
                      Reset to Employee List
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Full Name *</Label>
                      <Input
                        placeholder="e.g. Rahul Sharma"
                        value={customRecipient.name}
                        onChange={(e) => setCustomRecipient({ ...customRecipient, name: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Email Address *</Label>
                      <Input
                        type="email"
                        placeholder="e.g. rahul@consultant.io"
                        value={customRecipient.email}
                        onChange={(e) => setCustomRecipient({ ...customRecipient, email: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Employee / Ref Code</Label>
                      <Input
                        placeholder="e.g. EXT-2026-01"
                        value={customRecipient.empCode}
                        onChange={(e) => setCustomRecipient({ ...customRecipient, empCode: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Designation / Role</Label>
                      <Input
                        placeholder="e.g. Senior Tech Advisor"
                        value={customRecipient.designation}
                        onChange={(e) => setCustomRecipient({ ...customRecipient, designation: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Department / Organization</Label>
                      <Input
                        placeholder="e.g. Strategic Advisory / External"
                        value={customRecipient.department}
                        onChange={(e) => setCustomRecipient({ ...customRecipient, department: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SELECT ALL EMPLOYEES BANNER */}
              {recipientMode === "all" && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-emerald-800 dark:text-emerald-200">
                          All {employees.length} Employees Selected
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Bulk dispatch will generate personalized copies for every staff member.
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRecipientMode("multiple")}
                      className="h-7 text-xs px-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Filter / Customize
                    </Button>
                  </div>

                  {/* Preview Selector */}
                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                    <span className="text-muted-foreground text-[11px] shrink-0">Preview template for:</span>
                    <Select value={previewEmpId} onValueChange={setPreviewEmpId}>
                      <SelectTrigger className="h-7 text-[11px] bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs max-h-60">
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.empCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 3. MULTIPLE SELECT INTERACTIVE PANEL */}
              {recipientMode === "multiple" && (
                <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-indigo-600 text-white text-[11px]">
                        {selectedEmpIds.length} of {employees.length} Selected
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">Target Recipients</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEmpIds(employees.map((e) => e.id))}
                        className="h-6 text-[11px] px-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEmpIds([])}
                        className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>

                  {/* Search inside multiple select */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search employees by name, code, dept..."
                      value={multiSelectSearch}
                      onChange={(e) => setMultiSelectSearch(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>

                  {/* Selected Tags Chips */}
                  {selectedEmpIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 rounded-lg bg-background/60 border border-border">
                      {selectedEmpIds.map((id) => {
                        const emp = employees.find((e) => e.id === id);
                        if (!emp) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-500/20"
                          >
                            {emp.name} ({emp.empCode})
                            <button
                              type="button"
                              onClick={() => setSelectedEmpIds(selectedEmpIds.filter((x) => x !== id))}
                              className="text-indigo-500 hover:text-indigo-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Checkbox List of Employees */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-background">
                    {employees
                      .filter((emp) => {
                        const q = multiSelectSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          emp.name.toLowerCase().includes(q) ||
                          emp.empCode.toLowerCase().includes(q) ||
                          emp.department?.toLowerCase().includes(q) ||
                          emp.designation?.toLowerCase().includes(q)
                        );
                      })
                      .map((emp) => {
                        const isChecked = selectedEmpIds.includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center gap-2.5 p-2 text-xs cursor-pointer hover:bg-muted/50 transition-colors ${
                              isChecked ? "bg-indigo-500/5" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmpIds([...selectedEmpIds, emp.id]);
                                  if (!previewEmpId) setPreviewEmpId(emp.id);
                                } else {
                                  setSelectedEmpIds(selectedEmpIds.filter((x) => x !== emp.id));
                                }
                              }}
                              className="rounded border-border text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                              {emp.name[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground truncate">{emp.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {emp.empCode} · {emp.designation} · {emp.department}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                  </div>

                  {/* Preview Selector for Multiple Mode */}
                  {selectedEmpIds.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-indigo-500/20 text-xs">
                      <span className="text-muted-foreground text-[11px] shrink-0">Preview sample:</span>
                      <Select value={previewEmpId || selectedEmpIds[0]} onValueChange={setPreviewEmpId}>
                        <SelectTrigger className="h-7 text-[11px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs max-h-60">
                          {selectedEmpIds.map((id) => {
                            const emp = employees.find((e) => e.id === id);
                            if (!emp) return null;
                            return (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name} ({emp.empCode})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* 4. SINGLE EMPLOYEE CARD */}
              {recipientMode === "single" && selectedEmployee && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border text-xs">
                  <div className="h-8 w-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                    {selectedEmployee.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground truncate">{selectedEmployee.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {selectedEmployee.empCode} · {selectedEmployee.designation} · {selectedEmployee.department}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate hidden sm:block">
                    {selectedEmployee.email}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4 & 5: Primary Document Composer & Editor */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col min-h-[500px]">
            {/* Formatting Toolbar */}
            <div className="border-b border-border bg-muted/30 p-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {/* Standard Rich Text Formatting shortcuts */}
                <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDocContentHtml((prev) => `${prev}<strong>Bold Text</strong> `);
                    }}
                    className="h-7 w-7 rounded flex items-center justify-center font-bold text-xs hover:bg-muted"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocContentHtml((prev) => `${prev}<em>Italic Text</em> `);
                    }}
                    className="h-7 w-7 rounded flex items-center justify-center italic text-xs hover:bg-muted"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocContentHtml((prev) => `${prev}<u>Underlined Text</u> `);
                    }}
                    className="h-7 w-7 rounded flex items-center justify-center underline text-xs hover:bg-muted"
                    title="Underline"
                  >
                    U
                  </button>
                </div>

                <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDocContentHtml((prev) => `${prev}\n<h3>Section Heading</h3>\n`);
                    }}
                    className="h-7 px-2 rounded flex items-center justify-center font-semibold text-xs hover:bg-muted"
                    title="Heading 3"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocContentHtml((prev) => `${prev}\n<h4>Sub Heading</h4>\n`);
                    }}
                    className="h-7 px-2 rounded flex items-center justify-center font-semibold text-xs hover:bg-muted"
                    title="Heading 4"
                  >
                    H2
                  </button>
                </div>

                <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDocContentHtml((prev) => `${prev}\n<ul>\n  <li>Bullet item 1</li>\n  <li>Bullet item 2</li>\n</ul>\n`);
                    }}
                    className="h-7 px-2 rounded flex items-center justify-center text-xs hover:bg-muted gap-1"
                    title="Bullet List"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocContentHtml((prev) => `${prev}\n<ol>\n  <li>Numbered item 1</li>\n  <li>Numbered item 2</li>\n</ol>\n`);
                    }}
                    className="h-7 px-2 rounded flex items-center justify-center text-xs hover:bg-muted gap-1"
                    title="Numbered List"
                  >
                    1. List
                  </button>
                </div>
              </div>

              {/* Insert / Add Dropdown & Dynamic Fields */}
              <div className="flex items-center gap-2">
                {/* Insert Dynamic Field */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5" /> Insert Field
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-80 text-xs">
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">
                      Employee Fields
                    </DropdownMenuLabel>
                    {DYNAMIC_FIELDS.filter((f) => f.category === "Employee").map((f) => (
                      <DropdownMenuItem key={f.tag} onClick={() => insertDynamicTag(f.tag)}>
                        <span className="font-mono text-primary mr-1.5">{f.tag}</span>
                        <span className="text-muted-foreground text-[11px] truncate">({f.label})</span>
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">
                      Company & Doc Fields
                    </DropdownMenuLabel>
                    {DYNAMIC_FIELDS.filter((f) => f.category !== "Employee").map((f) => (
                      <DropdownMenuItem key={f.tag} onClick={() => insertDynamicTag(f.tag)}>
                        <span className="font-mono text-primary mr-1.5">{f.tag}</span>
                        <span className="text-muted-foreground text-[11px] truncate">({f.label})</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* + Add Insert Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 text-xs gap-1 bg-primary text-primary-foreground font-semibold">
                      <Plus className="h-3.5 w-3.5" /> Add Element
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs">
                    <DropdownMenuItem onClick={() => setTableModalOpen(true)}>
                      <TableIcon className="h-4 w-4 mr-2 text-indigo-500" /> Insert Table
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setDocContentHtml((prev) => `${prev}\n<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />\n`);
                        toast.success("Divider line added");
                      }}
                    >
                      <Layers className="h-4 w-4 mr-2 text-slate-500" /> Divider Line
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSignatureModalOpen(true)}>
                      <PenTool className="h-4 w-4 mr-2 text-emerald-500" /> Signature Block (Choose Signers...)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setDocContentHtml(
                          (prev) =>
                            `${prev}\n<div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin: 12px 0; font-size: 13px;"><strong>Important Notice:</strong> Please ensure all compliance certificates are submitted within 14 days.</div>\n`
                        );
                        toast.success("Callout notice box added");
                      }}
                    >
                      <AlertCircle className="h-4 w-4 mr-2 text-blue-500" /> Callout / Note Box
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Email-like Text Editor Body */}
            <div className="p-4 flex-1 flex flex-col space-y-3">
              <div className="text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
                <span>
                  Tip: Use <code>{"{{employee_name}}"}</code>, <code>{"{{designation}}"}</code>, <code>{"{{salary}}"}</code> for automatic variable resolution.
                </span>
                <span className="text-[11px] font-mono text-primary font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Resolving for: {selectedEmployee?.name || "Employee"}
                  {recipientMode === "all" && ` (Previewing 1 of ${employees.length} employees)`}
                  {recipientMode === "multiple" && ` (Previewing 1 of ${selectedEmpIds.length} employees)`}
                  {recipientMode === "custom" && " (Custom Recipient)"}
                </span>
              </div>

              <textarea
                value={docContentHtml}
                onChange={(e) => setDocContentHtml(e.target.value)}
                className="w-full flex-1 min-h-[280px] p-4 text-xs font-mono rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-y"
                placeholder="Compose digital document content here..."
              />

              {/* Table Editor if table exists */}
              {customTable && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-xs text-foreground">
                        Document Table: {customTable.caption || "Table Annexure"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newRow = Array.from({ length: customTable.headers.length }, () => "—");
                          setCustomTable({ ...customTable, rows: [...customTable.rows, newRow] });
                        }}
                        className="h-7 text-xs px-2"
                      >
                        + Add Row
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const nextIdx = customTable.headers.length + 1;
                          setCustomTable({
                            ...customTable,
                            headers: [...customTable.headers, `Column ${nextIdx}`],
                            rows: customTable.rows.map((r) => [...r, "—"]),
                          });
                        }}
                        className="h-7 text-xs px-2"
                      >
                        + Add Column
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCustomTable(null)}
                        className="h-7 text-xs px-2 text-red-600 hover:bg-red-500/10"
                        title="Remove Table"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/70 border-b border-border">
                        <tr>
                          {customTable.headers.map((h, colIdx) => (
                            <th key={colIdx} className="p-2 font-semibold">
                              <input
                                type="text"
                                value={h}
                                onChange={(e) => {
                                  const updated = [...customTable.headers];
                                  updated[colIdx] = e.target.value;
                                  setCustomTable({ ...customTable, headers: updated });
                                }}
                                className="bg-transparent border-b border-border/50 text-xs font-semibold focus:outline-none w-full"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {customTable.rows.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {row.map((cell, colIdx) => (
                              <td key={colIdx} className="p-2">
                                <input
                                  type="text"
                                  value={cell}
                                  onChange={(e) => {
                                    const updatedRows = [...customTable.rows];
                                    updatedRows[rowIdx][colIdx] = e.target.value;
                                    setCustomTable({ ...customTable, rows: updatedRows });
                                  }}
                                  className="bg-transparent text-xs w-full focus:outline-none focus:bg-primary/5 rounded px-1"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 9, 10, 11, 12: Delivery, Approval & Escalation Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Delivery Settings */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Send className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
                  1. Delivery Configuration
                </h3>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Send Via Channels</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryChannel("email")}
                    className={`py-2 px-2 text-center rounded-xl text-xs border transition-all ${
                      deliveryChannel === "email"
                        ? "bg-primary text-primary-foreground font-semibold border-transparent"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryChannel("app")}
                    className={`py-2 px-2 text-center rounded-xl text-xs border transition-all ${
                      deliveryChannel === "app"
                        ? "bg-primary text-primary-foreground font-semibold border-transparent"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    SWIFT App
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryChannel("both")}
                    className={`py-2 px-2 text-center rounded-xl text-xs border transition-all ${
                      deliveryChannel === "both"
                        ? "bg-primary text-primary-foreground font-semibold border-transparent"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Recipient Email</Label>
                <Input
                  disabled
                  value={
                    recipientMode === "all"
                      ? `Dynamic (All ${employees.length} Employee Emails)`
                      : recipientMode === "multiple"
                      ? `Dynamic (${selectedEmpIds.length} Selected Employee Emails)`
                      : recipientMode === "custom"
                      ? customRecipient.email || "recipient@external.com"
                      : selectedEmployee?.email || "employee@swift.io"
                  }
                  className="text-xs h-8 bg-muted/40 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Subject Line</Label>
                <Input
                  value={deliverySubject}
                  onChange={(e) => setDeliverySubject(e.target.value)}
                  placeholder="Document Subject"
                  className="text-xs h-8"
                />
              </div>
            </div>

            {/* Approval Matrix */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    2. Approval Matrix
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Required</span>
                  <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
                </div>
              </div>

              {approvalRequired ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Approval Mode</Label>
                    <Select
                      value={approvalMode}
                      onValueChange={(v) => setApprovalMode(v as ApprovalMode)}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="sequential">Sequential (Ordered Step-by-Step)</SelectItem>
                        <SelectItem value="all_must_approve">All Must Approve (Parallel)</SelectItem>
                        <SelectItem value="any_one">Any One Can Approve (Quorum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-[11px] text-muted-foreground">Configured Approvers</Label>
                      <button
                        type="button"
                        onClick={() => {
                          const newStep: ApprovalStepItem = {
                            id: `s-${Date.now()}`,
                            approverRoleOrName: "Director",
                            order: approvers.length + 1,
                            status: "pending",
                          };
                          setApprovers([...approvers, newStep]);
                        }}
                        className="text-[11px] text-primary font-semibold hover:underline"
                      >
                        + Add Approver
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {approvers.map((step, idx) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/40 border border-border text-xs"
                        >
                          <span className="font-mono text-muted-foreground text-[10px] w-4 text-center">
                            {idx + 1}.
                          </span>
                          <Input
                            value={step.approverRoleOrName}
                            onChange={(e) => {
                              const updated = [...approvers];
                              updated[idx].approverRoleOrName = e.target.value;
                              setApprovers(updated);
                            }}
                            className="h-7 text-xs flex-1 bg-background"
                          />
                          {approvalMode === "sequential" && (
                            <div className="flex items-center">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const updated = [...approvers];
                                  const temp = updated[idx - 1];
                                  updated[idx - 1] = updated[idx];
                                  updated[idx] = temp;
                                  setApprovers(updated);
                                }}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === approvers.length - 1}
                                onClick={() => {
                                  const updated = [...approvers];
                                  const temp = updated[idx + 1];
                                  updated[idx + 1] = updated[idx];
                                  updated[idx] = temp;
                                  setApprovers(updated);
                                }}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setApprovers(approvers.filter((_, i) => i !== idx))}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/20 border border-dashed text-center text-xs text-muted-foreground">
                  Approval disabled. Document will be sent directly to employee.
                </div>
              )}
            </div>

            {/* Escalation Rules */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    3. Auto-Escalation
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Enabled</span>
                  <Switch checked={escalationEnabled} onCheckedChange={setEscalationEnabled} />
                </div>
              </div>

              {escalationEnabled ? (
                <div className="space-y-3 text-xs">
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
                    <span className="text-muted-foreground">days to:</span>
                  </div>

                  <Select value={escalationTarget} onValueChange={setEscalationTarget}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="HR Head">HR Head (Priya Kumar)</SelectItem>
                      <SelectItem value="Director">Director / Board Signatory</SelectItem>
                      <SelectItem value="CEO / Super Admin">CEO / Super Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="pt-2 border-t border-border">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={secondEscalationEnabled}
                        onChange={(e) => setSecondEscalationEnabled(e.target.checked)}
                        className="rounded"
                      />
                      <span>Enable Level 2 Escalation</span>
                    </label>

                    {secondEscalationEnabled && (
                      <div className="mt-2 space-y-2 pl-4 border-l-2 border-primary/30 animate-in fade-in-50">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span>After +</span>
                          <Input
                            type="number"
                            value={secondEscalationDelay}
                            onChange={(e) => setSecondEscalationDelay(Number(e.target.value))}
                            className="h-7 w-12 text-center text-xs"
                          />
                          <span>days → Director</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/20 border border-dashed text-center text-xs text-muted-foreground">
                  Escalation is disabled for this document.
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
                          : "Awaiting digital acknowledgement from employee via SWIFT portal."}
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
              <RealisticDocumentPaper doc={activeDetailDoc} company={company} employees={employees} />
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
            {(recipientMode === "all" || recipientMode === "multiple") && (
              <div className="w-full max-w-[650px] p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  Showing sample preview for <b>{selectedEmployee?.name}</b> ({selectedEmployee?.empCode}).
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {recipientMode === "all" ? `All ${employees.length} Staff` : `${selectedEmpIds.length} Selected`}
                </Badge>
              </div>
            )}
            {recipientMode === "custom" && (
              <div className="w-full max-w-[650px] p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  Previewing for Custom Recipient: <b>{customRecipient.name || "Unnamed"}</b>
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Custom Entry
                </Badge>
              </div>
            )}
            <div className="w-full max-w-[650px] bg-white text-slate-900 shadow-xl border border-slate-200 p-8 sm:p-12 rounded-lg text-xs leading-relaxed space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4 border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {company?.name || "SWIFT Technologies Pvt. Ltd."}
                  </h2>
                  <p className="text-[11px] text-slate-500">{company?.address || "Tower B, Silicon Heights, OMR, Chennai"}</p>
                  <p className="text-[11px] text-slate-500">Email: {company?.email || "hr@swift.io"} | Web: www.swift-technologies.com</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                  SWIFT
                </div>
              </div>

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

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-[11px]">
                <div>
                  <p className="font-bold text-slate-800">For {company?.name || "SWIFT Technologies"}</p>
                  <div className="h-10" />
                  <p className="text-slate-600">Authorized Signatory</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">Employee Acceptance</p>
                  <div className="h-10" />
                  <p className="text-slate-600">{selectedEmployee?.name || "Employee Signature"}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
              Back to Edit
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPreviewOpen(false);
                handleValidateAndPromptSend();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Proceed to Send
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
                  <span>Digital e-Sign Stamp (SWIFT Verified)</span>
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
                      const digitalStamp = sigIncludeDigitalStamp ? '<div style="margin-top: 6px; display: inline-block; padding: 3px 6px; border: 1px dashed #6366f1; background: #eef2ff; color: #4338ca; border-radius: 4px; font-size: 9px; font-family: monospace;">✓ Digitally Signed via SWIFT HRMS</div>' : '';

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
                            <p style="font-weight: bold; margin-bottom: 12px;">${sigCompanyOrgLabel.replace("{{company_name}}", company?.name || "SWIFT Technologies")}</p>
                            ${previewSigImg}
                            <div style="border-top: 1px solid #94a3b8; width: 140px; margin-bottom: 3px;"></div>
                            <p style="font-weight: 600; margin: 0; font-size: 11px;">${firstRole}</p>
                            <p style="color: #64748b; font-size: 10px; margin: 0;">${company?.name || "SWIFT Technologies"}</p>
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
                          <p style="font-weight: bold; margin-bottom: 12px;">${sigCompanyOrgLabel.replace("{{company_name}}", company?.name || "SWIFT Technologies")}</p>
                          ${previewSigImg}
                          <div style="border-top: 1px solid #94a3b8; width: 150px; margin-bottom: 3px;"></div>
                          <p style="font-weight: 600; margin: 0; font-size: 11px;">${firstRole}</p>
                          <p style="color: #64748b; font-size: 10px; margin: 0;">${company?.name || "SWIFT Technologies"}</p>
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
                            <p style="font-weight: bold; margin-bottom: 12px;">${sigCompanyOrgLabel.replace("{{company_name}}", company?.name || "SWIFT Technologies")}</p>
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

      {/* SEND VALIDATION & CONFIRMATION MODAL */}
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Confirm & Send Document
            </DialogTitle>
            <DialogDescription className="text-xs">
              All validations passed. Please verify document configuration summary before dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Document:</span>
                <span className="font-bold text-foreground">
                  {isCustomDocName ? customDocName : PRESET_DOCUMENTS.find((p) => p.id === docTypePresetId)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recipient(s):</span>
                <span className="font-bold text-foreground">
                  {recipientMode === "all"
                    ? `👥 All ${employees.length} Employees (Bulk Dispatch)`
                    : recipientMode === "multiple"
                    ? `👥 ${selectedEmpIds.length} Selected Employees (Bulk Dispatch)`
                    : recipientMode === "custom"
                    ? `✨ ${customRecipient.name || "Custom Recipient"} (${customRecipient.empCode || "EXT-001"})`
                    : `${selectedEmployee?.name} (${selectedEmployee?.empCode})`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery Method:</span>
                <span className="font-bold text-foreground capitalize">{deliveryChannel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Approval Workflow:</span>
                <span className="font-bold text-foreground capitalize">
                  {approvalRequired ? `${approvalMode.replace(/_/g, " ")} (${approvers.length} steps)` : "None (Direct)"}
                </span>
              </div>
              {escalationEnabled && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Escalation:</span>
                  <span className="font-bold text-foreground">After {escalationDelay} days → {escalationTarget}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSendConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSend}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Confirm & Send
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
}: {
  doc: DigitalDocument;
  company: any;
  employees: Employee[];
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

  return (
    <div className="w-full max-w-[650px] bg-white text-slate-900 shadow-2xl border border-slate-200 p-8 sm:p-12 rounded-lg text-xs leading-relaxed space-y-6">
      {/* Letterhead */}
      <div className="flex items-start justify-between border-b pb-4 border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            {company?.name || "SWIFT Technologies Pvt. Ltd."}
          </h2>
          <p className="text-[11px] text-slate-500">{company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096"}</p>
          <p className="text-[11px] text-slate-500">Email: {company?.email || "hr@swift.io"} | Web: www.swift-technologies.com</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
          SWIFT
        </div>
      </div>

      {/* Title */}
      <div className="text-center py-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
          {doc.name}
        </h3>
      </div>

      {/* Body Content */}
      <div
        className="space-y-3 text-slate-700 font-sans"
        dangerouslySetInnerHTML={{ __html: resolvedHtml }}
      />

      {/* Table Annexure if exists */}
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

      {/* Signatures */}
      <div className="pt-10 flex justify-between items-end border-t border-slate-200 text-[11px]">
        <div>
          <p className="font-bold text-slate-800">For {company?.name || "SWIFT Technologies"}</p>
          <div className="h-12" />
          <p className="text-slate-600 font-medium">Authorized Signatory</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-800">Employee Acceptance</p>
          <div className="h-12" />
          <p className="text-slate-600 font-medium">{doc.employeeName}</p>
        </div>
      </div>
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
