import { Race, TailLength, Snout, Wearables, TailShape, Body } from "./skin-parameters/index.js";
import {
  RacePixel,
  TailLengthPixel,
  SnoutPixel,
  BodyPixel,
  TailShapePixel,
} from "./skin-pixels/index.js";
import { ImageTransformer, loadImage } from "./utils/index.js";
import { SkinDocument } from "./SkinDocument.js";
import {
  decodeSkinMetadata,
  raceColors,
  sizeColors,
  tailShapeColors,
  type SkinMetadata,
} from "./skin-metadata.js";
import { normalizeSkinPixels, documentCanvas } from "./skin-image.js";
const hex = (value: number) => value.toString(16).padStart(6, "0");
export class PonySkin {
  sourceUrl?: string;
  private _document?: SkinDocument;
  private cachedRevision = -1;
  private cachedMetadata?: SkinMetadata;
  constructor(
    readonly source: ImageTransformer,
    private readonly initialRace: Race,
    private readonly initialTail: TailLength,
    private readonly initialSnout: Snout,
    private readonly initialBody: Body,
    private readonly initialGlow: string,
    private readonly initialSlim: boolean,
    private readonly initialWearables: Wearables,
    private readonly initialShape: TailShape,
  ) {}
  get document(): SkinDocument {
    if (!this._document) {
      const canvas = this.source.canvas;
      this._document = canvas
        ? normalizeSkinPixels(
            canvas.width,
            canvas.height,
            canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data,
          )
        : new SkinDocument(64, 64, new Uint8ClampedArray(64 * 64 * 4));
    }
    return this._document;
  }
  get metadata(): SkinMetadata {
    const doc = this.document;
    if (this.cachedRevision !== doc.getSnapshot()) {
      this.cachedMetadata = decodeSkinMetadata(doc);
      this.cachedRevision = doc.getSnapshot();
    }
    return this.cachedMetadata!;
  }
  get race() {
    return this._document ? Race.fromPixel(hex(raceColors[this.metadata.race])) : this.initialRace;
  }
  get body() {
    return this._document ? Body.fromPixel(hex(sizeColors[this.metadata.size])) : this.initialBody;
  }
  get tailLength() {
    return this._document
      ? TailLength.fromPixel(
          ["425844", "d19fe4", "534b76", "8a6b7f", "000000"][this.metadata.tailLength],
        )
      : this.initialTail;
  }
  get snout() {
    return this._document
      ? Snout.fromPixel(
          this.metadata.snout === "stallion"
            ? "ffffff"
            : this.metadata.snout === "flat"
              ? "888888"
              : "000000",
        )
      : this.initialSnout;
  }
  get magicGlow() {
    return this._document ? this.metadata.glow : this.initialGlow;
  }
  get slim() {
    return this._document ? this.metadata.slim : this.initialSlim;
  }
  get wearables() {
    return this._document
      ? Wearables.fromPixel(
          this.metadata.wearables
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("")
            .padEnd(6, "0"),
        )
      : this.initialWearables;
  }
  get tailShape() {
    return this._document
      ? TailShape.fromPixel(hex(tailShapeColors[this.metadata.tailShape]))
      : this.initialShape;
  }
  static async fromUrl(url: string) {
    const skin = this.fromImage(await loadImage(url));
    skin.sourceUrl = url;
    return skin;
  }
  static fromImage(image: HTMLImageElement) {
    const transformer = new ImageTransformer(image),
      canvas = transformer.canvas!;
    return this.fromDocument(
      normalizeSkinPixels(
        canvas.width,
        canvas.height,
        canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data,
      ),
    );
  }
  static fromDocument(document: SkinDocument) {
    const source = new ImageTransformer();
    const canvas = documentCanvas(document);
    source.setCanvas(canvas);
    document.subscribe(() =>
      canvas
        .getContext("2d")!
        .putImageData(
          new ImageData(new Uint8ClampedArray(document.pixels), document.width, document.height),
          0,
          0,
        ),
    );
    const skin = new PonySkin(
      source,
      Race.fromPixel(RacePixel.Earthpony),
      TailLength.fromPixel(TailLengthPixel.Full),
      Snout.fromPixel(SnoutPixel.Rounded),
      Body.fromPixel(BodyPixel.Normal),
      "000000",
      false,
      Wearables.fromPixel("000000"),
      TailShape.fromPixel(TailShapePixel.Straight),
    );
    skin._document = document;
    return skin;
  }
  static readonly DEFAULT = new PonySkin(
    new ImageTransformer(),
    Race.fromPixel(RacePixel.Pegasus),
    TailLength.fromPixel(TailLengthPixel.Full),
    Snout.fromPixel(SnoutPixel.Rounded),
    Body.fromPixel(BodyPixel.Normal),
    "88caf0",
    false,
    Wearables.fromPixel("000000"),
    TailShape.fromPixel(TailShapePixel.Straight),
  );
}
