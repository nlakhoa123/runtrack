"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { db, uid } from "@/lib/rt/db";
import { AVATAR_COLORS, type Profile } from "@/lib/rt/types";
import { ProfileAvatar } from "@/components/rt/shared/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { displayWeight, parseWeightInput, round } from "@/lib/rt/utils";
import { useRtStore } from "@/store/rt-store";
import { Check, ChevronLeft, ChevronRight, User, Target, Ruler, Flame } from "lucide-react";

interface ProfileFormProps {
  initial?: Partial<Profile>;
  onDone?: (profile: Profile) => void;
  onCancel?: () => void;
  ctaLabel?: string;
}

const STEPS = [
  { key: "identity", title: "Hồ sơ của bạn", subtitle: "Bắt đầu với tên và màu đại diện", icon: User },
  { key: "body", title: "Thông số cơ thể", subtitle: "Chiều cao & cân nặng hiện tại", icon: Ruler },
  { key: "goal", title: "Mục tiêu", subtitle: "Cân nặng mục tiêu & km mỗi tuần", icon: Target },
] as const;

export function ProfileForm({ initial, onDone, onCancel, ctaLabel = "Tạo hồ sơ" }: ProfileFormProps) {
  const unitSystem = useRtStore((s) => s.unitSystem);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name ?? "");
  const [avatarColor, setAvatarColor] = useState(initial?.avatarColor ?? AVATAR_COLORS[0].id);
  const [heightCm, setHeightCm] = useState(initial?.height ?? 170);
  const [weightInput, setWeightInput] = useState<number>(
    round(initial?.currentWeight != null ? displayWeight(initial.currentWeight, unitSystem, 1) : 70, 1)
  );
  const [targetInput, setTargetInput] = useState<number>(
    round(initial?.targetWeight != null ? displayWeight(initial.targetWeight, unitSystem, 1) : 65, 1)
  );
  const [weeklyKm, setWeeklyKm] = useState(initial?.targetKmPerWeek ?? 20);
  const [saving, setSaving] = useState(false);

  const wLabel = unitSystem === "metric" ? "kg" : "lbs";
  const canNext =
    step === 0 ? name.trim().length > 0 : step === 1 ? heightCm > 100 && weightInput > 0 : targetInput > 0 && weeklyKm >= 0;

  async function finish() {
    setSaving(true);
    try {
      const id = initial?.id ?? uid();
      const currentWeight = parseWeightInput(weightInput, unitSystem);
      const targetWeight = parseWeightInput(targetInput, unitSystem);
      const profile: Profile = {
        id,
        name: name.trim(),
        avatarColor,
        height: heightCm,
        currentWeight,
        targetWeight,
        targetKmPerWeek: weeklyKm,
        createdAt: initial?.createdAt ?? Date.now(),
      };
      await db.profiles.put(profile);
      // seed an initial weight entry on create
      if (!initial) {
        const today = new Date();
        const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        await db.weights.put({
          id: uid(),
          profileId: id,
          date: key,
          weightKg: currentWeight,
          createdAt: Date.now(),
        });
      }
      onDone?.(profile);
    } catch (e) {
      toast.error("Không lưu được hồ sơ");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Stepper */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border text-xs font-bold transition-all duration-300",
                  active && "grad-primary border-transparent text-white shadow-glow scale-110",
                  done && "bg-primary/15 border-primary/30 text-primary",
                  !active && !done && "border-border bg-card text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={cn("h-0.5 w-8 rounded-full", done ? "bg-primary/40" : "bg-border")} />}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-lift sm:p-6">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-extrabold tracking-tight">{STEPS[step].title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={STEPS[step].key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <ProfileAvatar colorId={avatarColor} name={name || "?"} size={88} />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tên của bạn"
                    className="h-12 text-center text-base font-semibold"
                    autoFocus
                    maxLength={28}
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Màu đại diện</p>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAvatarColor(c.id)}
                        className={cn(
                          "aspect-square rounded-2xl transition-all duration-200",
                          avatarColor === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-105" : "hover:scale-105"
                        )}
                        style={{ backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                        aria-label={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chiều cao</label>
                    <span className="tnum text-lg font-bold">{heightCm} cm</span>
                  </div>
                  <Slider
                    value={[heightCm]}
                    onValueChange={(v) => setHeightCm(v[0])}
                    min={130}
                    max={210}
                    step={1}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>130</span><span>210 cm</span>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cân nặng hiện tại</label>
                    <span className="tnum text-lg font-bold">{weightInput} {wLabel}</span>
                  </div>
                  <Slider
                    value={[weightInput]}
                    onValueChange={(v) => setWeightInput(v[0])}
                    min={30}
                    max={180}
                    step={0.1}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>30</span><span>180 {wLabel}</span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cân nặng mục tiêu</label>
                    <span className="tnum text-lg font-bold text-grad-primary">{targetInput} {wLabel}</span>
                  </div>
                  <Slider
                    value={[targetInput]}
                    onValueChange={(v) => setTargetInput(v[0])}
                    min={30}
                    max={180}
                    step={0.1}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>30</span><span>180 {wLabel}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {targetInput < weightInput
                      ? `Sẽ giảm ${round(weightInput - targetInput, 1)} ${wLabel} ✨`
                      : targetInput > weightInput
                      ? `Sẽ tăng ${round(targetInput - weightInput, 1)} ${wLabel} 💪`
                      : "Giữ nguyên cân nặng hiện tại"}
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mục tiêu km / tuần</label>
                    <span className="tnum text-lg font-bold">{weeklyKm} km</span>
                  </div>
                  <Slider
                    value={[weeklyKm]}
                    onValueChange={(v) => setWeeklyKm(v[0])}
                    min={0}
                    max={80}
                    step={1}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span><span>80 km</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Flame className="h-3.5 w-3.5 text-[color:var(--brand-coral)]" />
                    {weeklyKm === 0 ? "Chưa đặt mục tiêu" : weeklyKm < 15 ? "Khởi động nhẹ nhàng" : weeklyKm < 30 ? "Nhịp độ vững vàng" : weeklyKm < 50 ? "Người chạy nghiêm túc" : "Chiến binh đường dài!"}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => (step === 0 ? onCancel?.() : setStep(step - 1))} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? "Huỷ" : "Lùi"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext} className="gap-1 grad-primary border-transparent text-white hover:opacity-90">
              Tiếp <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving || !canNext} className="gap-1 grad-primary border-transparent text-white hover:opacity-90">
              {saving ? "Đang lưu..." : ctaLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
