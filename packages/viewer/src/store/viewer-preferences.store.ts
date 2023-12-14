import { create } from "zustand";
import { PonySkin } from "@striped-skins/api";
import { usePonyStore } from "./index.js";
import type { XyzArray } from "../viewer/components/model-components/types.js";

export type ViewerMode = "first-model" | "second-model" | "side-by-side";

export type ViewerPreferences = {
  defaultSkinUrl: string;
  firstSkinUrl: string | null;
  secondSkinUrl: string | null;
  performanceMonitor: boolean;
  mode: ViewerMode;
  camera: CameraPreferences;
};

export type CameraPreferences = {
  static: boolean;
  distance: number;
  minDistance: number;
  maxDistance: number;
  position: XyzArray;
  rotation: XyzArray;
  fov: number;
};

export type PartialViewerPreferences = Partial<
  Omit<ViewerPreferences, "camera">
> & {
  camera?: Partial<CameraPreferences>;
};

type ViewerPreferencesStoreState = ViewerPreferences & {
  setDefaultSkin: (skinUrl: string) => void;
  setFirstSkin: (skinUrl: string | null) => void;
  setSecondSkin: (skinUrl: string | null) => void;
  setMode: (mode: ViewerMode) => void;
  setCamera: (preferences: Partial<CameraPreferences>) => void;
  setPerformanceMonitor: (state: boolean) => void;
};

export const useViewerPreferencesStore = create<ViewerPreferencesStoreState>()(
  (set) => ({
    defaultSkinUrl: "",
    firstSkinUrl: null,
    secondSkinUrl: null,
    mode: "first-model",
    performanceMonitor: false,
    camera: {
      static: false,
      distance: 10,
      minDistance: 5,
      maxDistance: 20,
      fov: 50,
      position: [4, 1, 10],
      rotation: [0, 0, 0],
    },

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

    setCamera: (prefs) =>
      set((state) => ({ camera: { ...state.camera, ...prefs } })),

    setPerformanceMonitor: (state) =>
      set(() => ({ performanceMonitor: state })),
  })
);
