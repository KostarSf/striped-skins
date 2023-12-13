import { useViewerPreferencesStore } from "../../../store/index.js";
import SideBySidePonyView from "./SideBySidePonyView.js";
import SinglePonyView from "./SinglePonyView.js";

export default function SceneView() {
  const { mode } = useViewerPreferencesStore()

  return mode === 'side-by-side' ? <SideBySidePonyView /> : <SinglePonyView />;
}
