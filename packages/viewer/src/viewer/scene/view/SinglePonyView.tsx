import {
  usePonyStore,
  useViewerPreferencesStore,
} from "../../../store/index.js";
import PonyModel from "./PonyModel.js";

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
