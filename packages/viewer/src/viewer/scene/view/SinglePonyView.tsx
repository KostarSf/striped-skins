import PonyModel from "./PonyModel";
import { useViewerPreferencesStore } from "../../../store/viewer-preferences.store";
import { usePonyStore } from "../../../store/pony.store";

export default function SinglePonyView() {
  const { mode, firstSkinUrl, secondSkinUrl, defaultSkinUrl } =
    useViewerPreferencesStore();
  const { firstPony, secondPony } = usePonyStore();

  const firstSkinTexture = firstSkinUrl || defaultSkinUrl;
  const secondSkinTexture = secondSkinUrl || defaultSkinUrl;

  const activeSkinTexture =
    mode === "first-model" ? firstSkinTexture : secondSkinTexture;
  const activePony = mode === "first-model" ? firstPony : secondPony;

  return (
    <PonyModel
      textureUri={activeSkinTexture}
      ponyParameters={activePony.skin}
    />
  );
}
