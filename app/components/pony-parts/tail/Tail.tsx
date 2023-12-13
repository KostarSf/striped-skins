import type { XyzArray } from "~/components/model-components/types";
import DefaultTail from "./DefaultTail";
import { usePony } from "~/api/Pony";

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
