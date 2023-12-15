import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { ScenePreferences } from "./scene/preferences/ScenePreferences.js";
import SceneView from "./scene/view/SceneView.js";
import { Perf } from "r3f-perf";
import { useViewerPreferencesStore } from "../store/viewer-preferences.store.js";

export function Viewer() {
  const monitoring = useViewerPreferencesStore(
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
