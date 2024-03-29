import { useSkinTexture } from "../../../context/index.js";
import { Box } from "../../primitives/index.js";
import type { XyArray, XyzArray } from "../../primitives/index.js";

export default function RegularWings() {
  const { oldSkinFormat } = useSkinTexture();

  return (
    <>
      <RegularClosedWing position={[-1, 0, -0.2]} texture='right-wing' />
      <RegularClosedWing
        position={[1, 0, -0.2]}
        texture={oldSkinFormat ? "right-wing" : "left-wing"}
        mirrored
      />
    </>
  );
}

type RegularClosedWingProps = {
  position: XyzArray;
  texture: "left-wing" | "right-wing";
  mirrored?: boolean;
};

export function RegularClosedWing({
  position,
  mirrored,
  texture,
}: RegularClosedWingProps) {
  const uvOrigin: XyArray = texture === "right-wing" ? [56, 16] : [56, 32];

  return (
    <group
      position={position}
      scale={[1, 1, mirrored ? -1 : 1]}
      rotation={[Math.PI / 2, Math.PI / 2, 0]}
    >
      <Box
        parameters={{
          uvOrigin,
          uvScale: [2, 2, 8],
        }}
        position={[0, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Box
        parameters={{
          uvOrigin,
          uvScale: [2, 2, 6],
        }}
        position={[0.4, 0.2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Box
        parameters={{
          uvOrigin,
          uvScale: [2, 2, 6],
        }}
        position={[-0.4, 0.2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
    </group>
  );
}
