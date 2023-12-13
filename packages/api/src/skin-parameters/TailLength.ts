import { TailLengthPixel } from "../skin-pixels";
import type { PixelColorData} from "../utils";
import { toHexColor } from "../utils";

const allTailLengths = new Map<string, TailLength>()

export type TailSize = 0 | 1 | 2 | 3 | 4;

export class TailLength {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    readonly pixel: TailLengthPixel,
    readonly name: string,
    readonly size: TailSize
  ) {}

  static fromPixel(color: string | PixelColorData) {
    if (typeof color === "string") {
      if (color.startsWith("#")) {
        color = color.substring(1);
      }

      return (
        allTailLengths.get(color) ?? allTailLengths.get(TailLengthPixel.Full)!
      );
    }

    const hexColor = toHexColor(color, false, false);
    return (
      allTailLengths.get(hexColor) ?? allTailLengths.get(TailLengthPixel.Full)!
    );
  }
}

function addTailLengths(...tails: TailLength[]) {
  for (const tail of tails) {
    allTailLengths.set(tail.pixel, tail);
  }
}

addTailLengths(
  new TailLength(TailLengthPixel.Stub, "Stub", 0),
  new TailLength(TailLengthPixel.Quarter, "Quarter", 1),
  new TailLength(TailLengthPixel.Half, "Half", 2),
  new TailLength(TailLengthPixel.ThreeQuarters, "Three Quarters", 3),
  new TailLength(TailLengthPixel.Full, "Full", 4),
);
