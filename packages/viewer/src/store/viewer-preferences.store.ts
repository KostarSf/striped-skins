import { create } from "zustand";
import { usePonyStore } from "./pony.store";
import { PonySkin } from "@striped-skins/api";

export type ViewerMode = "first-model" | "second-model" | "side-by-side";

export type ViewerPreferences = {
  defaultSkinUrl: string;
  firstSkinUrl: string | null;
  secondSkinUrl: string | null;
  mode: ViewerMode;
};

type ViewerPreferencesStoreState = ViewerPreferences & {
  setDefaultSkin: (skinUrl: string) => void;
  setFirstSkin: (skinUrl: string | null) => void;
  setSecondSkin: (skinUrl: string | null) => void;
  setMode: (mode: ViewerMode) => void;
};

export const useViewerPreferencesStore = create<ViewerPreferencesStoreState>()(
  (set) => ({
    defaultSkinUrl: "",
    firstSkinUrl: null,
    secondSkinUrl: null,
    mode: "first-model",

    setDefaultSkin: (url) => set(() => ({ defaultSkinUrl: url })),

    setFirstSkin: (url) => {
      const skinUrl =
        url || useViewerPreferencesStore.getState().defaultSkinUrl;

      PonySkin.fromUrl(skinUrl).then((skin) => {
        usePonyStore.getState().firstPony.setSkin(skin);
        set(() => ({ firstSkinUrl: skinUrl }));
      });
    },

    setSecondSkin: (url) => {
      const skinUrl =
        url || useViewerPreferencesStore.getState().defaultSkinUrl;

      PonySkin.fromUrl(skinUrl).then((skin) => {
        usePonyStore.getState().secondPony.setSkin(skin);
        set(() => ({ secondSkinUrl: skinUrl }));
      });
    },

    setMode: (mode) => set((state) => ({ mode: mode })),
  })
);
