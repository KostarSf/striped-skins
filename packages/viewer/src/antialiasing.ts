export type AntialiasingMode = "off" | "msaa" | "smaa";

/** Retain the original boolean API: true selected SMAA, false disabled AA. */
export function normalizeAntialiasing(
  value: AntialiasingMode | boolean | undefined,
  fallback: AntialiasingMode = "smaa",
): AntialiasingMode {
  if (typeof value === "boolean") return value ? "smaa" : "off";
  return value ?? fallback;
}
