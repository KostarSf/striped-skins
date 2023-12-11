import { usePonyPreferences } from "~/api/PonyPreferences";
import Neck from "~/components/pony-parts/Neck";
import Body from "~/components/pony-parts/body/Body";
import Head from "~/components/pony-parts/head/Head";
import Legs from "~/components/pony-parts/legs/Legs";
import Tail from "~/components/pony-parts/tail/Tail";
import Wings from "~/components/pony-parts/wings/Wings";
import type { XyzArray } from "../model-components/types";

type RegularPonyProps = { position?: XyzArray };
export default function RegularPony({ position }: RegularPonyProps) {
  const { race } = usePonyPreferences();

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
