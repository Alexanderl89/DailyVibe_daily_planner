import { create } from "zustand";
import { useApp } from "./store";
import { isEmptyData } from "./backup-rules";
import { listBackups, readBackup, saveBackup, type BackupInfo } from "./backup";

const DEBOUNCE_MS = 5000;

type BackupStatus = {
  lastSaved: number | null;
  error: boolean;
  // Set when the browser has no data but the server has a backup; auto-backup is paused until the user decides.
  offer: BackupInfo | null;
};
export const useBackupStatus = create<BackupStatus>(() => ({ lastSaved: null, error: false, offer: null }));

/** Sends the current data to the server backup and records the result. */
async function send(): Promise<void> {
  try {
    const { savedAt } = await saveBackup({ data: useApp.getState().exportData() });
    useBackupStatus.setState({ lastSaved: savedAt, error: false });
  } catch {
    useBackupStatus.setState({ error: true });
  }
}

/** Replaces the browser's data with a server backup and resumes automatic backups. */
export async function restoreBackup(name: string): Promise<void> {
  const data = await readBackup({ data: name });
  useBackupStatus.setState({ offer: null });
  useApp.getState().importData(data);
}

/** Declines the restore offer and resumes automatic backups from the current (empty) data. */
export function dismissBackupOffer(): void {
  useBackupStatus.setState({ offer: null });
}

/** Starts automatic backups after the store has loaded; returns a function that stops them. */
export function startBackupSync(): () => void {
  const snapshot = () => JSON.stringify(useApp.getState().exportData());
  let last = snapshot(); // what the server already has (or doesn't need), so loading the page never triggers a backup
  let timer: ReturnType<typeof setTimeout> | undefined;

  // A cleared browser starts empty: don't let it overwrite a good backup before the user has chosen.
  if (isEmptyData(useApp.getState().exportData())) {
    listBackups().then(list => { if (list[0]) useBackupStatus.setState({ offer: list[0] }); }).catch(() => {});
  }

  const flush = () => { if (timer) { clearTimeout(timer); timer = undefined; void send(); } };
  const unsubscribe = useApp.subscribe(() => {
    const now = snapshot();
    if (now === last) return; // e.g. the focus timer ticking, which isn't part of the backup
    last = now;
    if (useBackupStatus.getState().offer || isEmptyData(useApp.getState().exportData())) return;
    clearTimeout(timer); timer = setTimeout(flush, DEBOUNCE_MS);
  });
  const onHide = () => { if (document.visibilityState === "hidden") flush(); };
  document.addEventListener("visibilitychange", onHide);
  return () => { unsubscribe(); clearTimeout(timer); document.removeEventListener("visibilitychange", onHide); };
}
