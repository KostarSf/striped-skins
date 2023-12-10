import type { PixelColorData } from "./ImageTransformer";

export function toHexColor(
  color: PixelColorData,
  sharp = true,
  alpha = true
) {
  return (
    (!sharp ? "" : "#") +
    color[0].toString(16) +
    color[1].toString(16) +
    color[2].toString(16) +
    (!alpha ? "" : color[3] !== 255 ? color[3].toString(16) : "")
  );
}

export function fromHexColor(color: string) {
  if (color.startsWith("#")) {
    color = color.substring(1);
  }

  const hasAlpha = color.length > 6;

  return [
    parseInt(color.substring(0, 2), 16),
    parseInt(color.substring(2, 4), 16),
    parseInt(color.substring(4, 6), 16),
    hasAlpha ? parseInt(color.substring(6, 8), 16) : 255,
  ];
}
