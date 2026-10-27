import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, addAfterEffect, useThree, type ThreeEvent } from "@react-three/fiber";
import { PreviewCamera, type PreviewCameraProps } from "./PreviewCamera.js";
export type { CameraAction } from "./PreviewCamera.js";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import {
  TextureBrushPreview,
  surfaceHit,
  type SurfaceHit,
  type SurfaceHover,
} from "./SurfaceHover.js";
export type { SurfaceHover } from "./SurfaceHover.js";
import { type SkinDocument, type SkinMetadata, type Pixel } from "@striped-skins/api";
import { type BodySize, type PreviewSettings, type MotionLayer } from "@striped-skins/models";
import { GeneratedPony } from "../models/GeneratedPony.js";
import { GroundGrid } from "./GroundGrid.js";
import { PreviewLighting } from "./PreviewLighting.js";
import type { ModelShading } from "../models/SkinMaterial.js";
export type PreviewStats = {
  calls: number;
  geometries: number;
  textures: number;
  triangles: number;
};
export type PonyPreviewProps = Partial<Omit<PreviewCameraProps, "painting" | "comparison">> & {
  antialiasing?: boolean;
  groundGrid?: boolean;
  showUV?: boolean;
  shading?: ModelShading;
  comparison?: {
    document: SkinDocument;
    preview?: PreviewSettings;
    overrides?: Partial<SkinMetadata>;
  };
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
  onHover?: (hit: SurfaceHover | null) => void;
  brushPreview?: boolean;
  textureHover?: { x: number; y: number } | null;
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
  const invalidate = useThree((s) => s.invalidate);
  const invalidateComposer = useCallback(() => invalidate(), [invalidate]);
  useEffect(() => {
    invalidate();
  }, [props.antialiasing, invalidate]);
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
  const [hover, setHover] = useState<SurfaceHit | null>(null);
  const currentHover = useRef<SurfaceHit | null>(null);
  const onHover = props.onHover;
  const updateHover = useCallback(
    (hit: SurfaceHit | null) => {
      const old = currentHover.current;
      if (
        old?.mesh === hit?.mesh &&
        old?.surface === hit?.surface &&
        old?.x === hit?.x &&
        old?.y === hit?.y
      )
        return;
      currentHover.current = hit;
      setHover(hit);
      onHover?.(
        hit ? { x: hit.x, y: hit.y, part: hit.part, surface: hit.surface, uv: hit.uv } : null,
      );
    },
    [onHover],
  );
  const overrideKey = JSON.stringify(props.overrides);
  useEffect(() => {
    updateHover(null);
  }, [skinDocument, painting, activePart, props.hidden, props.preview, overrideKey, updateHover]);
  useEffect(() => {
    const clear = () => updateHover(null);
    gl.domElement.addEventListener("pointerleave", clear);
    window.addEventListener("blur", clear);
    return () => {
      gl.domElement.removeEventListener("pointerleave", clear);
      window.removeEventListener("blur", clear);
      onHover?.(null);
    };
  }, [gl, updateHover, onHover]);
  const paint = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const hit = surfaceHit(event, skinDocument, activePart);
    updateHover(hit);
    if (!hit) {
      skinDocument.breakStroke();
      return;
    }
    if (onSample) {
      onSample(skinDocument.readPixel(hit.x, hit.y));
      return;
    }
    skinDocument.paint(hit.x, hit.y, color, hit.surface, brushSize, hit.bounds);
    onPaint?.({ x: hit.x, y: hit.y, part: hit.part });
  };
  const end = () => {
    if (dragging.current) {
      dragging.current = false;
      skinDocument.endStroke();
    }
  };
  const brushHover = props.textureHover ?? (painting ? hover : null);
  const hoverClip = props.textureHover ? undefined : hover?.bounds;
  const contextKey = JSON.stringify([
    skinDocument.id,
    props.fitKey,
    overrideKey,
    props.preview,
    [...props.hidden],
  ]);
  return (
    <>
      <PreviewCamera
        painting={painting}
        cameraAction={props.cameraAction}
        fitKey={props.fitKey}
        projection={props.projection}
        smoothCamera={props.smoothCamera}
        onScale={props.onScale}
        comparison={!!props.comparison}
      />
      {props.antialiasing ? (
        <EffectComposer ref={invalidateComposer} multisampling={0}>
          <SMAA />
        </EffectComposer>
      ) : null}
      {props.groundGrid ? <GroundGrid contextKey={contextKey} /> : null}
      {props.shading === "studio" ? <PreviewLighting /> : null}
      {brushHover && props.brushPreview !== false && !onSample && color[3] > 0 ? (
        <TextureBrushPreview
          pixel={brushHover}
          document={skinDocument}
          color={color}
          size={brushSize}
          activePart={null}
          clip={hoverClip}
          contextKey={contextKey}
        />
      ) : null}
      <group
        onPointerOut={() => updateHover(null)}
        onPointerDown={(e) => {
          if (!painting || e.button !== 0) return;
          dragging.current = true;
          skinDocument.beginStroke();
          (e.target as Element).setPointerCapture(e.pointerId);
          paint(e);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (dragging.current) paint(e);
          else updateHover(e.buttons ? null : surfaceHit(e, skinDocument, activePart));
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
        <group position={props.comparison ? [-3, 0, 0] : [0, 0, 0]}>
          <GeneratedPony {...props} animate={!painting && props.animate} paused={painting} />
        </group>
        {props.comparison ? (
          <group position={[3, 0, 0]}>
            <GeneratedPony
              document={props.comparison.document}
              preview={props.comparison.preview}
              overrides={props.comparison.overrides}
              animate={props.animate}
              showUV={props.showUV}
              shading={props.shading}
            />
          </group>
        ) : null}
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
      // SMAA renders without tone mapping. Keep direct rendering identical.
      flat
      aria-label="3D pony preview"
    >
      <ModelScene {...props} />
    </Canvas>
  );
}
export function EarthponyPreview({ size, slim, ...props }: EarthponyPreviewProps) {
  return <PonyPreview {...props} overrides={{ race: "EARTH", size, slim }} />;
}
