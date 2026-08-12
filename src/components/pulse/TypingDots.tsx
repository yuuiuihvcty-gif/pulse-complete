import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-end gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current animate-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export function LiveActivity({ label }: { label: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand"
    >
      {label}
      <TypingDots />
    </motion.span>
  );
}
