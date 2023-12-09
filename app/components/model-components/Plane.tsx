import type { LayoutDimensions, XyArray, XyzArray } from "./types";
import { SCALE_MULTIPLIER } from "./constants";
import { useSkinTextureContext } from "./skinTextureContext";

type PlaneProps = {
  layout: LayoutDimensions;
  position: XyzArray;
  rotation: XyzArray;
  scale: XyArray;
  doubleSide?: boolean;
  flipX?: boolean;
  flipY?: boolean;
};

export function Plane(props: PlaneProps) {
  const [uw, uv, width, height] = props.layout;

  const {
    texture,
    textureSize,
    oldSkinFormat,
  } = useSkinTextureContext();

  texture.magFilter = 1003;
  texture.minFilter = 1003;

  const percentWidth = (width / textureSize);
  const percentHeight = height / (textureSize * (oldSkinFormat ? 0.5 : 1));

  const percentUw = (uw / textureSize);
  const percentUv = uv / (textureSize * (oldSkinFormat ? 0.5 : 1));

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
    <group
      position={props.position}
      rotation={props.rotation}
      scale={[props.flipX ? -1 : 1, props.flipY ? -1 : 1, 1]}
    >
      <mesh>
        <planeGeometry args={scale} />
        <meshStandardMaterial
          map={texture}
          alphaTest={0.1}
          transparent
        />
      </mesh>

      {props.doubleSide && (
        <mesh rotation={[Math.PI, 0, 0]} scale={[1, -1, 1]}>
          <planeGeometry args={scale} />
          <meshStandardMaterial map={texture} alphaTest={0.1} transparent />
        </mesh>
      )}
    </group>
  );
}
