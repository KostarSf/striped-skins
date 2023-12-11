import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

export default function BatWings() {
  return (
    <>
      <BatWing
        position={[0.92, 0.3, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1.2, 1.2, 1.2]}
      />
      <BatWing
        position={[-0.92, 0.3, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[-1.2, 1.2, 1.2]}
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
  scale = [1, 1,1],
}: BatWingProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box
        parameters={{
          uvOrigin: [56, 16],
          uvScale: [1, 1, 7],
        }}
        position={[-0.1, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 7]}
      />
      <Box
        parameters={{
          uvOrigin: [56, 16],
          uvScale: [1, 1, 7],
        }}
        position={[0, 0, 0.2]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 7]}
      />
      <Box
        parameters={{
          uvOrigin: [56, 16],
          uvScale: [1, 1, 6],
        }}
        position={[0, 0.1, 0.4]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 6]}
      />
      <Box
        parameters={{
          uvOrigin: [56, 16],
          uvScale: [1, 1, 4],
        }}
        position={[-0.1, 0.3, 0.6]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 4]}
      />
    </group>
  );
}
