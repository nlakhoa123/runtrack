"use client";

import { useMemo, useState } from "react";
import { db } from "@/lib/rt/db";
import type {
  RunSession,
  WeightEntry,
  RunPhoto,
  ProgressPhoto,
  AchievementRecord,
  Profile,
  Feeling,
} from "@/lib/rt/types";
import { FEELINGS, avatarGradient } from "@/lib/rt/types";
import { useRtStore } from "@/store/rt-store";
import { useLiveQuery } from "dexie-react-hooks";
import {
  displayDistance,
  displayWeight,
  fmtDuration,
  fmtNum,
  round,
  calcPace,
  distanceLabel,
  weightLabel,
} from "@/lib/rt/utils";
import { fmtDate, todayKey } from "@/lib/rt/dates";
import { EmptyState } from "@/components/rt/shared/empty-state";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Footprints,
  Scale,
  Camera,
  Trophy,
  TrendingDown,
  TrendingUp,
  Clock,
  Flame,
  Gauge,
  Route,
  ChevronRight,
  BookOpen,
  X,
  Calendar,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { defForType, TIER_STYLE } from "@/lib/rt/achievements";

/* ============================ Types ============================ */

type Kind = "run" | "weight" | "photo" | "progress" | "achievement";
type FilterKind = "all" | "run" | "weight" | "photo" | "achievement";

interface FeedEntry {
  id: string;
  kind: Kind;
  ts: number;
  date: string;
  run?: RunSession;
  weight?: WeightEntry;
  weightDiff?: number; // kg, vs previous entry (positive = decreased kg? -> see WeightContent)
  photo?: RunPhoto;
  photoRun?: RunSession;
  progress?: ProgressPhoto;
  achievement?: AchievementRecord;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const FILTERS: { id: FilterKind; label: string; icon?: LucideIcon }[] = [
  { id: "all", label: "Tất cả" },
  { id: "run", label: "Chạy", icon: Footprints },
  { id: "weight", label: "Cân nặng", icon: Scale },
  { id: "photo", label: "Ảnh", icon: Camera },
  { id: "achievement", label: "Thành tích", icon: Trophy },
];

/* ============================ Helpers ============================ */

function feelingOf(id: Feeling) {
  return FEELINGS.find((f) => f.id === id) ?? FEELINGS[2];
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "vừa xong";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(diff / 86_400_000);
  if (d < 7) return `${d} ngày trước`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} tuần trước`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} tháng trước`;
  return `${Math.floor(mo / 12)} năm trước`;
}

function dateLabel(date: string): string {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86_400_000));
  if (date === today) return "Hôm nay";
  if (date === yesterday) return "Hôm qua";
  return fmtDate(date, "d MMM yyyy");
}

function kindMeta(kind: Kind): { Icon: LucideIcon; grad: string } {
  switch (kind) {
    case "run":
      return { Icon: Footprints, grad: "grad-primary" };
    case "weight":
      return { Icon: Scale, grad: "grad-primary" };
    case "photo":
      return { Icon: Camera, grad: "grad-energy" };
    case "progress":
      return { Icon: Sparkles, grad: "grad-primary" };
    case "achievement":
      return { Icon: Trophy, grad: "grad-energy" };
  }
}

/* ============================ View ============================ */

export default function JourneyView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);
  const setActiveView = useRtStore((s) => s.setActiveView);

  const [filter, setFilter] = useState<FilterKind>("all");
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null);

  const runs = useLiveQuery<RunSession[]>(
    async () =>
      activeProfileId
        ? await db.runs.where("profileId").equals(activeProfileId).toArray()
        : [],
    [activeProfileId]
  );
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
  const photos = useLiveQuery<RunPhoto[]>(
    async () =>
      activeProfileId
        ? await db.photos.where("profileId").equals(activeProfileId).toArray()
        : [],
    [activeProfileId]
  );
  const progressPhotos = useLiveQuery<ProgressPhoto[]>(
    async () =>
      activeProfileId
        ? await db.progressPhotos
            .where("profileId")
            .equals(activeProfileId)
            .toArray()
        : [],
    [activeProfileId]
  );
  const achievements = useLiveQuery<AchievementRecord[]>(
    async () =>
      activeProfileId
        ? await db.achievements
            .where("profileId")
            .equals(activeProfileId)
            .toArray()
        : [],
    [activeProfileId]
  );
  const profile = useLiveQuery<Profile | undefined>(
    async () =>
      activeProfileId ? await db.profiles.get(activeProfileId) : undefined,
    [activeProfileId]
  );

  const loading =
    runs === undefined ||
    weights === undefined ||
    photos === undefined ||
    progressPhotos === undefined ||
    achievements === undefined;

  // Build the unified chronological feed (newest first).
  const entries = useMemo<FeedEntry[]>(() => {
    if (
      loading ||
      !runs ||
      !weights ||
      !photos ||
      !progressPhotos ||
      !achievements
    )
      return [];

    const list: FeedEntry[] = [];

    // runs
    for (const r of runs) {
      list.push({
        id: `run:${r.id}`,
        kind: "run",
        ts: r.createdAt,
        date: r.date,
        run: r,
      });
    }

    // weights — compute diff vs previous chronological entry (positive = increased)
    const sortedW = [...weights].sort((a, b) => a.createdAt - b.createdAt);
    sortedW.forEach((w, i) => {
      const prev = i > 0 ? sortedW[i - 1] : null;
      list.push({
        id: `weight:${w.id}`,
        kind: "weight",
        ts: w.createdAt,
        date: w.date,
        weight: w,
        weightDiff: prev ? round(w.weightKg - prev.weightKg, 2) : undefined,
      });
    });

    // run photos (one entry per photo, attach the run for caption)
    const runById = new Map(runs.map((r) => [r.id, r] as const));
    for (const p of photos) {
      list.push({
        id: `photo:${p.id}`,
        kind: "photo",
        ts: p.createdAt,
        date: todayKey(new Date(p.createdAt)),
        photo: p,
        photoRun: runById.get(p.runId),
      });
    }

    // progress photos
    for (const p of progressPhotos) {
      list.push({
        id: `progress:${p.id}`,
        kind: "progress",
        ts: p.createdAt,
        date: p.date,
        progress: p,
      });
    }

    // achievements
    for (const a of achievements) {
      list.push({
        id: `achievement:${a.id}`,
        kind: "achievement",
        ts: a.unlockedAt,
        date: todayKey(new Date(a.unlockedAt)),
        achievement: a,
      });
    }

    list.sort((a, b) => b.ts - a.ts);
    return list;
  }, [loading, runs, weights, photos, progressPhotos, achievements]);

  // Run-attached photos grouped for thumbnail display.
  const photosByRun = useMemo(() => {
    const m = new Map<string, RunPhoto[]>();
    if (!photos) return m;
    for (const p of photos) {
      const arr = m.get(p.runId) ?? [];
      arr.push(p);
      m.set(p.runId, arr);
    }
    return m;
  }, [photos]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "photo") {
      return entries.filter((e) => e.kind === "photo" || e.kind === "progress");
    }
    return entries.filter((e) => e.kind === filter);
  }, [entries, filter]);

  const dateRange = useMemo(() => {
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => a.ts - b.ts);
    return { from: sorted[0].date, to: sorted[sorted.length - 1].date };
  }, [entries]);

  /* ----- Loading skeleton ----- */
  if (loading) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="h-20 animate-pulse rounded-3xl bg-muted/60" />
        <div className="h-10 animate-pulse rounded-3xl bg-muted/60" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  /* ----- Empty state ----- */
  if (entries.length === 0) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <JourneyHeader count={0} range={null} />
        <EmptyState
          emoji="📖"
          title="Hành trình của bạn bắt đầu đây"
          text="Ghi nhận buổi chạy, cân nặng, hoặc ảnh kỉ niệm để lấp đầy cuốn nhật ký hành trình."
          action={
            <Button
              onClick={() => setActiveView("dashboard")}
              className="gap-2 border-transparent text-white shadow-soft grad-primary hover:opacity-90"
            >
              <BookOpen className="h-4 w-4" />
              Về bảng tin
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <JourneyHeader count={entries.length} range={dateRange} />

      {/* Filter chips */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                active
                  ? "border-transparent text-white shadow-soft grad-primary"
                  : "border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Filter result empty */}
      {filtered.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="Chưa có mục nào"
          text="Thử chọn bộ lọc khác để xem lại hành trình của bạn."
        />
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {filtered.map((entry, i) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              index={i}
              unitSystem={unitSystem}
              profile={profile}
              photosByRun={photosByRun}
              onOpenPhoto={(url, caption) => setLightbox({ url, caption })}
              onShare={(text) => {
                if (
                  typeof navigator !== "undefined" &&
                  navigator.clipboard
                ) {
                  navigator.clipboard.writeText(text).catch(() => undefined);
                }
                toast.success("Đã sao chép tóm tắt");
              }}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur"
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              src={lightbox.url}
              alt="Kỉ niệm hành trình"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-lift"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
            <span
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white backdrop-blur"
            >
              {lightbox.caption}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================ Header ============================ */

function JourneyHeader({
  count,
  range,
}: {
  count: number;
  range: { from: string; to: string } | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            <span className="text-grad-primary">Hành trình</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Cuốn nhật ký chạy bộ của bạn — mỗi ngày một câu chuyện.
          </p>
        </div>
      </div>
      {count > 0 && range && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-semibold text-primary">
            <Calendar className="h-3.5 w-3.5" />
            {fmtNum(count, 0)} mục
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Từ {fmtDate(range.from, "d/M/yyyy")} đến {fmtDate(range.to, "d/M/yyyy")}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ============================ Timeline entry ============================ */

function TimelineEntry({
  entry,
  index,
  unitSystem,
  profile,
  photosByRun,
  onOpenPhoto,
  onShare,
}: {
  entry: FeedEntry;
  index: number;
  unitSystem: "metric" | "imperial";
  profile?: Profile;
  photosByRun: Map<string, RunPhoto[]>;
  onOpenPhoto: (url: string, caption: string) => void;
  onShare: (text: string) => void;
}) {
  const meta = kindMeta(entry.kind);
  const Icon = meta.Icon;
  const delay = Math.min(index * 0.05, 0.6);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className="relative pl-11 sm:pl-14"
    >
      {/* left rail vertical line */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[14px] top-0 h-full w-px bg-gradient-to-b from-primary/40 via-primary/10 to-transparent sm:left-[16px]"
      />
      {/* circular icon badge */}
      <span
        className={cn(
          "absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full text-white shadow-soft ring-2 ring-background sm:h-8 sm:w-8",
          meta.grad
        )}
      >
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>

      <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft sm:p-5">
        {/* date header */}
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <h3 className="text-sm font-bold">{dateLabel(entry.date)}</h3>
          <span className="text-[11px] text-muted-foreground/80">
            · {relativeTime(entry.ts)}
          </span>
        </div>

        {entry.kind === "run" && entry.run && (
          <RunContent
            run={entry.run}
            unitSystem={unitSystem}
            profile={profile}
            photosByRun={photosByRun}
            onOpenPhoto={onOpenPhoto}
            onShare={onShare}
          />
        )}
        {entry.kind === "weight" && entry.weight && (
          <WeightContent
            weight={entry.weight}
            weightDiff={entry.weightDiff}
            unitSystem={unitSystem}
            onShare={onShare}
          />
        )}
        {entry.kind === "photo" && entry.photo && (
          <PhotoContent photo={entry.photo} photoRun={entry.photoRun} onOpenPhoto={onOpenPhoto} />
        )}
        {entry.kind === "progress" && entry.progress && (
          <ProgressContent
            progress={entry.progress}
            unitSystem={unitSystem}
            onOpenPhoto={onOpenPhoto}
          />
        )}
        {entry.kind === "achievement" && entry.achievement && (
          <AchievementContent achievement={entry.achievement} />
        )}
      </div>
    </motion.article>
  );
}

/* ============================ Chip helper ============================ */

function Chip({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

/* ============================ Per-kind content ============================ */

function RunContent({
  run,
  unitSystem,
  profile,
  photosByRun,
  onOpenPhoto,
  onShare,
}: {
  run: RunSession;
  unitSystem: "metric" | "imperial";
  profile?: Profile;
  photosByRun: Map<string, RunPhoto[]>;
  onOpenPhoto: (url: string, caption: string) => void;
  onShare: (text: string) => void;
}) {
  const f = feelingOf(run.feeling);
  const dist = displayDistance(run.distanceKm, unitSystem, 2);
  const pace = calcPace(run.distanceKm, run.durationMin);
  const speed = round(displayDistance(run.avgSpeed, unitSystem, 1), 1);
  const unit = distanceLabel(unitSystem);
  const thumbs = photosByRun.get(run.id) ?? [];
  const grad = avatarGradient(profile?.avatarColor ?? "mint");

  const shareText = `Vừa chạy ${fmtNum(dist, 2)} ${unit} trong ${fmtDuration(
    run.durationMin
  )} (${pace} min/${unit}) 🏃`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-lg shadow-soft"
          style={{ backgroundImage: grad }}
          aria-label={f.label}
          title={f.label}
        >
          <span className="drop-shadow-sm">{f.emoji}</span>
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold tracking-tight tnum">
            {fmtNum(dist, 2)}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{unit}</span>
        </div>
        <span
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{
            backgroundColor: `color-mix(in srgb, ${f.color} 18%, transparent)`,
            color: f.color,
          }}
        >
          {f.label}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Chip icon={<Clock className="size-3" />}>{fmtDuration(run.durationMin)}</Chip>
        <Chip icon={<Gauge className="size-3" />}>
          {pace} min/{unit}
        </Chip>
        <Chip icon={<Flame className="size-3" />}>{fmtNum(run.calories, 0)} kcal</Chip>
        <Chip icon={<Route className="size-3" />}>
          {fmtNum(speed, 1)} {unit}/h
        </Chip>
      </div>

      {run.note && (
        <p className="mt-2 line-clamp-3 text-sm italic text-muted-foreground">
          “{run.note}”
        </p>
      )}

      {thumbs.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {thumbs.slice(0, 4).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                onOpenPhoto(
                  p.dataUrl,
                  `${fmtNum(dist, 2)} ${unit} · ${fmtDate(run.date, "d MMM yyyy")}`
                )
              }
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/60"
              aria-label="Mở ảnh"
            >
              <img
                src={p.dataUrl}
                alt="Kỉ niệm"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShare(shareText)}
          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-3 w-3" />
          Sao chép tóm tắt
        </Button>
      </div>
    </div>
  );
}

function WeightContent({
  weight,
  weightDiff,
  unitSystem,
  onShare,
}: {
  weight: WeightEntry;
  weightDiff?: number;
  unitSystem: "metric" | "imperial";
  onShare: (text: string) => void;
}) {
  const w = displayWeight(weight.weightKg, unitSystem, 1);
  const unit = weightLabel(unitSystem);
  const diff = weightDiff;
  const diffDisp =
    diff !== undefined ? displayWeight(Math.abs(diff), unitSystem, 1) : undefined;
  // weightDiff is (current - previous) in kg. Losing weight => diff < 0.
  const isDown = diff !== undefined && diff < -0.01;
  const isUp = diff !== undefined && diff > 0.01;

  const shareText = `Cân nặng hôm nay: ${fmtNum(w, 1)} ${unit} ⚖️`;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold tracking-tight tnum">
            {fmtNum(w, 1)}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{unit}</span>
        </div>
        {diff !== undefined && diffDisp !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              isDown
                ? "bg-emerald-500/15 text-emerald-500"
                : isUp
                  ? "bg-rose-500/15 text-rose-500"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {isDown ? (
              <TrendingDown className="size-3" />
            ) : isUp ? (
              <TrendingUp className="size-3" />
            ) : null}
            {isDown ? "▼" : isUp ? "▲" : "—"} {fmtNum(diffDisp, 1)} {unit}
          </span>
        )}
      </div>

      {weight.note && (
        <p className="mt-2 line-clamp-3 text-sm italic text-muted-foreground">
          “{weight.note}”
        </p>
      )}

      <div className="mt-3 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShare(shareText)}
          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-3 w-3" />
          Sao chép tóm tắt
        </Button>
      </div>
    </div>
  );
}

function PhotoContent({
  photo,
  photoRun,
  onOpenPhoto,
}: {
  photo: RunPhoto;
  photoRun?: RunSession;
  onOpenPhoto: (url: string, caption: string) => void;
}) {
  const caption = photoRun
    ? `${fmtNum(displayDistance(photoRun.distanceKm, "metric", 2), 2)} km · ${fmtDate(photoRun.date, "d MMM yyyy")}`
    : `Kỉ niệm · ${fmtDate(todayKey(new Date(photo.createdAt)), "d MMM yyyy")}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => onOpenPhoto(photo.dataUrl, caption)}
        className="group relative block w-full overflow-hidden rounded-2xl border border-border/60"
      >
        <img
          src={photo.dataUrl}
          alt="Kỉ niệm hành trình"
          className="max-h-80 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span className="absolute bottom-2 left-3 right-3 flex items-center gap-2 text-left text-xs font-medium text-white">
          <Camera className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{caption}</span>
        </span>
      </button>
    </div>
  );
}

function ProgressContent({
  progress,
  unitSystem,
  onOpenPhoto,
}: {
  progress: ProgressPhoto;
  unitSystem: "metric" | "imperial";
  onOpenPhoto: (url: string, caption: string) => void;
}) {
  const caption = `Ảnh tiến bộ · ${fmtDate(progress.date, "d MMM yyyy")}`;
  const w =
    progress.weightKg !== undefined
      ? displayWeight(progress.weightKg, unitSystem, 1)
      : undefined;
  const unit = weightLabel(unitSystem);

  return (
    <div>
      <button
        type="button"
        onClick={() => onOpenPhoto(progress.dataUrl, caption)}
        className="group relative block w-full overflow-hidden rounded-2xl border border-border/60"
      >
        <img
          src={progress.dataUrl}
          alt="Ảnh tiến bộ"
          className="max-h-80 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute bottom-2 left-3 right-3 flex items-center justify-between gap-2 text-xs font-medium text-white">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Ảnh tiến bộ
          </span>
          {w !== undefined && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] backdrop-blur">
              {fmtNum(w, 1)} {unit}
            </span>
          )}
        </span>
      </button>
      {progress.note && (
        <p className="mt-2 line-clamp-3 text-sm italic text-muted-foreground">
          “{progress.note}”
        </p>
      )}
    </div>
  );
}

function AchievementContent({ achievement }: { achievement: AchievementRecord }) {
  const def = defForType(achievement.type);
  const tier = def?.tier ? TIER_STYLE[def.tier] : null;
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-3xl shadow-soft"
        style={{
          background: tier
            ? `radial-gradient(circle at 30% 25%, ${tier.glow}, transparent 72%)`
            : "var(--muted)",
          border: tier ? `1px solid ${tier.ring}55` : undefined,
        }}
      >
        <span>{def?.emoji ?? "🏆"}</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-bold">{def?.title ?? "Thành tích"}</h3>
          {tier && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${tier.ring}22`, color: tier.ring }}
            >
              {tier.label}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {def?.description ?? "Thành tích đã mở khoá."}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
          <Trophy className="h-3 w-3" />
          Đã mở khoá · {fmtDate(todayKey(new Date(achievement.unlockedAt)), "d MMM yyyy")}
        </p>
      </div>
    </div>
  );
}
