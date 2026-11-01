import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

/** Text input permits reliable select-all; the range lives in the native top layer, including dialogs. */
export function NumberSlider({
  label,
  value,
  min,
  max,
  unit = "",
  className,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  className?: string;
  onChange: (value: number, interaction: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLSpanElement>(null);
  const session = useRef(0);
  const firstClick = useRef(false);
  const returningFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const clamp = (number: number) => Math.max(min, Math.min(max, Math.round(number)));
  const change = (number: number) => {
    const next = clamp(number);
    setDraft(String(next));
    onChange(next, `${id}-${session.current}`);
  };
  const position = useCallback(() => {
    const field = input.current,
      bubble = popup.current;
    if (!field || !bubble) return;
    const rect = field.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0,
      top = viewport?.offsetTop ?? 0;
    const width = Math.min(240, (viewport?.width ?? innerWidth) - 16);
    const bottom = top + (viewport?.height ?? innerHeight);
    bubble.style.width = `${width}px`;
    bubble.style.left = `${Math.max(left + 8, Math.min(rect.left, left + (viewport?.width ?? innerWidth) - width - 8))}px`;
    bubble.style.top = `${Math.max(top + 8, rect.bottom + 66 > bottom ? rect.top - 66 : rect.bottom + 6)}px`;
  }, []);
  const show = () => {
    if (popup.current?.matches(":popover-open")) return;
    session.current++;
    position();
    popup.current?.showPopover();
  };
  const hide = () => popup.current?.hidePopover();
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open, position]);
  const escape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !popup.current?.matches(":popover-open")) return false;
    event.preventDefault();
    event.stopPropagation();
    hide();
    if (document.activeElement !== input.current) {
      returningFocus.current = true;
      input.current?.focus({ preventScroll: true });
    }
    return true;
  };
  return (
    <span
      className="number-slider"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hide();
      }}
    >
      <input
        ref={input}
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-controls={`${id}-slider`}
        autoComplete="off"
        spellCheck={false}
        className={className}
        value={draft}
        onFocus={(event) => {
          event.currentTarget.select();
          firstClick.current = true;
          if (returningFocus.current) returningFocus.current = false;
          else show();
        }}
        onClick={(event) => {
          show();
          if (firstClick.current) {
            event.currentTarget.select();
            firstClick.current = false;
          }
        }}
        onChange={(event) => {
          show();
          const text = event.target.value;
          setDraft(text);
          if (/^\d+$/.test(text) && Number.isFinite(Number(text))) change(Number(text));
        }}
        onBlur={() => {
          if (draft.trim() && Number.isFinite(Number(draft))) {
            if (clamp(Number(draft)) !== value) change(Number(draft));
            else setDraft(String(value));
          } else setDraft(String(value));
        }}
        onKeyDown={(event) => {
          if (escape(event)) return;
          const next =
            event.key === "ArrowUp" ? value + 1 : event.key === "ArrowDown" ? value - 1 : undefined;
          if (next !== undefined) {
            event.preventDefault();
            show();
            change(next);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            hide();
            event.currentTarget.blur();
          }
        }}
      />
      <span
        ref={popup}
        popover="auto"
        id={`${id}-slider`}
        className="number-slider-popup"
        onToggle={(event) => setOpen(event.newState === "open")}
      >
        <input
          type="range"
          onKeyDown={escape}
          aria-label={`${label}: слайдер`}
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => change(Number(event.target.value))}
        />
        <output>
          {value}
          {unit}
        </output>
      </span>
    </span>
  );
}
