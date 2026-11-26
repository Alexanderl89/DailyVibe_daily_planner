import type { AppData } from "./store";

export const LATEST = "latest.json";
export const KEEP_DAILY = 30;
const DAILY = /^backup-\d{4}-\d{2}-\d{2}\.json$/;

/** Checks that a value has the shape of the app's exported data. */
export function isAppData(v: unknown): v is AppData {
  if (typeof v !== "object" || v === null) return false;
  const d = v as Record<string, unknown>;
  return ["projects", "tasks", "sessions", "columns", "notes"].every(k => Array.isArray(d[k]));
}

/** Tells whether the data holds nothing worth backing up (no tasks, notes, focus tasks or focus sessions). */
export function isEmptyData(d: AppData): boolean {
  return d.tasks.length === 0 && d.notes.length === 0 && d.sessions.length === 0 && (d.focusTasks ?? []).length === 0;
}

/** Tells whether a file name is one of our backup files, so only those can be read. */
export function isBackupName(name: string): boolean {
  return name === LATEST || DAILY.test(name);
}

/** Returns the daily backup file name for a date, e.g. backup-2026-11-26.json. */
export function dailyName(d: Date): string {
  return `backup-${d.toISOString().slice(0, 10)}.json`;
}

/** Returns the daily backup files to delete so only the newest KEEP_DAILY remain. */
export function filesToPrune(names: string[]): string[] {
  return names.filter(n => DAILY.test(n)).sort().reverse().slice(KEEP_DAILY);
}
