import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { useApp, type AppData } from "@/lib/store";
import { listBackups, type BackupInfo } from "@/lib/backup";
import { restoreBackup, useBackupStatus } from "@/lib/backup-sync";

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
    const blob = new Blob([JSON.stringify({ app: "dailyvibe", version: 2, data: exportData() }, null, 2)], { type: "application/json" });
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
        <ServerBackups onMessage={setMsg} />
        <div className="card-soft p-6 border-destructive/40"><h2 className="font-display text-xl text-destructive">Återställ</h2><p className="text-sm text-muted-foreground mb-4">Raderar alla uppgifter, kolumner, anteckningar och tider på den här enheten.</p>
          <button onClick={() => { if (confirm("Radera all data? Detta går inte att ångra.")) { reset(); setMsg("All data är raderad."); } }} className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">Radera allt</button></div>
        {msg && <p className="text-sm">{msg}</p>}
      </div>
    </Shell>
  );
}

const fmt = (ms: number) => new Date(ms).toLocaleString("sv-SE");

/** Lists the automatic backups stored in the Docker container and restores a chosen one. */
function ServerBackups({ onMessage }: { onMessage: (m: string) => void }) {
  const { lastSaved, error } = useBackupStatus();
  const [list, setList] = useState<BackupInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { listBackups().then(setList).catch(() => setFailed(true)); }, [lastSaved]);
  const restore = async (b: BackupInfo) => {
    if (!confirm(`Återställ backupen från ${fmt(b.savedAt)}? Den ersätter all nuvarande data.`)) return;
    try { await restoreBackup(b.name); onMessage("Backupen är återställd."); } catch { onMessage("Backupen kunde inte återställas."); }
  };
  return (
    <div className="card-soft p-6"><h2 className="font-display text-xl">Automatisk backup</h2>
      <p className="text-sm text-muted-foreground mb-4">Din data sparas automatiskt på servern några sekunder efter varje ändring. En kopia per dag sparas i 30 dagar.
        {error && <span className="text-destructive"> Senaste backupen misslyckades.</span>}</p>
      {failed && <p className="text-sm text-destructive">Kunde inte hämta backuperna från servern.</p>}
      {list?.length === 0 && <p className="text-sm text-muted-foreground">Inga backuper än.</p>}
      {list && list.length > 0 && (
        <ul className="divide-y text-sm">{list.map(b => (
          <li key={b.name} className="flex items-center justify-between py-2">
            <span>{b.name === "latest.json" ? "Senaste" : b.name.slice(7, 17)} <span className="text-muted-foreground">· {fmt(b.savedAt)}</span></span>
            <button onClick={() => restore(b)} className="h-8 px-3 rounded-lg border text-xs font-medium">Återställ</button>
          </li>
        ))}</ul>
      )}
    </div>
  );
}
