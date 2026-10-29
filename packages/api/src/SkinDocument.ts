export type PaintBounds = { minX: number; minY: number; maxX: number; maxY: number };
export type Pixel = readonly [number, number, number, number];
export type LayerNode = {
  id: string;
  kind: "layer" | "group";
  name: string;
  parentId: string | null;
  visible: boolean;
  locked: boolean;
  alphaLocked: boolean;
  opacity: number;
  pixels?: Uint8ClampedArray;
};
export type WorkspaceValue =
  | null
  | boolean
  | number
  | string
  | WorkspaceValue[]
  | { [key: string]: WorkspaceValue };
type Change = { index: number; before: Pixel; after: Pixel };
type Structure = { layers: LayerNode[]; activeLayerId: string };
type Command = {
  label: string;
  beforeId: number;
  afterId: number;
} & (
  | { kind: "pixels"; layerId: string | null; changes: Change[] }
  | { kind: "structure"; before: Structure; after: Structure }
);
export type ProjectSnapshot = {
  version: 2;
  width: number;
  height: number;
  sourceFormat: "modern" | "legacy";
  pixels: Uint8ClampedArray;
  metadata: Uint8ClampedArray;
  layers: LayerNode[];
  activeLayerId: string;
  workspace: Record<string, WorkspaceValue>;
  stateId: number;
  nextId: number;
  workspaceRevision: number;
  undo: Command[];
  redo: Command[];
};
type LegacySnapshot = {
  version: 1;
  width: number;
  height: number;
  sourceFormat: "modern" | "legacy";
  pixels: ArrayLike<number>;
};
let documentSequence = 0;
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_HISTORY = 100;
const HISTORY_BYTES = 32 * 1024 * 1024;
const isTrigger = (x: number, y: number) => x < 4 && y < 2;
const copy = <T>(value: T): T => structuredClone(value);

/** Raster layers are stored bottom to top; groups composite in isolation. No DOM dependency. */
export class SkinDocument {
  readonly id = ++documentSequence;
  readonly pixels: Uint8ClampedArray;
  private metadata: Uint8ClampedArray;
  private nodes: LayerNode[];
  private active: string;
  private sequence = 1;
  private stateId = 0;
  private nextId = 1;
  private workspaceRevision = 0;
  private workspace: Record<string, WorkspaceValue> = {};
  private listeners = new Set<() => void>();
  private revision = 0;
  private rasterRevisions = new Map<string, number>();
  private historyInteraction: string | undefined;
  private stroke: { layerId: string | null; changes: Map<number, Change> } | null = null;
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
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
      width < 4 ||
      height < 2 ||
      width > 2048 ||
      height > 2048 ||
      pixels.length !== width * height * 4
    )
      throw new Error("Invalid skin dimensions or RGBA data");
    this.pixels = new Uint8ClampedArray(pixels);
    this.metadata = new Uint8ClampedArray(32);
    for (let y = 0; y < 2; y++)
      this.metadata.set(this.pixels.subarray(y * width * 4, y * width * 4 + 16), y * 16);
    this.active = "layer-1";
    this.nodes = [
      {
        id: this.active,
        kind: "layer",
        name: "Основа",
        parentId: null,
        visible: true,
        locked: false,
        alphaLocked: false,
        opacity: 100,
        pixels: new Uint8ClampedArray(pixels),
      },
    ];
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.revision;
  getLayerRevision(id: string) {
    return this.rasterRevisions.get(id) ?? 0;
  }
  private rasterChanged(id: string) {
    this.rasterRevisions.set(id, this.getLayerRevision(id) + 1);
  }
  private emit() {
    this.revision++;
    this.listeners.forEach((listener) => listener());
  }
  get layers(): readonly Readonly<LayerNode>[] {
    return this.nodes;
  }
  get activeLayerId() {
    return this.active;
  }
  get activeLayer() {
    return this.nodes.find((n) => n.id === this.active)!;
  }
  get saveToken() {
    return `${this.stateId}:${this.workspaceRevision}:${this.active}`;
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get undoLabel() {
    return this.undoStack.at(-1)?.label;
  }
  get redoLabel() {
    return this.redoStack.at(-1)?.label;
  }
  get history() {
    return this.undoStack.map((c) => c.label);
  }
  get isDrawing() {
    return this.stroke !== null;
  }
  get paintBlockedReason(): string | null {
    const node = this.activeLayer;
    if (node.kind !== "layer") return "Выберите слой рисунка внутри группы";
    for (let n: LayerNode | undefined = node; n; n = this.nodes.find((v) => v.id === n!.parentId)) {
      if (n.locked) return "Слой или его группа заблокированы";
      if (!n.visible || n.opacity === 0) return "Слой или его группа скрыты";
    }
    return null;
  }
  getWorkspace<T extends WorkspaceValue>(key: string, fallback: T): T {
    return (this.workspace[key] as T | undefined) ?? fallback;
  }
  initializeWorkspace(key: string, value: WorkspaceValue) {
    if (this.workspace[key] === undefined)
      this.workspace = { ...this.workspace, [key]: copy(value) };
  }
  setWorkspace(key: string, value: WorkspaceValue) {
    if (JSON.stringify(this.workspace[key]) === JSON.stringify(value)) return;
    this.workspace = { ...this.workspace, [key]: copy(value) };
    this.workspaceRevision++;
    this.emit();
  }
  setActiveLayer(id: string) {
    this.endStroke();
    if (this.active === id || !this.nodes.some((n) => n.id === id)) return;
    this.active = id;
    this.emit();
  }
  private structure(): Structure {
    return { layers: this.nodes.map((n) => ({ ...n })), activeLayerId: this.active };
  }
  private restoreStructure(state: Structure) {
    this.nodes = state.layers.map((n) => ({ ...n }));
    this.active = state.activeLayerId;
  }
  private push(command: Command, interaction?: string) {
    const previous = this.undoStack.at(-1);
    if (
      interaction &&
      interaction === this.historyInteraction &&
      previous?.kind === "structure" &&
      command.kind === "structure" &&
      previous.afterId === command.beforeId &&
      !this.redoStack.length
    ) {
      command.before = previous.before;
      command.beforeId = previous.beforeId;
      this.undoStack.pop();
    }
    this.historyInteraction = interaction;
    this.undoStack.push(command);
    this.redoStack = [];
    this.stateId = command.afterId;
    // Bound retained buffers as well as pixel deltas, including deleted/merged HD layers.
    const size = () => {
      const buffers = new Set<Uint8ClampedArray>();
      let bytes = 0;
      for (const c of this.undoStack) {
        if (c.kind === "pixels") bytes += c.changes.length * 40;
        else
          for (const state of [c.before, c.after])
            for (const n of state.layers) if (n.pixels) buffers.add(n.pixels);
      }
      return bytes + [...buffers].reduce((sum, b) => sum + b.byteLength, 0);
    };
    while (
      this.undoStack.length > MAX_HISTORY ||
      (this.undoStack.length > 1 && size() > HISTORY_BYTES)
    )
      this.undoStack.shift();
  }
  private changeStructure(label: string, update: () => void, interaction?: string) {
    this.endStroke();
    const before = this.structure();
    update();
    const after = this.structure();
    if (
      JSON.stringify(before.layers.map(({ pixels: _pixels, ...n }) => n)) ===
        JSON.stringify(after.layers.map(({ pixels: _pixels, ...n }) => n)) &&
      before.activeLayerId === after.activeLayerId
    )
      return;
    this.push(
      {
        kind: "structure",
        label,
        before,
        after,
        beforeId: this.stateId,
        afterId: this.nextId++,
      },
      interaction,
    );
    this.compose();
    this.emit();
  }
  private descendants(id: string): Set<string> {
    const ids = new Set([id]);
    let previous = 0;
    while (previous !== ids.size) {
      previous = ids.size;
      for (const n of this.nodes) if (n.parentId && ids.has(n.parentId)) ids.add(n.id);
    }
    return ids;
  }
  get canAddLayer() {
    return (
      this.nodes.length < 128 &&
      (this.nodes.filter((n) => n.kind === "layer").length + 1) * this.pixels.length <= MAX_BYTES
    );
  }
  addLayer(kind: "layer" | "group" = "layer", parentId?: string | null) {
    if (this.nodes.length >= 128 || (kind === "layer" && !this.canAddLayer))
      throw new Error("Достигнут лимит слоёв или памяти проекта (64 МиБ)");
    const current = this.activeLayer;
    const parent =
      parentId === undefined
        ? current.kind === "group"
          ? current.id
          : current.parentId
        : parentId;
    if (parent && !this.nodes.some((n) => n.id === parent && n.kind === "group")) return;
    const id = `layer-${++this.sequence}`;
    this.changeStructure(kind === "group" ? "Создание группы" : "Создание слоя", () => {
      this.nodes.push({
        id,
        kind,
        name: kind === "group" ? "Группа" : "Новый слой",
        parentId: parent,
        visible: true,
        locked: false,
        alphaLocked: false,
        opacity: 100,
        ...(kind === "layer" ? { pixels: new Uint8ClampedArray(this.pixels.length) } : {}),
      });
      this.active = id;
    });
    return id;
  }
  updateLayer(
    id: string,
    patch: Partial<Pick<LayerNode, "name" | "visible" | "locked" | "alphaLocked" | "opacity">>,
    interaction?: string,
  ) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    const values = { ...patch };
    if (values.name !== undefined) values.name = values.name.trim().slice(0, 100) || node.name;
    if (values.opacity !== undefined)
      values.opacity = Math.max(0, Math.min(100, Math.round(values.opacity) || 0));
    this.changeStructure(
      "Свойства слоя",
      () => {
        Object.assign(node, values);
      },
      interaction,
    );
  }
  deleteLayer(id: string) {
    const ids = this.descendants(id);
    if (!this.nodes.some((n) => n.kind === "layer" && !ids.has(n.id))) return;
    this.changeStructure("Удаление слоя / группы", () => {
      this.nodes = this.nodes.filter((n) => !ids.has(n.id));
      if (ids.has(this.active))
        this.active = this.nodes
          .slice()
          .reverse()
          .find((n) => n.kind === "layer")!.id;
    });
  }
  duplicateLayer(id: string) {
    const ids = this.descendants(id),
      source = this.nodes.filter((n) => ids.has(n.id));
    if (
      this.nodes.length + source.length > 128 ||
      (this.nodes.filter((n) => n.pixels).length + source.filter((n) => n.pixels).length) *
        this.pixels.length >
        MAX_BYTES
    )
      throw new Error("Недостаточно памяти для копии слоёв (лимит 64 МиБ)");
    if (!source.length) return;
    const mapping = new Map(source.map((n) => [n.id, `layer-${++this.sequence}`]));
    this.changeStructure("Дублирование слоя / группы", () => {
      const copies = source.map((n) => ({
        ...n,
        id: mapping.get(n.id)!,
        name: n.id === id ? `${n.name} — копия` : n.name,
        parentId: mapping.get(n.parentId ?? "") ?? n.parentId,
        ...(n.pixels ? { pixels: new Uint8ClampedArray(n.pixels) } : {}),
      }));
      this.nodes.splice(this.nodes.findIndex((n) => n.id === id) + 1, 0, ...copies);
      this.active = mapping.get(id)!;
    });
  }
  moveLayer(id: string, parentId: string | null, beforeId: string | null = null) {
    const node = this.nodes.find((n) => n.id === id),
      ids = this.descendants(id);
    if (
      !node ||
      (parentId &&
        (ids.has(parentId) || !this.nodes.some((n) => n.id === parentId && n.kind === "group"))) ||
      (beforeId &&
        !this.nodes.some((n) => n.id === beforeId && n.parentId === parentId && !ids.has(n.id)))
    )
      return;
    this.changeStructure("Перемещение слоя", () => {
      this.nodes = this.nodes.filter((n) => n.id !== id);
      node.parentId = parentId;
      const index = beforeId ? this.nodes.findIndex((n) => n.id === beforeId) : this.nodes.length;
      this.nodes.splice(index, 0, node);
    });
  }
  /** Replace a group with its isolated composite, preserving group visibility and opacity. */
  mergeGroup(id: string) {
    const group = this.nodes.find((n) => n.id === id && n.kind === "group");
    if (!group) return;
    const pixels = this.render(id, {
      minX: 0,
      minY: 0,
      maxX: this.width - 1,
      maxY: this.height - 1,
    });
    const ids = this.descendants(id);
    this.changeStructure("Объединение группы", () => {
      this.nodes = this.nodes.filter((n) => n.id === id || !ids.has(n.id));
      Object.assign(group, { kind: "layer", pixels });
      this.active = id;
    });
  }
  get canMergeDown() {
    const siblings = this.nodes.filter((n) => n.parentId === this.activeLayer.parentId),
      index = siblings.findIndex((n) => n.id === this.active);
    const lower = siblings[index - 1];
    return (
      this.activeLayer.kind === "layer" &&
      !!lower &&
      lower.kind === "layer" &&
      lower.visible &&
      this.activeLayer.visible &&
      !lower.locked &&
      !this.activeLayer.locked
    );
  }
  mergeDown() {
    if (!this.canMergeDown) return;
    const top = this.activeLayer,
      siblings = this.nodes.filter((n) => n.parentId === top.parentId),
      lower = siblings[siblings.findIndex((n) => n.id === top.id) - 1];
    const pixels = this.render(
      top.parentId,
      { minX: 0, minY: 0, maxX: this.width - 1, maxY: this.height - 1 },
      [lower, top],
    );
    this.changeStructure("Объединение с нижним слоем", () => {
      this.nodes = this.nodes.filter((n) => n.id !== top.id);
      Object.assign(lower, { pixels, opacity: 100, alphaLocked: false });
      this.active = lower.id;
    });
  }
  private render(
    parentId: string | null,
    bounds: PaintBounds,
    nodes = this.nodes,
  ): Uint8ClampedArray {
    const width = bounds.maxX - bounds.minX + 1,
      height = bounds.maxY - bounds.minY + 1;
    const out = new Uint8ClampedArray(width * height * 4);
    for (const node of nodes.filter((n) => n.parentId === parentId && n.visible && n.opacity > 0)) {
      const group = node.kind === "group" ? this.render(node.id, bounds, nodes) : null;
      const source = group ?? node.pixels!;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4,
            si = group ? i : ((y + bounds.minY) * this.width + x + bounds.minX) * 4;
          const alpha = ((source[si + 3] / 255) * node.opacity) / 100,
            oldAlpha = out[i + 3] / 255,
            total = alpha + oldAlpha * (1 - alpha);
          if (alpha === 0 && oldAlpha > 0) continue;
          for (let channel = 0; channel < 3; channel++)
            out[i + channel] =
              total === 0
                ? source[si + channel]
                : (source[si + channel] * alpha + out[i + channel] * oldAlpha * (1 - alpha)) /
                  total;
          out[i + 3] = total * 255;
        }
    }
    return out;
  }
  private compose(
    bounds: PaintBounds = { minX: 0, minY: 0, maxX: this.width - 1, maxY: this.height - 1 },
  ) {
    const rendered = this.render(null, bounds),
      width = bounds.maxX - bounds.minX + 1;
    for (let y = bounds.minY; y <= bounds.maxY; y++)
      this.pixels.set(
        rendered.subarray((y - bounds.minY) * width * 4, (y - bounds.minY + 1) * width * 4),
        (y * this.width + bounds.minX) * 4,
      );
    for (let y = 0; y < 2; y++)
      this.pixels.set(this.metadata.subarray(y * 16, y * 16 + 16), y * this.width * 4);
  }
  readPixel(x: number, y: number): Pixel {
    const i = (y * this.width + x) * 4;
    return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2], this.pixels[i + 3]];
  }
  private target(layerId: string | null) {
    return layerId === null ? this.metadata : this.nodes.find((n) => n.id === layerId)?.pixels;
  }
  private record(index: number, color: Pixel) {
    const stroke = this.stroke!,
      target = this.target(stroke.layerId)!;
    const before: Pixel = [target[index], target[index + 1], target[index + 2], target[index + 3]];
    if (before.every((v, i) => v === color[i])) return false;
    stroke.changes.set(index, {
      index,
      before: stroke.changes.get(index)?.before ?? before,
      after: [...color],
    });
    target.set(color, index);
    return true;
  }
  /** Metadata edits use their own protected buffer and history, independently of the active layer. */
  editPixels(changes: { x: number; y: number; color: Pixel }[]) {
    this.endStroke();
    this.stroke = { layerId: null, changes: new Map() };
    for (const { x, y, color } of changes)
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && isTrigger(x, y))
        this.record((y * 4 + x) * 4, color);
    this.endStroke("Параметры MLP");
  }
  beginStroke() {
    this.endStroke();
    if (this.paintBlockedReason) return;
    this.stroke = { layerId: this.active, changes: new Map() };
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
    if (!this.stroke || this.stroke.layerId === null || !Number.isFinite(x) || !Number.isFinite(y))
      return;
    brushSize = Math.max(1, Math.min(64, Math.floor(brushSize) || 1));
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      this.breakStroke();
      return;
    }
    const previous = this.lastPoint?.surface === surface ? this.lastPoint : { x, y };
    const steps = Math.max(Math.abs(x - previous.x), Math.abs(y - previous.y), 1);
    const dirty = { minX: this.width, minY: this.height, maxX: -1, maxY: -1 };
    const layer = this.nodes.find((n) => n.id === this.stroke!.layerId)!;
    for (let step = 0; step <= steps; step++)
      for (let by = 0; by < brushSize; by++)
        for (let bx = 0; bx < brushSize; bx++) {
          const px =
              Math.round(previous.x + ((x - previous.x) * step) / steps) +
              bx -
              Math.floor((brushSize - 1) / 2),
            py =
              Math.round(previous.y + ((y - previous.y) * step) / steps) +
              by -
              Math.floor((brushSize - 1) / 2);
          if (
            px < 0 ||
            py < 0 ||
            px >= this.width ||
            py >= this.height ||
            isTrigger(px, py) ||
            (bounds &&
              (px < bounds.minX || px > bounds.maxX || py < bounds.minY || py > bounds.maxY))
          )
            continue;
          const index = (py * this.width + px) * 4;
          if (layer.alphaLocked && (!layer.pixels![index + 3] || color[3] === 0)) continue;
          const value: Pixel = layer.alphaLocked
            ? [color[0], color[1], color[2], layer.pixels![index + 3]]
            : color;
          if (this.record(index, value)) {
            dirty.minX = Math.min(dirty.minX, px);
            dirty.maxX = Math.max(dirty.maxX, px);
            dirty.minY = Math.min(dirty.minY, py);
            dirty.maxY = Math.max(dirty.maxY, py);
          }
        }
    this.lastPoint = { x, y, surface };
    if (dirty.maxX >= 0) {
      this.rasterChanged(layer.id);
      this.compose(dirty);
      this.emit();
    }
  }
  endStroke(label = "Штрих") {
    if (!this.stroke) return;
    const { layerId } = this.stroke,
      changes = [...this.stroke.changes.values()].filter((c) =>
        c.before.some((v, i) => v !== c.after[i]),
      );
    this.stroke = null;
    this.lastPoint = null;
    if (changes.length)
      this.push({
        kind: "pixels",
        label,
        layerId,
        changes,
        beforeId: this.stateId,
        afterId: this.nextId++,
      });
    if (layerId === null) this.compose();
    this.emit();
  }
  cancelStroke() {
    if (!this.stroke) return;
    const target = this.target(this.stroke.layerId)!;
    if (this.stroke.layerId !== null) this.rasterChanged(this.stroke.layerId);
    this.stroke.changes.forEach((c) => target.set(c.before, c.index));
    this.stroke = null;
    this.lastPoint = null;
    this.compose();
    this.emit();
  }
  private apply(command: Command, direction: "before" | "after") {
    if (command.kind === "structure") this.restoreStructure(command[direction]);
    else {
      const target = this.target(command.layerId)!;
      command.changes.forEach((c) => target.set(c[direction], c.index));
      if (command.layerId !== null) this.rasterChanged(command.layerId);
    }
    this.stateId = direction === "before" ? command.beforeId : command.afterId;
    this.compose();
    this.emit();
  }
  undo() {
    this.historyInteraction = undefined;
    this.endStroke();
    const c = this.undoStack.pop();
    if (c) {
      this.redoStack.push(c);
      this.apply(c, "before");
    }
  }
  redo() {
    this.historyInteraction = undefined;
    this.endStroke();
    const c = this.redoStack.pop();
    if (c) {
      this.undoStack.push(c);
      this.apply(c, "after");
    }
  }
  snapshot(): ProjectSnapshot {
    // Capture an unfinished stroke as one undoable operation without ending pointer capture.
    const pending = this.stroke
      ? [...this.stroke.changes.values()].filter((c) => c.before.some((v, i) => v !== c.after[i]))
      : [];
    const undo: Command[] = pending.length
      ? [
          ...this.undoStack,
          {
            kind: "pixels",
            label: "Штрих",
            layerId: this.stroke!.layerId,
            changes: pending,
            beforeId: this.stateId,
            afterId: this.nextId,
          },
        ]
      : this.undoStack;
    return copy({
      version: 2,
      width: this.width,
      height: this.height,
      sourceFormat: this.sourceFormat,
      pixels: this.pixels,
      metadata: this.metadata,
      layers: this.nodes,
      activeLayerId: this.active,
      workspace: this.workspace,
      stateId: pending.length ? this.nextId : this.stateId,
      nextId: this.nextId + (pending.length ? 1 : 0),
      workspaceRevision: this.workspaceRevision,
      undo: undo.slice(-MAX_HISTORY),
      redo: pending.length ? [] : this.redoStack,
    });
  }
  clone() {
    return SkinDocument.restore(this.snapshot());
  }
  static restore(snapshot: ProjectSnapshot | LegacySnapshot): SkinDocument {
    if (snapshot.version === 1)
      return new SkinDocument(
        snapshot.width,
        snapshot.height,
        snapshot.pixels,
        snapshot.sourceFormat,
      );
    validateSnapshot(snapshot);
    const saved = copy(snapshot),
      document = new SkinDocument(saved.width, saved.height, saved.pixels, saved.sourceFormat);
    document.nodes = saved.layers;
    document.active = saved.activeLayerId;
    document.metadata = saved.metadata;
    document.workspace = saved.workspace;
    document.workspaceRevision = saved.workspaceRevision;
    document.stateId = saved.stateId;
    document.nextId = saved.nextId;
    document.undoStack = saved.undo;
    document.redoStack = saved.redo;
    const allIds = [
      ...saved.layers,
      ...[...saved.undo, ...saved.redo].flatMap((c) =>
        c.kind === "structure" ? [...c.before.layers, ...c.after.layers] : [],
      ),
    ].map((n) => Number(n.id.replace("layer-", "")) || 0);
    document.sequence = Math.max(1, ...allIds);
    document.compose();
    return document;
  }
}

/** Validate untrusted project data before constructing buffers or replaying history. */
export function validateSnapshot(s: ProjectSnapshot) {
  const fail = () => {
    throw new Error("Повреждённый или неподдерживаемый проект Striped");
  };
  if (
    !s ||
    s.version !== 2 ||
    !Number.isInteger(s.width) ||
    !Number.isInteger(s.height) ||
    s.width < 4 ||
    s.height < 2 ||
    s.width > 2048 ||
    s.height > 2048 ||
    !["modern", "legacy"].includes(s.sourceFormat)
  )
    fail();
  const size = s.width * s.height * 4;
  if (
    !(s.pixels instanceof Uint8ClampedArray) ||
    s.pixels.length !== size ||
    !(s.metadata instanceof Uint8ClampedArray) ||
    s.metadata.length !== 32
  )
    fail();
  const buffers = new Set<Uint8ClampedArray>([s.pixels, s.metadata]);
  const structure = (value: Structure) => {
    if (!value || !Array.isArray(value.layers) || !value.layers.length || value.layers.length > 128)
      return fail();
    const nodes = value.layers,
      ids = new Set(nodes.map((n) => n.id));
    if (
      ids.size !== nodes.length ||
      !ids.has(value.activeLayerId) ||
      !nodes.some((n) => n.kind === "layer")
    )
      fail();
    for (const n of nodes) {
      if (
        typeof n.id !== "string" ||
        !/^layer-[1-9]\d{0,8}$/.test(n.id) ||
        typeof n.name !== "string" ||
        n.name.length > 100 ||
        typeof n.visible !== "boolean" ||
        typeof n.locked !== "boolean" ||
        typeof n.alphaLocked !== "boolean" ||
        !Number.isInteger(n.opacity) ||
        n.opacity < 0 ||
        n.opacity > 100 ||
        !["layer", "group"].includes(n.kind)
      )
        fail();
      if (n.kind === "layer") {
        if (!(n.pixels instanceof Uint8ClampedArray) || n.pixels.length !== size) fail();
        buffers.add(n.pixels!);
      } else if (n.pixels !== undefined) fail();
      const seen = new Set([n.id]);
      let parent = n.parentId;
      while (parent !== null) {
        const next = nodes.find((v) => v.id === parent && v.kind === "group");
        if (!next || seen.has(parent)) return fail();
        seen.add(parent);
        parent = next.parentId;
      }
    }
    if (nodes.filter((n) => n.kind === "layer").length * size > MAX_BYTES) fail();
  };
  structure({ layers: s.layers, activeLayerId: s.activeLayerId });
  validateWorkspace(s.workspace, fail);
  if (
    !s.workspace ||
    typeof s.workspace !== "object" ||
    Array.isArray(s.workspace) ||
    JSON.stringify(s.workspace).length > 100_000 ||
    ![s.stateId, s.nextId, s.workspaceRevision].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    s.nextId <= s.stateId ||
    !Array.isArray(s.undo) ||
    !Array.isArray(s.redo) ||
    s.undo.length + s.redo.length > MAX_HISTORY
  )
    fail();
  let changes = 0;
  for (const c of [...s.undo, ...s.redo]) {
    if (
      !c ||
      typeof c.label !== "string" ||
      c.label.length > 100 ||
      ![c.beforeId, c.afterId].every((n) => Number.isSafeInteger(n) && n >= 0 && n < s.nextId)
    )
      fail();
    if (c.kind === "structure") {
      structure(c.before);
      structure(c.after);
    } else if (c.kind === "pixels") {
      if (!Array.isArray(c.changes) || (c.layerId !== null && typeof c.layerId !== "string"))
        fail();
      changes += c.changes.length;
      for (const change of c.changes)
        if (
          !Number.isInteger(change.index) ||
          change.index < 0 ||
          change.index % 4 ||
          change.index + 4 > (c.layerId === null ? 32 : size) ||
          ![change.before, change.after].every(
            (p) =>
              Array.isArray(p) &&
              p.length === 4 &&
              p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255),
          )
        )
          fail();
    } else fail();
  }
  if (
    changes * 40 > MAX_BYTES ||
    [...buffers].reduce((sum, b) => sum + b.byteLength, 0) > 128 * 1024 * 1024
  )
    fail();
  // Verify that every pixel command targets a raster present at that point in history.
  const replay = (commands: Command[], direction: "before" | "after") => {
    let nodes = s.layers,
      stateId = s.stateId;
    for (const c of commands.slice().reverse()) {
      if (stateId !== (direction === "before" ? c.afterId : c.beforeId)) fail();
      if (c.kind === "structure") nodes = c[direction].layers;
      else if (c.layerId !== null && !nodes.some((n) => n.id === c.layerId && n.kind === "layer"))
        fail();
      stateId = direction === "before" ? c.beforeId : c.afterId;
    }
  };
  replay(s.undo, "before");
  replay(s.redo, "after");
}
export function uvToPixel(u: number, v: number, width: number, height: number) {
  return {
    x: Math.max(0, Math.min(width - 1, Math.floor(u * width))),
    y: Math.max(0, Math.min(height - 1, Math.floor((1 - v) * height))),
  };
}

function validateWorkspace(workspace: Record<string, WorkspaceValue>, fail: () => never) {
  if (!workspace || typeof workspace !== "object" || Array.isArray(workspace)) return fail();
  const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1e7;
  const hex = (v: unknown) => typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v);
  const list = (v: unknown, check: (item: unknown) => boolean) =>
    Array.isArray(v) && v.length <= 1000 && v.every(check);
  const record = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  const rules: Record<string, (v: unknown) => boolean> = {
    tool: (v) => ["brush", "eraser", "drop", "hand"].includes(v as string),
    layout: (v) => ["3d", "2d", "split"].includes(v as string),
    mobileView: (v) => ["3d", "2d", "settings"].includes(v as string),
    brushSize: (v) => finite(v) && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 32,
    opacity: (v) => finite(v) && (v as number) >= 0 && (v as number) <= 100,
    colors: (v) => record(v) && hex(v.primary) && hex(v.secondary),
    customColors: (v) => list(v, hex),
    removedColors: (v) => list(v, hex),
    hiddenParts: (v) => list(v, (id) => typeof id === "string" && id.length < 200),
    collapsedGroups: (v) => list(v, (id) => typeof id === "string" && id.length < 100),
    activePart: (v) => v === null || (typeof v === "string" && v.length < 200),
    textureView: (v) =>
      record(v) &&
      finite(v.zoom) &&
      (v.zoom as number) >= 0.15 &&
      (v.zoom as number) <= 32 &&
      record(v.pan) &&
      finite(v.pan.x) &&
      finite(v.pan.y),
    projection: (v) => ["perspective", "orthographic"].includes(v as string),
    cameraView: (v) =>
      ["perspective", "orthographic", "front", "back", "left", "right"].includes(v as string),
    cameraState: (v) =>
      v === null ||
      (record(v) &&
        list(v.position, finite) &&
        (v.position as unknown[]).length === 3 &&
        list(v.target, finite) &&
        (v.target as unknown[]).length === 3 &&
        finite(v.zoom) &&
        (v.zoom as number) > 0),
    preview: (v) =>
      record(v) &&
      ["folded", "extended"].includes(v.wings as string) &&
      ["skin", "wet", "dry"].includes(v.form as string) &&
      typeof v.pose === "string" &&
      v.pose.length < 100,
    viewOptions: (v) =>
      record(v) &&
      ["off", "msaa", "smaa"].includes(v.antialiasing as string) &&
      [v.animations, v.smoothCamera, v.groundGrid].every((b) => typeof b === "boolean"),
  };
  for (const key of ["showMini", "showUV", "slim", "painting", "pixelGrid"])
    rules[key] = (v) => typeof v === "boolean";
  for (const [key, value] of Object.entries(workspace))
    if (rules[key] && !rules[key](value)) fail();
}
