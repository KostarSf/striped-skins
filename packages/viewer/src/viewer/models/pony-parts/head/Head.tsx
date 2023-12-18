import { usePonySkin } from "../../../context/index.js";
import type { XyzArray } from "../../primitives/index.js";
import Ears from "./Ears.js";
import Horn from "./Horn.js";
import Mane from "./Mane.js";
import Skull from "./Skull.js";
import Snout from "./Snout.js";

type HeadProps = {
  position?: XyzArray;
  hideMane?: boolean;
};

export default function Head({ position, hideMane }: HeadProps) {
  const { race, snout } = usePonySkin();

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
