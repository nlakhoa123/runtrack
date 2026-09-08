"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRtStore } from "@/store/rt-store";
import { db, uid } from "@/lib/rt/db";
import { haversineMeters, simplifyTrace, traceDistanceKm, type GPSPoint } from "@/lib/rt/gps";
import { RouteMap } from "@/components/rt/shared/route-map";
import { todayKey } from "@/lib/rt/dates";
import { calcCalories, calcAvgSpeed, fmtDuration } from "@/lib/rt/utils";
import type { RunSession, Feeling } from "@/lib/rt/types";
import { toast } from "sonner";
import { Play, Pause, Square, MapPin, X, Flag, Navigation, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FEELINGS } from "@/lib/rt/types";

type LiveState = "idle" | "running" | "paused" | "finished";

export function LiveRunOverlay() {
  const open = useRtStore((s) => s.liveRunOpen);
  const setOpen = useRtStore((s) => s.setLiveRunOpen);
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);
  const setQuickAdd = useRtStore((s) => s.setQuickAdd);

  const [state, setState] = useState<LiveState>("idle");
  const [points, setPoints] = useState<GPSPoint[]>([]);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const pausedAccumRef = useRef<number>(0);
  const [feeling, setFeeling] = useState<Feeling>("good");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // reset when closed
  useEffect(() => {
    if (!open) {
      stopWatch();
      stopTimer();
      setState("idle");
      setPoints([]);
      setElapsed(0);
      pausedAccumRef.current = 0;
      setFeeling("good");
      setNote("");
      setSaving(false);
    }
  }, [open]);

  function stopWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }
  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startRun() {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ GPS");
      return;
    }
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((p) => {
      setPermission(p.state as "granted" | "denied" | "prompt");
    }).catch(() => setPermission("unknown"));

    startRef.current = Date.now();
    pausedAccumRef.current = 0;
    setPoints([]);
    setElapsed(0);
    setState("running");
    // timer for elapsed seconds
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current - pausedAccumRef.current) / 1000));
    }, 500);
    // watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt: GPSPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: pos.timestamp,
        };
        setPoints((prev) => {
          // only add if moved > 4 meters from the last point (reduces jitter)
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (haversineMeters(last, pt) < 4) return prev;
          }
          return [...prev, pt];
        });
      },
      (err) => {
        console.error("geo error", err);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          toast.error("Từ chối quyền vị trí. Bật GPS trong cài đặt trình duyệt để đo quãng chạy.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }

  function pauseRun() {
    if (state !== "running") return;
    stopWatch();
    pausedAccumRef.current += Date.now() - startRef.current;
    stopTimer();
    setState("paused");
  }

  function resumeRun() {
    if (state !== "paused") return;
    startRef.current = Date.now();
    setState("running");
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current - pausedAccumRef.current) / 1000));
    }, 500);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt: GPSPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: pos.timestamp };
        setPoints((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (haversineMeters(last, pt) < 4) return prev;
          }
          return [...prev, pt];
        });
      },
      (err) => console.error("geo error", err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }

  function stopRun() {
    stopWatch();
    stopTimer();
    setState("finished");
  }

  const distKm = useMemo(() => traceDistanceKm(points), [points]);
  const avgSpeed = elapsed > 0 ? (distKm / (elapsed / 3600)) : 0;
  const pace = distKm > 0 ? elapsed / distKm : 0; // sec per km
  const paceMin = Math.floor(pace / 60);
  const paceSec = Math.round(pace - paceMin * 60);

  async function saveRun() {
    if (!activeProfileId) return;
    setSaving(true);
    try {
      const profile = await db.profiles.get(activeProfileId);
      const durationMin = Math.max(1, Math.round(elapsed / 60));
      const simplified = simplifyTrace(points, 8);
      const calories = calcCalories(distKm, durationMin, profile?.currentWeight ?? 70);
      const run: RunSession = {
        id: uid(),
        profileId: activeProfileId,
        date: todayKey(),
        durationMin,
        distanceKm: distKm,
        avgSpeed: calcAvgSpeed(distKm, durationMin),
        calories,
        feeling,
        note: note.trim() || undefined,
        createdAt: Date.now(),
        trace: simplified.length > 1 ? simplified : undefined,
      };
      await db.runs.put(run);
      // achievements
      const runs = await db.runs.where("profileId").equals(activeProfileId).toArray();
      const weights = await db.weights.where("profileId").equals(activeProfileId).toArray();
      const { evaluateAchievements } = await import("@/lib/rt/achievements");
      const newly = profile ? await evaluateAchievements(profile, runs, weights) : [];
      setOpen(false);
      toast.success(`Đã ghi chạy ${distKm} km 🎉`);
      for (const t of newly) useRtStore.getState().pushCelebration(t);
    } catch (e) {
      console.error(e);
      toast.error("Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col bg-background"
        >
          {/* top bar */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              <span className="text-base font-bold">Chạy trực tiếp</span>
              {state === "running" && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
                </span>
              )}
            </div>
            <button
              onClick={() => {
                stopWatch();
                stopTimer();
                setOpen(false);
              }}
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* permission denied warning */}
          {permission === "denied" && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-[color:var(--brand-rose)]/40 bg-[color:var(--brand-rose)]/10 px-3 py-2.5 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-rose)]" />
              <span className="text-foreground">
                Đã từ chối quyền vị trí. Mở cài đặt trình duyệt → cho phép RunTrack truy cập vị trí để đo quãng chạy.
              </span>
            </div>
          )}

          {/* big stats */}
          <div className="flex-1 overflow-y-auto p-4">
            {state === "idle" ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div className="grid h-24 w-24 place-items-center rounded-[2rem] grad-primary text-white shadow-glow">
                  <MapPin className="h-12 w-12" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">Sẵn sàng chạy?</h2>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Bấm Bắt đầu — app theo dõi GPS theo thời gian thực, tính km, nhịp, calo, và vẽ đường chạy trên bản đồ.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={startRun}
                  className="gap-2 grad-primary border-transparent text-base text-white shadow-lift"
                >
                  <Play className="h-5 w-5" /> Bắt đầu chạy
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  💡 Mở ngoài trời để GPS chính xác nhất. Tiếp tục chạy nền nếu tắt màn hình.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* live map */}
                <div className="relative overflow-hidden rounded-3xl border border-border/60">
                  {points.length > 1 ? (
                    <RouteMap points={points} height={200} markers={false} />
                  ) : (
                    <div className="grid h-[200px] place-items-center bg-muted/40 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Navigation className="h-4 w-4 animate-pulse" /> Đang chờ tín hiệu GPS...
                      </span>
                    </div>
                  )}
                </div>

                {/* big distance */}
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quãng đường</p>
                  <p className="text-6xl font-extrabold tracking-tight tnum">
                    {distKm.toFixed(2)}
                    <span className="ml-2 text-2xl font-semibold text-muted-foreground">km</span>
                  </p>
                </div>

                {/* secondary stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-border/60 bg-card p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Thời gian</p>
                    <p className="tnum mt-0.5 text-lg font-extrabold">{fmtDuration(Math.floor(elapsed / 60))}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Nhịp</p>
                    <p className="tnum mt-0.5 text-lg font-extrabold">{distKm > 0 ? `${paceMin}:${paceSec.toString().padStart(2, "0")}` : "--:--"}</p>
                    <p className="text-[9px] text-muted-foreground">min/km</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Tốc độ</p>
                    <p className="tnum mt-0.5 text-lg font-extrabold">{avgSpeed.toFixed(1)}</p>
                    <p className="text-[9px] text-muted-foreground">km/h</p>
                  </div>
                </div>

                {/* finished form */}
                {state === "finished" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cảm giác</p>
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
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ghi chú (tuỳ chọn)..."
                      className="w-full resize-none rounded-2xl border border-border bg-card px-3 py-2.5 text-sm"
                      rows={2}
                    />
                    <Button
                      onClick={saveRun}
                      disabled={saving}
                      className="w-full gap-2 grad-primary border-transparent text-white shadow-soft hover:opacity-90"
                    >
                      {saving ? "Đang lưu..." : `Lưu buổi chạy ${distKm} km`}
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* bottom controls (running / paused) */}
          {(state === "running" || state === "paused") && (
            <div className="border-t border-border/60 p-4">
              {state === "running" ? (
                <div className="flex gap-2">
                  <Button onClick={pauseRun} variant="outline" className="flex-1 gap-2">
                    <Pause className="h-5 w-5" /> Tạm dừng
                  </Button>
                  <Button onClick={stopRun} className="flex-[1.5] gap-2 grad-energy border-transparent text-white">
                    <Square className="h-4 w-4" /> Kết thúc
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={resumeRun} className="flex-1 gap-2 grad-primary border-transparent text-white">
                    <Play className="h-5 w-5" /> Tiếp tục
                  </Button>
                  <Button onClick={stopRun} variant="outline" className="flex-1 gap-2">
                    <Flag className="h-4 w-4" /> Kết thúc
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
