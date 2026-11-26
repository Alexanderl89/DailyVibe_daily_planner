import { createFileRoute } from "@tanstack/react-router";
import { useState, type DragEvent } from "react";
import { Shell } from "@/components/Shell";
import { useApp, type Recurrence } from "@/lib/store";
import { columnFor, dueForRule, type Column } from "@/lib/columns";
import { nextFreeColor } from "@/lib/colors";
import { ColorSwatches } from "@/components/ColorSwatches";
import { REC, TaskDialog } from "@/components/TaskDialog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Planering – DailyVibe" }, { name: "description", content: "Planera uppgifter per projekt med återkommande uppgifter och automatiska kolumner." },
    { property: "og:title", content: "Planering – DailyVibe" }, { property: "og:description", content: "Uppgifter per projekt, idag, imorgon, denna vecka och försenade." },
  ] }),
  component: Board,
});
// Shown only when some tasks match no column, so they never disappear from the board.
const OTHER: Column = { id: "__other", name: "Övrigt", rule: { kind: "manual" } };

function Board() {
  const { projects, tasks, addTask, toggleTask, removeTask, moveTask, addProject, setProjectColor, removeProject, columns, addColumn, removeColumn, moveColumn, placeInColumn } = useApp();
  const usedColors = projects.map(p => p.color);
  const [newColor, setNewColor] = useState<string | null>(null); // null = pick the next free color
  const [editing, setEditing] = useState<string | null>(null); // id of the task open in the edit dialog
  const editingTask = tasks.find(t => t.id === editing);
  const [recoloring, setRecoloring] = useState<string | null>(null); // id of the project whose color picker is open
  const [newCol, setNewCol] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [title, setTitle] = useState(""); const [due, setDue] = useState(""); const [rec, setRec] = useState<Recurrence>("none");
  const [proj, setProj] = useState(projects[0]?.id ?? ""); const [newProj, setNewProj] = useState(""); const [showDone, setShowDone] = useState(false);
  const visible = tasks.filter(t => (filter === "all" || t.projectId === filter) && !t.done);
  const done = tasks.filter(t => (filter === "all" || t.projectId === filter) && t.done);
  const pOf = (id: string) => projects.find(p => p.id === id);
  const placed = new Map(visible.flatMap(t => { const col = columnFor(t, columns); return col ? [[t.id, col] as const] : []; }));
  const field = "h-10 rounded-lg border bg-background px-3 text-sm";

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button onClick={() => setFilter("all")} className={`chip ${filter === "all" ? "chip-active" : ""}`}>Alla</button>
        {projects.map(p => (
          <span key={p.id} className={`chip group relative ${filter === p.id ? "chip-active" : ""}`}>
            <button onClick={() => setRecoloring(recoloring === p.id ? null : p.id)} className="size-2.5 rounded-full hover:scale-150 transition" style={{ background: p.color }} aria-label={`Byt färg på ${p.name}`} />
            <button onClick={() => setFilter(p.id)} className="ml-2">{p.name}</button>
            <button onClick={() => confirm(`Ta bort ${p.name} och dess uppgifter?`) && removeProject(p.id)} className="opacity-0 group-hover:opacity-60 ml-1">×</button>
            {recoloring === p.id && (
              <div className="absolute left-0 top-full mt-2 z-20 card-soft p-2 w-max text-foreground">
                <ColorSwatches value={p.color} used={usedColors} onPick={c => { setProjectColor(p.id, c); setRecoloring(null); }} />
              </div>
            )}
          </span>
        ))}
        <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); if (newProj.trim()) { addProject(newProj.trim(), newColor ?? nextFreeColor(usedColors)); setNewProj(""); setNewColor(null); } }}>
          <input value={newProj} onChange={e => setNewProj(e.target.value)} placeholder="+ Nytt projekt" className="chip bg-transparent outline-none w-36" />
          {newProj.trim() && <ColorSwatches value={newColor ?? nextFreeColor(usedColors)} used={usedColors} onPick={setNewColor} />}
        </form>
      </div>

      <form className="card-soft p-4 mb-8 flex flex-wrap gap-2" onSubmit={e => {
        e.preventDefault(); if (!title.trim() || !proj) return;
        addTask({ title: title.trim(), projectId: proj, due: due || null, recurrence: rec }); setTitle("");
      }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Vad behöver göras?" className={`${field} flex-1 min-w-56`} />
        <select value={proj} onChange={e => setProj(e.target.value)} className={field}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="date" value={due} onChange={e => setDue(e.target.value)} className={field} />
        <select value={rec} onChange={e => setRec(e.target.value as Recurrence)} className={field}>{Object.entries(REC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Lägg till</button>
      </form>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[...columns, ...(visible.some(t => !placed.has(t.id)) ? [OTHER] : [])].map((c, index) => {
          const items = visible.filter(t => c === OTHER ? !placed.has(t.id) : placed.get(t.id) === c.id).sort((a, b) => (a.due ?? "z").localeCompare(b.due ?? "z"));
          const overdue = c.rule.kind === "overdue";
          // A drop is either a column being reordered or a task being moved into this column.
          const onDrop = (e: DragEvent) => {
            const col = e.dataTransfer.getData("col"); if (col) { if (c !== OTHER) moveColumn(col, index); return; }
            const id = e.dataTransfer.getData("id"); if (!id || c === OTHER) return;
            if (c.rule.kind === "manual") { placeInColumn(id, c.id); return; }
            const due = dueForRule(c.rule); if (due !== undefined) moveTask(id, due);
          };
          return (
            <section key={c.id} onDragOver={e => e.preventDefault()} onDrop={onDrop}
              className={`rounded-2xl p-3 min-h-48 ${overdue ? "bg-destructive/10" : "bg-muted"}`}>
              <h2 draggable={c !== OTHER} onDragStart={e => e.dataTransfer.setData("col", c.id)} title={c !== OTHER ? "Dra för att flytta kolumnen" : "Uppgifter som ingen kolumn fångar"}
                className={`font-display text-lg px-1 mb-3 flex justify-between ${c !== OTHER ? "cursor-grab" : ""} ${overdue ? "text-destructive" : ""}`}>{c.name}<span className="text-muted-foreground text-sm font-sans flex gap-2">{items.length}{c !== OTHER && columns.length > 1 && <button onClick={() => confirm(`Ta bort kolumnen ${c.name}?`) && removeColumn(c.id)} aria-label="Ta bort kolumn">×</button>}</span></h2>
              <div className="space-y-2">
                {items.map(t => (
                  <div key={t.id} draggable onDragStart={e => e.dataTransfer.setData("id", t.id)} onClick={() => setEditing(t.id)} title="Klicka för att redigera" className="card-soft p-3 group cursor-grab">
                    <div className="flex gap-2 items-start">
                      <button onClick={e => { e.stopPropagation(); toggleTask(t.id); }} className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-primary hover:bg-primary/30" aria-label="Klar" />
                      <span className="text-sm flex-1">{t.title}</span>
                      <button onClick={e => { e.stopPropagation(); removeTask(t.id); }} className="opacity-0 group-hover:opacity-50 text-sm">×</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground pl-6">
                      <span className="flex items-center gap-1"><i className="size-2 rounded-full" style={{ background: pOf(t.projectId)?.color }} />{pOf(t.projectId)?.name}</span>
                      {t.due && <span>{t.due.slice(5).replace("-", "/")}</span>}
                      {t.recurrence !== "none" && <span>↻ {REC[t.recurrence].toLowerCase()}</span>}
                      {t.notes && <span title={t.notes}>✎ anteckning</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        <form className="rounded-2xl border-2 border-dashed p-3 min-h-48" onSubmit={e => { e.preventDefault(); if (newCol.trim()) { addColumn(newCol.trim()); setNewCol(""); } }}>
          <input value={newCol} onChange={e => setNewCol(e.target.value)} placeholder="+ Ny kolumn" className="w-full bg-transparent font-display text-lg outline-none px-1" />
          <p className="text-xs text-muted-foreground px-1 mt-2">Dra uppgifter hit för att samla dem här.</p>
        </form>
      </div>
      {done.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowDone(!showDone)} className="text-sm text-muted-foreground">{showDone ? "Dölj" : "Visa"} klara ({done.length})</button>
          {showDone && <ul className="mt-2 space-y-1">{done.map(t => <li key={t.id} className="text-sm text-muted-foreground line-through cursor-pointer" onClick={() => toggleTask(t.id)}>{t.title}</li>)}</ul>}
        </div>
      )}
      {editingTask && <TaskDialog key={editingTask.id} task={editingTask} onClose={() => setEditing(null)} />}
    </Shell>
  );
}
