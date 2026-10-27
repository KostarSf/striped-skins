import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUturnLeftIcon, ArrowUturnRightIcon } from "@heroicons/react/24/outline";
import { decodeSkinMetadata, type SkinDocument, type Pixel } from "@striped-skins/api";
import {
  flattenNodes,
  gearModels,
  modelParts,
  partAvailable,
  resolveModel,
  resolveWearables,
  type PreviewSettings,
} from "@striped-skins/models";
import { wearableNames } from "@striped-skins/api";
import { type PreviewStats, type SurfaceHover } from "@striped-skins/viewer/experimental";
import { ModelViewport } from "./ModelViewport";
import { SkinSettings } from "./SkinSettings";
import { TextureEditor, type PaintTool } from "./TextureEditor";
import { Button, DesignIcon, Field, HexInput, IconButton, PanelHeading } from "./ui";
import { useViewerPreferencesContext } from "../striped-viewer.client";
function paletteFor(skin: SkinDocument) {
  const counts = new Map<string, number>();
  for (let i = 32; i < skin.pixels.length; i += 4) {
    if (skin.pixels[i + 3] < 200) continue;
    const hex =
      "#" +
      Array.from(skin.pixels.slice(i, i + 3))
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hex]) => hex);
}
const names: Record<string, string> = {
  head: "Голова",
  hat: "Внешний слой головы",
  body: "Тело",
  jacket: "Внешний слой тела",
  neck: "Шея",
  right_arm: "Правая передняя нога",
  left_arm: "Левая передняя нога",
  right_leg: "Правая задняя нога",
  left_leg: "Левая задняя нога",
  right_sleeve: "Правый рукав",
  left_sleeve: "Левый рукав",
  right_pants: "Правая штанина",
  left_pants: "Левая штанина",
  tail: "Хвост",
  wings: "Крылья",
};
const tokens: Record<string, string> = {
  head: "Голова",
  ears: "Уши",
  snout: "Морда",
  mare: "Округлая",
  stallion: "Квадратная",
  flat: "Плоская",
  body: "Тело",
  butt: "Задняя часть",
  mirrored: "Правая сторона",
  butt_buttom: "Нижняя грань",
  tail_stub: "Основание хвоста",
  tail: "Хвост",
  segment: "Геометрия",
  neck: "Шея",
  mane: "Грива",
  horn: "Рог",
  wings: "Крылья",
  left_wing: "Левое",
  right_wing: "Правое",
  legacy_right_wing: "Правое · legacy",
  folded: "Сложенное",
  extended: "Раскрытое",
  left: "Левое",
  right: "Правое",
  jacket: "Внешний слой тела",
  left_side: "Левая сторона",
  right_side: "Правая сторона",
  base: "Основание",
  tip: "Кончик",
  fins: "Плавники",
  left_fin: "Левый плавник",
  right_fin: "Правый плавник",
  center_fin: "Центральный плавник",
};
const labelFor = (id: string) =>
  names[id] ??
  id
    .split("/")
    .map(
      (t) =>
        tokens[t] ??
        (t.match(/^segment_(\d+)$/)
          ? `Сегмент ${Number(t.slice(8)) + 1}`
          : t.match(/^feather_(\d+)$/)
            ? `Перо ${t.slice(8)}`
            : t),
    )
    .join(" / ");
export default function EditorWorkspace({
  document: skin,
  preview,
  onPreview,
}: {
  document: SkinDocument;
  preview: PreviewSettings;
  onPreview: (patch: Partial<PreviewSettings>) => void;
}) {
  const meta = decodeSkinMetadata(skin),
    options = useViewerPreferencesContext((s) => s.userOptions);
  const [showMini, setShowMini] = useState(true);
  const [showUV, setShowUV] = useState(true);
  const [slim, setSlim] = useState(meta.slim),
    [layout, setLayout] = useState<"3d" | "split" | "2d">("split"),
    [tool, setTool] = useState<PaintTool>("brush"),
    [painting, setPainting] = useState(false),
    [brushSize, setBrushSize] = useState(1),
    [opacity, setOpacity] = useState(100),
    [colors, setColors] = useState({ primary: "#d8bb60", secondary: "#ffffff" }),
    [hover, setHover] = useState<SurfaceHover | null>(null),
    [textureHover, setTextureHover] = useState<{ x: number; y: number } | null>(null),
    [removedColors, setRemovedColors] = useState<ReadonlySet<string>>(() => new Set()),
    [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set()),
    [activePart, setActivePart] = useState<string | null>(null),
    [lastPixel, setLastPixel] = useState<{ x: number; y: number; part: string } | null>(null),
    [stats, setStats] = useState<PreviewStats | null>(null),
    [customColors, setCustomColors] = useState<string[]>([]),
    [search, setSearch] = useState("");
  const hex = colors.primary;
  const setHex = useCallback((primary: string) => setColors((c) => ({ ...c, primary })), []);
  const swapColors = useCallback(
    () => setColors((c) => ({ primary: c.secondary, secondary: c.primary })),
    [],
  );
  const addColor = () => {
    setRemovedColors((v) => {
      const next = new Set(v);
      next.delete(hex);
      return next;
    });
    setCustomColors((v) => [...new Set([...v, hex])].slice(-16));
  };
  const palette = useMemo(() => paletteFor(skin), [skin]);
  const appearance = { ...meta, slim };
  const definition = resolveModel(appearance, preview);
  const parts = modelParts(definition).filter((p) => partAvailable(p.id, appearance, preview));
  const visibleParts = [
    ...parts,
    ...resolveWearables(appearance, preview).flatMap((gear) =>
      modelParts(gearModels[gear.model]).map((p) => ({
        ...p,
        id: `gear/${gear.id}/${p.id}`,
        label: `${wearableNames[gear.id as keyof typeof wearableNames]} / ${p.label}`,
      })),
    ),
  ];
  const selected = parts.some((p) => p.id === activePart) ? activePart : null;
  const quads = flattenNodes(definition)
    .filter((n) => (selected ? n.id === selected : partAvailable(n.id, appearance, preview)))
    .flatMap((n) => n.quads);
  const color: Pixel =
    tool === "eraser"
      ? [0, 0, 0, 0]
      : [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16),
          Math.round((opacity * 255) / 100),
        ];
  const selectTool = useCallback((value: PaintTool) => {
    setTool(value);
    setPainting(value !== "hand");
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,select,textarea,dialog")) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === "z" || e.code === "KeyZ")) {
        e.preventDefault();
        if (e.shiftKey) skin.redo();
        else skin.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tools: Record<string, PaintTool> = { b: "brush", e: "eraser", i: "drop", h: "hand" };
      if (tools[k]) selectTool(tools[k]);
      if ((k === "x" || e.code === "KeyX") && !e.repeat) {
        e.preventDefault();
        swapColors();
      }
      if (e.key === "[") setBrushSize((v) => Math.max(1, v - 1));
      if (e.key === "]") setBrushSize((v) => Math.min(32, v + 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [skin, selectTool, swapColors]);
  const sample = (pixel: Pixel) => {
    setHex(
      "#" +
        pixel
          .slice(0, 3)
          .map((v) => v.toString(16).padStart(2, "0"))
          .join(""),
    );
    setTool("brush");
  };
  const onStats = useCallback(
    (next: PreviewStats) =>
      setStats((old) =>
        old &&
        Object.keys(next).every(
          (k) => old[k as keyof PreviewStats] === next[k as keyof PreviewStats],
        )
          ? old
          : next,
      ),
    [],
  );
  const onPaint = useCallback((p: { x: number; y: number; part: string }) => setLastPixel(p), []);
  return (
    <>
      <div className="brush-toolbar" role="toolbar" aria-label="Настройки инструментов">
        <div className="current-tool">
          <DesignIcon name={tool === "drop" ? "drop" : tool} />
          <strong>
            {{ brush: "Кисть", eraser: "Ластик", drop: "Пипетка", hand: "Перемещение" }[tool]}
          </strong>
        </div>
        <span className="toolbar-divider" />
        <label className="inline-field">
          Размер{" "}
          <input
            aria-label="Размер кисти"
            type="number"
            min={1}
            max={32}
            value={brushSize}
            onChange={(e) => setBrushSize(Math.max(1, Math.min(32, +e.target.value || 1)))}
          />
          <span>px</span>
        </label>
        <label className="inline-field opacity-field">
          Непрозрачность{" "}
          <select
            aria-label="Непрозрачность кисти"
            value={opacity}
            onChange={(e) => setOpacity(+e.target.value)}
          >
            {[25, 50, 75, 100].map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
        <div className="inline-controls">
          <IconButton
            label="Отменить штрих"
            title="Отменить · Ctrl+Z / ⌘Z"
            disabled={!skin.canUndo}
            onClick={() => skin.undo()}
          >
            <ArrowUturnLeftIcon />
          </IconButton>
          <IconButton
            label="Повторить штрих"
            title="Повторить · Ctrl+Shift+Z / ⇧⌘Z"
            disabled={!skin.canRedo}
            onClick={() => skin.redo()}
          >
            <ArrowUturnRightIcon />
          </IconButton>
        </div>
        <Button
          className="paint-mode"
          aria-pressed={painting}
          onClick={() => {
            setPainting((v) => !v);
            if (tool === "hand") setTool("brush");
          }}
        >
          {painting ? "Режим: кисть" : "Режим: вращение"}
        </Button>
        {layout === "2d" && !showMini ? (
          <Button onClick={() => setShowMini(true)}>3D-превью</Button>
        ) : null}
        <div className="mode-tabs layout-tabs" aria-label="Расположение видов">
          {(
            [
              ["3d", "3D"],
              ["split", "Рядом"],
              ["2d", "2D"],
            ] as const
          ).map(([id, label]) => (
            <Button key={id} aria-pressed={layout === id} onClick={() => setLayout(id)}>
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className={`editor-workspace layout-${layout}`}>
        <aside className="tool-rail" aria-label="Инструменты">
          {(
            [
              ["hand", "Перемещение · H"],
              ["brush", "Кисть · B"],
              ["eraser", "Ластик · E"],
              ["drop", "Пипетка · I"],
            ] as const
          ).map(([id, label]) => (
            <IconButton
              key={id}
              label={label}
              aria-pressed={tool === id}
              onClick={() => selectTool(id)}
            >
              <DesignIcon name={id} />
            </IconButton>
          ))}
          <span className="rail-divider" />
          <div className="rail-colors">
            <label className="rail-color secondary-color" title="Дополнительный цвет">
              <input
                type="color"
                aria-label="Дополнительный цвет"
                value={colors.secondary}
                onChange={(e) => setColors((c) => ({ ...c, secondary: e.target.value }))}
              />
            </label>
            <label className="rail-color primary-color" title="Цвет кисти">
              <input
                type="color"
                aria-label="Цвет кисти"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
              />
            </label>
          </div>
          <IconButton label="Поменять цвета · X" onClick={swapColors}>
            ⇄
          </IconButton>
          <span className="rail-spacer" />
          <IconButton label="Добавить цвет в палитру" onClick={addColor}>
            <DesignIcon name="plus" />
          </IconButton>
        </aside>
        <div className="editor-center">
          <div className="editor-views">
            {layout !== "2d" || showMini ? (
              <ModelViewport
                document={skin}
                overrides={appearance}
                preview={preview}
                hidden={hidden}
                painting={painting && tool !== "hand"}
                color={color}
                brushSize={brushSize}
                activePart={selected}
                onSample={tool === "drop" ? sample : undefined}
                onPaint={onPaint}
                onHover={setHover}
                textureHover={textureHover}
                showUV={showUV}
                groundGrid={options.groundGrid}
                brushPreview={tool === "brush"}
                onStats={onStats}
                animate={options.animations}
                antialiasing={options.antialiasing}
                smoothCamera={options.smoothCamera}
                mini={layout === "2d"}
                onClose={() => setShowMini(false)}
                title={layout === "2d" ? "3D-превью" : "3D-модель"}
              />
            ) : null}

            <div className="texture-slot">
              <TextureEditor
                document={skin}
                color={color}
                tool={tool}
                brushSize={brushSize}
                onSample={sample}
                onPaint={onPaint}
                guides={quads}
                showUV={showUV}
                onShowUV={setShowUV}
                hover={hover}
                onHover={setTextureHover}
              />
            </div>
          </div>
          <div className="palette-panel">
            <div className="brush-color">
              <small>Цвет кисти</small>
              <div className="color-field">
                <input
                  type="color"
                  aria-label="Цвет в палитре"
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                />
                <HexInput value={hex} onChange={setHex} />
              </div>
            </div>
            <div className="skin-palette">
              <small>Палитра скина</small>
              <div>
                {[...new Set([...palette, ...customColors])]
                  .filter((c) => !removedColors.has(c))
                  .map((c) => (
                    <span className="palette-entry" key={c}>
                      <button
                        type="button"
                        aria-label={`Цвет ${c}`}
                        title={c}
                        className="palette-swatch"
                        style={{ background: c }}
                        onClick={() => {
                          setHex(c);
                          setTool("brush");
                        }}
                      />
                      <button
                        type="button"
                        className="palette-remove"
                        aria-label={`Удалить цвет ${c}`}
                        title="Удалить из палитры"
                        onClick={() => setRemovedColors((v) => new Set([...v, c]))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                <Button onClick={addColor}>+ Цвет</Button>
              </div>
            </div>
            <Button
              tone="ghost"
              className="palette-dropper"
              aria-pressed={tool === "drop"}
              onClick={() => selectTool("drop")}
            >
              Пипетка <kbd>I</kbd>
              <DesignIcon name="drop" />
            </Button>
          </div>
        </div>
        <aside className="inspector studio-panel" aria-label="Параметры модели">
          <PanelHeading title="Модель" description="Настройки сохраняются в PNG" />
          <SkinSettings
            document={skin}
            preview={preview}
            onPreview={onPreview}
            slim={slim}
            onSlim={setSlim}
          />
          <div className="settings-group">
            <h3>Рисование по поверхности</h3>
            <Field label="Рисовать по">
              <select
                aria-label="Слой рисования"
                value={selected ?? ""}
                onChange={(e) => setActivePart(e.target.value || null)}
              >
                <option value="">Видимой поверхности</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {labelFor(p.id)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="part-actions">
              <Button
                disabled={!selected}
                onClick={() =>
                  setHidden(new Set(visibleParts.filter((p) => p.id !== selected).map((p) => p.id)))
                }
              >
                Изолировать часть
              </Button>
              <Button
                disabled={!selected}
                onClick={() =>
                  setHidden(
                    (v) =>
                      new Set([
                        ...v,
                        ...visibleParts
                          .filter((p) => p.id === selected || p.id.startsWith(selected + "/"))
                          .map((p) => p.id),
                      ]),
                  )
                }
              >
                Скрыть ветку
              </Button>
              <Button onClick={() => setHidden(new Set())}>Показать всё</Button>
            </div>
          </div>
          <details open className="settings-group">
            <summary>Видимость частей</summary>
            <p className="muted">Скрытые части не мешают рисованию. PNG сохраняется целиком.</p>
            <input
              type="search"
              aria-label="Найти часть"
              placeholder="Найти часть…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="parts-list">
              {visibleParts
                .filter((p) => (p.id + labelFor(p.id)).toLowerCase().includes(search.toLowerCase()))
                .map((p) => (
                  <label className="part-row" key={p.id} title={p.id}>
                    <DesignIcon name="eye" />
                    <span>{p.id.startsWith("gear/") ? p.label : labelFor(p.id)}</span>
                    <input
                      type="checkbox"
                      aria-label={`Показать ${p.id}`}
                      checked={!hidden.has(p.id)}
                      onChange={(e) =>
                        setHidden((v) => {
                          const n = new Set(v);
                          if (e.target.checked) n.delete(p.id);
                          else n.add(p.id);
                          return n;
                        })
                      }
                    />
                  </label>
                ))}
            </div>
          </details>
          <output
            hidden
            data-testid="render-stats"
            data-calls={stats?.calls}
            data-geometries={stats?.geometries}
            data-textures={stats?.textures}
          />
        </aside>
      </div>
      <footer className="studio-status">
        <output
          data-testid="document-status"
          data-revision={skin.getSnapshot()}
          data-pixel={lastPixel ? `${lastPixel.x},${lastPixel.y}` : ""}
        >
          {skin.width} × {skin.height} px · PNG
          {lastPixel ? ` · ${lastPixel.x}, ${lastPixel.y}` : ""}
        </output>
        <span>
          Кисть <kbd>B</kbd>　Ластик <kbd>E</kbd>　Пипетка <kbd>I</kbd>　Цвета <kbd>X</kbd>　Отмена{" "}
          <kbd>Ctrl Z</kbd>
        </span>
        <span>Служебные пиксели защищены</span>
      </footer>
    </>
  );
}
