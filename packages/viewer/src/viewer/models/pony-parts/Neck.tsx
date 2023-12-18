import type { XyzArray } from "../primitives/index.js";
import { Plane } from "../primitives/index.js";

type NeckProps = {
  position?: XyzArray;
};

export default function Neck({ position }: NeckProps) {
  return (
    <group position={position} rotation={[Math.PI / 16, 0, 0]}>
      <Plane // Front
        layout={[0, 16, 4, 4]}
        position={[0, -0.2, 0.2]}
      />

      <Plane // Back
        layout={[0, 16, 4, 4]}
        position={[0, -0.2, -0.6]}
        rotation={[0, Math.PI, 0]}
      />

      <Plane // Right
        layout={[0, 16, 4, 4]}
        position={[-0.4, -0.2, -0.2]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      <Plane // Left
        layout={[0, 16, 4, 4]}
        position={[0.4, -0.2, -0.2]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}
