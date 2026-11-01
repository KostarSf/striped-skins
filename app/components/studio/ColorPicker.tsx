import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { HexInput } from "./ui";

const historyKey = "striped-skins:recent-colors";
const validHex = /^#[\da-f]{6}$/i;
function readHistory(): string[] {
  try {
    const colors: unknown = JSON.parse(localStorage.getItem(historyKey) ?? "[]");
    return Array.isArray(colors)
      ? [
          ...new Set(
            colors
              .filter((c): c is string => typeof c === "string" && validHex.test(c))
              .map((c) => c.toLowerCase()),
          ),
        ].slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

export function ColorPicker({
  value,
  onChange,
  label,
  heading,
  palette = [],
  className = "",
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
  heading?: string;
  palette?: readonly string[];
  className?: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState(value);
  const [recent, setRecent] = useState<string[]>([]);
  const normalized = value.toLowerCase();
  const swatches = [...new Set(palette.map((c) => c.toLowerCase()))].filter((c) =>
    validHex.test(c),
  );
  const position = useCallback(() => {
    const menu = popup.current,
      button = trigger.current;
    if (!menu || !button) return;
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0,
      top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? innerWidth,
      height = viewport?.height ?? innerHeight;
    const rect = button.getBoundingClientRect();
    const menuWidth = Math.min(304, width - 16);
    menu.style.width = `${menuWidth}px`;
    menu.style.maxHeight = `${height - 16}px`;
    const menuHeight = Math.min(menu.scrollHeight + 2, height - 16);
    const below = rect.bottom + 8;
    menu.style.left = `${Math.max(left + 8, Math.min(rect.left, left + width - menuWidth - 8))}px`;
    menu.style.top = `${Math.max(top + 8, Math.min(below + menuHeight <= top + height - 8 ? below : rect.top - menuHeight - 8, top + height - menuHeight - 8))}px`;
  }, []);
  useEffect(() => {
    if (!open) return;
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open, position, recent.length, swatches.length]);
  useEffect(() => {
    if (open)
      popup.current
        ?.querySelector<HTMLButtonElement>(".color-picker-close")
        ?.focus({ preventScroll: true });
  }, [open]);
  const close = () => {
    popup.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  };
  const choose = (color: string) => onChange(color.toLowerCase());
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`color-picker-trigger ${className}`}
        aria-label={label}
        title={`${label}: ${value.toUpperCase()}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        data-color={normalized}
        style={{ backgroundColor: value }}
        onClick={() => {
          if (open) close();
          else {
            setOriginal(value);
            // Dismissing another picker saves its final color synchronously.
            popup.current?.showPopover();
            setRecent(readHistory());
            position();
          }
        }}
      />
      <dialog
        ref={popup}
        id={id}
        popover="auto"
        className="color-picker-popup"
        aria-label={t("colors.dialog", { label: label })}
        onToggle={(event) => setOpen(event.newState === "open")}
        onBeforeToggle={(event) => {
          if (event.newState === "closed" && normalized !== original.toLowerCase()) {
            try {
              localStorage.setItem(
                historyKey,
                JSON.stringify(
                  [normalized, ...readHistory().filter((c) => c !== normalized)].slice(0, 12),
                ),
              );
            } catch {
              // Picking colors also works when browser storage is unavailable.
            }
          }
        }}
        onKeyDown={(event) => {
          // Keep editor shortcuts and an enclosing mobile dialog out of the picker.
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
      >
        {open ? (
          <>
            <div className="color-picker-heading">
              <strong>{heading ?? label}</strong>
              <button
                type="button"
                className="color-picker-close"
                aria-label={t("colors.close")}
                onClick={close}
              >
                ×
              </button>
            </div>
            <HexColorPicker color={value} onChange={choose} aria-label={t("colors.spectrum")} />
            <div className="color-picker-values">
              <label htmlFor={`${id}-hex`}>
                HEX
                <HexInput
                  id={`${id}-hex`}
                  value={value}
                  onChange={choose}
                  label={t("colors.selectedHex")}
                />
              </label>
              {([t("colors.red"), t("colors.green"), t("colors.blue")] as const).map(
                (name, index) => (
                  <label key={name}>
                    {["R", "G", "B"][index]}
                    <input
                      aria-label={name}
                      type="number"
                      min={0}
                      max={255}
                      value={parseInt(value.slice(1 + index * 2, 3 + index * 2), 16)}
                      onChange={(event) => {
                        if (event.target.value === "") return;
                        const channel = Math.max(0, Math.min(255, Math.round(+event.target.value)));
                        if (!Number.isFinite(channel)) return;
                        choose(
                          value.slice(0, 1 + index * 2) +
                            channel.toString(16).padStart(2, "0") +
                            value.slice(3 + index * 2),
                        );
                      }}
                    />
                  </label>
                ),
              )}
            </div>
            <div className="color-picker-comparison">
              <button type="button" onClick={() => choose(original)} title={t("colors.restore")}>
                <span style={{ backgroundColor: original }} />
                {t("colors.original")}
              </button>
              <span>
                <span style={{ backgroundColor: value }} />
                {t("colors.current")}
              </span>
            </div>
            {swatches.length ? (
              <fieldset className="color-picker-swatches">
                <legend>{t("colors.palette")}</legend>
                {swatches.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={t("colors.fromPalette", { color: color })}
                    title={color.toUpperCase()}
                    aria-pressed={color === normalized}
                    style={{ backgroundColor: color }}
                    onClick={() => choose(color)}
                  />
                ))}
              </fieldset>
            ) : null}
            {recent.length ? (
              <fieldset className="color-picker-swatches">
                <legend>{t("colors.recent")}</legend>
                {recent.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={t("colors.recentColor", { color: color })}
                    title={color.toUpperCase()}
                    aria-pressed={color === normalized}
                    style={{ backgroundColor: color }}
                    onClick={() => choose(color)}
                  />
                ))}
              </fieldset>
            ) : null}
          </>
        ) : null}
      </dialog>
    </>
  );
}
