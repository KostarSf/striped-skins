import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import { useEffect, type PropsWithChildren } from "react";
import { useViewerPreferencesContext } from "../../../store/index.js";
import { useIsMobileView } from "../../context/mobile-view.context.js";
import { useThreeCanvas } from "../../context/canvas-ref.context.js";

export function ScenePreferences({ children }: PropsWithChildren) {
  const { mode, userOptions } = useViewerPreferencesContext((state) => state);

  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThreeCanvas();

  useEffect(() => {
    if (!canvas) return;

    const unfreezeView = () => invalidate();

    canvas.addEventListener("pointerdown", unfreezeView);
    return () => canvas.removeEventListener("pointerdown", unfreezeView);
  }, [canvas]);

  const smaa = userOptions.antialiasing;

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
  const { camera, userOptions } = useViewerPreferencesContext((state) => state);

  const smoothTime = userOptions.smoothCamera ? 0.1 : 0

  return (
    <>
      {!camera.static && (
        <CameraControls
          minDistance={camera.minDistance}
          maxDistance={camera.maxDistance}
          distance={camera.distance}
          smoothTime={smoothTime}
          draggingSmoothTime={smoothTime}
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
