/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Select-only ARIA combobox supports canvas previews and pointer hover, which native options cannot provide. */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { SkinDocument } from "@striped-skins/api";
import type { ModelQuad } from "@striped-skins/models";
import { PartTexturePreview } from "./PartTexturePreview";

export type PaintPartOption = { id: string; label: string; quads: ModelQuad[] };
export function PaintPartSelect({
  document: skin,
  parts,
  value,
  onChange,
  onHighlight,
  enabled,
}: {
  document: SkinDocument;
  parts: PaintPartOption[];
  value: string | null;
  onChange: (part: string | null) => void;
  onHighlight: (part: string | null) => void;
  enabled: boolean;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const activeIndex = useRef(0);
  const [revision, setRevision] = useState(0);
  const search = useRef({ text: "", time: 0 });
  const options = useMemo(
    () => [{ id: "", label: "Видимой поверхности", quads: [] }, ...parts],
    [parts],
  );
  const selected = options.find((option) => option.id === (value ?? "")) ?? options[0];
  const atlas = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = skin.width;
    canvas.height = skin.height;
    return canvas;
  }, [skin]);
  useEffect(() => {
    if (!open && !selected.id) return;
    let frame: number | null = null;
    const draw = () => {
      frame = null;
      atlas
        .getContext("2d")!
        .putImageData(
          new ImageData(new Uint8ClampedArray(skin.pixels), skin.width, skin.height),
          0,
          0,
        );
      setRevision((value) => value + 1);
    };
    draw();
    const unsubscribe = skin.subscribe(() => {
      frame ??= requestAnimationFrame(draw);
    });
    return () => {
      unsubscribe();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [skin, atlas, open, selected.id]);
  const position = useCallback(() => {
    if (!button.current || !popup.current) return;
    const rect = button.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0,
      top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? innerWidth,
      height = viewport?.height ?? innerHeight;
    const below = top + height - rect.bottom - 14,
      above = rect.top - top - 14;
    const down = below >= Math.min(280, above);
    const popupWidth = Math.min(Math.max(rect.width, 280), width - 16);
    const maxHeight = Math.min(360, Math.max(80, down ? below : above));
    const menu = popup.current;
    menu.style.width = `${popupWidth}px`;
    menu.style.maxHeight = `${maxHeight}px`;
    menu.style.left = `${Math.max(left + 8, Math.min(rect.left, left + width - popupWidth - 8))}px`;
    menu.style.top = down ? `${rect.bottom + 6}px` : "auto";
    menu.style.bottom = down ? "auto" : `${innerHeight - rect.top + 6}px`;
  }, []);
  const hide = useCallback(() => {
    popup.current?.hidePopover();
    onHighlight(null);
  }, [onHighlight]);
  useEffect(() => {
    if (!enabled) hide();
  }, [enabled, hide]);
  useEffect(() => {
    if (open)
      popup.current
        ?.querySelectorAll('[role="option"]')
        [active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  const activate = (index: number) => {
    activeIndex.current = index;
    setActive(index);
    onHighlight(options[index].id || null);
  };
  const show = () => {
    position();
    popup.current?.showPopover();
    activate(Math.max(0, options.indexOf(selected)));
  };
  const choose = (index: number) => {
    onChange(options[index].id || null);
    hide();
    button.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!open) return;
    const blur = () => hide();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.addEventListener("blur", blur);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("blur", blur);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open, hide, position]);
  useEffect(() => () => onHighlight(null), [onHighlight]);
  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key;
    // Native popover state changes before the deferred toggle notification.
    const visible = popup.current?.matches(":popover-open") ?? false;
    if (key === "Tab") {
      hide();
      return;
    }
    if (key === "Escape" && visible) {
      event.preventDefault();
      event.stopPropagation();
      hide();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
      event.preventDefault();
      event.stopPropagation();
      if (!visible) show();
      const start = visible ? activeIndex.current : options.indexOf(selected);
      activate(
        key === "Home"
          ? 0
          : key === "End"
            ? options.length - 1
            : Math.max(0, Math.min(options.length - 1, start + (key === "ArrowDown" ? 1 : -1))),
      );
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (visible) choose(activeIndex.current);
      else show();
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      const time = event.timeStamp;
      search.current = {
        text:
          (time - search.current.time < 700 ? search.current.text : "") +
          key.toLocaleLowerCase("ru"),
        time,
      };
      if (!visible) show();
      const found = options.findIndex((option) =>
        option.label.toLocaleLowerCase("ru").startsWith(search.current.text),
      );
      if (found >= 0) activate(found);
    }
  };
  return (
    <div className="paint-part-select" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="paint-part-label">
        Рисовать по
      </span>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label="Слой рисования"
        aria-describedby={`${id}-label`}
        aria-haspopup="listbox"
        aria-controls={`${id}-list`}
        aria-expanded={open}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        className="paint-part-trigger"
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          if (!popup.current?.contains(event.relatedTarget)) hide();
        }}
        onClick={() => (popup.current?.matches(":popover-open") ? hide() : show())}
      >
        {selected.id ? (
          <PartTexturePreview atlas={atlas} quads={selected.quads} revision={revision} />
        ) : (
          <span className="part-texture-placeholder" aria-hidden="true">
            UV
          </span>
        )}
        <span className="paint-part-name">{selected.label}</span>
        <ChevronDownIcon />
      </button>
      <div
        ref={popup}
        id={`${id}-list`}
        role="listbox"
        tabIndex={-1}
        aria-label="Поверхность для рисования"
        popover="auto"
        className="paint-part-popup"
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget) &&
            event.relatedTarget !== button.current
          )
            hide();
        }}
        onBeforeToggle={(event) => {
          const visible = event.newState === "open";
          setOpen(visible);
          if (!visible) onHighlight(null);
        }}
        onPointerLeave={() => onHighlight(null)}
      >
        {open
          ? options.map((option, index) => (
              <div
                key={option.id}
                id={`${id}-option-${index}`}
                role="option"
                tabIndex={-1}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    choose(index);
                  }
                }}
                aria-selected={option.id === selected.id}
                data-part={option.id}
                data-active={active === index}
                className="paint-part-option"
                onPointerMove={() => activate(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                {option.id ? (
                  <PartTexturePreview atlas={atlas} quads={option.quads} revision={revision} />
                ) : (
                  <span className="part-texture-placeholder" aria-hidden="true">
                    UV
                  </span>
                )}
                <span className="paint-part-name">{option.label}</span>
                {option.id === selected.id ? <CheckIcon /> : null}
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
