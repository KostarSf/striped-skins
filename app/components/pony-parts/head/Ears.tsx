import type { Texture } from "three";
import { Box } from "~/components/model/Box";
import type { XyzArray } from "~/components/model/types";

type EarsProps = {
  texture: Texture;
  position: XyzArray;
};

export function Ears({ texture, position }: EarsProps) {
  const [x, y, z] = [0.6, 1, -0.4]

  return (
    <>
      <group position={position}>
        <Box // Right ear
          texture={texture}
          parameters={{
            textureSize: 64,
            uvScale: [2, 2, 2],
            uvOrigin: [12, 16],
          }}
          position={[-x, y, z]}
          rotation={[0, 0, 0]}
          scale={[2, 2, 2]}
        />
      </group>

      <group scale={[-1, 1, 1]} position={position}>
        <Box // Left ear
          texture={texture}
          parameters={{
            textureSize: 64,
            uvScale: [2, 2, 2],
            uvOrigin: [12, 16],
          }}
          position={[-x, y, z]}
          rotation={[0, 0, 0]}
          scale={[2, 2, 2]}
        />
      </group>
    </>
  );
}
