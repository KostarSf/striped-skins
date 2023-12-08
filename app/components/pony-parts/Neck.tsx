import type { Texture } from "three";
import type { XyzArray } from "../model/types";
import { Plane } from "../model/Plane";
import { SCALE_MULTIPLIER } from "../model/constants";

type NeckProps = {
  texture: Texture;
  position: XyzArray;
};
export function Neck({ texture, position }: NeckProps) {
  return (
    <>
      <group position={position} rotation={[Math.PI / 16, 0, 0]}>
        <Plane // Front
          texture={texture}
          parameters={{
            textureSize: 64,
            layout: [0, 16, 4, 4],
          }}
          position={[0, -0.2, 0.2]}
          rotation={[0, 0, 0]}
          scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
        />

        <Plane // Back
          texture={texture}
          parameters={{
            textureSize: 64,
            layout: [0, 16, 4, 4],
          }}
          position={[0, -0.2, -0.6]}
          rotation={[0, Math.PI, 0]}
          scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
        />

        <Plane // Right
          texture={texture}
          parameters={{
            textureSize: 64,
            layout: [0, 16, 4, 4],
          }}
          position={[-0.4, -0.2, -0.2]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
        />

        <Plane // Left
          texture={texture}
          parameters={{
            textureSize: 64,
            layout: [0, 16, 4, 4],
          }}
          position={[0.4, -0.2, -0.2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
        />
      </group>

      {/* <Plane // Front
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [0, 16, 4, 4],
        }}
        position={[position[0] + 0, position[1] + -0.278, position[2] + 0.192]}
        rotation={[Math.PI / 16, 0, 0]}
        scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Back
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [0, 16, 4, 4],
        }}
        position={[position[0] + 0, position[1] + -0.122, position[2] + -0.592]}
        rotation={[Math.PI / 16, Math.PI, 0]}
        scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Right
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [0, 16, 4, 4],
        }}
        position={[position[0] + -0.4, position[1] + -0.2, position[2] + -0.2]}
        rotation={[0, -Math.PI / 2, -Math.PI / 16]}
        scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      />

      <Plane // Left
        texture={texture}
        parameters={{
          textureSize: 64,
          layout: [0, 16, 4, 4],
        }}
        position={[position[0] + 0.4, position[1] + -0.2, position[2] + -0.2]}
        rotation={[0, Math.PI / 2, Math.PI / 16]}
        scale={[4 * SCALE_MULTIPLIER, 4 * SCALE_MULTIPLIER]}
      /> */}
    </>
  );
}
