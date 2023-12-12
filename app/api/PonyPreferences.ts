import { createContext, useContext } from "react";
import { ImageTransformer } from "./ImageTransformer";
import { toHexColor } from "./number";
import { Body } from "./skin-parameters/Body";
import { Race } from "./skin-parameters/Race";
import { Snout } from "./skin-parameters/Snout";
import { TailLength } from "./skin-parameters/TailLength";
import {
  BodyPixel,
  RacePixel,
  SnoutPixel,
  TailLengthPixel,
  TailShapePixel,
} from "./skin-parameters/skin-pixels";
import { TailShape } from "./skin-parameters/TailShape";
import { Wearables } from "./skin-parameters/Wearables";

export class PonyPreferences {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    readonly race: Race,
    readonly tailLength: TailLength,
    readonly snout: Snout,
    readonly body: Body,
    readonly magicGlow: string,
    readonly slim: boolean,
    readonly wearables: Wearables,
    readonly tailShape: TailShape
  ) {}

  static fromSkin(image: HTMLImageElement) {
    const transformer = new ImageTransformer(image);

    const racePixel = transformer.getPixelRGBA(0, 0);
    const tailLengthPixel = transformer.getPixelRGBA(1, 0);
    const snoutPixel = transformer.getPixelRGBA(2, 0);
    const bodyPixel = transformer.getPixelRGBA(3, 0);
    const magicGlowPixel = transformer.getPixelRGBA(0, 1);
    const wearablesPixel = transformer.getPixelRGBA(1, 1);
    const tailShapePixel = transformer.getPixelRGBA(2, 1);

    const multiplier = image.width / 64;

    // Average color of part of the skin that should be empty if skin is slim
    // ( the square of 4 top left pixels of back side of back right leg -
    // right below the front part of the ear )
    const averageColor = transformer.getAverageRGBA(
      14 * multiplier,
      20 * multiplier,
      2 * multiplier,
      2 * multiplier
    );
    const isSlim = averageColor[3] < 10; // average alpha shold be low

    return new PonyPreferences(
      Race.fromPixel(racePixel),
      TailLength.fromPixel(tailLengthPixel),
      Snout.fromPixel(snoutPixel),
      Body.fromPixel(bodyPixel),
      toHexColor(magicGlowPixel, false, false),
      isSlim,
      Wearables.fromPixel(wearablesPixel),
      TailShape.fromPixel(tailShapePixel),
    );
  }

  static readonly DEFAULT = new PonyPreferences(
    Race.fromPixel(RacePixel.Human),
    TailLength.fromPixel(TailLengthPixel.Full),
    Snout.fromPixel(SnoutPixel.Rounded),
    Body.fromPixel(BodyPixel.Normal),
    "88caf0",
    false,
    Wearables.fromPixel('000000'),
    TailShape.fromPixel(TailShapePixel.Straight),
  );
}

export const PonyPreferencesContext = createContext<PonyPreferences>(
  PonyPreferences.DEFAULT
);

export const usePonyPreferences = () => {
  const context = useContext(PonyPreferencesContext);
  return context;
};
