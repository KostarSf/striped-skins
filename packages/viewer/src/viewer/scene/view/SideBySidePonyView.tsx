import { usePonyContext } from "../../../store/pony.context.js";
import PonyModel from "./PonyModel.js";
import useSideBySideRotation from "./useSideBySideRotation.js";

export default function SideBySidePonyView() {
  const { firstPony, secondPony } = usePonyContext((state) => state);

  const { pony1ref, pony2ref } = useSideBySideRotation();

  const mobileView = false;

  const x = !mobileView ? -3 : 0;
  const y = mobileView ? 3.5 : 0;

  return (
    <>
      <group ref={pony1ref} position={[x, y, 0]}>
        <PonyModel skin={firstPony.skin} />
      </group>

      <group ref={pony2ref} position={[-x, -y, 0]}>
        <PonyModel skin={secondPony.skin} />
      </group>
    </>
  );
}
