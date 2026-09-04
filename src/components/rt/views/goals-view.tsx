"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Flag,
  Footprints,
  Save,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/rt/db";
import type { Profile, RunSession, UnitSystem, WeightEntry } from "@/lib/rt/types";
import { computeStats, type DashboardStats } from "@/lib/rt/insights";
import { useRtStore } from "@/store/rt-store";
import {
  displayDistance,
  displayWeight,
  distanceLabel,
  fmtNum,
  parseWeightInput,
  round,
  weightLabel,
} from "@/lib/rt/utils";
import { currentWeekKeys } from "@/lib/rt/dates";

import { CountUp } from "@/components/rt/shared/count-up";
import { ProgressRing } from "@/components/rt/shared/progress-ring";
import { SectionCard } from "@/components/rt/shared/section-card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function GoalsView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);

  const profile = useLiveQuery<Profile | undefined>(
    async () => (activeProfileId ? await db.profiles.get(activeProfileId) : undefined),
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

  // Compute this-week run count before the loading guard (hooks must run unconditionally).
  const runsThisWeekCount = useMemo(() => {
    if (!runs) return 0;
    const keys = new Set(currentWeekKeys());
    return runs.filter((r) => keys.has(r.date)).length;
  }, [runs]);

  // Loading guard — Dexie queries still resolving.
  if (!activeProfileId || !profile || runs === undefined || weights === undefined) {
    return <GoalsSkeleton />;
  }

  const stats = computeStats(profile, runs, weights);

  return (
    <div className="space-y-5 sm:space-y-6">
      <GoalsHeader />

      <WeightGoalCard
        profile={profile}
        stats={stats}
        unitSystem={unitSystem}
      />

      <WeeklyKmGoalCard
        stats={stats}
        runsThisWeekCount={runsThisWeekCount}
        unitSystem={unitSystem}
      />

      <GoalEditorCard
        profile={profile}
        profileId={activeProfileId}
        unitSystem={unitSystem}
      />

      <MilestonesStrip stats={stats} unitSystem={unitSystem} />
    </div>
  );
}

/* ============================ Skeleton ============================ */

function GoalsSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="h-20 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-52 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-40 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-56 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-20 animate-pulse rounded-3xl bg-muted/60" />
    </div>
  );
}

/* ============================ Header ============================ */

function GoalsHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="flex items-center gap-3"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Flag className="h-5 w-5" />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          <span className="text-grad-primary">Mục tiêu</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Cân nặng, quãng đường và những cột mốc đáng nhớ.
        </p>
      </div>
    </motion.div>
  );
}

/* ============================ Weight goal card ============================ */

function WeightGoalCard({
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
  const lostDisplay = displayWeight(Math.abs(stats.weightLost), unitSystem, 1);
  const remainingKg = Math.abs(currentWeight - profile.targetWeight);
  const remainingDisplay = displayWeight(remainingKg, unitSystem, 1);

  const noGoal =
    stats.weightStart != null &&
    Math.abs(stats.weightStart - profile.targetWeight) < 0.01;
  const achieved = stats.weightGoalPct >= 100 && !noGoal;
  const lost = stats.weightLost > 0.05;
  const gained = stats.weightLost < -0.05;

  return (
    <SectionCard
      title="Mục tiêu cân nặng"
      subtitle="Tiến độ tới số cân mong muốn"
      icon={<Scale className="h-4 w-4" />}
      delay={0.02}
    >
      {noGoal ? (
        <NoGoalPrompt />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <ProgressRing
            value={stats.weightGoalPct}
            size={150}
            stroke={14}
            fromColor="var(--brand-mint)"
            toColor="var(--brand-cyan)"
            gradientId="goals-weight-ring"
            className="shrink-0"
          >
            <div className="flex flex-col items-center px-2 text-center">
              <CountUp
                value={stats.weightGoalPct}
                suffix="%"
                className="text-3xl font-extrabold tracking-tight text-grad-primary"
              />
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                tiến độ
              </span>
            </div>
          </ProgressRing>

          <div className="grid w-full flex-1 grid-cols-2 gap-3">
            <MiniStat label="Hiện tại" value={currentDisplay} suffix={` ${unit}`} />
            <MiniStat label="Mục tiêu" value={targetDisplay} suffix={` ${unit}`} />
            <MiniStat
              label={lost ? "Đã giảm" : gained ? "Đã tăng" : "Chưa thay đổi"}
              value={lost || gained ? lostDisplay : 0}
              suffix={` ${unit}`}
              icon={
                lost ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : gained ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : undefined
              }
              accent={lost ? "good" : gained ? "warn" : "muted"}
            />
            <MiniStat
              label={achieved ? "Đã chạm đích" : "Còn lại"}
              value={achieved ? 0 : remainingDisplay}
              suffix={` ${unit}`}
              accent={achieved ? "good" : "muted"}
            />
          </div>
        </div>
      )}

      {/* ETA chip + encouraging copy */}
      {!noGoal && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {stats.weightEtaWeeks != null && !achieved && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <CalendarClock className="h-3.5 w-3.5" />
              ước tính ≈ {stats.weightEtaWeeks} tuần nữa
            </span>
          )}
          {achieved && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
              <Sparkles className="h-3.5 w-3.5" />
              Bạn đã đạt mục tiêu! Tiếp tục duy trì nhé.
            </span>
          )}
          <p className="text-xs text-muted-foreground">
            {achieved
              ? "Mỗi buổi chạy đều giúp bạn giữ vững thành quả."
              : stats.weightEtaWeeks != null
                ? "Giữ nhịp hiện tại, bạn sẽ tới đích đúng hạn."
                : "Hãy ghi cân nặng đều để ước tính thời gian tới đích."}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

function NoGoalPrompt() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-7 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Target className="h-5 w-5" />
      </span>
      <h3 className="text-base font-bold">Chưa đặt mục tiêu cân nặng</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Đặt cân nặng mục tiêu ở phần chỉnh sửa bên dưới để bắt đầu theo dõi tiến
        độ và nhận ước tính thời gian đạt được.
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  suffix = "",
  icon,
  accent = "muted",
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
  accent?: "muted" | "good" | "warn";
}) {
  const tone =
    accent === "good"
      ? "text-emerald-500"
      : accent === "warn"
        ? "text-[color:var(--brand-amber)]"
        : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 flex items-baseline gap-0.5", tone)}>
        <span className="text-xl font-extrabold tracking-tight tnum">
          <CountUp value={value} decimals={1} suffix={suffix} />
        </span>
      </div>
    </div>
  );
}

/* ============================ Weekly km goal card ============================ */

function WeeklyKmGoalCard({
  stats,
  runsThisWeekCount,
  unitSystem,
}: {
  stats: DashboardStats;
  runsThisWeekCount: number;
  unitSystem: UnitSystem;
}) {
  const distUnit = distanceLabel(unitSystem);
  const weekKmDisplay = displayDistance(stats.weekKm, unitSystem, 1);
  const goalKmDisplay = displayDistance(stats.goalKm, unitSystem, 1);
  const isHigh = stats.goalPct >= 80;
  const isDone = stats.goalPct >= 100;
  const barClass = isHigh ? "grad-energy" : "grad-primary";

  return (
    <SectionCard
      title="Mục tiêu km/tuần"
      subtitle="Quãng đường chạy trong tuần này"
      icon={<Footprints className="h-4 w-4" />}
      delay={0.06}
    >
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight tnum sm:text-4xl">
                <CountUp value={stats.goalPct} suffix="%" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                của mục tiêu
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Tuần này:{" "}
              <span className="font-semibold text-foreground tnum">
                {fmtNum(weekKmDisplay, 1)}
              </span>{" "}
              / {fmtNum(goalKmDisplay, 1)} {distUnit}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              <Footprints className="h-3.5 w-3.5" />
              {runsThisWeekCount} buổi chạy
            </span>
            <div
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl text-white shadow-soft",
                barClass
              )}
            >
              <Target className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${stats.goalPct}%` }}
            viewport={{ once: true, margin: "-6% 0px" }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              barClass,
              isDone && "shadow-glow"
            )}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {isDone
            ? "🎉 Đạt mục tiêu tuần! Bạn có thể nâng mục tiêu lên một chút."
            : isHigh
              ? "Gần tới đích rồi, giữ nhịp nhé!"
              : stats.goalPct > 0
                ? "Mỗi bước đều đưa bạn tới gần hơn."
                : "Hãy ghi buổi chạy đầu tiên trong tuần để bắt đầu."}
        </p>
      </div>
    </SectionCard>
  );
}

/* ============================ Goal editor card ============================ */

function GoalEditorCard({
  profile,
  profileId,
  unitSystem,
}: {
  profile: Profile;
  profileId: string;
  unitSystem: UnitSystem;
}) {
  const wUnit = weightLabel(unitSystem);
  const dUnit = distanceLabel(unitSystem);

  const [targetInput, setTargetInput] = useState<number>(65);
  const [weeklyKm, setWeeklyKm] = useState<number>(20);
  const [saving, setSaving] = useState(false);
  const lastSyncedKey = useRef<string>("");

  // Sync local state from profile whenever profile.id or unitSystem changes.
  useEffect(() => {
    const key = `${profile.id}:${unitSystem}`;
    if (lastSyncedKey.current !== key) {
      setTargetInput(round(displayWeight(profile.targetWeight, unitSystem, 1), 1));
      setWeeklyKm(profile.targetKmPerWeek);
      lastSyncedKey.current = key;
    }
  }, [profile, unitSystem]);

  const currentDisplay = displayWeight(profile.currentWeight, unitSystem, 1);
  const diff = round(currentDisplay - targetInput, 1);
  const willLose = diff > 0.05;
  const willGain = diff < -0.05;
  const helperText = willLose
    ? `Sẽ giảm ${fmtNum(diff, 1)} ${wUnit} so với hiện tại ✨`
    : willGain
      ? `Sẽ tăng ${fmtNum(Math.abs(diff), 1)} ${wUnit} so với hiện tại 💪`
      : "Giữ nguyên cân nặng hiện tại";

  async function handleSave() {
    setSaving(true);
    try {
      await db.profiles.update(profileId, {
        targetWeight: parseWeightInput(targetInput, unitSystem),
        targetKmPerWeek: weeklyKm,
      });
      toast.success("Đã cập nhật mục tiêu 🎯");
    } catch {
      toast.error("Không lưu được mục tiêu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Chỉnh sửa mục tiêu"
      subtitle="Kéo thanh trượt để đặt mục tiêu mới"
      icon={<Target className="h-4 w-4" />}
      delay={0.1}
      action={
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 border-transparent text-white shadow-soft grad-primary hover:opacity-90"
          size="sm"
        >
          <Save className="h-4 w-4" />
          {saving ? "Đang lưu…" : "Lưu mục tiêu"}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Target weight slider */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cân nặng mục tiêu
            </label>
            <span className="tnum text-lg font-bold text-grad-primary">
              {fmtNum(targetInput, 1)} {wUnit}
            </span>
          </div>
          <Slider
            value={[targetInput]}
            onValueChange={(v) => setTargetInput(v[0])}
            min={30}
            max={180}
            step={0.1}
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>30</span>
            <span>180 {wUnit}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={helperText}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "mt-2 text-xs font-medium",
                willLose
                  ? "text-emerald-500"
                  : willGain
                    ? "text-[color:var(--brand-amber)]"
                    : "text-muted-foreground"
              )}
            >
              {helperText}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Weekly km slider */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mục tiêu km / tuần
            </label>
            <span className="tnum text-lg font-bold">
              {weeklyKm} {dUnit}
            </span>
          </div>
          <Slider
            value={[weeklyKm]}
            onValueChange={(v) => setWeeklyKm(v[0])}
            min={0}
            max={80}
            step={1}
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>80 {dUnit}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {weeklyKm === 0
              ? "Chưa đặt mục tiêu"
              : weeklyKm < 15
                ? "Khởi động nhẹ nhàng"
                : weeklyKm < 30
                  ? "Nhịp độ vững vàng"
                  : weeklyKm < 50
                    ? "Người chạy nghiêm túc"
                    : "Chiến binh đường dài!"}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ============================ Milestones strip ============================ */

interface Milestone {
  id: string;
  label: string;
  reached: boolean;
}

function MilestonesStrip({
  stats,
  unitSystem,
}: {
  stats: DashboardStats;
  unitSystem: UnitSystem;
}) {
  const wUnit = weightLabel(unitSystem);
  const dUnit = distanceLabel(unitSystem);
  const lostDisplay = displayWeight(Math.abs(stats.weightLost), unitSystem, 1);

  const milestones: Milestone[] = useMemo(
    () => [
      {
        id: "w1",
        label: `−1 ${wUnit}`,
        reached: stats.weightLost >= 1,
      },
      {
        id: "w5",
        label: `−5 ${wUnit}`,
        reached: stats.weightLost >= 5,
      },
      {
        id: "wk10",
        label: `10 ${dUnit}/tuần`,
        reached: displayDistance(stats.weekKm, unitSystem, 1) >= 10,
      },
      {
        id: "t50",
        label: `Tổng 50 ${dUnit}`,
        reached: displayDistance(stats.totalKm, unitSystem, 1) >= 50,
      },
      {
        id: "t100",
        label: `Tổng 100 ${dUnit}`,
        reached: displayDistance(stats.totalKm, unitSystem, 1) >= 100,
      },
      {
        id: "s7",
        label: "Streak 7",
        reached: stats.streak >= 7,
      },
    ],
    [stats.weightLost, stats.weekKm, stats.totalKm, stats.streak, wUnit, dUnit, unitSystem]
  );

  const reachedCount = milestones.filter((m) => m.reached).length;

  return (
    <SectionCard
      title="Cột mốc"
      subtitle={`${reachedCount}/${milestones.length} đã đạt`}
      icon={<Flag className="h-4 w-4" />}
      delay={0.14}
      contentClassName="space-y-3"
    >
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {milestones.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-6% 0px" }}
            transition={{ duration: 0.4, ease: EASE }}
            whileHover={{ y: -2 }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              m.reached
                ? "border-transparent text-white shadow-soft grad-primary"
                : "border-border/70 bg-muted/40 text-muted-foreground"
            )}
          >
            {m.reached ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : (
              <Flag className="h-3.5 w-3.5 opacity-60" />
            )}
            {m.label}
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {stats.weightLost > 0
          ? `Bạn đã giảm ${fmtNum(lostDisplay, 1)} ${wUnit}. `
          : ""}
        Tiếp tục ghi chạy và cân nặng để mở khoá thêm cột mốc.
      </p>
    </SectionCard>
  );
}
