import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useViewerPreferencesContext } from "../striped-viewer.client";
import { Toggle } from "./ui";
import type { SkinDocument } from "@striped-skins/api";
import type { AntialiasingMode } from "@striped-skins/viewer";
import { useFetcher, useRouteLoaderData } from "react-router";
import type { loader, action } from "../../root";

/** The same persisted display preferences in the viewer and editor. */
export function ViewOptions({ document }: { document?: SkinDocument } = {}) {
  const { t } = useTranslation();
  const root = useRouteLoaderData<typeof loader>("root");
  const language = useFetcher<typeof action>();
  const preference = language.formData?.get("language") ?? root?.languagePreference ?? "auto";
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
      <summary aria-label={t("view.settings")} title={t("view.settings")}>
        <Cog6ToothIcon />
        <span>{t("view.title")}</span>
      </summary>
      <div className="studio-panel">
        <language.Form method="post" action="/" preventScrollReset>
          <input type="hidden" name="intent" value="language" />
          <label className="aa-option">
            <span>{t("view.language")}</span>
            <select
              name="language"
              aria-label={t("view.language")}
              value={String(preference)}
              onChange={(event) => void language.submit(event.currentTarget.form)}
            >
              <option value="auto">{t("view.languageAuto")}</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
        </language.Form>
        <label className="aa-option">
          <span>{t("view.antialiasing")}</span>
          <select
            aria-label={t("view.antialiasing")}
            value={options.antialiasing}
            onChange={(event) => {
              const value = event.target.value as AntialiasingMode;
              setOptions({ antialiasing: value });
              localStorage.setItem("viewer.options.antialiasing", value);
            }}
          >
            <option value="off">{t("common.off")}</option>
            <option value="msaa">MSAA</option>
            <option value="smaa">SMAA</option>
          </select>
        </label>
        {(
          [
            ["animations", t("view.animations")],
            ["smoothCamera", t("view.smoothCamera")],
            ["groundGrid", t("view.groundGrid")],
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
