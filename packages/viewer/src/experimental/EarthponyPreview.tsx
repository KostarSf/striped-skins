import { useEffect, useMemo, useRef } from "react";
import { Canvas, addAfterEffect, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  SRGBColorSpace,
} from "three";
import { SkinDocument, decodeSkinMetadata, uvToPixel, type Pixel } from "@striped-skins/api";
import {
  earthponyModels,
  modelScale,
  sizeTransform,
  stageFor,
  type BodySize,
  type ModelNode,
  type ModelQuad,
} from "@striped-skins/models";

export type PreviewStats = {
  calls: number;
  geometries: number;
  textures: number;
  triangles: number;
};
export type EarthponyPreviewProps = {
  document: SkinDocument;
  size: BodySize;
  slim: boolean;
  hidden: ReadonlySet<string>;
  painting: boolean;
  color: Pixel;
  activePart: string | null;
  onStats?: (stats: PreviewStats) => void;
  onPaint?: (pixel: { x: number; y: number; part: string }) => void;
};

function geometryFor(quads: ModelQuad[]) {
  const geometry = new BufferGeometry();
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  quads.forEach((quad, i) => {
    positions.push(...quad.positions);
    uv.push(...quad.uv);
    const n = i * 4;
    indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  });
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createInstance(slim: boolean, material: MeshBasicMaterial) {
  const root = new Group();
  const meshes = new Map<string, Mesh>();
  const stages: { group: Group; id: string }[] = [];
  const nodes = new Map<string, Group>();
  const geometries: BufferGeometry[] = [];
  const createNode = (node: ModelNode): Group => {
    const group = new Group();
    group.name = node.id;
    group.position.fromArray(node.pivot);
    group.rotation.set(...node.rotation, "ZYX");
    // Visibility belongs to geometry, not transform groups: children stay independent.
    if (node.quads.length) {
      const geometry = geometryFor(node.quads);
      geometries.push(geometry);
      const mesh = new Mesh(geometry, material);
      mesh.name = node.id;
      mesh.userData = {
        partId: node.id,
        surfaceIds: node.quads.map((q) => q.id),
        defaultVisible: node.visible,
      };
      group.add(mesh);
      meshes.set(node.id, mesh);
    }
    nodes.set(node.id, group);
    node.children.forEach((child) => group.add(createNode(child)));
    return group;
  };
  for (const node of earthponyModels[slim ? "alex" : "steve"].nodes) {
    if (node.id === "ear" || node.id === "cloak") continue;
    const stage = new Group();
    stages.push({ group: stage, id: node.id });
    stage.add(createNode(node));
    root.add(stage);
  }
  // Java's standing pose sets these pivots after reading Mson.
  nodes.get("neck")!.position.x = 0.166;
  for (const id of [
    "right_arm",
    "left_arm",
    "right_leg",
    "left_leg",
    "right_sleeve",
    "left_sleeve",
    "right_pants",
    "left_pants",
  ]) {
    const group = nodes.get(id)!;
    group.position.x = id.startsWith("right") ? (slim ? -0.999 : 0.001) : slim ? 0.999 : -0.001;
  }
  for (const id of ["right_leg", "left_leg", "right_pants", "left_pants"])
    nodes.get(id)!.position.y = 8;
  return { root, meshes, stages, geometries };
}

function ModelScene(props: EarthponyPreviewProps) {
  const {
    document: skinDocument,
    size,
    slim,
    hidden,
    painting,
    color,
    activePart,
    onStats,
    onPaint,
  } = props;
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const dragging = useRef(false);
  const canvas = useMemo(() => {
    const value = document.createElement("canvas");
    value.width = skinDocument.width;
    value.height = skinDocument.height;
    return value;
  }, [skinDocument]);
  const texture = useMemo(() => {
    const value = new CanvasTexture(canvas);
    value.magFilter = NearestFilter;
    value.minFilter = NearestFilter;
    value.generateMipmaps = false;
    value.colorSpace = SRGBColorSpace;
    return value;
  }, [canvas]);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({ map: texture, side: DoubleSide, alphaTest: 0.1, toneMapped: false }),
    [texture],
  );
  const instance = useMemo(() => createInstance(slim, material), [slim, material]);
  useEffect(() => {
    let pending: number | null = null;
    const update = () => {
      pending = null;
      canvas
        .getContext("2d")!
        .putImageData(
          new ImageData(
            new Uint8ClampedArray(skinDocument.pixels),
            skinDocument.width,
            skinDocument.height,
          ),
          0,
          0,
        );
      texture.needsUpdate = true;
      invalidate();
    };
    update();
    const unsubscribe = skinDocument.subscribe(() => {
      pending ??= requestAnimationFrame(update);
    });
    return () => {
      unsubscribe();
      if (pending !== null) cancelAnimationFrame(pending);
    };
  }, [skinDocument, canvas, texture, invalidate]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => instance.geometries.forEach((g) => g.dispose()), [instance]);
  useEffect(() => {
    for (const { group, id } of instance.stages) {
      const transform = sizeTransform(size, stageFor(id));
      group.position.fromArray(transform.translate);
      group.scale.fromArray(transform.scale);
    }
    instance.root.scale.setScalar(modelScale(size));
    instance.root.rotation.x = Math.PI;
    instance.root.position.set(0, 2, 1.2);
    invalidate();
  }, [instance, size, invalidate]);
  // Document pixels can change without re-rendering React or rebuilding geometry.
  useEffect(() => {
    const update = () => {
      const metadata = decodeSkinMetadata(skinDocument);
      for (const [id, mesh] of instance.meshes) {
        let available = true;
        if (id.startsWith("head/nose") || id.startsWith("neck/mane")) available = false;
        if (id.includes("/snout/")) available = id.endsWith(`/${metadata.snout}`);
        const segment = id.match(/segment_(\d+)/);
        if (segment) available = Number(segment[1]) < metadata.tailLength;
        mesh.visible = available && !hidden.has(id);
      }
      invalidate();
    };
    update();
    return skinDocument.subscribe(update);
  }, [instance, skinDocument, hidden, invalidate]);
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
      if (!(hit.object instanceof Mesh) || !hit.object.visible || !hit.uv) continue;
      const part = hit.object.userData.partId as string | undefined;
      if (!part || (activePart && part !== activePart)) continue;
      const pixel = uvToPixel(hit.uv.x, hit.uv.y, skinDocument.width, skinDocument.height);
      if (!activePart && skinDocument.readPixel(pixel.x, pixel.y)[3] < 26) continue;
      const surface = hit.object.userData.surfaceIds[
        Math.floor((hit.faceIndex ?? 0) / 2)
      ] as string;
      skinDocument.paint(pixel.x, pixel.y, color, surface);
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
      <CameraControls makeDefault enabled={!painting} minDistance={5} maxDistance={30} />
      <group
        onPointerDown={(event) => {
          if (!painting || event.button !== 0) return;
          dragging.current = true;
          skinDocument.beginStroke();
          (event.target as Element).setPointerCapture(event.pointerId);
          paint(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) paint(event);
        }}
        onPointerUp={(event) => {
          end();
          if ((event.target as Element).hasPointerCapture(event.pointerId))
            (event.target as Element).releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
          skinDocument.cancelStroke();
        }}
        onLostPointerCapture={end}
      >
        <primitive object={instance.root} dispose={null} />
      </group>
    </>
  );
}

/** Experimental renderer consumes generated model data; never imports Mson/compiler. */
export function EarthponyPreview(props: EarthponyPreviewProps) {
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [8, 4, 12], fov: 42 }}
      gl={{ antialias: false }}
      aria-label="3D Earthpony preview"
    >
      <ModelScene {...props} />
    </Canvas>
  );
}
