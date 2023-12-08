import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type MuzzleProps = {
  position: XyzArray;
};
export function Muzzle({ position }: MuzzleProps) {
  return (
    <>
      <Plane // Front
        layout={[10, 13, 4, 3]}
        position={[position[0], position[1] - 0.5, position[2] + 1]}
        rotation={[0, 0, 0]}
        scale={[4, 3]}
      />

      <Plane // Top
        layout={[10, 13, 4, 1]}
        position={[position[0], position[1] - 0.2, position[2] + 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[4, 1]}
      />

      <Plane // Bottom
        layout={[10, 15, 4, 1]}
        position={[position[0], position[1] - 0.8, position[2] + 0.9]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[4, 1]}
      />

      <Plane // Right
        layout={[10, 13, 1, 3]}
        position={[position[0] - 0.4, position[1] - 0.5, position[2] + 0.9]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[1, 3]}
      />

      <Plane // Left
        layout={[10, 13, 1, 3]}
        position={[position[0] + 0.4, position[1] - 0.5, position[2] + 0.9]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[1, 3]}
      />
    </>
  );
}
