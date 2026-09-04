"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { Lock, Sparkles, Trophy } from "lucide-react";

import { db } from "@/lib/rt/db";
import type {
  AchievementRecord,
  Profile,
  RunSession,
  UnitSystem,
  WeightEntry,
} from "@/lib/rt/types";
import {
  ACHIEVEMENTS,
  bestStreakEver,
  TIER_STYLE,
  type AchievementCtx,
  type AchievementDef,
} from "@/lib/rt/achievements";
import { computeStats } from "@/lib/rt/insights";
import { fmtDateTime } from "@/lib/rt/dates";
import { useRtStore } from "@/store/rt-store";
import {
  displayDistance,
  displayWeight,
  distanceLabel,
  fmtNum,
  weightLabel,
} from "@/lib/rt/utils";

import { CountUp } from "@/components/rt/shared/count-up";
import { EmptyState } from "@/components/rt/shared/empty-state";
import { ProgressRing } from "@/components/rt/shared/progress-ring";
import { SectionCard } from "@/components/rt/shared/section-card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const TIER_ORDER: AchievementDef["tier"][] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
];

export default function AchievementsView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);

  const profile = useLiveQuery<Profile | undefined>(
    async () =>
      activeProfileId ? await db.profiles.get(activeProfileId) : undefined,
    [activeProfileId]
  );
  const runs = useLiveQuery<RunSession[]>(
    async () =>
      activeProfileId
        ? await db.runs.where("profileId").equals(activeProfileId).toArray()
        : [],
    [activeProfileId]
  );
  const weights = useLiveQuery<WeightEntry[]>(
    async () =>
      activeProfileId
        ? await db.weights.where("profileId").equals(activeProfileId).toArray()
        : [],
    [activeProfileId]
  );
  const unlocked = useLiveQuery<AchievementRecord[]>(
    async () =>
      activeProfileId
        ? await db.achievements
            .where("profileId")
            .equals(activeProfileId)
            .toArray()
        : [],
    [activeProfileId]
  );

  // Build the achievement context (for progress hints) before the loading
  // guard so all hooks run unconditionally — Rules of Hooks.
  const ctx = useMemo<AchievementCtx | null>(() => {
    if (!profile || !runs || !weights) return null;
    const stats0 = computeStats(profile, runs, weights);
    const runDates = runs.map((r) => r.date);
    const longestRunKm = runs.reduce((m, r) => Math.max(m, r.distanceKm), 0);
    return {
      profile,
      runs,
      weights,
      stats: {
        totalKm: stats0.totalKm,
        totalRuns: stats0.totalRuns,
        longestRunKm,
        streak: stats0.streak,
        bestStreak: bestStreakEver(runDates),
        weekKm: stats0.weekKm,
        weightLost: stats0.weightLost,
      },
    };
  }, [profile, runs, weights]);

  // Loading guard — Dexie queries still resolving.
  if (
    !activeProfileId ||
    !profile ||
    runs === undefined ||
    weights === undefined ||
    unlocked === undefined ||
    !ctx
  ) {
    return <AchievementsSkeleton />;
  }

  const unlockedMap = new Map(unlocked.map((a) => [a.type, a]));
  const unlockedCount = unlocked.length;
  const totalCount = ACHIEVEMENTS.length;
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const tierCounts = TIER_ORDER.map((tier) => {
    const defs = ACHIEVEMENTS.filter((d) => d.tier === tier);
    const got = defs.filter((d) => unlockedMap.has(d.type)).length;
    return { tier, got, total: defs.length };
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <AchievementsHeader
        unlockedCount={unlockedCount}
        totalCount={totalCount}
        pct={pct}
        tierCounts={tierCounts}
      />

      {unlockedCount === 0 && (
        <EmptyState
          emoji="🏆"
          title="Chưa có huy hiệu nào"
          text="Ghi nhận buổi chạy đầu tiên để mở khoá huy hiệu đầu tiên!"
        />
      )}

      <SectionCard
        title="Bộ sưu tập huy hiệu"
        subtitle={`${unlockedCount}/${totalCount} đã mở khoá`}
        icon={<Trophy className="h-4 w-4" />}
        delay={0.06}
        contentClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
      >
        {ACHIEVEMENTS.map((def, i) => {
          const rec = unlockedMap.get(def.type);
          const isUnlocked = !!rec;
          const hint = isUnlocked
            ? null
            : computeProgressHint(def, ctx, unitSystem);
          return (
            <BadgeCard
              key={def.type}
              def={def}
              rec={rec}
              hint={hint}
              index={i}
            />
          );
        })}
      </SectionCard>
    </div>
  );
}

/* ============================ Skeleton ============================ */

function AchievementsSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="h-44 animate-pulse rounded-3xl bg-muted/60 sm:h-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-52 animate-pulse rounded-2xl bg-muted/50"
          />
        ))}
      </div>
    </div>
  );
}

/* ============================ Header ============================ */

interface TierCount {
  tier: AchievementDef["tier"];
  got: number;
  total: number;
}

function AchievementsHeader({
  unlockedCount,
  totalCount,
  pct,
  tierCounts,
}: {
  unlockedCount: number;
  totalCount: number;
  pct: number;
  tierCounts: TierCount[];
}) {
  const allDone = unlockedCount === totalCount && totalCount > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative overflow-hidden rounded-3xl border border-border/70 p-5 text-white shadow-soft grad-primary sm:p-7"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-black/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
        <ProgressRing
          value={pct}
          size={148}
          stroke={14}
          fromColor="oklch(0.99 0.01 190)"
          toColor="oklch(0.95 0.06 85)"
          trackColor="color-mix(in oklch, white 30%, transparent)"
          gradientId="ach-header-ring"
          className="shrink-0"
        >
          <div className="flex flex-col items-center text-center">
            <Trophy className="h-6 w-6" />
            <CountUp
              value={pct}
              suffix="%"
              className="mt-1 text-2xl font-extrabold tracking-tight tnum"
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
              đã mở khoá
            </span>
          </div>
        </ProgressRing>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-baseline justify-center gap-1.5 sm:justify-start">
            <span className="text-4xl font-extrabold tracking-tight tnum sm:text-5xl">
              <CountUp value={unlockedCount} />
            </span>
            <span className="text-2xl font-bold text-white/80 tnum">
              / {totalCount}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-white/90">
            {allDone
              ? "Tuyệt vời! Bạn đã mở khoá toàn bộ huy hiệu 🎉"
              : unlockedCount === 0
                ? "Hãy bắt đầu hành trình sưu tập huy hiệu của bạn!"
                : `${unlockedCount}/${totalCount} huy hiệu đã mở khoá — tiếp tục phát!`}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {tierCounts.map(({ tier, got, total }) => (
              <span
                key={tier}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: TIER_STYLE[tier].ring,
                    boxShadow: `0 0 6px ${TIER_STYLE[tier].ring}`,
                  }}
                />
                {TIER_STYLE[tier].label}
                <span className="tnum text-white/80">
                  {got}/{total}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================ Badge card ============================ */

interface ProgressHint {
  pct: number; // 0..100
  current: string;
  goal: string;
}

function BadgeCard({
  def,
  rec,
  hint,
  index,
}: {
  def: AchievementDef;
  rec: AchievementRecord | undefined;
  hint: ProgressHint | null;
  index: number;
}) {
  const isUnlocked = !!rec;
  const tierColor = TIER_STYLE[def.tier].ring;
  const tierGlow = TIER_STYLE[def.tier].glow;
  const delay = Math.min(index * 0.04, 0.32);
  const almostDone = !isUnlocked && hint != null && hint.pct >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border p-4 text-center transition-colors",
        isUnlocked
          ? "bg-card"
          : "border-border/50 bg-muted/30 hover:border-border/70"
      )}
      style={
        isUnlocked
          ? {
              borderColor: `color-mix(in oklch, ${tierColor} 55%, transparent)`,
              boxShadow: `0 10px 30px -14px ${tierGlow}`,
            }
          : undefined
      }
    >
      {/* Unlocked radial halo at top */}
      {isUnlocked && (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${tierGlow}, transparent 70%)`,
          }}
        />
      )}

      {/* Circular badge area */}
      <div className="relative mx-auto mb-3 grid h-20 w-20 place-items-center">
        <div
          className={cn(
            "relative grid h-20 w-20 place-items-center rounded-full border-2 transition-transform group-hover:scale-105",
            !isUnlocked && "opacity-60 grayscale"
          )}
          style={{
            borderColor: tierColor,
            background: isUnlocked
              ? `radial-gradient(circle, ${tierColor}22, transparent 75%)`
              : "var(--muted)",
          }}
        >
          <motion.span
            animate={
              isUnlocked ? { scale: [1, 1.08, 1] } : { scale: 1 }
            }
            transition={{
              duration: 2.4,
              repeat: isUnlocked ? Infinity : 0,
              ease: "easeInOut",
            }}
            className={cn("text-4xl", !isUnlocked && "opacity-50")}
            style={
              isUnlocked
                ? { filter: `drop-shadow(0 0 12px ${tierColor})` }
                : undefined
            }
          >
            {def.emoji}
          </motion.span>
        </div>

        {/* Lock overlay for locked cards */}
        {!isUnlocked && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-soft">
            <Lock className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <h3 className="text-sm font-bold leading-tight">{def.title}</h3>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        {def.description}
      </p>

      {/* Footer — status + progress hint, pushed to bottom */}
      <div className="mt-auto pt-3">
        {isUnlocked && rec ? (
          <span
            className="inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: tierColor }}
          >
            <Sparkles className="h-3 w-3" />
            Đã mở khoá · {fmtDateTime(rec.unlockedAt, "d/M/yyyy")}
          </span>
        ) : (
          <>
            <span
              className="inline-flex items-center justify-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
            >
              {TIER_STYLE[def.tier].label}
            </span>
            {hint && (
              <div className="mt-2.5">
                {almostDone ? (
                  <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-500">
                    <Sparkles className="h-3 w-3" />
                    Sắp mở khoá!
                  </p>
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground tnum">
                    <span>{hint.current}</span>
                    <span>{hint.goal}</span>
                  </div>
                )}
                <Progress
                  value={hint.pct}
                  className="mt-1 h-1.5 bg-muted"
                />
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ============================ Progress hints ============================ */

/** Compute a unit-aware progress hint for a locked achievement. Returns null
 *  when we can't (or shouldn't) show a hint for the given def. */
function computeProgressHint(
  def: AchievementDef,
  ctx: AchievementCtx,
  unitSystem: UnitSystem
): ProgressHint | null {
  const dUnit = distanceLabel(unitSystem);
  const wUnit = weightLabel(unitSystem);
  const s = ctx.stats;

  const distLabel = (km: number, digits = 1) =>
    `${fmtNum(displayDistance(km, unitSystem, digits), digits)} ${dUnit}`;
  const wLabel = (kg: number, digits = 1) =>
    `${fmtNum(displayWeight(kg, unitSystem, digits), digits)} ${wUnit}`;

  let current: number;
  let goal: number;
  let currentLabel: string;
  let goalLabel: string;

  switch (def.type) {
    case "first_run":
      current = s.totalRuns;
      goal = 1;
      currentLabel = `${s.totalRuns}`;
      goalLabel = "1";
      break;
    case "first_5k":
      current = s.longestRunKm;
      goal = 5;
      currentLabel = distLabel(s.longestRunKm);
      goalLabel = distLabel(5);
      break;
    case "first_10k":
      current = s.longestRunKm;
      goal = 10;
      currentLabel = distLabel(s.longestRunKm);
      goalLabel = distLabel(10);
      break;
    case "long_run_15k":
      current = s.longestRunKm;
      goal = 15;
      currentLabel = distLabel(s.longestRunKm);
      goalLabel = distLabel(15);
      break;
    case "streak_3":
      current = s.bestStreak;
      goal = 3;
      currentLabel = `${s.bestStreak} ngày`;
      goalLabel = "3 ngày";
      break;
    case "streak_7":
      current = s.bestStreak;
      goal = 7;
      currentLabel = `${s.bestStreak} ngày`;
      goalLabel = "7 ngày";
      break;
    case "total_50km":
      current = s.totalKm;
      goal = 50;
      currentLabel = distLabel(s.totalKm);
      goalLabel = distLabel(50);
      break;
    case "total_100km":
      current = s.totalKm;
      goal = 100;
      currentLabel = distLabel(s.totalKm);
      goalLabel = distLabel(100);
      break;
    case "total_250km":
      current = s.totalKm;
      goal = 250;
      currentLabel = distLabel(s.totalKm);
      goalLabel = distLabel(250);
      break;
    case "total_500km":
      current = s.totalKm;
      goal = 500;
      currentLabel = distLabel(s.totalKm);
      goalLabel = distLabel(500);
      break;
    case "week_goal": {
      const g = ctx.profile.targetKmPerWeek;
      if (g <= 0) return null;
      current = s.weekKm;
      goal = g;
      currentLabel = distLabel(s.weekKm);
      goalLabel = distLabel(g);
      break;
    }
    case "weight_1kg":
      current = Math.max(0, s.weightLost);
      goal = 1;
      currentLabel = wLabel(Math.max(0, s.weightLost));
      goalLabel = wLabel(1);
      break;
    case "weight_5kg":
      current = Math.max(0, s.weightLost);
      goal = 5;
      currentLabel = wLabel(Math.max(0, s.weightLost));
      goalLabel = wLabel(5);
      break;
    case "runs_25":
      current = s.totalRuns;
      goal = 25;
      currentLabel = `${s.totalRuns}`;
      goalLabel = "25";
      break;
    default:
      return null;
  }

  if (goal <= 0) return null;
  const ratio = current / goal;
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return { pct, current: currentLabel, goal: goalLabel };
}
