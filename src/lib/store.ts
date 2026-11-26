import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";
import { defaultColumns, migrateColumns, type Column, type ColumnRule } from "./columns";

export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export type Project = { id: string; name: string; color: string };
export type Task = { id: string; title: string; projectId: string; due: string | null; recurrence: Recurrence; done: boolean; columnId?: string; notes?: string };
export type Note = { id: string; title: string; body: string; projectId: string | null; updated: number };
// A task on the Fokus page; separate from the board's tasks.
export type FocusTask = { id: string; title: string; projectId: string | null; done: boolean };
export type Session = { id: string; taskId: string | null; label: string; projectId: string | null; start: number; end: number };
export type Running = { taskId: string | null; label: string; projectId: string | null; start: number; minutes: number } | null;

const uid = () => Math.random().toString(36).slice(2, 10);
export const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export function nextDue(due: string | null, r: Recurrence): string | null {
  const base = due ? parseISO(due) : new Date();
  if (r === "daily") return ymd(addDays(base, 1));
  if (r === "weekly") return ymd(addWeeks(base, 1));
  if (r === "monthly") return ymd(addMonths(base, 1));
  return due;
}

export type AppData = { projects: Project[]; tasks: Task[]; sessions: Session[]; columns: Column[]; notes: Note[]; focusTasks: FocusTask[] };
const defaults = (): AppData => ({
  projects: [
    { id: "phd", name: "Doktorandarbete", color: "var(--chart-2)" },
    { id: "privat", name: "Privat", color: "var(--chart-1)" },
  ], tasks: [], sessions: [], columns: defaultColumns(), notes: [], focusTasks: [],
});

type State = AppData & { running: Running;
  addColumn: (name: string, rule?: ColumnRule) => void; updateColumn: (id: string, patch: Partial<Omit<Column, "id">>) => void;
  removeColumn: (id: string) => void; moveColumn: (id: string, toIndex: number) => void; placeInColumn: (taskId: string, columnId: string) => void;
  addNote: (projectId: string | null) => string; updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body" | "projectId">>) => void; removeNote: (id: string) => void;
  exportData: () => AppData; importData: (d: AppData) => void; reset: () => void;
  addProject: (name: string, color: string) => void;
  setProjectColor: (id: string, color: string) => void;
  removeProject: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "done">) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Pick<Task, "title" | "projectId" | "due" | "recurrence" | "notes">>) => void;
  moveTask: (id: string, due: string | null) => void;
  startTimer: (r: NonNullable<Running>) => void;
  stopTimer: () => void;
  removeSession: (id: string) => void;
  addFocusTask: (title: string, projectId: string | null) => string;
  renameFocusTask: (id: string, title: string) => void;
  toggleFocusTask: (id: string) => void;
  removeFocusTask: (id: string) => void;
};

export const useApp = create<State>()(persist((set, get) => ({
  ...defaults(), running: null,
  addColumn: (name, rule = { kind: "manual" }) => set(s => ({ columns: [...s.columns, { id: uid(), name, rule }] })),
  // Renames a column or changes its rule.
  updateColumn: (id, patch) => set(s => ({ columns: s.columns.map(c => c.id === id ? { ...c, ...patch } : c) })),
  removeColumn: id => set(s => ({ columns: s.columns.filter(c => c.id !== id), tasks: s.tasks.map(t => { if (t.columnId !== id) return t; const { columnId: _c, ...rest } = t; return rest; }) })),
  // Moves a column to a new position in the board order.
  moveColumn: (id, toIndex) => set(s => {
    const col = s.columns.find(c => c.id === id); if (!col) return {};
    const rest = s.columns.filter(c => c.id !== id);
    return { columns: [...rest.slice(0, toIndex), col, ...rest.slice(toIndex)] };
  }),
  placeInColumn: (taskId, columnId) => set(s => ({ tasks: s.tasks.map(t => t.id === taskId ? { ...t, columnId } : t) })),
  addNote: projectId => { const id = uid(); set(s => ({ notes: [{ id, title: "", body: "", projectId, updated: Date.now() }, ...s.notes] })); return id; },
  updateNote: (id, patch) => set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, ...patch, updated: Date.now() } : n) })),
  removeNote: id => set(s => ({ notes: s.notes.filter(n => n.id !== id) })),
  exportData: () => { const { projects, tasks, sessions, columns, notes, focusTasks } = get(); return { projects, tasks, sessions, columns, notes, focusTasks }; },
  importData: d => set({ ...defaults(), ...d, columns: migrateColumns(d.columns), running: null }),
  reset: () => set({ ...defaults(), running: null }),
  addProject: (name, color) => set(s => ({ projects: [...s.projects, { id: uid(), name, color }] })),
  // Changes the color of one existing project.
  setProjectColor: (id, color) => set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, color } : p) })),
  removeProject: id => set(s => ({ projects: s.projects.filter(p => p.id !== id), tasks: s.tasks.filter(t => t.projectId !== id) })),
  addTask: t => set(s => ({ tasks: [...s.tasks, { ...t, id: uid(), done: false }] })),
  toggleTask: id => set(s => ({ tasks: s.tasks.map(t => {
    if (t.id !== id) return t;
    if (!t.done && t.recurrence !== "none") return { ...t, due: nextDue(t.due, t.recurrence) };
    return { ...t, done: !t.done };
  }) })),
  removeTask: id => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
  // Edits a task; a new date also takes it out of any manual column so it lands where the date says.
  updateTask: (id, patch) => set(s => ({ tasks: s.tasks.map(t => {
    if (t.id !== id) return t;
    if (patch.due === undefined || patch.due === t.due) return { ...t, ...patch };
    const { columnId: _c, ...rest } = t; return { ...rest, ...patch };
  }) })),
  moveTask: (id, due) => set(s => ({ tasks: s.tasks.map(t => { if (t.id !== id) return t; const { columnId: _c, ...rest } = t; return { ...rest, due }; }) })),
  startTimer: r => set({ running: r }),
  stopTimer: () => {
    const r = get().running; if (!r) return;
    const end = Math.min(Date.now(), r.start + r.minutes * 60000);
    set(s => ({ running: null, sessions: end - r.start > 30000
      ? [...s.sessions, { id: uid(), taskId: r.taskId, label: r.label, projectId: r.projectId, start: r.start, end }] : s.sessions }));
  },
  removeSession: id => set(s => ({ sessions: s.sessions.filter(x => x.id !== id) })),
  addFocusTask: (title, projectId) => { const id = uid(); set(s => ({ focusTasks: [...s.focusTasks, { id, title, projectId, done: false }] })); return id; },
  // Renames a focus task, and its saved and running focus blocks so their time stays under the new name.
  renameFocusTask: (id, title) => set(s => ({
    focusTasks: s.focusTasks.map(f => f.id === id ? { ...f, title } : f),
    sessions: s.sessions.map(x => x.taskId === id ? { ...x, label: title } : x),
    running: s.running?.taskId === id ? { ...s.running, label: title } : s.running,
  })),
  toggleFocusTask: id => set(s => ({ focusTasks: s.focusTasks.map(f => f.id === id ? { ...f, done: !f.done } : f) })),
  // Removes a focus task; its saved focus blocks are kept for the statistics.
  removeFocusTask: id => set(s => ({ focusTasks: s.focusTasks.filter(f => f.id !== id) })),
}), {
  name: "planering-v1", skipHydration: true, version: 3,
  // v2 made the built-in columns editable; v3 split "Senare / utan datum" into Senare + Backlog.
  migrate: (stored, version) => {
    const s = stored as Partial<AppData>;
    return (version < 3 ? { ...s, columns: migrateColumns(s.columns) } : s) as State;
  },
}));
