import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell, fmtMin } from "@/components/Shell";
import { useApp, type FocusTask } from "@/lib/store";
import { weekTotals } from "@/lib/focus";

export const Route = createFileRoute("/fokus")({
  head: () => ({ meta: [
    { title: "Fokus – DailyVibe" }, { name: "description", content: "Arbeta i tidsblock med timer kopplad till dina fokusuppgifter." },
    { property: "og:title", content: "Fokus – DailyVibe" }, { property: "og:description", content: "Starta en timer och arbeta i fokuserade block." },
  ] }),
  component: Focus,
});

const field = "h-10 rounded-lg border bg-background px-3 text-sm";

/** Focus page: timer, the focus task list to pick from, and the time panel. */
function Focus() {
  const { focusTasks, running, startTimer, stopTimer } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(40);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const left = running ? running.start + running.minutes * 60000 - now : 0;
  useEffect(() => { if (running && left <= 0) { stopTimer(); try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play(); } catch {} if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Blocket är klart!"); } }, [left, running, stopTimer]);
  const mm = Math.max(0, Math.floor(left / 60000)), ss = Math.max(0, Math.floor(left / 1000) % 60);
  const pct = running ? 1 - left / (running.minutes * 60000) : 0;
  const task = focusTasks.find(f => f.id === selected && !f.done);

  const start = () => {
    if (!task) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    startTimer({ taskId: task.id, label: task.title, projectId: task.projectId, start: Date.now(), minutes });
  };

  return (
    <Shell>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="card-soft p-10 flex flex-col items-center">
          <div className="relative size-72 mb-8">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle cx="50" cy="50" r="45" className="fill-none stroke-muted" strokeWidth="4" />
              <circle cx="50" cy="50" r="45" className="fill-none stroke-primary transition-all" strokeWidth="4" strokeLinecap="round" strokeDasharray={283} strokeDashoffset={283 * (1 - pct)} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-6xl tabular-nums">{running ? `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${minutes}:00`}</span>
              <span className="text-sm text-muted-foreground mt-2 max-w-48 text-center truncate">{running ? running.label : task?.title ?? "Välj en uppgift"}</span>
            </div>
          </div>
          {running ? (
            <button onClick={stopTimer} className="h-12 px-8 rounded-full bg-destructive text-destructive-foreground font-medium">Avsluta & spara</button>
          ) : (
            <div className="w-full max-w-md space-y-4">
              <FocusTaskList selected={task?.id ?? null} onSelect={setSelected} />
              <div className="flex gap-2">{[25, 40, 50, 90].map(m => <button key={m} onClick={() => setMinutes(m)} className={`chip flex-1 justify-center ${minutes === m ? "chip-active" : ""}`}>{m} min</button>)}
                <input type="number" min={1} value={minutes} onChange={e => setMinutes(Math.max(1, +e.target.value))} className="chip w-20 bg-transparent" /></div>
              <button onClick={start} disabled={!task} className="h-12 w-full rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50">
                {task ? `Starta ${minutes} min` : "Välj en uppgift för att starta"}</button>
            </div>
          )}
        </div>
        <TimePanel />
      </div>
    </Shell>
  );
}

/** The focus tasks: add, select, rename, check off and remove. */
function FocusTaskList({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const { focusTasks, projects, addFocusTask, toggleFocusTask, removeFocusTask } = useApp();
  const [title, setTitle] = useState(""); const [projectId, setProjectId] = useState("");
  const [showDone, setShowDone] = useState(false);
  const open = focusTasks.filter(f => !f.done), done = focusTasks.filter(f => f.done);
  return (
    <div className="space-y-2">
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (!title.trim()) return; onSelect(addFocusTask(title.trim(), projectId || null)); setTitle(""); }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="+ Ny fokusuppgift" className={`${field} flex-1 min-w-0`} />
        <select value={projectId} onChange={e => setProjectId(e.target.value)} className={`${field} max-w-36`} aria-label="Projekt">
          <option value="">Utan projekt</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </form>
      <ul className="space-y-1.5">
        {open.length === 0 && <li className="text-sm text-muted-foreground px-1">Lägg till en uppgift att fokusera på.</li>}
        {open.map(f => <FocusTaskRow key={f.id} task={f} active={f.id === selected} onSelect={() => onSelect(f.id)} />)}
      </ul>
      {done.length > 0 && (
        <div>
          <button onClick={() => setShowDone(!showDone)} className="text-xs text-muted-foreground px-1">{showDone ? "Dölj" : "Visa"} klara ({done.length})</button>
          {showDone && <ul className="mt-1 space-y-1">{done.map(f => (
            <li key={f.id} className="flex items-center gap-2 px-1 text-sm text-muted-foreground group">
              <button onClick={() => toggleFocusTask(f.id)} className="line-through flex-1 text-left" title="Markera som ej klar">{f.title}</button>
              <button onClick={() => removeFocusTask(f.id)} className="opacity-0 group-hover:opacity-60" aria-label="Ta bort">×</button>
            </li>
          ))}</ul>}
        </div>
      )}
    </div>
  );
}

/** One open focus task: select on click, rename on ✎ or double-click, check off or remove. */
function FocusTaskRow({ task: f, active, onSelect }: { task: FocusTask; active: boolean; onSelect: () => void }) {
  const { projects, renameFocusTask, toggleFocusTask, removeFocusTask } = useApp();
  const [editing, setEditing] = useState(false); const [text, setText] = useState(f.title);
  const color = projects.find(p => p.id === f.projectId)?.color;
  const cancelled = useRef(false); // Esc was pressed, so the blur that follows must not save
  const save = () => {
    if (!cancelled.current && text.trim()) renameFocusTask(f.id, text.trim()); else setText(f.title);
    cancelled.current = false; setEditing(false);
  };
  return (
    <li className={`flex items-center gap-2 rounded-lg border px-3 h-11 text-sm group ${active ? "border-primary bg-primary/10" : "bg-background"}`}>
      <button onClick={() => toggleFocusTask(f.id)} className="size-4 shrink-0 rounded-full border-2 border-primary hover:bg-primary/30" aria-label="Klar" />
      {color && <i className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />}
      {editing ? (
        <input value={text} onChange={e => setText(e.target.value)} autoFocus onBlur={save} aria-label="Nytt namn"
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { cancelled.current = true; e.currentTarget.blur(); } }}
          className="flex-1 min-w-0 bg-transparent outline-none border-b border-primary" />
      ) : (
        <button onClick={onSelect} onDoubleClick={() => setEditing(true)} className={`flex-1 min-w-0 truncate text-left ${active ? "font-semibold" : ""}`}>{f.title}</button>
      )}
      {!editing && <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-60" aria-label={`Byt namn på ${f.title}`}>✎</button>}
      <button onClick={() => removeFocusTask(f.id)} className="opacity-0 group-hover:opacity-60" aria-label={`Ta bort ${f.title}`}>×</button>
    </li>
  );
}

/** Side panel with today's focus blocks or this week's time per task. */
function TimePanel() {
  const { sessions, projects, removeSession } = useApp();
  const [tab, setTab] = useState<"today" | "week">("today");
  const today = new Date().toDateString();
  const todays = sessions.filter(s => new Date(s.start).toDateString() === today).reverse();
  const week = weekTotals(sessions);
  const total = tab === "today" ? todays.reduce((a, s) => a + s.end - s.start, 0) : week.reduce((a, w) => a + w.ms, 0);
  const projectOf = (id: string | null) => projects.find(p => p.id === id);
  return (
    <aside>
      <div className="flex gap-1 mb-3">
        {(["today", "week"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`chip ${tab === t ? "chip-active" : ""}`}>{t === "today" ? "Idag" : "Denna vecka"}</button>)}
      </div>
      <h2 className="font-display text-xl mb-3">{tab === "today" ? "Idag" : "Denna vecka"} · {fmtMin(total)}</h2>
      {tab === "today" ? (
        <ul className="space-y-2">
          {todays.length === 0 && <li className="text-sm text-muted-foreground">Inga block ännu idag.</li>}
          {todays.map(s => (
            <li key={s.id} className="card-soft p-3 text-sm flex justify-between group">
              <span><span className="block">{s.label}</span><span className="text-xs text-muted-foreground">{new Date(s.start).toLocaleTimeString("sv", { hour: "2-digit", minute: "2-digit" })} · {projectOf(s.projectId)?.name ?? "Utan projekt"}</span></span>
              <span className="flex gap-2 items-start">{fmtMin(s.end - s.start)}<button onClick={() => removeSession(s.id)} className="opacity-0 group-hover:opacity-50">×</button></span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {week.length === 0 && <li className="text-sm text-muted-foreground">Inga block ännu den här veckan.</li>}
          {week.map(w => (
            <li key={w.label} className="card-soft p-3 text-sm flex justify-between items-center gap-2">
              <span className="flex items-center gap-2 min-w-0">{projectOf(w.projectId) && <i className="size-2.5 shrink-0 rounded-full" style={{ background: projectOf(w.projectId)!.color }} />}<span className="truncate">{w.label}</span></span>
              <span className="shrink-0">{fmtMin(w.ms)}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
