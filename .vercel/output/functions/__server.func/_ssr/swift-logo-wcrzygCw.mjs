import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/swift-logo-wcrzygCw.js
var import_jsx_runtime = require_jsx_runtime();
function SwiftLogo({ size = 32, showText = true }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			viewBox: "0 0 64 64",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
					id: "swiftGrad",
					x1: "0",
					y1: "0",
					x2: "64",
					y2: "64",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "0%",
							stopColor: "#5EEAD4"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "55%",
							stopColor: "#2DD4BF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "100%",
							stopColor: "#F87171"
						})
					]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M40 6 C 48 14, 46 28, 34 32 C 46 34, 50 46, 42 56 C 34 62, 22 58, 18 46 C 26 50, 34 46, 34 38 C 24 38, 18 30, 22 20 C 26 12, 34 8, 40 6 Z",
					fill: "url(#swiftGrad)"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M46 14 C 52 22, 50 32, 42 34 L 40 32 C 46 30, 48 22, 44 16 Z",
					fill: "url(#swiftGrad)",
					opacity: "0.6"
				})
			]
		}), showText && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "leading-none",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "font-display text-xl font-semibold tracking-[0.25em]",
				children: "SWIFT"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[9px] tracking-[0.2em] text-muted-foreground uppercase",
				children: "HR Software"
			})]
		})]
	});
}
//#endregion
export { SwiftLogo as t };
