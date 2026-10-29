import { useRef, useState, useSyncExternalStore, type DragEvent } from "react";
import {
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderPlusIcon,
  LockClosedIcon,
  LockOpenIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { SkinDocument } from "@striped-skins/api";
import { Button, IconButton } from "./ui";
import { NumberSlider } from "./NumberSlider";
import { LayerThumbnail } from "./LayerThumbnail";
import { useDocumentSetting } from "./useDocumentSetting";
import {
  LAYER_INDENT,
  LAYER_PADDING,
  layerRows,
  layerDropTarget,
  layerDropChangesOrder,
  type LayerDrop,
} from "./layer-drag";

export function LayerPanel({ document: skin }: { document: SkinDocument }) {
  useSyncExternalStore(skin.subscribe, skin.getSnapshot, skin.getSnapshot);
  const [collapsed, setCollapsed] = useDocumentSetting<string[]>(skin, "collapsedGroups", []);
  const [error, setError] = useState("");
  const firstNameClick = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const dragged = useRef<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [drop, setDrop] = useState<LayerDrop | null>(null);
  const visibleRows = layerRows(skin.layers, collapsed);
  const endDrag = () => {
    dragged.current = null;
    setDraggedId(null);
    setDrop(null);
  };
  const targetAt = (event: DragEvent<HTMLDivElement>, hoveredId: string) => {
    if (!dragged.current || !listRef.current) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    return layerDropTarget(
      skin.layers,
      visibleRows,
      dragged.current,
      hoveredId,
      event.clientY < rect.top + rect.height / 2 ? "top" : "bottom",
      event.clientX - listRef.current.getBoundingClientRect().left,
    );
  };
  const active = skin.activeLayer;
  const run = (action: () => unknown) => {
    try {
      action();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const descendants = (id: string): string[] =>
    skin.layers.filter((n) => n.parentId === id).flatMap((n) => [n.id, ...descendants(n.id)]);
  const excluded = new Set([active.id, ...descendants(active.id)]);
  const groups = skin.layers.filter((n) => n.kind === "group" && !excluded.has(n.id));
  const siblings = skin.layers.filter((n) => n.parentId === active.parentId);
  const index = siblings.findIndex((n) => n.id === active.id);
  const rows = visibleRows.map(({ node, depth }) => (
    <div
      key={node.id}
      className="layer-row"
      data-testid="layer-row"
      data-layer-id={node.id}
      data-active={active.id === node.id}
      data-dragging={draggedId === node.id}
      style={{ paddingLeft: LAYER_PADDING + depth * LAYER_INDENT }}
      draggable
      onDragStart={(e) => {
        dragged.current = node.id;
        setDraggedId(node.id);
        setDrop(null);
        e.dataTransfer.setData("application/x-striped-layer", node.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={endDrag}
      onDragOver={(e) => {
        if (!dragged.current) return;
        e.stopPropagation();
        const next = targetAt(e, node.id);
        if (next) e.preventDefault();
        e.dataTransfer.dropEffect = next ? "move" : "none";
        setDrop((current) =>
          current?.parentId === next?.parentId &&
          current?.beforeId === next?.beforeId &&
          current?.anchorId === next?.anchorId &&
          current?.edge === next?.edge
            ? current
            : next,
        );
      }}
      onDrop={(e) => {
        const id = dragged.current;
        if (!id) return;
        e.preventDefault();
        e.stopPropagation();
        const target = targetAt(e, node.id);
        endDrag();
        if (!target || !layerDropChangesOrder(skin.layers, id, target)) return;
        run(() => {
          skin.moveLayer(id, target.parentId, target.beforeId);
          if (target.parentId && collapsed.includes(target.parentId))
            setCollapsed((ids) => ids.filter((groupId) => groupId !== target.parentId));
        });
      }}
    >
      {drop?.anchorId === node.id ? (
        <span
          className="layer-drop-indicator"
          data-testid="layer-drop-indicator"
          data-edge={drop.edge}
          data-parent-id={drop.parentId ?? ""}
          style={{ left: LAYER_PADDING + drop.depth * LAYER_INDENT }}
          aria-hidden="true"
        />
      ) : null}
      <IconButton
        label={`${node.visible ? "Скрыть слой" : "Показать слой"} ${node.name}`}
        aria-pressed={node.visible}
        onClick={() => skin.updateLayer(node.id, { visible: !node.visible })}
      >
        {node.visible ? <EyeIcon /> : <EyeSlashIcon />}
      </IconButton>
      {node.kind === "group" ? (
        <button
          type="button"
          className="layer-fold"
          aria-label={`${collapsed.includes(node.id) ? "Развернуть" : "Свернуть"} группу ${node.name}`}
          aria-expanded={!collapsed.includes(node.id)}
          onClick={() =>
            setCollapsed((ids) =>
              ids.includes(node.id) ? ids.filter((id) => id !== node.id) : [...ids, node.id],
            )
          }
        >
          {collapsed.includes(node.id) ? "▸" : "▾"}
        </button>
      ) : null}
      <button
        type="button"
        className="layer-select"
        aria-label={`Выбрать ${node.kind === "group" ? "группу" : "слой"} ${node.name}`}
        aria-pressed={active.id === node.id}
        onClick={() => skin.setActiveLayer(node.id)}
        title={node.name}
      >
        {node.kind === "layer" && node.pixels ? (
          <LayerThumbnail
            pixels={node.pixels}
            width={skin.width}
            height={skin.height}
            revision={skin.getLayerRevision(node.id)}
          />
        ) : null}
        <span className="layer-name">{node.name}</span>
      </button>
      <span className="layer-opacity">{node.opacity}%</span>
      <IconButton
        label={`${node.locked ? "Разблокировать" : "Заблокировать"} ${node.name}`}
        aria-pressed={node.locked}
        onClick={() => skin.updateLayer(node.id, { locked: !node.locked })}
      >
        {node.locked ? <LockClosedIcon /> : <LockOpenIcon />}
      </IconButton>
      {node.kind === "layer" ? (
        <IconButton
          label={`Блокировать прозрачность ${node.name}`}
          aria-pressed={node.alphaLocked}
          onClick={() => skin.updateLayer(node.id, { alphaLocked: !node.alphaLocked })}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 3h6v6H9zM3 9h6v6H3zM15 9h6v6h-6zM9 15h6v6H9z"
              fill={node.alphaLocked ? "currentColor" : "#808080"}
            />
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </IconButton>
      ) : null}
    </div>
  ));
  return (
    <section className="layers-panel" aria-label="Слои рисунка">
      <div className="layers-heading">
        <h2>Слои</h2>
        <span>{skin.layers.length} / 128</span>
        <IconButton
          label="Новый слой"
          disabled={!skin.canAddLayer}
          onClick={() => run(() => skin.addLayer())}
        >
          <PlusIcon />
        </IconButton>
        <IconButton
          label="Новая группа"
          disabled={skin.layers.length >= 128}
          onClick={() => run(() => skin.addLayer("group"))}
        >
          <FolderPlusIcon />
        </IconButton>
      </div>
      <div
        ref={listRef}
        className="layer-list"
        aria-label="Порядок слоёв сверху вниз"
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrop(null);
        }}
      >
        {rows}
      </div>
      <div className="layer-properties" key={active.id}>
        <label className="layer-name-field">
          <span className="sr-only">Имя слоя</span>
          <input
            aria-label="Имя слоя"
            defaultValue={active.name}
            key={`${active.id}-${active.name}`}
            onFocus={(e) => {
              e.currentTarget.select();
              firstNameClick.current = true;
            }}
            onClick={(e) => {
              if (firstNameClick.current) {
                e.currentTarget.select();
                firstNameClick.current = false;
              }
            }}
            onBlur={(e) => {
              firstNameClick.current = false;
              skin.updateLayer(active.id, { name: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </label>
        <label className="layer-alpha">
          α{" "}
          <NumberSlider
            label="Непрозрачность слоя"
            min={0}
            max={100}
            unit="%"
            value={active.opacity}
            onChange={(opacity, interaction) =>
              skin.updateLayer(active.id, { opacity }, interaction)
            }
          />
          %
        </label>
        <label className="layer-parent">
          <span>Группа</span>
          <select
            aria-label="Группа слоя"
            value={active.parentId ?? ""}
            onChange={(e) => skin.moveLayer(active.id, e.target.value || null)}
          >
            <option value="">Корень документа</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="layer-actions">
        <IconButton
          label="Слой выше"
          disabled={index === siblings.length - 1}
          onClick={() =>
            skin.moveLayer(active.id, active.parentId, siblings[index + 2]?.id ?? null)
          }
        >
          ↑
        </IconButton>
        <IconButton
          label="Слой ниже"
          disabled={index === 0}
          onClick={() => skin.moveLayer(active.id, active.parentId, siblings[index - 1].id)}
        >
          ↓
        </IconButton>
        <IconButton
          label="Дублировать слой или группу"
          onClick={() => run(() => skin.duplicateLayer(active.id))}
        >
          <DocumentDuplicateIcon />
        </IconButton>
        <IconButton
          label="Удалить слой или группу"
          disabled={!skin.layers.some((n) => n.kind === "layer" && !excluded.has(n.id))}
          onClick={() => skin.deleteLayer(active.id)}
        >
          <TrashIcon />
        </IconButton>
        {active.kind === "group" ? (
          <Button onClick={() => skin.mergeGroup(active.id)}>Объединить группу</Button>
        ) : (
          <Button disabled={!skin.canMergeDown} onClick={() => skin.mergeDown()}>
            Объединить вниз
          </Button>
        )}
      </div>
      {skin.paintBlockedReason ? (
        <output className="layer-notice">{skin.paintBlockedReason}</output>
      ) : null}
      {error ? (
        <p role="alert" className="studio-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function HistoryPanel({ document: skin }: { document: SkinDocument }) {
  useSyncExternalStore(skin.subscribe, skin.getSnapshot, skin.getSnapshot);
  return (
    <details className="history-panel">
      <summary>История · {skin.history.length}</summary>
      <div className="layer-actions">
        <Button disabled={!skin.canUndo} onClick={() => skin.undo()}>
          Отменить
        </Button>
        <Button disabled={!skin.canRedo} onClick={() => skin.redo()}>
          Повторить
        </Button>
      </div>
      <ol>
        {skin.history
          .slice()
          .reverse()
          .map((label, i) => (
            <li key={`${skin.history.length - i}-${label}`}>{label}</li>
          ))}
      </ol>
      <small>До 100 операций; история включена в проект.</small>
    </details>
  );
}
