import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BellRing,
  CalendarClock,
  Building,
  ShieldCheck,
  FileCode,
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Building2,
  Edit2,
  Upload,
  RefreshCw,
  ExternalLink,
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

export const Route = createFileRoute("/admin/renewals")({
  head: () => ({ meta: [{ title: "Renewal Scheduler · CreatonsHR" }] }),
  component: RenewalsPage,
});

type RenewalCategory = "all" | "licenses" | "insurance" | "amc" | "legal";

interface RenewalRecord {
  id: string;
  title: string;
  category: "licenses" | "insurance" | "amc" | "legal";
  issuingAuthorityOrVendor: string;
  expiryDate: string;
  daysLeft: number;
  estimatedFee: string;
  assignedOwner: string;
  status: "urgent" | "approaching" | "healthy" | "renewed";
  autoAlertSchedule: string;
}

const RENEWAL_ITEMS: RenewalRecord[] = [
  {
    id: "ren-01",
    title: "Fire Safety NOC & Inspection Clearance",
    category: "licenses",
    issuingAuthorityOrVendor: "Tamil Nadu Fire & Rescue Services",
    expiryDate: "2026-11-30",
    daysLeft: 12,
    estimatedFee: "₹ 15,000",
    assignedOwner: "Kailash Patel (Plant Head)",
    status: "urgent",
    autoAlertSchedule: "60d, 30d, 15d, 7d",
  },
  {
    id: "ren-02",
    title: "Group Mediclaim Insurance Policy (GMC - 100 Lives)",
    category: "insurance",
    issuingAuthorityOrVendor: "ICICI Lombard General Insurance",
    expiryDate: "2026-12-15",
    daysLeft: 27,
    estimatedFee: "₹ 3,45,000",
    assignedOwner: "Priya Sundaram (HR Head)",
    status: "urgent",
    autoAlertSchedule: "60d, 30d, 15d, 7d",
  },
  {
    id: "ren-03",
    title: "ZKTeco Biometric Terminals Annual Maintenance (AMC)",
    category: "amc",
    issuingAuthorityOrVendor: "SecureTech Hardware Systems",
    expiryDate: "2027-01-10",
    daysLeft: 53,
    estimatedFee: "₹ 24,000",
    assignedOwner: "IT Operations Admin",
    status: "approaching",
    autoAlertSchedule: "30d, 15d, 7d",
  },
  {
    id: "ren-04",
    title: "Pollution Control Board (PCB) Consent to Operate",
    category: "licenses",
    issuingAuthorityOrVendor: "State Pollution Control Board",
    expiryDate: "2027-02-28",
    daysLeft: 102,
    estimatedFee: "₹ 48,000",
    assignedOwner: "Kailash Patel (Plant Head)",
    status: "healthy",
    autoAlertSchedule: "90d, 60d, 30d",
  },
  {
    id: "ren-05",
    title: "Workmen Compensation (WC) Commercial Policy",
    category: "insurance",
    issuingAuthorityOrVendor: "New India Assurance Co. Ltd",
    expiryDate: "2027-03-31",
    daysLeft: 133,
    estimatedFee: "₹ 82,000",
    assignedOwner: "Priya Sundaram (HR Head)",
    status: "healthy",
    autoAlertSchedule: "60d, 30d, 15d",
  },
  {
    id: "ren-06",
    title: "Corporate SSL Wildcard & Cloud Domain Bundle",
    category: "legal",
    issuingAuthorityOrVendor: "Cloudflare & DigiCert",
    expiryDate: "2027-04-15",
    daysLeft: 148,
    estimatedFee: "₹ 18,500",
    assignedOwner: "DevOps Lead",
    status: "healthy",
    autoAlertSchedule: "30d, 15d, 7d",
  },
];

function RenewalsPage() {
  const [activeTab, setActiveTab] = useState<RenewalCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<RenewalRecord | null>(null);
  const [renewModalOpen, setRenewModalOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newVendor, setNewVendor] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newOwner, setNewOwner] = useState("HR Head (Priya Sundaram)");

  const filteredItems = useMemo(() => {
    return RENEWAL_ITEMS.filter((item) => {
      const matchesTab = activeTab === "all" || item.category === activeTab;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.issuingAuthorityOrVendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assignedOwner.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  const stats = useMemo(() => {
    const total = RENEWAL_ITEMS.length;
    const urgent = RENEWAL_ITEMS.filter((i) => i.daysLeft <= 30).length;
    const approaching = RENEWAL_ITEMS.filter((i) => i.daysLeft > 30 && i.daysLeft <= 90).length;
    const healthy = RENEWAL_ITEMS.filter((i) => i.daysLeft > 90).length;
    return { total, urgent, approaching, healthy };
  }, []);

  const handleConfirmRenewal = () => {
    if (!renewTarget) return;
    toast.success(`Marked ${renewTarget.title} as Renewed`, {
      description: "Next expiry milestone extended by 1 year. Alert triggers rescheduled.",
    });
    setRenewModalOpen(false);
    setRenewTarget(null);
  };

  const handleAddNewItem = () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a renewal title");
      return;
    }
    toast.success(`Scheduled ${newTitle} for tracking`, {
      description: `Automated email and push reminders configured for ${newOwner}.`,
    });
    setNewModalOpen(false);
    setNewTitle("");
    setNewVendor("");
    setNewExpiry("");
    setNewFee("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Renewal Scheduler</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              Proactive Alert Engine
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track and automate deadlines for establishment licenses, statutory insurance, fire safety NOCs, and vendor AMC contracts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Schedule Renewal
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Monitored Items</span>
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <span className="text-[11px] text-muted-foreground">Across all operations</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Critical (&le; 30 Days)</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.urgent}</p>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Immediate renewal required</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Approaching (30–90d)</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.approaching}</p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Quotes requested</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Healthy (&gt; 90 Days)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.healthy}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Safe validity</span>
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
                layoutId="renewalsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0" />
              <span>All Renewals ({stats.total})</span>
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
                layoutId="renewalsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Building className="h-4 w-4 shrink-0" />
              <span>Statutory Licenses</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("insurance")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "insurance" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "insurance" && (
              <motion.div
                layoutId="renewalsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Policies & Insurance</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("amc")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "amc" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "amc" && (
              <motion.div
                layoutId="renewalsSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <FileCode className="h-4 w-4 shrink-0" />
              <span>Hardware & SaaS AMC</span>
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
            placeholder="Search renewal item, authority, owner..."
            className="h-9 pl-9 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BellRing className="h-4 w-4 text-primary" />
          <span>Automated email notifications sent to compliance owners before expiry</span>
        </div>
      </div>

      {/* Renewals Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Contract / License Item</th>
                <th className="py-3.5 px-4">Issuing Authority / Vendor</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Days Left</th>
                <th className="py-3.5 px-4">Est. Renewal Fee</th>
                <th className="py-3.5 px-4">Assigned Owner</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-foreground text-xs">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">Category: {item.category}</p>
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground">
                    {item.issuingAuthorityOrVendor}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                    {item.expiryDate}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge
                      className={cn(
                        "text-[10px] font-semibold",
                        item.daysLeft <= 30 && "bg-rose-500/10 text-rose-600 border-rose-500/20",
                        item.daysLeft > 30 && item.daysLeft <= 90 && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                        item.daysLeft > 90 && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      )}
                    >
                      {item.daysLeft} days left
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                    {item.estimatedFee}
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                    {item.assignedOwner}
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => {
                          setRenewTarget(item);
                          setRenewModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Mark Renewed
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Renewed Dialog */}
      <Dialog open={renewModalOpen} onOpenChange={setRenewModalOpen}>
        <DialogContent className="max-w-md">
          {renewTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Record Renewal Confirmation</DialogTitle>
                <DialogDescription className="text-xs">
                  Update validity for {renewTarget.title} and upload renewed certificate.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-1">
                  <p className="font-semibold text-foreground">{renewTarget.title}</p>
                  <p className="text-muted-foreground">Authority: {renewTarget.issuingAuthorityOrVendor}</p>
                  <p className="text-muted-foreground">Previous Expiry: {renewTarget.expiryDate}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">New Valid Until Date</label>
                  <Input type="date" defaultValue="2027-11-30" className="h-9 text-xs" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Actual Renewal Fee Paid</label>
                  <Input defaultValue={renewTarget.estimatedFee} className="h-9 text-xs font-mono" />
                </div>

                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-muted-foreground hover:bg-muted/40 transition-colors cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto text-primary mb-1" />
                  <p className="font-medium text-foreground text-xs">Attach Receipt / Certificate (PDF)</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setRenewModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmRenewal} className="text-xs font-bold bg-primary text-primary-foreground">
                  Confirm & Extend
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule New Renewal Modal */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Schedule New Renewal Item</DialogTitle>
            <DialogDescription className="text-xs">
              Configure alert cadences and track renewal deadlines for legal or operations items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Item Name</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Lift Safety Inspection Certificate..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Issuing Authority / Agency</label>
              <Input
                value={newVendor}
                onChange={(e) => setNewVendor(e.target.value)}
                placeholder="e.g. Inspectorate of Lifts..."
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Expiry Date</label>
                <Input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Estimated Fee</label>
                <Input
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  placeholder="₹ 20,000"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Responsible Owner</label>
              <Input
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddNewItem} className="text-xs font-bold bg-primary text-primary-foreground">
              Save & Track
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
