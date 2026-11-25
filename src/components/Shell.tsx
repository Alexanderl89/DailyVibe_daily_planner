import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useApp } from "@/lib/store";

export function Shell({ children }: { children: ReactNode }) {
  const running = useApp(s => s.running);
  const link = "px-3 py-1.5 rounded-full text-sm transition-colors text-muted-foreground hover:text-foreground";
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <span className="font-display text-2xl">DailyVibe<span className="text-primary">.</span></span>
          <nav className="flex gap-1">
            {[["/", "Planering"], ["/fokus", running ? "● Fokus" : "Fokus"], ["/statistik", "Statistik"], ["/anteckningar", "Anteckningar"], ["/data", "Data"]].map(([to, l]) => (
              <Link key={to} to={to as "/"} className={link} activeOptions={{ exact: true }}
                activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground" }}>{l}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
export const fmtMin = (ms: number) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
