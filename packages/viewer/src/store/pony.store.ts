import { PonySkin } from "@striped-skins/api";
import { create } from "zustand";

type PonyState = {
  skin: PonySkin,
  setSkin: (skin: PonySkin) => void
}

type PonyStoreState = {
  firstPony: PonyState;
  secondPony: PonyState;
};

export const usePonyStore = create<PonyStoreState>()((set) => ({
  firstPony: {
    skin: PonySkin.DEFAULT,
    setSkin: (skin) =>
      set((state) => ({ firstPony: { ...state.firstPony, skin } })),
  },

  secondPony: {
    skin: PonySkin.DEFAULT,
    setSkin: (skin) =>
      set((state) => ({ secondPony: { ...state.secondPony, skin } })),
  },
}));
