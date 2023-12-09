import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type BodyClothesMiddleProps = {
  position?: XyzArray;
};

export function BodyClothesMiddle({ position = [0, 0, 0] }: BodyClothesMiddleProps) {
  return (
    <group position={position}>
      <Plane // Back
        layout={[32, 36, 8, 12]}
        position={[0, 0.8, -2]}
        rotation={[-Math.PI / 2, 0, Math.PI]}
        scale={[8, 12]}
        doubleSide
      />

      <Plane // Stomach Top
        layout={[28, 48, 8, 4]}
        position={[0, -0.8, -1.2]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 4]}
        doubleSide
      />

      <Plane // Stomach Bottom
        layout={[44, 48, 8, 4]}
        position={[0, -0.8, -2]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 4]}
        doubleSide
      />

      <Plane // Middle Top Right
        layout={[12, 32, 8, 4]}
        position={[-0.8, 0.4, -1.6]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[8, 4]}
        doubleSide
        flipY
      />

      <Plane // Middle Bottom Right
        layout={[12, 48, 8, 4]}
        position={[-0.8, -0.4, -1.6]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[8, 4]}
        doubleSide
        flipY
      />

      <Plane // Middle Top Left
        layout={[12, 32, 8, 4]}
        position={[0.8, 0.4, -1.6]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[8, 4]}
        doubleSide
      />

      <Plane // Middle Top Right
        layout={[12, 48, 8, 4]}
        position={[0.8, -0.4, -1.6]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[8, 4]}
        doubleSide
      />
    </group>
  );
}
