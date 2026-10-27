import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AdjustmentsHorizontalIcon, ScaleIcon } from "@heroicons/react/24/outline";
import {
  PonySkin,
  decodeSkinMetadata,
  loadSkinDocument,
  type SkinDocument,
} from "@striped-skins/api";
import { usePonyContext, useViewerPreferencesContext } from "../striped-viewer.client";
import { getSafeSkinUrl } from "../../utils";
import { StudioHeader } from "./StudioHeader";
import { ImportDialog } from "./ImportDialog";
import { skinName, useDocumentInfo } from "./DocumentSession";
import { ModelViewport } from "./ModelViewport";
import { SkinSettings } from "./SkinSettings";
import { Button, PanelHeading } from "./ui";
const EditorWorkspace = lazy(() => import("./EditorWorkspace"));
const empty = new Set<string>();
export default function Studio({ mode }: { mode: "viewer" | "editor" }) {
  const [params, setParams] = useSearchParams();
  const first = usePonyContext((s) => s.firstPony),
    second = usePonyContext((s) => s.secondPony);
  const defaultSkin = usePonyContext((s) => s.defaultPony.skin);
  const preferences = useViewerPreferencesContext((s) => s);
  const isSecond = params.get("slot") === "second",
    pony = isSecond ? second : first,
    document = pony.skin.document;
  const info = useDocumentInfo(document, skinName(pony.skin.sourceUrl));
  const [importOpen, setImportOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(0);
  const requested = useRef<Record<string, string>>({}),
    generation = useRef({ first: 0, second: 0 }),
    mounted = useRef(true);
  const latest = useRef({ first, second });
  latest.current = { first, second };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { setMode } = preferences;
  const { register } = info;
  const firstURL = params.get("skin"),
    secondURL = params.get("second-skin");
  useEffect(() => {
    if (secondURL) setMode("side-by-side");
  }, [secondURL, setMode]);
  useEffect(() => {
    for (const [slot, url] of [
      ["first", firstURL],
      ["second", secondURL],
    ] as const) {
      const safe = getSafeSkinUrl(url);
      if (!safe) continue;
      const item = latest.current[slot];
      if (item.skin.sourceUrl === safe) {
        requested.current[slot] = safe;
        continue;
      }
      if (requested.current[slot] === safe) continue;
      requested.current[slot] = safe;
      const id = ++generation.current[slot],
        previous = item.skin;
      setPending((v) => v + 1);
      PonySkin.fromUrl(safe)
        .then((skin) => {
          if (!mounted.current || generation.current[slot] !== id) return;
          const current = latest.current[slot].skin;
          if (
            current !== previous &&
            !(previous === PonySkin.DEFAULT && current.sourceUrl === "/steve_pony.png")
          )
            return;
          register(skin.document, skinName(safe));
          latest.current[slot].setSkin(skin);
          setError("");
        })
        .catch((reason) => {
          if (mounted.current && generation.current[slot] === id)
            setError(`Не удалось открыть скин: ${String(reason)}`);
        })
        .finally(() => {
          if (mounted.current) setPending((v) => Math.max(0, v - 1));
        });
    }
  }, [firstURL, secondURL, first.skin, second.skin, register]);
  const install = (doc: SkinDocument, name: string, url?: string) => {
    const slot = isSecond ? "second" : "first";
    generation.current[slot]++;
    // Router may still render the old URL for one transition; suppress its reload.
    requested.current[slot] = getSafeSkinUrl(params.get(isSecond ? "second-skin" : "skin")) ?? "";
    const skin = PonySkin.fromDocument(doc);
    skin.sourceUrl = url ? (getSafeSkinUrl(url) ?? undefined) : undefined;
    info.register(doc, name);
    pony.setSkin(skin);
    const next = new URLSearchParams(params),
      key = isSecond ? "second-skin" : "skin";
    if (url && /^https?:/.test(url)) next.set(key, url);
    else next.delete(key);
    setParams(next);
    setError("");
  };
  const importFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      install(await loadSkinDocument(url), file.name);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const importURL = async (url: string) => {
    const safe = getSafeSkinUrl(url)!;
    install(await loadSkinDocument(safe), skinName(safe), url);
  };
  const exportPNG = async () => {
    setSaving(true);
    try {
      await info.exportPNG();
    } finally {
      setSaving(false);
    }
  };
  const loading = pending > 0 || pony.skin === PonySkin.DEFAULT || preferences.loadingDefaultSkin;
  return (
    <main className={`studio-app ${mode === "editor" ? "editor-app" : "viewer-app"}`}>
      <StudioHeader
        mode={mode}
        second={isSecond}
        name={info.name}
        dirty={info.dirty}
        saving={saving}
        onImport={() => setImportOpen(true)}
        onExport={() => void exportPNG().catch((e) => setError(String(e)))}
      />
      {error || preferences.defaultSkinError ? (
        <div className="studio-error" role="alert">
          {error || preferences.defaultSkinError}
        </div>
      ) : null}
      {mode === "editor" ? (
        <Suspense fallback={<div className="studio-loading">Загрузка редактора…</div>}>
          <EditorWorkspace
            key={document.id}
            document={document}
            preview={pony.preview}
            onPreview={pony.setPreview}
          />
        </Suspense>
      ) : (
        <ViewerWorkspace
          document={document}
          isSecond={isSecond}
          setSlot={(value) => {
            const next = new URLSearchParams(params);
            next.set("slot", value);
            setParams(next);
          }}
          onImport={() => setImportOpen(true)}
          onExport={() => void exportPNG().catch((e) => setError(String(e)))}
        />
      )}
      {loading ? (
        <output className="studio-loading-badge">
          <span className="loading-spinner" />
          Загрузка скина…
        </output>
      ) : null}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onFile={importFile}
        onURL={importURL}
        dirty={info.dirty}
        onExport={exportPNG}
        second={isSecond}
      />
      <span hidden data-default-loaded={defaultSkin !== PonySkin.DEFAULT} />
    </main>
  );
}
function ViewerWorkspace({
  document: skin,
  isSecond,
  setSlot,
  onImport,
  onExport,
}: {
  document: SkinDocument;
  isSecond: boolean;
  setSlot: (slot: "first" | "second") => void;
  onImport: () => void;
  onExport: () => void;
}) {
  const [settings, setSettings] = useState(false),
    [slimBySlot, setSlimBySlot] = useState<{ first?: boolean; second?: boolean }>({});
  const first = usePonyContext((s) => s.firstPony),
    second = usePonyContext((s) => s.secondPony),
    prefs = useViewerPreferencesContext((s) => s);
  const selected = isSecond ? second : first,
    meta = decodeSkinMetadata(skin),
    comparison = prefs.mode === "side-by-side";
  const [params] = useSearchParams();
  const editSecond = new URLSearchParams(params);
  editSecond.set("slot", "second");
  const slim = slimBySlot[isSecond ? "second" : "first"];
  const visibleSkin = comparison ? first.skin.document : skin;
  return (
    <>
      <div className="viewer-content">
        <ModelViewport
          document={visibleSkin}
          comparison={
            comparison
              ? {
                  document: second.skin.document,
                  preview: second.preview,
                  overrides:
                    slimBySlot.second === undefined ? undefined : { slim: slimBySlot.second },
                }
              : undefined
          }
          preview={comparison ? first.preview : selected.preview}
          overrides={
            comparison
              ? slimBySlot.first === undefined
                ? undefined
                : { slim: slimBySlot.first }
              : slim === undefined
                ? undefined
                : { slim }
          }
          hidden={empty}
          painting={false}
          color={[0, 0, 0, 255]}
          activePart={null}
          animate={prefs.userOptions.animations}
          antialiasing={prefs.userOptions.antialiasing}
          smoothCamera={prefs.userOptions.smoothCamera}
          title={null}
        >
          <div className="viewer-top-actions">
            <Button
              title="Comparison mode"
              aria-label="Сравнить скины"
              aria-pressed={comparison}
              onClick={() => prefs.setMode(comparison ? "first-model" : "side-by-side")}
            >
              <ScaleIcon />
              <span>Сравнить</span>
            </Button>
            <Button aria-expanded={settings} onClick={() => setSettings((v) => !v)}>
              <AdjustmentsHorizontalIcon />
              <span>Параметры скина</span>
            </Button>
          </div>
          {comparison ? (
            <div className="comparison-picker">
              <Button
                aria-pressed={!isSecond}
                onClick={() => {
                  setSlot("first");
                }}
              >
                Скин 1
              </Button>
              <Button
                aria-pressed={isSecond}
                onClick={() => {
                  setSlot("second");
                }}
              >
                Скин 2
              </Button>
              <Button onClick={onImport}>Открыть {isSecond ? "второй" : "первый"}</Button>
              <Link
                className="studio-button"
                aria-label="Редактировать второй"
                to={`/editor?${editSecond}`}
              >
                Редактировать второй
              </Link>
            </div>
          ) : null}
          {settings ? (
            <aside className="quick-settings studio-panel" aria-label="Параметры скина">
              <PanelHeading
                title="Параметры скина"
                description="Изменения сразу видны на модели"
                onClose={() => setSettings(false)}
              />
              <SkinSettings
                document={skin}
                preview={selected.preview}
                onPreview={selected.setPreview}
                slim={slim ?? meta.slim}
                onSlim={(value) =>
                  setSlimBySlot((v) => ({ ...v, [isSecond ? "second" : "first"]: value }))
                }
              />
              <div className="quick-save">
                <Button tone="primary" onClick={onExport}>
                  Сохранить скин · PNG
                </Button>
                <small>Скачает скин с выбранными параметрами</small>
              </div>
            </aside>
          ) : null}
        </ModelViewport>
      </div>
      <footer className="studio-status">
        <span>
          {skin.width} × {skin.height} px · PNG
        </span>
        <span>Просмотр скина{comparison ? " · сравнение" : ""}</span>
        <span>F — вписать в окно</span>
      </footer>
    </>
  );
}
