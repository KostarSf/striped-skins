import { usePonyPreferencesManager } from "~/api/PonyPreferencesManager";
import { useViewerParameters } from "../ViewerParametersContext";
import PonyModel from "./PonyModel";
import useSideBySideRotation from "./useSideBySideRotation";

export default function SideBySidePonyView() {
  const { mobileView, firstSkin, secondSkin } = useViewerParameters();
  const { firstPony, secondPony } = usePonyPreferencesManager();

  const { pony1ref, pony2ref } = useSideBySideRotation();

  const x = !mobileView ? -3 : 0;
  const y = mobileView ? 3.5 : 0;

  return (
    <>
      <group ref={pony1ref} position={[x, y, 0]}>
        <PonyModel
          skinUrl={firstSkin}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          {...firstPony}
        />
      </group>

      <group ref={pony2ref} position={[-x, -y, 0]}>
        <PonyModel
          skinUrl={secondSkin}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          {...secondPony}
        />
      </group>
    </>
  );
}
