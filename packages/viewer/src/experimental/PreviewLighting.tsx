import { createPortal, useThree } from "@react-three/fiber";

/** The original viewer's soft hemisphere light follows both projection cameras. */
export function PreviewLighting() {
  const camera = useThree((s) => s.camera);
  return createPortal(
    <hemisphereLight color="#ffffff" groundColor="#666666" position={[-30, 24, 3]} intensity={4} />,
    camera,
  );
}
