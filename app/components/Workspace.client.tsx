import { useEffect, useState, type ReactNode } from "react";
import { PonySkin, SkinDocument } from "@striped-skins/api";
import {
  StripedContextProvider,
  usePonyContext,
  useViewerPreferencesContext,
} from "./striped-viewer.client";
import { useLocation } from "react-router";
import {
  DocumentSession,
  markRecoveredDocument,
  useDocumentInfo,
  skinName,
} from "./studio/DocumentSession";
import { getSafeSkinUrl } from "../utils";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { IconButton } from "./studio/ui";
import { readSavedDocuments, recoverySnapshot, saveDocuments } from "../document-recovery";
import { StudioSkeleton } from "./studio/StudioSkeleton";
import { initialAntialiasing } from "../antialiasing";
async function restore() {
  const saved = await readSavedDocuments();
  const params = new URLSearchParams(location.search);
  const slot = (key: "first" | "second", param: string) => {
    try {
      const value = saved?.[key];
      if (!value || value.url !== params.get(param)) return PonySkin.DEFAULT;
      const skin = PonySkin.fromDocument(SkinDocument.restore(value.document));
      skin.sourceUrl = getSafeSkinUrl(params.get(param)) ?? undefined;
      // Old snapshots have no dirty flag; protect them conservatively until the project is saved.
      markRecoveredDocument(skin.document, value.dirty !== false, value.name);
      return skin;
    } catch {
      return PonySkin.DEFAULT;
    }
  };
  return {
    defaultPony: PonySkin.DEFAULT,
    firstPony: slot("first", "skin"),
    secondPony: slot("second", "second-skin"),
  };
}
function Autosave() {
  const [warning, setWarning] = useState(false);
  const [status, setStatus] = useState<"saving" | "saved" | "error">("saving");
  const [dismissed, setDismissed] = useState(false);
  const first = usePonyContext((s) => s.firstPony.skin),
    second = usePonyContext((s) => s.secondPony.skin),
    route = useLocation();
  const defaultURL = useViewerPreferencesContext((s) => s.defaultSkinUrl);
  const firstInfo = useDocumentInfo(first.document, skinName(first.sourceUrl));
  const secondInfo = useDocumentInfo(second.document, skinName(second.sourceUrl));
  useEffect(() => {
    if (first === PonySkin.DEFAULT && second === PonySkin.DEFAULT) return;
    const params = new URLSearchParams(route.search);
    const snapshot = (skin: PonySkin, key: string, dirty: boolean, name: string) => {
      const url = params.get(key);
      if (skin === PonySkin.DEFAULT || (url && skin.sourceUrl !== getSafeSkinUrl(url))) return null;
      if (
        !url &&
        skin.sourceUrl &&
        skin.sourceUrl !== defaultURL &&
        !skin.sourceUrl.startsWith("blob:")
      )
        return null;
      return { url, dirty, name, document: recoverySnapshot(skin.document) };
    };
    let active = true;
    const save = () => {
      // Copy pixels now; later edits must not alter a queued recovery write.
      void saveDocuments({
        first: snapshot(first, "skin", firstInfo.dirty, firstInfo.name),
        second: snapshot(second, "second-skin", secondInfo.dirty, secondInfo.name),
      })
        .then(() => {
          if (active) {
            setStatus("saved");
            setWarning(false);
            setDismissed(false);
          }
        })
        .catch(() => {
          if (active) {
            setStatus("error");
            setWarning(true);
          }
        });
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (active) setStatus("saving");
      clearTimeout(timer);
      timer = setTimeout(save, 300);
    };
    const a = first.document.subscribe(schedule),
      b = second.document.subscribe(schedule);
    const background = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", background);
    schedule();
    return () => {
      a();
      b();
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", background);
      save();
      active = false;
    };
  }, [
    first,
    second,
    route.search,
    defaultURL,
    firstInfo.dirty,
    secondInfo.dirty,
    firstInfo.name,
    secondInfo.name,
  ]);
  useEffect(() => {
    if (!firstInfo.dirty && !secondInfo.dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [firstInfo.dirty, secondInfo.dirty]);
  return (
    <>
      {firstInfo.dirty || secondInfo.dirty ? (
        <output className="autosave-status" data-testid="autosave-status">
          {status === "saving"
            ? "Локальная копия: сохранение…"
            : status === "saved"
              ? "Локальная копия сохранена"
              : "Локальная копия недоступна"}
        </output>
      ) : null}
      {warning && !dismissed ? (
        <section role="alert" className="recovery-warning">
          <p>
            Браузер не смог сохранить локальную копию. Сохраните проект .striped перед закрытием
            страницы.
          </p>
          <IconButton
            label="Закрыть предупреждение о сохранении"
            onClick={() => setDismissed(true)}
          >
            <XMarkIcon />
          </IconButton>
        </section>
      ) : null}
    </>
  );
}
export default function Workspace({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [initial, setInitial] = useState<Awaited<ReturnType<typeof restore>> | null>(null);
  useEffect(() => {
    let active = true;
    void restore().then((value) => {
      if (active) setInitial(value);
    });
    return () => {
      active = false;
    };
  }, []);
  if (!initial)
    return <StudioSkeleton mode={location.pathname.startsWith("/editor") ? "editor" : "viewer"} />;
  return (
    <StripedContextProvider
      ponyParams={initial}
      viewerPreferencesParams={{
        defaultSkinUrl: "/steve_pony.png",
        userOptions: {
          animations: !!(localStorage.getItem("viewer.options.animations") ?? true),
          antialiasing: initialAntialiasing(
            localStorage.getItem("viewer.options.antialiasing"),
            navigator.userAgent,
          ),
          smoothCamera: !!(localStorage.getItem("viewer.options.smoothCamera") ?? true),
          groundGrid: !!(localStorage.getItem("viewer.options.groundGrid") ?? true),
        },
      }}
    >
      <DocumentSession>
        <Autosave />
        {children}
      </DocumentSession>
    </StripedContextProvider>
  );
}
