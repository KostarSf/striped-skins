import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { decodeSkinMetadata, type SkinDocument } from "@striped-skins/api";
import type { PreviewSettings } from "@striped-skins/models";
import { useViewerPreferencesContext } from "../striped-viewer.client";
import { ModelViewport } from "./ModelViewport";
import { SkinSettings } from "./SkinSettings";
import { useDocumentSetting } from "./useDocumentSetting";
import { Button, PanelHeading } from "./ui";
import { inspectorTabs } from "./inspector-tabs";

const empty = new Set<string>();

/** Large skins never mount raster tools, layer thumbnails or palette extraction. */
export function SkinParametersWorkspace({
  document,
  preview,
  onPreview,
  onFileDrop,
}: {
  document: SkinDocument;
  preview: PreviewSettings;
  onPreview: (patch: Partial<PreviewSettings>) => void;
  onFileDrop: (file: File) => void;
}) {
  const { t } = useTranslation();
  const defaults = useViewerPreferencesContext((s) => s.userOptions);
  const [options] = useDocumentSetting(document, "viewOptions", { ...defaults });
  const [slim, setSlim] = useDocumentSetting(document, "slim", decodeSkinMetadata(document).slim);
  useEffect(() => {
    document.initializeWorkspace("preview", { ...preview });
    inspectorTabs.set(document, "skin");
  }, [document, preview]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest("input,select,textarea,dialog") ||
        !(event.ctrlKey || event.metaKey) ||
        event.code !== "KeyZ"
      )
        return;
      event.preventDefault();
      if (event.shiftKey) document.redo();
      else document.undo();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [document]);
  return (
    <>
      <output className="studio-notice parameters-notice">{t("skin.parametersOnly")}</output>
      <div className="skin-parameters-workspace">
        <ModelViewport
          persistWorkspace
          document={document}
          preview={preview}
          overrides={{ slim }}
          hidden={empty}
          painting={false}
          color={[0, 0, 0, 255]}
          activePart={null}
          animate={options.animations}
          antialiasing={options.antialiasing}
          smoothCamera={options.smoothCamera}
          groundGrid={options.groundGrid}
          shading="flat"
          onFileDrop={onFileDrop}
        />
        <aside className="studio-panel parameters-inspector" aria-label={t("skin.settings")}>
          <PanelHeading title={t("skin.settings")} description={t("skin.metadata")} />
          <div className="inline-controls">
            <Button
              aria-label={t("history.undoAction")}
              disabled={!document.canUndo}
              onClick={() => document.undo()}
            >
              {t("history.undo")}
            </Button>
            <Button
              aria-label={t("history.redoAction")}
              disabled={!document.canRedo}
              onClick={() => document.redo()}
            >
              {t("history.redo")}
            </Button>
          </div>
          <SkinSettings
            document={document}
            preview={preview}
            onPreview={onPreview}
            slim={slim}
            onSlim={setSlim}
          />
        </aside>
      </div>
      <footer className="studio-status">
        <output data-testid="document-status">
          {document.width} × {document.height} px · PNG
        </output>
      </footer>
    </>
  );
}
