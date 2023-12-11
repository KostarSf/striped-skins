import type { XyzArray } from "~/components/model-components/types";
import DefaultTail from "./DefaultTail";
import { usePonyPreferences } from "~/api/PonyPreferences";

type TailProps = {
  position?: XyzArray;
};

export default function Tail({ position }: TailProps) {
  const { tailLength } = usePonyPreferences();

  return (
    <>
      <DefaultTail position={position} length={tailLength.size} />
    </>
  );
}
