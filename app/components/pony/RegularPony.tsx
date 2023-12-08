import { useTexture } from "@react-three/drei";
import { Neck } from "~/components/pony-parts/Neck";
import { Body } from "~/components/pony-parts/body/Body";
import { Head } from "~/components/pony-parts/head/Head";
import { Legs } from "~/components/pony-parts/legs/Legs";
import { Tail } from "~/components/pony-parts/tail/Tail";
import type { XyzArray } from "../model/types";

type RegularPonyProps = { skinUrl: string; position: XyzArray };
export function RegularPony({ skinUrl, position }: RegularPonyProps) {
  const texture = useTexture(skinUrl);

  return (
    <group position={position}>
      <Head texture={texture} position={[0, 0.8, 0]} />
      <Neck texture={texture} position={[0, 0, -0.1245]} />
      <Body texture={texture} position={[0, -1, 0]} />
      <Tail texture={texture} position={[0, -1.05, -3.5]} />
      <Legs texture={texture} position={[0, -3, -0.6]} />
    </group>
  );
}
