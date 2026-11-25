import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, fmtMin } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/fokus")({
  head: () => ({ meta: [
    { title: "Fokus – DailyVibe" }, { name: "description", content: "Arbeta i tidsblock med timer kopplad till dina uppgifter." },
    { property: "og:title", content: "Fokus – DailyVibe" }, { property: "og:description", content: "Starta en timer och arbeta i fokuserade block." },
  ] }),
  component: Focus,
});

function Focus() {
  const { tasks, projects, running, startTimer, stopTimer, sessions, removeSession } = useApp();
  const [taskId, setTaskId] = useState(""); const [label, setLabel] = useState(""); const [minutes, setMinutes] = useState(40);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const left = running ? running.start + running.minutes * 60000 - now : 0;
  useEffect(() => { if (running && left <= 0) { stopTimer(); try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play(); } catch {} if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Blocket är klart!"); } }, [left, running, stopTimer]);
  const open = tasks.filter(t => !t.done);
  const today = new Date().toDateString();
  const todays = sessions.filter(s => new Date(s.start).toDateString() === today).reverse();
  const mm = Math.max(0, Math.floor(left / 60000)), ss = Math.max(0, Math.floor(left / 1000) % 60);
  const pct = running ? 1 - left / (running.minutes * 60000) : 0;
  const field = "h-11 rounded-lg border bg-background px-3 text-sm w-full";

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
              {running && <span className="text-sm text-muted-foreground mt-2 max-w-48 text-center truncate">{running.label}</span>}
            </div>
          </div>
          {running ? (
            <button onClick={stopTimer} className="h-12 px-8 rounded-full bg-destructive text-destructive-foreground font-medium">Avsluta & spara</button>
          ) : (
            <div className="w-full max-w-md space-y-3">
              <select value={taskId} onChange={e => setTaskId(e.target.value)} className={field}>
                <option value="">— Fri session (skriv nedan) —</option>
                {open.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              {!taskId && <input value={label} onChange={e => setLabel(e.target.value)} placeholder="T.ex. Skriva kapitel 2" className={field} />}
              <div className="flex gap-2">{[25, 40, 50, 90].map(m => <button key={m} onClick={() => setMinutes(m)} className={`chip flex-1 justify-center ${minutes === m ? "chip-active" : ""}`}>{m} min</button>)}
                <input type="number" min={1} value={minutes} onChange={e => setMinutes(Math.max(1, +e.target.value))} className="chip w-20 bg-transparent" /></div>
              <button onClick={() => {
                const t = tasks.find(x => x.id === taskId);
                if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
                startTimer({ taskId: t?.id ?? null, label: t?.title ?? (label.trim() || "Fri session"), projectId: t?.projectId ?? null, start: Date.now(), minutes });
              }} className="h-12 w-full rounded-full bg-primary text-primary-foreground font-medium">Starta {minutes} min</button>
            </div>
          )}
        </div>
        <aside>
          <h2 className="font-display text-xl mb-3">Idag · {fmtMin(todays.reduce((a, s) => a + s.end - s.start, 0))}</h2>
          <ul className="space-y-2">
            {todays.length === 0 && <li className="text-sm text-muted-foreground">Inga block ännu idag.</li>}
            {todays.map(s => (
              <li key={s.id} className="card-soft p-3 text-sm flex justify-between group">
                <span><span className="block">{s.label}</span><span className="text-xs text-muted-foreground">{new Date(s.start).toLocaleTimeString("sv", { hour: "2-digit", minute: "2-digit" })} · {projects.find(p => p.id === s.projectId)?.name ?? "Utan projekt"}</span></span>
                <span className="flex gap-2 items-start">{fmtMin(s.end - s.start)}<button onClick={() => removeSession(s.id)} className="opacity-0 group-hover:opacity-50">×</button></span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Shell>
  );
}
