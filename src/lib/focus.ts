import { startOfWeek } from "date-fns";
import type { Session } from "./store";

export type WeekTotal = { label: string; projectId: string | null; ms: number };

/** Sums this week's (Monday–Sunday) focus time per task name, most time first. */
export function weekTotals(sessions: Session[], now = new Date()): WeekTotal[] {
  const from = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  const totals = new Map<string, WeekTotal>();
  for (const s of sessions) {
    if (s.start < from || s.start > now.getTime()) continue;
    const t = totals.get(s.label) ?? { label: s.label, projectId: s.projectId, ms: 0 };
    totals.set(s.label, { ...t, projectId: s.projectId ?? t.projectId, ms: t.ms + s.end - s.start });
  }
  return [...totals.values()].sort((a, b) => b.ms - a.ms);
}
