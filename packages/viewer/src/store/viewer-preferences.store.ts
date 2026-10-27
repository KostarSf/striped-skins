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
  initProps?: ViewerPreferencesProps,
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

  const requests = { default: 0, first: 0, second: 0 };
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

    defaultSkinError: null,
    firstSkinError: null,
    secondSkinError: null,
    loadingDefaultSkin: false,
    loadingFirstSkin: false,
    loadingSecondSkin: false,

    setDefaultSkin: (url) => {
      const request = ++requests.default;
      set(() => ({ loadingDefaultSkin: true, defaultSkinError: null }));
      PonySkin.fromUrl(url)
        .then((skin) => {
          if (request !== requests.default) return;
          ponyStore.getState().defaultPony.setSkin(skin);
          set(() => ({ loadingDefaultSkin: false, defaultSkinUrl: url }));
        })
        .catch((reason) => {
          if (request !== requests.default) return;
          set(() => ({ loadingDefaultSkin: false, defaultSkinError: String(reason) }));
        });
    },

    setFirstSkin: (url) => {
      const skinUrl = url || get().defaultSkinUrl;
      const request = ++requests.first;
      const previous = ponyStore.getState().firstPony.skin;
      set(() => ({ loadingFirstSkin: true, firstSkinError: null }));

      PonySkin.fromUrl(skinUrl)
        .then((skin) => {
          if (request !== requests.first) return;
          const current = ponyStore.getState().firstPony.skin;
          if (
            current !== previous &&
            !(previous === PonySkin.DEFAULT && current.sourceUrl === get().defaultSkinUrl)
          ) {
            set({ loadingFirstSkin: false });
            return;
          }
          ponyStore.getState().firstPony.setSkin(skin);
          set(() => ({ loadingFirstSkin: false, firstSkinUrl: skinUrl }));
        })
        .catch((reason) => {
          if (request !== requests.first) return;
          set(() => ({ loadingFirstSkin: false, firstSkinError: String(reason) }));
        });
    },

    setSecondSkin: (url) => {
      const skinUrl = url || get().defaultSkinUrl;
      const request = ++requests.second;
      const previous = ponyStore.getState().secondPony.skin;
      set(() => ({ loadingSecondSkin: true, secondSkinError: null }));

      PonySkin.fromUrl(skinUrl)
        .then((skin) => {
          if (request !== requests.second) return;
          const current = ponyStore.getState().secondPony.skin;
          if (
            current !== previous &&
            !(previous === PonySkin.DEFAULT && current.sourceUrl === get().defaultSkinUrl)
          ) {
            set({ loadingSecondSkin: false });
            return;
          }
          ponyStore.getState().secondPony.setSkin(skin);
          set(() => ({ loadingSecondSkin: false, secondSkinUrl: skinUrl }));
        })
        .catch((reason) => {
          if (request !== requests.second) return;
          set(() => ({ loadingSecondSkin: false, secondSkinError: String(reason) }));
        });
    },

    setMode: (mode) => set(() => ({ mode })),

    setCamera: (prefs) => set((state) => ({ camera: { ...state.camera, ...prefs } })),

    setUserOptions: (prefs) =>
      set((state) => ({ userOptions: { ...state.userOptions, ...prefs } })),

    setPerformanceMonitor: (state) => set(() => ({ performanceMonitor: state })),
  }));

  if (initProps?.defaultSkinUrl) {
    store.getState().setDefaultSkin(initProps.defaultSkinUrl);
  }

  if (initProps?.firstSkinUrl) {
    store.getState().setFirstSkin(initProps.firstSkinUrl);
  }

  if (initProps?.secondSkinUrl) {
    store.getState().setSecondSkin(initProps.secondSkinUrl);
  }

  return store;
};
