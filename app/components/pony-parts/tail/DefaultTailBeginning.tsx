import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type DefaultTailBeginningProps = {
  position: XyzArray;
};
export function DefaultTailBeginning({
  position,
}: DefaultTailBeginningProps) {
  return (
    <group position={position} rotation={[Math.PI / 7, 0, 0]}>
      <Plane // Top
        layout={[32, 1, 2, 6]}
        position={[0, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[2, 6]}
      />

      <Plane // Bottom
        layout={[32, 1, 2, 6]}
        position={[0, -0.2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[2, 6]}
      />

      <Plane // Right
        layout={[33, 3, 6, 2]}
        position={[-0.2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[6, 2]}
      />

      <Plane // Left
        layout={[33, 3, 6, 2]}
        position={[0.2, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[6, 2]}
      />
    </group>
  );
}
