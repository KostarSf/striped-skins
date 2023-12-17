import { PonySkin } from "@striped-skins/api";
import { createStore } from "zustand";
import type { XyzArray } from "../viewer/components/model-components/types.js";
import type { PonyStore } from "./index.js";

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

export type ViewerPreferencesProps = Partial<ViewerPreferences> & {
  camera?: Partial<CameraPreferences>;
};

export type ViewerPreferencesStoreState = ViewerPreferences & {
  setDefaultSkin: (skinUrl: string) => void;
  setFirstSkin: (skinUrl: string | null) => void;
  setSecondSkin: (skinUrl: string | null) => void;
  setMode: (mode: ViewerMode) => void;
  setCamera: (preferences: Partial<CameraPreferences>) => void;
  setPerformanceMonitor: (state: boolean) => void;
};

export type ViewerPreferencesStore = ReturnType<
  typeof createViewerPreferencesStore
>;

export const createViewerPreferencesStore = (
  ponyStore: PonyStore,
  initProps?: ViewerPreferencesProps
) => {
  const DEFAULT_PROPS: ViewerPreferences = {
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
  };

  const store = createStore<ViewerPreferencesStoreState>()((set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    camera: {
      ...DEFAULT_PROPS.camera,
      ...initProps?.camera,
    },

    setDefaultSkin: (url) => {
      PonySkin.fromUrl(url).then((skin) => {
        ponyStore.getState().defaultPony.setSkin(skin);
        set(() => ({ defaultSkinUrl: url }));
      });
    },

    setFirstSkin: (url) => {
      const skinUrl = url || get().defaultSkinUrl;

      PonySkin.fromUrl(skinUrl).then((skin) => {
        ponyStore.getState().firstPony.setSkin(skin);
        set(() => ({ firstSkinUrl: skinUrl }));
      });
    },

    setSecondSkin: (url) => {
      const skinUrl = url || get().defaultSkinUrl;

      PonySkin.fromUrl(skinUrl).then((skin) => {
        ponyStore.getState().secondPony.setSkin(skin);
        set(() => ({ secondSkinUrl: skinUrl }));
      });
    },

    setMode: (mode) => set((state) => ({ mode: mode })),

    setCamera: (prefs) =>
      set((state) => ({ camera: { ...state.camera, ...prefs } })),

    setPerformanceMonitor: (state) =>
      set(() => ({ performanceMonitor: state })),
  }));

  if (initProps?.defaultSkinUrl) {
    store.getState().setDefaultSkin(initProps.defaultSkinUrl);
  }

  if (initProps?.firstSkinUrl) {
    store.getState().setDefaultSkin(initProps.firstSkinUrl);
  }

  if (initProps?.secondSkinUrl) {
    store.getState().setDefaultSkin(initProps.secondSkinUrl);
  }

  return store
};
