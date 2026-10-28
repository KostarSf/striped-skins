import type { AntialiasingMode } from "@striped-skins/viewer";

/** Only an unset/legacy enabled preference follows the phone user agent. */
export function initialAntialiasing(saved: string | null, userAgent: string): AntialiasingMode {
  if (saved === "off" || saved === "msaa" || saved === "smaa") return saved;
  if (saved === "") return "off";
  return /iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|Opera Mini/i.test(userAgent)
    ? "msaa"
    : "smaa";
}
