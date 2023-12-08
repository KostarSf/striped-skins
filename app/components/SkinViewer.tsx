import {
  CameraControls,
  PerspectiveCamera,
  useTexture,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import { RegularPony } from "~/components/pony/RegularPony";
import SkinTextureContext from "./model-components/SkinTextureContext";

export function SkinViewer({ skinUrl }: { skinUrl: string }) {
  return (
    <div className='w-full h-full'>
      <Canvas>
        <ScenePreferences />
        <PonyModel skinUrl={skinUrl} />
      </Canvas>
    </div>
  );
}

function ScenePreferences() {
  return (
    <>
      <CameraControls />
      <PerspectiveCamera makeDefault position={[4, 1, 9]} />

      <ambientLight intensity={0.9} />
      <directionalLight color='white' position={[2, 3, 5]} />

      <EffectComposer>
        <SMAA />
      </EffectComposer>
    </>
  );
}

function PonyModel({ skinUrl }: { skinUrl: string }) {
  const texture = useTexture(skinUrl);
  return (
    <SkinTextureContext.Provider value={{ texture, textureSize: 64 }}>
      <RegularPony position={[0, 0, 0]} />
    </SkinTextureContext.Provider>
  );
}
