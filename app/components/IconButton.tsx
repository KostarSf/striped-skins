export function IconButton({
  icon,
  onClick,
  disabled,
  shadow = true,
  title
}: {
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
  shadow?: boolean;
  title?: string;
}) {
  return (
    <button
      className={
        "px-4 py-2 text-zinc-600 transition shrink-0 bg-white rounded-md pointer-events-auto" +
        (disabled ? "" : " hover:text-orange-500 ") +
        (shadow ? " shadow-lg" : "")
      }
      type='button'
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
    </button>
  );
}
