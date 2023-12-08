import type { Texture } from "three";
import type { XyzArray } from "~/components/model/types";
import { BaseBodyFront } from "./BaseBodyFront";
import { BaseBodyMiddle } from "./BaseBodyMiddle";
import { BaseBodyBack } from "./BaseBodyBack";

type BaseBodyProps = {
  texture: Texture;
  position: XyzArray;
};
export function BaseBody({ texture, position }: BaseBodyProps) {
  return (
    <>
      <BaseBodyFront texture={texture} position={position} />
      <BaseBodyMiddle texture={texture} position={position} />
      <BaseBodyBack texture={texture} position={position} />
    </>
  );
}
