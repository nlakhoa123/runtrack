import { NextRequest, NextResponse } from "next/server";
import { parseFoodText } from "@/lib/nutrition";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as { text: string; weightKg?: number };
    if (!data.text?.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung" }, { status: 400 });
    }

    const result = parseFoodText(data.text);
    return NextResponse.json(result);
  } catch (e) {
    console.error("food parse error:", e);
    return NextResponse.json({
      slot: "snack",
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    });
  }
}
