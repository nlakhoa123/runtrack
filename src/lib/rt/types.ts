export type UnitSystem = "metric" | "imperial";

export type Feeling = "great" | "good" | "okay" | "tired" | "hard";

export interface Profile {
  id: string;
  name: string;
  /** avatar color key into AVATAR_COLORS */
  avatarColor: string;
  /** height in cm (canonical store) */
  height: number;
  /** latest weight in kg (denormalized, kept in sync) */
  currentWeight: number;
  /** target weight in kg */
  targetWeight: number;
  /** weekly km goal */
  targetKmPerWeek: number;
  createdAt: number;
}

export interface RunSession {
  id: string;
  profileId: string;
  /** ISO date YYYY-MM-DD (local day) */
  date: string;
  /** minutes */
  durationMin: number;
  /** kilometers */
  distanceKm: number;
  /** km/h, computed */
  avgSpeed: number;
  /** kcal, computed */
  calories: number;
  feeling: Feeling;
  note?: string;
  createdAt: number;
  /** optional GPS trace: array of {lat,lng,t} points captured during a live run */
  trace?: { lat: number; lng: number; t: number }[];
  /** run mode: outdoor (GPS) or treadmill (step counter) */
  mode?: "outdoor" | "treadmill";
}

export interface WeightEntry {
  id: string;
  profileId: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** kilograms */
  weightKg: number;
  note?: string;
  createdAt: number;
}

export interface AchievementRecord {
  id: string;
  profileId: string;
  type: string;
  unlockedAt: number;
}

/** A photo attached to a run (journey memory). `dataUrl` is a compressed base64 JPEG. */
export interface RunPhoto {
  id: string;
  runId: string;
  profileId: string;
  dataUrl: string;
  createdAt: number;
}

/** A progress/body photo (before-after comparison). Separate from run photos.
 *  Users take these periodically (e.g. every 2 weeks) from a fixed angle. */
export interface ProgressPhoto {
  id: string;
  profileId: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  dataUrl: string;
  weightKg?: number;
  note?: string;
  createdAt: number;
}

/** A meal entry logged via natural language (AI-parsed). */
export interface MealEntry {
  id: string;
  profileId: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** raw text the user typed */
  rawText: string;
  /** meal slot: breakfast/lunch/dinner/snack */
  slot: MealSlot;
  /** total kcal estimated */
  calories: number;
  /** macros in grams */
  protein: number;
  carbs: number;
  fat: number;
  /** parsed items the AI identified */
  items: { name: string; amount: string; calories: number; protein: number; carbs: number; fat: number }[];
  createdAt: number;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

/** A Locket-style story: a photo with caption, viewable full-screen with auto-advance. */
export interface Story {
  id: string;
  profileId: string;
  dataUrl: string;
  caption: string;
  /** optional run this story is linked to */
  runId?: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  createdAt: number;
}

export type ViewId =
  | "dashboard"
  | "runs"
  | "weight"
  | "nutrition"
  | "progress"
  | "journey"
  | "stories"
  | "locket"
  | "goals"
  | "achievements"
  | "settings";

export const FEELINGS: { id: Feeling; emoji: string; label: string; color: string }[] = [
  { id: "great", emoji: "🔥", label: "Tuyệt vời", color: "var(--brand-coral)" },
  { id: "good", emoji: "😊", label: "Khá tốt", color: "var(--brand-teal)" },
  { id: "okay", emoji: "🙂", label: "Bình thường", color: "var(--brand-cyan)" },
  { id: "tired", emoji: "😮‍💨", label: "Hơi mệt", color: "var(--brand-amber)" },
  { id: "hard", emoji: "🥵", label: "Vất vả", color: "var(--brand-rose)" },
];

export const AVATAR_COLORS: { id: string; from: string; to: string; label: string }[] = [
  { id: "mint", from: "var(--brand-mint)", to: "var(--brand-teal)", label: "Mint" },
  { id: "coral", from: "var(--brand-amber)", to: "var(--brand-coral)", label: "Coral" },
  { id: "rose", from: "var(--brand-coral)", to: "var(--brand-rose)", label: "Rose" },
  { id: "violet", from: "var(--brand-violet)", to: "oklch(0.6 0.18 250)", label: "Violet" },
  { id: "cyan", from: "var(--brand-cyan)", to: "oklch(0.58 0.16 230)", label: "Cyan" },
  { id: "emerald", from: "var(--brand-mint)", to: "oklch(0.55 0.13 155)", label: "Emerald" },
];

export function avatarGradient(id: string): string {
  const c = AVATAR_COLORS.find((x) => x.id === id) ?? AVATAR_COLORS[0];
  return `linear-gradient(135deg, ${c.from}, ${c.to})`;
}
