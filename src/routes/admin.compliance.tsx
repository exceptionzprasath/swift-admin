import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Scale,
  ShieldCheck,
  CalendarClock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  RefreshCw,
  FileCheck2,
  FileText,
  Building,
  Info,
  ChevronRight,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/compliance")({
  head: () => ({ meta: [{ title: "Compliance AI Radar · CreatonsHR" }] }),
  component: CompliancePage,
});

type ComplianceTab = "radar" | "deadlines" | "audits" | "acts";

interface StatutoryDeadline {
  id: string;
  actName: string;
  filingTitle: string;
  dueDate: string;
  daysRemaining: number;
  period: string;
  status: "on_track" | "due_soon" | "filed" | "action_needed";
  officer: string;
  portalUrl: string;
  amountPayable?: string;
}

interface StatutoryActItem {
  id: string;
  actName: string;
  governingBody: string;
  applicability: string;
  filingFrequency: string;
  lastAuditDate: string;
  healthStatus: "compliant" | "warning" | "verified";
  aiSummary: string;
}

const STATUTORY_DEADLINES: StatutoryDeadline[] = [
  {
    id: "dl-1",
    actName: "EPF Act, 1952",
    filingTitle: "EPF Electronic Challan Return & Remittance",
    dueDate: "2026-11-15",
    daysRemaining: 4,
    period: "October 2026",
    status: "due_soon",
    officer: "Priya Sundaram (HR Head)",
    portalUrl: "https://unifiedportal-epfo.epfindia.gov.in",
    amountPayable: "₹ 14,400",
  },
  {
    id: "dl-2",
    actName: "ESI Act, 1948",
    filingTitle: "ESIC Monthly Contribution & Challan Deposit",
    dueDate: "2026-11-15",
    daysRemaining: 4,
    period: "October 2026",
    status: "due_soon",
    officer: "Priya Sundaram (HR Head)",
    portalUrl: "https://www.esic.in",
    amountPayable: "₹ 2,182",
  },
  {
    id: "dl-3",
    actName: "Income Tax Act, 1961",
    filingTitle: "TDS Deposit (Challan ITNS 281 - Salary)",
    dueDate: "2026-11-07",
    daysRemaining: 0,
    period: "October 2026",
    status: "filed",
    officer: "Finance Team",
    portalUrl: "https://eportal.incometax.gov.in",
    amountPayable: "₹ 52,500 (Paid)",
  },
  {
    id: "dl-4",
    actName: "State Professional Tax Act",
    filingTitle: "PT Monthly Return & Payment (TN & KA)",
    dueDate: "2026-11-20",
    daysRemaining: 9,
    period: "October 2026",
    status: "on_track",
    officer: "Accounts Admin",
    portalUrl: "https://ctd.tn.gov.in",
    amountPayable: "₹ 11,056",
  },
  {
    id: "dl-5",
    actName: "Factories Act, 1948",
    filingTitle: "Half-Yearly Environmental & Safety Return",
    dueDate: "2026-12-31",
    daysRemaining: 43,
    period: "H2 FY 2026",
    status: "on_track",
    officer: "Plant Operations Manager",
    portalUrl: "https://labour.gov.in",
  },
];

const STATUTORY_ACTS: StatutoryActItem[] = [
  {
    id: "act-1",
    actName: "Employees' Provident Funds and Miscellaneous Provisions Act, 1952",
    governingBody: "EPFO (Ministry of Labour & Employment)",
    applicability: "Establishments with 20+ employees",
    filingFrequency: "Monthly (15th of following month)",
    lastAuditDate: "2026-11-12",
    healthStatus: "compliant",
    aiSummary: "100% active employee wage wage capping verified; UAN seeding completed for 48/48 eligible staff.",
  },
  {
    id: "act-2",
    actName: "Employees' State Insurance Act, 1948",
    governingBody: "ESIC Corporation",
    applicability: "Non-seasonal factories/shops with monthly wage ≤ ₹21,000",
    filingFrequency: "Monthly (15th of following month)",
    lastAuditDate: "2026-11-12",
    healthStatus: "compliant",
    aiSummary: "All gross earnings correctly mapped; 0 attendance mismatch detected across biometric records.",
  },
  {
    id: "act-3",
    actName: "Code on Wages / Minimum Wages Act, 1948",
    governingBody: "State Labour Commissionerates",
    applicability: "All scheduled employments & shops",
    filingFrequency: "Bi-annual VDA updates",
    lastAuditDate: "2026-11-05",
    healthStatus: "verified",
    aiSummary: "Base wage revisions synced with latest Karnataka & Tamil Nadu gazette notification.",
  },
  {
    id: "act-4",
    actName: "Payment of Gratuity Act, 1972",
    governingBody: "Controlling Authority / Labour Ministry",
    applicability: "Establishments with 10+ employees",
    filingFrequency: "Form F Nomination on Joining / Event based",
    lastAuditDate: "2026-10-28",
    healthStatus: "compliant",
    aiSummary: "Gratuity nominations (Form F) digitally executed for all permanent staff past 1 year.",
  },
  {
    id: "act-5",
    actName: "Sexual Harassment of Women at Workplace (POSH) Act, 2013",
    governingBody: "District Officer / Women & Child Development",
    applicability: "All establishments with 10+ employees",
    filingFrequency: "Annual Report (By Jan 31)",
    lastAuditDate: "2026-11-01",
    healthStatus: "verified",
    aiSummary: "Internal Complaints Committee (ICC) constituted; mandatory quarterly awareness seminar completed.",
  },
  {
    id: "act-6",
    actName: "Maternity Benefit (Amendment) Act, 2017",
    governingBody: "State Labour Directorate",
    applicability: "All female employees with 80+ working days in past 12 months",
    filingFrequency: "Event-based & Annual returns",
    lastAuditDate: "2026-10-15",
    healthStatus: "compliant",
    aiSummary: "26 weeks paid leave policy active; creche allowance protocol enabled for eligible workforce.",
  },
];

function CompliancePage() {
  const [activeTab, setActiveTab] = useState<ComplianceTab>("radar");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedAct, setSelectedAct] = useState<StatutoryActItem | null>(null);

  const filteredActs = useMemo(() => {
    return STATUTORY_ACTS.filter((act) => {
      return (
        act.actName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.governingBody.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  const handleRunAiAudit = (act?: StatutoryActItem) => {
    if (act) setSelectedAct(act);
    setIsAuditing(true);
    setAuditModalOpen(true);
    setTimeout(() => {
      setIsAuditing(false);
      toast.success("AI Compliance Scan Completed", {
        description: "Checked 14 compliance parameters across attendance, payroll, and register databases. 0 statutory violations found.",
      });
    }, 1800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Compliance AI Radar</span>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold">
              98.4% Health Score · Grade A+
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Autonomous radar continuously monitoring Indian labour laws, statutory filing deadlines, EPF/ESIC wage caps, and state regulations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => handleRunAiAudit()}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft cursor-pointer"
          >
            <Sparkles className="h-4 w-4 mr-1.5" /> Run AI Self-Audit
          </Button>
        </div>
      </div>

      {/* AI Radar Intelligence Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-sm shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Zero Statutory Violations Detected</h3>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  Real-time Verified
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                EPF Electronic Challan Return (ECR) for October 2026 is fully compiled with active members verified. ESIC wage ceilings checked across all branches. Next critical statutory cutoff is in 4 days.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-xs font-semibold text-muted-foreground">Compliance Index</p>
              <p className="text-2xl font-black text-foreground">98.4%</p>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div className="text-right">
              <p className="text-xs font-semibold text-muted-foreground">Acts Monitored</p>
              <p className="text-2xl font-black text-primary">14/14</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>EPF ECR wage split verified (₹15,000 ceiling)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>State Minimum Wage Gazettes Synced</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>POSH Committee Annual Returns Documented</span>
          </div>
        </div>
      </div>

      {/* Top Frosted Capsule Tab Bar (Left-aligned) */}
      <div className="flex items-center justify-start gap-4 flex-wrap pb-1">
        <div className="inline-flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5 rounded-full border border-border/60 bg-card/75 dark:bg-card/50 backdrop-blur-xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "radar" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "radar" && (
              <motion.div
                layoutId="complianceSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Compliance Radar</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("deadlines")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "deadlines" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "deadlines" && (
              <motion.div
                layoutId="complianceSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>Statutory Deadlines ({STATUTORY_DEADLINES.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("acts")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "acts" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "acts" && (
              <motion.div
                layoutId="complianceSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Scale className="h-4 w-4 shrink-0" />
              <span>Labour Acts & Codes ({STATUTORY_ACTS.length})</span>
            </span>
          </button>
        </div>
      </div>

      {/* View 1: Radar & Deadlines Combined View */}
      {(activeTab === "radar" || activeTab === "deadlines") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span>Upcoming Statutory Filing Deadlines (November 2026)</span>
            </h3>
            <span className="text-xs text-muted-foreground">Automated reminder dispatched at T-7 and T-2 days</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STATUTORY_DEADLINES.map((dl) => (
              <div
                key={dl.id}
                className="rounded-2xl border border-border bg-card p-5 space-y-3 hover:shadow-soft transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-semibold text-primary bg-primary/10">
                      {dl.actName}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-[10px] font-semibold",
                        dl.status === "due_soon" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                        dl.status === "on_track" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                        dl.status === "filed" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      )}
                    >
                      {dl.status === "due_soon" ? `${dl.daysRemaining} days left` : dl.status === "filed" ? "Filed" : "On Track"}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground">{dl.filingTitle}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Due Date: {dl.dueDate} ({dl.period})</p>
                  </div>

                  {dl.amountPayable && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Remittance:</span>
                      <span className="text-foreground font-mono">{dl.amountPayable}</span>
                    </div>
                  )}

                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                    <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Compliance Owner: {dl.officer}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <a
                    href={dl.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    <span>Filing Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <Button
                    size="sm"
                    variant={dl.status === "filed" ? "outline" : "default"}
                    onClick={() => {
                      toast.success(`Challan payment and acknowledgement recorded for ${dl.filingTitle}`);
                    }}
                    className="h-8 px-3 rounded-lg text-xs font-bold"
                  >
                    {dl.status === "filed" ? "View Ack Receipt" : "Mark Deposited"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 2: Labour Acts & Codes Matrix */}
      {activeTab === "acts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search labour law, act, ministry..."
                className="h-9 pl-9 rounded-xl text-xs bg-background"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Showing {filteredActs.length} statutory frameworks
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Statutory Act & Regulation</th>
                    <th className="py-3.5 px-4">Governing Authority</th>
                    <th className="py-3.5 px-4">Filing Frequency</th>
                    <th className="py-3.5 px-4">Last Audit</th>
                    <th className="py-3.5 px-4">AI Audit Summary</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredActs.map((act) => (
                    <tr key={act.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-semibold text-foreground text-xs leading-snug">{act.actName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{act.applicability}</p>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{act.governingBody}</td>
                      <td className="py-3.5 px-4 text-foreground font-medium whitespace-nowrap">{act.filingFrequency}</td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{act.lastAuditDate}</td>
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{act.aiSummary}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => handleRunAiAudit(act)}
                          className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" /> Re-Audit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Audit Dialog */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Automated Labour Law AI Audit</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              AI verification engine scanning payroll databases, biometric logs, and statutory ceiling limits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            {isAuditing ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <p className="font-semibold text-foreground">Scanning statutory parameters...</p>
                <p className="text-[11px] text-muted-foreground">Verifying EPF wages, ESI applicability, and PT slabs.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Audit Complete — 100% Compliant</span>
                  </div>
                  <p className="text-[11px]">
                    All 48 employees verified against Central and State labour regulations. Zero non-compliance risks flagged.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>EPF UAN & Active Member Validation</span>
                    <span className="font-semibold text-emerald-600">Passed (48/48)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>ESIC Wage Ceiling Check (≤ ₹21,000)</span>
                    <span className="font-semibold text-emerald-600">Passed (3/3 IPs)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Minimum Wage Gazette Cross-Check</span>
                    <span className="font-semibold text-emerald-600">Passed (All Zones)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Muster Roll Punch Variance Ratio</span>
                    <span className="font-semibold text-emerald-600">Within Threshold (98.2%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setAuditModalOpen(false)}
              className="text-xs font-bold bg-primary text-primary-foreground"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
