import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { Box3, Mesh, Vector3 } from "three";

/** A single stage floor, fitted to the visible models without affecting camera framing. */
export function GroundGrid({ contextKey }: { contextKey: string }) {
  const scene = useThree((s) => s.scene);
  const [position, setPosition] = useState<[number, number, number] | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scene.updateMatrixWorld(true);
      const bounds = new Box3();
      scene.traverseVisible((mesh) => {
        if (!(mesh instanceof Mesh) || !mesh.userData.partId) return;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox)
          bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
      });
      if (bounds.isEmpty()) return;
      const center = bounds.getCenter(new Vector3());
      setPosition([center.x, bounds.min.y - 0.02, center.z]);
    });
    return () => cancelAnimationFrame(frame);
  }, [scene, contextKey]);
  return position ? (
    <Grid
      name="ground-grid"
      position={position}
      args={[40, 40]}
      cellSize={0.5}
      sectionSize={2}
      cellColor="#60636b"
      sectionColor="#797d86"
      cellThickness={0.55}
      sectionThickness={0.8}
      fadeDistance={12}
      fadeStrength={2}
      fadeFrom={0}
      material-depthWrite={false}
      raycast={() => {}}
    />
  ) : null;
}
