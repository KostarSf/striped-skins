import type { PixelColorData } from "../ImageTransformer";
import { toHexColor } from "../number";
import { TailShapePixel } from "./skin-pixels";

const allTailShapes = new Map<string, TailShape>()

export class TailShape {
  // eslint-disable-next-line no-useless-constructor
  constructor(readonly pixel: TailShapePixel, readonly name: string) {}

  static fromPixel(color: string | PixelColorData) {
    if (typeof color === "string") {
      if (color.startsWith("#")) {
        color = color.substring(1);
      }

      return (
        allTailShapes.get(color) ?? allTailShapes.get(TailShapePixel.Straight)!
      );
    }

    const hexColor = toHexColor(color, false, false);
    return (
      allTailShapes.get(hexColor) ?? allTailShapes.get(TailShapePixel.Straight)!
    );
  }
}

function addTailShapes(...tails: TailShape[]) {
  for (const tail of tails) {
    allTailShapes.set(tail.pixel, tail);
  }
}

addTailShapes(
  new TailShape(TailShapePixel.Straight, "Straight"),
  new TailShape(TailShapePixel.Bumpy, "Bumpy"),
  new TailShape(TailShapePixel.Swirly, "Swirly"),
  new TailShape(TailShapePixel.Spiky, "Spiky")
);
