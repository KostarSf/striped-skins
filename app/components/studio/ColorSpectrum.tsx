import { useMemo, useState, type CSSProperties } from "react";
import { HsvColorPicker, type HsvColor } from "react-colorful";
import { hexToHsv, hueSteps, spectrumColor, spectrumIndex, spectrumSample } from "./spectrum-color";

function gridImage(hue: number, levels: number): string {
  const cells = Array.from({ length: levels * levels }, (_, index) => {
    const x = index % levels,
      y = Math.floor(index / levels);
    const fill = spectrumColor(
      { h: hue, s: (x * 100) / (levels - 1), v: ((levels - 1 - y) * 100) / (levels - 1) },
      levels,
    );
    return `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
  }).join("");
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${levels} ${levels}" preserveAspectRatio="none" shape-rendering="crispEdges">${cells}</svg>`)}")`;
}

function hueImage(levels: number): string {
  const count = hueSteps(levels);
  return `linear-gradient(to right, ${Array.from({ length: count }, (_, index) => {
    const color = spectrumColor({ h: (index * 360) / (count - 1), s: 100, v: 100 }, levels);
    return `${color} ${(index * 100) / count}% ${((index + 1) * 100) / count}%`;
  }).join(", ")})`;
}

export function ColorSpectrum({
  color,
  onChange,
  levels,
  label,
}: {
  color: string;
  onChange: (color: string) => void;
  levels: number;
  label: string;
}) {
  // Keep the gesture in HSV: feeding quantized RGB back into the picker loses
  // hue on gray/black and shifts the selection between neighboring cells.
  const [selection, setSelection] = useState(() => ({ color, hsv: hexToHsv(color) }));
  if (selection.color !== color) {
    setSelection({ color, hsv: hexToHsv(color, selection.hsv) });
  }
  const hsv = selection.hsv;
  const quantized = levels !== 256;
  const hue = spectrumSample(hsv, levels).h;
  const grid = useMemo(
    () => (quantized ? gridImage(hue, levels) : undefined),
    [hue, levels, quantized],
  );
  const strip = useMemo(() => (quantized ? hueImage(levels) : undefined), [levels, quantized]);
  const choose = (next: HsvColor) => {
    const hex = spectrumColor(next, levels);
    setSelection({ color: hex, hsv: next });
    onChange(hex);
  };
  const style = quantized
    ? ({
        "--spectrum-grid": grid,
        "--spectrum-hues": strip,
        "--spectrum-columns": levels,
        "--spectrum-x": `${((spectrumIndex(hsv.s / 100, levels) + 0.5) * 100) / levels}%`,
        "--spectrum-y": `${((levels - spectrumIndex(hsv.v / 100, levels) - 0.5) * 100) / levels}%`,
        "--spectrum-h": `${((spectrumIndex(hsv.h / 360, hueSteps(levels)) + 0.5) * 100) / hueSteps(levels)}%`,
        "--spectrum-color": spectrumColor(hsv, levels),
        "--spectrum-hue-color": spectrumColor({ h: hsv.h, s: 100, v: 100 }, levels),
      } as CSSProperties)
    : undefined;
  return (
    <HsvColorPicker
      color={hsv}
      onChange={choose}
      aria-label={label}
      className={quantized ? "color-spectrum-stepped" : undefined}
      style={style}
      onKeyDownCapture={(event) => {
        if (!quantized || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
          return;
        const target = event.target as HTMLElement;
        const isHue = !!target.closest(".react-colorful__hue");
        const axis = isHue
          ? "h"
          : event.key === "ArrowLeft" || event.key === "ArrowRight"
            ? "s"
            : "v";
        const count = isHue ? hueSteps(levels) : levels;
        const max = isHue ? 360 : 100;
        const direction = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1;
        const index = Math.max(
          0,
          Math.min(count - 1, spectrumIndex(hsv[axis] / max, count) + direction),
        );
        event.preventDefault();
        event.stopPropagation();
        choose({ ...hsv, [axis]: ((index + 0.5) * max) / count });
      }}
    />
  );
}
