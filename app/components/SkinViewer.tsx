import {
  CameraControls,
  PerspectiveCamera,
  useTexture,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { RegularPony } from "~/components/pony/RegularPony";
import SkinTextureContext from "./model-components/SkinTextureContext";
import { Suspense, useEffect, useState } from "react";
import { LoadingScreen } from "./ui/LoadingScreen";
import type { XyzArray } from "./model-components/types";

type SkinViewerProps = {
  skinUrl: string;
  compareSkinUrl: string | null;
};

export function SkinViewer({ skinUrl, compareSkinUrl }: SkinViewerProps) {
  const [globalRotation, setGlobalRotation] = useState<XyzArray>([0, 0, 0]);

  const [verticalScreen, setVerticalScreen] = useState(false);

  useEffect(() => {
    setVerticalScreen(window.screen.height > window.screen.width);
  }, []);

  const [rotatedByPointer, setRotatedByPointer] = useState(false);

  const pointerDownHandle = () => {
    if (!compareSkinUrl) return;
    setRotatedByPointer(true);
  }
  const pointerUpHandle = () => setRotatedByPointer(false);

  const pointerMoveHandle = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rotatedByPointer || !setGlobalRotation) return;

    setGlobalRotation([
      globalRotation[0] + e.movementY / 200,
      globalRotation[1] + e.movementX / 100,
      globalRotation[2],
    ]);
  };

  const x = compareSkinUrl && !verticalScreen ? -3.5 : 0;
  const y = compareSkinUrl && verticalScreen ? 3.5 : 0;

  const rotationOffset = compareSkinUrl && !verticalScreen ? 0.15 : 0;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className='w-full h-full'>
        <Canvas
          onPointerDown={pointerDownHandle}
          onPointerUp={pointerUpHandle}
          onPointerMove={pointerMoveHandle}
        >
          <ScenePreferences
            disableCameraControlls={!!compareSkinUrl}
            verticalScreen={verticalScreen}
          />

          <PonyModel
            skinUrl={skinUrl}
            position={[x, y, 0]}
            rotation={globalRotation}
            rotationOffset={rotationOffset}
          />
          {compareSkinUrl && (
            <PonyModel
              skinUrl={compareSkinUrl}
              position={[-x, -y, 0]}
              rotation={globalRotation}
              rotationOffset={-rotationOffset}
            />
          )}
        </Canvas>
      </div>
    </Suspense>
  );
}

function ScenePreferences({
  disableCameraControlls,
  verticalScreen,
}: {
  disableCameraControlls?: boolean;
  verticalScreen?: boolean;
}) {
  const cameraPosition: XyzArray = disableCameraControlls
    ? [0, 0, verticalScreen ? 40 : 25]
    : [4, 1, 9];

  return (
    <>
      {!disableCameraControlls && <CameraControls />}
      <PerspectiveCamera
        makeDefault
        position={cameraPosition}
        fov={disableCameraControlls ? 20 : 50}
      />

      <ambientLight intensity={0.9} />
      <directionalLight color='white' position={[2, 3, 5]} intensity={1.2} />

      {/* <EffectComposer>
        <SMAA />
      </EffectComposer> */}
    </>
  );
}

type PonyModelProps = {
  skinUrl: string;
  position: XyzArray;
  rotation: XyzArray;
  rotationOffset: number;
};

function PonyModel({
  skinUrl,
  position,
  rotation,
  rotationOffset,
}: PonyModelProps) {
  const texture = useTexture(skinUrl);

  return (
    <group
      position={position}
      rotation={[rotation[0], rotation[1] + rotationOffset, rotation[2]]}
    >
      <SkinTextureContext.Provider value={{ texture, textureSize: 64 }}>
        <RegularPony position={[-0.2, 1, 1.5]} />
      </SkinTextureContext.Provider>
    </group>
  );
}
