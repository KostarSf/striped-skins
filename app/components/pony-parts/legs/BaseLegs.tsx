import type { Texture } from "three";
import { Box } from "~/components/model/Box";
import type { XyzArray } from "~/components/model/types";

type BaseLegsProps = {
  texture: Texture;
  position: XyzArray;
};
export function BaseLegs({ texture, position }: BaseLegsProps) {
  return (
    <group position={position}>
      <Box // Front right leg
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [4, 4, 12],
          uvOrigin: [40, 16],
        }}
        position={[-0.4, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[4, 4, 12]}
      />

      <Box // Font left leg
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [4, 4, 12],
          uvOrigin: [32, 48],
        }}
        position={[0.4, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[4, 4, 12]}
      />

      <Box // Back right leg
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [4, 4, 12],
          uvOrigin: [0, 16],
        }}
        position={[-0.4, 0, -1.8]}
        rotation={[0, 0, 0]}
        scale={[4, 4, 12]}
      />

      <Box // Back right leg
        texture={texture}
        parameters={{
          textureSize: 64,
          uvScale: [4, 4, 12],
          uvOrigin: [16, 48],
        }}
        position={[0.4, 0, -1.8]}
        rotation={[0, 0, 0]}
        scale={[4, 4, 12]}
      />
    </group>
  );
}
