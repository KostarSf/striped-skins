import type { PropsWithChildren } from "react";
import { createContext, useContext, useState } from "react";
import { PonyPreferences } from "./PonyPreferences";

const PonyPreferencesManagerContext = createContext({
  firstPony: PonyPreferences.DEFAULT,
  secondPony: PonyPreferences.DEFAULT,
  setFirstPony: (pony: PonyPreferences) => {},
  setSecondPony: (pony: PonyPreferences) => {},
});

export default function PonyPreferencesManager({
  children,
}: PropsWithChildren) {
  const [firstPony, setFirstPony] = useState(PonyPreferences.DEFAULT);
  const [secondPony, setSecondPony] = useState(PonyPreferences.DEFAULT);

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
      preferences: context.firstPony,
      setPreferences: context.setFirstPony,
    },
    secondPony: {
      preferences: context.secondPony,
      setPreferences: context.setSecondPony,
    },
  };
}
