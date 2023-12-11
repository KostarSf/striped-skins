import { usePonyPreferences } from "~/api/PonyPreferences";
import { useSkinTextureContext } from "~/components/model-components/skinTextureContext";
import type { XyzArray } from "~/components/model-components/types";
import BaseLegs from "./BaseLegs";
import LegsClothes from "./LegsClothes";

type LegsProps = {
  position?: XyzArray;
};

export default function Legs({ position }: LegsProps) {
  const { oldSkinFormat } = useSkinTextureContext();
  const { slim } = usePonyPreferences();

  return (
    <group position={position}>
      <BaseLegs slim={slim} oldFormat={oldSkinFormat} />
      {!oldSkinFormat && <LegsClothes slim={slim} />}
    </group>
  );
}
