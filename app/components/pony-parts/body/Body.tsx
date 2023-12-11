import { useSkinTextureContext } from "~/components/model-components/skinTextureContext";
import type { XyzArray } from "~/components/model-components/types";
import BaseBody from "./BaseBody";
import BodyClothes from "./BodyClothes";

type BodyProps = {
  position?: XyzArray;
};

export default function Body({ position }: BodyProps) {
  const { oldSkinFormat } = useSkinTextureContext();

  return (
    <group position={position}>
      <BaseBody />
      {!oldSkinFormat && <BodyClothes />}
    </group>
  );
}
