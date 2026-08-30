import { motion } from "framer-motion";
import { Sparkles, Clock, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComingSoonProps {
  title: string;
  category?: string;
  icon: LucideIcon;
  description?: string;
  estimatedRelease?: string;
  highlights?: Array<{ title: string; description: string }>;
  children?: React.ReactNode;
}

export function ComingSoonPage({
  title,
  category = "Module",
  icon: Icon,
  description = "This feature is currently under active development and will be available in an upcoming update.",
  estimatedRelease = "Coming Soon",
}: ComingSoonProps) {
  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Ambient background blur elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Minimalist Frosted Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 max-w-lg w-full rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl p-8 sm:p-12 text-center shadow-2xl space-y-6"
      >
        {/* Glowing Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center text-primary shadow-inner">
          <Icon className="h-10 w-10" />
        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-2">
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 inline" /> {estimatedRelease}
          </Badge>
          <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-border">
            <Clock className="h-3 w-3 mr-1.5 inline" /> {category}
          </Badge>
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Progress status pill */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/40 border border-border/60 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Module under active engineering & verification
          </div>
        </div>
      </motion.div>
    </div>
  );
}
