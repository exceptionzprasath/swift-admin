import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import LottieRaw from "lottie-react";
import chatbotAnimationRaw from "@/assets/chatbot.json";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { type Role } from "@/lib/ai-context";
import { suggestionsFor } from "@/lib/ai-knowledge";
import { checkOpenAiStatus } from "@/lib/ai.functions";
import { useUnifiedAiStore } from "@/lib/ai-unified-store";
import { aiOrchestrator } from "@/lib/ai-orchestrator";
import { AIResponseRenderer } from "@/components/ai/AIResponseRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  RotateCcw,
  Copy,
  Check,
  FileText,
  Download,
  Plus,
  ArrowUp,
  X,
  Paperclip,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { AIDocumentMeta } from "@/lib/ai-unified-types";

const Lottie = (LottieRaw as any)?.default || LottieRaw;
const chatbotAnimation = (chatbotAnimationRaw as any)?.default || chatbotAnimationRaw;

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
  head: () => ({ meta: [{ title: "SWIFT AI Copilot · OpenAI ChatGPT" }] }),
  component: SwiftAiCommandCenter,
});

function SwiftAiCommandCenter() {
  const { user, isSuperAdmin, activeTenantId } = useAuth();
  const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();

  const role: Role = isSuperAdmin ? "super_admin" : "admin";
  const suggestions = useMemo(() => suggestionsFor(role), [role]);

  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const checkStatus = useServerFn(checkOpenAiStatus);

  // Sync tenant session
  useEffect(() => {
    if (activeTenantId) {
      setTenant(activeTenantId, company.name);
    }
  }, [activeTenantId, company.name, setTenant]);

  // Check OpenAI connection status on mount
  useEffect(() => {
    let mounted = true;
    checkStatus()
      .then((res) => {
        if (mounted) {
          setApiStatus(res as any);
        }
      })
      .catch(() => {
        if (mounted) {
          setApiStatus({ ok: false, status: "Offline", configured: false });
        }
      });
    return () => {
      mounted = false;
    };
  }, [checkStatus, setApiStatus]);

  // Smooth ChatGPT-style Auto-scroll to AI answer
  useEffect(() => {
    if (!hasConversation) return;

    const performSmoothScroll = () => {
      // 1. Scroll inner container so the bottom anchor is in view
      if (bottomAnchorRef.current) {
        bottomAnchorRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      } else if (scrollerRef.current) {
        scrollerRef.current.scrollTo({
          top: scrollerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }

      // 2. Prevent page-level scroll drift on outer <main> container
      const mainEl = scrollerRef.current?.closest("main");
      if (mainEl && mainEl.scrollTop > 0) {
        mainEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    // Trigger immediate smooth scroll
    performSmoothScroll();

    // Multi-frame timeouts to follow markdown tables, badges, and cards as they paint
    const t1 = setTimeout(performSmoothScroll, 50);
    const t2 = setTimeout(performSmoothScroll, 160);
    const t3 = setTimeout(performSmoothScroll, 320);
    const t4 = setTimeout(performSmoothScroll, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [messages, busy, hasConversation]);

  const pingOpenAi = async () => {
    setApiStatus({ ...apiStatus, status: "Pinging..." });
    try {
      const res = await checkStatus();
      setApiStatus(res as any);
      if (res.ok) {
        toast.success(`OpenAI Connected (${res.latencyMs}ms)`);
      } else {
        toast.error(`OpenAI Ping Failed: ${res.status}`);
      }
    } catch (e: any) {
      setApiStatus({ ok: false, status: "Error", configured: false });
      toast.error(e?.message || "Connection test failed");
    }
  };

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
        role,
      },
      structuredData
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so identical photo can be selected again
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image or photo (.png, .jpg, .jpeg, .webp)");
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
      toast.success(`Photo attached: "${file.name}"`);
    } catch {
      toast.error("Failed to process photo");
    }

    inputRef.current?.focus();
  };

  const handleSend = async (queryText?: string, forceFormat?: "pdf" | "text") => {
    const rawText = (queryText ?? input).trim();
    if ((!rawText && !attachedPhoto) || busy) return;

    const currentPhoto = attachedPhoto;
    setAttachedPhoto(null);
    setInput("");

    const text = rawText || (currentPhoto ? "Please analyze this uploaded photo and answer my question." : "");

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
      documentMeta: docMeta,
      imageUrl: currentPhoto?.dataUrl,
      context: {
        company,
        employees,
        attendance,
        payrolls,
        leaves,
        docRequests,
        role,
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

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
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
        toast.info("Voice Mode Active · Speak your question...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          const cleanText = transcript.trim();
          setInput(cleanText);
          handleSend(cleanText);
        }
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (e.error !== "no-speech") {
          toast.error(`Voice error: ${e.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

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
    a.download = `SWIFT_AI_Chat_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat transcript downloaded");
  };

  // Reusable ChatGPT Floating Search Capsule
  const renderChatGptSearchBox = (isHero = false) => {
    const hasContent = Boolean(input.trim()) || Boolean(attachedPhoto);

    return (
      <div className={`relative w-full ${isHero ? "max-w-2xl" : "max-w-3xl"} mx-auto transition-all`}>
        {/* Soft Ambient Halo Glow */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-full blur-xl opacity-70 pointer-events-none" />

        {/* Hidden Photo Input for Image Upload Only */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        {/* Selected Photo Thumbnail Preview (ChatGPT style) */}
        {attachedPhoto && (
          <div className="mb-2.5 inline-flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-card border border-primary/40 shadow-sm animate-in fade-in slide-in-from-bottom-1 text-xs">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-black/10 border border-border/80 shrink-0">
              <img
                src={attachedPhoto.dataUrl}
                alt={attachedPhoto.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-[280px]">
                {attachedPhoto.name}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Photo · {attachedPhoto.sizeStr}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedPhoto(null)}
              className="ml-1 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              title="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center gap-2 bg-card/95 dark:bg-card/95 border border-border/80 hover:border-primary/40 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 rounded-full p-2 pl-3 pr-2.5 shadow-lg shadow-black/5 hover:shadow-xl transition-all"
        >
          {/* Plus Action Button -> Trigger Photo Upload */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition cursor-pointer shrink-0"
            title="Upload photo"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Search Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? "Listening to your voice... Speak now"
                : attachedPhoto
                ? "Ask anything about this photo..."
                : "Ask anything"
            }
            disabled={busy}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70 text-sm sm:text-base px-2 py-1"
            autoFocus={isHero}
          />

          {/* Right Tools: Think Button & Blue Circular Voice/Send Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Think Button */}
            <button
              type="button"
              onClick={() => {
                const nextModel = selectedModel === "gpt-4o" ? "gpt-4o-mini" : "gpt-4o";
                setSelectedModel(nextModel);
                toast.success(
                  nextModel === "gpt-4o" ? "Deep reasoning enabled (GPT-4o)" : "Fast reasoning enabled (GPT-4o Mini)"
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                selectedModel === "gpt-4o"
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Toggle Think / Deep Reasoning"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
                <path d="M12 3v18" />
              </svg>
              <span className="hidden sm:inline">Think</span>
            </button>

            {/* Blue Circular Voice Mode / Send Button */}
            <button
              type={hasContent ? "submit" : "button"}
              onClick={hasContent ? undefined : toggleVoiceMode}
              disabled={busy}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                hasContent
                  ? "bg-gradient-brand text-white hover:opacity-95 active:scale-95"
                  : isListening
                  ? "bg-red-500 text-white ring-4 ring-red-500/25 animate-pulse"
                  : "bg-[#0A84FF] text-white hover:bg-blue-600 active:scale-95"
              }`}
              title={
                hasContent
                  ? "Send message"
                  : isListening
                  ? "Voice Mode Active: Listening... Click to cancel"
                  : "Voice Mode (Click to speak)"
              }
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : hasContent ? (
                <ArrowUp className="h-4 w-4" />
              ) : isListening ? (
                <div className="flex items-center gap-0.5">
                  <span className="w-0.5 h-3 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-0.5 h-4 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <rect x="4" y="9" width="2.5" height="6" rx="1.25" />
                  <rect x="9" y="5" width="2.5" height="14" rx="1.25" />
                  <rect x="14" y="7" width="2.5" height="10" rx="1.25" />
                  <rect x="19" y="10" width="2.5" height="4" rx="1.25" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-7xl mx-auto">
      {/* Minimal Top Navigation Bar */}
      <header className="flex items-center justify-between gap-4 py-3 px-2 mb-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-brand flex items-center justify-center p-1 shadow-sm shrink-0">
            <Lottie animationData={chatbotAnimation} loop={true} className="w-full h-full object-contain scale-110" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight font-display">SWIFT AI Copilot</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 px-2 font-medium">
                ChatGPT
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{company.name} · {employees.length} employees</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          {/* OpenAI Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-[11px]">
            <div className={`h-2 w-2 rounded-full ${apiStatus.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="text-muted-foreground">{apiStatus.ok ? "OpenAI Connected" : apiStatus.status}</span>
          </div>

          {/* Model Switcher */}
          <div className="flex items-center rounded-xl bg-card border border-border p-0.5 text-xs">
            <button
              onClick={() => setSelectedModel("gpt-4o-mini")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedModel === "gpt-4o-mini"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              GPT-4o Mini
            </button>
            <button
              onClick={() => setSelectedModel("gpt-4o")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedModel === "gpt-4o"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              GPT-4o
            </button>
          </div>

          {hasConversation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearConversation(company.name)}
              className="rounded-xl text-xs gap-1.5 cursor-pointer"
              title="Reset conversation and return to search screen"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New Chat
            </Button>
          )}

          {hasConversation && (
            <Button variant="outline" size="sm" onClick={exportChat} className="rounded-xl text-xs gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          )}
        </div>
      </header>

      {/* Main Body */}
      {!hasConversation ? (
        /* ==================== ChatGPT Centered Hero View ==================== */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 -mt-10 animate-in fade-in duration-300">
          {/* Centered Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-8">
            What’s on the agenda today?
          </h1>

          {/* Centered ChatGPT Search Capsule */}
          {renderChatGptSearchBox(true)}

          {/* Prompt Suggestion Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7 max-w-2xl mx-auto">
            {suggestions.slice(0, 5).map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                disabled={busy}
                className="text-xs px-3.5 py-1.5 rounded-full border border-border/70 bg-card/70 hover:bg-primary/10 hover:border-primary/40 transition-all text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs hover:shadow-xs"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ==================== Active Conversation View ==================== */
        <div className="flex-1 min-h-0 flex flex-col bg-card/40 border border-border/70 rounded-3xl overflow-hidden shadow-soft animate-in fade-in duration-200">
          {/* Chat Scroller */}
          <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full scroll-smooth">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isLast = idx === messages.length - 1;

              return (
                <motion.div
                  key={msg.id}
                  ref={isLast ? latestMessageRef : undefined}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="h-9 w-9 rounded-2xl bg-gradient-brand text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Bot className="h-5 w-5" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                      isUser
                        ? "bg-gradient-brand text-white rounded-br-xs"
                        : "bg-background border border-border/90 text-foreground rounded-bl-xs"
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between gap-4 mb-1.5 text-[11px] opacity-75">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{isUser ? "You" : "SWIFT AI"}</span>
                        {msg.source && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 opacity-70 font-mono">
                            {msg.source === "LIVE_BRAIN" ? "Live Brain" : "Copilot"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {msg.model && <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px]">{msg.model}</span>}
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-primary"
                            title="Copy reply"
                          >
                            {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Attached Photo Preview in User Message */}
                    {isUser && msg.documentMeta?.imageUrl && (
                      <div className="mb-2.5 max-w-[280px] rounded-2xl overflow-hidden border border-white/25 bg-black/25 shadow-xs">
                        <img
                          src={msg.documentMeta.imageUrl}
                          alt={msg.documentMeta.filename || "Uploaded photo"}
                          className="w-full max-h-[220px] object-cover"
                        />
                        <div className="px-3 py-1.5 text-[11px] text-white/90 bg-black/40 flex items-center justify-between">
                          <span className="truncate font-medium">{msg.documentMeta.filename || "Photo"}</span>
                          {msg.documentMeta.size ? (
                            <span className="text-[10px] opacity-80 font-mono ml-2 shrink-0">
                              {formatFileSize(msg.documentMeta.size)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {isUser && msg.documentMeta && !msg.documentMeta.imageUrl && (
                      <div className="mb-2 flex items-center gap-2 p-2 px-3 rounded-xl bg-white/20 border border-white/25 backdrop-blur-xs text-xs text-white">
                        <FileText className="h-4 w-4 shrink-0 text-white" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate leading-tight">
                            {msg.documentMeta.filename || msg.documentMeta.title}
                          </p>
                          {msg.documentMeta.size ? (
                            <p className="text-[10px] text-white/80 leading-tight">
                              {formatFileSize(msg.documentMeta.size)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Unified Structured AI Response Renderer */}
                    <div className="my-1">
                      <AIResponseRenderer
                        message={msg}
                        onRunQuery={(q) => handleSend(q)}
                        onDownloadPdf={(q, c) => handleGeneratePdfForQuery(q, c, msg.structuredData)}
                      />
                    </div>

                    {/* Interactive Format Selection Buttons */}
                    {msg.isFormatPrompt && (
                      <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-2">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" /> Please choose your preferred report format:
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 max-w-md">
                          <button
                            onClick={() => handleSend("PDF format", "pdf")}
                            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <FileText className="h-4 w-4" /> 📄 PDF Format (Download)
                          </button>
                          <button
                            onClick={() => handleSend("Text format", "text")}
                            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-xs font-semibold transition cursor-pointer active:scale-95"
                          >
                            <Bot className="h-4 w-4 text-primary" /> 💬 Text Format (View in Chat)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Download as PDF format option on each and every AI response */}
                    {!isUser && !msg.isFormatPrompt && (
                      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary/80" /> Export as official document
                        </span>
                        <button
                          onClick={() => handleGeneratePdfForQuery(msg.downloadQuery || "SWIFT AI Report", msg.content, msg.structuredData)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition cursor-pointer active:scale-95 border border-primary/20 shadow-2xs hover:shadow-xs"
                          title="Download as PDF format"
                        >
                          <Download className="h-3.5 w-3.5" /> Download as PDF format
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="h-9 w-9 rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {(user?.email || "Admin")[0].toUpperCase()}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {busy && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-center">
                <div className="h-9 w-9 rounded-2xl bg-gradient-brand text-white flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="bg-background border border-border rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground shadow-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>SWIFT AI is reasoning with OpenAI ({selectedModel})...</span>
                </div>
              </motion.div>
            )}

            {/* Bottom Anchor for Smooth Scrolling */}
            <div ref={bottomAnchorRef} className="h-6 w-full shrink-0" />
          </div>

          {/* Quick Suggestions Pills (Above bottom input) */}
          <div className="px-4 py-2 border-t border-border/40 bg-background/50 backdrop-blur overflow-x-auto flex items-center justify-center gap-2 no-scrollbar">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3 text-primary" /> Quick:
            </span>
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                disabled={busy}
                className="shrink-0 text-xs px-3 py-1 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Bottom Docked ChatGPT Search Capsule */}
          <div className="p-4 bg-card/60 border-t border-border/40 backdrop-blur">
            {renderChatGptSearchBox(false)}
          </div>
        </div>
      )}
    </div>
  );
}
