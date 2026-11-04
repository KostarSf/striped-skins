import { useTranslation } from "react-i18next";
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
import { createPartLabel, getWearableNames } from "../../i18n/model-labels";
import { documentLabel } from "../../i18n/document-labels";
import { type PreviewStats, type SurfaceHover } from "@striped-skins/viewer/experimental";
import { ModelViewport } from "./ModelViewport";
import { PartsVisibility } from "./PartsVisibility";
import { buildPartTree } from "./part-tree";
import { SkinSettings } from "./SkinSettings";
import { TextureEditor, type PaintTool } from "./TextureEditor";
import { Button, DesignIcon, IconButton, PanelHeading } from "./ui";
import { PaintPartSelect } from "./PaintPartSelect";
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
import { inspectorTabs } from "./inspector-tabs";
import type { SelectionMode } from "./rectangle-selection";
function paletteFor(pixels: Uint8ClampedArray) {
  const counts = new Map<string, number>();
  for (let i = 32; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue;
    const hex =
      "#" +
      Array.from(pixels.slice(i, i + 3))
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hex]) => hex);
}
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
  const { t } = useTranslation();
  const labelFor = createPartLabel(t);
  const wearableNames = getWearableNames(t);
  useEffect(() => {
    skin.initializeWorkspace("preview", { ...preview });
  }, [skin, preview]);
  const meta = decodeSkinMetadata(skin);
  const defaults = useViewerPreferencesContext((s) => s.userOptions);
  const [options] = useDocumentSetting(skin, "viewOptions", { ...defaults });
  const isPhone = usePhoneLayout();
  const [selectionSize, setSelectionSize] = useState(`${skin.width}x${skin.height}`);
  const [selection, setSelection] = useState<Uint8Array | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("replace");
  const textureSize = `${skin.width}x${skin.height}`;
  if (selectionSize !== textureSize) {
    setSelectionSize(textureSize);
    setSelection(null);
  }
  const [inspectorTab, setCurrentInspectorTab] = useState<"texture" | "skin">(
    () => inspectorTabs.get(skin) ?? "texture",
  );
  const setInspectorTab = (tab: "texture" | "skin") => {
    inspectorTabs.set(skin, tab);
    setCurrentInspectorTab(tab);
  };
  const [highlightedPart, setHighlightedPart] = useState<string | null>(null);
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
    setCustomColors((v) => [hex, ...v.filter((c) => c !== hex)].slice(0, 16));
  };
  const pixels = skin.pixels;
  const palette = useMemo(() => paletteFor(pixels), [pixels]);
  const pickerPalette = [...new Set([...customColors, ...palette])].filter(
    (c) => !removedColors.has(c),
  );
  const appearance = { ...meta, slim };
  const definition = resolveModel(appearance, preview);
  const parts = modelParts(definition).filter((p) => partAvailable(p.id, appearance, preview));
  const visibleParts = [
    ...parts.map((part) => ({ ...part, label: labelFor(part.id) })),
    ...resolveWearables(appearance, preview).flatMap((gear) =>
      modelParts(gearModels[gear.model]).map((p) => ({
        ...p,
        id: `gear/${gear.id}/${p.id}`,
        label: `${wearableNames[gear.id as keyof typeof wearableNames]} / ${labelFor(p.id)}`,
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
    t,
  );
  const selected = parts.some((p) => p.id === activePart) ? activePart : null;
  const availablePartIds = parts.map((part) => part.id).join("\n");
  const available = new Set(parts.map((part) => part.id));
  const partOptions = flattenNodes(definition)
    .filter((node) => available.has(node.id))
    .map((node) => ({ id: node.id, label: labelFor(node.id), quads: node.quads }));
  const highlighted = partOptions.find((part) => part.id === highlightedPart);
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
      setPainting(value !== "hand" && value !== "select");
      if (value === "select") {
        if (isPhone) setMobileView("2d");
        else setLayout((current) => (current === "3d" ? "split" : current));
      }
    },
    [setTool, setPainting, isPhone, setMobileView, setLayout],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,select,textarea,dialog,.color-picker-trigger"))
        return;
      const k = e.key.toLowerCase();
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (k === "d" || e.code === "KeyD")
      ) {
        e.preventDefault();
        setSelection(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (k === "z" || e.code === "KeyZ")) {
        e.preventDefault();
        if (e.shiftKey) skin.redo();
        else skin.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tools: Record<string, PaintTool> = { b: "brush", e: "eraser", i: "drop", h: "hand" };
      if (k === "m" || e.code === "KeyM") selectTool("select");
      else if (tools[k]) selectTool(tools[k]);
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
    [setStats],
  );
  const onPaint = useCallback(
    (p: { x: number; y: number; part: string }) => setLastPixel(p),
    [setLastPixel],
  );
  const palettePanel = (
    <section className="palette-panel" aria-label={t("colors.palette")}>
      <div className="skin-palette">
        {isPhone ? <small>{t("colors.palette")}</small> : null}
        <div>
          <span className="palette-entry">
            <IconButton className="palette-add" label={t("colors.add")} onClick={addColor}>
              <DesignIcon name="plus" />
            </IconButton>
          </span>
          {pickerPalette.map((c) => (
            <span className="palette-entry" key={c}>
              <button
                type="button"
                aria-label={t("colors.named", { color: c })}
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
                aria-label={t("colors.remove", { color: c })}
                title={t("colors.removeFromPalette")}
                onClick={() => setRemovedColors((v) => new Set([...v, c]))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
  return (
    <>
      {!isPhone ? (
        <div className="brush-toolbar" role="toolbar" aria-label={t("tools.settings")}>
          <div className="current-tool">
            <DesignIcon name={tool} />
            <strong>
              {
                {
                  brush: t("tools.brush"),
                  eraser: t("tools.eraser"),
                  drop: t("tools.eyedropper"),
                  hand: t("tools.pan"),
                  select: t("tools.rectangleSelect"),
                }[tool]
              }
            </strong>
          </div>
          <span className="toolbar-divider" />
          <label className="inline-field">
            {t("skin.size")}{" "}
            <NumberSlider
              label={t("tools.brushSize")}
              min={1}
              max={32}
              unit=" px"
              value={brushSize}
              onChange={setBrushSize}
            />
            <span>px</span>
          </label>
          <label className="inline-field opacity-field">
            {t("tools.opacity")}{" "}
            <NumberSlider
              label={t("tools.brushOpacity")}
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
              label={t("history.undoStroke")}
              title={t("history.undoShortcut", { action: documentLabel(t, skin.undoLabel) || "—" })}
              disabled={!skin.canUndo}
              onClick={() => skin.undo()}
            >
              <ArrowUturnLeftIcon />
            </IconButton>
            <IconButton
              label={t("history.redoStroke")}
              title={t("history.redoShortcut", { action: documentLabel(t, skin.redoLabel) || "—" })}
              disabled={!skin.canRedo}
              onClick={() => skin.redo()}
            >
              <ArrowUturnRightIcon />
            </IconButton>
          </div>
          <Button
            className="paint-mode"
            aria-pressed={painting && tool !== "select"}
            onClick={() => {
              if (tool === "hand" || tool === "select") selectTool("brush");
              else setPainting((v) => !v);
            }}
          >
            {painting && tool !== "select" ? t("tools.brushMode") : t("tools.orbitMode")}
          </Button>
          {layout === "2d" && !showMini ? (
            <Button onClick={() => setShowMini(true)}>{t("viewport.preview3d")}</Button>
          ) : null}
          <div className="mode-tabs layout-tabs" aria-label={t("editor.layout")}>
            {(
              [
                ["3d", "3D"],
                ["split", t("editor.sideBySide")],
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
          <aside className="tool-rail" aria-label={t("tools.label")}>
            {(
              [
                ["hand", t("tools.panShortcut")],
                ["brush", t("tools.brushShortcut")],
                ["eraser", t("tools.eraserShortcut")],
                ["drop", t("tools.eyedropperShortcut")],
                ["select", t("tools.rectangleSelectShortcut")],
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
                  palette={pickerPalette}
                />
                <IconButton label={t("colors.swapShortcut")} onClick={swapColors}>
                  ⇄
                </IconButton>
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
                painting={(isPhone || painting) && tool !== "hand" && tool !== "select"}
                paintMask={selection ?? undefined}
                color={color}
                brushSize={brushSize}
                activePart={selected}
                highlightedPart={highlighted?.id}
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
                title={!isPhone && layout === "2d" ? t("viewport.preview3d") : t("viewport.model")}
              />
            ) : null}

            <div className="texture-slot">
              <TextureEditor
                onFileDrop={onFileDrop}
                document={skin}
                color={color}
                tool={tool}
                selection={selection}
                selectionMode={selectionMode}
                onSelectionMode={setSelectionMode}
                onSelection={setSelection}
                brushSize={brushSize}
                onSample={sample}
                onPaint={onPaint}
                guides={quads}
                paintQuads={
                  selected ? partOptions.find((part) => part.id === selected)?.quads : undefined
                }
                highlightedQuads={highlighted?.quads}
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
        <aside
          className="inspector studio-panel editor-inspector"
          aria-label={t("editor.documentSettings")}
        >
          <div className="inspector-tabs" role="tablist" aria-label={t("editor.documentTabs")}>
            {(
              [
                ["texture", t("editor.textureTab")],
                ["skin", t("skin.settings")],
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
              <h3>{t("tools.surfacePainting")}</h3>
              <PaintPartSelect
                key={`${skin.id}/${skin.width}/${skin.height}/${definition.id}/${availablePartIds}`}
                document={skin}
                parts={partOptions}
                value={selected}
                onChange={setActivePart}
                onHighlight={setHighlightedPart}
                enabled={inspectorTab === "texture" && (!isPhone || mobileView === "settings")}
              />
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
            <PanelHeading title={t("skin.settings")} description={t("skin.metadata")} />
            <SkinSettings
              document={skin}
              preview={preview}
              onPreview={onPreview}
              slim={slim}
              onSlim={setSlim}
              palette={pickerPalette}
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
          palette={pickerPalette}
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
          {t("tools.brush")} <kbd>B</kbd> {t("tools.eraser")} <kbd>E</kbd> {t("tools.eyedropper")}{" "}
          <kbd>I</kbd> {t("colors.label")} <kbd>X</kbd> {t("history.undo")} <kbd>Ctrl Z</kbd>
        </span>
        <span>{t("texture.protectedPixels")}</span>
      </footer>
    </>
  );
}
