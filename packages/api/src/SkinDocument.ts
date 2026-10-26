export type Pixel = readonly [number, number, number, number];
type Change = { index: number; before: Pixel; after: Pixel };

/** One editable RGBA document shared by the 2D and 3D views; no DOM dependency. */
export class SkinDocument {
  readonly pixels: Uint8ClampedArray;
  private listeners = new Set<() => void>();
  private revision = 0;
  private stroke: Map<number, Change> | null = null;
  private undoStack: Change[][] = [];
  private redoStack: Change[][] = [];
  private lastPoint: { x: number; y: number; surface: string } | null = null;

  constructor(
    readonly width: number,
    readonly height: number,
    pixels: ArrayLike<number>,
  ) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      pixels.length !== width * height * 4
    )
      throw new Error("Invalid skin dimensions or RGBA data");
    this.pixels = new Uint8ClampedArray(pixels);
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.revision;
  private emit() {
    this.revision++;
    this.listeners.forEach((listener) => listener());
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get isDrawing() {
    return this.stroke !== null;
  }
  readPixel(x: number, y: number): Pixel {
    const i = (y * this.width + x) * 4;
    return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2], this.pixels[i + 3]];
  }
  beginStroke() {
    if (this.stroke) this.endStroke();
    this.stroke = new Map();
    this.lastPoint = null;
  }
  breakStroke() {
    this.lastPoint = null;
  }
  paint(x: number, y: number, color: Pixel, surface = "texture") {
    if (!this.stroke) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      this.breakStroke();
      return;
    }
    const previous = this.lastPoint?.surface === surface ? this.lastPoint : { x, y };
    const steps = Math.max(Math.abs(x - previous.x), Math.abs(y - previous.y), 1);
    let changed = false;
    for (let step = 0; step <= steps; step++) {
      const px = Math.round(previous.x + ((x - previous.x) * step) / steps);
      const py = Math.round(previous.y + ((y - previous.y) * step) / steps);
      // Fixed MLP trigger coordinates, independent of texture resolution.
      if (px < 4 && py < 2) continue;
      const index = (py * this.width + px) * 4;
      const before = this.readPixel(px, py);
      if (before.every((v, i) => v === color[i])) continue;
      const first = this.stroke.get(index)?.before ?? before;
      this.stroke.set(index, { index, before: first, after: [...color] });
      this.pixels.set(color, index);
      changed = true;
    }
    this.lastPoint = { x, y, surface };
    if (changed) this.emit();
  }
  endStroke() {
    if (!this.stroke) return;
    const changes = [...this.stroke.values()].filter((c) =>
      c.before.some((v, i) => v !== c.after[i]),
    );
    this.stroke = null;
    this.lastPoint = null;
    if (changes.length) {
      this.undoStack.push(changes);
      this.redoStack = [];
    }
    this.emit();
  }
  cancelStroke() {
    if (!this.stroke) return;
    this.stroke.forEach((c) => this.pixels.set(c.before, c.index));
    this.stroke = null;
    this.lastPoint = null;
    this.emit();
  }
  undo() {
    if (this.stroke) this.endStroke();
    const changes = this.undoStack.pop();
    if (changes) {
      changes.forEach((c) => this.pixels.set(c.before, c.index));
      this.redoStack.push(changes);
      this.emit();
    }
  }
  redo() {
    if (this.stroke) this.endStroke();
    const changes = this.redoStack.pop();
    if (changes) {
      changes.forEach((c) => this.pixels.set(c.after, c.index));
      this.undoStack.push(changes);
      this.emit();
    }
  }
}

export function uvToPixel(u: number, v: number, width: number, height: number) {
  return {
    x: Math.max(0, Math.min(width - 1, Math.floor(u * width))),
    y: Math.max(0, Math.min(height - 1, Math.floor((1 - v) * height))),
  };
}
