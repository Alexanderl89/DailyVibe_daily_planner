import { describe, it, expect } from "vitest";
import { columnFor, defaultColumns, dueForRule, migrateColumns, type Column } from "./columns";
import { nextDue, useApp } from "./store";

const now = new Date(2026, 10, 24); // tisdag
const cols = defaultColumns();
const col = (due: string | null, columns: Column[] = cols, columnId?: string) =>
  columnFor(columnId ? { due, columnId } : { due }, columns, now);

describe("standardkolumner", () => {
  it("passerat datum hamnar i försenade", () => expect(col("2026-11-23")).toBe("overdue"));
  it("idag", () => expect(col("2026-11-24")).toBe("today"));
  it("imorgon", () => expect(col("2026-11-25")).toBe("tomorrow"));
  it("söndag är denna vecka", () => expect(col("2026-11-29")).toBe("week"));
  it("nästa måndag är senare", () => expect(col("2026-11-30")).toBe("later"));
  it("utan datum hamnar i backlog", () => expect(col(null)).toBe("backlog"));
  it("senare tar bara uppgifter med datum", () => expect(col(null, cols.filter(c => c.id !== "backlog"))).toBeNull());
  it("en uppgift för imorgon hamnar i idag nästa dag", () =>
    expect(columnFor({ due: "2026-11-25" }, cols, new Date(2026, 10, 25))).toBe("today"));
  it("veckovis återkommande flyttas 7 dagar", () => expect(nextDue("2026-11-24", "weekly")).toBe("2026-12-01"));
});

describe("kolumnregler", () => {
  it("första matchande kolumnen vinner", () => {
    const withoutTomorrow = cols.filter(c => c.id !== "tomorrow");
    expect(col("2026-11-25", withoutTomorrow)).toBe("week");
  });
  it("dag X–Y från idag", () => {
    const range: Column[] = [{ id: "r", name: "Snart", rule: { kind: "range", from: 2, to: 4 } }];
    expect(col("2026-11-26", range)).toBe("r");
    expect(col("2026-11-28", range)).toBe("r");
    expect(col("2026-11-29", range)).toBeNull();
    expect(col("2026-11-25", range)).toBeNull();
  });
  it("uppgifter som ingen kolumn fångar ger null (Övrigt)", () => expect(col(null, cols.slice(0, 2))).toBeNull());
  it("manuell kolumn går före datumregler", () => {
    const manual: Column[] = [...cols, { id: "m", name: "Väntar", rule: { kind: "manual" } }];
    expect(col("2026-11-24", manual, "m")).toBe("m");
  });
  it("borttagen manuell kolumn sorteras efter datum igen", () => expect(col("2026-11-24", cols, "m")).toBe("today"));
  it("släpp i en kolumn sätter rätt datum", () => {
    expect(dueForRule({ kind: "tomorrow" }, now)).toBe("2026-11-25");
    expect(dueForRule({ kind: "range", from: 3, to: null }, now)).toBe("2026-11-27");
    expect(dueForRule({ kind: "overdue" }, now)).toBeUndefined();
    expect(dueForRule({ kind: "rest" }, now)).toBe("2026-11-30"); // måndag nästa vecka
    expect(dueForRule({ kind: "noDate" }, now)).toBeNull();
  });
});

describe("migrering", () => {
  it("gamla egna kolumner blir manuella efter standardkolumnerna", () => {
    const m = migrateColumns([{ id: "x", name: "Läsa" }]);
    expect(m.map(c => c.id)).toEqual(["overdue", "today", "tomorrow", "week", "later", "backlog", "x"]);
    expect(m.at(-1)?.rule).toEqual({ kind: "manual" });
  });
  it("gamla \"Senare / utan datum\" delas upp i Senare + Backlog", () => {
    const v2: Column[] = [{ id: "today", name: "Idag", rule: { kind: "today" } }, { id: "later", name: "Senare / utan datum", rule: { kind: "rest" } }, { id: "m", name: "Väntar", rule: { kind: "manual" } }];
    expect(migrateColumns(v2).map(c => `${c.id}:${c.name}`)).toEqual(["today:Idag", "later:Senare", "backlog:Backlog", "m:Väntar"]);
  });
  it("omdöpt senare-kolumn eller befintlig utan datum-kolumn lämnas", () => {
    const renamed: Column[] = [{ id: "later", name: "Sen", rule: { kind: "rest" } }];
    expect(migrateColumns(renamed)).toEqual(renamed);
    const withNoDate: Column[] = [{ id: "later", name: "Senare / utan datum", rule: { kind: "rest" } }, { id: "n", name: "Inget datum", rule: { kind: "noDate" } }];
    expect(migrateColumns(withNoDate).map(c => c.name)).toEqual(["Senare", "Inget datum"]);
  });
  it("tom eller saknad lista ger standardkolumnerna", () => {
    expect(migrateColumns([])).toEqual(defaultColumns());
    expect(migrateColumns(undefined)).toEqual(defaultColumns());
  });
  it("nya kolumner lämnas orörda", () => {
    const custom: Column[] = [{ id: "a", name: "A", rule: { kind: "noDate" } }];
    expect(migrateColumns(custom)).toEqual(custom);
  });
});

describe("data", () => {
  it("återställ tömmer uppgifter", () => { useApp.getState().addTask({ title: "x", projectId: "phd", due: null, recurrence: "none" }); useApp.getState().reset(); expect(useApp.getState().tasks).toHaveLength(0); });
  it("export och import ger samma uppgifter", () => { const s = useApp.getState(); s.addTask({ title: "a", projectId: "phd", due: null, recurrence: "none" }); const d = s.exportData(); s.reset(); useApp.getState().importData(d); expect(useApp.getState().tasks[0]?.title).toBe("a"); });
  it("import av gammal exportfil behåller egna kolumner", () => {
    const old = { ...useApp.getState().exportData(), columns: [{ id: "x", name: "Läsa" }] } as never;
    useApp.getState().importData(old);
    expect(useApp.getState().columns.map(c => c.id)).toContain("x");
    expect(useApp.getState().columns[0]?.id).toBe("overdue");
  });
  it("redigera uppgift: nytt datum tar den ur manuell kolumn, anteckning sparas", () => {
    const s = useApp.getState(); s.reset(); s.addColumn("Väntar");
    s.addTask({ title: "a", projectId: "phd", due: null, recurrence: "none" });
    const id = useApp.getState().tasks[0]!.id; const colId = useApp.getState().columns.at(-1)!.id;
    useApp.getState().placeInColumn(id, colId);
    useApp.getState().updateTask(id, { title: "b", notes: "hej" });
    expect(useApp.getState().tasks[0]).toMatchObject({ title: "b", notes: "hej", columnId: colId });
    useApp.getState().updateTask(id, { due: "2026-12-01" });
    expect(useApp.getState().tasks[0]?.columnId).toBeUndefined();
  });
  it("kolumner kan flyttas", () => {
    useApp.getState().reset(); useApp.getState().moveColumn("later", 0);
    expect(useApp.getState().columns[0]?.id).toBe("later");
  });
});
