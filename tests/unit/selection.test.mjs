import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SkinDocument,
  encodeSkinProject,
  decodeSkinProject,
} from "../../packages/api/build/esm/index.js";
import {
  applyRectangleSelection,
  selectionOutline,
} from "../../app/components/studio/rectangle-selection.ts";

const fresh = () => new SkinDocument(64, 64, new Uint8ClampedArray(64 * 64 * 4));
const rect = (x, y, width = 4, height = 4) => ({ x, y, width, height });
const select = (doc, region, mode = "replace") =>
  doc.setSelection(applyRectangleSelection(doc.selection, region, mode, doc.width, doc.height));

test("selection operations, clearing and strokes share one history and survive project export", () => {
  const doc = fresh();
  const original = doc.pixels.slice();
  select(doc, rect(8, 8));
  const firstId = doc.historyStates.at(-1).id;
  const first = doc.selection.slice();
  select(doc, rect(10, 10), "add");
  assert.equal(
    doc.selection.reduce((sum, n) => sum + n, 0),
    28,
  );
  select(doc, rect(9, 9, 1, 1), "subtract");
  assert.equal(doc.selection[9 * 64 + 9], 0);
  select(doc, rect(10, 10, 1, 1), "difference");
  assert.equal(doc.selection[10 * 64 + 10], 0);
  const modified = doc.selection.slice();
  doc.beginStroke();
  doc.paint(8, 8, [255, 0, 0, 255], "texture", 1, undefined, doc.selection);
  doc.endStroke();
  doc.setSelection(null);
  const saved = decodeSkinProject(encodeSkinProject(doc));
  assert.equal(saved.selection, null);
  saved.undo();
  assert.deepEqual(saved.selection, modified);
  saved.undo();
  assert.deepEqual(saved.pixels, original);
  assert.deepEqual(saved.selection, modified);
  saved.goToHistoryState(firstId);
  assert.deepEqual(saved.selection, first);
  saved.undo();
  assert.equal(saved.selection, null);
  saved.redo();
  assert.deepEqual(saved.selection, first);
  select(saved, rect(8, 8));
  assert.equal(saved.canRedo, true, "an unchanged mask must retain redo");
  select(saved, rect(20, 20));
  assert.equal(saved.canRedo, false);
});

test("resize clears selection and undo restores masks at the correct dimensions", () => {
  const doc = fresh();
  select(doc, rect(8, 8));
  const before = doc.selection.slice();
  doc.resize(128);
  assert.equal(doc.selection, null);
  select(doc, rect(80, 80));
  const restored = decodeSkinProject(encodeSkinProject(doc));
  restored.undo();
  restored.undo();
  assert.equal(restored.width, 64);
  assert.deepEqual(restored.selection, before);
  restored.redo();
  assert.equal(restored.selection, null);
  restored.redo();
  assert.equal(restored.selection[80 * 128 + 80], 1);
});

test("selection masks are copied, validated and retain the difference between empty and cleared", () => {
  const doc = fresh();
  const input = new Uint8Array(4096);
  doc.setSelection(input);
  input[0] = 1;
  assert.equal(doc.selection[0], 0);
  const token = doc.saveToken;
  doc.setSelection(new Uint8Array(4096));
  assert.equal(doc.saveToken, token);
  doc.setSelection(null);
  doc.undo();
  assert.ok(doc.selection && !doc.selection.some(Boolean));
  const snapshot = doc.snapshot();
  snapshot.selection[0] = 2;
  assert.throws(() => SkinDocument.restore(snapshot));
  assert.throws(() => doc.setSelection(new Uint8Array(2)));
});

test("contours omit interior edges and include holes, islands and texture borders", () => {
  const full = new Uint8Array(16).fill(1);
  assert.equal(selectionOutline(full, 4, 4), "M0 0H4M0 4H4M0 0V4M4 0V4");
  full[5] = 0;
  assert.match(selectionOutline(full, 4, 4), /M1 1H2/);
  assert.match(selectionOutline(full, 4, 4), /M1 2H2/);
  const islands = new Uint8Array([1, 0, 1]);
  assert.equal(selectionOutline(islands, 3, 1), "M0 0H1M2 0H3M0 1H1M2 1H3M0 0V1M1 0V1M2 0V1M3 0V1");
});
