import { Plane } from "../../../primitives/index.js";
import type { XyzArray } from "../../../primitives/index.js";

type StraightTailBeginningProps = {
  position?: XyzArray;
};

export default function StraightTailBeginning({
  position,
}: StraightTailBeginningProps) {
  return (
    <group position={position} rotation={[Math.PI / 7, 0, 0]}>
      <Plane // Top
        layout={[32, 1, 2, 6]}
        position={[0, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <Plane // Bottom
        layout={[32, 1, 2, 6]}
        position={[0, -0.2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      <Plane // Right
        layout={[33, 3, 6, 2]}
        position={[-0.2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      <Plane // Left
        layout={[33, 3, 6, 2]}
        position={[0.2, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}
