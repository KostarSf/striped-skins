export type PixelColorData =
  | [r: number, g: number, b: number, a: number]
  | Uint8ClampedArray;

export class ImageTransformer {
  #rawImage?: HTMLImageElement;

  #canvas: HTMLCanvasElement;
  #context: CanvasRenderingContext2D;

  constructor(image?: HTMLImageElement) {
    this.#canvas = document.createElement("canvas");
    this.#context = this.#canvas.getContext("2d")!;

    if (image) this.setImage(image);
  }

  get hasImage() {
    return !!this.#rawImage && !!this.#canvas && !!this.#context;
  }

  setImage(image: HTMLImageElement) {
    this.#rawImage = image;

    this.#canvas = document.createElement("canvas");
    this.#canvas.width = image.width;
    this.#canvas.height = image.height;

    this.#context = this.#canvas.getContext("2d")!;

    this.#context.drawImage(image, 0, 0);
  }

  getPixelRGBA(x: number, y: number): PixelColorData {
    this.checkForCanvasBoundaries(x, y, 1, 1);

    return this.#context.getImageData(x, y, 1, 1).data;
  }

  getAverageRGBA(x: number, y: number, w: number, h: number): PixelColorData {
    this.checkForCanvasBoundaries(x, y, w, h);

    const pixelsData = this.#context.getImageData(x, y, w, h).data;
    const rChannel: number[] = []
    const gChannel: number[] = [];
    const bChannel: number[] = [];
    const aChannel: number[] = [];

    for (let i = 0; i < pixelsData.length / 4; i++) {
      rChannel.push(pixelsData[i * 4])
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
    if (x < 0 || y < 0 || x >= this.#canvas.width || y >= this.#canvas.height) {
      throw new Error(
        `X or Y is out of picture sizes. Picture sizes: [${
          this.#canvas.width
        }, ${this.#canvas.height}]. Given pixel pos: [${x}, ${y}]`
      );
    }

    if (w < 1 || h < 1) {
      throw new Error(`W or H must be greater than zero`)
    }

    if (x + w > this.#canvas.width || y + h > this.#canvas.height) {
      throw new Error('W or H is out of picture bounds')
    }
  }
}
