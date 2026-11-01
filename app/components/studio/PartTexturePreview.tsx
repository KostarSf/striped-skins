import { memo, useEffect, useRef } from "react";
import type { ModelQuad } from "@striped-skins/models";

/** Keep the atlas layout, cropping to this part and masking out neighbouring UV islands. */
export const PartTexturePreview = memo(function PartTexturePreview({
  atlas,
  quads,
  revision,
}: {
  atlas: HTMLCanvasElement;
  quads: readonly ModelQuad[];
  revision: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.resetTransform();
    context.clearRect(0, 0, 64, 64);
    const polygons = quads.map((quad) =>
      [0, 1, 2, 3].map((i) => [
        quad.uv[i * 2] * atlas.width,
        (1 - quad.uv[i * 2 + 1]) * atlas.height,
      ]),
    );
    if (!polygons.length) return;
    const points = polygons.flat();
    const left = Math.max(0, Math.floor(Math.min(...points.map(([x]) => x))));
    const top = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
    const right = Math.min(atlas.width, Math.ceil(Math.max(...points.map(([x]) => x))));
    const bottom = Math.min(atlas.height, Math.ceil(Math.max(...points.map(([, y]) => y))));
    if (right <= left || bottom <= top) return;
    const scale = Math.min(60 / (right - left), 60 / (bottom - top));
    context.save();
    context.translate((64 - (right - left) * scale) / 2, (64 - (bottom - top) * scale) / 2);
    context.scale(scale, scale);
    context.translate(-left, -top);
    const mask = new Path2D();
    for (const polygon of polygons) {
      // Mirrored faces must have the same winding so shared UVs form a union, not holes.
      const area = polygon.reduce((sum, [x, y], i) => {
        const next = polygon[(i + 1) % polygon.length];
        return sum + x * next[1] - next[0] * y;
      }, 0);
      if (area < 0) polygon.reverse();
      polygon.forEach(([x, y], i) => (i ? mask.lineTo(x, y) : mask.moveTo(x, y)));
      mask.closePath();
    }
    context.clip(mask);
    context.imageSmoothingEnabled = false;
    context.drawImage(atlas, 0, 0);
    context.restore();
  }, [atlas, quads, revision]);
  return (
    <canvas
      ref={canvas}
      width={64}
      height={64}
      className="part-texture-preview"
      aria-hidden="true"
    />
  );
});
