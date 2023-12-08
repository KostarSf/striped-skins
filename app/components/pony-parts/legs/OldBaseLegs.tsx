import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

type OldBaseLegsProps = {
  position: XyzArray;
};
export function OldBaseLegs({ position }: OldBaseLegsProps) {
  return (
    <group position={position}>
      <Box // Front Right leg
        parameters={{
          uvScale: [4, 4, 12],
          uvOrigin: [40, 16],
        }}
        position={[-0.4, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[4, 4, 12]}
      />

      <group scale={[-1, 1, 1]}>
        <Box // Front Left leg
          parameters={{
            uvScale: [4, 4, 12],
            uvOrigin: [40, 16],
          }}
          position={[-0.4, 0, 0]}
          rotation={[0, 0, 0]}
          scale={[4, 4, 12]}
        />
      </group>

      <Box // Back Right leg
        parameters={{
          uvScale: [4, 4, 12],
          uvOrigin: [0, 16],
        }}
        position={[-0.4, 0, -1.8]}
        rotation={[0, 0, 0]}
        scale={[4, 4, 12]}
      />

      <group scale={[-1, 1, 1]}>
        <Box // Back Left leg
          parameters={{
            uvScale: [4, 4, 12],
            uvOrigin: [0, 16],
          }}
          position={[-0.4, 0, -1.8]}
          rotation={[0, 0, 0]}
          scale={[4, 4, 12]}
        />
      </group>
    </group>
  );
}
