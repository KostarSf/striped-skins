import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Suspense } from "react";
import { useViewerPreferencesContext } from "../store/viewer-preferences.context.js";
import { ScenePreferences } from "./scene/preferences/ScenePreferences.js";
import SceneView from "./scene/view/SceneView.js";

export function Viewer() {
  const monitoring = useViewerPreferencesContext(
    (state) => state.performanceMonitor
  );

  return (
    <Canvas
      gl={{ antialias: false }}
      id='viewer-canvas'
      frameloop={monitoring ? "always" : "demand"}
      flat
    >
      <Suspense fallback={null}>
        {monitoring && <Perf position='bottom-right' />}
        <ScenePreferences>
          <SceneView />
        </ScenePreferences>
      </Suspense>
    </Canvas>
  );
}
