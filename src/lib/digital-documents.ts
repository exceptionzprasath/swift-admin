import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Company, Employee } from "./store";

// ============================================================
// Types for Digital Document Composer & Lifecycle
// ============================================================

export type DocumentTypePreset = {
  id: string;
  name: string;
  category: "Onboarding" | "Confirmation" | "Movement" | "Discipline" | "Exit" | "Verification" | "Compliance" | "Custom";
  defaultSubject: string;
  description: string;
  templateBody: string;
  defaultApprovalMode: ApprovalMode;
  defaultApprovers: string[];
};

export type ApprovalMode = "sequential" | "all_must_approve" | "any_one";

export type ApprovalStepStatus = "pending" | "approved" | "rejected" | "forwarded" | "skipped";

export interface ApprovalStepItem {
  id: string;
  approverRoleOrName: string;
  approverEmployeeId?: string;
  order: number;
  status: ApprovalStepStatus;
  actedBy?: string;
  actedAt?: string;
  comment?: string;
}

export interface EscalationRule {
  enabled: boolean;
  delayDays: number;
  escalateTo: string;
  secondEscalationEnabled?: boolean;
  secondDelayDays?: number;
  secondEscalateTo?: string;
}

export interface DeliveryMethodConfig {
  channel: "email" | "app" | "both";
  recipientEmail: string;
  subject: string;
  ccEmail?: string;
}

export type DigitalDocumentStatus =
  | "DRAFT"
  | "SENT"
  | "PENDING_APPROVAL"
  | "PARTIALLY_APPROVED"
  | "APPROVED"
  | "REJECTED"
  | "PENDING_EMPLOYEE_ACTION"
  | "ACKNOWLEDGED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "OVERDUE";

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  details: string;
  type?: "create" | "update" | "send" | "approval" | "rejection" | "escalation" | "ack" | "status";
}

export interface DocumentVersionSnapshot {
  version: number;
  createdAt: string;
  createdBy: string;
  summary: string;
  content: string;
  tableData?: DocCustomTable | null;
  delivery: DeliveryMethodConfig;
  approvalMode: ApprovalMode;
  approvers: ApprovalStepItem[];
}

export interface DocCustomTable {
  id: string;
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface DigitalDocument {
  id: string;
  docNumber: string; // e.g., "SWIFT-DOC-2026-001"
  name: string;
  documentType: string;
  isCustomName: boolean;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  employeeEmail: string;

  // Rich Content
  contentHtml: string;
  tableData?: DocCustomTable | null;
  attachedImages?: { id: string; url: string; caption?: string; width?: number }[];

  // Delivery Config
  delivery: DeliveryMethodConfig;

  // Approval Config
  approvalRequired: boolean;
  approvalMode: ApprovalMode;
  approvers: ApprovalStepItem[];
  currentStepIndex: number;

  // Escalation Config
  escalation: EscalationRule;

  // Status & Versioning
  status: DigitalDocumentStatus;
  currentVersion: number;
  versions: DocumentVersionSnapshot[];

  // Timeline & Audit
  auditLogs: AuditLogItem[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  completedAt?: string;
  employeeAcknowledgedAt?: string;
}

// ============================================================
// Standard Document Presets
// ============================================================

export const PRESET_DOCUMENTS: DocumentTypePreset[] = [
  {
    id: "appointment_letter",
    name: "Appointment Letter",
    category: "Onboarding",
    defaultSubject: "Formal Appointment Letter — {{employee_name}} ({{emp_code}})",
    description: "Official employment appointment letter with compensation details, role overview, and terms.",
    defaultApprovalMode: "sequential",
    defaultApprovers: ["HR Manager", "HR Head", "Authorized Signatory"],
    templateBody: `<p>Date: <strong>{{current_date}}</strong></p>
<p>Ref: <strong>{{reference_no}}</strong></p>
<br/>
<p>Dear <strong>{{employee_name}}</strong>,</p>
<p>With reference to your application and subsequent interviews, we are pleased to appoint you as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at <strong>{{company_name}}</strong> with effect from <strong>{{date_of_joining}}</strong>.</p>
<br/>
<p>Your Employee Identification Number is <strong>{{emp_code}}</strong>. You will be reporting directly to <strong>{{manager_name}}</strong>. Your annual Cost to Company (CTC) is structured as <strong>{{salary}}</strong>.</p>
<br/>
<h3>Key Terms and Conditions:</h3>
<ol>
  <li><strong>Probation Period:</strong> You will be on probation for a period of six (6) months from your joining date. Confirmation of services is subject to satisfactory performance.</li>
  <li><strong>Working Hours & Location:</strong> Your base location will be {{company_address}}. Operating hours are 9:00 AM to 6:00 PM (Monday through Friday).</li>
  <li><strong>Confidentiality:</strong> You shall maintain strict confidentiality regarding all proprietary information, client data, and company processes.</li>
</ol>
<br/>
<p>The detailed compensation structure is annexed in the table below.</p>`,
  },
  {
    id: "offer_letter",
    name: "Offer Letter",
    category: "Onboarding",
    defaultSubject: "Job Offer from {{company_name}} — {{designation}}",
    description: "Pre-joining formal job offer outlining CTC, benefits, and joining timelines.",
    defaultApprovalMode: "sequential",
    defaultApprovers: ["Talent Acquisition Lead", "HR Head"],
    templateBody: `<p>Date: <strong>{{current_date}}</strong></p>
<p>Ref: <strong>{{reference_no}}</strong></p>
<br/>
<p>Dear <strong>{{employee_name}}</strong>,</p>
<p>We are delighted to extend an offer of employment for the position of <strong>{{designation}}</strong> at <strong>{{company_name}}</strong>. We were thoroughly impressed by your credentials and enthusiasm during the interview process.</p>
<br/>
<p>Your proposed date of joining will be <strong>{{date_of_joining}}</strong>. Your annual Cost to Company (CTC) will be <strong>{{salary}}</strong>.</p>
<br/>
<p>Please review the offer details and return a signed copy acknowledging your acceptance within five (5) business days.</p>
<br/>
<p>We look forward to welcoming you to our team.</p>`,
  },
  {
    id: "salary_certificate",
    name: "Salary Certificate",
    category: "Verification",
    defaultSubject: "Salary Certificate — {{employee_name}}",
    description: "Official proof of employment and salary for bank loan, visa, or personal verification.",
    defaultApprovalMode: "any_one",
    defaultApprovers: ["HR Operations Manager", "Finance Lead"],
    templateBody: `<p style="text-align: center;"><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
<p style="text-align: center;">Date: {{current_date}}</p>
<br/>
<p>This is to certify that <strong>{{employee_name}}</strong> (Employee ID: <strong>{{emp_code}}</strong>) is a permanent, full-time employee of <strong>{{company_name}}</strong>, currently designated as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department.</p>
<br/>
<p>They have been working with our organization since <strong>{{date_of_joining}}</strong>. Their current gross remuneration is <strong>{{salary}}</strong> per annum.</p>
<br/>
<p>This certificate is issued upon the specific request of the employee for verification purposes without any financial liability on the part of the issuing company.</p>`,
  },
  {
    id: "warning_letter",
    name: "Warning Letter",
    category: "Discipline",
    defaultSubject: "Official Notice / Written Warning — {{emp_code}}",
    description: "Formal disciplinary notice regarding conduct, attendance, or policy violations.",
    defaultApprovalMode: "sequential",
    defaultApprovers: ["Department Head", "HR Head"],
    templateBody: `<p>Date: <strong>{{current_date}}</strong></p>
<p><strong>CONFIDENTIAL & STRICTLY PRIVATE</strong></p>
<br/>
<p>To: <strong>{{employee_name}}</strong> ({{emp_code}})<br/>
Designation: <strong>{{designation}}</strong><br/>
Department: <strong>{{department}}</strong></p>
<br/>
<p>Dear {{employee_name}},</p>
<p>This letter serves as a formal written warning regarding recent concerns concerning adherence to workplace standards and attendance policies at <strong>{{company_name}}</strong>.</p>
<br/>
<p>Despite previous verbal feedback, required improvements have not been consistently demonstrated. You are required to submit a written explanation within 48 hours and adhere strictly to all company conduct standards going forward.</p>`,
  },
  {
    id: "experience_certificate",
    name: "Experience Certificate",
    category: "Exit",
    defaultSubject: "Experience Certificate & Relieving Confirmation — {{employee_name}}",
    description: "Service letter issued upon completion of employment tenure.",
    defaultApprovalMode: "sequential",
    defaultApprovers: ["HR Manager", "Authorized Signatory"],
    templateBody: `<p style="text-align: center;"><strong>EXPERIENCE & SERVICE CERTIFICATE</strong></p>
<p style="text-align: center;">Date: {{current_date}}</p>
<br/>
<p>This is to certify that <strong>{{employee_name}}</strong> was employed with <strong>{{company_name}}</strong> from <strong>{{date_of_joining}}</strong> to <strong>{{current_date}}</strong>.</p>
<br/>
<p>During their tenure, they held the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department. During their service, we found them to be dedicated, sincere, and professional.</p>
<br/>
<p>They have been relieved of all duties following proper clearance of company assets. We wish them success in their future endeavors.</p>`,
  },
  {
    id: "nda_agreement",
    name: "Non-Disclosure Agreement (NDA)",
    category: "Compliance",
    defaultSubject: "Proprietary Information & Non-Disclosure Agreement — {{employee_name}}",
    description: "Confidentiality, intellectual property assignment, and trade secret protection agreement.",
    defaultApprovalMode: "all_must_approve",
    defaultApprovers: ["Legal Counsel", "HR Head"],
    templateBody: `<p style="text-align: center;"><strong>EMPLOYEE CONFIDENTIALITY AND NON-DISCLOSURE UNDERTAKING</strong></p>
<br/>
<p>I, <strong>{{employee_name}}</strong>, residing at {{employee_address}}, employed as <strong>{{designation}}</strong> (Employee ID: <strong>{{emp_code}}</strong>) with <strong>{{company_name}}</strong>, hereby covenant and agree:</p>
<br/>
<ol>
  <li><strong>Confidential Information:</strong> I shall protect and hold confidential all proprietary code, customer records, financial projections, business methodologies, and trade secrets.</li>
  <li><strong>Non-Disclosure:</strong> I shall not during or subsequent to my employment disclose or authorize anyone to disclose any confidential information.</li>
  <li><strong>Return of Materials:</strong> Upon termination of employment, I shall immediately return all physical and digital records, laptops, keys, and access tokens.</li>
</ol>`,
  },
  {
    id: "promotion_letter",
    name: "Promotion & Increment Letter",
    category: "Movement",
    defaultSubject: "Congratulations on Your Promotion — {{employee_name}}",
    description: "Formal elevation of job designation and compensation revision.",
    defaultApprovalMode: "sequential",
    defaultApprovers: ["Department Head", "HR Head", "Finance Director"],
    templateBody: `<p>Date: <strong>{{current_date}}</strong></p>
<br/>
<p>Dear <strong>{{employee_name}}</strong>,</p>
<p>In recognition of your exceptional performance, leadership, and contribution to <strong>{{company_name}}</strong>, we are delighted to promote you to the position of <strong>{{designation}}</strong> effective <strong>{{current_date}}</strong>.</p>
<br/>
<p>Your revised annual compensation package will be <strong>{{salary}}</strong>. Your dedication has been instrumental to the success of the <strong>{{department}}</strong> department.</p>
<br/>
<p>Please accept our heartiest congratulations on this well-deserved achievement.</p>`,
  },
];

// ============================================================
// Dynamic Variables List & Resolver
// ============================================================

export interface DynamicFieldDef {
  tag: string;
  label: string;
  category: "Employee" | "Company" | "Document";
  sampleValue: string;
}

export const DYNAMIC_FIELDS: DynamicFieldDef[] = [
  // Employee
  { tag: "{{employee_name}}", label: "Employee Full Name", category: "Employee", sampleValue: "Jawahar Kumar" },
  { tag: "{{emp_code}}", label: "Employee Code / ID", category: "Employee", sampleValue: "EMP-1024" },
  { tag: "{{designation}}", label: "Designation / Role", category: "Employee", sampleValue: "Business Development Manager" },
  { tag: "{{department}}", label: "Department", category: "Employee", sampleValue: "Sales & Marketing" },
  { tag: "{{date_of_joining}}", label: "Date of Joining", category: "Employee", sampleValue: "01 Oct 2024" },
  { tag: "{{manager_name}}", label: "Reporting Manager", category: "Employee", sampleValue: "Arunachalam S." },
  { tag: "{{salary}}", label: "Annual Salary / CTC", category: "Employee", sampleValue: "₹ 7,50,000" },
  { tag: "{{employee_email}}", label: "Employee Email", category: "Employee", sampleValue: "jawahar.k@swift.io" },
  { tag: "{{employee_phone}}", label: "Employee Phone", category: "Employee", sampleValue: "+91 98765 43210" },

  // Company
  { tag: "{{company_name}}", label: "Company Name", category: "Company", sampleValue: "SWIFT Technologies Pvt. Ltd." },
  { tag: "{{company_address}}", label: "Company Address", category: "Company", sampleValue: "Block 4, Tech Park, Chennai 600096" },
  { tag: "{{company_email}}", label: "Company Email", category: "Company", sampleValue: "hr@swift-technologies.com" },
  { tag: "{{company_phone}}", label: "Company Phone", category: "Company", sampleValue: "+91 44 2876 5400" },
  { tag: "{{authorized_signatory}}", label: "Authorized Signatory", category: "Company", sampleValue: "Director — Human Resources" },

  // Document
  { tag: "{{current_date}}", label: "Current / Issue Date", category: "Document", sampleValue: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
  { tag: "{{effective_date}}", label: "Effective Date", category: "Document", sampleValue: "01 October 2026" },
  { tag: "{{reference_no}}", label: "Document Reference Number", category: "Document", sampleValue: "SWIFT/HR/2026/DOC-482" },
];

export function resolveDocumentTags(
  template: string,
  employee?: Partial<Employee> | null,
  company?: Partial<Company> | null,
  extraVars?: Record<string, string>
): string {
  if (!template) return "";

  const nowStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  
  const replacements: Record<string, string> = {
    "{{employee_name}}": employee?.name || "Jawahar Kumar",
    "{{name}}": employee?.name || "Jawahar Kumar",
    "{{emp_code}}": employee?.empCode || "EMP-1024",
    "{{empCode}}": employee?.empCode || "EMP-1024",
    "{{designation}}": employee?.designation || "Business Development Manager",
    "{{department}}": employee?.department || "Sales",
    "{{date_of_joining}}": employee?.doj || "01 Oct 2024",
    "{{doj}}": employee?.doj || "01 Oct 2024",
    "{{manager_name}}": (employee as any)?.reportingManager || "Arunachalam S.",
    "{{salary}}": employee?.salary ? `₹ ${(employee.salary * 12).toLocaleString("en-IN")}` : "₹ 7,50,000",
    "{{annualCTC}}": employee?.salary ? `₹ ${(employee.salary * 12).toLocaleString("en-IN")}` : "₹ 7,50,000",
    "{{gross}}": employee?.salary ? `₹ ${employee.salary.toLocaleString("en-IN")}` : "₹ 62,500",
    "{{employee_email}}": employee?.email || "jawahar.k@swift.io",
    "{{employee_phone}}": employee?.phone || "+91 98765 43210",
    "{{employee_address}}": (employee as any)?.address || "Flat 402, Green Meadows, Chennai",
    "{{company_name}}": company?.name || "SWIFT Technologies Pvt. Ltd.",
    "{{company}}": company?.name || "SWIFT Technologies Pvt. Ltd.",
    "{{company_address}}": company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096",
    "{{company_email}}": company?.email || "hr@swift-technologies.com",
    "{{company_phone}}": company?.phone || "+91 44 2876 5400",
    "{{authorized_signatory}}": (company as any)?.authorizedSignatory || "Director — Human Capital",
    "{{current_date}}": nowStr,
    "{{today}}": nowStr,
    "{{effective_date}}": extraVars?.effective_date || nowStr,
    "{{reference_no}}": extraVars?.reference_no || `SWIFT/HR/${new Date().getFullYear()}/DOC-0${Math.floor(100 + Math.random() * 899)}`,
    ...extraVars,
  };

  let resolved = template;
  for (const [key, val] of Object.entries(replacements)) {
    const escaped = key.replace(/[{()}]/g, "\\$&");
    resolved = resolved.replace(new RegExp(escaped, "g"), val);
  }
  return resolved;
}

// ============================================================
// Seed / Initial Documents
// ============================================================

export const INITIAL_DIGITAL_DOCS: DigitalDocument[] = [
  {
    id: "doc-101",
    docNumber: "SWIFT-DOC-2026-001",
    name: "Appointment Letter",
    documentType: "Appointment Letter",
    isCustomName: false,
    employeeId: "emp-001",
    employeeName: "Jawahar Kumar",
    employeeCode: "EMP-1024",
    designation: "Business Development Manager",
    department: "Sales",
    employeeEmail: "jawahar.k@swift.io",
    contentHtml: `<p>Date: <strong>10 September 2026</strong></p>
<p>Ref: <strong>SWIFT/HR/2026/DOC-1024</strong></p>
<br/>
<p>Dear <strong>Jawahar Kumar</strong>,</p>
<p>With reference to your acceptance of our offer, we are pleased to appoint you as <strong>Business Development Manager</strong> in the <strong>Sales</strong> department at <strong>SWIFT Technologies Pvt. Ltd.</strong> with effect from <strong>01 October 2026</strong>.</p>
<br/>
<p>Your Employee Code is <strong>EMP-1024</strong>. Your consolidated CTC is <strong>₹ 8,40,000</strong> per annum. The detailed salary components and allowances are structured below.</p>
<br/>
<p>You shall be governed by the organization's policies, code of conduct, and confidentiality agreements. We look forward to a rewarding and long-term association.</p>`,
    tableData: {
      id: "tbl-1",
      caption: "Compensation & Benefits Annexure",
      headers: ["Salary Component", "Monthly (INR)", "Annual (INR)", "Remarks"],
      rows: [
        ["Basic Pay", "₹ 35,000", "₹ 4,20,000", "40% of CTC"],
        ["House Rent Allowance (HRA)", "₹ 17,500", "₹ 2,10,000", "Tax exempt per rules"],
        ["Special Allowance", "₹ 12,500", "₹ 1,50,000", "Monthly taxable"],
        ["Statutory Bonus / Benefits", "₹ 5,000", "₹ 60,000", "Annual payment"],
        ["Total Gross CTC", "₹ 70,000", "₹ 8,40,000", "Pre-tax total"],
      ],
    },
    delivery: {
      channel: "both",
      recipientEmail: "jawahar.k@swift.io",
      subject: "Appointment Letter — Jawahar Kumar (EMP-1024)",
    },
    approvalRequired: true,
    approvalMode: "sequential",
    approvers: [
      {
        id: "step-1",
        approverRoleOrName: "HR Manager",
        order: 1,
        status: "approved",
        actedBy: "Arunachalam (HR Admin)",
        actedAt: "10 Sep 2026, 2:35 PM",
        comment: "Verified offer acceptance and CTC structure. Approved.",
      },
      {
        id: "step-2",
        approverRoleOrName: "HR Head",
        order: 2,
        status: "pending",
      },
      {
        id: "step-3",
        approverRoleOrName: "Authorized Signatory",
        order: 3,
        status: "pending",
      },
    ],
    currentStepIndex: 1,
    escalation: {
      enabled: true,
      delayDays: 2,
      escalateTo: "HR Head",
      secondEscalationEnabled: true,
      secondDelayDays: 2,
      secondEscalateTo: "Director",
    },
    status: "PENDING_APPROVAL",
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: "10 Sep 2026, 2:30 PM",
        createdBy: "HR Admin (Arunachalam)",
        summary: "Initial draft submitted for sequential approval",
        content: "Initial appointment letter created.",
        delivery: { channel: "both", recipientEmail: "jawahar.k@swift.io", subject: "Appointment Letter" },
        approvalMode: "sequential",
        approvers: [],
      },
    ],
    auditLogs: [
      {
        id: "log-1",
        timestamp: "10 Sep 2026, 2:30 PM",
        actor: "Arunachalam",
        actorRole: "HR Admin",
        action: "Document Created",
        details: "Created Appointment Letter draft for Jawahar Kumar (EMP-1024)",
        type: "create",
      },
      {
        id: "log-2",
        timestamp: "10 Sep 2026, 2:31 PM",
        actor: "System",
        actorRole: "SWIFT Engine",
        action: "Sent for Approval",
        details: "Initiated sequential approval workflow (Step 1: HR Manager)",
        type: "send",
      },
      {
        id: "log-3",
        timestamp: "10 Sep 2026, 2:35 PM",
        actor: "Arunachalam",
        actorRole: "HR Manager",
        action: "Step 1 Approved",
        details: "Approved Step 1 with remark: 'Verified offer acceptance and CTC structure.'",
        type: "approval",
      },
      {
        id: "log-4",
        timestamp: "10 Sep 2026, 2:35 PM",
        actor: "System",
        actorRole: "Notification Service",
        action: "Approval Notification Dispatched",
        details: "Notified Step 2 approver: HR Head (Priya Kumar)",
        type: "status",
      },
    ],
    createdAt: "2026-09-10T14:30:00.000Z",
    updatedAt: "2026-09-10T14:35:00.000Z",
    sentAt: "2026-09-10T14:31:00.000Z",
  },
  {
    id: "doc-102",
    docNumber: "SWIFT-DOC-2026-002",
    name: "Non-Disclosure & Confidentiality Agreement",
    documentType: "Non-Disclosure Agreement (NDA)",
    isCustomName: false,
    employeeId: "emp-002",
    employeeName: "Arun Kumar",
    employeeCode: "EMP-1018",
    designation: "Senior Full Stack Engineer",
    department: "Engineering",
    employeeEmail: "arun.k@swift.io",
    contentHtml: `<p style="text-align: center;"><strong>NON-DISCLOSURE & CONFIDENTIALITY UNDERTAKING</strong></p>
<p>Date: <strong>08 September 2026</strong></p>
<br/>
<p>I, <strong>Arun Kumar</strong> (Employee Code: <strong>EMP-1018</strong>), engaged as <strong>Senior Full Stack Engineer</strong> with <strong>SWIFT Technologies Pvt. Ltd.</strong>, hereby confirm that I have reviewed, understood, and agreed to abide by the company's data security covenants, trade secret confidentiality, and intellectual property assignment guidelines.</p>
<br/>
<p>I acknowledge that unauthorized duplication, distribution, or disclosure of SWIFT codebase, client databases, or authentication secrets constitutes a material breach and grounds for immediate legal remedy.</p>`,
    delivery: {
      channel: "app",
      recipientEmail: "arun.k@swift.io",
      subject: "NDA Agreement — Action Required",
    },
    approvalRequired: true,
    approvalMode: "all_must_approve",
    approvers: [
      { id: "s1", approverRoleOrName: "Engineering VP", order: 1, status: "approved", actedBy: "Karthik R.", actedAt: "08 Sep 2026, 11:00 AM", comment: "Verified NDA terms" },
      { id: "s2", approverRoleOrName: "Legal Counsel", order: 2, status: "approved", actedBy: "Adv. Meenakshi", actedAt: "08 Sep 2026, 3:30 PM", comment: "IP clause compliant" },
    ],
    currentStepIndex: 2,
    escalation: { enabled: false, delayDays: 2, escalateTo: "HR Head" },
    status: "PENDING_EMPLOYEE_ACTION",
    currentVersion: 1,
    versions: [],
    auditLogs: [
      { id: "al-1", timestamp: "08 Sep 2026, 10:00 AM", actor: "HR Admin", actorRole: "Admin", action: "Created", details: "Generated NDA", type: "create" },
      { id: "al-2", timestamp: "08 Sep 2026, 3:30 PM", actor: "Legal Counsel", actorRole: "Approver", action: "All Approvals Completed", details: "Dispatched to employee Arun Kumar for digital acknowledgement", type: "approval" },
    ],
    createdAt: "2026-09-08T10:00:00.000Z",
    updatedAt: "2026-09-08T15:30:00.000Z",
    sentAt: "2026-09-08T15:35:00.000Z",
  },
  {
    id: "doc-103",
    docNumber: "SWIFT-DOC-2026-003",
    name: "Salary Certificate",
    documentType: "Salary Certificate",
    isCustomName: false,
    employeeId: "emp-003",
    employeeName: "Rahul Sundaram",
    employeeCode: "EMP-1005",
    designation: "Lead UI/UX Designer",
    department: "Product Design",
    employeeEmail: "rahul.s@swift.io",
    contentHtml: `<p style="text-align: center;"><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
<p style="text-align: center;">Date: <strong>05 September 2026</strong></p>
<br/>
<p>This is to certify that <strong>Rahul Sundaram</strong> (Employee ID: <strong>EMP-1005</strong>) is a confirmed, full-time employee of <strong>SWIFT Technologies Pvt. Ltd.</strong>, designated as <strong>Lead UI/UX Designer</strong>.</p>
<br/>
<p>He has been with our organization since <strong>15 March 2023</strong>. His current gross remuneration is <strong>₹ 14,40,000</strong> per annum. This certificate is issued on the employee's request for bank processing.</p>`,
    delivery: {
      channel: "email",
      recipientEmail: "rahul.s@swift.io",
      subject: "Salary Certificate — Rahul Sundaram",
    },
    approvalRequired: false,
    approvalMode: "any_one",
    approvers: [],
    currentStepIndex: 0,
    escalation: { enabled: false, delayDays: 2, escalateTo: "HR Head" },
    status: "COMPLETED",
    currentVersion: 1,
    versions: [],
    auditLogs: [
      { id: "l1", timestamp: "05 Sep 2026, 4:00 PM", actor: "Arunachalam", actorRole: "HR Admin", action: "Issued & Completed", details: "Generated and emailed to rahul.s@swift.io", type: "create" },
    ],
    createdAt: "2026-09-05T16:00:00.000Z",
    updatedAt: "2026-09-05T16:05:00.000Z",
    sentAt: "2026-09-05T16:02:00.000Z",
    completedAt: "2026-09-05T16:05:00.000Z",
  },
  {
    id: "doc-104",
    docNumber: "SWIFT-DOC-2026-004",
    name: "Warning Letter — Unauthorized Absence",
    documentType: "Warning Letter",
    isCustomName: true,
    employeeId: "emp-004",
    employeeName: "Siddharth Verma",
    employeeCode: "EMP-1033",
    designation: "Associate Analyst",
    department: "Operations",
    employeeEmail: "siddharth.v@swift.io",
    contentHtml: `<p>Date: <strong>02 September 2026</strong></p>
<p><strong>OFFICIAL WRITTEN REPRIMAND</strong></p>
<br/>
<p>Dear <strong>Siddharth Verma</strong>,</p>
<p>This written memo is issued in relation to repeated unauthorized absences recorded on 28 Aug, 29 Aug, and 01 Sep without prior shift notification.</p>
<br/>
<p>You are instructed to meet with your reporting manager within 24 hours.</p>`,
    delivery: {
      channel: "both",
      recipientEmail: "siddharth.v@swift.io",
      subject: "Warning Letter — Action Required",
    },
    approvalRequired: true,
    approvalMode: "sequential",
    approvers: [
      { id: "s1", approverRoleOrName: "Operations Manager", order: 1, status: "rejected", actedBy: "Vikram S.", actedAt: "03 Sep 2026, 10:15 AM", comment: "Employee submitted medical certificate for 2 days. Revise days to 1 day only." },
    ],
    currentStepIndex: 0,
    escalation: { enabled: false, delayDays: 2, escalateTo: "HR Head" },
    status: "REJECTED",
    currentVersion: 1,
    versions: [],
    auditLogs: [
      { id: "l1", timestamp: "02 Sep 2026, 5:00 PM", actor: "HR Admin", actorRole: "Admin", action: "Draft Created", details: "Created disciplinary memo", type: "create" },
      { id: "l2", timestamp: "03 Sep 2026, 10:15 AM", actor: "Vikram S.", actorRole: "Operations Manager", action: "Rejected Step 1", details: "Medical certificate provided. Edit needed.", type: "rejection" },
    ],
    createdAt: "2026-09-02T17:00:00.000Z",
    updatedAt: "2026-09-03T10:15:00.000Z",
  },
];

// ============================================================
// Zustand Store for Digital Documents
// ============================================================

interface DigitalDocStoreState {
  documents: DigitalDocument[];
  addDocument: (doc: Omit<DigitalDocument, "id" | "docNumber" | "createdAt" | "updatedAt" | "currentVersion" | "versions" | "auditLogs">) => DigitalDocument;
  updateDocument: (id: string, updates: Partial<DigitalDocument>, changeSummary?: string, author?: string) => void;
  deleteDocument: (id: string) => void;
  sendDocument: (id: string, actorName?: string) => void;
  approveStep: (id: string, stepId: string, actorName: string, comment?: string) => void;
  rejectStep: (id: string, stepId: string, actorName: string, reason: string) => void;
  forwardStep: (id: string, stepId: string, forwardTo: string, actorName: string, comment?: string) => void;
  acknowledgeDocument: (id: string, employeeName?: string) => void;
  createNewVersion: (id: string, updatedContent: string, tableData?: DocCustomTable | null, summary?: string, author?: string) => void;
  resetToDefaults: () => void;
}

export const useDigitalDocStore = create<DigitalDocStoreState>()(
  persist(
    (set, get) => ({
      documents: INITIAL_DIGITAL_DOCS,

      addDocument: (docData) => {
        const now = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const id = `doc-${Date.now()}`;
        const count = get().documents.length + 1;
        const docNumber = `SWIFT-DOC-2026-${String(count).padStart(3, "0")}`;

        const initialLog: AuditLogItem = {
          id: `log-${Date.now()}`,
          timestamp: nowFormatted,
          actor: "HR Admin",
          actorRole: "Admin",
          action: "Document Created",
          details: `Created ${docData.name} for ${docData.employeeName} (${docData.employeeCode})`,
          type: "create",
        };

        const initialVersion: DocumentVersionSnapshot = {
          version: 1,
          createdAt: nowFormatted,
          createdBy: "HR Admin",
          summary: "Initial Document Creation",
          content: docData.contentHtml,
          tableData: docData.tableData,
          delivery: docData.delivery,
          approvalMode: docData.approvalMode,
          approvers: docData.approvers,
        };

        const newDoc: DigitalDocument = {
          ...docData,
          id,
          docNumber,
          createdAt: now,
          updatedAt: now,
          currentVersion: 1,
          versions: [initialVersion],
          auditLogs: [initialLog],
        };

        set((state) => ({
          documents: [newDoc, ...state.documents],
        }));

        return newDoc;
      },

      updateDocument: (id, updates, changeSummary, author) => {
        const now = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        set((state) => ({
          documents: state.documents.map((d) => {
            if (d.id !== id) return d;
            const newLogs = [...d.auditLogs];
            if (changeSummary) {
              newLogs.push({
                id: `log-${Date.now()}`,
                timestamp: nowFormatted,
                actor: author || "HR Admin",
                actorRole: "HR Admin",
                action: "Document Updated",
                details: changeSummary,
                type: "update",
              });
            }
            return {
              ...d,
              ...updates,
              updatedAt: now,
              auditLogs: newLogs,
            };
          }),
        }));
      },

      deleteDocument: (id) => {
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        }));
      },

      sendDocument: (id, actorName = "HR Admin") => {
        const now = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        set((state) => ({
          documents: state.documents.map((d) => {
            if (d.id !== id) return d;
            const hasApproval = d.approvalRequired && d.approvers.length > 0;
            const newStatus: DigitalDocumentStatus = hasApproval ? "PENDING_APPROVAL" : "SENT";

            const newLogs: AuditLogItem[] = [
              ...d.auditLogs,
              {
                id: `log-${Date.now()}`,
                timestamp: nowFormatted,
                actor: actorName,
                actorRole: "HR Admin",
                action: "Document Sent",
                details: hasApproval
                  ? `Dispatched for ${d.approvalMode} approval to: ${d.approvers.map((a) => a.approverRoleOrName).join(", ")}`
                  : `Dispatched directly via ${d.delivery.channel} to ${d.employeeName}`,
                type: "send",
              },
            ];

            return {
              ...d,
              status: newStatus,
              sentAt: now,
              updatedAt: now,
              auditLogs: newLogs,
            };
          }),
        }));
      },

      approveStep: (id, stepId, actorName, comment) => {
        const now = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        set((state) => ({
          documents: state.documents.map((d) => {
            if (d.id !== id) return d;

            const updatedApprovers = d.approvers.map((s) => {
              if (s.id === stepId) {
                return {
                  ...s,
                  status: "approved" as ApprovalStepStatus,
                  actedBy: actorName,
                  actedAt: nowFormatted,
                  comment: comment || "Approved without comments",
                };
              }
              return s;
            });

            let newStatus: DigitalDocumentStatus = d.status;
            let nextStepIndex = d.currentStepIndex;

            if (d.approvalMode === "any_one") {
              newStatus = "PENDING_EMPLOYEE_ACTION";
            } else if (d.approvalMode === "sequential") {
              const nextIndex = d.approvers.findIndex((a, idx) => idx > d.currentStepIndex && a.status === "pending");
              if (nextIndex === -1) {
                newStatus = "PENDING_EMPLOYEE_ACTION";
              } else {
                nextStepIndex = nextIndex;
                newStatus = "PARTIALLY_APPROVED";
              }
            } else {
              const allDone = updatedApprovers.every((a) => a.status === "approved");
              if (allDone) {
                newStatus = "PENDING_EMPLOYEE_ACTION";
              } else {
                newStatus = "PARTIALLY_APPROVED";
              }
            }

            const stepObj = d.approvers.find((s) => s.id === stepId);
            const newLogs: AuditLogItem[] = [
              ...d.auditLogs,
              {
                id: `log-${Date.now()}`,
                timestamp: nowFormatted,
                actor: actorName,
                actorRole: stepObj?.approverRoleOrName || "Approver",
                action: `${stepObj?.approverRoleOrName || "Step"} Approved`,
                details: comment ? `Remark: "${comment}"` : "Approved step in workflow",
                type: "approval",
              },
            ];

            if (newStatus === "PENDING_EMPLOYEE_ACTION") {
              newLogs.push({
                id: `log-ack-${Date.now()}`,
                timestamp: nowFormatted,
                actor: "SWIFT Delivery Engine",
                actorRole: "System",
                action: "Awaiting Employee Acknowledgement",
                details: `All required approvals completed. Notification dispatched to ${d.employeeName} (${d.employeeEmail})`,
                type: "status",
              });
            }

            return {
              ...d,
              approvers: updatedApprovers,
              currentStepIndex: nextStepIndex,
              status: newStatus,
              updatedAt: now,
              auditLogs: newLogs,
            };
          }),
        }));
      },

      rejectStep: (id, stepId, actorName, reason) => {
        const now = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        set((state) => ({
          documents: state.documents.map((d) => {
            if (d.id !== id) return d;

            const updatedApprovers = d.approvers.map((s) => {
              if (s.id === stepId) {
                return {
                  ...s,
                  status: "rejected" as ApprovalStepStatus,
                  actedBy: actorName,
                  actedAt: nowFormatted,
                  comment: reason,
                };
              }
              return s;
            });

            const stepObj = d.approvers.find((s) => s.id === stepId);
            const newLogs: AuditLogItem[] = [
              ...d.auditLogs,
              {
                id: `log-${Date.now()}`,
                timestamp: nowFormatted,
                actor: actorName,
                actorRole: stepObj?.approverRoleOrName || "Approver",
                action: `${stepObj?.approverRoleOrName || "Step"} Rejected`,
                details: `Reason: ${reason}`,
                type: "rejection",
              },
            ];

            return {
              ...d,
              approvers: updatedApprovers,
              status: "REJECTED",
              updatedAt: now,
              auditLogs: newLogs,
            };
          }),
        }));
      },

      forwardStep: (id, stepId, forwardTo, actorName, comment) => {
        const now = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        set((state) => ({
          documents: state.documents.map((d) => {
            if (d.id !== id) return d;

            const updatedApprovers = d.approvers.map((s) => {
              if (s.id === stepId) {
                return {
                  ...s,
                  status: "forwarded" as ApprovalStepStatus,
                  actedBy: actorName,
                  actedAt: nowFormatted,
                  comment: `Approved and forwarded to ${forwardTo}${comment ? ` (${comment})` : ""}`,
                };
              }
              return s;
            });

            const currentStepIdx = d.approvers.findIndex((a) => a.id === stepId);
            const newStep: ApprovalStepItem = {
              id: `step-${Date.now()}`,
              approverRoleOrName: forwardTo,
              order: (d.approvers[currentStepIdx]?.order || 1) + 1,
              status: "pending",
            };

            const newApproversList = [...updatedApprovers];
            newApproversList.splice(currentStepIdx + 1, 0, newStep);

            const newLogs: AuditLogItem[] = [
              ...d.auditLogs,
              {
                id: `log-${Date.now()}`,
                timestamp: nowFormatted,
                actor: actorName,
                actorRole: "Approver",
                action: "Approved & Forwarded",
                details: `Forwarded to ${forwardTo}. Note: "${comment || "Standard review"}"`,
                type: "approval",
              },
            ];

            return {
              ...d,
              approvers: newApproversList,
              currentStepIndex: currentStepIdx + 1,
              status: "PARTIALLY_APPROVED",
              updatedAt: now,
              auditLogs: newLogs,
            };
          }),
        }));
      },

      acknowledgeDocument: (id, employeeName) => {
        const now = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        set((state) => ({
          documents: state.documents.map((d) => {
            if (d.id !== id) return d;

            const newLogs: AuditLogItem[] = [
              ...d.auditLogs,
              {
                id: `log-${Date.now()}`,
                timestamp: nowFormatted,
                actor: employeeName || d.employeeName,
                actorRole: "Employee",
                action: "Document Digitally Acknowledged",
                details: `Signed & acknowledged via SWIFT portal / app.`,
                type: "ack",
              },
              {
                id: `log-done-${Date.now()}`,
                timestamp: nowFormatted,
                actor: "SWIFT Engine",
                actorRole: "System",
                action: "Workflow Completed",
                details: `Document status transitioned to COMPLETED. Stored in employee vault.`,
                type: "status",
              },
            ];

            return {
              ...d,
              status: "COMPLETED",
              employeeAcknowledgedAt: now,
              completedAt: now,
              updatedAt: now,
              auditLogs: newLogs,
            };
          }),
        }));
      },

      createNewVersion: (id, updatedContent, tableData, summary, author) => {
        const now = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        set((state) => ({
          documents: state.documents.map((d) => {
            if (d.id !== id) return d;

            const nextVer = d.currentVersion + 1;
            const newVersionSnapshot: DocumentVersionSnapshot = {
              version: nextVer,
              createdAt: nowFormatted,
              createdBy: author || "HR Admin",
              summary: summary || `Version ${nextVer} revisions saved`,
              content: updatedContent,
              tableData: tableData ?? d.tableData,
              delivery: d.delivery,
              approvalMode: d.approvalMode,
              approvers: d.approvers,
            };

            const resetApprovers = d.approvers.map((a) => ({
              ...a,
              status: "pending" as ApprovalStepStatus,
              actedBy: undefined,
              actedAt: undefined,
              comment: undefined,
            }));

            const newLogs: AuditLogItem[] = [
              ...d.auditLogs,
              {
                id: `log-${Date.now()}`,
                timestamp: nowFormatted,
                actor: author || "HR Admin",
                actorRole: "HR Admin",
                action: `Created Version v${nextVer}`,
                details: summary || `Updated document content and re-initiated workflow`,
                type: "update",
              },
            ];

            return {
              ...d,
              contentHtml: updatedContent,
              tableData: tableData ?? d.tableData,
              currentVersion: nextVer,
              versions: [newVersionSnapshot, ...d.versions],
              approvers: resetApprovers,
              currentStepIndex: 0,
              status: d.approvalRequired ? "PENDING_APPROVAL" : "SENT",
              updatedAt: now,
              auditLogs: newLogs,
            };
          }),
        }));
      },

      resetToDefaults: () => {
        set({ documents: INITIAL_DIGITAL_DOCS });
      },
    }),
    {
      name: "swift_digital_documents_store_v1",
    }
  )
);
