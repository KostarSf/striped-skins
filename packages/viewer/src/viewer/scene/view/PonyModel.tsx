import type { PonySkin } from "@striped-skins/api";
import type { XyzArray } from "../../components/model-components/index.js";
import RegularPony from "../../components/pony/RegularPony.js";
import { PonyContext, SkinTextureContext } from "../../context/index.js";
import { CanvasTexture } from "three";

type PonyModelProps = {
  skin: PonySkin;

  position?: XyzArray;
  rotation?: XyzArray;
};

export default function PonyModel({
  skin,
  position,
  rotation,
}: PonyModelProps) {
  const texture = new CanvasTexture(skin.source.canvas!)

  return (
    <group position={position} rotation={rotation}>
      <SkinTextureContext.Provider value={{ texture, textureSize: 64 }}>
        <PonyContext.Provider value={skin}>
          <RegularPony position={[0, 1, 1.5]} />
        </PonyContext.Provider>
      </SkinTextureContext.Provider>
    </group>
  );
}
