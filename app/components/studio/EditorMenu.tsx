import { documentLabel } from "../../i18n/document-labels";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { SkinDocument } from "@striped-skins/api";
import { Button } from "./ui";

export function EditorMenu({
  document: skin,
  saving,
  onOpen,
  onSave,
  onExport,
}: {
  document: SkinDocument;
  saving: boolean;
  onOpen: () => void;
  onSave: () => void;
  onExport: () => void;
}) {
  const { t } = useTranslation();
  const host = useRef<HTMLElement>(null);
  useSyncExternalStore(skin.subscribe, skin.getSnapshot, skin.getSnapshot);
  const close = () =>
    host.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
  useEffect(() => {
    const pointer = (e: PointerEvent) => {
      if (!host.current?.contains(e.target as Node)) close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        host.current
          ?.querySelector<HTMLDetailsElement>("details[open]")
          ?.querySelector("summary")
          ?.focus();
        close();
      }
    };
    window.addEventListener("pointerdown", pointer);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", pointer);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !(e.ctrlKey || e.metaKey) ||
        e.code !== "KeyS" ||
        (e.target as HTMLElement).closest("dialog")
      )
        return;
      e.preventDefault();
      if (!saving) {
        (e.target as HTMLElement).blur();
        onSave();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onSave, saving]);
  const action = (callback: () => void) => () => {
    close();
    callback();
  };
  return (
    <nav className="editor-menubar" aria-label={t("menu.label")} ref={host}>
      <details name="editor-menu">
        <summary>{t("menu.file")}</summary>
        <div className="editor-menu-popup">
          <Button onClick={action(onOpen)}>{t("menu.open")}</Button>
          <Button disabled={saving} onClick={action(onSave)}>
            {t("menu.save")} <kbd>Ctrl/⌘ S</kbd>
          </Button>
          <Button disabled={saving} onClick={action(onExport)}>
            {t("menu.export")}
          </Button>
          <small>{t("menu.projectHint")}</small>
        </div>
      </details>
      <details name="editor-menu">
        <summary>{t("menu.edit")}</summary>
        <div className="editor-menu-popup">
          <Button disabled={!skin.canUndo} onClick={action(() => skin.undo())}>
            {t("history.undo")} {documentLabel(t, skin.undoLabel)}
          </Button>
          <Button disabled={!skin.canRedo} onClick={action(() => skin.redo())}>
            {t("history.redo")} {documentLabel(t, skin.redoLabel)}
          </Button>
        </div>
      </details>
    </nav>
  );
}
