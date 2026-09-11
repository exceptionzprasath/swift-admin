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
import { Sparkles, X, Send, Loader2, Bot, Zap, FileText, FileSpreadsheet, MessageSquare, Download, Minus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const Lottie = (LottieRaw as any)?.default || LottieRaw;
const chatbotAnimation = (chatbotAnimationRaw as any)?.default || chatbotAnimationRaw;

import { resolveUserContext } from "@/lib/ai-auth-resolver";

export function SwiftAiCopilot({ role: propRole, viewerEmployeeId: propViewerEmployeeId }: { role?: Role; viewerEmployeeId?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [guideActive, setGuideActive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const { activeTenantId, user, isSuperAdmin, memberships } = useAuth();
  const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();

  const authContext = useMemo(() => {
    return resolveUserContext(user, isSuperAdmin, memberships, employees, company);
  }, [user, isSuperAdmin, memberships, employees, company]);

  const role = propRole || authContext.role;
  const viewerEmployeeId = propViewerEmployeeId || authContext.viewerEmployeeId;

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

  const handleGeneratePdfForQuery = (query: string, rawContent?: string, structuredData?: any) => {
    aiOrchestrator.downloadQueryReport(
      query,
      rawContent,
      {
        company,
        employees,
        attendance,
        payrolls,
        leaves,
        docRequests,
        role,
        viewerEmployeeId,
      },
      structuredData
    );
  };

  const handleGenerateExcelForQuery = (query: string, rawContent?: string, structuredData?: any) => {
    aiOrchestrator.downloadQueryExcel(
      query,
      rawContent,
      {
        company,
        employees,
        attendance,
        payrolls,
        leaves,
        docRequests,
        role,
        viewerEmployeeId,
      },
      structuredData
    );
  };

  const send = async (text: string, forceFormat?: "pdf" | "excel" | "text") => {
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

  const [isMinimized, setIsMinimized] = useState(false);
  const isDraggingRef = useRef(false);

  return (
    <>
      {!open && isMinimized && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          whileHover={{ scale: 1.05, x: -2 }}
          onClick={() => setIsMinimized(false)}
          className="fixed right-0 bottom-24 md:bottom-20 z-50 rounded-l-full bg-gradient-brand text-white pl-3 pr-2 py-2 shadow-lg shadow-primary/20 flex items-center gap-1.5 cursor-pointer border-y border-l border-white/20 backdrop-blur text-xs font-semibold group"
          title="Click to restore SWIFT AI Copilot"
        >
          <Bot className="h-4 w-4 animate-pulse" />
          <span className="hidden group-hover:inline text-[11px] pr-1">SWIFT AI</span>
          <Sparkles className="h-3 w-3 text-amber-300" />
        </motion.button>
      )}

      {!open && !isMinimized && (
        <motion.div
          drag
          dragMomentum={false}
          onDragStart={() => {
            isDraggingRef.current = true;
          }}
          onDragEnd={() => {
            // Short delay to avoid firing click after drag release
            setTimeout(() => {
              isDraggingRef.current = false;
            }, 100);
          }}
          whileDrag={{ scale: 1.08, cursor: "grabbing" }}
          className="fixed bottom-28 md:bottom-20 right-4 md:right-6 z-50 touch-none group"
        >
          {/* Minimize button on hover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="absolute -top-1 -left-1 z-20 h-5 w-5 rounded-full bg-muted/90 dark:bg-card/90 border border-border/80 text-foreground/70 hover:text-foreground hover:bg-destructive hover:text-destructive-foreground shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
            title="Minimize to side tab"
          >
            <Minus className="h-3 w-3" />
          </button>

          <motion.button
            onClick={() => {
              if (!isDraggingRef.current) {
                setOpen(true);
              }
            }}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="relative h-15 w-15 md:h-16 md:w-16 rounded-full flex items-center justify-center bg-background/85 dark:bg-card/85 backdrop-blur-md border border-primary/25 shadow-xl hover:shadow-primary/20 cursor-grab active:cursor-grabbing transition-shadow"
            aria-label="Open SWIFT AI (Drag to reposition)"
            title="SWIFT AI (Drag anywhere to move • Click to open)"
          >
            {/* Ambient subtle glow ring */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-primary/5 to-purple-500/20 blur-sm pointer-events-none" />

            {/* Lottie Animation */}
            <span className="relative h-14 w-14 md:h-15 md:w-15 flex items-center justify-center overflow-hidden pointer-events-none">
              <Lottie animationData={chatbotAnimation} loop={true} className="w-full h-full object-contain scale-105" />
            </span>

            {(guideActive || pulse) && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-coral text-[10px] font-bold text-white grid place-items-center ring-2 ring-background z-10 animate-bounce">
                <Zap className="h-3 w-3" />
              </span>
            )}
          </motion.button>
        </motion.div>
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
                        onDownloadPdf={(q, c) => handleGeneratePdfForQuery(q, c, m.structuredData)}
                      />
                    </div>

                    {/* Interactive Format Selection Buttons */}
                    {m.isFormatPrompt && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-col gap-2">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" /> Select output format:
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => send("PDF format", "pdf")}
                            className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <FileText className="h-3 w-3" /> PDF
                          </button>
                          <button
                            onClick={() => send("Excel format", "excel")}
                            className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <FileSpreadsheet className="h-3 w-3" /> Excel
                          </button>
                          <button
                            onClick={() => send("Text format", "text")}
                            className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-[11px] font-semibold transition cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="h-3 w-3 text-primary" /> Text
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Download as PDF and Excel sheet options on each and every AI response */}
                    {m.role === "assistant" && !m.isFormatPrompt && (
                      <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3 text-primary/80" /> Export document
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleGeneratePdfForQuery(m.downloadQuery || "SWIFT AI Report", m.content, m.structuredData)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-semibold transition cursor-pointer active:scale-95 border border-primary/20 shadow-2xs hover:shadow-xs"
                            title="Download as PDF format"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </button>
                          <button
                            onClick={() => handleGenerateExcelForQuery(m.downloadQuery || "SWIFT AI Report", m.content, m.structuredData)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold transition cursor-pointer active:scale-95 border border-emerald-500/25 shadow-2xs hover:shadow-xs"
                            title="Download as Excel sheet"
                          >
                            <FileSpreadsheet className="h-3 w-3" /> Excel
                          </button>
                        </div>
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
