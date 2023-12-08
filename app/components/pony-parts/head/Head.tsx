import type { Texture } from "three";
import type { XyzArray } from "~/components/model/types";
import { Ears } from "./Ears";
import { Skull } from "./Skull";
import { Muzzle } from "./Muzzle";
import { Mane } from "./Mane";

type HeadProps = {
  texture: Texture;
  position: XyzArray;
  hideMane?: boolean;
};
export function Head({ texture, position, hideMane }: HeadProps) {
  return (
    <>
      <Skull texture={texture} position={position} />
      <Ears texture={texture} position={position} />
      <Muzzle texture={texture} position={position} />
      {!hideMane && <Mane texture={texture} position={position} />}
    </>
  );
}
