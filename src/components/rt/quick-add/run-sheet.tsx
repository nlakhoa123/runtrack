"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useLiveQuery } from "dexie-react-hooks";
import { db, uid, fileToCompressedDataUrl } from "@/lib/rt/db";
import { useRtStore } from "@/store/rt-store";
import { FEELINGS, type Feeling, type RunSession, type RunPhoto } from "@/lib/rt/types";
import { calcCalories, calcAvgSpeed, calcPace, fmtDuration, displayDistance, parseDistanceInput, round } from "@/lib/rt/utils";
import { todayKey, fmtDate } from "@/lib/rt/dates";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Clock, Route, Gauge, Zap, History, Pencil, Trash2, Camera, X, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RunSheet() {
  const quickAdd = useRtStore((s) => s.quickAdd);
  const editRunId = useRtStore((s) => s.editRunId);
  const setQuickAdd = useRtStore((s) => s.setQuickAdd);
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);
  const open = quickAdd === "run";
  const isEditing = !!editRunId;
  const profile = useLiveQuery(() => (activeProfileId ? db.profiles.get(activeProfileId) : undefined), [activeProfileId]);
  const editingRun = useLiveQuery(() => (editRunId ? db.runs.get(editRunId) : undefined), [editRunId]);
  const lastRun = useLiveQuery(async () => {
    if (!activeProfileId) return undefined;
    const all = await db.runs.where("profileId").equals(activeProfileId).toArray();
    return all.sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [activeProfileId]);

  const [distance, setDistance] = useState(5); // in active unit
  const [duration, setDuration] = useState(30); // minutes
  const [feeling, setFeeling] = useState<Feeling>("good");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayKey());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // photos: existing (from DB) + new (pending upload). Each is { id?, dataUrl, isNew }.
  const [photos, setPhotos] = useState<{ id?: string; dataUrl: string; isNew: boolean }[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingNewRunIdRef = useRef<string | null>(null);

  // initialize form: load editing run when editing, otherwise defaults on open
  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setPhotos([]);
      return;
    }
    if (isEditing && editingRun) {
      setDistance(round(displayDistance(editingRun.distanceKm, unitSystem, 2), 1));
      setDuration(round(editingRun.durationMin, 0));
      setFeeling(editingRun.feeling);
      setNote(editingRun.note ?? "");
      setDate(editingRun.date);
      // load existing photos for this run
      db.photos.where("runId").equals(editingRun.id).sortBy("createdAt")
        .then((ps) => setPhotos(ps.map((p) => ({ id: p.id, dataUrl: p.dataUrl, isNew: false }))))
        .catch(() => setPhotos([]));
    } else if (!isEditing) {
      setNote("");
      setDate(todayKey());
      setFeeling("good");
      setPhotos([]);
      // keep last-used distance/duration for quick logging
    }
  }, [open, isEditing, editingRun, unitSystem]);

  const distanceKm = parseDistanceInput(distance, unitSystem);
  const calories = useMemo(
    () => calcCalories(distanceKm, duration, profile?.currentWeight ?? 70),
    [distanceKm, duration, profile]
  );
  const avgSpeed = calcAvgSpeed(distanceKm, duration);
  const pace = calcPace(distanceKm, duration);
  const distLabel = unitSystem === "metric" ? "km" : "mi";
  const distMax = unitSystem === "metric" ? 50 : 31;
  const distStep = 0.1;

  async function handlePickPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoLoading(true);
    try {
      const arr = Array.from(files).slice(0, 8); // max 8 at a time
      const compressed: { dataUrl: string; isNew: true }[] = [];
      for (const f of arr) {
        try {
          const dataUrl = await fileToCompressedDataUrl(f, 1280, 0.8);
          compressed.push({ dataUrl, isNew: true });
        } catch (e) {
          console.error(e);
        }
      }
      if (compressed.length > 0) {
        setPhotos((prev) => [...prev, ...compressed].slice(0, 12)); // max 12 total
        toast.success(`Đã thêm ${compressed.length} ảnh`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Không tải được ảnh");
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!profile || !activeProfileId) return;
    if (distanceKm <= 0 || duration <= 0) {
      toast.error("Nhập quãng đường và thời gian hợp lệ");
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      const run: RunSession = {
        id: isEditing && editingRun ? editingRun.id : uid(),
        profileId: activeProfileId,
        date,
        durationMin: round(duration, 1),
        distanceKm: round(distanceKm, 2),
        avgSpeed,
        calories,
        feeling,
        note: note.trim() || undefined,
        createdAt: isEditing && editingRun ? editingRun.createdAt : now,
      };
      await db.runs.put(run);

      // Persist photos: save new ones, delete removed ones.
      if (isEditing && editingRun) {
        const existing = await db.photos.where("runId").equals(editingRun.id).toArray();
        const keptIds = new Set(photos.filter((p) => p.id).map((p) => p.id));
        const toDelete = existing.filter((p) => !keptIds.has(p.id));
        if (toDelete.length) await db.photos.bulkDelete(toDelete.map((p) => p.id));
      }
      const newPhotos: RunPhoto[] = photos
        .filter((p) => p.isNew)
        .map((p) => ({
          id: uid(),
          runId: run.id,
          profileId: activeProfileId,
          dataUrl: p.dataUrl,
          createdAt: Date.now(),
        }));
      if (newPhotos.length) await db.photos.bulkPut(newPhotos);

      // evaluate achievements
      const runs = await db.runs.where("profileId").equals(activeProfileId).toArray();
      const weights = await db.weights.where("profileId").equals(activeProfileId).toArray();
      const { evaluateAchievements } = await import("@/lib/rt/achievements");
      const newly = await evaluateAchievements(profile, runs, weights);

      // Weekly km goal mini-celebration: detect if this run pushed the week's
      // total km to >= the target for the first time this week.
      if (!isEditing && profile.targetKmPerWeek > 0) {
        const { currentWeekKeys } = await import("@/lib/rt/dates");
        const weekKeys = new Set(currentWeekKeys());
        const weekKm = runs
          .filter((r) => weekKeys.has(r.date))
          .reduce((s, r) => s + r.distanceKm, 0);
        const weekKmBeforeThisRun = weekKm - distanceKm;
        if (weekKmBeforeThisRun < profile.targetKmPerWeek && weekKm >= profile.targetKmPerWeek) {
          // Fire a special "goal hit" celebration after the achievement ones.
          setTimeout(() => {
            useRtStore.getState().pushCelebration("__weekly_goal__");
          }, newly.length > 0 ? 2600 : 0);
        }
      }

      setQuickAdd(null);
      toast.success(isEditing ? "Đã cập nhật buổi chạy ✏️" : "Đã ghi buổi chạy 🎉");
      for (const t of newly) useRtStore.getState().pushCelebration(t);
    } catch (e) {
      console.error(e);
      toast.error("Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRun() {
    if (!editingRun || !activeProfileId) return;
    setSaving(true);
    try {
      // delete associated photos first
      await db.photos.where("runId").equals(editingRun.id).delete();
      await db.runs.delete(editingRun.id);
      setQuickAdd(null);
      setConfirmDelete(false);
      toast.success("Đã xoá buổi chạy");
    } catch (e) {
      console.error(e);
      toast.error("Không xoá được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && setQuickAdd(null)}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center justify-center gap-2 text-center text-lg font-extrabold">
            {isEditing ? <><Pencil className="h-4 w-4 text-primary" /> Sửa buổi chạy</> : "Ghi nhận buổi chạy"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">Nhập quãng đường, thời gian và cảm giác</DrawerDescription>
        </DrawerHeader>

        <div className="mx-auto w-full max-w-md space-y-5 overflow-y-auto px-4 pb-6 no-scrollbar">
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--brand-rose)]/40 bg-[color:var(--brand-rose)]/10 px-4 py-3"
            >
              <span className="text-sm font-medium text-[color:var(--brand-rose)]">Xoá buổi chạy này?</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Huỷ</Button>
                <Button size="sm" variant="destructive" onClick={deleteRun} disabled={saving}>Xoá</Button>
              </div>
            </motion.div>
          )}
          {/* Live summary card */}
          <motion.div
            key={`${distanceKm}-${duration}`}
            className="relative overflow-hidden rounded-3xl border border-border/70 p-4 grad-primary text-white shadow-glow"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">Quãng đường</p>
                <p className="text-3xl font-extrabold tracking-tight">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={displayDistance(distanceKm, unitSystem, 2)}
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -8, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="tnum inline-block"
                    >
                      {displayDistance(distanceKm, unitSystem, 2)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="ml-1 text-base font-semibold opacity-80">{distLabel}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">Thời gian</p>
                <p className="text-3xl font-extrabold tracking-tight tnum">{fmtDuration(duration)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/15 py-2 backdrop-blur">
                <p className="text-[10px] uppercase opacity-80">Tốc độ</p>
                <p className="tnum text-sm font-bold">{avgSpeed} km/h</p>
              </div>
              <div className="rounded-2xl bg-white/15 py-2 backdrop-blur">
                <p className="text-[10px] uppercase opacity-80">Nhịp</p>
                <p className="tnum text-sm font-bold">{pace}/km</p>
              </div>
              <div className="rounded-2xl bg-white/20 py-2 backdrop-blur">
                <p className="text-[10px] uppercase opacity-80">Calo</p>
                <p className="tnum text-sm font-bold flex items-center justify-center gap-1"><Flame className="h-3 w-3" />{calories}</p>
              </div>
            </div>
          </motion.div>

          {/* Distance slider */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Route className="h-3.5 w-3.5" /> Quãng đường</label>
              <span className="tnum text-sm font-bold">{distance} {distLabel}</span>
            </div>
            <Slider value={[distance]} onValueChange={(v) => setDistance(v[0])} min={0} max={distMax} step={distStep} />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>0</span><span>{distMax} {distLabel}</span></div>
          </div>

          {/* Duration slider */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Thời gian</label>
              <span className="tnum text-sm font-bold">{fmtDuration(duration)}</span>
            </div>
            <Slider value={[duration]} onValueChange={(v) => setDuration(v[0])} min={1} max={240} step={1} />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>1m</span><span>4h</span></div>
            {/* quick chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[15, 30, 45, 60, 90].map((m) => (
                <button key={m} onClick={() => setDuration(m)} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors", duration === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{fmtDuration(m)}</button>
              ))}
            </div>
          </div>

          {/* Feeling */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cảm giác</label>
            <div className="flex justify-between gap-1.5">
              {FEELINGS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFeeling(f.id)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-2xl border py-2.5 transition-all",
                    feeling === f.id ? "border-transparent text-white shadow-soft scale-105" : "border-border bg-card hover:bg-muted"
                  )}
                  style={feeling === f.id ? { backgroundImage: "var(--grad-primary)" } : undefined}
                >
                  <span className="text-2xl">{f.emoji}</span>
                  <span className="text-[10px] font-semibold">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + note */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ngày</label>
              <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ghi chú (tuỳ chọn)</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Sáng mát, vòng hồ..." className="resize-none" rows={2} />
            </div>
          </div>

          {/* Photos — journey memories */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Camera className="h-3.5 w-3.5" /> Ảnh kỉ niệm
              </label>
              <span className="text-[10px] text-muted-foreground">{photos.length}/12</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePickPhotos(e.target.files)}
            />
            {photos.length > 0 && (
              <div className="mb-2 grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-border/60"
                  >
                    <img src={p.dataUrl} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Xoá ảnh"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoLoading || photos.length >= 12}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-xs font-semibold transition-colors",
                photoLoading || photos.length >= 12
                  ? "text-muted-foreground/60"
                  : "text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-primary"
              )}
            >
              {photoLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</>
              ) : photos.length >= 12 ? (
                "Đã đủ 12 ảnh"
              ) : (
                <><ImagePlus className="h-4 w-4" /> {photos.length === 0 ? "Thêm ảnh kỉ niệm" : "Thêm ảnh nữa"}</>
              )}
            </button>
          </div>

          {/* Quick log: like last run (only when creating new) */}
          {!isEditing && lastRun && (
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                <span>Giống hôm qua: <b className="text-foreground">{displayDistance(lastRun.distanceKm, unitSystem, 2)} {distLabel}</b> · {fmtDuration(lastRun.durationMin)}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => { setDistance(round(displayDistance(lastRun.distanceKm, unitSystem, 2), 1)); setDuration(round(lastRun.durationMin, 0)); setFeeling(lastRun.feeling); }}>
                <Zap className="h-3 w-3" /> Dùng
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {isEditing ? (
              <>
                <Button variant="ghost" className="gap-1.5 text-[color:var(--brand-rose)] hover:bg-[color:var(--brand-rose)]/10 hover:text-[color:var(--brand-rose)]" onClick={() => setConfirmDelete(true)} disabled={saving}>
                  <Trash2 className="h-4 w-4" /> Xoá
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setQuickAdd(null)}>Huỷ</Button>
                <Button className="flex-[2] gap-2 grad-primary border-transparent text-white hover:opacity-90" disabled={saving} onClick={save}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="flex-1" onClick={() => setQuickAdd(null)}>Huỷ</Button>
                <Button className="flex-[2] gap-2 grad-primary border-transparent text-white hover:opacity-90" disabled={saving} onClick={save}>
                  {saving ? "Đang lưu..." : "Lưu buổi chạy"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
