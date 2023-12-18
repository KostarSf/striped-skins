import React, { useRef } from "react";
import ReactDOM from "react-dom/client";
import { type PonyStore, type ViewerPreferencesStore } from "../store/index.js";
import { PonyContext } from "../store/pony.context.js";
import { ViewerPreferencesContext } from "../store/viewer-preferences.context.js";
import { Viewer } from "./Viewer.js";

export function attachStandaloneViewer(
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
      <StandaloneContextProvider {...{ ponyStore, viewerPreferencesStore }}>
        <Viewer />
      </StandaloneContextProvider>
    </React.StrictMode>
  );

  return root;
}

type StandaloneContextProviderProps = {
  ponyStore: PonyStore;
  viewerPreferencesStore: ViewerPreferencesStore;
  children: React.ReactNode;
};

function StandaloneContextProvider(props: StandaloneContextProviderProps) {
  const ponyRef = useRef<PonyStore>(props.ponyStore);
  const viewerPreferencesRef = useRef<ViewerPreferencesStore>(
    props.viewerPreferencesStore
  );

  return (
    <PonyContext.Provider value={ponyRef.current}>
      <ViewerPreferencesContext.Provider value={viewerPreferencesRef.current}>
        {props.children}
      </ViewerPreferencesContext.Provider>
    </PonyContext.Provider>
  );
}
