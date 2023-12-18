import { useRef } from "react";
import type {
  PonyProps,
  PonyStore,
  ViewerPreferencesProps,
  ViewerPreferencesStore,
} from "./index.js";
import { createPonyStore, createViewerPreferencesStore } from "./index.js";
import { PonyContext } from "./pony.context.js";
import { ViewerPreferencesContext } from "./viewer-preferences.context.js";

type StripedContextProviderProps = React.PropsWithChildren<{
  ponyParams?: PonyProps;
  viewerPreferencesParams?: ViewerPreferencesProps;
}>;

export function StripedContextProvider({
  children,
  ponyParams,
  viewerPreferencesParams,
}: StripedContextProviderProps) {
  const ponyRef = useRef<PonyStore>();
  const viewerPreferencesRef = useRef<ViewerPreferencesStore>();

  if (!ponyRef.current) {
    ponyRef.current = createPonyStore(ponyParams);
  }

  if (!viewerPreferencesRef.current) {
    viewerPreferencesRef.current = createViewerPreferencesStore(
      ponyRef.current,
      viewerPreferencesParams
    );
  }

  return (
    <PonyContext.Provider value={ponyRef.current}>
      <ViewerPreferencesContext.Provider value={viewerPreferencesRef.current}>
        {children}
      </ViewerPreferencesContext.Provider>
    </PonyContext.Provider>
  );
}
