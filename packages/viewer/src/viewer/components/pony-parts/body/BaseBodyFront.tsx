import { Plane } from "../../model-components/index.js";

export default function BaseBodyFront() {
  return (
    <>
      <Plane // Front
        layout={[20, 20, 8, 8]}
      />

      <Plane // Front Top
        layout={[20, 16, 8, 4]}
        position={[0, 0.8, -0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <Plane // Front Bottom
        layout={[28, 16, 8, 4]}
        position={[0, -0.8, -0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        flipY
      />

      <Plane // Front Right
        layout={[16, 20, 4, 8]}
        position={[-0.8, 0, -0.4]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      <Plane // Front Left
        layout={[28, 20, 4, 8]}
        position={[0.8, 0, -0.4]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </>
  );
}
