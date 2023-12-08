import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type BaseBodyMiddleProps = {
  position: XyzArray;
};
export function BaseBodyMiddle({ position }: BaseBodyMiddleProps) {
  return (
    <>
      <Plane // Back
        layout={[32, 20, 8, 12]}
        position={[position[0], position[1] + 0.8, position[2] - 2]}
        rotation={[-Math.PI / 2, 0, Math.PI]}
        scale={[8, 12]}
      />

      <Plane // Stomach
        layout={[56, 0, 8, 8]}
        position={[position[0], position[1] - 0.8, position[2] - 1.6]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 8]}
      />

      <Plane // Middle Right
        layout={[24, 0, 8, 8]}
        position={[position[0] - 0.8, position[1], position[2] - 1.6]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[8, 8]}
        flipY
      />

      <Plane // Middle Left
        layout={[24, 0, 8, 8]}
        position={[position[0] + 0.8, position[1], position[2] - 1.6]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[8, 8]}
      />
    </>
  );
}
