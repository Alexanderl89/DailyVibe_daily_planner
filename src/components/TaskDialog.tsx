import { useEffect, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { useApp, type Recurrence, type Task } from "@/lib/store";

export const REC: Record<Recurrence, string> = { none: "Ingen upprepning", daily: "Varje dag", weekly: "Varje vecka", monthly: "Varje månad" };

type When = "backlog" | "today" | "tomorrow" | "date";
const WHEN_LABELS: Record<When, string> = { backlog: "Backlog", today: "Idag", tomorrow: "Imorgon", date: "Välj datum" };
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/** Maps a due date to the "När" choice shown in the dialog. */
function whenOf(due: string | null): When {
  if (due === null) return "backlog";
  if (due === ymd(new Date())) return "today";
  if (due === ymd(addDays(new Date(), 1))) return "tomorrow";
  return "date";
}

const label = "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2";
const pill = (active: boolean) => `chip gap-2 ${active ? "border-primary bg-primary/10 font-semibold" : ""}`;
const field = "w-full rounded-lg border bg-background px-3 text-sm";

/** Modal for editing one task's title, project, date, repetition and notes, or deleting it. */
export function TaskDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { projects, updateTask, removeTask } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState(task.projectId);
  const [when, setWhen] = useState<When>(whenOf(task.due));
  const [date, setDate] = useState(task.due ?? ymd(new Date()));
  const [rec, setRec] = useState<Recurrence>(task.recurrence);
  const [notes, setNotes] = useState(task.notes ?? "");
  useEffect(() => { ref.current?.showModal(); }, []);

  const due = when === "backlog" ? null : when === "today" ? ymd(new Date()) : when === "tomorrow" ? ymd(addDays(new Date(), 1)) : date || null;
  const save = () => {
    if (!title.trim()) return;
    updateTask(task.id, { title: title.trim(), projectId, due, recurrence: rec, notes: notes.trim() });
    onClose();
  };

  return (
    <dialog ref={ref} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-card text-foreground p-6 shadow-xl backdrop:bg-black/40">
      <form method="dialog" onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <h2 className="text-lg font-semibold">Redigera uppgift</h2>
        <div><label className={label} htmlFor="task-title">Uppgift</label>
          <input id="task-title" value={title} onChange={e => setTitle(e.target.value)} className={`${field} h-10`} autoFocus /></div>
        <div><span className={label}>Kategori</span>
          <div className="flex flex-wrap gap-2">{projects.map(p => (
            <button key={p.id} type="button" onClick={() => setProjectId(p.id)} className={pill(projectId === p.id)}>
              <i className="size-2.5 rounded-full" style={{ background: p.color }} />{p.name}</button>
          ))}</div></div>
        <div><span className={label}>När</span>
          <div className="flex flex-wrap gap-2">{(Object.keys(WHEN_LABELS) as When[]).map(w => (
            <button key={w} type="button" onClick={() => setWhen(w)} className={pill(when === w)}>{WHEN_LABELS[w]}</button>
          ))}</div>
          {when === "date" && <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${field} h-10 mt-2 w-auto`} />}</div>
        <div><label className={label} htmlFor="task-rec">Upprepning</label>
          <select id="task-rec" value={rec} onChange={e => setRec(e.target.value as Recurrence)} className={`${field} h-10 w-auto`}>
            {Object.entries(REC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className={label} htmlFor="task-notes">Anteckningar</label>
          <textarea id="task-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Valfritt" rows={3} className={`${field} py-2`} /></div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => { if (confirm(`Ta bort "${task.title}"?`)) { removeTask(task.id); onClose(); } }}
            className="h-10 px-4 rounded-lg border text-sm text-destructive">Ta bort</button>
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border text-sm">Avbryt</button>
          <button type="submit" disabled={!title.trim()} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Spara</button>
        </div>
      </form>
    </dialog>
  );
}
