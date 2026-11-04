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
