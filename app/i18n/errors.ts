import { SkinError } from "@striped-skins/api";
import type { TFunction } from "i18next";

const errorKeys = {
  exportPng: "errors.exportPng",
  invalidDimensions: "errors.invalidDimensions",
  invalidImage: "errors.invalidImage",
  projectExpandedLimit: "errors.projectExpandedLimit",
  projectArchiveLimit: "errors.projectArchiveLimit",
  projectMissing: "errors.projectMissing",
  projectLayerMissing: "errors.projectLayerMissing",
  projectVersion: "errors.projectVersion",
  projectInvalid: "errors.projectInvalid",
  layerLimit: "errors.layerLimit",
  duplicateMemory: "errors.duplicateMemory",
  mergeMemory: "errors.mergeMemory",
  wearableLimit: "errors.wearableLimit",
  tailLength: "errors.tailLength",
  glowColor: "errors.glowColor",
} as const;

export function errorMessage(t: TFunction, error: unknown): string {
  return error instanceof SkinError ? t(errorKeys[error.code]) : t("errors.unexpected");
}
