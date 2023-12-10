import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type SnoutProps = {
  position: XyzArray;
  rounded?: boolean;
};
export function Snout({ position, rounded }: SnoutProps) {
  return (
    <group position={position}>
      <Plane // Front Bottom
        layout={[10, 14, 4, 2]}
        position={[0, -0.6, 1]}
        rotation={[0, 0, 0]}
        scale={[4, 2]}
      />

      <Plane // Front Top Middle
        layout={[11, 13, 2, 1]}
        position={[0, -0.3, 1]}
        rotation={[0, 0, 0]}
        scale={[2, 1]}
      />

      <Plane // Top Middle
        layout={[11, 13, 2, 1]}
        position={[0, -0.2, 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[2, 1]}
      />

      <Plane // Bottom
        layout={[10, 15, 4, 1]}
        position={[0, 0 - 0.8, 0.9]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[4, 1]}
      />

      <Plane // Right
        layout={[10, 14, 1, 2]}
        position={[-0.4, -0.6, 0.9]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[1, 2]}
      />

      <Plane // Left
        layout={[10, 14, 1, 2]}
        position={[0.4, -0.6, 0.9]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[1, 2]}
      />

      {rounded ? (
        <>
          <Plane // Right Inner Corner
            layout={[11, 13, 1, 1]}
            position={[-0.2, -0.3, 0.9]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[1, 1]}
          />

          <Plane // Right Top Corner
            layout={[10, 14, 1, 1]}
            position={[-0.3, -0.4, 0.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 1]}
          />

          <Plane // Left Inner Corner
            layout={[12, 13, 1, 1]}
            position={[0.2, -0.3, 0.9]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[1, 1]}
          />

          <Plane // Left Top Corner
            layout={[13, 14, 1, 1]}
            position={[0.3, -0.4, 0.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 1]}
          />
        </>
      ) : (
        <>
          <Plane // Top Right Corner
            layout={[10, 13, 1, 1]}
            position={[-0.3, -0.2, 0.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 1]}
          />

          <Plane // Right Top Corner
            layout={[10, 13, 1, 1]}
            position={[-0.4, -0.3, 0.9]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[1, 1]}
          />

          <Plane // Front Top Right
            layout={[10, 13, 1, 1]}
            position={[-0.3, -0.3, 1]}
            rotation={[0, 0, 0]}
            scale={[1, 1]}
          />

          <Plane // Top Left Corner
            layout={[10, 13, 1, 1]}
            position={[0.3, -0.2, 0.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 1]}
          />

          <Plane // Left Top Corner
            layout={[10, 13, 1, 1]}
            position={[0.4, -0.3, 0.9]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[1, 1]}
          />

          <Plane // Front Top Left
            layout={[10, 13, 1, 1]}
            position={[0.3, -0.3, 1]}
            rotation={[0, 0, 0]}
            scale={[1, 1]}
          />
        </>
      )}
    </group>
  );
}
