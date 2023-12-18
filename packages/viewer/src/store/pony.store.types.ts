import type { PonySkin } from "@striped-skins/api";
import type { createPonyStore } from "./pony.store.js";

export type PonyState = {
  skin: PonySkin;
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
