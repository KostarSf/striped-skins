import generated from "./generated/earthpony.json" with { type: "json" };

export type Vec3 = [number, number, number];
export type ModelQuad = { id: string; positions: number[]; uv: number[] };
export type ModelNode = {
  id: string;
  pivot: Vec3;
  rotation: Vec3;
  visible: boolean;
  quads: ModelQuad[];
  children: ModelNode[];
};
export type ModelDefinition = { id: string; nodes: ModelNode[] };
export const earthponyModels = generated.models as unknown as Record<
  "steve" | "alex",
  ModelDefinition
>;
export const modelProvenance = generated.provenance;

export const bodySizes = ["NORMAL", "FOAL", "YEARLING", "TALL", "LANKY", "BULKY"] as const;
export type BodySize = (typeof bodySizes)[number];
export type Stage = "HEAD" | "NECK" | "BODY" | "LEGS" | "TAIL";
export type StageTransform = { scale: Vec3; translate: Vec3 };
const baseScale: Record<BodySize, number> = {
  NORMAL: 0.8,
  FOAL: 0.6,
  YEARLING: 0.6,
  TALL: 1.1,
  LANKY: 0.85,
  BULKY: 1,
};

// Standing pose from MLP 1.20.1 PonyTransformation; translations are in blocks.
// Renderer applies translate BEFORE scale, as MatrixStack does in the reference.
export function sizeTransform(size: BodySize, stage: Stage): StageTransform {
  let translate: Vec3 = [0, 0, 0];
  let scale: Vec3 = [1, 1, 1];
  if (size === "FOAL") {
    translate = [0, 0.2, 0];
    if (stage === "NECK") {
      translate[2] += 0.04;
      scale = [1.3, 1.3, 1.3];
    }
    if (stage === "HEAD") scale = [1.3, 1.3, 1.3];
    if (stage === "LEGS") {
      translate[1] += 0.09;
      scale = [1, 0.81, 1];
    }
  } else if (size === "LANKY" || size === "BULKY") {
    const bulky = size === "BULKY";
    if (stage === "NECK") {
      translate = [0, -0.2, bulky ? -0.07 : -0.05];
      scale = [1, 1.3, 1];
    }
    if (stage === "HEAD") translate = [0, -0.14, bulky ? -0.06 : -0.04];
    if (stage === "BODY") {
      translate = [0, -0.2, -0.04];
      scale = bulky ? [1.15, 1.2, 1.2] : [0.9, 1.2, 0.9];
    }
    if (stage === "TAIL") translate = [0, -0.2, 0.08];
    if (stage === "LEGS") {
      translate = [0, -0.18, 0];
      scale = bulky ? [1.15, 1.12, 1.15] : [0.9, 1.12, 0.9];
    }
  } else if (size === "TALL" || size === "YEARLING") {
    const yearling = size === "YEARLING";
    if (stage === "NECK") {
      translate = [0, yearling ? -0.2 : -0.21, yearling ? 0 : -0.01];
      scale = [1, yearling ? 1.3 : 1.28, 1];
    }
    if (stage === "HEAD") {
      translate = [0, yearling ? -0.15 : -0.11, 0];
      if (yearling) scale = [1.15, 1.15, 1.15];
    }
    if (stage === "BODY" || stage === "TAIL") translate = [0, -0.1, 0];
    if (stage === "LEGS") {
      translate = [0, yearling ? -0.265 : -0.27, 0.03];
      scale = [1, 1.18, 1];
    }
  }
  return { translate: translate.map((v) => v * 16) as Vec3, scale };
}
export function modelScale(size: BodySize) {
  return baseScale[size] * 0.9 * 0.25;
}

export function stageFor(id: string): Stage {
  const root = id.split("/")[0];
  if (root === "head" || root === "hat") return "HEAD";
  if (root === "neck") return "NECK";
  // EarthPonyModel adds the tail to bodyRenderList, inheriting BODY stage.
  if (root === "body" || root === "jacket" || root === "tail") return "BODY";
  return "LEGS";
}

export function modelParts(
  definition: ModelDefinition,
): { id: string; label: string; defaultVisible: boolean }[] {
  const result: ReturnType<typeof modelParts> = [];
  const walk = (node: ModelNode) => {
    if (node.quads.length)
      result.push({
        id: node.id,
        label: node.id.replaceAll("/", " / "),
        defaultVisible: node.visible,
      });
    node.children.forEach(walk);
  };
  definition.nodes.filter((n) => n.id !== "ear" && n.id !== "cloak").forEach(walk);
  return result;
}
