import type { XyArray, XyzArray } from "./types";
import { Plane } from "./Plane";
import type { Texture } from "three";
import { SCALE_MULTIPLIER } from "./constants";

type BoxProps = {
  texture: Texture;
  parameters: {
    textureSize: number;
    uvOrigin: XyArray;
    uvScale: XyzArray;
  };
  position: XyzArray;
  rotation: XyzArray;
  scale: XyzArray;
};

export function Box({ texture, parameters, scale, position }: BoxProps) {
  const {
    textureSize,
    uvOrigin: [originX, originY],
    uvScale: [x, y, z],
  } = parameters;

  const [scaleX, scaleY, scaleZ] = scale.map(i => i * SCALE_MULTIPLIER)

  const [posX, posY, posZ] = position

  return (
    <>
      <Plane // Right
        texture={texture}
        parameters={{
          textureSize,
          layout: [originX, originY + y, y, z],
        }}
        position={[posX - Math.abs(scaleX) / 2, posY, posZ]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[scaleY, scaleZ]}
      />

      <Plane // Front
        texture={texture}
        parameters={{
          textureSize,
          layout: [originX + y, originY + y, x, z],
        }}
        position={[posX, posY, posZ + Math.abs(scaleY) / 2]}
        rotation={[0, 0, 0]}
        scale={[scaleX, scaleZ]}
      />

      <Plane // Left
        texture={texture}
        parameters={{
          textureSize,
          layout: [originX + y + x, originY + y, y, z],
        }}
        position={[posX + Math.abs(scaleX) / 2, posY, posZ]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[scaleY, scaleZ]}
      />

      <Plane // Top
        texture={texture}
        parameters={{
          textureSize,
          layout: [originX + y, originY, x, y],
        }}
        position={[posX, posY + Math.abs(scaleZ) / 2, posZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[scaleX, scaleY]}
      />

      <Plane // Bottom
        texture={texture}
        parameters={{
          textureSize,
          layout: [originX + y + x, originY, x, y],
        }}
        position={[posX, posY - Math.abs(scaleZ) / 2, posZ]}
        rotation={[Math.PI / 2, 0, Math.PI]}
        scale={[scaleX, scaleY]}
      />

      <Plane // Back
        texture={texture}
        parameters={{
          textureSize,
          layout: [originX + x + y * 2, originY + y, x, z],
        }}
        position={[posX, posY, posZ - Math.abs(scaleY) / 2]}
        rotation={[0, Math.PI, 0]}
        scale={[scaleX, scaleZ]}
      />
    </>
  );
}
