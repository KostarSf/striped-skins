import { useEffect, useRef } from "react";
import { CameraControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import {
  Box3,
  Mesh,
  Matrix4,
  Vector3,
  PerspectiveCamera as ThreePerspectiveCamera,
  OrthographicCamera as ThreeOrthographicCamera,
} from "three";
import { useThree } from "@react-three/fiber";

export type CameraAction = {
  id: number;
  kind: "reset" | "in" | "out" | "front" | "back" | "left" | "right";
};
export type PreviewCameraProps = {
  cameraAction?: CameraAction;
  fitKey?: string;
  projection?: "perspective" | "orthographic";
  smoothCamera?: boolean;
  painting: boolean;
  comparison?: boolean;
};
export function PreviewCamera({
  cameraAction,
  fitKey,
  projection = "perspective",
  smoothCamera = true,
  painting,
  comparison,
}: PreviewCameraProps) {
  const controls = useRef<CameraControls>(null);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const activeCamera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const distance = comparison ? 21 : 11.5;
  const fit = () => {
    const box = new Box3();
    scene.updateMatrixWorld(true);
    scene.traverse((object) => {
      if (!(object instanceof Mesh) || !object.visible || !object.userData.partId) return;
      object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox)
        box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
    });
    const c = controls.current;
    if (c && !box.isEmpty()) {
      const center = box.getCenter(new Vector3());
      c.camera.updateMatrixWorld(true);
      const view = new Matrix4()
          .lookAt(c.getPosition(new Vector3(), true), c.getTarget(new Vector3(), true), c.camera.up)
          .invert(),
        projected = new Box3();
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z])
            projected.expandByPoint(new Vector3(x, y, z).sub(center).applyMatrix4(view));
      const extent = projected.getSize(new Vector3());
      void c.moveTo(center.x, center.y, center.z, false);
      if (c.camera instanceof ThreePerspectiveCamera)
        void c.dollyTo(
          c.getDistanceToFitBox(extent.x + 0.9, extent.y + 1.2, extent.z, false),
          false,
        );
      else if (c.camera instanceof ThreeOrthographicCamera)
        void c.zoomTo(
          Math.min(
            (c.camera.right - c.camera.left) / (extent.x + 0.9),
            (c.camera.top - c.camera.bottom) / (extent.y + 1.2),
          ),
          false,
        );
    }
    invalidate();
  };
  const fitRef = useRef(fit);
  fitRef.current = fit;
  useEffect(() => {
    if (!fitKey) return;
    const frame = requestAnimationFrame(() => fitRef.current());
    return () => cancelAnimationFrame(frame);
  }, [fitKey, projection, comparison, size.width, size.height]);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const kind = cameraAction?.kind ?? "reset";
    if (kind === "in" || kind === "out") {
      if (projection === "orthographic")
        c.zoomTo(c.camera.zoom * (kind === "in" ? 1.2 : 1 / 1.2), smoothCamera);
      else c.dolly((kind === "in" ? 1 : -1) * c.distance * 0.18, smoothCamera);
    } else {
      const positions = {
        reset: [distance * 0.53, distance * 0.27, distance * 0.8],
        front: [0, 0, distance],
        back: [0, 0, -distance],
        left: [distance, 0, 0],
        right: [-distance, 0, 0],
      } as const;
      const [x, y, z] = positions[kind];
      c.setLookAt(x, y, z, 0, 0, 0, smoothCamera);
      if (fitKey) requestAnimationFrame(() => fitRef.current());
      else if (projection === "orthographic") c.zoomTo(50, smoothCamera);
    }
    invalidate();
  }, [
    cameraAction,
    activeCamera,
    projection,
    comparison,
    distance,
    smoothCamera,
    invalidate,
    fitKey,
  ]);
  return (
    <>
      {projection === "orthographic" ? (
        <OrthographicCamera
          makeDefault
          position={[distance * 0.53, distance * 0.27, distance * 0.8]}
          zoom={Math.min(size.width, size.height) / (comparison ? 15 : 10)}
          near={0.1}
          far={200}
        />
      ) : (
        <PerspectiveCamera
          makeDefault
          position={[distance * 0.53, distance * 0.27, distance * 0.8]}
          fov={42}
        />
      )}
      <CameraControls
        ref={controls}
        makeDefault
        enabled={!painting}
        minDistance={5}
        maxDistance={45}
        smoothTime={smoothCamera ? 0.1 : 0}
        draggingSmoothTime={smoothCamera ? 0.1 : 0}
      />
    </>
  );
}
