import type { SkinDocument } from "@striped-skins/api";

/** Transient UI state survives workspace changes without marking the project dirty. */
export const inspectorTabs = new WeakMap<SkinDocument, "texture" | "skin">();
