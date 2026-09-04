import Dexie, { type Table } from "dexie";
import type {
  Profile,
  RunSession,
  WeightEntry,
  AchievementRecord,
  RunPhoto,
  ProgressPhoto,
  MealEntry,
  Story,
} from "./types";

export class RunTrackDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  runs!: Table<RunSession, string>;
  weights!: Table<WeightEntry, string>;
  achievements!: Table<AchievementRecord, string>;
  photos!: Table<RunPhoto, string>;
  progressPhotos!: Table<ProgressPhoto, string>;
  meals!: Table<MealEntry, string>;
  stories!: Table<Story, string>;

  constructor() {
    super("runtrack-db");
    this.version(1).stores({
      profiles: "id, name, createdAt",
      runs: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      weights: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      achievements: "id, profileId, type, unlockedAt, [profileId+type]",
    });
    // v2: add photos table for journey memories.
    this.version(2).stores({
      profiles: "id, name, createdAt",
      runs: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      weights: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      achievements: "id, profileId, type, unlockedAt, [profileId+type]",
      photos: "id, runId, profileId, createdAt, [profileId+createdAt], [runId+createdAt]",
    });
    // v3: add progressPhotos table for before/after body comparison.
    this.version(3).stores({
      profiles: "id, name, createdAt",
      runs: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      weights: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      achievements: "id, profileId, type, unlockedAt, [profileId+type]",
      photos: "id, runId, profileId, createdAt, [profileId+createdAt], [runId+createdAt]",
      progressPhotos: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
    });
    // v4: add meals table for AI food logging.
    this.version(4).stores({
      profiles: "id, name, createdAt",
      runs: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      weights: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      achievements: "id, profileId, type, unlockedAt, [profileId+type]",
      photos: "id, runId, profileId, createdAt, [profileId+createdAt], [runId+createdAt]",
      progressPhotos: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      meals: "id, profileId, date, slot, createdAt, [profileId+date], [profileId+createdAt]",
    });
    // v5: add stories table for Locket-style stories.
    this.version(5).stores({
      profiles: "id, name, createdAt",
      runs: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      weights: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      achievements: "id, profileId, type, unlockedAt, [profileId+type]",
      photos: "id, runId, profileId, createdAt, [profileId+createdAt], [runId+createdAt]",
      progressPhotos: "id, profileId, date, createdAt, [profileId+date], [profileId+createdAt]",
      meals: "id, profileId, date, slot, createdAt, [profileId+date], [profileId+createdAt]",
      stories: "id, profileId, date, createdAt, [profileId+createdAt]",
    });
  }
}

export const db = new RunTrackDatabase();

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Resize + compress an image File to a base64 JPEG data URL.
 *  Keeps storage small (max ~1280px on the long edge, quality 0.8). */
export function fileToCompressedDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File không phải ảnh"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas không khả dụng"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Không tải được ảnh"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsDataURL(file);
  });
}
