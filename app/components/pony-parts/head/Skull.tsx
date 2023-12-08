import type { Texture } from "three";
import { Box } from "~/components/model/Box";
import type { XyzArray } from "~/components/model/types";

type SkullProps = {
  texture: Texture;
  position: XyzArray;
};

export function Skull({ texture, position }: SkullProps) {
  return (
    <Box // Head
      texture={texture}
      parameters={{
        textureSize: 64,
        uvScale: [8, 8, 8],
        uvOrigin: [0, 0],
      }}
      position={position}
      rotation={[0, 0, 0]}
      scale={[8, 8, 8]}
    />
  );
}
