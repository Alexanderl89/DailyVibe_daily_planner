import { addDays, endOfWeek, format } from "date-fns";
import type { Task } from "./store";

// Decides which tasks a column collects. Rules may overlap: a task goes to the first matching column.
export type ColumnRule =
  | { kind: "overdue" }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "week" }
  | { kind: "range"; from: number; to: number | null }
  | { kind: "noDate" }
  | { kind: "rest" }
  | { kind: "manual" };
export type RuleKind = ColumnRule["kind"];
export type Column = { id: string; name: string; rule: ColumnRule };

export const RULE_LABELS: Record<RuleKind, string> = {
  overdue: "Försenade (före idag)",
  today: "Idag",
  tomorrow: "Imorgon",
  week: "Denna vecka (t.o.m. söndag)",
  range: "Dag X–Y från idag",
  noDate: "Utan datum",
  rest: "Senare (allt med datum som är kvar)",
  manual: "Manuell (dra uppgifter hit)",
};

/** Returns the built-in columns a new board starts with. */
export function defaultColumns(): Column[] {
  return [
    { id: "overdue", name: "Försenade", rule: { kind: "overdue" } },
    { id: "today", name: "Idag", rule: { kind: "today" } },
    { id: "tomorrow", name: "Imorgon", rule: { kind: "tomorrow" } },
    { id: "week", name: "Denna vecka", rule: { kind: "week" } },
    { id: "later", name: "Senare", rule: { kind: "rest" } },
    { id: "backlog", name: "Backlog", rule: { kind: "noDate" } },
  ];
}

const f = (d: Date) => format(d, "yyyy-MM-dd");

/** Tells whether a task's due date satisfies a date-based rule (manual rules never match here). */
export function matchesRule(rule: ColumnRule, due: string | null, now = new Date()): boolean {
  const today = f(now);
  switch (rule.kind) {
    case "overdue": return due !== null && due < today;
    case "today": return due === today;
    case "tomorrow": return due === f(addDays(now, 1));
    case "week": return due !== null && due >= today && due <= f(endOfWeek(now, { weekStartsOn: 1 }));
    case "range": return due !== null && due >= f(addDays(now, rule.from)) && (rule.to === null || due <= f(addDays(now, rule.to)));
    case "noDate": return due === null;
    case "rest": return due !== null;
    case "manual": return false;
  }
}

/** Returns the id of the column a task belongs in, or null when no column matches. */
export function columnFor(t: Pick<Task, "due" | "columnId">, columns: Column[], now = new Date()): string | null {
  const manual = columns.find(c => c.id === t.columnId && c.rule.kind === "manual");
  if (manual) return manual.id;
  return columns.find(c => matchesRule(c.rule, t.due, now))?.id ?? null;
}

/** Returns the due date a task gets when dropped on a column with this rule; undefined means "don't change it". */
export function dueForRule(rule: ColumnRule, now = new Date()): string | null | undefined {
  switch (rule.kind) {
    case "today": return f(now);
    case "tomorrow": return f(addDays(now, 1));
    case "week": return f(endOfWeek(now, { weekStartsOn: 1 }));
    case "range": return f(addDays(now, rule.from));
    case "rest": return f(addDays(endOfWeek(now, { weekStartsOn: 1 }), 1)); // next Monday
    case "noDate": return null;
    case "overdue": case "manual": return undefined;
  }
}

/**
 * Converts stored or imported columns to the current format; old custom columns ({ id, name })
 * become manual columns after the defaults. An empty list (the old format's default) also gives the defaults.
 */
export function migrateColumns(stored: unknown): Column[] {
  if (!Array.isArray(stored)) return defaultColumns();
  const items = stored.filter((c): c is { id: string; name: string; rule?: ColumnRule } =>
    typeof c === "object" && c !== null && typeof c.id === "string" && typeof c.name === "string");
  if (items.some(c => c.rule)) return splitLaterColumn(items.map(c => ({ id: c.id, name: c.name, rule: c.rule ?? { kind: "manual" } })));
  return [...defaultColumns(), ...items.map(c => ({ id: c.id, name: c.name, rule: { kind: "manual" } as const }))];
}

const OLD_LATER_NAME = "Senare / utan datum";

/** Splits the untouched old "Senare / utan datum" column into "Senare" plus a "Backlog" column right after it. */
function splitLaterColumn(columns: Column[]): Column[] {
  const i = columns.findIndex(c => c.name === OLD_LATER_NAME && c.rule.kind === "rest");
  if (i < 0) return columns;
  const renamed = columns.map((c, j) => (j === i ? { ...c, name: "Senare" } : c));
  if (columns.some(c => c.rule.kind === "noDate")) return renamed;
  const backlog: Column = { id: columns.some(c => c.id === "backlog") ? `backlog-${Date.now()}` : "backlog", name: "Backlog", rule: { kind: "noDate" } };
  return [...renamed.slice(0, i + 1), backlog, ...renamed.slice(i + 1)];
}
