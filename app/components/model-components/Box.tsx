import type { XyArray, XyzArray } from "./types";
import { Plane } from "./Plane";
import { SCALE_MULTIPLIER } from "./constants";

type BoxProps = {
  parameters: {
    uvOrigin: XyArray;
    uvScale: XyzArray;
  };
  position: XyzArray;
  rotation: XyzArray;
  scale: XyzArray;
  innerSides?: boolean;
};

export function Box({ parameters, scale, position, innerSides }: BoxProps) {
  const {
    uvOrigin: [originX, originY],
    uvScale: [x, y, z],
  } = parameters;

  const [scaleX, scaleY, scaleZ] = scale;

  const [posX, posY, posZ] = position;

  return (
    <>
      <Plane // Right
        layout={[originX, originY + y, y, z]}
        position={[posX - Math.abs(scaleX * SCALE_MULTIPLIER) / 2, posY, posZ]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[scaleY, scaleZ]}
        doubleSide={innerSides}
      />

      <Plane // Front
        layout={[originX + y, originY + y, x, z]}
        position={[posX, posY, posZ + Math.abs(scaleY * SCALE_MULTIPLIER) / 2]}
        rotation={[0, 0, 0]}
        scale={[scaleX, scaleZ]}
        doubleSide={innerSides}
      />

      <Plane // Left
        layout={[originX + y + x, originY + y, y, z]}
        position={[posX + Math.abs(scaleX * SCALE_MULTIPLIER) / 2, posY, posZ]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[scaleY, scaleZ]}
        doubleSide={innerSides}
      />

      <Plane // Top
        layout={[originX + y, originY, x, y]}
        position={[posX, posY + Math.abs(scaleZ * SCALE_MULTIPLIER) / 2, posZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[scaleX, scaleY]}
        doubleSide={innerSides}
      />

      <Plane // Bottom
        layout={[originX + y + x, originY, x, y]}
        position={[posX, posY - Math.abs(scaleZ * SCALE_MULTIPLIER) / 2, posZ]}
        rotation={[Math.PI / 2, 0, Math.PI]}
        scale={[scaleX, scaleY]}
        doubleSide={innerSides}
        flipX
        flipY
      />

      <Plane // Back
        layout={[originX + x + y * 2, originY + y, x, z]}
        position={[posX, posY, posZ - Math.abs(scaleY * SCALE_MULTIPLIER) / 2]}
        rotation={[0, Math.PI, 0]}
        scale={[scaleX, scaleZ]}
        doubleSide={innerSides}
      />
    </>
  );
}
