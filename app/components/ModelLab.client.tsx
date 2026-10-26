import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";
import { Link } from "react-router";
import { SkinDocument, decodeSkinMetadata, type Pixel } from "@striped-skins/api";
import { bodySizes, earthponyModels, modelParts, type BodySize } from "@striped-skins/models";
import { EarthponyPreview, type PreviewStats } from "@striped-skins/viewer/experimental";

const labels: Record<BodySize, string> = {
  NORMAL: "Стандартный",
  FOAL: "Жеребёнок",
  YEARLING: "Подросток",
  TALL: "Высокий",
  LANKY: "Вытянутый",
  BULKY: "Широкий",
};
const inputClass = "rounded border border-zinc-600 bg-zinc-800 p-2 text-sm disabled:opacity-40";

async function loadSkin(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  if (
    image.width < 64 ||
    image.width > 2048 ||
    image.width !== image.height ||
    image.width % 64 !== 0
  )
    throw new Error(
      "В этом срезе поддерживаются квадратные PNG 64×64 и HD до 2048×2048. Старые 64×32 пока открывайте в основном viewer.",
    );
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0);
  return new SkinDocument(
    image.width,
    image.height,
    context.getImageData(0, 0, image.width, image.height).data,
  );
}

function TextureView({
  skin,
  color,
  onPaint,
}: {
  skin: SkinDocument;
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
    skin.paint(x, y, color);
    onPaint({ x, y, part: "2D" });
  };
  const end = () => {
    if (dragging.current) {
      dragging.current = false;
      skin.endStroke();
    }
  };
  return (
    <canvas
      ref={ref}
      width={skin.width}
      height={skin.height}
      data-testid="skin-texture"
      aria-label="Текстура скина, рисование пиксельной кистью"
      className="w-full max-w-80 aspect-square border border-zinc-600 touch-none cursor-crosshair bg-zinc-700"
      style={{ imageRendering: "pixelated" }}
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
  );
}

function Editor({ skin }: { skin: SkinDocument }) {
  const revision = useSyncExternalStore(skin.subscribe, skin.getSnapshot, skin.getSnapshot);
  const metadata = decodeSkinMetadata(skin);
  const [size, setSize] = useState<BodySize>(metadata.size);
  const [slim, setSlim] = useState(false);
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
  const parts = modelParts(earthponyModels[slim ? "alex" : "steve"]).filter(
    (part) =>
      !part.id.startsWith("head/nose") &&
      !part.id.startsWith("neck/mane") &&
      (!part.id.includes("/snout/") || part.id.endsWith(`/${metadata.snout}`)),
  );
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
      a.download = "earthpony-skin.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="relative h-[50svh] min-h-80 lg:h-full" aria-label="Предпросмотр модели">
        <EarthponyPreview
          document={skin}
          size={size}
          slim={slim}
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
          Предпросмотр Earthpony. Параметры ниже не меняют расу и размер в PNG. Аксессуары и другие
          расы появятся на следующих этапах.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Размер{" "}
            <select
              aria-label="Размер модели"
              className={inputClass}
              value={size}
              onChange={(event) => setSize(event.target.value as BodySize)}
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
        <TextureView skin={skin} color={color} onPaint={onPaint} />
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
            {parts.map((part) => (
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
      {skin ? <Editor key={generation} skin={skin} /> : null}
    </main>
  );
}
