"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useRtStore } from "@/store/rt-store";
import { TopBar } from "@/components/rt/layout/top-bar";
import { BottomNav } from "@/components/rt/layout/bottom-nav";
import { RunSheet } from "@/components/rt/quick-add/run-sheet";
import { WeightSheet } from "@/components/rt/quick-add/weight-sheet";
import { MealSheet } from "@/components/rt/quick-add/meal-sheet";
import { LiveRunOverlay } from "@/components/rt/quick-add/live-run-overlay";
import { StoryComposer } from "@/components/rt/quick-add/story-composer";
import { CelebrationModal } from "@/components/rt/shared/celebration-modal";
import dynamic from "next/dynamic";

const views = {
  dashboard: dynamic(() => import("@/components/rt/views/dashboard-view")),
  runs: dynamic(() => import("@/components/rt/views/runs-view")),
  weight: dynamic(() => import("@/components/rt/views/weight-view")),
  nutrition: dynamic(() => import("@/components/rt/views/nutrition-view")),
  stories: dynamic(() => import("@/components/rt/views/stories-view")),
  locket: dynamic(() => import("@/components/rt/views/locket-view")),
  progress: dynamic(() => import("@/components/rt/views/progress-view")),
  journey: dynamic(() => import("@/components/rt/views/journey-view")),
  goals: dynamic(() => import("@/components/rt/views/goals-view")),
  achievements: dynamic(() => import("@/components/rt/views/achievements-view")),
  settings: dynamic(() => import("@/components/rt/views/settings-view")),
};

export function AppShell() {
  const activeView = useRtStore((s) => s.activeView);

  // Global keyboard shortcuts — only when no sheet is open and not typing in an input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.tagName === "SELECT");
      if (typing) return;

      const st = useRtStore.getState();
      // if a quick-add sheet or overlay is open, ignore shortcuts
      if (st.quickAdd || st.liveRunOpen || st.storyComposerOpen) return;

      const k = e.key.toLowerCase();
      if (k === "n") {
        e.preventDefault();
        st.startNewRun();
      } else if (k === "w") {
        e.preventDefault();
        st.setQuickAdd("weight");
      } else if (k === "f") {
        e.preventDefault();
        st.setQuickAdd("meal");
      } else if (k === "l") {
        e.preventDefault();
        st.startLiveRun();
      } else if (k === "s") {
        e.preventDefault();
        st.startStoryCapture();
      } else if (k >= "1" && k <= "9") {
        const order = ["dashboard", "runs", "weight", "nutrition", "stories", "locket", "progress", "journey", "goals"] as const;
        const idx = Number(k) - 1;
        if (idx < order.length) {
          e.preventDefault();
          st.setActiveView(order[idx]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const View = views[activeView] ?? views.dashboard;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <BottomNav />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-3 pb-28 pt-16 sm:px-5 lg:pb-10 lg:pl-6 lg:pr-8 lg:pt-4">
          <div className="mx-auto w-full max-w-5xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <View />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* global overlays + sheets */}
      <RunSheet />
      <WeightSheet />
      <MealSheet />
      <LiveRunOverlay />
      <StoryComposer />
      <CelebrationModal />
    </div>
  );
}
