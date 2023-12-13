import { Plane } from "../../model-components/index.js";

export default function BodyClothesFront() {
  return (
    <>
      <Plane // Front
        layout={[20, 36, 8, 8]}
        doubleSide
      />

      <Plane // Front Top
        layout={[20, 32, 8, 4]}
        position={[0, 0.8, -0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        doubleSide
      />

      <Plane // Front Bottom
        layout={[28, 32, 8, 4]}
        position={[0, -0.8, -0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        doubleSide
        flipY
      />

      <Plane // Front Right
        layout={[16, 36, 4, 8]}
        position={[-0.8, 0, -0.4]}
        rotation={[0, -Math.PI / 2, 0]}
        doubleSide
      />

      <Plane // Front Left
        layout={[28, 36, 4, 8]}
        position={[0.8, 0, -0.4]}
        rotation={[0, Math.PI / 2, 0]}
        doubleSide
      />
    </>
  );
}
