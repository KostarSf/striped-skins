import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Suspense, useEffect, useRef } from "react";
import { useViewerPreferencesContext } from "../store/viewer-preferences.context.js";
import { ScenePreferences } from "./scene/preferences/ScenePreferences.js";
import SceneView from "./scene/view/SceneView.js";
import { MobileViewProvider } from "./context/MobileViewContext.js";

export function Viewer() {
  const monitoring = useViewerPreferencesContext(
    (state) => state.performanceMonitor
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    const preventDefault = (e: TouchEvent) => e.preventDefault();

    canvas?.addEventListener("touchmove", preventDefault, {
      passive: false,
    });

    return () => canvas?.removeEventListener("touchmove", preventDefault);
  }, []);

  return (
    <MobileViewProvider>
      <Canvas
        gl={{ antialias: false }}
        id='viewer-canvas'
        frameloop={monitoring ? "always" : "demand"}
        flat
        ref={canvasRef}
      >
        <Suspense fallback={null}>
          {monitoring && <Perf position='bottom-right' />}
          <ScenePreferences>
            <SceneView />
          </ScenePreferences>
        </Suspense>
      </Canvas>
    </MobileViewProvider>
  );
}
