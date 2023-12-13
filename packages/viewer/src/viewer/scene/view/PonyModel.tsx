import { useTexture } from "@react-three/drei";
import type { PonySkin } from "@striped-skins/api";
import type { XyzArray } from "../../components/model-components/index.js";
import RegularPony from "../../components/pony/RegularPony.js";
import { PonyContext, SkinTextureContext } from "../../context/index.js";

type PonyModelProps = {
  textureUri: string;
  ponyParameters: PonySkin;

  position?: XyzArray;
  rotation?: XyzArray;
};

export default function PonyModel({
  textureUri,
  ponyParameters,
  position,
  rotation,
}: PonyModelProps) {
  const texture = useTexture(textureUri);

  return (
    <group position={position} rotation={rotation}>
      <SkinTextureContext.Provider value={{ texture, textureSize: 64 }}>
        <PonyContext.Provider value={ponyParameters}>
          <RegularPony position={[0, 1, 1.5]} />
        </PonyContext.Provider>
      </SkinTextureContext.Provider>
    </group>
  );
}
