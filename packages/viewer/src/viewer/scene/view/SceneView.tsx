import { useViewerPreferencesStore } from "../../../store/viewer-preferences.store";
import SideBySidePonyView from "./SideBySidePonyView";
import SinglePonyView from "./SinglePonyView";

export default function SceneView() {
  const { mode } = useViewerPreferencesStore()

  return mode === 'side-by-side' ? <SideBySidePonyView /> : <SinglePonyView />;
}
