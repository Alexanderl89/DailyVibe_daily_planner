import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/store";
import { RULE_LABELS, type Column, type ColumnRule, type RuleKind } from "@/lib/columns";

export const Route = createFileRoute("/installningar")({
  head: () => ({ meta: [
    { title: "Inställningar – DailyVibe" }, { name: "description", content: "Ställ in kolumnerna på tavlan." },
    { property: "og:title", content: "Inställningar – DailyVibe" }, { property: "og:description", content: "Ställ in kolumnerna på tavlan." },
  ] }),
  component: SettingsPage,
});

const field = "h-9 rounded-lg border bg-background px-3 text-sm";

/** Builds a rule of the given kind, keeping the day range when switching to "range". */
function ruleOf(kind: RuleKind, prev: ColumnRule): ColumnRule {
  if (kind !== "range") return { kind };
  return prev.kind === "range" ? prev : { kind: "range", from: 0, to: 7 };
}

/** Settings page where the board's columns are renamed, reordered, given rules, added and removed. */
function SettingsPage() {
  const { columns, addColumn, moveColumn } = useApp();
  const [name, setName] = useState("");
  return (
    <Shell>
      <div className="max-w-3xl space-y-4">
        <h1 className="font-display text-4xl mb-2">Inställningar</h1>
        <div className="card-soft p-6">
          <h2 className="font-display text-xl">Kolumner</h2>
          <p className="text-sm text-muted-foreground mb-4">
            En uppgift hamnar i den första kolumnen uppifrån vars regel passar. Reglerna räknas från dagens datum, så uppgifter
            flyttar sig själva när dagarna går. Uppgifter som ingen kolumn fångar visas i "Övrigt". Dra i ⠿ för att ändra ordning.
            I "Dag X–Y" är dag 0 idag och dag 1 imorgon. Lämna "till" tomt för ingen övre gräns.
          </p>
          <ul className="space-y-2">
            {columns.map((c, i) => (
              <li key={c.id} onDragOver={e => e.preventDefault()} onDrop={e => { const id = e.dataTransfer.getData("col"); if (id) moveColumn(id, i); }}>
                <ColumnRow column={c} canRemove={columns.length > 1} />
              </li>
            ))}
          </ul>
          <form className="flex flex-wrap gap-2 mt-4" onSubmit={e => { e.preventDefault(); if (name.trim()) { addColumn(name.trim()); setName(""); } }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Namn på ny kolumn" className={`${field} flex-1 min-w-48`} />
            <button className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Lägg till kolumn</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}

/** One editable column: drag handle, name, rule (with day range when needed) and remove button. */
function ColumnRow({ column: c, canRemove }: { column: Column; canRemove: boolean }) {
  const { updateColumn, removeColumn } = useApp();
  const days = (v: string) => (v === "" ? null : Math.trunc(Number(v)));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted p-2">
      <span draggable onDragStart={e => e.dataTransfer.setData("col", c.id)} className="cursor-grab px-1 text-muted-foreground" title="Dra för att flytta">⠿</span>
      <input value={c.name} onChange={e => updateColumn(c.id, { name: e.target.value })} aria-label="Kolumnnamn" className={`${field} flex-1 min-w-40`} />
      <select value={c.rule.kind} onChange={e => updateColumn(c.id, { rule: ruleOf(e.target.value as RuleKind, c.rule) })} aria-label="Regel" className={field}>
        {Object.entries(RULE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {c.rule.kind === "range" && (() => {
        const r = c.rule;
        return (
          <span className="flex items-center gap-1 text-sm">
            dag <input type="number" value={r.from} onChange={e => updateColumn(c.id, { rule: { ...r, from: days(e.target.value) ?? 0 } })} aria-label="Från dag" className={`${field} w-20`} />
            till <input type="number" value={r.to ?? ""} placeholder="∞" onChange={e => updateColumn(c.id, { rule: { ...r, to: days(e.target.value) } })} aria-label="Till dag" className={`${field} w-20`} />
          </span>
        );
      })()}
      {canRemove && <button onClick={() => confirm(`Ta bort kolumnen ${c.name}?`) && removeColumn(c.id)} className="h-9 px-3 rounded-lg border text-sm" aria-label={`Ta bort ${c.name}`}>Ta bort</button>}
    </div>
  );
}
