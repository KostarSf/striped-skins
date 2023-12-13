import { useTexture } from "@react-three/drei";
import { PonySkin } from "@striped-skins/api";
import { useEffect } from "react";
import { PonyContext } from "~/api/Pony";
import SkinTextureContext from "~/components/model-components/skinTextureContext";
import type { XyzArray } from "~/components/model-components/types";
import RegularPony from "~/components/pony/RegularPony";

type PonyModelProps = {
  skinUrl: string;
  position?: XyzArray;
  rotation?: XyzArray;
  skin: PonySkin;
  setSkin: (pony: PonySkin) => void;
};

export default function PonyModel({
  skinUrl,
  position,
  rotation,
  skin,
  setSkin,
}: PonyModelProps) {
  const texture = useTexture(skinUrl);

  useEffect(() => {
    const preferences = PonySkin.fromImage(texture.image);
    setSkin(preferences);
  }, [texture]);

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
