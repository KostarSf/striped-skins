import BodyClothesFront from "./BodyClothesFront";
import BodyClothesMiddle from "./BodyClothesMiddle";
import BodyClothesBack from "./BodyClothesBack";

export default function BodyClothes() {
  return (
    <group scale={[1.07, 1.07, 1.03]} position={[0, 0, 0.04]}>
      <BodyClothesFront />
      <BodyClothesMiddle />
      <BodyClothesBack />
    </group>
  );
}
