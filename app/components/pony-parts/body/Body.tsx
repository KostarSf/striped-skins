import type { Texture } from "three";
import type { XyzArray } from "~/components/model/types";
import { BaseBody } from "./BaseBody";

type BodyProps = {
  texture: Texture;
  position: XyzArray;
};
export function Body({ texture, position }: BodyProps) {
  return (
    <>
      <BaseBody texture={texture} position={position} />
    </>
  );
}
