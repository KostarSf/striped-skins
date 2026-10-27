import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PonySkin, loadSkinDocument } from "@striped-skins/api";
import { usePonyContext, useViewerPreferencesContext } from "./striped-viewer.client";
import { SkinEditor } from "./ModelLab.client";
import { getSafeSkinUrl } from "../utils";
export default function SkinEditorRoute() {
  const [params, setParams] = useSearchParams();
  const second = params.get("slot") === "second";
  const pony = usePonyContext((s) => (second ? s.secondPony : s.firstPony));
  const load = useViewerPreferencesContext((s) => (second ? s.setSecondSkin : s.setFirstSkin));
  const requested = useRef<string | null>(null),
    url = getSafeSkinUrl(params.get(second ? "second-skin" : "skin"));
  const [error, setError] = useState("");
  const loadError = useViewerPreferencesContext(
    (s) => (second ? s.secondSkinError : s.firstSkinError) ?? s.defaultSkinError,
  );
  const loading = useViewerPreferencesContext(
    (s) => (second ? s.loadingSecondSkin : s.loadingFirstSkin) || s.loadingDefaultSkin,
  );
  const importRequest = useRef(0);
  useEffect(() => {
    if (url && url !== pony.skin.sourceUrl && requested.current !== url) {
      requested.current = url;
      load(url);
    }
  }, [url, load, pony.skin]);
  const back = new URLSearchParams(params);
  back.delete("slot");
  return (
    <main className="flex h-[100svh] flex-col overflow-y-auto bg-zinc-950 text-zinc-100 lg:overflow-hidden">
      <header className="flex flex-wrap items-center gap-4 border-b border-zinc-700 px-5 py-3">
        <Link to={back.size ? `/?${back}` : "/"} className="text-sm text-orange-400">
          ← Просмотрщик
        </Link>
        <h1 className="text-base font-semibold">Редактор скина{second ? " · второй скин" : ""}</h1>
        <label className="text-sm">
          Открыть PNG{" "}
          <input
            aria-label="Открыть PNG"
            type="file"
            accept="image/png"
            className="max-w-56 text-xs"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const request = ++importRequest.current;
              const blob = URL.createObjectURL(file);
              try {
                const doc = await loadSkinDocument(blob);
                if (request !== importRequest.current) return;
                // The old URL may still be present while Router commits its transition.
                requested.current = url;
                pony.setSkin(PonySkin.fromDocument(doc));
                const next = new URLSearchParams(params);
                next.delete(second ? "second-skin" : "skin");
                setParams(next);
                setError("");
              } catch (reason) {
                if (request === importRequest.current) setError(String(reason));
              } finally {
                URL.revokeObjectURL(blob);
                e.target.value = "";
              }
            }}
          />
        </label>
      </header>
      {error || loadError ? (
        <p role="alert" className="text-red-300">
          {error || loadError}
        </p>
      ) : null}
      {loading ? <output className="px-5 text-sm">Загрузка скина…</output> : null}
      {pony.skin === PonySkin.DEFAULT ? (
        <output>Загрузка…</output>
      ) : (
        <SkinEditor key={`${second}:${pony.skin.document.id}`} skin={pony.skin.document} />
      )}
    </main>
  );
}
