import { describe, expect, it } from "vitest";
import { weekTotals } from "./focus";
import { useApp, type Session } from "./store";

const now = new Date(2026, 10, 26, 12); // torsdag
const at = (d: number, h: number) => new Date(2026, 10, d, h).getTime();
const s = (label: string, start: number, minutes: number, projectId: string | null = null): Session =>
  ({ id: `${label}${start}`, taskId: null, label, projectId, start, end: start + minutes * 60000 });

describe("veckosummering", () => {
  it("summerar per uppgift från måndag, mest tid först", () => {
    const sessions = [s("Skriva", at(23, 9), 30), s("Läsa", at(24, 9), 50, "phd"), s("Skriva", at(26, 8), 40), s("Förra veckan", at(22, 9), 60)];
    expect(weekTotals(sessions, now)).toEqual([
      { label: "Skriva", projectId: null, ms: 70 * 60000 },
      { label: "Läsa", projectId: "phd", ms: 50 * 60000 },
    ]);
  });
});

describe("fokusuppgifter", () => {
  it("namnbyte flyttar med tidigare block", () => {
    const st = useApp.getState(); st.reset();
    const id = st.addFocusTask("Skrva", "phd");
    useApp.setState({ sessions: [{ id: "x", taskId: id, label: "Skrva", projectId: "phd", start: 0, end: 60000 }] });
    useApp.getState().renameFocusTask(id, "Skriva");
    expect(useApp.getState().focusTasks[0]?.title).toBe("Skriva");
    expect(useApp.getState().sessions[0]?.label).toBe("Skriva");
  });
  it("ta bort uppgift behåller blocken", () => {
    const id = useApp.getState().focusTasks[0]!.id;
    useApp.getState().removeFocusTask(id);
    expect(useApp.getState().focusTasks).toHaveLength(0);
    expect(useApp.getState().sessions).toHaveLength(1);
  });
  it("följer med i export och import", () => {
    const st = useApp.getState(); st.addFocusTask("Läsa", null);
    const d = useApp.getState().exportData(); st.reset(); useApp.getState().importData(d);
    expect(useApp.getState().focusTasks[0]?.title).toBe("Läsa");
  });
});
