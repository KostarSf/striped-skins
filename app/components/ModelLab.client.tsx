import { NumberSlider } from "./studio/NumberSlider";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";
import { Link } from "react-router";
import {
  SkinDocument,
  decodeSkinMetadata,
  loadSkinDocument,
  writeSkinMetadata,
  raceColors,
  tailShapeColors,
  wearableNames,
  type SkinMetadata,
  type Pixel,
} from "@striped-skins/api";
import {
  bodySizes,
  modelParts,
  flattenNodes,
  resolveWearables,
  gearModels,
  resolveModel,
  partAvailable,
  defaultPreview,
  type PreviewSettings,
  type BodySize,
  type ModelQuad,
} from "@striped-skins/models";
import { PonyPreview, type PreviewStats } from "@striped-skins/viewer/experimental";

const labels: Record<BodySize, string> = {
  NORMAL: "Стандартный",
  FOAL: "Жеребёнок",
  YEARLING: "Подросток",
  TALL: "Высокий",
  LANKY: "Вытянутый",
  BULKY: "Широкий",
};
const inputClass = "rounded border border-zinc-600 bg-zinc-800 p-2 text-sm disabled:opacity-40";

const loadSkin = loadSkinDocument;

function TextureView({
  skin,
  color,
  onPaint,
  brushSize = 1,
  zoom = 320 / skin.width,
  grid = false,
  onSample,
  guides = [],
}: {
  skin: SkinDocument;
  guides?: ModelQuad[];
  brushSize?: number;
  zoom?: number;
  grid?: boolean;
  onSample?: (pixel: Pixel) => void;
  color: Pixel;
  onPaint: (pixel: { x: number; y: number; part: string }) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  useEffect(() => {
    const update = () =>
      ref.current
        ?.getContext("2d")
        ?.putImageData(
          new ImageData(new Uint8ClampedArray(skin.pixels), skin.width, skin.height),
          0,
          0,
        );
    update();
    return skin.subscribe(update);
  }, [skin]);
  const paint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) * skin.width) / rect.width),
      y = Math.floor(((event.clientY - rect.top) * skin.height) / rect.height);
    if (onSample) {
      onSample(skin.readPixel(x, y));
      return;
    }
    skin.paint(x, y, color, "texture", brushSize);
    onPaint({ x, y, part: "2D" });
  };
  const end = () => {
    if (dragging.current) {
      dragging.current = false;
      skin.endStroke();
    }
  };
  return (
    <div className="max-h-96 overflow-auto">
      <div className="relative" style={{ width: skin.width * zoom, height: skin.height * zoom }}>
        <canvas
          ref={ref}
          width={skin.width}
          height={skin.height}
          data-testid="skin-texture"
          aria-label="Текстура скина, рисование пиксельной кистью"
          className="block touch-none cursor-crosshair bg-zinc-700"
          style={{
            imageRendering: "pixelated",
            width: skin.width * zoom,
            height: skin.height * zoom,
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            dragging.current = true;
            skin.beginStroke();
            event.currentTarget.setPointerCapture(event.pointerId);
            paint(event);
          }}
          onPointerMove={(event) => {
            if (dragging.current) paint(event);
          }}
          onPointerUp={(event) => {
            end();
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragging.current = false;
            skin.cancelStroke();
          }}
          onLostPointerCapture={end}
        />
        {guides.length ? (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${skin.width} ${skin.height}`}
          >
            {guides.map((quad) => (
              <polygon
                key={quad.id}
                points={[0, 1, 2, 3]
                  .map(
                    (i) =>
                      `${quad.uv[i * 2] * skin.width},${(1 - quad.uv[i * 2 + 1]) * skin.height}`,
                  )
                  .join(" ")}
                fill="#fb923c22"
                stroke="#fb923c"
                strokeWidth={1 / zoom}
              />
            ))}
          </svg>
        ) : null}
        {grid ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right,#ffffff33 1px,transparent 1px),linear-gradient(to bottom,#ffffff33 1px,transparent 1px)",
              backgroundSize: `${zoom}px ${zoom}px`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function SkinEditor({ skin, lab = false }: { skin: SkinDocument; lab?: boolean }) {
  const revision = useSyncExternalStore(skin.subscribe, skin.getSnapshot, skin.getSnapshot);
  const metadata = decodeSkinMetadata(skin);
  const [size, setSize] = useState<BodySize>(metadata.size);
  const [slim, setSlim] = useState(() => decodeSkinMetadata(skin).slim);
  const [preview, setPreview] = useState<PreviewSettings>(defaultPreview);
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(320 / skin.width);
  const [grid, setGrid] = useState(false);
  const [sampler, setSampler] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [painting, setPainting] = useState(false);
  const [hex, setHex] = useState("#ff00ff");
  const [erase, setErase] = useState(false);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [lastPixel, setLastPixel] = useState<{ x: number; y: number; part: string } | null>(null);
  const [stats, setStats] = useState<PreviewStats | null>(null);
  const color: Pixel = erase
    ? [0, 0, 0, 0]
    : [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
        255,
      ];
  const appearance = { ...metadata, slim, ...(lab ? { race: "EARTH" as const, size } : {}) };
  const definition = resolveModel(appearance, preview);
  const parts = modelParts(definition).filter((part) =>
    partAvailable(part.id, appearance, preview),
  );
  const visibilityParts = [
    ...parts,
    ...resolveWearables(appearance, preview).flatMap((gear) =>
      modelParts(gearModels[gear.model]).map((part) => ({
        ...part,
        id: `gear/${gear.id}/${part.id}`,
        label: `${wearableNames[gear.id as keyof typeof wearableNames]} / ${part.label}`,
      })),
    ),
  ];
  const selectedQuads =
    flattenNodes(definition).find((part) => part.id === activePart)?.quads ?? [];
  useEffect(() => {
    if (activePart && !parts.some((p) => p.id === activePart)) setActivePart(null);
  }, [activePart, parts]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches("input,select,textarea")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) skin.redo();
        else skin.undo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [skin]);
  const sample = (pixel: Pixel) => {
    setHex(
      "#" +
        pixel
          .slice(0, 3)
          .map((v) => v.toString(16).padStart(2, "0"))
          .join(""),
    );
    setErase(false);
    setSampler(false);
  };
  const onStats = useCallback(
    (next: PreviewStats) =>
      setStats((previous) =>
        previous &&
        Object.keys(next).every(
          (key) => previous[key as keyof PreviewStats] === next[key as keyof PreviewStats],
        )
          ? previous
          : next,
      ),
    [],
  );
  const onPaint = useCallback(
    (pixel: { x: number; y: number; part: string }) => setLastPixel(pixel),
    [],
  );
  const download = () => {
    const canvas = document.createElement("canvas");
    canvas.width = skin.width;
    canvas.height = skin.height;
    canvas
      .getContext("2d")!
      .putImageData(
        new ImageData(new Uint8ClampedArray(skin.pixels), skin.width, skin.height),
        0,
        0,
      );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pony-skin.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="relative h-[50svh] min-h-80 lg:h-full" aria-label="Предпросмотр модели">
        <PonyPreview
          document={skin}
          overrides={appearance}
          preview={preview}
          brushSize={brushSize}
          onSample={sampler ? sample : undefined}
          hidden={hidden}
          painting={painting}
          color={color}
          activePart={activePart}
          onStats={onStats}
          onPaint={onPaint}
        />
        <p className="pointer-events-none absolute bottom-3 left-3 text-xs text-zinc-400">
          {painting
            ? "Кисть: рисуйте на модели. Для пустого слоя выберите часть справа."
            : "Вращение: перетаскивание. Масштаб: колесо."}
        </p>
      </section>
      <aside className="space-y-4 overflow-y-auto border-l border-zinc-700 bg-zinc-900 p-4">
        <p className="text-xs text-zinc-400">
          {lab
            ? "Лабораторный предпросмотр Earthpony. Размер и Slim меняют только предпросмотр."
            : "Раса, размер и аксессуары сохраняются в PNG. Slim и раскрытие крыльев меняют предпросмотр. Изменения доступны в просмотрщике."}
        </p>
        {skin.sourceFormat === "legacy" ? (
          <p className="text-xs text-amber-300">
            Legacy-скин преобразован в квадратный формат. PNG будет сохранён в новом формате.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Размер{" "}
            <select
              aria-label="Размер модели"
              className={inputClass}
              value={lab ? size : metadata.size}
              onChange={(event) =>
                lab
                  ? setSize(event.target.value as BodySize)
                  : writeSkinMetadata(skin, { size: event.target.value as BodySize })
              }
            >
              {bodySizes.map((value) => (
                <option key={value} value={value}>
                  {labels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <input
              type="checkbox"
              checked={slim}
              onChange={(event) => setSlim(event.target.checked)}
            />{" "}
            Slim
          </label>
        </div>
        {!lab ? (
          <div className="space-y-2 text-sm">
            <label className="block">
              Раса{" "}
              <select
                aria-label="Раса"
                className={inputClass}
                value={metadata.race}
                onChange={(e) =>
                  writeSkinMetadata(skin, { race: e.target.value as SkinMetadata["race"] })
                }
              >
                {Object.keys(raceColors).map((race) => (
                  <option key={race}>{race}</option>
                ))}
              </select>
            </label>
            <label className="block">
              Морда{" "}
              <select
                aria-label="Морда"
                className={inputClass}
                value={metadata.snout}
                onChange={(e) =>
                  writeSkinMetadata(skin, { snout: e.target.value as SkinMetadata["snout"] })
                }
              >
                {["mare", "stallion", "flat"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="block">
              Форма хвоста{" "}
              <select
                aria-label="Форма хвоста"
                className={inputClass}
                value={metadata.tailShape}
                onChange={(e) =>
                  writeSkinMetadata(skin, {
                    tailShape: e.target.value as SkinMetadata["tailShape"],
                  })
                }
              >
                {Object.keys(tailShapeColors).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="block">
              Длина хвоста{" "}
              <input
                aria-label="Длина хвоста"
                type="range"
                min="0"
                max="4"
                value={metadata.tailLength}
                onChange={(e) => writeSkinMetadata(skin, { tailLength: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              Цвет свечения{" "}
              <input
                aria-label="Цвет свечения"
                type="color"
                value={`#${metadata.glow}`}
                onChange={(e) => writeSkinMetadata(skin, { glow: e.target.value.slice(1) })}
              />
            </label>
            <fieldset>
              <legend>Аксессуары ({metadata.wearables.length}/3)</legend>
              {Object.entries(wearableNames).map(([id, name]) => (
                <label key={id} className="mr-3 inline-flex gap-1">
                  <input
                    aria-label={name}
                    type="checkbox"
                    checked={metadata.wearables.includes(Number(id))}
                    disabled={
                      metadata.wearables.length >= 3 && !metadata.wearables.includes(Number(id))
                    }
                    onChange={(e) =>
                      writeSkinMetadata(skin, {
                        wearables: e.target.checked
                          ? [...metadata.wearables, Number(id)]
                          : metadata.wearables.filter((v) => v !== Number(id)),
                      })
                    }
                  />
                  {name}
                </label>
              ))}
            </fieldset>
          </div>
        ) : null}
        <label className="block text-sm">
          <input
            type="checkbox"
            checked={preview.wings === "extended"}
            onChange={(e) =>
              setPreview((p) => ({ ...p, wings: e.target.checked ? "extended" : "folded" }))
            }
          />{" "}
          Раскрыть крылья
        </label>
        {["SEAPONY", "HIPPOGRIFF"].includes(metadata.race) ? (
          <label className="block text-sm">
            Форма{" "}
            <select
              aria-label="Форма"
              value={preview.form}
              onChange={(e) =>
                setPreview((p) => ({ ...p, form: e.target.value as PreviewSettings["form"] }))
              }
              className={inputClass}
            >
              {["skin", "wet", "dry"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            className={inputClass}
            aria-pressed={painting}
            onClick={() => setPainting((value) => !value)}
          >
            {painting ? "Режим: кисть" : "Режим: вращение"}
          </button>
          <label className="flex items-center gap-2 text-sm">
            Цвет{" "}
            <input
              aria-label="Цвет кисти"
              type="color"
              value={hex}
              onChange={(event) => setHex(event.target.value)}
            />
          </label>
          <label className="text-sm">
            <input
              type="checkbox"
              checked={erase}
              onChange={(event) => setErase(event.target.checked)}
            />{" "}
            Ластик
          </label>
          <button className={inputClass} disabled={!skin.canUndo} onClick={() => skin.undo()}>
            Отменить штрих
          </button>
          <button className={inputClass} disabled={!skin.canRedo} onClick={() => skin.redo()}>
            Повторить штрих
          </button>
          <button className={inputClass} onClick={download}>
            Скачать PNG
          </button>
        </div>
        <label className="block text-sm">
          Рисовать по{" "}
          <select
            aria-label="Слой рисования"
            className={`${inputClass} mt-1 w-full`}
            value={activePart ?? ""}
            onChange={(event) => setActivePart(event.target.value || null)}
          >
            <option value="">Видимой поверхности</option>
            {parts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label>
            Кисть{" "}
            <NumberSlider
              label="Размер кисти"
              min={1}
              max={32}
              unit=" px"
              className={`${inputClass} w-16`}
              value={brushSize}
              onChange={setBrushSize}
            />
          </label>
          <button
            className={inputClass}
            aria-pressed={sampler}
            onClick={() => {
              setSampler((v) => !v);
              setPainting(true);
            }}
          >
            Пипетка
          </button>
          <button className={inputClass} onClick={() => setZoom((z) => Math.min(32, z * 1.5))}>
            2D +
          </button>
          <button className={inputClass} onClick={() => setZoom((z) => Math.max(0.125, z / 1.5))}>
            2D −
          </button>
          <label>
            <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />{" "}
            Сетка
          </label>
          <button
            className={inputClass}
            disabled={!activePart}
            onClick={() =>
              setHidden(
                (current) =>
                  new Set([
                    ...current,
                    ...visibilityParts
                      .filter((p) => p.id === activePart || p.id.startsWith(activePart + "/"))
                      .map((p) => p.id),
                  ]),
              )
            }
          >
            Скрыть ветку
          </button>
          <button className={inputClass} onClick={() => setHidden(new Set())}>
            Показать всё
          </button>
          <button
            className={inputClass}
            disabled={!activePart}
            onClick={() =>
              setHidden(
                new Set(visibilityParts.filter((p) => p.id !== activePart).map((p) => p.id)),
              )
            }
          >
            Изолировать часть
          </button>
        </div>
        <TextureView
          skin={skin}
          color={color}
          onPaint={onPaint}
          brushSize={brushSize}
          zoom={zoom}
          grid={grid}
          guides={selectedQuads}
          onSample={sampler ? sample : undefined}
        />

        <output
          className="block text-xs text-zinc-400"
          data-testid="document-status"
          data-revision={revision}
          data-pixel={lastPixel ? `${lastPixel.x},${lastPixel.y}` : ""}
        >
          {skin.width}×{skin.height} · изменений: {revision}
          {lastPixel ? ` · пиксель ${lastPixel.x}, ${lastPixel.y} (${lastPixel.part})` : ""}.
          Служебные пиксели защищены.
        </output>
        <details open>
          <summary className="cursor-pointer text-sm">Видимость частей</summary>
          <div className="mt-2 space-y-1">
            {visibilityParts.map((part) => (
              <label key={part.id} className="flex gap-2 text-xs">
                <input
                  type="checkbox"
                  aria-label={`Показать ${part.id}`}
                  checked={!hidden.has(part.id)}
                  onChange={(event) =>
                    setHidden((previous) => {
                      const next = new Set(previous);
                      if (event.target.checked) next.delete(part.id);
                      else next.add(part.id);
                      return next;
                    })
                  }
                />
                {part.label}
              </label>
            ))}
          </div>
        </details>
        <output
          data-testid="render-stats"
          data-calls={stats?.calls}
          data-geometries={stats?.geometries}
          data-textures={stats?.textures}
          className="block text-xs text-zinc-500"
        >
          {stats
            ? `${stats.calls} draw calls · ${stats.triangles} треугольников · ${stats.geometries} геометрий · ${stats.textures} текстур`
            : "Подготовка сцены…"}
        </output>
      </aside>
    </div>
  );
}

export default function ModelLab() {
  const [skin, setSkin] = useState<SkinDocument | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    loadSkin("/steve_pony.png")
      .then((value) => {
        if (id === request.current) {
          setSkin(value);
          setGeneration((value) => value + 1);
        }
      })
      .catch((reason) => {
        if (id === request.current) setError(String(reason));
      })
      .finally(() => {
        if (id === request.current) setLoading(false);
      });
    return () => {
      request.current = -1;
    };
  }, []);
  return (
    <main className="flex h-[100svh] flex-col overflow-y-auto bg-zinc-950 text-zinc-100 lg:overflow-hidden">
      <header className="flex flex-wrap items-center gap-4 border-b border-zinc-700 px-5 py-3">
        <Link to="/" className="text-sm text-orange-400">
          ← Viewer
        </Link>
        <h1 className="text-base font-semibold">Лаборатория моделей</h1>
        <label className="text-sm">
          Открыть PNG{" "}
          <input
            aria-label="Открыть PNG"
            type="file"
            accept="image/png"
            disabled={loading}
            className="max-w-56 text-xs"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const id = ++request.current;
              const url = URL.createObjectURL(file);
              setError("");
              setLoading(true);
              try {
                const value = await loadSkin(url);
                if (id === request.current) {
                  setSkin(value);
                  setGeneration((value) => value + 1);
                }
              } catch (reason) {
                if (id === request.current) setError(String(reason));
              } finally {
                URL.revokeObjectURL(url);
                if (id === request.current) setLoading(false);
                event.target.value = "";
              }
            }}
          />
        </label>
        {loading ? <output>Загрузка…</output> : null}
      </header>
      {error ? (
        <p role="alert" className="px-5 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {skin ? <SkinEditor key={generation} skin={skin} lab /> : null}
    </main>
  );
}
