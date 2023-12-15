import {
  usePonyStore,
  useViewerPreferencesStore,
} from "../../../store/index.js";
import PonyModel from "./PonyModel.js";

export default function SinglePonyView() {
  const { mode } = useViewerPreferencesStore();
  const { firstPony, secondPony } = usePonyStore();

  const activePony = mode === "second-model" ? secondPony : firstPony;

  return <PonyModel skin={activePony.skin} />;
}
