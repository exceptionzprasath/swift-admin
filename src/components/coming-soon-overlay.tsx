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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLocked(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(14px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-0 z-30 rounded-3xl flex items-center justify-center p-6 bg-background/60 dark:bg-background/70 select-none"
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
