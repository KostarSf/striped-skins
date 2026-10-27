import type { ModelNode } from "@striped-skins/models";

export type PartTreeNode = {
  id: string;
  label: string;
  children: PartTreeNode[];
  partId?: string;
};
export function partLeaves(node: PartTreeNode): PartTreeNode[] {
  return node.partId ? [node] : node.children.flatMap(partLeaves);
}
export function partVisible(node: PartTreeNode, hidden: ReadonlySet<string>) {
  return !hidden.has(node.id) && !hidden.has(node.partId!);
}
/** UI categories are semantic; all geometry, joints and faces come from the model. */
export function buildPartTree(
  nodes: readonly ModelNode[],
  available: (id: string) => boolean,
  label: (id: string) => string,
  accessories: { id: number; label: string; nodes: readonly ModelNode[] }[],
): PartTreeNode[] {
  const branch = (node: ModelNode, prefix = ""): PartTreeNode | null => {
    if (!prefix && !available(node.id)) return null;
    const children = node.children.flatMap((child) => {
      const result = branch(child, prefix);
      return result ? [result] : [];
    });
    if (node.quads.length)
      children.unshift({
        id: `${prefix}${node.id}/faces`,
        label: "Грани",
        children: node.quads.map((q, i) => ({
          id: `${prefix}${q.id}`,
          label: `Грань ${i + 1}`,
          partId: `${prefix}${node.id}`,
          children: [],
        })),
      });
    return children.length
      ? { id: `${prefix}${node.id}`, label: label(node.id).split(" / ").at(-1)!, children }
      : null;
  };
  const groups = new Map<string, PartTreeNode>();
  const group = (id: string, name: string, parent?: PartTreeNode) => {
    if (!groups.has(id)) {
      const node = { id: `group/${id}`, label: name, children: [] };
      groups.set(id, node);
      parent?.children.push(node);
    }
    return groups.get(id)!;
  };
  const roots = [group("head", "Голова"), group("body", "Тело"), group("legs", "Ноги")];
  for (const node of nodes) {
    const result = branch(node);
    if (!result) continue;
    let parent: PartTreeNode;
    if (node.id === "head" || node.id === "hat") parent = groups.get("head")!;
    else if (["body", "neck", "jacket"].includes(node.id)) {
      parent = groups.get("body")!;
      if (node.id === "jacket") parent = group("body/clothes", "Одежда", parent);
    } else if (/_(arm|leg|sleeve|pants)$/.test(node.id)) {
      parent = groups.get("legs")!;
      parent = /_(sleeve|pants)$/.test(node.id)
        ? group("legs/clothes", "Одежда", parent)
        : group("legs/base", "Ноги", parent);
    } else {
      const name = node.id === "wings" ? "Крылья" : node.id === "tail" ? "Хвост" : "Другие части";
      const id = name === "Другие части" ? "other" : node.id;
      parent = group(id, name);
      if (!roots.includes(parent)) roots.push(parent);
    }
    parent.children.push(result);
  }
  if (accessories.length) {
    const parent = group("accessories", "Аксессуары");
    for (const accessory of accessories)
      parent.children.push({
        id: `gear/${accessory.id}`,
        label: accessory.label,
        children: accessory.nodes.flatMap((node) => {
          const result = branch(node, `gear/${accessory.id}/`);
          return result ? [result] : [];
        }),
      });
    roots.push(parent);
  }
  return roots.filter((node) => node.children.length);
}
export function togglePartTree(
  tree: PartTreeNode[],
  node: PartTreeNode,
  hidden: ReadonlySet<string>,
  visible: boolean,
) {
  const next = new Set(hidden);
  const leaves = tree.flatMap(partLeaves);
  // Expand legacy whole-mesh masks before enabling an individual face.
  for (const leaf of leaves) {
    if (!partVisible(leaf, hidden)) next.add(leaf.id);
    next.delete(leaf.partId!);
  }
  for (const leaf of partLeaves(node)) {
    if (visible) next.delete(leaf.id);
    else next.add(leaf.id);
  }
  return next;
}
