import type { SkinMetadata } from "@striped-skins/api";
import type { ModelDefinition, Vec3 } from "./index.js";
import { flattenNodes, type PreviewSettings } from "./appearance.js";

export type JointTransform = { position: Vec3; rotation: Vec3; scale: Vec3 };
export type RigFrame = Record<string, JointTransform>;
export type MotionContext = {
  metadata: SkinMetadata;
  preview: PreviewSettings;
  time: number;
  duration: number;
};
export type JointPatch = Partial<JointTransform>;
export type MotionLayer = {
  id: string;
  priority?: number;
  weight?: number;
  blend?: "replace" | "additive";
  duration?: number;
  loop?: boolean;
  sample: (context: MotionContext) => Record<string, JointPatch>;
};
// Geometry stays immutable. Every evaluation starts from rest, then appearance, pose,
// and explicitly ordered motion layers. Parts absent on a race are valid optional targets.
const poses = new Map<string, MotionLayer>([["standing", { id: "standing", sample: () => ({}) }]]);
export function registerPose(id: string, pose: MotionLayer) {
  if (poses.has(id)) throw new Error(`Pose already registered: ${id}`);
  poses.set(id, pose);
  return () => {
    poses.delete(id);
  };
}
export function composeMotion(
  frame: RigFrame,
  context: MotionContext,
  layers: readonly MotionLayer[],
): RigFrame {
  for (const layer of [...layers].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))) {
    const duration = layer.duration ?? 0;
    const time = duration
      ? layer.loop
        ? context.time % duration
        : Math.min(context.time, duration)
      : context.time;
    const weight = Math.max(0, Math.min(1, layer.weight ?? 1));
    for (const [id, patch] of Object.entries(layer.sample({ ...context, time, duration }))) {
      const joint = frame[id];
      if (!joint) continue;
      for (const channel of ["position", "rotation", "scale"] as const) {
        const value = patch[channel];
        if (!value) continue;
        joint[channel] = joint[channel].map((v, i) =>
          layer.blend === "additive"
            ? v + weight * (value[i] - (channel === "scale" ? 1 : 0))
            : v + (value[i] - v) * weight,
        ) as Vec3;
      }
    }
  }
  return frame;
}
export function evaluateRig(
  model: ModelDefinition,
  metadata: SkinMetadata,
  preview: PreviewSettings,
  time = 0,
  layers: readonly MotionLayer[] = [],
): RigFrame {
  const frame: RigFrame = Object.fromEntries(
    flattenNodes(model).map((n) => [
      n.id,
      {
        position: [...n.pivot] as Vec3,
        rotation: [...n.rotation] as Vec3,
        scale: [1, 1, 1] as Vec3,
      },
    ]),
  );
  if (metadata.race !== "HUMAN") {
    if (frame.neck) frame.neck.position[0] = 0.166;
    for (const id of ["right_arm", "left_arm", "right_leg", "left_leg"]) {
      const joint = frame[id];
      if (!joint) continue;
      joint.position[0] = id.startsWith("right")
        ? metadata.slim
          ? -0.999
          : 0.001
        : metadata.slim
          ? 0.999
          : -0.001;
      if (id.endsWith("leg")) joint.position[1] = 8;
    }
    const tail = model.nodes.find((n) => n.id === "tail");
    if (tail?.implementation?.endsWith("PonyTail") && frame["tail/tail"]) {
      const sway = Math.sin(time * 20 * 0.067) * 0.05;
      frame["tail/tail"].rotation = [sway, sway, 0];
    }
    if (tail?.implementation?.endsWith("SeaponyTail")) {
      const sway = Math.sin(time * 20 * 0.536) / 4;
      frame["tail/base"].rotation[0] = Math.PI / 2 + sway;
      frame["tail/base/tip"].rotation[0] = sway;
      frame["tail/base/tip/fins"].rotation[0] = sway - Math.PI / 2;
      const fin = Math.cos(time * 2) / 5;
      frame.left_fin.rotation[1] = Math.PI / 6 + fin;
      frame.right_fin.rotation[1] = -Math.PI / 6 - fin;
      frame.center_fin.rotation[2] = fin;
      // Underwater neutral arm pose from SeaponyModel.rotateLegs.
      frame.left_arm.rotation = [-1.4, -0.3, 0];
      frame.right_arm.rotation = [-1.4, 0.3, 0];
    }
    if (frame["tail/tail"] && tail?.implementation?.endsWith("LionTail")) {
      const base = 1 + Math.sin(time * 20 * 0.067) * 0.05;
      frame["tail/tail"].rotation[0] = base;
      const straight = 1.6 * (1 + Math.sin((time * 20) / 90) / 8);
      let parent = base,
        path = "tail/tail";
      for (let i = 2; i <= 6; i++) {
        path += `/tail${i}`;
        const joint = frame[path];
        if (!joint) break;
        parent =
          i === 2
            ? -base / straight
            : i === 5
              ? -parent * straight
              : i === 6
                ? parent * straight
                : parent / straight;
        joint.rotation[0] = parent;
      }
    }
    for (const [id, joint] of Object.entries(frame)) {
      if (id.startsWith("wings/") && (id.endsWith("/extended") || id.endsWith("/folded"))) {
        const wing = model.nodes.find((n) => n.id === "wings");
        const scale = wing?.locals?.wing_scale ?? 1;
        // Scale the wing parent so its pivot and all descendants scale together.
        const parent = frame[id.slice(0, id.lastIndexOf("/"))];
        if (parent) parent.scale = [scale, scale, scale];
        if (id.endsWith("/folded") && metadata.wearables.includes(200))
          joint.position[2] += (0.198 * 16) / scale;
        const bug = metadata.race === "CHANGELING" || metadata.race === "CHANGEDLING";
        if (id.endsWith("/extended") || bug) {
          const sign = id.includes("left_wing") ? 1 : -1;
          joint.rotation[2] = sign * (Math.PI * 1.5 - 0.9 + Math.sin(time * 2) / 15);
        }
      }
      const segment = id.match(/segment_(\d+)\/segment$/);
      if (segment && metadata.tailShape !== "STRAIGHT") {
        const index = Number(segment[1]),
          bumpy = metadata.tailShape === "BUMPY",
          scale = 1 + Math.cos(index + (bumpy ? 5 : 10)) / (bumpy ? 2 : 5);
        joint.scale = [bumpy ? scale : 1, 1, scale];
        joint.position[2] = (bumpy ? -9 : -6) + 9 * scale - 2 * scale * scale;
        if (bumpy) joint.position[0] = scale * scale - 1.6 * scale;
        if (metadata.tailShape === "SPIKY") joint.rotation[1] = 0.2 * ((index % 2) - 1);
      }
    }
  }
  // Skin outer layers follow the same joints, preserving separate visibility.
  const follow = {
    hat: "head",
    jacket: "body",
    right_sleeve: "right_arm",
    left_sleeve: "left_arm",
    right_pants: "right_leg",
    left_pants: "left_leg",
  };
  const pose = poses.get(preview.pose);
  if (!pose) throw new Error(`Unknown pose: ${preview.pose}`);
  composeMotion(frame, { metadata, preview, time, duration: 0 }, [pose, ...layers]);
  for (const [target, source] of Object.entries(follow))
    if (frame[target] && frame[source])
      frame[target] = {
        position: [...frame[source].position],
        rotation: [...frame[source].rotation],
        scale: [...frame[source].scale],
      };
  return frame;
}
