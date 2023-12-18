import { DoubleSide, FrontSide, NearestFilter, PlaneGeometry } from "three";
import { useSkinTexture } from "../../context/index.js";
import type { LayoutDimensions, XyArray, XyzArray } from "./types.js";
import { SCALE_MULTIPLIER } from "./constants.js";

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
  const { texture, textureSize, oldSkinFormat } = useSkinTexture();

  const [uw, uv, width, height] = layout;

  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;

  const normalizedWidth = width / textureSize;
  const normalizedHeight = height / (textureSize * (oldSkinFormat ? 0.5 : 1));

  const normalizedUw = uw / textureSize;
  const normalizedUv = uv / (textureSize * (oldSkinFormat ? 0.5 : 1));

  const edgeOffset = 0;

  const scaledScale = (scale ?? [width, height]).map(
    (i) => i * SCALE_MULTIPLIER
  ) as XyArray;

  const geometry = new PlaneGeometry(...scaledScale);
  const guv = geometry.getAttribute("uv");

  guv.array[0] = normalizedUw + edgeOffset; // Top Left Horizontal
  guv.array[1] = 1 - normalizedUv - edgeOffset; // Top Left Vertical
  guv.array[2] = normalizedUw + normalizedWidth - edgeOffset; // Top Right Horizontal
  guv.array[3] = 1 - normalizedUv - edgeOffset; // Top Right Vertical
  guv.array[4] = normalizedUw + edgeOffset; // Bottom Left Horizontal
  guv.array[5] = 1 - (normalizedUv + normalizedHeight) + edgeOffset; // Bottom Left Vertical
  guv.array[6] = normalizedUw + normalizedWidth - edgeOffset; // Bottom Right Horizontal
  guv.array[7] = 1 - (normalizedUv + normalizedHeight) + edgeOffset; // Bottom Right Vertical

  return (
    <group
      position={position}
      rotation={rotation}
      scale={[flipX ? -1 : 1, flipY ? -1 : 1, 1]}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial
          map={texture}
          alphaTest={0.1}
          transparent
          side={doubleSide ? DoubleSide : FrontSide}
        />
      </mesh>
    </group>
  );
}
