// Durable pending uploads are explicitly authorized offline work. No session credentials are stored.
import { api } from "./api";
export type PendingUpload = {
  id: string;
  userId: string;
  caseId: string;
  collectionId: string;
  name: string;
  file: File;
  state: "queued" | "uploading" | "retry" | "blocked";
  error?: string;
  nextAttempt: number;
  createdAt: number;
};
let running = false;
const listeners = new Set<() => void>();
export const subscribeUploads = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const changed = () => listeners.forEach((fn) => fn());
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("legalflow-pending-files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("uploads", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function save(row: PendingUpload) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("uploads", "readwrite");
    t.objectStore("uploads").put(row);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
  changed();
}
export async function pendingUploads(userId: string): Promise<PendingUpload[]> {
  const db = await database();
  const rows = await new Promise<PendingUpload[]>((resolve, reject) => {
    const r = db.transaction("uploads").objectStore("uploads").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return rows.filter((r) => r.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
}
export async function enqueueFiles(
  userId: string,
  caseId: string,
  collectionId: string,
  files: File[],
) {
  for (const file of files)
    await save({
      id: crypto.randomUUID(),
      userId,
      caseId,
      collectionId,
      name: file.name,
      file,
      state: "queued",
      nextAttempt: 0,
      createdAt: Date.now(),
    });
}
export async function discardUpload(id: string, userId: string) {
  const row = (await pendingUploads(userId)).find((r) => r.id === id);
  if (!row || row.state === "uploading") return;
  await remove(id);
}
async function remove(id: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("uploads", "readwrite");
    t.objectStore("uploads").delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
  changed();
}
export async function retryUploads(userId: string) {
  for (const row of (await pendingUploads(userId)).filter(
    (r) => r.state !== "uploading" || r.nextAttempt <= Date.now(),
  ))
    await save({ ...row, state: "queued", nextAttempt: 0, error: undefined });
}
export async function processUploads(userId: string, isCurrent: () => boolean, onDone: () => void) {
  if (running || !navigator.onLine) return;
  running = true;
  const work = async () => {
    while (true) {
      const row = (await pendingUploads(userId)).find(
        (r) => r.state !== "blocked" && r.nextAttempt <= Date.now(),
      );
      if (!row) break;
      if (!isCurrent() || !navigator.onLine || document.visibilityState === "hidden") break;
      if (row.state === "blocked" || row.nextAttempt > Date.now()) continue;
      await save({ ...row, state: "uploading", nextAttempt: Date.now() + 120000 });
      try {
        if (!isCurrent()) {
          await save({ ...row, state: "queued", nextAttempt: 0 });
          break;
        }
        const form = new FormData();
        form.append("caseId", row.caseId);
        form.append("collectionId", row.collectionId);
        form.append("file", row.file, row.name);
        await api("/documents", {
          method: "POST",
          body: form,
          headers: { "X-Upload-Id": row.id, "X-Upload-User": userId },
        });
        await remove(row.id);
        onDone();
      } catch (e) {
        const error = e as Error & { status?: number };
        await save({
          ...row,
          state: [403, 404, 413, 422].includes(error.status || 0) ? "blocked" : "retry",
          error: error.message,
          nextAttempt: Date.now() + (error.status === 429 ? 65000 : 30000),
        });
        if (!error.status || error.status === 401 || !isCurrent()) break;
      }
      await new Promise((r) => setTimeout(r, 650));
    }
  };
  try {
    if (navigator.locks)
      await navigator.locks.request(
        "legalflow-file-uploads",
        { ifAvailable: true },
        async (lock) => {
          if (lock) await work();
        },
      );
    else await work();
  } finally {
    running = false;
  }
}
