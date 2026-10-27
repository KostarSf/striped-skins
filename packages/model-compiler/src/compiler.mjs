// Build-time subset of Mson 1.9.3. Deliberately independent of React, Three and Java.
const faces = {
  up: [2, 3, 7, 6, 0, 2],
  down: [5, 4, 0, 1, 0, 2],
  west: [0, 4, 7, 3, 2, 1],
  east: [5, 1, 2, 6, 2, 1],
  north: [1, 0, 3, 2, 0, 1],
  south: [4, 5, 6, 7, 0, 1],
};
const corners = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const implementations = new Set([
  "com.minelittlepony.client.model.part.PonySnout",
  "com.minelittlepony.client.model.part.PonyEars",
  "com.minelittlepony.client.model.part.PonyTail",
  "com.minelittlepony.client.model.part.PonyTail$Segment",
  "com.minelittlepony.client.model.part.UnicornHorn",
  "com.minelittlepony.client.model.part.LionTail",
  "com.minelittlepony.client.model.part.SeaponyTail",
  "com.minelittlepony.client.model.part.PonyWings",
  "com.minelittlepony.client.model.part.PonyWings$Wing",
]);

export function evaluate(value, locals, stack = []) {
  let result;
  if (typeof value === "number") result = value;
  else if (typeof value === "string" && value.startsWith("#")) {
    const key = value.slice(1);
    if (stack.includes(key)) throw new Error(`Cyclic local: ${[...stack, key].join(" -> ")}`);
    if (!(key in locals)) throw new Error(`Unknown local: ${key}`);
    result = evaluate(locals[key], locals, [...stack, key]);
  } else if (typeof value === "string") {
    // Mson 1.9.3 Local.ref treats non-reference strings (including "0.05") as zero.
    result = 0;
  } else if (Array.isArray(value) && value.length === 3) {
    const a = evaluate(value[0], locals, stack);
    const b = evaluate(value[2], locals, stack);
    switch (value[1]) {
      case "+":
        result = a + b;
        break;
      case "-":
        result = a - b;
        break;
      case "*":
        result = a * b;
        break;
      case "/":
        result = a / b;
        break;
      case "%":
        result = a % b;
        break;
      default:
        throw new Error(`Unsupported operator: ${value[1]}`);
    }
  } else throw new Error(`Invalid expression: ${JSON.stringify(value)}`);
  if (!Number.isFinite(result)) throw new Error(`Non-finite expression: ${JSON.stringify(value)}`);
  return result;
}

function vector(value, length, locals) {
  if (value === undefined) return Array(length).fill(0);
  if (!Array.isArray(value)) return Array(length).fill(evaluate(value, locals));
  if (value.length !== length) throw new Error(`Expected vector of length ${length}`);
  return value.map((v) => evaluate(v, locals));
}
function checkKeys(value, allowed, where) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key) && !key.startsWith("__"))
      throw new Error(`Unsupported property ${where}.${key}`);
  }
}
function quad(vertices, u, v, w, h, texture, mirror = false) {
  // Minecraft ModelPart.Quad assigns UVs in this order, with V inverted for Three.
  const uv = [
    [u + w, v],
    [u, v],
    [u, v + h],
    [u + w, v + h],
  ];
  if (mirror) {
    vertices.reverse();
    uv.reverse();
  }
  return {
    positions: vertices.flat(),
    uv: uv.flatMap(([x, y]) => [x / texture.w, 1 - y / texture.h]),
  };
}

export function compileModel(modelId, resolve) {
  const active = [];
  const load = (id) => {
    if (active.includes(id)) throw new Error(`Cyclic model: ${[...active, id].join(" -> ")}`);
    active.push(id);
    const file = resolve(id);
    if (!file) throw new Error(`Missing model: ${id}`);
    checkKeys(file, ["parent", "texture", "locals", "data"], id);
    const parent = file.parent
      ? load(file.parent)
      : { locals: {}, texture: { u: 0, v: 0, w: 64, h: 64 }, data: {} };
    active.pop();
    return {
      locals: { ...parent.locals, ...file.locals },
      texture: { ...parent.texture, ...file.texture },
      data: { ...parent.data, ...file.data },
    };
  };
  const root = load(modelId);
  const slotStack = [];
  const linkStack = [];
  const compile = (raw, id, context) => {
    if (typeof raw === "string") {
      if (!raw.startsWith("#")) return compile({ type: "mson:import", data: raw }, id, context);
      const name = raw.slice(1),
        key = `${context.scope}:${name}`;
      if (linkStack.includes(key)) throw new Error(`Cyclic component link: ${name}`);
      const target = context.named?.[name];
      if (!target) throw new Error(`Missing component link: ${name} at ${id}`);
      linkStack.push(key);
      const result = { ...compile(target, id, context), aliasOf: name };
      linkStack.pop();
      return result;
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error(`Unsupported component: ${id}`);
    checkKeys(
      raw,
      [
        "type",
        "name",
        "implementation",
        "data",
        "locals",
        "texture",
        "pivot",
        "rotate",
        "visible",
        "mirror",
        "dilate",
        "cubes",
        "children",
        ...Object.keys(faces),
      ],
      id,
    );
    if (raw.implementation && !implementations.has(raw.implementation))
      throw new Error(`Unsupported implementation ${raw.implementation} at ${id}`);
    if (raw.data !== undefined) {
      checkKeys(raw, ["type", "name", "implementation", "data", "locals", "texture"], id);
      if (raw.type && !["mson:slot", "mson:import"].includes(raw.type))
        throw new Error(`Unsupported slot type ${raw.type} at ${id}`);
      const ref = raw.data;
      if ((!ref || typeof ref !== "object") && (typeof ref !== "string" || ref.startsWith("#")))
        throw new Error(`Unsupported slot reference at ${id}`);
      const key = typeof ref === "string" ? ref : id;
      if (slotStack.includes(key)) throw new Error(`Cyclic slot: ${key}`);
      slotStack.push(key);
      const imported = typeof ref === "string" ? load(ref) : { locals: {}, texture: {}, data: ref };
      const bound = Object.fromEntries(
        Object.entries(raw.locals ?? {}).map(([k, v]) => [k, evaluate(v, context.locals)]),
      );
      const locals = { ...context.locals, ...imported.locals, ...bound };
      const texture = { ...context.texture, ...imported.texture, ...raw.texture };
      const scope = { locals, texture, dilate: [0, 0, 0], named: imported.data, scope: id };
      if (raw.type === "mson:import") {
        const parts = Object.values(imported.data);
        if (parts.length !== 1) throw new Error(`Import must define exactly one part: ${id}`);
        const result = compile(parts[0], id, scope);
        slotStack.pop();
        return result;
      }
      const node = {
        id,
        implementation: raw.implementation,
        locals: Object.fromEntries(
          Object.keys(locals).map((name) => [name, evaluate(`#${name}`, locals)]),
        ),
        pivot: [0, 0, 0],
        rotation: [0, 0, 0],
        visible: true,
        quads: [],
        children: Object.entries(imported.data).map(([name, part]) =>
          compile(part, `${id}/${name}`, scope),
        ),
      };
      slotStack.pop();
      return node;
    }
    const type = raw.type ?? "mson:compound";
    if (!["mson:compound", "mson:planar"].includes(type))
      throw new Error(`Unsupported type ${type} at ${id}`);
    if (raw.locals) throw new Error(`locals outside slot at ${id}`);
    if (
      raw.mirror &&
      typeof raw.mirror !== "boolean" &&
      (!Array.isArray(raw.mirror) ||
        raw.mirror.length !== 3 ||
        raw.mirror.some((v) => typeof v !== "boolean"))
    )
      throw new Error(`Unsupported compound mirror at ${id}`);
    const locals = context.locals;
    const texture = { ...context.texture, ...raw.texture };
    const dilation = vector(raw.dilate, 3, locals).map((v, i) => v + context.dilate[i]);
    const quads = [];
    const plane = (face, position, dimensions, tex, mirror, dilate, siblings = []) => {
      if (!(face in faces)) throw new Error(`Unsupported face ${face} at ${id}`);
      const size = ["east", "west"].includes(face)
        ? [0, dimensions[1], dimensions[0]]
        : ["up", "down"].includes(face)
          ? [dimensions[0], 0, dimensions[1]]
          : [dimensions[0], dimensions[1], 0];
      const axis = ["east", "west"].includes(face) ? 0 : ["up", "down"].includes(face) ? 1 : 2;
      const min = [...position],
        max = position.map((v, i) => v + size[i]);
      // Planar fixtures reverse dilation at edges shared by coplanar rectangles.
      const fixed = (point, coordinate) =>
        coordinate !== axis &&
        siblings.some((s) => {
          const extent =
            axis === 0 ? [0, s[4], s[3]] : axis === 1 ? [s[3], 0, s[4]] : [s[3], s[4], 0];
          return point.every((v, i) => v >= s[i] && v <= s[i] + extent[i]);
        });
      for (let i = 0; i < 3; i++) {
        const sign = axis === 1 && i === 1 ? -1 : 1;
        const lo = dilate[i] * sign * (fixed(position, i) ? -1 : 1);
        const hi =
          dilate[i] *
          sign *
          (fixed(
            position.map((v, j) => v + size[j]),
            i,
          )
            ? -1
            : 1);
        min[i] -= lo;
        max[i] += hi;
      }
      const mirrorAxes =
        axis === 0
          ? [false, mirror[1], mirror[0]]
          : axis === 1
            ? [mirror[0], false, mirror[1]]
            : [...mirror, false];
      for (let i = 0; i < 3; i++) if (mirrorAxes[i]) [min[i], max[i]] = [max[i], min[i]];
      const vertices = faces[face]
        .slice(0, 4)
        .map((index) => corners[index].map((v, i) => (v ? max[i] : min[i])));
      quads.push(quad(vertices, tex.u, tex.v, dimensions[0], dimensions[1], tex));
    };
    for (const [face, indices] of Object.entries(faces)) {
      if (!raw[face]) continue;
      if (type !== "mson:planar") throw new Error(`Planar face on ${type} at ${id}`);
      const list = Array.isArray(raw[face][0]) ? raw[face] : [raw[face]];
      const evaluated = list.map((p) => p.slice(0, 7).map((v) => evaluate(v, locals)));
      list.forEach((p, i) => {
        if (![5, 7, 9].includes(p.length)) throw new Error(`Invalid planar face at ${id}/${face}`);
        const values = evaluated[i];
        plane(
          face,
          values.slice(0, 3),
          values.slice(3, 5),
          { ...texture, u: values[5] ?? texture.u, v: values[6] ?? texture.v },
          p.slice(7, 9),
          dilation,
          evaluated.filter((_, j) => j !== i),
        );
      });
      void indices;
    }
    for (const cube of raw.cubes ?? []) {
      const cubeType = cube.type ?? "mson:box";
      checkKeys(
        cube,
        ["type", "texture", "from", "position", "size", "dilate", "mirror", "face", "taper"],
        `${id}/cube`,
      );
      const tex = { ...texture, ...cube.texture };
      const d = vector(cube.dilate, 3, locals).map((v, i) => v + dilation[i]);
      if (cubeType === "mson:plane") {
        plane(
          cube.face,
          vector(cube.position, 3, locals),
          vector(cube.size, 2, locals),
          tex,
          cube.mirror ?? [],
          d,
        );
      } else if (cubeType === "mson:box" || cubeType === "mson:cone") {
        if (cube.mirror !== undefined && typeof cube.mirror !== "boolean")
          throw new Error(`Invalid box mirror at ${id}`);
        const pos = vector(cube.from, 3, locals),
          size = vector(cube.size, 3, locals);
        const min = pos.map((v, i) => v - d[i]),
          max = pos.map((v, i) => v + size[i] + d[i]);
        const mirror =
          cube.mirror ?? (typeof raw.mirror === "boolean" ? raw.mirror : raw.mirror?.[0]) ?? false;
        if (mirror) [min[0], max[0]] = [max[0], min[0]];
        const [x, y, z] = size,
          { u, v } = tex;
        const layouts = {
          up: [u + z + x, v + z, x, -z],
          down: [u + z, v, x, z],
          west: [u, v + z, z, y],
          east: [u + z + x, v + z, z, y],
          north: [u + z, v + z, x, y],
          south: [u + z + x + z, v + z, x, y],
        };
        for (const [face, indices] of Object.entries(faces)) {
          const vertices = indices
            .slice(0, 4)
            .map((index) => corners[index].map((c, i) => (c ? max[i] : min[i])));
          if (cubeType === "mson:cone") {
            const taper = evaluate(cube.taper ?? 0, locals);
            vertices.forEach((v) => {
              if (v[1] === min[1]) {
                v[0] += (v[0] === min[0] ? 1 : -1) * size[0] * taper;
                v[2] += (v[2] === min[2] ? 1 : -1) * size[2] * taper;
              }
            });
          }
          quads.push(quad(vertices, ...layouts[face], tex, mirror));
        }
      } else throw new Error(`Unsupported cube type ${cubeType} at ${id}`);
    }
    return {
      id,
      pivot: vector(raw.pivot, 3, locals),
      rotation: vector(raw.rotate, 3, locals).map((v) => (v * Math.PI) / 180),
      visible: raw.visible ?? true,
      quads: quads.map((q, i) => ({ ...q, id: `${id}/surface-${i}` })),
      children: Object.entries(raw.children ?? {}).map(([name, part]) =>
        compile(part, `${id}/${name}`, {
          ...context,
          locals,
          texture,
          dilate: dilation,
          named: { ...context.named, ...raw.children },
        }),
      ),
    };
  };
  return {
    id: modelId,
    nodes: Object.entries(root.data).map(([name, part]) =>
      compile(part, name, {
        locals: root.locals,
        texture: root.texture,
        dilate: [0, 0, 0],
        named: root.data,
        scope: modelId,
      }),
    ),
  };
}
