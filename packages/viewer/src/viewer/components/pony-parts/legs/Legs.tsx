import { usePony } from "../../../context/PonyContext";
import { useSkinTextureContext } from "../../../context/SkinTextureContext";
import type { XyzArray } from "../../model-components/types";
import BaseLegs from "./BaseLegs";
import LegsClothes from "./LegsClothes";

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
