import { useEffect, useRef } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useViewerPreferencesContext } from "../striped-viewer.client";
import { Toggle } from "./ui";
import type { SkinDocument } from "@striped-skins/api";
import type { AntialiasingMode } from "@striped-skins/viewer";

/** The same persisted display preferences in the viewer and editor. */
export function ViewOptions({ document }: { document?: SkinDocument } = {}) {
  const defaults = useViewerPreferencesContext((s) => s.userOptions);
  const setDefaults = useViewerPreferencesContext((s) => s.setUserOptions);
  const options = document?.getWorkspace("viewOptions", { ...defaults }) ?? defaults;
  const setOptions = (patch: Partial<typeof defaults>) => {
    if (document) document.setWorkspace("viewOptions", { ...options, ...patch });
    setDefaults(patch);
  };
  const host = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (host.current && !host.current.contains(e.target as Node)) host.current.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && host.current?.open) {
        host.current.open = false;
        host.current.querySelector("summary")?.focus();
      }
    };
    globalThis.document.addEventListener("pointerdown", outside);
    globalThis.document.addEventListener("keydown", escape);
    return () => {
      globalThis.document.removeEventListener("pointerdown", outside);
      globalThis.document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details ref={host} className="view-options">
      <summary aria-label="Параметры вида" title="Параметры вида">
        <Cog6ToothIcon />
        <span>Вид</span>
      </summary>
      <div className="studio-panel">
        <label className="aa-option">
          <span>Сглаживание</span>
          <select
            aria-label="Сглаживание"
            value={options.antialiasing}
            onChange={(event) => {
              const value = event.target.value as AntialiasingMode;
              setOptions({ antialiasing: value });
              localStorage.setItem("viewer.options.antialiasing", value);
            }}
          >
            <option value="off">Выкл</option>
            <option value="msaa">MSAA</option>
            <option value="smaa">SMAA</option>
          </select>
        </label>
        {(
          [
            ["animations", "Анимации"],
            ["smoothCamera", "Плавная камера"],
            ["groundGrid", "Сетка под моделью"],
          ] as const
        ).map(([id, label]) => (
          <Toggle
            key={id}
            label={label}
            checked={options[id]}
            onChange={(value) => {
              setOptions({ [id]: value });
              localStorage.setItem(`viewer.options.${id}`, value ? "on" : "");
            }}
          />
        ))}
      </div>
    </details>
  );
}
