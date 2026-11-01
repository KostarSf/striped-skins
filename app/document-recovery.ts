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

/** Chromium limits an individual IndexedDB value; a 4K snapshot exceeds that limit. */
function splitBuffers(saved: SavedDocuments) {
  const buffers = new Map<Uint8ClampedArray, string>();
  const entries = new Map<string, Uint8ClampedArray>();
  const retained = new Set<Uint8ClampedArray>();
  for (const slot of Object.values(saved)) {
    if (!slot) continue;
    const snapshot = slot.document;
    retained.add(snapshot.pixels);
    const layers = [
      ...snapshot.layers,
      ...[...snapshot.undo, ...snapshot.redo].flatMap((command) =>
        command.kind === "structure" ? [...command.before.layers, ...command.after.layers] : [],
      ),
    ];
    for (const layer of layers) if (layer.pixels) retained.add(layer.pixels);
  }
  // Keep ordinary sessions in their original representation. Large sessions shard all
  // rasters, including small layers retained in history, rather than only the largest ones.
  if ([...retained].reduce((bytes, buffer) => bytes + buffer.byteLength, 0) < 64 * 1024 * 1024)
    return { session: saved, entries };
  const visit = (value: unknown): unknown => {
    if (value instanceof Uint8ClampedArray) {
      if (value.byteLength < 64 * 64 * 4) return value;
      let key = buffers.get(value);
      if (!key) {
        key = `rgba/${buffers.size}`;
        buffers.set(value, key);
        entries.set(key, value);
      }
      return { recoveryBuffer: key };
    }
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") {
      if ("kind" in value && value.kind === "pixels") return value;
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
    }
    return value;
  };
  return { session: visit(saved), entries };
}

function restoreBuffers(value: unknown, buffers: Map<string, Uint8ClampedArray>): unknown {
  if (value instanceof Uint8ClampedArray) return value;
  if (Array.isArray(value)) return value.map((item) => restoreBuffers(item, buffers));
  if (value && typeof value === "object") {
    if ("kind" in value && value.kind === "pixels") return value;
    if ("recoveryBuffer" in value) {
      const buffer = buffers.get(String(value.recoveryBuffer));
      if (!buffer) throw new Error("Missing recovery pixel buffer");
      return buffer;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, restoreBuffers(item, buffers)]),
    );
  }
  return value;
}
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
      const store = tx.objectStore("documents");
      const request = store.get("session");
      const keys = store.getAllKeys();
      const buffers = new Map<string, Uint8ClampedArray>();
      keys.onsuccess = () => {
        for (const key of keys.result) {
          if (typeof key !== "string" || !key.startsWith("rgba/")) continue;
          const buffer = store.get(key);
          buffer.onsuccess = () => buffers.set(key, buffer.result);
        }
      };
      tx.oncomplete = () => {
        try {
          resolve(
            (buffers.size ? restoreBuffers(request.result, buffers) : request.result) as
              | SavedDocuments
              | undefined,
          );
        } catch (error) {
          reject(error);
        }
      };
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
  const { session, entries } = splitBuffers(saved);
  const write = async (db: IDBDatabase) => {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("documents", "readwrite");
      const store = tx.objectStore("documents");
      store.clear();
      for (const [key, pixels] of entries) store.put(pixels, key);
      store.put(session, "session");
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
