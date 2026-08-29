import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { applyThemePalette } from "@/lib/palettes";
import { Moon, Sun } from "lucide-react";

export function ThemeInit() {
  const theme = useStore((s) => s.theme);
  const paletteId = useStore((s) => s.company?.themePalette);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark";
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");

    applyThemePalette(paletteId || "copper-wave", isDark);
  }, [theme, paletteId]);

  return null;
}

export function ThemeToggle() {
  const { theme, setTheme } = useStore();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full p-2 hover:bg-accent transition-colors border border-border"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
