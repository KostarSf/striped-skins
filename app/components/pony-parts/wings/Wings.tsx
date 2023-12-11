import { usePonyPreferences } from "~/api/PonyPreferences";
import type { XyzArray } from "~/components/model-components/types";
import RegularWings from "./RegularWings";
import ChangelingWings from "./ChangelingWings";

type WingsProps = {
  position: XyzArray;
};

export function Wings({ position }: WingsProps) {
  const { race } = usePonyPreferences();
  const regularWings = !race.batWings && !race.changelingWings;

  return (
    <group position={position}>
      {regularWings && <RegularWings />}
      {race.changelingWings && <ChangelingWings />}
      {race.batWings && <RegularWings />}
    </group>
  );
}
