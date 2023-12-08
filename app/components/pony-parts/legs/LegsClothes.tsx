import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

type LegsClothesProps = {
  position: XyzArray;
};
export function LegsClothes({ position }: LegsClothesProps) {
  const clothesScale = [4.5, 4.5, 12.5] as XyzArray;

  return (
    <group position={position}>
      <Box // Front right leg
        parameters={{
          uvScale: [4, 4, 12],
          uvOrigin: [40, 32],
        }}
        position={[-0.4, 0, 0]}
        rotation={[0, 0, 0]}
        scale={clothesScale}
        innerSides
      />

      <Box // Font left leg
        parameters={{
          uvScale: [4, 4, 12],
          uvOrigin: [48, 48],
        }}
        position={[0.4, 0, 0]}
        rotation={[0, 0, 0]}
        scale={clothesScale}
        innerSides
      />

      <Box // Back right leg
        parameters={{
          uvScale: [4, 4, 12],
          uvOrigin: [0, 32],
        }}
        position={[-0.4, 0, -1.8]}
        rotation={[0, 0, 0]}
        scale={clothesScale}
        innerSides
      />

      <Box // Back right leg
        parameters={{
          uvScale: [4, 4, 12],
          uvOrigin: [0, 48],
        }}
        position={[0.4, 0, -1.8]}
        rotation={[0, 0, 0]}
        scale={clothesScale}
        innerSides
      />
    </group>
  );
}
