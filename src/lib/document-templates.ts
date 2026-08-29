import { type Employee, type Company } from "@/lib/store";

export type PlaceholderVariable = {
  key: string;
  label: string;
  category: "employee" | "compensation" | "company" | "dates" | "signatory";
  sample: string;
};

export const PLACEHOLDER_VARIABLES: PlaceholderVariable[] = [
  { key: "{{employee_name}}", label: "Employee Name", category: "employee", sample: "Aditya Sharma" },
  { key: "{{employee_code}}", label: "Employee Code", category: "employee", sample: "SW-1002" },
  { key: "{{designation}}", label: "Designation / Role", category: "employee", sample: "Senior Software Engineer" },
  { key: "{{department}}", label: "Department", category: "employee", sample: "Engineering & Technology" },
  { key: "{{branch_name}}", label: "Branch / Work Location", category: "employee", sample: "Head Office (Bangalore)" },
  { key: "{{manager_name}}", label: "Reporting Manager", category: "employee", sample: "Rajesh Varma (VP Engineering)" },
  
  { key: "{{ctc_annual}}", label: "Annual CTC (₹)", category: "compensation", sample: "₹12,00,000" },
  { key: "{{ctc_monthly}}", label: "Monthly Gross (₹)", category: "compensation", sample: "₹1,00,000" },
  { key: "{{revised_ctc}}", label: "Revised CTC (₹)", category: "compensation", sample: "₹14,50,000" },
  { key: "{{increment_pct}}", label: "Increment Pct (%)", category: "compensation", sample: "15%" },

  { key: "{{joining_date}}", label: "Date of Joining", category: "dates", sample: "01-Jul-2024" },
  { key: "{{current_date}}", label: "Current Date", category: "dates", sample: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
  { key: "{{probation_months}}", label: "Probation Tenure", category: "dates", sample: "6 Months" },
  { key: "{{relieving_date}}", label: "Relieving Date", category: "dates", sample: "31-Aug-2026" },
  { key: "{{last_working_day}}", label: "Last Working Day", category: "dates", sample: "31-Aug-2026" },

  { key: "{{company_name}}", label: "Company Name", category: "company", sample: "Swift Technologies Pvt Ltd" },
  { key: "{{company_address}}", label: "Company Address", category: "company", sample: "Tech Hub Park, Erode, Tamil Nadu 638001" },

  { key: "{{authorized_signatory_name}}", label: "Signatory Name", category: "signatory", sample: "Dr. K. Anand" },
  { key: "{{authorized_signatory_designation}}", label: "Signatory Role", category: "signatory", sample: "Head of Human Resources & Operations" },
];

export const DEFAULT_DOCUMENT_TEMPLATES: Record<string, { subject: string; content: string }> = {
  "doc-offer": {
    subject: "Employment Offer Letter — {{employee_name}}",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Candidate Code: {{employee_code}}

Dear {{employee_name}},

Subject: Offer of Employment for the position of {{designation}}

We are pleased to offer you the position of {{designation}} in the {{department}} Department at {{company_name}}.

Key Terms of Offer:
1. Position: {{designation}}
2. Department: {{department}}
3. Location: {{branch_name}}
4. Date of Joining: {{joining_date}}
5. Annual Total Cost to Company (CTC): {{ctc_annual}} (Fixed Gross Monthly: {{ctc_monthly}})
6. Reporting Authority: {{manager_name}}
7. Probation Period: {{probation_months}} from the date of joining.

Your formal Appointment Letter containing detailed terms and conditions of employment, benefits, and workplace code of conduct will be issued on the day of joining upon submission of the required verification documents.

Please sign and return the duplicate copy of this letter as a token of your formal acceptance of this offer.

We welcome you to {{company_name}} and look forward to a rewarding professional journey together.

Sincerely,
For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-appointment": {
    subject: "Letter of Appointment — {{employee_name}} ({{employee_code}})",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}
Location: {{branch_name}}

Dear {{employee_name}},

Subject: Letter of Appointment as {{designation}}

With reference to your application, interview, and subsequent offer acceptance, management is pleased to appoint you as {{designation}} in {{company_name}}, effective from your date of joining on {{joining_date}}.

1. Designation & Duties:
You shall perform duties associated with the role of {{designation}} in the {{department}} Department, reporting directly to {{manager_name}}.

2. Remuneration:
Your total annual compensation package (CTC) is fixed at {{ctc_annual}} per annum, payable on a monthly basis in accordance with standard company payroll practices.

3. Probation & Confirmation:
You will be on probation for a period of {{probation_months}} from {{joining_date}}. Based on your performance and conduct, your services will be confirmed in writing.

4. Confidentiality & Code of Conduct:
You shall maintain strict confidentiality regarding all company intellectual property, customer records, and trade secrets during and after your tenure.

We wish you all the best and trust you will make meaningful contributions toward the growth of {{company_name}}.

Sincerely,
For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-relieve": {
    subject: "Relieving Letter & Service Clearance — {{employee_name}} ({{employee_code}})",
    content: `Date: {{current_date}}

To Whomsoever It May Concern

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) was employed with {{company_name}} as {{designation}} in the {{department}} Department from {{joining_date}} to {{relieving_date}}.

{{employee_name}} has been relieved from duties at the close of business hours on {{relieving_date}} following formal handover of all company assets and clearance of departmental dues.

During their tenure, we found {{employee_name}} to be sincere, diligent, and committed in the discharge of their duties.

We thank {{employee_name}} for their valuable contributions to {{company_name}} and wish them great success in all future professional endeavors.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}
{{company_address}}`,
  },

  "doc-exp": {
    subject: "Experience Certificate — {{employee_name}} ({{employee_code}})",
    content: `Date: {{current_date}}

EXPERIENCE CERTIFICATE

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) has served as a full-time employee with {{company_name}} from {{joining_date}} to {{relieving_date}}.

During their service tenure, {{employee_name}} held the position of {{designation}} in the {{department}} Department.

Their conduct, character, and professional competence during the tenure of service with our organization were found to be satisfactory and commendable.

This certificate is issued at the request of the employee for whatever purpose it may serve.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-salary-cert": {
    subject: "Salary Certificate & Income Verification — {{employee_name}}",
    content: `Date: {{current_date}}

TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) is currently employed as a full-time employee with {{company_name}} in the capacity of {{designation}} within the {{department}} Department since {{joining_date}}.

As per our payroll records, their present compensation structure is as follows:
- Gross Monthly Emoluments: {{ctc_monthly}}
- Total Annual Cost to Company (CTC): {{ctc_annual}}

This certificate is issued upon the specific request of {{employee_name}} for banking, visa, or official verification purposes without any financial liability on part of the company.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}
{{company_address}}`,
  },

  "doc-prob-confirm": {
    subject: "Probation Confirmation Letter — {{employee_name}}",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}
Designation: {{designation}}

Dear {{employee_name}},

Subject: Confirmation of Employment Services

Consequent to the successful completion of your initial probation period and positive appraisal of your performance, we have the pleasure of confirming your appointment as a permanent employee in the position of {{designation}} at {{company_name}}, effective from {{current_date}}.

All other terms and conditions of your employment as outlined in your original Appointment Letter shall remain in full force and effect.

We appreciate your dedicated efforts and look forward to your continued dedication and commitment to the success of our organization.

Congratulations and best wishes!

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-prob-ext": {
    subject: "Probation Period Extension Notice — {{employee_name}}",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}

Dear {{employee_name}},

Subject: Extension of Probation Period

This is with reference to your appointment as {{designation}} in the {{department}} Department at {{company_name}} and your initial probation period.

Upon formal review of your performance during the initial tenure, management has determined that your performance requires further observation and improvement in designated key responsibility areas.

Accordingly, management has decided to extend your probation period for an additional tenure of {{probation_months}} effective from {{current_date}}.

Your reporting manager, {{manager_name}}, will provide ongoing feedback to assist you in meeting the requisite performance expectations.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-transfer": {
    subject: "Internal Transfer / Relocation Order — {{employee_name}}",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}
Designation: {{designation}}

Dear {{employee_name}},

Subject: Internal Transfer Order

In accordance with business requirements and operational realignment, management is pleased to transfer you to the {{branch_name}} branch, effective from {{current_date}}.

You shall continue in your current designation as {{designation}} under the {{department}} Department and report to {{manager_name}}.

All existing terms and conditions of your employment contract remain unchanged. Please coordinate with the HR and Administrative department for seamless relocation handover.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-promotion": {
    subject: "Promotion & Designation Advancement Letter — {{employee_name}}",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}

Dear {{employee_name}},

Subject: Promotion to {{designation}}

In recognition of your exceptional performance, dedication, and leadership contributions, management is pleased to promote you to the position of {{designation}} in the {{department}} Department, effective {{current_date}}.

Along with this promotion:
- Revised Annual CTC: {{revised_ctc}} (Increment: {{increment_pct}})
- Reporting Authority: {{manager_name}}

We are confident that you will continue to deliver excellence and lead your team to greater milestones.

Congratulations on this well-deserved achievement!

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-increment": {
    subject: "Annual Compensation Revision / Increment Letter — {{employee_name}}",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}
Designation: {{designation}}

Dear {{employee_name}},

Subject: Annual Compensation Revision

We are pleased to inform you that following your annual performance review, your compensation has been revised effective {{current_date}}.

Summary of Compensation Revision:
- Designation: {{designation}}
- Previous Annual CTC: {{ctc_annual}}
- Revised Annual CTC: {{revised_ctc}}
- Increment Percentage: {{increment_pct}}

We appreciate your sincere efforts and valuable contributions toward {{company_name}} during the past year and look forward to your continued success.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-show-cause": {
    subject: "Show Cause Notice — Ref: Policy & Conduct Compliance",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}
Designation: {{designation}}
Department: {{department}}

SHOW CAUSE NOTICE

It has been brought to the attention of management that there has been an alleged lapse / violation in company workplace policy, discipline, or punctuality standards.

You are hereby requested to submit your written explanation detailing why appropriate disciplinary action should not be initiated against you in respect of the aforesaid matter.

Please submit your response to the undersigned within 48 hours of receipt of this notice. Failure to respond within the stipulated time will lead management to conclude that you have no explanation to offer, and appropriate action will proceed.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-warning": {
    subject: "Official Written Warning Notice — {{employee_name}}",
    content: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}
Designation: {{designation}}

OFFICIAL WRITTEN WARNING

This letter serves as a formal written warning regarding failure to adhere to the established policies and code of conduct of {{company_name}}.

Management expects all employees to uphold high standards of integrity, punctuality, and professional workplace conduct.

You are strongly advised to rectify the situation immediately. Please note that recurrence of similar lapses in the future will result in strict disciplinary proceedings up to and including termination of employment.

A copy of this letter is being placed in your official personnel file.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-emp-verif": {
    subject: "Employment Verification Confirmation — {{employee_name}}",
    content: `Date: {{current_date}}

TO WHOMSOEVER IT MAY CONCERN

This is to confirm that {{employee_name}} (Employee Code: {{employee_code}}) is employed with {{company_name}} since {{joining_date}}.

Employment Verification Details:
- Full Name: {{employee_name}}
- Designation: {{designation}}
- Department: {{department}}
- Work Branch: {{branch_name}}
- Employment Status: Active / Full-Time Regular
- Date of Joining: {{joining_date}}

This verification letter is issued for official background screening and credentials verification purposes.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}
{{company_address}}`,
  },

  "doc-joining": {
    subject: "Employee Joining Confirmation & Intake — {{employee_name}}",
    content: `Date: {{current_date}}

JOINING INTAKE CONFIRMATION

This document acknowledges that {{employee_name}} (Employee Code: {{employee_code}}) has formally reported to duty on {{joining_date}} at {{branch_name}} for the position of {{designation}} under the {{department}} Department.

Reporting Authority: {{manager_name}}
Annual Compensation: {{ctc_annual}}

All mandatory onboarding forms, credentials verification, and initial profile entries have been registered with Human Resources.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-nda": {
    subject: "Non-Disclosure & Confidentiality Agreement — {{employee_name}}",
    content: `NON-DISCLOSURE & PROPRIETARY INFORMATION AGREEMENT

Date: {{current_date}}

Between:
{{company_name}}, having its principal place of business at {{company_address}} (the "Company")

And:
{{employee_name}} (Employee Code: {{employee_code}}), residing as per company personnel records (the "Employee").

1. Confidential Information:
The Employee agrees that all technical data, customer lists, software code, financials, and trade secrets disclosed by {{company_name}} during their employment as {{designation}} are the exclusive intellectual property of the Company.

2. Non-Disclosure Obligations:
The Employee shall protect the confidentiality of the Proprietary Information and shall not disclose it to any unauthorized third party without prior written consent from {{company_name}}.

In Witness Whereof, the parties have executed this Agreement on {{current_date}}.

Employee Signature: _______________________
Name: {{employee_name}} ({{employee_code}})

Authorized Signatory for {{company_name}}:
{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },

  "doc-code-conduct": {
    subject: "Employee Workplace Ethics & Code of Conduct Acknowledgment",
    content: `EMPLOYEE CODE OF CONDUCT & WORKPLACE ETHICS ACKNOWLEDGMENT

Date: {{current_date}}

I, {{employee_name}} (Employee Code: {{employee_code}}), hereby acknowledge that I have received, read, and understood the Employee Code of Conduct and Workplace Ethics Policy of {{company_name}}.

As a {{designation}} in the {{department}} Department, I commit to:
1. Conducting myself with the highest standards of integrity, respect, and professional behavior.
2. Adhering strictly to anti-harassment, data privacy, and workplace safety guidelines.
3. Reporting to duty punctually at {{branch_name}} under the supervision of {{manager_name}}.

Employee Signature: _______________________
Name: {{employee_name}} ({{employee_code}})
Date: {{current_date}}

Approved & Registered by HR:
{{authorized_signatory_name}}
{{authorized_signatory_designation}}
{{company_name}}`,
  },

  "doc-asset-handover": {
    subject: "Company Asset & Equipment Handover Form — {{employee_name}}",
    content: `COMPANY ASSET HANDOVER ACKNOWLEDGMENT FORM

Date: {{current_date}}

Employee Details:
- Name: {{employee_name}}
- Employee Code: {{employee_code}}
- Designation: {{designation}}
- Department: {{department}}
- Work Location: {{branch_name}}

I hereby acknowledge receipt of company-issued equipment (laptop, accessories, security access card) in good working condition for the sole purpose of official duties with {{company_name}}.

I understand that these assets remain the exclusive property of {{company_name}} and must be returned in good condition upon separation or upon request.

Employee Signature: _______________________
Name: {{employee_name}}
Date: {{current_date}}

Issued By (IT / Asset Custodian):
{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
};

/**
 * Replaces all {{variable_placeholders}} in template text with real employee & company data
 */
export function substitutePlaceholders(
  templateText: string,
  employee: Employee | null,
  company: Company | null,
  customOverrides: Record<string, string> = {}
): string {
  if (!templateText) return "";

  const empName = employee?.name || "Aditya Sharma";
  const empCode = employee?.empCode || "SW-1002";
  const desig = employee?.designation || "Staff Member";
  const dept = employee?.department || "General";
  const branchName = company?.branches?.find((b) => b.id === employee?.branchId)?.name || company?.branches?.[0]?.name || "Head Office";
  const doj = employee?.doj || (employee as any)?.joiningDate || "01-Jul-2024";
  const managerName = employee?.reportingManager || "Reporting Manager";
  const annualCtcNum = (employee?.basic || employee?.fixedSalary || 45000) * 12;
  const monthlyCtcNum = employee?.basic || employee?.fixedSalary || 45000;
  const annualCtcStr = "₹" + annualCtcNum.toLocaleString("en-IN");
  const monthlyCtcStr = "₹" + monthlyCtcNum.toLocaleString("en-IN");
  const compName = company?.legalName || company?.name || "SWIFT Technologies Pvt Ltd";
  const compAddress = company?.address || "Tech Hub, Tamil Nadu, India";
  const todayStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const mapping: Record<string, string> = {
    "{{employee_name}}": empName,
    "{{employee_code}}": empCode,
    "{{designation}}": desig,
    "{{department}}": dept,
    "{{branch_name}}": branchName,
    "{{joining_date}}": doj,
    "{{manager_name}}": managerName,
    "{{ctc_annual}}": annualCtcStr,
    "{{ctc_monthly}}": monthlyCtcStr,
    "{{company_name}}": compName,
    "{{company_address}}": compAddress,
    "{{current_date}}": todayStr,
    "{{probation_months}}": "6 Months",
    "{{relieving_date}}": todayStr,
    "{{last_working_day}}": todayStr,
    "{{revised_ctc}}": "₹" + Math.round(annualCtcNum * 1.15).toLocaleString("en-IN"),
    "{{increment_pct}}": "15%",
    "{{authorized_signatory_name}}": "Dr. K. Anand",
    "{{authorized_signatory_designation}}": "Head of Human Resources & Operations",
    ...customOverrides,
  };

  let result = templateText;
  for (const [placeholder, val] of Object.entries(mapping)) {
    result = result.split(placeholder).join(val);
  }
  return result;
}
