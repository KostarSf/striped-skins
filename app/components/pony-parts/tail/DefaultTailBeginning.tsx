import type { Texture } from "three";
import { Plane } from "~/components/model/Plane";
import { SCALE_MULTIPLIER } from "~/components/model/constants";
import type { XyzArray } from "~/components/model/types";

type DefaultTailBeginningProps = {
  texture: Texture;
  position: XyzArray;
};
export function DefaultTailBeginning({
  texture,
  position,
}: DefaultTailBeginningProps) {
  return (
    <group position={position} rotation={[Math.PI / 7, 0, 0]}>
      <Plane // Top
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [32, 1, 2, 6],
        }}
        position={[0, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[2 * SCALE_MULTIPLIER, 6 * SCALE_MULTIPLIER]}
      />

      <Plane // Bottom
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [32, 1, 2, 6],
        }}
        position={[0, -0.2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[2 * SCALE_MULTIPLIER, 6 * SCALE_MULTIPLIER]}
      />

      <Plane // Right
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [33, 3, 6, 2],
        }}
        position={[-0.2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[6 * SCALE_MULTIPLIER, 2 * SCALE_MULTIPLIER]}
      />

      <Plane // Left
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [33, 3, 6, 2],
        }}
        position={[0.2, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[6 * SCALE_MULTIPLIER, 2 * SCALE_MULTIPLIER]}
      />
    </group>
  );
}
