import type { XyzArray } from "../viewer/models/primitives/index.js";
import type { createViewerPreferencesStore } from "./viewer-preferences.store.js";
import type { AntialiasingMode } from "../antialiasing.js";

export type ViewerMode = "first-model" | "second-model" | "side-by-side";

export type ViewerPreferences = {
  defaultSkinUrl: string;
  firstSkinUrl: string | null;
  secondSkinUrl: string | null;
  /** @deprecated Diagnostics are available only on the app dev server with ?perf=1. */
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
  antialiasing: AntialiasingMode;
  smoothCamera: boolean;
  animations: boolean;
  groundGrid: boolean;
};

export type ViewerPreferencesProps = Partial<Omit<ViewerPreferences, "camera" | "userOptions">> & {
  camera?: Partial<CameraPreferences>;
  userOptions?: UserOptionsInput;
};

export type UserOptionsInput = Partial<Omit<UserOptionsPreferences, "antialiasing">> & {
  antialiasing?: AntialiasingMode | boolean;
};

export type ViewerPreferencesStoreState = ViewerPreferences & {
  defaultSkinError: string | null;
  firstSkinError: string | null;
  secondSkinError: string | null;
  loadingDefaultSkin: boolean;
  loadingFirstSkin: boolean;
  loadingSecondSkin: boolean;
  setDefaultSkin: (skinUrl: string) => void;
  setFirstSkin: (skinUrl: string | null) => void;
  setSecondSkin: (skinUrl: string | null) => void;
  setMode: (mode: ViewerMode) => void;
  setCamera: (preferences: Partial<CameraPreferences>) => void;
  setPerformanceMonitor: (state: boolean) => void;
  setUserOptions: (preferences: UserOptionsInput) => void;
};

export type ViewerPreferencesStore = ReturnType<typeof createViewerPreferencesStore>;
