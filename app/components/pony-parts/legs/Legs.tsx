import type { XyzArray } from "~/components/model-components/types";
import { BaseLegs } from "./BaseLegs";
import { useSkinTextureContext } from "~/components/model-components/skinTextureContext";
import { OldBaseLegs } from "./OldBaseLegs";
import { LegsClothes } from "./LegsClothes";
import { usePonyPreferences } from "~/api/PonyPreferences";

type LegsProps = {
  position: XyzArray
};
export function Legs({ position }: LegsProps) {
  const { oldSkinFormat } = useSkinTextureContext()
  const { slim } = usePonyPreferences()

  return (
    <>
      {oldSkinFormat ? (
        <OldBaseLegs position={position} slim={slim} />
      ) : (
        <>
          <BaseLegs position={position} slim={slim} />
          <LegsClothes position={position} slim={slim} />
        </>
      )}
    </>
  );
}
