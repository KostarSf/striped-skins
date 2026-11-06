export const selectionModes = ["replace", "add", "subtract", "difference"] as const;
export type SelectionMode = (typeof selectionModes)[number];
export type TexturePoint = { x: number; y: number };
export type SelectionRect = TexturePoint & { width: number; height: number };

export function selectionModeFor(
  event: { shiftKey: boolean; altKey: boolean },
  fallback: SelectionMode,
): SelectionMode {
  if (event.shiftKey && event.altKey) return "difference";
  if (event.shiftKey) return "add";
  if (event.altKey) return "subtract";
  return fallback;
}

export function selectionRect(
  start: TexturePoint,
  end: TexturePoint,
  width: number,
  height: number,
): SelectionRect {
  const x = Math.max(0, Math.min(start.x, end.x));
  const y = Math.max(0, Math.min(start.y, end.y));
  return {
    x,
    y,
    width: Math.min(width, Math.max(start.x, end.x) + 1) - x,
    height: Math.min(height, Math.max(start.y, end.y) + 1) - y,
  };
}

export function applyRectangleSelection(
  current: Uint8Array | null,
  rect: SelectionRect,
  mode: SelectionMode,
  width: number,
  height: number,
) {
  if (!current && mode === "subtract") return null;
  const next = mode !== "replace" && current ? current.slice() : new Uint8Array(width * height);
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    const start = y * width + rect.x;
    const end = start + rect.width;
    if (mode === "difference") {
      for (let i = start; i < end; i++) next[i] ^= 1;
    } else {
      next.fill(mode === "subtract" ? 0 : 1, start, end);
    }
  }
  return next;
}

/** Only exposed edges, merged into runs to keep HD contours compact. */
export function selectionOutline(mask: Uint8Array, width: number, height: number): string {
  const paths: string[] = [];
  for (let y = 0; y <= height; y++) {
    let start = -1;
    let previous = 0;
    for (let x = 0; x <= width; x++) {
      const above = y > 0 && x < width ? mask[(y - 1) * width + x] : 0;
      const below = y < height && x < width ? mask[y * width + x] : 0;
      const edge = above !== below ? (above ? 1 : -1) : 0;
      if (edge !== previous) {
        if (start !== -1) paths.push(`M${start} ${y}H${x}`);
        start = edge ? x : -1;
        previous = edge;
      }
    }
  }
  for (let x = 0; x <= width; x++) {
    let start = -1;
    let previous = 0;
    for (let y = 0; y <= height; y++) {
      const left = x > 0 && y < height ? mask[y * width + x - 1] : 0;
      const right = x < width && y < height ? mask[y * width + x] : 0;
      const edge = left !== right ? (left ? 1 : -1) : 0;
      if (edge !== previous) {
        if (start !== -1) paths.push(`M${x} ${start}V${y}`);
        start = edge ? y : -1;
        previous = edge;
      }
    }
  }
  return paths.join("");
}

export function selectionCursor(mode: SelectionMode): string {
  const badge = {
    replace: "",
    add: '<path d="M23 17v12m-6-6h12"/>',
    subtract: '<path d="M17 23h12"/>',
    difference: '<path d="m18 18 10 10m0-10L18 28"/>',
  }[mode];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke="#101014" stroke-width="3"><path d="M8 1v14M1 8h14"/>${badge}</g><g fill="none" stroke="white" stroke-width="1"><path d="M8 1v14M1 8h14"/>${badge}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 8 8, crosshair`;
}
