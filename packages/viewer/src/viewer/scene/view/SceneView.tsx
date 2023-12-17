import { useViewerPreferencesContext } from "../../../store/viewer-preferences.context.js";
import SideBySidePonyView from "./SideBySidePonyView.js";
import SinglePonyView from "./SinglePonyView.js";

export default function SceneView() {
  const mode = useViewerPreferencesContext((state) => state.mode);

  return mode === "side-by-side" ? <SideBySidePonyView /> : <SinglePonyView />;
}
