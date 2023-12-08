import {
  CameraControls,
  PerspectiveCamera,
  useTexture,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { RegularPony } from "~/components/pony/RegularPony";
import SkinTextureContext from "./model-components/SkinTextureContext";
import { Suspense } from "react";
import { LoadingScreen } from "./ui/LoadingScreen";

export function SkinViewer({ skinUrl }: { skinUrl: string }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className='w-full h-full'>
        <Canvas>
          <ScenePreferences />
          <PonyModel skinUrl={skinUrl} />
        </Canvas>
      </div>
    </Suspense>
  );
}

function ScenePreferences() {
  return (
    <>
      <CameraControls />
      <PerspectiveCamera makeDefault position={[4, 1, 9]} />

      <ambientLight intensity={0.9} />
      <directionalLight color='white' position={[2, 3, 5]} intensity={1.2} />

      {/* <EffectComposer>
        <SMAA />
      </EffectComposer> */}
    </>
  );
}

function PonyModel({ skinUrl }: { skinUrl: string }) {
  const texture = useTexture(skinUrl);

  return (
    <SkinTextureContext.Provider value={{ texture, textureSize: 64 }}>
      <RegularPony position={[-0.2, 1, 0]} />
    </SkinTextureContext.Provider>
  );
}
