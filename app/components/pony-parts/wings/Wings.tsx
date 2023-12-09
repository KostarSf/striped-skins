import type { XyzArray } from "~/components/model-components/types";
import { ClosedWing } from "./ClosedWing";
import { useSkinTextureContext } from "~/components/model-components/skinTextureContext";

type WingsProps = {
  position: XyzArray;
};

export function Wings({ position }: WingsProps) {
  const { oldSkinFormat } = useSkinTextureContext();

  return (
    <group position={position}>
      <ClosedWing position={[-1, 0, 0]} side='right' />

      <group rotation={[0, 0, oldSkinFormat ? Math.PI : 0]}>
        <ClosedWing
          position={[oldSkinFormat ? -1 : 1, 0, 0]}
          side={oldSkinFormat ? "right" : "left"}
          mirrored={oldSkinFormat}
        />
      </group>
    </group>
  );
}
