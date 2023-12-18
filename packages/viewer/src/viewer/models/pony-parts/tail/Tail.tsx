import { usePonySkin } from "../../../context/index.js";
import type { XyzArray } from "../../primitives/index.js";
import StraightTail from "./straight/StraightTail.js";

type TailProps = {
  position?: XyzArray;
};

export default function Tail({ position }: TailProps) {
  const { tailLength } = usePonySkin();

  return (
    <>
      <StraightTail position={position} length={tailLength.size} />
    </>
  );
}
