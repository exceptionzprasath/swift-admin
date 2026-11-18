import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calculator,
  CalendarCheck,
  Users,
  Receipt,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  FileDown,
  Building2,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useStore } from "@/lib/store";
import { ComingSoonOverlay } from "@/components/coming-soon-overlay";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports & Statutory Analytics · CreatonsHR" }] }),
  component: ReportsPage,
});

type ReportCategory = "all" | "statutory" | "payroll" | "attendance" | "taxation" | "workforce";

interface ReportItem {
  id: string;
  title: string;
  category: "statutory" | "payroll" | "attendance" | "taxation" | "workforce";
  description: string;
  formats: ("XLSX" | "CSV" | "PDF" | "TXT")[];
  period: string;
  lastGenerated: string;
  sampleColumns: string[];
  sampleData: (string | number)[][];
  totalSummary?: string;
}

const REPORT_CATALOG: ReportItem[] = [
  {
    id: "rep-ecr",
    title: "EPFO ECR (Electronic Challan Return) File",
    category: "statutory",
    description: "Official EPF Unified Portal upload format. Compliant with active member ECR specification.",
    formats: ["TXT", "XLSX", "CSV"],
    period: "Monthly",
    lastGenerated: "Today at 02:40 PM",
    sampleColumns: ["UAN", "Member Name", "Gross Wages", "EPF Wages", "EPS Wages", "EDLI Wages", "EE Share", "EPS Share", "ER Share", "NCP Days"],
    sampleData: [
      ["100982341102", "Manoj Kumar", "₹ 48,000", "₹ 15,000", "₹ 15,000", "₹ 15,000", "₹ 1,800", "₹ 1,250", "₹ 550", "0"],
      ["100472819441", "Priya Sundaram", "₹ 62,000", "₹ 15,000", "₹ 15,000", "₹ 15,000", "₹ 1,800", "₹ 1,250", "₹ 550", "0"],
      ["101298471209", "Aakash Verma", "₹ 35,000", "₹ 15,000", "₹ 15,000", "₹ 15,000", "₹ 1,800", "₹ 1,250", "₹ 550", "1"],
      ["100817264812", "Devendra Saini", "₹ 24,000", "₹ 15,000", "₹ 15,000", "₹ 15,000", "₹ 1,800", "₹ 1,250", "₹ 550", "0"],
    ],
    totalSummary: "4 Active Members · Total Contribution: ₹ 14,400",
  },
  {
    id: "rep-esic",
    title: "ESIC Monthly Contribution Return (Form 5)",
    category: "statutory",
    description: "ESIC Portal upload CSV containing IP numbers, attendance days, gross wages, and 0.75% / 3.25% split.",
    formats: ["XLSX", "CSV"],
    period: "Monthly",
    lastGenerated: "Yesterday at 06:15 PM",
    sampleColumns: ["IP Number", "Insured Person Name", "No. of Days Worked", "Total Wages", "Reason Code", "EE Contribution", "ER Contribution"],
    sampleData: [
      ["3190284711", "Ramesh Babu", "26", "₹ 18,500", "0", "₹ 139", "₹ 601"],
      ["3190284712", "Sunita Bai", "25", "₹ 16,200", "0", "₹ 122", "₹ 527"],
      ["3190284713", "Murugan K", "27", "₹ 19,800", "0", "₹ 149", "₹ 644"],
    ],
    totalSummary: "3 Eligible IPs (Wages ≤ ₹21,000) · Total Remittance: ₹ 2,182",
  },
  {
    id: "rep-pt",
    title: "State Professional Tax (PT) Deduction Summary",
    category: "statutory",
    description: "State-wise slab breakdown for Tamil Nadu, Karnataka, Maharashtra, and Telangana state compliance.",
    formats: ["PDF", "XLSX"],
    period: "Monthly / Half-Yearly",
    lastGenerated: "3 days ago",
    sampleColumns: ["State", "Gross Slab", "No. of Employees", "PT Rate Per Employee", "Total Tax Deducted"],
    sampleData: [
      ["Tamil Nadu", "> ₹ 75,000 half-yearly", "32", "₹ 208", "₹ 6,656"],
      ["Karnataka", "> ₹ 15,000 monthly", "14", "₹ 200", "₹ 2,800"],
      ["Maharashtra", "> ₹ 10,000 monthly", "8", "₹ 200", "₹ 1,600"],
    ],
    totalSummary: "54 Employees · Total PT Payable: ₹ 11,056",
  },
  {
    id: "rep-sal-reg",
    title: "Monthly Master Salary Register (Wages Register)",
    category: "payroll",
    description: "Comprehensive wage sheet with basic, HRA, allowances, gross earnings, PF/ESI/PT/TDS, and net payout.",
    formats: ["XLSX", "PDF", "CSV"],
    period: "Monthly",
    lastGenerated: "Today at 10:15 AM",
    sampleColumns: ["Emp Code", "Employee Name", "Designation", "Paid Days", "Basic Pay", "HRA", "Spl Allowance", "Gross", "Total Deductions", "Net Pay"],
    sampleData: [
      ["SW-001", "Manoj Kumar", "Managing Director", "30", "₹ 40,000", "₹ 20,000", "₹ 15,000", "₹ 75,000", "₹ 5,800", "₹ 69,200"],
      ["SW-002", "Priya Sundaram", "HR Head", "30", "₹ 30,000", "₹ 15,000", "₹ 12,000", "₹ 57,000", "₹ 4,200", "₹ 52,800"],
      ["SW-003", "Aakash Verma", "Tech Lead", "29", "₹ 35,000", "₹ 17,500", "₹ 10,000", "₹ 62,500", "₹ 4,800", "₹ 57,700"],
      ["SW-004", "Meera K", "Product Manager", "30", "₹ 28,000", "₹ 14,000", "₹ 8,000", "₹ 50,000", "₹ 3,900", "₹ 46,100"],
    ],
    totalSummary: "Total Net Disbursement: ₹ 2,25,800 · Total Statutory Withholding: ₹ 18,700",
  },
  {
    id: "rep-bank-batch",
    title: "Bank Payout Transfer Batch File (NEFT / RTGS)",
    category: "payroll",
    description: "Encrypted direct bank upload text/excel file formatted for HDFC, ICICI, SBI, and Axis Corporate Banking.",
    formats: ["XLSX", "CSV", "TXT"],
    period: "Monthly",
    lastGenerated: "Today at 11:30 AM",
    sampleColumns: ["Beneficiary Account", "IFSC Code", "Beneficiary Name", "Amount", "Narration", "Email"],
    sampleData: [
      ["50100293817412", "HDFC0001234", "Manoj Kumar", "₹ 69,200", "Salary Nov 2026", "manoj@swift.in"],
      ["000201829381", "ICIC0000002", "Priya Sundaram", "₹ 52,800", "Salary Nov 2026", "priya@swift.in"],
      ["30918274910", "SBIN0004012", "Aakash Verma", "₹ 57,700", "Salary Nov 2026", "aakash@swift.in"],
    ],
    totalSummary: "Batch Total: ₹ 1,79,700 · 3 Records Ready for Sign-off",
  },
  {
    id: "rep-muster",
    title: "Monthly Muster Roll & Biometric Punch Register",
    category: "attendance",
    description: "Day-by-day attendance codes (P, A, WO, PH, CL, SL) with total present, overtime hours, and late penalties.",
    formats: ["PDF", "XLSX"],
    period: "Monthly",
    lastGenerated: "2 days ago",
    sampleColumns: ["Emp Code", "Name", "Branch", "Present", "Weekly Off", "Leave", "Absent", "OT Hours", "Late Count"],
    sampleData: [
      ["SW-001", "Manoj Kumar", "Head Office", "26", "4", "0", "0", "0.0 hrs", "0"],
      ["SW-002", "Priya Sundaram", "Head Office", "25", "4", "1", "0", "2.5 hrs", "1"],
      ["SW-003", "Aakash Verma", "Chennai Plant", "24", "4", "1", "1", "5.0 hrs", "2"],
    ],
    totalSummary: "Average Attendance Ratio: 96.8% · Overtime: 7.5 hrs",
  },
  {
    id: "rep-leave-encash",
    title: "Annual Leave Balance & Encashment Register",
    category: "attendance",
    description: "Earned Leave (EL/PL), Casual Leave (CL), Sick Leave (SL) opening, credited, availed, and encashable balances.",
    formats: ["XLSX", "PDF"],
    period: "Quarterly / Annual",
    lastGenerated: "5 days ago",
    sampleColumns: ["Emp Code", "Employee Name", "Opening PL", "PL Earned", "PL Availed", "Closing PL", "Encashable Days", "Encashment Value"],
    sampleData: [
      ["SW-001", "Manoj Kumar", "12", "18", "6", "24", "12", "₹ 27,692"],
      ["SW-002", "Priya Sundaram", "8", "18", "10", "16", "8", "₹ 14,080"],
      ["SW-003", "Aakash Verma", "6", "18", "12", "12", "6", "₹ 11,880"],
    ],
    totalSummary: "Total Encashment Liability: ₹ 53,652",
  },
  {
    id: "rep-form16",
    title: "TDS 24Q Quarterly Return & Form 16 Annexure",
    category: "taxation",
    description: "Income Tax Section 192 summary, regime selections (Old vs New), Chapter VI-A deductions, and tax paid.",
    formats: ["PDF", "XLSX"],
    period: "Quarterly",
    lastGenerated: "1 week ago",
    sampleColumns: ["PAN Number", "Employee Name", "Tax Regime", "Taxable Income", "Sec 80C", "Sec 80D", "Total TDS Deducted"],
    sampleData: [
      ["ABCDE1234F", "Manoj Kumar", "New Regime", "₹ 8,40,000", "—", "—", "₹ 24,000"],
      ["PQRSK5678M", "Priya Sundaram", "Old Regime", "₹ 6,20,000", "₹ 1,50,000", "₹ 25,000", "₹ 12,500"],
      ["XYZPA9012L", "Aakash Verma", "New Regime", "₹ 6,80,000", "—", "—", "₹ 16,000"],
    ],
    totalSummary: "Quarter Total TDS Deposited: ₹ 52,500 via Challan ITNS-281",
  },
  {
    id: "rep-headcount",
    title: "Headcount, Attrition & Diversity Variance Matrix",
    category: "workforce",
    description: "Month-on-month additions, exits, department distribution, gender ratio, and average employee tenure.",
    formats: ["PDF", "XLSX"],
    period: "Monthly",
    lastGenerated: "3 days ago",
    sampleColumns: ["Department", "Opening Headcount", "New Joiners", "Exits", "Closing Headcount", "Attrition Rate %"],
    sampleData: [
      ["Engineering", "18", "2", "0", "20", "0.0%"],
      ["Product & Design", "8", "1", "0", "9", "0.0%"],
      ["Operations & Plant", "24", "1", "1", "24", "4.1%"],
      ["Sales & Marketing", "14", "2", "1", "15", "6.7%"],
    ],
    totalSummary: "Total Headcount: 68 · Monthly Attrition Rate: 2.8%",
  },
];

function ReportsPage() {
  const { company } = useStore();
  const [activeTab, setActiveTab] = useState<ReportCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("November 2026");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [previewReport, setPreviewReport] = useState<ReportItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filteredReports = useMemo(() => {
    return REPORT_CATALOG.filter((r) => {
      const matchesTab = activeTab === "all" || r.category === activeTab;
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  const handleDownloadReport = (report: ReportItem, format: string) => {
    toast.success(`Generated ${report.title}`, {
      description: `Format: ${format} · Period: ${selectedMonth} · Download started.`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative min-h-[calc(100vh-10rem)]">
      <ComingSoonOverlay delayMs={700} />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Reports & Statutory Analytics</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              Ready to Export
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate and export official EPFO ECR files, ESIC returns, wage registers, muster rolls, and TDS tax statements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-9 w-40 rounded-xl text-xs bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="November 2026">November 2026</SelectItem>
              <SelectItem value="October 2026">October 2026</SelectItem>
              <SelectItem value="September 2026">September 2026</SelectItem>
              <SelectItem value="Q2 FY 2026-27">Q2 FY 2026-27</SelectItem>
              <SelectItem value="Annual FY 2025-26">Annual FY 2025-26</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Frosted Capsule Tab Bar (Left-aligned) */}
      <div className="flex items-center justify-start gap-4 flex-wrap pb-1">
        <div className="inline-flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5 rounded-full border border-border/60 bg-card/75 dark:bg-card/50 backdrop-blur-xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "all" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "all" && (
              <motion.div
                layoutId="reportsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>All Reports ({REPORT_CATALOG.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("statutory")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "statutory" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "statutory" && (
              <motion.div
                layoutId="reportsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>Statutory & EPF/ESI</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payroll")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "payroll" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "payroll" && (
              <motion.div
                layoutId="reportsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Calculator className="h-4 w-4 shrink-0" />
              <span>Payroll Registers</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "attendance" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "attendance" && (
              <motion.div
                layoutId="reportsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 shrink-0" />
              <span>Attendance & Muster</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("taxation")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "taxation" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "taxation" && (
              <motion.div
                layoutId="reportsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Receipt className="h-4 w-4 shrink-0" />
              <span>Taxation & TDS</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("workforce")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "workforce" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "workforce" && (
              <motion.div
                layoutId="reportsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span>Workforce Analytics</span>
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report statement by name..."
            className="h-9 pl-9 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="h-9 w-full sm:w-44 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="ho">Head Office</SelectItem>
              <SelectItem value="chennai">Chennai Plant</SelectItem>
              <SelectItem value="coimbatore">Coimbatore Unit</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedBranch("all");
            }}
            className="h-9 px-3 rounded-xl text-xs font-semibold"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="rounded-2xl border border-border bg-card p-5 space-y-4 hover:shadow-soft transition-all flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    report.category === "statutory" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    report.category === "payroll" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    report.category === "attendance" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    report.category === "taxation" && "bg-purple-500/10 text-purple-600 border-purple-500/20",
                    report.category === "workforce" && "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                  )}
                >
                  {report.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {report.period}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground line-clamp-1">{report.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {report.description}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {report.formats.map((fmt) => (
                  <Badge key={fmt} variant="secondary" className="text-[10px] font-mono px-2 py-0">
                    .{fmt.toLowerCase()}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPreviewReport(report);
                  setPreviewOpen(true);
                }}
                className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
              </Button>

              <div className="flex items-center gap-1.5">
                {report.formats.map((fmt) => (
                  <Button
                    key={fmt}
                    size="sm"
                    onClick={() => handleDownloadReport(report, fmt)}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> {fmt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          {previewReport && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                      <span>{previewReport.title}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {previewReport.category}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      Period: {selectedMonth} · Sample preview displaying compiled payroll records.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-sm">
                        <tr>
                          {previewReport.sampleColumns.map((col, idx) => (
                            <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {previewReport.sampleData.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-muted/30">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2.5 px-3 whitespace-nowrap text-foreground font-mono text-[11px]">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {previewReport.totalSummary && (
                    <div className="p-3 bg-muted/40 border-t border-border text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="text-muted-foreground">Summary Total:</span>
                      <span>{previewReport.totalSummary}</span>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)} className="text-xs">
                  Close
                </Button>
                <div className="flex items-center gap-2">
                  {previewReport.formats.map((fmt) => (
                    <Button
                      key={fmt}
                      size="sm"
                      onClick={() => {
                        handleDownloadReport(previewReport, fmt);
                        setPreviewOpen(false);
                      }}
                      className="text-xs font-bold bg-primary text-primary-foreground"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Download {fmt}
                    </Button>
                  ))}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
