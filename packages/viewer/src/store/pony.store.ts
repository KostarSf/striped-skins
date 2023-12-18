import { PonySkin } from "@striped-skins/api";
import { createStore } from "zustand";
import type { PonyProps, PonyStoreState } from "./pony.store.types.js";

export const createPonyStore = (initProps?: Partial<PonyProps>) => {
  const defaultProps: PonyProps = {
    defaultPony: PonySkin.DEFAULT,
    firstPony: PonySkin.DEFAULT,
    secondPony: PonySkin.DEFAULT,
  };

  return createStore<PonyStoreState>()((set) => ({
    defaultPony: {
      skin: initProps?.defaultPony ?? defaultProps.defaultPony,
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
      skin: initProps?.firstPony ?? defaultProps.firstPony,
      setSkin: (skin) =>
        set((state) => ({ firstPony: { ...state.firstPony, skin } })),
    },

    secondPony: {
      skin: initProps?.secondPony ?? defaultProps.secondPony,
      setSkin: (skin) =>
        set((state) => ({ secondPony: { ...state.secondPony, skin } })),
    },
  }));
};
