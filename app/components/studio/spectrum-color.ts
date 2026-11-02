import type { HsvColor } from "react-colorful";
import { quantizeColor } from "./color-quantization.ts";

export function hexToHsv(color: string, previous: HsvColor = { h: 0, s: 0, v: 0 }): HsvColor {
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  const sector =
    delta === 0
      ? 0
      : max === r
        ? (g - b) / delta
        : max === g
          ? 2 + (b - r) / delta
          : 4 + (r - g) / delta;
  return {
    // Hue is undefined for gray, and saturation is undefined for black.
    h: delta === 0 ? previous.h : (sector * 60 + 360) % 360,
    s: max === 0 ? previous.s : (delta / max) * 100,
    v: max * 100,
  };
}

export function hsvToHex({ h, s, v }: HsvColor): string {
  const channel = (offset: number) => {
    const k = (offset + h / 60) % 6;
    return Math.round(((255 * v) / 100) * (1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}

export function spectrumIndex(position: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.floor(position * count)));
}

export const hueSteps = (levels: number) => 6 * (levels - 1) + 1;

export function spectrumSample(hsv: HsvColor, levels: number): HsvColor {
  if (levels === 256) return hsv;
  const hues = hueSteps(levels);
  return {
    h: (spectrumIndex(hsv.h / 360, hues) * 360) / (hues - 1),
    s: (spectrumIndex(hsv.s / 100, levels) * 100) / (levels - 1),
    v: (spectrumIndex(hsv.v / 100, levels) * 100) / (levels - 1),
  };
}

export function spectrumColor(hsv: HsvColor, levels: number): string {
  return quantizeColor(hsvToHex(spectrumSample(hsv, levels)), levels);
}
