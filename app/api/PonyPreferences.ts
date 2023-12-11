import { createContext, useContext } from "react";
import { ImageTransformer } from "./ImageTransformer";
import { toHexColor } from "./number";
import { Body } from "./skin-parameters/Body";
import { Race } from "./skin-parameters/Race";
import { Snout } from "./skin-parameters/Snout";
import { TailLength } from "./skin-parameters/Tail";
import {
  BodyPixel,
  RacePixel,
  SnoutPixel,
  TailLengthPixel,
} from "./skin-parameters/skin-pixels";

export class PonyPreferences {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    readonly race: Race,
    readonly tailLength: TailLength,
    readonly snout: Snout,
    readonly body: Body,
    readonly magicGlow: string,
    readonly slim: boolean
  ) {}

  static fromSkin(image: HTMLImageElement) {
    const transformer = new ImageTransformer(image);

    const racePixel = transformer.getPixelRGBA(0, 0);
    const tailLengthPixel = transformer.getPixelRGBA(1, 0);
    const snoutPixel = transformer.getPixelRGBA(2, 0);
    const bodyPixel = transformer.getPixelRGBA(3, 0);
    const magicGlowPixel = transformer.getPixelRGBA(0, 1);

    // const wearablesPixel = transformer.getPixelRGBA(1, 1);
    // const tailShapePixel = transformer.getPixelRGBA(2, 1);

    const multiplier = image.width / 64;

    // Average color of the part of the skin that should be empty
    // if this skin is slim
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
      isSlim
    );
  }

  static readonly DEFAULT = new PonyPreferences(
    Race.fromPixel(RacePixel.Human),
    TailLength.fromPixel(TailLengthPixel.Full),
    Snout.fromPixel(SnoutPixel.Rounded),
    Body.fromPixel(BodyPixel.Normal),
    "88caf0",
    false
  );
}

export const PonyPreferencesContext = createContext<PonyPreferences>(
  PonyPreferences.DEFAULT
);

export const usePonyPreferences = () => {
  const context = useContext(PonyPreferencesContext);
  return context;
};
