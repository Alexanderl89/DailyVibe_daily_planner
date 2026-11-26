import { createServerFn } from "@tanstack/react-start";
import type { AppData } from "./store";
import { LATEST, dailyName, filesToPrune, isAppData, isBackupName } from "./backup-rules";

export type BackupInfo = { name: string; savedAt: number };

// Server functions: the handlers run on the server (in the Docker container) and are called from the browser.
// node:* modules are imported inside the handlers so they never end up in the browser bundle.

/** Returns the folder backups are written to (a Docker volume in the container). */
async function backupDir(): Promise<string> {
  const { resolve } = await import("node:path");
  return resolve(process.env["BACKUP_DIR"] ?? "backups");
}

/** Saves the data as latest.json and as today's daily copy, then deletes daily copies older than the newest 30. */
export const saveBackup = createServerFn({ method: "POST" })
  .validator((d: unknown) => { if (!isAppData(d)) throw new Error("Ogiltig backupdata"); return d; })
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises"); const { join } = await import("node:path");
    const dir = await backupDir(); await fs.mkdir(dir, { recursive: true });
    const json = JSON.stringify({ app: "dailyvibe", version: 2, savedAt: Date.now(), data });
    for (const name of [LATEST, dailyName(new Date())]) {
      const tmp = join(dir, `${name}.tmp`);
      await fs.writeFile(tmp, json); await fs.rename(tmp, join(dir, name)); // write-then-rename so a crash never leaves half a file
    }
    for (const old of filesToPrune(await fs.readdir(dir))) await fs.rm(join(dir, old));
    return { savedAt: Date.now() };
  });

/** Lists the saved backups, newest first. */
export const listBackups = createServerFn({ method: "GET" }).handler(async (): Promise<BackupInfo[]> => {
  const fs = await import("node:fs/promises"); const { join } = await import("node:path");
  const dir = await backupDir();
  const names = (await fs.readdir(dir).catch(() => [] as string[])).filter(isBackupName);
  const infos = await Promise.all(names.map(async name => ({ name, savedAt: (await fs.stat(join(dir, name))).mtimeMs })));
  return infos.sort((a, b) => b.savedAt - a.savedAt);
});

/** Reads one backup file by name and returns its data. */
export const readBackup = createServerFn({ method: "GET" })
  .validator((name: unknown) => { if (typeof name !== "string" || !isBackupName(name)) throw new Error("Okänd backup"); return name; })
  .handler(async ({ data: name }): Promise<AppData> => {
    const fs = await import("node:fs/promises"); const { join } = await import("node:path");
    const parsed: unknown = JSON.parse(await fs.readFile(join(await backupDir(), name), "utf8"));
    const d = (parsed as { data?: unknown }).data;
    if (!isAppData(d)) throw new Error("Backupfilen är skadad");
    return d;
  });
