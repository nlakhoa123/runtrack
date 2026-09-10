/**
 * Vietnamese food database — built-in nutrition lookup.
 * No internet, no API, no token expiry. Instant results.
 * ~120 common Vietnamese foods with calo/protein/carbs/fat per 100g.
 */

export interface FoodDBEntry {
  /** canonical name (lowercase, no accent for matching) */
  key: string;
  /** display name (Vietnamese) */
  name: string;
  /** calories per 100g */
  kcal: number;
  /** protein per 100g */
  protein: number;
  /** carbs per 100g */
  carbs: number;
  /** fat per 100g */
  fat: number;
  /** default portion in grams (for "1 bát", "1 cái", "1 quả"...) */
  defaultPortion: number;
}

/** Remove Vietnamese accents for fuzzy matching */
export function noAccent(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export const FOOD_DB: FoodDBEntry[] = [
  // === CƠM / TINH BỘT ===
  { key: "com trang", name: "Cơm trắng", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, defaultPortion: 200 },
  { key: "com gao lut", name: "Cơm gạo lứt", kcal: 112, protein: 2.6, carbs: 24, fat: 0.9, defaultPortion: 200 },
  { key: "com chien", name: "Cơm chiên", kcal: 163, protein: 3, carbs: 25, fat: 5, defaultPortion: 250 },
  { key: "pho bo", name: "Phở bò", kcal: 110, protein: 5, carbs: 18, fat: 3, defaultPortion: 400 },
  { key: "pho ga", name: "Phở gà", kcal: 90, protein: 4, carbs: 16, fat: 2, defaultPortion: 400 },
  { key: "bun bo", name: "Bún bò", kcal: 105, protein: 6, carbs: 15, fat: 3, defaultPortion: 350 },
  { key: "bun thit nuong", name: "Bún thịt nướng", kcal: 140, protein: 8, carbs: 20, fat: 4, defaultPortion: 300 },
  { key: "bun dau mam tom", name: "Bún đậu mắm tôm", kcal: 160, protein: 7, carbs: 22, fat: 5, defaultPortion: 300 },
  { key: "mi", name: "Mì", kcal: 138, protein: 4, carbs: 25, fat: 2, defaultPortion: 200 },
  { key: "mi xao", name: "Mì xào", kcal: 180, protein: 5, carbs: 26, fat: 6, defaultPortion: 250 },
  { key: "hu tieu", name: "Hủ tiếu", kcal: 100, protein: 4, carbs: 18, fat: 2, defaultPortion: 350 },
  { key: "banh mi", name: "Bánh mì", kcal: 250, protein: 8, carbs: 45, fat: 4, defaultPortion: 120 },
  { key: "banh mi thit", name: "Bánh mì thịt", kcal: 300, protein: 12, carbs: 40, fat: 8, defaultPortion: 150 },
  { key: "banh xeo", name: "Bánh xèo", kcal: 200, protein: 6, carbs: 30, fat: 7, defaultPortion: 200 },
  { key: "banh cuon", name: "Bánh cuốn", kcal: 130, protein: 5, carbs: 22, fat: 3, defaultPortion: 200 },
  { key: "com tam", name: "Cơm tấm", kcal: 160, protein: 8, carbs: 25, fat: 4, defaultPortion: 250 },
  { key: "xoi", name: "Xôi", kcal: 170, protein: 4, carbs: 35, fat: 1, defaultPortion: 200 },
  { key: "xoi gac", name: "Xôi gấc", kcal: 180, protein: 4, carbs: 36, fat: 2, defaultPortion: 200 },
  { key: "khoai lang", name: "Khoai lang", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, defaultPortion: 150 },
  { key: "khoai tay", name: "Khoai tây", kcal: 77, protein: 2, carbs: 17, fat: 0.1, defaultPortion: 150 },
  { key: "khoai mon", name: "Khoai môn", kcal: 112, protein: 1.5, carbs: 27, fat: 0.2, defaultPortion: 150 },
  { key: "khoai tay chien", name: "Khoai tây chiên", kcal: 310, protein: 4, carbs: 41, fat: 15, defaultPortion: 100 },
  { key: "khoai lang luoc", name: "Khoai lang luộc", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, defaultPortion: 150 },

  // === THỊT ===
  { key: "uc ga", name: "Ức gà", kcal: 165, protein: 31, carbs: 0, fat: 3.6, defaultPortion: 150 },
  { key: "uc ga luoc", name: "Ức gà luộc", kcal: 165, protein: 31, carbs: 0, fat: 3.6, defaultPortion: 150 },
  { key: "uc ga nuong", name: "Ức gà nướng", kcal: 175, protein: 30, carbs: 1, fat: 4.5, defaultPortion: 150 },
  { key: "ga", name: "Thịt gà", kcal: 239, protein: 27, carbs: 0, fat: 14, defaultPortion: 150 },
  { key: "ga luoc", name: "Gà luộc", kcal: 200, protein: 28, carbs: 0, fat: 9, defaultPortion: 150 },
  { key: "ga ran", name: "Gà rán", kcal: 280, protein: 25, carbs: 5, fat: 18, defaultPortion: 150 },
  { key: "ga nuong", name: "Gà nướng", kcal: 210, protein: 27, carbs: 2, fat: 11, defaultPortion: 150 },
  { key: "thit heo", name: "Thịt heo", kcal: 242, protein: 27, carbs: 0, fat: 14, defaultPortion: 100 },
  { key: "thit ba chi", name: "Thịt ba chỉ", kcal: 518, protein: 9, carbs: 0, fat: 53, defaultPortion: 80 },
  { key: "thit cha lua", name: "Chả lụa", kcal: 250, protein: 17, carbs: 5, fat: 17, defaultPortion: 60 },
  { key: "thit bo", name: "Thịt bò", kcal: 250, protein: 26, carbs: 0, fat: 17, defaultPortion: 100 },
  { key: "bo luoc", name: "Bò luộc", kcal: 220, protein: 28, carbs: 0, fat: 12, defaultPortion: 100 },
  { key: "bo nuong", name: "Bò nướng", kcal: 260, protein: 27, carbs: 1, fat: 17, defaultPortion: 100 },
  { key: "bo xao", name: "Bò xào", kcal: 200, protein: 20, carbs: 5, fat: 11, defaultPortion: 150 },
  { key: "ca ho", name: "Cá hồi", kcal: 208, protein: 20, carbs: 0, fat: 13, defaultPortion: 150 },
  { key: "ca ho hap", name: "Cá hồi hấp", kcal: 180, protein: 22, carbs: 0, fat: 10, defaultPortion: 150 },
  { key: "ca", name: "Cá", kcal: 160, protein: 22, carbs: 0, fat: 7, defaultPortion: 150 },
  { key: "ca kho", name: "Cá kho", kcal: 180, protein: 20, carbs: 3, fat: 9, defaultPortion: 150 },
  { key: "ca chien", name: "Cá chiên", kcal: 250, protein: 20, carbs: 8, fat: 15, defaultPortion: 120 },
  { key: "tom", name: "Tôm", kcal: 99, protein: 24, carbs: 0.2, fat: 0.3, defaultPortion: 100 },
  { key: "tom luoc", name: "Tôm luộc", kcal: 99, protein: 24, carbs: 0.2, fat: 0.3, defaultPortion: 100 },
  { key: "trung ga", name: "Trứng gà", kcal: 155, protein: 13, carbs: 1.1, fat: 11, defaultPortion: 50 },
  { key: "trung luoc", name: "Trứng luộc", kcal: 155, protein: 13, carbs: 1.1, fat: 11, defaultPortion: 50 },
  { key: "trung chien", name: "Trứng chiên", kcal: 196, protein: 14, carbs: 1.5, fat: 15, defaultPortion: 60 },
  { key: "trung op la", name: "Trứng ốp la", kcal: 196, protein: 14, carbs: 1.5, fat: 15, defaultPortion: 60 },
  { key: "toc heo", name: "Thịt lợn nạc", kcal: 242, protein: 27, carbs: 0, fat: 14, defaultPortion: 100 },
  { key: "suon non", name: "Sườn non", kcal: 275, protein: 24, carbs: 0, fat: 20, defaultPortion: 120 },
  { key: "suon nuong", name: "Sườn nướng", kcal: 290, protein: 25, carbs: 2, fat: 21, defaultPortion: 120 },

  // === RAU ===
  { key: "rau muong", name: "Rau muống", kcal: 19, protein: 2.6, carbs: 3.1, fat: 0.2, defaultPortion: 150 },
  { key: "rau muong luoc", name: "Rau muống luộc", kcal: 19, protein: 2.6, carbs: 3.1, fat: 0.2, defaultPortion: 150 },
  { key: "rau muong xao", name: "Rau muống xào", kcal: 70, protein: 3, carbs: 5, fat: 5, defaultPortion: 150 },
  { key: "rau sang", name: "Rau dền", kcal: 23, protein: 2.8, carbs: 4, fat: 0.3, defaultPortion: 150 },
  { key: "bap cai", name: "Bắp cải", kcal: 25, protein: 1.3, carbs: 5.8, fat: 0.1, defaultPortion: 150 },
  { key: "bong cai xanh", name: "Bông cải xanh", kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, defaultPortion: 150 },
  { key: "ca rot", name: "Cà rốt", kcal: 41, protein: 0.9, carbs: 10, fat: 0.2, defaultPortion: 100 },
  { key: "ca chua", name: "Cà chua", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, defaultPortion: 100 },
  { key: "dưa leo", name: "Dưa leo", kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, defaultPortion: 100 },
  { key: "salad", name: "Salad rau củ", kcal: 30, protein: 1.5, carbs: 6, fat: 0.2, defaultPortion: 150 },
  { key: "rau xao", name: "Rau xào", kcal: 80, protein: 3, carbs: 6, fat: 5, defaultPortion: 150 },
  { key: "rau luoc", name: "Rau luộc", kcal: 25, protein: 2, carbs: 4, fat: 0.3, defaultPortion: 150 },
  { key: "canh rau", name: "Canh rau", kcal: 20, protein: 1, carbs: 3, fat: 0.5, defaultPortion: 200 },

  // === TRÁI CÂY ===
  { key: "chuoi", name: "Chuối", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, defaultPortion: 100 },
  { key: "tao", name: "Táo", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, defaultPortion: 150 },
  { key: "cam", name: "Cam", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, defaultPortion: 150 },
  { key: "dua hau", name: "Dưa hấu", kcal: 30, protein: 0.6, carbs: 8, fat: 0.2, defaultPortion: 200 },
  { key: "xoai", name: "Xoài", kcal: 60, protein: 0.8, carbs: 15, fat: 0.4, defaultPortion: 150 },
  { key: "oi", name: "Ổi", kcal: 68, protein: 2.6, carbs: 14, fat: 1, defaultPortion: 100 },
  { key: "buoi", name: "Bưởi", kcal: 42, protein: 0.8, carbs: 11, fat: 0.1, defaultPortion: 150 },
  { key: "dua", name: "Dứa", kcal: 50, protein: 0.5, carbs: 13, fat: 0.1, defaultPortion: 100 },
  { key: "thom", name: "Thơm", kcal: 50, protein: 0.5, carbs: 13, fat: 0.1, defaultPortion: 100 },

  // === SỮA / TRÁNG MIỆNG ===
  { key: "sua", name: "Sữa", kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, defaultPortion: 250 },
  { key: "sua chua", name: "Sữa chua", kcal: 72, protein: 3.5, carbs: 9, fat: 2, defaultPortion: 100 },
  { key: "sua dau nanh", name: "Sữa đậu nành", kcal: 54, protein: 3.3, carbs: 4, fat: 2.5, defaultPortion: 250 },
  { key: "sua fresh", name: "Sữa tươi", kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, defaultPortion: 250 },
  { key: "yogurt", name: "Sữa chua", kcal: 72, protein: 3.5, carbs: 9, fat: 2, defaultPortion: 100 },

  // === ĐỒ UỐNG ===
  { key: "tra da", name: "Trà đá", kcal: 0, protein: 0, carbs: 0, fat: 0, defaultPortion: 250 },
  { key: "ca phe", name: "Cà phê", kcal: 2, protein: 0.3, carbs: 0, fat: 0, defaultPortion: 150 },
  { key: "ca phe sua", name: "Cà phê sữa", kcal: 65, protein: 2, carbs: 10, fat: 2, defaultPortion: 150 },
  { key: "nuoc cam", name: "Nước cam", kcal: 45, protein: 0.5, carbs: 11, fat: 0.1, defaultPortion: 200 },
  { key: "nuoc dua", name: "Nước dừa", kcal: 19, protein: 0.7, carbs: 4, fat: 0.2, defaultPortion: 250 },
  { key: "bia", name: "Bia", kcal: 43, protein: 0.5, carbs: 3.6, fat: 0, defaultPortion: 330 },
  { key: "nuoc ngot", name: "Nước ngọt", kcal: 42, protein: 0, carbs: 11, fat: 0, defaultPortion: 330 },
  { key: "sinh to", name: "Sinh tố", kcal: 80, protein: 1.5, carbs: 18, fat: 0.5, defaultPortion: 250 },

  // === ĐẬU / HẠT ===
  { key: "dau nanh", name: "Đậu nành", kcal: 173, protein: 17, carbs: 10, fat: 9, defaultPortion: 100 },
  { key: "dau den", name: "Đậu đen", kcal: 341, protein: 22, carbs: 62, fat: 1.4, defaultPortion: 50 },
  { key: "dau xanh", name: "Đậu xanh", kcal: 347, protein: 24, carbs: 63, fat: 1.2, defaultPortion: 50 },
  { key: "lac", name: "Lạc", kcal: 567, protein: 26, carbs: 16, fat: 49, defaultPortion: 30 },
  { key: "hat dieu", name: "Hạt điều", kcal: 553, protein: 18, carbs: 30, fat: 44, defaultPortion: 30 },
  { key: "xoai", name: "Xoài", kcal: 60, protein: 0.8, carbs: 15, fat: 0.4, defaultPortion: 150 },

  // === MÓN NẤU ===
  { key: "canh chua", name: "Canh chua", kcal: 40, protein: 3, carbs: 5, fat: 1.5, defaultPortion: 250 },
  { key: "kho bo", name: "Kho bò", kcal: 280, protein: 30, carbs: 5, fat: 15, defaultPortion: 100 },
  { key: "kho ga", name: "Kho gà", kcal: 200, protein: 25, carbs: 3, fat: 10, defaultPortion: 150 },
  { key: "thit kho", name: "Thịt kho", kcal: 290, protein: 20, carbs: 5, fat: 22, defaultPortion: 100 },
  { key: "ca kho to", name: "Cá kho tộ", kcal: 180, protein: 20, carbs: 3, fat: 9, defaultPortion: 150 },
  { key: "sup", name: "Súp", kcal: 60, protein: 4, carbs: 8, fat: 2, defaultPortion: 250 },
  { key: "chao", name: "Cháo", kcal: 50, protein: 1.5, carbs: 10, fat: 0.5, defaultPortion: 250 },
  { key: "chao ga", name: "Cháo gà", kcal: 70, protein: 5, carbs: 10, fat: 2, defaultPortion: 250 },
  { key: "goi", name: "Gỏi", kcal: 80, protein: 5, carbs: 8, fat: 4, defaultPortion: 150 },
  { key: "nem", name: "Nem rán", kcal: 150, protein: 6, carbs: 18, fat: 7, defaultPortion: 50 },
  { key: "cha gio", name: "Chả giò", kcal: 150, protein: 6, carbs: 18, fat: 7, defaultPortion: 50 },

  // === ĐỒ ĂN VẶT ===
  { key: "banh ngot", name: "Bánh ngọt", kcal: 350, protein: 5, carbs: 55, fat: 13, defaultPortion: 50 },
  { key: "keo", name: "Kẹo", kcal: 380, protein: 0, carbs: 95, fat: 0, defaultPortion: 30 },
  { key: "snack", name: "Snack", kcal: 536, protein: 6, carbs: 56, fat: 32, defaultPortion: 30 },
  { key: "kem", name: "Kem", kcal: 207, protein: 3.5, carbs: 24, fat: 11, defaultPortion: 80 },
];

// Build lookup map
const FOOD_MAP = new Map<string, FoodDBEntry>();
for (const f of FOOD_DB) {
  FOOD_MAP.set(f.key, f);
}

/** Portion size keywords → grams */
const PORTION_PATTERNS: { pattern: string; grams: number }[] = [
  { pattern: "bat", grams: 200 },
  { pattern: "chen", grams: 200 },
  { pattern: "to", grams: 300 },
  { pattern: "ly", grams: 250 },
  { pattern: "coc", grams: 250 },
  { pattern: "dia", grams: 200 },
  { pattern: "qua", grams: 50 },
  { pattern: "trung", grams: 50 },
  { pattern: "cu", grams: 150 },
  { pattern: "mieng", grams: 50 },
  { pattern: "goi", grams: 30 },
  { pattern: "hop", grams: 100 },
  { pattern: "cai", grams: 80 },
  { pattern: "thit", grams: 100 },
];

/** Parse a food description string into items with nutrition. */
export function parseFoodText(text: string): {
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  items: { name: string; amount: string; calories: number; protein: number; carbs: number; fat: number }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
} {
  const naText = noAccent(text);

  // Determine slot from keywords
  let slot: "breakfast" | "lunch" | "dinner" | "snack" = "snack";
  if (/\b(sang|morning|breakfast|bun\s*sang)\b/i.test(naText)) slot = "breakfast";
  else if (/\b(trua|noon|lunch|buoi\s*trua)\b/i.test(naText)) slot = "lunch";
  else if (/\b(toi|evening|dinner|buoi\s*toi|dem)\b/i.test(naText)) slot = "dinner";

  // Split by common separators, keeping numbers with their food item
  // Split on +, comma, semicolon, and Vietnamese connectors
  const parts = naText
    .split(/\s*[+,.;]\s*|\s+(?:xong|va|voi|kem|roi|ma|nua|an)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);

  const items: { name: string; amount: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
  const usedFoodKeys = new Set<string>(); // avoid duplicate matches in same part

  for (const part of parts) {
    usedFoodKeys.clear();

    // Try to match ALL foods in this part (may have "1 bát cơm 150g ức gà" = 2 foods)
    const partMatches: FoodDBEntry[] = [];
    for (const food of FOOD_DB) {
      if (part.includes(food.key) && !usedFoodKeys.has(food.key)) {
        partMatches.push(food);
        usedFoodKeys.add(food.key);
      }
    }

    // Sort by key length descending (most specific first) — only keep the best match per part
    partMatches.sort((a, b) => b.key.length - a.key.length);

    // Take only the SINGLE best match per part to avoid duplicates (cơm vs cơm trắng)
    for (const matched of partMatches.slice(0, 1)) {
      // Only use gram quantity if it appears before this food's key in the part
      // (so "150g ức gà" → 150g for ức gà, not for cơm)
      const foodIdx = part.indexOf(matched.key);
      const beforeFood = foodIdx >= 0 ? part.substring(0, foodIdx) : part;

      // Parse quantity from the part
      let grams = matched.defaultPortion;
      let amountStr = `1 phần ~${grams}g`;

      // Check for explicit gram amounts BEFORE the food name: "150g ức gà"
      const gramMatch = beforeFood.match(/(\d+(?:\.\d+)?)\s*(g|gram|gam)/i);
      if (gramMatch) {
        grams = parseFloat(gramMatch[1]);
        amountStr = `${grams}g`;
      } else {
        // Check for quantity + unit: "2 bat", "1 ly", "3 qua"
        const qtyMatch = beforeFood.match(/(\d+(?:\.\d+)?)\s*(bat|chen|to|ly|coc|dia|qua|cu|mieng|goi|hop|cai|trung)/i);
        if (qtyMatch) {
          const qty = parseFloat(qtyMatch[1]);
          const unit = qtyMatch[2].toLowerCase();
          const portion = PORTION_PATTERNS.find((p) => p.pattern === unit);
          if (portion) {
            grams = qty * portion.grams;
            amountStr = `${qty} ${unit} ~${grams}g`;
          }
        }
      }

    // Calculate nutrition based on actual grams (food values are per 100g)
    const factor = grams / 100;
    const calories = Math.round(matched.kcal * factor);
    const protein = Math.round(matched.protein * factor);
    const carbs = Math.round(matched.carbs * factor);
    const fat = Math.round(matched.fat * factor);

    items.push({
      name: matched.name,
      amount: amountStr,
      calories,
      protein,
      carbs,
      fat,
    });
    } // end for matched
  } // end for parts

  // Deduplicate items (merge same food)
  const seen = new Map<string, typeof items[0]>();
  for (const item of items) {
    const existing = seen.get(item.name);
    if (existing) {
      existing.calories += item.calories;
      existing.protein += item.protein;
      existing.carbs += item.carbs;
      existing.fat += item.fat;
      existing.amount += ` + ${item.amount}`;
    } else {
      seen.set(item.name, { ...item });
    }
  }

  const finalItems = Array.from(seen.values());
  const totalCalories = finalItems.reduce((s, i) => s + i.calories, 0);
  const totalProtein = finalItems.reduce((s, i) => s + i.protein, 0);
  const totalCarbs = finalItems.reduce((s, i) => s + i.carbs, 0);
  const totalFat = finalItems.reduce((s, i) => s + i.fat, 0);

  return {
    slot,
    items: finalItems,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
  };
}

/** Generate a meal plan using BMR formula + random sample from food DB. */
export function generateMealPlan(weightKg: number, targetWeight: number, targetKmPerWeek: number, avgBurnedDay: number): {
  targetCalories: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  meals: { slot: string; suggestion: string; calories: number }[];
  tip: string;
} {
  const losing = targetWeight < weightKg;
  // BMR (Mifflin-St Jeor simplified for both genders)
  const bmr = Math.round(24 * weightKg);
  const baseTarget = bmr + avgBurnedDay;
  const targetCalories = losing ? Math.round(baseTarget - 400) : Math.round(baseTarget + 200);
  const proteinTarget = Math.round(1.6 * weightKg);
  const carbsTarget = Math.round((targetCalories * 0.45) / 4); // 45% from carbs
  const fatTarget = Math.round((targetCalories * 0.25) / 9); // 25% from fat

  // Sample meals from DB by category
  const proteins = FOOD_DB.filter((f) => f.protein >= 15 && f.fat < 15);
  const carbs = FOOD_DB.filter((f) => f.carbs >= 15 && f.fat < 5);
  const veggies = FOOD_DB.filter((f) => f.kcal < 40 && f.protein < 5);
  const fruits = FOOD_DB.filter((f) => f.kcal >= 40 && f.kcal <= 90 && f.fat < 1);

  function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

  const breakfastProtein = pick(proteins);
  const breakfastCarb = pick(carbs);
  const lunchProtein = pick(proteins);
  const lunchCarb = pick(carbs);
  const lunchVeggie = pick(veggies);
  const dinnerProtein = pick(proteins);
  const dinnerVeggie = pick(veggies);
  const snackFruit = pick(fruits);

  const meals = [
    {
      slot: "Sáng",
      suggestion: `${breakfastProtein.name} + ${breakfastCarb.name} + rau luộc`,
      calories: Math.round((breakfastProtein.kcal + breakfastCarb.kcal + 20) * 1.5),
    },
    {
      slot: "Trưa",
      suggestion: `${lunchProtein.name} + ${lunchCarb.name} + ${lunchVeggie.name}`,
      calories: Math.round((lunchProtein.kcal + lunchCarb.kcal + lunchVeggie.kcal) * 2),
    },
    {
      slot: "Tối",
      suggestion: `${dinnerProtein.name} + ${dinnerVeggie.name} + ít cơm`,
      calories: Math.round((dinnerProtein.kcal + dinnerVeggie.kcal + 130) * 1.5),
    },
    {
      slot: "Phụ",
      suggestion: `${snackFruit.name} + sữa chua`,
      calories: Math.round(snackFruit.kcal + 72),
    },
  ];

  const tips = [
    "Uống đủ 2L nước mỗi ngày và ngủ đủ 7-8 giờ.",
    "Ăn chậm, nhai kỹ để no nhanh và tiêu hoá tốt hơn.",
    "Tập chạy buổi sáng trước bữa sáng để đốt mỡ hiệu quả.",
    "Ưu tiên protein ở mỗi bữa để giữ cơ và no lâu.",
    "Hạn chế đồ ngọt và chiên rán, ưu tiên luộc/hấp.",
  ];
  const tip = tips[Math.floor(Math.random() * tips.length)];

  return { targetCalories, proteinTarget, carbsTarget, fatTarget, meals, tip };
}

/** Generate a monthly recap using template engine (no LLM). */
export function generateRecap(data: {
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
  achievementCount: number;
  photosCount: number;
}): {
  headline: string;
  narrative: string;
  highlights: string[];
} {
  const { profileName, monthLabel, totalKm, totalRuns, totalCalories, longestRunKm, bestStreak, weightChange, achievementCount, photosCount } = data;

  // Headline
  let headline: string;
  if (totalRuns === 0) {
    headline = `📊 Tháng ${monthLabel} — nghỉ ngơi cũng là luyện tập!`;
  } else if (totalKm >= 50) {
    headline = `🔥 Tháng ${monthLabel} bứt phá của ${profileName}!`;
  } else if (totalKm >= 20) {
    headline = `💪 Tháng ${monthLabel} vững vàng của ${profileName}!`;
  } else {
    headline = `🏃 Tháng ${monthLabel} mỗi bước đều tiến!`;
  }

  // Narrative
  let narrative: string;
  if (totalRuns === 0) {
    narrative = `Tháng ${monthLabel} chưa có buổi chạy nào, ${profileName} ạ. Không sao — tháng sau bắt đầu lại nhé! Mỗi bước đều đáng kể.`;
  } else {
    const parts: string[] = [];
    parts.push(`Tháng ${monthLabel}, ${profileName} đã chạy ${totalKm} km trong ${totalRuns} buổi`);
    if (totalCalories > 0) parts.push(`, đốt ${totalCalories} kcal`);
    if (bestStreak >= 3) parts.push(`, chuỗi dài nhất ${bestStreak} ngày liên tục`);
    parts.push(`. `);
    if (longestRunKm >= 10) parts.push(`Chạy dài nhất ${longestRunKm} km — ấn tượng! `);
    if (weightChange !== undefined && weightChange < 0) {
      parts.push(`Đã giảm ${Math.abs(weightChange)} kg so với đầu tháng. Tuyệt vời! `);
    } else if (weightChange !== undefined && weightChange > 0) {
      parts.push(`Cân nặng tăng ${weightChange} kg — có thể là cơ, tiếp tục theo dõi nhé. `);
    }
    parts.push(`Tiếp tục phát!`);
    narrative = parts.join("");
  }

  // Highlights
  const highlights: string[] = [];
  if (totalKm > 0) highlights.push(`🏃 Tổng ${totalKm} km, trung bình ${(totalKm / Math.max(1, totalRuns)).toFixed(1)} km/buổi`);
  if (bestStreak >= 2) highlights.push(`🎯 Chuỗi ${bestStreak} ngày liên tục — kiên trì!`);
  if (totalCalories > 0) highlights.push(`🔥 Đốt ${totalCalories} kcal — công sức không浪费!`);
  if (longestRunKm >= 5) highlights.push(`⛰️ Chạy dài nhất ${longestRunKm} km`);
  if (achievementCount > 0) highlights.push(`🏆 Mở khoá ${achievementCount} thành tích mới`);
  if (photosCount > 0) highlights.push(`📸 ${photosCount} ảnh kỉ niệm`);
  if (weightChange !== undefined && weightChange < 0) highlights.push(`📉 Giảm ${Math.abs(weightChange)} kg tháng này`);
  if (highlights.length === 0) highlights.push("🌱 Mỗi ngày một bước, mỗi tháng một hành trình");

  return { headline, narrative, highlights };
}
