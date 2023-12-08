import type { Texture } from "three";
import { Plane } from "~/components/model/Plane";
import { SCALE_MULTIPLIER } from "~/components/model/constants";
import type { XyzArray } from "~/components/model/types";

type DefaultTailPartProps = {
  texture: Texture;
  position: XyzArray;
  drawTop?: boolean;
  drawBottom?: boolean;
  type: 'topHalf' | 'bottomHalf'
};
export function DefaultTailPart({
  texture,
  position,
  drawTop,
  drawBottom,
  type
}: DefaultTailPartProps) {
  const uv = type === 'topHalf' ? 0 : 4

  return (
    <group position={position}>
      <Plane // Front
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [32, uv, 4, 4],
        }}
        position={[0, 0, 0.4]}
        rotation={[0, 0, 0]}
        scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Back
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [32, uv, 4, 4],
        }}
        position={[0, 0, -0.4]}
        rotation={[0, Math.PI, 0]}
        scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Right
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [36, uv, 4, 4],
        }}
        position={[-0.4, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Left
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [36, uv, 4, 4],
        }}
        position={[0.4, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      {drawTop && (
        <Plane // Top
          texture={texture}
          parameters={{
            textureSize: 64,
            layout: [32, uv, 4, 4],
          }}
          position={[0, 0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
        />
      )}

      {drawBottom && (
        <Plane // Bottom
          texture={texture}
          parameters={{
            textureSize: 64,
            layout: [32, uv, 4, 4],
          }}
          position={[0, -0.4, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
        />
      )}
    </group>
  );
}
