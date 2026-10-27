import catalog from "./generated/catalog.json" with { type: "json" };
import textures from "./generated/textures.json" with { type: "json" };
import type { SkinMetadata, RaceId } from "@striped-skins/api";
import type { ModelDefinition, ModelNode, Vec3 } from "./index.js";

export const raceModels: Record<RaceId, string> = {
  HUMAN: "human",
  EARTH: "earth_pony",
  PEGASUS: "pegasus",
  UNICORN: "unicorn",
  ALICORN: "alicorn",
  CHANGELING: "changeling",
  ZEBRA: "zebra",
  CHANGEDLING: "reformed_changeling",
  GRYPHON: "gryphon",
  HIPPOGRIFF: "hippogriff",
  KIRIN: "kirin",
  BATPONY: "bat_pony",
  SEAPONY: "sea_pony",
};
export type ModelCatalog = Record<string, Record<"steve" | "alex", ModelDefinition>>;
export const ponyModels = catalog.models as unknown as ModelCatalog;
export const gearModels = catalog.gear as unknown as Record<string, ModelDefinition>;
export const accessoryTextures: Record<string, string> = textures;
export type PreviewSettings = {
  wings: "folded" | "extended";
  form: "skin" | "wet" | "dry";
  pose: string;
};
export const defaultPreview: PreviewSettings = { wings: "folded", form: "skin", pose: "standing" };
export function resolveModel(metadata: SkinMetadata, preview: PreviewSettings = defaultPreview) {
  let name = raceModels[metadata.race];
  if (preview.form === "dry" && metadata.race === "SEAPONY") name = "unicorn";
  if (preview.form === "wet" && (metadata.race === "SEAPONY" || metadata.race === "HIPPOGRIFF"))
    name = "sea_pony";
  return ponyModels[name][metadata.slim ? "alex" : "steve"];
}
export function flattenNodes(model: ModelDefinition): ModelNode[] {
  const out: ModelNode[] = [];
  const walk = (node: ModelNode) => {
    out.push(node);
    node.children.forEach(walk);
  };
  model.nodes.forEach(walk);
  return out;
}
export function partAvailable(
  id: string,
  metadata: SkinMetadata,
  preview: PreviewSettings,
): boolean {
  if (
    id === "ear" ||
    id === "cloak" ||
    id.startsWith("head/nose") ||
    (id.startsWith("neck/mane") && metadata.race !== "KIRIN") ||
    /^(left_cast|right_cast)(\/|$)/.test(id) ||
    id.includes("/corona")
  )
    return false;
  if (id.includes("/snout/")) return id.endsWith(`/${metadata.snout}`);
  const segment = id.match(/segment_(\d+)/);
  if (segment && Number(segment[1]) >= metadata.tailLength) return false;
  if (id.startsWith("wings/")) {
    const embedded =
      metadata.wearables.some((v) => [198, 199, 200].includes(v)) &&
      !["BATPONY", "CHANGELING", "CHANGEDLING"].includes(metadata.race);
    if (id.includes("legacy_right_wing") && !embedded) return false;
    if (id.startsWith("wings/right_wing") && embedded) return false;
    if (id.includes("/folded") && preview.wings !== "folded") return false;
    if (id.includes("/extended") && preview.wings !== "extended") return false;
  }
  if (
    (metadata.race === "SEAPONY" && preview.form !== "dry") ||
    (preview.form === "wet" && metadata.race === "HIPPOGRIFF")
  ) {
    if (
      ["left_leg", "right_leg", "left_pants", "right_pants", "jacket"].some(
        (p) => id === p || id.startsWith(p + "/"),
      )
    )
      return false;
  }
  return true;
}
export type WearableDefinition = {
  id: number;
  model: string;
  texture: string;
  anchor: "head" | "body";
  stackHeight: number;
  side?: "left" | "right" | "both";
};
export const wearables: Record<number, WearableDefinition> = {
  22: { id: 22, model: "crown", texture: "crown", anchor: "head", stackHeight: 1.6 },
  50: { id: 50, model: "muffin", texture: "muffin", anchor: "head", stackHeight: 7.2 },
  100: { id: 100, model: "witch_hat", texture: "witch", anchor: "head", stackHeight: 11.2 },
  150: { id: 150, model: "antlers", texture: "antlers", anchor: "head", stackHeight: 0 },
  198: {
    id: 198,
    model: "saddlebags",
    texture: "saddlebags",
    anchor: "body",
    stackHeight: 0,
    side: "left",
  },
  199: {
    id: 199,
    model: "saddlebags",
    texture: "saddlebags",
    anchor: "body",
    stackHeight: 0,
    side: "right",
  },
  200: {
    id: 200,
    model: "saddlebags",
    texture: "saddlebags",
    anchor: "body",
    stackHeight: 0,
    side: "both",
  },
  250: { id: 250, model: "stetson", texture: "stetson", anchor: "head", stackHeight: 2.4 },
};
export function resolveWearables(metadata: SkinMetadata, preview: PreviewSettings) {
  let height = 0;
  return [...metadata.wearables]
    .sort((a, b) => a - b)
    .map((id) => {
      const item = wearables[id];
      const embedded =
        item.side !== undefined &&
        !["BATPONY", "CHANGELING", "CHANGEDLING"].includes(metadata.race);
      const position: Vec3 = item.side
        ? [0, item.side === "both" ? 0 : 4.8, item.side === "both" ? -3.2 : -4.8]
        : [0, -height, 0];
      if (item.stackHeight) height += item.stackHeight;
      return {
        ...item,
        embedded,
        position,
        bagDrop: item.side && preview.wings === "extended" ? 2.4 : 0,
      };
    });
}
