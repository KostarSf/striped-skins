import { Plane } from "../../model-components/Plane";

export default function BaseBodyMiddle() {
  return (
    <>
      <Plane // Back
        layout={[32, 20, 8, 12]}
        position={[0, 0.8, -2]}
        rotation={[-Math.PI / 2, 0, Math.PI]}
        flipX
      />

      <Plane // Stomach
        layout={[56, 0, 8, 8]}
        position={[0, -0.8, -1.6]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      <Plane // Middle Right
        layout={[24, 0, 8, 8]}
        position={[-0.8, 0, -1.6]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        flipY
      />

      <Plane // Middle Left
        layout={[24, 0, 8, 8]}
        position={[0.8, 0, -1.6]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </>
  );
}
