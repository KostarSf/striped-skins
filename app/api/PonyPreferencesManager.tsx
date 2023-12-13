import { PonySkin } from "@striped-skins/api";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useState } from "react";

const PonyPreferencesManagerContext = createContext({
  firstPony: PonySkin.DEFAULT,
  secondPony: PonySkin.DEFAULT,
  setFirstPony: (pony: PonySkin) => {},
  setSecondPony: (pony: PonySkin) => {},
});

export default function PonyPreferencesManager({
  children,
}: PropsWithChildren) {
  const [firstPony, setFirstPony] = useState(PonySkin.DEFAULT);
  const [secondPony, setSecondPony] = useState(PonySkin.DEFAULT);

  return (
    <PonyPreferencesManagerContext.Provider
      value={{ firstPony, secondPony, setFirstPony, setSecondPony }}
    >
      {children}
    </PonyPreferencesManagerContext.Provider>
  );
}

export const usePonyPreferencesManager = () => {
  const context = useContext(PonyPreferencesManagerContext);
  return {
    firstPony: {
      skin: context.firstPony,
      setSkin: context.setFirstPony,
    },
    secondPony: {
      skin: context.secondPony,
      setSkin: context.setSecondPony,
    },
  };
}
