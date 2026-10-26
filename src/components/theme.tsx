import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { applyThemePalette } from "@/lib/palettes";
import { Moon, Sun } from "lucide-react";

export function ThemeInit() {
  const theme = useStore((s) => s.theme);
  const paletteId = useStore((s) => s.company?.themePalette);
  const setTheme = useStore((s) => s.setTheme);
  const setThemePalette = useStore((s) => s.setThemePalette);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark";
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");

    applyThemePalette(paletteId || "copper-wave", isDark);
  }, [theme, paletteId]);

  // Synchronize theme & palette instantly across multiple browser tabs (e.g. Admin Panel <-> Common Attendance Kiosk)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("swift-theme-sync");
      channel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;
        if (data.theme && (data.theme === "light" || data.theme === "dark")) {
          const currentTheme = useStore.getState().theme;
          if (currentTheme !== data.theme) {
            setTheme(data.theme);
          }
        }
        if (data.paletteId) {
          const currentPalette = useStore.getState().company?.themePalette;
          if (currentPalette !== data.paletteId) {
            setThemePalette(data.paletteId);
          }
        }
      };
    } catch (_err) {}

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key?.includes("swift-hrms") || e.key === "swift-theme-broadcast") {
        try {
          const tenantId = localStorage.getItem("swift-active-tenant");
          const key = tenantId ? `swift-hrms-${tenantId}` : "swift-hrms";
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const state = parsed.state || parsed;
            if (state.theme && state.theme !== useStore.getState().theme) {
              setTheme(state.theme);
            }
            if (state.company?.themePalette && state.company.themePalette !== useStore.getState().company?.themePalette) {
              setThemePalette(state.company.themePalette);
            }
          }
        } catch (_storageErr) {}
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [setTheme, setThemePalette]);

  return null;
}

export function ThemeToggle({ className }: { className?: string } = {}) {
  const { theme, setTheme } = useStore();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={className || "rounded-full p-2 hover:bg-accent transition-colors border border-border"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
