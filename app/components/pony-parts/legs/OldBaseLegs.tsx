import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

type OldBaseLegsProps = {
  position: XyzArray;
  slim?: boolean;
};
export function OldBaseLegs({ position, slim = false }: OldBaseLegsProps) {
  const x = slim ? 3 : 4;
  const uvScale: XyzArray = [x, 4, 12];
  const scale = uvScale

  return (
    <group position={position}>
      <Box // Front Right leg
        parameters={{
          uvScale,
          uvOrigin: [40, 16],
        }}
        position={[-0.4, 0, 0]}
        rotation={[0, 0, 0]}
        scale={scale}
      />

      <group scale={[-1, 1, 1]}>
        <Box // Front Left leg
          parameters={{
            uvScale,
            uvOrigin: [40, 16],
          }}
          position={[-0.4, 0, 0]}
          rotation={[0, 0, 0]}
          scale={scale}
        />
      </group>

      <Box // Back Right leg
        parameters={{
          uvScale,
          uvOrigin: [0, 16],
        }}
        position={[-0.4, 0, -1.8]}
        rotation={[0, 0, 0]}
        scale={scale}
      />

      <group scale={[-1, 1, 1]}>
        <Box // Back Left leg
          parameters={{
            uvScale,
            uvOrigin: [0, 16],
          }}
          position={[-0.4, 0, -1.8]}
          rotation={[0, 0, 0]}
          scale={scale}
        />
      </group>
    </group>
  );
}
