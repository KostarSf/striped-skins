import BodyClothesFront from "./BodyClothesFront.js";
import BodyClothesMiddle from "./BodyClothesMiddle.js";
import BodyClothesBack from "./BodyClothesBack.js";

export default function BodyClothes() {
  return (
    <group scale={[1.07, 1.07, 1.03]} position={[0, 0, 0.04]}>
      <BodyClothesFront />
      <BodyClothesMiddle />
      <BodyClothesBack />
    </group>
  );
}
