import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { resolveUserContext } from "@/lib/ai-auth-resolver";
import { checkOpenAiStatus } from "@/lib/ai.functions";
import { useUnifiedAiStore } from "@/lib/ai-unified-store";
import { aiOrchestrator } from "@/lib/ai-orchestrator";
import { AIResponseRenderer } from "@/components/ai/AIResponseRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Send,
  Loader2,
  RotateCcw,
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  Download,
  X,
  Paperclip,
  Search,
  Globe,
  Mic,
  Zap,
  Lightbulb,
  Layers,
  Compass,
  Smile,
  Bell,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { AIDocumentMeta } from "@/lib/ai-unified-types";

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function compressImageToDataUrl(file: File, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "SWIFT AI · Intelligence Hub" }] }),
  component: SwiftAiCommandCenter,
});

function SwiftAiCommandCenter() {
  const { user, isSuperAdmin, activeTenantId, memberships } = useAuth();
  const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();

  const authContext = useMemo(() => {
    return resolveUserContext(user, isSuperAdmin, memberships, employees, company);
  }, [user, isSuperAdmin, memberships, employees, company]);

  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showTeammatePreview, setShowTeammatePreview] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [attachedPhoto, setAttachedPhoto] = useState<{
    file: File;
    name: string;
    size: number;
    sizeStr: string;
    type: string;
    dataUrl: string;
  } | null>(null);

  // Unified Store
  const {
    messages,
    isGenerating: busy,
    selectedModel,
    setSelectedModel,
    apiStatus,
    setApiStatus,
    clearConversation,
    setTenant,
  } = useUnifiedAiStore();

  const hasConversation = messages.some((m) => m.role === "user");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const checkStatus = useServerFn(checkOpenAiStatus);

  useEffect(() => {
    if (activeTenantId) {
      setTenant(activeTenantId, company.name);
    }
  }, [activeTenantId, company.name, setTenant]);

  useEffect(() => {
    let mounted = true;
    checkStatus()
      .then((res) => {
        if (mounted) setApiStatus(res as any);
      })
      .catch(() => {
        if (mounted) setApiStatus({ ok: false, status: "Offline", configured: false });
      });
    return () => {
      mounted = false;
    };
  }, [checkStatus, setApiStatus]);

  useEffect(() => {
    if (!hasConversation) return;
    const performSmoothScroll = () => {
      if (bottomAnchorRef.current) {
        bottomAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      } else if (scrollerRef.current) {
        scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
      }
    };
    performSmoothScroll();
    const t1 = setTimeout(performSmoothScroll, 50);
    const t2 = setTimeout(performSmoothScroll, 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [messages, busy, hasConversation]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

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
        role: authContext.role,
        viewerEmployeeId: authContext.viewerEmployeeId,
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
        role: authContext.role,
        viewerEmployeeId: authContext.viewerEmployeeId,
      },
      structuredData
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image (.png, .jpg, .jpeg, .webp)");
      return;
    }
    const sizeStr = formatFileSize(file.size);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setAttachedPhoto({
        file,
        name: file.name,
        size: file.size,
        sizeStr,
        type: file.type,
        dataUrl,
      });
      toast.success(`Attached photo: "${file.name}"`);
    } catch {
      toast.error("Failed to process photo");
    }
    inputRef.current?.focus();
  };

  const handleSend = async (queryText?: string, forceFormat?: "pdf" | "excel" | "text") => {
    const rawText = (queryText ?? input).trim();
    if ((!rawText && !attachedPhoto) || busy) return;

    const currentPhoto = attachedPhoto;
    setAttachedPhoto(null);
    setInput("");

    const text = rawText || (currentPhoto ? "Please analyze this uploaded document/photo and summarize the findings." : "");

    let docMeta: AIDocumentMeta | undefined = undefined;
    if (currentPhoto) {
      docMeta = {
        title: currentPhoto.name,
        filename: currentPhoto.name,
        size: currentPhoto.size,
        docType: "image",
        imageUrl: currentPhoto.dataUrl,
      };
    }

    await aiOrchestrator.dispatchUserMessage(text, {
      source: "COPILOT",
      forceFormat,
      role: authContext.role,
      viewerEmployeeId: authContext.viewerEmployeeId,
      documentMeta: docMeta,
      imageUrl: currentPhoto?.dataUrl,
      context: {
        company,
        employees,
        attendance,
        payrolls,
        leaves,
        docRequests,
        role: authContext.role,
        viewerEmployeeId: authContext.viewerEmployeeId,
      },
    });
  };

  const recognitionRef = useRef<any>(null);
  const toggleVoiceMode = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice recognition is not supported in this browser.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak your request");
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          const cleanText = transcript.trim();
          setInput(cleanText);
          handleSend(cleanText);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const exportChat = () => {
    const text = messages
      .map((m) => `[${m.timestamp}] ${m.role.toUpperCase()} (${m.source || "SWIFT AI"}):\n${m.content}\n`)
      .join("\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SWIFT_AI_Transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded");
  };

  const toggleModel = () => {
    const nextModel = selectedModel === "gpt-4o" ? "gpt-4o-mini" : "gpt-4o";
    setSelectedModel(nextModel);
  };

  const filterPills = [
    { label: "Fast", icon: Zap, query: "Show today's workforce overview and live attendance stats." },
    { label: "In-depth", icon: Lightbulb, query: "Provide an in-depth analysis of employee attendance and pending leave trends this month." },
    { label: "In-depth", icon: Layers, query: "Audit recent payroll calculations, bonuses, and tax deductions." },
    { label: "Holistic", icon: Compass, query: "Give a holistic summary of HR operations, active headcount, and compliance readiness." },
  ];

  const userName = user?.email ? user.email.split("@")[0] : "Admin";

  return (
    <div className="relative min-h-[calc(100vh-5.5rem)] flex flex-col justify-between overflow-hidden select-none">
      {/* ======================================================== */}
      {/* 1. DEEP RICH GLASSMORPHIC AMBIENT DIFFUSION BACKGROUND   */}
      {/* ======================================================== */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-700 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 50% 35%, color-mix(in srgb, var(--primary) 35%, transparent) 0%, color-mix(in srgb, var(--accent, var(--primary)) 20%, transparent) 40%, transparent 75%),
            radial-gradient(circle at 10% 20%, color-mix(in srgb, var(--primary) 22%, transparent) 0%, transparent 45%),
            radial-gradient(circle at 90% 80%, color-mix(in srgb, var(--accent, var(--primary)) 18%, transparent) 0%, transparent 45%),
            color-mix(in srgb, var(--background) 90%, var(--primary) 10%)
          `,
        }}
      >
        {/* Soft floating glow orbs */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] md:w-[900px] md:h-[650px] rounded-full blur-[110px] opacity-80 dark:opacity-50 animate-pulse pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--primary) 0%, var(--accent, var(--primary)) 60%, transparent 80%)",
            animationDuration: "7s",
          }}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. TOP FLOATING NAVIGATION BAR (LOGO, NOTIF & PROFILE)   */}
      {/* ======================================================== */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-row flex-nowrap items-center justify-between gap-4 z-20">
        {/* Left: Brand Logo + Single Line Name */}
        <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
          <div
            className="relative h-10 w-10 rounded-full p-[2px] flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
            }}
          >
            <div className="h-full w-full rounded-full bg-card/90 backdrop-blur-md flex items-center justify-center text-primary shadow-inner">
              <Brain className="h-5 w-5 text-primary animate-pulse" />
            </div>
          </div>
          <span className="font-bold text-lg sm:text-xl tracking-tight text-foreground font-display whitespace-nowrap inline-block">
            SWIFT AI
          </span>
        </div>

        {/* Right Tools: Notification Bell & Profile Avatar */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 whitespace-nowrap">
          {/* Notification Bell */}
          <button
            type="button"
            onClick={() => toast.info(`SWIFT AI is monitoring compliance for ${company.name}`)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-xs hover:scale-105 shrink-0"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.35)",
              borderColor: "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
            }}
            title="Notifications"
          >
            <Bell className="h-4 w-4 text-foreground/80" />
          </button>

          {/* User Profile Avatar */}
          <div
            className="h-9 w-9 rounded-full p-[1.5px] shadow-sm cursor-pointer hover:scale-105 transition-transform shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
            }}
            title={user?.email || "Admin"}
          >
            <div className="h-full w-full rounded-full bg-card flex items-center justify-center font-bold text-xs text-primary overflow-hidden">
              {(user?.email || "A")[0].toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. MAIN HERO VIEW OR FULL CHAT VIEW                      */}
      {/* ======================================================== */}
      {!hasConversation ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center relative py-6 md:py-10">
          {/* Clean Glowing Brain Icon WITHOUT Circle Wrapper */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative mb-4 flex items-center justify-center"
          >
            {/* Soft Ambient Halo behind the icon */}
            <div
              className="absolute h-14 w-14 rounded-full blur-xl opacity-70 animate-pulse pointer-events-none"
              style={{
                background: "radial-gradient(circle, var(--primary) 0%, var(--accent, var(--primary)) 80%, transparent)",
              }}
            />
            {/* Clean floating Brain icon */}
            <Brain className="relative h-11 w-11 text-primary animate-swift-float drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]" />
          </motion.div>

          {/* Centered Heading */}
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground text-center font-display mb-2 drop-shadow-xs"
          >
            Hi, I'm SWIFT AI
          </motion.h1>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm sm:text-base text-muted-foreground text-center mb-8"
          >
            How can I help you today?
          </motion.p>

          {/* Hidden Photo Input */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {/* Attached Photo Preview Pill */}
          {attachedPhoto && (
            <div
              className="mb-3 inline-flex items-center gap-2 p-1.5 pr-3 rounded-2xl border shadow-lg text-xs animate-in fade-in"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.45)",
                borderColor: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(30px) saturate(190%)",
                WebkitBackdropFilter: "blur(30px) saturate(190%)",
              }}
            >
              <div className="h-9 w-9 rounded-xl overflow-hidden bg-black/10 shrink-0">
                <img src={attachedPhoto.dataUrl} alt={attachedPhoto.name} className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-foreground truncate max-w-[200px]">{attachedPhoto.name}</span>
              <button
                type="button"
                onClick={() => setAttachedPhoto(null)}
                className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* THE SIGNATURE HIGH-DEF FROSTED GLASS CAPSULE INPUT BOX  */}
          {/* ======================================================== */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-2xl sm:max-w-3xl"
          >
            <div
              className="relative flex flex-col rounded-[32px] p-5 sm:p-6 border transition-all shadow-2xl"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.38)",
                borderColor: "rgba(255, 255, 255, 0.65)",
                backdropFilter: "blur(40px) saturate(190%)",
                WebkitBackdropFilter: "blur(40px) saturate(190%)",
                boxShadow: `
                  0 30px 60px -15px color-mix(in srgb, var(--primary) 25%, transparent),
                  inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.85),
                  inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05)
                `,
              }}
            >
              {/* Text Input */}
              <textarea
                ref={inputRef as any}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isListening
                    ? "Listening to voice... Speak now"
                    : attachedPhoto
                    ? "Ask anything about this uploaded document or photo..."
                    : "Ask anything..."
                }
                disabled={busy}
                className="w-full resize-none bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 text-base px-1 py-1 leading-relaxed"
                autoFocus
              />

              {/* Bottom Toolbar inside the Glass Box */}
              <div className="flex items-center justify-between gap-2 pt-3 mt-1">
                {/* Left: Attachment + Deep search + Search pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Paperclip Button */}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground border transition-all cursor-pointer shadow-xs hover:scale-105"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                      borderColor: "rgba(255, 255, 255, 0.7)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                    }}
                    title="Attach file or photo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  {/* Deep Search Pill Button */}
                  <button
                    type="button"
                    onClick={toggleModel}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs hover:scale-105 ${
                      selectedModel === "gpt-4o"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "text-foreground/80 hover:text-foreground"
                    }`}
                    style={
                      selectedModel !== "gpt-4o"
                        ? {
                            backgroundColor: "rgba(255, 255, 255, 0.5)",
                            borderColor: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                          }
                        : undefined
                    }
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Deep search</span>
                  </button>

                  {/* Search / HRMS Context Pill */}
                  <button
                    type="button"
                    onClick={() => {
                      toast.info(`Active Workspace: ${company.name} (${employees.length} employees linked)`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-foreground/80 hover:text-foreground border transition-all cursor-pointer shadow-xs hover:scale-105"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                      borderColor: "rgba(255, 255, 255, 0.7)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                    }}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Search</span>
                  </button>
                </div>

                {/* Right: Voice + Send */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleVoiceMode}
                    className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-xs hover:scale-105 ${
                      isListening ? "bg-red-500 text-white border-red-500 animate-pulse" : "text-foreground/80"
                    }`}
                    style={
                      !isListening
                        ? {
                            backgroundColor: "rgba(255, 255, 255, 0.5)",
                            borderColor: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                          }
                        : undefined
                    }
                    title="Voice mode"
                  >
                    <Mic className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={busy || (!input.trim() && !attachedPhoto)}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white shadow-md transition-all cursor-pointer hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
                    }}
                    title="Send message"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ======================================================== */}
          {/* ROW OF FROSTED GLASS PILLS DIRECTLY UNDERNEATH          */}
          {/* ======================================================== */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mt-6 max-w-2xl mx-auto"
          >
            {filterPills.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(p.query)}
                  disabled={busy}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-foreground border transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.42)",
                    borderColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(28px) saturate(180%)",
                    WebkitBackdropFilter: "blur(28px) saturate(180%)",
                    boxShadow: "0 8px 20px -6px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </motion.div>
        </main>
      ) : (
        /* ======================================================== */
        /* 5. ACTIVE CONVERSATION FULL VIEW (WITH DEEP GLASS)       */
        /* ======================================================== */
        <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col justify-between py-2 overflow-hidden z-20">
          {/* Header Action Strip */}
          <div className="flex items-center justify-between py-2 border-b border-white/20 mb-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-white/50 text-primary text-xs font-semibold py-1 px-3 shadow-xs"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {selectedModel === "gpt-4o" ? "GPT-4o Deep Reasoning" : "GPT-4o Mini Fast"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {company.name} · {messages.length} messages
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearConversation(company.name)}
                className="rounded-full text-xs gap-1.5 cursor-pointer border-white/50 hover:bg-card"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> New Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportChat}
                className="rounded-full text-xs gap-1.5 cursor-pointer border-white/50 hover:bg-card"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </div>
          </div>

          {/* Messages Scroller */}
          <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 space-y-4 scroll-smooth">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isLast = idx === messages.length - 1;

              return (
                <motion.div
                  key={msg.id || idx}
                  ref={isLast ? latestMessageRef : undefined}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 p-[1.5px] shadow-sm mt-0.5"
                      style={{
                        background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
                      }}
                    >
                      <div className="h-full w-full rounded-full bg-card flex items-center justify-center text-primary">
                        <Brain className="h-4 w-4" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[88%] sm:max-w-[85%] rounded-[26px] px-5 py-4 text-sm border shadow-xl ${
                      isUser
                        ? "text-white rounded-br-xs"
                        : "text-foreground rounded-bl-xs"
                    }`}
                    style={
                      isUser
                        ? {
                            background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
                            borderColor: "rgba(255, 255, 255, 0.4)",
                            boxShadow: "0 15px 30px -10px color-mix(in srgb, var(--primary) 35%, transparent)",
                          }
                        : {
                            backgroundColor: "rgba(255, 255, 255, 0.45)",
                            borderColor: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(36px) saturate(180%)",
                            WebkitBackdropFilter: "blur(36px) saturate(180%)",
                            boxShadow: "0 20px 40px -15px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.85)",
                          }
                    }
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-2 text-[11px] opacity-80">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{isUser ? "You" : "SWIFT AI"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-primary cursor-pointer"
                            title="Copy reply"
                          >
                            {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Image preview */}
                    {isUser && msg.documentMeta?.imageUrl && (
                      <div className="mb-2.5 max-w-[280px] rounded-2xl overflow-hidden border border-white/30 bg-black/20 shadow-xs">
                        <img src={msg.documentMeta.imageUrl} alt="Uploaded" className="w-full max-h-[220px] object-cover" />
                      </div>
                    )}

                    {/* Structured AI response */}
                    <div className="my-1">
                      <AIResponseRenderer
                        message={msg}
                        onRunQuery={(q) => handleSend(q)}
                        onDownloadPdf={(q, c) => handleGeneratePdfForQuery(q, c, msg.structuredData)}
                      />
                    </div>

                    {/* Export Actions */}
                    {!isUser && !msg.isFormatPrompt && (
                      <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-primary" /> Official Export
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleGeneratePdfForQuery(msg.downloadQuery || "SWIFT AI Report", msg.content, msg.structuredData)}
                            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </button>
                          <button
                            onClick={() => handleGenerateExcelForQuery(msg.downloadQuery || "SWIFT AI Report", msg.content, msg.structuredData)}
                            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3 w-3" /> Excel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 shadow-sm"
                      style={{
                        background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
                      }}
                    >
                      {(user?.email || "Admin")[0].toUpperCase()}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {busy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 p-[1.5px]"
                  style={{
                    background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
                  }}
                >
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center text-primary">
                    <Brain className="h-4 w-4 animate-pulse" />
                  </div>
                </div>
                <div
                  className="rounded-2xl px-4 py-3 border text-xs text-muted-foreground flex items-center gap-2"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.45)",
                    borderColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(28px)",
                  }}
                >
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>SWIFT AI is reasoning with OpenAI ({selectedModel})...</span>
                </div>
              </motion.div>
            )}

            <div ref={bottomAnchorRef} className="h-4 w-full shrink-0" />
          </div>

          {/* Bottom Docked Frosted Glass Capsule */}
          <div className="pt-2">
            <div
              className="relative flex flex-col rounded-[28px] p-3 sm:p-4 border transition-all shadow-xl"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.4)",
                borderColor: "rgba(255, 255, 255, 0.65)",
                backdropFilter: "blur(36px) saturate(180%)",
                WebkitBackdropFilter: "blur(36px) saturate(180%)",
                boxShadow: "0 20px 40px -15px color-mix(in srgb, var(--primary) 15%, transparent), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
              }}
            >
              <textarea
                ref={inputRef as any}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Listening..." : "Ask follow-up query..."}
                disabled={busy}
                className="w-full resize-none bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 text-sm px-2 py-1 leading-relaxed"
              />

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20 mt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="h-8 w-8 rounded-full flex items-center justify-center border border-white/50 text-muted-foreground hover:text-foreground cursor-pointer"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleModel}
                    className="px-3 py-1 rounded-full text-xs font-semibold border border-white/50 text-foreground cursor-pointer"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {selectedModel === "gpt-4o" ? "Deep search" : "Fast mode"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleVoiceMode}
                    className="h-8 w-8 rounded-full flex items-center justify-center border border-white/50 text-foreground cursor-pointer"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={busy || !input.trim()}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer disabled:opacity-40"
                    style={{
                      background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
