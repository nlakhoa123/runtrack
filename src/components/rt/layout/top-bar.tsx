"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/rt/db";
import { useRtStore } from "@/store/rt-store";
import { ProfileAvatar } from "@/components/rt/shared/profile-avatar";
import { ThemeToggle } from "./theme-toggle";
import { Footprints, Plus, Users, Check, Scale, Utensils, Radio, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const VIEW_TITLES: Record<string, string> = {
  dashboard: "Tổng quan",
  runs: "Lịch sử chạy",
  weight: "Cân nặng",
  nutrition: "Dinh dưỡng",
  stories: "Story",
  progress: "Ảnh tiến bộ",
  journey: "Hành trình",
  goals: "Mục tiêu",
  achievements: "Thành tích",
  settings: "Cài đặt",
};

export function TopBar() {
  const { activeProfileId, setActiveProfile, setActiveView, activeView } = useRtStore();
  const profile = useLiveQuery(() => (activeProfileId ? db.profiles.get(activeProfileId) : undefined), [activeProfileId]);
  const profiles = useLiveQuery(() => db.profiles.orderBy("createdAt").toArray(), []);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 hidden border-b border-border/60 glass lg:block">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:px-5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-muted/60">
              {profile && <ProfileAvatar colorId={profile.avatarColor} name={profile.name} size={34} />}
              <div className="hidden text-left sm:block">
                <p className="text-[11px] leading-tight text-muted-foreground">{VIEW_TITLES[activeView]}</p>
                <p className="text-sm font-bold leading-tight">{profile?.name ?? "RunTrack"}</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 rounded-2xl p-2">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Đổi hồ sơ</p>
            <div className="max-h-72 overflow-y-auto no-scrollbar">
              {profiles?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProfile(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted",
                    p.id === activeProfileId && "bg-muted"
                  )}
                >
                  <ProfileAvatar colorId={p.avatarColor} name={p.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.currentWeight} kg · {p.targetKmPerWeek} km/tuần</p>
                  </div>
                  {p.id === activeProfileId && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 w-full justify-start gap-2 border-dashed"
              onClick={() => {
                setActiveProfile(null);
                setActiveView("dashboard");
                setOpen(false);
              }}
            >
              <Users className="h-4 w-4" /> Quản lý hồ sơ
            </Button>
          </PopoverContent>
        </Popover>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Chạy trực tiếp (GPS)"
            onClick={() => useRtStore.getState().startLiveRun()}
            className="rounded-full border border-border/60 bg-card/70 backdrop-blur hover:bg-card"
            title="Chạy trực tiếp với GPS"
          >
            <Radio className="h-[18px] w-[18px]" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Tạo story"
            onClick={() => useRtStore.getState().startStoryCapture()}
            className="rounded-full border border-border/60 bg-card/70 backdrop-blur hover:bg-card"
          >
            <Sparkles className="h-[18px] w-[18px]" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Ghi bữa ăn"
            onClick={() => useRtStore.getState().setQuickAdd("meal")}
            className="rounded-full border border-border/60 bg-card/70 backdrop-blur hover:bg-card"
          >
            <Utensils className="h-[18px] w-[18px]" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Ghi cân nặng"
            onClick={() => useRtStore.getState().setQuickAdd("weight")}
            className="rounded-full border border-border/60 bg-card/70 backdrop-blur hover:bg-card"
          >
            <Scale className="h-[18px] w-[18px]" />
          </Button>
          <Button
            size="sm"
            onClick={() => useRtStore.getState().startNewRun()}
            className="gap-1.5 grad-primary border-transparent text-white shadow-soft hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Ghi chạy</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
