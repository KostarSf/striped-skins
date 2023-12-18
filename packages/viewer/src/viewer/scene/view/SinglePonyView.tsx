import {
  usePonyContext,
  useViewerPreferencesContext,
} from "../../../store/index.js";
import { PonyModel } from "../../models/pony/PonyModel.js";

export default function SinglePonyView() {
  const { mode } = useViewerPreferencesContext((state) => state);
  const { firstPony, secondPony } = usePonyContext((state) => state);

  const activePony = mode === "second-model" ? secondPony : firstPony;

  return <PonyModel skin={activePony.skin} />;
}
