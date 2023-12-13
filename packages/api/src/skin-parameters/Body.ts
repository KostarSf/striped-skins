import { BodyPixel } from "../skin-pixels";
import type { PixelColorData} from "../utils";
import { toHexColor } from "../utils";

const allBodies = new Map<string, Body>()

export class Body {
  // eslint-disable-next-line no-useless-constructor
  constructor(readonly pixel: BodyPixel, readonly name: string) {}

  static fromPixel(color: string | PixelColorData) {
    if (typeof color === "string") {
      if (color.startsWith("#")) {
        color = color.substring(1);
      }

      return allBodies.get(color) ?? allBodies.get(BodyPixel.Normal)!;
    }

    const hexColor = toHexColor(color, false, false);
    return allBodies.get(hexColor) ?? allBodies.get(BodyPixel.Normal)!;
  }
}

function addBodies(...bodies: Body[]) {
  for (const body of bodies) {
    allBodies.set(body.pixel, body);
  }
}

addBodies(
  new Body(BodyPixel.Tall, "Tall"),
  new Body(BodyPixel.Bulky, "Bulky"),
  new Body(BodyPixel.Lanky, "Lanky"),
  new Body(BodyPixel.Normal, "Normal"),
  new Body(BodyPixel.Yearling, "Yearling"),
  new Body(BodyPixel.Foal, "Foal")
);
