"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRtStore } from "@/store/rt-store";
import { db, uid } from "@/lib/rt/db";
import { haversineMeters, simplifyTrace, traceDistanceKm, type GPSPoint } from "@/lib/rt/gps";
import { RouteMap } from "@/components/rt/shared/route-map";
import { todayKey } from "@/lib/rt/dates";
import { calcCalories, calcAvgSpeed, fmtDuration, round } from "@/lib/rt/utils";
import type { RunSession, Feeling } from "@/lib/rt/types";
import { FEELINGS } from "@/lib/rt/types";
import { toast } from "sonner";
import { Play, Pause, Square, MapPin, X, Flag, Navigation, AlertCircle, Activity, Dumbbell, Mountain, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type LiveState = "idle" | "mode-select" | "running" | "paused" | "finished";
type RunMode = "outdoor" | "treadmill";

export function LiveRunOverlay() {
  const open = useRtStore((s) => s.liveRunOpen);
  const setOpen = useRtStore((s) => s.setLiveRunOpen);
  const activeProfileId = useRtStore((s) => s.activeProfileId);

  const [state, setState] = useState<LiveState>("mode-select");
  const [mode, setMode] = useState<RunMode>("outdoor");
  const [points, setPoints] = useState<GPSPoint[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [stepCount, setStepCount] = useState(0);
  const [manualSpeed, setManualSpeed] = useState(8); // km/h for treadmill fallback
  const [useManualSpeed, setUseManualSpeed] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const pausedAccumRef = useRef<number>(0);
  const motionRef = useRef<number | null>(null);
  const lastAccelRef = useRef<number>(Date.now());
  const stepThresholdRef = useRef<number>(11); // m/s^2 threshold for step detection
  const [feeling, setFeeling] = useState<Feeling>("good");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // step length: default 0.7m, or estimated from height (height * 0.415)
  const stepLengthM = useMemo(() => {
    // try to get from profile height
    return 0.75; // default ~75cm per step
  }, []);

  useEffect(() => {
    if (!open) {
      stopAll();
      setState("mode-select");
      setMode("outdoor");
      setPoints([]);
      setStepCount(0);
      setElapsed(0);
      pausedAccumRef.current = 0;
      setFeeling("good");
      setNote("");
      setSaving(false);
      setUseManualSpeed(false);
    }
  }, [open]);

  function stopAll() {
    stopWatch();
    stopTimer();
    stopMotion();
  }
  function stopWatch() {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
  }
  function stopTimer() {
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }
  function stopMotion() {
    if (typeof window !== "undefined" && (window as any).DeviceMotionEvent) {
      window.removeEventListener("devicemotion", handleMotion);
    }
  }

  // Step detection via DeviceMotion
  function handleMotion(e: DeviceMotionEvent) {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const now = Date.now();
    // detect step: acceleration spike above threshold, with minimum 250ms between steps
    if (magnitude > stepThresholdRef.current && now - lastAccelRef.current > 250) {
      lastAccelRef.current = now;
      setStepCount((s) => s + 1);
    }
  }

  async function startOutdoor() {
    if (!navigator.geolocation) { toast.error("Trình duyệt không hỗ trợ GPS"); return; }
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((p) => {
      setPermission(p.state as "granted" | "denied" | "prompt");
    }).catch(() => setPermission("unknown"));
    startRef.current = Date.now();
    pausedAccumRef.current = 0;
    setPoints([]);
    setElapsed(0);
    setState("running");
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current - pausedAccumRef.current) / 1000));
    }, 500);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt: GPSPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: pos.timestamp };
        setPoints((prev) => {
          if (prev.length > 0 && haversineMeters(prev[prev.length - 1], pt) < 4) return prev;
          return [...prev, pt];
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) { setPermission("denied"); toast.error("Từ chối quyền vị trí."); }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }

  async function startTreadmill() {
    // Try to request motion permission (iOS 13+ requires explicit permission)
    if (typeof (DeviceMotionEvent as any)?.requestPermission === "function") {
      try {
        const perm = await (DeviceMotionEvent as any).requestPermission();
        if (perm === "granted") {
          window.addEventListener("devicemotion", handleMotion);
        } else {
          // permission denied — fallback to manual speed
          setUseManualSpeed(true);
          toast.info("Không có cảm biến chuyển động — dùng nhập tốc độ thủ công");
        }
      } catch {
        setUseManualSpeed(true);
      }
    } else if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      // Android/desktop — just listen
      window.addEventListener("devicemotion", handleMotion);
    } else {
      // No motion API — fallback to manual speed
      setUseManualSpeed(true);
      toast.info("Thiết bị không có cảm biến — dùng nhập tốc độ thủ công");
    }
    startRef.current = Date.now();
    pausedAccumRef.current = 0;
    setStepCount(0);
    setElapsed(0);
    setState("running");
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current - pausedAccumRef.current) / 1000));
    }, 500);
  }

  function startRun() {
    if (mode === "outdoor") startOutdoor();
    else startTreadmill();
  }

  function pauseRun() {
    if (state !== "running") return;
    stopWatch();
    stopMotion();
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
    if (mode === "outdoor") {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const pt: GPSPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: pos.timestamp };
          setPoints((prev) => {
            if (prev.length > 0 && haversineMeters(prev[prev.length - 1], pt) < 4) return prev;
            return [...prev, pt];
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    } else {
      if (typeof window !== "undefined" && "DeviceMotionEvent" in window && !useManualSpeed) {
        window.addEventListener("devicemotion", handleMotion);
      }
    }
  }

  function stopRun() {
    stopAll();
    setState("finished");
  }

  // Compute distance based on mode
  const distKm = useMemo(() => {
    if (mode === "outdoor") return traceDistanceKm(points);
    // treadmill: steps * stepLength / 1000, or manual speed * time
    if (useManualSpeed) return round((manualSpeed * (elapsed / 3600)), 2);
    return round((stepCount * stepLengthM) / 1000, 2);
  }, [mode, points, stepCount, stepLengthM, manualSpeed, elapsed, useManualSpeed]);

  const avgSpeed = elapsed > 0 ? (distKm / (elapsed / 3600)) : 0;
  const pace = distKm > 0 ? elapsed / distKm : 0;
  const paceMin = Math.floor(pace / 60);
  const paceSec = Math.round(pace - paceMin * 60);

  async function saveRun() {
    if (!activeProfileId) return;
    setSaving(true);
    try {
      const profile = await db.profiles.get(activeProfileId);
      const durationMin = Math.max(1, Math.round(elapsed / 60));
      const simplified = mode === "outdoor" ? simplifyTrace(points, 8) : [];
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
        mode,
        trace: mode === "outdoor" && simplified.length > 1 ? simplified : undefined,
      };
      await db.runs.put(run);
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex flex-col bg-background">
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
              {state !== "mode-select" && state !== "idle" && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {mode === "outdoor" ? "🏔️ Ngoài trời" : "🏃 Máy chạy"}
                </span>
              )}
            </div>
            <button onClick={() => { stopAll(); setOpen(false); }} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Đóng">
              <X className="h-5 w-5" />
            </button>
          </div>

          {permission === "denied" && mode === "outdoor" && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-[color:var(--brand-rose)]/40 bg-[color:var(--brand-rose)]/10 px-3 py-2.5 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-rose)]" />
              <span>Đã từ chối quyền vị trí. Mở cài đặt trình duyệt → cho phép truy cập vị trí.</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {state === "mode-select" ? (
              /* MODE SELECTION SCREEN */
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">Chọn chế độ chạy</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Mỗi chế độ dùng cảm biến khác nhau</p>
                </div>
                <div className="grid w-full max-w-sm gap-3">
                  {/* Outdoor */}
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setMode("outdoor"); startOutdoor(); }}
                    className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-5 text-left shadow-soft transition-all hover:border-primary/40 hover:shadow-lift"
                  >
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl grad-primary text-white shadow-soft">
                      <Mountain className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-extrabold">Ngoài trời</p>
                      <p className="text-xs text-muted-foreground">GPS theo dõi quãng đường + lộ trình trên bản đồ</p>
                    </div>
                  </motion.button>
                  {/* Treadmill */}
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setMode("treadmill"); startTreadmill(); }}
                    className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-5 text-left shadow-soft transition-all hover:border-primary/40 hover:shadow-lift"
                  >
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl grad-energy text-white shadow-soft">
                      <Dumbbell className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-extrabold">Trên máy chạy</p>
                      <p className="text-xs text-muted-foreground">Đếm bước chân hoặc nhập tốc độ máy (km/h)</p>
                    </div>
                  </motion.button>
                </div>
                <p className="text-[11px] text-muted-foreground">💡 Ngoài trời cần GPS · Máy chạy dùng cảm biến chuyển động hoặc nhập tay</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* live map (outdoor only) */}
                {mode === "outdoor" && (
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
                )}

                {/* treadmill: step counter + manual speed */}
                {mode === "treadmill" && (
                  <div className="space-y-3">
                    {/* step count display */}
                    {!useManualSpeed && (
                      <div className="rounded-3xl border border-border/60 bg-card p-4 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bước chân</p>
                        <p className="tnum text-4xl font-extrabold">{stepCount}</p>
                        <p className="text-[11px] text-muted-foreground">~{(stepCount * stepLengthM / 1000).toFixed(2)} km · cảm biến chuyển động</p>
                      </div>
                    )}
                    {/* manual speed fallback */}
                    <div className="rounded-3xl border border-border/60 bg-card p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tốc độ máy (dự phòng)</p>
                        <button onClick={() => setUseManualSpeed(!useManualSpeed)} className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", useManualSpeed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          {useManualSpeed ? "ĐANG DÙNG" : "BẬT"}
                        </button>
                      </div>
                      {useManualSpeed && (
                        <div className="mt-2">
                          <div className="flex items-baseline justify-between">
                            <span className="tnum text-2xl font-extrabold">{manualSpeed}</span>
                            <span className="text-sm text-muted-foreground">km/h</span>
                          </div>
                          <Slider value={[manualSpeed]} onValueChange={(v) => setManualSpeed(v[0])} min={4} max={20} step={0.5} className="mt-2" />
                          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>4</span><span>20 km/h</span></div>
                          <p className="mt-2 text-[11px] text-muted-foreground">Quãng đường = {manualSpeed} × {fmtDuration(Math.floor(elapsed / 60))} = <b className="text-foreground">{distKm} km</b></p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cảm giác</p>
                      <div className="flex justify-between gap-1.5">
                        {FEELINGS.map((f) => (
                          <button key={f.id} onClick={() => setFeeling(f.id)} className={cn("flex flex-1 flex-col items-center gap-1 rounded-2xl border py-2.5 transition-all", feeling === f.id ? "border-transparent text-white shadow-soft scale-105" : "border-border bg-card hover:bg-muted")} style={feeling === f.id ? { backgroundImage: "var(--grad-primary)" } : undefined}>
                            <span className="text-2xl">{f.emoji}</span>
                            <span className="text-[10px] font-semibold">{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tuỳ chọn)..." className="w-full resize-none rounded-2xl border border-border bg-card px-3 py-2.5 text-sm" rows={2} />
                    <Button onClick={saveRun} disabled={saving} className="w-full gap-2 grad-primary border-transparent text-white shadow-soft hover:opacity-90">
                      {saving ? "Đang lưu..." : `Lưu buổi chạy ${distKm} km`}
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* bottom controls */}
          {(state === "running" || state === "paused") && (
            <div className="border-t border-border/60 p-4">
              {state === "running" ? (
                <div className="flex gap-2">
                  <Button onClick={pauseRun} variant="outline" className="flex-1 gap-2"><Pause className="h-5 w-5" /> Tạm dừng</Button>
                  <Button onClick={stopRun} className="flex-[1.5] gap-2 grad-energy border-transparent text-white"><Square className="h-4 w-4" /> Kết thúc</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={resumeRun} className="flex-1 gap-2 grad-primary border-transparent text-white"><Play className="h-5 w-5" /> Tiếp tục</Button>
                  <Button onClick={stopRun} variant="outline" className="flex-1 gap-2"><Flag className="h-4 w-4" /> Kết thúc</Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
