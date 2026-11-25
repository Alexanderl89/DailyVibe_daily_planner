import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { startOfWeek, addDays, format } from "date-fns";
import { sv } from "date-fns/locale";
import { Shell, fmtMin } from "@/components/Shell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/statistik")({
  head: () => ({ meta: [
    { title: "Statistik – DailyVibe" }, { name: "description", content: "Se hur mycket tid du lagt per vecka, uppgift och projekt." },
    { property: "og:title", content: "Statistik – DailyVibe" }, { property: "og:description", content: "Tid per vecka, uppgift och projekt." },
  ] }),
  component: Stats,
});

function Stats() {
  const { sessions, projects } = useApp();
  const [range, setRange] = useState<"week" | "all">("week");
  const ws = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
  const list = range === "week" ? sessions.filter(s => s.start >= ws) : sessions;
  const total = list.reduce((a, s) => a + s.end - s.start, 0);
  const group = (key: (s: typeof list[number]) => string) => {
    const m = new Map<string, number>(); list.forEach(s => m.set(key(s), (m.get(key(s)) ?? 0) + s.end - s.start));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byTask = group(s => s.label);
  const byProj = group(s => s.projectId ?? "");
  const days = Array.from({ length: 7 }, (_, i) => { const d = addDays(new Date(ws), i);
    return { d, ms: sessions.filter(s => new Date(s.start).toDateString() === d.toDateString()).reduce((a, s) => a + s.end - s.start, 0) }; });
  const maxDay = Math.max(1, ...days.map(d => d.ms));
  const Bar = ({ label, ms, color }: { label: string; ms: number; color?: string }) => (
    <div className="text-sm"><div className="flex justify-between mb-1"><span>{label}</span><span className="text-muted-foreground">{fmtMin(ms)}</span></div>
      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(ms / Math.max(1, total)) * 100}%`, ...(color ? { background: color } : {}) }} /></div></div>
  );
  return (
    <Shell>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div><p className="text-sm text-muted-foreground">{range === "week" ? "Denna vecka" : "Totalt"}</p><p className="font-display text-5xl">{fmtMin(total)}</p><p className="text-sm text-muted-foreground">{list.length} block</p></div>
        <div className="flex gap-2"><button onClick={() => setRange("week")} className={`chip ${range === "week" ? "chip-active" : ""}`}>Denna vecka</button><button onClick={() => setRange("all")} className={`chip ${range === "all" ? "chip-active" : ""}`}>Totalt</button></div>
      </div>
      <div className="card-soft p-6 mb-6">
        <h2 className="font-display text-xl mb-4">Veckan dag för dag</h2>
        <div className="flex items-end gap-3 h-40">{days.map(({ d, ms }) => (
          <div key={d.toISOString()} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <span className="text-xs text-muted-foreground">{ms ? Math.round(ms / 60000) : ""}</span>
            <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${(ms / maxDay) * 100}%`, minHeight: ms ? 4 : 0 }} />
            <span className="text-xs capitalize">{format(d, "EEE", { locale: sv })}</span></div>))}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-soft p-6 space-y-4"><h2 className="font-display text-xl">Per projekt</h2>
          {byProj.length === 0 && <p className="text-sm text-muted-foreground">Ingen tid loggad ännu.</p>}
          {byProj.map(([id, ms]) => { const p = projects.find(x => x.id === id); return <Bar key={id} label={p?.name ?? "Utan projekt"} ms={ms} {...(p ? { color: p.color } : {})} />; })}</div>
        <div className="card-soft p-6 space-y-4"><h2 className="font-display text-xl">Per uppgift</h2>
          {byTask.length === 0 && <p className="text-sm text-muted-foreground">Ingen tid loggad ännu.</p>}
          {byTask.map(([l, ms]) => <Bar key={l} label={l} ms={ms} />)}</div>
      </div>
    </Shell>
  );
}
