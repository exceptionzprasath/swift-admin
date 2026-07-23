import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { L as Plus, V as Pencil, at as LocateFixed, b as Shield, et as MapPin, h as Trash2, jt as Clock, o as Users, qt as Building2, r as Wifi } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-CiapfthD.mjs";
import { t as Checkbox } from "./checkbox-B1AjkRkB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.branches-DM_n9BBg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var empty = {
	name: "",
	code: "",
	address: "",
	city: "",
	state: "",
	gstin: "",
	isHead: false,
	lat: void 0,
	lng: void 0,
	radiusMeters: 150,
	geofenceDisabled: false,
	wifiSSIDs: [],
	ipAllowlist: [],
	shiftStart: "09:00",
	shiftEnd: "18:00",
	weeklyOff: ["Sun"]
};
function BranchesPage() {
	const { company, employees, addBranch, updateBranch, deleteBranch, updateEmployee } = useStore();
	const branches = company.branches ?? [];
	const [open, setOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(empty);
	const [tab, setTab] = (0, import_react.useState)("basic");
	const openNew = () => {
		setEditing(null);
		setForm(empty);
		setTab("basic");
		setOpen(true);
	};
	const openEdit = (b) => {
		setEditing(b);
		const { id: _id, ...rest } = b;
		setForm({
			...empty,
			...rest,
			wifiSSIDs: rest.wifiSSIDs ?? [],
			ipAllowlist: rest.ipAllowlist ?? [],
			weeklyOff: rest.weeklyOff ?? []
		});
		setTab("basic");
		setOpen(true);
	};
	const submit = () => {
		if (!form.name.trim() || !form.code.trim()) return toast.error("Name and code required");
		if (editing) {
			updateBranch(editing.id, form);
			toast.success("Branch updated");
		} else {
			addBranch(form);
			toast.success("Branch added");
		}
		setOpen(false);
	};
	const empCount = (id) => employees.filter((e) => e.branchId === id).length;
	const useMyLocation = () => {
		if (!navigator.geolocation) return toast.error("Geolocation not available");
		navigator.geolocation.getCurrentPosition((pos) => {
			setForm({
				...form,
				lat: +pos.coords.latitude.toFixed(6),
				lng: +pos.coords.longitude.toFixed(6)
			});
			toast.success("Location captured");
		}, (e) => toast.error(e.message || "Unable to fetch location"), { enableHighAccuracy: true });
	};
	const updateToMyLocation = (b) => {
		if (!navigator.geolocation) return toast.error("Geolocation not available");
		navigator.geolocation.getCurrentPosition((pos) => {
			const lat = +pos.coords.latitude.toFixed(6);
			const lng = +pos.coords.longitude.toFixed(6);
			updateBranch(b.id, {
				...b,
				lat,
				lng
			});
			toast.success(`Updated ${b.name} location to (${lat}, ${lng})`);
		}, (e) => toast.error(e.message || "Unable to fetch location"), { enableHighAccuracy: true });
	};
	const csvToArr = (s) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "font-display text-3xl font-semibold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-6 w-6 text-primary" }), " Branches"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [
						"Multi-branch setup for ",
						company.name,
						" — geo-fence, shifts, Wi-Fi & IP restrictions per branch."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: openNew,
					className: "bg-gradient-brand text-white",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-1" }), " Add branch"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
				children: [branches.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground md:col-span-2 lg:col-span-3",
					children: "No branches yet — add your first location to assign employees and enable geo-fenced attendance."
				}), branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border bg-card p-5 space-y-2 hover:shadow-soft transition-shadow",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-display font-semibold flex items-center gap-2",
								children: [b.name, b.isHead && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: "bg-primary text-primary-foreground text-[10px]",
									children: "HQ"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted-foreground",
								children: ["Code ", b.code]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: "ghost",
									onClick: () => openEdit(b),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3.5 w-3.5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: "ghost",
									onClick: () => {
										if (confirm("Delete this branch?")) deleteBranch(b.id);
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5 text-destructive" })
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted-foreground flex items-start gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-3 w-3 mt-0.5" }),
								" ",
								b.address,
								", ",
								b.city,
								", ",
								b.state
							]
						}),
						b.gstin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs",
							children: ["GSTIN: ", b.gstin]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-1.5 pt-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "outline",
									className: "text-[10px]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-2.5 w-2.5 mr-0.5" }),
										empCount(b.id),
										" emp"
									]
								}),
								b.lat != null && b.lng != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "outline",
									className: "text-[10px]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocateFixed, { className: "h-2.5 w-2.5 mr-0.5" }),
										b.radiusMeters ?? 150,
										"m geo"
									]
								}),
								(b.wifiSSIDs?.length ?? 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "outline",
									className: "text-[10px]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wifi, { className: "h-2.5 w-2.5 mr-0.5" }),
										b.wifiSSIDs.length,
										" SSID"
									]
								}),
								b.shiftStart && b.shiftEnd && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "outline",
									className: "text-[10px]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-2.5 w-2.5 mr-0.5" }),
										b.shiftStart,
										"–",
										b.shiftEnd
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pt-2 flex items-center justify-between border-t border-border/50 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "outline",
								className: "h-7 text-[11px]",
								onClick: () => updateToMyLocation(b),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocateFixed, { className: "h-3 w-3 mr-1 text-primary" }), " Set to My Location"]
							}), b.geofenceDisabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								className: "text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30",
								children: "Remote Mode"
							})]
						})
					]
				}, b.id))]
			}),
			employees.length > 0 && branches.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border bg-card p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display font-semibold mb-3",
					children: "Assign employees to branches"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "bg-muted/50 text-left",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-2",
									children: "Employee"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-2",
									children: "Dept"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-2",
									children: "Branch"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: employees.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "p-2 flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-6 w-6 rounded-full ring-1 ring-primary/25 overflow-hidden bg-primary/10 text-primary grid place-items-center text-[10px] font-semibold shrink-0",
											children: e.photoDataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: e.photoDataUrl,
												className: "h-full w-full object-cover",
												alt: ""
											}) : e.name.split(" ").slice(0, 2).map((s) => s[0]).join("")
										}),
										e.name,
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs text-muted-foreground",
											children: ["· ", e.empCode]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-2",
									children: e.department
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										className: "rounded-md border border-border bg-background px-2 py-1 text-xs",
										value: e.branchId || "__none",
										onChange: (ev) => updateEmployee(e.id, { branchId: ev.target.value === "__none" ? void 0 : ev.target.value }),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "__none",
											children: "— unassigned —"
										}), branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: b.id,
											children: [
												b.name,
												" (",
												b.code,
												")"
											]
										}, b.id))]
									})
								})
							]
						}, e.id)) })]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open,
				onOpenChange: setOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: editing ? "Edit branch" : "New branch" }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
							value: tab,
							onValueChange: setTab,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
									className: "grid w-full grid-cols-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
											value: "basic",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3.5 w-3.5 mr-1" }), "Basic"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
											value: "geo",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-3.5 w-3.5 mr-1" }), "Geo-fence"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
											value: "rules",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-3.5 w-3.5 mr-1" }), "Rules"]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
									value: "basic",
									className: "grid grid-cols-2 gap-3 pt-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.name,
											onChange: (e) => setForm({
												...form,
												name: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Code" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.code,
											onChange: (e) => setForm({
												...form,
												code: e.target.value.toUpperCase()
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												value: form.address,
												onChange: (e) => setForm({
													...form,
													address: e.target.value
												})
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "City" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.city,
											onChange: (e) => setForm({
												...form,
												city: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "State" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.state,
											onChange: (e) => setForm({
												...form,
												state: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "GSTIN (optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												value: form.gstin || "",
												onChange: (e) => setForm({
													...form,
													gstin: e.target.value
												})
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "col-span-2 flex items-center gap-2 text-sm",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: !!form.isHead,
												onChange: (e) => setForm({
													...form,
													isHead: e.target.checked
												})
											}), "Mark as Head Office / Registered Office"]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
									value: "geo",
									className: "space-y-3 pt-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground",
											children: "Employees checking in must be inside this fence. Use the button to auto-fill from device location."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-3 gap-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Latitude" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "number",
													step: "any",
													value: form.lat ?? "",
													onChange: (e) => setForm({
														...form,
														lat: e.target.value === "" ? void 0 : +e.target.value
													})
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Longitude" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "number",
													step: "any",
													value: form.lng ?? "",
													onChange: (e) => setForm({
														...form,
														lng: e.target.value === "" ? void 0 : +e.target.value
													})
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Radius (m)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "number",
													value: form.radiusMeters ?? 150,
													onChange: (e) => setForm({
														...form,
														radiusMeters: +e.target.value || 0
													})
												})] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											variant: "outline",
											size: "sm",
											type: "button",
											onClick: useMyLocation,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocateFixed, { className: "h-3.5 w-3.5 mr-1.5" }), " Use my current location"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 py-2 border-y border-border/50",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
												id: "geofenceDisabled",
												checked: !!form.geofenceDisabled,
												onCheckedChange: (c) => setForm({
													...form,
													geofenceDisabled: !!c
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
												htmlFor: "geofenceDisabled",
												className: "text-xs font-medium cursor-pointer",
												children: "Disable Geofence Restriction (Allow Remote / Anywhere Check-in for this branch)"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BranchGoogleMap, {
											lat: form.lat,
											lng: form.lng,
											radius: form.radiusMeters ?? 150,
											onChange: (lat, lng) => setForm({
												...form,
												lat,
												lng
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Allowed Wi-Fi SSIDs (comma-separated)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: (form.wifiSSIDs ?? []).join(", "),
											onChange: (e) => setForm({
												...form,
												wifiSSIDs: csvToArr(e.target.value)
											}),
											placeholder: "SWIFT-OFFICE, SWIFT-GUEST"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "IP Allowlist (comma-separated)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: (form.ipAllowlist ?? []).join(", "),
											onChange: (e) => setForm({
												...form,
												ipAllowlist: csvToArr(e.target.value)
											}),
											placeholder: "103.25.14.0/24, 45.112.9.10"
										})] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
									value: "rules",
									className: "space-y-3 pt-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Shift Start" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "time",
											value: form.shiftStart || "",
											onChange: (e) => setForm({
												...form,
												shiftStart: e.target.value
											})
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Shift End" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "time",
											value: form.shiftEnd || "",
											onChange: (e) => setForm({
												...form,
												shiftEnd: e.target.value
											})
										})] })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Weekly Off" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex gap-1.5 flex-wrap mt-1.5",
										children: [
											"Mon",
											"Tue",
											"Wed",
											"Thu",
											"Fri",
											"Sat",
											"Sun"
										].map((d) => {
											const on = form.weeklyOff?.includes(d);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setForm({
													...form,
													weeklyOff: on ? form.weeklyOff.filter((x) => x !== d) : [...form.weeklyOff ?? [], d]
												}),
												className: `px-2.5 py-1 text-xs rounded-full border ${on ? "bg-gradient-brand text-white border-transparent" : "bg-card border-border"}`,
												children: d
											}, d);
										})
									})] })]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: submit,
							className: "bg-gradient-brand text-white",
							children: editing ? "Save" : "Add"
						})] })
					]
				})
			})
		]
	});
}
var mapsScriptLoaded = false;
function loadGoogleMaps(apiKey, callback) {
	if (mapsScriptLoaded) {
		callback();
		return;
	}
	if (typeof window !== "undefined" && window.google && window.google.maps) {
		mapsScriptLoaded = true;
		callback();
		return;
	}
	const scriptId = "google-maps-api-script";
	let script = document.getElementById(scriptId);
	if (!script) {
		script = document.createElement("script");
		script.id = scriptId;
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
		script.async = true;
		script.defer = true;
		document.head.appendChild(script);
	}
	script.addEventListener("load", () => {
		mapsScriptLoaded = true;
		callback();
	});
}
var GOOGLE_MAPS_API_KEY = "AIzaSyAs3nkKoCsndZiXeV6oh0PvRLL7FpMiZ4k";
function BranchGoogleMap({ lat, lng, radius, onChange }) {
	const mapRef = (0, import_react.useRef)(null);
	const googleMapInstance = (0, import_react.useRef)(null);
	const markerInstance = (0, import_react.useRef)(null);
	const circleInstance = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		loadGoogleMaps(GOOGLE_MAPS_API_KEY, () => {
			if (!mapRef.current) return;
			const defaultLat = lat ?? 12.9716;
			const defaultLng = lng ?? 77.5946;
			const maps = window.google.maps;
			const mapOptions = {
				center: {
					lat: defaultLat,
					lng: defaultLng
				},
				zoom: lat && lng ? 16 : 12,
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: false
			};
			const map = new maps.Map(mapRef.current, mapOptions);
			googleMapInstance.current = map;
			const marker = new maps.Marker({
				position: {
					lat: defaultLat,
					lng: defaultLng
				},
				map,
				draggable: true
			});
			markerInstance.current = marker;
			const circle = new maps.Circle({
				map,
				center: {
					lat: defaultLat,
					lng: defaultLng
				},
				radius,
				fillColor: "#22c55e",
				fillOpacity: .25,
				strokeColor: "#22c55e",
				strokeOpacity: .6,
				strokeWeight: 2
			});
			circleInstance.current = circle;
			marker.addListener("dragend", () => {
				const pos = marker.getPosition();
				if (pos) onChange(+pos.lat().toFixed(6), +pos.lng().toFixed(6));
			});
			map.addListener("click", (e) => {
				const pos = e.latLng;
				if (pos) {
					marker.setPosition(pos);
					onChange(+pos.lat().toFixed(6), +pos.lng().toFixed(6));
				}
			});
		});
	}, []);
	(0, import_react.useEffect)(() => {
		if (googleMapInstance.current && markerInstance.current && circleInstance.current) {
			if (lat != null && lng != null) {
				const pos = {
					lat,
					lng
				};
				markerInstance.current.setPosition(pos);
				circleInstance.current.setCenter(pos);
				circleInstance.current.setRadius(radius);
				googleMapInstance.current.panTo(pos);
			}
		}
	}, [
		lat,
		lng,
		radius
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: mapRef,
		className: "w-full h-[260px] rounded-xl border border-border overflow-hidden mt-3 shadow-inner"
	});
}
//#endregion
export { BranchesPage as component };
