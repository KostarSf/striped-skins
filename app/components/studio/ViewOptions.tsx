import { useEffect, useRef } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useViewerPreferencesContext } from "../striped-viewer.client";
import { Toggle } from "./ui";

/** The same persisted display preferences in the viewer and editor. */
export function ViewOptions() {
  const options = useViewerPreferencesContext((s) => s.userOptions);
  const setOptions = useViewerPreferencesContext((s) => s.setUserOptions);
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
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details ref={host} className="view-options">
      <summary aria-label="Параметры вида" title="Параметры вида">
        <Cog6ToothIcon />
        <span>Вид</span>
      </summary>
      <div className="studio-panel">
        {(
          [
            ["animations", "Анимации"],
            ["antialiasing", "Сглаживание"],
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
