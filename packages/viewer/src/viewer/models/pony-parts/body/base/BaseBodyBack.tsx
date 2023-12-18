import { Plane } from "../../../primitives/index.js";

export default function BaseBodyBack() {
  return (
    <>
      <Plane // Butt Right
        layout={[36, 16, 8, 4]}
        position={[-0.4, 0, -3.2]}
        rotation={[Math.PI, 0, Math.PI / 2]}
        scale={[8, 4]}
        flipX
      />

      <Plane // Butt Left
        layout={[36, 16, 8, 4]}
        position={[0.4, 0, -3.2]}
        rotation={[Math.PI, 0, -Math.PI / 2]}
        scale={[8, 4]}
      />

      <Plane // Stomach Bottom
        layout={[36, 16, 8, 4]}
        position={[0, -0.8, -2.8]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 4]}
      />

      <Plane // Qutie Right
        layout={[4, 0, 4, 8]}
        position={[-0.8, 0, -2.8]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[4, 8]}
        flipY
      />

      <Plane // Qutie Left
        layout={[4, 0, 4, 8]}
        position={[0.8, 0, -2.8]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4, 8]}
      />
    </>
  );
}
