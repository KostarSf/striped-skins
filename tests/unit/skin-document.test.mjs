import { test } from "node:test";
import assert from "node:assert/strict";
import { SkinDocument, decodeSkinMetadata, uvToPixel } from "../../packages/api/build/esm/index.js";
const fresh = () => new SkinDocument(64, 64, new Uint8ClampedArray(64 * 64 * 4));
const magenta = [255, 0, 255, 255];

test("a stroke is one reversible operation; documents own independent pixels", () => {
  const input = new Uint8ClampedArray(64 * 64 * 4);
  const a = new SkinDocument(64, 64, input),
    b = new SkinDocument(64, 64, input);
  a.beginStroke();
  a.paint(10, 10, magenta);
  a.paint(15, 10, magenta);
  a.endStroke();
  for (let x = 10; x <= 15; x++) assert.deepEqual(a.readPixel(x, 10), magenta);
  assert.deepEqual(b.readPixel(10, 10), [0, 0, 0, 0]);
  a.undo();
  assert.deepEqual(a.readPixel(15, 10), [0, 0, 0, 0]);
  assert.equal(a.canUndo, false);
  a.redo();
  assert.deepEqual(a.readPixel(15, 10), magenta);
  a.beginStroke();
  a.paint(10, 10, [1, 2, 3, 255]);
  a.cancelStroke();
  assert.deepEqual(a.readPixel(10, 10), magenta);
});
test("brush protects trigger pixels and never draws across unrelated UV islands", () => {
  const skin = fresh();
  skin.beginStroke();
  skin.paint(0, 0, magenta);
  skin.paint(10, 10, magenta, "face-a");
  skin.paint(20, 20, magenta, "face-b");
  skin.endStroke();
  assert.deepEqual(skin.readPixel(0, 0), [0, 0, 0, 0]);
  assert.deepEqual(skin.readPixel(15, 15), [0, 0, 0, 0]);
  assert.deepEqual(skin.readPixel(20, 20), magenta);
});
test("codec follows MLP alpha, Human fallback, size and accessory channel semantics", () => {
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  pixels.set([0xf9, 0xb1, 0x31, 254], 0);
  pixels.set([0xff, 0xbe, 0x53, 255], 12);
  pixels.set([0x16, 0x32, 0x16, 255], (64 + 1) * 4);
  let metadata = decodeSkinMetadata(new SkinDocument(64, 64, pixels));
  assert.equal(metadata.race, "HUMAN");
  assert.equal(metadata.size, "FOAL");
  assert.deepEqual(metadata.wearables, [0x16, 0x32]);
  pixels[3] = 255;
  metadata = decodeSkinMetadata(new SkinDocument(64, 64, pixels));
  assert.equal(metadata.race, "EARTH");
});
test("UV mapping uses physical texture size, top-left canvas origin and safe edges", () => {
  assert.deepEqual(uvToPixel(0, 1, 64, 64), { x: 0, y: 0 });
  assert.deepEqual(uvToPixel(1, 0, 64, 64), { x: 63, y: 63 });
  assert.deepEqual(uvToPixel(0.5, 0.75, 128, 128), { x: 64, y: 32 });
});
