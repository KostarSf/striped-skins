import { Box } from "~/components/model-components/Box";
import type { XyzArray } from "~/components/model-components/types";

type ManeProps = {
  position?: XyzArray;
};

export default function Mane({ position }: ManeProps) {
  return (
    <Box // Mane
      parameters={{
        uvScale: [8, 8, 8],
        uvOrigin: [32, 0],
      }}
      position={position}
      scale={[9, 9, 9]}
      innerSides
    />
  );
}
