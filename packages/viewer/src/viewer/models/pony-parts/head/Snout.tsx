import { Plane } from "../../primitives/index.js";
import type { XyzArray } from "../../primitives/index.js";

type SnoutProps = {
  position?: XyzArray;
  squared?: boolean;
};

export default function Snout({ position, squared }: SnoutProps) {
  return (
    <group position={position}>
      <SnoutBase />
      {squared ? <SquaredSnoutCorners /> : <RoundedSnoutCorners />}
    </group>
  );
}

function SnoutBase() {
  return (
    <>
      <Plane // Front Bottom
        layout={[10, 14, 4, 2]}
        position={[0, -0.6, 1]}
      />

      <Plane // Front Top Middle
        layout={[11, 13, 2, 1]}
        position={[0, -0.3, 1]}
      />

      <Plane // Top Middle
        layout={[11, 13, 2, 1]}
        position={[0, -0.2, 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <Plane // Bottom
        layout={[10, 15, 4, 1]}
        position={[0, 0 - 0.8, 0.9]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      <Plane // Right
        layout={[10, 14, 1, 2]}
        position={[-0.4, -0.6, 0.9]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      <Plane // Left
        layout={[10, 14, 1, 2]}
        position={[0.4, -0.6, 0.9]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </>
  );
}

function RoundedSnoutCorners() {
  return (
    <>
      <Plane // Right Inner Corner
        layout={[11, 13, 1, 1]}
        position={[-0.2, -0.3, 0.9]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      <Plane // Right Top Corner
        layout={[10, 14, 1, 1]}
        position={[-0.3, -0.4, 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <Plane // Left Inner Corner
        layout={[12, 13, 1, 1]}
        position={[0.2, -0.3, 0.9]}
        rotation={[0, Math.PI / 2, 0]}
      />

      <Plane // Left Top Corner
        layout={[13, 14, 1, 1]}
        position={[0.3, -0.4, 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </>
  );
}

function SquaredSnoutCorners() {
  return (
    <>
      <Plane // Top Right Corner
        layout={[10, 13, 1, 1]}
        position={[-0.3, -0.2, 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <Plane // Right Top Corner
        layout={[10, 13, 1, 1]}
        position={[-0.4, -0.3, 0.9]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      <Plane // Front Top Right
        layout={[10, 13, 1, 1]}
        position={[-0.3, -0.3, 1]}
        rotation={[0, 0, 0]}
      />

      <Plane // Top Left Corner
        layout={[10, 13, 1, 1]}
        position={[0.3, -0.2, 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <Plane // Left Top Corner
        layout={[10, 13, 1, 1]}
        position={[0.4, -0.3, 0.9]}
        rotation={[0, Math.PI / 2, 0]}
      />

      <Plane // Front Top Left
        layout={[10, 13, 1, 1]}
        position={[0.3, -0.3, 1]}
      />
    </>
  );
}
