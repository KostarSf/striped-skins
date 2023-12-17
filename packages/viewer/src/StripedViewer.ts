import type ReactDOM from "react-dom/client";
import type {
  PonyProps,
  PonyStore,
  ViewerPreferencesProps,
  ViewerPreferencesStore,
} from "./store/index.js";
import {
  createPonyStore,
  createViewerPreferencesStore,
} from "./store/index.js";
import { Viewer, attach } from "./viewer/index.js";

export class StripedViewer {
  private viewerRoot: ReactDOM.Root | null = null;
  private mountTimer?: NodeJS.Timeout;

  private ponyStore: PonyStore;
  private viewerPreferencesStore: ViewerPreferencesStore;

  private targetElement: string | HTMLElement;

  constructor({
    targetElement,
    ponyOptions,
    viewerOptions,
  }: {
    targetElement: string | HTMLElement;
    ponyOptions?: Partial<PonyProps>;
    viewerOptions?: ViewerPreferencesProps;
  }) {
    this.targetElement = targetElement;
    this.ponyStore = createPonyStore(ponyOptions);
    this.viewerPreferencesStore = createViewerPreferencesStore(
      this.ponyStore,
      viewerOptions
    );
  }

  get pony() {
    return this.ponyStore.getState();
  }

  get preferences() {
    return this.viewerPreferencesStore.getState();
  }

  get isAttached() {
    return this.viewerRoot !== null;
  }

  attach() {
    this.mountTimer = setTimeout(() => {
      if (this.isAttached) {
        throw new Error(`This skin viewer is already attached to DOM tree`);
      }
      this.viewerRoot = attach(
        this.targetElement,
        this.ponyStore,
        this.viewerPreferencesStore
      );
    });
  }

  detach() {
    clearTimeout(this.mountTimer);
    if (this.viewerRoot !== null) {
      this.viewerRoot.unmount();
      this.viewerRoot = null;
    }
  }

  static get Component() {
    return Viewer;
  }
}
