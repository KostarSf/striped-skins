import type { Texture } from "three";
import { Plane } from "~/components/model/Plane";
import { SCALE_MULTIPLIER } from "~/components/model/constants";
import type { XyzArray } from "~/components/model/types";

type BaseBodyFrontProps = {
  texture: Texture;
  position: XyzArray;
};
export function BaseBodyFront({ texture, position }: BaseBodyFrontProps) {
  return (
    <>
      <Plane // Front
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [20, 20, 8, 8],
        }}
        position={[position[0], position[1], position[2]]}
        rotation={[0, 0, 0]}
        scale={[8 * SCALE_MULTIPLIER, 8 * SCALE_MULTIPLIER]}
      />

      <Plane // Front Top
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [20, 16, 8, 4],
        }}
        position={[position[0], position[1] + 0.8, position[2] - 0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[8 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Front Bottom
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [28, 16, 8, 4],
        }}
        position={[position[0], position[1] - 0.8, position[2] - 0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Front Right
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [16, 20, 4, 8],
        }}
        position={[position[0] - 0.8, position[1], position[2] - 0.4]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[4 * SCALE_MULTIPLIER, 8 * SCALE_MULTIPLIER]}
      />

      <Plane // Front Left
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [28, 20, 4, 8],
        }}
        position={[position[0] + 0.8, position[1], position[2] - 0.4]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4 * SCALE_MULTIPLIER, 8 * SCALE_MULTIPLIER]}
      />
    </>
  );
}
