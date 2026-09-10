import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, parseAIJson } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface RecapOutput {
  headline: string;
  narrative: string;
  highlights: string[];
}

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

    const systemPrompt =
      "Bạn là trợ lý AI của app fitness RunTrack, chuyên viết tổng kết tháng chạy bộ cá nhân hóa, truyền cảm hứng. Luôn trả về JSON hợp lệ theo đúng schema yêu cầu.";

    const userPrompt = `Viết tổng kết tháng chạy bộ cá nhân hóa cho người dùng app RunTrack. Dữ liệu tháng ${data.monthLabel}:

- Tên: ${data.profileName}
- Tổng km: ${data.totalKm} km
- Số buổi chạy: ${data.totalRuns}
- Tổng calo: ${data.totalCalories} kcal
- Chạy dài nhất: ${data.longestRunKm} km
- Chuỗi dài nhất: ${data.bestStreak} ngày
- Cân nặng đầu tháng: ${data.weightStart ?? "?"} kg
- Cân nặng cuối tháng: ${data.weightEnd ?? "?"} kg
- Thay đổi cân nặng: ${data.weightChange ?? 0} kg
- Cân nặng mục tiêu: ${data.targetWeight ?? "?"} kg
- Mục tiêu km/tuần: ${data.weeklyGoalKm ?? "?"} km
- Thành tích mở khoá: ${data.achievementCount}
- Ảnh kỉ niệm: ${data.photosCount}

Hãy viết theo ĐÚNG định dạng JSON sau, KHÔNG thêm text nào khác:
{
  "headline": "Một câu tiêu đề ngắn, động lực, có emoji (vd: 🔥 Tháng bứt phá của bạn!)",
  "narrative": "2-4 câu kể chuyện hành trình tháng này, thân thiện như bạn thân, dùng số liệu cụ thể. Có thể khen, khích lệ, hoặc gợi ý nhẹ nhàng.",
  "highlights": ["3-4 điểm nổi bật ngắn, mỗi dòng 1 câu, có emoji"]
}

Quy tắc:
- Viết bằng tiếng Việt, giọng thân thiện, động viên.
- Nếu totalRuns = 0, vẫn khích lệ nhẹ nhàng, không chê.
- Nếu weightChange âm (giảm) và hướng tới mục tiêu → khen ngợi. Nếu dương mà đang giảm cân → gợi ý nhẹ.
- highlights nên đa dạng: km, streak, calo, thành tích, hoặc cân nặng.`;

    const raw = await chatCompletion(systemPrompt, userPrompt);
    const parsed = parseAIJson<RecapOutput>(raw);

    if (!parsed) {
      return NextResponse.json({
        headline: `📊 Tổng kết ${data.monthLabel}`,
        narrative: `Tháng ${data.monthLabel}, bạn đã chạy ${data.totalKm} km trong ${data.totalRuns} buổi. Tiếp tục phát nhé!`,
        highlights: [],
        error: "AI không parse được JSON",
      });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("recap API error:", e);
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    return NextResponse.json(
      {
        headline: "📊 Tổng kết tháng",
        narrative: "Không thể tạo lời bình AI lúc này, nhưng hành trình của bạn vẫn rất đáng tự hào!",
        highlights: [],
        error: `AI lỗi: ${msg}`,
      },
      { status: 200 }
    );
  }
}
