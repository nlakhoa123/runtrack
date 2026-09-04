"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Flame,
  Footprints,
  Target,
  TrendingDown,
  Zap,
  Trophy,
  Gauge,
  Crown,
  Route,
  Scale,
  Activity,
  Clock,
  TrendingUp,
  ChevronRight,
  Share2,
  Check,
  Camera,
  Images,
  X,
  Sparkles,
  Loader2,
  CalendarHeart,
  ChevronLeft,
  Pause,
  Play,
} from "lucide-react";

import { db } from "@/lib/rt/db";
import type { Profile, RunSession, UnitSystem, WeightEntry, Feeling, RunPhoto } from "@/lib/rt/types";
import { FEELINGS } from "@/lib/rt/types";
import type { DashboardStats, WeeklyInsight } from "@/lib/rt/insights";
import { buildWeeklyInsight, computeStats, heatmapIntensity } from "@/lib/rt/insights";
import { bestStreakEver } from "@/lib/rt/achievements";
import { useRtStore } from "@/store/rt-store";
import {
  displayDistance,
  displayWeight,
  distanceLabel,
  weightLabel,
  calcPace,
  fmtDuration,
  round,
} from "@/lib/rt/utils";
import { fmtDate, todayKey, weekKeysForOffset, currentWeekKeys } from "@/lib/rt/dates";
import { toast } from "sonner";

import { CountUp } from "@/components/rt/shared/count-up";
import { EmptyState } from "@/components/rt/shared/empty-state";
import { ProgressRing } from "@/components/rt/shared/progress-ring";
import { SectionCard } from "@/components/rt/shared/section-card";
import { StatCard } from "@/components/rt/shared/stat-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Heatmap color stops — mint → teal → coral → rose with increasing intensity */
const HEAT_LEVEL_COLOR = [
  "color-mix(in oklch, var(--muted-foreground) 12%, transparent)",
  "color-mix(in oklch, var(--brand-mint) 50%, transparent)",
  "color-mix(in oklch, var(--brand-teal) 72%, transparent)",
  "color-mix(in oklch, var(--brand-coral) 82%, transparent)",
  "var(--brand-rose)",
] as const;

const TONE_STYLE: Record<
  WeeklyInsight["tone"],
  { grad: string; label: string; info?: boolean }
> = {
  up: { grad: "grad-energy", label: "Bứt phá" },
  down: { grad: "grad-rose", label: "Khởi động lại" },
  steady: { grad: "grad-primary", label: "Ổn định" },
  info: { grad: "", label: "Gợi ý", info: true },
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function DashboardView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);
  const setActiveView = useRtStore((s) => s.setActiveView);
  const setQuickAdd = useRtStore((s) => s.setQuickAdd);

  const profile = useLiveQuery(
    () => (activeProfileId ? db.profiles.get(activeProfileId) : undefined),
    [activeProfileId]
  );
  const runs = useLiveQuery(
    async () =>
      activeProfileId
        ? db.runs.where("profileId").equals(activeProfileId).toArray()
        : ([] as RunSession[]),
    [activeProfileId]
  );
  const weights = useLiveQuery(
    async () =>
      activeProfileId
        ? db.weights.where("profileId").equals(activeProfileId).toArray()
        : ([] as WeightEntry[]),
    [activeProfileId]
  );

  // Loading guard — Dexie queries still resolving.
  if (!profile || runs === undefined || weights === undefined) {
    return <DashboardSkeleton />;
  }

  // Empty state — fresh profile, no runs and at most the initial weight entry.
  if (runs.length === 0 && weights.length <= 1) {
    return (
      <EmptyState
        emoji="👟"
        title="Bắt đầu hành trình của bạn"
        text="Ghi buổi chạy đầu tiên để kích hoạt bảng tổng quan. Mỗi bước đều được ghi nhận!"
        action={
          <Button
            onClick={() => useRtStore.getState().startNewRun()}
            className="gap-2 border-transparent text-white shadow-soft grad-primary hover:opacity-90"
          >
            Ghi buổi chạy đầu tiên <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
    );
  }

  const stats = computeStats(profile, runs, weights);
  const insight = buildWeeklyInsight(runs);

  return (
    <div className="space-y-5 sm:space-y-6">
      <HeroWeightCard profile={profile} stats={stats} unitSystem={unitSystem} />
      <StatCardsGrid stats={stats} unitSystem={unitSystem} />
      <HeatmapCard runs={runs} onViewAll={() => setActiveView("runs")} />
      {/* side-by-side: PR + Monthly stats */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <PersonalRecordsCard runs={runs} unitSystem={unitSystem} />
        <MonthlyStatsCard runs={runs} unitSystem={unitSystem} profile={profile} weights={weights} />
      </div>
      {/* side-by-side: journey memories + on-this-day */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <JourneyMemoriesCard profileId={profile.id} runs={runs} />
        <OnThisDayCard profileId={profile.id} runs={runs} weights={weights} />
      </div>
      <RecentActivityCard runs={runs} weights={weights} unitSystem={unitSystem} />
      {/* weekly goal + insight collapsed into a single row */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <WeeklyGoalCard stats={stats} unitSystem={unitSystem} />
        <WeeklyInsightCard insight={insight} onViewAll={() => setActiveView("runs")} />
      </div>
    </div>
  );
}

/* ============================ Skeleton ============================ */

function DashboardSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="h-52 animate-pulse rounded-3xl bg-muted/60 sm:h-56" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/60" />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-44 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-40 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-44 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-32 animate-pulse rounded-3xl bg-muted/60" />
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <div className="h-36 animate-pulse rounded-3xl bg-muted/60" />
        <div className="h-36 animate-pulse rounded-3xl bg-muted/60" />
      </div>
    </div>
  );
}

/* ============================ Personal Records card ============================ */

interface PersonalRecords {
  longestRunKm: number;
  fastestPace: string; // min:ss per km
  fastestSpeed: number; // km/h
  bestStreak: number;
  totalCalories: number;
  totalRuns: number;
}

function computePersonalRecords(runs: RunSession[]): PersonalRecords | null {
  if (runs.length === 0) return null;
  let longest = 0;
  let fastestSpeed = 0;
  let totalCalories = 0;
  for (const r of runs) {
    if (r.distanceKm > longest) longest = r.distanceKm;
    if (r.avgSpeed > fastestSpeed) fastestSpeed = r.avgSpeed;
    totalCalories += r.calories;
  }
  // fastest pace derived from fastest speed: pace = 60/speed min/km
  const paceMin = fastestSpeed > 0 ? 60 / fastestSpeed : 0;
  const paceM = Math.floor(paceMin);
  const paceS = Math.round((paceMin - paceM) * 60);
  const fastestPace = `${paceM}:${paceS.toString().padStart(2, "0")}`;
  const bestStreak = bestStreakEver(runs.map((r) => r.date));
  return {
    longestRunKm: longest,
    fastestPace,
    fastestSpeed,
    bestStreak,
    totalCalories,
    totalRuns: runs.length,
  };
}

function PersonalRecordsCard({
  runs,
  unitSystem,
}: {
  runs: RunSession[];
  unitSystem: UnitSystem;
}) {
  const prs = useMemo(() => computePersonalRecords(runs), [runs]);
  const distUnit = distanceLabel(unitSystem);
  const [shared, setShared] = useState(false);

  if (!prs) return null;

  async function handleShare() {
    const text = `🏃 RunTrack — Kỷ lục cá nhân\n\n• Chạy dài nhất: ${displayDistance(prs!.longestRunKm, unitSystem, 2)} ${distUnit}\n• Nhịp nhanh nhất: ${prs!.fastestPace} min/km\n• Chuỗi dài nhất: ${prs!.bestStreak} ngày\n• Tổng calo: ${prs!.totalCalories} kcal\n\nTừ ${prs!.totalRuns} buổi chạy 💪`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "RunTrack — Kỷ lục cá nhân", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShared(true);
      toast.success("Đã sao chép kỷ lục!", { description: "Dán vào nơi bạn muốn chia sẻ." });
      setTimeout(() => setShared(false), 2000);
    } catch (e) {
      console.error(e);
      toast.error("Không sao chép được");
    }
  }

  const records = [
    {
      icon: Route,
      label: "Chạy dài nhất",
      value: displayDistance(prs.longestRunKm, unitSystem, 2),
      unit: distUnit,
      accent: "var(--brand-teal)" as const,
      grad: "grad-primary" as const,
    },
    {
      icon: Gauge,
      label: "Nhịp nhanh nhất",
      value: prs.fastestPace,
      unit: "min/km",
      accent: "var(--brand-coral)" as const,
      grad: "grad-energy" as const,
    },
    {
      icon: Flame,
      label: "Chuỗi dài nhất",
      value: prs.bestStreak,
      unit: "ngày",
      accent: "var(--brand-amber)" as const,
      grad: "grad-energy" as const,
    },
    {
      icon: Zap,
      label: "Tổng calo",
      value: prs.totalCalories,
      unit: "kcal",
      accent: "var(--brand-violet)" as const,
      grad: "grad-violet" as const,
    },
  ];

  return (
    <SectionCard
      title="Kỷ lục cá nhân"
      subtitle="Những con số tốt nhất mọi thời gian"
      icon={<Trophy className="h-4 w-4" />}
      delay={0.1}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {records.map((rec, i) => {
          const Icon = rec.icon;
          return (
            <motion.div
              key={rec.label}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.12 + i * 0.06 }}
              whileHover={{ y: -3 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3.5"
            >
              {/* glow accent */}
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.14] blur-xl transition-opacity group-hover:opacity-25"
                style={{ background: rec.accent }}
              />
              <div className="relative flex items-center gap-2">
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg text-white shadow-soft"
                  style={{ background: rec.accent }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {rec.label}
                </span>
              </div>
              <div className="relative mt-2 flex items-baseline gap-1">
                {typeof rec.value === "number" ? (
                  <CountUp
                    value={rec.value}
                    decimals={rec.value % 1 !== 0 ? 2 : 0}
                    duration={1.2}
                    className="text-2xl font-extrabold tracking-tight"
                  />
                ) : (
                  <span className="tnum text-2xl font-extrabold tracking-tight">{rec.value}</span>
                )}
                <span className="text-[11px] font-medium text-muted-foreground">{rec.unit}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* footer summary */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Crown className="h-3 w-3 text-[color:var(--brand-amber)]" />
          <span>
            Từ <b className="text-foreground tnum">{prs.totalRuns}</b> buổi chạy — tiếp tục phá vỡ kỷ lục!
          </span>
        </div>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {shared ? (
            <><Check className="h-3 w-3 text-emerald-500" /> Đã chép</>
          ) : (
            <><Share2 className="h-3 w-3" /> Chia sẻ</>
          )}
        </button>
      </div>
    </SectionCard>
  );
}

/* ============================ Hero weight card ============================ */

function HeroWeightCard({
  profile,
  stats,
  unitSystem,
}: {
  profile: Profile;
  stats: DashboardStats;
  unitSystem: UnitSystem;
}) {
  const unit = weightLabel(unitSystem);
  const currentWeight = stats.weightCurrent ?? profile.currentWeight;
  const currentDisplay = displayWeight(currentWeight, unitSystem, 1);
  const targetDisplay = displayWeight(profile.targetWeight, unitSystem, 1);
  const remainingKg = currentWeight - profile.targetWeight;
  const remainingDisplay = displayWeight(Math.abs(remainingKg), unitSystem, 1);
  const achieved = stats.weightGoalPct >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative overflow-hidden rounded-3xl border border-white/10 p-5 shadow-soft grad-primary sm:p-6"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[color:var(--brand-cyan)]/30 blur-3xl" />

      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
        <ProgressRing
          value={stats.weightGoalPct}
          size={176}
          stroke={16}
          fromColor="var(--brand-mint)"
          toColor="var(--brand-cyan)"
          gradientId="hero-weight-ring"
          trackColor="rgba(255,255,255,0.18)"
          className="shrink-0"
        >
          <div className="flex flex-col items-center px-2 text-center text-white">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Hiện tại
            </span>
            <div className="flex items-baseline gap-1">
              <CountUp
                value={currentDisplay}
                decimals={1}
                className="text-4xl font-extrabold tracking-tight"
              />
              <span className="text-sm font-semibold text-white/80">{unit}</span>
            </div>
            <span className="mt-0.5 text-[11px] text-white/70">
              → {targetDisplay} {unit}
            </span>
            <span className="mt-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
              {stats.weightGoalPct}%
            </span>
          </div>
        </ProgressRing>

        <div className="flex-1 text-center text-white sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            Mục tiêu cân nặng
          </p>
          {achieved ? (
            <>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-[28px]">
                Bạn đã đạt mục tiêu! 🎉
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-white/85">
                Cân nặng hiện tại khớp với mục tiêu. Tiếp tục duy trì nhịp độ khỏe mạnh nhé!
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-[28px]">
                Còn{" "}
                <CountUp
                  value={remainingDisplay}
                  decimals={1}
                  suffix={` ${unit}`}
                  className="tnum"
                />{" "}
                nữa
              </h2>
              <p className="mt-1.5 text-sm text-white/85">
                đến mức <span className="font-semibold text-white">{targetDisplay} {unit}</span>
              </p>
              {stats.weightEtaWeeks != null && (
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  <CalendarDays className="h-3.5 w-3.5" />
                  ước tính ≈ {stats.weightEtaWeeks} tuần nữa
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ============================ Stat cards grid ============================ */

function StatCardsGrid({
  stats,
  unitSystem,
}: {
  stats: DashboardStats;
  unitSystem: UnitSystem;
}) {
  const distUnit = distanceLabel(unitSystem);
  const weightUnit = weightLabel(unitSystem);
  const weekKmDisplay = displayDistance(stats.weekKm, unitSystem, 1);
  const weightLostDisplay = displayWeight(stats.weightLost, unitSystem, 1);
  const showWeekDelta = stats.weekChangePct !== 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard
        label="km tuần này"
        value={weekKmDisplay}
        decimals={1}
        suffix={` ${distUnit}`}
        accent="primary"
        icon={<Footprints className="h-4 w-4" />}
        delta={
          showWeekDelta
            ? { value: stats.weekChangePct, suffix: "%", positiveIsGood: true }
            : undefined
        }
      />
      <StatCard
        label="Chuỗi ngày"
        value={stats.streak}
        suffix=" ngày"
        accent="energy"
        icon={<Flame className="h-4 w-4" />}
      />
      <StatCard
        label="Đã giảm"
        value={weightLostDisplay}
        decimals={1}
        suffix={` ${weightUnit}`}
        accent="rose"
        icon={<TrendingDown className="h-4 w-4" />}
      />
      <StatCard
        label="Calo tuần"
        value={stats.caloriesThisWeek}
        accent="violet"
        icon={<Zap className="h-4 w-4" />}
      />
    </div>
  );
}

/* ============================ Week vs Last Week strip ============================ */

function WeekComparisonStrip({
  runs,
  unitSystem,
}: {
  runs: RunSession[];
  unitSystem: UnitSystem;
}) {
  const { thisWeek, lastWeek } = useMemo(() => {
    const thisKeys = new Set(currentWeekKeys());
    const lastKeys = new Set(weekKeysForOffset(1));
    const tw = runs.filter((r) => thisKeys.has(r.date));
    const lw = runs.filter((r) => lastKeys.has(r.date));
    return {
      thisWeek: {
        km: tw.reduce((s, r) => s + r.distanceKm, 0),
        count: tw.length,
        calories: tw.reduce((s, r) => s + r.calories, 0),
      },
      lastWeek: {
        km: lw.reduce((s, r) => s + r.distanceKm, 0),
        count: lw.length,
        calories: lw.reduce((s, r) => s + r.calories, 0),
      },
    };
  }, [runs]);

  const distUnit = distanceLabel(unitSystem);
  const metrics = [
    { label: "Km", thisVal: round(displayDistance(thisWeek.km, unitSystem, 1), 1), lastVal: round(displayDistance(lastWeek.km, unitSystem, 1), 1), unit: distUnit, higherIsBetter: true },
    { label: "Buổi", thisVal: thisWeek.count, lastVal: lastWeek.count, unit: "", higherIsBetter: true },
    { label: "Calo", thisVal: thisWeek.calories, lastVal: lastWeek.calories, unit: "kcal", higherIsBetter: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.06 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold tracking-tight sm:text-base">Tuần này vs Tuần trước</h2>
            <p className="text-xs text-muted-foreground">So sánh nhanh tiến bộ</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {metrics.map((m, i) => {
          const diff = m.thisVal - m.lastVal;
          const pct = m.lastVal > 0.1 ? Math.round((diff / m.lastVal) * 100) : m.thisVal > 0 ? 100 : 0;
          const up = diff > 0;
          const down = diff < 0;
          const same = diff === 0;
          // bar widths: this week relative to max of the two
          const max = Math.max(m.thisVal, m.lastVal, 0.1);
          const thisPct = Math.max(6, Math.min(100, (m.thisVal / max) * 100));
          const lastPct = Math.max(6, Math.min(100, (m.lastVal / max) * 100));
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-4% 0px" }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.1 + i * 0.05 }}
              className="rounded-2xl border border-border/60 bg-card/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    up && "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
                    down && "bg-[color:var(--brand-rose)]/12 text-[color:var(--brand-rose)]",
                    same && "bg-muted text-muted-foreground"
                  )}
                >
                  {up ? "▲" : down ? "▼" : "="} {Math.abs(pct)}%
                </span>
              </div>
              {/* this week bar */}
              <div className="mb-1.5">
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="font-medium text-foreground">Tuần này</span>
                  <span className="tnum font-bold text-foreground">{m.thisVal}{m.unit && <span className="ml-0.5 font-normal text-muted-foreground">{m.unit}</span>}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${thisPct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.05 }}
                    className="h-full rounded-full grad-primary"
                  />
                </div>
              </div>
              {/* last week bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="font-medium text-muted-foreground">Tuần trước</span>
                  <span className="tnum font-semibold text-muted-foreground">{m.lastVal}{m.unit && <span className="ml-0.5 font-normal text-muted-foreground">{m.unit}</span>}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${lastPct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.3 + i * 0.05 }}
                    className="h-full rounded-full bg-muted-foreground/30"
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ============================ Heatmap calendar ============================ */

interface HeatCell {
  key: string;
  km: number;
  level: number;
  future: boolean;
}

function HeatmapCard({
  runs,
  onViewAll,
}: {
  runs: RunSession[];
  onViewAll: () => void;
}) {
  const [hovered, setHovered] = useState<HeatCell | null>(null);
  const [hoveredRuns, setHoveredRuns] = useState<RunSession[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  const columns = useMemo<HeatCell[][]>(() => {
    const map = new Map(heatmapIntensity(runs, 119).map((h) => [h.key, h]));
    const today = todayKey();
    const cols: HeatCell[][] = [];
    // 17 weeks × 7 days = 119 days, oldest week first (left → right).
    for (let i = 16; i >= 0; i--) {
      const weekKeys = weekKeysForOffset(i);
      cols.push(
        weekKeys.map((k) => {
          const entry = map.get(k);
          return {
            key: k,
            km: entry?.km ?? 0,
            level: entry?.level ?? 0,
            future: k > today,
          };
        })
      );
    }
    return cols;
  }, [runs]);

  function handleHover(cell: HeatCell, e: React.MouseEvent) {
    if (cell.future) return;
    setHovered(cell);
    setHoveredRuns(runs.filter((r) => r.date === cell.key));
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setContainerWidth(rect.width);
      setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }

  // Tap-to-toggle for touch devices: tap a cell shows the tooltip, tapping the
  // same cell again (or another) repositions. Tapping outside dismisses.
  function handleTap(cell: HeatCell, e: React.MouseEvent) {
    if (cell.future) return;
    e.stopPropagation();
    // toggle off if tapping the same cell that's currently shown
    if (hovered?.key === cell.key) {
      setHovered(null);
      setTipPos(null);
      return;
    }
    setHovered(cell);
    setHoveredRuns(runs.filter((r) => r.date === cell.key));
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setContainerWidth(rect.width);
      setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }

  return (
    <SectionCard
      title="Lịch chạy"
      subtitle="119 ngày gần nhất — di chuột hoặc chạm để xem"
      icon={<CalendarDays className="h-4 w-4" />}
      action={
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
        </button>
      }
      delay={0.1}
      contentClassName="space-y-3"
    >
      <div
        ref={containerRef}
        className="no-scrollbar relative -mx-1 overflow-x-auto px-1 pb-1"
        onMouseLeave={() => {
          setHovered(null);
          setTipPos(null);
        }}
      >
        <div className="flex min-w-max gap-1.5">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1.5">
              {col.map((cell) => (
                <div
                  key={cell.key}
                  onMouseEnter={(e) => handleHover(cell, e)}
                  onClick={(e) => handleTap(cell, e)}
                  className={cn(
                    "h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125 hover:ring-2 hover:ring-primary/40",
                    cell.future && "pointer-events-none opacity-0"
                  )}
                  style={{
                    background: cell.future
                      ? "transparent"
                      : HEAT_LEVEL_COLOR[cell.level],
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        {/* floating tooltip */}
        <AnimatePresence>
          {hovered && tipPos && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="pointer-events-none absolute z-30 w-44 rounded-2xl border border-border bg-popover p-3 shadow-lift"
              style={{
                left: Math.min(tipPos.x + 12, Math.max(containerWidth - 180, 0)),
                top: Math.max(tipPos.y - 10, 10),
                transform: tipPos.y > 100 ? "translateY(-100%)" : undefined,
              }}
            >
              <p className="text-[11px] font-semibold text-foreground">
                {fmtDate(hovered.key, "EEEE, d MMM yyyy")}
              </p>
              {hoveredRuns.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {hoveredRuns.length} buổi · {hovered.km} km
                  </p>
                  {hoveredRuns.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-sm">{feelingEmoji(r.feeling)}</span>
                      <span className="tnum font-semibold">{r.distanceKm.toFixed(1)} km</span>
                      <span className="text-muted-foreground">· {fmtDuration(r.durationMin)}</span>
                    </div>
                  ))}
                  {hoveredRuns.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{hoveredRuns.length - 3} buổi nữa</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">Ngày nghỉ 🌿</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] font-medium text-muted-foreground">
        <span>Ít</span>
        {HEAT_LEVEL_COLOR.map((c, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-[3px]"
            style={{ background: c }}
          />
        ))}
        <span>Nhiều</span>
      </div>
    </SectionCard>
  );
}

/* ============================ Weekly goal card ============================ */

function WeeklyGoalCard({
  stats,
  unitSystem,
}: {
  stats: DashboardStats;
  unitSystem: UnitSystem;
}) {
  const distUnit = distanceLabel(unitSystem);
  const weekKmDisplay = displayDistance(stats.weekKm, unitSystem, 1);
  const goalKmDisplay = displayDistance(stats.goalKm, unitSystem, 1);
  const isHigh = stats.goalPct >= 80;
  const barClass = isHigh ? "grad-energy" : "grad-primary";

  return (
    <SectionCard title="Mục tiêu tuần này" icon={<Target className="h-4 w-4" />} delay={0.15}>
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight">
                <CountUp value={stats.goalPct} suffix="%" className="tnum" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                của mục tiêu
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{weekKmDisplay}</span>
              {" / "}
              {goalKmDisplay} {distUnit} tuần này
            </p>
          </div>
          <div
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl text-white shadow-soft",
              barClass
            )}
          >
            <Footprints className="h-4 w-4" />
          </div>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${stats.goalPct}%` }}
            viewport={{ once: true, margin: "-6% 0px" }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
            className={cn("absolute inset-y-0 left-0 rounded-full", barClass)}
          />
        </div>
      </div>
    </SectionCard>
  );
}

/* ============================ Weekly insight card ============================ */

function WeeklyInsightCard({
  insight,
  onViewAll,
}: {
  insight: WeeklyInsight;
  onViewAll: () => void;
}) {
  const t = TONE_STYLE[insight.tone];
  const isInfo = insight.tone === "info";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border p-5 shadow-soft",
        isInfo
          ? "border-border/70 bg-card"
          : cn("border-white/10 text-white", t.grad)
      )}
    >
      {!isInfo && (
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
      )}
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl",
            isInfo ? "bg-primary/10" : "bg-white/20 backdrop-blur"
          )}
        >
          <span>{insight.icon}</span>
        </div>
        <div className="flex-1">
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              isInfo ? "bg-primary/10 text-primary" : "bg-white/20 text-white"
            )}
          >
            {t.label}
          </span>
          <h3
            className={cn(
              "mt-1.5 text-base font-extrabold tracking-tight",
              isInfo ? "text-foreground" : "text-white"
            )}
          >
            {insight.title}
          </h3>
          <p
            className={cn(
              "mt-1 text-sm leading-relaxed",
              isInfo ? "text-muted-foreground" : "text-white/85"
            )}
          >
            {insight.text}
          </p>
        </div>
      </div>
      <div className="relative mt-4 flex justify-end">
        <button
          onClick={onViewAll}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
            isInfo ? "text-primary hover:underline" : "text-white/80 hover:text-white"
          )}
        >
          Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ============================ Recent Activity card ============================ */

type ActivityItem =
  | { kind: "run"; key: string; ts: number; date: string; run: RunSession }
  | { kind: "weight"; key: string; ts: number; date: string; entry: WeightEntry };

function buildActivityFeed(runs: RunSession[], weights: WeightEntry[], limit = 6): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const r of runs) items.push({ kind: "run", key: `r-${r.id}`, ts: r.createdAt, date: r.date, run: r });
  for (const w of weights) items.push({ kind: "weight", key: `w-${w.id}`, ts: w.createdAt, date: w.date, entry: w });
  items.sort((a, b) => b.ts - a.ts);
  return items.slice(0, limit);
}

function feelingEmoji(f: Feeling): string {
  return FEELINGS.find((x) => x.id === f)?.emoji ?? "🏃";
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Hôm qua";
  if (day < 7) return `${day} ngày trước`;
  return fmtDate(new Date(ts).toISOString().slice(0, 10), "d MMM");
}

function RecentActivityCard({
  runs,
  weights,
  unitSystem,
}: {
  runs: RunSession[];
  weights: WeightEntry[];
  unitSystem: UnitSystem;
}) {
  const feed = useMemo(() => buildActivityFeed(runs, weights, 6), [runs, weights]);

  // find previous weight for diff calc (kept before any early return)
  const sortedWeights = useMemo(
    () => [...weights].sort((a, b) => a.createdAt - b.createdAt),
    [weights]
  );

  // need at least one run or >1 weight entry to show (onboarding seeds 1 weight)
  const hasActivity = runs.length > 0 || weights.length > 1;
  if (!hasActivity) return null;

  const weightBefore = (id: string): number | null => {
    const idx = sortedWeights.findIndex((w) => w.id === id);
    if (idx <= 0) return null;
    return sortedWeights[idx - 1].weightKg;
  };

  return (
    <SectionCard
      title="Hoạt động gần đây"
      subtitle="Nhật ký chạy bộ & cân nặng"
      icon={<Activity className="h-4 w-4" />}
      delay={0.12}
      action={
        <button
          onClick={() => useRtStore.getState().setActiveView("runs")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="relative">
        {/* vertical timeline line */}
        <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-border via-border to-transparent" />
        <div className="space-y-1">
          {feed.map((item, i) => {
            const isRun = item.kind === "run";
            const handleClick = isRun
              ? () => useRtStore.getState().startEditRun(item.run.id)
              : () => useRtStore.getState().setQuickAdd("weight");
            return (
              <motion.button
                key={item.key}
                type="button"
                onClick={handleClick}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-4% 0px" }}
                transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.05, 0.25) }}
                whileTap={{ scale: 0.98 }}
                className="group relative flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {/* timeline dot */}
                <div className="relative z-10 shrink-0">
                  {isRun ? (
                    <span className="grid h-9 w-9 place-items-center rounded-full grad-primary text-white shadow-soft ring-4 ring-card">
                      <Footprints className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full grad-energy text-white shadow-soft ring-4 ring-card">
                      <Scale className="h-4 w-4" />
                    </span>
                  )}
                </div>
                {/* content */}
                <div className="min-w-0 flex-1">
                  {isRun ? (
                    <RunActivityRow run={item.run} unitSystem={unitSystem} />
                  ) : (
                    <WeightActivityRow
                      entry={item.entry}
                      prevKg={weightBefore(item.entry.id)}
                      unitSystem={unitSystem}
                    />
                  )}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{relativeTime(item.ts)}</p>
                </div>
                {/* chevron */}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function RunActivityRow({ run, unitSystem }: { run: RunSession; unitSystem: UnitSystem }) {
  const distUnit = distanceLabel(unitSystem);
  return (
    <div className="flex items-center gap-2">
      <span className="tnum text-base font-bold">
        {displayDistance(run.distanceKm, unitSystem, 2)}
        <span className="ml-0.5 text-xs font-medium text-muted-foreground">{distUnit}</span>
      </span>
      <span className="text-[11px] text-muted-foreground">·</span>
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" /> {fmtDuration(run.durationMin)}
      </span>
      <span className="text-[11px] text-muted-foreground">·</span>
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Flame className="h-3 w-3 text-[color:var(--brand-coral)]" /> {run.calories} kcal
      </span>
      <span className="ml-auto text-base">{feelingEmoji(run.feeling)}</span>
    </div>
  );
}

function WeightActivityRow({
  entry,
  prevKg,
  unitSystem,
}: {
  entry: WeightEntry;
  prevKg: number | null;
  unitSystem: UnitSystem;
}) {
  const wUnit = weightLabel(unitSystem);
  const diff = prevKg != null ? round(entry.weightKg - prevKg, 1) : null;
  const lost = diff != null && diff < 0;
  const gained = diff != null && diff > 0;
  return (
    <div className="flex items-center gap-2">
      <span className="tnum text-base font-bold">
        {displayWeight(entry.weightKg, unitSystem, 1)}
        <span className="ml-0.5 text-xs font-medium text-muted-foreground">{wUnit}</span>
      </span>
      {diff != null && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            lost && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            gained && "bg-[color:var(--brand-coral)]/10 text-[color:var(--brand-coral)]",
            !lost && !gained && "bg-muted text-muted-foreground"
          )}
        >
          {lost ? <TrendingDown className="h-2.5 w-2.5" /> : gained ? <TrendingUp className="h-2.5 w-2.5" /> : null}
          {lost ? "−" : gained ? "+" : ""}{Math.abs(diff)}
        </span>
      )}
    </div>
  );
}

/* ============================ Monthly Stats card ============================ */

const MONTH_NAMES_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function MonthlyStatsCard({
  runs,
  unitSystem,
  profile,
  weights,
}: {
  runs: RunSession[];
  unitSystem: UnitSystem;
  profile: Profile;
  weights: WeightEntry[];
}) {
  const [recapOpen, setRecapOpen] = useState(false);
  const { thisMonth, lastMonth, monthLabel } = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ymPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const thisRuns = runs.filter((r) => r.date.startsWith(ym));
    const lastRuns = runs.filter((r) => r.date.startsWith(ymPrev));
    const thisKm = thisRuns.reduce((s, r) => s + r.distanceKm, 0);
    const lastKm = lastRuns.reduce((s, r) => s + r.distanceKm, 0);
    return {
      thisMonth: { km: thisKm, count: thisRuns.length, avg: thisRuns.length ? thisKm / thisRuns.length : 0 },
      lastMonth: { km: lastKm, count: lastRuns.length },
      monthLabel: MONTH_NAMES_VI[now.getMonth()],
    };
  }, [runs]);

  const distUnit = distanceLabel(unitSystem);
  const kmDisplay = round(displayDistance(thisMonth.km, unitSystem, 1), 1);
  const avgDisplay = round(displayDistance(thisMonth.avg, unitSystem, 1), 1);
  const pctChange = lastMonth.km > 0.1 ? Math.round(((thisMonth.km - lastMonth.km) / lastMonth.km) * 100) : thisMonth.km > 0 ? 100 : 0;
  const up = pctChange > 0;
  const down = pctChange < 0;

  return (
    <>
      <SectionCard
        title={`Tháng này · ${monthLabel}`}
        subtitle="Tổng hợp hoạt động chạy bộ tháng hiện tại"
        icon={<CalendarDays className="h-4 w-4" />}
        delay={0.14}
        action={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setRecapOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Recap
          </Button>
        }
      >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total km */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.12] blur-xl grad-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tổng km</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight tnum">
            <CountUp value={kmDisplay} decimals={1} duration={1.2} />
            <span className="ml-1 text-xs font-medium text-muted-foreground">{distUnit}</span>
          </p>
        </div>
        {/* Run count */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.12] blur-xl grad-energy" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Buổi chạy</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight tnum">
            <CountUp value={thisMonth.count} duration={1.2} />
          </p>
        </div>
        {/* Avg distance */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.12] blur-xl grad-violet" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">TB / buổi</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight tnum">
            <CountUp value={avgDisplay} decimals={1} duration={1.2} />
            <span className="ml-1 text-xs font-medium text-muted-foreground">{distUnit}</span>
          </p>
        </div>
        {/* vs last month */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3.5">
          <div
            className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.14] blur-xl"
            style={{ background: up ? "var(--brand-teal)" : down ? "var(--brand-rose)" : "var(--muted-foreground)" }}
          />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vs tháng trước</p>
          <p className="mt-1 flex items-center gap-1 text-2xl font-extrabold tracking-tight">
            {up ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : down ? (
              <TrendingDown className="h-5 w-5 text-[color:var(--brand-rose)]" />
            ) : (
              <span className="text-2xl">—</span>
            )}
            {lastMonth.km > 0.1 ? (
              <span className={cn("tnum", up && "text-emerald-500", down && "text-[color:var(--brand-rose)]")}>
                {up ? "+" : ""}{pctChange}%
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">mới</span>
            )}
          </p>
        </div>
      </div>
      </SectionCard>
      <AnimatePresence>
        {recapOpen && (
          <MonthlyRecapModal
            profile={profile}
            runs={runs}
            weights={weights}
            monthLabel={monthLabel}
            thisMonth={thisMonth}
            unitSystem={unitSystem}
            onClose={() => setRecapOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ============================ Journey Memories card ============================ */

function JourneyMemoriesCard({
  profileId,
  runs,
}: {
  profileId: string;
  runs: RunSession[];
}) {
  const photos = useLiveQuery<RunPhoto[]>(
    async () =>
      db.photos.where("profileId").equals(profileId).reverse().sortBy("createdAt"),
    [profileId]
  );
  const [galleryOpen, setGalleryOpen] = useState(false);
  const runById = useMemo(() => new Map(runs.map((r) => [r.id, r])), [runs]);

  // Loading or no photos yet — don't render the card (keeps dashboard clean).
  if (photos === undefined) return null;
  if (photos.length === 0) return null;

  const recent = photos.slice(0, 6);

  return (
    <>
      <SectionCard
        title="Kỷ niệm hành trình"
        subtitle={`${photos.length} ảnh · mỗi bức là một câu chuyện`}
        icon={<Images className="h-4 w-4" />}
        delay={0.13}
        action={
          <button
            onClick={() => setGalleryOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {recent.map((p, i) => {
            const run = runById.get(p.runId);
            return (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => setGalleryOpen(true)}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-4% 0px" }}
                transition={{ duration: 0.4, ease: EASE, delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border/60"
              >
                <img
                  src={p.dataUrl}
                  alt="Kỉ niệm"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {run && (
                  <span className="absolute bottom-1 left-1 right-1 truncate text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {displayDistanceLocal(run.distanceKm)} · {fmtDate(run.date, "d/M")}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </SectionCard>

      {/* Full-screen gallery */}
      <AnimatePresence>
        {galleryOpen && (
          <JourneyGallery
            photos={photos}
            runById={runById}
            onClose={() => setGalleryOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// small helper to format distance without needing unitSystem here (km default)
function displayDistanceLocal(km: number): string {
  return `${km.toFixed(1)} km`;
}

function JourneyGallery({
  photos,
  runById,
  onClose,
}: {
  photos: RunPhoto[];
  runById: Map<string, RunSession>;
  onClose: () => void;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex flex-col bg-background/95 backdrop-blur"
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Kỷ niệm hành trình</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {photos.length} ảnh
          </span>
        </div>
        <button
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* masonry-style grid */}
      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 [&>*]:mb-2">
          {photos.map((p, i) => {
            const run = runById.get(p.runId);
            return (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => setLightbox(i)}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-4% 0px" }}
                transition={{ duration: 0.35, ease: EASE, delay: (i % 8) * 0.03 }}
                className="group relative block w-full overflow-hidden rounded-2xl border border-border/60"
              >
                <img
                  src={p.dataUrl}
                  alt="Kỉ niệm"
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {run && (
                  <span className="absolute bottom-2 left-2 right-2 translate-y-1 text-left text-[11px] font-medium text-white opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    {displayDistanceLocal(run.distanceKm)} · {fmtDate(run.date, "d MMM yyyy")}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* lightbox */}
      <AnimatePresence>
        {lightbox !== null && photos[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              key={photos[lightbox].id}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              src={photos[lightbox].dataUrl}
              alt="Kỉ niệm"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-lift"
              onClick={(e) => e.stopPropagation()}
            />
            {(() => {
              const run = runById.get(photos[lightbox!].runId);
              return run ? (
                <span
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white backdrop-blur"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayDistanceLocal(run.distanceKm)} · {fmtDate(run.date, "d MMM yyyy")}
                </span>
              ) : null;
            })()}
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((l) => (l === null ? 0 : (l! - 1 + photos.length) % photos.length));
                  }}
                  className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
                  aria-label="Trước"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((l) => (l === null ? 0 : (l! + 1) % photos.length));
                  }}
                  className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
                  aria-label="Sau"
                >
                  ›
                </button>
                <span className="absolute top-6 right-4 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  {lightbox + 1} / {photos.length}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================ On this day memory card ============================ */

function OnThisDayCard({
  profileId,
  runs,
  weights,
}: {
  profileId: string;
  runs: RunSession[];
  weights: WeightEntry[];
}) {
  const photos = useLiveQuery<RunPhoto[]>(
    async () => db.photos.where("profileId").equals(profileId).toArray(),
    [profileId]
  );

  // Find entries from exactly 1 year ago, 6 months ago, and 1 month ago.
  const memories = useMemo(() => {
    if (!photos) return null;
    const now = new Date();
    const result: { label: string; runs: RunSession[]; weights: WeightEntry[]; photos: RunPhoto[] }[] = [];

    const checkDate = (d: Date, label: string) => {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayRuns = runs.filter((r) => r.date === key);
      const dayWeights = weights.filter((w) => w.date === key);
      // photos are keyed by runId, so we need to find runs on that day then their photos
      const runIds = new Set(dayRuns.map((r) => r.id));
      const dayPhotos = photos.filter((p) => runIds.has(p.runId));
      if (dayRuns.length > 0 || dayWeights.length > 0 || dayPhotos.length > 0) {
        result.push({ label, runs: dayRuns, weights: dayWeights, photos: dayPhotos });
      }
    };

    // 1 year ago
    checkDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()), "1 năm trước");
    // 6 months ago
    checkDate(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()), "6 tháng trước");
    // 1 month ago
    checkDate(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()), "1 tháng trước");

    return result;
  }, [runs, weights, photos]);

  if (memories === null || memories.length === 0) return null;
  const m = memories[0]; // show the most recent memory found

  return (
    <SectionCard
      title="Đúng ngày này..."
      subtitle={`Nhìn lại ${m.label} — bạn đã đi được bao xa`}
      icon={<CalendarHeart className="h-4 w-4" />}
      delay={0.12}
    >
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-[color:var(--brand-violet)]/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
            {m.label}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {m.runs.length > 0 && (
            <div className="rounded-xl bg-card/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Chạy</p>
              <p className="mt-1 text-2xl font-extrabold tnum">
                {m.runs.reduce((s, r) => s + r.distanceKm, 0).toFixed(1)}
                <span className="ml-1 text-xs font-medium text-muted-foreground">km</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{m.runs.length} buổi</p>
            </div>
          )}
          {m.weights.length > 0 && (
            <div className="rounded-xl bg-card/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cân nặng</p>
              <p className="mt-1 text-2xl font-extrabold tnum">
                {m.weights[m.weights.length - 1].weightKg.toFixed(1)}
                <span className="ml-1 text-xs font-medium text-muted-foreground">kg</span>
              </p>
              <p className="text-[11px] text-muted-foreground">lúc đó</p>
            </div>
          )}
          {m.photos.length > 0 && (
            <div className="rounded-xl bg-card/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ảnh</p>
              <div className="mt-1 flex gap-1">
                {m.photos.slice(0, 3).map((p) => (
                  <img key={p.id} src={p.dataUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          ✨ Hôm nay bạn đã tiến xa hơn rất nhiều — tiếp tục phát nhé!
        </p>
      </div>
    </SectionCard>
  );
}

/* ============================ Monthly AI Recap modal ============================ */

function MonthlyRecapModal({
  profile,
  runs,
  weights,
  monthLabel,
  thisMonth,
  unitSystem,
  onClose,
}: {
  profile: Profile;
  runs: RunSession[];
  weights: WeightEntry[];
  monthLabel: string;
  thisMonth: { km: number; count: number; avg: number };
  unitSystem: UnitSystem;
  onClose: () => void;
}) {
  const [recap, setRecap] = useState<{ headline: string; narrative: string; highlights: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [slideIdx, setSlideIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Gather this month's photos (from runs this month)
  const monthPhotos = useLiveQuery<RunPhoto[]>(async () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRuns = runs.filter((r) => r.date.startsWith(ym));
    const runIds = monthRuns.map((r) => r.id);
    if (runIds.length === 0) return [];
    const allPhotos = await db.photos.where("runId").anyOf(runIds).toArray();
    return allPhotos.sort((a, b) => a.createdAt - b.createdAt);
  }, [runs]);

  // Compute stats for the recap
  const stats = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRuns = runs.filter((r) => r.date.startsWith(ym));
    const monthWeights = weights.filter((w) => w.date.startsWith(ym)).sort((a, b) => a.createdAt - b.createdAt);
    const longestRun = monthRuns.reduce((m, r) => Math.max(m, r.distanceKm), 0);
    const totalCalories = monthRuns.reduce((s, r) => s + r.calories, 0);
    // streak: compute from all run dates
    const runDates = [...new Set(runs.map((r) => r.date))].sort();
    let bestStreak = 0;
    let cur = 0;
    let prev = "";
    for (const d of runDates) {
      if (prev) {
        const diff = Math.round((new Date(d).getTime() - new Date(prev).getTime()) / 86400000);
        if (diff === 1) { cur++; bestStreak = Math.max(bestStreak, cur); }
        else cur = 1;
      } else cur = 1;
      bestStreak = Math.max(bestStreak, cur);
      prev = d;
    }
    return {
      totalKm: round(thisMonth.km, 1),
      totalRuns: thisMonth.count,
      totalCalories,
      longestRunKm: round(longestRun, 1),
      bestStreak,
      weightStart: monthWeights[0]?.weightKg,
      weightEnd: monthWeights[monthWeights.length - 1]?.weightKg,
      weightChange: monthWeights.length >= 2 ? round(monthWeights[monthWeights.length - 1].weightKg - monthWeights[0].weightKg, 1) : undefined,
      targetWeight: profile.targetWeight,
      weeklyGoalKm: profile.targetKmPerWeek,
      photosCount: monthPhotos?.length ?? 0,
    };
  }, [runs, weights, profile, thisMonth, monthPhotos]);

  // Fetch AI recap on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/rt/recap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileName: profile.name,
            monthLabel,
            achievementCount: 0,
            ...stats,
          }),
        });
        const data = await res.json();
        if (!cancelled) {
          setRecap(data);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setRecap({
            headline: `📊 Tổng kết ${monthLabel}`,
            narrative: `Tháng này bạn đã chạy ${stats.totalKm} km trong ${stats.totalRuns} buổi. Tiếp tục phát nhé!`,
            highlights: [],
          });
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [profile.name, monthLabel, stats]);

  // Slideshow auto-advance
  useEffect(() => {
    if (!playing || !monthPhotos || monthPhotos.length === 0) return;
    const t = setInterval(() => {
      setSlideIdx((i) => (i + 1) % monthPhotos.length);
    }, 3000);
    return () => clearInterval(t);
  }, [playing, monthPhotos]);

  const hasPhotos = monthPhotos && monthPhotos.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-lift"
      >
        {/* gradient hero header */}
        <div className="relative overflow-hidden grad-primary px-5 py-5 text-white">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Tổng kết tháng · {monthLabel}</p>
            {loading ? (
              <div className="mt-2 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium opacity-90">AI đang kể chuyện...</span>
              </div>
            ) : (
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{recap?.headline}</h2>
            )}
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto">
          {/* Photo slideshow */}
          {hasPhotos && (
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              <AnimatePresence mode="wait">
                <motion.img
                  key={slideIdx}
                  src={monthPhotos![slideIdx]?.dataUrl}
                  alt="Kỉ niệm"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 h-full w-full object-cover"
                  onClick={() => setLightbox(slideIdx)}
                />
              </AnimatePresence>
              {/* gradient + caption overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                  {slideIdx + 1} / {monthPhotos!.length}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); }}
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
                  aria-label={playing ? "Tạm dừng" : "Phát"}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
              </div>
              {/* dots */}
              {monthPhotos!.length > 1 && (
                <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 gap-1">
                  {monthPhotos!.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setSlideIdx(i); }}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === slideIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"
                      )}
                      aria-label={`Ảnh ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2 p-4">
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="text-[9px] font-semibold uppercase text-muted-foreground">Tổng km</p>
              <p className="text-lg font-extrabold tnum">{stats.totalKm}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="text-[9px] font-semibold uppercase text-muted-foreground">Buổi</p>
              <p className="text-lg font-extrabold tnum">{stats.totalRuns}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="text-[9px] font-semibold uppercase text-muted-foreground">Calo</p>
              <p className="text-lg font-extrabold tnum">{stats.totalCalories}</p>
            </div>
          </div>

          {/* AI narrative */}
          {!loading && recap && (
            <div className="px-4 pb-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3 w-3" /> AI kể chuyện
                </p>
                <p className="text-sm leading-relaxed text-foreground">{recap.narrative}</p>
              </div>
              {recap.highlights.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {recap.highlights.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
                    >
                      <span className="text-base">{h.match(/^(\S+)/)?.[1] ?? "•"}</span>
                      <span className="text-foreground">{h.replace(/^\S+\s*/, "")}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* lightbox */}
        <AnimatePresence>
          {lightbox !== null && monthPhotos && monthPhotos[lightbox] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4"
              onClick={() => setLightbox(null)}
            >
              <motion.img
                key={monthPhotos[lightbox].id}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.85 }}
                src={monthPhotos[lightbox].dataUrl}
                alt="Kỉ niệm"
                className="max-h-[90vh] max-w-full rounded-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
