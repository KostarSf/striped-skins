import { Neck } from "~/components/pony-parts/Neck";
import { Body } from "~/components/pony-parts/body/Body";
import { Head } from "~/components/pony-parts/head/Head";
import { Legs } from "~/components/pony-parts/legs/Legs";
import { Tail } from "~/components/pony-parts/tail/Tail";
import type { XyzArray } from "../model-components/types";
import { Wings } from "../pony-parts/wings/Wings";

type RegularPonyProps = { position: XyzArray };
export function RegularPony({ position }: RegularPonyProps) {


  return (
    <group position={position}>
      <Head position={[0, 0.8, 0]} />
      <Neck position={[0, 0, -0.1245]} />
      <Body position={[0, -1, 0]} />
      <Tail position={[0, -1.05, -3.5]} />
      <Legs position={[0, -3, -0.6]} />
      <Wings position={[0, -1, -1.6]} />
    </group>
  );
}
