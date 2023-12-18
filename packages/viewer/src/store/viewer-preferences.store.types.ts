import type { XyzArray } from "../viewer/models/primitives/index.js";
import type { createViewerPreferencesStore } from "./viewer-preferences.store.js";

export type ViewerMode = "first-model" | "second-model" | "side-by-side";

export type ViewerPreferences = {
  defaultSkinUrl: string;
  firstSkinUrl: string | null;
  secondSkinUrl: string | null;
  performanceMonitor: boolean;
  mode: ViewerMode;

  camera: CameraPreferences;
  userOptions: UserOptionsPreferences;
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

export type UserOptionsPreferences = {
  antialiasing: boolean;
  smoothCamera: boolean;
  animations: boolean;
};

export type ViewerPreferencesProps = Partial<
  Omit<ViewerPreferences, "camera" | "userOptions">
> & {
  camera?: Partial<CameraPreferences>;
  userOptions?: Partial<UserOptionsPreferences>;
};

export type ViewerPreferencesStoreState = ViewerPreferences & {
  loadingDefaultSkin: boolean;
  loadingFirstSkin: boolean;
  loadingSecondSkin: boolean;
  setDefaultSkin: (skinUrl: string) => void;
  setFirstSkin: (skinUrl: string | null) => void;
  setSecondSkin: (skinUrl: string | null) => void;
  setMode: (mode: ViewerMode) => void;
  setCamera: (preferences: Partial<CameraPreferences>) => void;
  setPerformanceMonitor: (state: boolean) => void;
  setUserOptions: (preferences: Partial<UserOptionsPreferences>) => void;
};

export type ViewerPreferencesStore = ReturnType<
  typeof createViewerPreferencesStore
>;
