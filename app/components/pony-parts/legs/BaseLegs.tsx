import { Box } from "~/components/model-components/Box";
import type { XyArray } from "~/components/model-components/types";

type BaseLegsProps = {
  slim?: boolean;
  oldFormat?: boolean;
};

export default function BaseLegs({ slim, oldFormat }: BaseLegsProps) {
  const x = slim ? 3 : 4;

  const frLegUvOrigin: XyArray = [40, 16];
  const flLegUvOrigin: XyArray = oldFormat ? frLegUvOrigin : [32, 48];

  const brLegUvOrigin: XyArray = [0, 16];
  const blLegUvOrigin: XyArray = oldFormat ? brLegUvOrigin : [16, 48];

  return (
    <>
      <Box // Front right leg
        parameters={{
          uvOrigin: frLegUvOrigin,
          uvScale: [x, 4, 12],
        }}
        position={[-0.4, 0, 0]}
      />

      <Box // Font left leg
        parameters={{
          uvOrigin: flLegUvOrigin,
          uvScale: [x, 4, 12],
        }}
        position={[0.4, 0, 0]}
        flipX={oldFormat}
      />

      <Box // Back right leg
        parameters={{
          uvOrigin: brLegUvOrigin,
          uvScale: [x, 4, 12],
        }}
        position={[-0.4, 0, -1.8]}
      />

      <Box // Back left leg
        parameters={{
          uvOrigin: blLegUvOrigin,
          uvScale: [x, 4, 12],
        }}
        position={[0.4, 0, -1.8]}
        flipX={oldFormat}
      />
    </>
  );
}
