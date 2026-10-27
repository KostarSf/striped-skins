import { test } from "node:test";
import assert from "node:assert/strict";
import { BufferGeometry, Float32BufferAttribute, Mesh } from "three";
import { brushPatch } from "../../packages/viewer/build/esm/experimental/SurfaceHover.js";

const hit = (uv, x = 10, y = 20) => {
  const geometry = new BufferGeometry();
  // A tilted quad: preview must stay on its actual plane, not a world-axis billboard.
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0, 0, 8, 0, 4, 8, 8, 4, 0, 8, 0], 3),
  );
  return {
    mesh: new Mesh(geometry),
    quad: 0,
    uv,
    x,
    y,
    bounds: { minX: 8, maxX: 15, minY: 16, maxY: 23 },
  };
};
const uv = [8 / 64, 1 - 16 / 64, 16 / 64, 1 - 16 / 64, 16 / 64, 1 - 24 / 64, 8 / 64, 1 - 24 / 64];
test("brush preview maps a pixel to the actual face and scales to HD skins", () => {
  const h = hit(uv);
  assert.deepEqual(brushPatch(h, 64, 64, 1), [2, 4, 1, 3, 4, 1.5, 3, 5, 1.5, 2, 5, 1]);
  assert.deepEqual(
    brushPatch(
      { ...h, x: 20, y: 40, bounds: { minX: 16, maxX: 31, minY: 32, maxY: 47 } },
      128,
      128,
      2,
    ),
    brushPatch(h, 64, 64, 1),
  );
});
test("brush preview respects mirrored and rotated UV orientation", () => {
  const mirrored = hit([uv[2], uv[3], uv[0], uv[1], uv[6], uv[7], uv[4], uv[5]]);
  assert.deepEqual(brushPatch(mirrored, 64, 64, 1), [6, 4, 3, 5, 4, 2.5, 5, 5, 2.5, 6, 5, 3]);
  const rotated = hit([uv[6], uv[7], uv[0], uv[1], uv[2], uv[3], uv[4], uv[5]]);
  assert.deepEqual(brushPatch(rotated, 64, 64, 1), [4, 2, 2, 4, 3, 2, 3, 3, 1.5, 3, 2, 1.5]);
});
test("large preview clips to its UV island, and degenerate UVs produce no patch", () => {
  const h = hit(uv, 8, 16);
  assert.deepEqual(brushPatch(h, 64, 64, 5), [0, 0, 0, 3, 0, 1.5, 3, 3, 1.5, 0, 3, 0]);
  assert.deepEqual(brushPatch(hit(Array(8).fill(0)), 64, 64, 1), []);
});

test("reverse UV lookup returns every shared surface, filtering hidden parts and other documents", async () => {
  const { Group } = await import("three");
  const { SkinDocument } = await import("../../packages/api/build/esm/index.js");
  const { textureSurfaceHits } =
    await import("../../packages/viewer/build/esm/experimental/SurfaceHover.js");
  const doc = new SkinDocument(64, 64, new Uint8ClampedArray(64 * 64 * 4));
  const root = new Group();
  const add = (part, options = {}) => {
    const mesh = hit(uv).mesh;
    mesh.userData = {
      editable: true,
      documentId: doc.id,
      partId: part,
      surfaceIds: [`${part}/face`],
      surfaceUVs: [uv],
      ...options,
    };
    root.add(mesh);
    return mesh;
  };
  add("left");
  add("right");
  const hidden = add("hidden");
  hidden.visible = false;
  add("accessory", { editable: false });
  add("comparison", { documentId: doc.id + 1 });
  const hiddenParent = new Group();
  hiddenParent.visible = false;
  root.add(hiddenParent);
  hiddenParent.add(add("hidden-child"));
  // Transparent texels still have a preview: a 2D stroke can make them visible.
  assert.deepEqual(
    textureSurfaceHits(root, doc, { x: 10, y: 20 }, null).map((h) => h.part),
    ["left", "right"],
  );
  assert.deepEqual(
    textureSurfaceHits(root, doc, { x: 10, y: 20 }, "right").map((h) => h.part),
    ["right"],
  );
  assert.equal(textureSurfaceHits(root, doc, { x: 30, y: 30 }, null).length, 0);
  assert.equal(textureSurfaceHits(root, doc, { x: -1, y: 20 }, null).length, 0);
  assert.equal(textureSurfaceHits(root, doc, { x: 7, y: 20 }, null, 3).length, 2);
});
test("reverse hover clips fractional UV edges instead of extending past the face", () => {
  const fractional = hit(uv.map((v, i) => (i % 2 === 0 ? v + 0.5 / 64 : v)));
  const patch = brushPatch({ ...fractional, x: 8, y: 16 }, 64, 64, 1);
  assert.deepEqual(patch, [0, 0, 0, 0.5, 0, 0.25, 0.5, 1, 0.25, 0, 1, 0]);
});
