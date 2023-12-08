import type { Texture } from "three";
import { Box } from "~/components/model/Box";
import type { XyzArray } from "~/components/model/types";

type ManeProps = {
  texture: Texture;
  position: XyzArray;
};

export function Mane({ texture, position }: ManeProps) {
  return (
    <Box // Mane
      texture={texture}
      parameters={{
        textureSize: 64,
        uvScale: [8, 8, 8],
        uvOrigin: [32, 0],
      }}
      position={position}
      rotation={[0, 0, 0]}
      scale={[9, 9, 9]}
    />
  );
}
