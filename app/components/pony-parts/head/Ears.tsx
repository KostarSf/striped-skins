import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

type EarsProps = {
  position: XyzArray;
};

export function Ears({ position }: EarsProps) {
  const [x, y, z] = [0.6, 1, -0.4]

  return (
    <>
      <group position={position}>
        <Box // Right ear
          parameters={{
            uvScale: [2, 2, 2],
            uvOrigin: [12, 16],
          }}
          position={[-x, y, z]}
          rotation={[0, 0, 0]}
          scale={[2, 2, 2]}
          innerSides
        />
      </group>

      <group scale={[-1, 1, 1]} position={position}>
        <Box // Left ear
          parameters={{
            uvScale: [2, 2, 2],
            uvOrigin: [12, 16],
          }}
          position={[-x, y, z]}
          rotation={[0, 0, 0]}
          scale={[2, 2, 2]}
          innerSides
        />
      </group>
    </>
  );
}
