import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPartTree,
  partLeaves,
  partVisible,
  togglePartTree,
} from "../../app/components/studio/part-tree.ts";
import {
  earthponyModels,
  defaultPreview,
  partAvailable,
} from "../../packages/models/build/index.js";
import { geometryFor } from "../../packages/viewer/build/esm/models/GeneratedPony.js";
import { updateSurfaceVisibility } from "../../packages/viewer/build/esm/models/SurfaceVisibility.js";
import { textureSurfaceHits } from "../../packages/viewer/build/esm/experimental/SurfaceHover.js";
import { Mesh, Group, Raycaster, Vector3 } from "three";
import { SkinDocument } from "../../packages/api/build/esm/index.js";

const metadata = {
  race: "EARTH",
  size: "NORMAL",
  slim: false,
  snout: "mare",
  tailLength: 4,
  wearables: [],
};
const tree = () =>
  buildPartTree(
    earthponyModels.steve.nodes,
    (id) => partAvailable(id, metadata, defaultPreview),
    (id) => id,
    [],
  );
test("visibility tree derives all available faces from model nodes and separates clothing", () => {
  const roots = tree(),
    all = roots.flatMap(partLeaves);
  assert.equal(new Set(all.map((n) => n.id)).size, all.length);
  const legs = roots.find((n) => n.id === "group/legs");
  assert.ok(
    legs.children.find((n) => n.id === "group/legs/base").children.some((n) => n.id === "left_leg"),
  );
  assert.ok(
    legs.children
      .find((n) => n.id === "group/legs/clothes")
      .children.some((n) => n.id === "left_sleeve"),
  );
  assert.ok(all.some((n) => n.id === "body/surface-0"));
  assert.ok(!all.some((n) => n.partId === "ear" || n.partId === "head/nose"));
});
test("group visibility can restore one face without exposing the other hidden faces", () => {
  const roots = tree(),
    head = roots.find((n) => n.id === "group/head");
  const hidden = togglePartTree(roots, head, new Set(), false);
  assert.ok(partLeaves(head).every((n) => !partVisible(n, hidden)));
  const face = partLeaves(head)[0];
  const restored = togglePartTree(roots, face, hidden, true);
  assert.equal(partLeaves(head).filter((n) => partVisible(n, restored)).length, 1);
  const legacy = togglePartTree(roots, face, new Set([face.partId]), true);
  assert.ok(partVisible(face, legacy));
  assert.ok(
    partLeaves(head)
      .filter((n) => n.partId === face.partId && n.id !== face.id)
      .every((n) => !partVisible(n, legacy)),
  );
});
test("face visibility preserves raycast indices, excludes reverse hover, and restores geometry", () => {
  const quads = [0, 2].map((x, i) => ({
    id: `part/surface-${i}`,
    positions: [x, 0, 0, x + 1, 0, 0, x + 1, 1, 0, x, 1, 0],
    uv: [0.25, 0.75, 0.5, 0.75, 0.5, 0.5, 0.25, 0.5],
  }));
  const mesh = new Mesh(geometryFor(quads));
  const doc = new SkinDocument(64, 64, new Uint8ClampedArray(64 * 64 * 4));
  mesh.userData = {
    partId: "part",
    documentId: doc.id,
    editable: true,
    surfaceIds: quads.map((q) => q.id),
    surfaceUVs: quads.map((q) => q.uv),
  };
  const root = new Group();
  root.add(mesh);
  root.updateMatrixWorld(true);
  const original = Array.from(mesh.geometry.index.array);
  assert.equal(updateSurfaceVisibility(mesh, new Set([quads[0].id])), true);
  assert.deepEqual(Array.from(mesh.geometry.index.array).slice(0, 6), [0, 0, 0, 0, 0, 0]);
  const ray = new Raycaster(new Vector3(2.5, 0.5, 1), new Vector3(0, 0, -1));
  assert.equal(ray.intersectObject(mesh)[0].faceIndex, 2);
  ray.set(new Vector3(0.5, 0.5, 1), new Vector3(0, 0, -1));
  assert.equal(ray.intersectObject(mesh).length, 0);
  assert.deepEqual(
    textureSurfaceHits(root, doc, { x: 20, y: 20 }, null).map((h) => h.quad),
    [1],
  );
  updateSurfaceVisibility(mesh, new Set());
  assert.deepEqual(Array.from(mesh.geometry.index.array), original);
  mesh.geometry.dispose();
  mesh.material.dispose();
});
