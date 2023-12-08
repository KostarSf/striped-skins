import type { XyzArray } from "~/components/model-components/types";
import { BaseBodyFront } from "./BaseBodyFront";
import { BaseBodyMiddle } from "./BaseBodyMiddle";
import { BaseBodyBack } from "./BaseBodyBack";

type BaseBodyProps = {
  position: XyzArray;
};
export function BaseBody({ position }: BaseBodyProps) {
  return (
    <>
      <BaseBodyFront position={position} />
      <BaseBodyMiddle position={position} />
      <BaseBodyBack position={position} />
    </>
  );
}
