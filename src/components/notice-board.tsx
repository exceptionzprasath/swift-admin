import { useMemo } from "react";
import { useStore, type Notice, type Employee } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Pin, AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function noticesFor(all: Notice[], viewer: { role: "admin" | "employee"; emp?: Employee }): Notice[] {
  const now = Date.now();
  return all
    .filter((n) => !n.expiresAt || new Date(n.expiresAt).getTime() > now)
    .filter((n) => {
      if (viewer.role === "admin") return true;
      const emp = viewer.emp;
      if (!emp) return n.audience.scope === "company";
      const a = n.audience;
      switch (a.scope) {
        case "company": return true;
        case "branch": return !!emp.branchId && a.values.includes(emp.branchId);
        case "department": return a.values.includes(emp.department);
        case "role": return a.values.some((v) => v.toLowerCase() === emp.designation.toLowerCase());
        case "employees": return a.values.includes(emp.id);
      }
    })
    .sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      const rank = { urgent: 3, important: 2, info: 1 } as const;
      if (rank[b.priority] !== rank[a.priority]) return rank[b.priority] - rank[a.priority];
      return b.createdAt.localeCompare(a.createdAt);
    });
}

const priTone: Record<Notice["priority"], string> = {
  urgent: "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300",
  important: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  info: "border-primary/30 bg-primary/5 text-primary",
};
const priIcon: Record<Notice["priority"], typeof Info> = {
  urgent: AlertTriangle, important: Pin, info: Info,
};

export function NoticeBoard({
  viewer,
  userKey,
  compact,
  emptyText = "No active notices right now.",
}: {
  viewer: { role: "admin" | "employee"; emp?: Employee };
  userKey: string;
  compact?: boolean;
  emptyText?: string;
}) {
  const { notices, markNoticeRead, company } = useStore();
  const list = useMemo(() => noticesFor(notices, viewer), [notices, viewer]);
  const unread = list.filter((n) => !n.readBy.includes(userKey)).length;

  const audienceLabel = (n: Notice) => {
    if (n.audience.scope === "company") return "Entire company";
    if (n.audience.scope === "branch")
      return "Branch: " + n.audience.values.map((id) => company.branches?.find((b) => b.id === id)?.name || id).join(", ");
    if (n.audience.scope === "department") return "Dept: " + n.audience.values.join(", ");
    if (n.audience.scope === "role") return "Role: " + n.audience.values.join(", ");
    return `${n.audience.values.length} employee(s)`;
  };

  return (
    <div className={`relative rounded-2xl border border-border/60 glass ${compact ? "p-4" : "p-5"} overflow-hidden`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand animate-swift-gradient" />
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <span className="relative inline-flex h-8 w-8 rounded-full bg-primary/10 items-center justify-center">
            <Megaphone className="h-4 w-4 text-primary" />
            {unread > 0 && <span className="absolute inset-0 rounded-full bg-primary/25 animate-swift-ping" />}
          </span>
          Notice Board
          {unread > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-1">
              <Badge className="bg-gradient-brand text-white animate-pulse">{unread} new</Badge>
            </motion.span>
          )}
        </h3>
        <span className="text-xs text-muted-foreground">{list.length} active</span>
      </div>
      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">{emptyText}</div>
      ) : (
        <div className={`space-y-2 ${compact ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
          <AnimatePresence initial={false}>
            {list.map((n, idx) => {
              const Icon = priIcon[n.priority];
              const isRead = n.readBy.includes(userKey);
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -12, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 12, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24, delay: Math.min(idx * 0.04, 0.3) }}
                  whileHover={{ x: 2 }}
                  className={`relative overflow-hidden rounded-xl border p-3 ${priTone[n.priority]} ${isRead ? "opacity-70" : ""} ${!isRead && n.priority === "urgent" ? "animate-swift-glow" : ""}`}
                >
                  {!isRead && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-70" />
                  )}
                  <div className="flex items-start gap-2">
                    <motion.div
                      animate={n.priority === "urgent" && !isRead ? { rotate: [0, 12, -10, 8, -4, 0] } : {}}
                      transition={{ duration: 2.2, repeat: Infinity }}
                    >
                      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {n.pinned && <Pin className="h-3 w-3" />}
                        <span className="font-semibold text-sm">{n.title}</span>
                        <Badge variant="outline" className="text-[10px] uppercase py-0 px-1.5">{n.priority}</Badge>
                        <span className="text-[10px] text-muted-foreground">· {audienceLabel(n)}</span>
                      </div>
                      <p className="text-xs mt-1 whitespace-pre-wrap text-foreground/80">{n.body}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>By {n.createdBy} · {new Date(n.createdAt).toLocaleString()}{n.expiresAt ? ` · until ${new Date(n.expiresAt).toLocaleDateString()}` : ""}</span>
                        {!isRead && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] hover:bg-primary/10" onClick={() => markNoticeRead(n.id, userKey)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export function NoticeBell({ viewer, userKey, onOpen }: { viewer: { role: "admin" | "employee"; emp?: Employee }; userKey: string; onOpen?: () => void }) {
  const { notices } = useStore();
  const list = useMemo(() => noticesFor(notices, viewer), [notices, viewer]);
  const unread = list.filter((n) => !n.readBy.includes(userKey)).length;
  if (unread === 0) return null;
  return (
    <Button variant="ghost" size="sm" onClick={onOpen} className="relative">
      <Megaphone className="h-4 w-4" />
      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold grid place-items-center">
        {unread}
      </span>
    </Button>
  );
}

// keep noticed lint quiet
void X;
