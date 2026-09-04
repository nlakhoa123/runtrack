"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import {
  Activity,
  Crown,
  Flame,
  Footprints,
  Route,
  Scale,
  Sparkles,
  Swords,
  Target,
  Trophy,
  TrendingDown,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { db } from "@/lib/rt/db";
import { currentWeekKeys, fmtDate } from "@/lib/rt/dates";
import { computeStats, sumKm, type DashboardStats } from "@/lib/rt/insights";
import type { Profile, RunSession, UnitSystem, WeightEntry } from "@/lib/rt/types";
import {
  displayDistance,
  displayWeight,
  distanceLabel,
  fmtNum,
  round,
  weightLabel,
} from "@/lib/rt/utils";
import { useRtStore } from "@/store/rt-store";

import { CountUp } from "@/components/rt/shared/count-up";
import { EmptyState } from "@/components/rt/shared/empty-state";
import { ProfileAvatar } from "@/components/rt/shared/profile-avatar";
import { SectionCard } from "@/components/rt/shared/section-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ChartPoint {
  date: string;
  a: number | null;
  b: number | null;
}

interface MetricRow {
  id: string;
  label: string;
  icon: React.ReactNode;
  rawA: number;
  rawB: number;
  /** Already unit-converted, formatted display string for A and B */
  displayA: string;
  displayB: string;
  /** higher raw value wins (true) or lower (false) */
  higherWins: boolean;
}

export default function CompareView() {
  const unitSystem = useRtStore((s) => s.unitSystem);
  const setActiveProfile = useRtStore((s) => s.setActiveProfile);

  const profiles = useLiveQuery<Profile[]>(
    async () => await db.profiles.orderBy("createdAt").toArray(),
    []
  );

  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);

  // Derive the effective selected ids purely from current state — no setState
  // in effects. Defaults to the first two profiles, recovers from deletion,
  // and prevents both pickers from resolving to the same profile.
  const { effectiveAId, effectiveBId } = useMemo<{
    effectiveAId: string | null;
    effectiveBId: string | null;
  }>(() => {
    if (!profiles || profiles.length < 2) {
      return { effectiveAId: null, effectiveBId: null };
    }
    const exists = (id: string | null): id is string =>
      !!id && profiles.some((p) => p.id === id);
    let outA: string | null = exists(aId) ? aId : null;
    let outB: string | null = exists(bId) ? bId : null;
    if (!outA && !outB) {
      outA = profiles[0].id;
      outB = profiles[1].id;
    } else if (!outA) {
      outA = profiles.find((p) => p.id !== outB)?.id ?? profiles[0].id;
    } else if (!outB) {
      outB = profiles.find((p) => p.id !== outA)?.id ?? profiles[1].id;
    }
    if (outA === outB) {
      outB = profiles.find((p) => p.id !== outA)?.id ?? profiles[1].id;
    }
    return { effectiveAId: outA, effectiveBId: outB };
  }, [profiles, aId, bId]);

  // Always call all hooks (unconditionally) before any early returns.
  const aRuns = useLiveQuery<RunSession[]>(
    async () => {
      if (!effectiveAId) return [];
      const list = await db.runs.where("profileId").equals(effectiveAId).toArray();
      return list as RunSession[];
    },
    [effectiveAId]
  );
  const aWeights = useLiveQuery<WeightEntry[]>(
    async () => {
      if (!effectiveAId) return [];
      const list = await db.weights
        .where("profileId")
        .equals(effectiveAId)
        .sortBy("createdAt");
      return list as WeightEntry[];
    },
    [effectiveAId]
  );
  const bRuns = useLiveQuery<RunSession[]>(
    async () => {
      if (!effectiveBId) return [];
      const list = await db.runs.where("profileId").equals(effectiveBId).toArray();
      return list as RunSession[];
    },
    [effectiveBId]
  );
  const bWeights = useLiveQuery<WeightEntry[]>(
    async () => {
      if (!effectiveBId) return [];
      const list = await db.weights
        .where("profileId")
        .equals(effectiveBId)
        .sortBy("createdAt");
      return list as WeightEntry[];
    },
    [effectiveBId]
  );

  // Loading guard — Dexie still resolving.
  if (!profiles) {
    return <CompareSkeleton />;
  }

  // Need at least two profiles.
  if (profiles.length < 2) {
    return (
      <EmptyState
        emoji="👥"
        title="Cần ít nhất 2 hồ sơ"
        text="Thêm hồ sơ thứ hai để so sánh."
        action={
          <Button
            onClick={() => setActiveProfile(null)}
            className="gap-1.5 rounded-full text-white shadow-soft grad-primary transition-shadow hover:shadow-glow"
          >
            <Users className="size-4" /> Thêm hồ sơ
          </Button>
        }
      />
    );
  }

  const aProfile = profiles.find((p) => p.id === effectiveAId) ?? profiles[0];
  const bProfile = profiles.find((p) => p.id === effectiveBId) ?? profiles[1];

  // If either set of runs/weights is still resolving, render skeleton.
  const stillLoading =
    aRuns === undefined ||
    aWeights === undefined ||
    bRuns === undefined ||
    bWeights === undefined;
  if (stillLoading) {
    return <CompareSkeleton />;
  }

  return (
    <CompareContent
      aProfile={aProfile}
      bProfile={bProfile}
      aRuns={aRuns}
      aWeights={aWeights}
      bRuns={bRuns}
      bWeights={bWeights}
      profiles={profiles}
      unitSystem={unitSystem}
      currentAId={effectiveAId ?? aProfile.id}
      currentBId={effectiveBId ?? bProfile.id}
      onPickA={setAId}
      onPickB={setBId}
    />
  );
}

/* ============================ Content shell ============================ */

interface CompareContentProps {
  aProfile: Profile;
  bProfile: Profile;
  aRuns: RunSession[];
  aWeights: WeightEntry[];
  bRuns: RunSession[];
  bWeights: WeightEntry[];
  profiles: Profile[];
  unitSystem: UnitSystem;
  currentAId: string;
  currentBId: string;
  onPickA: (id: string) => void;
  onPickB: (id: string) => void;
}

function CompareContent({
  aProfile,
  bProfile,
  aRuns,
  aWeights,
  bRuns,
  bWeights,
  profiles,
  unitSystem,
  currentAId,
  currentBId,
  onPickA,
  onPickB,
}: CompareContentProps) {
  const aStats = useMemo(
    () => computeStats(aProfile, aRuns, aWeights),
    [aProfile, aRuns, aWeights]
  );
  const bStats = useMemo(
    () => computeStats(bProfile, bRuns, bWeights),
    [bProfile, bRuns, bWeights]
  );

  const weekKmA = useMemo(
    () => round(sumKm(aRuns, currentWeekKeys()), 1),
    [aRuns]
  );
  const weekKmB = useMemo(
    () => round(sumKm(bRuns, currentWeekKeys()), 1),
    [bRuns]
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <CompareHeader />

      <ProfilePickerRow
        profiles={profiles}
        currentAId={currentAId}
        currentBId={currentBId}
        onPickA={onPickA}
        onPickB={onPickB}
      />

      <HeadToHeadCard
        aProfile={aProfile}
        bProfile={bProfile}
        weekKmA={weekKmA}
        weekKmB={weekKmB}
        unitSystem={unitSystem}
      />

      <RaceBarSection
        aProfile={aProfile}
        bProfile={bProfile}
        aStats={aStats}
        bStats={bStats}
        unitSystem={unitSystem}
      />

      <WeightTrendSection
        aProfile={aProfile}
        bProfile={bProfile}
        aWeights={aWeights}
        bWeights={bWeights}
        unitSystem={unitSystem}
      />

      <SideBySideStats
        aProfile={aProfile}
        bProfile={bProfile}
        aStats={aStats}
        bStats={bStats}
        unitSystem={unitSystem}
      />
    </div>
  );
}

/* ============================ Skeleton ============================ */

function CompareSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="h-20 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-16 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-44 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-80 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-56 animate-pulse rounded-3xl bg-muted/60" />
    </div>
  );
}

/* ============================ Header ============================ */

function CompareHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="flex items-center gap-3"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Swords className="h-5 w-5" />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          <span className="text-grad-primary">So sánh đối đầu</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Hai hồ sơ — một đường đua. Xem ai đang vượt lên.
        </p>
      </div>
    </motion.div>
  );
}

/* ============================ Profile pickers ============================ */

function ProfilePickerRow({
  profiles,
  currentAId,
  currentBId,
  onPickA,
  onPickB,
}: {
  profiles: Profile[];
  currentAId: string;
  currentBId: string;
  onPickA: (id: string) => void;
  onPickB: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.04 }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <ProfilePicker
        label="Hồ sơ A"
        accentClass="text-[color:var(--brand-teal)] bg-[color:var(--brand-teal)]/10"
        profiles={profiles}
        value={currentAId}
        excludeId={currentBId}
        onPick={onPickA}
      />
      <ProfilePicker
        label="Hồ sơ B"
        accentClass="text-[color:var(--brand-coral)] bg-[color:var(--brand-coral)]/10"
        profiles={profiles}
        value={currentBId}
        excludeId={currentAId}
        onPick={onPickB}
      />
    </motion.div>
  );
}

function ProfilePicker({
  label,
  accentClass,
  profiles,
  value,
  excludeId,
  onPick,
}: {
  label: string;
  accentClass: string;
  profiles: Profile[];
  value: string;
  excludeId: string;
  onPick: (id: string) => void;
}) {
  const current = profiles.find((p) => p.id === value);
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card p-2.5 shadow-soft">
      <span
        className={cn(
          "rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
          accentClass
        )}
      >
        {label}
      </span>
      <Select value={value} onValueChange={onPick}>
        <SelectTrigger
          size="sm"
          className="h-9 flex-1 border-transparent bg-transparent px-1.5 text-sm font-semibold shadow-none focus-visible:ring-0"
        >
          {current ? (
            <span className="flex min-w-0 items-center gap-2">
              <ProfileAvatar
                colorId={current.avatarColor}
                name={current.name}
                size={22}
                className="!rounded-lg"
              />
              <span className="truncate">{current.name}</span>
            </span>
          ) : (
            <SelectValue placeholder="Chọn hồ sơ" />
          )}
        </SelectTrigger>
        <SelectContent>
          {profiles.map((p) => {
            const disabled = p.id === excludeId;
            return (
              <SelectItem
                key={p.id}
                value={p.id}
                disabled={disabled}
                className="data-[disabled]:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ProfileAvatar
                    colorId={p.avatarColor}
                    name={p.name}
                    size={20}
                    className="!rounded-md"
                  />
                  <span className="truncate">{p.name}</span>
                  {disabled && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      · đang chọn
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ============================ Head-to-head card ============================ */

function HeadToHeadCard({
  aProfile,
  bProfile,
  weekKmA,
  weekKmB,
  unitSystem,
}: {
  aProfile: Profile;
  bProfile: Profile;
  weekKmA: number;
  weekKmB: number;
  unitSystem: UnitSystem;
}) {
  const distUnit = distanceLabel(unitSystem);
  const aDisplay = displayDistance(weekKmA, unitSystem, 1);
  const bDisplay = displayDistance(weekKmB, unitSystem, 1);
  const tie = Math.abs(weekKmA - weekKmB) < 0.05;
  const aLeads = weekKmA > weekKmB && !tie;
  const bLeads = weekKmB > weekKmA && !tie;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.06 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-12 h-44 w-44 rounded-full bg-[color:var(--brand-coral)]/10 blur-3xl" />

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        {/* Profile A */}
        <HeadToHeadSide
          profile={aProfile}
          value={aDisplay}
          unit={distUnit}
          isLeader={aLeads}
          isTie={tie}
          align="left"
          accentColor="var(--brand-teal)"
        />

        {/* VS badge */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="grid h-14 w-14 place-items-center rounded-full border border-border/70 bg-background shadow-soft"
          >
            <span className="text-base font-extrabold tracking-tight text-grad-primary">
              VS
            </span>
          </motion.div>
          <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            tuần này
          </span>
        </motion.div>

        {/* Profile B */}
        <HeadToHeadSide
          profile={bProfile}
          value={bDisplay}
          unit={distUnit}
          isLeader={bLeads}
          isTie={tie}
          align="right"
          accentColor="var(--brand-coral)"
        />
      </div>
    </motion.div>
  );
}

function HeadToHeadSide({
  profile,
  value,
  unit,
  isLeader,
  isTie,
  align,
  accentColor,
}: {
  profile: Profile;
  value: number;
  unit: string;
  isLeader: boolean;
  isTie: boolean;
  align: "left" | "right";
  accentColor: string;
}) {
  const isRight = align === "right";
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isRight ? "items-end text-right" : "items-start text-left"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          isRight && "flex-row-reverse"
        )}
      >
        <ProfileAvatar
          colorId={profile.avatarColor}
          name={profile.name}
          size={44}
          ring={isLeader}
        />
        <div className={cn("min-w-0", isRight && "text-right")}>
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold tracking-tight">
              {profile.name}
            </span>
            {isLeader && (
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, duration: 0.45, ease: EASE }}
                className="grid h-5 w-5 place-items-center rounded-full bg-amber-400/20 text-amber-500"
              >
                <Crown className="size-3.5" />
              </motion.span>
            )}
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: accentColor }}
          >
            {isLeader ? "Đang dẫn đầu" : isTie ? "Hoà" : "Đang theo sau"}
          </span>
        </div>
      </div>

      <div className={cn("flex items-baseline gap-1", isRight && "flex-row-reverse")}>
        <span className="text-3xl font-extrabold tracking-tight tnum sm:text-4xl">
          <CountUp value={value} decimals={1} />
        </span>
        <span className="text-xs font-semibold text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

/* ============================ Race-bar section ============================ */

function RaceBarSection({
  aProfile,
  bProfile,
  aStats,
  bStats,
  unitSystem,
}: {
  aProfile: Profile;
  bProfile: Profile;
  aStats: DashboardStats;
  bStats: DashboardStats;
  unitSystem: UnitSystem;
}) {
  const distUnit = distanceLabel(unitSystem);
  const wUnit = weightLabel(unitSystem);

  const metrics: MetricRow[] = useMemo(() => {
    const aWeekKm = displayDistance(aStats.weekKm, unitSystem, 1);
    const bWeekKm = displayDistance(bStats.weekKm, unitSystem, 1);
    const aTotalKm = displayDistance(aStats.totalKm, unitSystem, 1);
    const bTotalKm = displayDistance(bStats.totalKm, unitSystem, 1);
    const aLostKg = displayWeight(Math.abs(aStats.weightLost), unitSystem, 1);
    const bLostKg = displayWeight(Math.abs(bStats.weightLost), unitSystem, 1);
    return [
      {
        id: "week",
        label: "Tuần này",
        icon: <Footprints className="size-3.5" />,
        rawA: aStats.weekKm,
        rawB: bStats.weekKm,
        displayA: `${fmtNum(aWeekKm, 1)} ${distUnit}`,
        displayB: `${fmtNum(bWeekKm, 1)} ${distUnit}`,
        higherWins: true,
      },
      {
        id: "total",
        label: "Tổng km",
        icon: <Route className="size-3.5" />,
        rawA: aStats.totalKm,
        rawB: bStats.totalKm,
        displayA: `${fmtNum(aTotalKm, 1)} ${distUnit}`,
        displayB: `${fmtNum(bTotalKm, 1)} ${distUnit}`,
        higherWins: true,
      },
      {
        id: "streak",
        label: "Chuỗi ngày",
        icon: <Flame className="size-3.5" />,
        rawA: aStats.streak,
        rawB: bStats.streak,
        displayA: `${fmtNum(aStats.streak, 0)} ngày`,
        displayB: `${fmtNum(bStats.streak, 0)} ngày`,
        higherWins: true,
      },
      {
        id: "calo",
        label: "Calo tuần",
        icon: <Flame className="size-3.5" />,
        rawA: aStats.caloriesThisWeek,
        rawB: bStats.caloriesThisWeek,
        displayA: `${fmtNum(aStats.caloriesThisWeek, 0)} kcal`,
        displayB: `${fmtNum(bStats.caloriesThisWeek, 0)} kcal`,
        higherWins: true,
      },
      {
        id: "lost",
        label: "Đã giảm",
        icon: <TrendingDown className="size-3.5" />,
        rawA: Math.max(0, aStats.weightLost),
        rawB: Math.max(0, bStats.weightLost),
        displayA: `${fmtNum(aLostKg, 1)} ${wUnit}`,
        displayB: `${fmtNum(bLostKg, 1)} ${wUnit}`,
        higherWins: true,
      },
    ];
  }, [aStats, bStats, unitSystem, distUnit, wUnit]);

  return (
    <SectionCard
      title="Đua tuần này"
      subtitle="Càng dài càng dẫn — cập nhật từng nấc"
      icon={<Swords className="size-4" />}
      delay={0.08}
      contentClassName="space-y-4"
    >
      {metrics.map((m, idx) => (
        <RaceMetric
          key={m.id}
          metric={m}
          aProfile={aProfile}
          bProfile={bProfile}
          delay={0.1 + idx * 0.05}
        />
      ))}
    </SectionCard>
  );
}

function RaceMetric({
  metric,
  aProfile,
  bProfile,
  delay,
}: {
  metric: MetricRow;
  aProfile: Profile;
  bProfile: Profile;
  delay: number;
}) {
  const max = Math.max(metric.rawA, metric.rawB, 0.0001);
  const tie = Math.abs(metric.rawA - metric.rawB) < 0.0001;
  const aWins = !tie && (metric.higherWins ? metric.rawA > metric.rawB : metric.rawA < metric.rawB);
  const bWins = !tie && (metric.higherWins ? metric.rawB > metric.rawA : metric.rawB < metric.rawA);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
          {metric.icon}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {metric.label}
        </span>
        {tie && metric.rawA > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Sparkles className="size-3" /> Hoà
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <RaceBar
          profile={aProfile}
          display={metric.displayA}
          pct={(metric.rawA / max) * 100}
          isWinner={aWins}
          delay={delay}
          accentColor="var(--brand-teal)"
        />
        <RaceBar
          profile={bProfile}
          display={metric.displayB}
          pct={(metric.rawB / max) * 100}
          isWinner={bWins}
          delay={delay + 0.08}
          accentColor="var(--brand-coral)"
        />
      </div>
    </div>
  );
}

function RaceBar({
  profile,
  display,
  pct,
  isWinner,
  delay,
  accentColor,
}: {
  profile: Profile;
  display: string;
  pct: number;
  isWinner: boolean;
  delay: number;
  accentColor: string;
}) {
  // Clamp width so even tiny values are visible (min 2%) and zero shows nothing.
  const width = pct <= 0 ? 0 : Math.max(2, Math.min(100, pct));

  return (
    <div className="flex items-center gap-2.5">
      <ProfileAvatar
        colorId={profile.avatarColor}
        name={profile.name}
        size={26}
        className="!rounded-lg shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-foreground/90">
            {profile.name}
          </span>
          <span className="tnum text-xs font-bold">{display}</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${width}%` }}
            viewport={{ once: true, margin: "-6% 0px" }}
            transition={{ duration: 1.1, ease: EASE, delay }}
            className={cn(
              "absolute inset-y-0 left-0 flex items-center justify-end rounded-full",
              isWinner ? "grad-energy shadow-glow" : "bg-muted-foreground/30"
            )}
            style={
              !isWinner
                ? { backgroundColor: `color-mix(in oklch, ${accentColor} 25%, transparent)` }
                : undefined
            }
          >
            {isWinner && width > 16 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: delay + 0.4, duration: 0.3, ease: EASE }}
                className="mr-1 grid h-5 w-5 place-items-center rounded-full bg-white/25 text-white backdrop-blur-sm"
              >
                <Trophy className="size-3" />
              </motion.span>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ============================ Weight trend chart ============================ */

function WeightTrendSection({
  aProfile,
  bProfile,
  aWeights,
  bWeights,
  unitSystem,
}: {
  aProfile: Profile;
  bProfile: Profile;
  aWeights: WeightEntry[];
  bWeights: WeightEntry[];
  unitSystem: UnitSystem;
}) {
  const unit = weightLabel(unitSystem);

  const data = useMemo<ChartPoint[]>(() => {
    return buildMergedWeightTimeline(aWeights, bWeights, unitSystem);
  }, [aWeights, bWeights, unitSystem]);

  const hasAny = data.some((d) => d.a !== null || d.b !== null);

  return (
    <SectionCard
      title="Xu hướng cân nặng"
      subtitle="Hai đường trên cùng một trục thời gian"
      icon={<Scale className="size-4" />}
      delay={0.12}
      action={
        <div className="hidden items-center gap-3 text-[11px] font-medium text-muted-foreground sm:flex">
          <LegendChip
            color="var(--brand-teal)"
            name={aProfile.name}
            avatarColor={aProfile.avatarColor}
          />
          <LegendChip
            color="var(--brand-coral)"
            name={bProfile.name}
            avatarColor={bProfile.avatarColor}
          />
        </div>
      }
    >
      {/* Mobile legend */}
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:hidden">
        <LegendChip
          color="var(--brand-teal)"
          name={aProfile.name}
          avatarColor={aProfile.avatarColor}
        />
        <LegendChip
          color="var(--brand-coral)"
          name={bProfile.name}
          avatarColor={bProfile.avatarColor}
        />
      </div>

      {!hasAny ? (
        <div className="grid h-[280px] place-items-center rounded-2xl border border-dashed border-border bg-muted/30 text-center">
          <div className="px-6">
            <Scale className="mx-auto mb-2 size-7 text-muted-foreground/70" />
            <p className="text-sm font-semibold">Chưa có dữ liệu cân nặng</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cả hai hồ sơ cần ghi cân nặng để hiển thị xu hướng đối đầu.
            </p>
          </div>
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 14, right: 14, left: -6, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
                opacity={0.6}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: string) => fmtDate(v, "d/M")}
                minTickGap={20}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                width={42}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) =>
                  v === 0 ? "0" : Math.abs(v) < 100 ? v.toFixed(0) : Math.round(v).toString()
                }
              />
              <Tooltip
                cursor={{ stroke: "var(--brand-teal)", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={(props: any) => (
                  <WeightTooltip
                    props={props}
                    aProfile={aProfile}
                    bProfile={bProfile}
                    unit={unit}
                  />
                )}
              />
              <Line
                type="stepAfter"
                dataKey="a"
                name={aProfile.name}
                stroke="var(--brand-teal)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, stroke: "var(--brand-teal)", strokeWidth: 2, fill: "var(--background)" }}
                connectNulls
                isAnimationActive
              />
              <Line
                type="stepAfter"
                dataKey="b"
                name={bProfile.name}
                stroke="var(--brand-coral)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, stroke: "var(--brand-coral)", strokeWidth: 2, fill: "var(--background)" }}
                connectNulls
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

function LegendChip({
  color,
  name,
  avatarColor,
}: {
  color: string;
  name: string;
  avatarColor: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-1">
      <ProfileAvatar
        colorId={avatarColor}
        name={name}
        size={16}
        className="!rounded-md"
      />
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="max-w-[7rem] truncate text-xs font-semibold">{name}</span>
    </span>
  );
}

function WeightTooltip({
  props,
  aProfile,
  bProfile,
  unit,
}: {
  props: any;
  aProfile: Profile;
  bProfile: Profile;
  unit: string;
}) {
  if (!props.active || !props.payload?.length) return null;
  const point = props.payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;
  const aVal = point.a;
  const bVal = point.b;

  return (
    <div className="min-w-[150px] rounded-xl border border-border/70 bg-popover/95 px-3 py-2 shadow-soft backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {fmtDate(point.date, "d MMM yyyy")}
      </div>
      <div className="mt-1.5 space-y-1">
        <TooltipRow
          color="var(--brand-teal)"
          name={aProfile.name}
          avatarColor={aProfile.avatarColor}
          value={aVal}
          unit={unit}
        />
        <TooltipRow
          color="var(--brand-coral)"
          name={bProfile.name}
          avatarColor={bProfile.avatarColor}
          value={bVal}
          unit={unit}
        />
      </div>
    </div>
  );
}

function TooltipRow({
  color,
  name,
  avatarColor,
  value,
  unit,
}: {
  color: string;
  name: string;
  avatarColor: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <ProfileAvatar
        colorId={avatarColor}
        name={name}
        size={16}
        className="!rounded-md"
      />
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
        {name}
      </span>
      <span className="tnum text-xs font-bold">
        {value == null ? "—" : `${fmtNum(value, 1)} ${unit}`}
      </span>
    </div>
  );
}

/* ============================ Side-by-side stats ============================ */

interface SideStat {
  id: string;
  label: string;
  icon: React.ReactNode;
  displayA: string;
  displayB: string;
  /** higher raw is better; null = no comparison (just informational) */
  betterIsHigher: boolean | null;
  rawA: number;
  rawB: number;
}

function SideBySideStats({
  aProfile,
  bProfile,
  aStats,
  bStats,
  unitSystem,
}: {
  aProfile: Profile;
  bProfile: Profile;
  aStats: DashboardStats;
  bStats: DashboardStats;
  unitSystem: UnitSystem;
}) {
  const wUnit = weightLabel(unitSystem);
  const dUnit = distanceLabel(unitSystem);

  const stats: SideStat[] = useMemo(() => {
    const aCurrent = aStats.weightCurrent ?? aProfile.currentWeight;
    const bCurrent = bStats.weightCurrent ?? bProfile.currentWeight;
    return [
      {
        id: "current",
        label: "Cân nặng hiện tại",
        icon: <Scale className="size-3.5" />,
        displayA: `${fmtNum(displayWeight(aCurrent, unitSystem, 1), 1)} ${wUnit}`,
        displayB: `${fmtNum(displayWeight(bCurrent, unitSystem, 1), 1)} ${wUnit}`,
        betterIsHigher: null,
        rawA: aCurrent,
        rawB: bCurrent,
      },
      {
        id: "target",
        label: "Cân nặng mục tiêu",
        icon: <Target className="size-3.5" />,
        displayA: `${fmtNum(displayWeight(aProfile.targetWeight, unitSystem, 1), 1)} ${wUnit}`,
        displayB: `${fmtNum(displayWeight(bProfile.targetWeight, unitSystem, 1), 1)} ${wUnit}`,
        betterIsHigher: null,
        rawA: aProfile.targetWeight,
        rawB: bProfile.targetWeight,
      },
      {
        id: "runs",
        label: "Tổng số buổi chạy",
        icon: <Footprints className="size-3.5" />,
        displayA: `${fmtNum(aStats.totalRuns, 0)}`,
        displayB: `${fmtNum(bStats.totalRuns, 0)}`,
        betterIsHigher: true,
        rawA: aStats.totalRuns,
        rawB: bStats.totalRuns,
      },
      {
        id: "totalKm",
        label: "Tổng quãng đường",
        icon: <Route className="size-3.5" />,
        displayA: `${fmtNum(displayDistance(aStats.totalKm, unitSystem, 1), 1)} ${dUnit}`,
        displayB: `${fmtNum(displayDistance(bStats.totalKm, unitSystem, 1), 1)} ${dUnit}`,
        betterIsHigher: true,
        rawA: aStats.totalKm,
        rawB: bStats.totalKm,
      },
      {
        id: "avgSpeed",
        label: "Tốc độ TB tuần này",
        icon: <Activity className="size-3.5" />,
        displayA: aStats.avgSpeedThisWeek > 0
          ? `${fmtNum(displayDistance(aStats.avgSpeedThisWeek, unitSystem, 1), 1)} ${dUnit}/h`
          : "—",
        displayB: bStats.avgSpeedThisWeek > 0
          ? `${fmtNum(displayDistance(bStats.avgSpeedThisWeek, unitSystem, 1), 1)} ${dUnit}/h`
          : "—",
        betterIsHigher: true,
        rawA: aStats.avgSpeedThisWeek,
        rawB: bStats.avgSpeedThisWeek,
      },
    ];
  }, [aProfile, bProfile, aStats, bStats, unitSystem, wUnit, dUnit]);

  return (
    <SectionCard
      title="So sánh chi tiết"
      subtitle="Ai hơn ai ở từng chỉ số"
      icon={<Activity className="size-4" />}
      delay={0.16}
      contentClassName="space-y-3"
    >
      {/* Header row with avatars */}
      <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-2 px-1 sm:gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Chỉ số
        </span>
        <div className="flex items-center justify-end gap-1.5">
          <ProfileAvatar
            colorId={aProfile.avatarColor}
            name={aProfile.name}
            size={20}
            className="!rounded-md"
          />
          <span className="max-w-[5rem] truncate text-xs font-bold sm:max-w-none">
            {aProfile.name}
          </span>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <ProfileAvatar
            colorId={bProfile.avatarColor}
            name={bProfile.name}
            size={20}
            className="!rounded-md"
          />
          <span className="max-w-[5rem] truncate text-xs font-bold sm:max-w-none">
            {bProfile.name}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {stats.map((s, idx) => (
          <SideStatRow key={s.id} stat={s} delay={0.18 + idx * 0.04} />
        ))}
      </div>

      <p className="px-1 pt-1 text-[11px] text-muted-foreground">
        <Sparkles className="mr-1 inline size-3 align-text-bottom text-primary" />
        Giá trị vượt trội được tô đậm và nhấn nền; cân nặng hiện tại &amp; mục tiêu
        không xếp hạng vì phụ hướng mục tiêu cá nhân.
      </p>
    </SectionCard>
  );
}

function SideStatRow({ stat, delay }: { stat: SideStat; delay: number }) {
  const comparable = stat.betterIsHigher !== null;
  const aVal = stat.rawA;
  const bVal = stat.rawB;
  const tie = comparable && Math.abs(aVal - bVal) < 0.0001;
  const aWins =
    comparable &&
    !tie &&
    stat.betterIsHigher
      ? aVal > bVal
      : comparable && !tie && !stat.betterIsHigher
        ? aVal < bVal
        : false;
  const bWins =
    comparable &&
    !tie &&
    stat.betterIsHigher
      ? bVal > aVal
      : comparable && !tie && !stat.betterIsHigher
        ? bVal < aVal
        : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-2.5 sm:gap-3 sm:p-3"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          {stat.icon}
        </span>
        <span className="truncate text-xs font-semibold text-muted-foreground sm:text-sm">
          {stat.label}
        </span>
      </div>

      <div
        className={cn(
          "flex items-center justify-end gap-1 rounded-lg px-2 py-1 text-right",
          aWins && "bg-emerald-500/10"
        )}
      >
        <span
          className={cn(
            "tnum text-sm font-bold sm:text-base",
            aWins ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
          )}
        >
          {stat.displayA}
        </span>
        {aWins && <Crown className="size-3.5 shrink-0 text-amber-500" />}
      </div>

      <div
        className={cn(
          "flex items-center justify-end gap-1 rounded-lg px-2 py-1 text-right",
          bWins && "bg-emerald-500/10"
        )}
      >
        <span
          className={cn(
            "tnum text-sm font-bold sm:text-base",
            bWins ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
          )}
        >
          {stat.displayB}
        </span>
        {bWins && <Crown className="size-3.5 shrink-0 text-amber-500" />}
      </div>
    </motion.div>
  );
}

/* ============================ Helpers ============================ */

/**
 * Build a merged timeline of weight entries across two profiles.
 * For each date in the union of both profiles' entry dates (sorted asc),
 * carry forward the last-known weight for each profile (or null before the first entry).
 */
function buildMergedWeightTimeline(
  a: WeightEntry[],
  b: WeightEntry[],
  unit: UnitSystem
): ChartPoint[] {
  const aSorted = [...a].sort((x, y) => x.date.localeCompare(y.date));
  const bSorted = [...b].sort((x, y) => x.date.localeCompare(y.date));

  const dateSet = new Set<string>();
  for (const w of aSorted) dateSet.add(w.date);
  for (const w of bSorted) dateSet.add(w.date);
  const allDates = Array.from(dateSet).sort();

  let aIdx = -1;
  let bIdx = -1;

  return allDates.map((date) => {
    while (aIdx + 1 < aSorted.length && aSorted[aIdx + 1].date <= date) {
      aIdx++;
    }
    while (bIdx + 1 < bSorted.length && bSorted[bIdx + 1].date <= date) {
      bIdx++;
    }
    return {
      date,
      a: aIdx >= 0 ? displayWeight(aSorted[aIdx].weightKg, unit, 1) : null,
      b: bIdx >= 0 ? displayWeight(bSorted[bIdx].weightKg, unit, 1) : null,
    };
  });
}
