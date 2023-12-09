import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type BodyClothesBackProps = {
  position?: XyzArray;
};

export function BodyClothesBack({
  position = [0, 0, 0],
}: BodyClothesBackProps) {
  return (
    <group position={position}>
      <Plane // Butt Top
        layout={[36, 32, 8, 4]}
        position={[0, 0.4, -3.2]}
        rotation={[Math.PI, 0, 0]}
        scale={[8, 4]}
        doubleSide
      />

      <Plane // Butt Bottom
        layout={[36, 32, 8, 4]}
        position={[0, -0.4, -3.2]}
        rotation={[Math.PI, 0, 0]}
        scale={[8, 4]}
        doubleSide
      />

      <Plane // Stomach Bottom
        layout={[36, 32, 8, 4]}
        position={[0, -0.8, -2.8]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 4]}
        doubleSide
      />

      <Plane // Qutie Top Right
        layout={[0, 32, 4, 4]}
        position={[-0.8, 0.4, -2.8]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[4, 4]}
        flipY
        doubleSide
      />

      <Plane // Qutie Bottom Right
        layout={[0, 48, 4, 4]}
        position={[-0.8, -0.4, -2.8]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[4, 4]}
        flipY
        doubleSide
      />

      <Plane // Qutie Top Left
        layout={[0, 32, 4, 4]}
        position={[0.8, 0.4, -2.8]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4, 4]}
        doubleSide
      />

      <Plane // Qutie Bottom Left
        layout={[0, 48, 4, 4]}
        position={[0.8, -0.4, -2.8]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4, 4]}
        doubleSide
      />
    </group>
  );
}
