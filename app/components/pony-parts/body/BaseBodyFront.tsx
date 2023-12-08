import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type BaseBodyFrontProps = {
  position: XyzArray;
};
export function BaseBodyFront({ position }: BaseBodyFrontProps) {
  return (
    <>
      <Plane // Front
        layout={[20, 20, 8, 8]}
        position={[position[0], position[1], position[2]]}
        rotation={[0, 0, 0]}
        scale={[8, 8]}
      />

      <Plane // Front Top
        layout={[20, 16, 8, 4]}
        position={[position[0], position[1] + 0.8, position[2] - 0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[8, 4]}
      />

      <Plane // Front Bottom
        layout={[28, 16, 8, 4]}
        position={[position[0], position[1] - 0.8, position[2] - 0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 4]}
      />

      <Plane // Front Right
        layout={[16, 20, 4, 8]}
        position={[position[0] - 0.8, position[1], position[2] - 0.4]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[4, 8]}
      />

      <Plane // Front Left
        layout={[28, 20, 4, 8]}
        position={[position[0] + 0.8, position[1], position[2] - 0.4]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4, 8]}
      />
    </>
  );
}
