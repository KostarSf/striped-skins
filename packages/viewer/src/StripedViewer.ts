import type ReactDOM from "react-dom/client";
import type { PartialViewerPreferences } from "./store/index.js";
import { usePonyStore, useViewerPreferencesStore } from "./store/index.js";
import { attach } from "./viewer/index.js";

export class StripedViewer {
  private static viewerRoot: ReactDOM.Root | null = null;
  private static mountTimer: NodeJS.Timeout;

  static get skins() {
    return Skins;
  }

  static get preferences() {
    return Preferences;
  }

  static run(targetElement: string | HTMLElement) {
    this.mountTimer = setTimeout(() => {
      this.stop();
      this.viewerRoot = attach(targetElement);
    });
  }

  static stop() {
    clearTimeout(this.mountTimer);
    if (this.viewerRoot !== null) {
      this.viewerRoot.unmount();
    }
  }
}

class Preferences {
  static set({
    defaultSkinUrl,
    firstSkinUrl,
    secondSkinUrl,
    mode,
    camera,
    performanceMonitor,
  }: PartialViewerPreferences) {
    const store = useViewerPreferencesStore.getState();

    if (defaultSkinUrl) store.setDefaultSkin(defaultSkinUrl);
    if (firstSkinUrl) store.setFirstSkin(firstSkinUrl);
    if (secondSkinUrl) store.setSecondSkin(secondSkinUrl);
    if (mode) store.setMode(mode);
    if (camera) store.setCamera(camera);
    if (performanceMonitor) store.setPerformanceMonitor(performanceMonitor);
  }

  static get defaultSkinUrl() {
    return useViewerPreferencesStore.getState().defaultSkinUrl;
  }

  static get firstSkinUrl() {
    return useViewerPreferencesStore.getState().firstSkinUrl;
  }

  static get secondSkinUrl() {
    return useViewerPreferencesStore.getState().secondSkinUrl;
  }

  static get mode() {
    return useViewerPreferencesStore.getState().mode;
  }
}

class Skins {
  static get firstPony() {
    return usePonyStore.getState().firstPony.skin;
  }
  static get secondPony() {
    return usePonyStore.getState().secondPony.skin;
  }
}
