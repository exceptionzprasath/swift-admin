import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore, i as inr, n as computePayroll, s as resolveAttendanceProfile } from "./store-Dj1aT4sf.mjs";
import { A as Save, Ct as FilePenLine, Ft as CircleCheck, Jt as Briefcase, L as Plus, O as ScanFace, Ot as DoorOpen, Rt as ChevronRight, S as ShieldCheck, Tt as FileDown, Ut as Camera, V as Pencil, W as PackageCheck, Y as MessageSquareQuote, a as Wallet, en as Award, gt as GraduationCap, h as Trash2, i as WandSparkles, in as ArrowRightLeft, l as Upload, mt as House, n as X, o as Users, ot as LoaderCircle, qt as Building2, s as User, y as Sparkles, zt as ChevronLeft } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { t as Badge } from "./badge-Cc0IblCb.mjs";
import { n as aiNotify, r as setAiGuideMode } from "./ai-guide-bus-KIenmqGq.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as require_lib } from "../_libs/jszip+[...].mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { t as Label } from "./label-B4PTMSG2.mjs";
import { t as Textarea } from "./textarea-DBn9CRiI.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, s as DialogTrigger, t as Dialog } from "./dialog-CiapfthD.mjs";
import { t as ESignPad } from "./esign-pad-ChArsuLf.mjs";
import { t as require_FileSaver_min } from "../_libs/file-saver.mjs";
import { a as downloadLetter, c as generateLetterPDF, l as renderTemplate, n as buildGenericTemplate, o as generateAssetHandoverPDF, r as buildVars, s as generateLetterDOCX, t as DEFAULT_TEMPLATES } from "./documents-DHY5ZnOl.mjs";
import { t as Checkbox } from "./checkbox-B1AjkRkB.mjs";
import { t as generateAppointmentPDF } from "./pdf-BbZFURNJ.mjs";
import { t as Progress } from "./progress-Crx1Tb8I.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.employees-C5YeB4bR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_FileSaver_min = /* @__PURE__ */ __toESM(require_FileSaver_min());
var import_lib = /* @__PURE__ */ __toESM(require_lib());
function FaceCapture({ open, onClose, onCaptured, title = "Face Verification" }) {
	const videoRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	const streamRef = (0, import_react.useRef)(null);
	const [phase, setPhase] = (0, import_react.useState)("init");
	const [err, setErr] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (!open) return;
		let cancelled = false;
		setPhase("init");
		setErr("");
		(async () => {
			try {
				let stream;
				try {
					stream = await navigator.mediaDevices.getUserMedia({
						video: {
							facingMode: "user",
							width: { ideal: 640 },
							height: { ideal: 480 }
						},
						audio: false
					});
				} catch (innerErr) {
					console.warn("Retrying getUserMedia with simple video constraints:", innerErr);
					stream = await navigator.mediaDevices.getUserMedia({
						video: true,
						audio: false
					});
				}
				if (cancelled) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				streamRef.current = stream;
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					await videoRef.current.play().catch(() => {});
				}
				setPhase("live");
			} catch (e) {
				let msg = e?.message || "Camera access denied";
				if (msg.includes("device not found") || msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) msg = "No webcam found. Please plug in a physical camera or check if another application is using it, then reload.";
				else if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) msg = "Camera permission was denied. Please click the camera/settings icon in your browser's address bar to grant access.";
				setErr(msg);
				setPhase("error");
			}
		})();
		return () => {
			cancelled = true;
			streamRef.current?.getTracks().forEach((t) => t.stop());
			streamRef.current = null;
		};
	}, [open]);
	const capture = async () => {
		if (!videoRef.current || !canvasRef.current) return;
		setPhase("scanning");
		await new Promise((r) => setTimeout(r, 900));
		const v = videoRef.current;
		const c = canvasRef.current;
		c.width = v.videoWidth || 640;
		c.height = v.videoHeight || 480;
		const ctx = c.getContext("2d");
		if (ctx) {
			ctx.translate(c.width, 0);
			ctx.scale(-1, 1);
			ctx.drawImage(v, 0, 0, c.width, c.height);
		}
		const dataUrl = c.toDataURL("image/jpeg", .7);
		setPhase("verified");
		await new Promise((r) => setTimeout(r, 500));
		streamRef.current?.getTracks().forEach((t) => t.stop());
		onCaptured(dataUrl);
		onClose();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-md p-0 overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, {
					className: "p-4 pb-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanFace, { className: "h-5 w-5 text-primary" }),
							" ",
							title
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative aspect-[4/3] bg-black",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
							ref: videoRef,
							playsInline: true,
							muted: true,
							className: "absolute inset-0 h-full w-full object-cover -scale-x-100"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
							ref: canvasRef,
							className: "hidden"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-none absolute inset-0 flex items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-56 w-44 rounded-[50%] border-2 ${phase === "verified" ? "border-emerald-400" : "border-primary/80"} shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-colors` })
						}),
						phase === "scanning" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" }),
						phase === "init" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute inset-0 grid place-items-center text-white/80 text-sm",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), " Starting camera…"]
							})
						}),
						phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute inset-0 grid place-items-center bg-black/70 text-white p-6 text-center text-sm",
							children: err || "Unable to access camera"
						}),
						phase === "verified" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute inset-0 grid place-items-center bg-emerald-500/25 text-white",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 text-lg font-semibold",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-6 w-6" }), " Face Verified"]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[11px] text-white/90",
							children: [
								phase === "live" && "Live · position your face inside the frame",
								phase === "scanning" && "Scanning…",
								phase === "verified" && "Matched"
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						onClick: onClose,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4 mr-1" }), " Cancel"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: capture,
						disabled: phase !== "live",
						className: "bg-gradient-brand text-white",
						children: phase === "scanning" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }), " Scanning"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-4 w-4 mr-2" }), " Capture & Verify"] })
					})]
				})
			]
		})
	});
}
function initials(n) {
	return n.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}
function PhotoCapture({ value, onChange, name = "", size = "md" }) {
	const [camOpen, setCamOpen] = (0, import_react.useState)(false);
	const fileRef = (0, import_react.useRef)(null);
	const dim = size === "lg" ? "h-28 w-28" : size === "sm" ? "h-14 w-14" : "h-20 w-20";
	const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
	const pickFile = (f) => {
		const r = new FileReader();
		r.onload = () => onChange(String(r.result));
		r.readAsDataURL(f);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `${dim} rounded-full ring-2 ring-primary/30 bg-primary/10 text-primary grid place-items-center overflow-hidden shrink-0 shadow-soft`,
				children: value ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: value,
					alt: name,
					className: "h-full w-full object-cover"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `font-semibold ${text}`,
					children: initials(name)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "outline",
								type: "button",
								onClick: () => setCamOpen(true),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-3.5 w-3.5 mr-1" }), " Camera"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "outline",
								type: "button",
								onClick: () => fileRef.current?.click(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-3.5 w-3.5 mr-1" }), " Upload"]
							}),
							value && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "ghost",
								type: "button",
								onClick: () => onChange(void 0),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: "image/*",
						hidden: true,
						onChange: (e) => {
							const f = e.target.files?.[0];
							if (f) pickFile(f);
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-muted-foreground",
						children: "Employee photo — used across HRMS, org chart, ID card."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaceCapture, {
				open: camOpen,
				onClose: () => setCamOpen(false),
				onCaptured: (url) => onChange(url),
				title: "Capture Employee Photo"
			})
		]
	});
}
var { saveAs } = import_FileSaver_min.default;
var EXIT_REASONS = [
	"Resignation (Better Opportunity)",
	"Resignation (Personal / Family)",
	"Resignation (Higher Studies)",
	"Retirement",
	"Contract Completion",
	"Termination (Performance)",
	"Termination (Misconduct)",
	"Absconding",
	"Death / Medical",
	"Other"
];
var EXIT_DOC_KEYS = [
	"relieving",
	"experience",
	"full_final",
	"exit_clearance"
];
function EmployeeActionsDialog({ employee, open, onClose, defaultKind = "exit" }) {
	if (!employee) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inner, {
		employee,
		open,
		onClose,
		defaultKind
	});
}
function Inner({ employee, open, onClose, defaultKind = "exit" }) {
	const { company, docAssets, updateEmployee, assets, assetAssignments, assetCategories, returnAsset, currentUser, addAudit } = useStore();
	const [kind, setKind] = (0, import_react.useState)(defaultKind);
	const [reason, setReason] = (0, import_react.useState)(EXIT_REASONS[0]);
	const [noticeDate, setNoticeDate] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [lastWorkingDate, setLastWorkingDate] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [rehireEligible, setRehireEligible] = (0, import_react.useState)(true);
	const [selectedExitDocs, setSelectedExitDocs] = (0, import_react.useState)({
		relieving: true,
		experience: true,
		full_final: true,
		exit_clearance: true
	});
	const [ei, setEi] = (0, import_react.useState)({
		reasonDetails: "",
		likedMost: "",
		likedLeast: "",
		suggestions: "",
		ratingCulture: "4",
		ratingManager: "4",
		ratingCompensation: "3",
		wouldRecommend: "yes"
	});
	const [toBranchId, setToBranchId] = (0, import_react.useState)("");
	const [newDesignation, setNewDesignation] = (0, import_react.useState)("");
	const [newDepartment, setNewDepartment] = (0, import_react.useState)("");
	const [transferEffective, setTransferEffective] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [transferReason, setTransferReason] = (0, import_react.useState)("Business requirement");
	const [manualKey, setManualKey] = (0, import_react.useState)("bonafide");
	const [manualExtra, setManualExtra] = (0, import_react.useState)("");
	const heldAssets = (0, import_react.useMemo)(() => {
		if (!employee) return [];
		return assetAssignments.filter((x) => x.employeeId === employee.id && !x.returnedAt).map((x) => {
			const a = assets.find((y) => y.id === x.assetId);
			return {
				assignment: x,
				asset: a,
				category: a && assetCategories.find((c) => c.id === a.categoryId)
			};
		}).filter((x) => !!x.asset);
	}, [
		assets,
		assetAssignments,
		assetCategories,
		employee
	]);
	const [returnChecked, setReturnChecked] = (0, import_react.useState)({});
	function buildExitInterviewTemplate() {
		return {
			key: "custom",
			title: "Exit Interview Report",
			category: "Exit",
			description: "Exit interview",
			body: `EXIT INTERVIEW — CONFIDENTIAL

Employee            : {{name}} ({{empCode}})
Designation         : {{designation}}
Department          : {{department}}
Date of Interview   : {{today}}
Notice Date         : ${noticeDate}
Last Working Date   : ${lastWorkingDate}
Primary Reason      : ${reason}
Details             : ${ei.reasonDetails || "—"}

1. What did you like most about working with {{company}}?
${ei.likedMost || "—"}

2. What did you like least, and what would you change?
${ei.likedLeast || "—"}

3. Suggestions for improvement:
${ei.suggestions || "—"}

4. Ratings (out of 5):
   Culture & Work Environment : ${ei.ratingCulture}
   Reporting Manager          : ${ei.ratingManager}
   Compensation & Benefits    : ${ei.ratingCompensation}

5. Would you recommend {{company}} as an employer?
   ${ei.wouldRecommend.toUpperCase()}

6. Re-hire eligibility (HR use): ${rehireEligible ? "YES — eligible" : "NO — not eligible"}

Signed by HR: ${currentUser?.name ?? "HR Officer"}
Employee acknowledgement: ${employee.name}`
		};
	}
	function buildAssetClearanceTemplate() {
		const rows = heldAssets.length === 0 ? "No company assets are recorded against this employee." : heldAssets.map((x, i) => `${i + 1}. ${x.asset.name} — Tag ${x.asset.tag}${x.asset.serial ? ` · SN ${x.asset.serial}` : ""} · ${x.category?.name ?? "—"}  [${returnChecked[x.assignment.id] ? "RETURNED ✓" : "PENDING"}]`).join("\n");
		return {
			key: "custom",
			title: "Asset Return & Clearance",
			category: "Exit",
			description: "Asset clearance",
			body: `ASSET RETURN & CLEARANCE FORM

Employee            : {{name}} ({{empCode}})
Last Working Date   : ${lastWorkingDate}

Company assets held / to be returned:
${rows}

I confirm that all company assets listed above have been returned in acceptable condition,
except as noted. Any pending items will be recovered from full & final settlement per policy.

Employee Signature       : ______________________
IT / Admin Verification  : ______________________
Finance Sign-off (FnF)   : ______________________
HR Sign-off              : ${currentUser?.name ?? "HR Officer"}`
		};
	}
	function buildTransferTemplate() {
		const toBranch = company.branches?.find((b) => b.id === toBranchId);
		return {
			key: "transfer",
			title: "Transfer Letter",
			category: "Movement",
			description: "Transfer",
			body: `Dear {{name}},

Consequent upon organisational requirements, and further to your discussions with the management, you are hereby transferred with effect from ${transferEffective}.

From : ${company.branches?.find((b) => b.id === employee.branchId)?.name ?? company.name} — ${employee.department} — ${employee.designation}
To   : ${toBranch?.name ?? "—"}${toBranch?.city ? ` (${toBranch.city}, ${toBranch.state})` : ""} — ${newDepartment || employee.department} — ${newDesignation || employee.designation}

Reason: ${transferReason}

All other terms and conditions of your employment shall remain unchanged. You are requested to complete a formal handover of your current responsibilities and report at the new location on the effective date.

We wish you the very best in this new assignment.`
		};
	}
	async function generateExitBundle() {
		const zip = new import_lib.default();
		const folder = zip.folder(`Exit_${employee.empCode}_${employee.name.replace(/\s+/g, "_")}`);
		for (const key of EXIT_DOC_KEYS) {
			if (!selectedExitDocs[key]) continue;
			const tpl = DEFAULT_TEMPLATES.find((t) => t.key === key);
			if (!tpl) continue;
			const { blob, filename } = generateLetterPDF(company, employee, tpl, docAssets);
			folder.file(filename, blob);
		}
		const ei = generateLetterPDF(company, employee, buildExitInterviewTemplate(), docAssets);
		folder.file(ei.filename, ei.blob);
		const ac = generateLetterPDF(company, employee, buildAssetClearanceTemplate(), docAssets);
		folder.file(ac.filename, ac.blob);
		for (const x of heldAssets) {
			if (!returnChecked[x.assignment.id] || !x.asset) continue;
			const { blob, filename } = generateAssetHandoverPDF(company, employee, {
				name: x.asset.name,
				tag: x.asset.tag,
				serial: x.asset.serial,
				category: x.category?.name,
				condition: x.asset.condition
			}, "return", docAssets);
			folder.file(`AssetReturn_${filename}`, blob);
		}
		saveAs(await zip.generateAsync({ type: "blob" }), `Exit_${employee.empCode}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.zip`);
		toast.success("Exit bundle generated");
	}
	function applyExit() {
		for (const x of heldAssets) if (returnChecked[x.assignment.id] && x.asset) returnAsset(x.assignment.id, currentUser?.name ?? "System", x.asset.condition);
		updateEmployee(employee.id, { remarks: `Exited on ${lastWorkingDate} — ${reason}${rehireEligible ? "" : " · NOT eligible for rehire"}` });
		addAudit({
			actorName: currentUser?.name ?? "System",
			entity: "employee",
			entityId: employee.id,
			action: "exit",
			newValue: {
				reason,
				noticeDate,
				lastWorkingDate,
				rehireEligible,
				exitInterview: ei
			}
		});
		toast.success(`${employee.name} marked as exited · assets released · audit logged`);
		onClose();
	}
	function applyTransfer() {
		if (!toBranchId) return toast.error("Pick destination branch");
		const patch = { branchId: toBranchId };
		if (newDesignation) patch.designation = newDesignation;
		if (newDepartment) patch.department = newDepartment;
		updateEmployee(employee.id, patch);
		addAudit({
			actorName: currentUser?.name ?? "System",
			entity: "employee",
			entityId: employee.id,
			action: "transfer",
			newValue: {
				toBranchId,
				transferEffective,
				reason: transferReason,
				newDesignation,
				newDepartment
			}
		});
		toast.success(`Transfer applied — letter downloaded`);
		downloadLetter(company, employee, buildTransferTemplate(), "pdf", docAssets);
		onClose();
	}
	async function generateManual(fmt) {
		const base = DEFAULT_TEMPLATES.find((t) => t.key === manualKey);
		const tpl = base ? manualExtra ? {
			...base,
			body: `${base.body}\n\nAdditional Notes:\n${manualExtra}`
		} : base : buildGenericTemplate(manualKey.toUpperCase(), manualKey.replace(/_/g, " "), employee, manualExtra);
		if (fmt === "pdf") {
			const { blob, filename } = generateLetterPDF(company, employee, tpl, docAssets);
			saveAs(blob, filename);
		} else {
			const { blob, filename } = await generateLetterDOCX(company, employee, tpl);
			saveAs(blob, filename);
		}
		toast.success(`${tpl.title} downloaded`);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-3xl max-h-[92vh] overflow-y-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }),
					"Employee Lifecycle Actions — ",
					employee.name
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
				employee.empCode,
				" · ",
				employee.designation,
				" · ",
				employee.department
			] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				value: kind,
				onValueChange: (v) => setKind(v),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
						className: "grid grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "exit",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DoorOpen, { className: "h-4 w-4 mr-1.5" }), " Relieve / Exit"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "transfer",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRightLeft, { className: "h-4 w-4 mr-1.5" }), " Transfer"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "manual",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePenLine, { className: "h-4 w-4 mr-1.5" }), " Manual Letter"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "exit",
						className: "space-y-4 pt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3 md:grid-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
										label: "Notice Date",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "date",
											value: noticeDate,
											onChange: (e) => setNoticeDate(e.target.value)
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
										label: "Last Working Date",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "date",
											value: lastWorkingDate,
											onChange: (e) => setLastWorkingDate(e.target.value)
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
										label: "Reason",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: reason,
											onValueChange: setReason,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: EXIT_REASONS.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: r,
												children: r
											}, r)) })]
										})
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
								label: "Reason details",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 2,
									value: ei.reasonDetails,
									onChange: (e) => setEi({
										...ei,
										reasonDetails: e.target.value
									}),
									placeholder: "Optional context…"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border p-3 space-y-2 bg-muted/30",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-sm font-semibold flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquareQuote, { className: "h-4 w-4 text-primary" }), " Exit Interview"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid gap-2 md:grid-cols-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
												label: "What did you like most?",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
													rows: 2,
													value: ei.likedMost,
													onChange: (e) => setEi({
														...ei,
														likedMost: e.target.value
													})
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
												label: "What would you change?",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
													rows: 2,
													value: ei.likedLeast,
													onChange: (e) => setEi({
														...ei,
														likedLeast: e.target.value
													})
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
												label: "Suggestions",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
													rows: 2,
													value: ei.suggestions,
													onChange: (e) => setEi({
														...ei,
														suggestions: e.target.value
													})
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "grid grid-cols-3 gap-2",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
														label: "Culture (/5)",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
															type: "number",
															min: 1,
															max: 5,
															value: ei.ratingCulture,
															onChange: (e) => setEi({
																...ei,
																ratingCulture: e.target.value
															})
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
														label: "Manager (/5)",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
															type: "number",
															min: 1,
															max: 5,
															value: ei.ratingManager,
															onChange: (e) => setEi({
																...ei,
																ratingManager: e.target.value
															})
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
														label: "Comp (/5)",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
															type: "number",
															min: 1,
															max: 5,
															value: ei.ratingCompensation,
															onChange: (e) => setEi({
																...ei,
																ratingCompensation: e.target.value
															})
														})
													})
												]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
											checked: rehireEligible,
											onCheckedChange: (v) => setRehireEligible(!!v)
										}), "Eligible for re-hire"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border p-3 space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-sm font-semibold flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageCheck, { className: "h-4 w-4 text-primary" }), " Asset Return Checklist"]
								}), heldAssets.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: "No company assets are currently held by this employee."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-1.5",
									children: heldAssets.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 text-sm rounded border p-2 hover:bg-muted/40",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
												checked: !!returnChecked[x.assignment.id],
												onCheckedChange: (v) => setReturnChecked((s) => ({
													...s,
													[x.assignment.id]: !!v
												}))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: x.asset.name }),
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-xs text-muted-foreground",
														children: [
															"· ",
															x.asset.tag,
															x.asset.serial ? ` · SN ${x.asset.serial}` : "",
															" · ",
															x.category?.name ?? "—"
														]
													})
												]
											}),
											returnChecked[x.assignment.id] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
												children: "Return acknowledged"
											})
										]
									}, x.assignment.id))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border p-3 space-y-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-sm font-semibold flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePenLine, { className: "h-4 w-4 text-primary" }), " Exit Documents"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid gap-1.5 md:grid-cols-2",
										children: EXIT_DOC_KEYS.map((k) => {
											const t = DEFAULT_TEMPLATES.find((x) => x.key === k);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 text-sm rounded border p-2 hover:bg-muted/40",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
													checked: !!selectedExitDocs[k],
													onCheckedChange: (v) => setSelectedExitDocs((s) => ({
														...s,
														[k]: !!v
													}))
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "flex-1",
													children: [
														t.title,
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "text-xs text-muted-foreground",
															children: ["· ", t.description]
														})
													]
												})]
											}, k);
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-muted-foreground",
										children: "Exit Interview report and Asset Clearance form are always included."
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
								className: "gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									onClick: generateExitBundle,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4 mr-1.5" }), " Generate Exit Bundle (ZIP)"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: applyExit,
									className: "bg-gradient-brand text-white",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 mr-1.5" }), " Complete Exit"]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "transfer",
						className: "space-y-4 pt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3 md:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
										label: "Destination Branch",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: toBranchId,
											onValueChange: setToBranchId,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Pick a branch…" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: (company.branches ?? []).filter((b) => b.id !== employee.branchId).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: b.id,
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "inline-flex items-center gap-1.5",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3.5 w-3.5" }),
														" ",
														b.name,
														" · ",
														b.city,
														", ",
														b.state
													]
												})
											}, b.id)) })]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
										label: "Effective Date",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "date",
											value: transferEffective,
											onChange: (e) => setTransferEffective(e.target.value)
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
										label: "New Designation (optional)",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: newDesignation,
											onChange: (e) => setNewDesignation(e.target.value),
											placeholder: employee.designation
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
										label: "New Department (optional)",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: newDepartment,
											onChange: (e) => setNewDepartment(e.target.value),
											placeholder: employee.department
										})
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
								label: "Reason",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 2,
									value: transferReason,
									onChange: (e) => setTransferReason(e.target.value)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
								className: "gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									onClick: async () => {
										if (!toBranchId) return toast.error("Pick destination branch");
										await downloadLetter(company, employee, buildTransferTemplate(), "pdf", docAssets);
										toast.success("Transfer letter downloaded");
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4 mr-1.5" }), " Download Transfer Letter"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: applyTransfer,
									className: "bg-gradient-brand text-white",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRightLeft, { className: "h-4 w-4 mr-1.5" }), " Apply Transfer"]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "manual",
						className: "space-y-4 pt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
								label: "Letter template",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: manualKey,
									onValueChange: (v) => setManualKey(v),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, {
										className: "max-h-72",
										children: DEFAULT_TEMPLATES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: t.key,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t.title }),
													" · ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-muted-foreground",
														children: t.category
													})
												]
											})
										}, t.key))
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field$1, {
								label: "Additional notes (appended to letter body)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 4,
									value: manualExtra,
									onChange: (e) => setManualExtra(e.target.value),
									placeholder: "Add any custom clauses, remarks or amounts…"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "h-3.5 w-3.5" }),
									"Letters auto-embed your uploaded letterhead, seal and signature from ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Settings → Company Documents" }),
									"."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
								className: "gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									onClick: () => generateManual("docx"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4 mr-1.5" }), " Download DOCX"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: () => generateManual("pdf"),
									className: "bg-gradient-brand text-white",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4 mr-1.5" }), " Download PDF"]
								})]
							})
						]
					})
				]
			})]
		})
	});
}
function Field$1({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
		className: "text-xs",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-1",
		children
	})] });
}
var empty = {
	empCode: "",
	password: "",
	name: "",
	email: "",
	phone: "",
	department: "Engineering",
	designation: "",
	doj: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
	basic: 25e3,
	pan: "",
	aadhaar: "",
	bankAcc: "",
	bankIfsc: "",
	shiftId: "gen",
	faceRegistered: false,
	status: "active",
	branchId: void 0,
	photoDataUrl: void 0
};
var FORM_STEPS = [
	{
		key: "photo",
		title: "Photo & Identity",
		icon: Camera
	},
	{
		key: "personal",
		title: "Personal Details",
		icon: User
	},
	{
		key: "address",
		title: "Address & KYC",
		icon: House
	},
	{
		key: "family",
		title: "Family & Emergency",
		icon: Users
	},
	{
		key: "education",
		title: "Education",
		icon: GraduationCap
	},
	{
		key: "experience",
		title: "Prior Experience",
		icon: Briefcase
	},
	{
		key: "skills",
		title: "Skills & Languages",
		icon: Award
	},
	{
		key: "compliance",
		title: "Compliance & BGV",
		icon: ShieldCheck
	},
	{
		key: "employment",
		title: "Employment & Salary",
		icon: Briefcase
	},
	{
		key: "branch",
		title: "Branch & Reporting",
		icon: Building2
	},
	{
		key: "verify",
		title: "AI Verification",
		icon: ScanFace
	},
	{
		key: "review",
		title: "Review & Finish",
		icon: CircleCheck
	}
];
var DOC_INSERT_AFTER = {
	OFR: "photo",
	CAC: "photo",
	EIF: "personal",
	PAY: "employment",
	BNK: "employment",
	APT: "branch",
	JOR: "branch",
	NDA: "branch",
	COC: "branch",
	POL: "branch",
	PFR: "branch",
	ESI: "branch",
	AST: "branch",
	IDC: "branch",
	IND: "branch",
	TRN: "branch"
};
function EmployeesPage() {
	const { employees, addEmployee, deleteEmployee, company, docAssets, ensureJourney, docLibrary, advanceJourneyStep, registrationDrafts, saveRegistrationDraft, deleteRegistrationDraft, addAudit, currentUser } = useStore();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [resumeDraftId, setResumeDraftId] = (0, import_react.useState)(null);
	const [actionEmp, setActionEmp] = (0, import_react.useState)(null);
	const [editingEmp, setEditingEmp] = (0, import_react.useState)(null);
	const [actionKind, setActionKind] = (0, import_react.useState)("exit");
	const openWizard = (draftId) => {
		setResumeDraftId(draftId ?? null);
		setOpen(true);
		setAiGuideMode({
			active: true,
			scope: "employee-registration"
		});
		aiNotify({
			title: "SWIFT AI is guiding onboarding",
			body: "I'll walk you through every doc in order. Progress auto-saves.",
			kind: "info"
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-semibold",
					children: "Employees"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Guided 20-step registration with AI validation, autosave, and audit trail."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
					open,
					onOpenChange: (o) => {
						setOpen(o);
						if (!o) setAiGuideMode({ active: false });
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "bg-gradient-brand text-white shadow-glow",
							onClick: () => openWizard(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Add Employee"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
						className: "max-w-4xl h-[80vh] max-h-[calc(100vh-40px)] p-0 overflow-hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RegistrationWizard, {
							draftId: resumeDraftId,
							onDone: () => {
								setOpen(false);
								setAiGuideMode({ active: false });
							}
						}, resumeDraftId ?? "new")
					})]
				})]
			}),
			registrationDrafts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-primary/30 bg-primary/5 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 mb-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "font-medium text-sm",
						children: [
							"Resume saved drafts (",
							registrationDrafts.length,
							")"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: registrationDrafts.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "hover:underline",
							onClick: () => openWizard(d.id),
							children: [
								d.data.name || "Unnamed",
								" · step ",
								d.currentStep + 1,
								" · ",
								new Date(d.updatedAt).toLocaleString()
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "ml-1 opacity-60 hover:opacity-100",
							onClick: () => deleteRegistrationDraft(d.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3" })
						})]
					}, d.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border border-border bg-card overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-muted/50",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "text-left",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Employee"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Department"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Branch"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3 text-right",
									children: "Basic"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3 text-right",
									children: "Monthly CTC"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3 text-right",
									children: "Actions"
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: employees.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						colSpan: 6,
						className: "p-10 text-center text-muted-foreground",
						children: [
							"No employees yet. Click ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Add Employee" }),
							" to start the guided registration."
						]
					}) }) : employees.map((e) => {
						const p = computePayroll({
							company,
							employee: e,
							daysWorked: company.workingDaysPerMonth,
							otHours: 0,
							incentive: 0,
							shiftDays: 0,
							loan: 0,
							advance: 0,
							bonus: 0
						});
						const branch = company.branches?.find((b) => b.id === e.branchId);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-9 w-9 rounded-full ring-2 ring-primary/25 overflow-hidden bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0",
											children: e.photoDataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: e.photoDataUrl,
												className: "h-full w-full object-cover",
												alt: e.name
											}) : e.name.split(" ").slice(0, 2).map((s) => s[0]).join("")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium",
											children: e.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[11px] text-muted-foreground font-mono",
											children: [
												e.empCode,
												" · ",
												e.designation
											]
										})] })]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3",
									children: e.department
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3",
									children: branch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										children: branch.code
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground text-xs",
										children: "—"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 text-right",
									children: inr(e.basic)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 text-right text-primary font-medium",
									children: inr(p.monthlyCTC)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 text-right",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "inline-flex gap-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												title: "Edit Employee",
												onClick: () => setEditingEmp(e),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4 text-primary" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												title: "Appointment letter",
												onClick: () => generateAppointmentPDF(company, e, p),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												title: "Transfer",
												onClick: () => {
													setActionEmp(e);
													setActionKind("transfer");
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRightLeft, { className: "h-4 w-4" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												title: "Relieve / Exit",
												onClick: () => {
													setActionEmp(e);
													setActionKind("exit");
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DoorOpen, { className: "h-4 w-4" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												title: "Manual letter",
												onClick: () => {
													setActionEmp(e);
													setActionKind("manual");
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePenLine, { className: "h-4 w-4" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												title: "Delete",
												onClick: () => {
													deleteEmployee(e.id);
													toast.success("Removed");
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4 text-destructive" })
											})
										]
									})
								})
							]
						}, e.id);
					}) })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmployeeActionsDialog, {
				employee: actionEmp,
				open: !!actionEmp,
				defaultKind: actionKind,
				onClose: () => setActionEmp(null)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditEmployeeDialog, {
				employee: editingEmp,
				open: !!editingEmp,
				onClose: () => setEditingEmp(null)
			})
		]
	});
}
function RegistrationWizard({ onDone, draftId }) {
	const { addEmployee, company, docAssets, ensureJourney, docLibrary, advanceJourneyStep, saveRegistrationDraft, deleteRegistrationDraft, addAudit, currentUser, employees } = useStore();
	const [initialDraft] = (0, import_react.useState)(() => draftId ? useStore.getState().registrationDrafts.find((d) => d.id === draftId) : void 0);
	const [step, setStep] = (0, import_react.useState)(initialDraft?.currentStep ?? 0);
	const [form, setForm] = (0, import_react.useState)({
		...empty,
		...initialDraft?.data ?? {}
	});
	const [signatures, setSignatures] = (0, import_react.useState)({});
	const [readAck, setReadAck] = (0, import_react.useState)({});
	const draftIdRef = (0, import_react.useRef)(initialDraft?.id ?? crypto.randomUUID());
	const [savedAt, setSavedAt] = (0, import_react.useState)(initialDraft?.updatedAt ?? null);
	(0, import_react.useEffect)(() => {
		const t = setTimeout(() => {
			if (!form.name && !form.empCode && step === 0) return;
			saveRegistrationDraft({
				id: draftIdRef.current,
				data: form,
				currentStep: step,
				createdBy: currentUser?.name ?? "HR"
			});
			setSavedAt((/* @__PURE__ */ new Date()).toISOString());
		}, 800);
		return () => clearTimeout(t);
	}, [form, step]);
	const onboardingDocs = (0, import_react.useMemo)(() => [...docLibrary].filter((d) => d.active && d.trigger === "on_registration").sort((a, b) => a.sequence - b.sequence), []);
	const flow = (0, import_react.useMemo)(() => {
		const out = [];
		for (const fs of FORM_STEPS) {
			out.push({
				kind: "form",
				key: fs.key,
				title: fs.title,
				icon: fs.icon
			});
			if (fs.key === "review") continue;
			onboardingDocs.filter((d) => (DOC_INSERT_AFTER[d.code] ?? "branch") === fs.key).forEach((d) => out.push({
				kind: "doc",
				key: `doc-${d.code}`,
				title: d.title,
				icon: FilePenLine,
				docCode: d.code,
				docId: d.id
			}));
		}
		return out;
	}, [onboardingDocs]);
	const current = flow[step];
	const canNext = () => {
		if (!current) return false;
		if (current.kind === "form") {
			if (current.key === "photo") return !!form.photoDataUrl && !!form.name && !!form.empCode && !!form.password;
			if (current.key === "personal") return !!form.name && !!form.email && !!form.phone;
			if (current.key === "employment") return !!form.designation && !!form.department && !!form.doj;
		}
		return true;
	};
	const finish = () => {
		if (!form.empCode || !form.name) return toast.error("Employee code and name required");
		const emp = addEmployee({
			...form,
			faceRegistered: !!form.photoDataUrl || form.faceRegistered
		});
		const journey = ensureJourney(emp.id);
		Object.values(signatures).forEach((s) => {
			const meta = docLibrary.find((d) => d.code === s.docCode);
			if (!meta) return;
			const jstep = journey.steps.find((st) => st.docId === meta.id);
			if (!jstep) return;
			advanceJourneyStep(emp.id, jstep.id, "signed", s.signedBy || "HR");
		});
		const p = computePayroll({
			company,
			employee: emp,
			daysWorked: company.workingDaysPerMonth,
			otHours: 0,
			incentive: 0,
			shiftDays: 0,
			loan: 0,
			advance: 0,
			bonus: 0
		});
		generateAppointmentPDF(company, emp, p);
		addAudit({
			actorName: currentUser?.name ?? "HR",
			entity: "employee",
			entityId: emp.id,
			action: "onboard-complete",
			device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : void 0,
			newValue: {
				docsSigned: Object.keys(signatures).length,
				empCode: emp.empCode
			}
		});
		deleteRegistrationDraft(draftIdRef.current);
		aiNotify({
			title: "✨ Employee onboarded",
			body: `${emp.name} · ${Object.keys(signatures).length} documents signed`,
			kind: "success"
		});
		toast.success(`${emp.name} onboarded — ${Object.keys(signatures).length} documents signed`);
		onDone();
	};
	const applyCompanySignatoryAll = () => {
		const pad = document.createElement("canvas");
		pad.width = 320;
		pad.height = 90;
		const ctx = pad.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, pad.width, pad.height);
		ctx.fillStyle = "#0f172a";
		ctx.font = "italic 34px 'Brush Script MT', cursive";
		ctx.fillText("HR Department", 12, 55);
		const url = pad.toDataURL();
		const bulk = { ...signatures };
		onboardingDocs.forEach((d) => {
			if (!bulk[d.code]) bulk[d.code] = {
				docCode: d.code,
				docTitle: d.title,
				letterKey: d.letterKey,
				signatureDataUrl: url,
				signedBy: "HR Department"
			};
		});
		setSignatures(bulk);
		aiNotify({
			title: "✨ Company signatory applied",
			body: `${onboardingDocs.length - Object.keys(signatures).length} documents auto-signed`,
			kind: "success"
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-[260px_1fr] h-full max-h-full overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "border-r border-border bg-muted/30 p-3 flex flex-col overflow-hidden h-full max-h-full",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, {
					className: "mb-3 px-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
						className: "flex items-center gap-2 text-base",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }), " Guided Registration"]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
					value: (step + 1) / flow.length * 100,
					className: "h-1.5 mb-1"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-[10px] text-muted-foreground mb-3 flex items-center gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-3 w-3" }), savedAt ? `Autosaved ${new Date(savedAt).toLocaleTimeString()}` : "Draft not saved yet"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "space-y-0.5 text-sm overflow-y-auto pr-1 flex-1",
					children: flow.map((s, i) => {
						const Icon = s.icon;
						const done = i < step;
						const active = i === step;
						const signed = s.kind === "doc" && !!signatures[s.docCode];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setStep(i),
							className: `w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${active ? "bg-gradient-brand text-white shadow-soft" : done || signed ? "text-emerald-600 hover:bg-muted" : "text-muted-foreground hover:bg-muted"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `h-5 w-5 rounded-full grid place-items-center text-[10px] font-semibold shrink-0 ${active ? "bg-white/20 text-white" : done || signed ? "bg-emerald-500 text-white" : "bg-muted-foreground/15"}`,
									children: done || signed ? "✓" : i + 1
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5 shrink-0" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-[12px]",
									children: s.kind === "doc" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[10px] opacity-70 mr-1",
										children: s.docCode
									}), s.title] }) : s.title
								})
							]
						}) }, s.key);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 pt-3 text-[11px] text-muted-foreground border-t border-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3 text-primary" }), " SWIFT AI live-guiding"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1",
						children: "Documents inserted in professional joining order."
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col h-full min-h-0 overflow-hidden",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 min-h-0 overflow-y-auto p-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
					mode: "wait",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 8
						},
						animate: {
							opacity: 1,
							y: 0
						},
						exit: {
							opacity: 0,
							y: -8
						},
						transition: { duration: .15 },
						className: "space-y-5",
						children: [
							current?.kind === "form" && current.key === "photo" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
										icon: Camera,
										title: "Photo & Identity",
										subtitle: "Photo is mandatory. Shows across HRMS, ID card, and org chart."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "rounded-2xl border border-border bg-card p-5",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhotoCapture, {
											value: form.photoDataUrl,
											onChange: (u) => setForm({
												...form,
												photoDataUrl: u,
												faceRegistered: !!u
											}),
											name: form.name,
											size: "lg"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-4",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Full Name *",
												value: form.name,
												onChange: (v) => setForm({
													...form,
													name: v
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Employee Code *",
												value: form.empCode,
												onChange: (v) => setForm({
													...form,
													empCode: v
												}),
												placeholder: "SW0001"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "col-span-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
													label: "Password *",
													type: "password",
													value: form.password || "",
													onChange: (v) => setForm({
														...form,
														password: v
													}),
													placeholder: "••••••••"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[11px] text-muted-foreground mt-1",
													children: "This password will be used by the employee to log into the Employee Portal."
												})]
											})
										]
									})
								]
							}),
							current?.kind === "form" && current.key === "personal" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
									icon: User,
									title: "Personal Details",
									subtitle: "Contact and KYC. Fields you skip can be filled by the employee later."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Email *",
											value: form.email,
											onChange: (v) => setForm({
												...form,
												email: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Phone *",
											value: form.phone,
											onChange: (v) => setForm({
												...form,
												phone: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Date of Birth",
											type: "date",
											value: form.dob || "",
											onChange: (v) => setForm({
												...form,
												dob: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Gender" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.gender || "",
											onValueChange: (v) => setForm({
												...form,
												gender: v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "male",
													children: "Male"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "female",
													children: "Female"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "other",
													children: "Other"
												})
											] })]
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Blood Group",
											value: form.bloodGroup || "",
											onChange: (v) => setForm({
												...form,
												bloodGroup: v
											}),
											placeholder: "O+"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Emergency Contact",
											value: form.emergencyContact || "",
											onChange: (v) => setForm({
												...form,
												emergencyContact: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												value: form.address || "",
												onChange: (e) => setForm({
													...form,
													address: e.target.value
												})
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "PAN",
											value: form.pan || "",
											onChange: (v) => setForm({
												...form,
												pan: v.toUpperCase()
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Aadhaar",
											value: form.aadhaar || "",
											onChange: (v) => setForm({
												...form,
												aadhaar: v
											})
										})
									]
								})]
							}),
							current?.kind === "form" && current.key === "address" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
									icon: House,
									title: "Address & Extended KYC",
									subtitle: "Current and permanent address, statutory numbers."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Address Line 1",
											value: form.addressLine1 || "",
											onChange: (v) => setForm({
												...form,
												addressLine1: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Address Line 2",
											value: form.addressLine2 || "",
											onChange: (v) => setForm({
												...form,
												addressLine2: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "City",
											value: form.city || "",
											onChange: (v) => setForm({
												...form,
												city: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "State",
											value: form.state || "",
											onChange: (v) => setForm({
												...form,
												state: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Country",
											value: form.country || "India",
											onChange: (v) => setForm({
												...form,
												country: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Pincode",
											value: form.pincode || "",
											onChange: (v) => setForm({
												...form,
												pincode: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "UAN",
											value: form.uan || "",
											onChange: (v) => setForm({
												...form,
												uan: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "ESIC",
											value: form.esic || "",
											onChange: (v) => setForm({
												...form,
												esic: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "PF Number",
											value: form.pfNumber || "",
											onChange: (v) => setForm({
												...form,
												pfNumber: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Passport #",
											value: form.passportNumber || "",
											onChange: (v) => setForm({
												...form,
												passportNumber: v
											})
										})
									]
								})]
							}),
							current?.kind === "form" && current.key === "family" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
										icon: Users,
										title: "Family & Emergency",
										subtitle: "Dependents, nominee, and emergency contact."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-4",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Marital Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
												value: form.maritalStatus || "",
												onValueChange: (v) => setForm({
													...form,
													maritalStatus: v
												}),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
														value: "single",
														children: "Single"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
														value: "married",
														children: "Married"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
														value: "divorced",
														children: "Divorced"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
														value: "widowed",
														children: "Widowed"
													})
												] })]
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Nationality",
												value: form.nationality || "Indian",
												onChange: (v) => setForm({
													...form,
													nationality: v
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Father's Name",
												value: form.fatherName || "",
												onChange: (v) => setForm({
													...form,
													fatherName: v
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Mother's Name",
												value: form.motherName || "",
												onChange: (v) => setForm({
													...form,
													motherName: v
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Spouse Name",
												value: form.spouseName || "",
												onChange: (v) => setForm({
													...form,
													spouseName: v
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Emergency Contact Name",
												value: form.emergencyName || "",
												onChange: (v) => setForm({
													...form,
													emergencyName: v
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Emergency Relation",
												value: form.emergencyRelation || "",
												onChange: (v) => setForm({
													...form,
													emergencyRelation: v
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Emergency Phone (Alt)",
												value: form.emergencyPhone2 || "",
												onChange: (v) => setForm({
													...form,
													emergencyPhone2: v
												})
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RepeatingList, {
										label: "Dependents / Family",
										items: form.family || [],
										empty: {
											name: "",
											relation: ""
										},
										onChange: (family) => setForm({
											...form,
											family
										}),
										columns: [
											{
												key: "name",
												label: "Name"
											},
											{
												key: "relation",
												label: "Relation",
												placeholder: "Spouse / Child"
											},
											{
												key: "dob",
												label: "DOB",
												type: "date"
											}
										]
									})
								]
							}),
							current?.kind === "form" && current.key === "education" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
									icon: GraduationCap,
									title: "Education",
									subtitle: "Highest and prior qualifications."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RepeatingList, {
									label: "Qualifications",
									items: form.education || [],
									empty: {
										level: "",
										institute: ""
									},
									onChange: (education) => setForm({
										...form,
										education
									}),
									columns: [
										{
											key: "level",
											label: "Degree / Level",
											placeholder: "B.E. / MBA / HSC"
										},
										{
											key: "institute",
											label: "Institute"
										},
										{
											key: "year",
											label: "Year"
										},
										{
											key: "grade",
											label: "Grade / CGPA"
										}
									]
								})]
							}),
							current?.kind === "form" && current.key === "experience" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
									icon: Briefcase,
									title: "Prior Experience",
									subtitle: "Previous employers, roles, and last drawn CTC."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RepeatingList, {
									label: "Employers",
									items: form.experience || [],
									empty: {
										company: "",
										role: ""
									},
									onChange: (experience) => setForm({
										...form,
										experience
									}),
									columns: [
										{
											key: "company",
											label: "Company"
										},
										{
											key: "role",
											label: "Role"
										},
										{
											key: "from",
											label: "From",
											type: "date"
										},
										{
											key: "to",
											label: "To",
											type: "date"
										},
										{
											key: "ctc",
											label: "Last CTC",
											type: "number"
										}
									]
								})]
							}),
							current?.kind === "form" && current.key === "skills" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
									icon: Award,
									title: "Skills & Languages",
									subtitle: "Comma-separated. AI will match to open requisitions."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Skills" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: (form.skills || []).join(", "),
										onChange: (e) => setForm({
											...form,
											skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
										}),
										placeholder: "React, Payroll, MS Excel"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Languages Known" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: (form.languagesKnown || []).join(", "),
										onChange: (e) => setForm({
											...form,
											languagesKnown: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
										}),
										placeholder: "English, Hindi, Tamil"
									})] })]
								})]
							}),
							current?.kind === "form" && current.key === "compliance" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
									icon: ShieldCheck,
									title: "Compliance & Background Verification",
									subtitle: "Statutory declarations and BGV status."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Background Check" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.backgroundCheckStatus || "pending",
											onValueChange: (v) => setForm({
												...form,
												backgroundCheckStatus: v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "pending",
													children: "Pending"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "clear",
													children: "Clear"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "flagged",
													children: "Flagged"
												})
											] })]
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3 pt-6",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: !!form.policeVerification,
												onChange: (e) => setForm({
													...form,
													policeVerification: e.target.checked
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Police verification submitted" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: !!form.medicalFitness,
												onChange: (e) => setForm({
													...form,
													medicalFitness: e.target.checked
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Medical fitness certified" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: !!form.ndaSigned,
												onChange: (e) => setForm({
													...form,
													ndaSigned: e.target.checked
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "NDA acknowledged" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Compliance Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												value: form.complianceNotes || "",
												onChange: (e) => setForm({
													...form,
													complianceNotes: e.target.value
												}),
												placeholder: "Any exceptions, waivers, or clarifications"
											})]
										})
									]
								})]
							}),
							current?.kind === "form" && current.key === "verify" && (() => {
								const issues = [];
								if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) issues.push("PAN format looks invalid");
								if (form.aadhaar && form.aadhaar.replace(/\s/g, "").length !== 12) issues.push("Aadhaar should be 12 digits");
								if (form.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc)) issues.push("IFSC format looks invalid");
								if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) issues.push("Email format looks invalid");
								if (!form.emergencyName && !form.emergencyContact) issues.push("No emergency contact captured");
								if (!form.family || form.family.length === 0) issues.push("No family/nominee entries");
								if (employees.find((e) => e.empCode.toLowerCase() === form.empCode.toLowerCase())) issues.push(`Employee code ${form.empCode} already exists`);
								const passed = issues.length === 0;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
										icon: ScanFace,
										title: "AI Verification",
										subtitle: "SWIFT AI checks the entered data before onboarding."
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: `rounded-2xl border p-5 ${passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 mb-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: `h-4 w-4 ${passed ? "text-emerald-600" : "text-amber-600"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "font-medium",
													children: passed ? "All checks passed" : `${issues.length} issue(s) detected`
												})]
											}),
											passed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-sm text-muted-foreground",
												children: "Format, duplicates, and completeness look good. Safe to onboard."
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
												className: "text-sm list-disc pl-5 space-y-1",
												children: issues.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: s }, i))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-3",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													size: "sm",
													variant: "outline",
													onClick: () => setForm({
														...form,
														aiVerification: {
															ranAt: (/* @__PURE__ */ new Date()).toISOString(),
															issues,
															passed
														}
													}),
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, { className: "h-3.5 w-3.5 mr-1.5" }), " Record AI verification"]
												})
											})
										]
									})]
								});
							})(),
							current?.kind === "form" && current.key === "employment" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
									icon: Briefcase,
									title: "Employment & Salary",
									subtitle: "Role, joining date, salary and bank details."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Department *",
											value: form.department,
											onChange: (v) => setForm({
												...form,
												department: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Designation *",
											value: form.designation,
											onChange: (v) => setForm({
												...form,
												designation: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Date of Joining *",
											type: "date",
											value: form.doj,
											onChange: (v) => setForm({
												...form,
												doj: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Basic Salary (Monthly ₹)",
											type: "number",
											value: String(form.basic),
											onChange: (v) => setForm({
												...form,
												basic: +v || 0
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "Bank Account",
											value: form.bankAcc || "",
											onChange: (v) => setForm({
												...form,
												bankAcc: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											label: "IFSC",
											value: form.bankIfsc || "",
											onChange: (v) => setForm({
												...form,
												bankIfsc: v.toUpperCase()
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Shift" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.shiftId,
											onValueChange: (v) => setForm({
												...form,
												shiftId: v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: company.shifts.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
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
										})] })
									]
								})]
							}),
							current?.kind === "form" && current.key === "branch" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
										icon: Building2,
										title: "Branch & Reporting",
										subtitle: "Assign to a branch (with its own geo-fence) and reporting manager."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Branch" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.branchId || "__none",
											onValueChange: (v) => setForm({
												...form,
												branchId: v === "__none" ? void 0 : v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select branch" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "__none",
												children: "— Unassigned —"
											}), (company.branches ?? []).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
												value: b.id,
												children: [
													b.name,
													" · ",
													b.code,
													b.isHead ? " · HQ" : ""
												]
											}, b.id))] })]
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Reports to" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.managerId || "__none",
											onValueChange: (v) => setForm({
												...form,
												managerId: v === "__none" ? void 0 : v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "No manager" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "__none",
												children: "— Top of company —"
											}), employees.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
												value: e.id,
												children: [
													e.name,
													" · ",
													e.designation
												]
											}, e.id))] })]
										})] })]
									}),
									form.branchId && (() => {
										const b = company.branches?.find((x) => x.id === form.branchId);
										if (!b) return null;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "font-medium flex items-center gap-1.5",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-4 w-4 text-primary" }),
														" ",
														b.name
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs text-muted-foreground",
													children: [
														b.address,
														", ",
														b.city,
														", ",
														b.state
													]
												}),
												b.lat != null && b.lng != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs",
													children: [
														"Geo-fence: ",
														b.radiusMeters ?? 150,
														"m of ",
														b.lat.toFixed(4),
														", ",
														b.lng.toFixed(4)
													]
												}),
												b.shiftStart && b.shiftEnd && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs",
													children: [
														"Shift: ",
														b.shiftStart,
														" – ",
														b.shiftEnd
													]
												})
											]
										});
									})()
								]
							}),
							current?.kind === "doc" && (() => {
								const d = onboardingDocs.find((x) => x.code === current.docCode);
								if (!d) return null;
								const sig = signatures[d.code];
								const seqIdx = onboardingDocs.findIndex((x) => x.code === d.code);
								const previewEmp = {
									...form,
									id: "preview"
								};
								const tpl = d.letterKey ? DEFAULT_TEMPLATES.find((t) => t.key === d.letterKey) ?? buildGenericTemplate(d.code, d.title, previewEmp) : buildGenericTemplate(d.code, d.title, previewEmp);
								const rendered = renderTemplate(tpl.body, buildVars(company, previewEmp));
								const hasRead = !!readAck[d.code];
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
											icon: FilePenLine,
											title: `${d.title}`,
											subtitle: `Document ${seqIdx + 1} of ${onboardingDocs.length} · ${d.category} · Code ${d.code}`
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-2xl border border-border bg-card p-5 space-y-4",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start justify-between gap-3",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2 flex-wrap",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																variant: "outline",
																className: "text-[10px]",
																children: d.code
															}),
															d.mandatory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																className: "text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30",
																children: "Mandatory"
															}),
															d.autoGenerate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																className: "text-[10px] bg-primary/15 text-primary border-primary/30",
																children: "AI Generated"
															}),
															d.sealRequired && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																variant: "outline",
																className: "text-[10px]",
																children: "Seal"
															}),
															d.digitalSignatureRequired && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
																variant: "outline",
																className: "text-[10px]",
																children: "e-Sign"
															})
														]
													}), sig && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
														className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3 mr-1" }),
															" Signed by ",
															sig.signedBy
														]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "rounded-xl border border-border bg-white text-neutral-900 shadow-inner max-h-[420px] overflow-y-auto",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "px-6 py-4 border-b border-neutral-200 flex items-center justify-between",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "text-[11px] uppercase tracking-wide text-neutral-500",
																children: "Letter preview · read before you sign"
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "text-[11px] text-neutral-500",
																children: company.legalName
															})]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
															className: "px-6 py-5 whitespace-pre-wrap font-serif text-[13px] leading-relaxed",
															children: rendered
														}),
														sig?.signatureDataUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "px-6 pb-6",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																	className: "text-[11px] text-neutral-500 mb-1",
																	children: "Employee signature"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
																	src: sig.signatureDataUrl,
																	alt: "signature",
																	className: "h-14 max-w-[240px] object-contain bg-white border border-neutral-200 rounded"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	className: "text-[11px] text-neutral-600 mt-1",
																	children: [
																		sig.signedBy,
																		" · ",
																		(/* @__PURE__ */ new Date()).toLocaleString("en-IN")
																	]
																})
															]
														})
													]
												}),
												!sig && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: "flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm cursor-pointer",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
														checked: hasRead,
														onCheckedChange: (v) => setReadAck((s) => ({
															...s,
															[d.code]: !!v
														})),
														className: "mt-0.5"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-medium",
														children: "I have read and understood this document."
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "block text-xs text-muted-foreground",
														children: "Signature pad unlocks after you acknowledge."
													})] })]
												}),
												sig?.signatureDataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-5 w-5 text-emerald-600" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-xs",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																className: "font-medium",
																children: ["Signed by ", sig.signedBy]
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "text-muted-foreground",
																children: "Download the signed copy for records — signature, seal and letterhead are embedded."
															})]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
															size: "sm",
															variant: "ghost",
															className: "ml-auto",
															onClick: () => {
																setSignatures((s) => {
																	const n = { ...s };
																	delete n[d.code];
																	return n;
																});
																setReadAck((s) => ({
																	...s,
																	[d.code]: false
																}));
															},
															children: "Re-sign"
														})
													]
												}) : hasRead ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ESignPad, {
													defaultName: form.name,
													onSign: (dataUrl, meta) => {
														setSignatures((s) => ({
															...s,
															[d.code]: {
																docCode: d.code,
																docTitle: d.title,
																letterKey: d.letterKey,
																signatureDataUrl: dataUrl,
																signedBy: meta.signedBy
															}
														}));
														aiNotify({
															title: `✍️ ${d.code} signed`,
															body: `${d.title} by ${meta.signedBy}`,
															kind: "success"
														});
													}
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "rounded-lg border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground text-center",
													children: "Please read the letter above and tick the acknowledgement to enable signing."
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													variant: "outline",
													size: "sm",
													onClick: applyCompanySignatoryAll,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, { className: "h-3.5 w-3.5 mr-1.5" }), " Apply company signatory to all remaining"]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													variant: "outline",
													size: "sm",
													disabled: !sig,
													onClick: async () => {
														if (!form.name || !form.empCode) {
															toast.error("Enter name and employee code first");
															return;
														}
														await downloadLetter(company, previewEmp, tpl, "pdf", docAssets);
														toast.success(`${d.code} PDF downloaded — signature & seal embedded`);
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-3.5 w-3.5 mr-1.5" }), " Download signed PDF"]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													variant: "outline",
													size: "sm",
													disabled: !sig,
													onClick: async () => {
														if (!form.name || !form.empCode) {
															toast.error("Enter name and employee code first");
															return;
														}
														await downloadLetter(company, previewEmp, tpl, "docx", docAssets);
														toast.success(`${d.code} DOCX downloaded — editable`);
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-3.5 w-3.5 mr-1.5" }), " Download DOCX"]
												}),
												sig && step < flow.length - 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													size: "sm",
													className: "bg-gradient-brand text-white ml-auto",
													onClick: () => setStep(step + 1),
													children: ["Continue ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3.5 w-3.5 ml-1" })]
												})
											]
										})
									]
								});
							})(),
							current?.kind === "form" && current.key === "review" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepHead, {
										icon: CircleCheck,
										title: "Review & Finish",
										subtitle: "Confirm the details before creating the employee."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-2xl border border-border bg-card p-5 flex items-start gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-20 w-20 rounded-full ring-2 ring-primary/30 overflow-hidden bg-primary/10 grid place-items-center text-primary text-xl font-semibold shrink-0",
											children: form.photoDataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: form.photoDataUrl,
												className: "h-full w-full object-cover",
												alt: ""
											}) : form.name.split(" ").slice(0, 2).map((s) => s[0]).join("")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-lg font-semibold",
													children: form.name || "Unnamed"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-sm text-muted-foreground",
													children: [
														form.designation || "—",
														" · ",
														form.department,
														" · ",
														form.empCode || "—"
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["📧 ", form.email || "—"] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["📞 ", form.phone || "—"] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["💰 Basic ", inr(form.basic)] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["📅 DOJ ", form.doj] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["🏢 Branch: ", company.branches?.find((b) => b.id === form.branchId)?.name || "—"] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["👤 Reports to: ", employees.find((e) => e.id === form.managerId)?.name || "Top of company"] })
													]
												})
											]
										})]
									}),
									(() => {
										const p = resolveAttendanceProfile(form, company);
										const shiftName = company.shifts.find((s) => s.id === p.shiftId)?.name;
										const leaveNames = (p.leaveTypeIds ?? []).map((id) => company.leaveTypes.find((l) => l.id === id)?.name).filter(Boolean);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-2xl border border-primary/30 bg-primary/5 p-5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 text-sm font-medium mb-2",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }),
													"Auto-assigned attendance profile",
													p.ruleName && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: "outline",
														className: "ml-1",
														children: p.ruleName
													})
												]
											}), p.ruleId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "grid grid-cols-2 gap-2 text-xs text-muted-foreground",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["🕒 Shift: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-foreground",
														children: shiftName ?? "—"
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["📅 Weekly off: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-foreground",
														children: (p.weeklyOff ?? []).join(", ") || "—"
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["🌴 Leave types: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-foreground",
														children: leaveNames.join(", ") || "—"
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["📍 Geo-fence: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-foreground",
														children: p.geofenceFromBranch ? "Branch-based" : "None"
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["💼 Payroll group: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-foreground",
														children: p.payrollGroup ?? "—"
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["🏷 Cost centre: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-foreground",
														children: p.costCentre ?? "—"
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "col-span-2",
														children: ["🗓 Holiday calendar: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-foreground",
															children: p.holidayCalendar ?? "—"
														})]
													})
												]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs text-muted-foreground",
												children: "No matching rule — configure defaults in Settings → Attendance Profile Defaults."
											})]
										});
									})(),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-2xl border border-border bg-card p-5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-sm font-medium mb-2",
											children: [
												"Documents signed (",
												Object.keys(signatures).length,
												"/",
												onboardingDocs.length,
												")"
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-wrap gap-1.5",
											children: onboardingDocs.map((d) => {
												const signed = !!signatures[d.code];
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
													variant: signed ? "default" : "outline",
													className: signed ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : "",
													children: [signed && "✓ ", d.code]
												}, d.id);
											})
										})]
									})
								]
							})
						]
					}, current?.key ?? step)
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "shrink-0 flex items-center justify-between border-t border-border bg-card/95 backdrop-blur px-6 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						disabled: step === 0,
						onClick: () => setStep(step - 1),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4 mr-1" }), " Back"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-muted-foreground",
						children: [
							"Step ",
							step + 1,
							" of ",
							flow.length
						]
					}),
					step < flow.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "bg-gradient-brand text-white",
						disabled: !canNext(),
						onClick: () => setStep(step + 1),
						children: ["Continue ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4 ml-1" })]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "bg-gradient-brand text-white shadow-glow",
						onClick: finish,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 mr-1" }), " Create Employee"]
					})
				]
			})]
		})]
	});
}
function StepHead({ icon: Icon, title, subtitle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-9 w-9 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-soft",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-xl font-semibold",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted-foreground",
			children: subtitle
		})] })]
	}) });
}
function Field({ label, value, onChange, type = "text", placeholder }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
		type,
		value,
		onChange: (e) => onChange(e.target.value),
		placeholder
	})] });
}
function RepeatingList({ label, items, empty, onChange, columns }) {
	const update = (i, patch) => {
		const next = items.slice();
		next[i] = {
			...next[i],
			...patch
		};
		onChange(next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card p-4 space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "outline",
				onClick: () => onChange([...items ?? [], { ...empty }]),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5 mr-1" }), " Add"]
			})]
		}), items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-muted-foreground py-2",
			children: "No entries yet."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2",
			children: items.map((it, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 items-end",
				style: { gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr)) auto` },
				children: [columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					className: "text-[11px] text-muted-foreground",
					children: c.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: c.type ?? "text",
					value: String(it[c.key] ?? ""),
					placeholder: c.placeholder,
					onChange: (e) => update(i, { [c.key]: c.type === "number" ? Number(e.target.value) || 0 : e.target.value })
				})] }, c.key)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					onClick: () => onChange(items.filter((_, x) => x !== i)),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
				})]
			}, i))
		})]
	});
}
function EditEmployeeDialog({ employee, open, onClose }) {
	const { updateEmployee, company } = useStore();
	const [form, setForm] = (0, import_react.useState)({});
	(0, import_react.useEffect)(() => {
		if (employee) setForm({ ...employee });
	}, [employee]);
	if (!employee) return null;
	const handleSave = () => {
		if (!form.name?.trim() || !form.empCode?.trim()) return toast.error("Full Name and Employee Code are required");
		updateEmployee(employee.id, {
			...form,
			faceRegistered: !!form.photoDataUrl || form.faceRegistered
		});
		toast.success(`${form.name} updated successfully`);
		onClose();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl max-h-[90vh] overflow-y-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
					className: "flex items-center gap-2 font-display text-xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-5 w-5 text-primary" }), " Edit Employee Details"]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-border bg-card p-4 space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider",
								children: "Photo & Credentials"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhotoCapture, {
								value: form.photoDataUrl,
								onChange: (u) => setForm({
									...form,
									photoDataUrl: u,
									faceRegistered: !!u
								}),
								name: form.name,
								size: "lg"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-4 pt-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Full Name *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.name || "",
										onChange: (e) => setForm({
											...form,
											name: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Employee Code *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.empCode || "",
										onChange: (e) => setForm({
											...form,
											empCode: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Password * (for Employee Portal login)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "text",
											value: form.password || "",
											onChange: (e) => setForm({
												...form,
												password: e.target.value
											}),
											placeholder: "Enter password"
										})]
									})
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-border bg-card p-4 space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider",
							children: "Employment Information"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Work Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "email",
									value: form.email || "",
									onChange: (e) => setForm({
										...form,
										email: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Phone" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.phone || "",
									onChange: (e) => setForm({
										...form,
										phone: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Department" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.department || "Engineering",
									onValueChange: (v) => setForm({
										...form,
										department: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [
										"Engineering",
										"HR",
										"Sales",
										"Operations",
										"Finance",
										"Marketing",
										"Legal",
										"Executive",
										"Design"
									].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: d,
										children: d
									}, d)) })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Designation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.designation || "",
									onChange: (e) => setForm({
										...form,
										designation: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Date of Joining" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									value: form.doj || "",
									onChange: (e) => setForm({
										...form,
										doj: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Basic Salary (₹)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									value: form.basic ?? 25e3,
									onChange: (e) => setForm({
										...form,
										basic: +e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Branch" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.branchId || "__none",
									onValueChange: (v) => setForm({
										...form,
										branchId: v === "__none" ? void 0 : v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select branch" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "__none",
										children: "— Unassigned —"
									}), (company.branches ?? []).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
										value: b.id,
										children: [
											b.name,
											" · ",
											b.code
										]
									}, b.id))] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.status || "active",
									onValueChange: (v) => setForm({
										...form,
										status: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "active",
										children: "Active"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "inactive",
										children: "Inactive"
									})] })]
								})] })
							]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-2 pt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: onClose,
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: handleSave,
						className: "bg-gradient-brand text-white",
						children: "Save Changes"
					})]
				})
			]
		})
	});
}
//#endregion
export { EmployeesPage as component };
