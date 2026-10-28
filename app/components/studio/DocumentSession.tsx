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
import { documentCanvas, encodeSkinProject, type SkinDocument } from "@striped-skins/api";
type Info = { name: string; baseline: string | null };
const recovered = new WeakMap<SkinDocument, { dirty: boolean; name?: string }>();
export function markRecoveredDocument(document: SkinDocument, dirty: boolean, name?: string) {
  recovered.set(document, { dirty, name });
}
type Session = { documents: WeakMap<SkinDocument, Info>; changed: () => void };
const Context = createContext<Session | null>(null);
export function DocumentSession({ children }: { children: ReactNode }) {
  const documents = useRef(new WeakMap<SkinDocument, Info>());
  const [version, changed] = useState(0);
  const value = useMemo(
    () => ({ documents: documents.current, changed: () => changed((v) => v + 1), version }),
    [version],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = globalThis.document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function useDocumentInfo(document: SkinDocument, fallback = "skin.png") {
  const session = useContext(Context);
  if (!session) throw new Error("DocumentSession is missing");
  useSyncExternalStore(document.subscribe, document.getSnapshot, document.getSnapshot);
  let info = session.documents.get(document);
  if (!info) {
    const recovery = recovered.get(document);
    info = {
      name: recovery?.name ?? fallback,
      baseline: recovery?.dirty ? null : document.saveToken,
    };
    session.documents.set(document, info);
  }
  const dirty = info.baseline !== document.saveToken || document.isDrawing;
  const { documents, changed } = session;
  const register = useCallback(
    (doc: SkinDocument, name: string) => {
      documents.set(doc, { name, baseline: doc.saveToken });
      changed();
    },
    [documents, changed],
  );
  return {
    name: info.name,
    dirty,
    register,
    saveProject: async () => {
      const bytes = encodeSkinProject(document),
        token = document.saveToken;
      const name = info.name.replace(/\.[^.]+$/, "") + ".striped";
      download(new Blob([new Uint8Array(bytes)], { type: "application/zip" }), name);
      info.name = name;
      info.baseline = token;
      changed();
    },
    exportPNG: async () => {
      const canvas = documentCanvas(document);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Не удалось экспортировать PNG");
      download(blob, info.name.replace(/\.[^.]+$/, "") + ".png");
    },
  };
}
export function skinName(url?: string) {
  if (!url) return "skin.png";
  try {
    const parsed = new URL(url, location.origin),
      source = parsed.searchParams.get("url");
    return decodeURIComponent(
      new URL(source ?? url, location.origin).pathname.split("/").at(-1) || "skin.png",
    );
  } catch {
    return "skin.png";
  }
}
