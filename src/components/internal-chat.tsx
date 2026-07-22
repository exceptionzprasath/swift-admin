// SWIFT — Floating Internal Chat panel usable in both Admin and Employee portals.
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, X, Search, Users, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useChat, threadIdFor, ADMIN_CHAT_ID, ADMIN_CHAT_NAME } from "@/lib/chat-store";
import { useStore } from "@/lib/store";

type Contact = { id: string; name: string; sub?: string };

type Props = {
  me: { id: string; name: string };
  contacts: Contact[];
  title?: string;
};

export function InternalChat({ me, contacts, title = "Internal Chat" }: Props) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const { messages, send, markRead, threadMessages } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => contacts.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())),
    [contacts, q],
  );

  const unreadByContact = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contacts) {
      const tid = threadIdFor(me.id, c.id);
      map[c.id] = messages.filter((m) => m.threadId === tid && m.from !== me.id && !m.read).length;
    }
    return map;
  }, [messages, contacts, me.id]);

  const totalUnread = Object.values(unreadByContact).reduce((a, b) => a + b, 0);
  const active = contacts.find((c) => c.id === activeId) ?? null;
  const thread = active ? threadMessages(me.id, active.id) : [];

  useEffect(() => {
    if (active) markRead(threadIdFor(me.id, active.id), me.id);
  }, [active, messages.length, markRead, me.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread.length, open, active]);

  const handleSend = () => {
    if (!active || !text.trim()) return;
    send({ from: me.id, fromName: me.name, to: active.id, text });
    setText("");
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="fixed z-50 bottom-24 md:bottom-6 right-4 h-13 w-13 h-13 rounded-full bg-gradient-brand animate-swift-gradient shadow-glow text-white flex items-center justify-center"
        style={{ height: 52, width: 52 }}
        aria-label="Open internal chat"
      >
        {totalUnread > 0 && (
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-swift-ping" />
        )}
        <MessageSquare className="h-5 w-5 relative" />
        {totalUnread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-coral text-white text-[10px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-semibold ring-2 ring-background"
          >
            {totalUnread}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed z-50 bottom-40 md:bottom-24 right-4 w-[92vw] sm:w-[380px] h-[min(540px,calc(100vh-10rem))] rounded-3xl border border-border/60 glass shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-brand animate-swift-gradient text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-25 bg-gradient-mesh pointer-events-none" />
              <div className="flex items-center gap-2 relative min-w-0">
                {active && (
                  <button onClick={() => setActiveId(null)} className="p-1 rounded-full hover:bg-white/20">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="h-8 w-8 rounded-full bg-white/15 grid place-items-center backdrop-blur shrink-0">
                  {active ? <span className="text-xs font-bold">{active.name.slice(0,2).toUpperCase()}</span> : <Users className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{active ? active.name : title}</div>
                  <div className="text-[10px] opacity-90 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    {active?.sub ?? "Online now"}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-full hover:bg-white/20 relative">
                <X className="h-4 w-4" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!active ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 overflow-y-auto"
                >
                  <div className="p-3 border-b border-border sticky top-0 bg-card/90 backdrop-blur z-10">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search contacts…"
                        className="pl-8 h-8 text-sm rounded-full"
                      />
                    </div>
                  </div>
                  {filtered.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">No contacts</div>
                  )}
                  {filtered.map((c, i) => (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => setActiveId(c.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 text-left border-b border-border/40 group transition-colors"
                    >
                      <div className="relative h-10 w-10 rounded-full bg-gradient-brand text-white text-xs flex items-center justify-center font-semibold shrink-0 shadow-soft">
                        {c.name.slice(0, 2).toUpperCase()}
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-card" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{c.name}</div>
                        {c.sub && <div className="text-[11px] text-muted-foreground truncate">{c.sub}</div>}
                      </div>
                      {unreadByContact[c.id] > 0 && (
                        <Badge className="bg-coral text-white text-[10px] h-5 rounded-full animate-pulse">
                          {unreadByContact[c.id]}
                        </Badge>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="thread"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-muted/20 to-background/40">
                    {thread.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        Start the conversation with {active.name}
                      </div>
                    )}
                    <AnimatePresence initial={false}>
                      {thread.map((m) => {
                        const mine = m.from === me.id;
                        return (
                          <motion.div
                            key={m.id}
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 320, damping: 26 }}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-soft ${
                                mine
                                  ? "bg-gradient-brand text-white rounded-br-sm"
                                  : "bg-card border border-border rounded-bl-sm"
                              }`}
                            >
                              <div className="whitespace-pre-wrap break-words">{m.text}</div>
                              <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                                {new Date(m.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                  <div className="p-2 border-t border-border flex items-center gap-2 bg-card">
                    <Input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={`Message ${active.name}…`}
                      className="h-9 text-sm rounded-full"
                    />
                    <Button size="icon" onClick={handleSend} disabled={!text.trim()} className="bg-gradient-brand text-white rounded-full h-9 w-9 shadow-soft hover:shadow-glow transition-shadow">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Convenience wrappers that build the contact list from live store data.
export function AdminInternalChat() {
  const { employees, currentUser } = useStore();
  const contacts = employees
    .filter((e) => e.status === "active")
    .map((e) => ({ id: e.id, name: e.name, sub: `${e.empCode ?? ""} · ${e.designation ?? ""}`.replace(/^ · /, "") }));
  const me = { id: ADMIN_CHAT_ID, name: currentUser?.name ?? ADMIN_CHAT_NAME };
  return <InternalChat me={me} contacts={contacts} title="Message employees" />;
}

export function EmployeeInternalChat() {
  const { employees, currentUser } = useStore();
  const meEmp = employees.find((e) => e.id === currentUser?.employeeId);
  if (!meEmp) return null;
  const manager = employees.find((e) => e.id === meEmp.managerId);
  const contacts: { id: string; name: string; sub?: string }[] = [
    { id: ADMIN_CHAT_ID, name: ADMIN_CHAT_NAME, sub: "HR & Admin team" },
  ];
  if (manager) contacts.push({ id: manager.id, name: manager.name, sub: `Reporting manager · ${manager.designation ?? ""}` });
  // Peers on same branch
  employees
    .filter((e) => e.id !== meEmp.id && e.id !== manager?.id && e.branchId === meEmp.branchId && e.status === "active")
    .slice(0, 30)
    .forEach((e) => contacts.push({ id: e.id, name: e.name, sub: e.designation ?? "" }));
  return <InternalChat me={{ id: meEmp.id, name: meEmp.name }} contacts={contacts} title="Message HR & team" />;
}
