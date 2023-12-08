import { Plane } from "~/components/model-components/Plane";
import type { XyzArray } from "~/components/model-components/types";

type DefaultTailPartProps = {
  position: XyzArray;
  drawTop?: boolean;
  drawBottom?: boolean;
  type: 'topHalf' | 'bottomHalf'
};
export function DefaultTailPart({
  position,
  drawTop,
  drawBottom,
  type
}: DefaultTailPartProps) {
  const uv = type === 'topHalf' ? 0 : 4

  return (
    <group position={position}>
      <Plane // Front
        layout={[32, uv, 4, 4]}
        position={[0, 0, 0.4]}
        rotation={[0, 0, 0]}
        scale={[4, 4]}
      />

      <Plane // Back
        layout={[32, uv, 4, 4]}
        position={[0, 0, -0.4]}
        rotation={[0, Math.PI, 0]}
        scale={[4, 4]}
      />

      <Plane // Right
        layout={[36, uv, 4, 4]}
        position={[-0.4, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[4, 4]}
      />

      <Plane // Left
        layout={[36, uv, 4, 4]}
        position={[0.4, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4, 4]}
      />

      {drawTop && (
        <Plane // Top
          layout={[32, uv, 4, 4]}
          position={[0, 0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[4, 4]}
        />
      )}

      {drawBottom && (
        <Plane // Bottom
          layout={[32, uv, 4, 4]}
          position={[0, -0.4, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[4, 4]}
        />
      )}
    </group>
  );
}
