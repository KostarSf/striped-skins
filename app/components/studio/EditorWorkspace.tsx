import { useCallback, useEffect, useId, useMemo, useState } from "react";
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
import { PartsVisibility } from "./PartsVisibility";
import { buildPartTree } from "./part-tree";
import { SkinSettings } from "./SkinSettings";
import { TextureEditor, type PaintTool } from "./TextureEditor";
import { Button, DesignIcon, Field, IconButton, PanelHeading } from "./ui";
import {
  BrushColors,
  MobileEditorFooter,
  MobileToolMenu,
  type MobileEditorView,
} from "./MobileEditorControls";
import { NumberSlider } from "./NumberSlider";
import { LayerPanel, HistoryPanel } from "./LayerPanel";
import { useDocumentSetting } from "./useDocumentSetting";
import { usePhoneLayout } from "./usePhoneLayout";
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
  onFileDrop,
}: {
  document: SkinDocument;
  preview: PreviewSettings;
  onPreview: (patch: Partial<PreviewSettings>) => void;
  onFileDrop: (file: File) => void;
}) {
  useEffect(() => {
    skin.initializeWorkspace("preview", { ...preview });
  }, [skin, preview]);
  const meta = decodeSkinMetadata(skin);
  const defaults = useViewerPreferencesContext((s) => s.userOptions);
  const [options] = useDocumentSetting(skin, "viewOptions", { ...defaults });
  const isPhone = usePhoneLayout();
  const [inspectorTab, setInspectorTab] = useState<"texture" | "skin">("texture");
  const inspectorId = useId();
  const [mobileView, setMobileView] = useDocumentSetting<MobileEditorView>(
    skin,
    "mobileView",
    "3d",
  );
  const [showMini, setShowMini] = useDocumentSetting<boolean>(skin, "showMini", true);
  const [showUV, setShowUV] = useDocumentSetting<boolean>(skin, "showUV", true);
  const [slim, setSlim] = useDocumentSetting<boolean>(skin, "slim", meta.slim),
    [layout, setLayout] = useDocumentSetting<"3d" | "split" | "2d">(skin, "layout", "split"),
    [tool, setStoredTool] = useDocumentSetting<PaintTool>(skin, "tool", "brush"),
    [lastPaintTool, setLastPaintTool] = useDocumentSetting<Exclude<PaintTool, "hand">>(
      skin,
      "lastPaintTool",
      tool === "hand" ? "brush" : tool,
    ),
    [painting, setPainting] = useDocumentSetting<boolean>(skin, "painting", false),
    [brushSize, setBrushSize] = useDocumentSetting<number>(skin, "brushSize", 1),
    [opacity, setOpacity] = useDocumentSetting<number>(skin, "opacity", 100),
    [colors, setColors] = useDocumentSetting(skin, "colors", {
      primary: "#d8bb60",
      secondary: "#ffffff",
    }),
    [hover, setHover] = useState<SurfaceHover | null>(null),
    [textureHover, setTextureHover] = useState<{ x: number; y: number } | null>(null),
    [removedColorIds, setRemovedColorIds] = useDocumentSetting<string[]>(skin, "removedColors", []),
    [hiddenIds, setHiddenIds] = useDocumentSetting<string[]>(skin, "hiddenParts", []),
    [activePart, setActivePart] = useDocumentSetting<string | null>(skin, "activePart", null),
    [lastPixel, setLastPixel] = useState<{ x: number; y: number; part: string } | null>(null),
    [stats, setStats] = useState<PreviewStats | null>(null),
    [customColors, setCustomColors] = useDocumentSetting<string[]>(skin, "customColors", []);
  const setTool = useCallback(
    (value: PaintTool) => {
      if (value !== "hand") setLastPaintTool(value);
      setStoredTool(value);
    },
    [setStoredTool, setLastPaintTool],
  );
  const hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const removedColors = useMemo(() => new Set(removedColorIds), [removedColorIds]);
  const setHidden = (value: ReadonlySet<string>) => setHiddenIds([...value]);
  const setRemovedColors = (update: (value: ReadonlySet<string>) => ReadonlySet<string>) =>
    setRemovedColorIds((ids) => [...update(new Set(ids))]);
  const hex = colors.primary;
  const setHex = (primary: string) => setColors((c) => ({ ...c, primary }));
  const setSecondary = (secondary: string) => setColors((c) => ({ ...c, secondary }));
  const swapColors = useCallback(
    () => setColors((c) => ({ primary: c.secondary, secondary: c.primary })),
    [setColors],
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
  const tree = buildPartTree(
    definition.nodes,
    (id) => partAvailable(id, appearance, preview),
    labelFor,
    resolveWearables(appearance, preview).map((gear) => ({
      id: gear.id,
      label: wearableNames[gear.id as keyof typeof wearableNames],
      nodes: gearModels[gear.model].nodes,
    })),
  );
  const selected = parts.some((p) => p.id === activePart) ? activePart : null;
  const quads = flattenNodes(definition)
    .filter(
      (n) =>
        !hidden.has(n.id) &&
        (selected ? n.id === selected : partAvailable(n.id, appearance, preview)),
    )
    .flatMap((n) => n.quads.filter((q) => !hidden.has(q.id)));
  const color: Pixel =
    tool === "eraser"
      ? [0, 0, 0, 0]
      : [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16),
          Math.round((opacity * 255) / 100),
        ];
  const selectTool = useCallback(
    (value: PaintTool) => {
      setTool(value);
      setPainting(value !== "hand");
    },
    [setTool, setPainting],
  );
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
  }, [skin, selectTool, swapColors, setBrushSize]);
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
  const palettePanel = (
    <section className="palette-panel" aria-label="Палитра скина">
      <div className="skin-palette">
        {isPhone ? <small>Палитра скина</small> : null}
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
          {isPhone ? <Button onClick={addColor}>+ Цвет</Button> : null}
        </div>
      </div>
    </section>
  );
  return (
    <>
      {!isPhone ? (
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
            <NumberSlider
              label="Размер кисти"
              min={1}
              max={32}
              unit=" px"
              value={brushSize}
              onChange={setBrushSize}
            />
            <span>px</span>
          </label>
          <label className="inline-field opacity-field">
            Непрозрачность{" "}
            <NumberSlider
              label="Непрозрачность кисти"
              min={0}
              max={100}
              unit="%"
              value={opacity}
              onChange={setOpacity}
            />
            <span>%</span>
          </label>
          <div className="inline-controls">
            <IconButton
              label="Отменить штрих"
              title={`Отменить: ${skin.undoLabel ?? "—"} · Ctrl+Z / ⌘Z`}
              disabled={!skin.canUndo}
              onClick={() => skin.undo()}
            >
              <ArrowUturnLeftIcon />
            </IconButton>
            <IconButton
              label="Повторить штрих"
              title={`Повторить: ${skin.redoLabel ?? "—"} · Ctrl+Shift+Z / ⇧⌘Z`}
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
      ) : null}
      <div
        className={`editor-workspace layout-${isPhone ? "split" : layout} mobile-view-${mobileView}`}
      >
        {!isPhone ? (
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
            <div className="rail-bottom">
              <div className="rail-color-controls">
                <BrushColors
                  primary={hex}
                  secondary={colors.secondary}
                  onPrimary={setHex}
                  onSecondary={setSecondary}
                />
                <div className="rail-color-actions">
                  <IconButton label="Поменять цвета · X" onClick={swapColors}>
                    ⇄
                  </IconButton>
                  <IconButton label="Добавить цвет в палитру" onClick={addColor}>
                    <DesignIcon name="plus" />
                  </IconButton>
                </div>
              </div>
              {palettePanel}
            </div>
          </aside>
        ) : null}
        <div className="editor-center">
          <div className="editor-views">
            {isPhone || layout !== "2d" || showMini ? (
              <ModelViewport
                persistWorkspace
                onFileDrop={onFileDrop}
                document={skin}
                overrides={appearance}
                preview={preview}
                hidden={hidden}
                painting={(isPhone || painting) && tool !== "hand"}
                color={color}
                brushSize={brushSize}
                activePart={selected}
                onSample={tool === "drop" ? sample : undefined}
                onPaint={onPaint}
                onHover={setHover}
                headerActions={
                  <PartsVisibility
                    tree={tree}
                    hidden={hidden}
                    onHidden={setHidden}
                    selected={selected}
                    parts={visibleParts}
                  />
                }
                textureHover={textureHover}
                showUV={showUV}
                groundGrid={options.groundGrid}
                shading="flat"
                brushPreview={tool === "brush"}
                onStats={onStats}
                animate={options.animations}
                antialiasing={options.antialiasing}
                smoothCamera={options.smoothCamera}
                mini={!isPhone && layout === "2d"}
                onClose={() => setShowMini(false)}
                title={!isPhone && layout === "2d" ? "3D-превью" : "3D-модель"}
              />
            ) : null}

            <div className="texture-slot">
              <TextureEditor
                onFileDrop={onFileDrop}
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
            {isPhone && mobileView !== "settings" ? (
              <MobileToolMenu tool={tool} lastTool={lastPaintTool} onTool={selectTool} />
            ) : null}
          </div>
          {isPhone ? palettePanel : null}
        </div>
        <aside className="inspector studio-panel editor-inspector" aria-label="Параметры документа">
          <div className="inspector-tabs" role="tablist" aria-label="Разделы документа">
            {(
              [
                ["texture", "Текстура"],
                ["skin", "Параметры скина"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`${inspectorId}-${id}-tab`}
                aria-controls={`${inspectorId}-${id}-panel`}
                aria-selected={inspectorTab === id}
                tabIndex={inspectorTab === id ? 0 : -1}
                onClick={() => setInspectorTab(id)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const tabs =
                    event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                      '[role="tab"]',
                    );
                  const index =
                    event.key === "Home" ? 0 : event.key === "End" ? 1 : id === "texture" ? 1 : 0;
                  tabs[index].focus();
                  tabs[index].click();
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="inspector-panel"
            role="tabpanel"
            id={`${inspectorId}-texture-panel`}
            aria-labelledby={`${inspectorId}-texture-tab`}
            hidden={inspectorTab !== "texture"}
            tabIndex={0}
          >
            <LayerPanel document={skin} />
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
            </div>
            <HistoryPanel document={skin} />
          </div>
          <div
            className="inspector-panel"
            role="tabpanel"
            id={`${inspectorId}-skin-panel`}
            aria-labelledby={`${inspectorId}-skin-tab`}
            hidden={inspectorTab !== "skin"}
            tabIndex={0}
          >
            <PanelHeading title="Параметры скина" description="Внешность и метаданные MLP" />
            <SkinSettings
              document={skin}
              preview={preview}
              onPreview={onPreview}
              slim={slim}
              onSlim={setSlim}
            />
          </div>
          <output
            hidden
            data-testid="render-stats"
            data-calls={stats?.calls}
            data-geometries={stats?.geometries}
            data-textures={stats?.textures}
          />
        </aside>
      </div>
      {isPhone ? (
        <MobileEditorFooter
          view={mobileView}
          onView={setMobileView}
          tool={tool}
          skin={skin}
          primary={hex}
          secondary={colors.secondary}
          onPrimary={setHex}
          onSecondary={setSecondary}
          onSwap={swapColors}
          brushSize={brushSize}
          onBrushSize={setBrushSize}
          opacity={opacity}
          onOpacity={setOpacity}
        />
      ) : null}
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
