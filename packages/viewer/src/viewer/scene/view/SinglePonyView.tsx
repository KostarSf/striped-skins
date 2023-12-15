import {
  usePonyStore,
  useViewerPreferencesStore,
} from "../../../store/index.js";
import PonyModel from "./PonyModel.js";

export default function SinglePonyView() {
  const { mode } = useViewerPreferencesStore();
  const { firstPony, secondPony } = usePonyStore();

  const activePony = mode === "first-model" ? firstPony : secondPony;

  return <PonyModel skin={activePony.skin} />;
}
