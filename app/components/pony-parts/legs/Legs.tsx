import type { XyzArray } from "~/components/model-components/types";
import { BaseLegs } from "./BaseLegs";
import { useSkinTextureContext } from "~/components/model-components/SkinTextureContext";
import { OldBaseLegs } from "./OldBaseLegs";
import { LegsClothes } from "./LegsClothes";

type LegsProps = {
  position: XyzArray
};
export function Legs({ position }: LegsProps) {
  const { oldSkinFormat } = useSkinTextureContext()

  return (
    <>
      {oldSkinFormat ? (
        <OldBaseLegs position={position} />
      ) : (
        <>
          <BaseLegs position={position} />
          <LegsClothes position={position} />
        </>
      )}
    </>
  );
}
