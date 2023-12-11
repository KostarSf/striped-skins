import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

type BaseLegsProps = {
  position: XyzArray;
  slim?: boolean;
};
export function BaseLegs({ position, slim = false }: BaseLegsProps) {
  const x = slim ? 3 : 4

  return (
    <group position={position}>
      <Box // Front right leg
        parameters={{
          uvScale: [x, 4, 12],
          uvOrigin: [40, 16],
        }}
        position={[-0.4, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[x, 4, 12]}
      />

      <Box // Font left leg
        parameters={{
          uvScale: [x, 4, 12],
          uvOrigin: [32, 48],
        }}
        position={[0.4, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[x, 4, 12]}
      />

      <Box // Back right leg
        parameters={{
          uvScale: [x, 4, 12],
          uvOrigin: [0, 16],
        }}
        position={[-0.4, 0, -1.8]}
        rotation={[0, 0, 0]}
        scale={[x, 4, 12]}
      />

      <Box // Back right leg
        parameters={{
          uvScale: [x, 4, 12],
          uvOrigin: [16, 48],
        }}
        position={[0.4, 0, -1.8]}
        rotation={[0, 0, 0]}
        scale={[x, 4, 12]}
      />
    </group>
  );
}
