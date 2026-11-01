import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Squares2X2Icon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button } from "./ui";
import { partLeaves, partVisible, togglePartTree, type PartTreeNode } from "./part-tree";

function VisibilityNode({
  node,
  hidden,
  search,
  toggle,
}: {
  node: PartTreeNode;
  hidden: ReadonlySet<string>;
  search: string;
  toggle: (node: PartTreeNode, visible: boolean) => void;
}) {
  const { t } = useTranslation();
  const [expansion, setExpansion] = useState({ search, open: false });
  const input = useRef<HTMLInputElement>(null);
  const leaves = partLeaves(node);
  const count = leaves.filter((leaf) => partVisible(leaf, hidden)).length;
  useEffect(() => {
    if (input.current) input.current.indeterminate = count > 0 && count < leaves.length;
  }, [count, leaves.length]);
  const matches = (n: PartTreeNode): boolean =>
    `${n.id} ${n.label}`.toLowerCase().includes(search) || n.children.some(matches);
  if (search && !matches(node)) return null;
  const open = expansion.search === search ? expansion.open : !!search;
  const ownMatch = `${node.id} ${node.label}`.toLowerCase().includes(search);
  return (
    <li data-part-id={node.id}>
      <div className="part-row" title={node.id}>
        {node.children.length ? (
          <button
            type="button"
            className="part-expand"
            aria-label={`${open ? t("parts.collapse") : t("parts.expand")} ${node.label}`}
            aria-expanded={open}
            onClick={() => setExpansion({ search, open: !open })}
          >
            <ChevronRightIcon />
            <span>{node.label}</span>
          </button>
        ) : (
          <span className="part-name">{node.label}</span>
        )}
        <input
          ref={input}
          type="checkbox"
          aria-label={t("parts.show", { name: node.id })}
          checked={count === leaves.length}
          onChange={(e) => toggle(node, e.target.checked)}
        />
      </div>
      {node.children.length ? (
        <ul hidden={!open}>
          {node.children.map((child) => (
            <VisibilityNode
              key={child.id}
              node={child}
              hidden={hidden}
              search={ownMatch ? "" : search}
              toggle={toggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
export function PartsVisibility({
  tree,
  hidden,
  onHidden,
  selected,
  parts,
}: {
  tree: PartTreeNode[];
  hidden: ReadonlySet<string>;
  onHidden: (hidden: ReadonlySet<string>) => void;
  selected: string | null;
  parts: readonly { id: string }[];
}) {
  const { t } = useTranslation();
  const host = useRef<HTMLDetailsElement>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const element = host.current;
    const viewport = element?.closest(".model-viewport");
    const heading = element?.closest(".viewport-heading");
    if (!element || !viewport || !heading) return;
    const fit = () =>
      element.style.setProperty(
        "--parts-popup-height",
        `${Math.max(80, viewport.getBoundingClientRect().bottom - heading.getBoundingClientRect().bottom - 22)}px`,
      );
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    fit();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (host.current && !host.current.contains(e.target as Node)) host.current.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && host.current?.open) {
        host.current.open = false;
        host.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details ref={host} className="parts-popover">
      <summary aria-label={t("parts.visibility")} title={t("parts.visibility")}>
        <Squares2X2Icon />
        <span>{t("parts.title")}</span>
      </summary>
      <section className="studio-panel" aria-label={t("parts.panel")}>
        <strong>{t("parts.visibility")}</strong>
        <p className="muted">{t("parts.description")}</p>
        <input
          type="search"
          aria-label={t("parts.search")}
          placeholder={t("parts.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="part-actions">
          <Button
            disabled={!selected}
            onClick={() =>
              onHidden(new Set(parts.filter((p) => p.id !== selected).map((p) => p.id)))
            }
          >
            {t("parts.isolate")}
          </Button>
          <Button
            disabled={!selected}
            onClick={() =>
              onHidden(
                new Set([
                  ...hidden,
                  ...parts
                    .filter((p) => p.id === selected || p.id.startsWith(selected + "/"))
                    .map((p) => p.id),
                ]),
              )
            }
          >
            {t("parts.hideBranch")}
          </Button>
          <Button onClick={() => onHidden(new Set())}>{t("parts.showAll")}</Button>
        </div>
        <ul className="parts-list">
          {tree.map((node) => (
            <VisibilityNode
              key={node.id}
              node={node}
              hidden={hidden}
              search={search.trim().toLowerCase()}
              toggle={(node, visible) => onHidden(togglePartTree(tree, node, hidden, visible))}
            />
          ))}
        </ul>
      </section>
    </details>
  );
}
