import type { XyzArray } from "~/components/model-components/types";
import { Ears } from "./Ears";
import { Skull } from "./Skull";
import { Snout } from "./Snout";
import { Mane } from "./Mane";
import Horn from "./Horn";
import { usePonyPreferences } from "~/api/PonyPreferences";

type HeadProps = {
  position: XyzArray;
  hideMane?: boolean;
};
export function Head({ position, hideMane }: HeadProps) {
  const { race, snout } = usePonyPreferences()

  return (
    <>
      <Skull position={position} />
      <Ears position={position} />
      {!snout.flat && <Snout position={position} rounded={!snout.squared} />}
      {!hideMane && <Mane position={position} />}
      {race.horn && <Horn position={position} />}
    </>
  );
}
