import type { Mesh } from "three";

/** Degenerate hidden quads preserve faceIndex → UV mappings for the remaining faces. */
export function updateSurfaceVisibility(mesh: Mesh, hidden: ReadonlySet<string>) {
  if (mesh.userData.visibilityMask !== hidden) {
    const surfaces = mesh.userData.surfaceIds as string[];
    const mask = surfaces.map((id) => hidden.has(id));
    const indices = mesh.geometry.getIndex()!;
    let changed = false;
    for (let q = 0; q < surfaces.length; q++) {
      const base = q * 4;
      const offsets = mask[q] ? [0, 0, 0, 0, 0, 0] : [0, 1, 2, 0, 2, 3];
      for (let i = 0; i < 6; i++) {
        const index = base + offsets[i];
        if (indices.getX(q * 6 + i) !== index) {
          indices.setX(q * 6 + i, index);
          changed = true;
        }
      }
    }
    if (changed) indices.needsUpdate = true;
    mesh.userData.hiddenSurfaces = mask;
    mesh.userData.visibilityMask = hidden;
    mesh.userData.hasVisibleSurfaces = mask.some((value) => !value);
  }
  return mesh.userData.hasVisibleSurfaces as boolean;
}
