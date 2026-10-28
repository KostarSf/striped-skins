import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
export type DesignIconName =
  | "brand"
  | "brush"
  | "eraser"
  | "drop"
  | "hand"
  | "plus"
  | "cube"
  | "reset"
  | "expand"
  | "eye";
export function DesignIcon({ name }: { name: DesignIconName }) {
  const size = name === "brand" ? 18 : name === "eye" ? 16 : 20;
  return (
    <img
      src={`/design/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="design-icon"
    />
  );
}
export function Button({
  children,
  className = "",
  tone = "neutral",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "neutral" | "primary" | "ghost" }) {
  return (
    <button type="button" className={`studio-button ${tone} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Button
      title={label}
      aria-label={label}
      {...props}
      className={`icon-button ${props.className ?? ""}`}
    >
      {children}
    </Button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
export function PanelHeading({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose?: () => void;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {onClose ? (
        <IconButton label="Закрыть параметры" onClick={onClose}>
          <XMarkIcon />
        </IconButton>
      ) : null}
    </div>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="studio-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  );
}

export function HexInput({
  value,
  onChange,
  label = "HEX цвета кисти",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [draft, setDraft] = useState(value.toUpperCase());
  useEffect(() => setDraft(value.toUpperCase()), [value]);
  return (
    <input
      aria-label={label}
      value={draft}
      maxLength={7}
      spellCheck={false}
      onChange={(e) => {
        setDraft(e.target.value);
        if (/^#[\da-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
      }}
      onBlur={() => setDraft(value.toUpperCase())}
    />
  );
}
