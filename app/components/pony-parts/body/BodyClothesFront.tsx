import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type BodyClothesFrontProps = {
  position?: XyzArray;
};

export function BodyClothesFront({
  position = [0, 0, 0],
}: BodyClothesFrontProps) {
  return (
    <group position={position}>
      <Plane // Front
        layout={[20, 36, 8, 8]}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[8, 8]}
        doubleSide
      />

      <Plane // Front Top
        layout={[20, 32, 8, 4]}
        position={[0, 0.8, -0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[8, 4]}
        doubleSide
      />

      <Plane // Front Bottom
        layout={[28, 32, 8, 4]}
        position={[0, -0.8, -0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 4]}
        doubleSide
      />

      <Plane // Front Right
        layout={[16, 36, 4, 8]}
        position={[-0.8, 0, -0.4]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[4, 8]}
        doubleSide
      />

      <Plane // Front Left
        layout={[28, 36, 4, 8]}
        position={[0.8, 0, -0.4]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4, 8]}
        doubleSide
      />
    </group>
  );
}
