import { useSkinTexture } from "../../../context/index.js";
import type { XyzArray } from "../../primitives/index.js";
import BaseBody from "./base/BaseBody.js";
import BodyClothes from "./clothes/BodyClothes.js";

type BodyProps = {
  position?: XyzArray;
};

export default function Body({ position }: BodyProps) {
  const { oldSkinFormat } = useSkinTexture();

  return (
    <group position={position}>
      <BaseBody />
      {!oldSkinFormat && <BodyClothes />}
    </group>
  );
}
