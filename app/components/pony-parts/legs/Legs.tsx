import type { XyzArray } from "~/components/model-components/types";
import { BaseLegs } from "./BaseLegs";

type LegsProps = {
  position: XyzArray
};
export function Legs({ position }: LegsProps) {
  return (
    <>
      <BaseLegs position={position} />
    </>
  );
}
