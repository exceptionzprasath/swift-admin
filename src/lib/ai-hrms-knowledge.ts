// SWIFT AI — Grounded Swift HRMS Application & Corporate IT Knowledge Base
// Provides verified navigation guides, application module workflows,
// and professional corporate IT HR definitions.

export interface KnowledgeEntry {
  id: string;
  category: "navigation" | "general_hr" | "compliance" | "policy";
  questionPatterns: RegExp[];
  title: string;
  responseMarkdown: string;
  routeLink?: string;
}

export const SWIFT_HRMS_KNOWLEDGE: KnowledgeEntry[] = [
  // 1. Navigation: How to apply for leave
  {
    id: "nav-apply-leave",
    category: "navigation",
    questionPatterns: [
      /how\s+(?:do\s+i|can\s+i|to)\s+apply\s+(?:for\s+)?leave/i,
      /where\s+(?:can\s+i|do\s+i)\s+apply\s+(?:for\s+)?leave/i,
      /leave\s+application\s+process/i,
    ],
    title: "How to Apply for Leave in Swift HRMS",
    responseMarkdown: `🌴 **Applying for Leave in Swift HRMS**

You can apply for leave in a few quick steps:
1. Navigate to **Leave Calendar** (\`/admin/leave-calendar\`) from the left sidebar.
2. Click the **"Apply Leave"** button on the top right.
3. Select your **Leave Type** (Casual Leave, Sick Leave, or Earned Leave).
4. Choose the **From Date** and **To Date**.
5. Enter a brief reason for your request.
6. Click **"Submit Request"**.

*Your request will be routed automatically to your reporting manager for approval in **Requests & Approvals** (\`/admin/requests\`).*`,
    routeLink: "/admin/leave-calendar",
  },

  // 2. Navigation: Where can I check attendance
  {
    id: "nav-check-attendance",
    category: "navigation",
    questionPatterns: [
      /where\s+(?:can\s+i|do\s+i)\s+check\s+attendance/i,
      /how\s+(?:do\s+i|can\s+i)\s+view\s+(?:my\s+)?attendance/i,
      /see\s+(?:my\s+)?punch(?:es)?/i,
    ],
    title: "Checking Attendance in Swift HRMS",
    responseMarkdown: `📊 **Checking Attendance Records**

To view live punches, monthly rosters, and attendance history:
1. Open **Attendance** (\`/admin/attendance\`) from the sidebar.
2. View **Live Today Roster** to inspect your check-in time, check-out time, and punctuality status.
3. Switch to **Monthly Register** to see total working days, present days, and attendance percentage.
4. Biometric terminal punches synchronize in real time with facial recognition and geofence verification.`,
    routeLink: "/admin/attendance",
  },

  // 3. Navigation: How a manager approves leave
  {
    id: "nav-manager-approve",
    category: "navigation",
    questionPatterns: [
      /how\s+(?:can\s+a\s+manager|do\s+i)\s+approve\s+leave/i,
      /where\s+(?:can\s+a\s+manager|do\s+i)\s+approve\s+(?:requests|leave)/i,
      /manager\s+approval\s+process/i,
    ],
    title: "Manager Approval Workflow",
    responseMarkdown: `✅ **Manager Approval Workflow**

Managers can review and act on pending requests:
1. Go to **Requests & Approvals** (\`/admin/requests\`) from the navigation menu.
2. Review the pending inbox for your direct reports (Leave, Attendance Regularization, Comp-off, Shift Swap).
3. Click on the request card to inspect dates, reasons, and team availability.
4. Click **"Approve"** or **"Reject"** (with optional remarks).
5. The employee is instantly notified through their portal and email.`,
    routeLink: "/admin/requests",
  },

  // 4. Navigation: Where can HR see employee details
  {
    id: "nav-hr-employee-details",
    category: "navigation",
    questionPatterns: [
      /where\s+can\s+hr\s+see\s+employee\s+details/i,
      /where\s+to\s+find\s+employee\s+list/i,
      /open\s+employee\s+directory/i,
    ],
    title: "Employee Directory & Profiles",
    responseMarkdown: `👥 **Employee Directory & Profiles**

Authorized HR and Admins can access complete staff profiles:
1. Open **Employees** (\`/admin/employees\`) from the sidebar.
2. Search staff by Name, Employee ID (EMP code), or Department.
3. Click on any employee row to open their comprehensive 20-step profile (personal data, bank details, PF/ESI, biometric status, and documents).
4. Add new employees via the **"Add Employee"** button or **Bulk Upload (Excel / CSV)**.`,
    routeLink: "/admin/employees",
  },

  // 5. Navigation: How to check shift
  {
    id: "nav-check-shift",
    category: "navigation",
    questionPatterns: [
      /how\s+(?:can\s+i|do\s+i)\s+check\s+(?:my\s+)?shift/i,
      /where\s+(?:is|to\s+see)\s+(?:the\s+)?shift\s+roster/i,
    ],
    title: "Shift Management & Roster",
    responseMarkdown: `⏰ **Viewing Shift Rosters**

1. Go to **Swift Roster** (\`/admin/shift-roster\`).
2. Review the monthly calendar showing assigned shifts (e.g. General Shift: 09:00 AM – 06:00 PM).
3. Inspect grace times (15 minutes standard) and scheduled weekly offs.
4. Managers can reassign shifts or upload bulk shift rosters via Excel/CSV.`,
    routeLink: "/admin/shift-roster",
  },

  // 6. Navigation: How to view reports
  {
    id: "nav-view-reports",
    category: "navigation",
    questionPatterns: [
      /how\s+(?:can\s+i|do\s+i)\s+view\s+reports/i,
      /where\s+(?:are|can\s+i\s+find)\s+reports/i,
      /download\s+(?:official\s+)?reports/i,
    ],
    title: "HRMS Reports & Statutory Exports",
    responseMarkdown: `📊 **Reports & Data Exports**

Swift HRMS offers comprehensive export capabilities:
1. Navigate to **Reports** (\`/admin/reports\`) or **Compliance Docs** (\`/admin/compliance-docs\`).
2. Download **Employee Master Registry** in PDF or Excel format.
3. Export **Monthly Attendance & Punctuality Register**.
4. Generate **Statutory Muster Roll (Form 25)** and Tamil Nadu labor compliance bundles.
5. In any AI Copilot response, click **"Download as PDF format"** or **"Download as Excel sheet"** to export immediately.`,
    routeLink: "/admin/reports",
  },

  // 7. General HR: What is probation period?
  {
    id: "hr-probation",
    category: "general_hr",
    questionPatterns: [
      /what\s+is\s+(?:a\s+)?probation(?:\s+period)?/i,
      /how\s+does\s+probation\s+work/i,
    ],
    title: "Probation Period in Corporate HR",
    responseMarkdown: `ℹ️ **Probation Period**

A **probation period** is an initial trial period (typically 3 to 6 months) during which a new hire's work performance, cultural fit, punctuality, and skills are evaluated before confirmation as a permanent employee.

**Key Aspects:**
• **Evaluation:** Regular manager check-ins and performance tracking.
• **Notice Period:** Usually shorter during probation (e.g., 7 to 15 days).
• **Confirmation:** Upon successful completion, an official **Confirmation Letter** is issued in **Documents** (\`/admin/documents\`).`,
  },

  // 8. General HR: What is notice period?
  {
    id: "hr-notice-period",
    category: "general_hr",
    questionPatterns: [
      /what\s+is\s+(?:a\s+)?notice\s+period/i,
      /how\s+long\s+is\s+notice\s+period/i,
    ],
    title: "Notice Period Guidelines",
    responseMarkdown: `ℹ️ **Notice Period**

A **notice period** is the time an employee or employer must give before terminating employment.

**Standard Guidelines:**
• **Confirmed Staff:** Standard notice period is **30 days** (or 60-90 days for specialized/leadership roles).
• **Probationary Staff:** Shorter period (typically 7 to 15 days).
• **Handover & Knowledge Transfer (KT):** The outgoing employee transitions duties and returns company assets.
• **Full & Final Settlement (FnF):** Processed upon clearance and exit interview.`,
  },

  // 9. General HR: What is performance appraisal?
  {
    id: "hr-appraisal",
    category: "general_hr",
    questionPatterns: [
      /what\s+is\s+(?:a\s+)?(?:performance\s+)?appraisal/i,
      /what\s+is\s+an\s+appraisal\s+cycle/i,
    ],
    title: "Performance Appraisal & Review Cycle",
    responseMarkdown: `🏆 **Performance Appraisal & Cycles**

A **performance appraisal** is a structured review where an employee's job performance, achievements, and contributions are formally evaluated against goals and KPIs.

**Typical Process:**
1. **Self-Assessment:** Employee reviews their annual accomplishments.
2. **Manager Review:** Direct manager evaluates competencies and results.
3. **Calibration & Normalization:** HR aligns scores across departments.
4. **Compensation Adjustment:** Promotion and salary revision letters generated in **Salary Revision** (\`/admin/salary-revision\`).`,
  },

  // 10. General HR: What is attendance regularization?
  {
    id: "hr-regularization",
    category: "general_hr",
    questionPatterns: [
      /what\s+is\s+(?:attendance\s+)?regularization/i,
      /forgot\s+to\s+punch/i,
      /attendance\s+is\s+incorrect/i,
    ],
    title: "Attendance Regularization",
    responseMarkdown: `⏱️ **Attendance Regularization**

**Attendance Regularization** allows an employee to correct a missing punch or attendance discrepancy resulting from:
• Forgotten check-in / check-out punch
• Client visits, outdoor duties, or official travel
• Technical biometric terminal / network issues

**How to Request Regularization:**
1. Submit an Attendance Regularization request specifying the actual punch time and reason.
2. Your reporting manager verifies and approves the request in **Requests & Approvals**.
3. Once approved, the attendance record updates automatically to "Present".`,
  },

  // 11. General HR: What is EPF and ESI?
  {
    id: "hr-epf-esi",
    category: "compliance",
    questionPatterns: [
      /what\s+is\s+(?:epf|pf|provident\s+fund)/i,
      /what\s+is\s+esi/i,
      /statutory\s+deductions/i,
    ],
    title: "Statutory Deductions (EPF & ESI)",
    responseMarkdown: `💼 **Statutory Deductions in Indian Payroll**

• **Employees' Provident Fund (EPF):**
  - **Employee Contribution:** 12% of Basic Salary (up to ₹15,000 statutory wage ceiling).
  - **Employer Contribution:** 12% (divided into EPF 3.67% + EPS Pension 8.33%).
  - Long-term retirement savings scheme managed under EPFO.

• **Employee State Insurance (ESI):**
  - Mandatory for employees with Gross Wages up to ₹21,000/month.
  - **Employee Contribution:** 0.75% of Gross Wages.
  - **Employer Contribution:** 3.25% of Gross Wages.
  - Provides comprehensive medical care and sickness/maternity cash benefits.`,
  },
];

export function findKnowledgeMatch(queryText: string): KnowledgeEntry | null {
  const clean = queryText.trim().toLowerCase();
  for (const entry of SWIFT_HRMS_KNOWLEDGE) {
    for (const pattern of entry.questionPatterns) {
      if (pattern.test(clean)) {
        return entry;
      }
    }
  }
  return null;
}
