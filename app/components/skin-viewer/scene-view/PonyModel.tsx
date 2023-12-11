import { useTexture } from "@react-three/drei";
import { useEffect } from "react";
import { PonyPreferences, PonyPreferencesContext } from "~/api/PonyPreferences";
import SkinTextureContext from "~/components/model-components/skinTextureContext";
import type { XyzArray } from "~/components/model-components/types";
import RegularPony from "~/components/pony/RegularPony";

type PonyModelProps = {
  skin: string;
  position?: XyzArray;
  rotation?: XyzArray;
  preferences: PonyPreferences;
  setPreferences: (pony: PonyPreferences) => void;
};

export default function PonyModel({
  skin,
  position,
  rotation,
  preferences,
  setPreferences,
}: PonyModelProps) {
  const texture = useTexture(skin);

  useEffect(() => {
    const preferences = PonyPreferences.fromSkin(texture.image);
    setPreferences(preferences);
  }, [texture]);

  return (
    <group position={position} rotation={rotation}>
      <SkinTextureContext.Provider value={{ texture, textureSize: 64 }}>
        <PonyPreferencesContext.Provider value={preferences}>
          <RegularPony position={[0, 1, 1.5]} />
        </PonyPreferencesContext.Provider>
      </SkinTextureContext.Provider>
    </group>
  );
}
