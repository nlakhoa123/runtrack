import { NextRequest, NextResponse } from "next/server";
import { generateMealPlan } from "@/lib/nutrition";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as {
      weightKg: number;
      targetWeight: number;
      targetKmPerWeek: number;
      avgBurnedDay: number;
    };

    const result = generateMealPlan(data.weightKg, data.targetWeight, data.targetKmPerWeek, data.avgBurnedDay);
    return NextResponse.json(result);
  } catch (e) {
    console.error("meal plan error:", e);
    return NextResponse.json({
      targetCalories: 2000,
      proteinTarget: 100,
      carbsTarget: 250,
      fatTarget: 60,
      meals: [],
      tip: "Uống đủ 2L nước và ưu tiên protein, carb phức.",
    });
  }
}
