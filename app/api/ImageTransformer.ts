export type PixelColorData =
  | [r: number, g: number, b: number, a: number]
  | Uint8ClampedArray;

export class ImageTransformer {
  #rawImage?: HTMLImageElement;

  #canvas?: HTMLCanvasElement;
  #context?: CanvasRenderingContext2D;

  constructor(image?: HTMLImageElement) {
    if (image) this.setImage(image);
  }

  get hasImage() {
    return !!this.#rawImage && !!this.#canvas && !!this.#context;
  }

  setImage(image: HTMLImageElement) {
    this.#rawImage = image;

    this.#canvas = document.createElement("canvas");
    this.#context = this.#canvas.getContext("2d")!;

    this.#context.drawImage(image, 0, 0);
  }

  getPixelRGBA(x: number, y: number): PixelColorData {
    if (!this.#canvas || !this.#context) {
      throw new Error("No image specified for transformations");
    }

    if (x < 0 || y < 0 || x >= this.#canvas.width || y >= this.#canvas.height) {
      throw new Error(
        `X or Y is out of picture sizes. Picture sizes: [${
          this.#canvas.width
        }, ${this.#canvas.height}]. Given pixel pos: [${x}, ${y}]`
      );
    }

    return this.#context.getImageData(x, y, 1, 1).data;
  }
}
