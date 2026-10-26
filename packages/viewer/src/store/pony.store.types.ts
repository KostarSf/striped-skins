import type { PreviewSettings, MotionLayer } from "@striped-skins/models";
import type { PonySkin } from "@striped-skins/api";
import type { createPonyStore } from "./pony.store.js";

export type PonyState = {
  skin: PonySkin;
  preview: PreviewSettings;
  motionLayers: readonly MotionLayer[];
  hidden: ReadonlySet<string>;
  setPreview: (patch: Partial<PreviewSettings>) => void;
  setMotionLayers: (layers: readonly MotionLayer[]) => void;
  setHidden: (hidden: ReadonlySet<string>) => void;
  setSkin: (skin: PonySkin) => void;
};

export type PonyStoreState = {
  defaultPony: PonyState;
  firstPony: PonyState;
  secondPony: PonyState;
};

export type PonyProps = {
  defaultPony: PonySkin;
  firstPony: PonySkin;
  secondPony: PonySkin;
};

export type PonyStore = ReturnType<typeof createPonyStore>;
