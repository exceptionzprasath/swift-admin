import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";

interface ComingSoonOverlayProps {
  title?: string;
  delayMs?: number;
  description?: string;
}

export function ComingSoonOverlay({
  title = "Coming soon",
  delayMs = 700,
  description,
}: ComingSoonOverlayProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [bounds, setBounds] = useState<{ top: number; left: number } | null>(() => {
    if (typeof window !== "undefined") {
      const mainEl = document.querySelector("main");
      if (mainEl) {
        const rect = mainEl.getBoundingClientRect();
        return {
          top: Math.max(0, rect.top),
          left: Math.max(0, rect.left),
        };
      }
    }
    return null;
  });

  // Trigger lock timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLocked(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  // Keep bounds in sync with <main> element geometry
  useEffect(() => {
    const updateBounds = () => {
      const mainEl = document.querySelector("main");
      if (mainEl) {
        const rect = mainEl.getBoundingClientRect();
        setBounds({
          top: Math.max(0, rect.top),
          left: Math.max(0, rect.left),
        });
      }
    };

    updateBounds();

    window.addEventListener("resize", updateBounds);
    window.addEventListener("scroll", updateBounds, { passive: true });

    const mainEl = document.querySelector("main");
    let observer: ResizeObserver | null = null;
    if (mainEl && typeof window.ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateBounds);
      observer.observe(mainEl);
    }

    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("scroll", updateBounds);
      observer?.disconnect();
    };
  }, []);

  // When locked, freeze scrolling on body and main so the page cannot scroll
  useEffect(() => {
    if (!isLocked) return;

    // Reset scroll to top
    window.scrollTo({ top: 0, behavior: "instant" });
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevMainOverflow = mainEl ? mainEl.style.overflow : "";

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (mainEl) {
      mainEl.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      if (mainEl) {
        mainEl.style.overflow = prevMainOverflow;
      }
    };
  }, [isLocked]);

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(14px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={
            bounds
              ? {
                  position: "fixed",
                  top: `${bounds.top}px`,
                  left: `${bounds.left}px`,
                  right: 0,
                  bottom: 0,
                }
              : undefined
          }
          className="fixed top-16 sm:top-20 right-0 bottom-0 left-0 md:left-64 lg:left-72 z-30 flex items-center justify-center p-6 bg-background/60 dark:bg-background/70 select-none overflow-hidden"
          onWheel={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="flex flex-col items-center text-center max-w-sm w-full p-8 rounded-3xl bg-card/95 dark:bg-card/90 border border-border/80 shadow-2xl backdrop-blur-2xl space-y-4"
          >
            <div className="p-4 rounded-3xl bg-primary/10 text-primary border border-primary/20 shadow-inner flex items-center justify-center">
              <Lock className="h-8 w-8 sm:h-9 sm:w-9 text-primary" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description || "This feature is currently in active development and will be available in an upcoming release."}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
