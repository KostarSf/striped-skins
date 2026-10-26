import { defaultPreview } from "@striped-skins/models";
import { PonySkin } from "@striped-skins/api";
import { createStore } from "zustand";
import type { PonyProps, PonyStoreState } from "./pony.store.types.js";

export const createPonyStore = (initProps?: Partial<PonyProps>) => {
  const defaultProps: PonyProps = {
    defaultPony: PonySkin.DEFAULT,
    firstPony: PonySkin.DEFAULT,
    secondPony: PonySkin.DEFAULT,
  };

  const cloneSkin = (skin: PonySkin) => {
    const copy = PonySkin.fromDocument(skin.document.clone());
    copy.sourceUrl = skin.sourceUrl;
    return copy;
  };
  return createStore<PonyStoreState>()((set) => {
    const runtime = (slot: keyof PonyStoreState) => ({
      preview: { ...defaultPreview },
      motionLayers: [] as PonyStoreState["firstPony"]["motionLayers"],
      hidden: new Set<string>(),
      setPreview: (patch: Parameters<PonyStoreState["firstPony"]["setPreview"]>[0]) =>
        set((state) => ({
          [slot]: { ...state[slot], preview: { ...state[slot].preview, ...patch } },
        })),
      setMotionLayers: (motionLayers: PonyStoreState["firstPony"]["motionLayers"]) =>
        set((state) => ({ [slot]: { ...state[slot], motionLayers } })),
      setHidden: (hidden: ReadonlySet<string>) =>
        set((state) => ({ [slot]: { ...state[slot], hidden } })),
    });
    return {
      defaultPony: {
        ...runtime("defaultPony"),
        skin: initProps?.defaultPony ?? defaultProps.defaultPony,
        setSkin: (skin) =>
          set((state) => ({
            defaultPony: { ...state.defaultPony, skin },
            firstPony:
              state.firstPony.skin === PonySkin.DEFAULT
                ? { ...state.firstPony, skin: cloneSkin(skin) }
                : state.firstPony,
            secondPony:
              state.secondPony.skin === PonySkin.DEFAULT
                ? { ...state.secondPony, skin: cloneSkin(skin) }
                : state.secondPony,
          })),
      },

      firstPony: {
        ...runtime("firstPony"),
        skin: initProps?.firstPony ?? defaultProps.firstPony,
        setSkin: (skin) => set((state) => ({ firstPony: { ...state.firstPony, skin } })),
      },

      secondPony: {
        ...runtime("secondPony"),
        skin: initProps?.secondPony ?? defaultProps.secondPony,
        setSkin: (skin) => set((state) => ({ secondPony: { ...state.secondPony, skin } })),
      },
    };
  });
};
