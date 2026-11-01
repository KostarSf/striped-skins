import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ArrowDownTrayIcon, FolderOpenIcon } from "@heroicons/react/24/outline";
import type { SkinDocument } from "@striped-skins/api";
import { EditorMenu } from "./EditorMenu";
import { Button } from "./ui";
export function StudioHeader({
  mode,
  second,
  name,
  dirty,
  onImport,
  onExport,
  saving,
  document,
  onSave,
}: {
  mode: "viewer" | "editor";
  second: boolean;
  name: string;
  dirty: boolean;
  onImport: () => void;
  onExport: () => void;
  saving: boolean;
  document?: SkinDocument;
  onSave?: () => void;
}) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const editor = new URLSearchParams(params);
  editor.set("slot", second ? "second" : "first");
  const viewer = new URLSearchParams(params);
  viewer.delete("slot");
  return (
    <>
      <header className="studio-header">
        <Link
          className="studio-brand"
          to={viewer.size ? `/?${viewer}` : "/"}
          aria-label={t("nav.brand")}
        >
          <img
            className="brand-mark"
            src="/icon.png"
            width={28}
            height={28}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <span>Striped Skins</span>
        </Link>
        <nav className="mode-tabs" aria-label={t("nav.mode")}>
          <Link
            aria-label={t("nav.backToViewer")}
            aria-current={mode === "viewer" ? "page" : undefined}
            to={viewer.size ? `/?${viewer}` : "/"}
          >
            {t("nav.viewer")}
          </Link>
          <Link
            aria-label={second ? t("viewer.editSecond") : t("nav.edit")}
            aria-current={mode === "editor" ? "page" : undefined}
            to={`/editor?${editor}`}
          >
            {t("nav.editor")}
          </Link>
        </nav>
        <div className="document-name">
          <span className="document-dot" data-dirty={dirty} />
          <div>
            <strong title={name}>{name}</strong>
            <small aria-live="polite">
              {dirty ? t("document.dirty") : t("document.clean")}
              {second ? t("viewer.secondSkinSuffix") : ""}
            </small>
          </div>
        </div>
        <div className="file-actions">
          <Button aria-label={t("file.open")} title={t("file.openSkin")} onClick={onImport}>
            <FolderOpenIcon />
            <span>{t("file.open")}</span>
          </Button>
          {mode === "editor" && onSave ? (
            <Button
              tone="primary"
              data-action="save-project"
              aria-label={t("file.saveProject")}
              disabled={saving}
              onClick={onSave}
            >
              {t("file.saveProject")}
            </Button>
          ) : null}
          <Button
            tone={mode === "editor" ? "neutral" : "primary"}
            data-action="export-png"
            aria-label={t("file.downloadPng")}
            title={saving ? t("file.saving") : t("file.exportPng")}
            disabled={saving}
            onClick={onExport}
          >
            <ArrowDownTrayIcon />
            <span>{saving ? t("file.saving") : t("file.exportPng")}</span>
          </Button>
        </div>
      </header>
      {mode === "editor" && document && onSave ? (
        <EditorMenu
          document={document}
          saving={saving}
          onOpen={onImport}
          onSave={onSave}
          onExport={onExport}
        />
      ) : null}
    </>
  );
}
