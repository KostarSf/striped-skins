import { useEffect, useState, type ReactNode } from "react";
import { PonySkin, SkinDocument } from "@striped-skins/api";
import { StripedContextProvider, usePonyContext } from "./striped-viewer.client";
import { useLocation } from "react-router";
import { getSafeSkinUrl } from "../utils";
const KEY = "striped.editor.documents.v1";
type Saved = {
  first: null | { url: string | null; document: ReturnType<SkinDocument["snapshot"]> };
  second: null | { url: string | null; document: ReturnType<SkinDocument["snapshot"]> };
};
function restore() {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return;
    const saved = JSON.parse(text) as Saved,
      params = new URLSearchParams(location.search);
    const first =
        saved.first?.url === params.get("skin")
          ? PonySkin.fromDocument(SkinDocument.restore(saved.first.document))
          : PonySkin.DEFAULT,
      second =
        saved.second?.url === params.get("second-skin")
          ? PonySkin.fromDocument(SkinDocument.restore(saved.second.document))
          : PonySkin.DEFAULT;
    if (first !== PonySkin.DEFAULT)
      first.sourceUrl = getSafeSkinUrl(params.get("skin")) ?? undefined;
    if (second !== PonySkin.DEFAULT)
      second.sourceUrl = getSafeSkinUrl(params.get("second-skin")) ?? undefined;
    return { defaultPony: PonySkin.DEFAULT, firstPony: first, secondPony: second };
  } catch {
    return;
  }
}
function Autosave() {
  const [warning, setWarning] = useState(false);
  const first = usePonyContext((s) => s.firstPony.skin),
    second = usePonyContext((s) => s.secondPony.skin),
    route = useLocation();
  useEffect(() => {
    if (first === PonySkin.DEFAULT && second === PonySkin.DEFAULT) return;
    const params = new URLSearchParams(route.search);
    const snapshot = (skin: PonySkin, key: string) => {
      const url = params.get(key);
      if (skin === PonySkin.DEFAULT || (url && skin.sourceUrl !== getSafeSkinUrl(url))) return null;
      return { url, document: skin.document.snapshot() };
    };
    const save = () => {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            first: snapshot(first, "skin"),
            second: snapshot(second, "second-skin"),
          }),
        );
        setWarning(false);
      } catch {
        setWarning(true);
      }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 300);
    };
    const a = first.document.subscribe(schedule),
      b = second.document.subscribe(schedule);
    window.addEventListener("pagehide", save);
    schedule();
    return () => {
      a();
      b();
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [first, second, route.search]);
  return warning ? (
    <p role="alert" className="fixed bottom-0 left-0 z-50 bg-amber-950 p-3 text-sm text-amber-100">
      Браузер не смог сохранить локальную копию. Скачайте PNG в редакторе перед закрытием страницы.
    </p>
  ) : null;
}
export default function Workspace({ children }: { children: ReactNode }) {
  const [initial] = useState(restore);
  return (
    <StripedContextProvider
      ponyParams={initial}
      viewerPreferencesParams={{
        defaultSkinUrl: "/steve_pony.png",
        userOptions: {
          animations: !!(localStorage.getItem("viewer.options.animations") ?? true),
          antialiasing: !!(localStorage.getItem("viewer.options.antialiasing") ?? true),
          smoothCamera: !!(localStorage.getItem("viewer.options.smoothCamera") ?? true),
        },
      }}
    >
      <Autosave />
      {children}
    </StripedContextProvider>
  );
}
