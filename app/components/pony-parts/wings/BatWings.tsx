import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

export default function BatWings() {
  const [x, y, z] = [0.92, 0.4 - 0.0225, 0]
  const scale = 1.26;

  return (
    <>
      <BatWing // Left Wing
        position={[x, y, z]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[scale, scale, scale]}
      />
      <BatWing // Right Wing
        position={[-x, y, z]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[-scale, scale, scale]}
      />
    </>
  );
}

type BatWingProps = {
  position?: XyzArray
  rotation?: XyzArray
  scale?: XyzArray
}

function BatWing({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}: BatWingProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box
        parameters={{
          uvOrigin: [56, 16],
          uvScale: [1, 1, 7],
        }}
        position={[-0.1, 0, 0]}
      />
      <Box
        parameters={{
          uvOrigin: [56, 16],
          uvScale: [1, 1, 7],
        }}
        position={[0, 0, 0.2]}
      />
      <Box
        parameters={{
          uvOrigin: [56, 16],
          uvScale: [1, 1, 6],
        }}
        position={[0, 0.1, 0.4]}
      />
      <Box
        parameters={{
          uvOrigin: [56, 16],
          uvScale: [1, 1, 4],
        }}
        position={[-0.1, 0.3, 0.6]}
      />
    </group>
  );
}
