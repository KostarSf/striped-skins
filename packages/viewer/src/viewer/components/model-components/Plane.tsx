import type { LayoutDimensions, XyArray, XyzArray } from ".";
import { SCALE_MULTIPLIER } from "./index.js";
import { useSkinTextureContext } from "../../context/index.js";

type PlaneProps = {
  layout: LayoutDimensions;

  position?: XyzArray;
  rotation?: XyzArray;
  scale?: XyArray;

  doubleSide?: boolean;

  flipX?: boolean;
  flipY?: boolean;
};

export function Plane({
  layout,

  position,
  rotation,
  scale,

  doubleSide,

  flipX,
  flipY,
}: PlaneProps) {
  const { texture, textureSize, oldSkinFormat } = useSkinTextureContext();

  const [uw, uv, width, height] = layout;

  texture.magFilter = 1003; // Nearest pixel
  texture.minFilter = 1003; // Nearest pixel

  const normalizedWidth = width / textureSize;
  const normalizedHeight = height / (textureSize * (oldSkinFormat ? 0.5 : 1));

  const normalizedUw = uw / textureSize;
  const normalizedUv = uv / (textureSize * (oldSkinFormat ? 0.5 : 1));

  const edgeOffset = 0.0005; // Texture's edges offset

  texture.center.set(0, 1);
  texture.offset.set(normalizedUw + edgeOffset, -normalizedUv - edgeOffset);
  texture.repeat.set(
    normalizedWidth - edgeOffset * 2,
    normalizedHeight - edgeOffset * 2
  );

  const scaledScale = (scale ?? [width, height]).map(
    (i) => i * SCALE_MULTIPLIER
  ) as XyArray;

  return (
    <group
      position={position}
      rotation={rotation}
      scale={[flipX ? -1 : 1, flipY ? -1 : 1, 1]}
    >
      <mesh>
        <planeGeometry args={scaledScale} />
        <meshStandardMaterial map={texture} alphaTest={0.1} transparent />
      </mesh>

      {doubleSide && (
        <mesh rotation={[Math.PI, 0, 0]} scale={[1, -1, 1]}>
          <planeGeometry args={scaledScale} />
          <meshStandardMaterial map={texture} alphaTest={0.1} transparent />
        </mesh>
      )}
    </group>
  );
}
