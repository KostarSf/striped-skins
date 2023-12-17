import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type {
  ViewerPreferencesStore,
  ViewerPreferencesStoreState,
} from "./index.js";

export const ViewerPreferencesContext =
  createContext<ViewerPreferencesStore | null>(null);

export type ContextFunSelector<S> = <T>(selector: (state: S) => T) => T;
export type ContextFunNoSelector = <T>() => T;

export type ContextFun<S> = ContextFunNoSelector | ContextFunSelector<S>;

type Selector<T> = (state: ViewerPreferencesStoreState) => T;

export function useViewerPreferencesContext<T>(selector: Selector<T>): T {
  const store = useContext(ViewerPreferencesContext);
  if (!store) throw new Error("Missing PonyContext.Provider in the tree");
  return useStore(store, selector);
}
