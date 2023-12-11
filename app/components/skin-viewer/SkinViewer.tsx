import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { LoadingScreen } from "../ui/LoadingScreen";
import { ScenePreferences } from "./scene-preferences/ScenePreferences";
import SceneView from "./scene-view/SceneView";

export default function SkinViewer() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className='w-full h-full'>
        <Canvas
          id='viewer-canvas'
          frameloop='demand'
          flat
        >
          {/* <Perf position='bottom-right' /> */}

          <ScenePreferences>
            <SceneView />
          </ScenePreferences>
        </Canvas>
      </div>
    </Suspense>
  );
}
