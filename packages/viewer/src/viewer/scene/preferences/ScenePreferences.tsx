import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, type PropsWithChildren } from "react";
import { useViewerPreferencesStore } from "../../../store/viewer-preferences.store";
import { getViewerCanvasWrapper } from "../../utils";

export function ScenePreferences({ children }: PropsWithChildren) {
  const { mode } = useViewerPreferencesStore();

  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const canvas = getViewerCanvasWrapper();
    if (!canvas) return;

    function unfreezeView() {
      invalidate();
    }

    canvas.addEventListener("pointerdown", unfreezeView);
    return () => canvas.removeEventListener("pointerdown", unfreezeView);
  }, []);

  return (
    <>
      {mode === "side-by-side" ? (
        <SideBySideModeScenePreferences />
      ) : (
        <SingleModeScenePreferences />
      )}

      {children}
    </>
  );
}

function SingleModeScenePreferences() {
  return (
    <>
      <CameraControls minDistance={5} maxDistance={20} />
      <PerspectiveCamera makeDefault position={[4, 1, 10]} fov={50}>
        <hemisphereLight
          color='#ffffff'
          groundColor='#666666'
          position={[-30, 24, 3]}
          intensity={4}
        />
      </PerspectiveCamera>
    </>
  );
}

function SideBySideModeScenePreferences() {
  const mobileView = false;

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0, 0, mobileView ? 40 : 25]}
        fov={20}
      />

      <hemisphereLight
        color='#ffffff'
        groundColor='#666666'
        position={[-7, 25, 13]}
        intensity={4}
      />
    </>
  );
}
