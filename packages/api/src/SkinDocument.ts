export type PaintBounds = { minX: number; minY: number; maxX: number; maxY: number };
export type Pixel = readonly [number, number, number, number];
type Change = { index: number; before: Pixel; after: Pixel };
let documentSequence = 0;

/** One editable RGBA document shared by the 2D and 3D views; no DOM dependency. */
export class SkinDocument {
  readonly id = ++documentSequence;
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
    readonly sourceFormat: "modern" | "legacy" = "modern",
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
  editPixels(changes: { x: number; y: number; color: Pixel }[]) {
    this.beginStroke();
    for (const { x, y, color } of changes) {
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 0 ||
        y < 0 ||
        x >= this.width ||
        y >= this.height
      )
        continue;
      const index = (y * this.width + x) * 4;
      this.stroke!.set(index, { index, before: this.readPixel(x, y), after: [...color] });
      this.pixels.set(color, index);
    }
    this.endStroke();
  }
  snapshot() {
    return {
      version: 1,
      width: this.width,
      height: this.height,
      pixels: Array.from(this.pixels),
      sourceFormat: this.sourceFormat,
    };
  }
  clone() {
    return new SkinDocument(this.width, this.height, this.pixels, this.sourceFormat);
  }
  static restore(snapshot: ReturnType<SkinDocument["snapshot"]>) {
    if (snapshot.version !== 1 || snapshot.width > 2048 || snapshot.height > 2048)
      throw new Error("Unsupported document snapshot");
    return new SkinDocument(
      snapshot.width,
      snapshot.height,
      snapshot.pixels,
      snapshot.sourceFormat,
    );
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
  paint(
    x: number,
    y: number,
    color: Pixel,
    surface = "texture",
    brushSize = 1,
    bounds?: PaintBounds,
  ) {
    if (!this.stroke) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    brushSize = Math.max(1, Math.min(64, Math.floor(brushSize) || 1));
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
      for (let by = 0; by < brushSize; by++)
        for (let bx = 0; bx < brushSize; bx++) {
          const px =
            Math.round(previous.x + ((x - previous.x) * step) / steps) +
            bx -
            Math.floor((brushSize - 1) / 2);
          const py =
            Math.round(previous.y + ((y - previous.y) * step) / steps) +
            by -
            Math.floor((brushSize - 1) / 2);
          if (px < 0 || py < 0 || px >= this.width || py >= this.height) continue;
          if (
            bounds &&
            (px < bounds.minX || px > bounds.maxX || py < bounds.minY || py > bounds.maxY)
          )
            continue;
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
