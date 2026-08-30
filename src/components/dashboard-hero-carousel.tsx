import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useStore, type DashboardBannerItem } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  ArrowRight,
  Users,
  Lightbulb,
  TrendingUp,
  Heart,
  Sparkles,
} from "lucide-react";

export function DashboardHeroCarousel() {
  const { company } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const bannerConfig = company.dashboardBanners;
  const isEnabled = bannerConfig?.enabled ?? true;
  const autoScrollSeconds = bannerConfig?.autoScrollSeconds || 5;
  const hasBorderRadius = bannerConfig?.hasBorderRadius ?? true;
  const globalShowText = bannerConfig?.showTextOverlay ?? true;

  const slides = useMemo<DashboardBannerItem[]>(() => {
    const customBanners = (bannerConfig?.banners || []).filter((b) => b.active !== false);
    if (customBanners.length > 0) return customBanners;

    return [
      {
        id: "default-slide-1",
        imageUrl: "",
        title: "A PEOPLE-FIRST WORKPLACE",
        subtitle: "Where People Grow, Businesses Thrive.",
        tagline: "Smarter HR | Stronger Teams | A Brighter Tomorrow",
        ctaText: "Explore Our Journey",
        ctaLink: "/admin/org",
        active: true,
      },
      {
        id: "default-slide-2",
        imageUrl: "",
        title: "EMPOWERING MODERN WORKSPACES",
        subtitle: "Automated Attendance, Intelligent Leaves & Instant Approvals.",
        tagline: "Speed | Accuracy | Transparency",
        ctaText: "Centralized Approval Settings",
        ctaLink: "/admin/approval-settings",
        active: true,
      },
      {
        id: "default-slide-3",
        imageUrl: "",
        title: "INTELLIGENT WORKFORCE OPERATIONS",
        subtitle: "Streamlined Payroll, Realtime Shifts & Zero Compliance Gaps.",
        tagline: "Engage | Enable | Excel | Together",
        ctaText: "View Shift Roster",
        ctaLink: "/admin/shift-roster",
        active: true,
      },
    ];
  }, [bannerConfig]);

  // Auto-scroll loop
  useEffect(() => {
    if (!isEnabled || isPaused || slides.length <= 1) return;
    const intervalMs = Math.max(2, autoScrollSeconds) * 1000;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isEnabled, isPaused, autoScrollSeconds, slides.length]);

  if (!isEnabled || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];
  const showText = globalShowText && !currentSlide.hideTextOverlay;
  const zoomScale = ((currentSlide.zoomLevel ?? bannerConfig?.zoomLevel ?? 100) / 100);
  const imageFit = currentSlide.imageFit || bannerConfig?.imageFit || "cover";

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const showActionButton = (bannerConfig?.showActionButton ?? true) && !currentSlide.hideActionButton;

  return (
    <div
      className="space-y-2 select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Panoramic Hero Card */}
      <div
        className={`relative w-full overflow-hidden border border-border/80 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-950 text-white shadow-md transition-all ${
          hasBorderRadius ? "rounded-2xl" : "rounded-none"
        } min-h-[220px] sm:min-h-[250px] md:min-h-[270px]`}
      >
        {/* If custom image uploaded, show image background with scaling */}
        {currentSlide.imageUrl ? (
          <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title || "Company Banner"}
              style={{
                transform: `scale(${zoomScale})`,
                objectFit: imageFit as any,
                transformOrigin: "center center",
                transition: "transform 0.4s ease-out",
              }}
              className="w-full h-full object-center block"
            />
            {/* Show dark gradient scrim only when text overlay is enabled */}
            {showText && (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
            )}
          </div>
        ) : (
          /* Default Rich Architectural / Modern Corporate Background */
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-700/25 via-emerald-950/20 to-slate-950" />
            <div className="absolute top-0 right-0 w-3/5 h-full opacity-20 bg-[radial-gradient(circle_at_center,_#5EEAD4_0,_transparent_70%)] blur-2xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25" />
          </div>
        )}

        {/* Slide Content */}
        <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col justify-between h-full min-h-[220px] sm:min-h-[250px] md:min-h-[270px]">
          {showText ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id || currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center justify-between"
              >
                {/* Left Column: Heading & Taglines */}
                <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-[11px] sm:text-xs font-semibold tracking-wider uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    {currentSlide.title || "A PEOPLE-FIRST WORKPLACE"}
                  </div>

                  <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                    {currentSlide.subtitle || "Where People Grow, Businesses Thrive."}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide">
                    {currentSlide.tagline || "Smarter HR | Stronger Teams | A Brighter Tomorrow"}
                  </p>
                </div>

                {/* Right Column: Values & Brand Pill Elements */}
                <div className="hidden lg:flex lg:col-span-5 flex-col items-end justify-center space-y-3 text-right">
                  <div className="flex flex-col gap-1.5 text-xs text-slate-300 font-medium">
                    <div className="flex items-center gap-2 justify-end">
                      <span>Engage</span>
                      <Users className="h-3.5 w-3.5 text-teal-400" />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span>Enable</span>
                      <Lightbulb className="h-3.5 w-3.5 text-teal-400" />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span>Excel</span>
                      <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span>Together</span>
                      <Heart className="h-3.5 w-3.5 text-teal-400" />
                    </div>
                  </div>

                  <div className="font-serif italic text-teal-200 text-sm tracking-wide pt-1">
                    Humanizing Work ✨
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex-1" />
          )}

          {/* Bottom Pagination Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {slides.map((s, idx) => (
              <button
                key={s.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? "w-8 bg-teal-400 shadow-xs"
                    : "w-2 bg-white/40 hover:bg-white/70"
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Carousel Navigation Chevrons */}
        {slides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-20"
              title="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-20"
              title="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Full-Width CTA Strip synced with active theme color palette */}
      {showActionButton && currentSlide.ctaText && (
        <Link
          to={currentSlide.ctaLink || "/admin/org"}
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-primary via-primary/95 to-primary text-primary-foreground font-semibold text-xs sm:text-sm tracking-wide shadow-xs hover:opacity-90 transition-all cursor-pointer ${
            hasBorderRadius ? "rounded-xl" : "rounded-none"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>{currentSlide.ctaText}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

