import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SkinDocument,
  decodeSkinMetadata,
  writeSkinMetadata,
  normalizeSkinPixels,
  raceColors,
  sizeColors,
  tailShapeColors,
} from "../../packages/api/build/esm/index.js";
import {
  resolveModel,
  defaultPreview,
  evaluateRig,
  flattenNodes,
  partAvailable,
  modelParts,
  resolveWearables,
  gearModels,
  accessoryTextures,
  registerPose,
} from "../../packages/models/build/index.js";

const skin = (size = 64) =>
  new SkinDocument(size, size, new Uint8ClampedArray(size * size * 4).fill(255));

test("every race × size × arm variant resolves finite, immutable geometry and deterministic joints", () => {
  const doc = skin();
  let cases = 0;
  for (const race of Object.keys(raceColors))
    for (const size of Object.keys(sizeColors))
      for (const slim of [false, true]) {
        writeSkinMetadata(doc, { race, size });
        const metadata = { ...decodeSkinMetadata(doc), slim };
        const model = resolveModel(metadata);
        const original = JSON.stringify(model);
        for (const form of ["skin", "wet", "dry"])
          for (const wings of ["folded", "extended"]) {
            const preview = { ...defaultPreview, form, wings };
            const resolved = resolveModel(metadata, preview);
            const nodes = flattenNodes(resolved);
            assert.equal(new Set(nodes.map((n) => n.id)).size, nodes.length);
            assert.ok(modelParts(resolved).some((p) => partAvailable(p.id, metadata, preview)));
            for (const node of nodes)
              for (const q of node.quads) {
                assert.equal(q.positions.length, 12);
                assert.equal(q.uv.length, 8);
                assert.ok([...q.positions, ...q.uv].every(Number.isFinite));
              }
            for (const joint of Object.values(evaluateRig(resolved, metadata, preview, 1.25)))
              assert.ok(
                [...joint.position, ...joint.rotation, ...joint.scale].every(Number.isFinite),
              );
          }
        assert.equal(JSON.stringify(model), original);
        cases++;
      }
  assert.equal(cases, 156);
});

test("all 92 representable accessory sets resolve models, textures, sides and stable stacking", () => {
  const ids = [22, 50, 100, 150, 198, 199, 200, 250];
  const doc = skin();
  let sets = 0;
  for (let mask = 1; mask < 256; mask++) {
    const items = ids.filter((_, i) => mask & (1 << i));
    if (items.length > 3) continue;
    writeSkinMetadata(doc, { race: "PEGASUS", wearables: items });
    const metadata = decodeSkinMetadata(doc);
    const gear = resolveWearables(metadata, defaultPreview);
    assert.deepEqual(
      gear.map((g) => g.id),
      items,
    );
    for (const item of gear) {
      assert.ok(gearModels[item.model]);
      assert.match(accessoryTextures[item.texture], /^data:image\/png;base64,/);
    }
    assert.deepEqual(
      resolveWearables({ ...metadata, wearables: [...items].reverse() }, defaultPreview),
      gear,
    );
    sets++;
  }
  assert.equal(sets, 92);
  writeSkinMetadata(doc, { wearables: [200] });
  const metadata = decodeSkinMetadata(doc);
  assert.equal(resolveWearables(metadata, defaultPreview)[0].embedded, true);
  assert.equal(
    resolveWearables({ ...metadata, race: "CHANGELING" }, defaultPreview)[0].embedded,
    false,
  );
  assert.equal(partAvailable("wings/right_wing/folded", metadata, defaultPreview), false);
  assert.equal(partAvailable("wings/legacy_right_wing/folded", metadata, defaultPreview), true);
});

test("poses and weighted clips compose from rest, follow outer layers and tolerate race-only joints", () => {
  const doc = skin();
  writeSkinMetadata(doc, { race: "EARTH" });
  const metadata = decodeSkinMetadata(doc),
    model = resolveModel(metadata);
  const original = JSON.stringify(model),
    rest = evaluateRig(model, metadata, defaultPreview);
  const remove = registerPose("test-sitting", {
    id: "sit",
    sample: () => ({ head: { rotation: [0.3, 0, 0] } }),
  });
  assert.throws(
    () => registerPose("test-sitting", { id: "duplicate", sample: () => ({}) }),
    /already registered/,
  );
  const preview = { ...defaultPreview, pose: "test-sitting" };
  const clips = [
    {
      id: "hoof-attack",
      duration: 2,
      weight: 0.5,
      blend: "additive",
      sample: ({ time }) => ({
        right_arm: { rotation: [time, 0, 0] },
        "wings/left_wing/extended": { rotation: [0, 0, time] },
      }),
    },
  ];
  const frame = evaluateRig(model, metadata, preview, 1, clips);
  assert.equal(frame.head.rotation[0], 0.3);
  assert.deepEqual(frame.hat, frame.head);
  assert.equal(frame.right_arm.rotation[0], rest.right_arm.rotation[0] + 0.5);
  assert.deepEqual(frame.right_sleeve, frame.right_arm);
  assert.deepEqual(evaluateRig(model, metadata, preview, 1, clips), frame);
  const end = evaluateRig(model, metadata, preview, 8, clips);
  assert.equal(end.right_arm.rotation[0], rest.right_arm.rotation[0] + 1);
  const loop = evaluateRig(model, metadata, preview, 3, [{ ...clips[0], loop: true }]);
  assert.deepEqual(loop.right_arm, frame.right_arm);
  assert.equal(JSON.stringify(model), original);
  remove();
  assert.throws(() => evaluateRig(model, metadata, preview), /Unknown pose/);
  assert.deepEqual(evaluateRig(model, metadata, defaultPreview), rest);
});

test("PNG metadata round-trips all enum values and HD physical trigger coordinates with undo", () => {
  const doc = skin(128);
  for (const race of Object.keys(raceColors))
    for (const size of Object.keys(sizeColors))
      for (const tailShape of Object.keys(tailShapeColors)) {
        const patch = {
          race,
          size,
          tailShape,
          tailLength: 2,
          snout: "flat",
          wearables: [22, 150, 250],
          glow: "ab12ef",
        };
        writeSkinMetadata(doc, patch);
        const decoded = decodeSkinMetadata(doc);
        for (const [key, value] of Object.entries(patch)) assert.deepEqual(decoded[key], value);
      }
  const before = doc.snapshot();
  writeSkinMetadata(doc, { race: "KIRIN", wearables: [] });
  doc.undo();
  assert.deepEqual(doc.snapshot(), before);
  doc.redo();
  assert.equal(decodeSkinMetadata(doc).race, "KIRIN");
  assert.throws(() => writeSkinMetadata(doc, { wearables: [22, 50, 100, 150] }), /трёх/);
  assert.throws(() => writeSkinMetadata(doc, { wearables: [22, 22] }), /трёх/);
  assert.throws(() => writeSkinMetadata(doc, { tailLength: 5 }), /tail length/);
  const restored = SkinDocument.restore(JSON.parse(JSON.stringify(doc.snapshot())));
  assert.deepEqual(restored.pixels, doc.pixels);
  assert.equal(restored.canUndo, false);
  restored.beginStroke();
  restored.paint(30, 30, [1, 2, 3, 255]);
  restored.endStroke();
  assert.notDeepEqual(restored.pixels, doc.pixels);
});

test("legacy limbs and MLP wings mirror at both 64 and HD resolution without touching triggers", () => {
  for (const width of [64, 128]) {
    const height = width / 2,
      m = width / 64,
      pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) pixels.set([x, y, 71, 255], (y * width + x) * 4);
    const doc = normalizeSkinPixels(width, height, pixels);
    assert.equal(doc.sourceFormat, "legacy");
    assert.equal(doc.height, width);
    assert.deepEqual(doc.readPixel(0, 0), [0, 0, 71, 255]);
    assert.deepEqual(doc.readPixel(20 * m, 48 * m), [8 * m - 1, 16 * m, 71, 255]);
    assert.deepEqual(doc.readPixel(56 * m, 34 * m), [62 * m - 1, 18 * m, 71, 255]);
    assert.deepEqual(doc.readPixel(0, 40 * m), [0, 0, 0, 0]);
  }
  assert.throws(() => normalizeSkinPixels(65, 65, new Uint8Array(65 * 65 * 4)), /PNG/);
});

test("wide 3D brushes stay inside a UV face and preserve trigger pixels", () => {
  const doc = skin(),
    before = doc.snapshot();
  doc.beginStroke();
  doc.paint(5, 5, [1, 2, 3, 255], "face", 8, { minX: 4, minY: 4, maxX: 6, maxY: 6 });
  doc.endStroke();
  let changed = 0;
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++)
      if (doc.readPixel(x, y)[0] === 1) {
        assert.ok(x >= 4 && x <= 6 && y >= 4 && y <= 6);
        changed++;
      }
  assert.equal(changed, 9);
  doc.undo();
  assert.deepEqual(doc.snapshot(), before);
});
