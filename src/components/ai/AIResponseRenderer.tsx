// SWIFT AI — Unified Structured Response Renderer
import React from "react";
import type { AIMessage, AIStructuredData } from "@/lib/ai-unified-types";
import {
  User,
  Building2,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  Users,
  TrendingUp,
  FileText,
  Download,
  Bot,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIResponseRendererProps {
  message: AIMessage;
  onRunQuery?: (query: string) => void;
  onDownloadPdf?: (query: string, content?: string) => void;
  compact?: boolean;
}

export function AIResponseRenderer({
  message,
  onRunQuery,
  onDownloadPdf,
  compact = false,
}: AIResponseRendererProps) {
  const structured = message.structuredData;

  // 1. STRUCTURED DATA HANDLERS
  if (structured) {
    switch (structured.type) {
      case "EMPLOYEE_DETAILS":
        return <EmployeeDetailsCard data={structured} compact={compact} />;

      case "EMPLOYEE_LIST":
        return <EmployeeListCard data={structured} compact={compact} onSelectEmp={onRunQuery} />;

      case "ATTENDANCE_SUMMARY":
        return <AttendanceSummaryCard data={structured} compact={compact} onFilterClick={onRunQuery} />;

      case "LEAVE_SUMMARY":
        return <LeaveSummaryCard data={structured} compact={compact} />;

      case "PAYROLL_SUMMARY":
        return <PayrollSummaryCard data={structured} compact={compact} />;

      case "CLARIFICATION":
        return <ClarificationCard data={structured} onSelectOption={onRunQuery} />;

      case "SECURITY_REFUSAL":
        return <SecurityRefusalCard message={structured.message} />;

      case "NO_DATA":
        return <NoDataCard data={structured} onSelectSuggestion={onRunQuery} />;
    }
  }

  // 2. CONVERSATIONAL TEXT / MARKDOWN FALLBACK
  return <MarkdownMessageContent content={message.content} isUser={message.role === "user"} />;
}

/* ========================================================================= */
/* 1. EMPLOYEE DETAILS CARD                                                  */
/* ========================================================================= */
function EmployeeDetailsCard({
  data,
  compact,
}: {
  data: Extract<AIStructuredData, { type: "EMPLOYEE_DETAILS" }>;
  compact?: boolean;
}) {
  const emp = data.employee;
  const att = data.attendanceSummary;
  const initials = emp.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 shadow-soft overflow-hidden my-2 text-foreground">
      {/* Header Banner */}
      <div className="px-4 py-3.5 bg-gradient-to-r from-primary/10 via-purple-500/10 to-sky-500/10 border-b border-border/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            {initials}
          </div>
          <div>
            <div className="font-display font-semibold text-sm flex items-center gap-2">
              {emp.name}
              <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                {emp.status}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {emp.empCode} {emp.id ? `· ${emp.id}` : ""}
            </div>
          </div>
        </div>
        {emp.isFaceRegistered && (
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 hidden sm:flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Face Enrolled
          </Badge>
        )}
      </div>

      {/* Grid Properties */}
      <div className={`p-4 grid ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"} gap-3 text-xs`}>
        <div className="space-y-0.5">
          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
            <Building2 className="h-3 w-3 text-primary" /> Department
          </span>
          <p className="font-medium text-foreground">{emp.department || "General"}</p>
        </div>

        <div className="space-y-0.5">
          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
            <Briefcase className="h-3 w-3 text-primary" /> Designation
          </span>
          <p className="font-medium text-foreground">{emp.designation || "Staff"}</p>
        </div>

        <div className="space-y-0.5">
          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
            <MapPin className="h-3 w-3 text-primary" /> Branch
          </span>
          <p className="font-medium text-foreground">{emp.branch || "Head Office"}</p>
        </div>

        {emp.email && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground text-[11px] flex items-center gap-1">
              <Mail className="h-3 w-3 text-primary" /> Email
            </span>
            <p className="font-medium text-foreground truncate max-w-[140px]" title={emp.email}>
              {emp.email}
            </p>
          </div>
        )}

        {emp.phone && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground text-[11px] flex items-center gap-1">
              <Phone className="h-3 w-3 text-primary" /> Phone
            </span>
            <p className="font-medium text-foreground">{emp.phone}</p>
          </div>
        )}

        {emp.doj && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground text-[11px] flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" /> Joining Date
            </span>
            <p className="font-medium text-foreground">{emp.doj}</p>
          </div>
        )}
      </div>

      {/* Live Attendance Mini Footer */}
      {att && (
        <div className="px-4 py-2.5 bg-muted/40 border-t border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Today's Status:</span>
            <span className={`font-semibold ${att.todayStatus.includes("Present") || att.todayStatus.includes("On Time") ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {att.todayStatus} {att.checkIn ? `(${att.checkIn})` : ""}
            </span>
          </div>
          {att.attendancePct && (
            <div className="text-[11px] text-muted-foreground">
              30d Rate: <strong className="text-foreground">{att.attendancePct}%</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* 2. EMPLOYEE LIST TABLE CARD                                               */
/* ========================================================================= */
function EmployeeListCard({
  data,
  compact,
  onSelectEmp,
}: {
  data: Extract<AIStructuredData, { type: "EMPLOYEE_LIST" }>;
  compact?: boolean;
  onSelectEmp?: (query: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 shadow-soft overflow-hidden my-2">
      <div className="px-4 py-3 bg-muted/50 border-b border-border/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">{data.title}</h4>
        </div>
        <Badge variant="outline" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20">
          {data.count} {data.count === 1 ? "Employee" : "Employees"}
        </Badge>
      </div>

      {data.subtitle && (
        <div className="px-4 py-1.5 bg-background/60 text-[11px] text-muted-foreground border-b border-border/40">
          {data.subtitle}
        </div>
      )}

      {/* Responsive Rows */}
      <div className="divide-y divide-border/50 max-h-[340px] overflow-y-auto">
        {data.employees.map((emp) => (
          <div
            key={emp.id}
            onClick={() => onSelectEmp && onSelectEmp(`Who is ${emp.name}?`)}
            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-primary/5 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {emp.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {emp.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {emp.empCode} · {emp.department} · {emp.designation}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {emp.badge && (
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    emp.badge.toLowerCase().includes("absent")
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      : emp.badge.toLowerCase().includes("late")
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  }`}
                >
                  {emp.badge}
                </Badge>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. ATTENDANCE SUMMARY CARD                                                */
/* ========================================================================= */
function AttendanceSummaryCard({
  data,
  compact,
  onFilterClick,
}: {
  data: Extract<AIStructuredData, { type: "ATTENDANCE_SUMMARY" }>;
  compact?: boolean;
  onFilterClick?: (query: string) => void;
}) {
  const m = data.metrics;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 shadow-soft overflow-hidden my-2">
      <div className="px-4 py-3 bg-muted/50 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">{data.title}</h4>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">{data.date}</span>
      </div>

      {/* Metrics Grid */}
      <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          onClick={() => onFilterClick && onFilterClick("Who is present today?")}
          className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center cursor-pointer hover:bg-emerald-500/15 transition"
        >
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 block">Present</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{m.present}</span>
        </div>

        <div
          onClick={() => onFilterClick && onFilterClick("Who is absent today?")}
          className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center cursor-pointer hover:bg-rose-500/15 transition"
        >
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300 block">Absent</span>
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{m.absent}</span>
        </div>

        <div
          onClick={() => onFilterClick && onFilterClick("Who is late today?")}
          className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center cursor-pointer hover:bg-amber-500/15 transition"
        >
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 block">Late</span>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{m.late}</span>
        </div>

        <div
          onClick={() => onFilterClick && onFilterClick("Who is on leave today?")}
          className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center cursor-pointer hover:bg-sky-500/15 transition"
        >
          <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300 block">On Leave</span>
          <span className="text-lg font-bold text-sky-600 dark:text-sky-400">{m.onLeave}</span>
        </div>
      </div>

      {/* Progress Bar Rate */}
      <div className="px-4 pb-3">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>Overall Attendance Rate</span>
          <strong>{m.attendanceRatePct}%</strong>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-brand rounded-full transition-all duration-500"
            style={{ width: `${m.attendanceRatePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 4. LEAVE SUMMARY CARD                                                     */
/* ========================================================================= */
function LeaveSummaryCard({
  data,
  compact,
}: {
  data: Extract<AIStructuredData, { type: "LEAVE_SUMMARY" }>;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 shadow-soft overflow-hidden my-2">
      <div className="px-4 py-3 bg-muted/50 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">{data.title}</h4>
        </div>
        <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-500/20">
          {data.pendingCount} Pending
        </Badge>
      </div>

      <div className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
        {data.leaves.map((l) => (
          <div key={l.id} className="p-3 text-xs flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{l.employeeName}</p>
              <p className="text-[11px] text-muted-foreground">
                {l.type} · {l.startDate} to {l.endDate} ({l.days})
              </p>
              {l.reason && <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">"{l.reason}"</p>}
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${
                l.status.toLowerCase() === "approved"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}
            >
              {l.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 5. PAYROLL SUMMARY CARD                                                   */
/* ========================================================================= */
function PayrollSummaryCard({
  data,
  compact,
}: {
  data: Extract<AIStructuredData, { type: "PAYROLL_SUMMARY" }>;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 shadow-soft overflow-hidden my-2">
      <div className="px-4 py-3 bg-muted/50 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">{data.title}</h4>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">{data.month}</span>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-background border border-border/60">
          <span className="text-muted-foreground text-[11px] block">Total Gross Liability</span>
          <span className="text-base font-bold text-foreground">₹{data.totalGrossLiability.toLocaleString("en-IN")}</span>
        </div>
        <div className="p-3 rounded-xl bg-background border border-border/60">
          <span className="text-muted-foreground text-[11px] block">Average Monthly CTC</span>
          <span className="text-base font-bold text-foreground">₹{data.averageCtc.toLocaleString("en-IN")}</span>
        </div>
        <div className="p-3 rounded-xl bg-background border border-border/60 col-span-2 sm:col-span-1">
          <span className="text-muted-foreground text-[11px] block">Total Employees</span>
          <span className="text-base font-bold text-foreground">{data.totalEmployees} Headcount</span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 6. CLARIFICATION CARD (Disambiguation)                                     */
/* ========================================================================= */
function ClarificationCard({
  data,
  onSelectOption,
}: {
  data: Extract<AIStructuredData, { type: "CLARIFICATION" }>;
  onSelectOption?: (query: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 my-2 text-xs text-foreground">
      <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400 mb-2">
        <AlertTriangle className="h-4 w-4" />
        <span>{data.title}</span>
      </div>
      <p className="text-muted-foreground mb-3">
        I found multiple matching employees. Please choose which one you'd like to view:
      </p>
      <div className="space-y-2">
        {data.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelectOption && onSelectOption(opt.queryToRun)}
            className="w-full text-left p-2.5 rounded-xl border border-border/80 bg-background hover:border-primary/40 hover:bg-primary/5 transition flex items-center justify-between gap-3 cursor-pointer group"
          >
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{opt.label}</p>
              {opt.subLabel && <p className="text-[11px] text-muted-foreground">{opt.subLabel}</p>}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 7. SECURITY REFUSAL CARD                                                  */
/* ========================================================================= */
function SecurityRefusalCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 my-2 text-xs text-foreground flex items-start gap-3">
      <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
      <div>
        <h5 className="font-semibold text-rose-600 dark:text-rose-400 mb-1">Confidentiality & Security Notice</h5>
        <p className="text-muted-foreground leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 8. NO DATA CARD                                                           */
/* ========================================================================= */
function NoDataCard({
  data,
  onSelectSuggestion,
}: {
  data: Extract<AIStructuredData, { type: "NO_DATA" }>;
  onSelectSuggestion?: (query: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 my-2 text-xs text-foreground flex flex-col items-center text-center">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
        <Search className="h-5 w-5" />
      </div>
      <h5 className="font-semibold text-foreground mb-1">{data.title}</h5>
      <p className="text-muted-foreground max-w-sm mb-3">{data.message}</p>
      {data.suggestions && data.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {data.suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSuggestion && onSelectSuggestion(s)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-primary/5 hover:border-primary/30 transition text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* 9. SANITIZED MARKDOWN WITH CLEAN TABLES                                   */
/* ========================================================================= */
function MarkdownMessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  // 1. Separate table rows: whenever two pipes meet (closing of previous row and opening of next), insert newline
  let cleanedContent = (content || "").replace(/\|\s*\|/g, "|\n|");

  // 2. Ensure bullet points on the same line have newlines before them
  cleanedContent = cleanedContent.replace(/([^\n])\s*[•●]\s+/g, (_m, prefix) => `${prefix}\n\n• `);

  return (
    <div className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : "dark:prose-invert"}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-border/80 bg-background/95 shadow-xs">
              <table className="w-full text-left text-xs border-collapse divide-y divide-border/60">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
          th: ({ children }) => (
            <th className="font-semibold px-3.5 py-2 text-foreground text-[11px] whitespace-nowrap bg-muted/60">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 text-foreground/90 text-xs border-t border-border/40 whitespace-nowrap">
              {children}
            </td>
          ),
          ul: ({ children }) => <ul className="my-1.5 space-y-1 pl-4 list-disc marker:text-primary/70">{children}</ul>,
          p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
}
