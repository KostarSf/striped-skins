/** Stable machine-readable codes; applications own their translated messages. */
export class SkinError extends Error {
  constructor(
    readonly code:
      | "invalidDimensions"
      | "invalidImage"
      | "projectExpandedLimit"
      | "projectArchiveLimit"
      | "projectMissing"
      | "projectLayerMissing"
      | "projectVersion"
      | "projectInvalid"
      | "layerLimit"
      | "duplicateMemory"
      | "mergeMemory"
      | "wearableLimit"
      | "tailLength"
      | "glowColor"
      | "exportPng",
    message: string,
  ) {
    super(message);
    this.name = "SkinError";
  }
}
