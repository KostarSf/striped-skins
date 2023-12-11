import { usePonyPreferencesManager } from "~/api/PonyPreferencesManager";
import { useViewerParameters } from "../ViewerParametersContext";
import PonyModel from "./PonyModel";

export default function SinglePonyView() {
  const { activeSkin, firstSkin, secondSkin, isComparisonMode } =
    useViewerParameters();

  const { firstPony, secondPony } = usePonyPreferencesManager();

  const skin =
    isComparisonMode && activeSkin === "second" ? secondSkin : firstSkin;

  const preferences =
    isComparisonMode && activeSkin === "second" ? secondPony : firstPony;

  return <PonyModel skin={skin} {...preferences} />;
}
