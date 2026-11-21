import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  BookOpen,
  Receipt,
  Award,
  FileCheck2,
  Download,
  Eye,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building,
  Upload,
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
import { ComingSoonOverlay } from "@/components/coming-soon-overlay";

export const Route = createFileRoute("/admin/compliance-docs")({
  head: () => ({ meta: [{ title: "Compliance Documents & Statutory Registers · CreatonsHR" }] }),
  component: ComplianceDocsPage,
});

type DocCategory = "all" | "registers" | "challans" | "licenses" | "annual";

interface ComplianceDocument {
  id: string;
  code: string;
  title: string;
  category: "registers" | "challans" | "licenses" | "annual";
  actReference: string;
  validityOrPeriod: string;
  fileSize: string;
  lastUpdated: string;
  status: "verified" | "due_soon" | "active";
  signedBy: string;
}

const STATUTORY_DOCUMENTS: ComplianceDocument[] = [
  {
    id: "cd-1",
    code: "REG-01",
    title: "Form A — Employee Register (Under Labour Codes)",
    category: "registers",
    actReference: "Occupational Safety, Health & Working Conditions Code",
    validityOrPeriod: "FY 2026-27 (Live Synced)",
    fileSize: "2.4 MB",
    lastUpdated: "2026-11-12",
    status: "verified",
    signedBy: "Digital HR System",
  },
  {
    id: "cd-2",
    code: "REG-02",
    title: "Form B — Wage Register & Deductions Master",
    category: "registers",
    actReference: "Code on Wages, 2019 / Payment of Wages Act",
    validityOrPeriod: "October 2026",
    fileSize: "1.8 MB",
    lastUpdated: "2026-11-05",
    status: "verified",
    signedBy: "Finance & Payroll Officer",
  },
  {
    id: "cd-3",
    code: "REG-03",
    title: "Form C — Loan & Salary Advance Recovery Register",
    category: "registers",
    actReference: "Payment of Wages Act, 1936",
    validityOrPeriod: "FY 2026-27",
    fileSize: "680 KB",
    lastUpdated: "2026-11-01",
    status: "verified",
    signedBy: "Accounts Admin",
  },
  {
    id: "cd-4",
    code: "REG-04",
    title: "Form D — Attendance Muster Roll & Overtime Ledger",
    category: "registers",
    actReference: "Factories Act, 1948 / State Shops & Est. Act",
    validityOrPeriod: "October 2026",
    fileSize: "3.1 MB",
    lastUpdated: "2026-11-01",
    status: "verified",
    signedBy: "Biometric Attendance Server",
  },
  {
    id: "cd-5",
    code: "CHL-01",
    title: "EPFO Electronic Challan Receipt (TRRN: 101261109281)",
    category: "challans",
    actReference: "EPF Act, 1952",
    validityOrPeriod: "Paid for Sep 2026",
    fileSize: "340 KB",
    lastUpdated: "2026-10-15",
    status: "verified",
    signedBy: "State Bank of India (EPFO Gateway)",
  },
  {
    id: "cd-6",
    code: "CHL-02",
    title: "ESIC Contribution Challan & Bank Ack Receipt",
    category: "challans",
    actReference: "ESI Act, 1948",
    validityOrPeriod: "Paid for Sep 2026",
    fileSize: "280 KB",
    lastUpdated: "2026-10-15",
    status: "verified",
    signedBy: "ESIC Online Payment Gateway",
  },
  {
    id: "cd-7",
    code: "LIC-01",
    title: "State Shops & Commercial Establishment Registration",
    category: "licenses",
    actReference: "State Shops & Establishment Act",
    validityOrPeriod: "Valid until 31 Dec 2027",
    fileSize: "1.2 MB",
    lastUpdated: "2025-01-10",
    status: "active",
    signedBy: "Department of Labour Inspectorate",
  },
  {
    id: "cd-8",
    code: "LIC-02",
    title: "Factory License & Health/Safety Consent to Operate",
    category: "licenses",
    actReference: "Factories Act, 1948",
    validityOrPeriod: "Valid until 30 Apr 2027",
    fileSize: "4.5 MB",
    lastUpdated: "2025-05-02",
    status: "active",
    signedBy: "Chief Inspector of Factories",
  },
  {
    id: "cd-9",
    code: "ANN-01",
    title: "POSH Internal Complaints Committee (ICC) Annual Return",
    category: "annual",
    actReference: "Sexual Harassment of Women at Workplace Act, 2013",
    validityOrPeriod: "Calendar Year 2025 (Completed)",
    fileSize: "950 KB",
    lastUpdated: "2026-01-28",
    status: "verified",
    signedBy: "Presiding Officer, ICC",
  },
  {
    id: "cd-10",
    code: "ANN-02",
    title: "Payment of Bonus Act — Form D Annual Return",
    category: "annual",
    actReference: "Payment of Bonus Act, 1965",
    validityOrPeriod: "FY 2025-26",
    fileSize: "1.1 MB",
    lastUpdated: "2026-09-30",
    status: "verified",
    signedBy: "Authorized Signatory",
  },
];

function ComplianceDocsPage() {
  const [activeTab, setActiveTab] = useState<DocCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ComplianceDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filteredDocs = useMemo(() => {
    return STATUTORY_DOCUMENTS.filter((doc) => {
      const matchesTab = activeTab === "all" || doc.category === activeTab;
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.actReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  const stats = useMemo(() => {
    const total = STATUTORY_DOCUMENTS.length;
    const registers = STATUTORY_DOCUMENTS.filter((d) => d.category === "registers").length;
    const challans = STATUTORY_DOCUMENTS.filter((d) => d.category === "challans").length;
    const licenses = STATUTORY_DOCUMENTS.filter((d) => d.category === "licenses").length;
    const annual = STATUTORY_DOCUMENTS.filter((d) => d.category === "annual").length;
    return { total, registers, challans, licenses, annual };
  }, []);

  const handleDownload = (doc: ComplianceDocument) => {
    toast.success(`Downloaded ${doc.title}`, {
      description: `Digitally signed copy verified (${doc.fileSize}).`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative min-h-[calc(100vh-10rem)]">
      <ComingSoonOverlay delayMs={700} />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Compliance Documents & Registers</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              Statutory Vault
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Digitally signed statutory registers, EPF/ESIC challan archives, factory licenses, and labour law returns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-1.5" /> Upload Statutory Document
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Statutory Registers</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.registers}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Forms A, B, C, D Active</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Challans & Receipts</span>
            <Receipt className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.challans}</p>
          <span className="text-[11px] text-muted-foreground">EPF / ESIC deposited</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Establishment Licenses</span>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.licenses}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">100% Valid & Current</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Annual Filings</span>
            <FileCheck2 className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.annual}</p>
          <span className="text-[11px] text-muted-foreground">POSH & Bonus documented</span>
        </div>
      </div>

      {/* Top Frosted Capsule Tab Bar (Left-aligned) */}
      <div className="flex items-center justify-start gap-4 flex-wrap pb-1">
        <div className="inline-flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5 rounded-full border border-primary/35 dark:border-primary/45 bg-card/75 dark:bg-card/50 backdrop-blur-xl shadow-xs shadow-primary/5">
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
                layoutId="complianceDocsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>All Documents ({stats.total})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("registers")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "registers" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "registers" && (
              <motion.div
                layoutId="complianceDocsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span>Statutory Registers ({stats.registers})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("challans")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "challans" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "challans" && (
              <motion.div
                layoutId="complianceDocsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Receipt className="h-4 w-4 shrink-0" />
              <span>Challans ({stats.challans})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("licenses")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "licenses" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "licenses" && (
              <motion.div
                layoutId="complianceDocsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Award className="h-4 w-4 shrink-0" />
              <span>Licenses ({stats.licenses})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("annual")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "annual" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "annual" && (
              <motion.div
                layoutId="complianceDocsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 shrink-0" />
              <span>Annual Returns ({stats.annual})</span>
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
            placeholder="Search register code, act, title..."
            className="h-9 pl-9 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>All documents digitally archived in compliance with Information Technology Act</span>
        </div>
      </div>

      {/* Document Records Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Document Title & Code</th>
                <th className="py-3.5 px-4">Governing Act Reference</th>
                <th className="py-3.5 px-4">Validity / Period</th>
                <th className="py-3.5 px-4">File Size</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary font-mono text-[10px] font-bold shrink-0">
                        {doc.code}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{doc.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Signed by {doc.signedBy}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs text-muted-foreground">
                    {doc.actReference}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                    {doc.validityOrPeriod}
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                    {doc.fileSize}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge
                      className={cn(
                        "text-[10px] font-semibold capitalize",
                        doc.status === "verified" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                        doc.status === "active" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                        doc.status === "due_soon" && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}
                    >
                      {doc.status}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPreviewDoc(doc);
                          setPreviewOpen(true);
                        }}
                        className="h-8 px-2.5 rounded-lg text-xs"
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          {previewDoc && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono font-bold">
                    {previewDoc.code}
                  </Badge>
                  <DialogTitle className="text-base font-bold">{previewDoc.title}</DialogTitle>
                </div>
                <DialogDescription className="text-xs">
                  {previewDoc.actReference}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-xs">
                <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Document Period:</span>
                    <span className="font-semibold text-foreground">{previewDoc.validityOrPeriod}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Digitally Signed By:</span>
                    <span className="font-semibold text-foreground">{previewDoc.signedBy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Archive File Size:</span>
                    <span className="font-mono text-foreground">{previewDoc.fileSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Verification Hash:</span>
                    <span className="font-mono text-[10px] text-muted-foreground">SHA-256 e48a...982f</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-dashed border-border text-center text-muted-foreground py-8">
                  <FileText className="h-10 w-10 mx-auto text-primary/40 mb-2" />
                  <p className="font-semibold text-foreground">Official Statutory Document Ready</p>
                  <p className="text-[11px] mt-0.5">Click download to retrieve authenticated PDF copy.</p>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)} className="text-xs">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleDownload(previewDoc);
                    setPreviewOpen(false);
                  }}
                  className="text-xs font-bold bg-primary text-primary-foreground"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Upload Statutory Document</DialogTitle>
            <DialogDescription className="text-xs">
              Upload labour department receipts, challan receipts, or annual inspection reports.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Document Title</label>
              <Input placeholder="e.g. Factory Inspection Report 2026..." className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Statutory Category</label>
              <Select defaultValue="registers">
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registers">Statutory Register</SelectItem>
                  <SelectItem value="challans">Tax / ECR Challan</SelectItem>
                  <SelectItem value="licenses">License / Registration</SelectItem>
                  <SelectItem value="annual">Annual Return Form</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Applicable Act</label>
              <Input placeholder="e.g. Factories Act, 1948..." className="h-9 text-xs" />
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-muted-foreground hover:bg-muted/40 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-semibold text-foreground text-xs">Drop PDF / Excel document here</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Supports PDF, XLSX up to 25MB</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success("Statutory document uploaded & encrypted into vault");
                setUploadOpen(false);
              }}
              className="text-xs font-bold bg-primary text-primary-foreground"
            >
              Upload & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
