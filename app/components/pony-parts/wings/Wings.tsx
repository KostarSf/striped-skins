import { usePony } from "~/api/Pony";
import type { XyzArray } from "~/components/model-components/types";
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
