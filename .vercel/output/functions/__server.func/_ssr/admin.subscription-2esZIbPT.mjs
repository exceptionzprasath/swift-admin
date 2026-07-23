import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { At as Copy, Ft as CircleCheck, I as QrCode, It as CircleArrowDown, P as Receipt, Pt as CircleX, g as Ticket, jt as Clock, kt as CreditCard, l as Upload, o as Users, p as TrendingUp, vt as Gift, y as Sparkles } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { t as require_lib } from "../_libs/qrcode.mjs";
import { a as resolveLimit, c as useBilling, i as calcPlanPrice, n as FEATURE_KEYS, o as resolveModuleStatus, r as aiSubscriptionRecommendations, s as usagePct, t as ALL_MODULES } from "./billing-store-CiCO_-nX.mjs";
import { t as useSuperAdmin } from "./super-admin-store-DqYK3rMv.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-CiapfthD.mjs";
import { t as Progress } from "./progress-Crx1Tb8I.mjs";
import { t as useSubscriptionContext } from "./feature-gate-DT1k671E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.subscription-2esZIbPT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
function buildUpiUri(opts) {
	const p = new URLSearchParams();
	p.set("pa", opts.upiId);
	p.set("pn", opts.payeeName);
	if (opts.amount && opts.amount > 0) p.set("am", opts.amount.toFixed(2));
	p.set("cu", "INR");
	if (opts.note) p.set("tn", opts.note.slice(0, 50));
	if (opts.merchantCode) p.set("mc", opts.merchantCode);
	return `upi://pay?${p.toString()}`;
}
function UpiQR({ upiId, payeeName, amount, note, merchantCode, overrideImage, size = 220 }) {
	const [dataUrl, setDataUrl] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (overrideImage) {
			setDataUrl(overrideImage);
			return;
		}
		const uri = buildUpiUri({
			upiId,
			payeeName,
			amount,
			note,
			merchantCode
		});
		import_lib.toDataURL(uri, {
			width: size,
			margin: 1,
			errorCorrectionLevel: "M"
		}).then(setDataUrl).catch(() => setDataUrl(""));
	}, [
		upiId,
		payeeName,
		amount,
		note,
		merchantCode,
		overrideImage,
		size
	]);
	if (!dataUrl) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: {
			width: size,
			height: size
		},
		className: "rounded-lg bg-muted animate-pulse"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: dataUrl,
		alt: "UPI QR",
		width: size,
		height: size,
		className: "rounded-lg border bg-white p-2"
	});
}
var PAYMENT_METHODS = [
	"razorpay",
	"cashfree",
	"phonepe",
	"stripe",
	"paypal",
	"upi",
	"bank_transfer",
	"cheque",
	"offline"
];
var LIMIT_META = [
	{
		key: "employees",
		label: "Employees",
		usageKey: "employees"
	},
	{
		key: "branches",
		label: "Branches",
		usageKey: "branches"
	},
	{
		key: "hrUsers",
		label: "HR Users",
		usageKey: "hrUsers"
	},
	{
		key: "adminUsers",
		label: "Admin Users",
		usageKey: "adminUsers"
	},
	{
		key: "storageMB",
		label: "Storage (MB)",
		usageKey: "storageMB"
	},
	{
		key: "aiCredits",
		label: "AI Credits",
		usageKey: "aiCredits"
	},
	{
		key: "smsCredits",
		label: "SMS",
		usageKey: "smsCredits"
	},
	{
		key: "emailCredits",
		label: "Email",
		usageKey: "emailCredits"
	},
	{
		key: "whatsappCredits",
		label: "WhatsApp",
		usageKey: "whatsappCredits"
	},
	{
		key: "pdfDownloads",
		label: "PDF Downloads",
		usageKey: "pdfDownloads"
	},
	{
		key: "apiCalls",
		label: "API Calls",
		usageKey: "apiCalls"
	},
	{
		key: "notifications",
		label: "Notifications",
		usageKey: "notifications"
	}
];
function SubscriptionPage() {
	const { tenantId, plan, sub } = useSubscriptionContext();
	const { plans, coupons, invoices, referrals, upgrade, downgrade, renew, markInvoicePaid, updateSubscription } = useBilling();
	const employees = useStore((s) => s.employees).length || 1;
	const companyName = useStore((s) => s.company.name);
	const { upi, paymentSubmissions, submitPayment } = useSuperAdmin();
	const [couponCode, setCouponCode] = (0, import_react.useState)("");
	const [selectedPlanId, setSelectedPlanId] = (0, import_react.useState)("");
	const [immediate, setImmediate] = (0, import_react.useState)(true);
	const [openUpgrade, setOpenUpgrade] = (0, import_react.useState)(false);
	const [payFor, setPayFor] = (0, import_react.useState)(null);
	const [payForm, setPayForm] = (0, import_react.useState)({
		utr: "",
		payerName: "",
		payerContact: "",
		note: "",
		screenshot: ""
	});
	const tenantInvoices = (0, import_react.useMemo)(() => invoices.filter((i) => i.tenantId === tenantId), [invoices, tenantId]);
	const mySubmissions = (0, import_react.useMemo)(() => paymentSubmissions.filter((p) => p.tenantId === tenantId), [paymentSubmissions, tenantId]);
	const submissionFor = (invId) => mySubmissions.find((p) => p.invoiceId === invId && p.status !== "rejected");
	const ref = referrals.find((r) => r.tenantId === tenantId);
	const tips = aiSubscriptionRecommendations(plan, sub);
	const daysLeft = Math.max(0, Math.round((Date.parse(sub.expiresAt) - Date.now()) / 864e5));
	const openPay = (inv) => {
		setPayFor(inv);
		setPayForm({
			utr: "",
			payerName: "",
			payerContact: "",
			note: `Invoice ${inv.number}`,
			screenshot: ""
		});
	};
	const onShot = (f) => {
		if (!f) return;
		if (f.size > 3e6) return toast.error("Screenshot must be under 3 MB");
		const r = new FileReader();
		r.onload = () => setPayForm((p) => ({
			...p,
			screenshot: String(r.result)
		}));
		r.readAsDataURL(f);
	};
	const submit = () => {
		if (!payFor) return;
		if (!payForm.screenshot) return toast.error("Upload the payment screenshot");
		if (!payForm.utr.trim()) return toast.error("Enter the UTR / transaction reference");
		submitPayment({
			tenantId,
			tenantName: companyName,
			invoiceId: payFor.id,
			invoiceNumber: payFor.number,
			amount: payFor.total,
			utr: payForm.utr.trim(),
			payerName: payForm.payerName.trim(),
			payerContact: payForm.payerContact.trim(),
			note: payForm.note.trim(),
			screenshotDataUrl: payForm.screenshot
		});
		toast.success("Sent for verification. You'll be notified after Super Admin approves.");
		setPayFor(null);
	};
	const doUpgrade = (method) => {
		if (!selectedPlanId) return toast.error("Pick a plan");
		const inv = upgrade(sub.id, selectedPlanId, employees, {
			immediate,
			couponCode: couponCode || void 0,
			paymentMethod: method,
			actor: "admin"
		});
		if (inv) {
			toast.success(`Invoice ${inv.number} created · ₹${inv.total.toLocaleString()}`);
			setOpenUpgrade(false);
		}
	};
	const doRenew = () => {
		const inv = renew(sub.id, employees, {
			couponCode: couponCode || void 0,
			paymentMethod: "razorpay",
			actor: "admin"
		});
		if (inv) toast.success(`Renewed. Invoice ${inv.number} · ₹${inv.total.toLocaleString()}`);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-6xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-2xl font-semibold",
				children: "Subscription & Billing"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Everything about your SWIFT plan, usage, invoices, coupons and referrals."
			})] }),
			tips.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-primary/30 bg-primary/5 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 font-medium text-primary mb-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4" }), " SWIFT AI recommendations"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "text-sm space-y-1 list-disc pl-5",
					children: tips.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t }, i))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "overview",
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
						className: "flex-wrap h-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "overview",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-4 w-4 mr-1" }), "Overview"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "plans",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "h-4 w-4 mr-1" }), "Plans"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "usage",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4 mr-1" }), "Usage"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "modules",
								children: "Modules & Features"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "invoices",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, { className: "h-4 w-4 mr-1" }), "Invoices"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "coupons",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { className: "h-4 w-4 mr-1" }), "Coupons"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "referrals",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gift, { className: "h-4 w-4 mr-1" }), "Referrals"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "overview",
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid md:grid-cols-3 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border bg-card p-5 shadow-card",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground",
											children: "Current plan"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-2xl font-display font-semibold mt-1",
											children: plan.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: "mt-2",
											variant: "outline",
											children: sub.status
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground mt-3",
											children: ["Cycle: ", plan.cycle]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border bg-card p-5 shadow-card",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground",
											children: "Renews in"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-2xl font-display font-semibold mt-1",
											children: [daysLeft, " days"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground mt-2",
											children: new Date(sub.expiresAt).toLocaleDateString()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											className: "mt-3 w-full",
											onClick: doRenew,
											children: "Renew now"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border bg-card p-5 shadow-card",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground",
											children: "Payment status"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-2xl font-display font-semibold mt-1 capitalize",
											children: sub.paymentStatus
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground mt-2",
											children: ["Estimated next bill: ₹", calcPlanPrice(plan, employees).toLocaleString()]
										})
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border bg-card p-5 shadow-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium mb-3",
									children: "Renewal reminders"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-3 text-sm",
									children: [
										"email",
										"sms",
										"whatsapp",
										"push",
										"banner"
									].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: sub.reminderChannels[k],
											onChange: (e) => updateSubscription(sub.id, { reminderChannels: {
												...sub.reminderChannels,
												[k]: e.target.checked
											} })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "capitalize",
											children: k
										})]
									}, k))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground mt-2",
									children: "We remind you 30, 15, 7, 3, 1 days before renewal and on renewal day + grace period."
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "plans",
						className: "space-y-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid md:grid-cols-2 lg:grid-cols-4 gap-3",
							children: plans.filter((p) => p.active).map((p) => {
								const isCurrent = p.id === plan.id;
								const price = calcPlanPrice(p, employees);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `rounded-xl border p-4 flex flex-col ${isCurrent ? "border-primary bg-primary/5" : "bg-card"}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-display font-semibold",
												children: p.name
											}), isCurrent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "Current" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground mt-1",
											children: p.description
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-3 text-2xl font-semibold",
											children: [
												"₹",
												price.toLocaleString(),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-xs font-normal text-muted-foreground",
													children: ["/", p.cycle]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground",
											children: [
												"GST ",
												p.gstPct,
												"% extra"
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
											className: "text-xs mt-3 space-y-1 flex-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Employees: ", p.limits.employees === -1 ? "Unlimited" : p.limits.employees] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Branches: ", p.limits.branches === -1 ? "Unlimited" : p.limits.branches] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["AI credits: ", p.limits.aiCredits === -1 ? "Unlimited" : p.limits.aiCredits] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Storage: ", p.limits.storageMB === -1 ? "Unlimited" : `${p.limits.storageMB} MB`] })
											]
										}),
										!isCurrent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-3 flex gap-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
												open: openUpgrade && selectedPlanId === p.id,
												onOpenChange: (o) => {
													setOpenUpgrade(o);
													if (o) setSelectedPlanId(p.id);
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
													asChild: true,
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
														size: "sm",
														className: "flex-1 bg-gradient-brand text-white",
														children: "Switch"
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Switch to ", p.name] }) }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "space-y-3 text-sm",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Estimated total (pro-rated + GST) will appear on the invoice." }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Coupon" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
																placeholder: "Optional",
																value: couponCode,
																onChange: (e) => setCouponCode(e.target.value)
															})] }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
																className: "flex items-center gap-2",
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																	type: "checkbox",
																	checked: immediate,
																	onChange: (e) => setImmediate(e.target.checked)
																}), "Activate immediately (else from next cycle)"]
															})
														]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
														className: "flex-wrap gap-2",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
																variant: "outline",
																onClick: () => {
																	downgrade(sub.id, p.id, "admin");
																	toast.success("Plan changed. Premium features locked; data retained.");
																	setOpenUpgrade(false);
																},
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleArrowDown, { className: "h-4 w-4 mr-2" }), "Downgrade (no charge)"]
															}),
															PAYMENT_METHODS.slice(0, 3).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
																onClick: () => doUpgrade(m),
																className: "capitalize",
																children: m
															}, m)),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
																variant: "secondary",
																onClick: () => doUpgrade(),
																children: "Create invoice"
															})
														]
													})
												] })]
											})
										})
									]
								}, p.id);
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "usage",
						className: "space-y-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid md:grid-cols-2 gap-3",
							children: LIMIT_META.map((m) => {
								const limit = resolveLimit(plan, sub, m.key);
								const usageKey = m.usageKey ?? m.key;
								const used = sub.usage[usageKey] ?? 0;
								const pct = usagePct(used, limit);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border bg-card p-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: m.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium",
											children: [
												used.toLocaleString(),
												" / ",
												limit === -1 ? "∞" : limit.toLocaleString()
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
										value: pct,
										className: "mt-2 h-2"
									})]
								}, m.key);
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "modules",
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border bg-card p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium mb-3",
								children: "Modules on your plan"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid sm:grid-cols-2 md:grid-cols-3 gap-2",
								children: ALL_MODULES.map((m) => {
									const st = resolveModuleStatus(plan, sub, m.key);
									const color = st === "enabled" ? "text-success" : st === "trial" ? "text-primary" : st === "locked" || st === "expired" || st === "disabled" ? "text-muted-foreground" : "text-amber-600";
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-sm border rounded px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: m.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-xs capitalize ${color}`,
											children: st.replace("_", " ")
										})]
									}, m.key);
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border bg-card p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium mb-3",
								children: "Feature flags"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm",
								children: FEATURE_KEYS.map((f) => {
									const on = f.key in sub.featureOverrides ? sub.featureOverrides[f.key] : plan.featureFlags[f.key];
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between border rounded px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: f.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: on ? "default" : "outline",
											className: "text-xs",
											children: on ? "On" : "Off"
										})]
									}, f.key);
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "invoices",
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "h-6 w-6 text-primary shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-sm flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: "Pay via UPI QR"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: "Scan the QR on any unpaid invoice, then upload the payment screenshot. Super Admin verifies and activates immediately."
								})]
							})]
						}), tenantInvoices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground",
							children: "No invoices yet."
						}) : tenantInvoices.map((inv) => {
							const sub = submissionFor(inv.id);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "font-medium flex flex-wrap items-center gap-2",
										children: [
											inv.number,
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: "outline",
												className: "text-xs capitalize",
												children: inv.kind
											}),
											sub && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
												variant: "outline",
												className: "text-xs capitalize",
												children: [sub.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3 mr-1" }) : sub.status === "verified" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3 mr-1" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-3 w-3 mr-1" }), sub.status === "pending" ? "Awaiting verification" : sub.status]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-muted-foreground",
										children: [
											new Date(inv.issueDate).toLocaleDateString(),
											" · ",
											inv.lines.length,
											" lines · ",
											inv.couponCode ? `Coupon ${inv.couponCode}` : "No coupon"
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between sm:justify-end gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-right",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-semibold",
												children: ["₹", inv.total.toLocaleString()]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs text-muted-foreground",
												children: ["GST ₹", inv.gst.toLocaleString()]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: inv.status === "paid" ? "default" : "outline",
												className: "mt-1 capitalize",
												children: inv.status
											})
										]
									}), inv.status !== "paid" && !sub && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										onClick: () => openPay(inv),
										className: "bg-gradient-brand text-white",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "h-4 w-4 mr-1" }), "Pay via UPI"]
									})]
								})]
							}, inv.id);
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "coupons",
						className: "space-y-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border bg-card p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium mb-2",
								children: "Available coupons"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid md:grid-cols-2 gap-2",
								children: coupons.filter((c) => c.active).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "border rounded-lg p-3 flex justify-between items-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-mono font-semibold",
										children: c.code
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-muted-foreground capitalize",
										children: [
											c.kind,
											" · ",
											c.value,
											c.kind === "percent" ? "%" : "",
											" · ",
											c.maxUses === -1 ? "unlimited" : `${c.maxUses - c.used} left`
										]
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => {
											setCouponCode(c.code);
											toast.success(`Coupon ${c.code} ready — apply on Plans → Switch`);
										},
										children: "Use"
									})]
								}, c.id))
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "referrals",
						className: "space-y-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border bg-card p-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: "Your referral code"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 mt-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
										className: "font-mono text-xl font-semibold",
										children: ref?.code ?? "—"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "ghost",
										onClick: () => {
											navigator.clipboard.writeText(ref?.code ?? "");
											toast.success("Copied");
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4" })
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-muted-foreground mt-2",
									children: ["Share link: ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", { children: ["https://swift.app/r/", ref?.code] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-4 gap-3 mt-4 text-center",
									children: [
										"invited",
										"registered",
										"activated",
										"paid"
									].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "border rounded-lg p-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-2xl font-semibold",
											children: ref?.[k].length ?? 0
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground capitalize",
											children: k
										})]
									}, k))
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!payFor,
				onOpenChange: (o) => !o && setPayFor(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg max-h-[90vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "h-5 w-5" }),
								"Pay Invoice ",
								payFor?.number
							]
						}) }),
						payFor && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col items-center gap-2 rounded-xl border p-4 bg-muted/30",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UpiQR, {
											upiId: upi.upiId,
											payeeName: upi.payeeName,
											amount: payFor.total,
											note: `INV ${payFor.number}`,
											merchantCode: upi.merchantCode,
											overrideImage: upi.qrImageDataUrl
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-center",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-2xl font-semibold",
												children: ["₹", payFor.total.toLocaleString()]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs text-muted-foreground",
												children: [
													"To ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-medium",
														children: upi.payeeName
													}),
													" · ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														className: "underline",
														onClick: () => {
															navigator.clipboard.writeText(upi.upiId);
															toast.success("UPI ID copied");
														},
														children: [
															upi.upiId,
															" ",
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3 w-3 inline" })
														]
													})
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted-foreground text-center",
											children: upi.instructions
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "sm:col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "UTR / Transaction reference *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												value: payForm.utr,
												onChange: (e) => setPayForm({
													...payForm,
													utr: e.target.value
												}),
												placeholder: "12-digit UPI reference from your app"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Payer name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: payForm.payerName,
											onChange: (e) => setPayForm({
												...payForm,
												payerName: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Contact" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: payForm.payerContact,
											onChange: (e) => setPayForm({
												...payForm,
												payerContact: e.target.value
											}),
											placeholder: "Phone or email"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "sm:col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
												rows: 2,
												value: payForm.note,
												onChange: (e) => setPayForm({
													...payForm,
													note: e.target.value
												})
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Screenshot of successful payment *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "mt-1 block cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "file",
										accept: "image/*",
										capture: "environment",
										className: "hidden",
										onChange: (e) => onShot(e.target.files?.[0] ?? null)
									}), payForm.screenshot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: payForm.screenshot,
										alt: "Screenshot",
										className: "w-full rounded-lg border object-contain max-h-64"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted/50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-6 w-6 mx-auto mb-1" }), "Tap to upload / capture screenshot"]
									})]
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
							className: "flex-col sm:flex-row gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								className: "w-full sm:w-auto",
								onClick: () => setPayFor(null),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								className: "w-full sm:w-auto bg-gradient-brand text-white",
								onClick: submit,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-4 w-4 mr-1" }), "Submit for verification"]
							})]
						})
					]
				})
			})
		]
	});
}
//#endregion
export { SubscriptionPage as component };
