import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  CameraControls,
  CameraControlsImpl,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
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
export type CameraState = { position: number[]; target: number[]; zoom: number };
export type PreviewCameraProps = {
  cameraAction?: CameraAction;
  fitKey?: string;
  projection?: "perspective" | "orthographic";
  smoothCamera?: boolean;
  painting: boolean;
  comparison?: boolean;
  onScale?: (scale: number) => void;
  cameraState?: CameraState | null;
  onCameraState?: (state: CameraState) => void;
};
export function PreviewCamera({
  cameraAction,
  fitKey,
  projection = "perspective",
  smoothCamera = true,
  painting,
  comparison,
  onScale,
  cameraState,
  onCameraState,
}: PreviewCameraProps) {
  const controls = useRef<CameraControls>(null);
  const initialState = useRef(cameraState);
  const restored = useRef(false);
  const interacted = useRef(false);
  if (cameraAction?.id) interacted.current = true;
  const cameraListener = useRef(onCameraState);
  cameraListener.current = onCameraState;
  const reportCamera = useCallback(() => {
    const c = controls.current;
    if (!c || !interacted.current) return;
    cameraListener.current?.({
      position: c.getPosition(new Vector3(), true).toArray(),
      target: c.getTarget(new Vector3(), true).toArray(),
      zoom: c.camera.zoom,
    });
  }, []);
  const referenceScale = useRef({ distance: 0, zoom: 0 });
  const scaleListener = useRef(onScale);
  scaleListener.current = onScale;
  const reportScale = useCallback(() => {
    const c = controls.current;
    if (!c) return;
    const base = referenceScale.current;
    base.distance ||= c.distance;
    base.zoom ||= c.camera.zoom;
    scaleListener.current?.(
      c.camera instanceof ThreeOrthographicCamera
        ? c.camera.zoom / base.zoom
        : (base.distance / c.distance) * (c.camera.zoom / base.zoom),
    );
  }, []);
  const smooth = useRef(smoothCamera);
  smooth.current = smoothCamera;
  const mouseButtons = useMemo(
    () => ({
      left: painting ? CameraControlsImpl.ACTION.NONE : CameraControlsImpl.ACTION.ROTATE,
      middle: CameraControlsImpl.ACTION.ROTATE,
      right: CameraControlsImpl.ACTION.TRUCK,
      wheel:
        projection === "orthographic"
          ? CameraControlsImpl.ACTION.ZOOM
          : CameraControlsImpl.ACTION.DOLLY,
    }),
    [painting, projection],
  );
  const touches = useMemo(
    () => ({
      one: painting ? CameraControlsImpl.ACTION.NONE : CameraControlsImpl.ACTION.TOUCH_ROTATE,
      two:
        projection === "orthographic"
          ? CameraControlsImpl.ACTION.TOUCH_ZOOM_TRUCK
          : CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK,
      three: CameraControlsImpl.ACTION.TOUCH_TRUCK,
    }),
    [painting, projection],
  );
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const activeCamera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const distance = comparison ? 21 : 11.5;
  const fit = () => {
    const saved = initialState.current,
      c0 = controls.current;
    if (!restored.current && saved && c0) {
      restored.current = true;
      void c0.setLookAt(
        saved.position[0],
        saved.position[1],
        saved.position[2],
        saved.target[0],
        saved.target[1],
        saved.target[2],
        false,
      );
      void c0.zoomTo(saved.zoom, false);
      reportScale();
      invalidate();
      return;
    }
    restored.current = true;
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
      if (c.camera instanceof ThreePerspectiveCamera) {
        const fittedDistance = c.getDistanceToFitBox(
          extent.x + 0.9,
          extent.y + 1.2,
          extent.z,
          false,
        );
        referenceScale.current.distance = fittedDistance;
        referenceScale.current.zoom = c.camera.zoom;
        void c.dollyTo(fittedDistance, false);
      } else if (c.camera instanceof ThreeOrthographicCamera) {
        const fittedZoom = Math.min(
          (c.camera.right - c.camera.left) / (extent.x + 0.9),
          (c.camera.top - c.camera.bottom) / (extent.y + 1.2),
        );
        referenceScale.current.zoom = fittedZoom;
        void c.zoomTo(fittedZoom, false);
      }
      reportScale();
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
    const smoothCamera = smooth.current;
    if (initialState.current && !cameraAction?.id) return;
    const kind = cameraAction?.kind ?? "reset";
    let active = true;
    const finish = () => {
      if (active) {
        reportCamera();
        invalidate();
      }
    };
    if (kind === "in" || kind === "out") {
      const movement =
        projection === "orthographic"
          ? c.zoomTo(c.camera.zoom * (kind === "in" ? 1.2 : 1 / 1.2), smoothCamera)
          : c.dolly((kind === "in" ? 1 : -1) * c.distance * 0.18, smoothCamera);
      void movement.then(finish);
    } else {
      const positions = {
        reset: [distance * 0.53, distance * 0.27, distance * 0.8],
        front: [0, 0, distance],
        back: [0, 0, -distance],
        left: [distance, 0, 0],
        right: [-distance, 0, 0],
      } as const;
      const [x, y, z] = positions[kind];
      void c.setLookAt(x, y, z, 0, 0, 0, smoothCamera).then(() => {
        if (!active) return;
        if (fitKey) fitRef.current();
        else if (projection === "orthographic") void c.zoomTo(50, smoothCamera).then(finish);
        finish();
      });
    }
    invalidate();
    return () => {
      active = false;
    };
  }, [
    cameraAction,
    activeCamera,
    projection,
    comparison,
    distance,
    invalidate,
    fitKey,
    reportCamera,
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
        onUpdate={reportScale}
        onRest={reportCamera}
        onControlStart={() => {
          interacted.current = true;
        }}
        onControlEnd={reportCamera}
        mouseButtons={mouseButtons}
        touches={touches}
        minDistance={5}
        maxDistance={45}
        smoothTime={smoothCamera ? 0.1 : 0}
        draggingSmoothTime={smoothCamera ? 0.1 : 0}
      />
    </>
  );
}
