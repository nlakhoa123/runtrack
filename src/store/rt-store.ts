"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UnitSystem, ViewId } from "@/lib/rt/types";

interface RtState {
  /** id of the active profile (null = onboarding / picker) */
  activeProfileId: string | null;
  activeView: ViewId;
  unitSystem: UnitSystem;
  onboarded: boolean;
  setActiveProfile: (id: string | null) => void;
  setActiveView: (v: ViewId) => void;
  setUnitSystem: (u: UnitSystem) => void;
  setOnboarded: (v: boolean) => void;
  /** quick-add sheet control */
  quickAdd: "run" | "weight" | "meal" | null;
  setQuickAdd: (v: "run" | "weight" | "meal" | null) => void;
  /** when set, the run sheet opens in edit mode for this run id */
  editRunId: string | null;
  /** open the run sheet editing an existing run; clears quickAdd first then opens */
  startEditRun: (id: string) => void;
  /** open the run sheet for a new run */
  startNewRun: () => void;
  clearEditRun: () => void;
  /** live run mode: opens the GPS live-run overlay */
  liveRunOpen: boolean;
  setLiveRunOpen: (v: boolean) => void;
  startLiveRun: () => void;
  /** story composer: opens the story capture overlay */
  storyComposerOpen: boolean;
  setStoryComposerOpen: (v: boolean) => void;
  startStoryCapture: () => void;
  /** celebration queue (achievement types) */
  celebrationQueue: string[];
  pushCelebration: (type: string) => void;
  shiftCelebration: () => void;
}

export const useRtStore = create<RtState>()(
  persist(
    (set) => ({
      activeProfileId: null,
      activeView: "dashboard",
      unitSystem: "metric",
      onboarded: false,
      quickAdd: null,
      editRunId: null,
      liveRunOpen: false,
      storyComposerOpen: false,
      celebrationQueue: [],
      setActiveProfile: (id) => set({ activeProfileId: id, activeView: id ? "dashboard" : "dashboard" }),
      setActiveView: (v) => set({ activeView: v }),
      setUnitSystem: (u) => set({ unitSystem: u }),
      setOnboarded: (v) => set({ onboarded: v }),
      setQuickAdd: (v) => set({ quickAdd: v, editRunId: v === "run" ? null : null }),
      startEditRun: (id) => set({ editRunId: id, quickAdd: "run" }),
      startNewRun: () => set({ editRunId: null, quickAdd: "run" }),
      clearEditRun: () => set({ editRunId: null }),
      setLiveRunOpen: (v) => set({ liveRunOpen: v }),
      startLiveRun: () => set({ liveRunOpen: true }),
      setStoryComposerOpen: (v) => set({ storyComposerOpen: v }),
      startStoryCapture: () => set({ storyComposerOpen: true }),
      pushCelebration: (type) => set((s) => ({ celebrationQueue: [...s.celebrationQueue, type] })),
      shiftCelebration: () => set((s) => ({ celebrationQueue: s.celebrationQueue.slice(1) })),
    }),
    {
      name: "runtrack-prefs",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        activeProfileId: s.activeProfileId,
        activeView: s.activeView,
        unitSystem: s.unitSystem,
        onboarded: s.onboarded,
      }),
    }
  )
);
