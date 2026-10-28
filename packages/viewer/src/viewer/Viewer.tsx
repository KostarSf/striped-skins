import { Suspense, useEffect, useRef } from "react";
import { useViewerPreferencesContext } from "../store/viewer-preferences.context.js";
import { ScenePreferences } from "./scene/preferences/ScenePreferences.js";
import SceneView from "./scene/view/SceneView.js";
import { MobileViewProvider } from "./context/index.js";
import { ThreeCanvasProvider } from "./context/canvas-ref.context.js";
import { SkinCanvas } from "./SkinCanvas.js";

export function Viewer() {
  const antialiasing = useViewerPreferencesContext((state) => state.userOptions.antialiasing);
  const camera = useViewerPreferencesContext((state) => state.camera);
  const mode = useViewerPreferencesContext((state) => state.mode);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const preventDefault = (e: TouchEvent) => e.preventDefault();

    canvas.addEventListener("touchmove", preventDefault, {
      passive: false,
    });

    return () => canvas.removeEventListener("touchmove", preventDefault);
  }, [canvasRef, antialiasing]);

  return (
    <MobileViewProvider>
      <SkinCanvas
        ref={canvasRef}
        antialiasing={antialiasing}
        viewKey={JSON.stringify([camera, mode])}
        frameloop="demand"
        flat
      >
        <Suspense fallback={null}>
          <ThreeCanvasProvider canvasRef={canvasRef}>
            <ScenePreferences>
              <SceneView />
            </ScenePreferences>
          </ThreeCanvasProvider>
        </Suspense>
      </SkinCanvas>
    </MobileViewProvider>
  );
}
