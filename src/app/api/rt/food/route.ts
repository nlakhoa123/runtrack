import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, parseAIJson } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const data = (await req.json()) as { text: string; weightKg?: number };
    if (!data.text?.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung" }, { status: 400 });
    }

    const systemPrompt =
      "Bạn là chuyên gia dinh dưỡng. Phân tích bữa ăn từ mô tả tiếng Việt, trả JSON hợp lệ theo đúng schema.";

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
- Ước lượng hợp lý theo khẩu phần Việt Nam (vd 1 củ khoai lang ~150g ~170kcal; 1 quả trứng ~50g ~78kcal; 1 bát cơm ~200g ~260kcal; 1 bát phở ~400g ~400kcal).
- Làm tròn số calo/macro về số nguyên.
- Tính tổng chính xác.`;

    const raw = await chatCompletion(systemPrompt, userPrompt);
    const parsed = parseAIJson<FoodParseOutput>(raw);

    if (!parsed) {
      return NextResponse.json({
        slot: "snack",
        items: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        error: "AI không parse được JSON",
      });
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
        error: `AI lỗi: ${msg}`,
      },
      { status: 200 }
    );
  }
}
