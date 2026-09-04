import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subDays,
  subWeeks,
  differenceInCalendarDays,
  isSameDay,
  addDays,
} from "date-fns";

/** Today's local date as YYYY-MM-DD */
export function todayKey(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export function keyToDate(key: string): Date {
  return parseISO(key);
}

export function fmtDate(key: string, pattern = "d MMM"): string {
  try {
    return format(parseISO(key), pattern);
  } catch {
    return key;
  }
}

export function fmtDateTime(ts: number, pattern = "d MMM, HH:mm"): string {
  return format(new Date(ts), pattern);
}

/** Array of YYYY-MM-DD keys for the current week (Mon-Sun). */
export function currentWeekKeys(d: Date = new Date()): string[] {
  const start = startOfWeek(d, { weekStartsOn: 1 });
  const end = endOfWeek(d, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map((x) => format(x, "yyyy-MM-dd"));
}

export function weekKeysForOffset(offset: number, d: Date = new Date()): string[] {
  const ref = subWeeks(d, offset);
  const start = startOfWeek(ref, { weekStartsOn: 1 });
  const end = endOfWeek(ref, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map((x) => format(x, "yyyy-MM-dd"));
}

export function lastNDays(n: number, d: Date = new Date()): string[] {
  const start = subDays(d, n - 1);
  return eachDayOfInterval({ start, end: d }).map((x) => format(x, "yyyy-MM-dd"));
}

export function monthMatrix(d: Date = new Date()): { key: string; date: Date; inMonth: boolean }[] {
  const start = startOfWeek(startOfMonth(d), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(d), { weekStartsOn: 1 });
  const month = d.getMonth();
  return eachDayOfInterval({ start, end }).map((date) => ({
    key: format(date, "yyyy-MM-dd"),
    date,
    inMonth: date.getMonth() === month,
  }));
}

export { startOfWeek, endOfWeek, subDays, subWeeks, differenceInCalendarDays, isSameDay, addDays, format, parseISO };

/** Current streak: consecutive days up to today with at least one run. */
export function computeStreak(runDates: string[], today: Date = new Date()): number {
  const set = new Set(runDates);
  let streak = 0;
  let cursor = today;
  // allow today to be skipped if no run yet but yesterday counts (don't break)
  if (!set.has(todayKey(cursor))) {
    cursor = subDays(cursor, 1);
  }
  while (set.has(todayKey(cursor))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}
