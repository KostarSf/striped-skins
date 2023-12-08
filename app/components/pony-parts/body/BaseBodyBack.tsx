import type { Texture } from "three";
import { Plane } from "~/components/model/Plane";
import { SCALE_MULTIPLIER } from "~/components/model/constants";
import type { XyzArray } from "~/components/model/types";

type BaseBodyBackProps = {
  texture: Texture;
  position: XyzArray;
};
export function BaseBodyBack({ texture, position }: BaseBodyBackProps) {
  return (
    <>
      <Plane // Butt Top
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [36, 16, 8, 4],
        }}
        position={[position[0], position[1] + 0.4, position[2] - 3.2]}
        rotation={[Math.PI, 0, 0]}
        scale={[8 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Butt Bottom
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [36, 16, 8, 4],
        }}
        position={[position[0], position[1] - 0.4, position[2] - 3.2]}
        rotation={[Math.PI, 0, 0]}
        scale={[8 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Stomach Bottom
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [36, 16, 8, 4],
        }}
        position={[position[0], position[1] - 0.8, position[2] - 2.8]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Qutie Right
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [4, 0, 4, 8],
        }}
        position={[position[0] - 0.8, position[1], position[2] - 2.8]}
        rotation={[Math.PI, -Math.PI / 2, 0]}
        scale={[4 * SCALE_MULTIPLIER, 8 * SCALE_MULTIPLIER]}
      />

      <Plane // Qutie Left
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [4, 0, 4, 8],
        }}
        position={[position[0] + 0.8, position[1], position[2] - 2.8]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4 * SCALE_MULTIPLIER, 8 * SCALE_MULTIPLIER]}
      />
    </>
  );
}
