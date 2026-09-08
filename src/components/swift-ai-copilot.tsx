import { useState, useRef, useEffect, useMemo } from "react";
import LottieRaw from "lottie-react";
import chatbotAnimationRaw from "@/assets/chatbot.json";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { type Role } from "@/lib/ai-context";
import { suggestionsFor } from "@/lib/ai-knowledge";
import { aiGuide } from "@/lib/ai-guide-bus";
import { useUnifiedAiStore } from "@/lib/ai-unified-store";
import { aiOrchestrator } from "@/lib/ai-orchestrator";
import { AIResponseRenderer } from "@/components/ai/AIResponseRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Send, Loader2, Bot, Zap, FileText, MessageSquare, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const Lottie = (LottieRaw as any)?.default || LottieRaw;
const chatbotAnimation = (chatbotAnimationRaw as any)?.default || chatbotAnimationRaw;

export function SwiftAiCopilot({ role = "admin", viewerEmployeeId }: { role?: Role; viewerEmployeeId?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [guideActive, setGuideActive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const { activeTenantId } = useAuth();
  const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();
  const suggestions = useMemo(() => suggestionsFor(role), [role]);

  // Unified Store
  const {
    messages,
    isGenerating: busy,
    setTenant,
  } = useUnifiedAiStore();

  // Sync tenant session
  useEffect(() => {
    if (activeTenantId) {
      setTenant(activeTenantId, company.name);
    }
  }, [activeTenantId, company.name, setTenant]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages, busy]);

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
      }
    });
    return () => {
      off1();
      off2();
    };
  }, []);

  const handleGeneratePdfForQuery = (query: string, rawContent?: string) => {
    aiOrchestrator.downloadQueryReport(query, rawContent, {
      company,
      employees,
      attendance,
      payrolls,
      leaves,
      docRequests,
      role,
      viewerEmployeeId,
    });
  };

  const send = async (text: string, forceFormat?: "pdf" | "text") => {
    if (!text.trim() || busy) return;

    setInput("");
    await aiOrchestrator.dispatchUserMessage(text, {
      source: "LIVE_BRAIN",
      forceFormat,
      viewerEmployeeId,
      context: {
        company,
        employees,
        attendance,
        payrolls,
        leaves,
        docRequests,
        role,
        viewerEmployeeId,
      },
    });
  };

  return (
    <>
      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.94 }}
          className="fixed bottom-40 md:bottom-22 right-3 md:right-5 z-50 h-24 w-24 rounded-full flex items-center justify-center animate-swift-float cursor-pointer group"
          aria-label="Open SWIFT AI"
        >
          {/* Lottie Animation Only */}
          <span className="relative h-24 w-24 flex items-center justify-center overflow-hidden">
            <Lottie animationData={chatbotAnimation} loop={true} className="w-full h-full object-contain scale-110" />
          </span>
          {(guideActive || pulse) && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-coral text-[10px] font-bold text-white grid place-items-center ring-2 ring-background z-10">
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
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-[min(420px,calc(100vw-1.5rem))] h-[min(640px,calc(100vh-10rem))] md:h-[min(640px,calc(100vh-6rem))] rounded-3xl border border-border/60 glass shadow-2xl flex flex-col overflow-hidden"
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
                  <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 font-normal">OpenAI</span>
                  {guideActive && <span className="text-[10px] bg-white/25 rounded-full px-2 py-0.5">Guide mode</span>}
                </div>
                <div className="text-[11px] opacity-90 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Live Brain · {company.name}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8 relative cursor-pointer" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div ref={scroller} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-background/50 to-muted/30">
              {messages.map((m, i) => (
                <motion.div
                  key={m.id || i}
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
                  <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-xs ${m.role === "user" ? "bg-gradient-brand text-white rounded-br-xs shadow-soft" : "bg-card border border-border/90 rounded-bl-xs text-foreground"}`}>
                    {/* Subtle Source indicator if originated from Copilot */}
                    {m.role === "user" && m.source && (
                      <div className="text-[9px] opacity-75 mb-1 text-right font-mono">
                        via {m.source === "LIVE_BRAIN" ? "Live Brain" : "Copilot"}
                      </div>
                    )}
                    {/* Unified Structured AI Response Renderer */}
                    <div className="my-1">
                      <AIResponseRenderer
                        message={m}
                        compact
                        onRunQuery={(q) => send(q)}
                        onDownloadPdf={(q, c) => handleGeneratePdfForQuery(q, c)}
                      />
                    </div>

                    {/* Interactive Format Selection Buttons */}
                    {m.isFormatPrompt && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-col gap-2">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" /> Select output format:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => send("PDF format", "pdf")}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <FileText className="h-3.5 w-3.5" /> 📄 PDF Format
                          </button>
                          <button
                            onClick={() => send("Text format", "text")}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-xs font-semibold transition cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-primary" /> 💬 Text Format
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Download PDF button on report answers */}
                    {m.downloadQuery && !m.isFormatPrompt && (
                      <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">Export as official document</span>
                        <button
                          onClick={() => handleGeneratePdfForQuery(m.downloadQuery!, m.content)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold transition cursor-pointer active:scale-95"
                        >
                          <Download className="h-3 w-3" /> Download PDF
                        </button>
                      </div>
                    )}
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
                      className="block w-full text-left text-xs rounded-xl border border-border px-3 py-2 hover:bg-primary/5 hover:border-primary/40 hover:translate-x-0.5 transition-all cursor-pointer"
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
                className="flex-1 rounded-full text-xs"
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} className="bg-gradient-brand text-white rounded-full shadow-soft hover:shadow-glow transition-shadow cursor-pointer">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
