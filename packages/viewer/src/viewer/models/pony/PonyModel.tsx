import type { PonySkin } from "@striped-skins/api";
import PonyImplementation from "./PonyImplementation.js";
import { PonySkinContext, SkinTextureContext } from "../../context/index.js";
import type { Group, Object3DEventMap } from "three";
import { CanvasTexture } from "three";
import { forwardRef } from "react";
import type { GroupProps } from "@react-three/fiber";

type PonyModelProps = {
  skin: PonySkin;
} & GroupProps;

export const PonyModel = forwardRef<
  Group<Object3DEventMap> | null,
  PonyModelProps
>(function PonyModel({ skin, ...groupProps }, forwardedRef) {
  const texture = new CanvasTexture(skin.source.canvas!);

  return (
    <group ref={forwardedRef} {...groupProps}>
      <SkinTextureContext.Provider value={{ texture, textureSize: 64 }}>
        <PonySkinContext.Provider value={skin}>
          <PonyImplementation position={[0, 1, 1.5]} />
        </PonySkinContext.Provider>
      </SkinTextureContext.Provider>
    </group>
  );
});
