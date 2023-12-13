import { usePony } from "../../../context/PonyContext";
import type { XyzArray } from "../../model-components/types";
import DefaultTail from "./DefaultTail";

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
