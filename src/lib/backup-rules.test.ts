import { describe, expect, it } from "vitest";
import { dailyName, filesToPrune, isAppData, isBackupName, isEmptyData } from "./backup-rules";
import { useApp } from "./store";

describe("backupregler", () => {
  it("godkänner appens exportdata och avvisar annat", () => {
    expect(isAppData(useApp.getState().exportData())).toBe(true);
    expect(isAppData({ tasks: [] })).toBe(false);
    expect(isAppData(null)).toBe(false);
  });
  it("tom data räknas som tom, så den aldrig skriver över en backup", () => {
    useApp.getState().reset();
    expect(isEmptyData(useApp.getState().exportData())).toBe(true);
  });
  it("bara backupfiler kan läsas", () => {
    expect(isBackupName("latest.json")).toBe(true);
    expect(isBackupName("backup-2026-11-26.json")).toBe(true);
    expect(isBackupName("../etc/passwd")).toBe(false);
    expect(isBackupName("latest.json.tmp")).toBe(false);
  });
  it("dagens fil får datumnamn", () => expect(dailyName(new Date("2026-11-26T12:00:00Z"))).toBe("backup-2026-11-26.json"));
  it("behåller de 30 senaste dagliga kopiorna", () => {
    const names = Array.from({ length: 32 }, (_, i) => dailyName(new Date(Date.UTC(2026, 0, 1 + i))));
    expect(filesToPrune([...names, "latest.json"])).toEqual(["backup-2026-01-02.json", "backup-2026-01-01.json"]);
  });
});
