import { usePony } from "../../../context/PonyContext";
import type { XyzArray } from "../../model-components/types";
import BatWings from "./BatWings";
import ChangelingWings from "./ChangelingWings";
import RegularWings from "./RegularWings";

type WingsProps = {
  position?: XyzArray;
};

export default function Wings({ position }: WingsProps) {
  const { race } = usePony();
  const regularWings = !race.batWings && !race.changelingWings;

  return (
    <group position={position}>
      {regularWings && <RegularWings />}
      {race.changelingWings && <ChangelingWings />}
      {race.batWings && <BatWings />}
    </group>
  );
}
