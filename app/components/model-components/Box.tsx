import type { XyArray, XyzArray } from "./types";
import { Plane } from "./Plane";
import { SCALE_MULTIPLIER } from "./constants";

type BoxProps = {
  parameters: {
    uvOrigin: XyArray;
    uvScale: XyzArray;
  };

  position?: XyzArray;
  rotation?: XyzArray;
  scale?: XyzArray;

  innerSides?: boolean;

  flipX?: boolean;
  flipY?: boolean;
  flipZ?: boolean;
};

export function Box({
  parameters,

  scale = parameters.uvScale,
  position,
  rotation,

  innerSides,

  flipX,
  flipY,
  flipZ,
}: BoxProps) {
  const {
    uvOrigin: [originX, originY],
    uvScale: [x, y, z],
  } = parameters;

  const initialScale: XyArray = [1 / SCALE_MULTIPLIER, 1 / SCALE_MULTIPLIER];

  return (
    <group
      position={position}
      rotation={rotation}
      scale={[
        scale[0] * SCALE_MULTIPLIER * (flipX ? -1 : 1),
        scale[2] * SCALE_MULTIPLIER * (flipZ ? -1 : 1),
        scale[1] * SCALE_MULTIPLIER * (flipY ? -1 : 1),
      ]}
    >
      <Plane // Right
        layout={[originX, originY + y, y, z]}
        position={[-0.5, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={initialScale}
        doubleSide={innerSides}
      />

      <Plane // Front
        layout={[originX + y, originY + y, x, z]}
        position={[0, 0, 0.5]}
        rotation={[0, 0, 0]}
        scale={initialScale}
        doubleSide={innerSides}
      />

      <Plane // Left
        layout={[originX + y + x, originY + y, y, z]}
        position={[0.5, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={initialScale}
        doubleSide={innerSides}
      />

      <Plane // Top
        layout={[originX + y, originY, x, y]}
        position={[0, 0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={initialScale}
        doubleSide={innerSides}
      />

      <Plane // Bottom
        layout={[originX + y + x, originY, x, y]}
        position={[0, -0.5, 0]}
        rotation={[Math.PI / 2, 0, Math.PI]}
        scale={initialScale}
        doubleSide={innerSides}
        flipX
      />

      <Plane // Back
        layout={[originX + x + y * 2, originY + y, x, z]}
        position={[0, 0, -0.5]}
        rotation={[0, Math.PI, 0]}
        scale={initialScale}
        doubleSide={innerSides}
      />
    </group>
  );
}
