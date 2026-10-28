import { Canvas, useThree, type CanvasProps } from "@react-three/fiber";
import { forwardRef, useEffect, useRef, type MutableRefObject } from "react";
import type CameraControls from "camera-controls";
import type { WebGLRenderer } from "three";
import { normalizeAntialiasing, type AntialiasingMode } from "../antialiasing.js";
import { SmaaPipeline } from "./SmaaPipeline.js";

type SavedView = { renderer: WebGLRenderer; key: string; controls: string };

/** WebGL context attributes are immutable; retain the view across an AA rebuild. */
function KeepView({
  saved,
  viewKey,
}: {
  saved: MutableRefObject<SavedView | null>;
  viewKey: string;
}) {
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const renderer = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const previous = useRef<SavedView | null | undefined>(undefined);
  const restored = useRef(false);
  useEffect(() => {
    if (!controls) return;
    // Read after the old canvas's cleanup, not while rendering its replacement.
    if (previous.current === undefined) previous.current = saved.current;
    let frame: number | undefined;
    const old = previous.current;
    if (!restored.current && old && old.renderer !== renderer && old.key === viewKey) {
      // Run after the new camera's initial framing effects.
      frame = requestAnimationFrame(() => {
        void controls.fromJSON(old.controls, false);
        restored.current = true;
        invalidate();
      });
    } else restored.current = true;
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (restored.current) saved.current = { renderer, key: viewKey, controls: controls.toJSON() };
    };
  }, [controls, renderer, invalidate, saved, viewKey]);
  return null;
}

export const SkinCanvas = forwardRef<
  HTMLCanvasElement,
  Omit<CanvasProps, "gl"> & { antialiasing: AntialiasingMode | boolean; viewKey: string }
>(function SkinCanvas({ antialiasing, viewKey, children, ...props }, ref) {
  const saved = useRef<SavedView | null>(null);
  const mode = normalizeAntialiasing(antialiasing, "off");
  const msaa = mode === "msaa";
  return (
    <Canvas {...props} ref={ref} key={String(msaa)} gl={{ antialias: msaa }}>
      {children}
      {mode === "smaa" ? <SmaaPipeline /> : null}
      <KeepView saved={saved} viewKey={viewKey} />
    </Canvas>
  );
});
