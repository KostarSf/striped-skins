import { usePony } from "../../context/PonyContext";
import type { XyzArray } from "../model-components/types";
import Neck from "../pony-parts/Neck";
import Body from "../pony-parts/body/Body";
import Head from "../pony-parts/head/Head";
import Legs from "../pony-parts/legs/Legs";
import Tail from "../pony-parts/tail/Tail";
import Wings from "../pony-parts/wings/Wings";

type RegularPonyProps = { position?: XyzArray };
export default function RegularPony({ position }: RegularPonyProps) {
  const { race } = usePony();

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
