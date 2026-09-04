"use client";

import { useMemo, useState } from "react";
import { db } from "@/lib/rt/db";
import type { Profile, WeightEntry } from "@/lib/rt/types";
import { useRtStore } from "@/store/rt-store";
import { useLiveQuery } from "dexie-react-hooks";
import { displayWeight, round, fmtNum } from "@/lib/rt/utils";
import { fmtDate } from "@/lib/rt/dates";
import { SectionCard } from "@/components/rt/shared/section-card";
import { EmptyState } from "@/components/rt/shared/empty-state";
import { CountUp } from "@/components/rt/shared/count-up";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MoreVertical,
  Plus,
  Scale,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChartPoint {
  date: string;
  weight: number;
  raw: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function WeightView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);
  const setQuickAdd = useRtStore((s) => s.setQuickAdd);

  const weights = useLiveQuery<WeightEntry[]>(
    async () => {
      if (!activeProfileId) return [];
      const list = await db.weights
        .where("profileId")
        .equals(activeProfileId)
        .sortBy("createdAt");
      return list as WeightEntry[];
    },
    [activeProfileId]
  );
  const profile = useLiveQuery<Profile | undefined>(
    async () => {
      if (!activeProfileId) return undefined;
      return db.profiles.get(activeProfileId);
    },
    [activeProfileId]
  );

  const [pendingDelete, setPendingDelete] = useState<WeightEntry | null>(null);

  const unitLabel = unitSystem === "metric" ? "kg" : "lbs";

  // weights from useLiveQuery is already sorted ascending by createdAt.
  const sorted = useMemo(() => {
    if (!weights) return undefined;
    return [...weights].sort((a, b) => a.createdAt - b.createdAt);
  }, [weights]);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!sorted) return [];
    return sorted.map((w) => ({
      date: w.date,
      weight: displayWeight(w.weightKg, unitSystem, 1),
      raw: w.weightKg,
    }));
  }, [sorted, unitSystem]);

  // targetDisplay needed by predictionData — compute a safe version before guards.
  const targetDisplaySafe = profile
    ? displayWeight(profile.targetWeight, unitSystem, 1)
    : 0;

  // Prediction line: project from the latest weight toward the target using
  // the average rate of change (kg per day) from first to latest entry.
  const predictionData = useMemo<{ date: string; weight: number }[]>(() => {
    if (!sorted || !profile || sorted.length < 2) return [];
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const daysElapsed = Math.max(1, Math.round((last.createdAt - first.createdAt) / 86400000));
    const kgPerDay = (last.weightKg - first.weightKg) / daysElapsed;
    const target = profile.targetWeight;
    const remaining = target - last.weightKg;
    const movingToward =
      (remaining < 0 && kgPerDay < -0.001) ||
      (remaining > 0 && kgPerDay > 0.001);
    if (!movingToward) return [];
    const daysToGoal = Math.round(remaining / kgPerDay);
    if (!isFinite(daysToGoal) || daysToGoal <= 0 || daysToGoal > 365) return [];
    const points: { date: string; weight: number }[] = [];
    const start = new Date(last.createdAt);
    const stepDays = Math.max(7, Math.round(daysToGoal / 6));
    for (let d = stepDays; d <= daysToGoal; d += stepDays) {
      const projected = new Date(start.getTime() + d * 86400000);
      const key = `${projected.getFullYear()}-${String(projected.getMonth() + 1).padStart(2, "0")}-${String(projected.getDate()).padStart(2, "0")}`;
      points.push({ date: key, weight: displayWeight(last.weightKg + kgPerDay * d, unitSystem, 1) });
    }
    const goalDate = new Date(start.getTime() + daysToGoal * 86400000);
    const goalKey = `${goalDate.getFullYear()}-${String(goalDate.getMonth() + 1).padStart(2, "0")}-${String(goalDate.getDate()).padStart(2, "0")}`;
    points.push({ date: goalKey, weight: targetDisplaySafe });
    return points;
  }, [sorted, profile, unitSystem, targetDisplaySafe]);

  // Merge actual + prediction into a single dataset for the chart.
  const mergedData = useMemo(() => {
    const actual = chartData.map((p) => ({
      date: p.date,
      actualWeight: p.weight,
      predictedWeight: null as number | null,
    }));
    if (predictionData.length === 0 || !sorted || sorted.length === 0) return actual;
    const last = sorted[sorted.length - 1];
    const bridge = {
      date: last.date,
      actualWeight: null as number | null,
      predictedWeight: displayWeight(last.weightKg, unitSystem, 1),
    };
    const pred = predictionData.map((p) => ({
      date: p.date,
      actualWeight: null as number | null,
      predictedWeight: p.weight,
    }));
    return [...actual, bridge, ...pred];
  }, [chartData, predictionData, sorted, unitSystem]);

  // Loading guard
  if (sorted === undefined || profile === undefined) {
    return <WeightSkeleton />;
  }

  // Empty state — at most one entry means no trend yet.
  if (sorted.length <= 1) {
    return (
      <EmptyState
        emoji="⚖️"
        title="Bắt đầu theo dõi cân nặng"
        text="Cân nặng đầu tiên đã được ghi. Hãy cập nhật đều để xem xu hướng!"
        action={
          <Button
            onClick={() => setQuickAdd("weight")}
            className="gap-1.5 rounded-full grad-primary text-white shadow-soft transition-shadow hover:shadow-glow"
          >
            <Plus className="size-4" /> Ghi cân nặng
          </Button>
        }
      />
    );
  }

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const latestDisplay = displayWeight(latest.weightKg, unitSystem, 1);
  const previousDisplay = previous
    ? displayWeight(previous.weightKg, unitSystem, 1)
    : latestDisplay;
  const diffDisplay = round(latestDisplay - previousDisplay, 1);

  // Direction toward goal: target < start means we want to lose weight (diff negative = good).
  const firstWeight = sorted[0]?.weightKg ?? latest.weightKg;
  const losingGoal = profile.targetWeight <= firstWeight;
  const diffGood = losingGoal ? diffDisplay < 0 : diffDisplay > 0;
  const diffNeutral = diffDisplay === 0;

  const targetDisplay = displayWeight(profile.targetWeight, unitSystem, 1);
  const remainingDisplay = round(latestDisplay - targetDisplay, 1);
  const reachedGoal = losingGoal
    ? latest.weightKg <= profile.targetWeight
    : latest.weightKg >= profile.targetWeight;
  // For "toward goal" semantics on remaining: if losingGoal and current>target → remaining positive (still to lose).
  // If gaining goal and current<target → remaining negative (still to gain). We display "Còn X {unit} nữa".
  const remainingAbs = Math.abs(remainingDisplay);

  const totalChange = round(
    displayWeight(latest.weightKg, unitSystem, 1) -
      displayWeight(firstWeight, unitSystem, 1),
    1
  );

  const handleDelete = async () => {
    if (!pendingDelete || !activeProfileId) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await db.weights.delete(target.id);
      // Re-sync profile.currentWeight to the new latest entry.
      const remaining = await db.weights
        .where("profileId")
        .equals(activeProfileId)
        .sortBy("createdAt");
      const newLatest = remaining[remaining.length - 1];
      if (newLatest) {
        await db.profiles.update(activeProfileId, {
          currentWeight: newLatest.weightKg,
        });
      }
      toast.success("Đã xoá mục cân nặng");
    } catch {
      toast.error("Không thể xoá mục cân nặng");
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero latest-weight card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="relative overflow-hidden rounded-3xl border border-white/10 grad-primary p-5 text-white shadow-soft sm:p-6"
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-[color:var(--brand-cyan)]/30 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-white/80">
              <Scale className="size-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Cân nặng hiện tại
              </span>
            </div>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-5xl font-extrabold tracking-tight tnum sm:text-6xl">
                <CountUp value={latestDisplay} decimals={1} />
              </span>
              <span className="mb-1.5 text-lg font-semibold text-white/85">
                {unitLabel}
              </span>
            </div>

            {/* Diff chip vs previous */}
            {previous && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm",
                    diffNeutral
                      ? "bg-white/15 text-white"
                      : diffGood
                        ? "bg-emerald-400/25 text-white ring-1 ring-emerald-300/40"
                        : "bg-[color:var(--brand-coral)]/30 text-white ring-1 ring-[color:var(--brand-coral)]/40"
                  )}
                >
                  {diffNeutral ? (
                    <Scale className="size-3.5" />
                  ) : diffDisplay < 0 ? (
                    <TrendingDown className="size-3.5" />
                  ) : (
                    <TrendingUp className="size-3.5" />
                  )}
                  {diffNeutral
                    ? "Giữ nguyên"
                    : `${diffDisplay > 0 ? "▲" : "▼"} ${fmtNum(Math.abs(diffDisplay), 1)} ${unitLabel}`}
                  <span className="font-medium text-white/80">
                    · so với lần trước
                  </span>
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={() => setQuickAdd("weight")}
            className="gap-1.5 rounded-full bg-white/15 px-4 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <Plus className="size-4" /> Ghi cân nặng
          </Button>
        </div>

        <Separator className="my-4 bg-white/15" />

        {/* Target summary */}
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
          <HeroStat
            icon={<Target className="size-3.5" />}
            label="Mục tiêu"
            value={`${fmtNum(targetDisplay, 1)} ${unitLabel}`}
          />
          <HeroStat
            icon={
              reachedGoal ? (
                <span className="text-sm">🎉</span>
              ) : (
                <Scale className="size-3.5" />
              )
            }
            label={reachedGoal ? "Đã đạt mục tiêu" : "Còn lại"}
            value={
              reachedGoal
                ? "Hoàn thành!"
                : `${fmtNum(remainingAbs, 1)} ${unitLabel}`
            }
            highlight={reachedGoal}
          />
          <HeroStat
            icon={
              totalChange < 0 ? (
                <TrendingDown className="size-3.5" />
              ) : totalChange > 0 ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <Scale className="size-3.5" />
              )
            }
            label="Tổng thay đổi"
            value={`${totalChange > 0 ? "+" : ""}${fmtNum(totalChange, 1)} ${unitLabel}`}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </motion.div>

      {/* Area chart */}
      <SectionCard
        title="Xu hướng cân nặng"
        subtitle={`${fmtNum(sorted.length, 0)} lần ghi · mục tiêu ${fmtNum(targetDisplay, 1)} ${unitLabel}`}
        icon={<TrendingDown className="size-4" />}
        action={
          <div className="hidden items-center gap-3 text-[11px] font-medium text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[color:var(--brand-teal)]" />
              Cân nặng
            </span>
            {predictionData.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-0 w-4 border-t-2 border-dashed"
                  style={{ borderColor: "var(--brand-violet)" }}
                />
                Dự đoán
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-0 w-4 border-t-2 border-dashed"
                style={{ borderColor: "var(--brand-coral)" }}
              />
              Mục tiêu
            </span>
          </div>
        }
      >
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={mergedData}
              margin={{ top: 14, right: 12, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-mint)" stopOpacity={0.85} />
                  <stop offset="55%" stopColor="var(--brand-teal)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--brand-cyan)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="weightStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--brand-mint)" />
                  <stop offset="55%" stopColor="var(--brand-teal)" />
                  <stop offset="100%" stopColor="var(--brand-cyan)" />
                </linearGradient>
              </defs>
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
                width={40}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) =>
                  v === 0
                    ? "0"
                    : Math.abs(v) < 100
                      ? v.toFixed(0)
                      : Math.round(v).toString()
                }
              />
              <Tooltip
                cursor={{ stroke: "var(--brand-teal)", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={(props: any) => {
                  if (!props.active || !props.payload?.length) return null;
                  const point = props.payload[0].payload as {
                    date: string;
                    actualWeight: number | null;
                    predictedWeight: number | null;
                  };
                  const isPredicted = point.predictedWeight != null && point.actualWeight == null;
                  const w = point.actualWeight ?? point.predictedWeight ?? 0;
                  const idx = chartData.findIndex((p) => p.date === point.date);
                  const prev = idx > 0 ? chartData[idx - 1] : null;
                  const d = prev ? round(w - prev.weight, 1) : 0;
                  const good = prev
                    ? losingGoal
                      ? d < 0
                      : d > 0
                    : null;
                  return (
                    <div className="rounded-xl border border-border/70 bg-popover/95 px-3 py-2 shadow-soft backdrop-blur">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {fmtDate(point.date, "d MMM yyyy")}
                        {isPredicted && (
                          <span className="ml-1.5 rounded bg-[color:var(--brand-violet)]/15 px-1 py-0.5 text-[9px] font-bold text-[color:var(--brand-violet)]">
                            DỰ ĐOÁN
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-sm font-bold tnum">
                        {fmtNum(w, 1)} {unitLabel}
                      </div>
                      {prev && !isPredicted && (
                        <div
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                            d === 0
                              ? "bg-muted text-muted-foreground"
                              : good
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-[color:var(--brand-rose)]/10 text-[color:var(--brand-rose)]"
                          )}
                        >
                          {d === 0
                            ? "Giữ nguyên"
                            : `${d > 0 ? "▲" : "▼"} ${fmtNum(Math.abs(d), 1)} ${unitLabel}`}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="actualWeight"
                stroke="url(#weightStroke)"
                strokeWidth={3}
                fill="url(#weightGrad)"
                dot={false}
                activeDot={{
                  r: 6,
                  stroke: "var(--brand-teal)",
                  strokeWidth: 2,
                  fill: "var(--background)",
                }}
              />
              {predictionData.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="predictedWeight"
                  stroke="var(--brand-violet)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  connectNulls
                />
              )}
              <ReferenceLine
                y={targetDisplay}
                stroke="var(--brand-coral)"
                strokeWidth={1.5}
                strokeDasharray="6 6"
                label={{
                  value: "Mục tiêu",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "var(--brand-coral)",
                  fontWeight: 600,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* History list */}
      <SectionCard
        title="Lịch sử cân nặng"
        subtitle={`${fmtNum(sorted.length, 0)} lần ghi · mới nhất trước`}
        icon={<Scale className="size-4" />}
      >
        <div className="space-y-2">
          {(() => {
            const reversedList = [...sorted].reverse();
            return reversedList.map((entry, index) => {
              const olderEntry = reversedList[index + 1];
              const entryDisplay = displayWeight(entry.weightKg, unitSystem, 1);
              const olderDisplay = olderEntry
                ? displayWeight(olderEntry.weightKg, unitSystem, 1)
                : null;
              const diff =
                olderDisplay !== null ? round(entryDisplay - olderDisplay, 1) : 0;
              const isGood =
                olderDisplay !== null
                  ? losingGoal
                    ? diff < 0
                    : diff > 0
                  : false;
              const isNeutral = olderDisplay !== null && diff === 0;
              const stagger = Math.min(index * 0.04, 0.32);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-6% 0px" }}
                  transition={{
                    duration: 0.5,
                    ease: EASE,
                    delay: stagger,
                  }}
                  whileHover={{ y: -2 }}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft transition-shadow hover:shadow-lift"
                >
                  {/* Date column */}
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/60 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {fmtDate(entry.date, "MMM")}
                    </span>
                    <span className="text-lg font-extrabold leading-none tracking-tight tnum">
                      {fmtDate(entry.date, "d")}
                    </span>
                  </div>

                  {/* Weight + diff */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold tracking-tight tnum">
                        {fmtNum(entryDisplay, 1)}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {unitLabel}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {olderDisplay !== null ? (
                        <DiffChip
                          diff={diff}
                          unitLabel={unitLabel}
                          good={isGood}
                          neutral={isNeutral}
                        />
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          Đầu tiên
                        </Badge>
                      )}
                      {entry.note && (
                        <span className="line-clamp-1 text-[11px] text-muted-foreground">
                          “{entry.note}”
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Mở menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendingDelete(entry)}
                      >
                        <Trash2 className="size-4" /> Xoá
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              );
            });
          })()}
        </div>
      </SectionCard>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá mục cân nặng?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Mục cân nặng ${fmtNum(
                    displayWeight(pendingDelete.weightKg, unitSystem, 1),
                    1
                  )} ${unitLabel} ngày ${fmtDate(
                    pendingDelete.date,
                    "d/M/yyyy"
                  )} sẽ bị xoá vĩnh viễn. Cân nặng hiện tại của hồ sơ sẽ được cập nhật theo lần ghi gần nhất.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
  className,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/10 px-3 py-2 backdrop-blur-sm",
        highlight && "bg-emerald-400/20 ring-1 ring-emerald-300/40",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/75">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-base font-bold tracking-tight tnum text-white">
        {value}
      </div>
    </div>
  );
}

function DiffChip({
  diff,
  unitLabel,
  good,
  neutral,
}: {
  diff: number;
  unitLabel: string;
  good: boolean;
  neutral: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        neutral
          ? "bg-muted text-muted-foreground"
          : good
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-[color:var(--brand-rose)]/10 text-[color:var(--brand-rose)]"
      )}
    >
      {neutral ? (
        <Scale className="size-3" />
      ) : diff < 0 ? (
        <TrendingDown className="size-3" />
      ) : (
        <TrendingUp className="size-3" />
      )}
      {neutral
        ? "Giữ nguyên"
        : `${diff > 0 ? "▲" : "▼"} ${fmtNum(Math.abs(diff), 1)} ${unitLabel}`}
    </span>
  );
}

function WeightSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-44 animate-pulse rounded-3xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-[280px] animate-pulse rounded-3xl bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
