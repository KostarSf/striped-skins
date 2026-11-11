import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SkinDocument,
  encodeSkinProject,
  decodeSkinProject,
} from "../../packages/api/build/esm/index.js";
const fresh = (size = 64) => new SkinDocument(size, size, new Uint8ClampedArray(size * size * 4));
const rgba = [201, 45, 80, 128];
const pixel = (layer, width, x, y) => [
  ...layer.pixels.slice((y * width + x) * 4, (y * width + x) * 4 + 4),
];
function paint(doc, x, y, color = rgba) {
  doc.beginStroke();
  doc.paint(x, y, color);
  doc.endStroke();
}
function select(doc, points) {
  const mask = new Uint8Array(doc.width * doc.height);
  for (const [x, y] of points) mask[y * doc.width + x] = 1;
  doc.setSelection(mask);
}

test("copy reads only the active layer and exact mask, including invisible RGBA; it preserves history and redo", () => {
  const doc = fresh();
  paint(doc, 10, 10, [1, 2, 3, 255]);
  const base = doc.activeLayer.pixels.slice();
  doc.addLayer();
  paint(doc, 10, 10);
  paint(doc, 11, 10, [10, 20, 30, 0]);
  paint(doc, 12, 10, [99, 99, 99, 255]);
  select(doc, [
    [10, 10],
    [11, 10],
    [10, 12],
  ]);
  doc.updateLayer(doc.activeLayerId, { name: "renamed" });
  doc.undo();
  const before = doc.snapshot(),
    token = doc.saveToken;
  const clip = doc.copySelection();
  assert.deepEqual(doc.snapshot(), before);
  assert.equal(doc.saveToken, token);
  assert.equal(doc.canRedo, true);
  assert.deepEqual(
    [...clip.pixels.slice((10 * 64 + 10) * 4, (10 * 64 + 12) * 4)],
    [...rgba, 10, 20, 30, 0],
  );
  assert.deepEqual([...clip.pixels.slice((10 * 64 + 12) * 4, (10 * 64 + 13) * 4)], [0, 0, 0, 0]);
  assert.equal(clip.selection[12 * 64 + 10], 1);
  assert.equal(clip.selection[11 * 64 + 10], 0, "hole remains unselected");
  paint(doc, 10, 10, [0, 255, 0, 255]);
  assert.deepEqual([...clip.pixels.slice((10 * 64 + 10) * 4, (10 * 64 + 11) * 4)], rgba);
  assert.deepEqual(doc.layers[0].pixels, base);
});

test("cut affects only selected source pixels; cut and every paste are independent undo steps and survive project serialization", () => {
  const doc = fresh();
  paint(doc, 10, 10);
  paint(doc, 11, 10, [10, 20, 30, 0]);
  paint(doc, 12, 10, [0, 0, 255, 255]);
  select(doc, [
    [10, 10],
    [11, 10],
  ]);
  const before = doc.activeLayer.pixels.slice(),
    mask = doc.selection.slice();
  const count = doc.history.length;
  const clip = doc.cutSelection();
  const cut = doc.activeLayer.pixels.slice();
  assert.equal(doc.history.length, count + 1);
  assert.equal(doc.undoLabel, "history.cutSelection");
  assert.deepEqual(pixel(doc.activeLayer, 64, 10, 10), [0, 0, 0, 0]);
  assert.deepEqual(pixel(doc.activeLayer, 64, 12, 10), [0, 0, 255, 255]);
  assert.deepEqual(doc.selection, mask);
  const pasted = doc.pasteSelection(clip, "Fragment");
  const again = doc.pasteSelection(clip, "Again");
  assert.notEqual(pasted, again);
  assert.equal(doc.history.length, count + 3);
  const saved = decodeSkinProject(encodeSkinProject(doc));
  assert.equal(saved.layers.length, 3);
  assert.deepEqual(pixel(saved.activeLayer, 64, 11, 10), [10, 20, 30, 0]);
  saved.undo();
  assert.equal(saved.activeLayerId, pasted);
  saved.undo();
  assert.equal(saved.layers.length, 1);
  assert.deepEqual(saved.activeLayer.pixels, cut);
  saved.undo();
  assert.deepEqual(saved.activeLayer.pixels, before);
  assert.deepEqual(saved.selection, mask);
  saved.redo();
  saved.redo();
  saved.redo();
  assert.equal(saved.activeLayerId, again);
  assert.deepEqual(pixel(saved.activeLayer, 64, 10, 10), rgba);
  assert.deepEqual(pixel(saved.activeLayer, 64, 12, 10), [0, 0, 0, 0]);
});

test("paste is independent of the current mask and creates a visible root layer above locked/hidden groups", () => {
  const doc = fresh();
  paint(doc, 10, 10);
  select(doc, [[10, 10]]);
  const clip = doc.copySelection();
  const group = doc.addLayer("group");
  doc.addLayer("layer", group);
  const previous = doc.activeLayerId;
  select(doc, [[30, 30]]);
  const mask = doc.selection.slice();
  doc.updateLayer(group, { locked: true, visible: false });
  doc.pasteSelection(clip);
  assert.equal(doc.layers.at(-1).id, doc.activeLayerId);
  assert.equal(doc.activeLayer.parentId, null);
  assert.equal(doc.activeLayer.visible, true);
  assert.equal(doc.activeLayer.opacity, 100);
  assert.equal(doc.activeLayer.locked, false);
  assert.deepEqual(doc.selection, clip.selection);
  assert.deepEqual(pixel(doc.activeLayer, 64, 10, 10), rgba);
  doc.undo();
  assert.equal(doc.activeLayerId, previous);
  assert.deepEqual(doc.selection, mask);
  doc.setActiveLayer(group);
  assert.equal(doc.copySelection(), null);
  doc.pasteSelection(clip);
  assert.equal(doc.activeLayer.parentId, null);
});

test("protected pixels never enter clipboard or get cleared; empty and missing selections are no-ops", () => {
  const doc = fresh();
  doc.editPixels([{ x: 0, y: 0, color: [4, 3, 2, 255] }]);
  paint(doc, 4, 0);
  for (const points of [
    null,
    [],
    [
      [0, 0],
      [3, 1],
    ],
  ]) {
    if (points) select(doc, points);
    else doc.setSelection(null);
    const token = doc.saveToken;
    assert.equal(doc.canCopySelection, false);
    assert.equal(doc.copySelection(), null);
    assert.equal(doc.cutSelection(), null);
    assert.equal(doc.saveToken, token);
  }
  select(doc, [
    [0, 0],
    [4, 0],
  ]);
  const clip = doc.cutSelection();
  assert.equal(clip.selection[0], 0);
  assert.deepEqual([...clip.pixels.slice(0, 4)], [0, 0, 0, 0]);
  // Even an API caller's manually modified clipboard cannot overwrite metadata.
  clip.selection[0] = 1;
  clip.pixels.set([255, 0, 0, 255]);
  doc.pasteSelection(clip);
  assert.equal(doc.selection[0], 0);
  assert.deepEqual(pixel(doc.activeLayer, 64, 0, 0), [0, 0, 0, 0]);
  assert.deepEqual(doc.readPixel(0, 0), [4, 3, 2, 255]);
});

test("cut respects alpha lock, visibility and ancestor locks while read-only copying remains available", () => {
  const doc = fresh();
  const group = doc.addLayer("group");
  doc.addLayer("layer", group);
  paint(doc, 10, 10);
  select(doc, [[10, 10]]);
  for (const [id, patch] of [
    [doc.activeLayerId, { locked: true }],
    [doc.activeLayerId, { alphaLocked: true }],
    [doc.activeLayerId, { visible: false }],
    [doc.activeLayerId, { opacity: 0 }],
    [group, { locked: true }],
    [group, { visible: false }],
    [group, { opacity: 0 }],
  ]) {
    doc.updateLayer(id, patch);
    const token = doc.saveToken;
    assert.equal(doc.canCutSelection, false);
    assert.equal(doc.cutSelection(), null);
    assert.ok(doc.copySelection());
    assert.deepEqual(pixel(doc.activeLayer, 64, 10, 10), rgba);
    assert.equal(doc.saveToken, token);
    doc.undo();
  }
});

test("HD copy uses absolute coordinates across resolutions, clips without scaling and handles no overlap", () => {
  const source = fresh(128);
  paint(source, 10, 10);
  paint(source, 100, 100);
  select(source, [
    [10, 10],
    [100, 100],
  ]);
  const clip = source.copySelection(),
    target = fresh();
  target.pasteSelection(clip);
  assert.deepEqual(pixel(target.activeLayer, 64, 10, 10), rgba);
  assert.equal(
    target.selection.reduce((sum, value) => sum + value, 0),
    1,
  );
  const larger = fresh(256);
  larger.pasteSelection(clip);
  assert.deepEqual(pixel(larger.activeLayer, 256, 100, 100), rgba);
  assert.equal(larger.selection[100 * 256 + 100], 1);
  select(source, [[100, 100]]);
  const outside = source.copySelection(),
    token = target.saveToken;
  assert.equal(target.canPasteSelection(outside), false);
  assert.equal(target.pasteSelection(outside), undefined);
  assert.equal(target.saveToken, token);
  assert.equal(target.layers.length, 2);
});

test("paste rejects layer/memory limits and malformed clipboard data without altering document or history", () => {
  const doc = fresh(512);
  paint(doc, 10, 10);
  select(doc, [[10, 10]]);
  const clip = doc.copySelection();
  for (let n = 1; n < 64; n++) doc.addLayer();
  assert.equal(doc.canPasteSelection(clip), false, "64 MiB raster budget");
  const token = doc.saveToken;
  assert.equal(doc.pasteSelection(clip), undefined);
  assert.equal(doc.saveToken, token);
  const small = fresh();
  for (let n = 1; n < 128; n++) small.addLayer("group");
  assert.equal(small.canPasteSelection(clip), false, "128 node limit");
  const clean = fresh();
  for (const bad of [
    { ...clip, width: NaN },
    { ...clip, height: -1 },
    { ...clip, pixels: new Uint8ClampedArray(0) },
    { ...clip, selection: new Uint8Array(0) },
    { ...clip, selection: new Uint8Array(512 * 512).fill(2) },
  ]) {
    assert.equal(clean.canPasteSelection(bad), false);
    assert.equal(clean.pasteSelection(bad), undefined);
    assert.equal(clean.canUndo, false);
    assert.equal(clean.layers.length, 1);
  }
});
