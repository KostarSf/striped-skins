import { SnoutPixel } from "../skin-pixels/index.js";
import type { PixelColorData } from "../utils/index.js";
import { toHexColor } from "../utils/index.js";

const allSnouts = new Map<string, Snout>()

export class Snout {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    readonly pixel: SnoutPixel,
    readonly name: string,
    readonly squared: boolean = false,
    readonly flat: boolean = false
  ) {}

  static fromPixel(color: string | PixelColorData) {
    if (typeof color === "string") {
      if (color.startsWith("#")) {
        color = color.substring(1);
      }

      return allSnouts.get(color) ?? allSnouts.get(SnoutPixel.Rounded)!;
    }

    const hexColor = toHexColor(color, false, false);
    return allSnouts.get(hexColor) ?? allSnouts.get(SnoutPixel.Rounded)!;
  }
}

function addSnouts(...snouts: Snout[]) {
  for (const snout of snouts) {
    allSnouts.set(snout.pixel, snout);
  }
}

addSnouts(
  new Snout(SnoutPixel.Rounded, "Rounded"),
  new Snout(SnoutPixel.Squared, "Squared", true),
  new Snout(SnoutPixel.Flat, "Flat", false, true)
);
