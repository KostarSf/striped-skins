import React, { useRef } from "react";
import ReactDOM from "react-dom/client";
import { type PonyStore, type ViewerPreferencesStore } from "../store/index.js";
import { PonyContext } from "../store/pony.context.js";
import { ViewerPreferencesContext } from "../store/viewer-preferences.context.js";
import { Viewer } from "./Viewer.js";

export function attach(
  target: string | HTMLElement,
  ponyStore: PonyStore,
  viewerPreferencesStore: ViewerPreferencesStore
) {
  const domElement =
    typeof target === "string" ? document.querySelector(target) : target;

  if (!domElement) {
    throw new Error(`The DOM element ${domElement} is not accessable`);
  }

  const root = ReactDOM.createRoot(domElement);

  root.render(
    <React.StrictMode>
      <StandaloneContextProvider
        ponyStore={ponyStore}
        viewerPreferencesStore={viewerPreferencesStore}
      >
        <Viewer />
      </StandaloneContextProvider>
    </React.StrictMode>
  );

  return root;
}

function StandaloneContextProvider({
  ponyStore,
  viewerPreferencesStore,
  children,
}: {
  ponyStore: PonyStore;
  viewerPreferencesStore: ViewerPreferencesStore;
  children: React.ReactNode;
}) {
  const ponyRef = useRef<PonyStore>(ponyStore);
  const viewerPreferencesRef = useRef<ViewerPreferencesStore>(
    viewerPreferencesStore
  );

  return (
    <PonyContext.Provider value={ponyRef.current}>
      <ViewerPreferencesContext.Provider value={viewerPreferencesRef.current}>
        {children}
      </ViewerPreferencesContext.Provider>
    </PonyContext.Provider>
  );
}
