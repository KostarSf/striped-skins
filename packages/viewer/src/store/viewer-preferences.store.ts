import { PonySkin } from "@striped-skins/api";
import { createStore } from "zustand";
import type { PonyStore } from "./index.js";
import type {
  ViewerPreferences,
  ViewerPreferencesProps,
  ViewerPreferencesStoreState,
} from "./viewer-preferences.store.types.js";

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
    userOptions: {
      animations: true,
      antialiasing: true,
      smoothCamera: true,
    },
  };

  const store = createStore<ViewerPreferencesStoreState>()((set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    camera: {
      ...DEFAULT_PROPS.camera,
      ...initProps?.camera,
    },

    userOptions: {
      ...DEFAULT_PROPS.userOptions,
      ...initProps?.userOptions,
    },

    loadingDefaultSkin: false,
    loadingFirstSkin: false,
    loadingSecondSkin: false,

    setDefaultSkin: (url) => {
      set(() => ({ loadingDefaultSkin: true }));
      PonySkin.fromUrl(url)
        .then((skin) => {
          ponyStore.getState().defaultPony.setSkin(skin);
          set(() => ({ loadingDefaultSkin: false, defaultSkinUrl: url }));
        })
        .catch((reason) => {
          console.error(reason);
          set(() => ({ loadingDefaultSkin: false }));
        });
    },

    setFirstSkin: (url) => {
      const skinUrl = url || get().defaultSkinUrl;
      set(() => ({ loadingFirstSkin: true }));

      PonySkin.fromUrl(skinUrl)
        .then((skin) => {
          ponyStore.getState().firstPony.setSkin(skin);
          set(() => ({ loadingFirstSkin: false, firstSkinUrl: skinUrl }));
        })
        .catch((reason) => {
          console.error(reason);
          set(() => ({ loadingFirstSkin: false }));
        });
    },

    setSecondSkin: (url) => {
      const skinUrl = url || get().defaultSkinUrl;
      set(() => ({ loadingSecondSkin: true }));

      PonySkin.fromUrl(skinUrl)
        .then((skin) => {
          ponyStore.getState().secondPony.setSkin(skin);
          set(() => ({ loadingSecondSkin: false, secondSkinUrl: skinUrl }));
        })
        .catch((reason) => {
          console.error(reason);
          set(() => ({ loadingSecondSkin: false }));
        });
    },

    setMode: (mode) => set((state) => ({ mode: mode })),

    setCamera: (prefs) =>
      set((state) => ({ camera: { ...state.camera, ...prefs } })),

    setUserOptions: (prefs) =>
      set((state) => ({ userOptions: { ...state.userOptions, ...prefs } })),

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

  return store;
};
