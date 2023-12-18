import { createContext, useContext } from "react";
import type { Texture } from "three";

export const SkinTextureContext = createContext<{
  texture: Texture;
  textureSize: number;
} | null>(null);

export const useSkinTexture = () => {
  const context = useContext(SkinTextureContext);

  if (!context) {
    throw new Error("Не задан SkinTextureContext");
  }

  const source = context.texture.image as HTMLImageElement | null;
  const oldSkinFormat = source?.width !== source?.height;

  return {
    texture: context.texture,
    textureSize: context.textureSize,
    oldSkinFormat,
  };
};
