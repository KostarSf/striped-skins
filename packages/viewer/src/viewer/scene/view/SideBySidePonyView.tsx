import { usePonyContext } from "../../../store/pony.context.js";
import { useIsMobileView } from "../../context/mobile-view.context.js";
import { PonyModel } from "../../models/pony/PonyModel.js";
import useSideBySideRotation from "./useSideBySideRotation.js";

export default function SideBySidePonyView() {
  const { firstPony, secondPony } = usePonyContext((state) => state);

  const { pony1ref, pony2ref } = useSideBySideRotation();

  const mobileView = useIsMobileView();

  const x = !mobileView ? -3 : 0;
  const y = mobileView ? 3 : 0;

  const scale = mobileView ? 0.8 : 1;

  return (
    <>
      <PonyModel
        skin={firstPony.skin}
        ref={pony1ref}
        position={[x, y, 0]}
        scale={[scale, scale, scale]}
      />

      <PonyModel
        skin={secondPony.skin}
        ref={pony2ref}
        position={[-x, -y, 0]}
        scale={[scale, scale, scale]}
      />
    </>
  );
}
