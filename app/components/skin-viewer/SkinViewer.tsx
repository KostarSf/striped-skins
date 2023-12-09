import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Suspense } from "react";
import { LoadingScreen } from "../ui/LoadingScreen";
import { ScenePreferences } from "./scene-preferences/ScenePreferences";
import SceneView from "./scene-view/SceneView";

export function SkinViewer() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className='w-full h-full'>
        <Canvas
          id="viewer-canvas"
          frameloop='demand'
        >
          {/* <Perf position='bottom-right' /> */}

          <ScenePreferences />
          <SceneView />
        </Canvas>
      </div>
    </Suspense>
  );
}
