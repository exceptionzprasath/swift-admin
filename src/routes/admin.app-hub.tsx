import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, MessagesSquare } from "lucide-react";
import { NoticesPage } from "./admin.notices";
import { AdminTeamChatPage } from "./admin.team-chat";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/app-hub")({
  head: () => ({ meta: [{ title: "App Hub · CreatonsHR" }] }),
  component: AppHubPage,
});

export function AppHubPage() {
  const { notices } = useStore();

  const [activeTab, setActiveTab] = useState<"notices" | "chat">(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (tabParam === "chat" || tabParam === "team-chat") return "chat";
      if (tabParam === "notices" || tabParam === "notice-board") return "notices";
    }
    return "notices";
  });

  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (tabParam === "chat" || tabParam === "team-chat") {
        setActiveTab("chat");
      } else if (tabParam === "notices" || tabParam === "notice-board") {
        setActiveTab("notices");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (tab: "notices" | "chat") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    }
  };

  const activeNoticesCount = useMemo(() => {
    return (notices || []).length;
  }, [notices]);

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-background">
      {/* Top Section Frosted Capsule Tab Bar (Left-aligned) */}
      <div className="px-4 sm:px-8 py-3 border-b border-border/40 bg-background/80 dark:bg-background/50 backdrop-blur-md flex items-center justify-start gap-4 flex-wrap shrink-0 z-20">
        <div className="inline-flex items-center gap-1 p-1 sm:gap-1.5 sm:p-1.5 rounded-full border border-primary/35 dark:border-primary/45 bg-card/75 dark:bg-card/50 backdrop-blur-xl shadow-xs shadow-primary/5">
          <button
            type="button"
            onClick={() => handleTabChange("notices")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "notices"
                ? "text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "notices" && (
              <motion.div
                layoutId="appHubActiveTabPill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Megaphone className="h-4 w-4 shrink-0" />
              <span>Notice Board</span>
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full font-mono font-medium transition-colors shrink-0",
                  activeTab === "notices"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {activeNoticesCount}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("chat")}
            className={cn(
              "relative px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors flex items-center gap-2 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === "chat"
                ? "text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "chat" && (
              <motion.div
                layoutId="appHubActiveTabPill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 shrink-0" />
              <span>Team Chat</span>
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "notices" ? (
            <motion.div
              key="notices-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="h-full overflow-y-auto p-4 sm:p-8"
            >
              <NoticesPage isEmbedded />
            </motion.div>
          ) : (
            <motion.div
              key="chat-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="h-full w-full overflow-hidden"
            >
              <AdminTeamChatPage isEmbedded />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
