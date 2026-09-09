import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useStore, getBackendUrl, type Notice, type NoticePriority, type NoticeAudienceScope } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Megaphone,
  Plus,
  Pin,
  Trash2,
  Eye,
  Send,
  Sparkles,
  Volume2,
  Search,
  Bell,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  Image as ImageIcon,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Info,
  AlertTriangle,
  Radio,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/admin/notices")({
  head: () => ({ meta: [{ title: "Notice Board & Push Broadcast · SWIFT" }] }),
  component: NoticesPage,
});

// Sound chime simulator for push notification test
function playPreviewChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // ignore audio block
  }
}

// Preset announcement samples
const PRESET_TEMPLATES = [
  {
    label: "☕ Tea & Break Announcement",
    title: "hiiiii",
    body: "happy birthday",
    imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80",
    priority: "info" as NoticePriority,
  },
  {
    label: "🪔 Festival Wishes",
    title: "Happy Festive Season to All! ✨",
    body: "Wishing you and your family joy and prosperity. Office will observe a company holiday on Friday.",
    imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80",
    priority: "info" as NoticePriority,
  },
  {
    label: "📢 Company Townhall",
    title: "All-Hands Quarterly Townhall 🚀",
    body: "Join us this Thursday at 4:00 PM for product updates, achievements, and Q&A with leadership.",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80",
    priority: "important" as NoticePriority,
  },
  {
    label: "🚨 Urgent Policy Circular",
    title: "Important: Biometric Grace Period Update",
    body: "Please note the revised 15-minute morning grace punch policy will be strictly implemented starting Monday.",
    imageUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80",
    priority: "urgent" as NoticePriority,
  },
];

function NoticesPage() {
  const { notices, addNotice, deleteNotice, updateNotice, company, employees, currentUser } = useStore();

  // Active view tab
  const [activeTab, setActiveTab] = useState<"broadcast" | "published">("broadcast");

  // Form State (pre-filled with Image 2 tea sample for instant visual parity)
  const [title, setTitle] = useState("hiiiii");
  const [body, setBody] = useState("happy birthday");
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80"
  );
  const [priority, setPriority] = useState<NoticePriority>("info");
  const [scope, setScope] = useState<NoticeAudienceScope>("company");
  const [values, setValues] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [sendPush, setSendPush] = useState(true);
  const [previewTime, setPreviewTime] = useState("10:00 AM");

  // Filter state for published notices
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<"all" | NoticePriority>("all");

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const roles = Array.from(new Set(employees.map((e) => e.designation).filter(Boolean)));

  const toggleValue = (v: string) =>
    setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const resetForm = () => {
    setTitle("");
    setBody("");
    setImageUrl("");
    setPriority("info");
    setScope("company");
    setValues([]);
    setPinned(false);
    setExpiresAt("");
    setSendPush(true);
  };

  const applyTemplate = (t: typeof PRESET_TEMPLATES[0]) => {
    setTitle(t.title);
    setBody(t.body);
    setImageUrl(t.imageUrl);
    setPriority(t.priority);
    toast.success(`Loaded template: ${t.label}`);
    playPreviewChime();
  };

  const handleSendBroadcast = () => {
    if (!title.trim()) {
      toast.error("Notification Title is required (up to 60 characters)");
      return;
    }
    if (!body.trim()) {
      toast.error("Notification Message is required (up to 160 characters)");
      return;
    }
    if (scope !== "company" && values.length === 0) {
      toast.error("Please pick at least one target audience recipient");
      return;
    }

    const created = addNotice({
      title: title.trim(),
      body: body.trim(),
      priority,
      audience: { scope, values: scope === "company" ? [] : values },
      createdBy: currentUser?.name || "Admin",
      pinned,
      expiresAt: expiresAt || undefined,
      imageUrl: imageUrl.trim() || undefined,
      sendPush,
    });

    playPreviewChime();
    toast.success("Broadcast Alert Dispatched!", {
      description: `Sent to ${scope === "company" ? "all employees" : `${values.length} targets`} via Push & Notice Board.`,
    });

    // Dispatch real push notification to mobile devices via backend
    if (sendPush) {
      try {
        const backendUrl = getBackendUrl();
        fetch(`${backendUrl}/api/notifications/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            imageUrl: imageUrl.trim() || undefined,
          }),
        }).catch((err) => console.log("[FCM Push] Backend dispatch offline or pending:", err));
      } catch {}
    }

    // Switch to published notices tab to see the live entry
    setActiveTab("published");
  };

  // Published notices filtered
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchSearch =
        !searchQuery.trim() ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.body.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = filterPriority === "all" || n.priority === filterPriority;
      return matchSearch && matchPriority;
    });
  }, [notices, searchQuery, filterPriority]);

  const appDisplayName = (company.name || "SWIFT HR").toUpperCase();

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Radio className="h-3 w-3 animate-pulse text-red-500" /> Live HR Broadcast Center
            </span>
            <span className="text-xs text-muted-foreground">· Swift 2.4</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1 flex items-center gap-2.5 text-foreground">
            <Megaphone className="h-7 w-7 text-primary shrink-0" />
            Notice Board
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Publish notices to the entire company, a branch, a department, a role, or specific people.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={activeTab === "broadcast" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("broadcast")}
            className={activeTab === "broadcast" ? "bg-gradient-brand text-white shadow-xs" : ""}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-300" /> Push Broadcaster
          </Button>

          <Button
            variant={activeTab === "published" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("published")}
            className={activeTab === "published" ? "bg-gradient-brand text-white shadow-xs" : ""}
          >
            <Layers className="h-3.5 w-3.5 mr-1" /> Published Notices ({notices.length})
          </Button>
        </div>
      </div>

      {/* Main Tab Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        {/* ======================================================== */}
        {/* TAB 1: UNIFIED PUSH NOTIFICATION & LIVE PREVIEW (IMAGE 2) */}
        {/* ======================================================== */}
        <TabsContent value="broadcast" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-12 items-start">
            {/* LEFT COLUMN: Unified Push Notification Card (Matches Image 2 Left) */}
            <div className="xl:col-span-7 bg-card rounded-2xl border border-border/70 p-6 shadow-sm space-y-5">
              {/* Card Header */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-border/50">
                <div className="h-11 w-11 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs ring-1 ring-red-500/20">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
                    Unified Push Notification
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Broadcast festival wishes, deals, or announcements to both apps simultaneously.
                  </p>
                </div>
              </div>

              {/* Quick Preset Templates Bar */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Quick template suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground/80 border border-border/60 transition-colors"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* 1. Notification Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Label htmlFor="notice-title" className="font-semibold text-foreground text-xs">
                      Notification Title
                    </Label>
                    <span
                      className={`text-[11px] font-mono ${
                        title.length > 55 ? "text-amber-500 font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {title.length}/60
                    </span>
                  </div>
                  <Input
                    id="notice-title"
                    maxLength={60}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="hiiiii"
                    className="h-10 bg-background border-border/80 focus:border-primary text-sm font-medium"
                  />
                </div>

                {/* 2. Notification Message */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Label htmlFor="notice-msg" className="font-semibold text-foreground text-xs">
                      Notification Message
                    </Label>
                    <span
                      className={`text-[11px] font-mono ${
                        body.length > 150 ? "text-amber-500 font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {body.length}/160
                    </span>
                  </div>
                  <Textarea
                    id="notice-msg"
                    rows={3}
                    maxLength={160}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="happy birthday"
                    className="bg-background border-border/80 focus:border-primary text-sm leading-relaxed resize-none"
                  />
                </div>

                {/* 3. Notification Image URL (Optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Label htmlFor="notice-img" className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      Notification Image URL (Optional)
                    </Label>
                    <span
                      className={`text-[11px] font-mono ${
                        imageUrl.length > 240 ? "text-amber-500 font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {imageUrl.length}/250
                    </span>
                  </div>
                  <Input
                    id="notice-img"
                    maxLength={250}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/...outine-cover_5b49c9b2.jpg"
                    className="h-10 bg-background border-border/80 focus:border-primary text-xs font-mono"
                  />
                  {imageUrl && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="truncate max-w-[320px]">Image attached · Rendered in live preview</span>
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="text-destructive hover:underline"
                      >
                        Remove image
                      </button>
                    </div>
                  )}
                </div>

                {/* Scope & Audience Targeting */}
                <div className="pt-2 border-t border-border/50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Target Audience</Label>
                      <Select
                        value={scope}
                        onValueChange={(v) => {
                          setScope(v as NoticeAudienceScope);
                          setValues([]);
                        }}
                      >
                        <SelectTrigger className="h-9 mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company">Entire company</SelectItem>
                          <SelectItem value="branch">Specific branch(es)</SelectItem>
                          <SelectItem value="department">Specific department(s)</SelectItem>
                          <SelectItem value="role">Specific designation / role(s)</SelectItem>
                          <SelectItem value="employees">Specific employee(s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Priority Level</Label>
                      <Select value={priority} onValueChange={(v) => setPriority(v as NoticePriority)}>
                        <SelectTrigger className="h-9 mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Information (Blue)</SelectItem>
                          <SelectItem value="important">Important (Amber)</SelectItem>
                          <SelectItem value="urgent">Urgent / Alert (Red)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Selective target checkboxes if not entire company */}
                  {scope !== "company" && (
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 max-h-40 overflow-y-auto space-y-2">
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        Select target {scope}:
                      </div>
                      <div className="space-y-1.5">
                        {scope === "branch" &&
                          (company.branches ?? []).map((b) => (
                            <label key={b.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox checked={values.includes(b.id)} onCheckedChange={() => toggleValue(b.id)} />
                              <span>{b.name}</span>
                              <span className="text-muted-foreground">({b.code || b.city})</span>
                            </label>
                          ))}
                        {scope === "department" &&
                          departments.map((d) => (
                            <label key={d} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox checked={values.includes(d)} onCheckedChange={() => toggleValue(d)} />
                              <span>{d}</span>
                            </label>
                          ))}
                        {scope === "role" &&
                          roles.map((r) => (
                            <label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox checked={values.includes(r)} onCheckedChange={() => toggleValue(r)} />
                              <span>{r}</span>
                            </label>
                          ))}
                        {scope === "employees" &&
                          employees.map((e) => (
                            <label key={e.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox checked={values.includes(e.id)} onCheckedChange={() => toggleValue(e.id)} />
                              <span>{e.name}</span>
                              <span className="text-muted-foreground">({e.empCode || e.department})</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Channels & Options */}
                  <div className="flex items-center gap-6 pt-2 text-xs flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox checked={sendPush} onCheckedChange={(c) => setSendPush(Boolean(c))} />
                      <span>Push Notification</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Switch checked={pinned} onCheckedChange={setPinned} />
                      <span>Pin to Top</span>
                    </label>
                  </div>
                </div>

                {/* Primary Action Button - Styled as the vibrant red button in Image 2 */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleSendBroadcast}
                    className="w-full bg-[#b80d0d] hover:bg-[#a00b0b] text-white font-semibold text-sm py-3 h-12 rounded-xl shadow-md hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Send className="h-4 w-4" />
                    Send Announcement Alert
                  </Button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ✨ LIVE PUSH NOTIFICATION PREVIEW (Matches Image 2 Right) */}
            <div className="xl:col-span-5 space-y-4">
              {/* Header Title with Sparkles */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Live Push Notification Preview</span>
                </div>

                {/* Interactive Controls */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={playPreviewChime}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                    title="Simulate Push Alert Sound"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                    <span>Test Chime</span>
                  </Button>
                </div>
              </div>

              {/* Realistic Smartphone Mockup Device Frame */}
              <div className="flex justify-center">
                <div className="relative w-full max-w-[340px] rounded-[42px] border-[10px] border-slate-900 dark:border-slate-800 bg-slate-950 shadow-2xl p-2.5 overflow-hidden transition-all ring-1 ring-white/10">
                  {/* Phone Speaker & Camera Notch (Dynamic Island) */}
                  <div className="absolute top-3 inset-x-0 flex justify-center z-30 pointer-events-none">
                    <div className="h-4 w-24 bg-black rounded-full flex items-center justify-end px-2 gap-1 border border-white/10">
                      <span className="h-2 w-2 rounded-full bg-blue-950/80 ring-1 ring-blue-500/40" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
                    </div>
                  </div>

                  {/* Inner Screen Area */}
                  <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-b from-[#3a0d0d] via-[#1a0808] to-[#0d0404] min-h-[500px] flex flex-col justify-between p-3.5 text-white font-sans select-none">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 px-2 pt-1 pb-4">
                      <span>{previewTime}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] tracking-tight">5G</span>
                        {/* Battery Icon */}
                        <div className="h-2.5 w-5 rounded-xs border border-white/70 p-0.5 flex items-center">
                          <div className="h-full w-3.5 bg-white rounded-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Lockscreen Notifications Container */}
                    <div className="flex-1 space-y-3 pt-2">
                      {/* PUSH NOTIFICATION BANNER (Exact Style from Image 2) */}
                      <div className="rounded-2xl bg-white/95 dark:bg-card/95 text-slate-900 dark:text-card-foreground p-3.5 shadow-2xl backdrop-blur-md border border-white/20 transition-all">
                        {/* Notification Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* App Icon (Red rounded badge with white bell) */}
                            <div className="h-5 w-5 rounded-md bg-[#b80d0d] text-white flex items-center justify-center shadow-xs">
                              <Bell className="h-3 w-3" />
                            </div>
                            <span className="font-bold text-[11px] tracking-wider uppercase text-slate-800 dark:text-slate-200">
                              {appDisplayName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">now</span>
                        </div>

                        {/* Notification Title */}
                        <div className="mt-2 text-xs font-bold leading-tight text-slate-900 dark:text-white">
                          {title || "hiiiii"}
                        </div>

                        {/* Notification Message */}
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
                          {body || "happy birthday"}
                        </div>

                        {/* Notification Image Preview (As in Image 2 tea cup photo) */}
                        {imageUrl && (
                          <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-100 max-h-36">
                            <img
                              src={imageUrl}
                              alt="Notification Attachment"
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Ambient Lockscreen Placeholders (Matching bottom in Image 2) */}
                      <div className="pt-8 opacity-20 space-y-2">
                        <div className="h-3 w-28 bg-white/30 rounded-full mx-auto" />
                        <div className="h-2.5 w-40 bg-white/20 rounded-full mx-auto" />
                      </div>
                    </div>

                    {/* Bottom Screen Widgets & Home Indicator Bar */}
                    <div className="space-y-3 pt-2">
                      {/* Ambient Bottom Quick Buttons (Like flashlight/camera on lockscreen) */}
                      <div className="flex items-center justify-between px-3">
                        <div className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                          <span className="h-3.5 w-3.5 rounded-full bg-white/30" />
                        </div>
                        <div className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                          <span className="h-3.5 w-3.5 rounded-full bg-white/30" />
                        </div>
                      </div>

                      {/* Home Swipe Indicator */}
                      <div className="h-1 w-28 bg-white/40 rounded-full mx-auto" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Device Specs Note */}
              <div className="text-center text-[11px] text-muted-foreground">
                Simulated on 6.7" OLED · Real-time push payload preview
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: PUBLISHED NOTICES & MANAGEMENT (IMAGE 1 LEFT) */}
        {/* ======================================================== */}
        <TabsContent value="published" className="mt-0 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border/60">
              <div>
                <h3 className="font-display font-semibold text-base text-foreground">Published notices</h3>
                <p className="text-xs text-muted-foreground">Manage active broadcasts, read receipts, and pinning</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {notices.length} Total
              </Badge>
            </div>

            {/* Search & Priority Filter Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search published notices..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-1 text-xs">
                {(["all", "urgent", "important", "info"] as const).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={filterPriority === p ? "secondary" : "ghost"}
                    onClick={() => setFilterPriority(p)}
                    className="h-8 text-xs capitalize px-2.5"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notices List */}
            {filteredNotices.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Megaphone className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="font-medium text-foreground">No notices found</p>
                <p>Publish an announcement from the Push Broadcaster tab.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredNotices.map((n) => (
                  <NoticeAdminRow
                    key={n.id}
                    n={n}
                    onDelete={() => {
                      deleteNotice(n.id);
                      toast.success("Notice deleted");
                    }}
                    onPin={() => updateNotice(n.id, { pinned: !n.pinned })}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Notice Admin Item Row matching Image 1 Published Notices styling
function NoticeAdminRow({
  n,
  onDelete,
  onPin,
}: {
  n: Notice;
  onDelete: () => void;
  onPin: () => void;
}) {
  const readCount = (n.readBy || []).length;
  const createdDate = new Date(n.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  return (
    <div className="group relative rounded-xl border border-border/80 bg-background/60 hover:bg-muted/30 p-3.5 transition-all shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {/* Title & Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {n.pinned && (
              <span className="text-primary font-bold inline-flex items-center" title="Pinned to top">
                <Pin className="h-3.5 w-3.5 fill-primary text-primary" />
              </span>
            )}
            <span className="font-semibold text-sm text-foreground truncate">{n.title}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {n.audience.scope}
            </Badge>
            {n.priority !== "info" && (
              <Badge
                variant="outline"
                className={`text-[9px] uppercase px-1 py-0 font-bold ${
                  n.priority === "urgent"
                    ? "bg-red-500/10 text-red-600 border-red-500/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                }`}
              >
                {n.priority}
              </Badge>
            )}
            {n.imageUrl && (
              <span className="inline-flex items-center text-[10px] text-muted-foreground gap-0.5">
                <ImageIcon className="h-3 w-3" />
              </span>
            )}
          </div>

          {/* Body snippet */}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.body}</p>

          {/* Read Receipts & Timestamp */}
          <div className="text-[11px] text-muted-foreground flex items-center gap-3 pt-0.5">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-muted-foreground/70" />
              <span>
                {readCount} read · {createdDate}
              </span>
            </span>

            {n.sendPush && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                ✓ Push broadcasted
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className={`h-8 w-8 ${n.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={onPin}
            title={n.pinned ? "Unpin notice" : "Pin notice"}
          >
            <Pin className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="Delete notice"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
