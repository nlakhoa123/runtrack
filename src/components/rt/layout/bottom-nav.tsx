"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRtStore } from "@/store/rt-store";
import type { ViewId } from "@/lib/rt/types";
import {
  LayoutDashboard,
  Footprints,
  Scale,
  Target,
  Trophy,
  Settings2,
  Camera,
  BookOpen,
  Utensils,
  Menu,
  X,
  Radio,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard; desc: string }[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard, desc: "Dashboard chính" },
  { id: "runs", label: "Lịch sử chạy", icon: Footprints, desc: "Buổi chạy & biểu đồ" },
  { id: "weight", label: "Cân nặng", icon: Scale, desc: "Xu hướng & ghi nhận" },
  { id: "nutrition", label: "Dinh dưỡng", icon: Utensils, desc: "AI tính thức ăn" },
  { id: "stories", label: "Story", icon: Sparkles, desc: "Khoảnh khắc kiểu Locket" },
  { id: "locket", label: "Nhóm", icon: Users, desc: "Share story với bạn bè" },
  { id: "progress", label: "Ảnh tiến bộ", icon: Camera, desc: "Before/After" },
  { id: "journey", label: "Hành trình", icon: BookOpen, desc: "Story timeline" },
  { id: "goals", label: "Mục tiêu", icon: Target, desc: "Cân nặng & km" },
  { id: "achievements", label: "Thành tích", icon: Trophy, desc: "Huy hiệu" },
  { id: "settings", label: "Cài đặt", icon: Settings2, desc: "Giao diện & dữ liệu" },
];

export function BottomNav() {
  const { activeView, setActiveView } = useRtStore();
  const [open, setOpen] = useState(false);

  function select(view: ViewId) {
    setActiveView(view);
    setOpen(false);
  }

  return (
    <>
      {/* Desktop side rail (collapsed, icon-only, hover tooltip) */}
      <nav className="sticky top-0 hidden h-screen w-[64px] shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-sidebar/60 py-5 lg:flex">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-2xl grad-primary text-white shadow-glow">
          <Footprints className="h-5 w-5" />
        </div>
        {ITEMS.map((item) => {
          const active = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => select(item.id)}
              className={cn(
                "group relative grid h-10 w-10 place-items-center rounded-2xl transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active-desktop"
                  className="absolute inset-0 rounded-2xl grad-primary shadow-soft"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="relative h-[18px] w-[18px]" />
              <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-soft group-hover:opacity-100 lg:block">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile top bar with hamburger + live run */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-border/60 glass px-3 py-2.5 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl bg-card/70 text-foreground shadow-soft backdrop-blur"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold tracking-tight">
          {ITEMS.find((i) => i.id === activeView)?.label ?? "RunTrack"}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => useRtStore.getState().startLiveRun()}
            className="grid h-10 w-10 place-items-center rounded-xl grad-energy text-white shadow-soft"
            aria-label="Chạy trực tiếp (GPS)"
            title="Chạy trực tiếp với GPS"
          >
            <Radio className="h-5 w-5" />
          </button>
          <button
            onClick={() => useRtStore.getState().startNewRun()}
            className="grid h-10 w-10 place-items-center rounded-xl grad-primary text-white shadow-soft"
            aria-label="Ghi chạy"
          >
            <Footprints className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto border-r border-border/60 bg-sidebar p-4 shadow-lift lg:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl grad-primary text-white shadow-glow">
                    <Footprints className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-extrabold tracking-tight">
                    Run<span className="text-grad-primary">Track</span>
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                  aria-label="Đóng menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1">
                {ITEMS.map((item, i) => {
                  const active = activeView === item.id;
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => select(item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                        active ? "grad-primary text-white shadow-soft" : "hover:bg-muted"
                      )}
                    >
                      <span className={cn("grid h-9 w-9 place-items-center rounded-xl", active ? "bg-white/20" : "bg-muted")}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-bold", !active && "text-foreground")}>{item.label}</p>
                        <p className={cn("truncate text-[11px]", active ? "text-white/80" : "text-muted-foreground")}>{item.desc}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
