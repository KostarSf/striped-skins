import { useTexture } from "@react-three/drei";
import SkinTextureContext from "~/components/model-components/skinTextureContext";
import type { XyzArray } from "~/components/model-components/types";
import { RegularPony } from "~/components/pony/RegularPony";

type PonyModelProps = {
  skin: string;
  position?: XyzArray;
  rotation?: XyzArray;
};

/*
  Здесь определяем расу по скину и задаем провайдер параметров скина ,
  которыми будут пользоваться внутренние компоненты скина
*/

export default function PonyModel({
  skin,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: PonyModelProps) {
  const texture = useTexture(skin);

  return (
    <group position={position} rotation={rotation}>
      <SkinTextureContext.Provider value={{ texture, textureSize: 64 }}>
        <RegularPony position={[0, 1, 1.5]} />
      </SkinTextureContext.Provider>
    </group>
  );
}
