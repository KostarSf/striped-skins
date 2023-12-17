import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { PonyStore, PonyStoreState } from "./index.js";

export const PonyContext = createContext<PonyStore | null>(null);

export function usePonyContext<T>(selector: (state: PonyStoreState) => T): T {
  const store = useContext(PonyContext);
  if (!store) throw new Error("Missing PonyContext.Provider in the tree");
  return useStore(store, selector);
}
