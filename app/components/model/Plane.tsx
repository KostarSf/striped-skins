import type { Texture } from "three";
import type { TextureParameters, XyArray, XyzArray } from "./types";

type PlaneProps = {
  texture: Texture;
  parameters: TextureParameters;
  position: XyzArray;
  rotation: XyzArray;
  scale: XyArray;
};

export function Plane(props: PlaneProps) {
  const {
    layout: [uw, uv, width, height],
    textureSize,
  } = props.parameters;

  const texture = props.texture.clone();

  texture.anisotropy = 8;
  texture.magFilter = 1003;

  const percentWidth = width / textureSize;
  const percentHeight = height / textureSize;

  const percentUw = uw / textureSize;
  const percentUv = uv / textureSize;

  const edgeOffset = 0.00005;

  texture.center.set(0, 1);
  texture.offset.set(percentUw + edgeOffset, -percentUv - edgeOffset);
  texture.repeat.set(percentWidth - edgeOffset, percentHeight - edgeOffset);

  return (
    <mesh position={props.position} rotation={props.rotation}>
      <planeGeometry
        args={props.scale.map((i) => i + 0.0001) as [number, number]}
      />
      <meshStandardMaterial map={texture} alphaTest={0.5} />
    </mesh>
  );
}
