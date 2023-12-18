import { Box } from "../../primitives/index.js";
import type { XyzArray } from "../../primitives/index.js";

type EarsProps = {
  position?: XyzArray;
};

export default function Ears({ position }: EarsProps) {
  const [x, y, z] = [0.6, 1, -0.4]

  return (
    <group position={position}>
      <Box // Right ear
        parameters={{
          uvOrigin: [12, 16],
          uvScale: [2, 2, 2],
        }}
        position={[x, y, z]}
        innerSides
        flipX
      />

      <Box // Left ear
        parameters={{
          uvOrigin: [12, 16],
          uvScale: [2, 2, 2],
        }}
        position={[-x, y, z]}
        innerSides
      />
    </group>
  );
}
