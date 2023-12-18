export type PixelColorData =
  | [r: number, g: number, b: number, a: number]
  | Uint8ClampedArray;

export class ImageTransformer {
  private _rawImage?: HTMLImageElement;

  private _canvas?: HTMLCanvasElement;
  private _context?: CanvasRenderingContext2D;

  get rawImage() {
    return this._rawImage;
  }

  get canvas() {
    return this._canvas;
  }

  constructor(image?: HTMLImageElement) {
    if (image) this.setImage(image);
  }

  get hasImage() {
    return !!this._rawImage && !!this._canvas && !!this._context;
  }

  setImage(image: HTMLImageElement) {
    this._rawImage = image;

    this._canvas = this.initializeCanvas(image.width, image.height);
    this._context = this._canvas.getContext("2d")!;

    this._context.drawImage(image, 0, 0);
  }

  private initializeCanvas(width: number, height: number): HTMLCanvasElement {
    if (typeof OffscreenCanvas !== "undefined") {
      return new OffscreenCanvas(width, height) as unknown as HTMLCanvasElement;
    }

    console.warn(
      "ImageTransformer: Using HTMLCanvasElement instead of OffscreenCanvas"
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    return canvas;
  }

  getPixelRGBA(x: number, y: number): PixelColorData {
    this.checkForCanvasBoundaries(x, y, 1, 1);

    return this._context?.getImageData(x, y, 1, 1).data ?? [0, 0, 0, 0];
  }

  getAverageRGBA(x: number, y: number, w: number, h: number): PixelColorData {
    this.checkForCanvasBoundaries(x, y, w, h);

    const pixelsData = this._context?.getImageData(x, y, w, h).data;
    if (!pixelsData) return [0, 0, 0, 0];

    const rChannel: number[] = [];
    const gChannel: number[] = [];
    const bChannel: number[] = [];
    const aChannel: number[] = [];

    for (let i = 0; i < pixelsData.length / 4; i++) {
      rChannel.push(pixelsData[i * 4]);
      gChannel.push(pixelsData[i * 4 + 1]);
      bChannel.push(pixelsData[i * 4 + 2]);
      aChannel.push(pixelsData[i * 4 + 3]);
    }

    const averageRGBA: PixelColorData = [
      rChannel.reduce((acc, i) => acc + i, 0) / rChannel.length,
      gChannel.reduce((acc, i) => acc + i, 0) / gChannel.length,
      bChannel.reduce((acc, i) => acc + i, 0) / bChannel.length,
      aChannel.reduce((acc, i) => acc + i, 0) / aChannel.length,
    ];

    return averageRGBA;
  }

  private checkForCanvasBoundaries(x: number, y: number, w: number, h: number) {
    if (!this._canvas) return;

    if (x < 0 || y < 0 || x >= this._canvas.width || y >= this._canvas.height) {
      throw new Error(
        `X or Y is out of picture sizes. Picture sizes: [${this._canvas.width}, ${this._canvas.height}]. Given pixel pos: [${x}, ${y}]`
      );
    }

    if (w < 1 || h < 1) {
      throw new Error(`W or H must be greater than zero`);
    }

    if (x + w > this._canvas.width || y + h > this._canvas.height) {
      throw new Error("W or H is out of picture bounds");
    }
  }
}
