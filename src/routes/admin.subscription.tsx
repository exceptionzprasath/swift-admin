import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Layers,
  Receipt,
  Gauge,
  Check,
  CheckCircle2,
  Download,
  Calendar,
  Sparkles,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Users,
  HardDrive,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/subscription")({
  head: () => ({ meta: [{ title: "Subscription & Plan Management · CreatonsHR" }] }),
  component: SubscriptionPage,
});

type SubTab = "overview" | "plans" | "invoices" | "usage";

interface InvoiceRecord {
  id: string;
  invoiceNo: string;
  date: string;
  period: string;
  amount: string;
  paymentMethod: string;
  status: "paid" | "processing";
}

const INVOICE_HISTORY: InvoiceRecord[] = [
  {
    id: "inv-01",
    invoiceNo: "INV-2026-11-0941",
    date: "15 Nov 2026",
    period: "Annual Subscription (Nov 2026 – Nov 2027)",
    amount: "₹ 1,18,000",
    paymentMethod: "HDFC Corp Card ending in 4092",
    status: "paid",
  },
  {
    id: "inv-02",
    invoiceNo: "INV-2025-11-0422",
    date: "15 Nov 2025",
    period: "Annual Subscription (Nov 2025 – Nov 2026)",
    amount: "₹ 1,18,000",
    paymentMethod: "HDFC Corp Card ending in 4092",
    status: "paid",
  },
  {
    id: "inv-03",
    invoiceNo: "INV-2024-11-0189",
    date: "15 Nov 2024",
    period: "Annual Subscription (Nov 2024 – Nov 2025)",
    amount: "₹ 94,400",
    paymentMethod: "NEFT Wire Transfer",
    status: "paid",
  },
];

function SubscriptionPage() {
  const { company } = useStore();
  const [activeTab, setActiveTab] = useState<SubTab>("overview");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleDownloadInvoice = (inv: InvoiceRecord) => {
    toast.success(`Downloaded Tax Invoice ${inv.invoiceNo}`, {
      description: "GST tax invoice with GSTIN & input credit details ready.",
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Subscription & Billing</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              Enterprise Plus Tier
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your CreatonsHR license, employee seat quotas, automated cloud backup storage, and invoice downloads.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setPaymentModalOpen(true)}
            variant="outline"
            className="h-9 px-4 rounded-xl text-xs font-semibold bg-card border-border hover:bg-muted"
          >
            <CreditCard className="h-4 w-4 mr-1.5" /> Payment Method
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("plans")}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft cursor-pointer"
          >
            <Sparkles className="h-4 w-4 mr-1.5" /> Upgrade Seats
          </Button>
        </div>
      </div>

      {/* Current Plan Hero Banner */}
      <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Badge className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1">
                Active License
              </Badge>
              <span className="text-xs text-muted-foreground">Tenant: {company.name || "Shree Sairam Paints"}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground mt-1">
              CreatonsHR Enterprise Plus (Annual)
            </h2>
            <p className="text-xs text-muted-foreground">
              All 18 core HR, payroll statutory studio, biometrics hardware bridge, and AI copilot features unlocked.
            </p>
          </div>

          <div className="text-left md:text-right shrink-0">
            <span className="text-xs text-muted-foreground">Next Renewal Date</span>
            <p className="text-lg font-bold text-foreground flex items-center md:justify-end gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <span>15 Nov 2027</span>
            </p>
            <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 mt-1">
              Auto-Renew Enabled
            </Badge>
          </div>
        </div>

        {/* Quotas & Capacity Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
          <div className="p-4 rounded-2xl bg-card/80 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Employee Seats
              </span>
              <span className="text-muted-foreground font-mono">48 / 100 Seats</span>
            </div>
            <Progress value={48} className="h-2" />
            <span className="text-[10px] text-muted-foreground">52 additional seats available without upgrade</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-emerald-500" /> Document Vault Storage
              </span>
              <span className="text-muted-foreground font-mono">14.2 GB / 50 GB</span>
            </div>
            <Progress value={28.4} className="h-2" />
            <span className="text-[10px] text-muted-foreground">Encrypted AWS S3 compliance vault</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/80 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-amber-500" /> AI Copilot Credits
              </span>
              <span className="text-muted-foreground font-mono">82% Remaining</span>
            </div>
            <Progress value={82} className="h-2" />
            <span className="text-[10px] text-muted-foreground">Autonomous lifecycle & compliance prompts</span>
          </div>
        </div>
      </div>

      {/* Top Frosted Capsule Tab Bar (Left-aligned) */}
      <div className="flex items-center justify-start gap-4 flex-wrap pb-1">
        <div className="inline-flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5 rounded-full border border-border/60 bg-card/75 dark:bg-card/50 backdrop-blur-xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "overview" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "overview" && (
              <motion.div
                layoutId="subscriptionSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>Plan Overview</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "plans" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "plans" && (
              <motion.div
                layoutId="subscriptionSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0" />
              <span>Available Tiers</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "invoices" ? "text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "invoices" && (
              <motion.div
                layoutId="subscriptionSectionActivePill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Receipt className="h-4 w-4 shrink-0" />
              <span>Invoices & Billing History ({INVOICE_HISTORY.length})</span>
            </span>
          </button>
        </div>
      </div>

      {/* Tier Plans View */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Starter Plan */}
          <div className="rounded-3xl border border-border bg-card p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Starter Tier</h3>
                <p className="text-xs text-muted-foreground mt-1">For small teams up to 25 employees</p>
              </div>
              <div>
                <span className="text-3xl font-black text-foreground">₹ 49</span>
                <span className="text-xs text-muted-foreground"> / employee / month</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Basic Attendance & Leave</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Standard Salary Slips</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> 5 GB Document Vault</li>
                <li className="flex items-center gap-2 text-muted-foreground/60 line-through">Biometric Terminal Bridge</li>
                <li className="flex items-center gap-2 text-muted-foreground/60 line-through">Autonomous AI Copilot</li>
              </ul>
            </div>
            <Button variant="outline" className="w-full text-xs font-semibold">Select Starter</Button>
          </div>

          {/* Professional Plan */}
          <div className="rounded-3xl border border-border bg-card p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Professional</h3>
                <p className="text-xs text-muted-foreground mt-1">For growing businesses up to 75 staff</p>
              </div>
              <div>
                <span className="text-3xl font-black text-foreground">₹ 89</span>
                <span className="text-xs text-muted-foreground"> / employee / month</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Everything in Starter</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> EPFO ECR & ESIC Returns</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Biometric Hardware Bridge</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Multi-Level Approval Workflows</li>
                <li className="flex items-center gap-2 text-muted-foreground/60 line-through">Custom Statutory AI Engine</li>
              </ul>
            </div>
            <Button variant="outline" className="w-full text-xs font-semibold">Switch to Pro</Button>
          </div>

          {/* Enterprise Plus (Current) */}
          <div className="rounded-3xl border-2 border-primary bg-primary/5 p-6 space-y-6 flex flex-col justify-between relative shadow-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Enterprise Plus</h3>
                  <p className="text-xs text-muted-foreground mt-1">Full compliance & multi-branch scale</p>
                </div>
                <Badge className="bg-primary text-primary-foreground text-[10px]">Current Plan</Badge>
              </div>
              <div>
                <span className="text-3xl font-black text-foreground">Custom</span>
                <span className="text-xs text-muted-foreground"> / annual SLA</span>
              </div>
              <ul className="space-y-2 text-xs text-foreground font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited Branches & Multi-Entity</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Autonomous AI Copilot & Radar</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 50 GB Encrypted Compliance Vault</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Dedicated Account Manager & 24/7 SLA</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Custom Legal Template Signatories</li>
              </ul>
            </div>
            <Button disabled className="w-full text-xs font-bold bg-primary text-primary-foreground opacity-90">
              Active Plan
            </Button>
          </div>
        </div>
      )}

      {/* Invoices View */}
      {(activeTab === "overview" || activeTab === "invoices") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <span>Tax Invoices & Billing Statements</span>
            </h3>
            <span className="text-xs text-muted-foreground">GST compliant B2B tax receipts with HSN code 998314</span>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Billing Date</th>
                  <th className="py-3.5 px-4">Plan Period</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {INVOICE_HISTORY.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">{inv.invoiceNo}</td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{inv.date}</td>
                    <td className="py-3.5 px-4 font-medium text-foreground">{inv.period}</td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{inv.paymentMethod}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground whitespace-nowrap">{inv.amount}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] capitalize">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadInvoice(inv)}
                        className="h-8 px-2.5 text-xs text-primary font-semibold hover:bg-primary/10"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Method Dialog */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Update Corporate Billing Method</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Primary payment method used for auto-debit of subscription renewal and seat increments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-bold text-foreground">HDFC Corporate Credit Card</p>
                  <p className="text-[11px] text-muted-foreground font-mono">•••• •••• •••• 4092 · Exp 08/29</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Default
              </Badge>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Cardholder Name</label>
              <Input defaultValue="SHREE SAIRAM PAINTS PVT LTD" className="h-9 text-xs uppercase" />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Corporate GSTIN</label>
              <Input defaultValue="33AABCS1429B1Z4" className="h-9 text-xs font-mono uppercase" />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Billing Contact Email</label>
              <Input defaultValue="shreesairampaints.swift.in" className="h-9 text-xs" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success("Billing profile updated successfully");
                setPaymentModalOpen(false);
              }}
              className="text-xs font-bold bg-primary text-primary-foreground"
            >
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
