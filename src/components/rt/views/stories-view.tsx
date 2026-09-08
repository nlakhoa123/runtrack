"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/rt/db";
import { useRtStore } from "@/store/rt-store";
import type { Story } from "@/lib/rt/types";
import { fmtDate } from "@/lib/rt/dates";
import { Button } from "@/components/ui/button";
import { Plus, X, Trash2, Camera, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STORY_DURATION = 5000; // 5s per story

export default function StoriesView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const startStoryCapture = useRtStore((s) => s.startStoryCapture);
  const stories = useLiveQuery<Story[]>(
    async () => (activeProfileId ? await db.stories.where("profileId").equals(activeProfileId).reverse().sortBy("createdAt") : []),
    [activeProfileId]
  );

  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Story | null>(null);

  if (stories === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Story</h1>
            <p className="text-sm text-muted-foreground">Khoảnh khắc chạy bộ của bạn</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl grad-primary text-white shadow-glow">
            <Camera className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold">Chưa có story nào</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Chụp ảnh khoảnh khắc chạy bộ — bình minh, đường mòn, finish line — và xem lại kiểu story tự chạy.
          </p>
          <Button onClick={startStoryCapture} className="mt-4 gap-2 grad-primary border-transparent text-white">
            <Plus className="h-4 w-4" /> Tạo story đầu tiên
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Story</h1>
          <p className="text-sm text-muted-foreground">{stories.length} khoảnh khắc · nhật ký chạy bộ</p>
        </div>
        <Button onClick={startStoryCapture} className="gap-2 grad-primary border-transparent text-white shadow-soft hover:opacity-90">
          <Plus className="h-4 w-4" /> Tạo story
        </Button>
      </div>

      {/* story ring (horizontal) */}
      <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
        {/* add tile */}
        <button
          onClick={startStoryCapture}
          className="group flex shrink-0 flex-col items-center gap-1.5"
        >
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-primary/40 text-primary transition-colors hover:bg-primary/5">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Thêm</span>
        </button>
        {stories.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setViewerIdx(i)}
            className="group flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary shadow-soft transition-transform group-hover:scale-105">
              <img src={s.dataUrl} alt="story" className="h-full w-full object-cover" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{fmtDate(s.date, "d/M")}</span>
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stories.map((s, i) => (
          <motion.button
            key={s.id}
            onClick={() => setViewerIdx(i)}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-4% 0px" }}
            transition={{ duration: 0.4, delay: (i % 6) * 0.04 }}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/60"
          >
            <img src={s.dataUrl} alt="story" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="line-clamp-2 text-[11px] font-medium text-white">{s.caption || fmtDate(s.date, "d MMM")}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPendingDelete(s); }}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/70 group-hover:opacity-100"
              aria-label="Xoá"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </motion.button>
        ))}
      </div>

      {/* viewer (full-screen Locket-style) */}
      <AnimatePresence>
        {viewerIdx !== null && stories[viewerIdx] && (
          <StoryViewer
            stories={stories}
            startIdx={viewerIdx}
            onClose={() => setViewerIdx(null)}
          />
        )}
      </AnimatePresence>

      {/* delete confirm */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
            onClick={() => setPendingDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-3xl border border-border bg-card p-5 text-center shadow-lift"
            >
              <p className="text-base font-bold">Xoá story?</p>
              <p className="mt-1 text-sm text-muted-foreground">Không thể hoàn tác.</p>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setPendingDelete(null)}>Huỷ</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={async () => {
                    await db.stories.delete(pendingDelete.id);
                    setPendingDelete(null);
                    toast.success("Đã xoá story");
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

function StoryViewer({
  stories,
  startIdx,
  onClose,
}: {
  stories: Story[];
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const current = stories[idx];

  useEffect(() => {
    if (paused || !current) return;
    // reset progress at the start of each story (read in closure, not state)
    const start = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = (elapsed / STORY_DURATION) * 100;
      if (pct >= 100) {
        if (idx < stories.length - 1) {
          setIdx((i) => i + 1);
        } else {
          onClose();
        }
      } else {
        setProgress(pct);
      }
    }, 50);
    return () => window.clearInterval(tick);
  }, [idx, paused, current, stories.length, onClose]);

  // keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") {
        if (idx < stories.length - 1) setIdx((i) => i + 1);
        else onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, stories.length, onClose]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <motion.div
        key={current.id}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative aspect-[3/4] h-full max-h-[90vh] overflow-hidden bg-black"
      >
        <img src={current.dataUrl} alt="story" className="h-full w-full object-cover" />

        {/* progress bars */}
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{ width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-6 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        {/* pause/play */}
        <button
          onClick={() => setPaused((p) => !p)}
          className="absolute left-3 top-6 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
          aria-label={paused ? "Phát" : "Tạm dừng"}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>

        {/* tap zones */}
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); }}
          className="absolute inset-y-0 left-0 w-1/3"
          aria-label="Trước"
        />
        <button
          onClick={(e) => { e.stopPropagation(); if (idx < stories.length - 1) setIdx((i) => i + 1); else onClose(); }}
          className="absolute inset-y-0 right-0 w-1/3"
          aria-label="Sau"
        />

        {/* caption */}
        {current.caption && (
          <div className="pointer-events-none absolute inset-x-3 bottom-6">
            <div className="rounded-2xl bg-black/40 px-4 py-2.5 backdrop-blur">
              <p className="text-sm font-medium text-white">{current.caption}</p>
              <p className="mt-0.5 text-[10px] text-white/70">{fmtDate(current.date, "d MMMM yyyy")}</p>
            </div>
          </div>
        )}

        {/* nav arrows */}
        {idx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); }}
            className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"
            aria-label="Trước"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {idx < stories.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => i + 1); }}
            className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"
            aria-label="Sau"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
