"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { db, uid, fileToCompressedDataUrl } from "@/lib/rt/db";
import type { ProgressPhoto, Profile } from "@/lib/rt/types";
import { useRtStore } from "@/store/rt-store";
import { useLiveQuery } from "dexie-react-hooks";
import {
  displayWeight,
  round,
  fmtNum,
  parseWeightInput,
  kgToLb,
  weightLabel,
} from "@/lib/rt/utils";
import { todayKey, fmtDate, keyToDate, differenceInCalendarDays } from "@/lib/rt/dates";
import { SectionCard } from "@/components/rt/shared/section-card";
import { EmptyState } from "@/components/rt/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Plus,
  Trash2,
  X,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  SplitSquareHorizontal,
  Lightbulb,
  ImageUp,
  Loader2,
  Scale,
  Clock,
  TrendingDown,
  TrendingUp,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* Note: `ImageCompare` is not exported by lucide-react@0.525.0.
 * Using `SplitSquareHorizontal` as the visual equivalent (a horizontally
 * split square) for the before/after comparison feature. */

const EASE = [0.22, 1, 0.36, 1] as const;

/* ============================ Helpers ============================ */

function dateLabel(date: string): string {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86_400_000));
  if (date === today) return "Hôm nay";
  if (date === yesterday) return "Hôm qua";
  return fmtDate(date, "d MMM yyyy");
}

function photoOptionLabel(p: ProgressPhoto, unitSystem: "metric" | "imperial"): string {
  const date = fmtDate(p.date, "d MMM yyyy");
  if (p.weightKg !== undefined) {
    const w = displayWeight(p.weightKg, unitSystem, 1);
    return `${date} · ${fmtNum(w, 1)} ${weightLabel(unitSystem)}`;
  }
  return date;
}

function photoChipWeight(p: ProgressPhoto, unitSystem: "metric" | "imperial"): string | null {
  if (p.weightKg === undefined) return null;
  const w = displayWeight(p.weightKg, unitSystem, 1);
  return `${fmtNum(w, 1)} ${weightLabel(unitSystem)}`;
}

/* ============================ View ============================ */

export default function ProgressView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);

  const photos = useLiveQuery<ProgressPhoto[]>(
    async () =>
      activeProfileId
        ? await db.progressPhotos
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

  // Sorted oldest-first (by date, then createdAt as tiebreaker)
  const sortedAsc = useMemo<ProgressPhoto[]>(() => {
    if (!photos) return [];
    return [...photos].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.createdAt - b.createdAt;
    });
  }, [photos]);

  // Newest-first for the timeline grid
  const sortedDesc = useMemo<ProgressPhoto[]>(
    () => [...sortedAsc].reverse(),
    [sortedAsc]
  );

  // Before/After comparison selection. We keep the user's last choice in
  // state but derive the effective IDs so that invalid/empty selections
  // (e.g. on first load or after a delete) gracefully fall back to
  // first/last. This avoids setState-in-effect cascades.
  const [beforeId, setBeforeId] = useState<string>("");
  const [afterId, setAfterId] = useState<string>("");

  const effectiveBeforeId = useMemo(() => {
    if (sortedAsc.length < 2) return "";
    const exists = sortedAsc.some((p) => p.id === beforeId);
    if (exists && beforeId && beforeId !== afterId) return beforeId;
    return sortedAsc[0].id;
  }, [sortedAsc, beforeId, afterId]);

  const effectiveAfterId = useMemo(() => {
    if (sortedAsc.length < 2) return "";
    const exists = sortedAsc.some((p) => p.id === afterId);
    if (exists && afterId && beforeId !== afterId) return afterId;
    return sortedAsc[sortedAsc.length - 1].id;
  }, [sortedAsc, beforeId, afterId]);

  const beforePhoto = useMemo(
    () => sortedAsc.find((p) => p.id === effectiveBeforeId),
    [sortedAsc, effectiveBeforeId]
  );
  const afterPhoto = useMemo(
    () => sortedAsc.find((p) => p.id === effectiveAfterId),
    [sortedAsc, effectiveAfterId]
  );

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProgressPhoto | null>(null);

  /* ----- Loading guard ----- */
  if (photos === undefined || profile === undefined) {
    return <ProgressSkeleton />;
  }

  /* ----- Empty state ----- */
  if (photos.length === 0) {
    return (
      <div className="space-y-5">
        <ProgressHeader photoCount={0} onAdd={() => setDrawerOpen(true)} />
        <EmptyState
          emoji="📸"
          title="Chưa có ảnh tiến độ"
          text="Chụp ảnh cơ thể định kỳ (2 tuần/lần) từ cùng góc để thấy sự thay đổi qua thời gian."
          action={
            <Button
              onClick={() => setDrawerOpen(true)}
              className="gap-1.5 rounded-full grad-primary text-white shadow-soft transition-shadow hover:shadow-glow"
            >
              <Plus className="size-4" /> Chụp ảnh đầu tiên
            </Button>
          }
        />
        <TipsCard />
        <ProgressDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          profile={profile}
          unitSystem={unitSystem}
        />
      </div>
    );
  }

  /* ----- Stats (≥2 photos) ----- */
  const canCompare = sortedAsc.length >= 2 && beforePhoto && afterPhoto;
  const showStats = sortedAsc.length >= 2;

  // Stats: days between first & last, weight change, average interval
  let stats: {
    days: number;
    weightDiff: number | null; // in display unit, signed (after - before)
    count: number;
    avgIntervalDays: number;
  } | null = null;
  if (showStats) {
    const first = sortedAsc[0];
    const last = sortedAsc[sortedAsc.length - 1];
    const days = Math.max(
      0,
      differenceInCalendarDays(keyToDate(last.date), keyToDate(first.date))
    );
    const weightDiff =
      first.weightKg !== undefined && last.weightKg !== undefined
        ? round(
            displayWeight(last.weightKg, unitSystem, 1) -
              displayWeight(first.weightKg, unitSystem, 1),
            1
          )
        : null;
    const avgIntervalDays =
      sortedAsc.length > 1
        ? round(days / (sortedAsc.length - 1), 1)
        : 0;
    stats = {
      days,
      weightDiff,
      count: sortedAsc.length,
      avgIntervalDays,
    };
  }

  /* ----- Delete handler ----- */
  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await db.progressPhotos.delete(target.id);
      toast.success("Đã xoá ảnh tiến độ");
      setLightboxIndex(null);
    } catch {
      toast.error("Không xoá được ảnh");
    }
  }

  /* ----- Render ----- */
  return (
    <div className="space-y-5">
      <ProgressHeader photoCount={photos.length} onAdd={() => setDrawerOpen(true)} />

      {/* Comparison hero — only when ≥2 photos */}
      {canCompare ? (
        <SectionCard
          title="So sánh trước · sau"
          subtitle="Kéo thanh chia để xem sự khác biệt"
          icon={<SplitSquareHorizontal className="size-4" />}
          contentClassName="space-y-4"
        >
          <CompareSlider
            key={`${beforePhoto!.id}-${afterPhoto!.id}`}
            before={beforePhoto!}
            after={afterPhoto!}
            unitSystem={unitSystem}
          />

          {/* Photo pickers */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ảnh trước
              </label>
              <Select value={effectiveBeforeId} onValueChange={setBeforeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn ảnh trước" />
                </SelectTrigger>
                <SelectContent>
                  {sortedAsc.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === effectiveAfterId}>
                      {photoOptionLabel(p, unitSystem)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ảnh sau
              </label>
              <Select value={effectiveAfterId} onValueChange={setAfterId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn ảnh sau" />
                </SelectTrigger>
                <SelectContent>
                  {sortedAsc.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === effectiveBeforeId}>
                      {photoOptionLabel(p, unitSystem)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => {
                if (sortedAsc.length < 2) return;
                setBeforeId(sortedAsc[0].id);
                setAfterId(sortedAsc[sortedAsc.length - 1].id);
              }}
            >
              <Sparkles className="size-3.5" /> Tự chọn đầu · cuối
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => {
                // swap before/after — use the effective IDs so swapping works
                // even before the user has touched the Select dropdowns.
                setBeforeId(effectiveAfterId);
                setAfterId(effectiveBeforeId);
              }}
            >
              <ArrowLeft className="size-3.5" /> Đảo chiều
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="So sánh trước · sau"
          subtitle="Cần ít nhất 2 ảnh"
          icon={<SplitSquareHorizontal className="size-4" />}
        >
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/40 px-6 py-8 text-center">
            <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <SplitSquareHorizontal className="size-6" />
            </div>
            <p className="text-sm font-semibold">Cần thêm một ảnh nữa</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Khi bạn có từ 2 ảnh tiến bộ trở lên, vùng so sánh trước · sau sẽ xuất
              hiện tại đây.
            </p>
            <Button
              onClick={() => setDrawerOpen(true)}
              className="mt-3 gap-1.5 rounded-full grad-primary text-white shadow-soft"
              size="sm"
            >
              <Plus className="size-4" /> Thêm ảnh
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Stats row */}
      {stats && <StatsRow stats={stats} unitSystem={unitSystem} />}

      {/* Tip card */}
      <TipsCard />

      {/* Timeline grid */}
      <SectionCard
        title="Dòng thời gian"
        subtitle={`${photos.length} ảnh tiến độ`}
        icon={<Images className="size-4" />}
        contentClassName="space-y-3"
      >
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          {sortedDesc.map((p, i) => {
            const idxInDesc = i;
            return (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => setLightboxIndex(idxInDesc)}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-6% 0px" }}
                transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.04, 0.4) }}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-soft"
              >
                <img
                  src={p.dataUrl}
                  alt={`Ảnh tiến độ ${dateLabel(p.date)}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  draggable={false}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                {/* date + weight chip */}
                <span className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 text-[10px] font-medium text-white">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-0.5 backdrop-blur">
                    <Calendar className="size-2.5" />
                    {fmtDate(p.date, "d/M")}
                  </span>
                  {photoChipWeight(p, unitSystem) && (
                    <span className="rounded-full bg-black/45 px-1.5 py-0.5 backdrop-blur">
                      {photoChipWeight(p, unitSystem)}
                    </span>
                  )}
                </span>
                {/* delete on hover */}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(p);
                  }}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity hover:bg-[color:var(--brand-rose)] group-hover:opacity-100"
                  aria-label="Xoá ảnh"
                >
                  <Trash2 className="size-3.5" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </SectionCard>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && sortedDesc[lightboxIndex] && (
          <Lightbox
            photos={sortedDesc}
            index={lightboxIndex}
            unitSystem={unitSystem}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
            onDelete={(p) => setPendingDelete(p)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá ảnh tiến độ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  Ảnh ngày{" "}
                  <span className="font-semibold text-foreground">
                    {dateLabel(pendingDelete.date)}
                  </span>{" "}
                  sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 border-transparent bg-[color:var(--brand-rose)] text-white hover:bg-[color:var(--brand-rose)]/90"
              onClick={confirmDelete}
            >
              <Trash2 className="size-4" /> Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logging drawer */}
      <ProgressDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        profile={profile}
        unitSystem={unitSystem}
      />
    </div>
  );
}

/* ============================ Header ============================ */

function ProgressHeader({
  photoCount,
  onAdd,
}: {
  photoCount: number;
  onAdd: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative overflow-hidden rounded-3xl border border-white/10 grad-primary p-5 text-white shadow-soft sm:p-6"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-[color:var(--brand-cyan)]/30 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-white/80">
            <Camera className="size-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Ảnh tiến bộ
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Hành trình thay đổi
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {photoCount === 0
              ? "Bắt đầu lưu lại khoảnh khắc cơ thể của bạn."
              : `${photoCount} ảnh · mỗi bức là một cột mốc`}
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="gap-1.5 rounded-full border-transparent bg-white/15 text-white shadow-soft backdrop-blur transition-colors hover:bg-white/25"
        >
          <Camera className="size-4" /> Chụp ảnh tiến độ
        </Button>
      </div>
    </motion.div>
  );
}

/* ============================ Compare slider ============================ */

function CompareSlider({
  before,
  after,
  unitSystem,
}: {
  before: ProgressPhoto;
  after: ProgressPhoto;
  unitSystem: "metric" | "imperial";
}) {
  const [pct, setPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  // The parent remounts this component (via `key`) whenever the chosen
  // before/after photos change, so `pct` automatically resets to 50.

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = clientX - rect.left;
    const next = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPct(next);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-soft"
      onPointerDown={(e) => {
        draggingRef.current = true;
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {}
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) updateFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        try {
          (e.currentTarget as Element).releasePointerCapture(e.pointerId);
        } catch {}
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      {/* After (base layer, right side) */}
      <img
        src={after.dataUrl}
        alt="Ảnh sau"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Before (overlay, left side, clipped) */}
      <img
        src={before.dataUrl}
        alt="Ảnh trước"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        draggable={false}
      />

      {/* Top labels */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
          <ArrowLeft className="size-3" /> Trước
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <Calendar className="size-3" />
          {fmtDate(before.date, "d MMM yyyy")}
          {photoChipWeight(before, unitSystem) && (
            <span className="opacity-80">· {photoChipWeight(before, unitSystem)}</span>
          )}
        </span>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
          Sau <ArrowRight className="size-3" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <Calendar className="size-3" />
          {fmtDate(after.date, "d MMM yyyy")}
          {photoChipWeight(after, unitSystem) && (
            <span className="opacity-80">· {photoChipWeight(after, unitSystem)}</span>
          )}
        </span>
      </div>

      {/* Divider handle */}
      <div
        className="pointer-events-none absolute inset-y-0 z-10"
        style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
      >
        <div className="mx-auto h-full w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.45)]" />
        <div className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-white/25 backdrop-blur-md shadow-lift">
          <SplitSquareHorizontal className="size-5 text-white" />
        </div>
      </div>

      {/* Range input for accessibility / fine control */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        aria-label="Tỷ lệ hiển thị ảnh trước"
        className="absolute inset-x-3 bottom-3 z-10 h-2 w-[calc(100%-1.5rem)] cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 backdrop-blur transition-opacity hover:opacity-100 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
      />
    </div>
  );
}

/* ============================ Stats row ============================ */

function StatsRow({
  stats,
  unitSystem,
}: {
  stats: {
    days: number;
    weightDiff: number | null;
    count: number;
    avgIntervalDays: number;
  };
  unitSystem: "metric" | "imperial";
}) {
  const weightDiff = stats.weightDiff;
  const lost = weightDiff !== null && weightDiff < 0;
  const gained = weightDiff !== null && weightDiff > 0;
  const unit = weightLabel(unitSystem);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.55, ease: EASE }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <StatTile
        icon={<Calendar className="size-4" />}
        label="Số ngày"
        value={fmtNum(stats.days, 0)}
        sub="từ đầu đến cuối"
        tone="primary"
      />
      <StatTile
        icon={
          weightDiff === null ? (
            <Scale className="size-4" />
          ) : lost ? (
            <TrendingDown className="size-4" />
          ) : gained ? (
            <TrendingUp className="size-4" />
          ) : (
            <Scale className="size-4" />
          )
        }
        label="Thay đổi cân nặng"
        value={
          weightDiff === null
            ? "—"
            : `${weightDiff > 0 ? "+" : ""}${fmtNum(weightDiff, 1)} ${unit}`
        }
        sub={
          weightDiff === null
            ? "chưa có số cân"
            : lost
            ? "đang giảm"
            : gained
            ? "đang tăng"
            : "giữ nguyên"
        }
        tone={lost ? "down" : gained ? "up" : "neutral"}
      />
      <StatTile
        icon={<Images className="size-4" />}
        label="Số ảnh"
        value={fmtNum(stats.count, 0)}
        sub="đã ghi lại"
        tone="primary"
      />
      <StatTile
        icon={<Clock className="size-4" />}
        label="Trung bình"
        value={`${fmtNum(stats.avgIntervalDays, 1)} ngày`}
        sub="giữa các ảnh"
        tone="primary"
      />
    </motion.div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "primary" | "down" | "up" | "neutral";
}) {
  const valueColor =
    tone === "down"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "up"
      ? "text-[color:var(--brand-coral)]"
      : tone === "neutral"
      ? "text-muted-foreground"
      : "text-grad-primary";
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-soft">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className={cn("text-2xl font-extrabold tracking-tight", valueColor)}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

/* ============================ Tips card ============================ */

function TipsCard() {
  return (
    <SectionCard
      title="Gợi ý chụp ảnh"
      subtitle="Để so sánh chính xác nhất"
      icon={<Lightbulb className="size-4" />}
    >
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Tip
          emoji="🕐"
          title="Cùng giờ trong ngày"
          text="Chụp vào buổi sáng khi vừa thức dậy, lúc cơ thể chưa ăn uống."
        />
        <Tip
          emoji="💡"
          title="Cùng ánh sáng"
          text="Đứng gần cửa sổ có ánh sáng tự nhiên, tránh đèn vàng/trắng lẫn lộn."
        />
        <Tip
          emoji="📷"
          title="Cùng góc & tư thế"
          text="Đặt camera ngang ngực, chụp chính diện + nghiêng + bên cạnh."
        />
      </ul>
    </SectionCard>
  );
}

function Tip({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-2.5 rounded-2xl border border-border/60 bg-muted/40 p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-background text-base shadow-soft">
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </li>
  );
}

/* ============================ Lightbox ============================ */

function Lightbox({
  photos,
  index,
  unitSystem,
  onClose,
  onIndexChange,
  onDelete,
}: {
  photos: ProgressPhoto[];
  index: number;
  unitSystem: "metric" | "imperial";
  onClose: () => void;
  onIndexChange: (i: number) => void;
  onDelete: (p: ProgressPhoto) => void;
}) {
  const photo = photos[index];

  // Keyboard navigation — must be called unconditionally (rules of hooks).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft")
        onIndexChange((index - 1 + photos.length) % photos.length);
      else if (e.key === "ArrowRight")
        onIndexChange((index + 1) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndexChange]);

  if (!photo) return null;
  const weight = photoChipWeight(photo, unitSystem);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 backdrop-blur sm:p-6"
      onClick={onClose}
    >
      <motion.img
        key={photo.id}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        src={photo.dataUrl}
        alt={`Ảnh tiến độ ${dateLabel(photo.date)}`}
        className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-lift"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 sm:right-5 sm:top-5"
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(photo);
        }}
        className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-[color:var(--brand-rose)] sm:left-5 sm:top-5"
        aria-label="Xoá ảnh"
      >
        <Trash2 className="size-5" />
      </button>

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <Calendar className="size-3.5" />
            {dateLabel(photo.date)}
          </span>
          {weight && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <Scale className="size-3.5" />
              {weight}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <Sparkles className="size-3.5" />
            Ảnh tiến độ
          </span>
        </div>
        {photo.note && (
          <p className="max-w-md text-sm italic text-white/85">“{photo.note}”</p>
        )}
        <span className="text-[11px] font-medium text-white/60">
          {index + 1} / {photos.length} · Dùng ← → để chuyển ảnh
        </span>
      </div>

      {/* Prev / next */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + photos.length) % photos.length);
            }}
            className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 sm:left-4 sm:h-12 sm:w-12"
            aria-label="Ảnh trước"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % photos.length);
            }}
            className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 sm:right-4 sm:h-12 sm:w-12"
            aria-label="Ảnh sau"
          >
            <ArrowRight className="size-5" />
          </button>
        </>
      )}
    </motion.div>
  );
}

/* ============================ Logging drawer ============================ */

function ProgressDrawer({
  open,
  onOpenChange,
  profile,
  unitSystem,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: Profile | undefined;
  unitSystem: "metric" | "imperial";
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [date, setDate] = useState<string>(todayKey());
  const [weightInput, setWeightInput] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);

  const metric = unitSystem === "metric";
  const unit = weightLabel(unitSystem);

  // Reset form whenever the drawer opens.
  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPendingFile(null);
    setDate(todayKey());
    setNote("");
    const startKg = profile?.currentWeight ?? 70;
    const startDisp = metric
      ? round(startKg, 1)
      : round(kgToLb(startKg), 1);
    setWeightInput(String(startDisp));
  }, [open, profile, metric]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File không phải ảnh");
      // reset input so same file can be re-picked
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setPendingFile(file);
    setCompressing(true);
    try {
      const url = await fileToCompressedDataUrl(file, 1280, 0.8);
      setPreview(url);
    } catch {
      toast.error("Không xử lý được ảnh");
      setPreview(null);
      setPendingFile(null);
    } finally {
      setCompressing(false);
      // reset input so the same file can be picked again later
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save() {
    if (!profile) {
      toast.error("Chưa có hồ sơ hoạt động");
      return;
    }
    if (!preview || !pendingFile) {
      toast.error("Vui lòng chọn một ảnh");
      return;
    }
    if (!date) {
      toast.error("Vui lòng chọn ngày");
      return;
    }
    setSaving(true);
    try {
      // Parse optional weight (display unit -> kg canonical)
      let weightKg: number | undefined;
      const w = parseFloat(weightInput.replace(",", "."));
      if (!Number.isNaN(w) && w > 0) {
        weightKg = round(parseWeightInput(w, unitSystem), 2);
      }

      const entry: ProgressPhoto = {
        id: uid(),
        profileId: profile.id,
        date,
        dataUrl: preview,
        weightKg,
        note: note.trim() || undefined,
        createdAt: Date.now(),
      };
      await db.progressPhotos.put(entry);
      toast.success("Đã lưu ảnh tiến độ 📸");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Không lưu được ảnh");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center justify-center gap-2 text-center text-lg font-extrabold">
            <Camera className="size-5" /> Chụp ảnh tiến độ
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Tải ảnh cơ thể, chọn ngày và ghi cân nặng tuỳ chọn
          </DrawerDescription>
        </DrawerHeader>

        <div className="mx-auto w-full max-w-md space-y-4 overflow-y-auto px-4 pb-6 no-scrollbar">
          {/* Image picker / preview */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPickFile}
            className="hidden"
          />

          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted">
              <img
                src={preview}
                alt="Xem trước"
                className="max-h-[40vh] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setPendingFile(null);
                }}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-[color:var(--brand-rose)]"
                aria-label="Bỏ ảnh"
              >
                <X className="size-4" />
              </button>
              {compressing && (
                <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ImageUp className="size-6" />
              </span>
              <span className="text-sm font-bold">Chọn hoặc chụp ảnh</span>
              <span className="text-xs text-muted-foreground">
                Máy ảnh trước · Hỗ trợ ảnh từ thư viện
              </span>
            </button>
          )}

          {/* Date + weight */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ngày
              </label>
              <Input
                type="date"
                value={date}
                max={todayKey()}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cân nặng ({unit})
              </label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="Tuỳ chọn"
                className="h-11"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ghi chú (tuỳ chọn)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Sáng, sau khi tập, ánh sáng cửa sổ..."
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Huỷ
            </Button>
            <Button
              className="flex-[2] gap-2 border-transparent text-white grad-primary hover:opacity-90"
              disabled={saving || !preview || compressing}
              onClick={save}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Lưu ảnh
                </>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ============================ Skeleton ============================ */

function ProgressSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-28 animate-pulse rounded-3xl border border-border/70 bg-muted/60" />
      <div className="h-72 animate-pulse rounded-3xl border border-border/70 bg-muted/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-3xl border border-border/70 bg-muted/60"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-2xl border border-border/70 bg-muted/60"
          />
        ))}
      </div>
    </div>
  );
}
