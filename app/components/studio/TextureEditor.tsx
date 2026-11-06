import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { type SkinDocument, type Pixel } from "@striped-skins/api";
import { type SurfaceHover } from "@striped-skins/viewer/experimental";
import { type ModelQuad } from "@striped-skins/models";
import { Button, DesignIcon, IconButton } from "./ui";
import { useDocumentSetting } from "./useDocumentSetting";
import { useSkinDrop } from "./useSkinDrop";
import { uvPaintMask } from "./paint-mask";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  applyRectangleSelection,
  selectionModeFor,
  selectionOutline,
  selectionCursor,
  selectionModes,
  selectionRect,
  type SelectionMode,
  type SelectionRect,
  type TexturePoint,
} from "./rectangle-selection";
export type PaintTool = "brush" | "eraser" | "drop" | "hand" | "select";
function hoverBrushRect(hover: SurfaceHover, width: number, height: number, size: number) {
  const xs = hover.uv.filter((_, i) => i % 2 === 0).map((u) => u * width);
  const ys = hover.uv.filter((_, i) => i % 2 === 1).map((v) => (1 - v) * height);
  const left = hover.x - Math.floor((size - 1) / 2);
  const top = hover.y - Math.floor((size - 1) / 2);
  // Match the 3D preview: intersect the brush with the source UV face and texture.
  const x = Math.max(0, Math.min(...xs), left);
  const y = Math.max(0, Math.min(...ys), top);
  const right = Math.min(width, Math.max(...xs), left + size);
  const bottom = Math.min(height, Math.max(...ys), top + size);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}
export function TextureEditor({
  document: skin,
  color,
  brushSize,
  tool,
  selection,
  selectionMode,
  onSelectionMode,
  onSelection,
  onSample,
  onPaint,
  guides,
  highlightedQuads,
  paintQuads,
  hover,
  onHover,
  showUV: uv,
  onShowUV,
  onFileDrop,
}: {
  document: SkinDocument;
  color: Pixel;
  brushSize: number;
  tool: PaintTool;
  selection: Uint8Array | null;
  selectionMode: SelectionMode;
  onSelectionMode?: (mode: SelectionMode) => void;
  onSelection: (selection: Uint8Array | null) => void;
  onSample: (pixel: Pixel) => void;
  onPaint: (p: { x: number; y: number; part: string }) => void;
  guides: ModelQuad[];
  highlightedQuads?: ModelQuad[];
  paintQuads?: readonly ModelQuad[];
  hover?: SurfaceHover | null;
  onHover?: (pixel: { x: number; y: number } | null) => void;
  showUV: boolean;
  onShowUV: (visible: boolean) => void;
  onFileDrop?: (file: File) => void;
}) {
  const { t } = useTranslation();
  const drop = useSkinDrop(onFileDrop);
  const canvas = useRef<HTMLCanvasElement>(null),
    area = useRef<HTMLDivElement>(null);
  const [modifiers, setModifiers] = useState({ shiftKey: false, altKey: false });
  const effectiveSelectionMode = selectionModeFor(modifiers, selectionMode);
  const selectionDrag = useRef<{ start: TexturePoint } | null>(null);
  const [draft, setDraft] = useState<SelectionRect | null>(null);
  const mode = useRef<"draw" | "pan" | "pinch" | "sample" | "select" | "clear" | null>(null),
    origin = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const pointer = useRef<number | null>(null);
  const touches = useRef(new Map<number, TexturePoint>());
  const pinch = useRef<{ distance: number; center: TexturePoint } | null>(null);
  const [size, setSize] = useState({ width: 500, height: 600 }),
    [view, setView] = useDocumentSetting(skin, "textureView", { zoom: 1, pan: { x: 0, y: 0 } }),
    [grid, setGrid] = useDocumentSetting<boolean>(skin, "pixelGrid", true),
    [space, setSpace] = useState(false),
    [cursor, storeCursor] = useState<{ x: number; y: number } | null>(null);
  const partMask = useMemo(
    () => (paintQuads ? uvPaintMask(paintQuads, skin.width, skin.height) : undefined),
    [paintQuads, skin.width, skin.height],
  );
  const paintMask = useMemo(
    () =>
      selection && partMask
        ? selection.map((value, i) => value & partMask[i])
        : (selection ?? partMask),
    [selection, partMask],
  );
  const drawingTool = tool === "brush" || tool === "eraser";
  const paintBlocked = drawingTool && !!skin.paintBlockedReason;
  const cursorBlocked =
    paintBlocked ||
    (drawingTool && !!cursor && !!partMask && !partMask[cursor.y * skin.width + cursor.x]);
  const setCursor = useCallback((pixel: { x: number; y: number } | null) => {
    storeCursor((old) => (old?.x === pixel?.x && old?.y === pixel?.y ? old : pixel));
  }, []);
  useEffect(() => {
    onHover?.(tool === "brush" && !space && !cursorBlocked ? cursor : null);
  }, [cursor, tool, space, cursorBlocked, onHover]);
  useEffect(() => {
    const clear = () => {
      skin.cancelStroke();
      touches.current.clear();
      pinch.current = null;
      pointer.current = null;
      mode.current = null;
      selectionDrag.current = null;
      setDraft(null);
      setCursor(null);
    };
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("blur", clear);
      onHover?.(null);
    };
  }, [skin, onHover, setCursor]);
  const { zoom, pan } = view;
  const setZoom = (update: (zoom: number) => number) =>
    setView((v) => ({ ...v, zoom: update(v.zoom) }));
  const setPan = (pan: { x: number; y: number }) => setView((v) => ({ ...v, pan }));
  const fit = Math.max(
    0.05,
    Math.min((size.width - 64) / skin.width, (size.height - 112) / skin.height),
  );
  const scale = fit * zoom;
  const hoverRect = hover ? hoverBrushRect(hover, skin.width, skin.height, brushSize) : null;
  const gridPath = useMemo(
    () =>
      Array.from({ length: skin.width + 1 }, (_, x) => `M${x} 0V${skin.height}`).join("") +
      Array.from({ length: skin.height + 1 }, (_, y) => `M0 ${y}H${skin.width}`).join(""),
    [skin.width, skin.height],
  );
  const { width: textureWidth, height: textureHeight } = skin;
  const emptySelection = useMemo(() => selection !== null && !selection.includes(1), [selection]);
  const outline = useMemo(
    () => (selection ? selectionOutline(selection, textureWidth, textureHeight) : ""),
    [selection, textureWidth, textureHeight],
  );
  const draftOutline = draft
    ? `M${draft.x} ${draft.y}h${draft.width}v${draft.height}h${-draft.width}Z`
    : "";
  const cancelSelectionDrag = useCallback(() => {
    if (mode.current !== "select") return;
    const id = pointer.current;
    mode.current = null;
    pointer.current = null;
    selectionDrag.current = null;
    setDraft(null);
    if (id !== null) {
      touches.current.delete(id);
      if (area.current?.hasPointerCapture(id)) area.current.releasePointerCapture(id);
    }
  }, [setDraft]);
  useEffect(() => {
    cancelSelectionDrag();
  }, [cancelSelectionDrag, tool, textureWidth, textureHeight]);
  useEffect(() => {
    const update = () => {
      // A resize notifies before React updates the canvas dimensions; the next effect draws it.
      if (skin.width !== textureWidth || skin.height !== textureHeight) return;
      canvas.current
        ?.getContext("2d")
        ?.putImageData(new ImageData(skin.pixels, textureWidth, textureHeight), 0, 0);
    };
    update();
    return skin.subscribe(update);
  }, [skin, textureWidth, textureHeight]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    if (area.current) observer.observe(area.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      };
      setView((v) => {
        const zoom = Math.max(0.15, Math.min(32, v.zoom * Math.exp(-event.deltaY * 0.002)));
        const ratio = zoom / v.zoom;
        return {
          zoom,
          pan: {
            x: anchor.x - (anchor.x - v.pan.x) * ratio,
            y: anchor.y - (anchor.y - v.pan.y) * ratio,
          },
        };
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [setView]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      setModifiers({ shiftKey: e.shiftKey, altKey: e.altKey });
      if (e.key === "Escape" && mode.current === "select") {
        e.preventDefault();
        cancelSelectionDrag();
        return;
      }
      if ((e.target as HTMLElement).closest("input,select,textarea,dialog,button,a,summary"))
        return;
      if (e.code === "Space") {
        e.preventDefault();
        setSpace(true);
      }
      if (e.key.toLowerCase() === "f") {
        setView({ zoom: 1, pan: { x: 0, y: 0 } });
      }
    };
    const up = (e: KeyboardEvent) => {
      setModifiers({ shiftKey: e.shiftKey, altKey: e.altKey });
      if (e.code === "Space") setSpace(false);
    };
    const blur = () => {
      setSpace(false);
      setModifiers({ shiftKey: false, altKey: false });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      skin.cancelStroke();
    };
  }, [skin, setView, cancelSelectionDrag]);
  const point = (e: PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.x) * skin.width) / rect.width),
      y: Math.floor(((e.clientY - rect.y) * skin.height) / rect.height),
    };
  };
  const paint = (e: PointerEvent) => {
    const p = point(e);
    if (p.x < 0 || p.y < 0 || p.x >= skin.width || p.y >= skin.height) {
      skin.breakStroke();
      return;
    }
    setCursor(p);
    if (partMask && !partMask[p.y * skin.width + p.x]) {
      skin.breakStroke();
      return;
    }
    skin.paint(p.x, p.y, color, "texture", brushSize, undefined, paintMask);
    onPaint({ ...p, part: "2D" });
  };
  const end = () => {
    if (mode.current === "draw") skin.endStroke();
    if (mode.current === "select") {
      selectionDrag.current = null;
      setDraft(null);
    }
    mode.current = null;
    pointer.current = null;
  };
  const touchFrame = () => {
    const [first, second] = [...touches.current.values()];
    if (!first || !second) return null;
    const rect = area.current!.getBoundingClientRect();
    return {
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      center: {
        x: (first.x + second.x) / 2 - rect.left - rect.width / 2,
        y: (first.y + second.y) / 2 - rect.top - rect.height / 2,
      },
    };
  };
  const finishPointer = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const tracked = touches.current.delete(event.pointerId);
    if (!tracked && pointer.current !== event.pointerId) return;
    if (mode.current === "pinch") {
      pinch.current = touchFrame();
      // Wait until every finger lifts before allowing another stroke or pan.
      if (!touches.current.size) end();
    } else if (pointer.current === event.pointerId) {
      if (cancelled && mode.current === "draw") skin.cancelStroke();
      if (!cancelled && mode.current === "sample") {
        const p = point(event);
        if (p.x >= 0 && p.y >= 0 && p.x < skin.width && p.y < skin.height)
          onSample(skin.readPixel(p.x, p.y));
      }
      if (!cancelled && mode.current === "clear") onSelection(null);
      if (!cancelled && selectionDrag.current) {
        const { start } = selectionDrag.current;
        onSelection(
          applyRectangleSelection(
            selection,
            selectionRect(start, point(event), textureWidth, textureHeight),
            selectionModeFor(event, selectionMode),
            textureWidth,
            textureHeight,
          ),
        );
      }
      end();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled || event.pointerType === "touch") setCursor(null);
  };
  return (
    <section className="texture-viewport" aria-label={t("texture.editor")} {...drop.handlers}>
      {drop.dragging ? <div className="skin-drop-overlay">{t("import.dropPng")}</div> : null}
      <div className="viewport-heading">
        <h2>{t("texture.title")}</h2>
        <div className="inline-controls texture-heading-controls">
          {tool === "select" && onSelectionMode ? (
            <select
              aria-label={t("selection.mode")}
              className="selection-mode"
              value={selectionMode}
              onChange={(event) => {
                const next = selectionModes.find((value) => value === event.target.value);
                if (next) onSelectionMode(next);
              }}
            >
              {selectionModes.map((value) => (
                <option key={value} value={value}>
                  {t(`selection.${value}`)}
                </option>
              ))}
            </select>
          ) : null}
          {selection !== null && onSelectionMode ? (
            <IconButton
              label={t("selection.clear")}
              title={t("selection.clearShortcut")}
              onClick={() => onSelection(null)}
            >
              <XMarkIcon />
            </IconButton>
          ) : null}
          <Button aria-pressed={uv} onClick={() => onShowUV(!uv)}>
            UV
          </Button>
          <Button aria-pressed={grid} onClick={() => setGrid((v) => !v)}>
            {t("texture.grid")}
          </Button>
        </div>
      </div>
      <div
        ref={area}
        className={`texture-area ${tool === "hand" || space ? "panning" : cursorBlocked ? "painting-blocked" : ""}`}
        style={{
          cursor: tool === "select" && !space ? selectionCursor(effectiveSelectionMode) : undefined,
        }}
        data-selection-mode={tool === "select" ? effectiveSelectionMode : undefined}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            e.currentTarget.setPointerCapture(e.pointerId);
            if (touches.current.size >= 2) {
              if (mode.current === "draw") skin.cancelStroke();
              selectionDrag.current = null;
              setDraft(null);
              mode.current = "pinch";
              pointer.current = null;
              pinch.current = touchFrame();
              setCursor(null);
              e.preventDefault();
              return;
            }
          }
          if (pointer.current !== null && pointer.current !== e.pointerId) return;
          if (e.button === 2 || e.button === 1 || space || tool === "hand") {
            pointer.current = e.pointerId;
            setCursor(null);
            mode.current = "pan";
            origin.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            e.currentTarget.setPointerCapture(e.pointerId);
            e.preventDefault();
            return;
          }
          if (e.button !== 0) return;
          const p = point(e);
          if (p.x < 0 || p.y < 0 || p.x >= skin.width || p.y >= skin.height) {
            if (tool === "select") {
              pointer.current = e.pointerId;
              mode.current = "clear";
              e.currentTarget.setPointerCapture(e.pointerId);
              canvas.current?.focus({ preventScroll: true });
              e.preventDefault();
            }
            return;
          }
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (tool === "drop") {
            if (e.pointerType === "touch") mode.current = "sample";
            else onSample(skin.readPixel(p.x, p.y));
            return;
          }
          if (tool === "select") {
            setModifiers({ shiftKey: e.shiftKey, altKey: e.altKey });
            mode.current = "select";
            selectionDrag.current = { start: p };
            setDraft({ ...p, width: 1, height: 1 });
            canvas.current?.focus({ preventScroll: true });
            e.preventDefault();
            return;
          }
          mode.current = "draw";
          skin.beginStroke();
          paint(e);
        }}
        onPointerMove={(e) => {
          if (tool === "select")
            setModifiers((current) =>
              current.shiftKey === e.shiftKey && current.altKey === e.altKey
                ? current
                : { shiftKey: e.shiftKey, altKey: e.altKey },
            );
          if (touches.current.has(e.pointerId)) {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          }
          if (mode.current === "pinch") {
            const previous = pinch.current;
            const next = touchFrame();
            pinch.current = next;
            if (previous && next) {
              setView((v) => {
                const zoom = Math.max(
                  0.15,
                  Math.min(32, (v.zoom * next.distance) / previous.distance),
                );
                const ratio = zoom / v.zoom;
                return {
                  zoom,
                  pan: {
                    x: next.center.x - (previous.center.x - v.pan.x) * ratio,
                    y: next.center.y - (previous.center.y - v.pan.y) * ratio,
                  },
                };
              });
            }
            e.preventDefault();
            return;
          }
          if (pointer.current !== null && pointer.current !== e.pointerId) return;
          if (mode.current === "pan") {
            setPan({
              x: origin.current.px + e.clientX - origin.current.x,
              y: origin.current.py + e.clientY - origin.current.y,
            });
          } else if (mode.current === "draw") paint(e);
          else if (selectionDrag.current) {
            setDraft(
              selectionRect(selectionDrag.current.start, point(e), textureWidth, textureHeight),
            );
          } else if (mode.current !== "sample") {
            const p = point(e);
            setCursor(p.x >= 0 && p.y >= 0 && p.x < skin.width && p.y < skin.height ? p : null);
          }
        }}
        onPointerUp={(e) => finishPointer(e)}
        onPointerCancel={(e) => finishPointer(e, true)}
        onLostPointerCapture={(e) => finishPointer(e, true)}
        onPointerLeave={() => setCursor(null)}
      >
        <div
          className="texture-atlas checkerboard"
          style={{
            width: skin.width * scale,
            height: skin.height * scale,
            transform: `translate(calc(-50% + ${pan.x}px),calc(-50% + ${pan.y}px))`,
          }}
        >
          <canvas
            ref={canvas}
            width={skin.width}
            height={skin.height}
            data-testid="skin-texture"
            aria-label={t("texture.canvasLabel")}
            tabIndex={-1}
            style={{ width: skin.width * scale, height: skin.height * scale }}
          />
          {uv ? (
            <svg
              aria-hidden="true"
              className="texture-guides"
              viewBox={`0 0 ${skin.width} ${skin.height}`}
            >
              {guides.map((q) => (
                <polygon
                  key={q.id}
                  points={[0, 1, 2, 3]
                    .map(
                      (i) => `${q.uv[2 * i] * skin.width},${(1 - q.uv[2 * i + 1]) * skin.height}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke="var(--studio-accent)"
                  strokeOpacity={0.5}
                  strokeWidth={0.7 / scale}
                />
              ))}
            </svg>
          ) : null}
          {grid && scale >= 3 ? (
            <svg
              aria-hidden="true"
              className="pixel-grid"
              viewBox={`0 0 ${skin.width} ${skin.height}`}
              preserveAspectRatio="none"
              shapeRendering="crispEdges"
            >
              <path
                d={gridPath}
                fill="none"
                stroke="#ffffff20"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : null}
          {highlightedQuads?.length ? (
            <svg
              aria-hidden="true"
              className="texture-guides part-uv-highlight"
              viewBox={`0 0 ${skin.width} ${skin.height}`}
              data-testid="part-uv-highlight"
            >
              {highlightedQuads.map((quad) => (
                <polygon
                  key={quad.id}
                  data-surface={quad.id}
                  points={[0, 1, 2, 3]
                    .map(
                      (i) =>
                        `${quad.uv[2 * i] * skin.width},${(1 - quad.uv[2 * i + 1]) * skin.height}`,
                    )
                    .join(" ")}
                  fill="var(--studio-accent)"
                  fillOpacity={0.3}
                  stroke="var(--studio-accent)"
                  strokeWidth={2 / scale}
                />
              ))}
            </svg>
          ) : null}
          {selection !== null || draft ? (
            <svg
              aria-hidden="true"
              className="texture-selection"
              viewBox={`0 0 ${textureWidth} ${textureHeight}`}
              preserveAspectRatio="none"
              data-testid="texture-selection"
            >
              {outline ? (
                <g data-testid="selection-outline">
                  <path d={outline} className="selection-outline-dark" />
                  <path d={outline} className="selection-outline-ants" />
                </g>
              ) : null}
              {draft ? (
                <g data-testid="selection-draft">
                  <path d={draftOutline} className="selection-outline-dark" />
                  <path d={draftOutline} className="selection-outline-ants" />
                </g>
              ) : null}
            </svg>
          ) : null}
          {uv && hover && hoverRect ? (
            <svg
              aria-hidden="true"
              className="texture-guides uv-hover"
              viewBox={`0 0 ${skin.width} ${skin.height}`}
              data-testid="uv-hover"
              data-surface={hover.surface}
              data-pixel={`${hover.x},${hover.y}`}
            >
              <polygon
                points={[0, 1, 2, 3]
                  .map(
                    (i) =>
                      `${hover.uv[2 * i] * skin.width},${(1 - hover.uv[2 * i + 1]) * skin.height}`,
                  )
                  .join(" ")}
                fill="var(--studio-accent)"
                fillOpacity={0.12}
                stroke="#101014"
                strokeWidth={4 / scale}
              />
              <polygon
                points={[0, 1, 2, 3]
                  .map(
                    (i) =>
                      `${hover.uv[2 * i] * skin.width},${(1 - hover.uv[2 * i + 1]) * skin.height}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="var(--studio-accent)"
                strokeWidth={2 / scale}
              />
              <rect
                {...hoverRect}
                fill="white"
                fillOpacity={0.5}
                stroke="#101014"
                strokeWidth={2 / scale}
              />
              <rect {...hoverRect} fill="none" stroke="white" strokeWidth={1 / scale} />
            </svg>
          ) : null}
          {cursor && (drawingTool || tool === "drop") && !space && !cursorBlocked ? (
            <div
              className="brush-cursor"
              style={{
                left: (cursor.x - Math.floor((brushSize - 1) / 2)) * scale,
                top: (cursor.y - Math.floor((brushSize - 1) / 2)) * scale,
                width: brushSize * scale,
                height: brushSize * scale,
              }}
            />
          ) : null}
        </div>
      </div>
      <div className="viewport-footer">
        <div className="camera-actions">
          <span className="viewport-hint">
            <span>{t(tool === "select" ? "selection.dragHint" : "texture.paintHint")}</span>
            <span>{t("texture.panHint")}</span>
          </span>
          {emptySelection ? (
            <output className="selection-status">{t("selection.empty")}</output>
          ) : null}
          <div className="zoom-controls">
            <IconButton label="2D −" onClick={() => setZoom((z) => Math.max(0.15, z / 1.25))}>
              −
            </IconButton>
            <span>{Math.round(scale * 100)}%</span>
            <IconButton label="2D +" onClick={() => setZoom((z) => Math.min(32, z * 1.25))}>
              +
            </IconButton>
          </div>
          <IconButton
            label={t("texture.fit")}
            onClick={() => {
              setView({ zoom: 1, pan: { x: 0, y: 0 } });
            }}
          >
            <DesignIcon name="reset" />
          </IconButton>
        </div>
      </div>
    </section>
  );
}
