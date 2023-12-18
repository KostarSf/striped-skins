import { Box } from "../../primitives/index.js";
import type { XyzArray } from "../../primitives/index.js";

type ManeProps = {
  position?: XyzArray;
};

export default function Mane({ position }: ManeProps) {
  return (
    <Box // Mane
      parameters={{
        uvScale: [8, 8, 8],
        uvOrigin: [32, 0],
      }}
      position={position}
      scale={[9, 9, 9]}
      innerSides
    />
  );
}
