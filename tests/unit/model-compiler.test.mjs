import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileModel, evaluate } from "../../packages/model-compiler/src/compiler.mjs";
import {
  bodySizes,
  modelScale,
  sizeTransform,
  stageFor,
} from "../../packages/models/build/index.js";

test("Mson replaces an inherited component, but evaluates it with child locals", () => {
  const files = {
    base: {
      locals: { width: 4 },
      data: {
        body: {
          pivot: [8, 0, 0],
          children: { obsolete: {} },
          cubes: [{ from: [0, 0, 0], size: ["#width", 2, 3] }],
        },
        ear: {},
      },
    },
    child: {
      parent: "base",
      locals: { width: 3 },
      data: { body: { cubes: [{ from: [0, 0, 0], size: ["#width", 2, 3] }] } },
    },
  };
  const model = compileModel("child", (id) => files[id]);
  const body = model.nodes.find((n) => n.id === "body");
  assert.deepEqual(body.pivot, [0, 0, 0]);
  assert.equal(body.children.length, 0);
  assert.equal(model.nodes.length, 2);
  const xs = body.quads.flatMap((q) => q.positions.filter((_, i) => i % 3 === 0));
  assert.equal(Math.max(...xs), 3);
});

test("a planar face has literal atlas UVs independent of its dilation", () => {
  const model = compileModel("test", () => ({
    texture: { w: 64, h: 64 },
    data: { surface: { type: "mson:planar", dilate: [0.5, 0, 0], north: [0, 0, 0, 4, 2, 8, 16] } },
  }));
  const [quad] = model.nodes[0].quads;
  assert.deepEqual(quad.positions, [4.5, 0, 0, -0.5, 0, 0, -0.5, 2, 0, 4.5, 2, 0]);
  assert.deepEqual(quad.uv, [12 / 64, 48 / 64, 8 / 64, 48 / 64, 8 / 64, 46 / 64, 12 / 64, 46 / 64]);
});

test("plane and planar mirror flags use Mson face-local horizontal and vertical axes", () => {
  // Mson Face.Axis: X=(-1,1,0), Y=(0,-1,1), Z=(0,1,-1).
  // Thus width on an east/west face is world Z, while height is world Y.
  const axes = {
    east: [2, 1],
    west: [2, 1],
    up: [0, 2],
    down: [0, 2],
    north: [0, 1],
    south: [0, 1],
  };
  for (const [face, [horizontal, vertical]] of Object.entries(axes)) {
    for (const syntax of ["plane", "planar"]) {
      const compile = (mirror) =>
        compileModel("test", () => ({
          texture: { w: 64, h: 64, u: 8, v: 16 },
          data: {
            part:
              syntax === "plane"
                ? {
                    cubes: [
                      { type: "mson:plane", face, position: [1, 2, 3], size: [8, 4], mirror },
                    ],
                  }
                : { type: "mson:planar", [face]: [1, 2, 3, 8, 4, 8, 16, ...mirror] },
          },
        })).nodes[0].quads[0];
      const original = compile([false, false]);
      for (const mirror of [
        [true, false],
        [false, true],
        [true, true],
      ]) {
        const reflected = compile(mirror);
        for (let vertex = 0; vertex < 4; vertex++) {
          const expected = original.positions.slice(vertex * 3, vertex * 3 + 3);
          for (const [flag, axis] of [
            [mirror[0], horizontal],
            [mirror[1], vertical],
          ]) {
            if (flag) {
              const coordinates = original.positions.filter((_, i) => i % 3 === axis);
              expected[axis] = Math.min(...coordinates) + Math.max(...coordinates) - expected[axis];
            }
          }
          assert.deepEqual(
            reflected.positions.slice(vertex * 3, vertex * 3 + 3),
            expected,
            `${syntax} ${face} mirror=${mirror}`,
          );
        }
        assert.deepEqual(
          reflected.uv,
          original.uv,
          "Mirror must preserve the source atlas rectangle",
        );
      }
    }
  }
});

test("Mson planar fixtures only lock an axis whose outward stretch enters a neighbour", () => {
  const model = compileModel("joined-floor", () => ({
    data: {
      floor: {
        type: "mson:planar",
        dilate: 0.25,
        down: [
          [-4, 12, 2, 8, 4],
          [-4, 12, 6, 8, 4],
        ],
      },
    },
  }));
  const bounds = (quad) =>
    [0, 1, 2].map((axis) => {
      const values = quad.positions.filter((_, i) => i % 3 === axis);
      return [Math.min(...values), Math.max(...values)];
    });
  // Reference: Mson 1.9.3 JsonPlanar.Fixtures and QuadsBuilder.plane.
  // Sharing a Z edge must not shrink the unrelated X edges.
  assert.deepEqual(model.nodes[0].quads.map(bounds), [
    [
      [-4.25, 4.25],
      [12.25, 12.25],
      [1.75, 6.25],
    ],
    [
      [-4.25, 4.25],
      [12.25, 12.25],
      [6.25, 10.25],
    ],
  ]);
});

test("pony jacket panels meet at the same dilated edges as pinned Mson", () => {
  const source = JSON.parse(
    readFileSync(
      new URL("../../model-sources/minelittlepony/models/steve_pony.json", import.meta.url),
      "utf8",
    ),
  );
  const jacket = compileModel("jacket", () => ({ data: { jacket: source.data.jacket } })).nodes[0];
  const bounds = (quad) =>
    [0, 1, 2].map((axis) => {
      const values = quad.positions.filter((_, i) => i % 3 === axis);
      return [Math.min(...values), Math.max(...values)];
    });
  for (const [name, x] of [
    ["left_side", 4.25],
    ["right_side", -4.25],
  ]) {
    const side = jacket.children.find((node) => node.id.endsWith(`/${name}`));
    const panels = side.quads.map(bounds).filter((b) => b[0][0] === b[0][1]);
    assert.deepEqual(panels, [
      [
        [x, x],
        [3.75, 8.25],
        [1.75, 10.25],
      ],
      [
        [x, x],
        [8.25, 12.25],
        [1.75, 10.25],
      ],
      [
        [x, x],
        [3.75, 8.25],
        [10.25, 14.25],
      ],
      [
        [x, x],
        [8.25, 12.25],
        [10.25, 14.25],
      ],
    ]);
  }
  assert.deepEqual(jacket.children.find((n) => n.id.endsWith("/butt")).quads.map(bounds), [
    [
      [-4.25, 4.25],
      [3.75, 8.25],
      [14.25, 14.25],
    ],
    [
      [-4.25, 4.25],
      [8.25, 12.25],
      [14.25, 14.25],
    ],
  ]);
});

test("Earthpony right flank mirrors body and cutie mark horizontally without flipping height", () => {
  const source = JSON.parse(
    readFileSync(
      new URL("../../model-sources/minelittlepony/models/steve_pony.json", import.meta.url),
      "utf8",
    ),
  );
  const model = compileModel("flank", () => ({
    texture: source.texture,
    locals: source.locals,
    data: { body: source.data.body },
  }));
  const body = model.nodes.find((n) => n.id === "body");
  const sameTextureAtSameYZ = (left, right) => {
    for (let a = 0; a < 4; a++) {
      const [y, z] = left.positions.slice(a * 3 + 1, a * 3 + 3);
      const b = [0, 1, 2, 3].find(
        (i) => right.positions[i * 3 + 1] === y && right.positions[i * 3 + 2] === z,
      );
      assert.notEqual(b, undefined, "The two flanks should have matching corners");
      assert.deepEqual(right.uv.slice(b * 2, b * 2 + 2), left.uv.slice(a * 2, a * 2 + 2));
    }
  };
  // The first six body quads are the front cuboid, then paired side/mark planes.
  sameTextureAtSameYZ(body.quads[6], body.quads[7]);
  sameTextureAtSameYZ(body.quads[8], body.quads[9]);
  // Isolate the original overlay side definitions from dilation and unrelated faces.
  const overlay = compileModel("overlay", () => ({
    data: {
      left: { type: "mson:planar", east: source.data.jacket.children.left_side.east },
      right: { type: "mson:planar", west: source.data.jacket.children.right_side.west },
    },
  }));
  const leftQuads = overlay.nodes.find((n) => n.id === "left").quads;
  const rightQuads = overlay.nodes.find((n) => n.id === "right").quads;
  rightQuads.forEach((q, i) => sameTextureAtSameYZ(leftQuads[i], q));
});

test("unsupported constructs, missing resources and cycles fail explicitly", () => {
  assert.throws(() => evaluate("#missing", {}), /Unknown local/);
  assert.throws(() => evaluate("#a", { a: "#b", b: "#a" }), /Cyclic local/);
  assert.throws(() => evaluate([1, "/", 0], {}), /Non-finite/);
  assert.throws(() => compileModel("a", () => ({ parent: "a" })), /Cyclic model/);
  assert.throws(() => compileModel("a", () => null), /Missing model/);
  assert.throws(
    () => compileModel("a", () => ({ data: { part: { type: "mson:cone" } } })),
    /Unsupported type/,
  );
  assert.throws(
    () =>
      compileModel("a", () => ({ data: { part: { implementation: "unknown.Java", data: "x" } } })),
    /Unsupported implementation/,
  );
});

test("vendored Earthpony compiles reproducibly, including slim ears and tail segments", () => {
  const root = new URL("../../model-sources/", import.meta.url);
  const resolve = (id) => {
    const [ns, path] = id.split(":");
    return JSON.parse(readFileSync(new URL(`${ns}/models/${path}.json`, root), "utf8"));
  };
  const generated = JSON.parse(
    readFileSync(
      new URL("../../packages/models/src/generated/earthpony.json", import.meta.url),
      "utf8",
    ),
  );
  for (const variant of ["steve", "alex"]) {
    const model = compileModel(`minelittlepony:races/${variant}/earth_pony`, resolve);
    assert.deepEqual(model, generated.models[variant]);
    const nodes = [];
    const walk = (n) => {
      nodes.push(n);
      n.children.forEach(walk);
    };
    model.nodes.forEach(walk);
    assert.ok(nodes.find((n) => n.id === "head/ears/left"));
    assert.equal(nodes.filter((n) => /segment_\d\/segment$/.test(n.id)).length, 4);
    const arm = nodes.find((n) => n.id === "left_arm");
    const xs = arm.quads.flatMap((q) => q.positions.filter((_, i) => i % 3 === 0));
    assert.equal(Math.max(...xs) - Math.min(...xs), variant === "alex" ? 3 : 4);
  }
});

test("size presets preserve the reference's distinct child proportions", () => {
  assert.equal(bodySizes.length, 6);
  assert.equal(modelScale("FOAL"), modelScale("YEARLING"));
  assert.deepEqual(sizeTransform("FOAL", "HEAD").scale, [1.3, 1.3, 1.3]);
  assert.deepEqual(sizeTransform("FOAL", "LEGS").scale, [1, 0.81, 1]);
  assert.deepEqual(sizeTransform("BULKY", "BODY").scale, [1.15, 1.2, 1.2]);
  assert.deepEqual(sizeTransform("LANKY", "BODY").scale, [0.9, 1.2, 0.9]);
  assert.equal(stageFor("tail/tail/segment_0/segment"), "BODY");
});
