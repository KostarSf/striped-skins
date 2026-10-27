import { useEffect, useMemo } from "react";
import { createPortal } from "@react-three/fiber";
import {
  BufferGeometry,
  Float32BufferAttribute,
  type Mesh,
  type WebGLProgramParametersWithUniforms,
} from "three";

/** Quad borders only: a triangle wireframe would add false diagonal UV seams. */
export function uvOutlineGeometry(source: BufferGeometry, hiddenQuads: readonly boolean[] = []) {
  const position = source.getAttribute("position");
  const vertices: number[] = [];
  for (let quad = 0; quad < position.count; quad += 4) {
    if (hiddenQuads[quad / 4]) continue;
    for (let corner = 0; corner < 4; corner++)
      for (const index of [quad + corner, quad + ((corner + 1) % 4)])
        vertices.push(position.getX(index), position.getY(index), position.getZ(index));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  return geometry;
}
function biasDepth(shader: WebGLProgramParametersWithUniforms) {
  // Keep coplanar borders stable while still occluding lines on the back of the model.
  shader.vertexShader = shader.vertexShader.replace(
    "#include <project_vertex>",
    "#include <project_vertex>\ngl_Position.z -= 0.00001 * gl_Position.w;",
  );
}
function UVOutline({ mesh, hidden }: { mesh: Mesh; hidden: ReadonlySet<string> }) {
  const geometry = useMemo(
    () =>
      uvOutlineGeometry(
        mesh.geometry,
        (mesh.userData.surfaceIds as string[]).map((id) => hidden.has(id)),
      ),
    [mesh, hidden],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return createPortal(
    <lineSegments name="uv-outlines" geometry={geometry} raycast={() => {}} renderOrder={999}>
      <lineBasicMaterial
        color="#f97316"
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
        onBeforeCompile={biasDepth}
      />
    </lineSegments>,
    mesh,
  );
}
export function UVOutlines({
  meshes,
  hidden,
}: {
  meshes: readonly Mesh[];
  hidden: ReadonlySet<string>;
}) {
  return meshes.map((mesh) => <UVOutline key={mesh.uuid} mesh={mesh} hidden={hidden} />);
}
