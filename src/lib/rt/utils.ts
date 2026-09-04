import type { UnitSystem } from "./types";

/** KG <-> LBS */
export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 1 / KG_PER_LB;
/** KM <-> MILES */
export const KM_PER_MI = 1.609344;
export const MI_PER_KM = 1 / KM_PER_MI;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}
export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}
export function kmToMi(km: number): number {
  return km * MI_PER_KM;
}
export function miToKm(mi: number): number {
  return mi * KM_PER_MI;
}
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft, inch };
}
export function ftInToCm(ft: number, inch: number): number {
  return (ft * 12 + inch) * 2.54;
}

export function weightLabel(system: UnitSystem): string {
  return system === "metric" ? "kg" : "lbs";
}
export function distanceLabel(system: UnitSystem): string {
  return system === "metric" ? "km" : "mi";
}

/** Display a weight value converted to the active unit, with optional precision. */
export function displayWeight(kg: number, system: UnitSystem, digits = 1): number {
  return system === "metric" ? round(kg, digits) : round(kgToLb(kg), digits);
}
export function displayDistance(km: number, system: UnitSystem, digits = 2): number {
  return system === "metric" ? round(km, digits) : round(kmToMi(km), digits);
}

export function parseWeightInput(value: number, system: UnitSystem): number {
  // returns canonical kg
  return system === "metric" ? value : lbToKg(value);
}
export function parseDistanceInput(value: number, system: UnitSystem): number {
  return system === "metric" ? value : miToKm(value);
}

export function round(n: number, digits = 0): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Format a number with thousands separators. */
export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Calculate calories for a run.
 * MET-based: calories = MET * weight(kg) * duration(h)
 * Running MET approx by speed: ~ 8 + (speed_kmh - 8) * 0.4, clamped 6..16
 */
export function calcCalories(distanceKm: number, durationMin: number, weightKg: number): number {
  if (durationMin <= 0 || weightKg <= 0) return 0;
  const speed = distanceKm / (durationMin / 60);
  const met = clamp(8 + (speed - 8) * 0.45, 6, 16);
  const cals = met * weightKg * (durationMin / 60);
  return Math.max(0, Math.round(cals));
}

export function calcAvgSpeed(distanceKm: number, durationMin: number): number {
  if (durationMin <= 0) return 0;
  return round(distanceKm / (durationMin / 60), 2);
}

/** Pace min/km from km + minutes */
export function calcPace(distanceKm: number, durationMin: number): string {
  if (distanceKm <= 0) return "--:--";
  const pace = durationMin / distanceKm;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format duration 75 -> "1h 15m" or "45m" */
export function fmtDuration(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}
