import { Box } from "../../model-components/Box";
import type { XyzArray } from "../../model-components/types";

type LegsClothesProps = {
  slim?: boolean
};

export default function LegsClothes({ slim }: LegsClothesProps) {
  const x = slim ? 3 : 4;
  const clothesScale = [x + 0.5, 4.5, 12.5] as XyzArray;

  return (
    <>
      <Box // Front right leg
        parameters={{
          uvOrigin: [40, 32],
          uvScale: [x, 4, 12],
        }}
        position={[-0.4, 0, 0]}
        scale={clothesScale}
        innerSides
      />

      <Box // Font left leg
        parameters={{
          uvOrigin: [48, 48],
          uvScale: [x, 4, 12],
        }}
        position={[0.4, 0, 0]}
        scale={clothesScale}
        innerSides
      />

      <Box // Back right leg
        parameters={{
          uvOrigin: [0, 32],
          uvScale: [x, 4, 12],
        }}
        position={[-0.4, 0, -1.8]}
        scale={clothesScale}
        innerSides
      />

      <Box // Back right leg
        parameters={{
          uvOrigin: [0, 48],
          uvScale: [x, 4, 12],
        }}
        position={[0.4, 0, -1.8]}
        scale={clothesScale}
        innerSides
      />
    </>
  );
}
