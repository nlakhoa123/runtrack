"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ emoji = "✨", title, text, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center", className)}
    >
      <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-[color:var(--brand-coral)]/10 text-4xl">
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {emoji}
        </motion.span>
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
