import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/anteckningar")({
  head: () => ({ meta: [
    { title: "Anteckningar – DailyVibe" }, { name: "description", content: "Skriv och organisera anteckningar per projekt." },
    { property: "og:title", content: "Anteckningar – DailyVibe" }, { property: "og:description", content: "Anteckningar kopplade till dina projekt." },
  ] }),
  component: Notes,
});

function Notes() {
  const { notes, projects, addNote, updateNote, removeNote } = useApp();
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const list = notes.filter(n => (n.title + n.body).toLowerCase().includes(q.toLowerCase()));
  const cur = notes.find(n => n.id === sel) ?? list[0];
  return (
    <Shell>
      <div className="grid md:grid-cols-[300px_1fr] gap-6 min-h-[70vh]">
        <aside className="space-y-3">
          <button onClick={() => setSel(addNote(null))} className="h-10 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium">+ Ny anteckning</button>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Sök…" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
          <ul className="space-y-1">
            {list.length === 0 && <li className="text-sm text-muted-foreground px-1">Inga anteckningar.</li>}
            {list.map(n => (
              <li key={n.id}><button onClick={() => setSel(n.id)} className={`w-full text-left rounded-lg p-3 text-sm ${cur?.id === n.id ? "bg-muted" : "hover:bg-muted/60"}`}>
                <span className="block font-medium truncate">{n.title || "Utan titel"}</span>
                <span className="block text-xs text-muted-foreground truncate">{projects.find(p => p.id === n.projectId)?.name ?? "Allmänt"} · {new Date(n.updated).toLocaleDateString("sv")}</span>
              </button></li>
            ))}
          </ul>
        </aside>
        {cur ? (
          <div className="card-soft p-6 flex flex-col gap-3">
            <div className="flex gap-2">
              <input value={cur.title} onChange={e => updateNote(cur.id, { title: e.target.value })} placeholder="Titel" className="flex-1 bg-transparent font-display text-3xl outline-none" />
              <select value={cur.projectId ?? ""} onChange={e => updateNote(cur.id, { projectId: e.target.value || null })} className="h-10 rounded-lg border bg-background px-3 text-sm">
                <option value="">Allmänt</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => confirm("Ta bort anteckningen?") && removeNote(cur.id)} className="h-10 px-3 rounded-lg text-sm text-destructive">Ta bort</button>
            </div>
            <textarea value={cur.body} onChange={e => updateNote(cur.id, { body: e.target.value })} placeholder="Skriv här…" className="flex-1 min-h-96 bg-transparent outline-none resize-none leading-relaxed" />
          </div>
        ) : <div className="card-soft p-6 text-muted-foreground">Skapa din första anteckning.</div>}
      </div>
    </Shell>
  );
}
