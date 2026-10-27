import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { documentCanvas, type SkinDocument } from "@striped-skins/api";
// Recovery may contain unexported edits with no original baseline left in memory.
const recoveredDirty = new WeakSet<SkinDocument>();
export function markRecoveredDirty(document: SkinDocument) {
  recoveredDirty.add(document);
}
type Info = { name: string; baseline: Uint8ClampedArray | null };
type Session = { documents: WeakMap<SkinDocument, Info>; changed: () => void };
const Context = createContext<Session | null>(null);
export function DocumentSession({ children }: { children: ReactNode }) {
  const documents = useRef(new WeakMap<SkinDocument, Info>());
  const [version, setVersion] = useState(0);
  const changed = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(
    () => ({ documents: documents.current, changed, version }),
    [changed, version],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDocumentInfo(document: SkinDocument, fallback = "skin.png") {
  const session = useContext(Context);
  if (!session) throw new Error("DocumentSession is missing");
  useSyncExternalStore(document.subscribe, document.getSnapshot, document.getSnapshot);
  let info = session.documents.get(document);
  if (!info) {
    info = {
      name: fallback,
      baseline: recoveredDirty.has(document) ? null : new Uint8ClampedArray(document.pixels),
    };
    session.documents.set(document, info);
  }
  const baseline = info.baseline;
  const dirty = baseline === null || document.pixels.some((v, i) => v !== baseline[i]);
  const { documents, changed } = session;
  const register = useCallback(
    (doc: SkinDocument, name: string) => {
      documents.set(doc, { name, baseline: new Uint8ClampedArray(doc.pixels) });
      changed();
    },
    [documents, changed],
  );
  return {
    name: info.name,
    dirty,
    register,
    exportPNG: async () => {
      // Capture the exported version, so edits made while the PNG encodes stay dirty.
      const pixels = new Uint8ClampedArray(document.pixels);
      const canvas = documentCanvas(document);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Не удалось сохранить PNG");
      const url = URL.createObjectURL(blob),
        link = globalThis.document.createElement("a");
      link.href = url;
      link.download = info.name.replace(/\.[^.]+$/, "") + ".png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      info.baseline = pixels;
      session.changed();
    },
  };
}
export function skinName(url?: string) {
  if (!url) return "skin.png";
  try {
    const parsed = new URL(url, location.origin);
    const source = parsed.searchParams.get("url");
    return decodeURIComponent(
      new URL(source ?? url, location.origin).pathname.split("/").at(-1) || "skin.png",
    );
  } catch {
    return "skin.png";
  }
}
