"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useRtStore } from "@/store/rt-store";
import { defForType, TIER_STYLE } from "@/lib/rt/achievements";
import { Button } from "@/components/ui/button";

const WEEKLY_GOAL = {
  emoji: "🏆",
  title: "Đạt mục tiêu tuần!",
  description: "Bạn đã hoàn thành mục tiêu km của tuần này. Quá đỉnh!",
  accent: "var(--brand-amber)",
  glow: "oklch(0.82 0.15 85 / 0.5)",
};

const WEIGHT_GOAL = {
  emoji: "⚖️",
  title: "Đạt cân nặng mục tiêu!",
  description: "Bạn đã chạm đến con số mình hướng tới. Tuyệt vời!",
  accent: "var(--brand-teal)",
  glow: "oklch(0.64 0.13 190 / 0.5)",
};

export function CelebrationModal() {
  const { celebrationQueue, shiftCelebration } = useRtStore();
  const current = celebrationQueue[0];
  const isWeeklyGoal = current === "__weekly_goal__";
  const isWeightGoal = current === "__weight_goal__";
  const isSpecial = isWeeklyGoal || isWeightGoal;
  const def = !isSpecial && current ? defForType(current) : undefined;
  const show = isSpecial || !!def;

  useEffect(() => {
    if (!show) return;
    // confetti burst — extra for goal celebrations
    const colors = isWeeklyGoal
      ? ["#ffd27a", "#ff7a59", "#7fe3c4", "#2bb6c4", "#ffffff"]
      : isWeightGoal
        ? ["#7fe3c4", "#2bb6c4", "#2f8fd6", "#ffffff", "#a8f0e0"]
        : ["#7fe3c4", "#2bb6c4", "#2f8fd6", "#ffd27a", "#ff7a59"];
    const count = isSpecial ? 130 : 90;
    const burst = () => {
      confetti({ particleCount: count, spread: 80, origin: { y: 0.55 }, colors, scalar: 1.05 });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 65, origin: { x: 0, y: 0.6 }, colors }), 150);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 65, origin: { x: 1, y: 0.6 }, colors }), 150);
    };
    burst();
    const t = setTimeout(burst, 600);
    return () => clearTimeout(t);
  }, [current, show, isWeeklyGoal, isWeightGoal]);

  // Resolve display values
  const special = isWeeklyGoal ? WEEKLY_GOAL : isWeightGoal ? WEIGHT_GOAL : null;
  const accent = special ? special.accent : def ? TIER_STYLE[def.tier].ring : "#000";
  const glow = special ? special.glow : def ? TIER_STYLE[def.tier].glow : "transparent";
  const emoji = special ? special.emoji : def?.emoji ?? "🎉";
  const title = special ? special.title : def?.title ?? "";
  const description = special ? special.description : def?.description ?? "";
  const badge = special ? (isWeeklyGoal ? "Mục tiêu tuần" : "Mục tiêu cân nặng") : def ? `${TIER_STYLE[def.tier].label} · Mở khoá` : "";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
          onClick={shiftCelebration}
        >
          <motion.div
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-border bg-card p-7 text-center shadow-lift"
            style={{ boxShadow: `0 0 0 1px ${accent}40, 0 24px 80px -16px ${glow}` }}
          >
            <div className="pointer-events-none absolute inset-0 -z-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 0%, ${accent}40, transparent 60%)` }} />
            <div className="relative">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                className="mx-auto mb-3 grid h-24 w-24 place-items-center rounded-full"
                style={{ background: `radial-gradient(circle, ${accent}30, transparent 70%)` }}
              >
                <motion.span
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl drop-shadow-lg"
                  style={{ filter: `drop-shadow(0 0 16px ${accent})` }}
                >
                  {emoji}
                </motion.span>
              </motion.div>

              {badge && (
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
                  style={{ background: accent }}
                >
                  {badge}
                </motion.span>
              )}

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                className="mt-3 text-2xl font-extrabold tracking-tight"
              >
                {title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-2 text-sm text-muted-foreground"
              >
                {description}
              </motion.p>

              <Button
                className="mt-6 w-full gap-2 grad-primary border-transparent text-white hover:opacity-90"
                onClick={shiftCelebration}
              >
                Tuyệt vời! 🎉
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
