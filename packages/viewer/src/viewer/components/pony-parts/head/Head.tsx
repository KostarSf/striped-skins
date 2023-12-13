import { usePony } from "../../../context/PonyContext";
import type { XyzArray } from "../../model-components/types";
import Ears from "./Ears";
import Horn from "./Horn";
import Mane from "./Mane";
import Skull from "./Skull";
import Snout from "./Snout";

type HeadProps = {
  position?: XyzArray;
  hideMane?: boolean;
};

export default function Head({ position, hideMane }: HeadProps) {
  const { race, snout } = usePony();

  return (
    <>
      <Skull position={position} />
      <Ears position={position} />
      {!snout.flat && <Snout position={position} squared={snout.squared} />}
      {!hideMane && <Mane position={position} />}
      {race.horn && <Horn position={position} />}
    </>
  );
}
