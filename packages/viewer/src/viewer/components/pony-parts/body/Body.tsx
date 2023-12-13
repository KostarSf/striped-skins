import { useSkinTextureContext } from "../../../context/SkinTextureContext";
import type { XyzArray } from "../../model-components/types";
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
