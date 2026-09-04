import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export interface MealPlanInput {
  weightKg: number;
  targetWeight: number;
  targetKmPerWeek: number;
  /** kcal burned from running this week (avg/day) */
  avgBurnedDay: number;
}

export interface MealPlanOutput {
  targetCalories: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  meals: { slot: string; suggestion: string; calories: number }[];
  tip: string;
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as MealPlanInput;

    const zai = await ZAI.create();

    const losing = data.targetWeight < data.weightKg;
    const goal = losing ? "giảm cân" : data.targetWeight > data.weightKg ? "tăng cơ" : "duy trì";

    const userPrompt = `Gợi ý thực đơn 1 ngày cho người chạy bộ.
- Cân nặng hiện tại: ${data.weightKg} kg
- Mục tiêu: ${data.targetWeight} kg (${goal})
- Mục tiêu chạy: ${data.targetKmPerWeek} km/tuần
- Calo đốt từ chạy (TB/ngày): ${data.avgBurnedDay} kcal

Trả về ĐÚNG JSON sau, KHÔNG thêm gì khác:
{
  "targetCalories": số kcal mục tiêu/ngày (BMR ~24*weight, +/- điều chỉnh mục tiêu, +calo đốt),
  "proteinTarget": gam/ngày (~1.6g/kg nếu giảm cân/tăng cơ),
  "carbsTarget": gam/ngày (ưu tiên carb phức),
  "fatTarget": gam/ngày (~0.8g/kg),
  "meals": [
    { "slot": "Sáng", "suggestion": "2 quả trứng luộc + 1 củ khoai lang + bát rau muống luộc", "calories": số },
    { "slot": "Trưa", "suggestion": "...", "calories": số },
    { "slot": "Tối", "suggestion": "... nhẹ, ít carb", "calories": số },
    { "slot": "Phụ", "suggestion": "... (chuối/sữa chua)", "calories": số }
  ],
  "tip": "Một câu mẹo ngắn cho ngày hôm nay (vd: uống 2L nước, ngủ đủ 7h)"
}

Quy tắc:
- Thực đơn Việt Nam, nguyên liệu dễ tìm.
- Chia phần hợp lý theo mục tiêu (giảm cân → thâm hụt ~300-500kcal; tăng cơ → dư ~200-300kcal).
- Làm tròn số.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "Bạn là chuyên gia dinh dưỡng thể thao. Gợi ý thực đơn 1 ngày cho người chạy bộ Việt Nam, trả JSON hợp lệ.",
        },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: MealPlanOutput;
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        targetCalories: Math.round(24 * data.weightKg + data.avgBurnedDay),
        proteinTarget: Math.round(1.6 * data.weightKg),
        carbsTarget: Math.round(3 * data.weightKg),
        fatTarget: Math.round(0.8 * data.weightKg),
        meals: [],
        tip: "Uống đủ 2L nước và ngủ đủ 7 tiếng mỗi ngày.",
      };
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("meal plan error:", e);
    return NextResponse.json(
      {
        targetCalories: 2000,
        proteinTarget: 100,
        carbsTarget: 250,
        fatTarget: 60,
        meals: [],
        tip: "Không tạo được thực đơn lúc này, nhưng hãy ưu tiên protein, carb phức và uống đủ nước.",
      },
      { status: 200 }
    );
  }
}
