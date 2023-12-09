import { useViewerParameters } from "../ViewerParametersContext";
import SideBySidePonyView from "./SideBySidePonyView";
import SinglePonyView from "./SinglePonyView";

export default function SceneView() {
  const { isSideBySideMode } = useViewerParameters();

  return isSideBySideMode ? <SideBySidePonyView /> : <SinglePonyView />;
}
