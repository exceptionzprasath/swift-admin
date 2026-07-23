import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { f as useStore } from "./store-Dj1aT4sf.mjs";
import { K as Moon, _ as Sun } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/theme-BEP-9Srt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ThemeInit() {
	const theme = useStore((s) => s.theme);
	(0, import_react.useEffect)(() => {
		const root = document.documentElement;
		if (theme === "dark") root.classList.add("dark");
		else root.classList.remove("dark");
	}, [theme]);
	return null;
}
function ThemeToggle() {
	const { theme, setTheme } = useStore();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
		className: "rounded-full p-2 hover:bg-accent transition-colors border border-border",
		"aria-label": "Toggle theme",
		children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "h-4 w-4" })
	});
}
//#endregion
export { ThemeToggle as n, ThemeInit as t };
