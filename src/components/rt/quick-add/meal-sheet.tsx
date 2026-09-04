"use client";

import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { db, uid } from "@/lib/rt/db";
import { useRtStore } from "@/store/rt-store";
import { todayKey } from "@/lib/rt/dates";
import type { MealEntry, MealSlot } from "@/lib/rt/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Sparkles, Loader2, Flame, Beef, Wheat, Droplet, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const SLOTS: { id: MealSlot; label: string; emoji: string }[] = [
  { id: "breakfast", label: "Sáng", emoji: "🌅" },
  { id: "lunch", label: "Trưa", emoji: "☀️" },
  { id: "dinner", label: "Tối", emoji: "🌙" },
  { id: "snack", label: "Phụ", emoji: "🍎" },
];

interface ParsedFood {
  slot: MealSlot;
  items: { name: string; amount: string; calories: number; protein: number; carbs: number; fat: number }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export function MealSheet() {
  const quickAdd = useRtStore((s) => s.quickAdd);
  const setQuickAdd = useRtStore((s) => s.setQuickAdd);
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const open = quickAdd === "meal";

  const [text, setText] = useState("");
  const [date, setDate] = useState(todayKey());
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedFood | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setText("");
      setDate(todayKey());
      setParsed(null);
    }
  }, [open]);

  async function parse() {
    if (!text.trim()) {
      toast.error("Nhập nội dung bữa ăn");
      return;
    }
    setParsing(true);
    setParsed(null);
    try {
      const res = await fetch("/api/rt/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setParsed(data);
    } catch (e) {
      console.error(e);
      toast.error("AI không phân tích được lúc này");
    } finally {
      setParsing(false);
    }
  }

  async function save() {
    if (!activeProfileId || !parsed) return;
    setSaving(true);
    try {
      const meal: MealEntry = {
        id: uid(),
        profileId: activeProfileId,
        date,
        rawText: text.trim(),
        slot: parsed.slot,
        calories: parsed.totalCalories,
        protein: parsed.totalProtein,
        carbs: parsed.totalCarbs,
        fat: parsed.totalFat,
        items: parsed.items,
        createdAt: Date.now(),
      };
      await db.meals.put(meal);
      setQuickAdd(null);
      toast.success(`Đã ghi bữa ${SLOTS.find((s) => s.id === parsed.slot)?.label ?? ""}: ${parsed.totalCalories} kcal`);
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
          <DrawerTitle className="flex items-center justify-center gap-2 text-center text-lg font-extrabold">
            <Utensils className="h-5 w-5 text-primary" /> Ghi bữa ăn
          </DrawerTitle>
          <DrawerDescription className="sr-only">Nhập món ăn bằng tiếng Việt, AI tự tính calo &amp; macro</DrawerDescription>
        </DrawerHeader>

        <div className="mx-auto w-full max-w-md space-y-4 overflow-y-auto px-4 pb-6 no-scrollbar">
          {/* Free text input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mô tả bữa ăn (viết tự nhiên)
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="VD: sáng nay tôi ăn 1 củ khoai lang luộc, 2 quả trứng chiên, 1 bát rau muống xào"
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ngày</label>
            <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} className="h-11" />
          </div>

          {/* Parse button */}
          <Button
            onClick={parse}
            disabled={parsing || !text.trim()}
            className="w-full gap-2 grad-primary border-transparent text-white hover:opacity-90"
          >
            {parsing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> AI đang phân tích...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> AI tính calo &amp; macro</>
            )}
          </Button>

          {/* Parsed result */}
          <AnimatePresence>
            {parsed && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {/* slot chip */}
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {SLOTS.find((s) => s.id === parsed.slot)?.emoji} {SLOTS.find((s) => s.id === parsed.slot)?.label}
                  </span>
                </div>

                {/* totals */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-2.5 text-center">
                    <Flame className="mx-auto h-3.5 w-3.5 text-[color:var(--brand-coral)]" />
                    <p className="tnum mt-1 text-lg font-extrabold">{parsed.totalCalories}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">kcal</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-2.5 text-center">
                    <Beef className="mx-auto h-3.5 w-3.5 text-[color:var(--brand-teal)]" />
                    <p className="tnum mt-1 text-lg font-extrabold">{parsed.totalProtein}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">protein</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-2.5 text-center">
                    <Wheat className="mx-auto h-3.5 w-3.5 text-[color:var(--brand-amber)]" />
                    <p className="tnum mt-1 text-lg font-extrabold">{parsed.totalCarbs}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">carbs</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-2.5 text-center">
                    <Droplet className="mx-auto h-3.5 w-3.5 text-[color:var(--brand-violet)]" />
                    <p className="tnum mt-1 text-lg font-extrabold">{parsed.totalFat}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">fat</p>
                  </div>
                </div>

                {/* items list */}
                {parsed.items.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      AI nhận diện {parsed.items.length} món:
                    </p>
                    {parsed.items.map((it, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{it.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{it.amount}</p>
                        </div>
                        <span className="tnum shrink-0 text-sm font-bold text-foreground">
                          {it.calories} <span className="text-[10px] font-normal text-muted-foreground">kcal</span>
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* save */}
                <Button onClick={save} disabled={saving} className="w-full gap-2 grad-energy border-transparent text-white hover:opacity-90">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  Lưu bữa ăn
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {!parsed && !parsing && (
            <p className="text-center text-[11px] text-muted-foreground">
              💡 AI sẽ tự nhận diện món, ước lượng lượng, và tính calo + protein + carbs + fat.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
