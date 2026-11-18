import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/55 dark:bg-background/65 select-none"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="flex flex-col items-center text-center max-w-sm w-full p-8 rounded-3xl bg-card/90 dark:bg-card/85 border border-border/80 shadow-2xl backdrop-blur-2xl space-y-4"
          >
            <div className="relative p-4 rounded-3xl bg-primary/10 text-primary border border-primary/20 shadow-inner flex items-center justify-center">
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

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsLocked(false);
                  setTimeout(() => setIsLocked(true), 4000);
                }}
                className="text-xs h-8 px-4 rounded-xl font-semibold border-border hover:bg-muted"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Sneak Peek (4s)
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
