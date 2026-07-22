import { useState, useRef, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import JSZip from "jszip";
import { useStore } from "@/lib/store";
import { type Role } from "@/lib/ai-context";
import { buildEnterpriseSnapshot, suggestionsFor } from "@/lib/ai-knowledge";
import { askSwiftAi } from "@/lib/ai.functions";
import { aiGuide } from "@/lib/ai-guide-bus";
import { parseComplianceCommand, renderComplianceDocPDF } from "@/lib/compliance-docs";
import { useComplianceDocs, blobToDataUrl } from "@/lib/compliance-docs-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Send, Loader2, Bot, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { role: "user" | "assistant"; content: string };

export function SwiftAiCopilot({ role = "admin", viewerEmployeeId }: { role?: Role; viewerEmployeeId?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [guideActive, setGuideActive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi — I'm **SWIFT AI**, your enterprise intelligence copilot. I know your company's branches, employees, attendance, payroll, compliance, assets and documents. Ask me anything, or pick a suggestion below." },
  ]);
  const scroller = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askSwiftAi);
  const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();
  const suggestions = useMemo(() => suggestionsFor(role), [role]);

  useEffect(() => { scroller.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [messages, busy]);

  // Live notifications & guide-mode subscription
  useEffect(() => {
    const off1 = aiGuide.notify.on((n) => {
      const icon = n.kind === "rule" ? "🧠" : n.kind === "warn" ? "⚠️" : n.kind === "success" ? "✨" : "💡";
      toast(`${icon} ${n.title}`, { description: n.body });
      setPulse(true);
      setTimeout(() => setPulse(false), 1400);
    });
    const off2 = aiGuide.mode.on((m) => {
      setGuideActive(!!m.active);
      if (m.active) {
        setOpen(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `🎯 **Guide mode enabled.** I'll walk you through **${m.scope?.replace(/-/g, " ")}** and turn what you tell me into company rules. Ask me anything as we go.` },
        ]);
      }
    });
    return () => { off1(); off2(); };
  }, []);

  const archive = useComplianceDocs((s) => s.archive);

  const tryComplianceCommand = async (text: string): Promise<string | null> => {
    const specs = parseComplianceCommand(text);
    if (!specs.length) return null;
    const zip = new JSZip();
    const lines: string[] = [];
    for (const s of specs) {
      const { blob, filename, ref } = await renderComplianceDocPDF(s, { company, employees });
      zip.file(filename, blob);
      const dataUrl = await blobToDataUrl(blob);
      archive({
        specId: s.id, code: s.code, title: s.title, ref, filename, dataUrl, size: blob.size,
        createdBy: "swift-ai", approvals: [], signed: false, sealed: !!s.requiresSeal,
        watermark: s.watermark, tags: [s.act, s.kind],
      });
      lines.push(`- **${s.code}** — ${s.title} · ${(blob.size / 1024).toFixed(1)} KB · Ref \`${ref}\``);
    }
    const bundle = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(bundle);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SWIFT_AI_Docs_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    return `✅ Generated **${specs.length}** compliance document(s), auto-filled from your tenant data. Bundle downloaded and archived at **/admin/compliance-docs**.\n\n${lines.join("\n")}`;
  };

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const cmdResult = await tryComplianceCommand(text);
      if (cmdResult) {
        setMessages((m) => [...m, { role: "assistant", content: cmdResult }]);
        toast.success("Compliance documents generated");
        return;
      }
      const snapshot = buildEnterpriseSnapshot({ company, employees, attendance, payrolls, leaves, docRequests, role, viewerEmployeeId });
      const res = await ask({ data: { messages: next, snapshot } });
      if (res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: res.content }]);
        // Detect "rule captured" language and echo as live notification
        if (/rule\s*(?:added|captured|created)/i.test(res.content)) {
          aiGuide.notify.emit({ title: "Rule captured", body: res.content.slice(0, 120), kind: "rule" });
        }
      } else {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${res.error}` }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-50 h-16 w-16 rounded-full flex items-center justify-center animate-swift-float"
          aria-label="Open SWIFT AI"
        >
          {/* Ping rings */}
          <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-40 animate-swift-ping" />
          <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-20 animate-swift-ping" style={{ animationDelay: "0.7s" }} />
          {/* Core */}
          <span className="relative h-14 w-14 rounded-full bg-gradient-brand animate-swift-gradient animate-swift-glow flex items-center justify-center text-white shadow-glow">
            <Bot className="h-6 w-6 drop-shadow" />
            {/* Orbiting sparkle */}
            <motion.span
              className="absolute h-2.5 w-2.5 rounded-full bg-white shadow-glow"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "center", top: -6, left: "50%", marginLeft: -5 }}
            />
            <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-coral animate-pulse" />
          </span>
          {(guideActive || pulse) && (
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-coral text-[10px] font-bold text-white grid place-items-center ring-2 ring-background">
              <Zap className="h-3 w-3" />
            </span>
          )}
        </motion.button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed bottom-40 md:bottom-24 left-4 md:left-6 z-50 w-[min(420px,calc(100vw-1.5rem))] h-[min(640px,calc(100vh-10rem))] md:h-[min(640px,calc(100vh-6rem))] rounded-3xl border border-border/60 glass shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/10 bg-gradient-brand animate-swift-gradient text-white flex items-center gap-3 relative overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-gradient-mesh pointer-events-none" />
              <div className="relative h-9 w-9 rounded-full bg-white/15 grid place-items-center backdrop-blur">
                <Bot className="h-5 w-5" />
                <span className="absolute inset-0 rounded-full ring-2 ring-white/40 animate-swift-ping" />
              </div>
              <div className="flex-1 relative">
                <div className="font-display font-semibold text-sm flex items-center gap-1.5">
                  SWIFT AI
                  {guideActive && <span className="text-[10px] bg-white/25 rounded-full px-2 py-0.5">Guide mode</span>}
                </div>
                <div className="text-[11px] opacity-90 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Tenant-scoped · {company.name}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8 relative" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div ref={scroller} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-background/50 to-muted/30">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}
                >
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-gradient-brand grid place-items-center shrink-0 text-white shadow-soft">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "bg-gradient-brand text-white rounded-br-sm shadow-soft" : "bg-card border border-border rounded-bl-sm"}`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-table:my-2 prose-headings:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {busy && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                  <div className="h-7 w-7 rounded-full bg-gradient-brand grid place-items-center text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: `swift-typing-dot 1.2s ease-in-out ${d * 0.15}s infinite` }} />
                    ))}
                  </div>
                </motion.div>
              )}
              {messages.length === 1 && !busy && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Suggested
                  </div>
                  {suggestions.map((s: string, idx) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.06 }}
                      onClick={() => send(s)}
                      className="block w-full text-left text-xs rounded-xl border border-border px-3 py-2 hover:bg-primary/5 hover:border-primary/40 hover:translate-x-0.5 transition-all"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-2.5 border-t border-border flex gap-2 bg-card">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={guideActive ? "Tell me the rule (e.g. 'Sunday = 2× pay')" : "Ask about your company…"}
                disabled={busy}
                className="flex-1 rounded-full"
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} className="bg-gradient-brand text-white rounded-full shadow-soft hover:shadow-glow transition-shadow">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
