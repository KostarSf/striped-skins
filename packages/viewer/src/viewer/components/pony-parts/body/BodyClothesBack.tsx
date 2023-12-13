import { Plane } from "../../model-components/Plane";

export default function BodyClothesBack() {
  return (
    <>
      <Plane // Butt Right
        layout={[36, 32, 8, 4]}
        position={[-0.4, 0, -3.2]}
        rotation={[Math.PI, 0, -Math.PI / 2]}
        doubleSide
        flipY
      />

      <Plane // Butt Left
        layout={[36, 32, 8, 4]}
        position={[0.4, 0, -3.2]}
        rotation={[Math.PI, 0, -Math.PI / 2]}
        doubleSide
      />

      <Plane // Stomach Bottom
        layout={[36, 32, 8, 4]}
        position={[0, -0.8, -2.8]}
        rotation={[Math.PI / 2, 0, 0]}
        doubleSide
      />

      <Plane // Qutie Top Right
        layout={[0, 32, 4, 4]}
        position={[-0.8, 0.4, -2.8]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        flipY
        doubleSide
      />

      <Plane // Qutie Bottom Right
        layout={[0, 48, 4, 4]}
        position={[-0.8, -0.4, -2.8]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        flipY
        doubleSide
      />

      <Plane // Qutie Top Left
        layout={[0, 32, 4, 4]}
        position={[0.8, 0.4, -2.8]}
        rotation={[0, Math.PI / 2, 0]}
        doubleSide
      />

      <Plane // Qutie Bottom Left
        layout={[0, 48, 4, 4]}
        position={[0.8, -0.4, -2.8]}
        rotation={[0, Math.PI / 2, 0]}
        doubleSide
      />
    </>
  );
}
