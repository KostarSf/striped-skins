import type { Texture } from "three";
import { Plane } from "~/components/model/Plane";
import { SCALE_MULTIPLIER } from "~/components/model/constants";
import type { XyzArray } from "~/components/model/types";

type BaseBodyMiddleProps = {
  texture: Texture;
  position: XyzArray;
};
export function BaseBodyMiddle({ texture, position }: BaseBodyMiddleProps) {
  return (
    <>
      <Plane // Back
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [32, 20, 8, 12],
        }}
        position={[position[0], position[1] + 0.8, position[2] - 2]}
        rotation={[-Math.PI / 2, 0, Math.PI]}
        scale={[8 * SCALE_MULTIPLIER, 12 * SCALE_MULTIPLIER]}
      />

      <Plane // Stomach
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [56, 0, 8, 8],
        }}
        position={[position[0], position[1] - 0.8, position[2] - 1.6]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8 * SCALE_MULTIPLIER, 8 * SCALE_MULTIPLIER]}
      />

      <Plane // Middle Right
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [24, 0, 8, 8],
        }}
        position={[position[0] - 0.8, position[1], position[2] - 1.6]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[8 * SCALE_MULTIPLIER, 8 * SCALE_MULTIPLIER]}
      />

      <Plane // Middle Left
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [24, 0, 8, 8],
        }}
        position={[position[0] + 0.8, position[1], position[2] - 1.6]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[8 * SCALE_MULTIPLIER, 8 * SCALE_MULTIPLIER]}
      />
    </>
  );
}
