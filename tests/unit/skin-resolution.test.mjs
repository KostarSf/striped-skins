import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SkinDocument,
  normalizeSkinPixels,
  decodeSkinMetadata,
  writeSkinMetadata,
  encodeSkinProject,
  decodeSkinProject,
} from "../../packages/api/build/esm/index.js";
import { validateSnapshot } from "../../packages/api/build/esm/SkinDocument.js";

const fresh = (size = 64) => new SkinDocument(size, size, new Uint8ClampedArray(size * size * 4));

test("resize preserves independent layers, hidden RGB, physical metadata and workspace; undo/redo survives projects", () => {
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  pixels.set([12, 34, 56, 0], (12 * 64 + 12) * 4);
  const doc = new SkinDocument(64, 64, pixels);
  const layer = doc.addLayer("layer", null, "Details");
  doc.beginStroke();
  doc.paint(20, 20, [70, 80, 90, 255]);
  doc.endStroke();
  doc.updateLayer(layer, { opacity: 50 });
  writeSkinMetadata(doc, { race: "KIRIN", size: "FOAL", glow: "abcdef", wearables: [22, 50] });
  const meta = decodeSkinMetadata(doc);
  doc.setWorkspace("colors", { primary: "#123456", secondary: "#ffffff" });
  const token = doc.saveToken;
  doc.resize(128);
  assert.notEqual(doc.saveToken, token);
  assert.equal(doc.width, 128);
  assert.equal(doc.activeLayerId, layer);
  assert.equal(doc.activeLayer.opacity, 50);
  assert.deepEqual(
    Array.from(doc.layers[0].pixels.slice((24 * 128 + 24) * 4, (24 * 128 + 24) * 4 + 4)),
    [12, 34, 56, 0],
  );
  assert.deepEqual(doc.readPixel(40, 40), [70, 80, 90, 128]);
  assert.deepEqual(decodeSkinMetadata(doc), meta);
  validateSnapshot(doc.snapshot());
  doc.undo();
  assert.equal(doc.width, 64);
  assert.deepEqual(decodeSkinMetadata(doc), meta);
  const restored = decodeSkinProject(encodeSkinProject(doc));
  restored.redo();
  assert.equal(restored.width, 128);
  assert.deepEqual(restored.readPixel(40, 40), [70, 80, 90, 128]);
  assert.deepEqual(restored.getWorkspace("colors", {}), {
    primary: "#123456",
    secondary: "#ffffff",
  });
  restored.resize(64);
  assert.deepEqual(restored.readPixel(20, 20), [70, 80, 90, 128]);
  validateSnapshot(restored.snapshot());
  restored.undo();
  restored.undo();
  restored.undo();
  assert.equal(decodeSkinMetadata(restored).race, "HUMAN");
});

test("4K imports and resized projects support metadata while raster painting stops above 1024", () => {
  const doc = normalizeSkinPixels(4096, 4096, new Uint8ClampedArray(4096 * 4096 * 4));
  assert.equal(doc.canEditTexture, false);
  doc.beginStroke();
  doc.paint(10, 10, [255, 0, 0, 255]);
  doc.endStroke();
  assert.deepEqual(doc.readPixel(10, 10), [0, 0, 0, 0]);
  writeSkinMetadata(doc, { race: "ALICORN", size: "TALL" });
  assert.equal(decodeSkinMetadata(doc).race, "ALICORN");
  const restored = decodeSkinProject(encodeSkinProject(doc));
  assert.equal(restored.width, 4096);
  assert.equal(decodeSkinMetadata(restored).size, "TALL");
  restored.resize(1024);
  assert.equal(restored.canEditTexture, true);
  restored.beginStroke();
  restored.paint(10, 10, [255, 0, 0, 255]);
  restored.endStroke();
  assert.deepEqual(restored.readPixel(10, 10), [255, 0, 0, 255]);
  validateSnapshot(restored.snapshot());
  restored.undo();
  restored.undo();
  assert.equal(restored.width, 4096);
  assert.equal(decodeSkinMetadata(restored).race, "ALICORN");
});

test("resize rejects invalid dimensions and over-budget layers without changing state", () => {
  const doc = fresh();
  doc.addLayer();
  doc.undo();
  const token = doc.saveToken;
  for (const size of [0, 32, 65, 8192, 128.5, NaN]) {
    assert.throws(
      () => doc.resize(size),
      (error) => error.code === "invalidDimensions",
    );
    assert.equal(doc.saveToken, token);
    assert.equal(doc.canRedo, true);
  }
  doc.redo();
  const before = doc.snapshot();
  assert.throws(
    () => doc.resize(4096),
    (error) => error.code === "resizeMemory",
  );
  assert.deepEqual(doc.snapshot(), before);
  assert.throws(
    () => normalizeSkinPixels(4160, 4160, []),
    (error) => error.code === "invalidDimensions",
  );
});

test("resized history validates each raster against the dimensions at that history state", () => {
  const doc = fresh();
  doc.resize(128);
  doc.beginStroke();
  doc.paint(127, 127, [1, 2, 3, 255]);
  doc.endStroke();
  doc.resize(64);
  validateSnapshot(doc.snapshot());
  const snapshot = doc.snapshot();
  snapshot.undo[1].changes[0].index = 128 * 128 * 4;
  assert.throws(
    () => SkinDocument.restore(snapshot),
    (error) => error.code === "projectInvalid",
  );
  const mismatch = doc.snapshot();
  mismatch.undo.at(-1).before.width = 64;
  assert.throws(
    () => SkinDocument.restore(mismatch),
    (error) => error.code === "projectInvalid",
  );
});
