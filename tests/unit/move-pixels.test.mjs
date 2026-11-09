import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SkinDocument,
  encodeSkinProject,
  decodeSkinProject,
} from "../../packages/api/build/esm/index.js";
import { applyRectangleSelection } from "../../app/components/studio/rectangle-selection.ts";
const fresh = (size = 64) => new SkinDocument(size, size, new Uint8ClampedArray(size * size * 4));
const rgba = [201, 45, 80, 128];
const pixel = (doc, x, y) => [
  ...doc.activeLayer.pixels.slice((y * doc.width + x) * 4, (y * doc.width + x) * 4 + 4),
];
const paint = (doc, x, y, color = rgba) => {
  doc.beginStroke();
  doc.paint(x, y, color);
  doc.endStroke();
};
const select = (doc, x, y, width, height) =>
  doc.setSelection(
    applyRectangleSelection(null, { x, y, width, height }, "replace", doc.width, doc.height),
  );

test("moving an entire active layer preserves exact RGBA, other layers and one undo step", () => {
  const doc = fresh();
  paint(doc, 10, 10);
  const base = doc.activeLayer.pixels.slice();
  doc.addLayer();
  paint(doc, 20, 20);
  const before = doc.activeLayer.pixels.slice();
  const count = doc.history.length;
  doc.beginMove();
  doc.previewMove(1, 2);
  doc.previewMove(3, 4);
  doc.endMove();
  assert.equal(doc.history.length, count + 1);
  assert.deepEqual(pixel(doc, 20, 20), [0, 0, 0, 0]);
  assert.deepEqual(pixel(doc, 23, 24), rgba);
  assert.deepEqual(doc.layers[0].pixels, base);
  const after = doc.activeLayer.pixels.slice();
  doc.undo();
  assert.deepEqual(doc.activeLayer.pixels, before);
  doc.redo();
  assert.deepEqual(doc.activeLayer.pixels, after);
  paint(doc, 30, 30);
  doc.undo();
  doc.undo();
  assert.deepEqual(doc.activeLayer.pixels, before);
  doc.redo();
  assert.deepEqual(doc.activeLayer.pixels, after);
});

test("selection, holes, overlapping destinations and transparent RGBA move atomically through saving and history", () => {
  const doc = fresh();
  paint(doc, 10, 10);
  paint(doc, 11, 10, [10, 20, 30, 0]);
  paint(doc, 12, 10, [0, 0, 255, 255]);
  select(doc, 10, 10, 2, 1);
  const before = doc.activeLayer.pixels.slice(),
    mask = doc.selection.slice();
  doc.movePixels(1, 0);
  assert.deepEqual(pixel(doc, 11, 10), rgba);
  assert.deepEqual(pixel(doc, 12, 10), [10, 20, 30, 0]);
  assert.equal(doc.selection[10 * 64 + 10], 0);
  assert.equal(doc.selection[10 * 64 + 12], 1);
  const after = doc.activeLayer.pixels.slice(),
    movedMask = doc.selection.slice();
  doc.setWorkspace("tool", "move");
  doc.setWorkspace("lastPaintTool", "move");
  const saved = decodeSkinProject(encodeSkinProject(doc));
  saved.undo();
  assert.deepEqual(saved.activeLayer.pixels, before);
  assert.deepEqual(saved.selection, mask);
  saved.redo();
  assert.deepEqual(saved.activeLayer.pixels, after);
  assert.deepEqual(saved.selection, movedMask);
  assert.equal(saved.getWorkspace("tool", "brush"), "move");
  const hole = saved.selection.slice();
  hole[10 * 64 + 11] = 0;
  saved.setSelection(hole);
  saved.movePixels(0, 1);
  assert.deepEqual(pixel(saved, 11, 10), rgba, "unselected hole stays in place");
});

test("clipping previews use the original pixels, cancellation and zero moves preserve redo", () => {
  const doc = fresh();
  paint(doc, 63, 20);
  const before = doc.activeLayer.pixels.slice();
  doc.beginMove();
  doc.previewMove(10, 0);
  doc.previewMove(-1, 0);
  assert.deepEqual(pixel(doc, 62, 20), rgba);
  const recovered = SkinDocument.restore(doc.snapshot());
  recovered.undo();
  assert.deepEqual(recovered.activeLayer.pixels, before);
  doc.cancelMove();
  assert.deepEqual(doc.activeLayer.pixels, before);
  doc.movePixels(-1, 0);
  doc.undo();
  const token = doc.saveToken;
  doc.beginMove();
  doc.previewMove(-1, 0);
  doc.previewMove(0, 0);
  doc.endMove();
  assert.equal(doc.saveToken, token);
  assert.equal(doc.canRedo, true);
  doc.movePixels(1, 0);
  assert.deepEqual(pixel(doc, 63, 20), [0, 0, 0, 0]);
});

test("metadata is neither a translation source nor a destination", () => {
  const doc = fresh();
  doc.editPixels([{ x: 0, y: 0, color: [1, 2, 3, 255] }]);
  paint(doc, 4, 0);
  doc.movePixels(-4, 0);
  assert.deepEqual(doc.readPixel(0, 0), [1, 2, 3, 255]);
  doc.movePixels(10, 10);
  assert.deepEqual(pixel(doc, 10, 10), [0, 0, 0, 0]);
  assert.deepEqual(doc.readPixel(0, 0), [1, 2, 3, 255]);
});

test("empty selection, invalid offsets and protected layer states cause no raster edits", () => {
  const doc = fresh();
  paint(doc, 10, 10);
  const before = doc.activeLayer.pixels.slice();
  doc.setSelection(new Uint8Array(4096));
  const token = doc.saveToken;
  doc.movePixels(1, 1);
  doc.movePixels(NaN, 1);
  doc.movePixels(0.5, 1);
  assert.deepEqual(doc.activeLayer.pixels, before);
  assert.equal(doc.saveToken, token);
  doc.setSelection(null);
  for (const property of [
    { locked: true },
    { visible: false },
    { alphaLocked: true },
    { opacity: 0 },
  ]) {
    doc.updateLayer(doc.activeLayerId, property);
    const count = doc.history.length;
    doc.movePixels(1, 1);
    assert.deepEqual(doc.activeLayer.pixels, before);
    assert.equal(doc.history.length, count);
    doc.undo();
  }
  const group = doc.addLayer("group");
  doc.addLayer("layer", group);
  paint(doc, 10, 10);
  doc.updateLayer(group, { locked: true });
  assert.equal(doc.beginMove(), false);
  doc.setActiveLayer(group);
  assert.equal(doc.beginMove(), false);
});

test("HD selected translation and resize history restore original dimensions and masks", () => {
  const doc = fresh(128);
  paint(doc, 100, 100);
  select(doc, 100, 100, 1, 1);
  doc.movePixels(-1, 1);
  assert.deepEqual(pixel(doc, 99, 101), rgba);
  doc.resize(64);
  const saved = decodeSkinProject(encodeSkinProject(doc));
  saved.undo();
  assert.equal(saved.width, 128);
  assert.equal(saved.selection[101 * 128 + 99], 1);
  saved.undo();
  assert.deepEqual(pixel(saved, 100, 100), rgba);
  assert.equal(saved.selection[100 * 128 + 100], 1);
});
