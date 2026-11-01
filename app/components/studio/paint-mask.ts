import type { ModelQuad } from "@striped-skins/models";

/** Union of the model's rectangular UV islands; preserve gaps and mirrored/rotated ordering. */
export function uvPaintMask(quads: readonly ModelQuad[], width: number, height: number) {
  const mask = new Uint8Array(width * height);
  for (const quad of quads) {
    const xs = [0, 2, 4, 6].map((i) => quad.uv[i] * width);
    const ys = [1, 3, 5, 7].map((i) => (1 - quad.uv[i]) * height);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    if (minX >= maxX || minY >= maxY) continue;
    const left = Math.max(0, Math.floor(minX)),
      right = Math.min(width, Math.ceil(maxX));
    const top = Math.max(0, Math.floor(minY)),
      bottom = Math.min(height, Math.ceil(maxY));
    if (right <= left || bottom <= top) continue;
    for (let y = top; y < bottom; y++) mask.fill(1, y * width + left, y * width + right);
  }
  return mask;
}
