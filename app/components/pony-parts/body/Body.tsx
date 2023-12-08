import type { XyzArray } from "~/components/model-components/types";
import { BaseBody } from "./BaseBody";

type BodyProps = {
  position: XyzArray;
};
export function Body({ position }: BodyProps) {
  return (
    <>
      <BaseBody position={position} />
    </>
  );
}
