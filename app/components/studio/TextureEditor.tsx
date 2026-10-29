import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { type SkinDocument, type Pixel } from "@striped-skins/api";
import { type SurfaceHover } from "@striped-skins/viewer/experimental";
import { type ModelQuad } from "@striped-skins/models";
import { Button, DesignIcon, IconButton } from "./ui";
import { useDocumentSetting } from "./useDocumentSetting";
import { useSkinDrop } from "./useSkinDrop";
export type PaintTool = "brush" | "eraser" | "drop" | "hand";
type TouchPoint = { x: number; y: number };
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
  onSample,
  onPaint,
  guides,
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
  onSample: (pixel: Pixel) => void;
  onPaint: (p: { x: number; y: number; part: string }) => void;
  guides: ModelQuad[];
  hover?: SurfaceHover | null;
  onHover?: (pixel: { x: number; y: number } | null) => void;
  showUV: boolean;
  onShowUV: (visible: boolean) => void;
  onFileDrop?: (file: File) => void;
}) {
  const drop = useSkinDrop(onFileDrop);
  const canvas = useRef<HTMLCanvasElement>(null),
    area = useRef<HTMLDivElement>(null);
  const mode = useRef<"draw" | "pan" | "pinch" | "sample" | null>(null),
    origin = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const pointer = useRef<number | null>(null);
  const touches = useRef(new Map<number, TouchPoint>());
  const pinch = useRef<{ distance: number; center: TouchPoint } | null>(null);
  const [size, setSize] = useState({ width: 500, height: 600 }),
    [view, setView] = useDocumentSetting(skin, "textureView", { zoom: 1, pan: { x: 0, y: 0 } }),
    [grid, setGrid] = useDocumentSetting<boolean>(skin, "pixelGrid", true),
    [space, setSpace] = useState(false),
    [cursor, storeCursor] = useState<{ x: number; y: number } | null>(null);
  const paintBlocked = tool !== "drop" && !!skin.paintBlockedReason;
  const setCursor = useCallback((pixel: { x: number; y: number } | null) => {
    storeCursor((old) => (old?.x === pixel?.x && old?.y === pixel?.y ? old : pixel));
  }, []);
  useEffect(() => {
    onHover?.(tool === "brush" && !space && !paintBlocked ? cursor : null);
  }, [cursor, tool, space, paintBlocked, onHover]);
  useEffect(() => {
    const clear = () => {
      skin.cancelStroke();
      touches.current.clear();
      pinch.current = null;
      pointer.current = null;
      mode.current = null;
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
  useEffect(() => {
    const update = () =>
      canvas.current
        ?.getContext("2d")
        ?.putImageData(
          new ImageData(new Uint8ClampedArray(skin.pixels), skin.width, skin.height),
          0,
          0,
        );
    update();
    return skin.subscribe(update);
  }, [skin]);
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
    const up = () => setSpace(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", up);
      skin.cancelStroke();
    };
  }, [skin, setView]);
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
    skin.paint(p.x, p.y, color, "texture", brushSize);
    onPaint({ ...p, part: "2D" });
  };
  const end = () => {
    if (mode.current === "draw") skin.endStroke();
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
      end();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled || event.pointerType === "touch") setCursor(null);
  };
  return (
    <section className="texture-viewport" aria-label="Редактирование текстуры" {...drop.handlers}>
      {drop.dragging ? (
        <div className="skin-drop-overlay">Отпустите PNG, чтобы открыть скин</div>
      ) : null}
      <div className="viewport-heading">
        <h2>2D-текстура</h2>
        <div className="inline-controls">
          <Button aria-pressed={uv} onClick={() => onShowUV(!uv)}>
            UV
          </Button>
          <Button aria-pressed={grid} onClick={() => setGrid((v) => !v)}>
            Сетка
          </Button>
        </div>
      </div>
      <div
        ref={area}
        className={`texture-area ${tool === "hand" || space ? "panning" : paintBlocked ? "painting-blocked" : ""}`}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            e.currentTarget.setPointerCapture(e.pointerId);
            if (touches.current.size >= 2) {
              if (mode.current === "draw") skin.cancelStroke();
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
          if (p.x < 0 || p.y < 0 || p.x >= skin.width || p.y >= skin.height) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (tool === "drop") {
            if (e.pointerType === "touch") mode.current = "sample";
            else onSample(skin.readPixel(p.x, p.y));
            return;
          }
          mode.current = "draw";
          skin.beginStroke();
          paint(e);
        }}
        onPointerMove={(e) => {
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
          else if (mode.current !== "sample") {
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
            aria-label="Текстура скина, рисование пиксельной кистью"
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
          {cursor && tool !== "hand" && !space && !paintBlocked ? (
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
            <span>ЛКМ · рисовать</span>
            <span>ПКМ / пробел · панорама · колесо · масштаб</span>
          </span>
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
            label="Вписать текстуру"
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
