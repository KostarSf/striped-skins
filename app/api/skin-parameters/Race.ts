import type { PixelColorData } from "../ImageTransformer";
import { toHexColor } from "../number";
import { RacePixel } from "./skin-pixels";

const allRaces = new Map<string, Race>();

export class Race {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    readonly pixel: RacePixel,
    readonly name: string,
    readonly horn: boolean = false,
    readonly wings: boolean = false,
    readonly mohawk: boolean = false,
    readonly changelingWings: boolean = false,
    readonly batWings: boolean = false,
    readonly earPuff: boolean = false,
    readonly kirinChest: boolean = false,
    readonly kirinTail: boolean = false,
    readonly fishForm: boolean = false,
    readonly antlers: boolean = false,
    readonly kirinHorn: boolean = false,
    readonly human: boolean = false
  ) {}

  static fromPixel(color: string | PixelColorData) {
    if (typeof color === "string") {
      if (color.startsWith("#")) {
        color = color.substring(1);
      }

      return allRaces.get(color) ?? allRaces.get(RacePixel.Earthpony)!;
    }

    const hexColor = toHexColor(color, false, false);
    return allRaces.get(hexColor) ?? allRaces.get(RacePixel.Earthpony)!;
  }
}

function addRaces(...races: Race[]) {
  for (const race of races) {
    allRaces.set(race.pixel, race);
  }
}

addRaces(
  new Race(
    RacePixel.Human,
    "Human",
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true
  ),
  new Race(RacePixel.Earthpony, "Earthpony"),
  new Race(RacePixel.Pegasus, "Pegasus", false, true),
  new Race(RacePixel.Unicorn, "Unicorn", true),
  new Race(RacePixel.Alicorn, "Alicorn", true, true),
  new Race(RacePixel.Changeling, "Changeling", true, true, false, true),
  new Race(RacePixel.Zebra, "Zebra", false, false, true),
  new Race(
    RacePixel.ReformedChangeling,
    "Reformed Changeling",
    true,
    true,
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    true
  ),
  new Race(RacePixel.Gryphon, "Gryphon", false, true),
  new Race(RacePixel.Hippogriff, "Hippogriff", false, true),
  new Race(
    RacePixel.Kirin,
    "Kirin",
    true,
    false,
    false,
    false,
    false,
    false,
    true,
    true,
    false,
    false,
    true
  ),
  new Race(RacePixel.Batpony, "Batpony", false, true, false, false, true, true),
  new Race(
    RacePixel.Seapony,
    "Seapony",
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true
  )
);
