import { errorMessage } from "../../i18n/errors";
import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AdjustmentsHorizontalIcon, ScaleIcon } from "@heroicons/react/24/outline";
import {
  PonySkin,
  SkinError,
  decodeSkinMetadata,
  loadSkinDocument,
  decodeSkinProject,
  type SkinDocument,
} from "@striped-skins/api";
import { usePonyContext, useViewerPreferencesContext } from "../striped-viewer.client";
import { getSafeSkinUrl } from "../../utils";
import { StudioHeader } from "./StudioHeader";
import { ImportDialog } from "./ImportDialog";
import { skinName, useDocumentInfo } from "./DocumentSession";
import { ModelViewport } from "./ModelViewport";
import { SkinSettings } from "./SkinSettings";
import { SkinParametersWorkspace } from "./SkinParametersWorkspace";
import { Button, PanelHeading } from "./ui";
import { StudioSkeleton } from "./StudioSkeleton";
const EditorWorkspace = lazy(() => import("./EditorWorkspace"));
const empty = new Set<string>();
export default function Studio({ mode }: { mode: "viewer" | "editor" }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const first = usePonyContext((s) => s.firstPony),
    second = usePonyContext((s) => s.secondPony);
  const defaultSkin = usePonyContext((s) => s.defaultPony.skin);
  const preferences = useViewerPreferencesContext((s) => s);
  const isSecond = params.get("slot") === "second",
    pony = isSecond ? second : first,
    document = pony.skin.document;
  const info = useDocumentInfo(document, skinName(pony.skin.sourceUrl));
  const [importRequest, setImportRequest] = useState<{ file?: File } | null>(null),
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
  const previousURLs = useRef({ first: firstURL, second: secondURL });
  useEffect(() => {
    if (secondURL) setMode("side-by-side");
  }, [secondURL, setMode]);
  useEffect(() => {
    for (const [slot, url] of [
      ["first", firstURL],
      ["second", secondURL],
    ] as const) {
      const previousURL = previousURLs.current[slot];
      previousURLs.current[slot] = url;
      const item = latest.current[slot];
      let safe = getSafeSkinUrl(url);
      if (previousURL !== null && url === null) {
        // Cancel an in-flight URL load. Local imports install a document without a
        // source URL; preserve those while resetting documents loaded from a URL.
        generation.current[slot]++;
        requested.current[slot] = "";
        if (item.skin.sourceUrl && !item.skin.sourceUrl.startsWith("blob:"))
          safe = "/steve_pony.png";
      }
      if (!safe) continue;
      if (item.skin.sourceUrl === safe) {
        requested.current[slot] = safe;
        continue;
      }
      if (requested.current[slot] === safe) continue;
      requested.current[slot] = safe;
      const id = ++generation.current[slot],
        previous = item.skin;
      setPending((v) => v + 1);
      PonySkin.fromUrl(safe, t("layers.base"))
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
            setError(t("errors.openSkin", { reason: errorMessage(t, reason) }));
        })
        .finally(() => {
          if (mounted.current) setPending((v) => Math.max(0, v - 1));
        });
    }
  }, [firstURL, secondURL, first.skin, second.skin, register, t]);
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
    if (/\.striped$/i.test(file.name)) {
      if (file.size > 64 * 1024 * 1024)
        throw new SkinError("projectArchiveLimit", t("errors.projectArchiveLimit"));
      const document = decodeSkinProject(new Uint8Array(await file.arrayBuffer()));
      install(document, file.name);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      install(await loadSkinDocument(url, t("layers.base")), file.name);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const importURL = async (url: string) => {
    const safe = getSafeSkinUrl(url)!;
    install(await loadSkinDocument(safe, t("layers.base")), skinName(safe), url);
  };
  const saveProject = async () => {
    setSaving(true);
    try {
      await info.saveProject();
    } finally {
      setSaving(false);
    }
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
  const [hasLoaded, setHasLoaded] = useState(() => pony.skin !== PonySkin.DEFAULT);
  useEffect(() => {
    if (!loading) setHasLoaded(true);
  }, [loading]);
  const Workspace = document.canEditTexture ? EditorWorkspace : SkinParametersWorkspace;
  if (!hasLoaded && loading && !error && !preferences.defaultSkinError)
    return <StudioSkeleton mode={mode} />;
  return (
    <main className={`studio-app ${mode === "editor" ? "editor-app" : "viewer-app"}`}>
      <StudioHeader
        mode={mode}
        second={isSecond}
        name={info.name}
        dirty={info.dirty}
        saving={saving}
        document={document}
        onSave={() => void saveProject().catch((e) => setError(errorMessage(t, e)))}
        onImport={() => setImportRequest({})}
        onExport={() => void exportPNG().catch((e) => setError(errorMessage(t, e)))}
      />
      {error || preferences.defaultSkinError ? (
        <div className="studio-error" role="alert">
          {error || t("errors.loadSkin")}
        </div>
      ) : null}
      {mode === "editor" ? (
        <Suspense fallback={<StudioSkeleton mode="editor" bodyOnly />}>
          <Workspace
            key={`${document.id}/${document.width}/${document.height}`}
            document={document}
            preview={document.getWorkspace("preview", pony.preview)}
            onPreview={(patch) => {
              const next = { ...document.getWorkspace("preview", pony.preview), ...patch };
              document.setWorkspace("preview", next);
              pony.setPreview(next);
            }}
            onFileDrop={(file) => setImportRequest({ file })}
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
          onImport={() => setImportRequest({})}
          onFileDrop={(file) => setImportRequest({ file })}
          onExport={() => void exportPNG().catch((e) => setError(errorMessage(t, e)))}
        />
      )}
      {loading ? (
        <output className="studio-loading-badge">
          <span className="loading-spinner" />
          {t("loading.skin")}
        </output>
      ) : null}
      <ImportDialog
        open={importRequest !== null}
        initialFile={importRequest?.file}
        onClose={() => setImportRequest(null)}
        onFile={importFile}
        onURL={importURL}
        dirty={info.dirty}
        onExport={saveProject}
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
  onFileDrop,
}: {
  document: SkinDocument;
  isSecond: boolean;
  setSlot: (slot: "first" | "second") => void;
  onImport: () => void;
  onExport: () => void;
  onFileDrop: (file: File) => void;
}) {
  const { t } = useTranslation();
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
          onFileDrop={onFileDrop}
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
          groundGrid={prefs.userOptions.groundGrid}
          shading="studio"
          title={null}
          headerActions={
            <div className="viewer-top-actions">
              <Button
                title={t("viewer.compareSkins")}
                aria-label={t("viewer.compareSkins")}
                aria-pressed={comparison}
                onClick={() => prefs.setMode(comparison ? "first-model" : "side-by-side")}
              >
                <ScaleIcon />
                <span>{t("viewer.compare")}</span>
              </Button>
              <Button
                title={t("skin.settings")}
                aria-label={t("skin.settings")}
                aria-expanded={settings}
                onClick={() => setSettings((v) => !v)}
              >
                <AdjustmentsHorizontalIcon />
                <span>{t("skin.settings")}</span>
              </Button>
            </div>
          }
        >
          {comparison ? (
            <div className="comparison-picker">
              <Button
                aria-pressed={!isSecond}
                onClick={() => {
                  setSlot("first");
                }}
              >
                {t("viewer.skin1")}
              </Button>
              <Button
                aria-pressed={isSecond}
                onClick={() => {
                  setSlot("second");
                }}
              >
                {t("viewer.skin2")}
              </Button>
              <Button onClick={onImport}>
                {t(isSecond ? "viewer.openSecond" : "viewer.openFirst")}
              </Button>
              <Link
                className="studio-button"
                aria-label={t("viewer.editSecond")}
                to={`/editor?${editSecond}`}
              >
                {t("viewer.editSecond")}
              </Link>
            </div>
          ) : null}
          {settings ? (
            <aside className="quick-settings studio-panel" aria-label={t("skin.settings")}>
              <PanelHeading
                title={t("skin.settings")}
                description={t("skin.liveHint")}
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
                  {t("file.saveSkinPng")}
                </Button>
                <small>{t("file.downloadHint")}</small>
              </div>
            </aside>
          ) : null}
        </ModelViewport>
      </div>
      <footer className="studio-status">
        <span>
          {skin.width} × {skin.height} px · PNG
        </span>
        <span>
          {t("viewer.status")}
          {comparison ? t("viewer.comparisonSuffix") : ""}
        </span>
        <span>{t("viewport.fitShortcut")}</span>
      </footer>
    </>
  );
}
