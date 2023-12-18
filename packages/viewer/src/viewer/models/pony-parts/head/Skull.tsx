import { Box } from "../../primitives/index.js";
import type { XyzArray } from "../../primitives/index.js";

type SkullProps = {
  position?: XyzArray;
};

export default function Skull({ position }: SkullProps) {
  return (
    <Box // Head
      parameters={{
        uvScale: [8, 8, 8],
        uvOrigin: [0, 0],
      }}
      position={position}
    />
  );
}
