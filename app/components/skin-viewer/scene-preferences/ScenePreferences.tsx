import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import type { PropsWithChildren } from "react";
import { useViewerParameters } from "../ViewerParametersContext";

export function ScenePreferences({ children }: PropsWithChildren) {
  const { isSideBySideMode } = useViewerParameters();

  return (
    <>
      {isSideBySideMode ? (
        <SideBySideModeScenePreferences />
      ) : (
        <SingleModeScenePreferences />
      )}

      <hemisphereLight
        color='#ffffff'
        groundColor='#666666'
        position={[-7, 25, 13]}
        intensity={4}
      />

      {children}
    </>
  );
}

function SingleModeScenePreferences() {
  return (
    <>
      <CameraControls />
      <PerspectiveCamera makeDefault position={[4, 1, 10]} fov={50} />
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
