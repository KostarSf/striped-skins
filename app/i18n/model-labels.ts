import type { RaceId, SkinSize } from "@striped-skins/api";
import type { TFunction } from "i18next";

export function getWearableNames(t: TFunction): Record<number, string> {
  return {
    22: t("wearable.crown"),
    50: t("wearable.muffin"),
    100: t("wearable.hat"),
    150: t("wearable.antlers"),
    198: t("wearable.leftBag"),
    199: t("wearable.rightBag"),
    200: t("wearable.bothBags"),
    250: t("wearable.stetson"),
  };
}

export function createPartLabel(t: TFunction) {
  const names: Record<string, string> = {
    head: t("parts.head"),
    hat: t("parts.hat"),
    body: t("parts.body"),
    jacket: t("parts.jacket"),
    neck: t("parts.neck"),
    right_arm: t("parts.rightForeleg"),
    left_arm: t("parts.leftForeleg"),
    right_leg: t("parts.rightHindleg"),
    left_leg: t("parts.leftHindleg"),
    right_sleeve: t("parts.rightSleeve"),
    left_sleeve: t("parts.leftSleeve"),
    right_pants: t("parts.rightPants"),
    left_pants: t("parts.leftPants"),
    tail: t("parts.tail"),
    wings: t("parts.wings"),
  };
  const tokens: Record<string, string> = {
    head: t("parts.head"),
    ears: t("parts.ears"),
    snout: t("skin.snout"),
    mare: t("skin.round"),
    stallion: t("skin.square"),
    flat: t("skin.flat"),
    body: t("parts.body"),
    butt: t("parts.rear"),
    mirrored: t("parts.rightSide"),
    butt_buttom: t("parts.bottomFace"),
    tail_stub: t("parts.tailBase"),
    tail: t("parts.tail"),
    segment: t("parts.geometry"),
    neck: t("parts.neck"),
    mane: t("parts.mane"),
    horn: t("parts.horn"),
    wings: t("parts.wings"),
    left_wing: t("parts.left"),
    right_wing: t("parts.right"),
    legacy_right_wing: t("parts.legacyRight"),
    folded: t("parts.folded"),
    extended: t("parts.extended"),
    left: t("parts.left"),
    right: t("parts.right"),
    jacket: t("parts.jacket"),
    left_side: t("parts.leftSide"),
    right_side: t("parts.rightSide"),
    base: t("parts.base"),
    tip: t("parts.tip"),
    fins: t("parts.fins"),
    left_fin: t("parts.leftFin"),
    right_fin: t("parts.rightFin"),
    center_fin: t("parts.centerFin"),
  };
  const labelFor = (id: string) =>
    names[id] ??
    id
      .split("/")
      .map(
        (token) =>
          tokens[token] ??
          (token.match(/^segment_(\d+)$/)
            ? t("parts.segment", { number: Number(token.slice(8)) + 1 })
            : token.match(/^feather_(\d+)$/)
              ? t("parts.feather", { number: token.slice(8) })
              : token),
      )
      .join(" / ");

  return labelFor;
}

export function getRaceNames(t: TFunction): Record<RaceId, string> {
  return {
    HUMAN: t("race.human"),
    EARTH: t("race.earth"),
    PEGASUS: t("race.pegasus"),
    UNICORN: t("race.unicorn"),
    ALICORN: t("race.alicorn"),
    CHANGELING: t("race.changeling"),
    ZEBRA: t("race.zebra"),
    CHANGEDLING: t("race.changedling"),
    GRYPHON: t("race.gryphon"),
    HIPPOGRIFF: t("race.hippogriff"),
    KIRIN: t("race.kirin"),
    BATPONY: t("race.batpony"),
    SEAPONY: t("race.seapony"),
  };
}
export function getSizeNames(t: TFunction): Record<SkinSize, string> {
  return {
    NORMAL: t("size.normal"),
    FOAL: t("size.foal"),
    YEARLING: t("size.yearling"),
    TALL: t("size.tall"),
    LANKY: t("size.lanky"),
    BULKY: t("size.bulky"),
  };
}
