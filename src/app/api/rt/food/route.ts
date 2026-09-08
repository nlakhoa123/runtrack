import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface FoodParseInput {
  text: string;
  /** user weight in kg (for context) */
  weightKg?: number;
}

export interface FoodItem {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodParseOutput {
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as FoodParseInput;
    if (!data.text?.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung" }, { status: 400 });
    }

    const zai = await ZAI.create();

    const userPrompt = `Người dùng vừa ghi bữa ăn bằng tiếng Việt (có thể tự nhiên, gộp nhiều món). Hãy phân tích và ước lượng dinh dưỡng.

Nội dung: "${data.text}"

Trả về ĐÚNG định dạng JSON sau, KHÔNG thêm gì khác:
{
  "slot": "breakfast | lunch | dinner | snack (đoán theo nội dung: sáng=sáng, trưa=trưa, tối=tối, nhẹ=snack; nếu không rõ → snack)",
  "items": [
    { "name": "tên món (gọn, tiếng Việt)", "amount": "số lượng ước lượng (vd: 1 củ ~150g, 2 quả trứng ~100g)", "calories": số, "protein": gam, "carbs": gam, "fat": gam }
  ],
  "totalCalories": tổng,
  "totalProtein": tổng,
  "totalCarbs": tổng,
  "totalFat": tổng
}

Quy tắc:
- Phân tách món nếu người dùng gộp (vd "khoai trứng rau" → 3 món: khoai lang, trứng, rau luộc).
- Ước lượng hợp lý theo khẩu phần Việt Nam (vd 1 củ khoai lang ~150g ~170kcal; 1 quả trứng ~50g ~78kcal; 1 bát rau luộc ~150g ~35kcal).
- Làm tròn số calo/macro về số nguyên.
- Tính tổng chính xác.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "Bạn là chuyên gia dinh dưỡng. Phân tích bữa ăn từ mô tả tiếng Việt, trả JSON hợp lệ theo đúng schema.",
        },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: FoodParseOutput;
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        slot: "snack",
        items: [{ name: data.text.slice(0, 40), amount: "—", calories: 0, protein: 0, carbs: 0, fat: 0 }],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
      };
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("food parse error:", e);
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    return NextResponse.json(
      {
        slot: "snack",
        items: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        error: `AI không phản hồi: ${msg}`,
      },
      { status: 200 }
    );
  }
}
