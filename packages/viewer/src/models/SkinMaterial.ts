import { DoubleSide, MeshBasicMaterial, MeshStandardMaterial, type Texture } from "three";

export type ModelShading = "flat" | "studio";
export type SkinMaterial = MeshBasicMaterial | MeshStandardMaterial;

/** Keep texture/alpha handling identical; only the viewer responds to scene lighting. */
export function skinMaterial(texture: Texture, shading: ModelShading): SkinMaterial {
  const options = {
    map: texture,
    side: DoubleSide,
    alphaTest: 0.1,
    transparent: true,
    forceSinglePass: true,
  };
  return shading === "studio"
    ? new MeshStandardMaterial({ ...options, roughness: 1, metalness: 0 })
    : new MeshBasicMaterial({ ...options, toneMapped: false });
}
