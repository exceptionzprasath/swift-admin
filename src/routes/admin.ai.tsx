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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  Zap,
  RotateCcw,
  Copy,
  Check,
  FileText,
  Calculator,
  ShieldCheck,
  Building2,
  Activity,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Lottie = (LottieRaw as any)?.default || LottieRaw;
const chatbotAnimation = (chatbotAnimationRaw as any)?.default || chatbotAnimationRaw;

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "SWIFT AI Copilot · OpenAI ChatGPT" }] }),
  component: SwiftAiCommandCenter,
});

const PROMPT_CATEGORIES = [
  {
    category: "Payroll & Salary",
    icon: Calculator,
    prompts: [
      "Summarize current month payroll budget, gross liability and PF deductions",
      "Are there any salary or deduction anomalies across our employees?",
      "Explain the PF and ESI contribution rules configured for our company",
    ],
  },
  {
    category: "Attendance & Leaves",
    icon: Activity,
    prompts: [
      "Who has pending leave requests that need urgent admin approval?",
      "Show attendance overview and identify frequent late check-ins",
      "Which department has highest leave utilization this quarter?",
    ],
  },
  {
    category: "HR Letters & Templates",
    icon: FileText,
    prompts: [
      "Draft a formal Promotion & Salary Increment letter for Aarav Sharma with 15% hike",
      "Generate an Official Relieving and Experience Certificate template",
      "Draft a company-wide Notice for upcoming national holiday and remote work policy",
    ],
  },
  {
    category: "Indian Compliance & Filings",
    icon: ShieldCheck,
    prompts: [
      "List all statutory compliance filings (PF, ESI, TDS) due in the next 30 days",
      "Check our company profile against Factories Act and POSH compliance rules",
      "Generate compliance documents bundle for this quarter",
    ],
  },
];

function SwiftAiCommandCenter() {
  const { user, isSuperAdmin, activeTenantId } = useAuth();
  const { company, employees, attendance, payrolls, leaves, docRequests } = useStore();

  const role: Role = isSuperAdmin ? "super_admin" : "admin";
  const suggestions = useMemo(() => suggestionsFor(role), [role]);

  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const scrollerRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to latest message
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages, busy]);

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

  const handleSend = async (queryText?: string, forceFormat?: "pdf" | "text") => {
    const text = (queryText ?? input).trim();
    if (!text || busy) return;

    setInput("");
    await aiOrchestrator.dispatchUserMessage(text, {
      source: "COPILOT",
      forceFormat,
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

  const exportChat = () => {
    const text = messages.map((m) => `[${m.timestamp}] ${m.role.toUpperCase()} (${m.source || "SWIFT AI"}):\n${m.content}\n`).join("\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SWIFT_AI_Chat_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat transcript downloaded");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-sky-500/10 p-5 rounded-3xl border border-primary/20 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-brand flex items-center justify-center p-1 shadow-lg shadow-primary/20 shrink-0">
            <Lottie animationData={chatbotAnimation} loop={true} className="w-full h-full object-contain scale-110" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold font-display tracking-tight">SWIFT AI Copilot</h1>
              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 gap-1.5 font-medium">
                <Sparkles className="h-3 w-3 animate-pulse" /> OpenAI ChatGPT
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Live Tenant Graph
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected to <strong>{company.name}</strong> · {employees.length} active employees · Real-time attendance & payroll intelligence
            </p>
          </div>
        </div>

        {/* API Connection & Model Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* OpenAI Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs">
            <div className={`h-2 w-2 rounded-full ${apiStatus.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="font-medium text-foreground">OpenAI API:</span>
            <span className={apiStatus.ok ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-amber-600"}>
              {apiStatus.ok ? `Connected (${apiStatus.latencyMs ?? 210}ms)` : apiStatus.status}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full hover:bg-muted"
              onClick={pingOpenAi}
              title="Test OpenAI Connection"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>

          {/* Model Switcher */}
          <div className="flex items-center rounded-xl bg-card border border-border p-0.5 text-xs">
            <button
              onClick={() => setSelectedModel("gpt-4o-mini")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedModel === "gpt-4o-mini"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              GPT-4o Mini
            </button>
            <button
              onClick={() => setSelectedModel("gpt-4o")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedModel === "gpt-4o"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              GPT-4o
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => clearConversation(company.name)} className="rounded-xl text-xs gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </Button>

          <Button variant="outline" size="sm" onClick={exportChat} className="rounded-xl text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Main Grid: Chat Arena + Knowledge Context Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Chat Area (3 cols) */}
        <div className="lg:col-span-3 flex flex-col h-[680px] bg-card border border-border/80 rounded-3xl shadow-soft overflow-hidden">
          {/* Chat Scroller */}
          <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-background/40 to-muted/20">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id}
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

                  <div className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                    isUser
                      ? "bg-gradient-brand text-white rounded-br-xs"
                      : "bg-background border border-border/90 text-foreground rounded-bl-xs"
                  }`}>
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
          </div>

          {/* Quick Suggestions Pills */}
          <div className="px-4 py-2 border-t border-border/50 bg-background/60 backdrop-blur overflow-x-auto flex gap-2 no-scrollbar">
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

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-card border-t border-border flex items-center gap-2.5"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about employees, payroll, leaves, policies, or Indian labour compliance..."
              disabled={busy}
              className="flex-1 rounded-2xl border-border bg-background py-5 px-4 text-sm focus-visible:ring-primary"
            />
            <Button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-11 px-5 rounded-2xl bg-gradient-brand text-white shadow-soft hover:shadow-glow transition-all cursor-pointer"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>

        {/* Right Intelligence Sidebar (1 col) */}
        <div className="space-y-4">
          {/* Live Context Card */}
          <Card className="rounded-3xl border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Live Context
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Synced
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Data fed automatically to OpenAI prompt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Company:</span>
                <span className="font-semibold truncate max-w-[130px]">{company.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Headcount:</span>
                <span className="font-semibold">{employees.length} employees</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Payrolls Run:</span>
                <span className="font-semibold">{payrolls.length} months</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Pending Leaves:</span>
                <span className="font-semibold text-amber-600">
                  {leaves.filter((l) => l.status === "pending").length} requests
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">PF Ceiling:</span>
                <span className="font-semibold">₹15,000 (12%)</span>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Playbook Accordion */}
          <Card className="rounded-3xl border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Prompt Playbook
              </CardTitle>
              <CardDescription className="text-xs">
                Click any prompt to run against OpenAI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {PROMPT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-primary" /> {cat.category}
                    </div>
                    <div className="space-y-1">
                      {cat.prompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => handleSend(p)}
                          disabled={busy}
                          className="w-full text-left p-2 rounded-xl text-xs border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all line-clamp-2 cursor-pointer"
                        >
                          "{p}"
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
