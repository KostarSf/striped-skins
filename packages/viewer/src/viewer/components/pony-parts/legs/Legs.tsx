import { usePony, useSkinTextureContext } from "../../../context/index.js";
import type { XyzArray } from "../../model-components/index.js";
import BaseLegs from "./BaseLegs.js";
import LegsClothes from "./LegsClothes.js";

type LegsProps = {
  position?: XyzArray;
};

export default function Legs({ position }: LegsProps) {
  const { oldSkinFormat } = useSkinTextureContext();
  const { slim } = usePony();

  return (
    <group position={position}>
      <BaseLegs slim={slim} oldFormat={oldSkinFormat} />
      {!oldSkinFormat && <LegsClothes slim={slim} />}
    </group>
  );
}
