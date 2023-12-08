import type { Texture } from "three";
import type { XyzArray } from "~/components/model/types";
import { BaseLegs } from "./BaseLegs";

type LegsProps = {
  texture: Texture;
  position: XyzArray
};
export function Legs({ texture, position }: LegsProps) {
  return (
    <>
      <BaseLegs texture={texture} position={position} />
    </>
  );
}
