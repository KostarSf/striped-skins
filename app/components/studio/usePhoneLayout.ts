import { useSyncExternalStore } from "react";

const query = "(max-width: 600px)";
const subscribe = (change: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
};
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

export function usePhoneLayout() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
