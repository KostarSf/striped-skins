import { Plane } from "~/components/model-components/Plane";

export default function BodyClothesMiddle() {
  return (
    <>
      <Plane // Back
        layout={[32, 36, 8, 12]}
        position={[0, 0.8, -2]}
        rotation={[-Math.PI / 2, 0, Math.PI]}
        doubleSide
        flipX
      />

      <Plane // Stomach Top
        layout={[28, 48, 8, 4]}
        position={[0, -0.8, -1.2]}
        rotation={[Math.PI / 2, 0, 0]}
        doubleSide
      />

      <Plane // Stomach Bottom
        layout={[44, 48, 8, 4]}
        position={[0, -0.8, -2]}
        rotation={[Math.PI / 2, 0, 0]}
        doubleSide
      />

      <Plane // Middle Top Right
        layout={[12, 32, 8, 4]}
        position={[-0.8, 0.4, -1.6]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        doubleSide
        flipY
      />

      <Plane // Middle Bottom Right
        layout={[12, 48, 8, 4]}
        position={[-0.8, -0.4, -1.6]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        doubleSide
        flipY
      />

      <Plane // Middle Top Left
        layout={[12, 32, 8, 4]}
        position={[0.8, 0.4, -1.6]}
        rotation={[0, Math.PI / 2, 0]}
        doubleSide
      />

      <Plane // Middle Top Right
        layout={[12, 48, 8, 4]}
        position={[0.8, -0.4, -1.6]}
        rotation={[0, Math.PI / 2, 0]}
        doubleSide
      />
    </>
  );
}
