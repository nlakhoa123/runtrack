"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";

interface StatCardProps {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "energy" | "rose" | "violet" | "muted";
  delta?: { value: number; suffix?: string; positiveIsGood?: boolean };
  className?: string;
  countUp?: boolean;
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, { grad: string; chip: string }> = {
  primary: { grad: "grad-primary", chip: "bg-primary/10 text-primary" },
  energy: { grad: "grad-energy", chip: "bg-[color:var(--brand-coral)]/12 text-[color:var(--brand-coral)]" },
  rose: { grad: "grad-rose", chip: "bg-[color:var(--brand-rose)]/12 text-[color:var(--brand-rose)]" },
  violet: { grad: "grad-violet", chip: "bg-[color:var(--brand-violet)]/12 text-[color:var(--brand-violet)]" },
  muted: { grad: "grad-primary", chip: "bg-muted text-muted-foreground" },
};

export function StatCard({
  label,
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  icon,
  accent = "primary",
  delta,
  className,
  countUp = true,
}: StatCardProps) {
  const a = ACCENT[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-soft",
        className
      )}
    >
      <div className={cn("pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-[0.13] blur-xl", a.grad)} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon && <span className={cn("grid h-7 w-7 place-items-center rounded-lg", a.chip)}>{icon}</span>}
      </div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-3xl font-extrabold tracking-tight">
          {countUp ? <CountUp value={value} decimals={decimals} suffix={suffix} prefix={prefix} /> : <span className="tnum">{prefix}{value.toLocaleString("vi-VN",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}{suffix}</span>}
        </span>
      </div>
      {delta && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium">
          {(() => {
            const positive = delta.value >= 0;
            const good = delta.positiveIsGood === undefined ? true : positive === delta.positiveIsGood;
            const color = good ? "text-emerald-500" : "text-[color:var(--brand-rose)]";
            const arrow = positive ? "▲" : "▼";
            return (
              <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5", good ? "bg-emerald-500/10" : "bg-[color:var(--brand-rose)]/10", color)}>
                {arrow} {Math.abs(delta.value).toLocaleString("vi-VN",{maximumFractionDigits:1})}{delta.suffix}
              </span>
            );
          })()}
        </div>
      )}
    </motion.div>
  );
}
