import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, uploadToS3, type DashboardBannerItem } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { PALETTES, getPalette, type ThemePaletteId } from "@/lib/palettes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  } = useStore();
  const { theme, setTheme, setThemePalette } = useStore();
  const [saving, setSaving] = useState(false);
  const [paletteDropdownOpen, setPaletteDropdownOpen] = useState(false);
  const [isKioskConfigOpen, setIsKioskConfigOpen] = useState(false);
  const [savingKioskConfig, setSavingKioskConfig] = useState(false);
  const [showKioskPass, setShowKioskPass] = useState(false);

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

  const str = (k: keyof typeof company) => (
    <Input value={company[k] as string} onChange={(e) => setCompany({ [k]: e.target.value } as any)} />
  );

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage company profile, document branding assets, color theme, and navigation panel layout.
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

      {/* Company Profile */}
      <Card title="Company Profile">
        <Field label="Display Name">{str("name")}</Field>
        <Field label="Legal Name">{str("legalName")}</Field>
        <Field label="Address">{str("address")}</Field>
        <Field label="GSTIN">{str("gstin")}</Field>
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

      {/* Operational & Module-Specific Policy Settings Directory */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <span>Operational &amp; Module Policy Settings</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational rules, leave policies, shift configurations, and payroll statutory settings have been streamlined into their respective modules for direct, contextual configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shift Roster & Workday Policies */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>Shift Roster &amp; Workday Policies</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure company shift profiles, working hours per day, monthly target days, weekend working rules, and late punch deduction thresholds.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground font-mono">Attendance &gt; Shift Roster</span>
              <Link to="/admin/shift-roster" search={{ tab: "settings" } as any}>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10">
                  <span>Manage Shift Policies</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Leave Management & Policy Engine */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>Leave &amp; Permission Policy Engine</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure working-day Earned Leave (EL) accruals, Casual Leave (CL) &amp; Sick Leave (SL) periodic renewals, carry forward caps, encashments, and AWOL controls.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground font-mono">Attendance &gt; Leave Management</span>
              <Link to="/admin/leave-calendar" search={{ tab: "leave-policy" } as any}>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                  <span>Manage Leave Policies</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Payroll & Statutory Master */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                <Calculator className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>Payroll &amp; Statutory Master</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Manage salary structures, allowances (DA, HRA, OA, CA, LTA), EPF, ESIC, Professional Tax, TDS tax regimes, and monthly pay runs.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground font-mono">Payroll Screen</span>
              <Link to="/admin/payroll">
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10">
                  <span>Open Payroll Master</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Common Attendance Kiosk */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <ScanFace className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>Common Attendance Kiosk Portal</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure shared terminal credentials, gate location title, live facial recognition match, and launch the full-screen kiosk dashboard.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground font-mono">Attendance &gt; Kiosk Portal</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsKioskConfigOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border hover:bg-muted"
                >
                  <ScanFace className="h-3.5 w-3.5 text-primary" />
                  <span>Configure Kiosk</span>
                </Button>
                <Link to="/admin/common-attendance" search={{ from: "admin" } as any}>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10">
                    <span>Launch Terminal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Kiosk Settings Dialog (Admin Protected) */}
      <Dialog open={isKioskConfigOpen} onOpenChange={setIsKioskConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-primary" />
              <span>Attendance Kiosk Settings</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure credentials, gate title, and authentication rules for this company's common attendance terminal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Kiosk Enable Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-xs">Kiosk Portal Status</span>
                <p className="text-[11px] text-muted-foreground">
                  Allow shared terminal authentication on login page
                </p>
              </div>
              <Switch
                checked={Boolean(company.commonPortal?.enabled || company.commonPortalEnabled)}
                onCheckedChange={(checked) => {
                  setCompany({
                    commonPortalEnabled: checked,
                    commonPortal: {
                      ...(company.commonPortal || {}),
                      enabled: checked,
                      username: company.commonPortal?.username || company.commonPortalUsername || "kiosk@creatonshr.com",
                      password: company.commonPortal?.password || company.commonPortalPassword || "kiosk123",
                      portalTitle: company.commonPortal?.portalTitle || "Common Attendance Kiosk",
                      requireFaceMatch: company.commonPortal?.requireFaceMatch ?? true,
                    },
                    commonPortalUsername: company.commonPortal?.username || company.commonPortalUsername || "kiosk@creatonshr.com",
                    commonPortalPassword: company.commonPortal?.password || company.commonPortalPassword || "kiosk123",
                  });
                }}
              />
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Kiosk Username / Terminal ID</Label>
                <Input
                  placeholder="e.g. inkpen.in, kiosk@creatonshr.com"
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
                  className="text-xs font-medium"
                />
                <p className="text-[10px] text-muted-foreground">Used on login page to launch kiosk.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Kiosk Password</Label>
                <div className="relative">
                  <Input
                    type={showKioskPass ? "text" : "password"}
                    placeholder="Terminal password"
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
                    className="text-xs font-medium pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKioskPass(!showKioskPass)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showKioskPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Authenticate shared terminal.</p>
              </div>
            </div>

            {/* Terminal Banner / Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Terminal Title / Gate Location</Label>
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
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Displayed at top header of the kiosk screen.</p>
            </div>

            {/* Face Match Requirement */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-xs">Biometric Face Matching</span>
                <p className="text-[10px] text-muted-foreground">
                  Verify captured live face with enrolled employee profile before marking punch
                </p>
              </div>
              <Switch
                checked={company.commonPortal?.requireFaceMatch ?? true}
                onCheckedChange={(checked) => {
                  setCompany({
                    commonPortal: {
                      ...(company.commonPortal || { enabled: true }),
                      requireFaceMatch: checked,
                    },
                  });
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsKioskConfigOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setSavingKioskConfig(true);
                try {
                  await saveAllCompanySettings?.();
                  toast.success("Attendance Kiosk settings saved to cloud database!");
                  setIsKioskConfigOpen(false);
                } catch (e: any) {
                  toast.error("Failed to save kiosk settings: " + (e?.message || e));
                } finally {
                  setSavingKioskConfig(false);
                }
              }}
              disabled={savingKioskConfig}
              className="gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              {savingKioskConfig ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>{savingKioskConfig ? "Saving..." : "Save Kiosk Settings"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
