import type { Profile, RunSession, WeightEntry } from "./types";
import { db, uid } from "./db";
import { computeStreak, currentWeekKeys, lastNDays, weekKeysForOffset, todayKey, subDays, keyToDate, differenceInCalendarDays } from "./dates";
import { round } from "./utils";

/** Sum of km for the given set of date keys. */
export function sumKm(runs: RunSession[], keys: string[]): number {
  const set = new Set(keys);
  return runs.filter((r) => set.has(r.date)).reduce((s, r) => s + r.distanceKm, 0);
}

export interface WeeklyInsight {
  icon: string;
  title: string;
  text: string;
  tone: "up" | "down" | "steady" | "info";
}

export function buildWeeklyInsight(runs: RunSession[], today: Date = new Date()): WeeklyInsight {
  const thisWeek = sumKm(runs, currentWeekKeys(today));
  const lastWeek = sumKm(runs, weekKeysForOffset(1, today));
  const totalRunsThisWeek = runs.filter((r) => currentWeekKeys(today).includes(r.date)).length;

  if (lastWeek > 0.1) {
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    if (pct >= 10) {
      return {
        icon: "🔥",
        tone: "up",
        title: "Đang bứt phá!",
        text: `Bạn chạy nhiều hơn ${pct}% so với tuần trước. Giữ nhịp nhé!`,
      };
    }
    if (pct <= -10) {
      return {
        icon: "🌱",
        tone: "down",
        title: "Tuần nhẹ hơn một chút",
        text: `Tuần này giảm ${Math.abs(pct)}% km. Ngày mai đi một vòng nhỏ nhé?`,
      };
    }
    return {
      icon: "🏃",
      tone: "steady",
      title: "Nhịp độ ổn định",
      text: `Tuần này ${totalRunsThisWeek} buổi chạy, lệch ${pct}% so với tuần trước.`,
    };
  }

  if (thisWeek > 0) {
    return {
      icon: "✨",
      tone: "up",
      title: "Khởi đầu tốt!",
      text: `Tuần này đã ${thisWeek.toFixed(1)} km. Mỗi bước đều đáng kể.`,
    };
  }
  return {
    icon: "👟",
    tone: "info",
    title: "Sẵn sàng xuất phát?",
    text: "Chưa có buổi chạy nào tuần này. Một vòng nhỏ cũng được!",
  };
}

/** Stats used by dashboard cards. */
export interface DashboardStats {
  weekKm: number;
  lastWeekKm: number;
  weekChangePct: number;
  streak: number;
  totalKm: number;
  totalRuns: number;
  weightLost: number; // kg lost since first weight entry (positive = lost)
  weightStart: number | null;
  weightCurrent: number | null;
  weightDiffFromLast: number; // vs previous entry (negative = lost)
  caloriesThisWeek: number;
  avgSpeedThisWeek: number;
  goalKm: number;
  goalPct: number; // week km / goal
  weightGoalPct: number; // progress to target weight
  weightEtaWeeks: number | null; // estimated weeks to reach target
}

export function computeStats(
  profile: Profile,
  runs: RunSession[],
  weights: WeightEntry[],
  today: Date = new Date()
): DashboardStats {
  const thisWeekKeys = currentWeekKeys(today);
  const lastWeekKeys = weekKeysForOffset(1, today);

  const weekKm = round(sumKm(runs, thisWeekKeys), 1);
  const lastWeekKm = round(sumKm(runs, lastWeekKeys), 1);
  const weekChangePct = lastWeekKm > 0.1 ? Math.round(((weekKm - lastWeekKm) / lastWeekKm) * 100) : weekKm > 0 ? 100 : 0;

  const runDates = runs.map((r) => r.date);
  const streak = computeStreak(runDates, today);

  const totalKm = round(runs.reduce((s, r) => s + r.distanceKm, 0), 1);
  const totalRuns = runs.length;

  const sortedWeights = [...weights].sort((a, b) => a.createdAt - b.createdAt);
  const weightStart = sortedWeights.length ? sortedWeights[0].weightKg : null;
  const weightCurrent = sortedWeights.length ? sortedWeights[sortedWeights.length - 1].weightKg : profile.currentWeight;
  const weightPrev = sortedWeights.length > 1 ? sortedWeights[sortedWeights.length - 2].weightKg : null;
  const weightLost = weightStart != null && weightCurrent != null ? round(weightStart - weightCurrent, 1) : 0;
  const weightDiffFromLast = weightPrev != null && weightCurrent != null ? round(weightCurrent - weightPrev, 1) : 0;

  const thisWeekRuns = runs.filter((r) => thisWeekKeys.includes(r.date));
  const caloriesThisWeek = Math.round(thisWeekRuns.reduce((s, r) => s + r.calories, 0));
  const avgSpeedThisWeek =
    thisWeekRuns.length > 0
      ? round(thisWeekRuns.reduce((s, r) => s + r.avgSpeed, 0) / thisWeekRuns.length, 1)
      : 0;

  const goalKm = profile.targetKmPerWeek;
  const goalPct = goalKm > 0 ? Math.min(100, Math.round((weekKm / goalKm) * 100)) : 0;

  // Weight goal progress: from start weight to target
  let weightGoalPct = 0;
  let weightEtaWeeks: number | null = null;
  if (weightStart != null && weightCurrent != null) {
    const totalToGo = weightStart - profile.targetWeight;
    const done = weightStart - weightCurrent;
    if (totalToGo > 0.01) {
      weightGoalPct = Math.min(100, Math.max(0, Math.round((done / totalToGo) * 100)));
    } else if (totalToGo < -0.01) {
      // gaining goal
      weightGoalPct = Math.min(100, Math.max(0, Math.round(((-done) / -totalToGo) * 100)));
    } else {
      weightGoalPct = 100;
    }

    // ETA: use last 4 weeks rate
    const fourWeeksAgo = subDays(today, 28);
    const older = sortedWeights.filter((w) => keyToDate(w.date) <= fourWeeksAgo);
    const olderW = older.length ? older[older.length - 1].weightKg : weightStart;
    if (olderW != null) {
      const weeksElapsed = Math.max(1, differenceInCalendarDays(today, fourWeeksAgo) / 7);
      const ratePerWeek = (weightCurrent - olderW) / weeksElapsed; // negative = losing
      const remaining = profile.targetWeight - weightCurrent;
      if (Math.abs(ratePerWeek) > 0.01 && Math.sign(remaining) === -Math.sign(ratePerWeek) || (ratePerWeek < -0.01 && remaining < 0)) {
        weightEtaWeeks = Math.max(1, Math.round(Math.abs(remaining / ratePerWeek)));
      }
    }
  }

  return {
    weekKm,
    lastWeekKm,
    weekChangePct,
    streak,
    totalKm,
    totalRuns,
    weightLost,
    weightStart,
    weightCurrent,
    weightDiffFromLast,
    caloriesThisWeek,
    avgSpeedThisWeek,
    goalKm,
    goalPct,
    weightGoalPct,
    weightEtaWeeks,
  };
}

/** Build GitHub-style heatmap intensity for last N days (0..4). */
export function heatmapIntensity(runs: RunSession[], days = 119, today: Date = new Date()) {
  const keys = lastNDays(days, today);
  const map = new Map<string, number>();
  for (const r of runs) map.set(r.date, (map.get(r.date) ?? 0) + r.distanceKm);
  return keys.map((k) => {
    const km = map.get(k) ?? 0;
    let level = 0;
    if (km >= 10) level = 4;
    else if (km >= 6) level = 3;
    else if (km >= 3) level = 2;
    else if (km > 0) level = 1;
    return { key: k, km: round(km, 1), level };
  });
}

/** Weekly distance buckets for last N weeks (oldest first). */
export function weeklyBuckets(runs: RunSession[], weeks = 8, today: Date = new Date()) {
  const out: { label: string; km: number; startKey: string }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const keys = weekKeysForOffset(i, today);
    const km = round(sumKm(runs, keys), 1);
    const label = `T${weeks - i}`;
    out.push({ label, km, startKey: keys[0] });
  }
  return out;
}
