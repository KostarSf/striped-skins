import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

type SkullProps = {
  position: XyzArray;
};

export function Skull({ position }: SkullProps) {
  return (
    <Box // Head
      parameters={{
        uvScale: [8, 8, 8],
        uvOrigin: [0, 0],
      }}
      position={position}
      rotation={[0, 0, 0]}
      scale={[8, 8, 8]}
    />
  );
}
