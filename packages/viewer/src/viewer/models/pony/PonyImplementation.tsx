import { usePonySkin } from "../../context/index.js";
import { Body, Head, Legs, Neck, Tail, Wings } from "../pony-parts/index.js";
import type { XyzArray } from "../primitives/index.js";

type PonyImplementation = { position?: XyzArray };
export default function PonyImplementation({ position }: PonyImplementation) {
  const { race } = usePonySkin();

  return (
    <group position={position}>
      <Head position={[0, 0.8, 0]} />
      <Neck position={[0, 0, -0.1245]} />
      <Body position={[0, -1, 0]} />
      <Tail position={[0, -1.05, -3.5]} />
      <Legs position={[0, -3, -0.6]} />
      {race.wings && <Wings position={[0, -1, -1.6]} />}
    </group>
  );
}
