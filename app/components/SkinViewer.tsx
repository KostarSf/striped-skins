import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import { RegularPony } from "~/components/pony/RegularPony";

export function SkinViewer({skinUrl}: {skinUrl: string}) {
  return (
    <div className='w-full h-full'>
      <Canvas>
        <CameraControls />
        <PerspectiveCamera makeDefault position={[4, 1, 9]} />

        <ambientLight intensity={0.9} />
        <directionalLight color='white' position={[2, 3, 5]} />

        <EffectComposer>
          <SMAA />
        </EffectComposer>

        <RegularPony skinUrl={skinUrl} position={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}
