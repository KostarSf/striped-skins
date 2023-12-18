import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Suspense, useEffect, useRef } from "react";
import { useViewerPreferencesContext } from "../store/viewer-preferences.context.js";
import { ScenePreferences } from "./scene/preferences/ScenePreferences.js";
import SceneView from "./scene/view/SceneView.js";
import { MobileViewProvider } from "./context/index.js";
import { ThreeCanvasProvider } from "./context/canvas-ref.context.js";

export function Viewer() {
  const monitoring = useViewerPreferencesContext(
    (state) => state.performanceMonitor
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const preventDefault = (e: TouchEvent) => e.preventDefault();

    canvas.addEventListener("touchmove", preventDefault, {
      passive: false,
    });

    return () => canvas.removeEventListener("touchmove", preventDefault);
  }, [canvasRef]);

  return (
    <MobileViewProvider>
      <Canvas
        ref={canvasRef}
        gl={{ antialias: false }}
        frameloop={monitoring ? "always" : "demand"}
        flat
      >
        <Suspense fallback={null}>
          <ThreeCanvasProvider canvasRef={canvasRef}>
            {monitoring && <Perf position='bottom-right' />}
            <ScenePreferences>
              <SceneView />
            </ScenePreferences>
          </ThreeCanvasProvider>
        </Suspense>
      </Canvas>
    </MobileViewProvider>
  );
}
