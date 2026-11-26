import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { dismissBackupOffer, restoreBackup, useBackupStatus } from "@/lib/backup-sync";

export function Shell({ children }: { children: ReactNode }) {
  const running = useApp(s => s.running);
  const link = "px-3 py-1.5 rounded-full text-sm transition-colors text-muted-foreground hover:text-foreground";
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <span className="font-display text-2xl">DailyVibe<span className="text-primary">.</span></span>
          <nav className="flex gap-1">
            {[["/", "Planering"], ["/fokus", running ? "● Fokus" : "Fokus"], ["/statistik", "Statistik"], ["/anteckningar", "Anteckningar"], ["/data", "Data"], ["/installningar", "Inställningar"]].map(([to, l]) => (
              <Link key={to} to={to as "/"} className={link} activeOptions={{ exact: true }}
                activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground" }}>{l}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8"><BackupOffer />{children}</main>
    </div>
  );
}
export const fmtMin = (ms: number) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };

/** Offers to restore the newest server backup when the browser has no data of its own. */
function BackupOffer() {
  const offer = useBackupStatus(s => s.offer);
  const [failed, setFailed] = useState(false);
  if (!offer) return null;
  return (
    <div className="card-soft p-4 mb-6 flex flex-wrap items-center gap-3 border-primary/50">
      <p className="text-sm flex-1 min-w-64">Webbläsaren har ingen sparad data, men det finns en backup från {new Date(offer.savedAt).toLocaleString("sv-SE")}. Automatisk backup är pausad tills du har valt.{failed && <span className="text-destructive"> Återställningen misslyckades.</span>}</p>
      <button onClick={() => restoreBackup(offer.name).catch(() => setFailed(true))} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Återställ backup</button>
      <button onClick={dismissBackupOffer} className="h-9 px-4 rounded-lg border text-sm">Börja om från tomt</button>
    </div>
  );
}
