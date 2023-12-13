import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { ScenePreferences } from "./scene/preferences/ScenePreferences";
import SceneView from "./scene/view/SceneView";

export function Viewer() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <div style={{ width: "100%", height: "100%" }}>
        <Canvas id='viewer-canvas' frameloop='demand' flat>
          <ScenePreferences>
            <SceneView />
          </ScenePreferences>
        </Canvas>
      </div>
    </Suspense>
  );
}
