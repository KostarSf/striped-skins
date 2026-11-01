import { useEffect, useMemo } from "react";
import { createPortal } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, type Mesh } from "three";
import { uvOutlineGeometry } from "./UVOutlines.js";

/** A temporary ghost also locates hidden/empty parts, without changing visibility or raycasts. */
export function PartHighlight({ mesh }: { mesh: Mesh }) {
  const geometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const position = mesh.geometry.getAttribute("position").clone();
    geometry.setAttribute("position", position);
    const indices: number[] = [];
    for (let i = 0; i < position.count; i += 4) indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    geometry.setIndex(indices);
    return { fill: geometry, outline: uvOutlineGeometry(geometry) };
  }, [mesh]);
  useEffect(
    () => () => {
      geometry.fill.dispose();
      geometry.outline.dispose();
    },
    [geometry],
  );
  return createPortal(
    <group>
      <mesh
        name="paint-part-highlight"
        geometry={geometry.fill}
        raycast={() => {}}
        renderOrder={1001}
      >
        <meshBasicMaterial
          color="#67e8f9"
          opacity={0.4}
          transparent
          depthWrite={false}
          depthTest={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <lineSegments geometry={geometry.outline} raycast={() => {}} renderOrder={1002}>
        <lineBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.9}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>,
    mesh.parent!,
  );
}
