export const colorLevels = [2, 4, 8, 16, 32, 256] as const;
export const colorQuantizationKey = "striped-skins:color-levels:v1";

export function normalizeColorLevels(value: unknown): number {
  return colorLevels.some((level) => level === value) ? Number(value) : 256;
}

/** Equal RGB bins, matching SVG's discrete component transfer in sRGB. */
export function quantizeColor(color: string, levels: number): string {
  if (normalizeColorLevels(levels) === 256) return color.toLowerCase();
  return (
    "#" +
    [1, 3, 5]
      .map((offset) => {
        const channel = parseInt(color.slice(offset, offset + 2), 16);
        const bin = Math.min(levels - 1, Math.floor((channel * levels) / 256));
        return Math.round((bin * 255) / (levels - 1))
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

export function readColorLevels(fallback = 256): number {
  try {
    const saved = localStorage.getItem(colorQuantizationKey);
    return saved === null ? fallback : normalizeColorLevels(Number(saved));
  } catch {
    return fallback;
  }
}
