export function keyOfEnum<T extends Object>(
  en: T,
  value: string,
  def?: any
): T {
  const key = Object.keys(en)[Object.values(en).indexOf(value)];
  const enumValue = (en as any)[key];

  return !enumValue && !!def ? def : enumValue;
}

export enum RacePixel {
  Human = "none",
  Earthpony = "f9b131",
  Pegasus = "88caf0",
  Unicorn = "d19fe4",
  Alicorn = "fef9fc",
  Changeling = "282b29",
  Zebra = "d0cccf",
  ReformedChangeling = "caed5a",
  Gryphon = "ae9145",
  Hippogriff = "d6ddac",
  Kirin = "fa88af",
  Batpony = "eeeeee",
  Seapony = "3655dd",
}

export enum TailLengthPixel {
  Stub = "425844",
  Quarter = "d19fe4",
  Half = "534b76",
  ThreeQuarters = "8a6b7f",
  Full = "none",
}

export enum SnoutPixel {
  Rounded = "none",
  Squared = "ffffff",
  Flat = "888888",
}

export enum BodyPixel {
  Tall = "534b76",
  Bulky = "ce3254",
  Lanky = "3254ce",
  Normal = "none",
  Yearling = "53beff",
  Foal = "ffbe53",
}

export enum WearablesPixel {
  Crown = "16",
  Muffin = "32",
  Hat = "64",
  Antlers = "96",
  SaddleBagsLeft = "c6",
  SaddleBagsRight = "c7",
  SaddleBagsBoth = "c8",
  Stetson = "fa",
}

export enum TailShapePixel {
  Straight = "none",
  Bumpy = "fc539f",
  Swirly = "3eff22",
  Spiky = "3308c7",
}
