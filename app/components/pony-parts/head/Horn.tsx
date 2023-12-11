import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

type HornProps = {
  position?: XyzArray;
};

export default function Horn({ position }: HornProps) {
  return (
    <group position={position}>
      <Box
        parameters={{
          uvOrigin: [0, 3],
          uvScale: [1, 1, 4],
        }}
        position={[0, 1, 0.9]}
        rotation={[Math.PI * 0.18, 0, 0]}
        innerSides
      />
    </group>
  );
}
