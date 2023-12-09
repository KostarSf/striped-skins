import type { XyzArray } from "~/components/model-components/types";
import { BodyClothesFront } from "./BodyClothesFront";
import { BodyClothesMiddle } from "./BodyClothesMiddle";
import { BodyClothesBack } from "./BodyClothesBack";

type BodyClothesProps = {
  position: XyzArray;
};
export function BodyClothes({ position }: BodyClothesProps) {
  return (
    <group position={position}>
      <group scale={[1.07, 1.07, 1.03]} position={[0, 0, 0.04]}>
        <BodyClothesFront />
        <BodyClothesMiddle />
        <BodyClothesBack />
      </group>
    </group>
  );
}
