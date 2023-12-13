import { PonySkin } from "@striped-skins/api";
import { createContext, useContext } from "react";

export const PonyContext = createContext<PonySkin>(PonySkin.DEFAULT);

export const usePony = () => {
  const context = useContext(PonyContext);
  return context;
};
