import type { SkinDocument } from "./SkinDocument.js";

export const raceColors = {
  HUMAN: 0,
  EARTH: 0xf9b131,
  PEGASUS: 0x88caf0,
  UNICORN: 0xd19fe4,
  ALICORN: 0xfef9fc,
  CHANGELING: 0x282b29,
  ZEBRA: 0xd0cccf,
  CHANGEDLING: 0xcaed5a,
  GRYPHON: 0xae9145,
  HIPPOGRIFF: 0xd6ddac,
  KIRIN: 0xfa88af,
  BATPONY: 0xeeeeee,
  SEAPONY: 0x3655dd,
} as const;
export const sizeColors = {
  NORMAL: 0,
  FOAL: 0xffbe53,
  YEARLING: 0x53beff,
  TALL: 0x534b76,
  LANKY: 0x3254ce,
  BULKY: 0xce3254,
} as const;
export const tailShapeColors = {
  STRAIGHT: 0,
  BUMPY: 0xfc539f,
  SWIRLY: 0x3eff22,
  SPIKY: 0x3308c7,
} as const;
export const wearableNames = {
  22: "Корона",
  50: "Маффин",
  100: "Шляпа",
  150: "Рога",
  198: "Сумка слева",
  199: "Сумка справа",
  200: "Две сумки",
  250: "Stetson",
} as const;
export type RaceId = keyof typeof raceColors;
export type SkinSize = keyof typeof sizeColors;
export type TailShape = keyof typeof tailShapeColors;
export type Snout = "mare" | "stallion" | "flat";
export type SkinMetadata = {
  race: RaceId;
  size: SkinSize;
  snout: Snout;
  tailLength: number;
  tailShape: TailShape;
  wearables: number[];
  glow: string;
  slim: boolean;
};
const tailColors = [0x425844, 0xd19fe4, 0x534b76, 0x8a6b7f, 0];
function match<T extends Record<string, number>>(
  colors: T,
  pixel: number,
  fallback: keyof T,
): keyof T {
  return (Object.keys(colors).find((k) => colors[k] === pixel) as keyof T) ?? fallback;
}
export function decodeSkinMetadata(document: SkinDocument): SkinMetadata {
  if (document.width < 4 || document.height < 2)
    throw new Error("Skin is too small for MLP metadata");
  const trigger = (x: number, y: number) => {
    const [r, g, b, a] = document.readPixel(x, y);
    return a === 255 ? (r << 16) | (g << 8) | b : -1;
  };
  const tail = tailColors.indexOf(trigger(1, 0)),
    snout = trigger(2, 0);
  const [r, g, b, a] = document.readPixel(1, 1);
  let alpha = 0,
    count = 0;
  const m = document.width / 64;
  for (let y = Math.floor(20 * m); y < 22 * m; y++)
    for (let x = Math.floor(14 * m); x < 16 * m; x++) {
      alpha += document.readPixel(x, y)[3];
      count++;
    }
  const glow = document
    .readPixel(0, 1)
    .slice(0, 3)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return {
    race: match(raceColors, trigger(0, 0), "HUMAN"),
    size: match(sizeColors, trigger(3, 0), "NORMAL"),
    snout: snout === 0xffffff ? "stallion" : snout === 0x888888 ? "flat" : "mare",
    tailLength: tail < 0 ? 4 : tail,
    tailShape: match(tailShapeColors, trigger(2, 1), "STRAIGHT"),
    wearables: a === 255 ? [...new Set([r, g, b].filter((v) => v in wearableNames))] : [],
    glow,
    slim: alpha / count < 10,
  };
}
export function writeSkinMetadata(
  document: SkinDocument,
  patch: Partial<Omit<SkinMetadata, "slim">>,
) {
  const items = patch.wearables;
  if (
    items &&
    (items.length > 3 ||
      new Set(items).size !== items.length ||
      items.some((v) => !(v in wearableNames)))
  )
    throw new Error("PNG поддерживает до трёх различных аксессуаров");
  if (
    patch.tailLength !== undefined &&
    (!Number.isInteger(patch.tailLength) || patch.tailLength < 0 || patch.tailLength > 4)
  )
    throw new Error("Invalid tail length");
  if (patch.glow !== undefined && !/^[\da-f]{6}$/i.test(patch.glow))
    throw new Error("Invalid glow color");
  const changes: { x: number; y: number; color: readonly [number, number, number, number] }[] = [];
  const put = (x: number, y: number, value: number) => {
    changes.push({ x, y, color: [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255] });
  };
  if (patch.race !== undefined) put(0, 0, raceColors[patch.race]);
  if (patch.size !== undefined) put(3, 0, sizeColors[patch.size]);
  if (patch.snout !== undefined)
    put(2, 0, patch.snout === "stallion" ? 0xffffff : patch.snout === "flat" ? 0x888888 : 0);
  if (patch.tailLength !== undefined) put(1, 0, tailColors[patch.tailLength]);
  if (patch.tailShape !== undefined) put(2, 1, tailShapeColors[patch.tailShape]);
  if (patch.glow !== undefined) put(0, 1, parseInt(patch.glow, 16));
  if (items) put(1, 1, ((items[0] ?? 0) << 16) | ((items[1] ?? 0) << 8) | (items[2] ?? 0));
  document.editPixels(changes);
}
