import { useViewerParameters } from "../ViewerParametersContext";
import PonyModel from "./PonyModel";

export default function SinglePonyView() {
  const { activeSkin, firstSkin, secondSkin, isComparisonMode } =
    useViewerParameters();

  const skin =
    isComparisonMode && activeSkin === "second" ? secondSkin : firstSkin;

  return <PonyModel skin={skin} />;
}
