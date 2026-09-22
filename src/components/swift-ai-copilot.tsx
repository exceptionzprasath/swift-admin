import { useState, useRef, useEffect, useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { type Role } from "@/lib/ai-context";
import { suggestionsFor } from "@/lib/ai-knowledge";
import { aiGuide } from "@/lib/ai-guide-bus";
import { useUnifiedAiStore } from "@/lib/ai-unified-store";
import { aiOrchestrator } from "@/lib/ai-orchestrator";
import { AIResponseRenderer } from "@/components/ai/AIResponseRenderer";
import { Button } from "@/components/ui/button";
import {
  Brain,
  X,
  Send,
  Loader2,
  Zap,
  FileText,
  FileSpreadsheet,
  MessageSquare,
  Download,
  Minus,
  Paperclip,
  Mic,
  Smile,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { resolveUserContext } from "@/lib/ai-auth-resolver";

export function SwiftAiCopilot({ role: propRole, viewerEmployeeId: propViewerEmployeeId }: { role?: Role; viewerEmployeeId?: string }) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [guideActive, setGuideActive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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
    selectedModel,
    setSelectedModel,
    setTenant,
    clearConversation,
  } = useUnifiedAiStore();

  // If currently browsing the full Swift AI screen, mini AI must NEVER render
  if (currentPath.startsWith("/admin/ai")) {
    return null;
  }

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
    });
    return () => {
      off1();
      off2();
    };
  }, [currentPath]);

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

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          send(transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const hasUserMessages = messages.some((m) => m.role === "user");
  const currentTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Minimized Quick Dock Tab */}
      {!open && isMinimized && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          whileHover={{ scale: 1.06, x: -3 }}
          onClick={() => setIsMinimized(false)}
          className="fixed right-0 bottom-22 z-40 rounded-l-full bg-white/90 dark:bg-card/90 text-foreground pl-3.5 pr-3 py-2.5 shadow-xl shadow-black/10 flex items-center gap-2 cursor-pointer border-y border-l border-border/70 backdrop-blur-2xl text-xs font-semibold group transition-all duration-300"
          title="Click to restore SWIFT Digital Teammate"
        >
          <div className="h-6 w-6 rounded-full border border-primary/30 flex items-center justify-center text-primary bg-primary/10">
            <Brain className="h-3.5 w-3.5 animate-pulse" />
          </div>
          <span className="hidden group-hover:inline text-[11px] font-bold tracking-wide pr-0.5 text-foreground">
            SWIFT AI
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
        </motion.button>
      )}

      {/* Floating Action Button for Mini AI (Aligned directly above team chat) */}
      {!open && !isMinimized && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-22 right-6 z-40 group select-none"
        >
          {/* Quick Minimize Minus Button on Floating Trigger (Visible on Hover) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="absolute -top-1.5 -left-1.5 z-50 h-5 w-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md border border-border/80 flex items-center justify-center cursor-pointer opacity-0 scale-75 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto hover:scale-110 transition-all duration-200"
            title="Minimize to side tab"
            aria-label="Minimize SWIFT AI"
          >
            <Minus className="h-2.5 w-2.5 stroke-[3]" />
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-white/90 dark:bg-card/90 text-primary shadow-lg shadow-black/10 border border-white/80 dark:border-white/20 backdrop-blur-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary/40 focus:outline-none"
            aria-label="Open SWIFT Digital Teammate"
            title="SWIFT Digital Teammate"
          >
            <div className="h-9 w-9 rounded-full border border-primary/25 bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary animate-pulse" />
            </div>

            {/* Notification / Guide pulse badge */}
            {(guideActive || pulse) && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background animate-ping" />
            )}
          </button>
        </motion.div>
      )}

      {/* Mini AI Modal Window - Sleek Frosted Glass Design matching Image 1 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-[min(410px,calc(100vw-1.5rem))] h-[min(580px,calc(100vh-7rem))] rounded-[28px] border border-white/80 dark:border-white/15 bg-white/80 dark:bg-card/85 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
          >
            {/* Header matching Image 1 */}
            <div className="px-4 py-3.5 border-b border-border/40 bg-white/40 dark:bg-card/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center text-primary shadow-xs shrink-0">
                  <Brain className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-xs sm:text-sm text-foreground tracking-tight leading-snug">
                    SWIFT Digital Teammate
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-none mt-0.5">
                    We help companies provide instant answers
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsMinimized(true);
                  }}
                  className="h-7 w-7 rounded-full bg-muted/80 hover:bg-muted text-foreground flex items-center justify-center transition cursor-pointer border border-border/60"
                  title="Minimize to dock"
                >
                  <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center hover:opacity-85 transition cursor-pointer shadow-xs"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div ref={scroller} className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-gradient-to-b from-transparent to-muted/20">
              {/* Default Welcome Message (Exact format from Image 1) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium pl-1">
                  <div className="h-5 w-5 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Brain className="h-2.5 w-2.5" />
                  </div>
                  <span>SWIFT AI • {currentTimeStr}</span>
                </div>

                <div className="rounded-2xl p-3.5 bg-white/70 dark:bg-card/70 border border-white/80 dark:border-white/10 shadow-xs text-xs space-y-2 text-foreground">
                  <p>
                    Hi <strong className="font-bold text-foreground">{company.name || "there"}</strong>! We help companies provide instant, accurate, and on-brand responses 24/7.
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Here are a few ways I can assist you right now:
                  </p>
                  <div className="space-y-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => send("Show company policies and quick guidelines")}
                      className="block text-teal-600 dark:text-teal-400 hover:underline font-medium text-xs text-left cursor-pointer"
                    >
                      Learns your products & policies ⚡
                    </button>
                    <button
                      type="button"
                      onClick={() => send("Help me coordinate workforce and HR operations")}
                      className="block text-teal-600 dark:text-teal-400 hover:underline font-medium text-xs text-left cursor-pointer"
                    >
                      Chat with SWIFT HR services 💬
                    </button>
                  </div>
                </div>

                {/* Quick Action Pill Buttons (Chat & Voice) */}
                {!hasUserMessages && (
                  <div className="flex items-center gap-2 pl-1 pt-1">
                    <button
                      type="button"
                      onClick={() => send("Hello SWIFT AI, I want to chat about workforce details")}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-card border border-border/80 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/40 transition cursor-pointer active:scale-95"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Chat</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-card border border-border/80 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/40 transition cursor-pointer active:scale-95"
                    >
                      <Mic className={`h-3.5 w-3.5 ${isListening ? "text-rose-500 animate-pulse" : "text-teal-600 dark:text-teal-400"}`} />
                      <span>{isListening ? "Listening..." : "Voice"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Conversation Messages */}
              {messages.map((m, i) => {
                if (m.role === "assistant" && i === 0 && !hasUserMessages) return null;

                const isUser = m.role === "user";

                return (
                  <motion.div
                    key={m.id || i}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className={`space-y-1 ${isUser ? "flex flex-col items-end" : "space-y-1.5"}`}
                  >
                    {/* Header meta */}
                    <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium ${isUser ? "pr-1" : "pl-1"}`}>
                      {!isUser ? (
                        <>
                          <div className="h-5 w-5 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Brain className="h-2.5 w-2.5" />
                          </div>
                          <span>SWIFT AI • {m.timestamp}</span>
                        </>
                      ) : (
                        <>
                          <span>{company.name || "User"} • {m.timestamp}</span>
                          <div className="h-5 w-5 rounded-full bg-stone-700 dark:bg-stone-300 text-white dark:text-stone-900 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(user?.email || company.name || "A")[0].toUpperCase()}
                          </div>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
                        isUser
                          ? "bg-white/95 dark:bg-primary/25 border border-white/90 dark:border-white/20 text-foreground rounded-br-xs italic shadow-xs"
                          : "bg-white/70 dark:bg-card/70 border border-white/80 dark:border-white/10 rounded-bl-xs text-foreground backdrop-blur-md"
                      }`}
                    >
                      {/* Unified Structured AI Response Renderer */}
                      <div className="my-0.5">
                        <AIResponseRenderer
                          message={m}
                          compact
                          onRunQuery={(q) => send(q)}
                          onDownloadPdf={(q, c) => handleGeneratePdfForQuery(q, c, m.structuredData)}
                        />
                      </div>

                      {/* Interactive Format Selection Buttons */}
                      {m.isFormatPrompt && (
                        <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-col gap-1.5">
                          <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                            <Brain className="h-3 w-3 text-primary" /> Select output format:
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => send("PDF format", "pdf")}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-primary text-white text-[10px] font-semibold hover:bg-primary/90 transition shadow-xs cursor-pointer active:scale-95"
                            >
                              <FileText className="h-3 w-3" /> PDF
                            </button>
                            <button
                              onClick={() => send("Excel format", "excel")}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 transition shadow-xs cursor-pointer active:scale-95"
                            >
                              <FileSpreadsheet className="h-3 w-3" /> Excel
                            </button>
                            <button
                              onClick={() => send("Text format", "text")}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-[10px] font-semibold transition cursor-pointer active:scale-95"
                            >
                              <MessageSquare className="h-3 w-3 text-primary" /> Text
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Export Buttons */}
                      {!isUser && !m.isFormatPrompt && (
                        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3 text-primary/80" /> Export:
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleGeneratePdfForQuery(m.downloadQuery || "SWIFT AI Report", m.content, m.structuredData)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-semibold transition cursor-pointer active:scale-95 border border-primary/20 shadow-2xs"
                              title="Download PDF"
                            >
                              <Download className="h-3 w-3" /> PDF
                            </button>
                            <button
                              onClick={() => handleGenerateExcelForQuery(m.downloadQuery || "SWIFT AI Report", m.content, m.structuredData)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold transition cursor-pointer active:scale-95 border border-emerald-500/25 shadow-2xs"
                              title="Download Excel"
                            >
                              <FileSpreadsheet className="h-3 w-3" /> Excel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {busy && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center pl-1">
                  <div className="h-6 w-6 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
                    <Brain className="h-3.5 w-3.5 animate-pulse" />
                  </div>
                  <div className="bg-white/70 dark:bg-card/70 border border-white/80 dark:border-white/10 rounded-2xl rounded-bl-xs px-3.5 py-2 flex gap-1 items-center">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: `swift-typing-dot 1.2s ease-in-out ${d * 0.15}s infinite` }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Suggestions */}
              {messages.length <= 1 && !busy && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold pl-1">
                    <Brain className="h-3 w-3 text-primary" /> Suggested
                  </div>
                  {suggestions.slice(0, 5).map((s: string, idx) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + idx * 0.04 }}
                      onClick={() => send(s)}
                      className="block w-full text-left text-xs rounded-2xl border border-white/80 dark:border-white/10 bg-white/60 dark:bg-card/60 px-3.5 py-2 hover:bg-white dark:hover:bg-card hover:border-primary/30 transition-all cursor-pointer shadow-2xs"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Capsule Input Bar matching Image 1 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="p-3 border-t border-border/40 bg-white/40 dark:bg-card/40 backdrop-blur-xl flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2 bg-white/80 dark:bg-card/80 border border-white/90 dark:border-white/10 rounded-full px-3.5 py-1.5 focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-card shadow-2xs">
                {/* Paperclip & Smile icons */}
                <button
                  type="button"
                  onClick={() => toast.info("Attach documents in full SWIFT AI hub")}
                  className="text-muted-foreground hover:text-foreground cursor-pointer transition p-0.5"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toast.info("Emojis available in full SWIFT AI hub")}
                  className="text-muted-foreground hover:text-foreground cursor-pointer transition p-0.5"
                  title="Emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={guideActive ? "Tell me the rule (e.g. 'Sunday = 2× pay')" : "Type message..."}
                  disabled={busy}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/60 font-medium"
                />

                {/* Model toggle (Deep / Fast) */}
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedModel === "gpt-4o" ? "gpt-4o-mini" : "gpt-4o";
                    setSelectedModel(next);
                    toast.success(next === "gpt-4o" ? "Deep search enabled" : "Fast mode enabled");
                  }}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full hover:bg-muted/40 transition cursor-pointer"
                  title="Toggle Deep / Fast mode"
                >
                  {selectedModel === "gpt-4o" ? "Deep" : "Fast"}
                </button>

                {/* Submit button */}
                <Button
                  type="submit"
                  size="icon"
                  disabled={busy || !input.trim()}
                  className="h-7 w-7 bg-primary text-white rounded-full shadow-xs hover:bg-primary/90 transition cursor-pointer shrink-0 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
