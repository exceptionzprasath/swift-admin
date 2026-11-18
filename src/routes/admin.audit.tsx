import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Activity,
  KeyRound,
  Banknote,
  DownloadCloud,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  Laptop,
  Globe,
  SlidersHorizontal,
  RefreshCw,
  Lock,
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

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log & System Activity · CreatonsHR" }] }),
  component: AuditLogPage,
});

type AuditCategory = "all" | "auth" | "payroll" | "export" | "employees";

interface AuditEvent {
  id: string;
  timestamp: string;
  exactTime: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  category: "auth" | "payroll" | "export" | "employees";
  targetModule: string;
  ipAddress: string;
  device: string;
  severity: "info" | "warning" | "critical";
  status: "success" | "warning" | "failed";
  detailsPayload?: Record<string, any>;
}

const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "aud-001",
    timestamp: "12 mins ago",
    exactTime: "2026-11-18 21:42:10 IST",
    actorName: "Manoj Kumar",
    actorEmail: "shreesairampaints.swift.in",
    actorRole: "Super Admin",
    action: "Exported EPFO ECR Electronic Return File",
    category: "export",
    targetModule: "Payroll / Statutory",
    ipAddress: "157.48.21.94",
    device: "Chrome 128 (Windows 11)",
    severity: "info",
    status: "success",
    detailsPayload: {
      template: "EPFO_ECR_2026-11",
      activeMembersCount: 48,
      relievedMembersExcluded: 12,
      exportFormat: "XLSX",
    },
  },
  {
    id: "aud-002",
    timestamp: "45 mins ago",
    exactTime: "2026-11-18 21:08:44 IST",
    actorName: "Priya Sundaram",
    actorEmail: "priya@swift.in",
    actorRole: "HR Head",
    action: "Updated Salary Structure & Basic Pay for SW-0052",
    category: "payroll",
    targetModule: "Employees / CTC",
    ipAddress: "103.112.45.18",
    device: "Safari 17 (macOS Sonoma)",
    severity: "warning",
    status: "success",
    detailsPayload: {
      employeeId: "SW-0052 (Rohan Kulkarni)",
      oldGross: "₹ 45,000",
      newGross: "₹ 55,000",
      effectiveDate: "2026-12-01",
      approvedBy: "Director Office",
    },
  },
  {
    id: "aud-003",
    timestamp: "1 hr ago",
    exactTime: "2026-11-18 20:30:15 IST",
    actorName: "Manoj Kumar",
    actorEmail: "shreesairampaints.swift.in",
    actorRole: "Super Admin",
    action: "Configured Document Approval Workflow Matrix",
    category: "employees",
    targetModule: "Documentation / Approvals",
    ipAddress: "157.48.21.94",
    device: "Chrome 128 (Windows 11)",
    severity: "info",
    status: "success",
    detailsPayload: {
      workflowType: "Official Company Documents",
      signatoriesConfigured: ["HR Head", "Managing Director"],
      embeddedSignatures: true,
    },
  },
  {
    id: "aud-004",
    timestamp: "2 hrs ago",
    exactTime: "2026-11-18 19:45:22 IST",
    actorName: "Admin System",
    actorEmail: "system@creatons.ai",
    actorRole: "Automated Service",
    action: "Biometric Terminal Sync Completed (Chennai Unit)",
    category: "employees",
    targetModule: "Attendance / Hardware Bridge",
    ipAddress: "192.168.1.105",
    device: "Bridge Daemon v2.4",
    severity: "info",
    status: "success",
    detailsPayload: {
      terminalId: "BIO-CH-01",
      newPunchesPulled: 124,
      varianceResolved: 0,
    },
  },
  {
    id: "aud-005",
    timestamp: "4 hrs ago",
    exactTime: "2026-11-18 17:15:00 IST",
    actorName: "Manoj Kumar",
    actorEmail: "shreesairampaints.swift.in",
    actorRole: "Super Admin",
    action: "Admin Login Successful via Email / Password",
    category: "auth",
    targetModule: "Authentication",
    ipAddress: "157.48.21.94",
    device: "Chrome 128 (Windows 11)",
    severity: "info",
    status: "success",
    detailsPayload: {
      tenant: "shreesairampaints",
      method: "Password",
      mfaVerified: true,
    },
  },
  {
    id: "aud-006",
    timestamp: "6 hrs ago",
    exactTime: "2026-11-18 15:20:18 IST",
    actorName: "Kavita Rao",
    actorEmail: "kavita@swift.in",
    actorRole: "Branch Manager",
    action: "Approved Leave Request for SW-0104",
    category: "employees",
    targetModule: "Attendance / Leave",
    ipAddress: "103.88.19.4",
    device: "Chrome Mobile (Android 14)",
    severity: "info",
    status: "success",
    detailsPayload: {
      employee: "SW-0104 (Aakash Verma)",
      leaveType: "Casual Leave (1 day)",
      date: "2026-11-19",
    },
  },
  {
    id: "aud-007",
    timestamp: "Yesterday",
    exactTime: "2026-11-17 18:30:00 IST",
    actorName: "Manoj Kumar",
    actorEmail: "shreesairampaints.swift.in",
    actorRole: "Super Admin",
    action: "Purged Relieved Employees from Master Payroll View",
    category: "payroll",
    targetModule: "Payroll / Members",
    ipAddress: "157.48.21.94",
    device: "Chrome 128 (Windows 11)",
    severity: "critical",
    status: "success",
    detailsPayload: {
      recordsUpdated: 12,
      criterion: "Employment Status = Resigned / Terminated",
      reason: "ECR statutory discrepancy cleanup",
    },
  },
];

function AuditLogPage() {
  const [activeTab, setActiveTab] = useState<AuditCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    return AUDIT_EVENTS.filter((ev) => {
      const matchesTab = activeTab === "all" || ev.category === activeTab;
      const matchesSearch =
        ev.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.ipAddress.includes(searchQuery) ||
        ev.targetModule.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === "all" || ev.severity === severityFilter;
      return matchesTab && matchesSearch && matchesSeverity;
    });
  }, [activeTab, searchQuery, severityFilter]);

  const handleExportAudit = () => {
    toast.success("Audit Log Export Initiated", {
      description: "Downloaded encrypted audit trail (CSV format) for compliance records.",
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative min-h-[calc(100vh-10rem)]">
      <ComingSoonOverlay delayMs={700} />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Audit Log & System Activity</span>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold">
              Immutable Log
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Complete tamper-proof audit trail of administrative modifications, payroll disbursements, document approvals, and logins.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleExportAudit}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft cursor-pointer"
          >
            <Download className="h-4 w-4 mr-1.5" /> Export Audit Trail
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Logged Events Today</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">142</p>
          <span className="text-[11px] text-muted-foreground">Across all modules</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Critical Actions</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">4</p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Salary & member changes</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active Admin Actors</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">5</p>
          <span className="text-[11px] text-muted-foreground">Authenticated sessions</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Security Incidents</span>
            <Lock className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">0</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Zero breaches detected</span>
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
                layoutId="auditSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Activity className="h-4 w-4 shrink-0" />
              <span>All Logs ({AUDIT_EVENTS.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("auth")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "auth" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "auth" && (
              <motion.div
                layoutId="auditSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <KeyRound className="h-4 w-4 shrink-0" />
              <span>Authentication</span>
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
                layoutId="auditSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Banknote className="h-4 w-4 shrink-0" />
              <span>Payroll Changes</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "export" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "export" && (
              <motion.div
                layoutId="auditSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <DownloadCloud className="h-4 w-4 shrink-0" />
              <span>Exports & Downloads</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("employees")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "employees" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "employees" && (
              <motion.div
                layoutId="auditSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span>Employee Ops</span>
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
            placeholder="Search action, actor, IP address..."
            className="h-9 pl-9 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-9 w-full sm:w-40 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSeverityFilter("all");
            }}
            className="h-9 px-3 rounded-xl text-xs font-semibold"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Admin Actor</th>
                <th className="py-3.5 px-4">Action Event</th>
                <th className="py-3.5 px-4">Module Target</th>
                <th className="py-3.5 px-4">IP & Device</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <p className="font-semibold text-foreground text-xs">{ev.timestamp}</p>
                    <p className="text-[10px] text-muted-foreground">{ev.exactTime.split(" ")[1]}</p>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                        {ev.actorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{ev.actorName}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.actorRole}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 max-w-sm">
                    <p className="font-medium text-foreground text-xs">{ev.action}</p>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge variant="outline" className="text-[10px] font-semibold text-primary bg-primary/5">
                      {ev.targetModule}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <p className="font-mono text-[11px] text-foreground">{ev.ipAddress}</p>
                    <p className="text-[10px] text-muted-foreground">{ev.device}</p>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge
                      className={cn(
                        "text-[10px] font-semibold uppercase",
                        ev.severity === "info" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                        ev.severity === "warning" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                        ev.severity === "critical" && "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      )}
                    >
                      {ev.severity}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEvent(ev);
                        setDetailOpen(true);
                      }}
                      className="h-8 px-2.5 rounded-lg text-xs"
                      title="View Payload Details"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold uppercase",
                      selectedEvent.severity === "info" && "bg-blue-500/10 text-blue-600",
                      selectedEvent.severity === "warning" && "bg-amber-500/10 text-amber-600",
                      selectedEvent.severity === "critical" && "bg-rose-500/10 text-rose-600"
                    )}
                  >
                    {selectedEvent.severity}
                  </Badge>
                  <DialogTitle className="text-base font-bold">Audit Event Inspection</DialogTitle>
                </div>
                <DialogDescription className="text-xs">
                  Event ID: {selectedEvent.id} · Timestamp: {selectedEvent.exactTime}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Action:</span>
                    <span className="font-semibold text-foreground">{selectedEvent.action}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Actor:</span>
                    <span className="font-semibold text-foreground">{selectedEvent.actorName} ({selectedEvent.actorEmail})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Origin IP:</span>
                    <span className="font-mono text-foreground">{selectedEvent.ipAddress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">User Agent:</span>
                    <span className="text-muted-foreground">{selectedEvent.device}</span>
                  </div>
                </div>

                {selectedEvent.detailsPayload && (
                  <div className="space-y-1.5">
                    <p className="font-bold text-foreground text-xs">Event Payload Metadata:</p>
                    <pre className="p-3 rounded-xl bg-card border border-border font-mono text-[11px] overflow-x-auto text-foreground">
                      {JSON.stringify(selectedEvent.detailsPayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button size="sm" onClick={() => setDetailOpen(false)} className="text-xs font-bold bg-primary text-primary-foreground">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
