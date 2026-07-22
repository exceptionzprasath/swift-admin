import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBilling } from "@/lib/billing-store";
import { useSubscriptionContext } from "@/components/feature-gate";
import {
  ALL_MODULES, FEATURE_KEYS, aiSubscriptionRecommendations, calcPlanPrice,
  resolveLimit, resolveModuleStatus, usagePct, type PaymentMethod, type PlanLimits,
} from "@/lib/billing";
import { useStore } from "@/lib/store";
import { useSuperAdmin } from "@/lib/super-admin-store";
import { UpiQR } from "@/components/upi-qr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, CreditCard, Gift, Receipt, Copy, TrendingUp, ArrowDownCircle, Ticket, Users, QrCode, Upload, Clock, CheckCircle2, XCircle } from "lucide-react";


export const Route = createFileRoute("/admin/subscription")({
  head: () => ({ meta: [{ title: "Subscription · SWIFT" }] }),
  component: SubscriptionPage,
});

const PAYMENT_METHODS: PaymentMethod[] = ["razorpay", "cashfree", "phonepe", "stripe", "paypal", "upi", "bank_transfer", "cheque", "offline"];

const LIMIT_META: { key: keyof PlanLimits; label: string; usageKey?: keyof import("@/lib/billing").UsageCounters }[] = [
  { key: "employees", label: "Employees", usageKey: "employees" },
  { key: "branches", label: "Branches", usageKey: "branches" },
  { key: "hrUsers", label: "HR Users", usageKey: "hrUsers" },
  { key: "adminUsers", label: "Admin Users", usageKey: "adminUsers" },
  { key: "storageMB", label: "Storage (MB)", usageKey: "storageMB" },
  { key: "aiCredits", label: "AI Credits", usageKey: "aiCredits" },
  { key: "smsCredits", label: "SMS", usageKey: "smsCredits" },
  { key: "emailCredits", label: "Email", usageKey: "emailCredits" },
  { key: "whatsappCredits", label: "WhatsApp", usageKey: "whatsappCredits" },
  { key: "pdfDownloads", label: "PDF Downloads", usageKey: "pdfDownloads" },
  { key: "apiCalls", label: "API Calls", usageKey: "apiCalls" },
  { key: "notifications", label: "Notifications", usageKey: "notifications" },
];

function SubscriptionPage() {
  const { tenantId, plan, sub } = useSubscriptionContext();
  const { plans, coupons, invoices, referrals, upgrade, downgrade, renew, markInvoicePaid, updateSubscription } = useBilling();
  const employees = useStore((s) => s.employees).length || 1;
  const companyName = useStore((s) => s.company.name);
  const { upi, paymentSubmissions, submitPayment } = useSuperAdmin();
  const [couponCode, setCouponCode] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [immediate, setImmediate] = useState(true);
  const [openUpgrade, setOpenUpgrade] = useState(false);
  const [payFor, setPayFor] = useState<import("@/lib/billing").Invoice | null>(null);
  const [payForm, setPayForm] = useState({ utr: "", payerName: "", payerContact: "", note: "", screenshot: "" });

  const tenantInvoices = useMemo(() => invoices.filter((i) => i.tenantId === tenantId), [invoices, tenantId]);
  const mySubmissions = useMemo(() => paymentSubmissions.filter((p) => p.tenantId === tenantId), [paymentSubmissions, tenantId]);
  const submissionFor = (invId: string) => mySubmissions.find((p) => p.invoiceId === invId && p.status !== "rejected");
  const ref = referrals.find((r) => r.tenantId === tenantId);
  const tips = aiSubscriptionRecommendations(plan, sub);
  const daysLeft = Math.max(0, Math.round((Date.parse(sub.expiresAt) - Date.now()) / 86400_000));

  const openPay = (inv: import("@/lib/billing").Invoice) => {
    setPayFor(inv);
    setPayForm({ utr: "", payerName: "", payerContact: "", note: `Invoice ${inv.number}`, screenshot: "" });
  };
  const onShot = (f: File | null) => {
    if (!f) return;
    if (f.size > 3_000_000) return toast.error("Screenshot must be under 3 MB");
    const r = new FileReader(); r.onload = () => setPayForm((p) => ({ ...p, screenshot: String(r.result) })); r.readAsDataURL(f);
  };
  const submit = () => {
    if (!payFor) return;
    if (!payForm.screenshot) return toast.error("Upload the payment screenshot");
    if (!payForm.utr.trim()) return toast.error("Enter the UTR / transaction reference");
    submitPayment({
      tenantId, tenantName: companyName, invoiceId: payFor.id, invoiceNumber: payFor.number,
      amount: payFor.total, utr: payForm.utr.trim(), payerName: payForm.payerName.trim(),
      payerContact: payForm.payerContact.trim(), note: payForm.note.trim(), screenshotDataUrl: payForm.screenshot,
    });
    toast.success("Sent for verification. You'll be notified after Super Admin approves.");
    setPayFor(null);
  };


  const doUpgrade = (method?: PaymentMethod) => {
    if (!selectedPlanId) return toast.error("Pick a plan");
    const inv = upgrade(sub.id, selectedPlanId, employees, { immediate, couponCode: couponCode || undefined, paymentMethod: method, actor: "admin" });
    if (inv) { toast.success(`Invoice ${inv.number} created · ₹${inv.total.toLocaleString()}`); setOpenUpgrade(false); }
  };

  const doRenew = () => {
    const inv = renew(sub.id, employees, { couponCode: couponCode || undefined, paymentMethod: "razorpay", actor: "admin" });
    if (inv) toast.success(`Renewed. Invoice ${inv.number} · ₹${inv.total.toLocaleString()}`);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold">Subscription & Billing</h1>
        <p className="text-sm text-muted-foreground">Everything about your SWIFT plan, usage, invoices, coupons and referrals.</p>
      </div>

      {tips.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 font-medium text-primary mb-2"><Sparkles className="h-4 w-4" /> SWIFT AI recommendations</div>
          <ul className="text-sm space-y-1 list-disc pl-5">{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><TrendingUp className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="plans"><CreditCard className="h-4 w-4 mr-1" />Plans</TabsTrigger>
          <TabsTrigger value="usage"><Users className="h-4 w-4 mr-1" />Usage</TabsTrigger>
          <TabsTrigger value="modules">Modules & Features</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="h-4 w-4 mr-1" />Invoices</TabsTrigger>
          <TabsTrigger value="coupons"><Ticket className="h-4 w-4 mr-1" />Coupons</TabsTrigger>
          <TabsTrigger value="referrals"><Gift className="h-4 w-4 mr-1" />Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <div className="text-xs text-muted-foreground">Current plan</div>
              <div className="text-2xl font-display font-semibold mt-1">{plan.name}</div>
              <Badge className="mt-2" variant="outline">{sub.status}</Badge>
              <div className="text-xs text-muted-foreground mt-3">Cycle: {plan.cycle}</div>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <div className="text-xs text-muted-foreground">Renews in</div>
              <div className="text-2xl font-display font-semibold mt-1">{daysLeft} days</div>
              <div className="text-xs text-muted-foreground mt-2">{new Date(sub.expiresAt).toLocaleDateString()}</div>
              <Button size="sm" className="mt-3 w-full" onClick={doRenew}>Renew now</Button>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <div className="text-xs text-muted-foreground">Payment status</div>
              <div className="text-2xl font-display font-semibold mt-1 capitalize">{sub.paymentStatus}</div>
              <div className="text-xs text-muted-foreground mt-2">Estimated next bill: ₹{calcPlanPrice(plan, employees).toLocaleString()}</div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-card">
            <div className="font-medium mb-3">Renewal reminders</div>
            <div className="flex flex-wrap gap-3 text-sm">
              {(["email", "sms", "whatsapp", "push", "banner"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={sub.reminderChannels[k]} onChange={(e) => updateSubscription(sub.id, { reminderChannels: { ...sub.reminderChannels, [k]: e.target.checked } })} />
                  <span className="capitalize">{k}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">We remind you 30, 15, 7, 3, 1 days before renewal and on renewal day + grace period.</p>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.filter((p) => p.active).map((p) => {
              const isCurrent = p.id === plan.id;
              const price = calcPlanPrice(p, employees);
              return (
                <div key={p.id} className={`rounded-xl border p-4 flex flex-col ${isCurrent ? "border-primary bg-primary/5" : "bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-display font-semibold">{p.name}</div>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                  <div className="mt-3 text-2xl font-semibold">₹{price.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/{p.cycle}</span></div>
                  <div className="text-xs text-muted-foreground">GST {p.gstPct}% extra</div>
                  <ul className="text-xs mt-3 space-y-1 flex-1">
                    <li>Employees: {p.limits.employees === -1 ? "Unlimited" : p.limits.employees}</li>
                    <li>Branches: {p.limits.branches === -1 ? "Unlimited" : p.limits.branches}</li>
                    <li>AI credits: {p.limits.aiCredits === -1 ? "Unlimited" : p.limits.aiCredits}</li>
                    <li>Storage: {p.limits.storageMB === -1 ? "Unlimited" : `${p.limits.storageMB} MB`}</li>
                  </ul>
                  {!isCurrent && (
                    <div className="mt-3 flex gap-2">
                      <Dialog open={openUpgrade && selectedPlanId === p.id} onOpenChange={(o) => { setOpenUpgrade(o); if (o) setSelectedPlanId(p.id); }}>
                        <DialogTrigger asChild><Button size="sm" className="flex-1 bg-gradient-brand text-white">Switch</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Switch to {p.name}</DialogTitle></DialogHeader>
                          <div className="space-y-3 text-sm">
                            <div>Estimated total (pro-rated + GST) will appear on the invoice.</div>
                            <div><Label>Coupon</Label><Input placeholder="Optional" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} /></div>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} />Activate immediately (else from next cycle)</label>
                          </div>
                          <DialogFooter className="flex-wrap gap-2">
                            <Button variant="outline" onClick={() => { downgrade(sub.id, p.id, "admin"); toast.success("Plan changed. Premium features locked; data retained."); setOpenUpgrade(false); }}>
                              <ArrowDownCircle className="h-4 w-4 mr-2" />Downgrade (no charge)
                            </Button>
                            {PAYMENT_METHODS.slice(0, 3).map((m) => (
                              <Button key={m} onClick={() => doUpgrade(m)} className="capitalize">{m}</Button>
                            ))}
                            <Button variant="secondary" onClick={() => doUpgrade()}>Create invoice</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            {LIMIT_META.map((m) => {
              const limit = resolveLimit(plan, sub, m.key);
              const usageKey = (m.usageKey ?? (m.key as unknown as keyof import("@/lib/billing").UsageCounters));
              const used = (sub.usage[usageKey] as number) ?? 0;
              const pct = usagePct(used, limit);
              return (
                <div key={m.key} className="rounded-lg border bg-card p-4">
                  <div className="flex justify-between text-sm"><span>{m.label}</span><span className="font-medium">{used.toLocaleString()} / {limit === -1 ? "∞" : limit.toLocaleString()}</span></div>
                  <Progress value={pct} className="mt-2 h-2" />
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="font-medium mb-3">Modules on your plan</div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_MODULES.map((m) => {
                const st = resolveModuleStatus(plan, sub, m.key);
                const color = st === "enabled" ? "text-success" : st === "trial" ? "text-primary" : st === "locked" || st === "expired" || st === "disabled" ? "text-muted-foreground" : "text-amber-600";
                return (
                  <div key={m.key} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                    <span>{m.label}</span>
                    <span className={`text-xs capitalize ${color}`}>{st.replace("_", " ")}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="font-medium mb-3">Feature flags</div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {FEATURE_KEYS.map((f) => {
                const on = (f.key in sub.featureOverrides) ? sub.featureOverrides[f.key] : plan.featureFlags[f.key];
                return (
                  <div key={f.key} className="flex items-center justify-between border rounded px-3 py-2">
                    <span>{f.label}</span>
                    <Badge variant={on ? "default" : "outline"} className="text-xs">{on ? "On" : "Off"}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <QrCode className="h-6 w-6 text-primary shrink-0" />
            <div className="text-sm flex-1">
              <div className="font-medium">Pay via UPI QR</div>
              <div className="text-xs text-muted-foreground">Scan the QR on any unpaid invoice, then upload the payment screenshot. Super Admin verifies and activates immediately.</div>
            </div>
          </div>
          {tenantInvoices.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No invoices yet.</div>
          ) : tenantInvoices.map((inv) => {
            const sub = submissionFor(inv.id);
            return (
              <div key={inv.id} className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium flex flex-wrap items-center gap-2">{inv.number} <Badge variant="outline" className="text-xs capitalize">{inv.kind}</Badge>
                    {sub && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {sub.status === "pending" ? <Clock className="h-3 w-3 mr-1" /> : sub.status === "verified" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {sub.status === "pending" ? "Awaiting verification" : sub.status}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(inv.issueDate).toLocaleDateString()} · {inv.lines.length} lines · {inv.couponCode ? `Coupon ${inv.couponCode}` : "No coupon"}</div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <div className="font-semibold">₹{inv.total.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">GST ₹{inv.gst.toLocaleString()}</div>
                    <Badge variant={inv.status === "paid" ? "default" : "outline"} className="mt-1 capitalize">{inv.status}</Badge>
                  </div>
                  {inv.status !== "paid" && !sub && (
                    <Button size="sm" onClick={() => openPay(inv)} className="bg-gradient-brand text-white"><QrCode className="h-4 w-4 mr-1" />Pay via UPI</Button>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>


        <TabsContent value="coupons" className="space-y-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="font-medium mb-2">Available coupons</div>
            <div className="grid md:grid-cols-2 gap-2">
              {coupons.filter((c) => c.active).map((c) => (
                <div key={c.id} className="border rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <div className="font-mono font-semibold">{c.code}</div>
                    <div className="text-xs text-muted-foreground capitalize">{c.kind} · {c.value}{c.kind === "percent" ? "%" : ""} · {c.maxUses === -1 ? "unlimited" : `${c.maxUses - c.used} left`}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setCouponCode(c.code); toast.success(`Coupon ${c.code} ready — apply on Plans → Switch`); }}>Use</Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-3">
          <div className="rounded-xl border bg-card p-5">
            <div className="text-xs text-muted-foreground">Your referral code</div>
            <div className="flex items-center gap-2 mt-1">
              <code className="font-mono text-xl font-semibold">{ref?.code ?? "—"}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(ref?.code ?? ""); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Share link: <code>https://swift.app/r/{ref?.code}</code></div>
            <div className="grid grid-cols-4 gap-3 mt-4 text-center">
              {(["invited", "registered", "activated", "paid"] as const).map((k) => (
                <div key={k} className="border rounded-lg p-3">
                  <div className="text-2xl font-semibold">{ref?.[k].length ?? 0}</div>
                  <div className="text-xs text-muted-foreground capitalize">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />Pay Invoice {payFor?.number}</DialogTitle></DialogHeader>
          {payFor && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 rounded-xl border p-4 bg-muted/30">
                <UpiQR upiId={upi.upiId} payeeName={upi.payeeName} amount={payFor.total} note={`INV ${payFor.number}`} merchantCode={upi.merchantCode} overrideImage={upi.qrImageDataUrl} />
                <div className="text-center">
                  <div className="text-2xl font-semibold">₹{payFor.total.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">To <span className="font-medium">{upi.payeeName}</span> · <button className="underline" onClick={() => { navigator.clipboard.writeText(upi.upiId); toast.success("UPI ID copied"); }}>{upi.upiId} <Copy className="h-3 w-3 inline" /></button></div>
                </div>
                <p className="text-xs text-muted-foreground text-center">{upi.instructions}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Label>UTR / Transaction reference *</Label><Input value={payForm.utr} onChange={(e) => setPayForm({ ...payForm, utr: e.target.value })} placeholder="12-digit UPI reference from your app" /></div>
                <div><Label>Payer name</Label><Input value={payForm.payerName} onChange={(e) => setPayForm({ ...payForm, payerName: e.target.value })} /></div>
                <div><Label>Contact</Label><Input value={payForm.payerContact} onChange={(e) => setPayForm({ ...payForm, payerContact: e.target.value })} placeholder="Phone or email" /></div>
                <div className="sm:col-span-2"><Label>Note</Label><Textarea rows={2} value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} /></div>
              </div>

              <div>
                <Label>Screenshot of successful payment *</Label>
                <label className="mt-1 block cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onShot(e.target.files?.[0] ?? null)} />
                  {payForm.screenshot ? (
                    <img src={payForm.screenshot} alt="Screenshot" className="w-full rounded-lg border object-contain max-h-64" />
                  ) : (
                    <div className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted/50">
                      <Upload className="h-6 w-6 mx-auto mb-1" />Tap to upload / capture screenshot
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button className="w-full sm:w-auto bg-gradient-brand text-white" onClick={submit}><Upload className="h-4 w-4 mr-1" />Submit for verification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

