import { usePonyStore } from "../../../store/pony.store";
import { useViewerPreferencesStore } from "../../../store/viewer-preferences.store";
import PonyModel from "./PonyModel";
import useSideBySideRotation from "./useSideBySideRotation";

export default function SideBySidePonyView() {
  const { firstSkinUrl, secondSkinUrl, defaultSkinUrl } = useViewerPreferencesStore()
  const { firstPony, secondPony } = usePonyStore()

  const { pony1ref, pony2ref } = useSideBySideRotation();

  const mobileView = false

  const x = !mobileView ? -3 : 0;
  const y = mobileView ? 3.5 : 0;

  return (
    <>
      <group ref={pony1ref} position={[x, y, 0]}>
        <PonyModel
          textureUri={firstSkinUrl || defaultSkinUrl}
          ponyParameters={firstPony.skin}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          {...firstPony}
        />
      </group>

      <group ref={pony2ref} position={[-x, -y, 0]}>
        <PonyModel
          textureUri={secondSkinUrl || defaultSkinUrl}
          ponyParameters={secondPony.skin}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          {...secondPony}
        />
      </group>
    </>
  );
}
