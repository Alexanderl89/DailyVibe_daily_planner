import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { useApp, type AppData } from "@/lib/store";

export const Route = createFileRoute("/data")({
  head: () => ({ meta: [
    { title: "Data – DailyVibe" }, { name: "description", content: "Exportera, importera eller återställ din data." },
    { property: "og:title", content: "Data – DailyVibe" }, { property: "og:description", content: "Flytta din data mellan enheter." },
  ] }),
  component: DataPage,
});

function DataPage() {
  const { exportData, importData, reset, tasks, notes, sessions } = useApp();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const doExport = () => {
    const blob = new Blob([JSON.stringify({ app: "dailyvibe", version: 1, data: exportData() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `dailyvibe-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const doImport = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()); const d: AppData = j.data ?? j;
      if (!Array.isArray(d.tasks) || !Array.isArray(d.projects)) throw new Error();
      if (!confirm("Importen ersätter all nuvarande data. Fortsätta?")) return;
      importData(d); setMsg("Importen lyckades.");
    } catch { setMsg("Filen kunde inte läsas. Välj en fil som exporterats från DailyVibe."); }
  };
  return (
    <Shell>
      <div className="max-w-2xl space-y-4">
        <h1 className="font-display text-4xl mb-2">Din data</h1>
        <p className="text-muted-foreground text-sm">{tasks.length} uppgifter · {notes.length} anteckningar · {sessions.length} fokusblock</p>
        <div className="card-soft p-6"><h2 className="font-display text-xl">Exportera</h2><p className="text-sm text-muted-foreground mb-4">Ladda ner en fil med allt. Öppna den på en annan enhet med Importera.</p>
          <button onClick={doExport} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Ladda ner fil</button></div>
        <div className="card-soft p-6"><h2 className="font-display text-xl">Importera</h2><p className="text-sm text-muted-foreground mb-4">Välj en exporterad fil. Den ersätter det som finns här nu.</p>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }} />
          <button onClick={() => file.current?.click()} className="h-10 px-5 rounded-lg border text-sm font-medium">Välj fil…</button></div>
        <div className="card-soft p-6 border-destructive/40"><h2 className="font-display text-xl text-destructive">Återställ</h2><p className="text-sm text-muted-foreground mb-4">Raderar alla uppgifter, kolumner, anteckningar och tider på den här enheten.</p>
          <button onClick={() => { if (confirm("Radera all data? Detta går inte att ångra.")) { reset(); setMsg("All data är raderad."); } }} className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">Radera allt</button></div>
        {msg && <p className="text-sm">{msg}</p>}
      </div>
    </Shell>
  );
}
