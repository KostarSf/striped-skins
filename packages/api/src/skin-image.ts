import { SkinError } from "./SkinError.js";
import { SkinDocument } from "./SkinDocument.js";
import { MAX_SKIN_SIZE } from "./skin-resolution.js";
import { ImageTransformer } from "./utils/ImageTransformer.js";
import { loadImage } from "./utils/image.js";

/** Normalizes vanilla legacy limb islands, then MLP's extra wing island. */
export function normalizeSkinPixels(
  width: number,
  height: number,
  pixels: ArrayLike<number>,
  baseLayerName?: string,
): SkinDocument {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 64 ||
    width > MAX_SKIN_SIZE ||
    width % 64 !== 0 ||
    (height !== width && height !== width / 2)
  )
    throw new SkinError(
      "invalidDimensions",
      "Нужен PNG 64×64, 64×32 или их HD-вариант (до 4096 пикселей)",
    );
  if (pixels.length !== width * height * 4)
    throw new SkinError("invalidImage", "Invalid image data");
  if (width === height) return new SkinDocument(width, height, pixels, "modern", baseLayerName);
  const out = new Uint8ClampedArray(width * width * 4);
  out.set(pixels);
  const m = width / 64;
  const copy = (
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    w: number,
    h: number,
    flip = true,
  ) => {
    for (let y = 0; y < h * m; y++)
      for (let x = 0; x < w * m; x++) {
        const from = ((sy * m + y) * width + sx * m + (flip ? w * m - 1 - x : x)) * 4,
          to = ((dy * m + y) * width + dx * m + x) * 4;
        out.set(out.slice(from, from + 4), to);
      }
  };
  // Minecraft SkinTextureDownloader legacy conversion (destination coordinates).
  for (const [sx, sy, dx, dy, w, h] of [
    [4, 16, 20, 48, 4, 4],
    [8, 16, 24, 48, 4, 4],
    [8, 20, 16, 52, 4, 12],
    [4, 20, 20, 52, 4, 12],
    [0, 20, 24, 52, 4, 12],
    [12, 20, 28, 52, 4, 12],
    [44, 16, 36, 48, 4, 4],
    [48, 16, 40, 48, 4, 4],
    [48, 20, 32, 52, 4, 12],
    [44, 20, 36, 52, 4, 12],
    [40, 20, 40, 52, 4, 12],
    [52, 20, 44, 52, 4, 12],
  ])
    copy(sx, sy, dx, dy, w, h);
  // MLP LegacySkinConverter: copy right wing into its modern counterpart.
  for (const [sx, sy, dx, dy, w, h] of [
    [58, 16, 58, 32, 2, 2],
    [60, 16, 60, 32, 2, 2],
    [60, 18, 56, 34, 2, 14],
    [58, 18, 58, 34, 2, 14],
    [56, 18, 60, 34, 2, 14],
    [62, 18, 62, 34, 2, 14],
  ])
    copy(sx, sy, dx, dy, w, h);
  return new SkinDocument(width, width, out, "legacy", baseLayerName);
}
export async function loadSkinDocument(url: string, baseLayerName?: string): Promise<SkinDocument> {
  const image = await loadImage(url);
  if (image.width > MAX_SKIN_SIZE || image.height > MAX_SKIN_SIZE)
    throw new SkinError("invalidDimensions", "Максимальный размер скина — 4096 пикселей");
  const transformer = new ImageTransformer();
  await transformer.setImage(image);
  const canvas = transformer.canvas!;
  return normalizeSkinPixels(
    canvas.width,
    canvas.height,
    canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data,
    baseLayerName,
  );
}
export function documentCanvas(document: SkinDocument): HTMLCanvasElement {
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = document.width;
  canvas.height = document.height;
  canvas
    .getContext("2d")!
    .putImageData(
      new ImageData(new Uint8ClampedArray(document.pixels), document.width, document.height),
      0,
      0,
    );
  return canvas;
}

/** Export a fresh PNG with only image data, never color profiles or other metadata. */
export async function exportSkinPNG(document: SkinDocument): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    documentCanvas(document).toBlob(resolve, "image/png"),
  );
  if (!blob) throw new SkinError("exportPng", "Не удалось экспортировать PNG");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const chunks = [bytes.subarray(0, 8)]; // PNG signature
  const imageChunks = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
  for (let offset = 8; offset < bytes.length;) {
    const end = offset + view.getUint32(offset) + 12;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    // Retained chunks keep their original CRC; color/profile chunks are omitted.
    if (imageChunks.has(type)) chunks.push(bytes.subarray(offset, end));
    offset = end;
  }
  return new Blob(chunks, { type: "image/png" });
}
