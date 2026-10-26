import { useEffect, useRef } from "react";
import { Canvas, addAfterEffect, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { Mesh } from "three";
import { uvToPixel, type SkinDocument, type SkinMetadata, type Pixel } from "@striped-skins/api";
import { type BodySize, type PreviewSettings, type MotionLayer } from "@striped-skins/models";
import { GeneratedPony } from "../models/GeneratedPony.js";
export type PreviewStats = {
  calls: number;
  geometries: number;
  textures: number;
  triangles: number;
};
export type PonyPreviewProps = {
  document: SkinDocument;
  overrides?: Partial<SkinMetadata>;
  hidden: ReadonlySet<string>;
  painting: boolean;
  color: Pixel;
  activePart: string | null;
  preview?: PreviewSettings;
  motionLayers?: readonly MotionLayer[];
  brushSize?: number;
  animate?: boolean;
  onStats?: (stats: PreviewStats) => void;
  onPaint?: (pixel: { x: number; y: number; part: string }) => void;
  onSample?: (pixel: Pixel) => void;
};
export type EarthponyPreviewProps = Omit<PonyPreviewProps, "overrides"> & {
  size: BodySize;
  slim: boolean;
};
function ModelScene(props: PonyPreviewProps) {
  const {
    document: skinDocument,
    painting,
    color,
    activePart,
    onStats,
    onPaint,
    brushSize = 1,
    onSample,
  } = props;
  const gl = useThree((s) => s.gl),
    dragging = useRef(false);
  useEffect(() => {
    if (!onStats) return;
    return addAfterEffect(() =>
      onStats({
        calls: gl.info.render.calls,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        triangles: gl.info.render.triangles,
      }),
    );
  }, [onStats, gl]);
  useEffect(() => () => skinDocument.cancelStroke(), [skinDocument]);
  const paint = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    for (const hit of event.intersections) {
      if (
        !(hit.object instanceof Mesh) ||
        !hit.object.visible ||
        !hit.uv ||
        !hit.object.userData.editable
      )
        continue;
      const part = hit.object.userData.partId as string;
      if (!part || (activePart && part !== activePart)) continue;
      const pixel = uvToPixel(hit.uv.x, hit.uv.y, skinDocument.width, skinDocument.height);
      if (!activePart && skinDocument.readPixel(pixel.x, pixel.y)[3] < 26) continue;
      if (onSample) {
        onSample(skinDocument.readPixel(pixel.x, pixel.y));
        return;
      }
      const surface = hit.object.userData.surfaceIds[
        Math.floor((hit.faceIndex ?? 0) / 2)
      ] as string;
      const uv = hit.object.userData.surfaceUVs[Math.floor((hit.faceIndex ?? 0) / 2)] as number[];
      const xs = uv.filter((_, i) => i % 2 === 0).map((u) => u * skinDocument.width);
      const ys = uv.filter((_, i) => i % 2 === 1).map((v) => (1 - v) * skinDocument.height);
      skinDocument.paint(pixel.x, pixel.y, color, surface, brushSize, {
        minX: Math.floor(Math.min(...xs)),
        maxX: Math.ceil(Math.max(...xs)) - 1,
        minY: Math.floor(Math.min(...ys)),
        maxY: Math.ceil(Math.max(...ys)) - 1,
      });
      onPaint?.({ ...pixel, part });
      return;
    }
    skinDocument.breakStroke();
  };
  const end = () => {
    if (dragging.current) {
      dragging.current = false;
      skinDocument.endStroke();
    }
  };
  return (
    <>
      <CameraControls makeDefault enabled={!painting} minDistance={5} maxDistance={35} />
      <group
        onPointerDown={(e) => {
          if (!painting || e.button !== 0) return;
          dragging.current = true;
          skinDocument.beginStroke();
          (e.target as Element).setPointerCapture(e.pointerId);
          paint(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) paint(e);
        }}
        onPointerUp={(e) => {
          end();
          if ((e.target as Element).hasPointerCapture(e.pointerId))
            (e.target as Element).releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
          skinDocument.cancelStroke();
        }}
        onLostPointerCapture={end}
      >
        <GeneratedPony {...props} animate={!painting && props.animate} paused={painting} />
      </group>
    </>
  );
}
export function PonyPreview(props: PonyPreviewProps) {
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [8, 4, 12], fov: 42 }}
      gl={{ antialias: false }}
      aria-label="3D pony preview"
    >
      <ModelScene {...props} />
    </Canvas>
  );
}
export function EarthponyPreview({ size, slim, ...props }: EarthponyPreviewProps) {
  return <PonyPreview {...props} overrides={{ race: "EARTH", size, slim }} />;
}
