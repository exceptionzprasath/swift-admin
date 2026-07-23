import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { L as Plus, h as Trash2 } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
import { t as Switch } from "./switch-CCza_WcE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.settings-BwX4CYwQ.js
var import_jsx_runtime = require_jsx_runtime();
function SettingsPage() {
	const { company, setCompany, docAssets, setDocAssets } = useStore();
	const readAsset = (key) => (file) => {
		if (!file) return;
		const r = new FileReader();
		r.onload = () => setDocAssets({ [key]: r.result });
		r.readAsDataURL(file);
		toast.success("Uploaded");
	};
	const num = (k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
		type: "number",
		value: company[k],
		onChange: (e) => setCompany({ [k]: +e.target.value || 0 })
	});
	const str = (k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
		value: company[k],
		onChange: (e) => setCompany({ [k]: e.target.value })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-5xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-semibold",
				children: "Company Settings"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "All payroll rates, thresholds, geo-fence, shifts and templates are editable per company."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Company Profile",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Display Name",
						children: str("name")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Legal Name",
						children: str("legalName")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Address",
						children: str("address")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "GSTIN",
						children: str("gstin")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Working Time",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Working Days / Month",
						children: num("workingDaysPerMonth")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Working Hours / Day",
						children: num("workingHoursPerDay")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Overtime Multiplier",
						children: num("otMultiplier")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Document Assets (used automatically on every generated letter)",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Company Logo",
						src: docAssets.logoDataUrl,
						onFile: readAsset("logoDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Letterhead",
						src: docAssets.letterheadDataUrl,
						onFile: readAsset("letterheadDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Footer",
						src: docAssets.footerDataUrl,
						onFile: readAsset("footerDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Watermark",
						src: docAssets.watermarkDataUrl,
						onFile: readAsset("watermarkDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Company Seal",
						src: docAssets.companySealDataUrl,
						onFile: readAsset("companySealDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Department Seal",
						src: docAssets.departmentSealDataUrl,
						onFile: readAsset("departmentSealDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "MD Signature",
						src: docAssets.mdSignatureDataUrl,
						onFile: readAsset("mdSignatureDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "HR Signature",
						src: docAssets.hrSignatureDataUrl,
						onFile: readAsset("hrSignatureDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Authorised Signatory",
						src: docAssets.authorisedSignatoryDataUrl,
						onFile: readAsset("authorisedSignatoryDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Branch Manager Signature",
						src: docAssets.branchManagerSignatureDataUrl,
						onFile: readAsset("branchManagerSignatureDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "Factory Manager Signature",
						src: docAssets.factoryManagerSignatureDataUrl,
						onFile: readAsset("factoryManagerSignatureDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetUpload, {
						label: "QR Verification",
						src: docAssets.qrCodeDataUrl,
						onFile: readAsset("qrCodeDataUrl")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Document Number Prefix",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: docAssets.docNumberPrefix,
							onChange: (e) => setDocAssets({ docNumberPrefix: e.target.value })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Document Number Format",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: docAssets.docNumberFormat,
							onChange: (e) => setDocAssets({ docNumberFormat: e.target.value })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Digital Certificate Name",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: docAssets.digitalCertificateName ?? "",
							onChange: (e) => setDocAssets({ digitalCertificateName: e.target.value })
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Salary Structure (% of Basic)",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "HRA %",
						children: num("hraPct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Special %",
						children: num("specialPct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Medical %",
						children: num("medicalPct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Conveyance %",
						children: num("conveyancePct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Washing %",
						children: num("washingPct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Other %",
						children: num("otherPct")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Statutory",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employee PF %",
						children: num("employeePfPct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employer PF %",
						children: num("employerPfPct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employee ESI %",
						children: num("employeeEsiPct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employer ESI %",
						children: num("employerEsiPct")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "ESI Threshold (₹ Gross)",
						children: num("esiThreshold")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Professional Tax (₹)",
						children: num("ptAmount")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Geo-Fence (Office Location)",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Latitude",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							step: "0.0001",
							value: company.geofence.lat,
							onChange: (e) => setCompany({ geofence: {
								...company.geofence,
								lat: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Longitude",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							step: "0.0001",
							value: company.geofence.lng,
							onChange: (e) => setCompany({ geofence: {
								...company.geofence,
								lng: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Radius (m)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.geofence.radiusM,
							onChange: (e) => setCompany({ geofence: {
								...company.geofence,
								radiusM: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "col-span-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => {
								if (!navigator.geolocation) return toast.error("Geolocation not supported");
								navigator.geolocation.getCurrentPosition((pos) => {
									setCompany({ geofence: {
										...company.geofence,
										lat: pos.coords.latitude,
										lng: pos.coords.longitude
									} });
									toast.success("Office location set to current position");
								}, () => toast.error("Location permission denied"));
							},
							children: "Use my current location"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: "Shifts",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "col-span-3 space-y-2",
					children: [company.shifts.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-5 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: s.name,
								onChange: (e) => {
									const copy = [...company.shifts];
									copy[i] = {
										...s,
										name: e.target.value
									};
									setCompany({ shifts: copy });
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: s.start,
								onChange: (e) => {
									const copy = [...company.shifts];
									copy[i] = {
										...s,
										start: e.target.value
									};
									setCompany({ shifts: copy });
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: s.end,
								onChange: (e) => {
									const copy = [...company.shifts];
									copy[i] = {
										...s,
										end: e.target.value
									};
									setCompany({ shifts: copy });
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								placeholder: "₹ per day",
								value: s.allowancePerDay,
								onChange: (e) => {
									const copy = [...company.shifts];
									copy[i] = {
										...s,
										allowancePerDay: +e.target.value || 0
									};
									setCompany({ shifts: copy });
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								onClick: () => setCompany({ shifts: company.shifts.filter((_, j) => j !== i) }),
								children: "Remove"
							})
						]
					}, s.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setCompany({ shifts: [...company.shifts, {
							id: crypto.randomUUID(),
							name: "New Shift",
							start: "09:00",
							end: "18:00",
							allowancePerDay: 0
						}] }),
						children: "Add shift"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: "Leave Types",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "col-span-3 space-y-2",
					children: [company.leaveTypes.map((l, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: l.name,
								onChange: (e) => {
									const copy = [...company.leaveTypes];
									copy[i] = {
										...l,
										name: e.target.value
									};
									setCompany({ leaveTypes: copy });
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: l.days,
								onChange: (e) => {
									const copy = [...company.leaveTypes];
									copy[i] = {
										...l,
										days: +e.target.value || 0
									};
									setCompany({ leaveTypes: copy });
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								onClick: () => setCompany({ leaveTypes: company.leaveTypes.filter((_, j) => j !== i) }),
								children: "Remove"
							})
						]
					}, l.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setCompany({ leaveTypes: [...company.leaveTypes, {
							id: crypto.randomUUID(),
							name: "New Leave",
							days: 6
						}] }),
						children: "Add leave type"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: "Appointment Letter Template",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "col-span-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, { children: [
						"Template (use ",
						"{{name}}, {{designation}}, {{department}}, {{company}}, {{doj}}, {{empCode}}, {{ctc}}, {{gross}}",
						")"
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						rows: 10,
						value: company.appointmentTemplate,
						onChange: (e) => setCompany({ appointmentTemplate: e.target.value })
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: "Earnings Components (fully configurable)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "col-span-3 space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-muted-foreground px-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-3",
									children: "Name"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-2",
									children: "Formula"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1",
									children: "Value"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1",
									children: "Prorate"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1",
									children: "Tax"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1",
									children: "PF"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1",
									children: "ESI"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1",
									children: "Grat."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1",
									children: "Input key"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "col-span-1" })
							]
						}),
						company.earnings.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-12 gap-2 items-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "col-span-3",
									value: e.name,
									onChange: (ev) => updateEarning(i, { name: ev.target.value })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: e.formula,
									onValueChange: (v) => updateEarning(i, { formula: v }),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
										className: "col-span-2",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "pctOfBasic",
											children: "% of Basic"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "pctOfCtc",
											children: "% of Basic (CTC ref)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "flatMonthly",
											children: "Flat Monthly"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "perDay",
											children: "Per Day Worked"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "perShiftDay",
											children: "Per Shift Day"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "perOtHour",
											children: "Per OT Hour (× multiplier)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "input",
											children: "User Input"
										})
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "col-span-1",
									type: "number",
									value: e.value,
									onChange: (ev) => updateEarning(i, { value: +ev.target.value || 0 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1 flex justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: e.prorate,
										onCheckedChange: (v) => updateEarning(i, { prorate: v })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1 flex justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: e.taxable,
										onCheckedChange: (v) => updateEarning(i, { taxable: v })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1 flex justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: e.includeInPf,
										onCheckedChange: (v) => updateEarning(i, { includeInPf: v })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1 flex justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: e.includeInEsi,
										onCheckedChange: (v) => updateEarning(i, { includeInEsi: v })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1 flex justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: e.includeInGratuity,
										onCheckedChange: (v) => updateEarning(i, { includeInGratuity: v })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "col-span-1",
									placeholder: "key",
									value: e.inputKey ?? "",
									onChange: (ev) => updateEarning(i, { inputKey: ev.target.value })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									className: "col-span-1",
									variant: "ghost",
									size: "icon",
									onClick: () => setCompany({ earnings: company.earnings.filter((_, j) => j !== i) }),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
								})
							]
						}, e.id)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setCompany({ earnings: [...company.earnings, {
								id: crypto.randomUUID(),
								name: "New Component",
								formula: "flatMonthly",
								value: 0,
								prorate: true,
								taxable: true,
								includeInPf: false,
								includeInEsi: true,
								includeInGratuity: false
							}] }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3 mr-1" }), " Add earning"]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: "Custom Deductions",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "col-span-3 space-y-2",
					children: [company.deductions.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-12 gap-2 items-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "col-span-4",
								value: d.name,
								onChange: (ev) => updateDeduction(i, { name: ev.target.value })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: d.formula,
								onValueChange: (v) => updateDeduction(i, { formula: v }),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "col-span-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "flat",
										children: "Flat ₹"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "pctOfGross",
										children: "% of Gross"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "pctOfBasic",
										children: "% of Basic"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "pctOfPfBase",
										children: "% of PF Base"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "input",
										children: "User Input"
									})
								] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "col-span-2",
								type: "number",
								value: d.value,
								onChange: (ev) => updateDeduction(i, { value: +ev.target.value || 0 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "col-span-2",
								placeholder: "input key",
								value: d.inputKey ?? "",
								onChange: (ev) => updateDeduction(i, { inputKey: ev.target.value })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								className: "col-span-1",
								variant: "ghost",
								size: "icon",
								onClick: () => setCompany({ deductions: company.deductions.filter((_, j) => j !== i) }),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
							})
						]
					}, d.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => setCompany({ deductions: [...company.deductions, {
							id: crypto.randomUUID(),
							name: "New Deduction",
							formula: "flat",
							value: 0
						}] }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3 mr-1" }), " Add deduction"]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Provident Fund (PF)",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Enabled",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: company.pfRules.enabled,
								onCheckedChange: (v) => setCompany({ pfRules: {
									...company.pfRules,
									enabled: v
								} })
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employee %",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.pfRules.employeePct,
							onChange: (e) => setCompany({ pfRules: {
								...company.pfRules,
								employeePct: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employer %",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.pfRules.employerPct,
							onChange: (e) => setCompany({ pfRules: {
								...company.pfRules,
								employerPct: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Wage Ceiling (₹, 0 = none)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.pfRules.ceiling,
							onChange: (e) => setCompany({ pfRules: {
								...company.pfRules,
								ceiling: +e.target.value || 0
							} })
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "ESI",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Enabled",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: company.esiRules.enabled,
								onCheckedChange: (v) => setCompany({ esiRules: {
									...company.esiRules,
									enabled: v
								} })
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employee %",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							step: "0.01",
							value: company.esiRules.employeePct,
							onChange: (e) => setCompany({ esiRules: {
								...company.esiRules,
								employeePct: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employer %",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							step: "0.01",
							value: company.esiRules.employerPct,
							onChange: (e) => setCompany({ esiRules: {
								...company.esiRules,
								employerPct: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Gross Threshold (₹)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.esiRules.threshold,
							onChange: (e) => setCompany({ esiRules: {
								...company.esiRules,
								threshold: +e.target.value || 0
							} })
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: "Professional Tax Slabs",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "col-span-3 space-y-2",
					children: [company.ptSlabs.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-12 gap-2 items-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "col-span-2",
								children: "Gross up to (₹)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "col-span-4",
								type: "number",
								value: s.upTo,
								onChange: (e) => updateSlab("ptSlabs", i, { upTo: +e.target.value || 0 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "col-span-2",
								children: "PT (₹)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "col-span-3",
								type: "number",
								value: s.amount,
								onChange: (e) => updateSlab("ptSlabs", i, { amount: +e.target.value || 0 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								className: "col-span-1",
								variant: "ghost",
								size: "icon",
								onClick: () => setCompany({ ptSlabs: company.ptSlabs.filter((_, j) => j !== i) }),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
							})
						]
					}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => setCompany({ ptSlabs: [...company.ptSlabs, {
							upTo: 0,
							amount: 0
						}] }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3 mr-1" }), " Add slab"]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "TDS (Income Tax)",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Enabled",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: company.tdsRules.enabled,
							onCheckedChange: (v) => setCompany({ tdsRules: { enabled: v } })
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "col-span-3 space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Annual slabs" }),
						company.tdsSlabs.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-12 gap-2 items-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "col-span-2",
									children: "Up to (₹)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "col-span-4",
									type: "number",
									value: s.upTo,
									onChange: (e) => updateSlab("tdsSlabs", i, { upTo: +e.target.value || 0 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "col-span-2",
									children: "Rate %"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "col-span-3",
									type: "number",
									step: "0.01",
									value: s.pct,
									onChange: (e) => updateSlab("tdsSlabs", i, { pct: +e.target.value || 0 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									className: "col-span-1",
									variant: "ghost",
									size: "icon",
									onClick: () => setCompany({ tdsSlabs: company.tdsSlabs.filter((_, j) => j !== i) }),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
								})
							]
						}, i)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setCompany({ tdsSlabs: [...company.tdsSlabs, {
								upTo: 0,
								pct: 0
							}] }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3 mr-1" }), " Add slab"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Labour Welfare Fund (LWF)",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Enabled",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: company.lwfRules.enabled,
								onCheckedChange: (v) => setCompany({ lwfRules: {
									...company.lwfRules,
									enabled: v
								} })
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employee (₹)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.lwfRules.employeeAmount,
							onChange: (e) => setCompany({ lwfRules: {
								...company.lwfRules,
								employeeAmount: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Employer (₹)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.lwfRules.employerAmount,
							onChange: (e) => setCompany({ lwfRules: {
								...company.lwfRules,
								employerAmount: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Frequency",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: company.lwfRules.frequency,
							onValueChange: (v) => setCompany({ lwfRules: {
								...company.lwfRules,
								frequency: v
							} }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "monthly",
								children: "Monthly"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "half-yearly",
								children: "Half-yearly"
							})] })]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Gratuity & LOP",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Gratuity Enabled",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: company.gratuityRules.enabled,
								onCheckedChange: (v) => setCompany({ gratuityRules: {
									...company.gratuityRules,
									enabled: v
								} })
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Numerator (days)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.gratuityRules.numerator,
							onChange: (e) => setCompany({ gratuityRules: {
								...company.gratuityRules,
								numerator: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Denominator (days/mo)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: company.gratuityRules.denominator,
							onChange: (e) => setCompany({ gratuityRules: {
								...company.gratuityRules,
								denominator: +e.target.value || 0
							} })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Loss of Pay Basis",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: company.lopBasis,
							onValueChange: (v) => setCompany({ lopBasis: v }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "basic",
								children: "Basic"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "gross",
								children: "Gross"
							})] })]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttendanceDefaultsCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "bg-gradient-brand text-white shadow-glow",
				onClick: () => toast.success("Settings saved"),
				children: "Save changes"
			})
		]
	});
	function updateEarning(i, patch) {
		const copy = [...company.earnings];
		copy[i] = {
			...copy[i],
			...patch
		};
		setCompany({ earnings: copy });
	}
	function updateDeduction(i, patch) {
		const copy = [...company.deductions];
		copy[i] = {
			...copy[i],
			...patch
		};
		setCompany({ deductions: copy });
	}
	function updateSlab(key, i, patch) {
		const arr = [...company[key]];
		arr[i] = {
			...arr[i],
			...patch
		};
		setCompany({ [key]: arr });
	}
}
function Card({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "font-display font-semibold mb-4",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-3 gap-4",
			children
		})]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), children] });
}
function AssetUpload({ label, src, onFile }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2 mt-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-14 w-14 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground",
			children: src ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src,
				alt: label,
				className: "h-full w-full object-contain"
			}) : "—"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			type: "file",
			accept: "image/*",
			onChange: (e) => onFile(e.target.files?.[0] ?? null),
			className: "text-xs"
		})]
	})] });
}
function AttendanceDefaultsCard() {
	const { company, setCompany } = useStore();
	const rules = company.attendanceDefaults ?? [];
	const update = (i, patch) => {
		const next = rules.map((r, idx) => idx === i ? {
			...r,
			...patch
		} : r);
		setCompany({ attendanceDefaults: next });
	};
	const updateMatch = (i, patch) => {
		const next = rules.map((r, idx) => idx === i ? {
			...r,
			match: {
				...r.match,
				...patch
			}
		} : r);
		setCompany({ attendanceDefaults: next });
	};
	const add = () => {
		const r = {
			id: `apd-${Date.now()}`,
			name: "New Rule",
			priority: (rules[0]?.priority ?? 0) + 10,
			match: {},
			shiftId: company.shifts[0]?.id,
			weeklyOff: ["Sun"],
			leaveTypeIds: company.leaveTypes.map((l) => l.id),
			geofenceFromBranch: true,
			payrollGroup: "Monthly",
			costCentre: "General",
			holidayCalendar: "India-Standard"
		};
		setCompany({ attendanceDefaults: [r, ...rules] });
	};
	const remove = (id) => setCompany({ attendanceDefaults: rules.filter((r) => r.id !== id) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display font-semibold",
				children: "Attendance Profile Defaults"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Auto-assigned on registration. Most specific match wins; ties broken by priority."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "outline",
				onClick: add,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5 mr-1" }), " Add rule"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3",
			children: [rules.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-muted-foreground",
				children: "No rules configured — every employee is registered without an auto-profile."
			}), rules.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border p-4 grid grid-cols-12 gap-3 items-end",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: r.name,
							onChange: (e) => update(i, { name: e.target.value })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Priority" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							value: r.priority,
							onChange: (e) => update(i, { priority: +e.target.value || 0 })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Match Branch" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: r.match.branchId ?? "any",
							onValueChange: (v) => updateMatch(i, { branchId: v === "any" ? void 0 : v }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "any",
								children: "Any"
							}), (company.branches ?? []).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: b.id,
								children: b.name
							}, b.id))] })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Match Dept" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							placeholder: "Any",
							value: r.match.department ?? "",
							onChange: (e) => updateMatch(i, { department: e.target.value || void 0 })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Match Designation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							placeholder: "Any",
							value: r.match.designation ?? "",
							onChange: (e) => updateMatch(i, { designation: e.target.value || void 0 })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "col-span-2 flex justify-end",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon",
							variant: "ghost",
							onClick: () => remove(r.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4 text-destructive" })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Shift" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: r.shiftId ?? "",
							onValueChange: (v) => update(i, { shiftId: v }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "—" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: company.shifts.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: s.id,
								children: [
									s.name,
									" (",
									s.start,
									"–",
									s.end,
									")"
								]
							}, s.id)) })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Weekly Off (comma)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: (r.weeklyOff ?? []).join(","),
							onChange: (e) => update(i, { weeklyOff: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Payroll Group" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: r.payrollGroup ?? "",
							onChange: (e) => update(i, { payrollGroup: e.target.value })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Cost Centre" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: r.costCentre ?? "",
							onChange: (e) => update(i, { costCentre: e.target.value })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Holiday Calendar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: r.holidayCalendar ?? "",
							onChange: (e) => update(i, { holidayCalendar: e.target.value })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-6 flex items-center gap-2 pt-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: !!r.geofenceFromBranch,
							onCheckedChange: (v) => update(i, { geofenceFromBranch: v })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground",
							children: "Inherit geo-fence from assigned branch"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Leave Types" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1.5 mt-1",
							children: company.leaveTypes.map((lt) => {
								const on = (r.leaveTypeIds ?? []).includes(lt.id);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										const next = on ? (r.leaveTypeIds ?? []).filter((x) => x !== lt.id) : [...r.leaveTypeIds ?? [], lt.id];
										update(i, { leaveTypeIds: next });
									},
									className: `text-xs rounded-full border px-2 py-0.5 ${on ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground"}`,
									children: lt.name
								}, lt.id);
							})
						})]
					})
				]
			}, r.id))]
		})]
	});
}
//#endregion
export { SettingsPage as component };
