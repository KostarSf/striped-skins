import { useEffect, useMemo, useState } from "react";
import { createPortal, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  type Object3D,
  SRGBColorSpace,
} from "three";
import { uvToPixel, type Pixel, type SkinDocument, type PaintBounds } from "@striped-skins/api";

/** Shared hit information for the brush preview and the UV inspector. UVs use Three's V axis. */
export type SurfaceHover = {
  x: number;
  y: number;
  part: string;
  surface: string;
  uv: readonly number[];
};
export type SurfaceHit = SurfaceHover & { mesh: Mesh; quad: number; bounds: PaintBounds };
export function surfaceHit(
  event: ThreeEvent<PointerEvent>,
  document: SkinDocument,
  activePart: string | null,
): SurfaceHit | null {
  for (const hit of event.intersections) {
    const mesh = hit.object;
    if (
      !(mesh instanceof Mesh) ||
      !mesh.visible ||
      !hit.uv ||
      !mesh.userData.editable ||
      mesh.userData.documentId !== document.id
    )
      continue;
    const part = mesh.userData.partId as string;
    if (!part || (activePart && part !== activePart)) continue;
    const pixel = uvToPixel(hit.uv.x, hit.uv.y, document.width, document.height);
    if (!activePart && document.readPixel(pixel.x, pixel.y)[3] < 26) continue;
    const quad = Math.floor((hit.faceIndex ?? 0) / 2);
    const uv = mesh.userData.surfaceUVs[quad] as number[];
    return {
      ...pixel,
      part,
      mesh,
      quad,
      uv,
      surface: mesh.userData.surfaceIds[quad] as string,
      bounds: boundsForUV(uv, document.width, document.height),
    };
  }
  return null;
}

function boundsForUV(uv: readonly number[], width: number, height: number): PaintBounds {
  const xs = uv.filter((_, i) => i % 2 === 0).map((u) => u * width);
  const ys = uv.filter((_, i) => i % 2 === 1).map((v) => (1 - v) * height);
  return {
    minX: Math.floor(Math.min(...xs)),
    maxX: Math.ceil(Math.max(...xs)) - 1,
    minY: Math.floor(Math.min(...ys)),
    maxY: Math.ceil(Math.max(...ys)) - 1,
  };
}
/** A texel can belong to multiple visible surfaces, including mirrored/shared UV islands. */
export function textureSurfaceHits(
  root: Object3D,
  document: SkinDocument,
  pixel: { x: number; y: number },
  activePart: string | null,
  size = 1,
  clip?: PaintBounds,
): SurfaceHit[] {
  if (pixel.x < 0 || pixel.y < 0 || pixel.x >= document.width || pixel.y >= document.height)
    return [];
  const hits: SurfaceHit[] = [];
  const offset = Math.floor((size - 1) / 2);
  const minX = pixel.x - offset,
    minY = pixel.y - offset;
  root.traverseVisible((mesh) => {
    if (
      !(mesh instanceof Mesh) ||
      (!mesh.userData.editable && mesh.userData.textureDocumentId !== document.id) ||
      mesh.userData.documentId !== document.id
    )
      return;
    const part = mesh.userData.partId as string;
    if (activePart && part !== activePart) return;
    (mesh.userData.surfaceUVs as number[][]).forEach((uv, quad) => {
      if (mesh.userData.hiddenSurfaces?.[quad]) return;
      const face = boundsForUV(uv, document.width, document.height);
      const bounds = clip
        ? {
            minX: Math.max(face.minX, clip.minX),
            maxX: Math.min(face.maxX, clip.maxX),
            minY: Math.max(face.minY, clip.minY),
            maxY: Math.min(face.maxY, clip.maxY),
          }
        : face;
      if (
        bounds.minX > bounds.maxX ||
        bounds.minY > bounds.maxY ||
        minX > bounds.maxX ||
        minY > bounds.maxY ||
        minX + size <= bounds.minX ||
        minY + size <= bounds.minY
      )
        return;
      hits.push({
        ...pixel,
        mesh,
        part,
        quad,
        uv,
        bounds,
        surface: mesh.userData.surfaceIds[quad] as string,
      });
    });
  });
  return hits;
}

export function TextureBrushPreview({
  pixel,
  document,
  color,
  size,
  activePart,
  contextKey,
  clip,
}: {
  pixel: { x: number; y: number };
  document: SkinDocument;
  color: Pixel;
  size: number;
  activePart: string | null;
  contextKey: string;
  clip?: PaintBounds;
}) {
  const scene = useThree((s) => s.scene);
  const [hits, setHits] = useState<SurfaceHit[]>([]);
  useEffect(() => {
    // Wait until GeneratedPony has committed its instances, visibility and rig transforms.
    const frame = requestAnimationFrame(() =>
      setHits(textureSurfaceHits(scene, document, pixel, activePart, size, clip)),
    );
    return () => cancelAnimationFrame(frame);
  }, [scene, document, pixel, activePart, size, contextKey, clip]);
  return hits.map((hit) => (
    <BrushPreview
      key={`${hit.mesh.uuid}/${hit.quad}`}
      hit={hit}
      color={color}
      size={size}
      document={document}
    />
  ));
}

/** Map a clipped brush rectangle back onto its quad, including mirrored / rotated UVs. */
export function brushPatch(hit: SurfaceHit, width: number, height: number, size: number) {
  const { uv, bounds, mesh, quad, x, y } = hit;
  const xs = uv.filter((_, i) => i % 2 === 0).map((u) => u * width);
  const ys = uv.filter((_, i) => i % 2 === 1).map((v) => (1 - v) * height);
  const minX = Math.max(0, Math.min(...xs), bounds.minX, x - Math.floor((size - 1) / 2));
  const minY = Math.max(0, Math.min(...ys), bounds.minY, y - Math.floor((size - 1) / 2));
  const maxX = Math.min(
    width,
    Math.max(...xs),
    bounds.maxX + 1,
    x - Math.floor((size - 1) / 2) + size,
  );
  const maxY = Math.min(
    height,
    Math.max(...ys),
    bounds.maxY + 1,
    y - Math.floor((size - 1) / 2) + size,
  );
  const du1 = uv[2] - uv[0],
    dv1 = uv[3] - uv[1];
  const du3 = uv[6] - uv[0],
    dv3 = uv[7] - uv[1];
  const determinant = du1 * dv3 - du3 * dv1;
  if (Math.abs(determinant) < 1e-12 || minX >= maxX || minY >= maxY) return [];
  const positions = mesh.geometry.getAttribute("position");
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ].flatMap(([px, py]) => {
    const u = px / width - uv[0],
      v = 1 - py / height - uv[1];
    const a = (u * dv3 - du3 * v) / determinant;
    const b = (du1 * v - u * dv1) / determinant;
    return [0, 1, 2].map((axis) => {
      const p0 = positions.getComponent(quad * 4, axis);
      return (
        p0 +
        a * (positions.getComponent(quad * 4 + 1, axis) - p0) +
        b * (positions.getComponent(quad * 4 + 3, axis) - p0)
      );
    });
  });
}
export function BrushPreview({
  hit,
  color,
  size,
  document,
}: {
  hit: SurfaceHit;
  color: Pixel;
  size: number;
  document: SkinDocument;
}) {
  const geometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const patch = brushPatch(hit, document.width, document.height, size);
    geometry.setAttribute("position", new Float32BufferAttribute(patch, 3));
    geometry.setIndex(patch.length ? [0, 1, 2, 0, 2, 3] : []);
    return geometry;
  }, [hit, document, size]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return createPortal(
    <mesh geometry={geometry} raycast={() => {}} renderOrder={1000}>
      <meshBasicMaterial
        color={new Color().setRGB(color[0] / 255, color[1] / 255, color[2] / 255, SRGBColorSpace)}
        opacity={color[3] / 255}
        transparent
        depthWrite={false}
        side={DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
        toneMapped={false}
      />
    </mesh>,
    hit.mesh,
  );
}
