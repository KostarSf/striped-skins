import { Plane } from "../../model-components/index.js";
import type { XyzArray } from "../../model-components/index.js";

type DefaultTailPartProps = {
  position?: XyzArray;
  drawTop?: boolean;
  drawBottom?: boolean;
  type: 'topHalf' | 'bottomHalf'
};

export default function DefaultTailPart({
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
        doubleSide
      />

      <Plane // Back
        layout={[32, uv, 4, 4]}
        position={[0, 0, -0.4]}
        rotation={[0, Math.PI, 0]}
        doubleSide
      />

      <Plane // Right
        layout={[36, uv, 4, 4]}
        position={[-0.4, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        doubleSide
      />

      <Plane // Left
        layout={[36, uv, 4, 4]}
        position={[0.4, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        doubleSide
      />

      {drawTop && (
        <Plane // Top
          layout={[32, uv, 4, 4]}
          position={[0, 0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          doubleSide
        />
      )}

      {drawBottom && (
        <Plane // Bottom
          layout={[32, uv, 4, 4]}
          position={[0, -0.4, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          doubleSide
        />
      )}
    </group>
  );
}