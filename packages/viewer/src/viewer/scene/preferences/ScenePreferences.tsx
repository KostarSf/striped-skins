import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import { useEffect, type PropsWithChildren } from "react";
import { getViewerCanvasWrapper } from "../../utils/index.js";
import { useViewerPreferencesContext } from "../../../store/index.js";
import { useIsMobileView } from "../../context/MobileViewContext.js";

export function ScenePreferences({ children }: PropsWithChildren) {
  const { mode } = useViewerPreferencesContext((state) => state);

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

  const smaa = true;

  return (
    <>
      {mode === "side-by-side" ? (
        <SideBySideModeScenePreferences />
      ) : (
        <SingleModeScenePreferences />
      )}

      <EffectComposer multisampling={0} enabled={smaa}>
        <SMAA />
      </EffectComposer>

      {children}
    </>
  );
}

function SingleModeScenePreferences() {
  const camera = useViewerPreferencesContext((state) => state.camera);

  return (
    <>
      {!camera.static && (
        <CameraControls
          minDistance={camera.minDistance}
          maxDistance={camera.maxDistance}
          distance={camera.distance}
        />
      )}
      <PerspectiveCamera
        makeDefault
        position={camera.position}
        rotation={camera.rotation}
        fov={camera.fov}
      >
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
  const mobileView = useIsMobileView();

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
