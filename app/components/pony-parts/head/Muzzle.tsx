import type { Texture } from "three";
import { Plane } from "~/components/model/Plane";
import { SCALE_MULTIPLIER } from "~/components/model/constants";
import type { XyzArray } from "~/components/model/types";

type MuzzleProps = {
  texture: Texture;
  position: XyzArray;
};
export function Muzzle({ texture, position }: MuzzleProps) {
  return (
    <>
      <Plane // Front
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [10, 13, 4, 3],
        }}
        position={[position[0], position[1] - 0.5, position[2] + 1]}
        rotation={[0, 0, 0]}
        scale={[4 * SCALE_MULTIPLIER, 3 * SCALE_MULTIPLIER]}
      />

      <Plane // Top
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [10, 13, 4, 1],
        }}
        position={[position[0], position[1] - 0.2, position[2] + 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[4 * SCALE_MULTIPLIER, 1 * SCALE_MULTIPLIER]}
      />

      <Plane // Bottom
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [10, 15, 4, 1],
        }}
        position={[position[0], position[1] - 0.8, position[2] + 0.9]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[4 * SCALE_MULTIPLIER, 1 * SCALE_MULTIPLIER]}
      />

      <Plane // Right
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [10, 13, 1, 3],
        }}
        position={[position[0] - 0.4, position[1] - 0.5, position[2] + 0.9]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[1 * SCALE_MULTIPLIER, 3 * SCALE_MULTIPLIER]}
      />

      <Plane // Left
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [10, 13, 1, 3],
        }}
        position={[position[0] + 0.4, position[1] - 0.5, position[2] + 0.9]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[1 * SCALE_MULTIPLIER, 3 * SCALE_MULTIPLIER]}
      />
    </>
  );
}
