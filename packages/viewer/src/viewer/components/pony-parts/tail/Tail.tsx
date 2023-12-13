import { usePony } from "../../../context/index.js";
import type { XyzArray } from "../../model-components/index.js";
import DefaultTail from "./DefaultTail.js";

type TailProps = {
  position?: XyzArray;
};

export default function Tail({ position }: TailProps) {
  const { tailLength } = usePony();

  return (
    <>
      <DefaultTail position={position} length={tailLength.size} />
    </>
  );
}
