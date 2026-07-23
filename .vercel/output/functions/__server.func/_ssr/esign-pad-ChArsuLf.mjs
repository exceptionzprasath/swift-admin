import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { H as PenLine, Vt as Check, d as Type, j as RotateCcw, l as Upload } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as Input } from "./input-DicJzR9-.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BYfOmXtJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/esign-pad-ChArsuLf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ESignPad({ onSign, defaultName = "", compact }) {
	const canvasRef = (0, import_react.useRef)(null);
	const drawing = (0, import_react.useRef)(false);
	const [name, setName] = (0, import_react.useState)(defaultName);
	const [typed, setTyped] = (0, import_react.useState)(defaultName);
	const [hasStroke, setHasStroke] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const c = canvasRef.current;
		if (!c) return;
		const dpr = window.devicePixelRatio || 1;
		c.width = c.offsetWidth * dpr;
		c.height = c.offsetHeight * dpr;
		const ctx = c.getContext("2d");
		ctx.scale(dpr, dpr);
		ctx.strokeStyle = "#0f172a";
		ctx.lineWidth = 2;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
	}, []);
	const point = (e) => {
		const rect = e.currentTarget.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
	};
	const start = (e) => {
		drawing.current = true;
		const ctx = e.currentTarget.getContext("2d");
		const p = point(e);
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const move = (e) => {
		if (!drawing.current) return;
		const ctx = e.currentTarget.getContext("2d");
		const p = point(e);
		ctx.lineTo(p.x, p.y);
		ctx.stroke();
		setHasStroke(true);
	};
	const end = () => {
		drawing.current = false;
	};
	const clear = () => {
		const c = canvasRef.current;
		if (!c) return;
		c.getContext("2d").clearRect(0, 0, c.width, c.height);
		setHasStroke(false);
	};
	const commitDrawn = () => {
		if (!canvasRef.current || !hasStroke) return;
		onSign(canvasRef.current.toDataURL("image/png"), {
			signedBy: name || "Signatory",
			method: "draw"
		});
	};
	const commitTyped = () => {
		if (!typed.trim()) return;
		const c = document.createElement("canvas");
		c.width = 600;
		c.height = 160;
		const ctx = c.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, c.width, c.height);
		ctx.fillStyle = "#0f172a";
		ctx.font = "italic 56px 'Brush Script MT', 'Segoe Script', cursive";
		ctx.textBaseline = "middle";
		ctx.fillText(typed, 30, 80);
		onSign(c.toDataURL("image/png"), {
			signedBy: typed,
			method: "type"
		});
	};
	const upload = (f) => {
		const r = new FileReader();
		r.onload = () => onSign(String(r.result), {
			signedBy: name || "Signatory",
			method: "upload"
		});
		r.readAsDataURL(f);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: compact ? "space-y-2" : "space-y-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
			defaultValue: "draw",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
					className: "grid w-full grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "draw",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PenLine, { className: "h-3.5 w-3.5 mr-1" }), "Draw"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "type",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Type, { className: "h-3.5 w-3.5 mr-1" }), "Type"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "upload",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-3.5 w-3.5 mr-1" }), "Upload"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
					value: "draw",
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-lg border border-dashed border-border bg-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
							ref: canvasRef,
							onPointerDown: start,
							onPointerMove: move,
							onPointerUp: end,
							onPointerLeave: end,
							className: "block w-full h-32 cursor-crosshair touch-none"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								placeholder: "Signatory name",
								value: name,
								onChange: (e) => setName(e.target.value),
								className: "h-8 text-xs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "ghost",
								onClick: clear,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-3.5 w-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								onClick: commitDrawn,
								disabled: !hasStroke,
								className: "bg-gradient-brand text-white",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 mr-1" }), " Apply"]
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
					value: "type",
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Type your full name",
						value: typed,
						onChange: (e) => setTyped(e.target.value),
						className: "text-2xl italic font-serif h-14"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: commitTyped,
						disabled: !typed.trim(),
						className: "bg-gradient-brand text-white w-full",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 mr-1" }), " Apply typed signature"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
					value: "upload",
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "file",
						accept: "image/*",
						onChange: (e) => {
							const f = e.target.files?.[0];
							if (f) upload(f);
						}
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-muted-foreground",
						children: "Upload scanned signature (PNG/JPG)."
					})]
				})
			]
		})
	});
}
//#endregion
export { ESignPad as t };
