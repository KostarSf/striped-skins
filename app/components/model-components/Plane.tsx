import type { LayoutDimensions, XyArray, XyzArray } from "./types";
import { SCALE_MULTIPLIER } from "./constants";
import { useSkinTextureContext } from "./SkinTextureContext";

type PlaneProps = {
  layout: LayoutDimensions;
  position: XyzArray;
  rotation: XyzArray;
  scale: XyArray;
  doubleSide?: boolean;
};

export function Plane(props: PlaneProps) {
  const [uw, uv, width, height] = props.layout;

  const { texture: originalTexture, textureSize } = useSkinTextureContext();

  const texture = originalTexture.clone();

  // texture.anisotropy = 8;
  texture.magFilter = 1003;

  const percentWidth = width / textureSize;
  const percentHeight = height / textureSize;

  const percentUw = uw / textureSize;
  const percentUv = uv / textureSize;

  const edgeOffset = 0.0005;

  texture.center.set(0, 1);
  texture.offset.set(percentUw + edgeOffset, -percentUv - edgeOffset);
  texture.repeat.set(
    percentWidth - edgeOffset * 2,
    percentHeight - edgeOffset * 2
  );

  const scale = props.scale.map(
    (i) => i * SCALE_MULTIPLIER // + 0.0001
  ) as XyArray;

  return (
    <group position={props.position} rotation={props.rotation}>
      <mesh>
        <planeGeometry args={scale} />
        <meshStandardMaterial map={texture} alphaTest={0.5} />
      </mesh>

      {props.doubleSide && (
        <mesh rotation={[Math.PI, 0, 0]} scale={[1, -1, 1]}>
          <planeGeometry args={scale} />
          <meshStandardMaterial map={texture} alphaTest={0.5} />
        </mesh>
      )}
    </group>
  );
}
