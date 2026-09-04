import { db } from "./db";
import type { Profile, RunSession, WeightEntry, AchievementRecord, RunPhoto, ProgressPhoto, MealEntry, Story } from "./types";

export interface ExportBundle {
  app: "runtrack";
  version: number;
  exportedAt: number;
  profiles: Profile[];
  runs: RunSession[];
  weights: WeightEntry[];
  achievements: AchievementRecord[];
  photos?: RunPhoto[];
  progressPhotos?: ProgressPhoto[];
  meals?: MealEntry[];
  stories?: Story[];
}

export async function exportAll(): Promise<ExportBundle> {
  const [profiles, runs, weights, achievements, photos, progressPhotos, meals, stories] = await Promise.all([
    db.profiles.toArray(),
    db.runs.toArray(),
    db.weights.toArray(),
    db.achievements.toArray(),
    db.photos.toArray(),
    db.progressPhotos.toArray(),
    db.meals.toArray(),
    db.stories.toArray(),
  ]);
  return {
    app: "runtrack",
    version: 1,
    exportedAt: Date.now(),
    profiles,
    runs,
    weights,
    achievements,
    photos,
    progressPhotos,
    meals,
    stories,
  };
}

export async function importBundle(bundle: ExportBundle, mode: "merge" | "replace" = "merge") {
  if (!bundle || bundle.app !== "runtrack") {
    throw new Error("File không hợp lệ (thiếu nhãn runtrack).");
  }
  await db.transaction("rw", [db.profiles, db.runs, db.weights, db.achievements, db.photos, db.progressPhotos, db.meals, db.stories], async () => {
    if (mode === "replace") {
      await Promise.all([
        db.profiles.clear(),
        db.runs.clear(),
        db.weights.clear(),
        db.achievements.clear(),
        db.photos.clear(),
        db.progressPhotos.clear(),
        db.meals.clear(),
        db.stories.clear(),
      ]);
    }
    if (bundle.profiles?.length) await db.profiles.bulkPut(bundle.profiles);
    if (bundle.runs?.length) await db.runs.bulkPut(bundle.runs);
    if (bundle.weights?.length) await db.weights.bulkPut(bundle.weights);
    if (bundle.achievements?.length) await db.achievements.bulkPut(bundle.achievements);
    if (bundle.photos?.length) await db.photos.bulkPut(bundle.photos);
    if (bundle.progressPhotos?.length) await db.progressPhotos.bulkPut(bundle.progressPhotos);
    if (bundle.meals?.length) await db.meals.bulkPut(bundle.meals);
    if (bundle.stories?.length) await db.stories.bulkPut(bundle.stories);
  });
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Estimate the byte size of each table's data by serializing to JSON.
 *  This is an approximation (actual IndexedDB overhead is higher) but good
 *  enough for a storage breakdown display. */
export async function estimateStorage(): Promise<{
  profiles: number;
  runs: number;
  weights: number;
  achievements: number;
  photos: number;
  progressPhotos: number;
  total: number;
}> {
  const [profiles, runs, weights, achievements, photos, progressPhotos] = await Promise.all([
    db.profiles.toArray(),
    db.runs.toArray(),
    db.weights.toArray(),
    db.achievements.toArray(),
    db.photos.toArray(),
    db.progressPhotos.toArray(),
  ]);
  const size = (arr: unknown[]) => new Blob([JSON.stringify(arr)]).size;
  const p = size(profiles);
  const r = size(runs);
  const w = size(weights);
  const a = size(achievements);
  const ph = size(photos);
  const pp = size(progressPhotos);
  return { profiles: p, runs: r, weights: w, achievements: a, photos: ph, progressPhotos: pp, total: p + r + w + a + ph + pp };
}

/** Escape a CSV cell value (RFC 4180 — quote if it contains comma, quote, newline). */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/** Build a CSV string of all runs across all profiles (with profile name joined in). */
export async function exportRunsCsv(): Promise<string> {
  const [profiles, runs] = await Promise.all([db.profiles.toArray(), db.runs.toArray()]);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));
  const header = ["profile", "date", "distanceKm", "durationMin", "avgSpeed", "calories", "feeling", "note"];
  const rows = runs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((r) => [nameById.get(r.profileId) ?? r.profileId, r.date, r.distanceKm, r.durationMin, r.avgSpeed, r.calories, r.feeling, r.note ?? ""]);
  return [csvRow(header), ...rows.map(csvRow)].join("\n");
}

/** Build a CSV string of all weight entries across all profiles. */
export async function exportWeightsCsv(): Promise<string> {
  const [profiles, weights] = await Promise.all([db.profiles.toArray(), db.weights.toArray()]);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));
  const header = ["profile", "date", "weightKg", "note"];
  const rows = weights
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((w) => [nameById.get(w.profileId) ?? w.profileId, w.date, w.weightKg, w.note ?? ""]);
  return [csvRow(header), ...rows.map(csvRow)].join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  // Prepend BOM so Excel reads UTF-8 correctly (Vietnamese diacritics).
  const blob = new Blob(["\uFEFF" + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
