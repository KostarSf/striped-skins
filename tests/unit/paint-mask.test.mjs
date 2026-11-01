import { test } from "node:test";
import assert from "node:assert/strict";
import { uvPaintMask } from "../../app/components/studio/paint-mask.ts";
import { SkinDocument } from "../../packages/api/build/esm/index.js";
import { ponyModels, flattenNodes } from "../../packages/models/build/index.js";

const quad = (id, x, y, width, height, rotate = false) => {
  const corners = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  if (rotate) corners.push(corners.shift());
  return { id, positions: [], uv: corners.flatMap(([px, py]) => [px / 64, 1 - py / 64]) };
};

test("UV masks preserve disconnected islands, mirrored/rotated order, fractional edges and HD scale", () => {
  const quads = [
    quad("left", 8, 8, 4, 4),
    quad("right", 16, 8, -4, 4, true),
    quad("island", 20.5, 20.5, 2, 2),
  ];
  const mask = uvPaintMask(quads, 64, 64);
  assert.equal(mask[8 * 64 + 8], 1);
  assert.equal(mask[8 * 64 + 15], 1);
  assert.equal(mask[12 * 64 + 12], 0);
  assert.equal(mask[20 * 64 + 20], 1);
  assert.equal(mask[22 * 64 + 22], 1);
  assert.equal(mask[23 * 64 + 22], 0);
  const hd = uvPaintMask(quads, 128, 128);
  assert.equal(hd[16 * 128 + 16], 1);
  assert.equal(hd[23 * 128 + 31], 1);
  assert.equal(hd[24 * 128 + 24], 0);
  assert.equal(hd[44 * 128 + 44], 1);
  assert.equal(hd[45 * 128 + 44], 0);
  assert.equal(uvPaintMask([], 64, 64).some(Boolean), false);
  assert.equal(uvPaintMask([quad("outside", -8, 0, 4, 4)], 64, 64).some(Boolean), false);
});

test("the model catalog uses rectangular UV islands for the paint mask", () => {
  for (const variants of Object.values(ponyModels))
    for (const model of Object.values(variants))
      for (const node of flattenNodes(model))
        for (const q of node.quads) {
          const xs = [0, 2, 4, 6].map((i) => q.uv[i]);
          const ys = [1, 3, 5, 7].map((i) => q.uv[i]);
          assert.ok(new Set(xs).size <= 2 && new Set(ys).size <= 2, q.id);
        }
});

test("masked brush stamps and interpolated strokes clip every pixel, preserve gaps, undo and erase", () => {
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  const doc = new SkinDocument(64, 64, pixels);
  const mask = uvPaintMask([quad("first", 8, 8, 4, 4), quad("second", 20, 8, 4, 4)], 64, 64);
  const color = [255, 0, 255, 255];
  doc.beginStroke();
  doc.paint(8, 8, color, "part", 7, undefined, mask);
  doc.paint(23, 11, color, "part", 7, undefined, mask);
  doc.endStroke();
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++)
      if (!mask[y * 64 + x]) assert.deepEqual(doc.readPixel(x, y), [0, 0, 0, 0]);
  assert.deepEqual(doc.readPixel(8, 8), color);
  assert.deepEqual(doc.readPixel(23, 11), color);
  doc.undo();
  assert.deepEqual(doc.pixels, pixels);
  doc.redo();
  doc.beginStroke();
  doc.paint(8, 8, [0, 0, 0, 0], "part", 32, undefined, mask);
  doc.endStroke();
  assert.deepEqual(doc.readPixel(8, 8), [0, 0, 0, 0]);
  doc.undo();
  assert.deepEqual(doc.readPixel(8, 8), color);
  doc.beginStroke();
  doc.paint(50, 50, color, "part", 1, undefined, mask);
  doc.endStroke();
  assert.equal(doc.canRedo, true);
});
