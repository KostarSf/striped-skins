import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type BaseBodyBackProps = {
  position: XyzArray;
};
export function BaseBodyBack({ position }: BaseBodyBackProps) {
  return (
    <>
      <Plane // Butt Top
        layout={[36, 16, 8, 4]}
        position={[position[0], position[1] + 0.4, position[2] - 3.2]}
        rotation={[Math.PI, 0, 0]}
        scale={[8, 4]}
      />

      <Plane // Butt Bottom
        layout={[36, 16, 8, 4]}
        position={[position[0], position[1] - 0.4, position[2] - 3.2]}
        rotation={[Math.PI, 0, 0]}
        scale={[8, 4]}
      />

      <Plane // Stomach Bottom
        layout={[36, 16, 8, 4]}
        position={[position[0], position[1] - 0.8, position[2] - 2.8]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 4]}
      />

      <Plane // Qutie Right
        layout={[4, 0, 4, 8]}
        position={[position[0] - 0.8, position[1], position[2] - 2.8]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[4, 8]}
        flipY
      />

      <Plane // Qutie Left
        layout={[4, 0, 4, 8]}
        position={[position[0] + 0.8, position[1], position[2] - 2.8]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4, 8]}
      />
    </>
  );
}
