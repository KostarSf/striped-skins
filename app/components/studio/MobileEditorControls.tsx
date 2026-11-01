import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CubeIcon,
  Cog6ToothIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ColorPicker } from "./ColorPicker";
import type { SkinDocument } from "@striped-skins/api";
import { NumberSlider } from "./NumberSlider";
import type { PaintTool } from "./TextureEditor";
import { Button, DesignIcon, Field, HexInput, IconButton } from "./ui";

export type MobileEditorView = "3d" | "2d" | "settings";
function getToolNames(t: TFunction) {
  return {
    hand: t("tools.pan"),
    brush: t("tools.brush"),
    eraser: t("tools.eraser"),
    drop: t("tools.eyedropper"),
  };
}

export function BrushColors({
  primary,
  secondary,
  onPrimary,
  onSecondary,
  palette,
}: {
  primary: string;
  secondary: string;
  onPrimary: (color: string) => void;
  onSecondary: (color: string) => void;
  palette?: readonly string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="rail-colors">
      <div className="rail-color secondary-color">
        <ColorPicker
          label={t("colors.secondary")}
          value={secondary}
          onChange={onSecondary}
          palette={palette}
        />
      </div>
      <div className="rail-color primary-color">
        <ColorPicker
          label={t("colors.brush")}
          value={primary}
          onChange={onPrimary}
          palette={palette}
        />
      </div>
    </div>
  );
}

export function MobileToolMenu({
  tool,
  lastTool,
  onTool,
}: {
  tool: PaintTool;
  lastTool: Exclude<PaintTool, "hand">;
  onTool: (tool: PaintTool) => void;
}) {
  const { t } = useTranslation();
  const toolNames = getToolNames(t);
  const host = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (host.current && !host.current.contains(event.target as Node)) host.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && host.current?.open) {
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
  const alternate = tool === "hand" ? lastTool : "hand";
  return (
    <>
      <IconButton
        className="mobile-tool-toggle"
        label={
          tool === "hand"
            ? t("tools.returnTo", { tool: toolNames[lastTool] })
            : t("tools.switchToPan")
        }
        onClick={() => {
          onTool(alternate);
          if (host.current) host.current.open = false;
        }}
      >
        <DesignIcon name={alternate} />
      </IconButton>
      <details className="mobile-tool-menu" ref={host}>
        <summary
          aria-label={t("tools.current", { tool: toolNames[tool] })}
          title={t("tools.current", { tool: toolNames[tool] })}
        >
          <DesignIcon name={tool} />
        </summary>
        <div className="studio-panel" role="toolbar" aria-label={t("tools.label")}>
          {(["hand", "brush", "eraser", "drop"] as const).map((id) => (
            <Button
              key={id}
              aria-pressed={tool === id}
              onClick={() => {
                onTool(id);
                if (host.current) host.current.open = false;
                host.current?.querySelector("summary")?.focus();
              }}
            >
              <DesignIcon name={id} />
              {toolNames[id]}
            </Button>
          ))}
        </div>
      </details>
    </>
  );
}

export function MobileEditorFooter({
  view,
  onView,
  tool,
  skin,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  palette,
  onSwap,
  brushSize,
  onBrushSize,
  opacity,
  onOpacity,
}: {
  view: MobileEditorView;
  onView: (view: MobileEditorView) => void;
  tool: PaintTool;
  skin: SkinDocument;
  primary: string;
  secondary: string;
  onPrimary: (color: string) => void;
  onSecondary: (color: string) => void;
  palette?: readonly string[];
  onSwap: () => void;
  brushSize: number;
  onBrushSize: (value: number) => void;
  opacity: number;
  onOpacity: (value: number) => void;
}) {
  const { t } = useTranslation();
  const toolNames = getToolNames(t);
  const [open, setOpen] = useState(false);
  const popup = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = popup.current;
    if (!dialog) return;
    if (!open) {
      dialog.close();
      return;
    }
    dialog.showModal();
    const outside = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        setOpen(false);
    };
    dialog.addEventListener("click", outside);
    return () => dialog.removeEventListener("click", outside);
  }, [open]);
  return (
    <>
      <footer className="mobile-editor-footer" aria-label={t("mobile.controls")}>
        <nav aria-label={t("mobile.view")}>
          {(
            [
              ["3d", t("mobile.view3d"), "3D", CubeIcon],
              ["2d", t("mobile.view2d"), "2D", PhotoIcon],
              [
                "settings",
                t("editor.documentSettings"),
                t("mobile.document"),
                AdjustmentsHorizontalIcon,
              ],
            ] as const
          ).map(([id, label, text, Icon]) => (
            <Button
              key={id}
              aria-label={label}
              aria-pressed={view === id}
              onClick={() => onView(id)}
            >
              <Icon />
              <span>{text}</span>
            </Button>
          ))}
        </nav>
        <BrushColors
          primary={primary}
          secondary={secondary}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
          palette={palette}
        />
        <IconButton
          label={t("mobile.toolSettings")}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <Cog6ToothIcon />
        </IconButton>
      </footer>
      <dialog
        ref={popup}
        className="studio-dialog mobile-tool-settings"
        aria-labelledby="tool-settings-title"
        onCancel={() => setOpen(false)}
      >
        <div className="dialog-heading">
          <h2 id="tool-settings-title">{toolNames[tool]}</h2>
          <IconButton label={t("mobile.closeToolSettings")} onClick={() => setOpen(false)}>
            <XMarkIcon />
          </IconButton>
        </div>
        {tool === "brush" || tool === "eraser" ? (
          <Field label={t("mobile.brushSize")}>
            <NumberSlider
              label={t("tools.brushSize")}
              min={1}
              max={32}
              unit=" px"
              value={brushSize}
              onChange={onBrushSize}
            />
          </Field>
        ) : (
          <p className="muted">{tool === "hand" ? t("mobile.panHint") : t("mobile.sampleHint")}</p>
        )}
        {tool === "brush" ? (
          <>
            <Field label={t("mobile.opacity")}>
              <NumberSlider
                label={t("tools.brushOpacity")}
                min={0}
                max={100}
                unit="%"
                value={opacity}
                onChange={onOpacity}
              />
            </Field>
            <div className="studio-field">
              <span>{t("colors.brush")}</span>
              <div className="brush-color-field">
                <ColorPicker
                  label={t("colors.brushPicker")}
                  heading={t("colors.brush")}
                  value={primary}
                  onChange={onPrimary}
                  palette={palette}
                />
                <HexInput value={primary} onChange={onPrimary} />
              </div>
            </div>
            <div className="studio-field">
              <span>{t("colors.secondary")}</span>
              <div className="brush-color-field">
                <ColorPicker
                  label={t("colors.secondaryPicker")}
                  heading={t("colors.secondary")}
                  value={secondary}
                  onChange={onSecondary}
                  palette={palette}
                />
                <HexInput
                  value={secondary}
                  onChange={onSecondary}
                  label={t("colors.secondaryHex")}
                />
              </div>
            </div>
          </>
        ) : null}
        <div className="mobile-tool-history">
          <Button
            disabled={!skin.canUndo}
            onClick={() => skin.undo()}
            aria-label={t("history.undoStroke")}
          >
            <ArrowUturnLeftIcon />
            {t("history.undo")}
          </Button>
          <Button
            disabled={!skin.canRedo}
            onClick={() => skin.redo()}
            aria-label={t("history.redoStroke")}
          >
            <ArrowUturnRightIcon />
            {t("history.redo")}
          </Button>
          <IconButton label={t("colors.swapShortcut")} onClick={onSwap}>
            ⇄
          </IconButton>
        </div>
      </dialog>
    </>
  );
}
