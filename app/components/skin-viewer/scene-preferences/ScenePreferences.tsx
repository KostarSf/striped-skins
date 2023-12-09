import { useViewerParameters } from "../ViewerParametersContext";
import { CameraControls, PerspectiveCamera } from "@react-three/drei";

export function ScenePreferences() {
  const { isSideBySideMode } = useViewerParameters();

  return (
    <>
      {isSideBySideMode ? (
        <SideBySideModeScenePreferences />
      ) : (
        <SingleModeScenePreferences />
      )}

      <ambientLight intensity={0.9} />
      <directionalLight color='white' position={[2, 3, 5]} intensity={1.2} />

      {/* <EffectComposer>
        <SMAA />
      </EffectComposer> */}
    </>
  );
}

function SingleModeScenePreferences() {
  return (
    <>
      <CameraControls />
      <PerspectiveCamera
        makeDefault
        position={[4, 1, 10]}
        fov={50}
      />
    </>
  );
}


function SideBySideModeScenePreferences() {
  const { mobileView } = useViewerParameters();

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0, 0, mobileView ? 40 : 25]}
        fov={20}
      />
    </>
  );
}
