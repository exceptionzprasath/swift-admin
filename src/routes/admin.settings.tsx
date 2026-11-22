import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, uploadToS3, type DashboardBannerItem, DEFAULT_LEAVE_POLICIES } from "@/lib/store";
import { PeriodicLeavePolicyCard } from "@/components/payroll/PeriodicLeavePolicyCard";
import { LeaveRenewalModal } from "@/components/payroll/LeaveRenewalModal";
import { useAuth } from "@/lib/auth";
import { PALETTES, getPalette, type ThemePaletteId } from "@/lib/palettes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SIDEBAR_ITEMS,
  getSavedSidebarOrder,
  saveSidebarOrder,
  getSavedHiddenSidebarItems,
  saveHiddenSidebarItems,
  type NavItemConfig,
} from "@/lib/sidebar-config";
import {
  Calculator,
  ArrowRight,
  Palette,
  Check,
  Sparkles,
  Sun,
  Moon,
  Wand2,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  Sliders,
  Radio,
  Eye,
  EyeOff,
  ChevronDown,
  ScanFace,
  ShieldCheck,
  Lock,
  AlertTriangle,
  ShieldAlert,
  IndianRupee,
  Clock,
  CalendarDays,
  Timer,
  PanelLeft,
  RotateCcw,
  Search,
  GripVertical,
} from "lucide-react";
import { Reorder, useDragControls, AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Company Settings · CreatonsHR" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    company,
    setCompany,
    docAssets,
    setDocAssets,
    saveAllCompanySettings,
    evaluateEarnedLeaveAccrual,
    processYearEndLeaveRollover,
  } = useStore();
  const { theme, setTheme, setThemePalette } = useStore();
  const [saving, setSaving] = useState(false);
  const [paletteDropdownOpen, setPaletteDropdownOpen] = useState(false);
  const [showKioskPassword, setShowKioskPassword] = useState(false);
  const [confirmAutoTerminateOpen, setConfirmAutoTerminateOpen] = useState(false);
  const [rolloverConfirmOpen, setRolloverConfirmOpen] = useState(false);
  const [rollingOver, setRollingOver] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalModalType, setRenewalModalType] = useState<"ALL" | "CL" | "SL">("ALL");

  const activePaletteId = company.themePalette || "swift-teal";
  const activePalette = getPalette(activePaletteId);

  const handleSelectPalette = (paletteId: ThemePaletteId) => {
    setThemePalette(paletteId);
    const selected = getPalette(paletteId);
    toast.success(`Theme updated to "${selected.name}" & saved to database!`);
  };

  const readAsset = (key: keyof typeof docAssets) => (file: File | null) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = r.result as string;
      setDocAssets({ [key]: dataUrl } as Partial<typeof docAssets>);
      if (key === "logoDataUrl") {
        setCompany({ logoDataUrl: dataUrl });
      }
      toast.success("File uploaded to assets draft");
    };
    r.readAsDataURL(file);
  };

  const handleUploadBannerImage = (slideId: string) => (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const tenantId = useAuth.getState().activeTenantId || "default";

      const currentBanners = company.dashboardBanners?.banners || [];
      const updatedBanners = currentBanners.map((b) =>
        b.id === slideId ? { ...b, imageUrl: dataUrl } : b
      );
      setCompany({
        dashboardBanners: {
          ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
          banners: updatedBanners,
        },
      });

      try {
        toast.loading("Uploading banner to S3 bucket...", { id: `upload-${slideId}` });
        const s3Url = await uploadToS3(tenantId, `banners/${slideId}_${Date.now()}.png`, dataUrl);
        const finalBanners = (company.dashboardBanners?.banners || updatedBanners).map((b) =>
          b.id === slideId ? { ...b, imageUrl: s3Url } : b
        );
        setCompany({
          dashboardBanners: {
            ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
            banners: finalBanners,
          },
        });
        toast.success("Banner image successfully saved to S3 bucket!", { id: `upload-${slideId}` });
      } catch (err: any) {
        toast.error("S3 upload fallback: " + (err?.message || "Saved locally"), { id: `upload-${slideId}` });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddBannerSlide = () => {
    const newSlide: DashboardBannerItem = {
      id: `banner-${Date.now()}`,
      imageUrl: "",
      title: "PEOPLE & CULTURE",
      subtitle: "Collaborate, Innovate, Excel Together.",
      tagline: "Empowering Every Team | Real-time Engagement",
      ctaText: "Explore Our Journey",
      ctaLink: "/admin/org",
      active: true,
    };
    const currentBanners = company.dashboardBanners?.banners || [];
    setCompany({
      dashboardBanners: {
        ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
        banners: [...currentBanners, newSlide],
      },
    });
    toast.success("New banner slide added! Upload an image and configure details.");
  };

  const handleDeleteBannerSlide = (slideId: string) => {
    const currentBanners = company.dashboardBanners?.banners || [];
    setCompany({
      dashboardBanners: {
        ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
        banners: currentBanners.filter((b) => b.id !== slideId),
      },
    });
    toast.success("Banner slide removed");
  };

  const handleUpdateBannerSlide = (slideId: string, patch: Partial<DashboardBannerItem>) => {
    const currentBanners = company.dashboardBanners?.banners || [];
    setCompany({
      dashboardBanners: {
        ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
        banners: currentBanners.map((b) => (b.id === slideId ? { ...b, ...patch } : b)),
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAllCompanySettings();
      toast.success("Settings & document assets saved to DynamoDB and S3!");
    } catch (err: any) {
      toast.error("Save error: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const num = (k: keyof typeof company) => (
    <Input
      type="number"
      value={company[k] as number}
      onChange={(e) => setCompany({ [k]: +e.target.value || 0 } as any)}
    />
  );
  const str = (k: keyof typeof company) => (
    <Input value={company[k] as string} onChange={(e) => setCompany({ [k]: e.target.value } as any)} />
  );

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage company profile, working hours, document assets, office locations, and templates.
          </p>
        </div>
        <Button
          className="bg-primary text-primary-foreground font-semibold shadow-xs px-6 py-2 rounded-xl"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving to Database..." : "Save Changes"}
        </Button>
      </div>

      {/* Theme & Color Palettes Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Theme & Brand Color Identity</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                20 Curated Palettes
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Select your organization's brand color identity. Theme changes apply instantly and auto-save directly to your cloud database.
            </p>
          </div>

          {/* Light / Dark Mode Toggle */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60 border border-border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                theme !== "dark"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Compact Dropdown & Component Preview Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Dropdown Selector */}
          <div className="lg:col-span-6 relative">
            <Label className="text-xs font-semibold mb-1.5 block">Choose Color Palette</Label>
            
            {/* Custom Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPaletteDropdownOpen((prev) => !prev)}
                className="w-full p-3 rounded-xl border border-border bg-background hover:bg-muted/40 transition-all flex items-center justify-between gap-3 text-left shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-5 w-20 rounded-md overflow-hidden border border-border/80 shrink-0 shadow-xs">
                    {activePalette.colors.map((hex, cIdx) => (
                      <div key={cIdx} style={{ backgroundColor: hex }} className="flex-1 h-full" />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-foreground truncate">{activePalette.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{activePalette.vibe}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    Active
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${paletteDropdownOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Dropdown Menu Popover */}
              {paletteDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPaletteDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 p-2 rounded-2xl border border-border bg-card shadow-2xl max-h-[360px] overflow-y-auto space-y-1 backdrop-blur-xl">
                    {PALETTES.map((p, idx) => {
                      const isSelected = activePaletteId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handleSelectPalette(p.id);
                            setPaletteDropdownOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                              : "border-transparent bg-transparent hover:bg-muted/60 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-4 w-18 rounded overflow-hidden border border-border/80 shrink-0 shadow-xs">
                              {p.colors.map((hex, cIdx) => (
                                <div key={cIdx} style={{ backgroundColor: hex }} className="flex-1 h-full" />
                              ))}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                <span>{p.name}</span>
                                <span className="text-[10px] font-normal text-muted-foreground">#{idx + 1}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">{p.vibe}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Live Preview Simulation Strip */}
          <div className="lg:col-span-6 p-3 rounded-xl bg-muted/30 border border-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Live Components ({activePalette.name})
              </span>
              <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Synced
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-navbar text-navbar-foreground text-xs font-semibold shadow-xs">
                Navbar
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sidebar text-sidebar-foreground text-xs font-semibold shadow-xs">
                Sidebar
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-taskmenu text-taskmenu-foreground text-xs font-bold shadow-xs">
                Active Menu
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-semibold">
                Accent Pill
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Side panel Section */}
      <SidebarOrderEditor />

      {/* Dashboard Hero Banner & Live Notification Settings */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h2 className="font-display font-semibold text-lg">Dashboard Hero Banners & Live Stream</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure dynamic auto-scrolling company hero banners, AWS S3 image storage, customized rotation timers, and live notifications.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddBannerSlide}
            className="gap-1.5 rounded-xl font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Add Banner Slide</span>
          </Button>
        </div>

        {/* Global Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-muted/30 p-5 rounded-xl border border-border/60">
          <div>
            <Label className="text-xs font-semibold">Enable Banner Carousel</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Display banner on Dashboard</p>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="bannerEnabled"
                checked={company.dashboardBanners?.enabled ?? true}
                onChange={(e) =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
                      enabled: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="bannerEnabled" className="text-xs font-medium cursor-pointer">
                {company.dashboardBanners?.enabled ?? true ? "Active & Visible" : "Disabled"}
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Text Overlay on Banner</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Show or remove typography & text</p>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="textOverlayEnabled"
                checked={company.dashboardBanners?.showTextOverlay ?? true}
                onChange={(e) =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
                      showTextOverlay: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="textOverlayEnabled" className="text-xs font-medium cursor-pointer">
                {company.dashboardBanners?.showTextOverlay ?? true ? "Text Overlay Visible" : "Remove Text (Clean Banner)"}
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Banner Corner Border Radius</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Rounded corners vs Sharp square edges</p>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
                      hasBorderRadius: true,
                    },
                  })
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  (company.dashboardBanners?.hasBorderRadius ?? true)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted text-foreground border-border"
                }`}
              >
                Rounded (2xl)
              </button>
              <button
                type="button"
                onClick={() =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
                      hasBorderRadius: false,
                    },
                  })
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-none border transition-colors ${
                  !(company.dashboardBanners?.hasBorderRadius ?? true)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted text-foreground border-border"
                }`}
              >
                Sharp / Flat
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Auto-Scroll Interval (Seconds)</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Time per slide before rotating</p>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min={2}
                max={60}
                value={company.dashboardBanners?.autoScrollSeconds || 5}
                onChange={(e) =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, transitionEffect: "slide", banners: [] }),
                      autoScrollSeconds: Math.max(2, parseInt(e.target.value) || 5),
                    },
                  })
                }
                className="w-18 h-8 text-xs rounded-lg"
              />
              <div className="flex gap-1">
                {[3, 5, 7, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      setCompany({
                        dashboardBanners: {
                          ...(company.dashboardBanners || { enabled: true, transitionEffect: "slide", banners: [] }),
                          autoScrollSeconds: sec,
                        },
                      })
                    }
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                      (company.dashboardBanners?.autoScrollSeconds || 5) === sec
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Banner Image Zoom Level</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Scale / Zoom image in or out</p>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min={70}
                max={180}
                step={5}
                value={company.dashboardBanners?.zoomLevel || 100}
                onChange={(e) =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
                      zoomLevel: Math.max(70, Math.min(180, parseInt(e.target.value) || 100)),
                    },
                  })
                }
                className="w-18 h-8 text-xs rounded-lg"
              />
              <div className="flex gap-1">
                {[90, 100, 115, 130].map((zoom) => (
                  <button
                    key={zoom}
                    type="button"
                    onClick={() =>
                      setCompany({
                        dashboardBanners: {
                          ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
                          zoomLevel: zoom,
                        },
                      })
                    }
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                      (company.dashboardBanners?.zoomLevel || 100) === zoom
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    {zoom}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Image Fitting & Transition</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Object fit & slide transition</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <select
                value={company.dashboardBanners?.imageFit || "cover"}
                onChange={(e) =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide" as const, banners: [] }),
                      imageFit: e.target.value as any,
                    },
                  })
                }
                className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
              >
                <option value="cover">Fit: Cover</option>
                <option value="contain">Fit: Contain</option>
                <option value="fill">Fit: Fill</option>
              </select>

              <select
                value={company.dashboardBanners?.transitionEffect || "slide"}
                onChange={(e) =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, banners: [] }),
                      transitionEffect: e.target.value as "slide" | "fade",
                    },
                  })
                }
                className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
              >
                <option value="slide">Slide</option>
                <option value="fade">Fade</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold">Live Notification Stream</Label>
              <p className="text-[11px] text-muted-foreground">
                Toggle the real-time auto-scrolling live ticker bar under the dashboard header.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showLiveTickerToggle"
                checked={company.dashboardBanners?.showLiveTicker ?? true}
                onChange={(e) =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
                      showLiveTicker: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="showLiveTickerToggle" className="text-xs font-medium cursor-pointer flex items-center gap-2">
                <span>{company.dashboardBanners?.showLiveTicker ?? true ? "Live Stream Enabled" : "Live Stream Disabled"}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </label>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold">Bottom Action Button (CTA)</Label>
              <p className="text-[11px] text-muted-foreground">
                Toggle the exploration/action button strip under the banner. Automatically synced to the active theme palette (<span className="font-semibold text-primary">{activePalette.name}</span>).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showActionButtonToggle"
                checked={company.dashboardBanners?.showActionButton ?? true}
                onChange={(e) =>
                  setCompany({
                    dashboardBanners: {
                      ...(company.dashboardBanners || { enabled: true, autoScrollSeconds: 5, transitionEffect: "slide", banners: [] }),
                      showActionButton: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="showActionButtonToggle" className="text-xs font-medium cursor-pointer flex items-center gap-2">
                <span>{company.dashboardBanners?.showActionButton ?? true ? "Action Button Enabled" : "Action Button Disabled"}</span>
                <span className="h-2.5 w-6 rounded-full bg-primary inline-block" title="Synced to current theme" />
              </label>
            </div>
          </div>
        </div>

        {/* Banner Slides List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
              Configured Banner Slides ({company.dashboardBanners?.banners?.length || 0})
            </h3>
          </div>

          <div className="space-y-4">
            {(company.dashboardBanners?.banners || []).map((slide, index) => (
              <div
                key={slide.id || index}
                className="p-4 rounded-xl border border-border bg-card/80 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-xs text-foreground">
                      {slide.title || `Slide ${index + 1}`}
                    </span>
                    {slide.active === false && (
                      <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slide.active !== false}
                        onChange={(e) =>
                          handleUpdateBannerSlide(slide.id, { active: e.target.checked })
                        }
                        className="h-3.5 w-3.5 accent-primary cursor-pointer"
                      />
                      <span>Active</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBannerSlide(slide.id)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Delete Slide"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Image Upload Box with S3 Preview */}
                  <div className="md:col-span-4 space-y-2">
                    <Label className="text-xs font-medium">Banner Background Image</Label>
                    <div className="relative rounded-lg border-2 border-dashed border-border/80 overflow-hidden bg-muted/20 h-28 flex flex-col items-center justify-center text-center p-2 group hover:border-primary/50 transition-colors">
                      {slide.imageUrl ? (
                        <>
                          <img
                            src={slide.imageUrl}
                            alt="Banner Preview"
                            className="w-full h-full object-cover rounded-md"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                            <span className="text-[10px] text-white font-medium">Click to replace</span>
                            <label className="cursor-pointer bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-xs hover:opacity-90">
                              Upload New
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleUploadBannerImage(slide.id)(e.target.files?.[0] || null)
                                }
                              />
                            </label>
                          </div>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 w-full h-full">
                          <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-[11px] font-medium text-foreground">Upload to S3</span>
                          <span className="text-[9px] text-muted-foreground">PNG, JPG or WEBP</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleUploadBannerImage(slide.id)(e.target.files?.[0] || null)
                            }
                          />
                        </label>
                      )}
                    </div>
                    {slide.imageUrl && (
                      <p className="text-[10px] text-muted-foreground truncate" title={slide.imageUrl}>
                        Source: {slide.imageUrl.startsWith("data:") ? "Local draft (uploads on save)" : "Saved in S3"}
                      </p>
                    )}
                  </div>

                  {/* Text Content Inputs */}
                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Badge / Category</Label>
                      <Input
                        value={slide.title || ""}
                        onChange={(e) =>
                          handleUpdateBannerSlide(slide.id, { title: e.target.value })
                        }
                        placeholder="e.g. A PEOPLE-FIRST WORKPLACE"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Headline / Subtitle</Label>
                      <Input
                        value={slide.subtitle || ""}
                        onChange={(e) =>
                          handleUpdateBannerSlide(slide.id, { subtitle: e.target.value })
                        }
                        placeholder="e.g. Where People Grow, Businesses Thrive."
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Tagline / Keywords</Label>
                      <Input
                        value={slide.tagline || ""}
                        onChange={(e) =>
                          handleUpdateBannerSlide(slide.id, { tagline: e.target.value })
                        }
                        placeholder="e.g. Smarter HR | Stronger Teams"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">CTA Button Text</Label>
                        <Input
                          value={slide.ctaText || ""}
                          onChange={(e) =>
                            handleUpdateBannerSlide(slide.id, { ctaText: e.target.value })
                          }
                          placeholder="e.g. Explore Our Journey"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CTA Target Link</Label>
                        <Input
                          value={slide.ctaLink || ""}
                          onChange={(e) =>
                            handleUpdateBannerSlide(slide.id, { ctaLink: e.target.value })
                          }
                          placeholder="e.g. /admin/org"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Per-Slide Options: Hide Text, Hide Action Button & Zoom */}
                    <div className="sm:col-span-2 pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
                      <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slide.hideTextOverlay === true}
                          onChange={(e) =>
                            handleUpdateBannerSlide(slide.id, { hideTextOverlay: e.target.checked })
                          }
                          className="h-3.5 w-3.5 accent-primary cursor-pointer"
                        />
                        <span>Remove Text</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slide.hideActionButton === true}
                          onChange={(e) =>
                            handleUpdateBannerSlide(slide.id, { hideActionButton: e.target.checked })
                          }
                          className="h-3.5 w-3.5 accent-primary cursor-pointer"
                        />
                        <span>Hide Action Button</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Zoom:</Label>
                        <Input
                          type="number"
                          min={70}
                          max={180}
                          step={5}
                          value={slide.zoomLevel || 100}
                          onChange={(e) =>
                            handleUpdateBannerSlide(slide.id, {
                              zoomLevel: Math.max(70, Math.min(180, parseInt(e.target.value) || 100)),
                            })
                          }
                          className="h-7 text-xs w-16"
                        />
                        <span className="text-[10px] text-muted-foreground">%</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Fit:</Label>
                        <select
                          value={slide.imageFit || "cover"}
                          onChange={(e) =>
                            handleUpdateBannerSlide(slide.id, { imageFit: e.target.value as any })
                          }
                          className="h-7 text-xs rounded-md border border-border bg-background px-1.5 w-full"
                        >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                          <option value="fill">Fill</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Direct Banner to Dedicated Payroll Screen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/20 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-foreground">
              Looking for Salary Structures & Statutory Configuration?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              All payroll components, allowances (DA, HRA, OA, CA, LTA), PF, ESI, Professional Tax, and Monthly Runs are now in the dedicated Payroll screen.
            </p>
          </div>
        </div>
        <Link to="/admin/payroll">
          <Button className="font-semibold gap-1.5 rounded-xl text-xs h-9">
            <span>Open Payroll Master</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Company Profile */}
      <Card title="Company Profile">
        <Field label="Display Name">{str("name")}</Field>
        <Field label="Legal Name">{str("legalName")}</Field>
        <Field label="Address">{str("address")}</Field>
        <Field label="GSTIN">{str("gstin")}</Field>
      </Card>

      {/* Working Time */}
      <Card title="Working Time & Shift Policy">
        <Field label="Working Days / Month">{num("workingDaysPerMonth")}</Field>
        <Field label="Working Hours / Day">{num("workingHoursPerDay")}</Field>
        <Field label="Overtime Multiplier">{num("otMultiplier")}</Field>
      </Card>

      {/* Document Assets */}
      <Card title="Document Assets (Used automatically on generated appointment letters & reports)">
        <AssetUpload label="Company Logo" src={docAssets.logoDataUrl} onFile={readAsset("logoDataUrl")} />
        <AssetUpload label="Letterhead" src={docAssets.letterheadDataUrl} onFile={readAsset("letterheadDataUrl")} />
        <AssetUpload label="Footer" src={docAssets.footerDataUrl} onFile={readAsset("footerDataUrl")} />
        <AssetUpload label="Watermark" src={docAssets.watermarkDataUrl} onFile={readAsset("watermarkDataUrl")} />
        <AssetUpload label="Company Seal" src={docAssets.companySealDataUrl} onFile={readAsset("companySealDataUrl")} />
        <AssetUpload label="Department Seal" src={docAssets.departmentSealDataUrl} onFile={readAsset("departmentSealDataUrl")} />
        <AssetUpload label="MD Signature" src={docAssets.mdSignatureDataUrl} onFile={readAsset("mdSignatureDataUrl")} />
        <AssetUpload label="HR Signature" src={docAssets.hrSignatureDataUrl} onFile={readAsset("hrSignatureDataUrl")} />
        <AssetUpload label="Authorised Signatory" src={docAssets.authorisedSignatoryDataUrl} onFile={readAsset("authorisedSignatoryDataUrl")} />
        <AssetUpload label="Branch Manager Signature" src={docAssets.branchManagerSignatureDataUrl} onFile={readAsset("branchManagerSignatureDataUrl")} />
        <AssetUpload label="Factory Manager Signature" src={docAssets.factoryManagerSignatureDataUrl} onFile={readAsset("factoryManagerSignatureDataUrl")} />
        <AssetUpload label="QR Verification" src={docAssets.qrCodeDataUrl} onFile={readAsset("qrCodeDataUrl")} />
        <Field label="Document Number Prefix">
          <Input value={docAssets.docNumberPrefix} onChange={(e) => setDocAssets({ docNumberPrefix: e.target.value })} />
        </Field>
        <Field label="Document Number Format">
          <Input value={docAssets.docNumberFormat} onChange={(e) => setDocAssets({ docNumberFormat: e.target.value })} />
        </Field>
        <Field label="Digital Certificate Name">
          <Input value={docAssets.digitalCertificateName ?? ""} onChange={(e) => setDocAssets({ digitalCertificateName: e.target.value })} />
        </Field>
      </Card>

      {/* Shifts */}
      <Card title="Company Shifts">
        <div className="col-span-3 space-y-2">
          {company.shifts.map((s, i) => (
            <div key={s.id} className="grid grid-cols-5 gap-2">
              <Input
                value={s.name}
                onChange={(e) => {
                  const copy = [...company.shifts];
                  copy[i] = { ...s, name: e.target.value };
                  setCompany({ shifts: copy });
                }}
              />
              <Input
                value={s.start}
                onChange={(e) => {
                  const copy = [...company.shifts];
                  copy[i] = { ...s, start: e.target.value };
                  setCompany({ shifts: copy });
                }}
              />
              <Input
                value={s.end}
                onChange={(e) => {
                  const copy = [...company.shifts];
                  copy[i] = { ...s, end: e.target.value };
                  setCompany({ shifts: copy });
                }}
              />
              <Input
                type="number"
                placeholder="₹ per day"
                value={s.allowancePerDay}
                onChange={(e) => {
                  const copy = [...company.shifts];
                  copy[i] = { ...s, allowancePerDay: +e.target.value || 0 };
                  setCompany({ shifts: copy });
                }}
              />
              <Button
                variant="ghost"
                onClick={() => setCompany({ shifts: company.shifts.filter((_, j) => j !== i) })}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setCompany({
                shifts: [
                  ...company.shifts,
                  { id: crypto.randomUUID(), name: "New Shift", start: "09:00", end: "18:00", allowancePerDay: 0 },
                ],
              })
            }
          >
            Add Shift
          </Button>
        </div>
      </Card>

      {/* Common Logins Portal / Attendance Kiosk */}
      <Card title="Common Logins Portal (Attendance Kiosk)">
        <div className="col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ScanFace className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Common Attendance Kiosk Portal</span>
                <span
                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                    company.commonPortal?.enabled || company.commonPortalEnabled
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {company.commonPortal?.enabled || company.commonPortalEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Enable a shared kiosk portal for employees and staff who do not have personal mobile phones.
                When enabled, configure dedicated login credentials below. Signing in with these credentials on the Workspace Admin login page opens a dedicated full-screen Facial Authentication & Employee Code Attendance Dashboard.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">
                {company.commonPortal?.enabled || company.commonPortalEnabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={Boolean(company.commonPortal?.enabled || company.commonPortalEnabled)}
                onCheckedChange={(checked) => {
                  setCompany({
                    commonPortalEnabled: checked,
                    commonPortal: {
                      enabled: checked,
                      username: company.commonPortal?.username || company.commonPortalUsername || "kiosk@creatonshr.com",
                      password: company.commonPortal?.password || company.commonPortalPassword || "kiosk123",
                      portalTitle: company.commonPortal?.portalTitle || "Common Attendance Kiosk",
                      requireFaceMatch: company.commonPortal?.requireFaceMatch ?? true,
                    },
                    commonPortalUsername: company.commonPortal?.username || company.commonPortalUsername || "kiosk@creatonshr.com",
                    commonPortalPassword: company.commonPortal?.password || company.commonPortalPassword || "kiosk123",
                  });
                  toast.success(checked ? "Common Logins Portal Enabled" : "Common Logins Portal Disabled");
                }}
              />
            </div>
          </div>

          {(company.commonPortal?.enabled || company.commonPortalEnabled) && (
            <div className="space-y-4 p-4 rounded-xl border border-border bg-card/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Kiosk Login Username / ID (Used in Admin Login Page)">
                  <Input
                    placeholder="e.g. kiosk@creatonshr.com or KIOSK01"
                    value={company.commonPortal?.username || company.commonPortalUsername || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompany({
                        commonPortalUsername: val,
                        commonPortal: {
                          ...(company.commonPortal || { enabled: true }),
                          username: val,
                        },
                      });
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Enter this ID or username on the Admin Panel login page.
                  </p>
                </Field>

                <Field label="Kiosk Login Password">
                  <div className="relative">
                    <Input
                      type={showKioskPassword ? "text" : "password"}
                      placeholder="Enter a secure password for this kiosk terminal"
                      value={company.commonPortal?.password || company.commonPortalPassword || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompany({
                          commonPortalPassword: val,
                          commonPortal: {
                            ...(company.commonPortal || { enabled: true }),
                            password: val,
                          },
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKioskPassword(!showKioskPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                      title={showKioskPassword ? "Hide password" : "Show password"}
                    >
                      {showKioskPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Password used to authenticate this common attendance terminal.
                  </p>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-end">
                <Field label="Kiosk Terminal Name / Gate Location (Optional)">
                  <Input
                    placeholder="e.g. Main Factory Gate 1 Kiosk / Reception Terminal"
                    value={company.commonPortal?.portalTitle || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompany({
                        commonPortal: {
                          ...(company.commonPortal || { enabled: true }),
                          portalTitle: val,
                        },
                      });
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Custom banner title displayed on the attendance screen.
                  </p>
                </Field>

                <div>
                  <Link to="/admin/common-attendance">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 border-primary/30 text-primary hover:bg-primary/10 flex items-center justify-center gap-2 font-medium"
                    >
                      <ScanFace className="h-4 w-4" /> Open Common Attendance Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="leading-relaxed">
                  <strong>Workflow Guide:</strong> On any PC, tablet, or gate terminal device, navigate to the Workspace Admin Login page and sign in with the <strong>Username</strong> and <strong>Password</strong> configured above. It will directly launch the dedicated <strong>Common Attendance Dashboard</strong> with Employee Code search and live face recognition! Click <strong>Save All Settings</strong> to save these credentials to the cloud database.
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Earned Leave (EL) Policy Engine */}
      <Card title="Earned Leave (EL) Policy Engine">
        <div className="col-span-3 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">Dynamic Working-Day Accrual, Rollover & Encashment Engine</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                  Intelligent Leave Engine
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Replaces static annual EL quotas with automated working-day accrual, year-end carry forward limits, and payroll encashment.
              </p>
            </div>
          </div>

          {/* Sub-section A: Dynamic Working-Day Accrual Rule */}
          <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Sub-section A: Dynamic Working-Day Accrual Rule
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Credits EL automatically after an employee completes qualifying working days.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {company.elAccrualEnabled !== false ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={company.elAccrualEnabled !== false}
                  onCheckedChange={(checked) => setCompany({ elAccrualEnabled: checked })}
                />
              </div>
            </div>

            {company.elAccrualEnabled !== false && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Qualifying Working Days Required</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={company.elWorkingDaysThreshold ?? 20}
                        onChange={(e) => setCompany({ elWorkingDaysThreshold: Math.max(1, +e.target.value || 20) })}
                        className="text-xs h-9"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Days</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Earned Leave Days Credited</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        min={0.5}
                        value={company.elDaysEarnedPerCycle ?? 2}
                        onChange={(e) => setCompany({ elDaysEarnedPerCycle: Math.max(0.5, +e.target.value || 2) })}
                        className="text-xs h-9"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Days</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-primary/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="leading-relaxed">
                    <span className="font-semibold">Helper Rule: </span>
                    For every <strong className="font-bold underline">{company.elWorkingDaysThreshold ?? 20}</strong> actual working days completed (excluding Sundays, roster week-offs, holiday Saturdays, and public holidays), <strong className="font-bold underline">{company.elDaysEarnedPerCycle ?? 2}</strong> Earned Leave day(s) will be credited to the employee&apos;s EL balance.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const res = evaluateEarnedLeaveAccrual();
                      if (res.affectedEmployees > 0) {
                        toast.success(`Accrued +${res.creditedCount} EL days across ${res.affectedEmployees} employees!`);
                      } else {
                        toast.info("All employee working day counters are currently evaluated.");
                      }
                    }}
                    className="h-8 text-[11px] shrink-0 font-semibold"
                  >
                    Evaluate & Accrue Now
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sub-section B: Year-End Leave Carry Forward Rule */}
          <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  Sub-section B: Year-End Leave Carry Forward Rule
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Controls year-end rollover caps and automatic lapsing of accumulated EL.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {company.elCarryForwardEnabled !== false ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={company.elCarryForwardEnabled !== false}
                  onCheckedChange={(checked) => setCompany({ elCarryForwardEnabled: checked })}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/60">
              {company.elCarryForwardEnabled !== false ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Maximum Carry Forward Cap (Days)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={company.elMaxCarryForwardDays ?? 20}
                          onChange={(e) => setCompany({ elMaxCarryForwardDays: Math.max(0, +e.target.value || 0) })}
                          className="text-xs h-9"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Days Cap</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-start sm:justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setRolloverConfirmOpen(true)}
                        className="h-9 text-xs rounded-xl font-bold shadow-xs gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Run Year-End Rollover
                      </Button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    At year-end reset, remaining EL balance is carried forward up to this cap (e.g., if cap is {company.elMaxCarryForwardDays ?? 20} and remaining balance is 32, employee starts next year with {company.elMaxCarryForwardDays ?? 20} EL; if remaining balance is 17, all 17 carry forward). Any balance above the cap lapses unless encashed.
                  </p>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                    All unused Earned Leave balances expire at year-end. Employees start the new leave year with 0 EL.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setRolloverConfirmOpen(true)}
                    className="h-8 text-xs rounded-xl font-bold shrink-0"
                  >
                    Run Year-End Reset
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-section C: Leave Encashment Policy */}
          <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-amber-600" />
                  Sub-section C: Leave Encashment Policy
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Allows employees to encash unused EL for direct monetary payout in monthly payroll.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {company.elEncashmentEnabled !== false ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={company.elEncashmentEnabled !== false}
                  onCheckedChange={(checked) => setCompany({ elEncashmentEnabled: checked })}
                />
              </div>
            </div>

            {company.elEncashmentEnabled !== false && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Daily Encashment Rate Basis</Label>
                    <select
                      value={company.elEncashmentCalculationBase || "basic_plus_da"}
                      onChange={(e) => setCompany({ elEncashmentCalculationBase: e.target.value as any })}
                      className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 font-medium shadow-xs"
                    >
                      <option value="basic_plus_da">Basic + DA (Recommended statutory standard)</option>
                      <option value="gross_salary">Gross Salary (Fixed Monthly CTC Gross)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Minimum EL Balance Required to Apply</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={company.elEncashmentMinBalanceRequired ?? 0}
                        onChange={(e) => setCompany({ elEncashmentMinBalanceRequired: Math.max(0, +e.target.value || 0) })}
                        className="text-xs h-9"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Days</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Employees can apply to encash either their entire available EL balance or any custom number of EL days for direct monetary payout in monthly payroll.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Casual Leave (CL) Policy Card */}
      <PeriodicLeavePolicyCard
        leaveType="CL"
        title="Casual Leave (CL) Policy"
        description="Configure periodic allocation frequency (quarterly, half-yearly, annual), rollover carry-forward rules, and new joiner proration."
        policy={company.leavePolicies?.CL || DEFAULT_LEAVE_POLICIES.CL}
        onUpdate={(updated) =>
          setCompany({
            leavePolicies: {
              ...(company.leavePolicies || DEFAULT_LEAVE_POLICIES),
              CL: updated,
            },
          })
        }
        onSave={async () => {
          await saveAllCompanySettings();
          toast.success("Casual Leave (CL) policy saved successfully!");
        }}
        onPreviewRun={(type) => {
          setRenewalModalType(type);
          setRenewalModalOpen(true);
        }}
      />

      {/* Sick Leave (SL) Policy Card */}
      <PeriodicLeavePolicyCard
        leaveType="SL"
        title="Sick Leave (SL) Policy"
        description="Configure periodic allocation frequency (quarterly, half-yearly, annual), rollover carry-forward rules, and new joiner proration."
        policy={company.leavePolicies?.SL || DEFAULT_LEAVE_POLICIES.SL}
        onUpdate={(updated) =>
          setCompany({
            leavePolicies: {
              ...(company.leavePolicies || DEFAULT_LEAVE_POLICIES),
              SL: updated,
            },
          })
        }
        onSave={async () => {
          await saveAllCompanySettings();
          toast.success("Sick Leave (SL) policy saved successfully!");
        }}
        onPreviewRun={(type) => {
          setRenewalModalType(type);
          setRenewalModalOpen(true);
        }}
      />

      {/* Leave Types (Other Entitlements: CL, SL, etc.) */}
      <Card title="Other Leave Entitlements (CL, SL, etc.)">
        <div className="col-span-3 space-y-3">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_130px_100px_36px] gap-3 text-xs text-muted-foreground font-medium px-1">
            <span>Leave Type Name</span>
            <span>Days / Year</span>
            <span className="text-center">Type</span>
            <span />
          </div>
          {company.leaveTypes.filter((l) => !l.name.toLowerCase().includes("earned leave") && l.id !== "el").map((l, i) => (
            <div key={l.id} className="grid grid-cols-[1fr_130px_100px_36px] gap-3 items-center">
              {/* Name */}
              <Input
                value={l.name}
                placeholder="e.g. Casual Leave"
                onChange={(e) => {
                  const copy = [...company.leaveTypes];
                  const realIdx = copy.findIndex((x) => x.id === l.id);
                  if (realIdx >= 0) copy[realIdx] = { ...l, name: e.target.value };
                  setCompany({ leaveTypes: copy });
                }}
              />
              {/* Annual days */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={l.days}
                  min={0}
                  placeholder="12"
                  onChange={(e) => {
                    const copy = [...company.leaveTypes];
                    const realIdx = copy.findIndex((x) => x.id === l.id);
                    if (realIdx >= 0) copy[realIdx] = { ...l, days: +e.target.value || 0 };
                    setCompany({ leaveTypes: copy });
                  }}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
              </div>
              {/* Paid / Unpaid toggle */}
              <button
                type="button"
                onClick={() => {
                  const copy = [...company.leaveTypes];
                  const realIdx = copy.findIndex((x) => x.id === l.id);
                  if (realIdx >= 0) copy[realIdx] = { ...l, paid: l.paid === false ? true : false };
                  setCompany({ leaveTypes: copy });
                }}
                className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  l.paid !== false
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {l.paid !== false ? "Paid" : "Unpaid"}
              </button>
              {/* Remove */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setCompany({ leaveTypes: company.leaveTypes.filter((x) => x.id !== l.id) })}
              >
                ×
              </Button>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Define annual fixed quotas for other leave categories such as Casual Leave (CL) and Sick Leave (SL).
          </p>
          <Button
            variant="outline"
            onClick={() =>
              setCompany({
                leaveTypes: [...company.leaveTypes, { id: crypto.randomUUID(), name: "New Leave", days: 6, paid: true }],
              })
            }
          >
            + Add Leave Type
          </Button>
        </div>
      </Card>

      {/* Permission Policy Types (Separate Standalone Section) */}
      <Card title="Permission Policy Types">
        <div className="col-span-3 space-y-3">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_130px_130px_140px_100px_36px] gap-3 text-xs text-muted-foreground font-medium px-1">
            <span>Permission Type Name</span>
            <span>Allowed Hours</span>
            <span>Reset Frequency</span>
            <span>Max Requests / Mo</span>
            <span className="text-center">Type</span>
            <span />
          </div>
          {(company.permissionTypes ?? [
            { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
          ]).map((p, i) => {
            const currentList = company.permissionTypes ?? [
              { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
            ];
            return (
              <div key={p.id} className="grid grid-cols-[1fr_130px_130px_140px_100px_36px] gap-3 items-center">
                {/* Name */}
                <Input
                  value={p.name}
                  placeholder="e.g. Standard Permission"
                  onChange={(e) => {
                    const copy = [...currentList];
                    copy[i] = { ...p, name: e.target.value };
                    setCompany({ permissionTypes: copy });
                  }}
                />
                {/* Allowed Hours */}
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={p.maxHours}
                    min={0.5}
                    step={0.5}
                    placeholder="2"
                    onChange={(e) => {
                      const copy = [...currentList];
                      copy[i] = { ...p, maxHours: +e.target.value || 0 };
                      setCompany({ permissionTypes: copy });
                    }}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">hrs</span>
                </div>
                {/* Reset Frequency / Period */}
                <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...currentList];
                      copy[i] = { ...p, period: "month" };
                      setCompany({ permissionTypes: copy });
                    }}
                    className={`flex-1 py-1.5 text-center transition-colors ${
                      p.period === "month"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    /Mo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...currentList];
                      copy[i] = { ...p, period: "year" };
                      setCompany({ permissionTypes: copy });
                    }}
                    className={`flex-1 py-1.5 text-center transition-colors ${
                      p.period === "year"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    /Yr
                  </button>
                </div>
                {/* Max Requests Per Month */}
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={p.maxRequestsPerMonth ?? ""}
                    min={1}
                    placeholder="e.g. 2"
                    onChange={(e) => {
                      const copy = [...currentList];
                      const val = e.target.value === "" ? undefined : +e.target.value || 0;
                      copy[i] = { ...p, maxRequestsPerMonth: val };
                      setCompany({ permissionTypes: copy });
                    }}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">times</span>
                </div>
                {/* Paid / Unpaid toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const copy = [...currentList];
                    copy[i] = { ...p, paid: p.paid === false ? true : false };
                    setCompany({ permissionTypes: copy });
                  }}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                    p.paid !== false
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {p.paid !== false ? "Paid" : "Unpaid"}
                </button>
                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() =>
                    setCompany({
                      permissionTypes: currentList.filter((_, j) => j !== i),
                    })
                  }
                >
                  ×
                </Button>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">
            Configure short-duration permission allowances (e.g. 2 hours per month). Employees apply in hours for late entry, early exit, or personal emergency. Quotas reset automatically based on the selected frequency (/Mo or /Yr).
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const currentList = company.permissionTypes ?? [
                { id: "perm-gen", name: "Standard Permission", maxHours: 2, period: "month", maxRequestsPerMonth: 2, paid: true }
              ];
              setCompany({
                permissionTypes: [
                  ...currentList,
                  {
                    id: crypto.randomUUID(),
                    name: "Personal Permission",
                    maxHours: 2,
                    period: "month",
                    maxRequestsPerMonth: 2,
                    paid: true,
                  },
                ],
              });
            }}
          >
            + Add Permission Type
          </Button>
        </div>
      </Card>

      {/* Unauthorized Absence (AWOL) Control */}
      <div className="rounded-2xl border border-rose-500/25 bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Unauthorized Absence (AWOL) Control
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    company.awolControlEnabled
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {company.awolControlEnabled ? "Active" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitor consecutive uninformed absences (Status: &apos;A&apos;), trigger automated AWOL warnings or terminations, and apply daily penalty deductions in payroll.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center bg-muted/40 px-3.5 py-2 rounded-xl border border-border">
            <span className="text-xs font-semibold text-foreground">
              {company.awolControlEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={Boolean(company.awolControlEnabled)}
              onCheckedChange={(checked) => {
                setCompany({
                  awolControlEnabled: checked,
                  awolDaysLimit: company.awolDaysLimit ?? 3,
                  awolPenaltyAmountPerDay: company.awolPenaltyAmountPerDay ?? 500,
                });
                toast.success(
                  checked
                    ? "Unauthorized Absence (AWOL) Control enabled"
                    : "Unauthorized Absence (AWOL) Control disabled"
                );
              }}
            />
          </div>
        </div>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            company.awolControlEnabled
              ? "grid-rows-[1fr] opacity-100 pt-2 border-t border-border/60"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* A. Termination Settings */}
              <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
                        A
                      </span>
                      Termination Settings
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Track consecutive unauthorized absent working days and enforce AWOL thresholds.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(company.awolTerminationEnabled)}
                    onCheckedChange={(checked) =>
                      setCompany({
                        awolTerminationEnabled: checked,
                        awolDaysLimit: company.awolDaysLimit ?? 3,
                      })
                    }
                  />
                </div>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    company.awolTerminationEnabled
                      ? "grid-rows-[1fr] opacity-100 pt-3 border-t border-border/60"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Consecutive AWOL Days Limit
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={company.awolDaysLimit ?? 3}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1);
                            setCompany({ awolDaysLimit: val });
                          }}
                          className="w-28 font-semibold"
                        />
                        <span className="text-xs text-muted-foreground font-medium">
                          Consecutive Working Days (triggers on Day {(company.awolDaysLimit ?? 3) + 1})
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        If set to 3 days, crossing into the 4th consecutive day of unauthorized absence (Status: &apos;A&apos;) triggers termination alerts and AWOL warning badges.
                      </p>
                    </div>

                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          Auto-Terminate Employee
                        </Label>
                        <Switch
                          checked={Boolean(company.awolAutoTerminate)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setConfirmAutoTerminateOpen(true);
                            } else {
                              setCompany({ awolAutoTerminate: false });
                              toast.info("Auto-Terminate Employee disabled");
                            }
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Automatically update employee status to &apos;Terminated (AWOL)&apos; when they reach (Limit + 1) consecutive days of unauthorized absence.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* B. Penalty Deduction Settings */}
              <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                        B
                      </span>
                      Penalty Deduction Settings
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Apply a per-day flat fine on uninformed absences during monthly payroll runs.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(company.awolPenaltyEnabled)}
                    onCheckedChange={(checked) =>
                      setCompany({
                        awolPenaltyEnabled: checked,
                        awolPenaltyAmountPerDay: company.awolPenaltyAmountPerDay ?? 500,
                      })
                    }
                  />
                </div>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    company.awolPenaltyEnabled
                      ? "grid-rows-[1fr] opacity-100 pt-3 border-t border-border/60"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        AWOL Penalty Amount (₹ per day)
                      </Label>
                      <div className="relative max-w-xs">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-muted-foreground">
                          <IndianRupee className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={company.awolPenaltyAmountPerDay ?? 500}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setCompany({ awolPenaltyAmountPerDay: val });
                          }}
                          className="pl-8 font-semibold"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Additional flat penalty deducted from Net Salary per unauthorized absent day (on top of standard Loss of Pay proration).
                      </p>
                    </div>

                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-muted-foreground space-y-1">
                      <div className="font-semibold text-blue-700 dark:text-blue-300">
                        Payroll Impact Preview
                      </div>
                      <div>
                        1 Uninformed Absent Day (&apos;A&apos;) = Standard 1-Day LOP +{" "}
                        <span className="font-bold text-foreground">
                          ₹{(company.awolPenaltyAmountPerDay ?? 500).toLocaleString("en-IN")}/day
                        </span>{" "}
                        AWOL Penalty (excluded for Paid Leave &apos;PL&apos; and Informed Leave &apos;IL&apos;).
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Auto-Terminate Option */}
      <Dialog open={confirmAutoTerminateOpen} onOpenChange={setConfirmAutoTerminateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Enable Auto-Terminate for AWOL?
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground">
              Enabling <strong>Auto-Terminate Employee</strong> will automatically mark any active employee as{" "}
              <span className="font-bold text-rose-600 dark:text-rose-400">Terminated (AWOL)</span> and revoke their portal access once they cross{" "}
              <strong>{(company.awolDaysLimit ?? 3) + 1}+ consecutive working days</strong> of unauthorized absence (Status: &apos;A&apos;).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            Are you sure you want to enable automatic termination on Day {(company.awolDaysLimit ?? 3) + 1} of consecutive AWOL?
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmAutoTerminateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                setCompany({ awolAutoTerminate: true });
                setConfirmAutoTerminateOpen(false);
                toast.warning(
                  `Auto-Terminate enabled: employees reaching ${(company.awolDaysLimit ?? 3) + 1}+ consecutive AWOL days will be automatically terminated.`
                );
              }}
            >
              Yes, Enable Auto-Terminate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Year-End Rollover */}
      <Dialog open={rolloverConfirmOpen} onOpenChange={setRolloverConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <RotateCcw className="h-5 w-5" />
              Execute Year-End Earned Leave Rollover?
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground">
              {company.elCarryForwardEnabled !== false ? (
                <>
                  This will process all active employee EL balances against the configured{" "}
                  <strong>Carry Forward Cap of {company.elMaxCarryForwardDays ?? 20} days</strong>.
                  Balances up to {company.elMaxCarryForwardDays ?? 20} will roll over into the new year opening balance; any excess will lapse into the audit ledger.
                </>
              ) : (
                <>
                  Year-End Carry Forward is currently <strong>Disabled</strong>. Running this rollover will reset all employee Earned Leave balances to <strong>0 days</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground space-y-1">
            <div className="font-semibold">Policy in effect:</div>
            <div className="text-[11px] text-muted-foreground">
              {company.elCarryForwardEnabled !== false
                ? `Max carry forward: ${company.elMaxCarryForwardDays ?? 20} days. Excess balance lapses.`
                : "Zero carry forward. All unused balances expire."}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={rollingOver}
              onClick={() => setRolloverConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              disabled={rollingOver}
              onClick={() => {
                setRollingOver(true);
                try {
                  const res = processYearEndLeaveRollover();
                  toast.success(
                    `Year-end rollover complete! Processed ${res.rolledOverEmployees} employees (${res.totalCarriedDays} days carried forward, ${res.totalLapsedDays} days lapsed).`
                  );
                  setRolloverConfirmOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || "Failed to run year-end rollover.");
                } finally {
                  setRollingOver(false);
                }
              }}
            >
              {rollingOver ? "Processing..." : "Confirm & Execute Rollover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PERIODIC LEAVE CYCLE RENEWAL PREVIEW & RUN MODAL */}
      <LeaveRenewalModal
        open={renewalModalOpen}
        onOpenChange={setRenewalModalOpen}
        defaultType={renewalModalType}
      />

      {/* Late Punch Deductions & Restriction Settings */}
      <div className="rounded-2xl border border-amber-500/25 bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Timer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Late Punch Deductions &amp; Restriction Settings
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    company.latePunchControlEnabled
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {company.latePunchControlEnabled ? "Active" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Track monthly late check-ins by count or cumulative hours, deduct excess late minutes from Short Permission balances, or auto-convert excess late punches to Half-Day (HD).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center bg-muted/40 px-3.5 py-2 rounded-xl border border-border">
            <span className="text-xs font-semibold text-foreground">
              {company.latePunchControlEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={Boolean(company.latePunchControlEnabled)}
              onCheckedChange={(checked) => {
                setCompany({
                  latePunchControlEnabled: checked,
                  lateLimitType: company.lateLimitType || "days",
                  maxLateDaysPerMonth: company.maxLateDaysPerMonth ?? 5,
                  maxLateHoursPerMonth: company.maxLateHoursPerMonth ?? 3,
                });
                toast.success(
                  checked
                    ? "Late Punch Deductions & Restriction Settings enabled"
                    : "Late Punch Deductions & Restriction Settings disabled"
                );
              }}
            />
          </div>
        </div>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            company.latePunchControlEnabled
              ? "grid-rows-[1fr] opacity-100 pt-3 border-t border-border/60"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Step 1: Late Threshold Mode Switch */}
              <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="inline-flex h-5 px-1.5 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase">
                        Step 1
                      </span>
                      Late Threshold Mode
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Choose whether monthly late limits are evaluated by day count or cumulative hours.
                    </p>
                  </div>

                  {/* Segmented Switch: By Days vs By Hours */}
                  <div className="inline-flex items-center rounded-xl border border-border bg-background p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setCompany({ lateLimitType: "days" })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        (company.lateLimitType || "days") === "days"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      By Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompany({ lateLimitType: "hours" })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        company.lateLimitType === "hours"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      By Hours
                    </button>
                  </div>
                </div>

                {(company.lateLimitType || "days") === "days" ? (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <Label className="text-xs font-semibold text-foreground">
                      Max Allowed Late Days per Month
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={company.maxLateDaysPerMonth ?? 5}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setCompany({ maxLateDaysPerMonth: val });
                        }}
                        className="w-28 font-semibold"
                      />
                      <span className="text-xs text-muted-foreground font-medium">
                        Late Days / Month (Breaches on Day {(company.maxLateDaysPerMonth ?? 5) + 1})
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Employees can punch in late up to {company.maxLateDaysPerMonth ?? 5} days per month without penalty. Exceeding {company.maxLateDaysPerMonth ?? 5} days triggers the Next Step Action.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <Label className="text-xs font-semibold text-foreground">
                      Max Cumulative Late Hours per Month
                    </Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        value={company.maxLateHoursPerMonth ?? 3}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setCompany({ maxLateHoursPerMonth: val });
                        }}
                        className="w-28 font-semibold"
                      />
                      <span className="text-xs text-muted-foreground font-medium">
                        Hours ({Math.round((company.maxLateHoursPerMonth ?? 3) * 60)} minutes / month)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Cumulative late minutes across the month are tracked (e.g., 56m + 30m + 90m + 20m = 196m). Once cumulative late time exceeds {company.maxLateHoursPerMonth ?? 3} hours, the Next Step Action triggers.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Next Step Penalty Actions (When Limit is Exceeded) */}
              <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="inline-flex h-5 px-1.5 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase">
                      Step 2
                    </span>
                    Next Step Penalty Actions (When Limit is Exceeded)
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Configure automatic actions once an employee breaches their monthly late threshold.
                  </p>
                </div>

                {/* Option 1 Toggle: Deduct from Short Permission */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      Deduct from Short Permission
                    </Label>
                    <Switch
                      checked={Boolean(company.latePermissionDeductionEnabled)}
                      onCheckedChange={(checked) =>
                        setCompany({ latePermissionDeductionEnabled: checked })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Automatically deduct excess late minutes from the employee&apos;s available monthly Short Permission balance.
                  </p>
                </div>

                {/* Option 2 Toggle: Convert to Half-Day (HD) */}
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-bold text-orange-700 dark:text-orange-300">
                      Convert to Half-Day (HD)
                    </Label>
                    <Switch
                      checked={Boolean(company.lateHalfDayConversionEnabled)}
                      onCheckedChange={(checked) =>
                        setCompany({ lateHalfDayConversionEnabled: checked })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Once the late limit is exceeded (and any available Short Permission balance is exhausted), every subsequent late punch in the month automatically converts that day&apos;s status to Half-Day (0.5 Paid Day).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/**
 * Draggable Reorder Item for Sidebar Items using framer-motion
 */
function SidebarReorderItem({
  id,
  index,
  item,
  isHidden,
  cannotHide,
  onToggleHide,
}: {
  id: string;
  index: number;
  item: NavItemConfig;
  isHidden: boolean;
  cannotHide: boolean;
  onToggleHide: (id: string) => void;
}) {
  const controls = useDragControls();
  const Icon = item.icon;

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors select-none",
        isHidden
          ? "bg-muted/30 border-dashed border-border/70 opacity-60"
          : "bg-card border-border/90 hover:border-primary/40 shadow-2xs"
      )}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.18)",
        zIndex: 50,
      }}
    >
      {/* Left Details */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Drag Handle */}
        <div
          onPointerDown={(e) => controls.start(e)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing touch-none transition-colors shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Position Index Badge */}
        <span className="h-7 w-7 rounded-xl bg-muted/60 text-muted-foreground font-mono font-bold text-xs flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        {/* Icon */}
        <div
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border",
            isHidden
              ? "bg-muted text-muted-foreground border-border"
              : "bg-primary/10 text-primary border-primary/20 shadow-inner"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Label */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "font-medium text-xs sm:text-sm text-foreground truncate",
              isHidden && "line-through text-muted-foreground"
            )}
          >
            {item.label}
          </span>
          {item.badge === "AI" && (
            <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] py-0 px-1.5 font-bold">
              AI
            </Badge>
          )}
          {item.comingSoon && (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 text-[10px] py-0 px-1.5 font-bold">
              Soon
            </Badge>
          )}
        </div>
      </div>

      {/* Right Controls: Visibility Toggle Button */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-lg transition-colors",
            isHidden
              ? "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          disabled={cannotHide}
          onClick={() => onToggleHide(id)}
          title={
            cannotHide
              ? "Required item cannot be hidden"
              : isHidden
              ? "Show in side panel"
              : "Hide from side panel"
          }
        >
          {isHidden ? <EyeOff className="h-4 w-4 text-rose-500" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </Reorder.Item>
  );
}

/**
 * Static row rendered during search filtering (drag is disabled while filtered)
 */
function SidebarFilteredItem({
  id,
  index,
  item,
  isHidden,
  cannotHide,
  onToggleHide,
}: {
  id: string;
  index: number;
  item: NavItemConfig;
  isHidden: boolean;
  cannotHide: boolean;
  onToggleHide: (id: string) => void;
}) {
  const Icon = item.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors",
        isHidden
          ? "bg-muted/30 border-dashed border-border/70 opacity-60"
          : "bg-card border-border/90 shadow-2xs"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-7 w-7 rounded-xl bg-muted/60 text-muted-foreground font-mono font-bold text-xs flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <div
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border",
            isHidden
              ? "bg-muted text-muted-foreground border-border"
              : "bg-primary/10 text-primary border-primary/20 shadow-inner"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "font-medium text-xs sm:text-sm text-foreground truncate",
              isHidden && "line-through text-muted-foreground"
            )}
          >
            {item.label}
          </span>
          {item.badge === "AI" && (
            <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] py-0 px-1.5 font-bold">
              AI
            </Badge>
          )}
          {item.comingSoon && (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 text-[10px] py-0 px-1.5 font-bold">
              Soon
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-lg transition-colors",
            isHidden
              ? "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          disabled={cannotHide}
          onClick={() => onToggleHide(id)}
          title={
            cannotHide
              ? "Required item cannot be hidden"
              : isHidden
              ? "Show in side panel"
              : "Hide from side panel"
          }
        >
          {isHidden ? <EyeOff className="h-4 w-4 text-rose-500" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

/**
 * Edit Side panel Component
 * Allows live drag-and-drop reordering, and visibility toggling of left sidebar items
 * Collapsible by default for a minimal UI, opens downward with smooth animated transition.
 * Persisted per company / tenant in backend config.
 */
function SidebarOrderEditor() {
  const { company, setCompany } = useStore();
  const { activeTenantId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const [order, setOrder] = useState<string[]>(() => {
    return company.sidebarOrder && company.sidebarOrder.length > 0
      ? company.sidebarOrder
      : getSavedSidebarOrder(activeTenantId);
  });
  const [hidden, setHidden] = useState<string[]>(() => {
    return company.sidebarHiddenItems ?? getSavedHiddenSidebarItems(activeTenantId);
  });
  const [search, setSearch] = useState("");

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const itemMap = useMemo(() => new Map(DEFAULT_SIDEBAR_ITEMS.map((i) => [i.id, i])), []);

  // Sync when company state updates (e.g. from backend or tenant switch)
  useEffect(() => {
    if (company.sidebarOrder && company.sidebarOrder.length > 0) {
      setOrder(company.sidebarOrder);
    } else {
      setOrder(getSavedSidebarOrder(activeTenantId));
    }
    if (company.sidebarHiddenItems) {
      setHidden(company.sidebarHiddenItems);
    } else {
      setHidden(getSavedHiddenSidebarItems(activeTenantId));
    }
  }, [company.sidebarOrder, company.sidebarHiddenItems, activeTenantId]);

  const handleReorder = (newOrder: string[]) => {
    setOrder(newOrder);
    setCompany({
      sidebarOrder: newOrder,
    });
    saveSidebarOrder(newOrder, activeTenantId);
  };

  const updateState = (newOrder: string[], newHidden: string[]) => {
    setOrder(newOrder);
    setHidden(newHidden);
    setCompany({
      sidebarOrder: newOrder,
      sidebarHiddenItems: newHidden,
    });
    saveSidebarOrder(newOrder, activeTenantId);
    saveHiddenSidebarItems(newHidden, activeTenantId);
  };

  const handleToggleHide = (id: string) => {
    if (id === "dashboard" || id === "settings") {
      toast.error("Dashboard and Settings cannot be hidden from the side panel");
      return;
    }
    const nextHidden = hiddenSet.has(id)
      ? hidden.filter((h) => h !== id)
      : [...hidden, id];
    updateState(order, nextHidden);
    const item = itemMap.get(id);
    if (hiddenSet.has(id)) {
      toast.success(`"${item?.label || id}" is now visible in the side panel`);
    } else {
      toast.info(`"${item?.label || id}" is now hidden from the side panel`);
    }
  };

  const handleReset = () => {
    const defaultIds = DEFAULT_SIDEBAR_ITEMS.map((i) => i.id);
    updateState(defaultIds, []);
    toast.success("Side panel order & visibility reset to defaults!");
  };

  const q = search.toLowerCase().trim();
  const displayedOrder = useMemo(() => {
    if (!q) return order;
    return order.filter((id) => {
      const item = itemMap.get(id);
      if (!item) return false;
      return (
        item.label.toLowerCase().includes(q) ||
        (item.badge && String(item.badge).toLowerCase().includes(q))
      );
    });
  }, [order, q, itemMap]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs transition-all duration-200">
      {/* Clickable Header that toggles expand/collapse downward */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="flex items-center justify-between gap-4 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 shrink-0">
            <PanelLeft className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-semibold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                Edit Side panel
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Drag & Drop
              </span>
              {hidden.length > 0 && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {hidden.length} hidden
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate sm:text-clip">
              {isOpen
                ? "Drag and drop items to reorder; changes sync immediately for your company."
                : "Customize order and visibility of items in your left side panel."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground hidden sm:inline transition-colors">
            {isOpen ? "Collapse" : "Edit order"}
          </span>
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-all duration-200",
              isOpen && "rotate-180"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Downward Smooth Opening Panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="side-panel-editor-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-5 border-t border-border mt-5 space-y-5">
              {/* Filter / Search & Quick Stats & Reset Default */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {order.length - hidden.length} of {order.length} items visible
                  </span>
                  {hidden.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {hidden.length} hidden
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search menu items..."
                      className="h-8 pl-8 text-xs rounded-xl bg-background border-border/80"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="gap-1.5 rounded-xl font-medium text-xs h-8 border-border text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                    title="Reset to original side panel order"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </Button>
                </div>
              </div>

              {/* Drag & Drop Reorderable List */}
              {q ? (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-dashed border-border/80">
                    Filtered by "{search}". Clear search input to drag and reorder menu items.
                  </div>
                  {displayedOrder.map((id: string) => {
                    const actualIndex = order.indexOf(id);
                    const item = itemMap.get(id);
                    if (!item) return null;
                    return (
                      <SidebarFilteredItem
                        key={id}
                        id={id}
                        index={actualIndex}
                        item={item}
                        isHidden={hiddenSet.has(id)}
                        cannotHide={id === "dashboard" || id === "settings"}
                        onToggleHide={handleToggleHide}
                      />
                    );
                  })}
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={order}
                  onReorder={handleReorder}
                  className="space-y-2 max-h-[520px] overflow-y-auto pr-1"
                >
                  {order.map((id: string, index: number) => {
                    const item = itemMap.get(id);
                    if (!item) return null;
                    return (
                      <SidebarReorderItem
                        key={id}
                        id={id}
                        index={index}
                        item={item}
                        isHidden={hiddenSet.has(id)}
                        cannotHide={id === "dashboard" || id === "settings"}
                        onToggleHide={handleToggleHide}
                      />
                    );
                  })}
                </Reorder.Group>
              )}

              {/* Footer Info Callout */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-xs text-muted-foreground flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    Changes to the side panel order auto-save per company and update your live sidebar immediately. Click <strong>Save Changes</strong> at the top to commit all settings to cloud storage.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
      <h2 className="font-display text-lg font-semibold mb-4 text-foreground">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function AssetUpload({ label, src, onFile }: { label: string; src?: string; onFile: (f: File | null) => void }) {
  return (
    <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="h-20 rounded-lg border border-dashed border-border bg-background flex items-center justify-center overflow-hidden">
        {src ? (
          <img src={src} alt={label} className="h-full w-full object-contain p-1" />
        ) : (
          <span className="text-[11px] text-muted-foreground">No file uploaded</span>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
        className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary file:font-semibold hover:file:bg-primary/20"
      />
    </div>
  );
}
