"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "@/lib/rt/db";
import { useRtStore } from "@/store/rt-store";
import { ProfileAvatar } from "@/components/rt/shared/profile-avatar";
import { ProfileForm } from "./profile-form";
import { Button } from "@/components/ui/button";
import { Footprints, Plus, Users, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { fmtDuration } from "@/lib/rt/utils";

type Stage = "welcome" | "picker" | "form";

export function Onboarding() {
  const profiles = useLiveQuery(() => db.profiles.orderBy("createdAt").toArray(), []);
  const { setActiveProfile, setOnboarded } = useRtStore();
  const [stage, setStage] = useState<Stage>(() => "welcome");
  const [editingId, setEditingId] = useState<string | null>(null);

  // If profiles already exist (e.g. returning), jump to picker
  if (profiles && profiles.length > 0 && stage === "welcome") {
    setStage("picker");
  }

  const loading = profiles === undefined;

  function selectProfile(id: string) {
    setActiveProfile(id);
    setOnboarded(true);
  }

  async function deleteProfile(id: string) {
    if (!confirm("Xoá hồ sơ này cùng toàn bộ dữ liệu chạy & cân nặng? Hành động này không thể hoàn tác.")) return;
    await db.transaction("rw", db.profiles, db.runs, db.weights, db.achievements, async () => {
      await db.profiles.delete(id);
      await db.runs.where("profileId").equals(id).delete();
      await db.weights.where("profileId").equals(id).delete();
      await db.achievements.where("profileId").equals(id).delete();
    });
    toast.success("Đã xoá hồ sơ");
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="h-16 w-16 overflow-hidden rounded-3xl shadow-glow"
        >
          <img src="/logo.png" alt="RunTrack" className="h-full w-full object-cover" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full grad-primary opacity-20 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full grad-energy opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full grad-violet opacity-15 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 sm:max-w-lg">
        <AnimatePresence mode="wait">
          {stage === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="mb-6 h-24 w-24 overflow-hidden rounded-[2rem] shadow-glow"
              >
                <img src="/logo.png" alt="RunTrack" className="h-full w-full object-cover" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-4xl font-extrabold tracking-tight"
              >
                Run<span className="text-grad-primary">Track</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-3 max-w-sm text-balance text-muted-foreground"
              >
                Theo dõi chạy bộ & cân nặng — nhật ký cá nhân. AI tính calo & thực đơn, GPS đo quãng chạy, ảnh tiến bộ, thành tích mở khoá dần.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-6 grid w-full gap-2 text-left"
              >
                {[
                  { icon: "🏃", t: "Ghi nhận buổi chạy trong tích tắc" },
                  { icon: "⚖️", t: "Theo dõi cân nặng với biểu đồ mượt" },
                  { icon: "🎯", t: "Mục tiêu & dự đoán ngày đạt" },
                  { icon: "🏆", t: "Huy hiệu mở khoá ăn mừng" },
                ].map((f, i) => (
                  <motion.div
                    key={f.t}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 backdrop-blur"
                  >
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-sm font-medium">{f.t}</span>
                  </motion.div>
                ))}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-8 w-full"
              >
                <Button size="lg" className="w-full gap-2 grad-primary border-transparent text-base text-white shadow-lift hover:opacity-90" onClick={() => setStage("form")}>
                  <Sparkles className="h-5 w-5" /> Bắt đầu tạo hồ sơ
                </Button>
                <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Nhiều người dùng chung máy? Thêm từng hồ sơ sau.
                </p>
              </motion.div>
            </motion.div>
          )}

          {stage === "picker" && (
            <motion.div
              key="picker"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col"
            >
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-extrabold tracking-tight">Chọn hồ sơ</h1>
                <p className="mt-1 text-sm text-muted-foreground">Ai sẽ chạy hôm nay?</p>
              </div>
              <div className="grid gap-3">
                <AnimatePresence>
                  {profiles?.map((p, i) => (
                    <motion.button
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectProfile(p.id)}
                      className="group flex items-center gap-4 rounded-3xl border border-border/70 bg-card p-4 text-left shadow-soft transition-shadow hover:shadow-lift"
                    >
                      <ProfileAvatar colorId={p.avatarColor} name={p.name} size={58} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-bold">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Mục tiêu {p.targetKmPerWeek} km/tuần · {p.currentWeight} kg
                        </p>
                      </div>
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
              <Button
                variant="outline"
                className="mt-3 gap-2 border-dashed"
                onClick={() => {
                  setEditingId(null);
                  setStage("form");
                }}
              >
                <Plus className="h-4 w-4" /> Thêm hồ sơ mới
              </Button>
            </motion.div>
          )}

          {stage === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col justify-center py-4"
            >
              <ProfileForm
                ctaLabel={editingId ? "Lưu" : "Tạo hồ sơ"}
                onCancel={() => setStage(profiles && profiles.length > 0 ? "picker" : "welcome")}
                onDone={(profile) => {
                  selectProfile(profile.id);
                  toast.success(`Chào ${profile.name}! 👋`);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
