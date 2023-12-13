import { WearablesPixel } from "../skin-pixels";
import type { PixelColorData} from "../utils";
import { toHexColor } from "../utils";

export class Wearables {
  // eslint-disable-next-line no-useless-constructor
  constructor(readonly items: WearableItem[], readonly rawPixel: string) {}

  static fromPixel(color: string | PixelColorData) {
    let hexColor = "";

    if (typeof color === "string") {
      if (color.startsWith("#")) color = color.substring(1);
      hexColor = color;
    } else {
      hexColor = toHexColor(color, false, false);
    }

    const colors = [
      hexColor.substring(0, 2),
      hexColor.substring(2, 4),
      hexColor.substring(4, 6),
    ];

    const wearablesItems = new Set<WearableItem>();

    colors.forEach((color) => {
      const wearable = allWearablesItems.get(color);
      if (wearable) {
        wearablesItems.add(wearable);
      }
    });

    return new Wearables(Array.from(wearablesItems), hexColor);
  }
}

const allWearablesItems = new Map<string, WearableItem>();

class WearableItem {
  // eslint-disable-next-line no-useless-constructor
  constructor(readonly pixel: string, readonly name: string) {}
}

function addWearablesItems(...items: WearableItem[]) {
  for (const item of items) {
    allWearablesItems.set(item.pixel, item);
  }
}

addWearablesItems(
  new WearableItem(WearablesPixel.Crown, "Crown"),
  new WearableItem(WearablesPixel.Muffin, "Muffin"),
  new WearableItem(WearablesPixel.Hat, "Hat"),
  new WearableItem(WearablesPixel.Antlers, "Antlers"),
  new WearableItem(WearablesPixel.SaddleBagsLeft, "Saddle Bags Left"),
  new WearableItem(WearablesPixel.SaddleBagsRight, "Saddle Bags Right"),
  new WearableItem(WearablesPixel.SaddleBagsBoth, "Saddle Bags Both"),
  new WearableItem(WearablesPixel.Stetson, "Stetson"),
);
