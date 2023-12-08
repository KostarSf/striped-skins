import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type ClosedWingProps = {
  position: XyzArray;
  side: "left" | "right";
  mirrored?: boolean;
};

export function ClosedWing({ position, mirrored, side }: ClosedWingProps) {
  return (
    <group position={position} scale={[1, mirrored ? -1 : 1, 1]}>
      <group rotation={[Math.PI / 2, Math.PI / 2, 0]}>
        <Feather
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          length={8}
          side={side}
        />
        <Feather
          position={[0.4, 0.2, 0]}
          rotation={[0, 0, 0]}
          length={6}
          side={side}
        />
        <Feather
          position={[-0.4, 0.2, 0]}
          rotation={[0, 0, 0]}
          length={6}
          side={side}
        />
      </group>
    </group>
  );
}

type FeatherProps = {
  position: XyzArray;
  rotation: XyzArray;
  length: number;
  side: "left" | "right";
};

function Feather({ position, rotation, length, side }: FeatherProps) {
  const uv = side === "left" ? 34 : 18;

  return (
    <group position={position} rotation={rotation}>
      <Plane // Front
        layout={[60, uv, 2, length]}
        position={[0, 0, 0.2]}
        rotation={[0, 0, 0]}
        scale={[2, length]}
      />

      <Plane // Back
        layout={[56, uv, 2, length]}
        position={[0, 0, -0.2]}
        rotation={[0, Math.PI, 0]}
        scale={[2, length]}
      />

      <Plane // Right
        layout={[58, uv, 2, length]}
        position={[-0.2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[2, length]}
      />

      <Plane // Left
        layout={[62, uv, 2, length]}
        position={[0.2, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[2, length]}
      />

      <Plane // Top
        layout={[58, uv - 2, 2, 2]}
        position={[0, length / 10, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[2, 2]}
      />

      <Plane // Bottom
        layout={[60, uv - 2, 2, 2]}
        position={[0, -length / 10, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[2, 2]}
      />
    </group>
  );
}
