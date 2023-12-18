import { PonySkin } from "@striped-skins/api";
import { createContext, useContext } from "react";

export const PonySkinContext = createContext<PonySkin>(PonySkin.DEFAULT);

export const usePonySkin = () => {
  return useContext(PonySkinContext);
};
