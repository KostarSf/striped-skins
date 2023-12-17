import { useSkinTextureContext } from "../../../context/index.js";
import type { XyzArray } from "../../model-components/index.js";
import BaseBody from "./BaseBody.js";
import BodyClothes from "./BodyClothes.js";

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
