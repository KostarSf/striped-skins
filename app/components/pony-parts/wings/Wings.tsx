import type { XyzArray } from "~/components/model-components/types";
import { ClosedWing } from "./ClosedWing";
import { useSkinTextureContext } from "~/components/model-components/SkinTextureContext";

type WingsProps = {
  position: XyzArray;
};

export function Wings({ position }: WingsProps) {
  const { oldSkinFormat } = useSkinTextureContext();

  return (
    <group position={position}>
      <ClosedWing position={[-1, 0, 0]} side='right' />
      <ClosedWing
        position={[1, 0, 0]}
        side={oldSkinFormat ? "right" : "left"}
        mirrored={oldSkinFormat}
      />
    </group>
  );
}