import type { LayerNode } from "@striped-skins/api";

export const LAYER_INDENT = 12;
export const LAYER_PADDING = 4;
const ROOT_DROP_X = 24;

export type LayerRow = { node: LayerNode; depth: number };
export type LayerDrop = {
  parentId: string | null;
  beforeId: string | null;
  depth: number;
  anchorId: string;
  edge: "top" | "bottom";
};

export function layerRows(layers: readonly LayerNode[], collapsed: readonly string[]) {
  const rows: LayerRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const node of layers.filter((n) => n.parentId === parentId).reverse()) {
      rows.push({ node, depth });
      if (node.kind === "group" && !collapsed.includes(node.id)) visit(node.id, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}

/** Resolve visual gaps top-to-bottom, then translate to the document's bottom-to-top order. */
export function layerDropTarget(
  layers: readonly LayerNode[],
  rows: readonly LayerRow[],
  draggedId: string,
  hoveredId: string,
  edge: "top" | "bottom",
  offsetX: number,
): LayerDrop | null {
  const excluded = new Set([draggedId]);
  const excludeChildren = (id: string) => {
    for (const node of layers.filter((n) => n.parentId === id)) {
      excluded.add(node.id);
      excludeChildren(node.id);
    }
  };
  excludeChildren(draggedId);
  if (!layers.some((n) => n.id === draggedId) || excluded.has(hoveredId)) return null;

  const remaining = rows.filter(({ node }) => !excluded.has(node.id));
  const hovered = remaining.findIndex(({ node }) => node.id === hoveredId);
  if (hovered < 0) return null;
  const gap = hovered + (edge === "bottom" ? 1 : 0);
  const desiredDepth = Math.max(0, Math.round((offsetX - ROOT_DROP_X) / LAYER_INDENT));
  const candidates: (LayerDrop & { gap: number })[] = [];
  const subtreeEnd = (index: number) => {
    let end = index + 1;
    while (end < remaining.length && remaining[end].depth > remaining[index].depth) end++;
    return end;
  };
  const add = (parentId: string | null, depth: number, at: number, beforeId: string | null) => {
    const anchor = remaining[at] ?? remaining[at - 1];
    if (anchor)
      candidates.push({
        parentId,
        beforeId,
        depth,
        gap: at,
        anchorId: anchor.node.id,
        edge: remaining[at] ? "top" : "bottom",
      });
  };
  for (const parent of [null, ...remaining.filter(({ node }) => node.kind === "group")]) {
    const parentId = parent?.node.id ?? null;
    const depth = parent ? parent.depth + 1 : 0;
    const children = remaining.filter(({ node }) => node.parentId === parentId);
    if (!children.length) {
      // An empty or collapsed group accepts a new top child without expanding during the drag.
      add(parentId, depth, parent ? remaining.indexOf(parent) + 1 : 0, null);
      continue;
    }
    children.forEach((child, i) =>
      add(parentId, depth, remaining.indexOf(child), children[i - 1]?.node.id ?? null),
    );
    add(parentId, depth, subtreeEnd(remaining.indexOf(children.at(-1)!)), children.at(-1)!.node.id);
  }

  const choices = candidates.filter((candidate) => candidate.gap === gap);
  // At the boundary under a group header, leftward placement can stay outside the group.
  // Its indicator moves past the subtree so the preview always matches the actual result.
  let previous = gap - 1;
  while (previous >= 0 && remaining[previous].node.kind === "group") {
    const group = remaining[previous];
    const outside = candidates.find(
      (candidate) =>
        candidate.gap === subtreeEnd(previous) && candidate.parentId === group.node.parentId,
    );
    if (outside) choices.push(outside);
    previous--;
  }
  const target = choices.sort(
    (a, b) => Math.abs(a.depth - desiredDepth) - Math.abs(b.depth - desiredDepth),
  )[0];
  if (!target) return null;
  // The source stays visible while dragging. Anchor a hovered gap to its actual row edge,
  // rather than the next remaining row, which may be across the source's entire subtree.
  return target.gap === gap ? { ...target, anchorId: hoveredId, edge } : target;
}

export function layerDropChangesOrder(layers: readonly LayerNode[], id: string, drop: LayerDrop) {
  const node = layers.find((n) => n.id === id);
  if (!node || node.parentId !== drop.parentId) return !!node;
  const siblings = layers.filter((n) => n.parentId === node.parentId);
  return (siblings[siblings.findIndex((n) => n.id === id) + 1]?.id ?? null) !== drop.beforeId;
}
