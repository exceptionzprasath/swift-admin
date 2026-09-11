// SWIFT AI — Intent Detection & Natural Language Understanding Engine
// Classifies query intent across 30 enterprise HRMS categories,
// normalizes natural dates, and extracts key entities (employees, departments, metrics).

export type AIIntent =
  | "EMPLOYEE_INFORMATION"
  | "ATTENDANCE"
  | "DAILY_ATTENDANCE_BASIC"
  | "DAILY_ATTENDANCE_DETAILED"
  | "PUNCH_LOG"
  | "ATTENDANCE_SUMMARY"
  | "LATE_COMING"
  | "EARLY_GOING"
  | "OVERTIME_REGISTER"
  | "MISSED_PUNCH"
  | "WEEKLY_OFF"
  | "HOLIDAY_PRESENT"
  | "MONTHLY_MATRIX"
  | "MASTER_ROLL"
  | "MONTHLY_WORKED_DURATION"
  | "MONTHLY_OT_SUMMARY"
  | "OUTDOOR_DUTY"
  | "ANALYTICS"
  | "DEPARTMENT_ATTENDANCE"
  | "ABSENT_EMPLOYEES"
  | "PRESENT_EMPLOYEES"
  | "LEAVE"
  | "SHIFT"
  | "PAYROLL"
  | "SALARY"
  | "EXPENSE"
  | "PERFORMANCE"
  | "DOCUMENT"
  | "RECRUITMENT"
  | "ONBOARDING"
  | "OFFBOARDING"
  | "APPROVAL"
  | "MANAGER"
  | "TEAM"
  | "DEPARTMENT"
  | "COMPANY"
  | "POLICY"
  | "HOLIDAY"
  | "REPORT"
  | "DASHBOARD"
  | "WORKFLOW"
  | "HR_PROCESS"
  | "IT_WORKPLACE"
  | "GENERAL_HR"
  | "GENERAL_COMPANY"
  | "SYSTEM_USAGE"
  | "SECURITY"
  | "SENSITIVE_INFORMATION"
  | "UNKNOWN";

export interface ExtractedEntities {
  employeeName?: string;
  employeeId?: string;
  department?: string;
  dateStr?: string;
  relativePeriod?: "today" | "yesterday" | "tomorrow" | "this_month" | "last_month" | "this_year";
  metric?: "count" | "list" | "rate" | "balance" | "details" | "comparison" | "status";
  isFollowUp?: boolean;
}

export interface IntentDetectionResult {
  intent: AIIntent;
  confidence: number;
  entities: ExtractedEntities;
  rawQuery: string;
}

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves natural date expressions to concrete ISO dates (YYYY-MM-DD)
 */
export function resolveNaturalDate(text: string, baseDate: Date = new Date()): { dateStr: string; period?: ExtractedEntities["relativePeriod"] } {
  const lower = text.toLowerCase();
  const d = new Date(baseDate);

  if (/\byesterday\b/.test(lower)) {
    d.setDate(d.getDate() - 1);
    return { dateStr: d.toISOString().slice(0, 10), period: "yesterday" };
  }
  if (/\btomorrow\b/.test(lower)) {
    d.setDate(d.getDate() + 1);
    return { dateStr: d.toISOString().slice(0, 10), period: "tomorrow" };
  }
  if (/\blast\s+month\b/.test(lower)) {
    d.setMonth(d.getMonth() - 1);
    return { dateStr: d.toISOString().slice(0, 7), period: "last_month" };
  }
  if (/\bthis\s+month\b/.test(lower)) {
    return { dateStr: d.toISOString().slice(0, 7), period: "this_month" };
  }
  if (/\blast\s+monday\b/.test(lower)) {
    const day = d.getDay();
    const diff = day >= 1 ? day + 6 : 6;
    d.setDate(d.getDate() - diff);
    return { dateStr: d.toISOString().slice(0, 10), period: "yesterday" };
  }

  // Default: today
  return { dateStr: baseDate.toISOString().slice(0, 10), period: "today" };
}

export class AIIntentDetector {
  /**
   * Evaluates query and determines intent, entities, and parameters.
   */
  static detect(
    queryText: string,
    activeEntities: ExtractedEntities = {}
  ): IntentDetectionResult {
    const raw = queryText.trim();
    const q = normalize(raw);
    const dateResolution = resolveNaturalDate(raw);

    const entities: ExtractedEntities = {
      dateStr: dateResolution.dateStr,
      relativePeriod: dateResolution.period,
      ...activeEntities,
    };

    // Metric type detection
    if (/\b(how\s+many|count|total|number\s+of)\b/i.test(q)) {
      entities.metric = "count";
    } else if (/\b(who|list|names|show|give\s+me)\b/i.test(q)) {
      entities.metric = "list";
    } else if (/\b(percentage|rate|ratio)\b/i.test(q)) {
      entities.metric = "rate";
    } else if (/\b(balance|remaining|left)\b/i.test(q)) {
      entities.metric = "balance";
    } else {
      entities.metric = "details";
    }

    // Follow-up question patterns
    const isFollowUp =
      /^(what\s+about|and|how\s+about|who\s+are\s+they|which\s+ones|how\s+many\s+from|from\s+)/i.test(
        raw
      ) || q.length < 25;
    entities.isFollowUp = isFollowUp;

    // Extract department if present
    const deptMatches = q.match(/\b(tech|development|engineering|hr|human\s+resources|sales|marketing|accounts|finance|operations)\b/i);
    if (deptMatches) {
      entities.department = deptMatches[1];
    }

    // 1. SENSITIVE / SECURITY
    if (
      /(api[_\s-]?key|secret[_\s-]?key|database[_\s-]?password|password|jwt|\.env|process\.env|source\s*code\s*secret|system\s*prompt|developer\s*instruction|ignore\s*instruction)/i.test(
        raw
      )
    ) {
      return { intent: "SECURITY", confidence: 0.99, entities, rawQuery: raw };
    }

    // 2. HOLIDAYS
    if (/\b(holiday|holidays|festival|national\s+holiday|company\s+off|calendar\s+off)\b/i.test(q)) {
      return { intent: "HOLIDAY", confidence: 0.95, entities, rawQuery: raw };
    }

    // 3. LEAVE & OUTDOOR DUTY
    if (/\b(outdoor\s*duty|od\s*entries|od\s*status|od\s*request)\b/i.test(q)) {
      return { intent: "OUTDOOR_DUTY", confidence: 0.96, entities, rawQuery: raw };
    }
    if (
      /\b(leave|leaves|casual\s+leave|sick\s+leave|earned\s+leave|vacation|apply\s+for\s+leave|leave\s+balance|leave\s+history|leave\s+request|cl|sl|pl|lop)\b/i.test(
        q
      )
    ) {
      return { intent: "LEAVE", confidence: 0.95, entities, rawQuery: raw };
    }

    // 4. ANALYTICS & COMPARISONS
    if (/\b(attendance\s*analytics|analytics|highest\s*overtime|highest\s*absenteeism|most\s*late|compare\s*attendance|attendance\s*trends?|best\s*attendance)\b/i.test(q)) {
      return { intent: "ANALYTICS", confidence: 0.96, entities, rawQuery: raw };
    }

    // 5. SPECIALIZED ATTENDANCE REPORTS
    if (/\b(monthly\s*attendance\s*matrix|attendance\s*matrix|attendance\s*calendar)\b/i.test(q)) {
      return { intent: "MONTHLY_MATRIX", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(master\s*roll|monthly\s*master\s*roll|muster\s*roll)\b/i.test(q)) {
      return { intent: "MASTER_ROLL", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(monthly\s*worked\s*duration|how\s+many\s+hours\s+did\s+employees\s+work|working\s*duration)\b/i.test(q)) {
      return { intent: "MONTHLY_WORKED_DURATION", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(monthly\s*ot\s*summary|monthly\s*overtime\s*summary)\b/i.test(q)) {
      return { intent: "MONTHLY_OT_SUMMARY", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(punch\s*log|in\s*out\s*punch|punch\s*records?|raw\s*punch|all\s*punches|punch\s*details?)\b/i.test(q)) {
      return { intent: "PUNCH_LOG", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(attendance\s*summary|daily\s*attendance\s*summary|attendance\s*status\s*today|today'?s\s*attendance\s*status)\b/i.test(q)) {
      return { intent: "ATTENDANCE_SUMMARY", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(who\s+came\s+late|late\s+coming|late\s+employees|who\s+arrived\s+late|late\s+arrivals?)\b/i.test(q)) {
      return { intent: "LATE_COMING", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(who\s+left\s+early|early\s+going|early\s+departure|early\s+leaving)\b/i.test(q)) {
      return { intent: "EARLY_GOING", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(overtime\s*register|overtime\s*report|ot\s*register|who\s+worked\s+overtime|overtime\s*duration|overtime\s*records?)\b/i.test(q)) {
      return { intent: "OVERTIME_REGISTER", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(missed\s*punch|who\s+has\s+missed\s*punch|missing\s*punch|no\s*checkout)\b/i.test(q)) {
      return { intent: "MISSED_PUNCH", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(weekly\s*off|who\s+has\s+weekly\s*off)\b/i.test(q)) {
      return { intent: "WEEKLY_OFF", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(holiday\s*present|who\s+worked\s+on\s+(?:the\s+)?holiday)\b/i.test(q)) {
      return { intent: "HOLIDAY_PRESENT", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(department-?wise\s+attendance|company\s+attendance|attendance\s+by\s+department)\b/i.test(q)) {
      return { intent: "DEPARTMENT_ATTENDANCE", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(who\s+is\s+absent|who\s+didn'?t\s+come|absent\s+employees|today'?s\s+absentees|absent\s+list)\b/i.test(q)) {
      return { intent: "ABSENT_EMPLOYEES", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(who\s+is\s+present|present\s+employees|who\s+came\s+today)\b/i.test(q)) {
      return { intent: "PRESENT_EMPLOYEES", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(detailed\s+attendance|detailed\s+daily\s+attendance|daily\s+attendance\s+detailed)\b/i.test(q)) {
      return { intent: "DAILY_ATTENDANCE_DETAILED", confidence: 0.96, entities, rawQuery: raw };
    }
    if (/\b(daily\s+attendance|daily\s+attendance\s+basic|today'?s\s+attendance)\b/i.test(q)) {
      return { intent: "DAILY_ATTENDANCE_BASIC", confidence: 0.96, entities, rawQuery: raw };
    }

    // 6. GENERAL ATTENDANCE & PUNCTUALITY
    if (
      /\b(attendance|absent|present|late|check\s*in|punch|punched|working\s+hours|overtime|ot\b|roster|who\s+came|who\s+didn'?t\s+come|who\s+is\s+working)\b/i.test(
        q
      )
    ) {
      return { intent: "ATTENDANCE", confidence: 0.95, entities, rawQuery: raw };
    }

    // 5. SHIFT
    if (/\b(shift|timing|work\s+hours|grace\s+time|general\s+shift|morning\s+shift|night\s+shift|shift\s+roster)\b/i.test(q)) {
      return { intent: "SHIFT", confidence: 0.92, entities, rawQuery: raw };
    }

    // 6. SALARY / CTC / PAYROLL
    if (
      /\b(payroll|salary|ctc|basic\s+pay|monthly\s+ctc|earnings|deductions|payslip|pf\s+contribution|esi\s+contribution|net\s+pay|gross\s+pay|disbursement|salary\s+slip)\b/i.test(
        q
      )
    ) {
      return { intent: "PAYROLL", confidence: 0.95, entities, rawQuery: raw };
    }

    // 7. APPROVALS / WORKFLOW
    if (/\b(pending\s+approval|approval|approvals|approve|reject|request|requests\s+pending|workflow)\b/i.test(q)) {
      return { intent: "APPROVAL", confidence: 0.92, entities, rawQuery: raw };
    }

    // 8. TEAM / MANAGER
    if (/\b(my\s+team|team'?s|reporting\s+to|manager|who\s+reports\s+to\s+me|direct\s+reports)\b/i.test(q)) {
      return { intent: "TEAM", confidence: 0.93, entities, rawQuery: raw };
    }

    // 9. DEPARTMENT
    if (/\b(department|dept|headcount\s+by\s+department|engineering\s+team|sales\s+team|hr\s+team)\b/i.test(q)) {
      return { intent: "DEPARTMENT", confidence: 0.9, entities, rawQuery: raw };
    }

    // 10. ONBOARDING & LIFECYCLE
    if (/\b(onboarding|joined\s+this\s+month|new\s+joinee|new\s+hire|probation|confirmation|lifecycle)\b/i.test(q)) {
      return { intent: "ONBOARDING", confidence: 0.92, entities, rawQuery: raw };
    }

    // 11. OFFBOARDING / EXIT
    if (/\b(offboarding|resignation|resigned|notice\s+period|relieving|exit\s+interview)\b/i.test(q)) {
      return { intent: "OFFBOARDING", confidence: 0.92, entities, rawQuery: raw };
    }

    // 12. PERFORMANCE & APPRAISAL
    if (/\b(performance|appraisal|review\s+cycle|kpi|rating|appraisal\s+cycle)\b/i.test(q)) {
      return { intent: "PERFORMANCE", confidence: 0.9, entities, rawQuery: raw };
    }

    // 13. POLICIES & RULES
    if (
      /\b(policy|policies|rules|wfh\s+policy|leave\s+policy|overtime\s+policy|probation\s+policy|notice\s+period\s+policy|posh)\b/i.test(
        q
      )
    ) {
      return { intent: "POLICY", confidence: 0.92, entities, rawQuery: raw };
    }

    // 14. GENERAL HR CONCEPTS (What is probation, notice period, appraisal, etc.)
    if (
      /\b(what\s+is\s+(probation|notice\s+period|appraisal|leave\s+policy|epf|esi|pt|ctc|regularization|exit\s+interview|form\s*16))\b/i.test(
        q
      )
    ) {
      return { intent: "GENERAL_HR", confidence: 0.95, entities, rawQuery: raw };
    }

    // 15. SYSTEM USAGE / NAVIGATION (How do I apply for leave, where to check attendance, etc.)
    if (
      /\b(how\s+do\s+i|where\s+can\s+i|where\s+do\s+i|how\s+to\s+apply|how\s+to\s+approve|where\s+to\s+check|how\s+can\s+a\s+manager)\b/i.test(
        q
      )
    ) {
      return { intent: "SYSTEM_USAGE", confidence: 0.94, entities, rawQuery: raw };
    }

    // 16. REPORTS / EXPORT
    if (/\b(report|reports|export|muster\s+roll|form\s*25|statutory\s+report|download\s+pdf|download\s+excel)\b/i.test(q)) {
      return { intent: "REPORT", confidence: 0.93, entities, rawQuery: raw };
    }

    // 17. COMPANY / STATS
    if (/\b(company|how\s+many\s+employees|total\s+employees|active\s+employees|branches|organization|overview)\b/i.test(q)) {
      return { intent: "COMPANY", confidence: 0.9, entities, rawQuery: raw };
    }

    // 18. EMPLOYEE INFORMATION (By name or designation)
    if (/\b(employee|staff|profile|designation|who\s+is\s+[a-z]+|details\s+of|contact\s+details)\b/i.test(q)) {
      return { intent: "EMPLOYEE_INFORMATION", confidence: 0.88, entities, rawQuery: raw };
    }

    return {
      intent: isFollowUp && activeEntities.metric ? "ATTENDANCE" : "UNKNOWN",
      confidence: isFollowUp ? 0.75 : 0.5,
      entities,
      rawQuery: raw,
    };
  }
}
