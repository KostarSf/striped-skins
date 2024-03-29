import { usePonySkin } from "../../../context/index.js";
import type { XyzArray } from "../../primitives/index.js";
import BatWings from "./BatWings.js";
import ChangelingWings from "./ChangelingWings.js";
import RegularWings from "./RegularWings.js";

type WingsProps = {
  position?: XyzArray;
};

export default function Wings({ position }: WingsProps) {
  const { race } = usePonySkin();
  const regularWings = !race.batWings && !race.changelingWings;

  return (
    <group position={position}>
      {regularWings && <RegularWings />}
      {race.changelingWings && <ChangelingWings />}
      {race.batWings && <BatWings />}
    </group>
  );
}
