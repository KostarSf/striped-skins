export type LayoutDimensions = [
  uw: number,
  uv: number,
  width: number,
  height: number
];

export type TextureParameters = {
  layout: LayoutDimensions;
  textureSize: number;
};

export type XyzArray = [x: number, y: number, z: number];
export type XyArray = [x: number, y: number];
