import { PonySkin } from "@striped-skins/api";
import create from "zustand";

type PonyState = {
  skin: PonySkin;
  setSkin: (skin: PonySkin) => void;
};

type PonyStoreState = {
  defaultPony: PonyState;
  firstPony: PonyState;
  secondPony: PonyState;
};

export const usePonyStore = create<PonyStoreState>((set) => ({
  defaultPony: {
    skin: PonySkin.DEFAULT,
    setSkin: (skin) =>
      set((state) => ({
        defaultPony: { ...state.defaultPony, skin },
        firstPony:
          state.firstPony.skin === PonySkin.DEFAULT
            ? { ...state.firstPony, skin }
            : state.firstPony,
        secondPony:
          state.secondPony.skin === PonySkin.DEFAULT
            ? { ...state.secondPony, skin }
            : state.secondPony,
      })),
  },

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
