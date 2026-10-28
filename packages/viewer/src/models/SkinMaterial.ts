import {
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderChunk,
  type Texture,
} from "three";

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
  const material =
    shading === "studio"
      ? new MeshStandardMaterial({ ...options, roughness: 1, metalness: 0 })
      : new MeshBasicMaterial({ ...options, toneMapped: false });
  // An MSAA-covered sample can belong to a triangle whose pixel center lies
  // outside it. Center-interpolated UVs then leak into an adjacent atlas region.
  // Centroid interpolation keeps the texture lookup inside the covered primitive.
  material.onBeforeCompile = (shader) => {
    for (const stage of ["vertex", "fragment"] as const) {
      const chunk = `uv_pars_${stage}` as const;
      const source = ShaderChunk[chunk].replace(
        "varying vec2 vMapUv;",
        "centroid varying vec2 vMapUv;",
      );
      const key = `${stage}Shader` as const;
      shader[key] = shader[key].replace(`#include <${chunk}>`, source);
    }
  };
  material.customProgramCacheKey = () => "skin-centroid-uv-v1";
  return material;
}
