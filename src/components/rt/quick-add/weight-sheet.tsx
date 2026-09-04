"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useLiveQuery } from "dexie-react-hooks";
import { db, uid } from "@/lib/rt/db";
import { useRtStore } from "@/store/rt-store";
import { todayKey } from "@/lib/rt/dates";
import { displayWeight, parseWeightInput, round, kgToLb, lbToKg } from "@/lib/rt/utils";
import type { WeightEntry } from "@/lib/rt/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { WheelPicker } from "@/components/rt/shared/wheel-picker";

export function WeightSheet() {
  const { quickAdd, setQuickAdd, activeProfileId, unitSystem } = useRtStore();
  const open = quickAdd === "weight";
  const profile = useLiveQuery(() => (activeProfileId ? db.profiles.get(activeProfileId) : undefined), [activeProfileId]);
  const entries = useLiveQuery(
    () => (activeProfileId ? db.weights.where("profileId").equals(activeProfileId).sortBy("createdAt") : []),
    [activeProfileId]
  );

  const last = entries?.[entries.length - 1];
  const metric = unitSystem === "metric";

  // Build value list (one decimal) in the active unit.
  const values = useMemo(() => {
    const arr: number[] = [];
    for (let v = 30; v <= 180.05; v = round(v + 0.1, 1)) arr.push(v);
    return arr;
  }, []);

  const [val, setVal] = useState(70);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayKey());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNote("");
      setDate(todayKey());
      const startKg = last?.weightKg ?? profile?.currentWeight ?? 70;
      const start = metric ? round(startKg, 1) : round(kgToLb(startKg), 1);
      // snap to nearest 0.1 within range
      const clamped = Math.max(30, Math.min(180, start));
      setVal(round(clamped, 1));
    }
  }, [open]);

  const unitLabel = metric ? "kg" : "lbs";
  const valKg = parseWeightInput(val, unitSystem);

  const diff = last ? round(valKg - last.weightKg, 1) : 0;
  const lost = diff < 0;
  const gained = diff > 0;

  async function save() {
    if (!profile || !activeProfileId) return;
    setSaving(true);
    try {
      const entry: WeightEntry = {
        id: uid(),
        profileId: activeProfileId,
        date,
        weightKg: round(valKg, 2),
        note: note.trim() || undefined,
        createdAt: Date.now(),
      };
      await db.weights.put(entry);
      // keep profile.currentWeight in sync
      const newWeight = round(valKg, 2);
      const prevWeight = profile.currentWeight;
      await db.profiles.update(activeProfileId, { currentWeight: newWeight });
      // achievements
      const runs = await db.runs.where("profileId").equals(activeProfileId).toArray();
      const weights = await db.weights.where("profileId").equals(activeProfileId).toArray();
      const { evaluateAchievements } = await import("@/lib/rt/achievements");
      const updatedProfile = { ...profile, currentWeight: newWeight };
      const newly = await evaluateAchievements(updatedProfile, runs, weights);

      // Weight-goal-reached celebration: detect if this entry caused the
      // current weight to cross the target threshold for the first time.
      const target = profile.targetWeight;
      const losing = target < prevWeight; // user aims to lose
      const gaining = target > prevWeight; // user aims to gain
      const crossed =
        (losing && prevWeight > target && newWeight <= target) ||
        (gaining && prevWeight < target && newWeight >= target);
      if (crossed && Math.abs(target - prevWeight) > 0.01) {
        setTimeout(() => {
          useRtStore.getState().pushCelebration("__weight_goal__");
        }, newly.length > 0 ? 2600 : 0);
      }

      setQuickAdd(null);
      toast.success("Đã ghi cân nặng ⚖️");
      for (const t of newly) useRtStore.getState().pushCelebration(t);
    } catch (e) {
      console.error(e);
      toast.error("Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && setQuickAdd(null)}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-lg font-extrabold">Cân nặng hôm nay</DrawerTitle>
          <DrawerDescription className="sr-only">Chọn cân nặng</DrawerDescription>
        </DrawerHeader>

        <div className="mx-auto w-full max-w-md space-y-5 overflow-y-auto px-4 pb-6 no-scrollbar">
          {/* diff banner */}
          <AnimatePresence mode="wait">
            {last && (
              <motion.div
                key={diff}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold",
                  lost && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  gained && "border-[color:var(--brand-coral)]/30 bg-[color:var(--brand-coral)]/10 text-[color:var(--brand-coral)]",
                  !lost && !gained && "border-border bg-muted text-muted-foreground"
                )}
              >
                {lost ? <TrendingDown className="h-4 w-4" /> : gained ? <TrendingUp className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
                {lost ? `Đã giảm ${Math.abs(diff)} kg so với lần trước 🎉` : gained ? `Tăng ${diff} kg so với lần trước` : "Giữ nguyên so với lần trước"}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wheel picker */}
          <div className="rounded-3xl border border-border/70 bg-card p-2 shadow-soft">
            <WheelPicker
              values={values}
              value={val}
              onChange={setVal}
              suffix={unitLabel}
              itemHeight={44}
              visible={5}
              format={(v) => v.toFixed(1)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ngày</label>
              <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ghi chú (tuỳ chọn)</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Sáng, sau khi tập..." className="resize-none" rows={2} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setQuickAdd(null)}>Huỷ</Button>
            <Button className="flex-[2] gap-2 grad-primary border-transparent text-white hover:opacity-90" disabled={saving} onClick={save}>
              {saving ? "Đang lưu..." : "Lưu cân nặng"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
