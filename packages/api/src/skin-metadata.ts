import type { SkinDocument } from "./SkinDocument.js";

const races: Record<number, string> = {
  0: "HUMAN",
  0xf9b131: "EARTH",
  0x88caf0: "PEGASUS",
  0xd19fe4: "UNICORN",
  0xfef9fc: "ALICORN",
  0x282b29: "CHANGELING",
  0xd0cccf: "ZEBRA",
  0xcaed5a: "CHANGEDLING",
  0xae9145: "GRYPHON",
  0xd6ddac: "HIPPOGRIFF",
  0xfa88af: "KIRIN",
  0xeeeeee: "BATPONY",
  0x3655dd: "SEAPONY",
};
export const sizeColors = {
  NORMAL: 0,
  FOAL: 0xffbe53,
  YEARLING: 0x53beff,
  TALL: 0x534b76,
  LANKY: 0x3254ce,
  BULKY: 0xce3254,
} as const;
export type SkinSize = keyof typeof sizeColors;
export function decodeSkinMetadata(document: SkinDocument) {
  if (document.width < 4 || document.height < 2)
    throw new Error("Skin is too small for MLP metadata");
  const trigger = (x: number, y: number) => {
    const [r, g, b, a] = document.readPixel(x, y);
    return a === 255 ? (r << 16) | (g << 8) | b : -1;
  };
  const size = Object.entries(sizeColors).find(([, value]) => value === trigger(3, 0))?.[0] as
    | SkinSize
    | undefined;
  const snout = trigger(2, 0);
  const tail = [0x425844, 0xd19fe4, 0x534b76, 0x8a6b7f, 0].indexOf(trigger(1, 0));
  const [r, g, b, a] = document.readPixel(1, 1);
  const available = new Set([0x16, 0x32, 0x64, 0x96, 0xc6, 0xc7, 0xc8, 0xfa]);
  return {
    race: races[trigger(0, 0)] ?? "HUMAN",
    size: size ?? "NORMAL",
    snout: snout === 0xffffff ? "stallion" : snout === 0x888888 ? "flat" : "mare",
    tailLength: tail < 0 ? 4 : tail,
    wearables: a === 255 ? [...new Set([r, g, b].filter((v) => available.has(v)))] : [],
  };
}
