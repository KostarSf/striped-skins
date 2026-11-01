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
    <nav className="editor-menubar" aria-label="Меню редактора" ref={host}>
      <details name="editor-menu">
        <summary>Файл</summary>
        <div className="editor-menu-popup">
          <Button onClick={action(onOpen)}>Открыть PNG или проект…</Button>
          <Button disabled={saving} onClick={action(onSave)}>
            Сохранить проект… <kbd>Ctrl/⌘ S</kbd>
          </Button>
          <Button disabled={saving} onClick={action(onExport)}>
            Экспортировать PNG…
          </Button>
          <small>.striped сохраняет слои, историю и настройки.</small>
        </div>
      </details>
      <details name="editor-menu">
        <summary>Правка</summary>
        <div className="editor-menu-popup">
          <Button disabled={!skin.canUndo} onClick={action(() => skin.undo())}>
            Отменить {skin.undoLabel ?? ""}
          </Button>
          <Button disabled={!skin.canRedo} onClick={action(() => skin.redo())}>
            Повторить {skin.redoLabel ?? ""}
          </Button>
        </div>
      </details>
    </nav>
  );
}
