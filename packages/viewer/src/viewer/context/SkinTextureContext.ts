import { createContext, useContext } from "react";
import type { Texture } from "three";

export const SkinTextureContext = createContext<{
  texture: Texture;
  textureSize: number;
} | null>(null);

export const useSkinTextureContext = () => {
  const context = useContext(SkinTextureContext);

  if (!context) {
    throw new Error("Не задан SkinTextureContext");
  }

  const source = context.texture.image as HTMLImageElement;
  const oldSkinFormat = source.width !== source.height;

  return {
    texture: context.texture.clone(),
    textureSize: context.textureSize,
    oldSkinFormat,
  };
};
