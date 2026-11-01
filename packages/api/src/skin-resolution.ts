export const MAX_SKIN_SIZE = 4096;
export const MAX_EDITABLE_SKIN_SIZE = 512;
export const SKIN_RESOLUTIONS = [64, 128, 256, 512, 1024, 2048, 4096] as const;

/** Nearest-neighbour sampling preserves pixel art and invisible RGB channels. */
export function resizeSkinPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  size: number,
) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const row = Math.floor((y * height) / size) * width;
    for (let x = 0; x < size; x++) {
      const source = (row + Math.floor((x * width) / size)) * 4;
      const target = (y * size + x) * 4;
      for (let c = 0; c < 4; c++) out[target + c] = pixels[source + c];
    }
  }
  return out;
}
