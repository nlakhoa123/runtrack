"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/rt/db";
import { useRtStore } from "@/store/rt-store";
import type { MealEntry, MealSlot, Profile, RunSession } from "@/lib/rt/types";
import { todayKey, fmtDate, currentWeekKeys } from "@/lib/rt/dates";
import { round, fmtNum } from "@/lib/rt/utils";
import { EmptyState as EmptyStateComp } from "@/components/rt/shared/empty-state";
import { SectionCard as SectionCardComp } from "@/components/rt/shared/section-card";
import { Button } from "@/components/ui/button";
import { Trash2, Sparkles, Loader2, Utensils, Flame, Beef, Wheat, Droplet, TrendingDown, Sun, Moon, Coffee, Apple } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SLOTS: { id: MealSlot; label: string; emoji: string; icon: typeof Sun }[] = [
  { id: "breakfast", label: "Sáng", emoji: "🌅", icon: Sun },
  { id: "lunch", label: "Trưa", emoji: "☀️", icon: Coffee },
  { id: "dinner", label: "Tối", emoji: "🌙", icon: Moon },
  { id: "snack", label: "Phụ", emoji: "🍎", icon: Apple },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function NutritionView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const setQuickAdd = useRtStore((s) => s.setQuickAdd);
  const unitSystem = useRtStore((s) => s.unitSystem);

  const profile = useLiveQuery<Profile | undefined>(
    async () => (activeProfileId ? await db.profiles.get(activeProfileId) : undefined),
    [activeProfileId]
  );
  const meals = useLiveQuery<MealEntry[]>(
    async () => (activeProfileId ? await db.meals.where("profileId").equals(activeProfileId).toArray() : []),
    [activeProfileId]
  );
  const runs = useLiveQuery<RunSession[]>(
    async () => (activeProfileId ? await db.runs.where("profileId").equals(activeProfileId).toArray() : []),
    [activeProfileId]
  );

  const [pendingDelete, setPendingDelete] = useState<MealEntry | null>(null);

  // today's totals
  const today = todayKey();
  const todayMeals = useMemo(() => (meals ?? []).filter((m) => m.date === today), [meals, today]);
  const todayTotals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => {
        acc.calories += m.calories;
        acc.protein += m.protein;
        acc.carbs += m.carbs;
        acc.fat += m.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayMeals]);

  // this week's burned from running
  const weekBurned = useMemo(() => {
    const keys = new Set(currentWeekKeys());
    return (runs ?? []).filter((r) => keys.has(r.date)).reduce((s, r) => s + r.calories, 0);
  }, [runs]);

  if (profile === undefined || meals === undefined || runs === undefined) {
    return <NutritionSkeleton />;
  }

  const hasMeals = meals.length > 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dinh dưỡng</h1>
          <p className="text-sm text-muted-foreground">AI tính calo &amp; macro từ mô tả bữa ăn</p>
        </div>
        <Button
          onClick={() => setQuickAdd("meal")}
          className="gap-2 grad-primary border-transparent text-white shadow-soft hover:opacity-90"
        >
          <Utensils className="h-4 w-4" /> Ghi bữa ăn
        </Button>
      </div>

      {/* today summary */}
      <SectionCardComp
        title={`Hôm nay · ${fmtDate(today, "EEEE, d MMM")}`}
        subtitle={`${todayMeals.length} bữa · nạp ${todayTotals.calories} kcal`}
        icon={<Utensils className="h-4 w-4" />}
      >
        <div className="grid grid-cols-4 gap-3">
          <MacroTile icon={<Flame className="h-4 w-4" />} label="Calo" value={todayTotals.calories} unit="kcal" color="var(--brand-coral)" />
          <MacroTile icon={<Beef className="h-4 w-4" />} label="Protein" value={todayTotals.protein} unit="g" color="var(--brand-teal)" />
          <MacroTile icon={<Wheat className="h-4 w-4" />} label="Carbs" value={todayTotals.carbs} unit="g" color="var(--brand-amber)" />
          <MacroTile icon={<Droplet className="h-4 w-4" />} label="Fat" value={todayTotals.fat} unit="g" color="var(--brand-violet)" />
        </div>

        {/* energy balance — only show when user has logged at least 1 meal today */}
        {todayMeals.length > 0 ? (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cân bằng năng lượng</p>
              <p className="text-sm font-bold">
                Nạp <span className="tnum text-[color:var(--brand-coral)]">{todayTotals.calories}</span> · Đốt <span className="tnum text-emerald-500">{Math.round(weekBurned / 7)}</span> kcal/ngày
              </p>
            </div>
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              todayTotals.calories - Math.round(weekBurned / 7) > 0
                ? "bg-[color:var(--brand-amber)]/15 text-[color:var(--brand-amber)]"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}>
              {todayTotals.calories - Math.round(weekBurned / 7) > 0 ? "+" : ""}
              {todayTotals.calories - Math.round(weekBurned / 7)} kcal
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              📝 Ghi bữa ăn hôm nay để xem cân bằng năng lượng
            </span>
          </div>
        )}
      </SectionCardComp>

      {/* AI meal plan */}
      <MealPlanCard profile={profile} avgBurnedDay={Math.round(weekBurned / 7)} />

      {/* today's meals by slot */}
      {hasMeals && (
        <SectionCardComp
          title="Bữa ăn hôm nay"
          subtitle={`${todayMeals.length} bữa đã ghi`}
          icon={<Sparkles className="h-4 w-4" />}
        >
          {todayMeals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Chưa ghi bữa nào hôm nay. Bấm "Ghi bữa ăn" để bắt đầu!</p>
          ) : (
            <div className="space-y-2">
              {todayMeals
                .slice()
                .sort((a, b) => a.createdAt - b.createdAt)
                .map((m, i) => (
                  <MealRow key={m.id} meal={m} onDelete={() => setPendingDelete(m)} index={i} />
                ))}
            </div>
          )}
        </SectionCardComp>
      )}

      {/* history */}
      {hasMeals && (
        <SectionCardComp title="Lịch sử bữa ăn" subtitle={`${meals.length} bữa đã ghi`} icon={<Utensils className="h-4 w-4" />}>
          <div className="space-y-1">
            {[...meals]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((m, i) => (
                <MealRow key={m.id} meal={m} onDelete={() => setPendingDelete(m)} index={i} compact />
              ))}
          </div>
        </SectionCardComp>
      )}

      {/* empty state */}
      {!hasMeals && (
        <EmptyStateComp
          emoji="🍽️"
          title="Bắt đầu ghi bữa ăn"
          text="Viết tự nhiên: 'sáng ăn khoai lang, 2 quả trứng, bát rau' — AI tự tính calo & protein."
          action={
            <Button onClick={() => setQuickAdd("meal")} className="gap-2 grad-primary border-transparent text-white">
              <Utensils className="h-4 w-4" /> Ghi bữa đầu tiên
            </Button>
          }
        />
      )}

      {/* delete confirm */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
            onClick={() => setPendingDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 text-center shadow-lift"
            >
              <p className="text-base font-bold">Xoá bữa ăn?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pendingDelete.items.length} món · {pendingDelete.calories} kcal
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setPendingDelete(null)}>Huỷ</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={async () => {
                    await db.meals.delete(pendingDelete.id);
                    setPendingDelete(null);
                    toast.success("Đã xoá bữa ăn");
                  }}
                >
                  Xoá
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MacroTile({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: number; unit: string; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3 text-center">
      <div className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-[0.12] blur-xl" style={{ background: color }} />
      <span className="relative mx-auto grid h-7 w-7 place-items-center rounded-lg text-white shadow-soft" style={{ background: color }}>
        {icon}
      </span>
      <p className="tnum relative mt-1.5 text-xl font-extrabold">{value}</p>
      <p className="relative text-[9px] uppercase text-muted-foreground">{label} · {unit}</p>
    </div>
  );
}

function MealRow({ meal, onDelete, index, compact }: { meal: MealEntry; onDelete: () => void; index: number; compact?: boolean }) {
  const slot = SLOTS.find((s) => s.id === meal.slot);
  const Icon = slot?.icon ?? Utensils;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.4, ease: EASE }}
      className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card/60 p-3"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl grad-primary text-white shadow-soft">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{slot?.emoji} {slot?.label}</span>
          <span className="tnum text-sm font-bold">{meal.calories} kcal</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{meal.rawText}</p>
        {!compact && meal.items.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {meal.items.slice(0, 4).map((it, i) => (
              <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {it.name} · {it.calories}kcal
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
          <span>P {meal.protein}g</span>
          <span>C {meal.carbs}g</span>
          <span>F {meal.fat}g</span>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="shrink-0 self-start rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-[color:var(--brand-rose)] group-hover:opacity-100"
        aria-label="Xoá"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

function MealPlanCard({ profile, avgBurnedDay }: { profile: Profile; avgBurnedDay: number }) {
  const [plan, setPlan] = useState<{
    targetCalories: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    meals: { slot: string; suggestion: string; calories: number }[];
    tip: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/rt/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: profile.currentWeight,
          targetWeight: profile.targetWeight,
          targetKmPerWeek: profile.targetKmPerWeek,
          avgBurnedDay,
        }),
      });
      const data = await res.json();
      setPlan(data);
    } catch (e) {
      console.error(e);
      toast.error("AI không tạo được thực đơn lúc này");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCardComp
      title="Thực đơn gợi ý"
      subtitle="AI đề xuất 1 ngày dựa trên mục tiêu của bạn"
      icon={<Sparkles className="h-4 w-4" />}
      action={
        <Button size="sm" variant="outline" className="gap-1.5" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {plan ? "Làm lại" : "Tạo thực đơn"}
        </Button>
      }
    >
      {!plan && !loading && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Bấm "Tạo thực đơn" để AI gợi ý bữa sáng/trưa/tối/phụ phù hợp mục tiêu cân nặng của bạn.
        </p>
      )}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> AI đang lên thực đơn...
        </div>
      )}
      {plan && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* targets */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="tnum text-lg font-extrabold text-[color:var(--brand-coral)]">{plan.targetCalories}</p>
              <p className="text-[9px] uppercase text-muted-foreground">kcal mục tiêu</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="tnum text-lg font-extrabold text-[color:var(--brand-teal)]">{plan.proteinTarget}g</p>
              <p className="text-[9px] uppercase text-muted-foreground">protein</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="tnum text-lg font-extrabold text-[color:var(--brand-amber)]">{plan.carbsTarget}g</p>
              <p className="text-[9px] uppercase text-muted-foreground">carbs</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="tnum text-lg font-extrabold text-[color:var(--brand-violet)]">{plan.fatTarget}g</p>
              <p className="text-[9px] uppercase text-muted-foreground">fat</p>
            </div>
          </div>
          {/* meals */}
          {plan.meals.length > 0 && (
            <div className="space-y-1.5">
              {plan.meals.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2"
                >
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{m.slot}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{m.suggestion}</p>
                  </div>
                  <span className="tnum shrink-0 text-xs font-bold text-muted-foreground">~{m.calories} kcal</span>
                </motion.div>
              ))}
            </div>
          )}
          {/* tip */}
          {plan.tip && (
            <div className="flex items-start gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-foreground">{plan.tip}</span>
            </div>
          )}
        </motion.div>
      )}
    </SectionCardComp>
  );
}

function NutritionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-3xl bg-muted" />
      <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      <div className="h-48 animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}
