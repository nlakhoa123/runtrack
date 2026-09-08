"use client";

import { useMemo, useState } from "react";
import { db } from "@/lib/rt/db";
import { RouteMap } from "@/components/rt/shared/route-map";
import {
  FEELINGS,
  avatarGradient,
  type Feeling,
  type Profile,
  type RunSession,
} from "@/lib/rt/types";
import { useRtStore } from "@/store/rt-store";
import { useLiveQuery } from "dexie-react-hooks";
import { sumKm, weeklyBuckets } from "@/lib/rt/insights";
import {
  currentWeekKeys,
  differenceInCalendarDays,
  fmtDate,
  keyToDate,
  subDays,
  todayKey,
} from "@/lib/rt/dates";
import {
  calcPace,
  displayDistance,
  fmtDuration,
  fmtNum,
  round,
} from "@/lib/rt/utils";
import { SectionCard } from "@/components/rt/shared/section-card";
import { StatCard } from "@/components/rt/shared/stat-card";
import { EmptyState } from "@/components/rt/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Calendar,
  Clock,
  Flame,
  Footprints,
  Gauge,
  MoreVertical,
  Pencil,
  Plus,
  Route,
  Trash2,
  MapPin,
  Heart,
  Zap,
  Search,
  X,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

const feelingOf = (f: Feeling) =>
  FEELINGS.find((x) => x.id === f) ?? FEELINGS[2];

interface ChartItem {
  label: string;
  km: number;
  isCurrent: boolean;
  idx: number;
}

type TimelineItem =
  | { kind: "divider"; key: string; label: string }
  | { kind: "run"; key: string; run: RunSession; index: number };

export default function RunsView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);
  const setQuickAdd = useRtStore((s) => s.setQuickAdd);

  const runs = useLiveQuery<RunSession[]>(
    async () => {
      if (!activeProfileId) return [];
      const list = await db.runs
        .where("profileId")
        .equals(activeProfileId)
        .reverse()
        .sortBy("createdAt");
      return list.slice().reverse();
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

  const [pendingDelete, setPendingDelete] = useState<RunSession | null>(null);
  const [detailRun, setDetailRun] = useState<RunSession | null>(null);
  const [search, setSearch] = useState("");
  const [feelingFilter, setFeelingFilter] = useState<Feeling | null>(null);
  const [dateRange, setDateRange] = useState<"all" | "7" | "30" | "month">("all");

  const unitLabel = unitSystem === "metric" ? "km" : "mi";

  const thisWeekKeys = useMemo(() => currentWeekKeys(), []);
  const currentWeekStart = thisWeekKeys[0];
  const todayK = useMemo(() => todayKey(), []);
  const yesterdayK = useMemo(() => todayKey(subDays(new Date(), 1)), []);

  const sortedRuns = useMemo(() => {
    if (!runs) return undefined;
    return [...runs].sort((a, b) => b.createdAt - a.createdAt);
  }, [runs]);

  const totalKm = useMemo(
    () => (sortedRuns ? sortedRuns.reduce((s, r) => s + r.distanceKm, 0) : 0),
    [sortedRuns]
  );
  const thisWeekKm = useMemo(
    () => (sortedRuns ? sumKm(sortedRuns, thisWeekKeys) : 0),
    [sortedRuns, thisWeekKeys]
  );
  const bestStreak = useMemo(() => {
    if (!sortedRuns || sortedRuns.length === 0) return 0;
    const dates = Array.from(new Set(sortedRuns.map((r) => r.date))).sort();
    let best = 1;
    let cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = differenceInCalendarDays(
        keyToDate(dates[i]),
        keyToDate(dates[i - 1])
      );
      if (diff === 1) {
        cur++;
        best = Math.max(best, cur);
      } else {
        cur = 1;
      }
    }
    return best;
  }, [sortedRuns]);

  const chartData = useMemo<ChartItem[]>(() => {
    if (!sortedRuns) return [];
    return weeklyBuckets(sortedRuns, 8).map((b, idx) => ({
      label: b.label,
      km: round(displayDistance(b.km, unitSystem, 2), 2),
      isCurrent: b.startKey === currentWeekStart,
      idx,
    }));
  }, [sortedRuns, unitSystem, currentWeekStart]);

  const goalDisplay = round(
    displayDistance(profile?.targetKmPerWeek ?? 0, unitSystem, 2),
    2
  );

  // Filtered runs (search + feeling filter + date range) — used for the timeline display.
  const filteredRuns = useMemo(() => {
    if (!sortedRuns) return undefined;
    const q = search.trim().toLowerCase();
    // Compute the date cutoff for the selected range (YYYY-MM-DD).
    let cutoff: string | null = null;
    if (dateRange !== "all") {
      const now = new Date();
      if (dateRange === "7") cutoff = todayKey(subDays(now, 6));
      else if (dateRange === "30") cutoff = todayKey(subDays(now, 29));
      else if (dateRange === "month") {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        cutoff = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(first.getDate()).padStart(2, "0")}`;
      }
    }
    return sortedRuns.filter((r) => {
      if (feelingFilter && r.feeling !== feelingFilter) return false;
      if (cutoff && r.date < cutoff) return false;
      if (!q) return true;
      // search matches note, date, distance, duration, or feeling label
      const f = feelingOf(r.feeling);
      const hay = [
        r.note ?? "",
        r.date,
        fmtDate(r.date, "d MMM yyyy"),
        `${displayDistance(r.distanceKm, unitSystem, 2)} ${unitLabel}`,
        `${r.distanceKm}`,
        fmtDuration(r.durationMin),
        `${r.calories}`,
        f.label,
        f.emoji,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [sortedRuns, search, feelingFilter, dateRange, unitSystem, unitLabel]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!filteredRuns) return [];
    const out: TimelineItem[] = [];
    let lastDate = "";
    filteredRuns.forEach((run, index) => {
      if (run.date !== lastDate) {
        const label =
          run.date === todayK
            ? "Hôm nay"
            : run.date === yesterdayK
              ? "Hôm qua"
              : fmtDate(run.date, "d/M");
        out.push({ kind: "divider", key: `d-${run.date}`, label });
        lastDate = run.date;
      }
      out.push({ kind: "run", key: run.id, run, index });
    });
    return out;
  }, [filteredRuns, todayK, yesterdayK]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await db.runs.delete(target.id);
      toast.success("Đã xoá buổi chạy");
    } catch {
      toast.error("Không thể xoá buổi chạy");
    }
  };

  // Loading guard
  if (sortedRuns === undefined || profile === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-7 w-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-56 animate-pulse rounded-md bg-muted/70" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-[260px] animate-pulse rounded-3xl bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedRuns.length === 0) {
    return (
      <EmptyState
        emoji="👟"
        title="Chưa có buổi chạy nào"
        text="Ghi nhận buổi chạy đầu tiên để xem lịch sử và biểu đồ."
        action={
          <Button
            onClick={() => useRtStore.getState().startNewRun()}
            className="gap-1.5 rounded-full grad-primary text-white shadow-soft transition-shadow hover:shadow-glow"
          >
            <Plus className="size-4" /> Ghi chạy
          </Button>
        }
      />
    );
  }

  const totalRuns = sortedRuns.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Lịch sử chạy
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fmtNum(totalRuns, 0)} buổi chạy ·{" "}
            <span className="font-semibold text-foreground">
              {fmtNum(displayDistance(totalKm, unitSystem, 2), 2)} {unitLabel}
            </span>{" "}
            tổng cộng
          </p>
        </div>
        <Button
          onClick={() => useRtStore.getState().startNewRun()}
          className="gap-1.5 rounded-full grad-primary text-white shadow-soft transition-shadow hover:shadow-glow"
        >
          <Plus className="size-4" /> Ghi chạy
        </Button>
      </motion.div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Tổng số chạy"
          value={totalRuns}
          decimals={0}
          suffix=""
          icon={<Footprints className="size-4" />}
          accent="primary"
        />
        <StatCard
          label={`Tổng (${unitLabel})`}
          value={round(displayDistance(totalKm, unitSystem, 2), 2)}
          decimals={2}
          suffix={` ${unitLabel}`}
          icon={<Route className="size-4" />}
          accent="primary"
        />
        <StatCard
          label="Tuần này"
          value={round(displayDistance(thisWeekKm, unitSystem, 2), 2)}
          decimals={2}
          suffix={` ${unitLabel}`}
          icon={<Calendar className="size-4" />}
          accent="energy"
        />
        <StatCard
          label="Chuỗi dài nhất"
          value={bestStreak}
          decimals={0}
          suffix=" ngày"
          icon={<Flame className="size-4" />}
          accent="rose"
        />
      </div>

      {/* Weekly distance chart */}
      <SectionCard
        title="Quãng đường theo tuần"
        subtitle={`8 tuần gần nhất · mục tiêu ${fmtNum(goalDisplay, 2)} ${unitLabel}/tuần`}
        icon={<BarChart3 className="size-4" />}
        action={
          <div className="hidden items-center gap-3 text-[11px] font-medium text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[color:var(--brand-teal)]" />
              Tuần
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[color:var(--brand-coral)]" />
              Hiện tại
            </span>
          </div>
        }
      >
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 14, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="runsBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-mint)" />
                  <stop offset="55%" stopColor="var(--brand-teal)" />
                  <stop offset="100%" stopColor="var(--brand-cyan)" />
                </linearGradient>
                <linearGradient
                  id="runsBarGradCurrent"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="var(--brand-amber)" />
                  <stop offset="100%" stopColor="var(--brand-coral)" />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) =>
                  v === 0
                    ? "0"
                    : v < 10
                      ? v.toFixed(1)
                      : Math.round(v).toString()
                }
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={(props: any) => {
                  if (!props.active || !props.payload?.length) return null;
                  const item = props.payload[0].payload as ChartItem;
                  return (
                    <div className="rounded-xl border border-border/70 bg-popover/95 px-3 py-2 shadow-soft backdrop-blur">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Tuần {item.idx + 1}
                        {item.isCurrent ? " · hiện tại" : ""}
                      </div>
                      <div className="mt-0.5 text-sm font-bold tnum">
                        {fmtNum(item.km, 2)} {unitLabel}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="km" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {chartData.map((d) => (
                  <Cell
                    key={d.label}
                    fill={
                      d.isCurrent
                        ? "url(#runsBarGradCurrent)"
                        : "url(#runsBarGrad)"
                    }
                  />
                ))}
              </Bar>
              {goalDisplay > 0 && (
                <ReferenceLine
                  y={goalDisplay}
                  stroke="var(--brand-coral)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  label={{
                    value: `Mục tiêu ${fmtNum(goalDisplay, 2)} ${unitLabel}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "var(--brand-coral)",
                    fontWeight: 600,
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Timeline feed */}
      <SectionCard
        title="Lịch sử chạy"
        subtitle={`${fmtNum(filteredRuns?.length ?? 0, 0)} buổi · mới nhất trước`}
        icon={<Clock className="size-4" />}
      >
        {/* Search + feeling filter */}
        <div className="mb-4 space-y-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo ghi chú, ngày, quãng đường..."
              className="h-10 pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Xoá tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FEELINGS.map((f) => {
              const active = feelingFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFeelingFilter(active ? null : f.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border-transparent bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span>{f.emoji}</span> {f.label}
                </button>
              );
            })}
            {feelingFilter && (
              <button
                onClick={() => setFeelingFilter(null)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="size-3" /> Xoá lọc
              </button>
            )}
          </div>
          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Thời gian:</span>
            {([
              { id: "all", label: "Tất cả" },
              { id: "7", label: "7 ngày" },
              { id: "30", label: "30 ngày" },
              { id: "month", label: "Tháng này" },
            ] as const).map((opt) => {
              const active = dateRange === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setDateRange(opt.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border-transparent bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1">
          {timelineItems.map((item) => {
            if (item.kind === "divider") {
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-2 px-1 pb-1.5 pt-3 first:pt-0"
                >
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              );
            }
            const run = item.run;
            const f = feelingOf(run.feeling);
            const dist = displayDistance(run.distanceKm, unitSystem, 2);
            const pace = calcPace(run.distanceKm, run.durationMin);
            const speed = round(
              displayDistance(run.avgSpeed, unitSystem, 1),
              1
            );
            const stagger = Math.min(item.index * 0.04, 0.32);
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-6% 0px" }}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                  delay: stagger,
                }}
                whileHover={{ y: -2 }}
                onClick={() => setDetailRun(run)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailRun(run);
                  }
                }}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl shadow-soft"
                  style={{
                    backgroundImage: avatarGradient(
                      profile?.avatarColor ?? "mint"
                    ),
                  }}
                  aria-label={f.label}
                  title={f.label}
                >
                  <span className="drop-shadow-sm">{f.emoji}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight tnum">
                      {fmtNum(dist, 2)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {unitLabel}
                    </span>
                    <span className="ml-1 text-[11px] text-muted-foreground/80">
                      · {fmtDate(run.date, "d/M")}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Chip icon={<Clock className="size-3" />}>
                      {fmtDuration(run.durationMin)}
                    </Chip>
                    <Chip icon={<Gauge className="size-3" />}>
                      {pace} min/km
                    </Chip>
                    <Chip icon={<Flame className="size-3" />}>
                      {fmtNum(run.calories, 0)} kcal
                    </Chip>
                    <Chip icon={<Route className="size-3" />}>
                      {fmtNum(speed, 1)} {unitLabel}/h
                    </Chip>
                  </div>

                  {run.note && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      “{run.note}”
                    </p>
                  )}
                </div>

                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
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
                        onClick={() => useRtStore.getState().startEditRun(run.id)}
                      >
                        <Pencil className="size-4" /> Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendingDelete(run)}
                      >
                        <Trash2 className="size-4" /> Xoá
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })}
          {timelineItems.length === 0 && (search || feelingFilter || dateRange !== "all") && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <div className="mb-2 text-4xl">🔍</div>
              <p className="text-sm font-semibold">Không tìm thấy buổi chạy nào</p>
              <p className="mt-1 text-xs text-muted-foreground">Thử thay đổi từ khoá hoặc bỏ bộ lọc cảm giác.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => {
                  setSearch("");
                  setFeelingFilter(null);
                  setDateRange("all");
                }}
              >
                <X className="size-3.5" /> Xoá tất cả bộ lọc
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá buổi chạy?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Buổi chạy ${fmtNum(
                    displayDistance(pendingDelete.distanceKm, unitSystem, 2),
                    2
                  )} ${unitLabel} ngày ${fmtDate(
                    pendingDelete.date,
                    "d/M"
                  )} sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.`
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

      {/* Run detail dialog */}
      <RunDetailDialog
        run={detailRun}
        unitSystem={unitSystem}
        unitLabel={unitLabel}
        onClose={() => setDetailRun(null)}
        onEdit={(r) => {
          setDetailRun(null);
          useRtStore.getState().startEditRun(r.id);
        }}
      />
    </div>
  );
}

/* ============================ Run detail dialog ============================ */

function RunDetailDialog({
  run,
  unitSystem,
  unitLabel,
  onClose,
  onEdit,
}: {
  run: RunSession | null;
  unitSystem: "metric" | "imperial";
  unitLabel: string;
  onClose: () => void;
  onEdit: (run: RunSession) => void;
}) {
  if (!run) return null;
  const f = feelingOf(run.feeling);
  const dist = displayDistance(run.distanceKm, unitSystem, 2);
  const speed = round(displayDistance(run.avgSpeed, unitSystem, 1), 1);
  const pace = calcPace(run.distanceKm, run.durationMin);

  const stats = [
    { icon: Route, label: "Quãng đường", value: `${fmtNum(dist, 2)} ${unitLabel}`, accent: "var(--brand-teal)" },
    { icon: Clock, label: "Thời gian", value: fmtDuration(run.durationMin), accent: "var(--brand-cyan)" },
    { icon: Gauge, label: "Nhịp TB", value: `${pace} min/km`, accent: "var(--brand-coral)" },
    { icon: Zap, label: "Tốc độ TB", value: `${fmtNum(speed, 1)} ${unitLabel}/h`, accent: "var(--brand-amber)" },
    { icon: Flame, label: "Calo đốt cháy", value: `${fmtNum(run.calories, 0)} kcal`, accent: "var(--brand-violet)" },
    { icon: Heart, label: "Cảm giác", value: `${f.emoji} ${f.label}`, accent: "var(--brand-rose)" },
  ];

  return (
    <Dialog open={!!run} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* gradient hero header */}
        <div
          className="relative overflow-hidden px-5 pb-5 pt-6 text-white"
          style={{ backgroundImage: avatarGradient("mint") }}
        >
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
          <DialogHeader className="relative space-y-0">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="h-4 w-4" />
              {fmtDate(run.date, "EEEE, d MMMM yyyy")}
            </DialogTitle>
            <DialogDescription className="sr-only">Chi tiết buổi chạy</DialogDescription>
          </DialogHeader>
          <div className="relative mt-3 flex items-end gap-2">
            <span className="text-5xl font-extrabold tracking-tight tnum">{fmtNum(dist, 2)}</span>
            <span className="mb-1.5 text-lg font-semibold opacity-80">{unitLabel}</span>
          </div>
          <p className="relative mt-0.5 text-sm font-medium opacity-80">
            {fmtDuration(run.durationMin)} · {pace} min/km · {fmtNum(run.calories, 0)} kcal
          </p>
        </div>

        {/* stats grid */}
        <div className="grid grid-cols-2 gap-2.5 px-5 py-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/60 p-3"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-soft"
                  style={{ background: s.accent }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="truncate text-sm font-bold">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* note */}
        {run.note && (
          <div className="px-5 pb-3">
            <div className="flex items-start gap-2 rounded-2xl border border-dashed border-border bg-muted/40 p-3">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-sm text-foreground">{run.note}</p>
            </div>
          </div>
        )}

        {/* photos */}
        <RunDetailPhotos runId={run.id} />

        {/* GPS map */}
        {run.trace && run.trace.length > 1 && (
          <div className="px-5 pb-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Tuyến đường GPS
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <RouteMap points={run.trace!} height={220} />
            </div>
          </div>
        )}

        {/* actions */}
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Đóng
          </Button>
          <Button
            className="flex-[2] gap-2 border-transparent text-white grad-primary hover:opacity-90"
            onClick={() => onEdit(run)}
          >
            <Pencil className="h-4 w-4" /> Chỉnh sửa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Chip({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
      {icon}
      {children}
    </span>
  );
}

/* ============================ Run detail photos ============================ */

function RunDetailPhotos({ runId }: { runId: string }) {
  const photos = useLiveQuery(
    async () => db.photos.where("runId").equals(runId).sortBy("createdAt"),
    [runId]
  );
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (photos === undefined) return null;
  if (photos.length === 0) return null;

  return (
    <>
      <div className="px-5 pb-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Camera className="h-3.5 w-3.5" /> Ảnh kỉ niệm ({photos.length})
        </div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => setLightbox(i)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/60"
            >
              <img
                src={p.dataUrl}
                alt={`Ảnh ${i + 1}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* lightbox */}
      <AnimatePresence>
        {lightbox !== null && photos[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              key={photos[lightbox].id}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              src={photos[lightbox].dataUrl}
              alt="Ảnh kỉ niệm"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-lift"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((l) => (l === null ? 0 : (l - 1 + photos.length) % photos.length));
                  }}
                  className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
                  aria-label="Trước"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((l) => (l === null ? 0 : (l + 1) % photos.length));
                  }}
                  className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
                  aria-label="Sau"
                >
                  ›
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  {lightbox + 1} / {photos.length}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
