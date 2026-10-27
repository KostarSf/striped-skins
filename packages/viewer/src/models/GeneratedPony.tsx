import { useEffect, useMemo, useRef, useSyncExternalStore, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
  TextureLoader,
  type Texture,
} from "three";
import { decodeSkinMetadata, type SkinDocument, type SkinMetadata } from "@striped-skins/api";
import { UVOutlines } from "./UVOutlines.js";
import {
  resolveModel,
  resolveWearables,
  gearModels,
  accessoryTextures,
  partAvailable,
  defaultPreview,
  evaluateRig,
  modelScale,
  sizeTransform,
  stageFor,
  type ModelNode,
  type ModelQuad,
  type PreviewSettings,
  type MotionLayer,
  type Stage,
} from "@striped-skins/models";

const EMPTY_SET: ReadonlySet<string> = new Set();
const EMPTY_LAYERS: readonly MotionLayer[] = [];
export type GeneratedPonyProps = {
  document: SkinDocument;
  overrides?: Partial<SkinMetadata>;
  preview?: PreviewSettings;
  hidden?: ReadonlySet<string>;
  animate?: boolean;
  paused?: boolean;
  motionLayers?: readonly MotionLayer[];
  showUV?: boolean;
};
export function geometryFor(quads: ModelQuad[]) {
  const geometry = new BufferGeometry(),
    positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  quads.forEach((q, i) => {
    positions.push(...q.positions);
    uv.push(...q.uv);
    const n = i * 4;
    indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  });
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function configureTexture(texture: Texture) {
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
function skinMaterial(texture: Texture) {
  return new MeshBasicMaterial({
    map: texture,
    side: DoubleSide,
    alphaTest: 0.1,
    transparent: true,
    forceSinglePass: true,
    toneMapped: false,
  });
}

export function GeneratedPony({
  document: skinDocument,
  overrides,
  preview = defaultPreview,
  hidden = EMPTY_SET,
  animate = false,
  paused = false,
  motionLayers = EMPTY_LAYERS,
  showUV = false,
}: GeneratedPonyProps) {
  const revision = useSyncExternalStore(
    skinDocument.subscribe,
    skinDocument.getSnapshot,
    skinDocument.getSnapshot,
  );
  const metadata: SkinMetadata = { ...decodeSkinMetadata(skinDocument), ...overrides };
  const model = resolveModel(metadata, preview);
  const invalidate = useThree((s) => s.invalidate);
  const surface = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = skinDocument.width;
    canvas.height = skinDocument.height;
    const texture = configureTexture(new CanvasTexture(canvas));
    return { canvas, texture, material: skinMaterial(texture) };
  }, [skinDocument]);
  useEffect(() => {
    let pending: number | null = null;
    const update = () => {
      pending = null;
      surface.canvas
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
      surface.texture.needsUpdate = true;
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
  }, [skinDocument, surface, invalidate]);
  useEffect(
    () => () => {
      surface.texture.dispose();
      surface.material.dispose();
    },
    [surface],
  );
  const gearKey = JSON.stringify(resolveWearables(metadata, preview));
  const instance = useMemo(() => {
    const root = new Group(),
      nodes = new Map<string, Group>(),
      meshes: Mesh[] = [],
      geometries: BufferGeometry[] = [],
      materials: MeshBasicMaterial[] = [],
      textures: Texture[] = [],
      stages: { id: string; group: Group; stage: Stage }[] = [];
    const create = (node: ModelNode, material: MeshBasicMaterial, gearId?: number): Group => {
      const group = new Group();
      group.name = node.id;
      group.position.fromArray(node.pivot);
      group.rotation.set(...node.rotation, "ZYX");
      nodes.set(node.id, group);
      if (node.quads.length) {
        const geometry = geometryFor(node.quads);
        geometries.push(geometry);
        const mesh = new Mesh(geometry, material);
        mesh.name = node.id;
        mesh.userData = {
          partId: node.id,
          documentId: skinDocument.id,
          textureDocumentId: material === surface.material ? skinDocument.id : null,
          surfaceIds: node.quads.map((q) => q.id),
          surfaceUVs: node.quads.map((q) => q.uv),
          editable: gearId === undefined,
          gearId,
        };
        group.add(mesh);
        meshes.push(mesh);
      }
      node.children.forEach((child) => group.add(create(child, material, gearId)));
      return group;
    };
    for (const node of model.nodes) {
      if (node.id === "ear" || node.id === "cloak") continue;
      const stage = new Group();
      stages.push({ id: node.id, group: stage, stage: stageFor(node.id) });
      stage.add(create(node, surface.material));
      root.add(stage);
    }
    // Preserve Java render-stage attachments: tail and wings inherit the body joint.
    for (const id of ["tail", "wings", "left_fin", "right_fin", "center_fin"]) {
      const joint = nodes.get(id),
        body = nodes.get("body");
      if (joint && body) body.add(joint);
    }
    const gear = JSON.parse(gearKey) as ReturnType<typeof resolveWearables>;
    const cloneNode = (node: ModelNode, prefix: string): ModelNode => ({
      ...node,
      id: `${prefix}/${node.id}`,
      children: node.children.map((c) => cloneNode(c, prefix)),
    });
    for (const item of gear) {
      let material = surface.material;
      if (!item.embedded) {
        const url = accessoryTextures[item.texture];
        if (!url) throw new Error(`Missing accessory texture: ${item.texture}`);
        const texture = configureTexture(new TextureLoader().load(url, () => invalidate()));
        textures.push(texture);
        material = skinMaterial(texture);
        materials.push(material);
      }
      const attachment = new Group();
      attachment.name = `gear/${item.id}`;
      attachment.position.fromArray(item.position);
      const anchor = nodes.get(item.anchor);
      if (!anchor) continue;
      anchor.add(attachment);
      gearModels[item.model].nodes.forEach((node) => {
        const group = create(cloneNode(node, `gear/${item.id}`), material, item.id);
        if (node.id === "left_bag" || node.id === "right_bag") group.position.y += item.bagDrop;
        attachment.add(group);
      });
    }
    return { root, nodes, meshes, geometries, materials, textures, stages, gear };
  }, [model, surface, gearKey, invalidate, skinDocument.id]);
  useEffect(
    () => () => {
      instance.geometries.forEach((g) => g.dispose());
      instance.materials.forEach((m) => m.dispose());
      instance.textures.forEach((t) => t.dispose());
    },
    [instance],
  );
  const current = useRef({ metadata, preview, hidden, motionLayers });
  current.current = { metadata, preview, hidden, motionLayers };
  const apply = useCallback(
    (time: number) => {
      const { metadata, preview, hidden, motionLayers } = current.current;
      const frame = evaluateRig(model, metadata, preview, time, motionLayers);
      for (const [id, transform] of Object.entries(frame)) {
        const joint = instance.nodes.get(id);
        if (!joint) continue;
        joint.position.fromArray(transform.position);
        joint.rotation.set(...transform.rotation, "ZYX");
        joint.scale.fromArray(transform.scale);
      }
      for (const { group, stage } of instance.stages) {
        const value =
          metadata.race === "HUMAN"
            ? { translate: [0, 0, 0], scale: [1, 1, 1] }
            : sizeTransform(metadata.size, stage);
        group.position.fromArray(value.translate);
        // SeaponyModel's stage transform lifts all parts by 0.6 blocks.
        if (model.id.endsWith("/sea_pony")) group.position.y += 0.6 * 16;
        group.scale.fromArray(value.scale);
      }
      instance.root.scale.setScalar(metadata.race === "HUMAN" ? 0.225 : modelScale(metadata.size));
      instance.root.rotation.x = Math.PI;
      instance.root.position.set(0, 2, 1.2);
      for (const mesh of instance.meshes) {
        const id = mesh.userData.partId as string;
        let visible = !hidden.has(id) && partAvailable(id, metadata, preview);
        const item = instance.gear.find((g) => g.id === mesh.userData.gearId);
        if (item?.side) {
          if (id.endsWith("strap")) visible &&= item.side === "both";
          if (id.includes("left_bag")) visible &&= item.side !== "right";
          if (id.includes("right_bag")) visible &&= item.side !== "left";
        }
        mesh.visible = visible;
        if (mesh.userData.gearId === 150) {
          (mesh.material as MeshBasicMaterial).color.set(
            `#${metadata.glow === "000000" ? "ffffff" : metadata.glow}`,
          );
          const joint = mesh.parent!;
          joint.rotation.z = id.endsWith("/left") ? 0.1 : -0.1;
        }
      }
    },
    [instance, model],
  );
  useEffect(() => {
    apply(0);
    invalidate();
  }, [apply, revision, overrides, preview, hidden, invalidate]);
  const time = useRef(0);
  const wasActive = useRef(false);
  useEffect(() => {
    time.current = 0;
    wasActive.current = false;
    invalidate();
  }, [motionLayers, invalidate]);
  useEffect(() => {
    invalidate();
  }, [paused, animate, invalidate]);
  useFrame((_, delta) => {
    if (paused) {
      wasActive.current = false;
      return;
    }
    const active = motionLayers.some(
      (layer) => layer.loop || !layer.duration || time.current < layer.duration,
    );
    const idle = animate && metadata.race !== "HUMAN";
    if (!idle && !active) {
      wasActive.current = false;
      return;
    }
    // Demand rendering can sleep for minutes: its first delta is not clip time.
    time.current += wasActive.current ? Math.min(delta, 0.1) : 0;
    wasActive.current = true;
    apply(time.current);
    if (
      idle ||
      motionLayers.some((layer) => layer.loop || !layer.duration || time.current < layer.duration)
    )
      invalidate();
  });
  return (
    <>
      <primitive object={instance.root} dispose={null} />
      {showUV ? <UVOutlines meshes={instance.meshes} /> : null}
    </>
  );
}
