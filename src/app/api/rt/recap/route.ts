import { NextRequest, NextResponse } from "next/server";
import { generateRecap } from "@/lib/nutrition";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as {
      profileName: string;
      monthLabel: string;
      totalKm: number;
      totalRuns: number;
      totalCalories: number;
      longestRunKm: number;
      bestStreak: number;
      weightStart?: number;
      weightEnd?: number;
      weightChange?: number;
      targetWeight?: number;
      weeklyGoalKm?: number;
      achievementCount: number;
      photosCount: number;
    };

    const result = generateRecap(data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("recap error:", e);
    return NextResponse.json({
      headline: "📊 Tổng kết tháng",
      narrative: "Hành trình của bạn vẫn rất đáng tự hào!",
      highlights: [],
    });
  }
}
