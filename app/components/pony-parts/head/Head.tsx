import type { XyzArray } from "~/components/model-components/types";
import { Ears } from "./Ears";
import { Skull } from "./Skull";
import { Muzzle } from "./Muzzle";
import { Mane } from "./Mane";
import Horn from "./Horn";

type HeadProps = {
  position: XyzArray;
  hideMane?: boolean;
};
export function Head({ position, hideMane }: HeadProps) {
  return (
    <>
      <Skull position={position} />
      <Ears position={position} />
      <Muzzle position={position} rounded />
      {!hideMane && <Mane position={position} />}
      <Horn position={position} />
    </>
  );
}
