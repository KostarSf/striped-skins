import { type SkinDocument } from "@striped-skins/api";

export const LEGACY_RECOVERY_KEY = "striped.editor.documents.v1";
export type RecoverySnapshot = ReturnType<SkinDocument["snapshot"]>;
export type SavedDocuments = Record<
  "first" | "second",
  null | {
    url: string | null;
    dirty?: boolean;
    name?: string;
    document: RecoverySnapshot;
  }
>;
let connection: Promise<IDBDatabase> | undefined;
let ready: IDBDatabase | undefined;
function database() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("striped.editor", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("documents");
    request.onerror = () => {
      connection = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      connection = undefined;
      reject(new Error("Recovery database blocked"));
    };
    request.onsuccess = () => {
      const db = request.result;
      ready = db;
      db.onversionchange = () => {
        db.close();
        ready = undefined;
        connection = undefined;
      };
      db.onclose = () => {
        ready = undefined;
        connection = undefined;
      };
      resolve(db);
    };
  }));
}
export function recoverySnapshot(document: SkinDocument): RecoverySnapshot {
  return document.snapshot();
}
export async function readSavedDocuments(): Promise<SavedDocuments | undefined> {
  try {
    const db = await database();
    const saved = await new Promise<SavedDocuments | undefined>((resolve, reject) => {
      const tx = db.transaction("documents", "readonly");
      const request = tx.objectStore("documents").get("session");
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
    });
    if (saved) return saved;
  } catch {
    /* Old localStorage recovery remains available if IndexedDB is blocked. */
  }
  try {
    const text = localStorage.getItem(LEGACY_RECOVERY_KEY);
    return text ? (JSON.parse(text) as SavedDocuments) : undefined;
  } catch {
    return;
  }
}
export function saveDocuments(saved: SavedDocuments) {
  const write = async (db: IDBDatabase) => {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("documents", "readwrite");
      tx.objectStore("documents").put(saved, "session");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Recovery write aborted"));
    });
    try {
      localStorage.removeItem(LEGACY_RECOVERY_KEY);
    } catch {
      /* Migration already committed. */
    }
  };
  // IndexedDB orders overlapping readwrite transactions. Start the transaction immediately
  // on an open connection so pagehide does not depend on a later JavaScript callback.
  return ready ? write(ready) : database().then(write);
}
