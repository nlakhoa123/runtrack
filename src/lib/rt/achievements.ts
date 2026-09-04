import type { Profile, RunSession, WeightEntry, AchievementRecord, Feeling } from "./types";
import { db, uid } from "./db";

/** ISO week key (Monday-start) for grouping runs by week. */
function getWeekKey(d: Date): string {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon=0..Sun=6
  date.setDate(date.getDate() - day);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export interface AchievementDef {
  type: string;
  title: string;
  description: string;
  emoji: string;
  /** returns true when criteria met given current data */
  check: (ctx: AchievementCtx) => boolean;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface AchievementCtx {
  profile: Profile;
  runs: RunSession[];
  weights: WeightEntry[];
  stats: {
    totalKm: number;
    totalRuns: number;
    longestRunKm: number;
    streak: number;
    bestStreak: number;
    weekKm: number;
    weightLost: number;
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    type: "first_run",
    title: "Bước chân đầu tiên",
    description: "Ghi nhận buổi chạy đầu tiên của bạn.",
    emoji: "👟",
    tier: "bronze",
    check: (c) => c.stats.totalRuns >= 1,
  },
  {
    type: "first_5k",
    title: "Cột mốc 5K",
    description: "Hoàn thành một buổi chạy ít nhất 5 km.",
    emoji: "🎯",
    tier: "bronze",
    check: (c) => c.stats.longestRunKm >= 5,
  },
  {
    type: "first_10k",
    title: "Cột mốc 10K",
    description: "Hoàn thành một buổi chạy ít nhất 10 km.",
    emoji: "🏅",
    tier: "silver",
    check: (c) => c.stats.longestRunKm >= 10,
  },
  {
    type: "streak_3",
    title: "Khởi động 3 ngày",
    description: "Chạy liên tục 3 ngày liền.",
    emoji: "🔥",
    tier: "bronze",
    check: (c) => c.stats.bestStreak >= 3,
  },
  {
    type: "streak_7",
    title: "Tuần hoàn hảo",
    description: "Chạy liên tục 7 ngày liền.",
    emoji: "⚡",
    tier: "silver",
    check: (c) => c.stats.bestStreak >= 7,
  },
  {
    type: "total_50km",
    title: "Tổng 50 km",
    description: "Tích luỹ 50 km chạy bộ.",
    emoji: "🛣️",
    tier: "silver",
    check: (c) => c.stats.totalKm >= 50,
  },
  {
    type: "total_100km",
    title: "Trăm cây số",
    description: "Tích luỹ 100 km chạy bộ.",
    emoji: "💯",
    tier: "gold",
    check: (c) => c.stats.totalKm >= 100,
  },
  {
    type: "total_250km",
    title: "Marathon vương",
    description: "Tích luỹ 250 km chạy bộ.",
    emoji: "👑",
    tier: "gold",
    check: (c) => c.stats.totalKm >= 250,
  },
  {
    type: "week_goal",
    title: "Đạt mục tiêu tuần",
    description: "Hoàn thành mục tiêu km trong một tuần.",
    emoji: "🏆",
    tier: "gold",
    check: (c) => c.stats.weekKm >= c.profile.targetKmPerWeek && c.profile.targetKmPerWeek > 0,
  },
  {
    type: "weight_1kg",
    title: "Khởi đầu giảm cân",
    description: "Giảm được 1 kg so với lần cân đầu tiên.",
    emoji: "📉",
    tier: "bronze",
    check: (c) => c.stats.weightLost >= 1,
  },
  {
    type: "weight_5kg",
    title: "Cột mốc 5 kg",
    description: "Giảm được 5 kg so với lần cân đầu tiên.",
    emoji: "🌟",
    tier: "gold",
    check: (c) => c.stats.weightLost >= 5,
  },
  {
    type: "runs_25",
    title: "Người kiên trì",
    description: "Tổng cộng 25 buổi chạy.",
    emoji: "🗓️",
    tier: "silver",
    check: (c) => c.stats.totalRuns >= 25,
  },
  {
    type: "long_run_15k",
    title: "Chiến binh đường dài",
    description: "Một buổi chạy dài 15 km trở lên.",
    emoji: "🦬",
    tier: "platinum",
    check: (c) => c.stats.longestRunKm >= 15,
  },
  {
    type: "total_500km",
    title: "Huyền thoại 500 km",
    description: "Tích luỹ 500 km chạy bộ.",
    emoji: "💎",
    tier: "platinum",
    check: (c) => c.stats.totalKm >= 500,
  },
  {
    type: "calories_1000",
    title: "Đốt cháy 1.000 calo",
    description: "Tổng số calo đốt cháy đạt 1.000 kcal.",
    emoji: "🔥",
    tier: "silver",
    check: (c) =>
      c.runs.reduce((s, r) => s + r.calories, 0) >= 1000,
  },
  {
    type: "calories_5000",
    title: "Lò lửa 5.000 calo",
    description: "Tổng số calo đốt cháy đạt 5.000 kcal.",
    emoji: "🌋",
    tier: "gold",
    check: (c) =>
      c.runs.reduce((s, r) => s + r.calories, 0) >= 5000,
  },
  {
    type: "consistency_week",
    title: "Tuần đều đặn",
    description: "Chạy ít nhất 3 buổi trong một tuần.",
    emoji: "📅",
    tier: "bronze",
    check: (c) => {
      // check if any single week has >= 3 runs
      const weekCount = new Map<string, number>();
      for (const r of c.runs) {
        const d = new Date(r.date);
        const week = getWeekKey(d);
        weekCount.set(week, (weekCount.get(week) ?? 0) + 1);
      }
      return Array.from(weekCount.values()).some((n) => n >= 3);
    },
  },
  {
    type: "streak_14",
    title: "Thử thách 14 ngày",
    description: "Chạy liên tục 14 ngày liền.",
    emoji: "🌙",
    tier: "gold",
    check: (c) => c.stats.bestStreak >= 14,
  },
  {
    type: "pace_master",
    title: "Bậc thầy tốc độ",
    description: "Đạt tốc độ trung bình 12 km/h trong một buổi chạy.",
    emoji: "⚡",
    tier: "gold",
    check: (c) => c.runs.some((r) => r.avgSpeed >= 12),
  },
];

export const TIER_STYLE: Record<AchievementDef["tier"], { ring: string; glow: string; label: string }> = {
  bronze: { ring: "oklch(0.62 0.12 55)", glow: "oklch(0.62 0.12 55 / 0.35)", label: "Đồng" },
  silver: { ring: "oklch(0.72 0.03 250)", glow: "oklch(0.72 0.03 250 / 0.35)", label: "Bạc" },
  gold: { ring: "oklch(0.82 0.15 85)", glow: "oklch(0.82 0.15 85 / 0.45)", label: "Vàng" },
  platinum: { ring: "oklch(0.78 0.16 295)", glow: "oklch(0.78 0.16 295 / 0.45)", label: "Bạch kim" },
};

/** Compute best (longest) streak ever from run dates. */
export function bestStreakEver(runDates: string[]): number {
  if (runDates.length === 0) return 0;
  const sorted = [...new Set(runDates)].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const now = new Date(sorted[i]);
    const diff = Math.round((now.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

/** Evaluate all achievements for a profile and persist newly-unlocked ones.
 *  Returns the list of freshly unlocked types (for celebration). */
export async function evaluateAchievements(
  profile: Profile,
  runs: RunSession[],
  weights: WeightEntry[]
): Promise<string[]> {
  const runDates = runs.map((r) => r.date);
  const longestRunKm = runs.reduce((m, r) => Math.max(m, r.distanceKm), 0);
  const { computeStats } = await import("./insights");
  const stats0 = computeStats(profile, runs, weights);
  const weekKm = stats0.weekKm;
  const ctx: AchievementCtx = {
    profile,
    runs,
    weights,
    stats: {
      totalKm: stats0.totalKm,
      totalRuns: stats0.totalRuns,
      longestRunKm,
      streak: stats0.streak,
      bestStreak: bestStreakEver(runDates),
      weekKm,
      weightLost: stats0.weightLost,
    },
  };

  const existing = await db.achievements.where("profileId").equals(profile.id).toArray();
  const existingTypes = new Set(existing.map((a) => a.type));
  const newly: string[] = [];
  const now = Date.now();
  for (const def of ACHIEVEMENTS) {
    if (existingTypes.has(def.type)) continue;
    if (def.check(ctx)) {
      const rec: AchievementRecord = {
        id: uid(),
        profileId: profile.id,
        type: def.type,
        unlockedAt: now,
      };
      await db.achievements.put(rec);
      newly.push(def.type);
    }
  }
  return newly;
}

export function defForType(type: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.type === type);
}
