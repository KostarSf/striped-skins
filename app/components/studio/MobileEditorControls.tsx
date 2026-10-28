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
import type { SkinDocument } from "@striped-skins/api";
import type { PaintTool } from "./TextureEditor";
import { Button, DesignIcon, Field, HexInput, IconButton } from "./ui";

export type MobileEditorView = "3d" | "2d" | "settings";
export const toolNames = {
  hand: "Перемещение",
  brush: "Кисть",
  eraser: "Ластик",
  drop: "Пипетка",
};

export function BrushColors({
  primary,
  secondary,
  onPrimary,
  onSecondary,
}: {
  primary: string;
  secondary: string;
  onPrimary: (color: string) => void;
  onSecondary: (color: string) => void;
}) {
  return (
    <div className="rail-colors">
      <label className="rail-color secondary-color" title="Дополнительный цвет">
        <input
          type="color"
          aria-label="Дополнительный цвет"
          value={secondary}
          onChange={(e) => onSecondary(e.target.value)}
        />
      </label>
      <label className="rail-color primary-color" title="Цвет кисти">
        <input
          type="color"
          aria-label="Цвет кисти"
          value={primary}
          onChange={(e) => onPrimary(e.target.value)}
        />
      </label>
    </div>
  );
}

export function MobileToolMenu({
  tool,
  onTool,
}: {
  tool: PaintTool;
  onTool: (tool: PaintTool) => void;
}) {
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
  return (
    <details className="mobile-tool-menu" ref={host}>
      <summary
        aria-label={`Инструменты: ${toolNames[tool]}`}
        title={`Инструменты: ${toolNames[tool]}`}
      >
        <DesignIcon name={tool} />
      </summary>
      <div className="studio-panel" role="toolbar" aria-label="Инструменты">
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
  onSwap: () => void;
  brushSize: number;
  onBrushSize: (value: number) => void;
  opacity: number;
  onOpacity: (value: number) => void;
}) {
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
      <footer className="mobile-editor-footer" aria-label="Управление редактором">
        <nav aria-label="Вид редактора">
          {(
            [
              ["3d", "3D вид", "3D", CubeIcon],
              ["2d", "2D вид", "2D", PhotoIcon],
              ["settings", "Параметры документа", "Документ", AdjustmentsHorizontalIcon],
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
        />
        <IconButton
          label="Параметры инструмента"
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
          <IconButton label="Закрыть параметры инструмента" onClick={() => setOpen(false)}>
            <XMarkIcon />
          </IconButton>
        </div>
        {tool === "brush" || tool === "eraser" ? (
          <Field label="Размер кисти · px">
            <input
              aria-label="Размер кисти"
              type="number"
              min={1}
              max={32}
              value={brushSize}
              onChange={(e) => onBrushSize(Math.max(1, Math.min(32, +e.target.value || 1)))}
            />
          </Field>
        ) : (
          <p className="muted">
            {tool === "hand"
              ? "Перетаскивайте модель для вращения или текстуру для перемещения."
              : "Коснитесь скина, чтобы выбрать цвет и вернуться к кисти."}
          </p>
        )}
        {tool === "brush" ? (
          <>
            <Field label="Непрозрачность">
              <select
                aria-label="Непрозрачность кисти"
                value={opacity}
                onChange={(e) => onOpacity(+e.target.value)}
              >
                {[25, 50, 75, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Цвет кисти">
              <div className="brush-color-field">
                <input
                  type="color"
                  aria-label="Пикер цвета кисти"
                  value={primary}
                  onChange={(event) => onPrimary(event.target.value)}
                />
                <HexInput value={primary} onChange={onPrimary} />
              </div>
            </Field>
            <Field label="Дополнительный цвет">
              <div className="brush-color-field">
                <input
                  type="color"
                  aria-label="Пикер дополнительного цвета"
                  value={secondary}
                  onChange={(event) => onSecondary(event.target.value)}
                />
                <HexInput
                  value={secondary}
                  onChange={onSecondary}
                  label="HEX дополнительного цвета"
                />
              </div>
            </Field>
          </>
        ) : null}
        <div className="mobile-tool-history">
          <Button disabled={!skin.canUndo} onClick={() => skin.undo()} aria-label="Отменить штрих">
            <ArrowUturnLeftIcon />
            Отменить
          </Button>
          <Button disabled={!skin.canRedo} onClick={() => skin.redo()} aria-label="Повторить штрих">
            <ArrowUturnRightIcon />
            Повторить
          </Button>
          <IconButton label="Поменять цвета · X" onClick={onSwap}>
            ⇄
          </IconButton>
        </div>
      </dialog>
    </>
  );
}
